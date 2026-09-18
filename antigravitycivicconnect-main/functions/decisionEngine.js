/**
 * CivicConnect Central Decision Engine
 * Single authority for automated workflow decisions.
 * Enforces policy regardless of raw AI model predictions.
 *
 * Supported automationMode:
 * - AUTO: System automatically approves, assigns, and dispatches.
 * - SUPERVISED: System queues complaint in Admin Exception Queue for human supervisor review.
 * - MANUAL: System halts automation and requires full manual intervention.
 *
 * Supported actions:
 * - AUTO_ASSIGN
 * - SEND_TO_ADMIN
 * - REJECT
 * - PAUSE
 * - ESCALATE
 * - REQUEST_MORE_INFORMATION
 * - REQUEST_CITIZEN_VERIFICATION
 * - AUTO_CLOSE
 */

const VALID_DEPARTMENTS = [
  "Roads",
  "Water",
  "Electricity",
  "Sanitation",
  "Drainage",
  "Traffic",
  "Public Health",
  "Municipal Services",
];

const VALID_PRIORITIES = ["low", "normal", "urgent"];

const WORK_TYPE_MAP = {
  Roads: "Road & Pavement Repair",
  Water: "Water Supply & Pipeline Restoration",
  Electricity: "Electrical Infrastructure & Lighting",
  Sanitation: "Waste Collection & Clearance",
  Drainage: "Stormwater Drainage & Desilting",
  Traffic: "Traffic Signal & Signage Maintenance",
  "Public Health": "Vector Control & Public Hygiene",
  "Municipal Services": "Public Facility & Park Maintenance",
};

/**
 * Evaluates full input context against administrative policies and outputs the binding decision.
 */
