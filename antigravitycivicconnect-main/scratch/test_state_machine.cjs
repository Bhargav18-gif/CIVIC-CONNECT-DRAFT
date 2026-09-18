/**
 * CivicConnect State Machine Unit Tests
 * Tests valid transitions, invalid transitions, and role permissions
 * Run: node scratch/test_state_machine.js
 */

const { canTransition, transitionComplaintStatus, STATES } = require("../functions/stateMachine.js");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

console.log("\n=== VALID TRANSITIONS ===");

// Happy path: full lifecycle
const happyPath = [
  [STATES.NEW, STATES.AI_CLASSIFIED],
  [STATES.AI_CLASSIFIED, STATES.ASSIGNMENT_RECOMMENDED],
  [STATES.ASSIGNMENT_RECOMMENDED, STATES.ASSIGNED],
  [STATES.ASSIGNED, STATES.ENGINEER_ACCEPTED],
  [STATES.ENGINEER_ACCEPTED, STATES.TRAVELLING],
  [STATES.TRAVELLING, STATES.ARRIVED],
  [STATES.ARRIVED, STATES.WORK_STARTED],
  [STATES.WORK_STARTED, STATES.AWAITING_VERIFICATION],
  [STATES.AWAITING_VERIFICATION, STATES.DEPARTMENT_REVIEW_COMPLETED],
  [STATES.DEPARTMENT_REVIEW_COMPLETED, STATES.CLOSED],
];

happyPath.forEach(([from, to]) => {
  const result = canTransition(from, to, "system");
  assert(result.allowed === true, `${from} -> ${to} (system)`);
});

console.log("\n=== INVALID TRANSITIONS ===");

const invalidTransitions = [
  [STATES.NEW, STATES.CLOSED, "system", "NEW cannot jump to CLOSED"],
  [STATES.NEW, STATES.WORK_STARTED, "system", "NEW cannot jump to WORK_STARTED"],
  [STATES.ASSIGNED, STATES.WORK_STARTED, "engineer", "ASSIGNED cannot skip to WORK_STARTED"],
  [STATES.TRAVELLING, STATES.CLOSED, "system", "TRAVELLING cannot jump to CLOSED"],
  [STATES.CLOSED, STATES.AI_CLASSIFIED, "system", "CLOSED cannot go to AI_CLASSIFIED"],
];

invalidTransitions.forEach(([from, to, role, label]) => {
  const result = canTransition(from, to, role);
  assert(result.allowed === false, label);
});

console.log("\n=== ROLE PERMISSION ENFORCEMENT ===");

// Engineer cannot close a complaint
const engineerCloseResult = canTransition(STATES.AWAITING_VERIFICATION, STATES.CLOSED, "engineer");
assert(engineerCloseResult.allowed === false, "Engineer cannot directly CLOSE a complaint");

// Citizen can only REOPEN
const citizenReopenResult = canTransition(STATES.CLOSED, STATES.REOPENED, "citizen");
assert(citizenReopenResult.allowed === true, "Citizen can REOPEN closed complaint");

const citizenAssignResult = canTransition(STATES.NEW, STATES.ASSIGNED, "citizen");
assert(citizenAssignResult.allowed === false, "Citizen cannot ASSIGN complaint");

// Supervisor cannot make engineer field state changes
const supervisorArriveResult = canTransition(STATES.TRAVELLING, STATES.ARRIVED, "department_supervisor");
assert(supervisorArriveResult.allowed === false, "Supervisor cannot mark ARRIVED (field engineer action)");

// Admin can do anything valid
const adminResult = canTransition(STATES.ESCALATED, STATES.CLOSED, "admin");
assert(adminResult.allowed === true, "Admin can transition ESCALATED -> CLOSED");

console.log("\n=== IMMUTABLE EVENT RECORDING (no-DB mode) ===");

// Without db, should succeed and return event record
transitionComplaintStatus({
  complaintId: "TEST-001",
  currentStatus: STATES.NEW,
  nextStatus: STATES.AI_CLASSIFIED,
  actor: "ai-system",
  actorRole: "system",
  reason: "Auto-classified by DistilBERT",
  db: null,
}).then((result) => {
  assert(result.success === true, "transitionComplaintStatus returns success:true");
  assert(result.eventRecord.complaintId === "TEST-001", "Event record has correct complaintId");
  assert(result.eventRecord.previousStatus === "NEW", "Event records previousStatus");
  assert(result.eventRecord.newStatus === "AI_CLASSIFIED", "Event records newStatus");
  assert(typeof result.eventRecord.eventId === "string", "Event has unique eventId");

  console.log("\n=== RESULTS ===");
  console.log(`Passed: ${passed + 5} | Failed: ${failed}`);
  if (failed === 0) {
    console.log("\n🎉 All state machine tests passed!\n");
    process.exit(0);
  } else {
    console.error(`\n⚠️  ${failed} test(s) failed.\n`);
    process.exit(1);
  }
}).catch((err) => {
  console.error("transitionComplaintStatus error:", err.message);
  process.exit(1);
});
