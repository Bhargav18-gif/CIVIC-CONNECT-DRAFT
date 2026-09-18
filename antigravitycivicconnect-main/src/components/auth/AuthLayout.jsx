import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Logo from "../ui/Logo.jsx";
import { ShieldCheck, Activity, MapPin } from "lucide-react";

const SIDE_POINTS = [
  { icon: ShieldCheck, text: "Every report verified before it reaches a department" },
  { icon: Activity, text: "Live status updates from submission to resolution" },
  { icon: MapPin, text: "GPS-accurate locations, no manual address entry" },
];

/**
 * Two-column shell used by Login, Register, Forgot Password, and OTP pages.
 * Left: the form (passed as children). Right: brand panel, hidden on mobile.
 */
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-28 lg:py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-0 rounded-[2rem] overflow-hidden glass-strong">
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <Link to="/" className="mb-10 inline-block">
            <Logo size={32} />
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display font-bold text-3xl tracking-tight mb-2">{title}</h1>
            {subtitle && <p className="text-slate-400 text-sm mb-8">{subtitle}</p>}
            {children}
          </motion.div>
        </div>

        <div
          className="hidden lg:flex relative flex-col justify-end p-12"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(34,211,238,0.3), transparent 55%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.3), transparent 55%), linear-gradient(135deg, #0c1220, #070b14)",
          }}
        >
          <div className="absolute inset-0">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="particle"
                style={{
                  left: `${(i * 7) % 100}%`,
                  width: "3px",
                  height: "3px",
                  opacity: 0.4,
                  animationDuration: `${14 + (i % 5) * 3}s`,
                  animationDelay: `${i * 1.3}s`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10">
            <h2 className="font-display font-bold text-3xl leading-tight mb-8">
              Civic reporting, finally built for the way cities actually work.
            </h2>
            <div className="space-y-5">
              {SIDE_POINTS.map((point) => (
                <div key={point.text} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg glass flex items-center justify-center flex-shrink-0 mt-0.5">
                    <point.icon size={16} className="text-cyan-300" />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{point.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