function evaluateDecision({
  complaint,
  textPrediction,
  visionPrediction,
  geminiPrediction,
  duplicateResult,
  locationValidation,
  automationConfig = {},
}) {
  // 1. Config Defaults
  const config = {
    autoRoutingEnabled: automationConfig.autoRoutingEnabled !== false,
    requireAdminForUrgent: automationConfig.requireAdminForUrgent !== false,
    requireAdminForModelConflict: automationConfig.requireAdminForModelConflict !== false,
    requireAdminForLowConfidence: automationConfig.requireAdminForLowConfidence !== false,
    requireAdminForPotentialDuplicate: automationConfig.requireAdminForPotentialDuplicate !== false,
    maxAutoPriority: automationConfig.maxAutoPriority || "normal",
  };

  // If system-wide auto routing is disabled, route everything to SUPERVISED
  if (!config.autoRoutingEnabled) {
    return {
      action: "SEND_TO_ADMIN",
      automationMode: "SUPERVISED",
      department: textPrediction?.department || "Municipal Services",
      priority: "normal",
      workType: WORK_TYPE_MAP[textPrediction?.department] || "Civic Action",
      riskLevel: "LOW",
      reason: "Automated routing disabled by administrative policy.",
      requiresAdmin: true,
      exceptionCode: "POLICY_AUTO_ROUTING_DISABLED",
    };
  }

  // 2. Location Validation Check
  if (locationValidation && locationValidation.isValid === false) {
    return {
      action: "SEND_TO_ADMIN",
      automationMode: "SUPERVISED",
      department: textPrediction?.department || "Municipal Services",
      priority: "normal",
      workType: "Inspection & Verification",
      riskLevel: "MEDIUM",
      reason: "Invalid or out-of-boundary GPS coordinates provided.",
      requiresAdmin: true,
      exceptionCode: "INVALID_LOCATION",
    };
  }

  // 3. Duplicate Evaluation
  if (duplicateResult && duplicateResult.isDuplicate) {
    return {
      action: "SEND_TO_ADMIN",
      automationMode: "SUPERVISED",
      department: textPrediction?.department || "Municipal Services",
      priority: "low",
      workType: "Duplicate Triage",
      riskLevel: "LOW",
      reason: `Identified as duplicate of existing complaint ${duplicateResult.matchedComplaintId}. (${duplicateResult.reason})`,
      requiresAdmin: true,
      exceptionCode: "DUPLICATE_DETECTED",
      matchedComplaintId: duplicateResult.matchedComplaintId,
    };
  }

  if (duplicateResult && duplicateResult.isPotentialDuplicate && config.requireAdminForPotentialDuplicate) {
    return {
      action: "SEND_TO_ADMIN",
      automationMode: "SUPERVISED",
      department: textPrediction?.department || "Municipal Services",
      priority: "normal",
      workType: "Potential Duplicate Review",
      riskLevel: "MEDIUM",
      reason: duplicateResult.reason,
      requiresAdmin: true,
      exceptionCode: "POTENTIAL_DUPLICATE",
      matchedComplaintId: duplicateResult.matchedComplaintId,
    };
  }

  // 4. Resolve Candidate Department, Priority & Risk
  let finalDepartment = textPrediction?.department;
  let finalPriority = "normal";
  let finalWorkType = WORK_TYPE_MAP[finalDepartment] || "Municipal Action";
  let riskLevel = "LOW";
  let isUrgent = false;

  // Check text priority indicator or description urgency keywords
  const descLower = (complaint?.description || "").toLowerCase();
  const isUrgentKeyword =
    descLower.includes("emergency") ||
    descLower.includes("hazard") ||
    descLower.includes("danger") ||
    descLower.includes("sparking") ||
    descLower.includes("collapse") ||
    descLower.includes("burst");

  if (complaint?.priority === "urgent" || isUrgentKeyword) {
    finalPriority = "urgent";
    riskLevel = "HIGH";
    isUrgent = true;
  }

  // Policy: require admin for urgent complaints
  if (isUrgent && config.requireAdminForUrgent) {
    return {
      action: "SEND_TO_ADMIN",
      automationMode: "SUPERVISED",
      department: finalDepartment || "Municipal Services",
      priority: "urgent",
      workType: finalWorkType,
      riskLevel: "HIGH",
      reason: "Urgent/hazardous civic issue detected; requires immediate administrative supervision.",
      requiresAdmin: true,
      exceptionCode: "URGENT_SUPERVISION_REQUIRED",
    };
  }

  // 5. Evaluate Multi-Model Agreement & Gemini Reconciliation
  const textConf = parseFloat(textPrediction?.confidence || 0);
  let visionConf = 0;
  let visionDept = null;

  if (visionPrediction && visionPrediction.status === "success" && visionPrediction.top_detection) {
    visionConf = parseFloat(visionPrediction.top_detection.confidence || 0);
    visionDept = visionPrediction.top_detection.department;
  }

  // Case 1: Gemini Multimodal was invoked
  if (geminiPrediction && geminiPrediction.used) {
    const gDept = geminiPrediction.department;
    const gPriority = (geminiPrediction.priority || "normal").toLowerCase();
    const gWorkType = geminiPrediction.work_type || WORK_TYPE_MAP[gDept] || finalWorkType;

    // Check if Gemini agrees with either text or vision
    const agreesWithText = gDept && finalDepartment && gDept.toLowerCase() === finalDepartment.toLowerCase();
    const agreesWithVision = gDept && visionDept && gDept.toLowerCase() === visionDept.toLowerCase();

    if (agreesWithText || agreesWithVision) {
      // Gemini validated model evidence
      finalDepartment = gDept;
      finalPriority = VALID_PRIORITIES.includes(gPriority) ? gPriority : "normal";
      finalWorkType = gWorkType;

      return {
        action: "AUTO_ASSIGN",
        automationMode: "AUTO",
        department: finalDepartment,
        priority: finalPriority,
        workType: finalWorkType,
        riskLevel: "LOW",
        reason: `Gemini multimodal analysis confirmed ${finalDepartment} (${geminiPrediction.reason || "evidence aligned"}).`,
        requiresAdmin: false,
        exceptionCode: null,
      };
    } else {
      // Gemini disagreed with both models -> ADMIN REVIEW
      return {
        action: "SEND_TO_ADMIN",
        automationMode: "SUPERVISED",
        department: gDept || finalDepartment || "Municipal Services",
        priority: gPriority || "normal",
        workType: gWorkType,
        riskLevel: "MEDIUM",
        reason: `Gemini recommendation (${gDept}) diverged from initial models (Text: ${finalDepartment}, Vision: ${visionDept}).`,
        requiresAdmin: true,
        exceptionCode: "MODEL_GEMINI_DISAGREEMENT",
      };
    }
  }

  // Case 2: Vision detected an object but disagreed with Text (Model conflict)
  if (visionDept && visionDept.toLowerCase() !== finalDepartment.toLowerCase()) {
    if (config.requireAdminForModelConflict) {
      return {
        action: "SEND_TO_ADMIN",
        automationMode: "SUPERVISED",
        department: finalDepartment,
        priority: finalPriority,
        workType: finalWorkType,
        riskLevel: "MEDIUM",
        reason: `Model conflict: DistilBERT predicted '${finalDepartment}' (${Math.round(textConf * 100)}%) while YOLO detected '${visionDept}' (${Math.round(visionConf * 100)}%).`,
        requiresAdmin: true,
        exceptionCode: "MODEL_CONFLICT",
      };
    }
  }

  // Case 3: Both models agree with high confidence
  if (textConf >= 0.90 && (!visionDept || (visionDept.toLowerCase() === finalDepartment.toLowerCase() && visionConf >= 0.85))) {
    return {
      action: "AUTO_ASSIGN",
      automationMode: "AUTO",
      department: finalDepartment,
      priority: finalPriority,
      workType: finalWorkType,
      riskLevel: "LOW",
      reason: `High confidence agreement (Text: ${Math.round(textConf * 100)}%${visionDept ? `, Vision: ${Math.round(visionConf * 100)}%` : ""}).`,
      requiresAdmin: false,
      exceptionCode: null,
    };
  }

  // Case 4: Text confidence is medium or low
  if (textConf < 0.80 && config.requireAdminForLowConfidence) {
    return {
      action: "SEND_TO_ADMIN",
      automationMode: "SUPERVISED",
      department: finalDepartment || "Municipal Services",
      priority: finalPriority,
      workType: finalWorkType,
      riskLevel: "LOW",
      reason: `Low text confidence (${Math.round(textConf * 100)}%) below auto-approval threshold.`,
      requiresAdmin: true,
      exceptionCode: "LOW_CONFIDENCE",
    };
  }

  // Default Auto Approval for standard compliant cases
  return {
    action: "AUTO_ASSIGN",
    automationMode: "AUTO",
    department: finalDepartment || "Municipal Services",
    priority: finalPriority,
    workType: finalWorkType,
    riskLevel: "LOW",
    reason: "Standard complaint successfully validated against autonomous policies.",
    requiresAdmin: false,
    exceptionCode: null,
  };
}

module.exports = {
  evaluateDecision,
  VALID_DEPARTMENTS,
  VALID_PRIORITIES,
  WORK_TYPE_MAP,
};
