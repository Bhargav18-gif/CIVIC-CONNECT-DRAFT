import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../../components/layout/Navbar.jsx";
import Footer from "../../components/layout/Footer.jsx";
import {
  Search, Filter, RefreshCw, Sparkles, AlertTriangle, Clock, Layers,
  CheckCircle2, Eye, Wrench, XCircle, ChevronDown, ChevronUp, AlertCircle,
  Users,
} from "lucide-react";
import api from "../../utils/api.js";
import { useDepartment } from "../../context/DepartmentContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const PRIORITIES = ["all", "urgent", "high", "normal", "low"];
const SLA_FILTERS = ["all", "BREACHED", "AT_RISK", "WARNING", "SAFE"];

const PRIORITY_BADGE = {
  urgent: "bg-red-500/20 text-red-300 border-red-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  normal: "bg-slate-700/40 text-slate-300 border-white/10",
  low: "bg-slate-800/40 text-slate-400 border-white/10",
};

const SLA_BADGE = {
  BREACHED: "text-red-400",
  AT_RISK: "text-amber-400",
  WARNING: "text-yellow-400",
  SAFE: "text-emerald-400",
  COMPLETED: "text-slate-400",
};

export default function ComplaintQueue() {
  const { user } = useAuth();
  const { departmentId, departmentName, permittedDepartmentIds, departments, setActiveDepartment } = useDepartment();
  const selectedDept = departmentId || "Roads";
  const [tasks, setTasks] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [slaFilter, setSlaFilter] = useState("all");
  const [banner, setBanner] = useState(null);

  // Assignment modal
  const [assignTask, setAssignTask] = useState(null);
  const [selectedEngineerId, setSelectedEngineerId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Review modal
  const [reviewTask, setReviewTask] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reworkReason, setReworkReason] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const BASE_URL = "http://localhost:5177";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tResp, eResp] = await Promise.all([
        api.get(`${BASE_URL}/api/department/tasks?departmentId=${selectedDept}`),
        api.get(`${BASE_URL}/api/department/engineers?departmentId=${selectedDept}`),
      ]);
      setTasks(tResp.data.tasks || []);
      setEngineers(eResp.data.engineers || []);
    } catch (err) {
      console.warn("Queue fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedDept]);

  const filtered = tasks.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (t.title || t.issueDescription || "").toLowerCase().includes(q) || (t.referenceId || t.id || "").toLowerCase().includes(q);
    const matchesPriority = priorityFilter === "all" || (t.priority || "").toLowerCase() === priorityFilter;
    const matchesSla = slaFilter === "all" || (t.sla?.slaStatus || "") === slaFilter;
    return matchesSearch && matchesPriority && matchesSla;
  });

  const handleAssign = async () => {
    if (!selectedEngineerId) return alert("Select an engineer");
    setAssignLoading(true);
    setBanner(null);
    try {
      const aiRec = assignTask?.assignment?.aiRecommendation;
      const isOverride = selectedEngineerId !== aiRec?.recommendedEngineerId;
      const eng = engineers.find((e) => e.engineerId === selectedEngineerId);
      await api.post(`${BASE_URL}/api/department/tasks/${assignTask.id}/assign`, {
        engineerId: selectedEngineerId,
        engineerName: eng?.name || selectedEngineerId,
        supervisorId: "supervisor-demo",
        isOverride,
        overrideReason: isOverride ? overrideReason : undefined,
      });
      setBanner({ type: "success", text: `Assigned #${assignTask.referenceId || assignTask.id} to ${eng?.name || selectedEngineerId}` });
      setAssignTask(null);
      await fetchData();
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleApprove = async () => {
    setReviewLoading(true);
    try {
      await api.post(`${BASE_URL}/api/department/tasks/${reviewTask.id}/approve`, {
        supervisorId: "supervisor-demo",
        reviewNotes: reviewNotes || "Evidence reviewed and approved.",
      });
      setBanner({ type: "success", text: `Complaint #${reviewTask.referenceId} approved & closed!` });
      setReviewTask(null);
      await fetchData();
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setReviewLoading(false);
    }
  };

  const handleRework = async () => {
    if (!reworkReason || reworkReason.trim().length < 5) return alert("Rework reason required (min 5 chars)");
    setReviewLoading(true);
    try {
      await api.post(`${BASE_URL}/api/department/tasks/${reviewTask.id}/rework`, {
        supervisorId: "supervisor-demo",
        reworkReason,
        expectedAction: "Re-inspect and provide updated evidence.",
      });
      setBanner({ type: "warning", text: `Rework requested for #${reviewTask.referenceId}` });
      setReviewTask(null);
      await fetchData();
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setReviewLoading(false);
    }
  };

  const criticalCount = tasks.filter((t) => (t.priority || "").toLowerCase() === "urgent" || t.sla?.isBreached).length;
  const pendingReviewCount = tasks.filter((t) => (t.workflowStatus || t.status || "").toLowerCase() === "awaiting_verification").length;

  return (
    <>
      <Navbar />
      <div className="min-h-screen px-4 lg:px-8 pt-28 pb-20 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">COMPLAINT QUEUE</span>
              <span className="text-xs text-slate-400">Department: <strong className="text-white">{departmentName || selectedDept}</strong></span>
            </div>
            <h1 className="font-bold text-3xl text-white tracking-tight">{departmentName || `${selectedDept} Smart Queue`}</h1>
            <p className="text-slate-400 text-sm mt-1">AI-scored, sorted by priority and SLA risk for {selectedDept}.</p>
          </div>
          <div className="flex items-center gap-2">
            {(permittedDepartmentIds.length > 1 || user?.role === "admin") ? (
              <select
                value={selectedDept}
                onChange={(e) => setActiveDepartment(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 text-slate-200 text-xs font-semibold border border-cyan-500/30 focus:outline-none focus:border-cyan-400"
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
            ) : (
              <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 font-medium">
                Scope: <strong className="text-cyan-300">{selectedDept}</strong>
              </div>
            )}
            <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 cursor-pointer">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-2xl p-4 border border-white/10"><div className="text-xs text-slate-400 flex justify-between">Total Queue<Layers size={14} className="text-cyan-400" /></div><div className="text-2xl font-bold text-white mt-2">{tasks.length}</div></div>
          <div className="glass rounded-2xl p-4 border border-white/10"><div className="text-xs text-slate-400 flex justify-between">Critical<AlertTriangle size={14} className="text-red-400" /></div><div className="text-2xl font-bold text-red-400 mt-2">{criticalCount}</div></div>
          <div className="glass rounded-2xl p-4 border border-white/10"><div className="text-xs text-slate-400 flex justify-between">Pending Review<Clock size={14} className="text-amber-400" /></div><div className="text-2xl font-bold text-amber-400 mt-2">{pendingReviewCount}</div></div>
          <div className="glass rounded-2xl p-4 border border-white/10"><div className="text-xs text-slate-400 flex justify-between">Filtered Results<Filter size={14} className="text-slate-400" /></div><div className="text-2xl font-bold text-white mt-2">{filtered.length}</div></div>
        </div>

        {/* Banner */}
        {banner && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={`mb-6 p-4 rounded-xl text-xs font-medium flex items-center gap-2 border ${
            banner.type === "success" ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30" :
            banner.type === "warning" ? "bg-amber-950/40 text-amber-300 border-amber-500/30" :
            "bg-red-950/40 text-red-300 border-red-500/30"
          }`}>
            {banner.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {banner.text}
          </motion.div>
        )}

        {/* Filters */}
        <div className="glass rounded-2xl p-4 border border-white/10 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by ID or title..." className="w-full bg-slate-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map((p) => (
                <button key={p} onClick={() => setPriorityFilter(p)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize border transition-colors ${
                  priorityFilter === p ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                }`}>{p}</button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {SLA_FILTERS.map((s) => (
                <button key={s} onClick={() => setSlaFilter(s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                  slaFilter === s ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                }`}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Task Cards */}
        <div className="glass rounded-2xl p-5 border border-white/10">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading queue...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">No complaints match your filters.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((task) => {
                const ws = (task.workflowStatus || task.status || "").toLowerCase();
                const isAwaitingReview = ws === "awaiting_verification";
                const isAssigned = Boolean(task.assignedEngineerId || task.assignment?.engineerId);
                const aiRec = task.assignment?.aiRecommendation;
                const priority = (task.priority || "normal").toLowerCase();
                return (
                  <motion.div key={task.id} layout className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 transition-all space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">#{task.referenceId || task.id?.slice(0, 8)}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${ PRIORITY_BADGE[priority] || PRIORITY_BADGE.normal }`}>{priority}</span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase bg-white/5 px-2 py-0.5 rounded">{task.workflowStatus || task.status || "NEW"}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-[11px] font-bold ${SLA_BADGE[task.sla?.slaStatus] || "text-slate-400"}`}>{task.sla?.slaStatus}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{task.sla?.timeRemainingStr}</div>
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-white">{task.title || task.issueDescription || "Civic Complaint"}</div>

                    {aiRec && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs">
                        <Sparkles size={13} className="text-cyan-400 shrink-0" />
                        <span className="text-slate-300">AI Pick: <strong className="text-cyan-300">{aiRec.recommendedEngineerName}</strong> ({aiRec.score}% match)</span>
                        <span className="text-[11px] text-slate-400 italic ml-auto hidden md:block">{(aiRec.reasons || [])[0]}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="text-xs text-slate-400">
                        Assignee: <span className="text-white font-medium">{task.assignment?.engineerName || task.assignedEngineerId || "Unassigned"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAwaitingReview ? (
                          <button onClick={() => { setReviewTask(task); setReviewNotes(""); setReworkReason(""); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                            <Eye size={12} /> Review Evidence
                          </button>
                        ) : (
                          <button onClick={() => { setAssignTask(task); setSelectedEngineerId(aiRec?.recommendedEngineerId || ""); setOverrideReason(""); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium border border-cyan-500/20">
                            <Wrench size={12} /> {isAssigned ? "Reassign" : "Assign Engineer"}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {assignTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl max-w-lg w-full p-6 border border-white/10 space-y-4 bg-slate-950">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Assign Field Engineer</h3>
              <button onClick={() => setAssignTask(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-300 space-y-1">
              <div><strong>Task:</strong> #{assignTask.referenceId} — {assignTask.title}</div>
              <div><strong>Priority:</strong> {assignTask.priority} | <strong>SLA:</strong> {assignTask.sla?.timeRemainingStr}</div>
            </div>
            {assignTask.assignment?.aiRecommendation && (
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs space-y-1">
                <div className="text-cyan-400 font-bold flex items-center gap-1"><Sparkles size={13} /> AI Recommendation</div>
                <div className="text-white font-semibold">{assignTask.assignment.aiRecommendation.recommendedEngineerName} ({assignTask.assignment.aiRecommendation.score}% match)</div>
                <ul className="text-[11px] text-slate-400 list-disc list-inside">
                  {(assignTask.assignment.aiRecommendation.reasons || []).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            <select value={selectedEngineerId} onChange={(e) => setSelectedEngineerId(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400">
              <option value="">-- Select Engineer --</option>
              {engineers.map((e) => <option key={e.engineerId} value={e.engineerId}>{e.name} ({e.workloadCount || 0} active)</option>)}
            </select>
            {selectedEngineerId && selectedEngineerId !== assignTask.assignment?.aiRecommendation?.recommendedEngineerId && (
              <textarea rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Supervisor override reason (logs to AI feedback)..." className="w-full bg-slate-900 border border-amber-500/30 rounded-xl p-2.5 text-xs text-white focus:outline-none" />
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button onClick={() => setAssignTask(null)} className="px-4 py-2 text-xs text-slate-400">Cancel</button>
              <button onClick={handleAssign} disabled={assignLoading || !selectedEngineerId} className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs disabled:opacity-50">
                {assignLoading ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Review Modal */}
      {reviewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl max-w-2xl w-full p-6 border border-white/10 space-y-4 bg-slate-950 my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Review Work Evidence</h3>
              <button onClick={() => setReviewTask(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">BEFORE</div>
                {reviewTask.beforeImageUrl || reviewTask.imageURL ? (
                  <img src={reviewTask.beforeImageUrl || reviewTask.imageURL} alt="Before" className="w-full h-44 object-cover rounded-xl border border-white/10" />
                ) : <div className="w-full h-44 flex items-center justify-center rounded-xl bg-slate-900 text-xs text-slate-500">No before photo</div>}
              </div>
              <div>
                <div className="text-xs font-semibold text-emerald-400 mb-1">AFTER</div>
                {reviewTask.afterImageUrl ? (
                  <img src={reviewTask.afterImageUrl} alt="After" className="w-full h-44 object-cover rounded-xl border border-emerald-500/30" />
                ) : <div className="w-full h-44 flex items-center justify-center rounded-xl bg-slate-900 text-xs text-slate-500">No after photo</div>}
              </div>
            </div>
            {reviewTask.verification && (
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">AI Verification:</span>
                  <span className={`font-bold uppercase ${ reviewTask.verification.verificationStatus === "VERIFIED" ? "text-emerald-400" : "text-amber-400" }`}>
                    {reviewTask.verification.verificationStatus} ({reviewTask.verification.confidence}%)
                  </span>
                </div>
                <ul className="text-[11px] text-slate-400 list-disc list-inside">
                  {(reviewTask.verification.reasons || []).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            <input type="text" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Approval notes (optional)..." className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400" />
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 space-y-2">
              <div className="text-xs font-semibold text-red-300">Request Rework instead?</div>
              <input type="text" value={reworkReason} onChange={(e) => setReworkReason(e.target.value)} placeholder="Rework reason..." className="w-full bg-slate-950 border border-red-500/30 rounded-xl p-2 text-xs text-white focus:outline-none" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button onClick={handleRework} disabled={reviewLoading} className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs border border-red-500/30 disabled:opacity-50">Request Rework</button>
              <div className="flex gap-2">
                <button onClick={() => setReviewTask(null)} className="px-4 py-2 text-xs text-slate-400">Cancel</button>
                <button onClick={handleApprove} disabled={reviewLoading} className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-50">
                  {reviewLoading ? "Approving..." : "Approve & Close"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
    </>
  );
}
