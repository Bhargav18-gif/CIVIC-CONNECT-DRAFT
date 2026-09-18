import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Calendar, CheckCircle, Clock, AlertCircle, ShieldAlert, Star, MessageSquare } from "lucide-react";
import StatusBadge from "../ui/StatusBadge.jsx";
import ComplaintTimeline from "../report/ComplaintTimeline.jsx";
import Button from "../ui/Button.jsx";
import { useState } from "react";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../../firebase.js";

function stageIndex(status) {
  const s = status?.toLowerCase() || "";
  if (s === "pending" || s === "submitted") return 1;
  if (s === "assigned") return 2;
  if (s === "in-progress" || s === "in progress") return 3;
  if (s === "resolved" || s === "completed") return 4;
  if (s === "closed") return 5;
  return 0;
}

export default function ComplaintDetailModal({ issue, onClose }) {
  const [loading, setLoading] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  if (!issue) return null;

  const currentStage = stageIndex(issue.status);

  // Generate timeline history from history field or mock it for display
  const history = issue.history || [
    { stage: "Submitted", timestamp: issue.createdAt, remarks: "Citizen reported the issue.", department: "AI Triage System" },
    ...(currentStage >= 2 ? [{ stage: "Assigned", timestamp: new Date(new Date(issue.createdAt).getTime() + 3600000).toISOString(), remarks: "Assigned to department.", department: issue.department || issue.category }] : []),
    ...(currentStage >= 3 ? [{ stage: "In Progress", timestamp: new Date(new Date(issue.createdAt).getTime() + 86400000).toISOString(), remarks: "Work started by field engineer.", department: issue.department || issue.category }] : []),
    ...(currentStage >= 4 ? [{ stage: "Completed", timestamp: issue.updatedAt || new Date().toISOString(), remarks: "Issue has been fixed.", department: issue.department || issue.category }] : [])
  ];

  const handleReopen = async () => {
    setLoading(true);
    try {
      const issueRef = doc(db, "complaints", issue.id);
      await updateDoc(issueRef, {
        status: "Reopened",
        updatedAt: new Date().toISOString(),
        history: [
          ...history,
          {
            stage: "Reopened",
            timestamp: new Date().toISOString(),
            remarks: "Citizen reopened the complaint for further review.",
            department: "Citizen"
          }
        ]
      });
      // Optionally notify department
      if (issue.department) {
         await addDoc(collection(db, "notifications"), {
            department: issue.department,
            complaintId: issue.complaintId || issue.id,
            issueTitle: issue.issueTitle || issue.title || "Complaint Reopened",
            message: `A citizen has reopened complaint ${issue.complaintId || issue.id}`,
            status: "Reopened",
            read: false,
            createdAt: new Date().toISOString()
         });
      }
    } catch (err) {
      console.error("Failed to reopen:", err);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const issueRef = doc(db, "complaints", issue.id);
      await updateDoc(issueRef, {
        status: "Closed",
        updatedAt: new Date().toISOString(),
        history: [
          ...history,
          {
            stage: "Closed",
            timestamp: new Date().toISOString(),
            remarks: "Citizen approved the resolution. Issue is closed.",
            department: "Citizen"
          }
        ]
      });
      setFeedbackMode(true);
    } catch (err) {
      console.error("Failed to close:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    setLoading(true);
    try {
      const issueRef = doc(db, "complaints", issue.id);
      await updateDoc(issueRef, {
        feedback: {
          rating,
          comment,
          createdAt: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-3xl shadow-2xl custom-scrollbar"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-slate-900/80 backdrop-blur-md border-white/5">
            <div>
              <p className="text-xs font-mono font-bold text-cyan-400">{issue.complaintId || issue.referenceId || issue.id}</p>
              <h2 className="text-xl font-bold text-white font-display">{issue.issueTitle || issue.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 transition-colors rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-8 sm:p-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <StatusBadge status={issue.status?.toLowerCase() || "pending"} />
                  <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-white/5 text-slate-300">
                    <MapPin size={14} /> {issue.category || issue.department}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar size={14} />
                    {new Date(issue.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-300">Description</h3>
                  <p className="text-sm leading-relaxed text-slate-400">{issue.issueDescription || issue.description}</p>
                </div>

                {issue.estimatedResolution && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                    <Clock size={20} className="text-cyan-400" />
                    <div>
                      <p className="text-xs font-medium text-cyan-300">Expected Resolution</p>
                      <p className="text-sm font-bold text-white">{issue.estimatedResolution}</p>
                    </div>
                  </div>
                )}
                
                {issue.aiAnalysis && (
                  <div className="flex flex-col gap-2 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                     <div className="flex items-center gap-2">
                        <ShieldAlert size={16} className="text-purple-400" />
                        <p className="text-xs font-medium text-purple-300">AI Confidence</p>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="flex-1">
                           <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${issue.aiAnalysis.overall}%` }} />
                           </div>
                        </div>
                        <span className="text-sm font-bold text-white">{issue.aiAnalysis.overall}%</span>
                     </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {(issue.imageURL || issue.images?.length > 0) ? (
                  <div className="overflow-hidden rounded-2xl bg-white/5 border border-white/5 aspect-video relative group">
                    <img 
                      src={issue.imageURL || issue.images?.[0]} 
                      alt="Complaint" 
                      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                       <span className="text-xs font-medium text-white bg-black/50 px-2 py-1 rounded backdrop-blur-md">Initial Report Photo</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 aspect-video text-slate-500">
                    No images provided
                  </div>
                )}

                {issue.afterImageURL && (
                  <div className="overflow-hidden rounded-2xl bg-emerald-500/10 border border-emerald-500/20 aspect-video relative group mt-4">
                     <img 
                      src={issue.afterImageURL} 
                      alt="Resolution" 
                      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                       <span className="text-xs font-medium text-emerald-300 bg-black/50 px-2 py-1 rounded backdrop-blur-md">Resolution Photo</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-white/5">
              <h3 className="mb-6 text-lg font-bold text-white font-display">Timeline Tracking</h3>
              <div className="p-6 bg-black/20 rounded-3xl border border-white/5">
                <ComplaintTimeline history={history} />
              </div>
            </div>

            {/* Actions for resolved issues */}
            {(issue.status?.toLowerCase() === "resolved" || issue.status?.toLowerCase() === "completed") && !feedbackMode && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl mt-8">
                <div>
                  <h4 className="text-lg font-bold text-emerald-300 font-display flex items-center gap-2">
                    <CheckCircle size={20} /> Resolution Verification
                  </h4>
                  <p className="text-sm text-emerald-400/80 mt-1">
                    The department has marked this as resolved. Please approve the resolution or reopen if the issue persists.
                  </p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button variant="secondary" onClick={handleReopen} disabled={loading} className="border-white/10 hover:bg-white/10 flex-1 sm:flex-none justify-center">
                    {loading ? "..." : "Reopen"}
                  </Button>
                  <Button onClick={handleApprove} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1 sm:flex-none justify-center">
                    {loading ? "..." : "Approve & Close"}
                  </Button>
                </div>
              </div>
            )}

            {feedbackMode && (
               <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-white/5 border border-white/10 rounded-3xl mt-8"
               >
                  <h3 className="text-xl font-bold font-display mb-4 flex items-center gap-2 text-white">
                     <MessageSquare size={20} className="text-cyan-400" />
                     Rate the Service
                  </h3>
                  <p className="text-sm text-slate-300 mb-6">
                     We're glad this issue is resolved! Your feedback helps us improve.
                  </p>
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
                  <textarea
                     value={comment}
                     onChange={(e) => setComment(e.target.value)}
                     placeholder="Leave a comment (optional)..."
                     className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors mb-4 resize-none h-24"
                  />
                  <Button onClick={submitFeedback} disabled={loading || rating === 0} className="w-full justify-center">
                     {loading ? "Submitting..." : "Submit Feedback"}
                  </Button>
               </motion.div>
            )}

            {/* Display existing feedback if any */}
            {issue.feedback && (
               <div className="p-6 bg-white/5 border border-white/10 rounded-3xl mt-8">
                  <h3 className="text-lg font-bold font-display mb-4 flex items-center gap-2 text-white">
                     <Star size={20} className="text-yellow-400 fill-yellow-400" />
                     Your Feedback
                  </h3>
                  <div className="flex gap-1 mb-3">
                     {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                           key={star}
                           size={16}
                           className={star <= issue.feedback.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-700"}
                        />
                     ))}
                  </div>
                  {issue.feedback.comment && (
                     <p className="text-sm text-slate-300 bg-black/20 p-4 rounded-xl border border-white/5 italic">
                        "{issue.feedback.comment}"
                     </p>
                  )}
               </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
