import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  LogOut,
  HelpCircle,
  Shield,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useDepartment } from "../../context/DepartmentContext.jsx";
import AuroraBackground from "../../components/layout/AuroraBackground.jsx";

const DEPT_ICONS = {
  roads: "🛣️",
  water: "💧",
  electricity: "⚡",
  sanitation: "🧹",
  drainage: "🌊",
  traffic: "🚦",
  "public health": "🏥",
  "municipal services": "🏛️",
};

export default function DepartmentSelection() {
  const { user, logout } = useAuth();
  const {
    departments,
    departmentId: currentActiveDeptId,
    permittedDepartmentIds,
    setActiveDepartment,
    loading: deptLoading,
    error: deptError,
  } = useDepartment();

  const [searchParams] = useSearchParams();
  const isSwitching = searchParams.get("switch") === "true";
  const navigate = useNavigate();

  const [selectedDeptId, setSelectedDeptId] = useState(currentActiveDeptId || "");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedDept, setConfirmedDept] = useState(null);
  const [error, setError] = useState(deptError || "");

  // Filter departments to only those active and permitted for this user
  const selectableDepartments = departments.filter((d) => {
    if (d.active === false) return false;
    const dId = d.departmentId || d.id;
    if (user?.role === "admin") return true;
    return permittedDepartmentIds.includes(dId);
  });

  const handleSelect = (deptId) => {
    setSelectedDeptId(deptId);
    setError("");
  };

  const handleContinue = async (deptToAssign) => {
    const targetDeptId = deptToAssign || selectedDeptId;
    if (!targetDeptId) {
      setError("Please select a department to proceed.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await setActiveDepartment(targetDeptId);
      const chosen = departments.find(
        (d) => (d.departmentId || d.id)?.toLowerCase() === targetDeptId.toLowerCase()
      );
      setConfirmedDept(chosen || { departmentId: targetDeptId, name: `${targetDeptId} Department` });
    } catch (err) {
      setError(err.message || "Failed to assign department. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate("/department/dashboard", { replace: true });
  };

  // Case 1: User has NO permitted departments assigned
  const hasNoAllowedDepartments =
    !deptLoading &&
    user?.role !== "admin" &&
    permittedDepartmentIds.length === 0;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950 text-slate-100 overflow-hidden">
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-3xl glass rounded-3xl border border-white/10 p-6 sm:p-10 shadow-2xl backdrop-blur-xl"
      >
        {/* Header Branding */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Building2 size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase">
                CIVICCONNECT OPERATIONS
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
                {isSwitching ? "Change Operational Department" : "Select Your Department"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 font-medium">
              Role: <strong className="text-cyan-300 capitalize">{user?.role?.replace("_", " ") || "Supervisor"}</strong>
            </span>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium flex items-center gap-2.5"
          >
            <AlertTriangle size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Confirmation State */}
        {confirmedDept ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                Department Authorized & Configured
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">
                {confirmedDept.name || `${confirmedDept.departmentId} Department`}
              </h2>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                You are now operating under the {confirmedDept.name} workspace. Your complaint queue, engineer roster, SLA counters, and analytics are synced.
              </p>
            </div>

            <button
              onClick={handleGoToDashboard}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2 transition-all transform hover:scale-[1.02] cursor-pointer"
            >
              CONTINUE TO DASHBOARD <ArrowRight size={16} />
            </button>
          </motion.div>
        ) : hasNoAllowedDepartments ? (
          /* Zero-Allowed Departments Empty State */
          <div className="text-center py-10 px-4 space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Shield size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Department Assignment Required</h2>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                Your account ({user?.email}) has not yet been assigned to an operational department. Please contact your system administrator to assign your authorized department(s).
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:admin@civicconnect.com?subject=CivicConnect%20Department%20Assignment%20Request"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <HelpCircle size={14} /> Contact Administrator
              </a>
              <button
                onClick={logout}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Department Selection Grid */
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-xs text-slate-300">
                Choose the operational department you are responsible for. Your access and permissions will be scoped to this department.
              </p>
              {permittedDepartmentIds.length > 0 && user?.role !== "admin" && (
                <p className="text-[11px] text-cyan-400">
                  Authorized for {permittedDepartmentIds.length} department{permittedDepartmentIds.length > 1 ? "s" : ""}: {permittedDepartmentIds.join(", ")}
                </p>
              )}
            </div>

            {deptLoading ? (
              <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-cyan-400" /> Loading available departments...
              </div>
            ) : selectableDepartments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 glass rounded-2xl border border-white/5">
                No active authorized departments found. Please contact administrator.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {selectableDepartments.map((d) => {
                  const dId = d.departmentId || d.id;
                  const isSelected = selectedDeptId?.toLowerCase() === dId?.toLowerCase();
                  const icon = DEPT_ICONS[dId.toLowerCase()] || "🏢";

                  return (
                    <motion.div
                      key={dId}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelect(dId)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? "bg-cyan-500/10 border-cyan-400 shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]"
                          : "bg-slate-900/60 hover:bg-slate-900 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl select-none">{icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{d.name}</h3>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                              {d.code || dId.slice(0, 3).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                            {d.description || `Handles ${d.name} operations, maintenance, and emergency response.`}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active Department
                          </div>
                        </div>
                      </div>

                      <div className="pt-0.5">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-cyan-400 bg-cyan-400 text-slate-950"
                              : "border-white/20 bg-transparent"
                          }`}
                        >
                          {isSelected && <CheckCircle2 size={13} className="stroke-[3]" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              {isSwitching ? (
                <button
                  type="button"
                  onClick={() => navigate("/department/dashboard")}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel and return to dashboard
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">
                  {selectableDepartments.length} department{selectableDepartments.length > 1 ? "s" : ""} available
                </span>
              )}

              <button
                type="button"
                onClick={() => handleContinue()}
                disabled={submitting || !selectedDeptId}
                className="px-7 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Authorizing...
                  </>
                ) : (
                  <>
                    CONTINUE <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
