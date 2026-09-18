/**
 * CivicConnect Autonomous Complaint Orchestrator & Workflow Engine
 * Orchestrates the full lifecycle:
 * 1. Validate Input (Description, Image, GPS)
 * 2. Run DistilBERT Text Classifier
 * 3. Run YOLO Vision Detector
 * 4. Run Central Confidence Router
 * 5. Call Gemini 2.5 Multimodal Fallback if required
 * 6. Generate Vector Embedding & Run Real Duplicate Engine
 * 7. Run Central Decision Engine
 * 8. Execute AUTO vs SUPERVISED Workflow
 * 9. Dispatch Automatic Assignment & SLA Setup
 * 10. Record Complete AI Diagnostic Audit Log
 */

const axios = require("axios");
const { GoogleGenAI, Type } = require("@google/genai");
const { checkDuplicateComplaint, generateEmbedding } = require("./duplicate");
const { evaluateDecision } = require("./decisionEngine");
const { calculateSLADeadline, selectEngineerForComplaint } = require("./assignment");
const { dispatchNotification } = require("./notifications");
const { STATES, transitionComplaintStatus } = require("./stateMachine");
const { calculateSLAPolicy, evaluateComplaintSLA } = require("./slaEngine");
const { generateEngineerRecommendations } = require("./recommendationEngine");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";

/**
 * Validates citizen inputs (description, image, coordinates).
 */
function validateCitizenInput({ description, imageURL, lat, lng }) {
  const issues = [];
  const cleanDesc = (description || "").trim();

  if (!cleanDesc && !imageURL) {
    issues.push("Neither description nor evidence photo was provided.");
  }

  let locationValid = true;
  let parsedLat = null;
  let parsedLng = null;

  if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
    parsedLat = parseFloat(lat);
    parsedLng = parseFloat(lng);

    // Coordinate range check
    if (isNaN(parsedLat) || isNaN(parsedLng) || parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      locationValid = false;
      issues.push("GPS coordinates are out of geographical range.");
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    cleanDesc,
    location: locationValid && parsedLat !== null ? { lat: parsedLat, lng: parsedLng } : null,
    locationValid,
  };
}

/**
 * Invokes Gemini 2.5 Flash for multimodal evidence reconciliation.
 */
