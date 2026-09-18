import { motion } from "framer-motion";
import { Clock, CheckCircle2, AlertCircle, FilePlus, ArrowRightCircle, CheckSquare, MessageSquare } from "lucide-react";

export default function TimelineSection({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center">
        <p className="text-slate-400 text-sm">No timeline events recorded.</p>
      </div>
    );
  }

  const getIcon = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes("reported")) return <FilePlus size={16} className="text-blue-400" />;
    if (actionLower.includes("assigned")) return <ArrowRightCircle size={16} className="text-yellow-400" />;
    if (actionLower.includes("accepted") || actionLower.includes("started")) return <Clock size={16} className="text-orange-400" />;
    if (actionLower.includes("resolved") || actionLower.includes("closed")) return <CheckCircle2 size={16} className="text-emerald-400" />;
    if (actionLower.includes("reopened") || actionLower.includes("rejected")) return <AlertCircle size={16} className="text-red-400" />;
    if (actionLower.includes("feedback")) return <MessageSquare size={16} className="text-purple-400" />;
    if (actionLower.includes("verified") || actionLower.includes("photos")) return <CheckSquare size={16} className="text-cyan-400" />;
    return <Clock size={16} className="text-slate-400" />;
  };

  return (
    <div className="bg-[#0e1422] border border-white/10 rounded-2xl p-6">
      <h3 className="text-base font-semibold text-white mb-6">Activity Timeline</h3>
      
      <div className="relative pl-4 space-y-6 before:absolute before:inset-y-2 before:left-[23px] before:w-px before:bg-white/10">
        {timeline.map((event, index) => (
          <motion.div
            key={event.id || index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative flex items-start gap-4"
          >
            <div className="relative z-10 w-6 h-6 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
              {getIcon(event.action)}
            </div>
            
            <div className="flex-1 pb-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <h4 className="text-sm font-semibold text-white">{event.action}</h4>
                <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                  {new Date(event.date).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                By <span className="text-cyan-400 font-medium">{event.user}</span>
              </p>
              {event.status && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded border border-white/10 bg-white/5 text-[9px] uppercase tracking-wider text-slate-300">
                  {event.status}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
