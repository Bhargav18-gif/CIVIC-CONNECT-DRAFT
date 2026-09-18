/**
 * CivicConnect GPS Geofence & Arrival Verification Tests
 * Run: node scratch/test_arrival_gps.js
 */

const { calculateDistanceMeters, verifyWorkCompletion } = require("../functions/verificationEngine.js");

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

console.log("\n=== DISTANCE CALCULATIONS ===");

const d0 = calculateDistanceMeters(12.9716, 77.5946, 12.9716, 77.5946);
assert(d0 === 0, `Same point = 0m (got ${d0}m)`);

const d100 = calculateDistanceMeters(12.9716, 77.5946, 12.9723, 77.5946);
assert(d100 > 50 && d100 < 200, `~100m apart = ${d100}m (expected 50-200m)`);

const d500 = calculateDistanceMeters(12.9716, 77.5946, 12.9761, 77.5946);
assert(d500 > 300 && d500 < 700, `~500m apart = ${d500}m (expected 300-700m)`);

const d5km = calculateDistanceMeters(12.9716, 77.5946, 13.0166, 77.5946);
assert(d5km > 4000 && d5km < 6000, `~5km apart = ${d5km}m (expected 4000-6000m)`);

console.log("\n=== ARRIVAL GEOFENCE LOGIC (250m threshold) ===");

// Simulate the arrival check logic from server/index.js
function simulateArrivalCheck(complaintLat, complaintLng, arrivalLat, arrivalLng, threshold = 250) {
  const dist = calculateDistanceMeters(complaintLat, complaintLng, arrivalLat, arrivalLng);
  return { arrivalVerified: dist <= threshold, distanceMeters: dist };
}

const withinRange = simulateArrivalCheck(12.9716, 77.5946, 12.9720, 77.5948);
assert(withinRange.arrivalVerified === true, `Within 250m: ${withinRange.distanceMeters}m → verified`);

const exactThreshold = simulateArrivalCheck(12.9716, 77.5946, 12.9739, 77.5946);
console.log(`  Threshold check: ${exactThreshold.distanceMeters}m`);
assert(typeof exactThreshold.arrivalVerified === "boolean", "Returns boolean arrivalVerified");

const outsideRange = simulateArrivalCheck(12.9716, 77.5946, 13.05, 77.65);
assert(outsideRange.arrivalVerified === false, `Far away: ${outsideRange.distanceMeters}m → not verified`);
assert(outsideRange.distanceMeters > 250, `Distance ${outsideRange.distanceMeters}m exceeds 250m threshold`);

console.log("\n=== JUSTIFICATION OVERRIDE PATH ===");

// When not verified, server returns 400 with requiresJustification:true
// Simulating the logic (without actual server call)
function simulateArriveEndpoint(lat, lng, complaintLat, complaintLng, manualJustification) {
  const dist = calculateDistanceMeters(complaintLat, complaintLng, lat, lng);
  const arrivalVerified = dist <= 250;
  if (!arrivalVerified && !manualJustification) {
    return { status: 400, body: { requiresJustification: true, distanceMeters: dist } };
  }
  return { status: 200, body: { arrivalVerified, distanceMeters: dist } };
}

const noJustification = simulateArriveEndpoint(13.05, 77.65, 12.9716, 77.5946, null);
assert(noJustification.status === 400, "Missing justification returns 400");
assert(noJustification.body.requiresJustification === true, "Response includes requiresJustification:true");

const withJustification = simulateArriveEndpoint(13.05, 77.65, 12.9716, 77.5946, "Road access blocked, parked on adjacent street");
assert(withJustification.status === 200, "With justification proceeds past geofence check");

console.log("\n=== RESULTS ===");
console.log(`Passed: ${passed} | Failed: ${failed}`);
if (failed === 0) {
  console.log("\n🎉 All GPS geofence tests passed!\n");
  process.exit(0);
} else {
  console.error(`\n⚠️  ${failed} test(s) failed.\n`);
  process.exit(1);
}
