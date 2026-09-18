/**
 * CivicConnect Recommendation Engine Unit Tests
 * Run: node scratch/test_recommendation.js
 */

const { scoreEngineerForTask, calculateHaversineDistance, DEFAULT_WEIGHTS } = require("../functions/recommendationEngine.js");

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

const complaint = {
  category: "Roads",
  workType: "Pothole Patching",
  description: "Large pothole on main road causing accidents",
  issueTitle: "Pothole on MG Road",
  priority: "urgent",
  location: { lat: 12.9716, lng: 77.5946 },
};

const specialistEngineer = {
  engineerId: "ENG-001",
  name: "Rajesh Kumar",
  departmentId: "Roads",
  skills: ["Roads", "Pothole Patching", "Asphalt Repair"],
  currentStatus: "available",
  workloadCount: 0,
  maxConcurrentTasks: 5,
  currentLocation: { lat: 12.972, lng: 77.595 }, // ~300m away
};

const generalistEngineer = {
  engineerId: "ENG-002",
  name: "Priya Sharma",
  departmentId: "Roads",
  skills: ["Roads"],
  currentStatus: "available",
  workloadCount: 3,
  maxConcurrentTasks: 5,
  currentLocation: { lat: 13.05, lng: 77.65 }, // ~12km away
};

const overloadedEngineer = {
  engineerId: "ENG-003",
  name: "Arun Singh",
  departmentId: "Roads",
  skills: ["Roads", "Pothole Patching"],
  currentStatus: "on_site",
  workloadCount: 5,
  maxConcurrentTasks: 5,
  currentLocation: { lat: 12.9716, lng: 77.5946 }, // same location
};

console.log("\n=== HAVERSINE DISTANCE CALCULATION ===");

const dist0 = calculateHaversineDistance(12.9716, 77.5946, 12.9716, 77.5946);
assert(dist0 === 0, "Same coordinates = 0km distance");

const dist1 = calculateHaversineDistance(12.9716, 77.5946, 12.9800, 77.6100);
assert(dist1 > 0 && dist1 < 3, `Nearby point = ${dist1}km (expected < 3km)`);

// Note: the engine uses a 5km fallback when any coord is 0 (falsy), so use non-zero far-apart coords
const d2 = calculateHaversineDistance(1, 1, 89, 1); // ~9800km apart
assert(d2 > 9000 && d2 < 11000, `Near-pole distance = ${d2}km (expected ~9800km)`);

console.log("\n=== ENGINEER SCORING ===");

const specialistScore = scoreEngineerForTask({ engineer: specialistEngineer, complaint });
const generalistScore = scoreEngineerForTask({ engineer: generalistEngineer, complaint });
const overloadedScore = scoreEngineerForTask({ engineer: overloadedEngineer, complaint });

console.log(`  Specialist score: ${specialistScore.score}`);
console.log(`  Generalist score: ${generalistScore.score}`);
console.log(`  Overloaded score: ${overloadedScore.score}`);

assert(specialistScore.score > generalistScore.score, "Specialist ranks higher than generalist");
assert(specialistScore.score > overloadedScore.score, "Specialist ranks higher than overloaded engineer");
assert(specialistScore.score >= 70, `Specialist score is ≥70 (got ${specialistScore.score})`);
assert(specialistScore.metrics.skillScore > 50, "Specialist has skill score > 50");
assert(specialistScore.metrics.workloadScore === 100, "Zero-task engineer has 100 workload score");
assert(overloadedScore.metrics.availabilityScore < 50, "On-site status gives low availability score");
assert(Array.isArray(specialistScore.reasons), "Returns array of reasons");
assert(specialistScore.reasons.length > 0, "Has at least one reason");

console.log("\n=== FALLBACK (no DB) ===");

const { generateEngineerRecommendations } = require("../functions/recommendationEngine.js");

generateEngineerRecommendations({ complaint, departmentId: "Roads", db: null }).then((rec) => {
  assert(typeof rec.recommendedEngineerId === "string", "Returns recommendedEngineerId");
  assert(typeof rec.score === "number", "Returns numeric score");
  assert(rec.score >= 1 && rec.score <= 100, `Score in [1,100] range (got ${rec.score})`);
  assert(Array.isArray(rec.rankedCandidates), "Returns rankedCandidates array");
  assert(rec.rankedCandidates.length >= 2, "Returns at least 2 candidates in fallback mode");
  assert(rec.rankedCandidates[0].score >= rec.rankedCandidates[1].score, "Candidates sorted desc by score");

  console.log("\n=== RESULTS ===");
  console.log(`Passed: ${passed} | Failed: ${failed}`);
  if (failed === 0) {
    console.log("\n🎉 All recommendation engine tests passed!\n");
    process.exit(0);
  } else {
    console.error(`\n⚠️  ${failed} test(s) failed.\n`);
    process.exit(1);
  }
});
