import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Ananya Rao",
    role: "Resident, Ward 14",
    quote:
      "I reported a broken streetlight on my way home and it was fixed within two days. I actually got a notification when it was marked resolved.",
  },
  {
    name: "Vikram Shah",
    role: "Local Business Owner",
    quote:
      "The garbage collection near my shop used to be unreliable. Since I started reporting through CivicConnect, the response time has been consistent.",
  },
  {
    name: "Priya Menon",
    role: "Resident, Ward 7",
    quote:
      "Tracking my complaint felt like tracking a delivery. I could see exactly which department had it and when it moved to the next stage.",
  },
  {
    name: "Rahul Verma",
    role: "Municipal Engineer",
    quote:
      "On our end, the AI categorization means reports land directly with the right team. It's cut down a lot of manual triage work.",
  },
  {
    name: "Sneha Iyer",
    role: "Resident, Ward 21",
    quote:
      "A water pipe was leaking for weeks before I found this. Uploaded a photo, got routed to the water department same day.",
  },
];

function TestimonialCard({ t }) {
  return (
    <div className="glass rounded-2xl p-7 w-[340px] sm:w-[380px] flex-shrink-0 mx-3">
      <Quote size={22} className="text-cyan-400 mb-4" />
      <p className="text-sm text-slate-300 leading-relaxed mb-6">{t.quote}</p>
      <div>
        <p className="font-display font-semibold text-sm">{t.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{t.role}</p>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const loop = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="relative py-28 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto mb-16 px-6"
      >
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-violet-400">
          Voices
        </span>
        <h2 className="font-display font-bold text-4xl sm:text-5xl mt-4 tracking-tight">
          What citizens are saying
        </h2>
      </motion.div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#070b14] to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#070b14] to-transparent z-10" />
        <div className="flex marquee-track w-max">
          {loop.map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
