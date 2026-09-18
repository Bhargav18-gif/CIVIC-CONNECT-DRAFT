import { Star, MessageSquare, Sparkles, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function FeedbackReview({ feedback, aiAnalysis }) {
  if (!feedback) {
    return (
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center">
        <MessageSquare size={32} className="text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm font-medium">No feedback submitted yet.</p>
        <p className="text-xs text-slate-500 mt-1">Feedback is available after the complaint is resolved.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Citizen Feedback Card */}
      <div className="bg-[#0e1422] border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-400" />
              Citizen Feedback
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Submitted: {new Date(feedback.createdAt).toLocaleString()}
            </p>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</span>
            <span className={`px-3 py-1 rounded-md text-xs font-semibold ${
              feedback.resolutionStatus === "Fully Resolved" ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30" :
              feedback.resolutionStatus === "Partially Resolved" ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30" :
              "bg-red-400/20 text-red-300 border border-red-400/30"
            }`}>
              {feedback.resolutionStatus || "Unknown"}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Overall Rating</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={24}
                  className={star <= (feedback.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-slate-700"}
                />
              ))}
            </div>
            {feedback.categories && (
              <div className="mt-4 space-y-2">
                {Object.entries(feedback.categories).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= val ? "text-yellow-500 fill-yellow-500" : "text-slate-700"} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Comments</span>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-h-[100px]">
              <p className="text-sm text-slate-200 italic leading-relaxed">
                {feedback.comment ? `"${feedback.comment}"` : "No comments provided."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Card */}
      {aiAnalysis && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Sparkles size={120} />
          </div>

          <h3 className="text-base font-semibold text-indigo-300 flex items-center gap-2 mb-6">
            <Sparkles size={18} className="text-indigo-400" />
            AI Insights
          </h3>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Sentiment</span>
              <span className={`text-sm font-semibold ${
                aiAnalysis.sentiment === "Positive" ? "text-emerald-400" :
                aiAnalysis.sentiment === "Negative" ? "text-red-400" :
                "text-yellow-400"
              }`}>{aiAnalysis.sentiment}</span>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Completion Score</span>
              <span className="text-sm font-semibold text-white">{aiAnalysis.completionScore}%</span>
            </div>

            <div className="sm:col-span-2 bg-white/5 border border-white/10 rounded-xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Summary</span>
              <p className="text-xs text-slate-300 line-clamp-2">{aiAnalysis.summary}</p>
            </div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block mb-1">Suggested Action</span>
              <p className="text-sm text-indigo-100 font-medium">{aiAnalysis.suggestedAction}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
