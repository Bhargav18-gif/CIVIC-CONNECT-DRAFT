import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../../components/layout/Navbar.jsx";
import Footer from "../../components/layout/Footer.jsx";
import {
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  Compass,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  ThumbsUp,
  RotateCcw,
  Wrench,
  CheckSquare,
  XCircle,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../utils/api.js";
import { useDepartment } from "../../context/DepartmentContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function DepartmentDashboard() {
  const { user } = useAuth();
  const {
    departmentId,
    departmentName,
    departmentRole,
    permittedDepartmentIds,
    departments,
    setActiveDepartment,
  } = useDepartment();

  const selectedDept = departmentId || "Roads";
  const [tasks, setTasks] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [resources, setResources] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Selected task for modal / assignment / review
  const [activeTask, setActiveTask] = useState(null);
  const [modalType, setModalType] = useState(null); // 'assign', 'review', null

  // Assignment override form
  const [selectedEngineerId, setSelectedEngineerId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Completion review form
  const [reviewNotes, setReviewNotes] = useState("");
  const [reworkReason, setReworkReason] = useState("");
  const [expectedAction, setExpectedAction] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // Feedback notification banner
  const [banner, setBanner] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tResp, eResp, rResp, aResp] = await Promise.all([
        api.get(`http://localhost:5177/api/department/tasks?departmentId=${selectedDept}`),
        api.get(`http://localhost:5177/api/department/engineers?departmentId=${selectedDept}`),
        api.get(`http://localhost:5177/api/department/resources?departmentId=${selectedDept}`),
        api.get(`http://localhost:5177/api/department/analytics?departmentId=${selectedDept}`),
      ]);

      setTasks(tResp.data.tasks || []);
      setEngineers(eResp.data.engineers || []);
      setResources(rResp.data.resources || []);
      setAnalytics(aResp.data.metrics || null);
    } catch (err) {
      console.warn("Department dashboard fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDept]);

  // Handle Assign (Accept AI recommendation or Override)
  const handleConfirmAssignment = async () => {
    if (!activeTask) return;
    setAssignLoading(true);
    setBanner(null);
    try {
      const aiRec = activeTask.assignment?.aiRecommendation;
      const isOverride = selectedEngineerId && selectedEngineerId !== aiRec?.recommendedEngineerId;

      const chosenEng = engineers.find((e) => e.engineerId === selectedEngineerId) || {
        engineerId: selectedEngineerId,
        name: selectedEngineerId,
      };

      await api.post(`http://localhost:5177/api/department/tasks/${activeTask.id}/assign`, {
        engineerId: chosenEng.engineerId,
        engineerName: chosenEng.name,
        supervisorId: "supervisor-demo",
        isOverride,
        overrideReason: isOverride ? overrideReason : undefined,
      });

      setBanner({
        type: "success",
        text: `Assigned complaint #${activeTask.referenceId || activeTask.id} to ${chosenEng.name || chosenEng.engineerId}.`,
      });
      setModalType(null);
      await fetchData();
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle Completion Review: Approve
  const handleApproveWork = async () => {
    if (!activeTask) return;
    setReviewLoading(true);
    setBanner(null);
    try {
      await api.post(`http://localhost:5177/api/department/tasks/${activeTask.id}/approve`, {
        supervisorId: "supervisor-demo",
        reviewNotes: reviewNotes || "Department supervisor approved resolution.",
      });
      setBanner({ type: "success", text: `Task #${activeTask.referenceId} approved and officially closed!` });
      setModalType(null);
      await fetchData();
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle Completion Review: Request Rework
  const handleRequestRework = async () => {
    if (!activeTask) return;
    if (!reworkReason || reworkReason.trim().length < 5) {
      return alert("Please specify the rework reason (at least 5 characters).");
    }
    setReviewLoading(true);
    setBanner(null);
    try {
      await api.post(`http://localhost:5177/api/department/tasks/${activeTask.id}/rework`, {
        supervisorId: "supervisor-demo",
        reworkReason,
        expectedAction: expectedAction || "Re-inspect site and fix outstanding defects.",
      });
      setBanner({
        type: "warning",
        text: `Rework requested for #${activeTask.referenceId}. Task returned to engineer.`,
      });
      setModalType(null);
      await fetchData();
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setReviewLoading(false);
    }
  };

  const pendingVerificationCount = tasks.filter(
    (t) => (t.workflowStatus || t.status || "").toLowerCase() === "awaiting_verification"
  ).length;
  const criticalCount = tasks.filter((t) => t.priority?.toLowerCase() === "urgent" || t.sla?.isBreached).length;
  const atRiskCount = tasks.filter((t) => t.sla?.slaStatus === "AT_RISK").length;

  return (
    <>
      <Navbar />
      <div className="min-h-screen px-4 lg:px-8 pt-28 pb-20 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                {departmentRole?.replace("_", " ") || "DEPARTMENT SUPERVISOR"}
              </span>
              <span className="text-xs text-slate-400">Department: <strong className="text-white">{departmentName || selectedDept}</strong></span>
            </div>
            <h1 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
              {departmentName || `${selectedDept} Operations Hub`}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Supervise AI recommendations, rebalance engineer queues, and verify field completion for {selectedDept}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Controlled department switcher if user has multiple permitted departments or is admin */}
            {(permittedDepartmentIds.length > 1 || user?.role === "admin") ? (
              <div className="flex items-center gap-2">
                <select
                  value={selectedDept}
                  onChange={(e) => setActiveDepartment(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-slate-200 text-xs font-semibold border border-cyan-500/30 focus:outline-none focus:border-cyan-400"
                >
                  {(user?.role === "admin" && departments.length > 0
                    ? departments.map((d) => d.departmentId || d.id)
                    : permittedDepartmentIds
                  ).map((d) => (
                    <option key={d} value={d}>
                      {d} Department
                    </option>
                  ))}
                </select>

                <Link
                  to="/department/select?switch=true"
                  className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium border border-cyan-500/20 transition-colors whitespace-nowrap"
                >
                  Change Department
                </Link>
              </div>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 font-medium">
                Scope: <strong className="text-cyan-300">{selectedDept}</strong>
              </div>
            )}

            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Banner */}
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl text-xs font-medium flex items-center gap-2 border ${
              banner.type === "success"
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                : banner.type === "warning"
                ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                : "bg-red-950/40 text-red-300 border-red-500/30"
            }`}
          >
            {banner.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            )}
            <div>{banner.text}</div>
          </motion.div>
        )}

        {/* Operational Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              Department Total
              <Layers size={16} className="text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{tasks.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Complaints in scope</div>
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              Critical & Breached
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400 mt-2">{criticalCount}</div>
            <div className="text-[11px] text-red-400/80 mt-0.5">Immediate intervention</div>
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              Pending Verification
              <Clock size={16} className="text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2">{pendingVerificationCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Ready for review</div>
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              Active Engineers
              <Users size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">{engineers.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              SLA Compliance: {analytics?.slaComplianceRate || "96%"}
            </div>
          </div>
        </div>

        {/* Main Operational Workspace: Left = Queue, Right = Engineers & Resources */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Department Queue */}
          <div className="lg:col-span-8 space-y-4">
            <div className="glass rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-300">
                  Smart Priority Queue (AI Scored)
                </h3>
                <span className="text-[11px] text-slate-400">{tasks.length} active tasks</span>
              </div>

              {loading ? (
                <div className="py-16 text-center text-xs text-slate-400">Loading department queue...</div>
              ) : tasks.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No active complaints found for {selectedDept}.
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const isAwaitingVerification =
                      (task.workflowStatus || task.status || "").toLowerCase() === "awaiting_verification";
                    const isAssigned =
                      Boolean(task.assignedEngineerId) || Boolean(task.assignment?.engineerId);
                    const aiRec = task.assignment?.aiRecommendation;

                    return (
                      <div
                        key={task.id}
                        className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                                #{task.referenceId || task.id.slice(0, 8)}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  task.priority?.toLowerCase() === "urgent"
                                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                    : "bg-white/5 text-slate-300 border border-white/10"
                                }`}
                              >
                                {task.priority || "NORMAL"}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 uppercase">
                                {task.workflowStatus || task.status || "NEW"}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1.5 line-clamp-1">
                              {task.title || task.issueDescription || "Civic Complaint"}
                            </h4>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-slate-400 font-mono">
                              {task.sla?.timeRemainingStr}
                            </div>
                            <div
                              className={`text-[10px] font-bold uppercase ${
                                task.sla?.isBreached
                                  ? "text-red-400"
                                  : task.sla?.slaStatus === "AT_RISK"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {task.sla?.slaStatus}
                            </div>
                          </div>
                        </div>

                        {/* AI Recommendation Badge / Reasoning */}
                        {aiRec && (
                          <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles size={14} className="text-cyan-400 shrink-0" />
                              <span className="text-slate-300">
                                AI Pick: <strong className="text-cyan-300">{aiRec.recommendedEngineerName}</strong> (
                                {aiRec.score}% match)
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 italic">
                              {(aiRec.reasons || [])[0]}
                            </span>
                          </div>
                        )}

                        {/* Action Toolbar */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div className="text-xs text-slate-400">
                            Assignee:{" "}
                            <span className="text-white font-medium">
                              {task.assignment?.engineerName || task.assignedEngineerId || "Unassigned"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* If awaiting supervisor completion verification */}
                            {isAwaitingVerification ? (
                              <button
                                onClick={() => {
                                  setActiveTask(task);
                                  setModalType("review");
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-colors"
                              >
                                <Eye size={13} />
                                Review Evidence
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveTask(task);
                                  setSelectedEngineerId(aiRec?.recommendedEngineerId || "");
                                  setModalType("assign");
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium border border-cyan-500/20 transition-colors"
                              >
                                <Wrench size={13} />
                                {isAssigned ? "Reassign" : "Assign Engineer"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Engineer Workload Monitor & Department Resources */}
          <div className="lg:col-span-4 space-y-6">
            {/* Engineer Workload Card */}
            <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-300 flex items-center justify-between">
                Field Engineers
                <Users size={14} className="text-cyan-400" />
              </h3>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {engineers.map((eng) => (
                  <div key={eng.engineerId} className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">{eng.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          eng.currentStatus === "available"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {eng.currentStatus || "Available"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mb-2">
                      Skills: {(eng.skills || []).join(", ")}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/5">
                      <span className="text-slate-500">Active Tasks:</span>
                      <span className="text-cyan-300 font-bold">{eng.workloadCount || 0} / 5</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Resources */}
            <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-300 flex items-center justify-between">
                Department Resources
                <Wrench size={14} className="text-cyan-400" />
              </h3>

              <div className="space-y-2.5">
                {resources.map((res) => (
                  <div key={res.resourceId} className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{res.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{res.category}</div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                      {res.status || "Ready"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal 1: Engineer Assignment Modal */}
        {modalType === "assign" && activeTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl max-w-lg w-full p-6 border border-white/10 space-y-5 bg-slate-950"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Assign Field Engineer</h3>
                <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white text-xs">
                  ✕
                </button>
              </div>

              {/* Task Summary */}
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-300 space-y-1">
                <div>
                  <strong>Task:</strong> #{activeTask.referenceId} - {activeTask.title}
                </div>
                <div>
                  <strong>Priority:</strong> {activeTask.priority} | <strong>SLA:</strong>{" "}
                  {activeTask.sla?.timeRemainingStr}
                </div>
              </div>

              {/* AI Recommendation Highlight */}
              {activeTask.assignment?.aiRecommendation && (
                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs space-y-1.5">
                  <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <Sparkles size={14} />
                    AI Recommended Engineer
                  </div>
                  <div className="text-white font-semibold">
                    {activeTask.assignment.aiRecommendation.recommendedEngineerName} (Match Score:{" "}
                    {activeTask.assignment.aiRecommendation.score}%)
                  </div>
                  <ul className="text-[11px] text-slate-400 list-disc list-inside">
                    {(activeTask.assignment.aiRecommendation.reasons || []).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Engineer Dropdown Selector */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Select Engineer (or keep AI Recommendation)
                </label>
                <select
                  value={selectedEngineerId}
                  onChange={(e) => setSelectedEngineerId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">-- Choose Field Engineer --</option>
                  {engineers.map((e) => (
                    <option key={e.engineerId} value={e.engineerId}>
                      {e.name} ({e.skills?.slice(0, 2).join(", ")}) - {e.workloadCount || 0} active
                    </option>
                  ))}
                </select>
              </div>

              {/* Supervisor Override Reason if selecting different engineer */}
              {selectedEngineerId &&
                selectedEngineerId !== activeTask.assignment?.aiRecommendation?.recommendedEngineerId && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-amber-400 block">
                      Supervisor Override Reason (Logs to AI Feedback) *
                    </label>
                    <textarea
                      rows={2}
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Why is this engineer preferred over AI recommendation? (e.g., proximity, urgent rebalancing)..."
                      className="w-full bg-slate-900 border border-amber-500/30 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignment}
                  disabled={assignLoading || !selectedEngineerId}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs disabled:opacity-50"
                >
                  {assignLoading ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 2: Completion Review & Rework Modal */}
        {modalType === "review" && activeTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl max-w-2xl w-full p-6 border border-white/10 space-y-5 bg-slate-950 my-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Review Work Completion & Evidence</h3>
                <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white text-xs">
                  ✕
                </button>
              </div>

              {/* Before vs After Side by Side Photo Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-400">BEFORE (Reported Condition)</div>
                  {activeTask.beforeImageUrl || activeTask.imageURL ? (
                    <img
                      src={activeTask.beforeImageUrl || activeTask.imageURL}
                      alt="Before Work"
                      className="w-full h-48 object-cover rounded-xl border border-white/10"
                    />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-500">
                      No before photo
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-emerald-400">AFTER (Field Completion)</div>
                  {activeTask.afterImageUrl ? (
                    <img
                      src={activeTask.afterImageUrl}
                      alt="After Work"
                      className="w-full h-48 object-cover rounded-xl border border-emerald-500/30"
                    />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-500">
                      No after photo uploaded
                    </div>
                  )}
                </div>
              </div>

              {/* AI Verification Results Summary */}
              {activeTask.verification && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">AI Resolution Check:</span>
                    <span
                      className={`font-bold uppercase ${
                        activeTask.verification.verificationStatus === "VERIFIED"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {activeTask.verification.verificationStatus} ({activeTask.verification.confidence}%)
                    </span>
                  </div>
                  <ul className="text-[11px] text-slate-400 list-disc list-inside">
                    {(activeTask.verification.reasons || []).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Review Actions */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Supervisor Approval Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Verified on site. Quality meets municipal standards."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* If Rework is needed */}
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 space-y-2">
                  <div className="text-xs font-semibold text-red-300">Need Rework instead?</div>
                  <input
                    type="text"
                    value={reworkReason}
                    onChange={(e) => setReworkReason(e.target.value)}
                    placeholder="Reason for rework request (e.g., debris left on side of road)..."
                    className="w-full bg-slate-950 border border-red-500/30 rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button
                  onClick={handleRequestRework}
                  disabled={reviewLoading}
                  className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs border border-red-500/30 disabled:opacity-50"
                >
                  Request Rework
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveWork}
                    disabled={reviewLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-50"
                  >
                    {reviewLoading ? "Approving..." : "Approve & Close Complaint"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
