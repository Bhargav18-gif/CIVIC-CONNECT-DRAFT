import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Calendar, AlertCircle, Star, MessageSquare, CheckCircle } from "lucide-react";
import Navbar from "../components/layout/Navbar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Button from "../components/ui/Button.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import ComplaintTimeline from "../components/report/ComplaintTimeline.jsx";
import api from "../utils/api.js";

const STAGES = ["Submitted", "AI Verification", "Department Assigned", "In Progress", "Resolved"];

function stageIndex(status) {
  switch (status) {
    case "pending":
      return 1;
    case "in-progress":
      return 3;
    case "resolved":
      return 4;
    default:
      return 0;
  }
}

export default function TrackComplaintPage() {
  const [referenceId, setReferenceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [issue, setIssue] = useState(null);

  // Feedback State
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [resolutionStatus, setResolutionStatus] = useState("Fully Resolved");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    if (!referenceId.trim()) return;
    setError("");
    setLoading(true);
    setIssue(null);
    setRating(0);
    setComment("");
    setResolutionStatus("Fully Resolved");
    setFeedbackError("");
    try {
      const { data } = await api.get(`/issues/${referenceId.trim()}`);
      setIssue(data.issue);
    } catch (err) {
      setError(
        err.response?.status === 404
          ? "No report found with that reference number."
          : "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const currentStage = issue ? stageIndex(issue.status) : 0;

  async function submitFeedback(e) {
    e.preventDefault();
    if (rating === 0) {
      setFeedbackError("Please select a rating.");
      return;
    }
    setFeedbackError("");
    setFeedbackLoading(true);
    try {
      const { data } = await api.post(`/issues/${issue.referenceId}/feedback`, {
        rating,
        comment,
        resolutionStatus,
      });
      setIssue(data.issue);
    } catch (err) {
      setFeedbackError("Failed to submit feedback. Try again.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen px-6 pt-32 pb-20 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="font-display font-bold text-4xl tracking-tight mb-2">Track your complaint</h1>
          <p className="text-slate-400">Enter your reference number to see live status.</p>
        </motion.div>

        <form onSubmit={handleSearch} className="flex gap-3 mb-10">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="e.g. CC-10234"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
          </div>
          <Button type="submit" disabled={loading} className="px-7">
            {loading ? "Searching..." : "Track"}
          </Button>
        </form>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-500/10 border border-red-400/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-6"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        <AnimatePresence>
          {issue && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-strong rounded-3xl p-7 sm:p-9"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
                <div>
                  <p className="text-xs font-mono text-slate-500 mb-1">{issue.referenceId}</p>
                  <h2 className="font-display font-semibold text-2xl">{issue.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-slate-400 mt-2">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} /> {issue.category}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />{" "}
                      {new Date(issue.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <StatusBadge status={issue.status} />
              </div>

              <p className="text-sm text-slate-300 leading-relaxed mb-8">{issue.description}</p>

              <div className="mt-8">
                <ComplaintTimeline 
                  history={issue.history || [
                    { stage: "Submitted", timestamp: issue.createdAt, remarks: "Citizen reported the issue.", department: "AI Triage System" },
                    ...(issue.status !== "pending" ? [{ stage: "Assigned", timestamp: new Date(new Date(issue.createdAt).getTime() + 86400000).toISOString(), remarks: "Assigned to field engineer.", department: issue.category, officer: "Eng. Smith" }] : []),
                    ...(issue.status === "resolved" ? [{ stage: "Resolved", timestamp: issue.updatedAt || new Date().toISOString(), remarks: "Issue fixed and verified.", department: issue.category, officer: "Eng. Smith" }] : [])
                  ]} 
                />
              </div>

              {/* Feedback Section */}
              {issue.status === "resolved" && (
                <div className="mt-10 pt-8 border-t border-white/10">
                  <h3 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
                    <MessageSquare size={20} className="text-cyan-400" />
                    Feedback
                  </h3>
                  {issue.feedback ? (
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                      <p className="text-sm text-slate-400 mb-2">You rated this resolution:</p>
                      <div className="flex gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={20}
                            className={star <= issue.feedback.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-600"}
                          />
                        ))}
                      </div>
                      {issue.feedback.comment && (
                        <div className="bg-black/20 p-4 rounded-xl text-sm text-slate-300">
                          "{issue.feedback.comment}"
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
                        <CheckCircle size={12} /> Feedback submitted successfully
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                      <p className="text-sm text-slate-300 mb-4">
                        We're glad this issue is resolved! Please rate the service provided.
                      </p>
                      
                      {feedbackError && (
                        <div className="bg-red-500/10 text-red-300 border border-red-500/20 px-3 py-2 rounded-lg text-xs mb-4">
                          {feedbackError}
                        </div>
                      )}
                      
                      <div className="flex gap-2 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="transition-transform hover:scale-110 focus:outline-none"
                          >
                            <Star
                              size={28}
                              className={
                                star <= (hoverRating || rating)
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-slate-600 hover:text-slate-500"
                              }
                            />
                          </button>
                        ))}
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs text-slate-400 mb-2 font-medium">Resolution Verification:</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setResolutionStatus("Fully Resolved")}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                              resolutionStatus === "Fully Resolved"
                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                            }`}
                          >
                            <CheckCircle size={14} /> Problem Fixed
                          </button>
                          <button
                            type="button"
                            onClick={() => setResolutionStatus("Not Resolved")}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                              resolutionStatus === "Not Resolved"
                                ? "bg-red-500/20 border-red-500/50 text-red-300 shadow-lg shadow-red-500/10"
                                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                            }`}
                          >
                            <AlertCircle size={14} /> Still Not Fixed
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={resolutionStatus === "Not Resolved" ? "Please tell us what is still unfixed..." : "Leave a comment (optional)..."}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors mb-4 resize-none h-24"
                      />

                      <Button 
                        onClick={submitFeedback} 
                        disabled={feedbackLoading} 
                        className={`w-full justify-center ${resolutionStatus === "Not Resolved" ? "bg-red-600 hover:bg-red-500 text-white" : ""}`}
                      >
                        {feedbackLoading ? "Submitting..." : resolutionStatus === "Not Resolved" ? "Report Not Fixed & Reopen Issue" : "Submit Feedback"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </>
  );
}
