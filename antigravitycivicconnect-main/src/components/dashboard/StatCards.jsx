import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle2, TrendingUp } from "lucide-react";

const STATS = [
  { icon: FileText, label: "Total Reports", value: "24", trend: "+3 this month", color: "cyan" },
  { icon: Clock, label: "In Progress", value: "6", trend: "2 awaiting review", color: "amber" },
  { icon: CheckCircle2, label: "Resolved", value: "17", trend: "71% resolution rate", color: "violet" },
  { icon: TrendingUp, label: "Avg. Response", value: "1.8d", trend: "Faster than last month", color: "blue" },
];

const COLOR_MAP = {
  cyan: "from-cyan-400/20 to-cyan-400/5 text-cyan-300",
  amber: "from-amber-400/20 to-amber-400/5 text-amber-300",
  violet: "from-violet-400/20 to-violet-400/5 text-violet-300",
  blue: "from-blue-400/20 to-blue-400/5 text-blue-300",
};

export default function StatCards() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {STATS.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className="glass rounded-2xl p-6"
        >
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${COLOR_MAP[stat.color]} flex items-center justify-center mb-4`}
          >
            <stat.icon size={18} />
          </div>
          <p className="font-display font-bold text-3xl">{stat.value}</p>
          <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
          <p className="text-xs text-slate-500 mt-2">{stat.trend}</p>
        </motion.div>
      ))}
    </div>
  );
}
