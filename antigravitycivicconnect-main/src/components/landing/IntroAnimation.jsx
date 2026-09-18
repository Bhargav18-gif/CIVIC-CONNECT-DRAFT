import { motion } from "framer-motion";
import { MapPin, Shield, Activity } from "lucide-react";
import { useEffect } from "react";

export default function IntroAnimation({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4500); // 4.5 seconds intro
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -50, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <div className="relative flex items-center justify-center">
        {/* Animated Orbs */}
        <motion.div
          className="absolute w-64 h-64 rounded-full bg-cyan-500/20 blur-[80px]"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.div
          className="absolute w-64 h-64 rounded-full bg-violet-500/20 blur-[80px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
            x: [0, 50, 0],
          }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, delay: 0.5 }}
        />

        {/* Central Logo Container */}
        <motion.div
          className="relative z-10 flex items-center justify-center bg-slate-900/50 p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl"
          initial={{ scale: 0, rotate: -180, borderRadius: "50%" }}
          animate={{ scale: 1, rotate: 0, borderRadius: "24px" }}
          transition={{ duration: 1.2, type: "spring", bounce: 0.4 }}
        >
          <div className="flex gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-cyan-400"
            >
              <MapPin size={40} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-white"
            >
              <Shield size={40} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="text-violet-400"
            >
              <Activity size={40} />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Typography */}
      <motion.div
        className="mt-8 text-center z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <motion.h1
          className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-violet-400 tracking-tight"
          initial={{ backgroundPosition: "200% center" }}
          animate={{ backgroundPosition: "0% center" }}
          transition={{ duration: 2, ease: "easeOut", delay: 1.5 }}
          style={{ backgroundSize: "200% auto" }}
        >
          CivicConnect
        </motion.h1>
        
        <motion.div className="mt-4 flex flex-col items-center justify-center overflow-hidden">
           <motion.p
             className="text-slate-400 text-lg md:text-xl font-medium"
             initial={{ y: "100%" }}
             animate={{ y: 0 }}
             transition={{ delay: 2.2, duration: 0.6, type: "spring" }}
           >
             Empowering Citizens.
           </motion.p>
           <motion.p
             className="text-slate-400 text-lg md:text-xl font-medium"
             initial={{ y: "100%" }}
             animate={{ y: 0 }}
             transition={{ delay: 2.5, duration: 0.6, type: "spring" }}
           >
             Transforming Communities.
           </motion.p>
        </motion.div>
      </motion.div>
      
      {/* Loading Progress Bar */}
      <motion.div 
        className="absolute bottom-20 w-64 h-1 bg-slate-800 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <motion.div 
          className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ delay: 1.5, duration: 2.5, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}
