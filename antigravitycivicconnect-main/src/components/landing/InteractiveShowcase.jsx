import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Activity, ShieldCheck, Zap } from "lucide-react";

const CARDS = [
  {
    icon: Activity,
    title: "Real-time signal",
    desc: "Every report streams into the city's live operations feed the instant it's submitted.",
    depth: 0,
  },
  {
    icon: ShieldCheck,
    title: "Verified by AI",
    desc: "Computer vision checks each photo and video before it ever reaches a department.",
    depth: 30,
  },
  {
    icon: Zap,
    title: "Fast routing",
    desc: "Average time from submission to department assignment: under four minutes.",
    depth: 60,
  },
];

function TiltCard({ card, index }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 150, damping: 20 });

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="gradient-border glass-strong rounded-3xl p-9 h-full"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(34,211,238,0.25), rgba(139,92,246,0.25))",
          }}
        >
          <card.icon size={22} className="text-cyan-300" />
        </div>
        <h3 className="font-display font-semibold text-xl mb-3">{card.title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
      </motion.div>
    </motion.div>
  );
}

export default function InteractiveShowcase() {
  return (
    <section className="relative px-6 py-28 max-w-7xl mx-auto overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full opacity-20 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto mb-16 relative"
      >
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-violet-400">
          Under the hood
        </span>
        <h2 className="font-display font-bold text-4xl sm:text-5xl mt-4 tracking-tight">
          Built for speed and trust
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-6 relative">
        {CARDS.map((card, i) => (
          <TiltCard key={card.title} card={card} index={i} />
        ))}
      </div>
    </section>
  );
}
