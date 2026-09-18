/**
 * CivicConnect — Comprehensive Department User Login & Selection Test Suite
 * Tests all 12 operational scenarios from specification:
 * 
 * TEST 1: New department user -> login -> no department -> selection page appears -> choose authorized department -> saved -> department dashboard opens.
 * TEST 2: User already assigned to Roads -> login -> automatically opens Roads dashboard.
 * TEST 3: User authorized for Roads + Drainage -> login -> chooses Roads -> Roads data shown.
 * TEST 4: User authorized for Roads + Drainage -> switches to Drainage -> Drainage data shown -> Roads data removed from active view.
 * TEST 5: User tries to manually modify departmentId to Electricity -> backend rejects unauthorized access (403).
 * TEST 6: Department becomes inactive -> next login -> selection flow appears.
 * TEST 7: User has no authorized departments (0 allowed) -> access denied / assignment-required page.
 * TEST 8: Admin changes a user's department -> user's next session reflects the new assignment.
 * TEST 9: Roads complaint created -> Roads department sees it.
 * TEST 10: Drainage complaint created -> Roads department does not see it.
 * TEST 11: Engineer belongs to Roads -> Roads supervisor can assign Roads complaint.
 * TEST 12: Cross-department unauthorized assignment -> backend rejects.
 */

const assert = require("assert");

// Mock Department Database
const DEPARTMENTS = [
  { departmentId: "Roads", name: "Roads & Bridges Department", code: "RDS", active: true },
  { departmentId: "Drainage", name: "Stormwater & Drainage Dept", code: "DRN", active: true },
  { departmentId: "Water", name: "Water Supply & Sewerage Board", code: "WTR", active: true },
  { departmentId: "Electricity", name: "Electricity Distribution Corp", code: "ELE", active: false }, // Inactive for test
];

// Logic Engine for Department Selection & Validation
function isDepartmentRole(role) {
  if (!role) return false;
  const r = role.toLowerCase();
  return ["department", "department_head", "department_supervisor", "department_user"].includes(r);
}

function resolveLoginDecision(user, departmentsList) {
  if (!user) return { route: "/login", reason: "Unauthenticated" };
  if (user.role === "admin") return { route: "/admin/dashboard", reason: "Admin redirect" };
  if (user.role === "engineer") return { route: "/engineer/dashboard", reason: "Engineer redirect" };
  if (!isDepartmentRole(user.role)) return { route: "/dashboard", reason: "Citizen redirect" };

  const allowed = user.allowedDepartmentIds || (user.departmentId ? [user.departmentId] : []);
  if (allowed.length === 0) {
    return { route: "/department/select", state: "ASSIGNMENT_REQUIRED", reason: "No permitted departments assigned" };
  }

  // Check active state of assigned department
  if (user.departmentId) {
    const deptObj = departmentsList.find(d => d.departmentId.toLowerCase() === user.departmentId.toLowerCase());
    if (!deptObj || deptObj.active === false) {
      return { route: "/department/select", state: "DEPT_INACTIVE", reason: "Assigned department inactive" };
    }
    // If assigned and active
    return { route: "/department/dashboard", departmentId: user.departmentId, reason: "Valid active department assigned" };
  }

  // If user has exactly 1 allowed department, auto-assign
  if (allowed.length === 1) {
    const deptObj = departmentsList.find(d => d.departmentId.toLowerCase() === allowed[0].toLowerCase());
    if (deptObj && deptObj.active !== false) {
      return { route: "/department/dashboard", departmentId: allowed[0], autoAssigned: true, reason: "Single allowed department auto-assigned" };
    }
    return { route: "/department/select", state: "DEPT_INACTIVE", reason: "Single allowed department is inactive" };
  }

  // Multiple allowed departments with no active selection yet
  return { route: "/department/select", state: "SELECTION_REQUIRED", permittedDepartments: allowed };
}

