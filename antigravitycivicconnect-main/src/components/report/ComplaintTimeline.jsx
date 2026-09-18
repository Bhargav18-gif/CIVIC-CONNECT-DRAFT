import { motion } from "framer-motion";
import { CheckCircle2, Clock, User, FileText } from "lucide-react";

export default function ComplaintTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm border border-white/10 rounded-2xl glass">
        No tracking history available.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-8 py-4">
      <div className="absolute left-8 top-6 bottom-6 w-px bg-white/10" />
      
      {history.map((event, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15 }}
          className="relative flex gap-6"
        >
          <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 border-2 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.4)] mt-1">
            <CheckCircle2 size={12} className="text-cyan-400" />
          </div>
          
          <div className="flex-1 glass rounded-2xl p-5 border border-white/10">
            <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
              <h4 className="font-medium text-white text-lg">{event.stage}</h4>
              <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                <Clock size={12} />
                {new Date(event.timestamp).toLocaleString()}
              </span>
            </div>
            
            {event.remarks && (
              <p className="text-sm text-slate-300 mt-2 bg-black/20 p-3 rounded-xl border border-white/5">
                {event.remarks}
              </p>
            )}
            
            <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
              {event.department && (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <FileText size={14} className="text-violet-400" />
                  {event.department}
                </span>
              )}
              {event.officer && (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <User size={14} className="text-cyan-400" />
                  {event.officer}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
