/**
 * CivicConnect Automatic Engineer Assignment Engine
 * Assigns compliant complaints to suitable engineers based on:
 * 1. Matching department
 * 2. Relevant work type / skill
 * 3. Workload / availability
 * Calculates SLA deadlines according to priority.
 */

// SLA durations in hours based on priority
const SLA_DURATIONS_HOURS = {
  urgent: 12,    // 12 hours
  normal: 48,    // 2 days
  low: 120,      // 5 days
};

/**
 * Calculates ISO timestamp for SLA deadline based on priority.
 */
function calculateSLADeadline(priority = "normal", startTime = new Date()) {
  const hours = SLA_DURATIONS_HOURS[priority.toLowerCase()] || 48;
  const deadline = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
  return {
    slaHours: hours,
    slaDeadline: deadline.toISOString(),
  };
}

const { generateEngineerRecommendations } = require("./recommendationEngine");

/**
 * Selects an available engineer for the department using multi-factor AI scoring.
 */
async function selectEngineerForComplaint(department, workType, db, complaintData = {}) {
  // Build context for recommendation engine
  const complaintContext = {
    category: department,
    workType,
    description: complaintData.description || "",
    issueTitle: complaintData.title || "",
    priority: complaintData.priority || "normal",
    location: complaintData.location || null,
  };

  try {
    const recommendation = await generateEngineerRecommendations({
      complaint: complaintContext,
      departmentId: department,
      db,
    });

    return {
      engineerId: recommendation.recommendedEngineerId,
      engineerName: recommendation.recommendedEngineerName,
      department: department || "General",
      status: "assigned",
      recommendation: {
        score: recommendation.score,
        reasons: recommendation.reasons,
        constraints: recommendation.constraints,
        breakdown: recommendation.breakdown,
        generatedAt: recommendation.generatedAt,
      },
    };
  } catch (err) {
    console.warn("AI Engineer selection fallback due to error:", err.message);
  }

  // Fallback engineer if query fails
  return {
    engineerId: "ENG-" + (department ? department.substring(0, 3).toUpperCase() : "GEN") + "-01",
    engineerName: "Field Officer (" + (department || "General") + ")",
    department: department || "General",
    status: "active",
  };
}

module.exports = {
  calculateSLADeadline,
  selectEngineerForComplaint,
  SLA_DURATIONS_HOURS,
};
