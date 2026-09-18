/**
 * CivicConnect AI Engineer Recommendation Engine
 * Calculates multi-factor match score for field engineers based on:
 * 1. Skill Match (40%)
 * 2. Workload / Queue Load (25%)
 * 3. Geographic Proximity / Distance (15%)
 * 4. Availability Status (10%)
 * 5. SLA Compatibility / Urgency Fit (10%)
 * 
 * Checks resource compatibility (tools, vehicles, heavy machinery).
 * Produces transparent, explainable recommendations with breakdown reasons.
 */

// Configurable Scoring Weights
const DEFAULT_WEIGHTS = {
  skill: 0.35,
  workload: 0.25,
  distance: 0.20,
  availability: 0.10,
  slaFit: 0.10,
};

// Earth distance helper using Haversine formula (km)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // default 5km fallback
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Calculates engineer recommendation score and generates human-readable explanations.
 */
function scoreEngineerForTask({
  engineer,
  complaint,
  departmentResources = [],
  weights = DEFAULT_WEIGHTS,
}) {
  const reasons = [];
  const constraints = [];

  // 1. Skill Match Score (0 - 100)
  const taskKeywords = [
    complaint.category || "",
    complaint.workType || "",
    complaint.description || "",
    complaint.issueTitle || "",
  ]
    .join(" ")
    .toLowerCase();

  const engSkills = (engineer.skills || []).map((s) => s.toLowerCase());
  let matchedSkills = [];
  engSkills.forEach((skill) => {
    if (taskKeywords.includes(skill) || skill.includes((complaint.category || "").toLowerCase())) {
      matchedSkills.push(skill);
    }
  });

  let skillScore = 50; // base score for same department
  if (matchedSkills.length > 0) {
    skillScore = Math.min(100, 75 + matchedSkills.length * 15);
    reasons.push(`Matched specialized skills: ${matchedSkills.join(", ")}`);
  } else {
    reasons.push("General department qualification");
  }

  // 2. Workload Score (0 - 100)
  // Fewer active tasks = higher score
  const activeTasks = engineer.workloadCount !== undefined ? engineer.workloadCount : (engineer.activeComplaintIds || []).length;
  const maxTasks = engineer.maxConcurrentTasks || 5;
  let workloadScore = Math.max(0, 100 - (activeTasks / maxTasks) * 80);
  if (activeTasks === 0) {
    workloadScore = 100;
    reasons.push("Available with zero active tasks");
  } else if (activeTasks < 3) {
    reasons.push(`Manageable workload (${activeTasks} active tasks)`);
  } else {
    reasons.push(`High task queue (${activeTasks}/${maxTasks} tasks)`);
  }

  // 3. Distance Score (0 - 100)
  let distanceKm = 3.0;
  if (engineer.currentLocation && complaint.location) {
    distanceKm = calculateHaversineDistance(
      engineer.currentLocation.lat,
      engineer.currentLocation.lng,
      complaint.location.lat,
      complaint.location.lng
    );
  }
  let distanceScore = Math.max(10, Math.round(100 - distanceKm * 8));
  reasons.push(`Estimated distance: ${distanceKm} km from task location`);

  // 4. Availability Score (0 - 100)
  const status = (engineer.currentStatus || engineer.status || "available").toLowerCase();
  let availabilityScore = 50;
  if (status === "available") {
    availabilityScore = 100;
    reasons.push("Engineer is currently on duty & available");
  } else if (status === "travelling" || status === "busy") {
    availabilityScore = 60;
    reasons.push(`Engineer is currently ${status}`);
  } else if (status === "on_site") {
    availabilityScore = 40;
    reasons.push("Currently on site with another task");
  } else {
    availabilityScore = 10;
    reasons.push(`Engineer status is ${status}`);
  }

  // 5. SLA Fit / Priority Fit Score (0 - 100)
  let slaFitScore = 80;
  const isUrgent = (complaint.priority || "").toLowerCase() === "urgent";
  if (isUrgent) {
    if (activeTasks === 0 && (status === "available" || status === "travelling")) {
      slaFitScore = 100;
      reasons.push("High SLA compatibility for urgent task");
    } else {
      slaFitScore = 50;
    }
  }

  // 6. Resource Constraint Check
  const requiredCategory = (complaint.category || "").toLowerCase();
  const requiredTools = departmentResources.filter(
    (r) => (r.category || "").toLowerCase() === requiredCategory && r.status === "available"
  );
  let hasResourceConstraint = false;
  if (departmentResources.length > 0 && requiredTools.length === 0 && isUrgent) {
    hasResourceConstraint = true;
    constraints.push(`Resource constraint: No specialized ${complaint.category} equipment currently in pool`);
  }

  // Weighted total (out of 100)
  const totalScore = Math.round(
    skillScore * weights.skill +
      workloadScore * weights.workload +
      distanceScore * weights.distance +
      availabilityScore * weights.availability +
      slaFitScore * weights.slaFit -
      (hasResourceConstraint ? 15 : 0)
  );

  return {
    engineerId: engineer.engineerId || engineer.id,
    engineerName: engineer.name || engineer.engineerName || "Field Engineer",
    departmentId: engineer.departmentId || engineer.department,
    score: Math.max(10, Math.min(100, totalScore)),
    reasons,
    constraints,
    metrics: {
      skillScore,
      workloadScore,
      distanceScore,
      distanceKm,
      availabilityScore,
      slaFitScore,
      activeTasks,
    },
  };
}

