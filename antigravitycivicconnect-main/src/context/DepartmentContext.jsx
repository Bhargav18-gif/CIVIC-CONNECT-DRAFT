import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth, isDepartmentRole } from "./AuthContext.jsx";
import { db } from "../firebase.js";
import api from "../utils/api.js";

const DEFAULT_DEPARTMENTS = [
  { departmentId: "Roads", name: "Roads & Bridges Department", code: "RDS", active: true },
  { departmentId: "Water", name: "Water Supply & Sewerage Board", code: "WTR", active: true },
  { departmentId: "Electricity", name: "Electricity Distribution Corp", code: "ELE", active: true },
  { departmentId: "Sanitation", name: "Solid Waste Management", code: "SAN", active: true },
  { departmentId: "Drainage", name: "Stormwater & Drainage Dept", code: "DRN", active: true },
  { departmentId: "Traffic", name: "Traffic Management Cell", code: "TRF", active: true },
  { departmentId: "Public Health", name: "Public Health Directorate", code: "HLT", active: true },
  { departmentId: "Municipal Services", name: "Municipal Parks & Facilities", code: "MUN", active: true },
];

const DepartmentContext = createContext(null);

export function DepartmentProvider({ children }) {
  const { user, refreshUserProfile, updateUserDepartment } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [activeDepartmentId, setActiveDepartmentId] = useState(() => {
    return localStorage.getItem("cc_active_dept") || user?.departmentId || "Roads";
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch departments list (active only)
  const fetchDepartments = useCallback(async () => {
    try {
      const resp = await api.get("http://localhost:5177/api/departments");
      if (resp.data?.departments) {
        setDepartments(resp.data.departments);
        return resp.data.departments;
      }
    } catch (err) {
      console.warn("Falling back to client Firestore for departments:", err.message);
      try {
        const q = query(collection(db, "departments"), where("active", "==", true));
        const snap = await getDocs(q);
        const depts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDepartments(depts);
        return depts;
      } catch (fbErr) {
        console.warn("Could not load departments:", fbErr.message);
      }
    }
    setDepartments(DEFAULT_DEPARTMENTS);
    return DEFAULT_DEPARTMENTS;
  }, []);

  // Allowed departments for this user
  const permittedDepartmentIds = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin") {
      return departments.map((d) => d.departmentId || d.id);
    }
    if (Array.isArray(user.allowedDepartmentIds) && user.allowedDepartmentIds.length > 0) {
      return user.allowedDepartmentIds;
    }
    if (user.departmentId) {
      return [user.departmentId];
    }
    return [];
  }, [user, departments]);

  // Synchronize active department based on user profile and loaded departments
  useEffect(() => {
    let isMounted = true;

    async function syncDepartment() {
      setLoading(true);
      setError(null);

      const allDepts = await fetchDepartments();
      if (!isMounted) return;

      if (!user || !isDepartmentRole(user.role)) {
        setActiveDepartmentId(null);
        localStorage.removeItem("cc_active_dept");
        setLoading(false);
        return;
      }

      const isDeptActive = (deptId) => {
        if (!deptId) return false;
        const found = allDepts.find(
          (d) => (d.departmentId || d.id)?.toLowerCase() === deptId.toLowerCase()
        );
        return found ? found.active !== false : true;
      };

      const userAllowed = user.role === "admin"
        ? allDepts.map((d) => d.departmentId || d.id)
        : (user.allowedDepartmentIds && user.allowedDepartmentIds.length > 0
            ? user.allowedDepartmentIds
            : (user.departmentId ? [user.departmentId] : []));

      // CASE: User has exactly 1 allowed department -> auto-assign
      if (userAllowed.length === 1) {
        const singleDeptId = userAllowed[0];
        if (isDeptActive(singleDeptId)) {
          setActiveDepartmentId(singleDeptId);
          localStorage.setItem("cc_active_dept", singleDeptId);
          if (user.departmentId !== singleDeptId) {
            try {
              await updateUserDepartment(singleDeptId);
            } catch (_) {}
          }
        } else {
          setActiveDepartmentId(null);
          localStorage.removeItem("cc_active_dept");
          setError("Your assigned department is currently inactive. Contact administrator.");
        }
        setLoading(false);
        return;
      }

      // CASE: User has multiple allowed departments or prior selection
      const currentDeptId = user.departmentId;
      const cachedDeptId = localStorage.getItem("cc_active_dept");

      const candidateId = cachedDeptId && userAllowed.includes(cachedDeptId)
        ? cachedDeptId
        : currentDeptId && userAllowed.includes(currentDeptId)
        ? currentDeptId
        : null;

      if (candidateId && isDeptActive(candidateId)) {
        setActiveDepartmentId(candidateId);
        localStorage.setItem("cc_active_dept", candidateId);
      } else {
        setActiveDepartmentId(null);
        localStorage.removeItem("cc_active_dept");
      }

      setLoading(false);
    }

    syncDepartment();

    return () => {
      isMounted = false;
    };
  }, [user, fetchDepartments, updateUserDepartment]);

  // Set active department (with backend validation and audit logging)
  const setActiveDepartment = useCallback(
    async (deptId) => {
      if (!user) throw new Error("User not authenticated.");
      setError(null);

      const isAllowed =
        user.role === "admin" || permittedDepartmentIds.includes(deptId);
      if (!isAllowed) {
        throw new Error(
          `You are not authorized to access the ${deptId} department.`
        );
      }

      const targetDept = departments.find(
        (d) => (d.departmentId || d.id)?.toLowerCase() === deptId?.toLowerCase()
      );
      if (targetDept && targetDept.active === false) {
        throw new Error(
          `The ${deptId} department is currently inactive.`
        );
      }

      const prevDeptId = activeDepartmentId;

      try {
        await api.post("http://localhost:5177/api/department/select", {
          departmentId: deptId,
          departmentName: targetDept?.name || deptId,
          previousDepartmentId: prevDeptId,
        });
      } catch (apiErr) {
        console.warn("Backend select notice (fallback to direct Firestore):", apiErr.message);
      }

      await updateUserDepartment(deptId, targetDept?.name || deptId);
      setActiveDepartmentId(deptId);
      localStorage.setItem("cc_active_dept", deptId);
      await refreshUserProfile();
      return true;
    },
    [user, permittedDepartmentIds, departments, activeDepartmentId, updateUserDepartment, refreshUserProfile]
  );

  const clearDepartment = useCallback(() => {
    setActiveDepartmentId(null);
    localStorage.removeItem("cc_active_dept");
  }, []);

  const refreshDepartment = useCallback(async () => {
    await fetchDepartments();
    await refreshUserProfile();
  }, [fetchDepartments, refreshUserProfile]);

  const activeDepartment = useMemo(() => {
    if (!activeDepartmentId) return null;
    return (
      departments.find(
        (d) => (d.departmentId || d.id)?.toLowerCase() === activeDepartmentId.toLowerCase()
      ) || {
        departmentId: activeDepartmentId,
        name: user?.departmentName || `${activeDepartmentId} Department`,
        code: activeDepartmentId.slice(0, 3).toUpperCase(),
        active: true,
      }
    );
  }, [activeDepartmentId, departments, user]);

  const value = {
    departmentId: activeDepartmentId,
    departmentName: activeDepartment?.name || user?.departmentName || (activeDepartmentId ? `${activeDepartmentId} Department` : null),
    departmentRole: user?.role || "department_supervisor",
    permittedDepartmentIds,
    departments,
    activeDepartment,
    loading,
    error,
    hasNoDepartment: isDepartmentRole(user?.role) && !activeDepartmentId,
    setActiveDepartment,
    refreshDepartment,
    clearDepartment,
  };

  return (
    <DepartmentContext.Provider value={value}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  const ctx = useContext(DepartmentContext);
  if (!ctx) throw new Error("useDepartment must be used within DepartmentProvider");
  return ctx;
}
