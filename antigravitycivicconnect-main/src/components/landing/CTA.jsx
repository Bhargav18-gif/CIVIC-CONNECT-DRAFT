import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Button from "../ui/Button.jsx";

export default function CTA() {
  return (
    <section className="relative px-6 py-28 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative rounded-[2.5rem] overflow-hidden px-8 sm:px-16 py-20 text-center"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(34,211,238,0.35), transparent 50%), radial-gradient(circle at 70% 80%, rgba(139,92,246,0.35), transparent 50%), linear-gradient(135deg, #0c1220, #101826)",
        }}
      >
        <div className="absolute inset-0 border border-white/10 rounded-[2.5rem] pointer-events-none" />
        <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight max-w-2xl mx-auto leading-tight">
          Your city listens better when you report it
        </h2>
        <p className="mt-5 text-slate-300 text-lg max-w-xl mx-auto">
          Join thousands of citizens making their neighborhoods better, one
          report at a time.
        </p>
        <div className="mt-10 flex justify-center">
          <Button to="/report" icon={ArrowRight} className="px-8 py-4 text-base">
            Report an Issue Now
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
