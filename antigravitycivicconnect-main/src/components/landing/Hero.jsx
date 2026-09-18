import { motion } from "framer-motion";
import { FileText, Search, PlayCircle } from "lucide-react";
import Button from "../ui/Button.jsx";

const SIGNALS = [
  { label: "Road Repair", src: "/videos/road-repair.mp4", color: "#22D3EE", top: "2%", left: "6%", float: "0s" },
  { label: "Street Light", src: "/videos/street-light.mp4", color: "#8B5CF6", top: "4%", left: "54%", float: "1.2s" },
  { label: "Garbage Collection", src: "/videos/garbage-collection.mp4", color: "#FB923C", top: "46%", left: "0%", float: "0.6s" },
  { label: "Water Leakage", src: "/videos/water-leakage.mp4", color: "#2563EB", top: "48%", left: "52%", float: "1.8s" },
];

function VideoPortal({ signal, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 + index * 0.15, duration: 0.7, ease: "easeOut" }}
      className="absolute w-[46%] aspect-square"
      style={{ top: signal.top, left: signal.left }}
    >
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: parseFloat(signal.float),
        }}
        className="relative w-full h-full"
      >
        <div
          className="absolute -inset-3 rounded-full opacity-50 blur-xl"
          style={{ background: signal.color }}
        />
        <div
          className="relative w-full h-full rounded-full overflow-hidden glass-strong p-1.5"
          style={{ boxShadow: `0 0 0 1px ${signal.color}33, 0 20px 40px -10px ${signal.color}55` }}
        >
          <video
            className="w-full h-full object-cover object-[50%_20%] rounded-full"
            src={signal.src}
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2 glass rounded-full px-3 py-1 text-[11px] font-medium text-slate-200 whitespace-nowrap">
          {signal.label}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-32 pb-20 px-6 max-w-7xl mx-auto"
    >
      <div className="grid lg:grid-cols-2 gap-16 items-center w-full">
        {/* LEFT */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 text-xs font-medium text-cyan-300"
          >
            <span className="pulse-dot bg-cyan-400 text-cyan-400" />
            AI-powered civic reporting, live in your city
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight"
          >
            Report.
            <br />
            Track.
            <br />
            <span className="text-gradient">Resolve.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-7 text-lg text-slate-400 max-w-md leading-relaxed"
          >
            Empowering citizens to report civic issues with AI-powered smart
            reporting — routed to the right department, automatically.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Button to="/report" icon={FileText} className="px-7 py-3.5">
              Report Issue
            </Button>
            <Button to="/track" variant="secondary" icon={Search} className="px-7 py-3.5">
              Track Complaint
            </Button>
            <button className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors px-2">
              <PlayCircle size={20} className="text-cyan-400" />
              Watch Demo
            </button>
          </motion.div>
        </div>

        {/* RIGHT */}
        <div className="relative h-[460px] sm:h-[540px] hidden sm:block">
          {SIGNALS.map((signal, i) => (
            <VideoPortal key={signal.label} signal={signal} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
