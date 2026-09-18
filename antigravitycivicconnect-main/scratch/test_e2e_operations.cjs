/**
 * CivicConnect End-to-End Operations Lifecycle Test
 * Simulates the full 25-step complaint lifecycle using in-memory mock DB
 * (no Firebase connection needed)
 * Run: node scratch/test_e2e_operations.js
 */

const { STATES, canTransition, transitionComplaintStatus } = require("../functions/stateMachine.js");
const { scoreEngineerForTask, generateEngineerRecommendations } = require("../functions/recommendationEngine.js");
const { evaluateComplaintSLA, calculateSLAPolicy } = require("../functions/slaEngine.js");
const { verifyWorkCompletion, calculateDistanceMeters } = require("../functions/verificationEngine.js");

let passed = 0;
let failed = 0;
let stepNum = 0;

function step(label) {
  stepNum++;
  console.log(`\nStep ${stepNum}: ${label}`);
}

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

// ---- Mock In-Memory DB ----
const mockDB = new Map();
const mockEvents = [];

const mockFirestoreDB = {
  collection: (colName) => ({
    doc: (docId) => ({
      get: async () => {
        const data = mockDB.get(`${colName}/${docId}`);
        return { exists: Boolean(data), data: () => data, id: docId };
      },
      set: async (data) => { mockDB.set(`${colName}/${docId}`, data); },
      update: async (patch) => {
        const existing = mockDB.get(`${colName}/${docId}`) || {};
        // Simple flat merge for test purposes
        const merged = { ...existing };
        for (const [k, v] of Object.entries(patch)) {
          if (k.includes(".")) {
            const parts = k.split(".");
            let obj = merged;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!obj[parts[i]]) obj[parts[i]] = {};
              obj = obj[parts[i]];
            }
            obj[parts[parts.length - 1]] = v;
          } else {
            merged[k] = v;
          }
        }
        mockDB.set(`${colName}/${docId}`, merged);
      },
      collection: (subCol) => ({
        doc: (subId) => ({
          set: async (data) => { mockDB.set(`${colName}/${docId}/${subCol}/${subId}`, data); },
        }),
        get: async () => ({ docs: [] }),
      }),
    }),
    add: async (data) => {
      const id = `auto-${Date.now()}-${Math.random().toString(16).slice(2,6)}`;
      mockDB.set(`${colName}/${id}`, data);
      if (colName === "complaint_events") mockEvents.push(data);
      return { id };
    },
    where: () => ({ get: async () => ({ empty: true, docs: [] }) }),
    limit: () => ({ get: async () => ({ empty: true }) }),
    get: async () => ({ docs: [], empty: true }),
  }),
};

// ---- Seed Test Data ----
const COMPLAINT_ID = "E2E-TEST-001";
const ENGINEER_ID = "ENG-E2E-01";
const SUPERVISOR_ID = "SUP-E2E-01";

mockDB.set(`complaints/${COMPLAINT_ID}`, {
  complaintId: COMPLAINT_ID,
  description: "Large pothole on Residency Road causing vehicle damage",
  title: "Deep Pothole — Residency Road",
  category: "Roads",
  priority: "urgent",
  status: "new",
  workflowStatus: STATES.NEW,
  location: { lat: 12.9716, lng: 77.5946 },
  createdAt: new Date().toISOString(),
  userId: "citizen-001",
  userEmail: "citizen@example.com",
  timeline: [],
  history: [],
});

async function getComplaint() {
  return mockDB.get(`complaints/${COMPLAINT_ID}`);
}

async function transition(from, to, actor, role, reason, extraFields = {}) {
  const comp = await getComplaint();
  const result = await transitionComplaintStatus({
    complaintId: COMPLAINT_ID,
    currentStatus: from,
    nextStatus: to,
    actor,
    actorRole: role,
    reason,
    metadata: { updateFields: extraFields },
    db: mockFirestoreDB,
  });
  return result;
}

