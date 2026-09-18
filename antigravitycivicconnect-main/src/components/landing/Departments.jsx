import { motion } from "framer-motion";
import {
  Construction,
  Droplets,
  Zap,
  Trash2,
  Waves,
  HeartPulse,
  Bus,
  ShieldAlert,
} from "lucide-react";

const DEPARTMENTS = [
  { icon: Construction, name: "Roads", count: 3420 },
  { icon: Droplets, name: "Water", count: 2180 },
  { icon: Zap, name: "Electricity", count: 1960 },
  { icon: Trash2, name: "Garbage", count: 2750 },
  { icon: Waves, name: "Drainage", count: 1340 },
  { icon: HeartPulse, name: "Health", count: 890 },
  { icon: Bus, name: "Transport", count: 1120 },
  { icon: ShieldAlert, name: "Public Safety", count: 1540 },
];

export default function Departments() {
  return (
    <section id="departments" className="relative px-6 py-28 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto mb-16"
      >
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-400">
          Departments
        </span>
        <h2 className="font-display font-bold text-4xl sm:text-5xl mt-4 tracking-tight">
          Connected to every department
        </h2>
        <p className="mt-4 text-slate-400 text-lg">
          Reports route automatically to the team responsible for fixing them.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {DEPARTMENTS.map((dept, i) => (
          <motion.div
            key={dept.name}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="glass rounded-2xl p-6 text-center cursor-default"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400/15 to-violet-500/15 flex items-center justify-center mx-auto mb-4">
              <dept.icon size={22} className="text-cyan-300" />
            </div>
            <h3 className="font-display font-semibold text-sm">{dept.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{dept.count.toLocaleString()} resolved</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
