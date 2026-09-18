/**
 * CivicConnect Resolution Verification & Rework Flow Tests
 * Run: node scratch/test_resolution_verification.js
 */

const { verifyWorkCompletion } = require("../functions/verificationEngine.js");

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

const baseComplaint = {
  complaintId: "TEST-001",
  description: "Deep pothole on main road near junction",
  issueDescription: "Deep pothole on main road near junction",
  title: "Pothole Repair",
  workType: "Pothole Patching",
  location: { lat: 12.9716, lng: 77.5946 },
  priority: "urgent",
};

async function runTests() {
  console.log("\n=== MISSING EVIDENCE — SHOULD FAIL ===");

  // Missing before image
  const missingBefore = await verifyWorkCompletion({
    complaint: baseComplaint,
    beforeImageUrl: null,
    afterImageUrl: "https://example.com/after.jpg",
    workDescription: "Pothole patched with cold mix asphalt",
    workType: "Pothole Patching",
    completionGps: { lat: 12.9716, lng: 77.5946 },
  });
  assert(missingBefore.verificationStatus === "FAILED", "Missing before image → FAILED");
  assert(missingBefore.confidence === 0, "Missing evidence → 0 confidence");

  // Missing after image
  const missingAfter = await verifyWorkCompletion({
    complaint: baseComplaint,
    beforeImageUrl: "https://example.com/before.jpg",
    afterImageUrl: null,
    workDescription: "Pothole patched with cold mix asphalt",
    workType: "Pothole Patching",
    completionGps: { lat: 12.9716, lng: 77.5946 },
  });
  assert(missingAfter.verificationStatus === "FAILED", "Missing after image → FAILED");

  console.log("\n=== GPS MISMATCH — LOCATION INCONSISTENCY ===");

  // GPS far from complaint (500+ meters away)
  const gpsMismatch = await verifyWorkCompletion({
    complaint: baseComplaint,
    beforeImageUrl: "https://example.com/before.jpg",
    afterImageUrl: "https://example.com/after.jpg",
    workDescription: "Pothole repair completed with fresh asphalt, surface levelled",
    workType: "Pothole Patching",
    completionGps: { lat: 13.05, lng: 77.65 }, // ~12km away
  });
  assert(
    gpsMismatch.verificationStatus === "UNCERTAIN" || gpsMismatch.verificationStatus === "FAILED",
    `GPS 12km away → UNCERTAIN or FAILED (got ${gpsMismatch.verificationStatus})`
  );
  assert(gpsMismatch.evidenceChecks.locationConsistency === false, "Location inconsistency flag set");
  assert(gpsMismatch.evidenceChecks.locationDiscrepancyMeters > 300, "Discrepancy > 300m recorded");

  console.log("\n=== VALID EVIDENCE WITH GOOD GPS ===");

  // Within GPS range, both images present (no Gemini key in test env, uses fallback)
  const validCompletion = await verifyWorkCompletion({
    complaint: baseComplaint,
    beforeImageUrl: "https://example.com/before.jpg",
    afterImageUrl: "https://example.com/after.jpg",
    workDescription: "Filled pothole with hot mix asphalt, compacted and levelled. Surface meets standard.",
    workType: "Pothole Patching",
    completionGps: { lat: 12.9716, lng: 77.5946 }, // exact match
  });
  assert(
    validCompletion.verificationStatus === "VERIFIED" || validCompletion.verificationStatus === "UNCERTAIN",
    `Valid evidence → VERIFIED or UNCERTAIN (got ${validCompletion.verificationStatus})`
  );
  assert(validCompletion.evidenceChecks.hasBeforeImage === true, "Before image confirmed");
  assert(validCompletion.evidenceChecks.hasAfterImage === true, "After image confirmed");
  assert(typeof validCompletion.confidence === "number", "Returns numeric confidence");
  assert(validCompletion.confidence >= 50, `Confidence ≥50 for valid case (got ${validCompletion.confidence})`);

  console.log("\n=== REWORK FLOW STATE TRANSITION SIMULATION ===");

  // Simulate AWAITING_VERIFICATION → REWORK_REQUIRED
  const { canTransition, STATES } = require("../functions/stateMachine.js");
  const reworkTransition = canTransition(STATES.AWAITING_VERIFICATION, STATES.REWORK_REQUIRED, "department_supervisor");
  assert(reworkTransition.allowed === true, "Supervisor can request REWORK_REQUIRED");

  // After rework → engineer can go to WORK_STARTED again
  const reworkToWorkStarted = canTransition(STATES.REWORK_REQUIRED, STATES.WORK_STARTED, "engineer");
  assert(reworkToWorkStarted.allowed === true, "Engineer can restart WORK_STARTED from REWORK_REQUIRED");

  // After rework re-submission → AWAITING_VERIFICATION again
  const reworkToAwaiting = canTransition(STATES.REWORK_REQUIRED, STATES.AWAITING_VERIFICATION, "engineer");
  assert(reworkToAwaiting.allowed === true, "Engineer can go REWORK_REQUIRED → AWAITING_VERIFICATION directly");

  // Supervisor approves second attempt → CLOSED
  const awaitingToClosed = canTransition(STATES.DEPARTMENT_REVIEW_COMPLETED, STATES.CLOSED, "department_supervisor");
  assert(awaitingToClosed.allowed === true, "Supervisor can CLOSE after DEPARTMENT_REVIEW_COMPLETED");

  console.log("\n=== RESULTS ===");
  console.log(`Passed: ${passed} | Failed: ${failed}`);
  if (failed === 0) {
    console.log("\n🎉 All resolution verification tests passed!\n");
    process.exit(0);
  } else {
    console.error(`\n⚠️  ${failed} test(s) failed.\n`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
