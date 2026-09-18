/**
 * CivicConnect Advanced SLA & Risk Engine
 * Computes:
 * - Deterministic SLA deadlines
 * - Dynamic breach probability based on current queue, severity, and time elapsed
 * - Status levels: SAFE, WARNING, AT_RISK, BREACHED, COMPLETED
 */

const SLA_CONFIG = {
  urgent: { hours: 12, warningRatio: 0.35 },
  high: { hours: 24, warningRatio: 0.30 },
  normal: { hours: 48, warningRatio: 0.25 },
  low: { hours: 120, warningRatio: 0.20 },
};

/**
 * Calculates initial SLA configuration for a complaint.
 */
function calculateSLAPolicy(priority = "normal", startTime = new Date()) {
  const p = (priority || "normal").toLowerCase();
  const policy = SLA_CONFIG[p] || SLA_CONFIG.normal;
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const deadline = new Date(start.getTime() + policy.hours * 60 * 60 * 1000);

  return {
    priority: p,
    slaHours: policy.hours,
    slaDeadline: deadline.toISOString(),
    slaStartTime: start.toISOString(),
    slaStatus: "SAFE",
    breachProbability: 0.05,
    riskLevel: "LOW",
  };
}

/**
 * Evaluates real-time SLA metrics for an active complaint.
 */
function evaluateComplaintSLA(complaint, engineerWorkload = 1) {
  const assignment = complaint.assignment || {};
  const slaDeadline = assignment.slaDeadline || complaint.slaDeadline;
  
  if (!slaDeadline) {
    return {
      slaStatus: "SAFE",
      remainingHours: 48,
      elapsedHours: 0,
      breachProbability: 0.0,
      riskLevel: "LOW",
      timeRemainingStr: "48h 0m",
      isBreached: false,
    };
  }

  const now = Date.now();
  const deadlineMs = new Date(slaDeadline).getTime();
  const startMs = new Date(assignment.assignedAt || complaint.createdAt || now).getTime();
  const totalDurationMs = Math.max(1, deadlineMs - startMs);
  const diffMs = deadlineMs - now;
  const remainingHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  const elapsedHours = Math.max(0, Math.round(((now - startMs) / (1000 * 60 * 60)) * 10) / 10);

  const status = (complaint.status || "").toLowerCase();
  if (status === "closed" || status === "resolved" || status === "department_review_completed") {
    return {
      slaStatus: "COMPLETED",
      remainingHours: 0,
      elapsedHours,
      breachProbability: 0.0,
      riskLevel: "NONE",
      timeRemainingStr: "Resolved",
      isBreached: false,
    };
  }

  // Calculate breach probability
  // Factors: elapsed ratio + workload queue + severity
  const elapsedRatio = Math.max(0, Math.min(1.0, (now - startMs) / totalDurationMs));
  const priority = (complaint.priority || "normal").toLowerCase();
  const severityBoost = priority === "urgent" ? 0.25 : priority === "high" ? 0.15 : 0.05;
  const queuePenalty = Math.min(0.3, (engineerWorkload - 1) * 0.08);

  let breachProb = Math.min(1.0, elapsedRatio * 0.7 + severityBoost + queuePenalty);
  if (diffMs <= 0) breachProb = 1.0;

  // Determine SLA status
  let slaStatus = "SAFE";
  let riskLevel = "LOW";

  if (diffMs <= 0) {
    slaStatus = "BREACHED";
    riskLevel = "CRITICAL";
  } else if (breachProb >= 0.75 || diffMs < 4 * 3600 * 1000) {
    slaStatus = "AT_RISK";
    riskLevel = "HIGH";
  } else if (breachProb >= 0.45 || diffMs < 12 * 3600 * 1000) {
    slaStatus = "WARNING";
    riskLevel = "MEDIUM";
  }

  // Format friendly string
  let timeRemainingStr = "";
  if (diffMs <= 0) {
    const overdueHrs = Math.abs(remainingHours);
    timeRemainingStr = `Overdue by ${overdueHrs}h`;
  } else {
    const h = Math.floor(diffMs / (1000 * 60 * 60));
    const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    timeRemainingStr = `${h}h ${m}m`;
  }

  return {
    slaStatus,
    remainingHours,
    elapsedHours,
    breachProbability: Math.round(breachProb * 100) / 100,
    riskLevel,
    timeRemainingStr,
    isBreached: diffMs <= 0,
  };
}

module.exports = {
  SLA_CONFIG,
  calculateSLAPolicy,
  evaluateComplaintSLA,
};
