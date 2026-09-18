/**
 * CivicConnect Controlled Complaint State Machine
 * Replaces ad-hoc status changes with rigorous, role-checked transitions
 * and immutable event audit logging.
 */

// Primary States
const STATES = {
  NEW: "NEW",
  AI_CLASSIFIED: "AI_CLASSIFIED",
  DEPARTMENT_REVIEW: "DEPARTMENT_REVIEW",
  ASSIGNMENT_RECOMMENDED: "ASSIGNMENT_RECOMMENDED",
  ASSIGNED: "ASSIGNED",
  ENGINEER_ACCEPTED: "ENGINEER_ACCEPTED",
  TRAVELLING: "TRAVELLING",
  ARRIVED: "ARRIVED",
  WORK_STARTED: "WORK_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  AWAITING_VERIFICATION: "AWAITING_VERIFICATION",
  DEPARTMENT_REVIEW_COMPLETED: "DEPARTMENT_REVIEW_COMPLETED",
  CLOSED: "CLOSED",
  
  // Exception & Secondary States
  DUPLICATE: "DUPLICATE",
  REJECTED: "REJECTED",
  ON_HOLD: "ON_HOLD",
  ESCALATED: "ESCALATED",
  REASSIGNED: "REASSIGNED",
  REWORK_REQUIRED: "REWORK_REQUIRED",
  REOPENED: "REOPENED",
};

// Valid status transitions
const ALLOWED_TRANSITIONS = {
  [STATES.NEW]: [
    STATES.AI_CLASSIFIED,
    STATES.DEPARTMENT_REVIEW,
    STATES.REJECTED,
    STATES.DUPLICATE,
  ],
  [STATES.AI_CLASSIFIED]: [
    STATES.DEPARTMENT_REVIEW,
    STATES.ASSIGNMENT_RECOMMENDED,
    STATES.ASSIGNED,
    STATES.DUPLICATE,
    STATES.REJECTED,
    STATES.ESCALATED,
  ],
  [STATES.DEPARTMENT_REVIEW]: [
    STATES.ASSIGNMENT_RECOMMENDED,
    STATES.ASSIGNED,
    STATES.REJECTED,
    STATES.DUPLICATE,
    STATES.ON_HOLD,
    STATES.ESCALATED,
  ],
  [STATES.ASSIGNMENT_RECOMMENDED]: [
    STATES.ASSIGNED,
    STATES.DEPARTMENT_REVIEW,
    STATES.REJECTED,
    STATES.ON_HOLD,
  ],
  [STATES.ASSIGNED]: [
    STATES.ENGINEER_ACCEPTED,
    STATES.TRAVELLING,
    STATES.REASSIGNED,
    STATES.DEPARTMENT_REVIEW,
    STATES.ESCALATED,
  ],
  [STATES.ENGINEER_ACCEPTED]: [
    STATES.TRAVELLING,
    STATES.ARRIVED,
    STATES.REASSIGNED,
    STATES.ON_HOLD,
    STATES.ESCALATED,
  ],
  [STATES.TRAVELLING]: [
    STATES.ARRIVED,
    STATES.ON_HOLD,
    STATES.ESCALATED,
    STATES.REASSIGNED,
  ],
  [STATES.ARRIVED]: [
    STATES.WORK_STARTED,
    STATES.IN_PROGRESS,
    STATES.ON_HOLD,
    STATES.ESCALATED,
  ],
  [STATES.WORK_STARTED]: [
    STATES.IN_PROGRESS,
    STATES.AWAITING_VERIFICATION,
    STATES.ON_HOLD,
    STATES.ESCALATED,
  ],
  [STATES.IN_PROGRESS]: [
    STATES.AWAITING_VERIFICATION,
    STATES.ON_HOLD,
    STATES.ESCALATED,
  ],
  [STATES.AWAITING_VERIFICATION]: [
    STATES.DEPARTMENT_REVIEW_COMPLETED,
    STATES.REWORK_REQUIRED,
    STATES.CLOSED,
    STATES.ESCALATED,
  ],
  [STATES.DEPARTMENT_REVIEW_COMPLETED]: [
    STATES.CLOSED,
    STATES.REWORK_REQUIRED,
    STATES.REOPENED,
  ],
  [STATES.REWORK_REQUIRED]: [
    STATES.WORK_STARTED,
    STATES.IN_PROGRESS,
    STATES.AWAITING_VERIFICATION,
    STATES.REASSIGNED,
    STATES.ESCALATED,
  ],
  [STATES.REASSIGNED]: [
    STATES.ASSIGNED,
    STATES.ENGINEER_ACCEPTED,
    STATES.DEPARTMENT_REVIEW,
  ],
  [STATES.ON_HOLD]: [
    STATES.ASSIGNED,
    STATES.ENGINEER_ACCEPTED,
    STATES.TRAVELLING,
    STATES.ARRIVED,
    STATES.WORK_STARTED,
    STATES.IN_PROGRESS,
    STATES.REASSIGNED,
    STATES.REJECTED,
  ],
  [STATES.ESCALATED]: [
    STATES.DEPARTMENT_REVIEW,
    STATES.ASSIGNED,
    STATES.REASSIGNED,
    STATES.CLOSED,
    STATES.REWORK_REQUIRED,
  ],
  [STATES.CLOSED]: [
    STATES.REOPENED,
  ],
  [STATES.REOPENED]: [
    STATES.DEPARTMENT_REVIEW,
    STATES.ASSIGNMENT_RECOMMENDED,
    STATES.ASSIGNED,
    STATES.ESCALATED,
  ],
  [STATES.DUPLICATE]: [
    STATES.DEPARTMENT_REVIEW,
    STATES.REOPENED,
  ],
  [STATES.REJECTED]: [
    STATES.DEPARTMENT_REVIEW,
    STATES.REOPENED,
  ],
};