function validateDepartmentAccess(user, requestedDeptId) {
  if (!user) return { allowed: false, status: 401, reason: "Unauthenticated." };
  if (user.role === "admin") return { allowed: true };

  const allowed = (user.allowedDepartmentIds || (user.departmentId ? [user.departmentId] : [])).map(d => d.toLowerCase());
  if (allowed.length === 0) {
    return { allowed: false, status: 403, reason: "User has not been assigned to any operational department." };
  }

  const requested = (requestedDeptId || "").toLowerCase();
  if (requested === "all") {
    if (user.role === "admin") return { allowed: true };
    return { allowed: false, status: 403, reason: "Unauthorized: Only admin can access all queues." };
  }

  if (!allowed.includes(requested)) {
    return { allowed: false, status: 403, reason: `Unauthorized: User cannot access department '${requestedDeptId}'. Permitted: ${allowed.join(", ")}` };
  }

  return { allowed: true };
}

function filterComplaintsForDepartment(complaints, activeDeptId) {
  return complaints.filter(c => {
    const dept = (c.category || c.department || "").toLowerCase();
    return dept === activeDeptId.toLowerCase();
  });
}

function validateTaskAssignment(supervisor, task, engineer) {
  // 1. Supervisor must be authorized for task department
  const taskDept = task.category || task.department || "General";
  const supAccess = validateDepartmentAccess(supervisor, taskDept);
  if (!supAccess.allowed) {
    return { allowed: false, status: 403, reason: `Supervisor unauthorized for task department '${taskDept}'.` };
  }

  // 2. Engineer must belong to task department
  const engDept = (engineer.departmentId || "").toLowerCase();
  if (engDept !== taskDept.toLowerCase()) {
    return {
      allowed: false,
      status: 403,
      reason: `Cross-department assignment rejected: Engineer '${engineer.name}' belongs to '${engineer.departmentId}' but complaint is in '${taskDept}'.`,
    };
  }

  return { allowed: true };
}

// ==========================================
// RUNNING THE 12 TESTS
// ==========================================

console.log("\n============================================================");
console.log(" CivicConnect — Department User & Selection Test Suite");
console.log("============================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} ->`, err.message);
    failed++;
  }
}

// TEST 1: New department user -> login -> no department -> selection page appears -> choose authorized department -> saved -> department dashboard opens.
runTest("TEST 1: New department user redirects to selection page, selects authorized department, and proceeds to dashboard", () => {
  const newUser = {
    uid: "user_new_01",
    name: "Ramesh Officer",
    role: "department_supervisor",
    departmentId: null,
    allowedDepartmentIds: ["Roads", "Drainage"],
  };

  const decision = resolveLoginDecision(newUser, DEPARTMENTS);
  assert.strictEqual(decision.route, "/department/select", "Should route to /department/select");
  assert.strictEqual(decision.state, "SELECTION_REQUIRED");

  // User chooses 'Roads'
  const chosenDept = "Roads";
  const authCheck = validateDepartmentAccess(newUser, chosenDept);
  assert.strictEqual(authCheck.allowed, true, "Selection of 'Roads' should be authorized");

  // Profile is saved with active department
  newUser.departmentId = chosenDept;
  newUser.departmentAssignedAt = new Date().toISOString();

  // Next login or dashboard navigation
  const nextDecision = resolveLoginDecision(newUser, DEPARTMENTS);
  assert.strictEqual(nextDecision.route, "/department/dashboard");
  assert.strictEqual(nextDecision.departmentId, "Roads");
});

// TEST 2: User already assigned to Roads -> login -> automatically opens Roads dashboard.
runTest("TEST 2: User already assigned to Roads automatically opens Roads dashboard", () => {
  const roadsUser = {
    uid: "user_roads_01",
    name: "Suresh Supervisor",
    role: "department_supervisor",
    departmentId: "Roads",
    allowedDepartmentIds: ["Roads"],
  };

  const decision = resolveLoginDecision(roadsUser, DEPARTMENTS);
  assert.strictEqual(decision.route, "/department/dashboard");
  assert.strictEqual(decision.departmentId, "Roads");
});

