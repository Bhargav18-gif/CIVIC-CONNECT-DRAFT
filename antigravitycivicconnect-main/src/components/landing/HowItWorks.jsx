import { motion } from "framer-motion";
import { Camera, Upload, ScanSearch, Send, CheckCircle2 } from "lucide-react";

const STEPS = [
  { icon: Camera, title: "Capture", desc: "Snap a photo or short video of the issue right where you see it." },
  { icon: Upload, title: "Upload", desc: "Attach it to a report with your location auto-detected via GPS." },
  { icon: ScanSearch, title: "AI Verification", desc: "Our model checks the media and classifies the type of issue." },
  { icon: Send, title: "Authority Assignment", desc: "The report routes straight to the responsible department." },
  { icon: CheckCircle2, title: "Resolved", desc: "Track progress until the issue is marked fixed — with proof." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-28 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto mb-20"
      >
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan-400">
          Process
        </span>
        <h2 className="font-display font-bold text-4xl sm:text-5xl mt-4 tracking-tight">
          How it works
        </h2>
        <p className="mt-4 text-slate-400 text-lg">
          Five steps. Most reports reach the right department in minutes.
        </p>
      </motion.div>

      <div className="relative">
        <div className="absolute left-7 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-400/60 via-violet-400/40 to-transparent" />

        {STEPS.map((step, i) => {
          const isLeft = i % 2 === 0;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className={`relative flex items-center mb-14 last:mb-0 sm:w-1/2 ${
                isLeft ? "sm:pr-12" : "sm:ml-auto sm:pl-12"
              } pl-20 sm:pl-0`}
            >
              <div
                className={`absolute top-1/2 -translate-y-1/2 left-7 sm:left-auto ${
                  isLeft ? "sm:-right-[1px] sm:translate-x-1/2" : "sm:-left-[1px] sm:-translate-x-1/2"
                } w-10 h-10 rounded-full glass-strong flex items-center justify-center z-10`}
              >
                <span className="pulse-dot bg-cyan-400 text-cyan-400" />
              </div>

              <div className="gradient-border glass rounded-2xl p-6 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <step.icon size={18} className="text-cyan-300" />
                  <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-lg mb-1.5">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
