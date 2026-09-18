import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../../components/layout/Navbar.jsx";
import Footer from "../../components/layout/Footer.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Camera,
  FileText,
  Play,
  CheckSquare,
  Compass,
  RefreshCw,
  History,
  Image,
} from "lucide-react";
import api from "../../utils/api.js";

const STATUS_COLORS = {
  NEW: "text-slate-400",
  AI_CLASSIFIED: "text-blue-400",
  ASSIGNMENT_RECOMMENDED: "text-indigo-400",
  ASSIGNED: "text-cyan-400",
  ENGINEER_ACCEPTED: "text-sky-400",
  TRAVELLING: "text-violet-400",
  ARRIVED: "text-amber-400",
  WORK_STARTED: "text-orange-400",
  IN_PROGRESS: "text-orange-400",
  AWAITING_VERIFICATION: "text-yellow-400",
  DEPARTMENT_REVIEW_COMPLETED: "text-teal-400",
  CLOSED: "text-emerald-400",
  REWORK_REQUIRED: "text-red-400",
  ON_HOLD: "text-slate-400",
  ESCALATED: "text-rose-400",
};

function SLABadge({ sla }) {
  if (!sla) return null;
  const color = sla.isBreached
    ? "text-red-400 border-red-500/30 bg-red-950/30"
    : sla.slaStatus === "AT_RISK"
    ? "text-amber-400 border-amber-500/30 bg-amber-950/30"
    : sla.slaStatus === "WARNING"
    ? "text-yellow-400 border-yellow-500/30 bg-yellow-950/30"
    : "text-emerald-400 border-emerald-500/30 bg-emerald-950/20";

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${color}`}>
      <Clock size={12} />
      {sla.timeRemainingStr} — {sla.slaStatus}
    </div>
  );
}

export default function EngineerTaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const engineerId = user?.uid || "ENG-RDS-01";

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [justification, setJustification] = useState("");
  const [showJustification, setShowJustification] = useState(false);
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [workNotes, setWorkNotes] = useState("");
  const [arrivalGps, setArrivalGps] = useState(null);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState("photos");

  const BASE_URL = "http://localhost:5177";

  const fetchTask = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`${BASE_URL}/api/engineer/tasks/${id}`);
      if (resp.data?.task) setTask(resp.data.task);
    } catch (err) {
      console.warn("Failed to fetch task:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTask(); }, [id]);

  const getBrowserCoordinates = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error("Geolocation not supported"));
      else navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (e) => reject(e),
        { timeout: 8000 }
      );
    });

  const apiAction = async (endpoint, payload = {}) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const resp = await api.post(`${BASE_URL}${endpoint}`, { engineerId, ...payload });
      setActionMessage({ type: "success", text: resp.data.newStatus
        ? `Status updated to ${resp.data.newStatus}`
        : "Action completed successfully" });
      await fetchTask();
      return resp.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setActionMessage({ type: "error", text: msg });
      if (err.response?.data?.requiresJustification) setShowJustification(true);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = () => apiAction(`/api/engineer/tasks/${id}/accept`, { notes: "Field engineer accepted task" });

  const handleTravelling = async () => {
    let coords = { lat: 12.9716, lng: 77.5946 };
    try { coords = await getBrowserCoordinates(); } catch (_) {}
    await apiAction(`/api/engineer/tasks/${id}/travelling`, { currentGps: coords });
  };

  const handleArrive = async () => {
    let coords = { lat: 12.9716, lng: 77.5946 };
    try { coords = await getBrowserCoordinates(); } catch (_) {}
    setArrivalGps(coords);
    const result = await apiAction(`/api/engineer/tasks/${id}/arrive`, {
      lat: coords.lat, lng: coords.lng,
      manualJustification: justification || undefined,
    });
    if (result) setShowJustification(false);
  };

  const handleStartWork = () => apiAction(`/api/engineer/tasks/${id}/start`, { workPlanNotes: workNotes || "Work begun on site" });

  const uploadPhoto = async (file, type) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    fd.append("engineerId", engineerId);
    const resp = await api.post(`${BASE_URL}/api/engineer/tasks/${id}/evidence`, fd);
    return resp.data.evidence.imageUrl;
  };

  const handleComplete = async () => {
    if (!beforeFile && !task?.beforeImageUrl && !task?.imageURL) return alert("Please upload a Before Image.");
    if (!afterFile && !task?.afterImageUrl) return alert("Please upload an After Image.");
    if (!workNotes || workNotes.trim().length < 10) return alert("Work notes must be at least 10 characters.");
    setActionLoading(true);
    setActionMessage(null);
    try {
      let bUrl = task?.beforeImageUrl || task?.imageURL;
      if (beforeFile) bUrl = await uploadPhoto(beforeFile, "BEFORE");
      let aUrl = task?.afterImageUrl;
      if (afterFile) aUrl = await uploadPhoto(afterFile, "AFTER");
      let coords = arrivalGps;
      if (!coords) { try { coords = await getBrowserCoordinates(); } catch (_) { coords = { lat: 12.9716, lng: 77.5946 }; } }
      const resp = await api.post(`${BASE_URL}/api/engineer/tasks/${id}/complete`, {
        engineerId, workDescription: workNotes,
        workType: task?.category || task?.workType,
        beforeImageUrl: bUrl, afterImageUrl: aUrl, completionGps: coords,
      });
      const ver = resp.data.verification;
      setActionMessage({
        type: ver.verificationStatus === "VERIFIED" ? "success" : "warning",
        text: `AI Verification: ${ver.verificationStatus} (${ver.confidence}% confidence). Sent to department review.`,
      });
      setBeforeFile(null); setAfterFile(null); setWorkNotes("");
      await fetchTask();
    } catch (err) {
      setActionMessage({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const ws = (task?.workflowStatus || task?.status || "").toUpperCase();
  const isUrgent = (task?.priority || "").toLowerCase() === "urgent";

  if (loading) return (
    <><Navbar /><div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading task details...</div><Footer /></>
  );

  if (!task) return (
    <><Navbar /><div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Task not found or inaccessible.</div><Footer /></>
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen px-4 lg:px-8 pt-28 pb-20 max-w-5xl mx-auto">
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/engineer/dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 transition-colors"
          >
            <ArrowLeft size={13} /> Back to Dashboard
          </button>
          <button
            onClick={fetchTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Task Identity */}
        <div className="glass rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  #{task.referenceId || task.id}
                </span>
                <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-white/5 border border-white/10 ${
                  STATUS_COLORS[ws] || "text-slate-300"
                }`}>{ws}</span>
                {isUrgent && (
                  <span className="text-[10px] font-bold uppercase text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle size={10} /> URGENT
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white">{task.title || task.issueDescription || "Civic Task"}</h1>
              <p className="text-slate-400 text-xs mt-1">Category: <span className="text-white">{task.category || "General"}</span> · Assigned to: <span className="text-cyan-300">{engineerId}</span></p>
            </div>
            <SLABadge sla={task.sla} />
          </div>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl text-xs font-medium flex items-center gap-2 border ${
              actionMessage.type === "success" ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
              : actionMessage.type === "warning" ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
              : "bg-red-950/40 text-red-300 border-red-500/30"
            }`}
          >
            {actionMessage.type === "success" ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-amber-400" />}
            {actionMessage.text}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description & AI Briefing */}
            <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-400">Citizen Report & AI Briefing</h3>
              <p className="text-sm text-slate-200 leading-relaxed">{task.description || task.issueDescription || "No description provided."}</p>
              {task.ai && (
                <div className="pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 mb-2"><ShieldCheck size={13} /> AI Classification Details</div>
                  <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-300">
                    <span className="text-slate-500">Predicted Dept:</span><span>{task.ai.department} ({Math.round((task.ai.textModel?.confidence || 0.9) * 100)}%)</span>
                    <span className="text-slate-500">Work Type:</span><span>{task.ai.workType || "Standard Repair"}</span>
                    {task.ai.automationMode && <><span className="text-slate-500">Mode:</span><span>{task.ai.automationMode}</span></>}
                  </div>
                </div>
              )}
              {task.assignment?.aiRecommendation && (
                <div className="pt-3 border-t border-white/5">
                  <div className="text-xs font-semibold text-indigo-400 mb-2">Assignment Recommendation Score</div>
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white">{task.assignment.aiRecommendation.score}%</span> match — {(task.assignment.aiRecommendation.reasons || [])[0]}
                  </div>
                </div>
              )}
            </div>

            {/* Location & Navigation */}
            <div className="glass rounded-2xl p-5 border border-white/10">
              <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-3">Location & Navigation</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-rose-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-white">Target Coordinates</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {task.location ? `${task.location.lat.toFixed(5)}, ${task.location.lng.toFixed(5)}` : "No GPS attached"}
                    </div>
                  </div>
                </div>
                {task.location && (
                  <a
                    href={`https://www.google.com/maps?q=${task.location.lat},${task.location.lng}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium border border-cyan-500/20 transition-colors"
                  >
                    <Navigation size={12} /> Open in Maps
                  </a>
                )}
              </div>
            </div>

            {/* Operational Action Bar */}
            <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-400">Operational Actions</h3>

              {task.lastReworkReason && (
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-300">
                  <strong>Rework Request:</strong> {task.lastReworkReason}
                </div>
              )}

              {/* Accept */}
              {["ASSIGNED", "NEW", "assigned", "pending"].includes(ws) && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
                  <div><div className="text-xs font-semibold text-cyan-300">Awaiting Acceptance</div><div className="text-[11px] text-slate-400">Review brief and confirm you will handle this task.</div></div>
                  <button onClick={handleAccept} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold disabled:opacity-50">
                    {actionLoading ? "Processing..." : "Accept Task"}
                  </button>
                </div>
              )}

              {/* Travelling */}
              {ws === "ENGINEER_ACCEPTED" && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-white/10">
                  <div><div className="text-xs font-semibold text-white">Ready for Departure</div><div className="text-[11px] text-slate-400">Mark travelling to log commute start.</div></div>
                  <button onClick={handleTravelling} disabled={actionLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50">
                    <Compass size={14} />{actionLoading ? "..." : "Mark Travelling"}
                  </button>
                </div>
              )}

              {/* Arrive */}
              {ws === "TRAVELLING" && (
                <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div><div className="text-xs font-semibold text-white">Arrived at Site?</div><div className="text-[11px] text-slate-400">Verify GPS against complaint location (250m radius).</div></div>
                    <button onClick={handleArrive} disabled={actionLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
                      <MapPin size={14} />{actionLoading ? "Checking..." : "Verify Arrival"}
                    </button>
                  </div>
                  {showJustification && (
                    <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 space-y-2">
                      <div className="text-xs text-amber-300 flex items-center gap-1"><AlertCircle size={13} /> GPS outside radius. Provide justification to proceed.</div>
                      <textarea rows={2} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Operational reason (e.g., road blocked, access from adjacent alleyway)..." className="w-full bg-slate-950/80 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400" />
                      <button onClick={handleArrive} className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">Submit with Justification</button>
                    </div>
                  )}
                </div>
              )}

              {/* Start Work */}
              {ws === "ARRIVED" && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-white/10">
                  <div><div className="text-xs font-semibold text-white">Begin Field Work</div><div className="text-[11px] text-slate-400">GPS verified. Click to start official repair timer.</div></div>
                  <button onClick={handleStartWork} disabled={actionLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-50">
                    <Play size={14} />{actionLoading ? "Starting..." : "Start Work"}
                  </button>
                </div>
              )}

              {/* Complete / Evidence */}
              {["WORK_STARTED", "IN_PROGRESS", "REWORK_REQUIRED"].includes(ws) && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-4">
                  <div className="text-xs font-semibold text-white">{ws === "REWORK_REQUIRED" ? "Submit Rework Evidence" : "Evidence & Completion"}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">Before Photo (Site Condition)</label>
                      <input type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files[0])} className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-white/10 file:text-slate-200" />
                      {task?.beforeImageUrl && !beforeFile && <div className="text-[10px] text-emerald-400 mt-1">✓ Before photo on file</div>}
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">After Photo (Resolved Work) *</label>
                      <input type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files[0])} className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-white/10 file:text-slate-200" />
                    </div>
                  </div>
                  <textarea rows={3} value={workNotes} onChange={(e) => setWorkNotes(e.target.value)} placeholder="Detailed work notes: materials used, method, final condition..." className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400" />
                  <div className="flex justify-end">
                    <button onClick={handleComplete} disabled={actionLoading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-50">
                      <CheckSquare size={15} />{actionLoading ? "Verifying with AI..." : "Mark Complete & Submit"}
                    </button>
                  </div>
                </div>
              )}

              {/* Terminal states */}
              {["AWAITING_VERIFICATION", "CLOSED", "DEPARTMENT_REVIEW_COMPLETED"].includes(ws) && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <div>
                    <div className="text-xs font-semibold text-emerald-300">Work Submitted</div>
                    <div className="text-[11px] text-slate-400">Status: <strong>{ws}</strong> — awaiting department review.</div>
                    {task.verification && <div className="text-[11px] text-slate-400">AI Verification: {task.verification.verificationStatus} ({task.verification.confidence}%)</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Evidence Gallery */}
            {(task.beforeImageUrl || task.afterImageUrl || task.imageURL) && (
              <div className="glass rounded-2xl p-5 border border-white/10">
                <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-4 flex items-center gap-2"><Image size={13} /> Evidence Photos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(task.beforeImageUrl || task.imageURL) && (
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">BEFORE</div>
                      <img src={task.beforeImageUrl || task.imageURL} alt="Before" className="w-full h-40 object-cover rounded-xl border border-white/10" />
                    </div>
                  )}
                  {task.afterImageUrl && (
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-400 mb-1">AFTER</div>
                      <img src={task.afterImageUrl} alt="After" className="w-full h-40 object-cover rounded-xl border border-emerald-500/30" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Timeline & Events */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="glass rounded-2xl p-5 border border-white/10">
              <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-4 flex items-center gap-2"><History size={13} /> Event Timeline</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {(task.timeline || []).length === 0 ? (
                  <div className="text-xs text-slate-500">No timeline events yet.</div>
                ) : (
                  [...(task.timeline || [])].reverse().map((ev, i) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <div>
                        <div className="text-[11px] font-semibold text-white">{ev.action}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{new Date(ev.date).toLocaleString()}</div>
                        {ev.details && <div className="text-[10px] text-slate-400 mt-0.5">{ev.details}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Assignment Info */}
            {task.assignment && (
              <div className="glass rounded-2xl p-5 border border-white/10 text-xs space-y-2">
                <h3 className="uppercase font-semibold tracking-wider text-slate-400 mb-3">Assignment Info</h3>
                {task.assignment.engineerName && <div className="flex justify-between"><span className="text-slate-500">Engineer:</span><span className="text-white font-semibold">{task.assignment.engineerName}</span></div>}
                {task.assignment.assignedAt && <div className="flex justify-between"><span className="text-slate-500">Assigned:</span><span className="text-slate-300 font-mono">{new Date(task.assignment.assignedAt).toLocaleString()}</span></div>}
                {task.assignment.acceptedAt && <div className="flex justify-between"><span className="text-slate-500">Accepted:</span><span className="text-slate-300 font-mono">{new Date(task.assignment.acceptedAt).toLocaleString()}</span></div>}
                {task.assignment.arrivedAt && <div className="flex justify-between"><span className="text-slate-500">Arrived:</span><span className="text-slate-300 font-mono">{new Date(task.assignment.arrivedAt).toLocaleString()}</span></div>}
                {task.assignment.completedAt && <div className="flex justify-between"><span className="text-slate-500">Completed:</span><span className="text-emerald-400 font-mono">{new Date(task.assignment.completedAt).toLocaleString()}</span></div>}
                {task.assignment.slaDeadline && <div className="flex justify-between"><span className="text-slate-500">SLA Deadline:</span><span className="text-amber-300 font-mono">{new Date(task.assignment.slaDeadline).toLocaleString()}</span></div>}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
