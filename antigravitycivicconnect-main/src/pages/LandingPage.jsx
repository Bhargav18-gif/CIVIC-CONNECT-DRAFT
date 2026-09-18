import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/layout/Navbar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Hero from "../components/landing/Hero.jsx";
import Statistics from "../components/landing/Statistics.jsx";
import Features from "../components/landing/Features.jsx";
import InteractiveShowcase from "../components/landing/InteractiveShowcase.jsx";
import HowItWorks from "../components/landing/HowItWorks.jsx";
import Departments from "../components/landing/Departments.jsx";
import Testimonials from "../components/landing/Testimonials.jsx";
import FAQ from "../components/landing/FAQ.jsx";
import CTA from "../components/landing/CTA.jsx";
import IntroAnimation from "../components/landing/IntroAnimation.jsx";

export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(() => {
    // Only show intro once per session to avoid annoying users on refresh
    const hasSeenIntro = sessionStorage.getItem("hasSeenIntro");
    return !hasSeenIntro;
  });

  useEffect(() => {
    if (!showIntro) {
      sessionStorage.setItem("hasSeenIntro", "true");
    }
  }, [showIntro]);

  return (
    <AnimatePresence mode="wait">
      {showIntro ? (
        <IntroAnimation key="intro" onComplete={() => setShowIntro(false)} />
      ) : (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Navbar />
          <main>
            <Hero />
            <Statistics />
            <Features />
            <InteractiveShowcase />
            <HowItWorks />
            <Departments />
            <Testimonials />
            <FAQ />
            <CTA />
          </main>
          <Footer />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
