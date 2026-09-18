import { motion } from "framer-motion";
import {
  MapPin,
  Image,
  Video,
  Brain,
  ListChecks,
  Bell,
  BarChart3,
  AlertTriangle,
  Map,
  Share2,
  Moon,
} from "lucide-react";

const FEATURES = [
  { icon: MapPin, title: "GPS Detection", desc: "Pinpoints the exact location of an issue automatically when you report it." },
  { icon: Image, title: "Image Upload", desc: "Attach clear photos so departments can assess the issue at a glance." },
  { icon: Video, title: "Video Upload", desc: "Capture short clips for issues that are easier to show than describe." },
  { icon: Brain, title: "AI Categorization", desc: "Reports are classified and routed to the right department instantly." },
  { icon: ListChecks, title: "Complaint Tracking", desc: "Follow your report from submission to resolution in real time." },
  { icon: Bell, title: "Live Notifications", desc: "Get notified the moment your complaint's status changes." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "City teams see trends, hotspots, and resolution times at a glance." },
  { icon: AlertTriangle, title: "Emergency Reporting", desc: "Flag urgent hazards for priority review and faster response." },
  { icon: Map, title: "Map Integration", desc: "Browse open issues on an interactive city map near you." },
  { icon: Share2, title: "Department Routing", desc: "Every report reaches the correct authority without manual transfer." },
  { icon: Moon, title: "Dark Mode", desc: "A comfortable, low-glare interface for reporting any time of day." },
];

export default function Features() {
  return (
    <section id="features" className="relative px-6 py-28 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl mx-auto mb-16"
      >
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan-400">
          Platform
        </span>
        <h2 className="font-display font-bold text-4xl sm:text-5xl mt-4 tracking-tight">
          Everything a smart city needs
        </h2>
        <p className="mt-4 text-slate-400 text-lg">
          One platform connecting citizens and city departments — built for
          speed, clarity, and accountability.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            whileHover={{ y: -6 }}
            className="gradient-border glass rounded-2xl p-7 group cursor-default"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 flex items-center justify-center mb-5 group-hover:from-cyan-400/30 group-hover:to-violet-500/30 transition-colors">
              <feature.icon size={20} className="text-cyan-300" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