// TEST 3: User authorized for Roads + Drainage -> login -> chooses Roads -> Roads data shown.
runTest("TEST 3: Multi-department user chooses Roads and only Roads data is shown", () => {
  const multiUser = {
    uid: "user_multi_01",
    role: "department_head",
    departmentId: "Roads",
    allowedDepartmentIds: ["Roads", "Drainage"],
  };

  const complaints = [
    { id: "C-101", title: "Pothole on Ring Road", category: "Roads" },
    { id: "C-102", title: "Broken pavement", category: "Roads" },
    { id: "C-201", title: "Storm drain clogged", category: "Drainage" },
    { id: "C-301", title: "Power outage", category: "Electricity" },
  ];

  const roadsData = filterComplaintsForDepartment(complaints, multiUser.departmentId);
  assert.strictEqual(roadsData.length, 2, "Must return exactly 2 Roads complaints");
  assert(roadsData.every(c => c.category === "Roads"), "All returned complaints must be Roads");
});

// TEST 4: User authorized for Roads + Drainage -> switches to Drainage -> Drainage data shown -> Roads data removed from active view.
runTest("TEST 4: User switches to Drainage -> Drainage data shown, Roads data completely excluded", () => {
  const multiUser = {
    uid: "user_multi_01",
    role: "department_head",
    departmentId: "Roads",
    allowedDepartmentIds: ["Roads", "Drainage"],
  };

  // Perform switch to Drainage
  const targetDept = "Drainage";
  const canSwitch = validateDepartmentAccess(multiUser, targetDept);
  assert.strictEqual(canSwitch.allowed, true, "User is authorized to switch to Drainage");

  multiUser.departmentId = targetDept;

  const complaints = [
    { id: "C-101", title: "Pothole on Ring Road", category: "Roads" },
    { id: "C-201", title: "Storm drain clogged", category: "Drainage" },
    { id: "C-202", title: "Canal overflow", category: "Drainage" },
  ];

  const drainageData = filterComplaintsForDepartment(complaints, multiUser.departmentId);
  assert.strictEqual(drainageData.length, 2, "Must return 2 Drainage complaints");
  assert(drainageData.every(c => c.category === "Drainage"), "All returned complaints must be Drainage");
  assert(!drainageData.some(c => c.category === "Roads"), "Zero Roads complaints in active view");
});

// TEST 5: User tries to manually modify departmentId to Electricity -> backend rejects unauthorized access (403).
runTest("TEST 5: Unauthorized department tampering (Electricity) is strictly rejected with 403", () => {
  const roadsOnlyUser = {
    uid: "user_roads_only",
    role: "department_supervisor",
    departmentId: "Roads",
    allowedDepartmentIds: ["Roads"],
  };

  const tamperedAccess = validateDepartmentAccess(roadsOnlyUser, "Electricity");
  assert.strictEqual(tamperedAccess.allowed, false, "Must reject unauthorized department");
  assert.strictEqual(tamperedAccess.status, 403, "Must return 403 status");
});

// TEST 6: Department becomes inactive -> next login -> selection flow appears.
runTest("TEST 6: Inactive department triggers selection flow on next login", () => {
  const electricityUser = {
    uid: "user_ele_01",
    role: "department_supervisor",
    departmentId: "Electricity", // Electricity is active: false in mock DEPARTMENTS
    allowedDepartmentIds: ["Electricity", "Roads"],
  };

  const decision = resolveLoginDecision(electricityUser, DEPARTMENTS);
  assert.strictEqual(decision.route, "/department/select", "Must route to selection page");
  assert.strictEqual(decision.state, "DEPT_INACTIVE", "Reason must be inactive department");
});

// TEST 7: User has no authorized departments (0 allowed) -> access denied / assignment-required page.
runTest("TEST 7: User with 0 allowed departments receives assignment-required state", () => {
  const orphanUser = {
    uid: "user_orphan",
    role: "department_user",
    departmentId: null,
    allowedDepartmentIds: [],
  };

  const decision = resolveLoginDecision(orphanUser, DEPARTMENTS);
  assert.strictEqual(decision.route, "/department/select");
  assert.strictEqual(decision.state, "ASSIGNMENT_REQUIRED");

  const access = validateDepartmentAccess(orphanUser, "Roads");
  assert.strictEqual(access.allowed, false);
  assert.strictEqual(access.status, 403);
});

