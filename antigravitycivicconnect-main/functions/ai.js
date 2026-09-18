const { GoogleGenAI, Type } = require('@google/genai');
const axios = require('axios');
const admin = require('firebase-admin');
const { processComplaintAIWorkflow } = require('./workflow');
const { dispatchNotification } = require('./notifications');

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await axios.get(url, { headers: { 'User-Agent': 'CivicConnect-App/1.0' }, timeout: 5000 });
    if (response.data && response.data.address) {
      return response.data.address;
    }
  } catch (error) {
    console.error("Geocoding error:", error.message);
  }
  return null;
}

/**
 * Executes the complete autonomous AI complaint processing workflow.
 */
async function analyzeComplaint(req, res) {
  try {
    const { imageURL, description, lat, lng, email, userId, userName, priority } = req.body;
    
    if (!description && !imageURL) {
      return res.status(400).json({ error: "Description or image required." });
    }

    let locationData = null;
    if (lat && lng) {
      locationData = await reverseGeocode(lat, lng);
    }

    const db = admin.apps.length > 0 ? admin.firestore() : null;

    // Run Full Autonomous AI Workflow
    const processedComplaint = await processComplaintAIWorkflow({
      description,
      imageURL,
      lat,
      lng,
      email,
      userId,
      userName,
      priority,
      address: locationData,
    }, db);

    res.json({ success: true, complaint: processedComplaint });
  } catch (error) {
    console.error("AI Workflow Analysis Error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Verifies resolution completion evidence using before/after photos and Gemini.
 */
async function verifyCompletion(req, res) {
  try {
    const { complaintId, beforeImageURL, afterImageURL, issueDescription } = req.body;
    
    if (!beforeImageURL || !afterImageURL) {
      return res.status(400).json({ error: "Both before and after images are required." });
    }

    const prompt = `You are verifying the completion of a civic complaint.
Complaint Description: "${issueDescription}"
Please compare the 'Before' image with the 'After' image.
Evaluate whether the issue described has been properly resolved.
Provide a confidence score (0-100) indicating how certain you are that the work is completed successfully.
Return JSON with 'isResolved' (boolean), 'confidenceScore' (number), and 'reasoning' (string).`;

    const parts = [{ text: prompt }];

    for (const url of [beforeImageURL, afterImageURL]) {
      try {
        const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
        parts.push({
          inlineData: {
            data: Buffer.from(resp.data).toString('base64'),
            mimeType: resp.headers['content-type'] || 'image/jpeg'
          }
        });
      } catch (err) {
        console.error("Failed to fetch image for verification:", err.message);
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isResolved: { type: Type.BOOLEAN },
            confidenceScore: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["isResolved", "confidenceScore", "reasoning"]
        }
      }
    });

    let aiResult;
    try {
      aiResult = JSON.parse(response.text);
    } catch(e) {
      return res.status(500).json({ error: "Failed to parse AI verification response" });
    }

    // Completion Verification Policy:
    // If AI verification is strong (>= 90% and resolved):
    // Transition to PENDING_CITIZEN_CONFIRMATION / ready for citizen verification.
    // Never auto-close without citizen verification.
    // If weak or inconsistent (< 90%): ADMIN REVIEW.
    const isStronglyVerified = aiResult.isResolved && aiResult.confidenceScore >= 90;
    const finalStatus = isStronglyVerified ? "resolved" : "pending review";
    const workflowStatus = isStronglyVerified ? "PENDING_CITIZEN_CONFIRMATION" : "AI_REVIEW_REQUIRED";

    if (admin.apps.length > 0 && complaintId) {
      const db = admin.firestore();
      const docRef = db.collection("complaints").doc(complaintId.toUpperCase());
      const existingSnap = await docRef.get();
      const existingData = existingSnap.exists ? existingSnap.data() : {};

      const timeline = existingData.timeline || [];
      timeline.push({
        id: "tl-" + Date.now(),
        date: new Date().toISOString(),
        user: "AI Completion Verifier",
        action: isStronglyVerified ? "Work Verified by AI - Awaiting Citizen Confirmation" : "AI Verification Uncertain - Escalated to Admin",
        status: finalStatus
      });

      await docRef.update({
        status: finalStatus,
        workflowStatus,
        "verification.aiResolved": aiResult.isResolved,
        "verification.aiConfidence": aiResult.confidenceScore,
        "verification.reasoning": aiResult.reasoning,
        "supervision.requiresAdmin": !isStronglyVerified,
        "supervision.escalationReason": !isStronglyVerified ? "Completion Verification Low Confidence" : null,
        afterImageURL,
        timeline
      });

      // Notify citizen or admin
      if (isStronglyVerified) {
        await dispatchNotification({
          recipientType: "citizen",
          recipientEmail: existingData.userEmail,
          complaintId,
          eventType: "VERIFICATION_REQUESTED",
          title: "Resolution Ready For Verification",
          message: `Field repair for #${complaintId} is complete. Please confirm whether the issue is resolved.`,
          db
        });
      } else {
        await dispatchNotification({
          recipientType: "admin",
          complaintId,
          eventType: "VERIFICATION_FAILED",
          title: "Completion Verification Ambiguous",
          message: `AI verification for #${complaintId} was uncertain (${aiResult.confidenceScore}%). Supervisor inspection required.`,
          db
        });
      }
    }

    res.json({
      success: true,
      verification: aiResult,
      finalStatus,
      workflowStatus,
      isStronglyVerified
    });
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  analyzeComplaint,
  verifyCompletion,
  reverseGeocode
};
