import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, MapPin, CheckCircle, Save, User, LayoutDashboard, Camera, Clock, MessageSquare, Sparkles } from "lucide-react";
import api from "../../utils/api.js";
import TimelineSection from "./evidence/TimelineSection.jsx";
import EvidenceGallery from "./evidence/EvidenceGallery.jsx";
import FeedbackReview from "./evidence/FeedbackReview.jsx";
import AIAdminRecommendation from "./AIAdminRecommendation.jsx";
import AIReasoningPanel from "./AIReasoningPanel.jsx";

const CATEGORIES = ["Roads", "Water", "Electricity", "Garbage", "Drainage", "Health", "Transport", "Public Safety"];
const PRIORITIES = ["low", "normal", "urgent"];
const STATUSES = ["pending", "in-progress", "resolved", "rejected", "reopened"];

export default function ComplaintDetailsModal({ issue, onClose, onUpdate }) {
  const [status, setStatus] = useState(issue.status);
  const [priority, setPriority] = useState(issue.priority);
  const [category, setCategory] = useState(issue.category);
  const [aiAuditData, setAiAuditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    setStatus(issue.status);
    setPriority(issue.priority);
    setCategory(issue.category);
    setError("");
    setSuccess(false);
    setActiveTab("details");
  }, [issue]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const updatePayload = {
        status,
        priority,
        category,
        ...(aiAuditData || {})
      };
      const { data } = await api.patch(`/admin/issues/${issue.referenceId}`, updatePayload);
      setSuccess(true);
      if (onUpdate) {
        onUpdate(data.issue);
      }
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update complaint.");
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: "details", label: "Details", icon: LayoutDashboard },
    { id: "ai_reasoning", label: "AI Reasoning", icon: Sparkles },
    { id: "evidence", label: "Evidence", icon: Camera },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="glass-strong rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col relative z-10 overflow-hidden shadow-2xl border border-white/10"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#0a0f18]/80 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-cyan-400 font-bold px-2.5 py-1 rounded-md bg-cyan-400/10 border border-cyan-400/20">{issue.referenceId}</span>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                status === "resolved" ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20" :
                status === "reopened" ? "bg-red-400/10 text-red-300 border border-red-400/20" :
                "bg-white/5 text-slate-300 border border-white/10"
              }`}>
                {status}
              </span>
            </div>
            <h2 className="text-xl font-bold font-display text-white mt-3">{issue.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all cursor-pointer self-start mt-[-10px] mr-[-10px]"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 shrink-0 bg-[#0a0f18]/50 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id 
                    ? "bg-gradient-to-r from-cyan-400/20 to-blue-500/20 text-cyan-300 border border-cyan-400/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon size={14} className={activeTab === tab.id ? "text-cyan-400" : "text-slate-500"} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0a0f18]">
          {error && (
            <div className="bg-red-500/10 border border-red-400/20 text-red-300 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {activeTab === "details" && (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Description</label>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-white/[0.02] border border-white/5 p-5 rounded-2xl mb-4">
                    {issue.description}
                  </p>
                </div>

                {/* Evidence Preview */}
                {(issue.imageURL || (issue.citizenPhotos && issue.citizenPhotos.length > 0)) && (
                  <div>
                    <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 block flex items-center justify-between">
                      <span>Attached Evidence</span>
                      <button onClick={() => setActiveTab("evidence")} className="text-cyan-400 hover:text-cyan-300 text-[10px] uppercase">View Gallery &rarr;</button>
                    </label>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {(issue.citizenPhotos?.length > 0 ? issue.citizenPhotos : [{url: issue.imageURL}]).slice(0, 3).map((photo, i) => (
                        <div key={i} className="relative w-28 h-28 rounded-xl overflow-hidden border border-white/10 shrink-0 cursor-pointer" onClick={() => setActiveTab("evidence")}>
                          <img src={photo.url} alt="Evidence" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </div>
                      ))}
                      {(issue.citizenPhotos?.length > 3) && (
                        <div 
                          onClick={() => setActiveTab("evidence")}
                          className="w-28 h-28 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center shrink-0 cursor-pointer hover:bg-white/10 transition-colors"
                        >
                          <span className="text-xs font-semibold text-slate-300">+{issue.citizenPhotos.length - 3} more</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Citizen Info */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-400/10 text-blue-400 mt-1">
                    <User size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Citizen Information</h4>
                    <p className="text-sm font-medium text-white">{issue.userName || "Unknown Citizen"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{issue.userEmail || "No email provided"}</p>
                    {issue.userId && <p className="text-[10px] font-mono text-slate-500 mt-2">ID: {issue.userId}</p>}
                  </div>
                </div>

                {/* Location Info */}
                {issue.location ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-emerald-400/10 text-emerald-400 mt-1">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Location Information</h4>
                      <p className="text-sm text-white mb-2">{issue.address || "Address not provided, GPS coordinates available."}</p>
                      <p className="text-xs font-mono text-slate-400">
                        Lat: {parseFloat(issue.location.lat).toFixed(6)}, Lng: {parseFloat(issue.location.lng).toFixed(6)}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-4">
                        <a
                          href={`https://maps.google.com/?q=${issue.location.lat},${issue.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 text-xs font-semibold hover:bg-cyan-400 hover:text-slate-900 transition-all inline-block"
                        >
                          Open in Google Maps
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-3">
                    <MapPin size={20} className="text-slate-600" />
                    <span className="text-sm text-slate-400">No location data provided for this complaint.</span>
                  </div>
                )}
              </div>

              {/* Sidebar actions inside modal */}
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                  <div className="mb-6">
                    <span className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">
                      <Calendar size={14} /> Reported On
                    </span>
                    <p className="text-sm font-medium text-white">
                      {new Date(issue.createdAt).toLocaleString("en-IN", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>

                  <hr className="border-white/10 mb-6" />

                  {/* AI Admin Task Classifier Recommendation */}
                  <AIAdminRecommendation
                    issue={issue}
                    currentCategory={category}
                    onApplyCategory={(newCat) => setCategory(newCat)}
                    onRecordDecision={(decision) => setAiAuditData(decision)}
                  />

                  <div className="space-y-4">
                    {/* Status Select */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-2 font-semibold">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-cyan-400/50 transition-colors [&>option]:bg-[#101826] cursor-pointer"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category Select */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-2 font-semibold">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-cyan-400/50 transition-colors [&>option]:bg-[#101826] cursor-pointer"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority Select */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-2 font-semibold">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-cyan-400/50 transition-colors [&>option]:bg-[#101826] cursor-pointer"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ai_reasoning" && (
            <AIReasoningPanel issue={issue} />
          )}

          {activeTab === "evidence" && (
            <EvidenceGallery issue={issue} />
          )}

          {activeTab === "timeline" && (
            <div className="max-w-2xl mx-auto">
              <TimelineSection timeline={issue.timeline || []} />
            </div>
          )}

          {activeTab === "feedback" && (
            <div className="max-w-4xl mx-auto">
              <FeedbackReview feedback={issue.feedback} aiAnalysis={issue.aiAnalysis} />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-[#0a0f18]/90 backdrop-blur-xl flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-semibold glass text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-lg disabled:opacity-50 hover:shadow-cyan-400/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : success ? (
              <CheckCircle size={16} className="text-emerald-300" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving Changes..." : success ? "Changes Saved" : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