// TEST 8: Admin changes a user's department -> user's next session reflects the new assignment.
runTest("TEST 8: Admin updates user allowed departments and session reflects new assignment", () => {
  const user = {
    uid: "user_flex",
    role: "department_user",
    departmentId: "Roads",
    allowedDepartmentIds: ["Roads"],
  };

  // Admin grants access to Drainage and reassigns primary
  user.allowedDepartmentIds = ["Roads", "Drainage"];
  user.departmentId = "Drainage";
  user.departmentAssignedBy = "admin_super";

  const accessDrainage = validateDepartmentAccess(user, "Drainage");
  assert.strictEqual(accessDrainage.allowed, true, "User now has access to Drainage");

  const decision = resolveLoginDecision(user, DEPARTMENTS);
  assert.strictEqual(decision.route, "/department/dashboard");
  assert.strictEqual(decision.departmentId, "Drainage");
});

// TEST 9: Roads complaint created -> Roads department sees it.
runTest("TEST 9: Roads complaint is visible in Roads department query", () => {
  const allComplaints = [
    { id: "C-901", title: "Dangerous crater on Outer Ring Rd", category: "Roads" },
    { id: "C-902", title: "Water line burst", category: "Water" },
  ];

  const roadsView = filterComplaintsForDepartment(allComplaints, "Roads");
  assert.strictEqual(roadsView.length, 1);
  assert.strictEqual(roadsView[0].id, "C-901");
});

// TEST 10: Drainage complaint created -> Roads department does not see it.
runTest("TEST 10: Drainage complaint is never visible in Roads department view", () => {
  const allComplaints = [
    { id: "C-1001", title: "Drainage overflow at Silk Board", category: "Drainage" },
    { id: "C-1002", title: "Street flooding", category: "Drainage" },
  ];

  const roadsView = filterComplaintsForDepartment(allComplaints, "Roads");
  assert.strictEqual(roadsView.length, 0, "Roads department must see 0 Drainage complaints");
});

// TEST 11: Engineer belongs to Roads -> Roads supervisor can assign Roads complaint.
runTest("TEST 11: Roads supervisor can assign Roads complaint to Roads engineer", () => {
  const supervisor = { uid: "sup-roads", role: "department_supervisor", allowedDepartmentIds: ["Roads"] };
  const task = { id: "C-1101", title: "Pothole on 100ft Rd", category: "Roads" };
  const engineer = { engineerId: "ENG-RDS-01", name: "Rajesh Kumar", departmentId: "Roads" };

  const assignmentCheck = validateTaskAssignment(supervisor, task, engineer);
  assert.strictEqual(assignmentCheck.allowed, true, "Valid same-department assignment should succeed");
});

// TEST 12: Cross-department unauthorized assignment -> backend rejects.
runTest("TEST 12: Cross-department assignment (Roads task to Water engineer) is rejected with 403", () => {
  const supervisor = { uid: "sup-roads", role: "department_supervisor", allowedDepartmentIds: ["Roads"] };
  const roadsTask = { id: "C-1201", title: "Pothole near metro station", category: "Roads" };
  const waterEngineer = { engineerId: "ENG-WTR-01", name: "Suresh Babu", departmentId: "Water" };

  const assignmentCheck = validateTaskAssignment(supervisor, roadsTask, waterEngineer);
  assert.strictEqual(assignmentCheck.allowed, false, "Cross-department assignment must be rejected");
  assert.strictEqual(assignmentCheck.status, 403, "Status code must be 403");
  assert(assignmentCheck.reason.includes("Cross-department assignment rejected"));
});

console.log("\n============================================================");
console.log(` RESULTS: ${passed} passed | ${failed} failed`);
console.log("============================================================\n");

if (failed === 0) {
  console.log("🎉 ALL 12 DEPARTMENT LOGIN & SELECTION TESTS PASSED!\n");
  process.exit(0);
} else {
  console.error("❌ Some tests failed.");
  process.exit(1);
}
