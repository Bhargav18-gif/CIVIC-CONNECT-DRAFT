import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../../components/layout/Navbar.jsx";
import Footer from "../../components/layout/Footer.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Navigation,
  Play,
  CheckSquare,
  Camera,
  FileText,
  AlertTriangle,
  Send,
  RefreshCw,
  Layers,
  ChevronRight,
  ShieldCheck,
  Compass,
} from "lucide-react";
import api from "../../utils/api.js";

export default function EngineerDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my_tasks"); // my_tasks, route, profile
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);

  // Form states for work execution
  const [arrivalGps, setArrivalGps] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [justification, setJustification] = useState("");
  const [showJustification, setShowJustification] = useState(false);
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [workNotes, setWorkNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Profile data
  const [profile, setProfile] = useState(null);

  const engineerId = user?.uid || "ENG-RDS-01";

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`http://localhost:5177/api/engineer/tasks?engineerId=${engineerId}`);
      if (resp.data && resp.data.tasks) {
        setTasks(resp.data.tasks);
        if (!selectedTask && resp.data.tasks.length > 0) {
          setSelectedTask(resp.data.tasks[0]);
        }
      }
    } catch (err) {
      console.warn("Could not fetch engineer tasks:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const resp = await api.get(`http://localhost:5177/api/engineer/profile?engineerId=${engineerId}`);
      if (resp.data && resp.data.profile) {
        setProfile(resp.data.profile);
      }
    } catch (e) {
      console.warn("Could not fetch profile:", e.message);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchProfile();
  }, [engineerId]);

  // Request browser GPS position
  const getBrowserCoordinates = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
      } else {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { timeout: 8000 }
        );
      }
    });
  };

  // 1. Accept Task
  const handleAcceptTask = async (taskId) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await api.post(`http://localhost:5177/api/engineer/tasks/${taskId}/accept`, {
        engineerId,
        notes: "Field engineer accepted task.",
      });
      setActionMessage({ type: "success", text: "Task accepted! Status updated to ENGINEER_ACCEPTED." });
      await fetchTasks();
    } catch (err) {
      setActionMessage({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Mark Travelling
  const handleMarkTravelling = async (taskId) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      let coords = null;
      try {
        coords = await getBrowserCoordinates();
      } catch (e) {
        coords = { lat: 12.9716, lng: 77.5946 }; // sensible city fallback
      }
      await api.post(`http://localhost:5177/api/engineer/tasks/${taskId}/travelling`, {
        engineerId,
        currentGps: coords,
      });
      setActionMessage({ type: "success", text: "En route! Status updated to TRAVELLING." });
      await fetchTasks();
    } catch (err) {
      setActionMessage({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Mark Arrived with GPS verification
  const handleMarkArrived = async (taskId) => {
    setActionLoading(true);
    setActionMessage(null);
    setGpsError("");
    try {
      let coords = null;
      try {
        coords = await getBrowserCoordinates();
      } catch (e) {
        coords = { lat: 12.9716, lng: 77.5946 };
      }
      setArrivalGps(coords);

      const resp = await api.post(`http://localhost:5177/api/engineer/tasks/${taskId}/arrive`, {
        engineerId,
        lat: coords.lat,
        lng: coords.lng,
        manualJustification: justification || undefined,
      });

      if (resp.data.arrivalVerified) {
        setActionMessage({
          type: "success",
          text: `Arrival verified! Position confirmed within range (${resp.data.distanceMeters || 0}m).`,
        });
        setShowJustification(false);
      } else {
        setActionMessage({
          type: "success",
          text: "Arrival recorded with operational justification override.",
        });
        setShowJustification(false);
      }
      await fetchTasks();
    } catch (err) {
      if (err.response?.data?.requiresJustification) {
        setShowJustification(true);
        setGpsError(err.response.data.message);
      } else {
        setActionMessage({ type: "error", text: err.response?.data?.error || err.message });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Start Work
  const handleStartWork = async (taskId) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await api.post(`http://localhost:5177/api/engineer/tasks/${taskId}/start`, {
        engineerId,
        workPlanNotes: workNotes || "Physical site repair begun.",
      });
      setActionMessage({ type: "success", text: "Work officially started! Status: WORK_STARTED." });
      await fetchTasks();
    } catch (err) {
      setActionMessage({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Helper upload function
  const uploadPhoto = async (taskId, file, type) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("engineerId", engineerId);
    if (arrivalGps) {
      formData.append("lat", arrivalGps.lat);
      formData.append("lng", arrivalGps.lng);
    }
    const resp = await api.post(`http://localhost:5177/api/engineer/tasks/${taskId}/evidence`, formData);
    return resp.data.evidence.imageUrl;
  };

  // 5. Complete Work with AI Verification
  const handleCompleteWork = async (taskId) => {
    if (!beforeFile && !selectedTask.beforeImageUrl && !selectedTask.imageURL) {
      return alert("Please upload or provide a Before Image.");
    }
    if (!afterFile && !selectedTask.afterImageUrl) {
      return alert("Please upload an After Image showing the resolved issue.");
    }
    if (!workNotes || workNotes.trim().length < 10) {
      return alert("Please enter descriptive work notes (at least 10 characters).");
    }

    setActionLoading(true);
    setActionMessage(null);
    try {
      let bUrl = selectedTask.beforeImageUrl || selectedTask.imageURL;
      if (beforeFile) {
        bUrl = await uploadPhoto(taskId, beforeFile, "BEFORE");
      }

      let aUrl = selectedTask.afterImageUrl;
      if (afterFile) {
        aUrl = await uploadPhoto(taskId, afterFile, "AFTER");
      }

      let coords = arrivalGps;
      if (!coords) {
        try {
          coords = await getBrowserCoordinates();
        } catch (e) {
          coords = { lat: 12.9716, lng: 77.5946 };
        }
      }

      const resp = await api.post(`http://localhost:5177/api/engineer/tasks/${taskId}/complete`, {
        engineerId,
        workDescription: workNotes,
        workType: selectedTask.category || selectedTask.workType,
        beforeImageUrl: bUrl,
        afterImageUrl: aUrl,
        completionGps: coords,
      });

      const ver = resp.data.verification;
      setActionMessage({
        type: ver.verificationStatus === "VERIFIED" ? "success" : "warning",
        text: `Work marked complete! AI Verification Status: ${ver.verificationStatus} (Confidence: ${ver.confidence}%). Sent to Department Review.`,
      });

      setBeforeFile(null);
      setAfterFile(null);
      setWorkNotes("");
      await fetchTasks();
    } catch (err) {
      setActionMessage({ type: "error", text: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "urgent") return t.priority?.toLowerCase() === "urgent";
    if (statusFilter === "in_progress") {
      return ["in-progress", "in_progress", "work_started", "travelling", "arrived"].includes((t.status || "").toLowerCase());
    }
    if (statusFilter === "completed") {
      return ["closed", "resolved", "awaiting_verification", "department_review_completed"].includes((t.status || "").toLowerCase());
    }
    return true;
  });

  const urgentCount = tasks.filter((t) => t.priority?.toLowerCase() === "urgent").length;
  const inProgressCount = tasks.filter((t) => ["in-progress", "in_progress", "work_started", "travelling", "arrived"].includes((t.status || "").toLowerCase())).length;
  const completedTodayCount = tasks.filter((t) => ["closed", "resolved", "department_review_completed"].includes((t.status || "").toLowerCase())).length;
  const atRiskCount = tasks.filter((t) => t.sla?.slaStatus === "AT_RISK" || t.sla?.isBreached).length;

  return (
    <>
      <Navbar />
      <div className="min-h-screen px-4 lg:px-8 pt-28 pb-20 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                FIELD OPERATIONS
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {engineerId}</span>
            </div>
            <h1 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
              Engineer Field Portal
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time assigned tasks, AI field briefs, GPS arrival verification & evidence capture.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchTasks}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-right">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Current Duty</div>
              <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ON DUTY
              </div>
            </div>
          </div>
        </div>

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              Active Queue
              <Layers size={16} className="text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{tasks.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Assigned to you</div>
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              Critical / Urgent
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400 mt-2">{urgentCount}</div>
            <div className="text-[11px] text-red-400/80 mt-0.5">Immediate attention</div>
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              SLA At Risk
              <Clock size={16} className="text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2">{atRiskCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Deadline approaching</div>
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              Completed Today
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">{completedTodayCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Verified & closed</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab("my_tasks")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "my_tasks"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            My Assigned Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "profile"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Engineer Profile & Metrics
          </button>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl text-xs font-medium flex items-center gap-2 border ${
              actionMessage.type === "success"
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                : actionMessage.type === "warning"
                ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                : "bg-red-950/40 text-red-300 border-red-500/30"
            }`}
          >
            {actionMessage.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-amber-400" />
            )}
            <div>{actionMessage.text}</div>
          </motion.div>
        )}

        {/* Main Workspace Layout */}
        {activeTab === "my_tasks" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Task Queue / Smart List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-300">
                    Smart Work Queue
                  </h3>
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                    {["all", "urgent", "in_progress", "completed"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-colors ${
                          statusFilter === f ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {f.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading assignments...</div>
                ) : filteredTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">No tasks match filter.</div>
                ) : (
                  <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
                    {filteredTasks.map((t, index) => {
                      const isSelected = selectedTask?.id === t.id;
                      const isUrgent = t.priority?.toLowerCase() === "urgent";
                      const isBreached = t.sla?.isBreached;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-cyan-950/30 border-cyan-500/40 shadow-lg shadow-cyan-950/20"
                              : "bg-slate-900/50 hover:bg-slate-900 border-white/5"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-cyan-400 font-bold bg-cyan-400/10 px-1.5 py-0.5 rounded">
                                #{t.referenceId || t.id.slice(0, 8)}
                              </span>
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  isUrgent
                                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                    : "bg-white/5 text-slate-400 border border-white/10"
                                }`}
                              >
                                {t.priority || "NORMAL"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {t.sla?.timeRemainingStr || "SLA Safe"}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-white line-clamp-1">
                            {t.title || t.issueDescription || "Civic Task"}
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <MapPin size={11} className="text-slate-500" />
                              {t.category || "General"}
                            </span>
                            <span className="capitalize text-[10px] font-medium text-cyan-300">
                              {t.workflowStatus || t.status || "Assigned"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Detailed Task Execution Workspace */}
            <div className="lg:col-span-7">
              {selectedTask ? (
                <div className="glass rounded-2xl p-6 border border-white/10 space-y-6">
                  {/* Task Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                          {selectedTask.referenceId || selectedTask.id}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                          {selectedTask.workflowStatus || selectedTask.status || "ASSIGNED"}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-white mt-2">
                        {selectedTask.title || selectedTask.category}
                      </h2>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">SLA Status</div>
                      <div
                        className={`text-xs font-bold font-mono ${
                          selectedTask.sla?.isBreached
                            ? "text-red-400"
                            : selectedTask.sla?.slaStatus === "AT_RISK"
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {selectedTask.sla?.timeRemainingStr} ({selectedTask.sla?.slaStatus})
                      </div>
                    </div>
                  </div>

                  {/* Citizen Description & AI Brief */}
                  <div className="bg-slate-900/60 rounded-xl p-4 border border-white/5 space-y-3">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Citizen Description
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {selectedTask.description || selectedTask.issueDescription || "No detailed description provided."}
                      </p>
                    </div>

                    {/* AI Field Briefing */}
                    {selectedTask.ai && (
                      <div className="pt-3 border-t border-white/5">
                        <div className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1.5 mb-1">
                          <ShieldCheck size={13} />
                          AI Field Briefing & Recommendation
                        </div>
                        <div className="text-[11px] text-slate-300 grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <span className="text-slate-500">Predicted Dept:</span> {selectedTask.ai.department} (
                            {Math.round((selectedTask.ai.textModel?.confidence || 0.9) * 100)}%)
                          </div>
                          <div>
                            <span className="text-slate-500">Work Type:</span> {selectedTask.ai.workType || "Standard"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Task Location & Navigation */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-rose-400 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-white">Target Location</div>
                        <div className="text-[11px] text-slate-400">
                          {selectedTask.location
                            ? `${selectedTask.location.lat.toFixed(4)}, ${selectedTask.location.lng.toFixed(4)}`
                            : "Coordinates attached to report"}
                        </div>
                      </div>
                    </div>

                    {selectedTask.location && (
                      <a
                        href={`https://www.google.com/maps?q=${selectedTask.location.lat},${selectedTask.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium border border-cyan-500/20 transition-colors"
                      >
                        <Navigation size={12} />
                        Navigate
                      </a>
                    )}
                  </div>

                  {/* Work Execution Action Control Flow */}
                  <div className="pt-2 border-t border-white/10 space-y-4">
                    <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                      Operational Action Bar
                    </h4>

                    {/* Step 1: Accept Assignment */}
                    {["ASSIGNED", "NEW", "assigned", "pending"].includes(selectedTask.workflowStatus || selectedTask.status) && (
                      <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-cyan-300">Awaiting Acceptance</div>
                          <div className="text-[11px] text-slate-400">Review task brief and accept assignment.</div>
                        </div>
                        <button
                          onClick={() => handleAcceptTask(selectedTask.id)}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {actionLoading ? "Processing..." : "Accept Task"}
                        </button>
                      </div>
                    )}

                    {/* Step 2: Mark Travelling */}
                    {["ENGINEER_ACCEPTED", "engineer_accepted"].includes(selectedTask.workflowStatus || selectedTask.status) && (
                      <div className="p-4 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-white">Ready for Departure</div>
                          <div className="text-[11px] text-slate-400">Mark travelling to report start of commute.</div>
                        </div>
                        <button
                          onClick={() => handleMarkTravelling(selectedTask.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          <Compass size={14} />
                          Mark Travelling
                        </button>
                      </div>
                    )}

                    {/* Step 3: Mark Arrived with GPS verification */}
                    {["TRAVELLING", "travelling"].includes(selectedTask.workflowStatus || selectedTask.status) && (
                      <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-white">Arrived at Site?</div>
                            <div className="text-[11px] text-slate-400">
                              Verify your live GPS coordinates against the complaint location.
                            </div>
                          </div>
                          <button
                            onClick={() => handleMarkArrived(selectedTask.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            <MapPin size={14} />
                            Verify Arrival
                          </button>
                        </div>

                        {/* Justification Override Path if GPS mismatch */}
                        {showJustification && (
                          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 space-y-2">
                            <div className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
                              <AlertCircle size={14} />
                              {gpsError || "GPS proximity check exceeded."}
                            </div>
                            <textarea
                              rows={2}
                              value={justification}
                              onChange={(e) => setJustification(e.target.value)}
                              placeholder="Operational reason for distance discrepancy (e.g., road closed, access from adjacent alleyway)..."
                              className="w-full bg-slate-950/80 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                            />
                            <button
                              onClick={() => handleMarkArrived(selectedTask.id)}
                              className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                            >
                              Submit Arrival with Justification
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 4: Start Physical Work */}
                    {["ARRIVED", "arrived"].includes(selectedTask.workflowStatus || selectedTask.status) && (
                      <div className="p-4 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-white">Begin Field Work</div>
                          <div className="text-[11px] text-slate-400">
                            Log arrival verified. Click to start official repair timer.
                          </div>
                        </div>
                        <button
                          onClick={() => handleStartWork(selectedTask.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          <Play size={14} />
                          Start Work
                        </button>
                      </div>
                    )}

                    {/* Step 5: Evidence Capture & Complete Work */}
                    {["WORK_STARTED", "IN_PROGRESS", "work_started", "in_progress", "in-progress", "REWORK_REQUIRED", "rework_required"].includes(
                      selectedTask.workflowStatus || selectedTask.status
                    ) && (
                      <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-white">
                              {selectedTask.workflowStatus === "REWORK_REQUIRED" ? "Rework In Progress" : "Work In Progress"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Upload mandatory Before & After photographic evidence to submit for AI verification.
                            </div>
                          </div>
                        </div>

                        {selectedTask.lastReworkReason && (
                          <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300">
                            <strong>Department Rework Request:</strong> {selectedTask.lastReworkReason}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              Before Photo (Site Condition)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setBeforeFile(e.target.files[0])}
                              className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-white/10 file:text-slate-200 hover:file:bg-white/20"
                            />
                            {selectedTask.beforeImageUrl && !beforeFile && (
                              <div className="text-[10px] text-emerald-400 mt-1">✓ Before photo on file</div>
                            )}
                          </div>

                          <div>
                            <label className="text-[11px] font-medium text-slate-400 block mb-1">
                              After Photo (Resolved Work) *
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setAfterFile(e.target.files[0])}
                              className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-white/10 file:text-slate-200 hover:file:bg-white/20"
                            />
                            {selectedTask.afterImageUrl && !afterFile && (
                              <div className="text-[10px] text-emerald-400 mt-1">✓ After photo on file</div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">
                            Field Work Notes & Material Summary *
                          </label>
                          <textarea
                            rows={3}
                            value={workNotes}
                            onChange={(e) => setWorkNotes(e.target.value)}
                            placeholder="Detailed work performed, tools used, asphalt/pipeline replaced, final condition..."
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleCompleteWork(selectedTask.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs transition-all disabled:opacity-50"
                          >
                            <CheckSquare size={15} />
                            {actionLoading ? "Verifying with AI..." : "Mark Complete & Verify"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 6: Awaiting Verification Review */}
                    {["AWAITING_VERIFICATION", "awaiting_verification", "CLOSED", "closed", "department_review_completed"].includes(
                      selectedTask.workflowStatus || selectedTask.status
                    ) && (
                      <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 size={16} />
                          Work Execution Finished
                        </div>
                        <div className="text-xs text-slate-300">
                          Status: <strong>{selectedTask.workflowStatus || selectedTask.status}</strong>
                        </div>
                        {selectedTask.verification && (
                          <div className="text-[11px] text-slate-400 pt-1">
                            AI Verification: {selectedTask.verification.verificationStatus} (
                            {selectedTask.verification.confidence}% confidence)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="glass rounded-2xl p-12 text-center text-slate-400 border border-white/10">
                  Select a task from the queue to view full instructions, GPS guidance, and action panel.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="glass rounded-2xl p-6 border border-white/10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-lg font-bold text-white">Engineer Operational Profile</h2>
            {profile ? (
              <div className="space-y-4 text-xs">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Engineer Name:</span>
                  <span className="text-white font-semibold">{profile.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Department:</span>
                  <span className="text-white font-semibold">{profile.departmentId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Specialized Skills:</span>
                  <span className="text-cyan-400">{(profile.skills || []).join(", ")}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">SLA Compliance Rate:</span>
                  <span className="text-emerald-400 font-bold">{profile.slaComplianceRate || 96}%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Average Resolution Time:</span>
                  <span className="text-white font-mono">{profile.averageResolutionTime || 4.2} hours</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Current Workload:</span>
                  <span className="text-white">{profile.workloadCount || tasks.length} active tasks</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs">Loading operational profile...</div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
