import { motion } from "framer-motion";
import { MapPin, ChevronRight } from "lucide-react";
import StatusBadge from "../ui/StatusBadge.jsx";

const COMPLAINTS = [
  { id: "CC-10234", title: "Pothole on MG Road", dept: "Roads", location: "Andheri West", status: "in-progress", date: "Jun 24" },
  { id: "CC-10221", title: "Streetlight not working", dept: "Electricity", location: "Bandra East", status: "resolved", date: "Jun 21" },
  { id: "CC-10219", title: "Overflowing garbage bin", dept: "Garbage", location: "Powai", status: "pending", date: "Jun 20" },
  { id: "CC-10198", title: "Water pipeline leakage", dept: "Water", location: "Goregaon", status: "in-progress", date: "Jun 17" },
  { id: "CC-10180", title: "Blocked storm drain", dept: "Drainage", location: "Malad", status: "resolved", date: "Jun 14" },
];

export default function RecentComplaints() {
  return (
    <div className="glass rounded-2xl p-7">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-semibold text-lg">Recent reports</h3>
        <button className="text-sm text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
          View all <ChevronRight size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {COMPLAINTS.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="flex items-center justify-between gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-default"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <p className="text-sm font-medium text-white truncate">{c.title}</p>
                <span className="text-xs text-slate-500 flex-shrink-0">{c.id}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <MapPin size={12} />
                {c.location} · {c.dept} · {c.date}
              </div>
            </div>
            <StatusBadge status={c.status} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
