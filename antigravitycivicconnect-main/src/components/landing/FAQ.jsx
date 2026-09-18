import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

const FAQS = [
  {
    question: "How do I report an issue?",
    answer: "You can report an issue by creating an account and clicking the 'Report Issue' button. Our AI will guide you through the process, suggesting titles, categories, and priorities based on your description."
  },
  {
    question: "What happens after I submit a complaint?",
    answer: "Once submitted, our AI verifies the issue and routes it to the appropriate department. You can track the progress in real-time through your dashboard until it is resolved."
  },
  {
    question: "Is my personal information visible to everyone?",
    answer: "No, your personal details are kept private. Only the relevant authorities assigned to your case can view your contact information to reach out if necessary."
  },
  {
    question: "How long does it take for an issue to be resolved?",
    answer: "Resolution times vary depending on the severity and department. Our AI will provide an estimated resolution time when you submit the complaint."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" className="py-24 relative z-10">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Everything you need to know about CivicConnect and how it works.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-2xl overflow-hidden border border-white/10"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="text-lg font-medium text-white">{faq.question}</span>
                  <ChevronDown
                    className={cn("text-cyan-400 transition-transform duration-300", {
                      "rotate-180": isOpen
                    })}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-5 text-slate-300">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
