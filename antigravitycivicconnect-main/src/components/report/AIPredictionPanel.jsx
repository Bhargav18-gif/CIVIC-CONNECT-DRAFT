import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Eye, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Visualizes the real-time AI Diagnostic Gateway:
 * - DistilBERT NLP text prediction & confidence
 * - YOLO real visual object detections & bounding box classes
 * - Decision status (Auto-Approved vs Admin Review)
 */
export default function AIPredictionPanel({ analyzing, prediction }) {
  return (
    <AnimatePresence>
      {(analyzing || prediction) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="gradient-border glass rounded-2xl p-5 mt-3 border border-cyan-500/20 bg-slate-900/60 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  AI Pipeline Live Diagnostics
                </span>
              </div>
              {prediction?.mode && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    prediction.mode === "AUTO"
                      ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                      : "bg-amber-400/10 text-amber-300 border border-amber-400/20"
                  }`}
                >
                  {prediction.mode === "AUTO" ? "Eligible for Auto-Approval" : "Supervised Review"}
                </span>
              )}
            </div>

            {analyzing ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                <Loader2 size={14} className="animate-spin text-cyan-400" />
                <span>Running DistilBERT text & YOLO computer vision models...</span>
              </div>
            ) : prediction ? (
              <div className="space-y-3">
                {/* DistilBERT NLP Text Classifier */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <FileText size={13} className="text-indigo-400" />
                      NLP Text Classifier (DistilBERT)
                    </span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {prediction.department || prediction.category} ({Math.round(prediction.textConfidence * 100 || prediction.confidence)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Suggested Department: <span className="text-white font-medium">{prediction.department || prediction.category}</span>
                  </p>
                </div>

                {/* YOLO Real Vision Detector */}
                {prediction.visionDetections && prediction.visionDetections.length > 0 ? (
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                        <Eye size={13} className="text-emerald-400" />
                        Visual Detector (Civic YOLO)
                      </span>
                      <span className="font-mono text-emerald-300 font-bold">
                        {prediction.visionTopDetection?.class || "Object Detected"} ({Math.round(prediction.visionTopDetection?.confidence * 100 || 0)}%)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {prediction.visionDetections.map((d, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                          {d.class} &bull; {Math.round(d.confidence * 100)}% ({d.department})
                        </span>
                      ))}
                    </div>
                  </div>
                ) : prediction.hasImage ? (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 px-2">
                    <Eye size={13} className="text-slate-500" />
                    <span>Visual Analysis: Image attached; full multimodal evaluation will reconcile at submission.</span>
                  </div>
                ) : null}

                {/* Duplicate / Proximity Warning if any */}
                {prediction.isPotentialDuplicate && (
                  <div className="bg-amber-500/10 border border-amber-400/20 text-amber-300 text-xs rounded-xl p-2.5 flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>A similar complaint was recently submitted nearby. Our supervisor will verify before dispatching.</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