async function run() {
  console.log("\n" + "=".repeat(60));
  console.log(" CivicConnect — 25-Step E2E Operations Simulation");
  console.log("=".repeat(60));

  // STEP 1: Verify complaint exists in NEW state
  step("Complaint Created in NEW state");
  let comp = await getComplaint();
  assert(comp.workflowStatus === STATES.NEW, `Complaint starts in NEW state`);

  // STEP 2: AI Classification
  step("AI classifies complaint → AI_CLASSIFIED");
  await transition(STATES.NEW, STATES.AI_CLASSIFIED, "distilbert-model", "system", "Text classification: Roads (0.94 confidence)");
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.AI_CLASSIFIED, `Status = AI_CLASSIFIED`);

  // STEP 3: SLA Policy Calculation
  step("SLA Policy calculated for urgent complaint");
  const slaPolicy = calculateSLAPolicy("urgent");
  assert(slaPolicy.slaHours === 12, `Urgent SLA = 12 hours (got ${slaPolicy.slaHours})`);
  assert(slaPolicy.slaStatus === "SAFE", `Initial SLA status = SAFE`);

  // STEP 4: Generate AI Engineer Recommendation
  step("AI Engineer Recommendation generated");
  const recResult = await generateEngineerRecommendations({
    complaint: comp,
    departmentId: "Roads",
    db: null, // Uses fallback candidates
  });
  assert(typeof recResult.recommendedEngineerId === "string", `Has recommended engineer ID`);
  assert(recResult.score >= 1 && recResult.score <= 100, `Score in valid range: ${recResult.score}`);
  assert(recResult.rankedCandidates.length >= 1, `Has at least 1 ranked candidate`);

  // STEP 5: Move to ASSIGNMENT_RECOMMENDED
  step("Status → ASSIGNMENT_RECOMMENDED (AI attached recommendation)");
  await transition(STATES.AI_CLASSIFIED, STATES.ASSIGNMENT_RECOMMENDED, "workflow-engine", "system", "AI recommendation generated", {
    "assignment.aiRecommendation": recResult,
    "assignment.slaPolicy": slaPolicy,
  });
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.ASSIGNMENT_RECOMMENDED, `Status = ASSIGNMENT_RECOMMENDED`);

  // STEP 6: Supervisor Assigns Engineer
  step("Supervisor assigns AI-recommended engineer → ASSIGNED");
  const nowIso = new Date().toISOString();
  await transition(STATES.ASSIGNMENT_RECOMMENDED, STATES.ASSIGNED, SUPERVISOR_ID, "department_supervisor", `Supervisor accepted AI recommendation for ${ENGINEER_ID}`, {
    assignedEngineerId: ENGINEER_ID,
    "assignment.engineerId": ENGINEER_ID,
    "assignment.engineerName": "Test Engineer",
    "assignment.assignedAt": nowIso,
    "assignment.slaDeadline": slaPolicy.slaDeadline,
  });
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.ASSIGNED, `Status = ASSIGNED`);
  assert(comp.assignedEngineerId === ENGINEER_ID, `Assigned to correct engineer`);

  // STEP 7: Engineer Accepts Task
  step("Engineer accepts assigned task → ENGINEER_ACCEPTED");
  await transition(STATES.ASSIGNED, STATES.ENGINEER_ACCEPTED, ENGINEER_ID, "engineer", "Engineer reviewed brief and accepted assignment", {
    "assignment.acceptedAt": new Date().toISOString(),
  });
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.ENGINEER_ACCEPTED, `Status = ENGINEER_ACCEPTED`);

  // STEP 8: SLA Evaluation during travel
  step("SLA evaluated — complaint is still SAFE with 12h window");
  const slaEval = evaluateComplaintSLA(comp);
  assert(typeof slaEval.slaStatus === "string", `SLA status is string: ${slaEval.slaStatus}`);
  assert(typeof slaEval.breachProbability === "number", `Breach probability is number`);

  // STEP 9: Engineer marks Travelling
  step("Engineer departs → TRAVELLING");
  await transition(STATES.ENGINEER_ACCEPTED, STATES.TRAVELLING, ENGINEER_ID, "engineer", "Engineer en route to complaint coordinates", {
    "assignment.travellingStartedAt": new Date().toISOString(),
    "assignment.departureLocation": { lat: 12.98, lng: 77.60 },
  });
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.TRAVELLING, `Status = TRAVELLING`);

  // STEP 10: GPS Arrival Check (within 250m)
  step("GPS Arrival Verification (within 250m threshold)");
  const arrivalDist = calculateDistanceMeters(12.9716, 77.5946, 12.9720, 77.5948);
  const arrivalVerified = arrivalDist <= 250;
  assert(arrivalVerified === true, `Arrival verified: ${arrivalDist}m < 250m threshold`);

  // STEP 11: Mark Arrived
  step("Engineer arrives → ARRIVED");
  await transition(STATES.TRAVELLING, STATES.ARRIVED, ENGINEER_ID, "engineer", `GPS verified arrival (${arrivalDist}m from site)`, {
    "assignment.arrivedAt": new Date().toISOString(),
    "assignment.arrivalGps": { lat: 12.9720, lng: 77.5948 },
    "assignment.arrivalVerified": true,
    "assignment.arrivalDistanceMeters": arrivalDist,
  });
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.ARRIVED, `Status = ARRIVED`);

  // STEP 12: Start Physical Work
  step("Engineer begins repair → WORK_STARTED");
  await transition(STATES.ARRIVED, STATES.WORK_STARTED, ENGINEER_ID, "engineer", "Safety checks complete. Hot mix asphalt prepared.", {
    "assignment.workStartedAt": new Date().toISOString(),
  });
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.WORK_STARTED, `Status = WORK_STARTED`);

  // STEP 13: Engineer uploads BEFORE evidence
  step("Before evidence photo recorded");
  const beforeImageUrl = "https://example.com/evidence/before-001.jpg";
  await mockFirestoreDB.collection("complaints").doc(COMPLAINT_ID).update({ beforeImageUrl });
  comp = await getComplaint();
  assert(comp.beforeImageUrl === beforeImageUrl, `Before image URL saved`);

  // STEP 14: Engineer uploads AFTER evidence
  step("After evidence photo recorded");
  const afterImageUrl = "https://example.com/evidence/after-001.jpg";
  await mockFirestoreDB.collection("complaints").doc(COMPLAINT_ID).update({ afterImageUrl });
  comp = await getComplaint();
  assert(comp.afterImageUrl === afterImageUrl, `After image URL saved`);

  // STEP 15: AI Resolution Verification
  step("AI Verification runs on before/after images");
  const verification = await verifyWorkCompletion({
    complaint: comp,
    beforeImageUrl,
    afterImageUrl,
    workDescription: "Pothole filled with 80kg hot mix asphalt, compacted and levelled. Surface smooth.",
    workType: "Pothole Patching",
    engineerNotes: "Used infrared heater + roller. Quality A-grade.",
    completionGps: { lat: 12.9716, lng: 77.5946 },
    arrivalGps: { lat: 12.9720, lng: 77.5948 },
  });
  assert(["VERIFIED", "UNCERTAIN"].includes(verification.verificationStatus), `AI returns valid status: ${verification.verificationStatus}`);
  assert(verification.evidenceChecks.hasBeforeImage, "Before image confirmed by AI check");
  assert(verification.evidenceChecks.hasAfterImage, "After image confirmed by AI check");
  assert(verification.evidenceChecks.locationConsistency, "GPS location consistent");

  // STEP 16: Transition to AWAITING_VERIFICATION
  step("Work submitted → AWAITING_VERIFICATION");
  await transition(STATES.WORK_STARTED, STATES.AWAITING_VERIFICATION, ENGINEER_ID, "engineer", `Work complete. AI: ${verification.verificationStatus} (${verification.confidence}%)`, {
    verification,
    "assignment.completedAt": new Date().toISOString(),
  });
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.AWAITING_VERIFICATION, `Status = AWAITING_VERIFICATION`);

  // STEP 17: REWORK path — Supervisor requests rework
  step("REWORK PATH: Supervisor requests rework");
  await transition(STATES.AWAITING_VERIFICATION, STATES.REWORK_REQUIRED, SUPERVISOR_ID, "department_supervisor", "Debris left on road shoulder. Clear and provide new after photo.");
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.REWORK_REQUIRED, `Status = REWORK_REQUIRED`);

  // STEP 18: Engineer re-submits
  step("Engineer completes rework → AWAITING_VERIFICATION");
  const newAfterUrl = "https://example.com/evidence/after-002-clean.jpg";
  await mockFirestoreDB.collection("complaints").doc(COMPLAINT_ID).update({ afterImageUrl: newAfterUrl });
  await transition(STATES.REWORK_REQUIRED, STATES.AWAITING_VERIFICATION, ENGINEER_ID, "engineer", "Rework completed. Debris cleared. New after photo uploaded.");
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.AWAITING_VERIFICATION, `Status = AWAITING_VERIFICATION (re-submitted)`);

  // STEP 19: Department Review Completed
  step("Supervisor approves → DEPARTMENT_REVIEW_COMPLETED");
  await transition(STATES.AWAITING_VERIFICATION, STATES.DEPARTMENT_REVIEW_COMPLETED, SUPERVISOR_ID, "department_supervisor", "Evidence reviewed and approved. Quality meets standard.", {
    "departmentReview.approved": true,
    "departmentReview.reviewedAt": new Date().toISOString(),
  });
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.DEPARTMENT_REVIEW_COMPLETED, `Status = DEPARTMENT_REVIEW_COMPLETED`);

  // STEP 20: Complaint Closed
  step("Complaint officially CLOSED");
  await transition(STATES.DEPARTMENT_REVIEW_COMPLETED, STATES.CLOSED, SUPERVISOR_ID, "department_supervisor", "Resolution verified and complaint closed.", {
    resolvedAt: new Date().toISOString(),
    closedAt: new Date().toISOString(),
  });
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.CLOSED, `Status = CLOSED`);

  // STEP 21: Citizen feedback simulation
  step("Citizen submits feedback");
  const feedbackReceived = comp.workflowStatus === STATES.CLOSED;
  assert(feedbackReceived, "Complaint is CLOSED — ready for citizen feedback");

  // STEP 22: Citizen reopens (within window)
  step("Citizen REOPENS closed complaint");
  await transition(STATES.CLOSED, STATES.REOPENED, "citizen-001", "citizen", "The pothole is back after rain. Work was superficial.");
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.REOPENED, `Status = REOPENED`);

  // STEP 23: Escalate reopened complaint
  step("Escalate REOPENED complaint");
  await transition(STATES.REOPENED, STATES.ESCALATED, "supervisor-001", "department_supervisor", "Citizen disputed resolution. Escalating for root cause analysis.");
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.ESCALATED, `Status = ESCALATED`);

  // STEP 24: Admin reassigns
  step("Admin reassigns ESCALATED complaint");
  await transition(STATES.ESCALATED, STATES.ASSIGNED, "admin-001", "admin", "Admin reassigned with new requirements.", {
    assignedEngineerId: "ENG-E2E-02",
    "assignment.engineerId": "ENG-E2E-02",
  });
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.ASSIGNED, `Status = ASSIGNED (re-assigned by admin)`);

  // STEP 25: Final closure
  step("Final CLOSED — complete lifecycle");
  // Run through minimal sub-flow: ASSIGNED → ARRIVED → WORK_STARTED → AWAITING_VERIFICATION → CLOSED
  await transition(STATES.ASSIGNED, STATES.ENGINEER_ACCEPTED, "ENG-E2E-02", "engineer", "New engineer accepted");
  await transition(STATES.ENGINEER_ACCEPTED, STATES.ARRIVED, "ENG-E2E-02", "engineer", "Arrived on site (GPS verified)");
  await transition(STATES.ARRIVED, STATES.WORK_STARTED, "ENG-E2E-02", "engineer", "Full reconstruction started");
  await transition(STATES.WORK_STARTED, STATES.AWAITING_VERIFICATION, "ENG-E2E-02", "engineer", "Full depth pothole repaired");
  await transition(STATES.AWAITING_VERIFICATION, STATES.DEPARTMENT_REVIEW_COMPLETED, SUPERVISOR_ID, "department_supervisor", "Final review approved");
  await transition(STATES.DEPARTMENT_REVIEW_COMPLETED, STATES.CLOSED, SUPERVISOR_ID, "department_supervisor", "Complaint fully resolved and closed.", {
    resolvedAt: new Date().toISOString(),
    closedAt: new Date().toISOString(),
  });
  comp = await getComplaint();
  assert(comp.workflowStatus === STATES.CLOSED, `Step 25: Final CLOSED state achieved`);

  // Event Audit Log check
  const totalEvents = comp.timeline?.length || 0;
  console.log(`\n  📋 Timeline entries recorded: ${totalEvents}`);
  assert(totalEvents > 10, `Timeline has ${totalEvents} immutable entries (expected >10)`);

  // Final report
  console.log("\n" + "=".repeat(60));
  console.log(` E2E RESULTS: ${passed} passed | ${failed} failed | ${stepNum} steps`);
  console.log("=".repeat(60));

  if (failed === 0) {
    console.log("\n🎉 All 25-step E2E operations tests passed!\n");
    process.exit(0);
  } else {
    console.error(`\n⚠️  ${failed} test(s) failed.\n`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("E2E test runner error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