/**
 * Ranks all eligible engineers for a given complaint.
 */
async function generateEngineerRecommendations({
  complaint,
  departmentId,
  db = null,
}) {
  let candidates = [];

  if (db) {
    try {
      const dept = departmentId || complaint.category || complaint.department || "General";
      const snapshot = await db
        .collection("engineers")
        .where("departmentId", "==", dept)
        .get();

      if (!snapshot.empty) {
        candidates = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        // Fallback to users collection if engineers collection not populated
        const usersSnap = await db
          .collection("users")
          .where("role", "==", "engineer")
          .where("department", "==", dept)
          .get();
        if (!usersSnap.empty) {
          candidates = usersSnap.docs.map((d) => ({
            id: d.id,
            engineerId: d.id,
            name: d.data().name || d.data().email,
            departmentId: dept,
            skills: d.data().skills || [dept],
            currentStatus: d.data().status || "available",
            workloadCount: d.data().currentWorkload || 0,
            maxConcurrentTasks: 5,
          }));
        }
      }
    } catch (e) {
      console.warn("Could not query engineers in Firestore:", e.message);
    }
  }

  // Fallback defaults if database has none
  if (candidates.length === 0) {
    const dept = departmentId || complaint.category || "General";
    candidates = [
      {
        engineerId: `ENG-${dept.substring(0, 3).toUpperCase()}-01`,
        name: `Lead Officer (${dept})`,
        departmentId: dept,
        skills: [dept, "Urgent Repair", "Inspection"],
        currentStatus: "available",
        workloadCount: 1,
        maxConcurrentTasks: 5,
        currentLocation: { lat: 12.9716, lng: 77.5946 },
      },
      {
        engineerId: `ENG-${dept.substring(0, 3).toUpperCase()}-02`,
        name: `Senior Technician (${dept})`,
        departmentId: dept,
        skills: [dept, "Field Restoration"],
        currentStatus: "available",
        workloadCount: 2,
        maxConcurrentTasks: 5,
        currentLocation: { lat: 12.975, lng: 77.601 },
      },
    ];
  }

  // Score all candidates
  const scored = candidates.map((eng) =>
    scoreEngineerForTask({ engineer: eng, complaint })
  );

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  const topPick = scored[0];

  return {
    recommendedEngineerId: topPick.engineerId,
    recommendedEngineerName: topPick.engineerName,
    score: topPick.score,
    reasons: topPick.reasons,
    constraints: topPick.constraints,
    breakdown: topPick.metrics,
    rankedCandidates: scored,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  scoreEngineerForTask,
  generateEngineerRecommendations,
  calculateHaversineDistance,
  DEFAULT_WEIGHTS,
};
