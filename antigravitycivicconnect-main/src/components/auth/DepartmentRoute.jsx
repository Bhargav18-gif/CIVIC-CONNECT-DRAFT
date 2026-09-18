import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth, isDepartmentRole } from "../../context/AuthContext.jsx";
import { useDepartment } from "../../context/DepartmentContext.jsx";
import { Shield, ArrowRight, Wrench, Building2, UserCheck } from "lucide-react";

export default function DepartmentRoute({ children, allowUnselected = false }) {
  const { user, loading: authLoading, loginAsDemoSupervisor, loginAsDemoEngineer } = useAuth();
  const { departmentId, loading: deptLoading, permittedDepartmentIds, setActiveDepartment } = useDepartment();
  const [quickLoginLoading, setQuickLoginLoading] = useState(false);

  if (authLoading || deptLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Checking department authorization...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, offer quick demo supervisor login or redirect
  if (!user) {
    const handleQuickSupervisor = async () => {
      setQuickLoginLoading(true);
      try {
        if (loginAsDemoSupervisor) {
          await loginAsDemoSupervisor("Roads");
        } else {
          localStorage.setItem("cc_token", "mock-jwt-dept-token");
          localStorage.setItem("cc_user", JSON.stringify({
            id: "dept-supervisor-01",
            name: "Roads Supervisor",
            email: "roads@civicconnect.com",
            role: "department_supervisor",
            departmentId: "Roads",
            departmentName: "Roads & Bridges Department",
            allowedDepartmentIds: ["Roads", "Drainage"],
            departmentStatus: "active",
          }));
          localStorage.setItem("cc_active_dept", "Roads");
          window.location.reload();
        }
      } finally {
        setQuickLoginLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mx-auto mb-5 text-cyan-400">
            <Building2 size={28} />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Department Operations Portal</h2>
          <p className="text-sm text-slate-400 mb-6">
            Authentication is required to access municipal department workflows, SLA monitors, and resource allocation.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleQuickSupervisor}
              disabled={quickLoginLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Shield size={18} />
              <span>{quickLoginLoading ? "Initializing Portal..." : "Enter as Roads Supervisor"}</span>
              <ArrowRight size={16} />
            </button>

            <Link
              to="/login"
              className="w-full py-3 px-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-sm font-medium flex items-center justify-center gap-2 transition-all block"
            >
              <UserCheck size={16} />
              <span>Sign in with Existing Account</span>
            </Link>
          </div>

          <p className="text-xs text-slate-500 mt-6">
            CivicConnect Multi-Tier Operations &bull; Roads & Bridges Dept
          </p>
        </div>
      </div>
    );
  }

  // Must be department-level role or admin
  const isDept = isDepartmentRole(user.role) || user.role === "admin";
  if (!isDept) {
    if (user.role === "engineer") {
      return <Navigate to="/engineer/dashboard" replace />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full rounded-2xl border border-amber-500/30 bg-slate-900/90 p-6 text-center">
          <Shield size={32} className="text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Supervisor Privilege Required</h3>
          <p className="text-xs text-slate-400 mb-4">
            You are signed in as a Citizen ({user.email}). To manage department tasks, switch to the Department Supervisor role.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                localStorage.setItem("cc_token", "mock-jwt-dept-token");
                localStorage.setItem("cc_user", JSON.stringify({
                  id: "dept-supervisor-01",
                  name: "Roads Supervisor",
                  email: "roads@civicconnect.com",
                  role: "department_supervisor",
                  departmentId: "Roads",
                  departmentName: "Roads & Bridges Department",
                  allowedDepartmentIds: ["Roads", "Drainage"],
                  departmentStatus: "active",
                }));
                localStorage.setItem("cc_active_dept", "Roads");
                window.location.reload();
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer"
            >
              Switch to Supervisor
            </button>
            <Link to="/dashboard" className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
              Return to Citizen Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // On the selection page itself
  if (allowUnselected) {
    if (departmentId && permittedDepartmentIds.length === 1 && !window.location.search.includes("switch=true")) {
      return <Navigate to="/department/dashboard" replace />;
    }
    return children;
  }

  // On standard department pages: auto-assign default department if null
  if (!departmentId) {
    const defaultDept = user.departmentId || permittedDepartmentIds[0] || "Roads";
    if (setActiveDepartment) {
      setActiveDepartment(defaultDept).catch(() => {});
    }
  }

  return children;
}
