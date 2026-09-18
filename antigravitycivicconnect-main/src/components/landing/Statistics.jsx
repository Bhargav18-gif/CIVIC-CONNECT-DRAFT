import { motion } from "framer-motion";
import { useCountUp } from "../../hooks/useCountUp.js";

const STATS = [
  { end: 12500, suffix: "+", label: "Issues Reported" },
  { end: 98, suffix: "%", label: "Resolution Rate" },
  { end: 50, suffix: "+", label: "Departments" },
  { end: 30000, suffix: "+", label: "Citizens" },
];

function StatCard({ stat, index }) {
  const [ref, value] = useCountUp(stat.end);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="text-center"
    >
      <div className="font-display font-bold text-4xl sm:text-5xl text-gradient">
        {value.toLocaleString()}
        {stat.suffix}
      </div>
      <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
    </motion.div>
  );
}

export default function Statistics() {
  return (
    <section className="relative px-6 py-16">
      <div className="max-w-6xl mx-auto glass rounded-3xl px-8 py-12 grid grid-cols-2 lg:grid-cols-4 gap-10">
        {STATS.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>
    </section>
  );
}
