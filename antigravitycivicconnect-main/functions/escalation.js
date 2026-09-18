/**
 * CivicConnect Automated SLA Monitor & Escalation Engine
 * Tracks workflow progression and escalates complaints nearing or breaching SLA deadlines.
 */

const { SLA_DURATIONS_HOURS } = require("./assignment");

/**
 * Checks an issue's SLA status.
 * Returns: { isBreached: boolean, isWarning: boolean, remainingHours: number }
 */
function evaluateSLAStatus(issue) {
  if (!issue || !issue.assignment || !issue.assignment.slaDeadline) {
    return { isBreached: false, isWarning: false, remainingHours: null };
  }

  const deadline = new Date(issue.assignment.slaDeadline).getTime();
  const now = Date.now();
  const diffMs = deadline - now;
  const remainingHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

  // If already resolved or closed, not breached
  const status = (issue.status || "").toLowerCase();
  if (status === "resolved" || status === "closed" || status === "rejected") {
    return { isBreached: false, isWarning: false, remainingHours: 0 };
  }

  const isBreached = diffMs < 0;
  // Warning triggered when <= 25% of SLA time remains
  const totalHours = SLA_DURATIONS_HOURS[(issue.priority || "normal").toLowerCase()] || 48;
  const warningThresholdHours = totalHours * 0.25;
  const isWarning = !isBreached && remainingHours <= warningThresholdHours;

  return {
    isBreached,
    isWarning,
    remainingHours,
  };
}

/**
 * Scans active complaints for SLA breaches and applies automatic escalation.
 */
async function scanAndEscalateComplaints(db) {
  if (!db) return [];

  const escalated = [];
  try {
    const snapshot = await db
      .collection("complaints")
      .where("status", "in", ["assigned", "in-progress", "Assigned", "In Progress"])
      .get();

    const nowIso = new Date().toISOString();

    for (const doc of snapshot.docs) {
      const issue = doc.data();
      const sla = evaluateSLAStatus(issue);

      if (sla.isBreached && issue.workflowStatus !== "ESCALATED") {
        const timeline = issue.timeline || [];
        timeline.push({
          id: "tl-" + Date.now(),
          date: nowIso,
          user: "SLA Monitor (AI)",
          action: "Automatic SLA Breach Escalation",
          status: "escalated",
        });

        const history = issue.history || [];
        history.push({
          action: "SLA Deadline Breached",
          reason: `Task exceeded deadline by ${Math.abs(sla.remainingHours)} hours. Escalated to Department Supervisor.`,
          date: nowIso,
        });

        await doc.ref.update({
          workflowStatus: "ESCALATED",
          priority: "urgent",
          "supervision.requiresAdmin": true,
          "supervision.escalationReason": "SLA Deadline Breached",
          timeline,
          history,
        });

        escalated.push(doc.id);
      }
    }
  } catch (err) {
    console.error("SLA Scan error:", err.message);
  }

  return escalated;
}

module.exports = {
  evaluateSLAStatus,
  scanAndEscalateComplaints,
};