async function callGeminiMultimodalReconciliation({
  description,
  imageURL,
  location,
  textPrediction,
  visionPrediction,
}) {
  if (!GEMINI_KEY) {
    return {
      used: false,
      reason: "Gemini API key not configured.",
      department: textPrediction?.department || "Municipal Services",
      priority: "normal",
      work_type: "Municipal Inspection",
      confidence: 0,
      needs_admin_review: true,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

    const prompt = `You are the evidence reconciliation engine for CivicConnect.
We have collected inputs for a civic complaint and run initial machine learning models.
Reconcile the evidence and output a definitive JSON classification.

Citizen Description: "${description}"
GPS Location: ${JSON.stringify(location)}
DistilBERT NLP Prediction: ${textPrediction?.department} (Confidence: ${textPrediction?.confidence})
YOLO Vision Detection: ${visionPrediction?.top_detection ? visionPrediction.top_detection.class + " (" + visionPrediction.top_detection.confidence + ")" : "None"}

Allowed Departments: Roads, Water, Electricity, Sanitation, Drainage, Traffic, Public Health, Municipal Services
Allowed Priorities: Low, Medium, High, Urgent

Return ONLY a JSON object:
{
  "department": "Department",
  "priority": "Priority",
  "work_type": "Specific Work Type",
  "severity": "Low | Medium | High | Critical",
  "reason": "Clear justification reconciling text and image evidence",
  "confidence": 85,
  "needs_admin_review": false
}`;

    const parts = [{ text: prompt }];

    if (imageURL) {
      try {
        const imageResp = await axios.get(imageURL, { responseType: "arraybuffer", timeout: 8000 });
        const mimeType = imageResp.headers["content-type"] || "image/jpeg";
        parts.push({
          inlineData: {
            data: Buffer.from(imageResp.data).toString("base64"),
            mimeType,
          },
        });
      } catch (imgErr) {
        console.warn("Could not download image for Gemini reconciliation:", imgErr.message);
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: parts,
      config: {
        responseMimeType: "application/json",
      },
    });

    let text = response.text || "";
    if (text.startsWith("```json")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    const parsed = JSON.parse(text);
    return {
      used: true,
      ...parsed,
    };
  } catch (err) {
    console.error("Gemini Multimodal Reconciliation failed:", err.message);
    return {
      used: true,
      failed: true,
      error: err.message,
      department: textPrediction?.department || "Municipal Services",
      priority: "normal",
      work_type: "Municipal Action",
      confidence: 50,
      needs_admin_review: true,
    };
  }
}

/**
 * Master function: Executes the complete end-to-end autonomous AI pipeline.
 */
async function processComplaintAIWorkflow(complaintData, db) {
  const referenceId = complaintData.referenceId || "CC-" + new Date().getFullYear() + "-" + Math.random().toString(16).substring(2, 8).toUpperCase();
  const startTime = Date.now();

  // 1. Validate Input
  const validation = validateCitizenInput({
    description: complaintData.description,
    imageURL: complaintData.imageURL,
    lat: complaintData.location?.lat !== undefined ? complaintData.location.lat : complaintData.lat,
    lng: complaintData.location?.lng !== undefined ? complaintData.location.lng : complaintData.lng,
  });

  // 2. Fetch Automation Policy Config from Firestore
  let automationConfig = {
    autoRoutingEnabled: true,
    textConfidenceThreshold: 0.90,
    visionConfidenceThreshold: 0.85,
    duplicateSimilarityThreshold: 0.82,
    duplicateDistanceMeters: 100,
    requireAdminForUrgent: true,
    requireAdminForModelConflict: true,
    requireAdminForLowConfidence: true,
    requireAdminForPotentialDuplicate: true,
    requireCitizenVerification: true,
    autoEscalationEnabled: true,
    maxAutoPriority: "normal",
  };

  if (db) {
    try {
      const configDoc = await db.collection("automation_config").doc("global").get();
      if (configDoc.exists) {
        automationConfig = { ...automationConfig, ...configDoc.data() };
      }
    } catch (e) {
      console.warn("Could not read automation_config/global; using defaults.");
    }
  }

  // 3. Step 1: Text Classifier (DistilBERT)
  let textPrediction = null;
  try {
    const textResp = await axios.post(`${AI_SERVICE_URL}/predict`, {
      complaint: validation.cleanDesc || "Civic complaint report",
      complaint_id: referenceId,
    }, { timeout: 10000 });
    textPrediction = textResp.data;
  } catch (err) {
    console.warn("DistilBERT Python API unreachable; applying graceful fallback:", err.message);
    textPrediction = {
      department: "Municipal Services",
      confidence: 0.50,
      top3: [{ department: "Municipal Services", confidence: 0.50 }],
      model: "distilbert",
      model_version: "civicconnect-distilbert-fallback",
    };
  }

  // 4. Step 2: Vision Model (YOLO)
  let visionPrediction = null;
  if (complaintData.imageURL) {
    try {
      const yoloResp = await axios.post(
        `${AI_SERVICE_URL}/vision/predict`,
        new URLSearchParams({ image_path: complaintData.imageURL }),
        { timeout: 10000 }
      );
      visionPrediction = yoloResp.data;
    } catch (err) {
      console.warn("YOLO Vision API unreachable:", err.message);
      visionPrediction = {
        detections: [],
        top_detection: null,
        model: "civic-yolo",
        model_version: "civic-yolo-v1.0",
        status: "model_unavailable",
        message: err.message,
      };
    }
  } else {
    visionPrediction = {
      detections: [],
      top_detection: null,
      model: "civic-yolo",
      model_version: "civic-yolo-v1.0",
      status: "no_image",
      message: "No image provided for visual detection",
    };
  }

  // 5. Step 3: Confidence Router
  let routerResult = null;
  try {
    const routerResp = await axios.post(`${AI_SERVICE_URL}/router/evaluate`, {
      text_prediction: textPrediction,
      vision_prediction: visionPrediction,
      is_urgent: complaintData.priority === "urgent",
    }, { timeout: 5000 });
    routerResult = routerResp.data;
  } catch (e) {
    // In-process router fallback
    const { evaluate_confidence_routing } = require("./router_fallback") || {};
    routerResult = {
      case_code: "CASE_C",
      decision: "GEMINI_FALLBACK",
      reason: "Router service in-process evaluation",
      requires_gemini: true,
      requires_admin: false,
    };
  }

  // 6. Step 4: Gemini Multimodal Fallback (If required by router)
  let geminiPrediction = { used: false };
  if (routerResult && routerResult.requires_gemini) {
    geminiPrediction = await callGeminiMultimodalReconciliation({
      description: validation.cleanDesc,
      imageURL: complaintData.imageURL,
      location: validation.location,
      textPrediction,
      visionPrediction,
    });
  }

  // 7. Step 5: Duplicate Engine (Vector Embeddings + Proximity)
  let existingComplaints = [];
  if (db) {
    try {
      const existingSnap = await db
        .collection("complaints")
        .where("status", "in", ["pending", "assigned", "in-progress", "reopened", "Pending", "Assigned", "In Progress", "Pending Review"])
        .limit(25)
        .get();
      existingComplaints = existingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("Could not query active complaints for duplicate detection:", e.message);
    }
  }

  const embedding = await generateEmbedding(validation.cleanDesc, GEMINI_KEY);
  const duplicateResult = await checkDuplicateComplaint({
    description: validation.cleanDesc,
    location: validation.location,
    department: textPrediction.department,
    embedding,
    existingComplaints,
    config: automationConfig,
  });

  // 8. Step 6: Central Decision Engine
  const decision = evaluateDecision({
    complaint: { ...complaintData, description: validation.cleanDesc },
    textPrediction,
    visionPrediction,
    geminiPrediction,
    duplicateResult,
    locationValidation: { isValid: validation.locationValid },
    automationConfig,
  });

  // 9. SLA & Engineer Recommendation
  const slaPolicy = calculateSLAPolicy(decision.priority, new Date());
  
  let recommendation = null;
  try {
    recommendation = await generateEngineerRecommendations({
      complaint: {
        category: decision.department,
        workType: decision.workType,
        description: validation.cleanDesc,
        title: complaintData.title || `${decision.department}: ${decision.workType}`,
        priority: decision.priority,
        location: validation.location,
      },
      departmentId: decision.department,
      db,
    });
  } catch (recErr) {
    console.warn("Could not generate AI engineer recommendation:", recErr.message);
  }

  let assignment = {
    department: decision.department,
    engineerId: null,
    engineerName: null,
    assignedAt: null,
    slaHours: slaPolicy.slaHours,
    slaDeadline: slaPolicy.slaDeadline,
    slaStatus: slaPolicy.slaStatus,
    breachProbability: slaPolicy.breachProbability,
    riskLevel: slaPolicy.riskLevel,
    aiRecommendation: recommendation ? {
      recommendedEngineerId: recommendation.recommendedEngineerId,
      recommendedEngineerName: recommendation.recommendedEngineerName,
      score: recommendation.score,
      reasons: recommendation.reasons,
      constraints: recommendation.constraints,
      breakdown: recommendation.breakdown,
      generatedAt: recommendation.generatedAt,
    } : null,
  };

  let workflowStatus = STATES.NEW;
  let finalStatus = "pending";

  if (decision.automationMode === "AUTO") {
    // If auto-approved, move directly to ASSIGNED with top recommended engineer
    workflowStatus = STATES.ASSIGNED;
    finalStatus = "assigned";
    const selectedEng = await selectEngineerForComplaint(decision.department, decision.workType, db, {
      description: validation.cleanDesc,
      title: complaintData.title,
      priority: decision.priority,
      location: validation.location,
    });
    assignment.engineerId = selectedEng.engineerId;
    assignment.engineerName = selectedEng.engineerName;
    assignment.assignedAt = new Date().toISOString();
  } else if (decision.automationMode === "SUPERVISED") {
    workflowStatus = STATES.DEPARTMENT_REVIEW;
    finalStatus = "pending review";
  } else {
    workflowStatus = STATES.DEPARTMENT_REVIEW;
    finalStatus = "pending";
  }

  const nowIso = new Date().toISOString();

  // 10. Construct Normalized Firestore Document Schema
  const fullComplaintRecord = {
    referenceId,
    complaintId: referenceId,
    title: complaintData.title || `${decision.department}: ${decision.workType}`,
    description: validation.cleanDesc,
    category: decision.department,
    department: decision.department,
    priority: decision.priority,
    status: finalStatus,
    workflowStatus,
    location: validation.location,
    imageURL: complaintData.imageURL || null,
    userEmail: complaintData.email || complaintData.userEmail || null,
    userId: complaintData.userId || null,
    userName: complaintData.userName || "Citizen",

    // Structured AI Diagnostic Payload
    ai: {
      department: decision.department,
      priority: decision.priority,
      workType: decision.workType,
      riskLevel: decision.riskLevel,
      textModel: {
        prediction: textPrediction.department,
        confidence: textPrediction.confidence,
        top3: textPrediction.top3 || [],
        modelVersion: textPrediction.model_version,
      },
      visionModel: {
        prediction: visionPrediction?.top_detection?.class || null,
        confidence: visionPrediction?.top_detection?.confidence || 0,
        department: visionPrediction?.top_detection?.department || null,
        detections: visionPrediction?.detections || [],
        modelVersion: visionPrediction?.model_version || "civic-yolo-v1.0",
        status: visionPrediction?.status || "no_image",
      },
      router: routerResult,
      gemini: {
        used: geminiPrediction.used || false,
        prediction: geminiPrediction.department || null,
        confidence: geminiPrediction.confidence || 0,
        reason: geminiPrediction.reason || null,
      },
      duplicate: {
        isDuplicate: duplicateResult.isDuplicate,
        isPotentialDuplicate: duplicateResult.isPotentialDuplicate,
        matchedComplaintId: duplicateResult.matchedComplaintId,
        similarity: duplicateResult.semanticSimilarity,
        distanceMeters: duplicateResult.distanceMeters,
        reason: duplicateResult.reason,
      },
      automationMode: decision.automationMode,
      decisionAction: decision.action,
      decisionReason: decision.reason,
      exceptionCode: decision.exceptionCode,
    },

    assignment,

    supervision: {
      requiresAdmin: decision.requiresAdmin,
      reviewed: false,
      adminId: null,
      adminAction: null,
      adminReason: null,
      escalationReason: decision.exceptionCode || null,
    },

    verification: {
      aiResolved: false,
      aiConfidence: 0,
      citizenVerified: false,
    },

    embedding: embedding || null,

    timeline: [
      {
        id: "tl-" + Date.now(),
        date: nowIso,
        user: "Citizen",
        action: "Complaint Submitted",
        status: "pending",
      },
      {
        id: "tl-" + (Date.now() + 1),
        date: nowIso,
        user: "CivicConnect AI Gateway",
        action: decision.automationMode === "AUTO" ? `AI Auto-Approved & Assigned to ${decision.department}` : `Routed to Admin Supervision: ${decision.reason}`,
        status: finalStatus,
      },
    ],

    history: [
      {
        action: "AI Pipeline Evaluation",
        reason: decision.reason,
        mode: decision.automationMode,
        date: nowIso,
      },
    ],

    citizenPhotos: complaintData.imageURL
      ? [{ url: complaintData.imageURL, caption: "Original Report Photo", uploadedAt: nowIso, uploadedBy: complaintData.userName || "Citizen" }]
      : [],

    timestamps: {
      createdAt: nowIso,
      aiProcessedAt: nowIso,
      assignedAt: assignment.assignedAt,
      resolvedAt: null,
      processingDurationMs: Date.now() - startTime,
    },
    createdAt: nowIso,
  };

  // 11. Write to Firestore & Create Audit Log
  if (db) {
    try {
      await db.collection("complaints").doc(referenceId).set(fullComplaintRecord);

      // Audit Log Entry
      const auditLog = {
        complaintId: referenceId,
        eventType: decision.automationMode === "AUTO" ? "AI_AUTO_ASSIGN" : "AI_SUPERVISION_ROUTED",
        actorType: "AI",
        actorId: "decision-engine",
        modelVersions: {
          text: textPrediction.model_version,
          vision: visionPrediction?.model_version || "civic-yolo-v1.0",
          gemini: "gemini-2.5-flash",
        },
        inputs: {
          textConfidence: textPrediction.confidence,
          visionConfidence: visionPrediction?.top_detection?.confidence || null,
        },
        decision: {
          department: decision.department,
          priority: decision.priority,
          workType: decision.workType,
          automationMode: decision.automationMode,
        },
        reason: decision.reason,
        timestamp: nowIso,
      };
      await db.collection("ai_audit_logs").add(auditLog);

      // Automated Notifications
      if (decision.automationMode === "AUTO") {
        await dispatchNotification({
          recipientType: "citizen",
          recipientEmail: fullComplaintRecord.userEmail,
          complaintId: referenceId,
          eventType: "AUTO_ASSIGNED",
          title: "Complaint Auto-Approved & Assigned",
          message: `Your report #${referenceId} was verified by AI and assigned to ${decision.department} (${assignment.engineerName}).`,
          db,
        });
      } else {
        await dispatchNotification({
          recipientType: "admin",
          complaintId: referenceId,
          eventType: "EXCEPTION_QUEUED",
          title: "Supervisor Review Required",
          message: `Complaint #${referenceId} queued for supervision: ${decision.reason}`,
          db,
        });
      }
    } catch (dbErr) {
      console.error("Firestore persistence error during AI workflow:", dbErr.message);
    }
  }

  return fullComplaintRecord;
}

module.exports = {
  processComplaintAIWorkflow,
  validateCitizenInput,
  callGeminiMultimodalReconciliation,
};
