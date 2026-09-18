import { motion } from "framer-motion";

const DATA = [
  { label: "Jan", value: 32 },
  { label: "Feb", value: 41 },
  { label: "Mar", value: 38 },
  { label: "Apr", value: 55 },
  { label: "May", value: 49 },
  { label: "Jun", value: 67 },
  { label: "Jul", value: 71 },
];

export default function ActivityChart() {
  const max = Math.max(...DATA.map((d) => d.value));

  return (
    <div className="glass rounded-2xl p-7">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h3 className="font-display font-semibold text-lg">Reports over time</h3>
          <p className="text-sm text-slate-500 mt-1">Last 7 months</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-cyan-300 glass rounded-full px-3 py-1.5">
          <span className="pulse-dot bg-cyan-400 text-cyan-400" />
          Live
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 h-44">
        {DATA.map((d, i) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-3">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.07, ease: "easeOut" }}
              className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500/70 to-violet-400/80 relative group"
              style={{ minHeight: 4 }}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {d.value}
              </div>
            </motion.div>
            <span className="text-xs text-slate-500">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