// Role permissions for state transitions
const ROLE_PERMISSIONS = {
  admin: Object.values(STATES), // Admin can authorize any valid transition or exception
  department_head: Object.values(STATES),
  department_supervisor: [
    STATES.DEPARTMENT_REVIEW,
    STATES.ASSIGNMENT_RECOMMENDED,
    STATES.ASSIGNED,
    STATES.REASSIGNED,
    STATES.ON_HOLD,
    STATES.ESCALATED,
    STATES.DEPARTMENT_REVIEW_COMPLETED,
    STATES.REWORK_REQUIRED,
    STATES.CLOSED,
    STATES.REJECTED,
    STATES.DUPLICATE,
  ],
  department: [
    STATES.DEPARTMENT_REVIEW,
    STATES.ASSIGNMENT_RECOMMENDED,
    STATES.ASSIGNED,
    STATES.REASSIGNED,
    STATES.ON_HOLD,
    STATES.ESCALATED,
    STATES.DEPARTMENT_REVIEW_COMPLETED,
    STATES.REWORK_REQUIRED,
    STATES.CLOSED,
    STATES.REJECTED,
    STATES.DUPLICATE,
  ],
  department_user: [
    STATES.DEPARTMENT_REVIEW,
    STATES.ASSIGNMENT_RECOMMENDED,
    STATES.ASSIGNED,
    STATES.REASSIGNED,
    STATES.ON_HOLD,
    STATES.ESCALATED,
    STATES.DEPARTMENT_REVIEW_COMPLETED,
    STATES.REWORK_REQUIRED,
    STATES.CLOSED,
    STATES.REJECTED,
    STATES.DUPLICATE,
  ],
  engineer: [
    STATES.ENGINEER_ACCEPTED,
    STATES.TRAVELLING,
    STATES.ARRIVED,
    STATES.WORK_STARTED,
    STATES.IN_PROGRESS,
    STATES.AWAITING_VERIFICATION,
    STATES.ON_HOLD,
  ],
  citizen: [
    STATES.REOPENED,
  ],
  system: Object.values(STATES),
};

/**
 * Validates whether a state transition is permitted.
 */
function canTransition(currentStatus, nextStatus, role = "system") {
  const curr = (currentStatus || STATES.NEW).toUpperCase();
  const next = (nextStatus || "").toUpperCase();

  if (!STATES[next]) {
    return {
      allowed: false,
      reason: `Invalid target state '${nextStatus}'.`,
    };
  }

  // Same status is a no-op
  if (curr === next) {
    return { allowed: true, reason: "Status unchanged." };
  }

  const allowedTargets = ALLOWED_TRANSITIONS[curr] || [];
  if (!allowedTargets.includes(next)) {
    return {
      allowed: false,
      reason: `Invalid transition from '${curr}' to '${next}'. Allowed transitions: ${allowedTargets.join(", ") || "none"}.`,
    };
  }

  const userPerms = ROLE_PERMISSIONS[role.toLowerCase()] || [];
  if (!userPerms.includes(next)) {
    return {
      allowed: false,
      reason: `Role '${role}' is not authorized to transition complaints to '${next}'.`,
    };
  }

  return { allowed: true };
}

/**
 * Executes a transition and writes immutable event history to Firestore.
 */
async function transitionComplaintStatus({
  complaintId,
  currentStatus,
  nextStatus,
  actor,
  actorRole = "system",
  reason = "",
  metadata = {},
  db = null,
}) {
  const validation = canTransition(currentStatus, nextStatus, actorRole);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  const nowIso = new Date().toISOString();
  const eventId = `event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const eventRecord = {
    eventId,
    complaintId: complaintId.toUpperCase(),
    previousStatus: (currentStatus || STATES.NEW).toUpperCase(),
    newStatus: nextStatus.toUpperCase(),
    actor: actor || actorRole,
    actorRole,
    reason: reason || `Transition to ${nextStatus}`,
    metadata: metadata || {},
    timestamp: nowIso,
  };

  const timelineEntry = {
    id: `tl-${Date.now()}`,
    date: nowIso,
    user: actor || actorRole,
    action: `Status: ${(currentStatus || STATES.NEW).toUpperCase()} -> ${nextStatus.toUpperCase()}`,
    status: nextStatus.toLowerCase(),
    details: reason || null,
  };

  const historyEntry = {
    action: `Transition to ${nextStatus.toUpperCase()}`,
    previousStatus: (currentStatus || STATES.NEW).toUpperCase(),
    newStatus: nextStatus.toUpperCase(),
    actor: actor || actorRole,
    actorRole,
    reason: reason || null,
    date: nowIso,
  };

  if (db) {
    try {
      // 1. Record immutable audit event
      await db.collection("complaint_events").doc(eventId).set(eventRecord);

      // 2. Update complaint document
      const compRef = db.collection("complaints").doc(complaintId.toUpperCase());
      const docSnap = await compRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        const timeline = data.timeline || [];
        const history = data.history || [];
        timeline.push(timelineEntry);
        history.push(historyEntry);

        await compRef.update({
          status: nextStatus.toLowerCase(),
          workflowStatus: nextStatus.toUpperCase(),
          updatedAt: nowIso,
          timeline,
          history,
          ...(metadata.updateFields || {}),
        });
      }
    } catch (err) {
      console.error("[STATE MACHINE ERROR] Failed writing transition:", err.message);
      throw err;
    }
  }

  return {
    success: true,
    eventRecord,
    timelineEntry,
  };
}

module.exports = {
  STATES,
  ALLOWED_TRANSITIONS,
  ROLE_PERMISSIONS,
  canTransition,
  transitionComplaintStatus,
};
