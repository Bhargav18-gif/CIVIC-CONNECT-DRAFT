import { Cpu, Eye, Sparkles, MapPin, Copy, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";

/**
 * Phase 18 AI Explainability Panel
 * Displays structured evidence, model outputs, confidence scores, policy checks, and decision rationale.
 * Does NOT expose hidden chain-of-thought, only structured diagnostic facts.
 */
export default function AIReasoningPanel({ issue }) {
  const ai = issue?.ai || {};
  const textModel = ai.textModel || {};
  const visionModel = ai.visionModel || {};
  const duplicate = ai.duplicate || {};
  const router = ai.router || {};
  const gemini = ai.gemini || {};

  const modelsAgree =
    textModel.prediction &&
    visionModel.department &&
    textModel.prediction.toLowerCase() === visionModel.department.toLowerCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/20 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-cyan-400" />
            <h3 className="text-base font-bold font-display text-white">AI Autonomous Decision Reasoning</h3>
          </div>
          <span
            className={`text-xs font-mono px-3 py-1 rounded-full font-bold uppercase ${
              ai.automationMode === "AUTO"
                ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                : "bg-amber-400/10 text-amber-300 border border-amber-400/20"
            }`}
          >
            Mode: {ai.automationMode || "SUPERVISED"}
          </span>
        </div>
        <p className="text-xs text-slate-300">
          Decision: <span className="font-semibold text-white">{ai.decisionAction || "EVALUATE"}</span> &bull; {ai.decisionReason || "Multi-model evaluation completed."}
        </p>
      </div>

      {/* Model Diagnostic Matrix */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Text Model (DistilBERT) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Cpu size={14} className="text-indigo-400" /> NLP Text Model (DistilBERT)
            </span>
            <span className="text-[10px] font-mono text-slate-500">{textModel.modelVersion || "distilbert-base"}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Predicted Dept:</span>
              <span className="font-bold text-white">{textModel.prediction || issue.category || "N/A"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Confidence:</span>
              <span className="font-mono text-cyan-300 font-bold">{Math.round((textModel.confidence || 0) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Vision Model (Civic YOLO) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Eye size={14} className="text-emerald-400" /> Computer Vision (Civic YOLO)
            </span>
            <span className="text-[10px] font-mono text-slate-500">{visionModel.modelVersion || "civic-yolo-v1.0"}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Detected Object:</span>
              <span className="font-bold text-white">{visionModel.prediction || "No Object Detected"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Mapped Dept:</span>
              <span className="font-bold text-white">{visionModel.department || "N/A"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Confidence:</span>
              <span className="font-mono text-emerald-300 font-bold">{Math.round((visionModel.confidence || 0) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Validation & Reconciliation Checks */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Policy & Evidence Cross-Checks</h4>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Model Agreement */}
          <div className="p-3 rounded-xl bg-black/20 border border-white/5">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-1">Model Agreement</span>
            <div className="flex items-center gap-1.5 font-medium text-white">
              {modelsAgree ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>AGREED</span>
                </>
              ) : visionModel.prediction ? (
                <>
                  <ShieldAlert size={13} className="text-amber-400" />
                  <span>CONFLICT</span>
                </>
              ) : (
                <span className="text-slate-400">TEXT ONLY</span>
              )}
            </div>
          </div>

          {/* Duplicate Check */}
          <div className="p-3 rounded-xl bg-black/20 border border-white/5">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-1">Duplicate Status</span>
            <div className="flex items-center gap-1.5 font-medium text-white">
              {duplicate.isDuplicate ? (
                <>
                  <Copy size={13} className="text-red-400" />
                  <span className="text-red-300">DUPLICATE</span>
                </>
              ) : duplicate.isPotentialDuplicate ? (
                <>
                  <Copy size={13} className="text-amber-400" />
                  <span className="text-amber-300">POTENTIAL</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>UNIQUE</span>
                </>
              )}
            </div>
          </div>

          {/* GPS Validation */}
          <div className="p-3 rounded-xl bg-black/20 border border-white/5">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-1">GPS Validation</span>
            <div className="flex items-center gap-1.5 font-medium text-white">
              {issue.location?.lat ? (
                <>
                  <MapPin size={13} className="text-cyan-400" />
                  <span>VALID GPS</span>
                </>
              ) : (
                <span className="text-slate-400">NOT PROVIDED</span>
              )}
            </div>
          </div>

          {/* Risk Level */}
          <div className="p-3 rounded-xl bg-black/20 border border-white/5">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-1">Assessed Risk</span>
            <span
              className={`font-bold font-mono ${
                ai.riskLevel === "HIGH" ? "text-red-400" : ai.riskLevel === "MEDIUM" ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {ai.riskLevel || "LOW"}
            </span>
          </div>
        </div>

        {/* Gemini Multimodal Reason (if invoked) */}
        {gemini.used && (
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-xs">
            <span className="font-semibold text-indigo-300 block mb-1">Gemini Multimodal Resolution:</span>
            <p className="text-slate-300 leading-relaxed">{gemini.reason || "Reconciled evidence successfully."}</p>
          </div>
        )}
      </div>

      {/* Assignment & SLA Snapshot */}
      {issue.assignment && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Automatic Assignment & SLA</h4>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">Assigned Engineer</span>
              <span className="font-semibold text-white">{issue.assignment.engineerName || "Unassigned"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">SLA Duration</span>
              <span className="font-semibold text-white">{issue.assignment.slaHours || 48} Hours</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">SLA Deadline</span>
              <span className="font-mono text-cyan-300">
                {issue.assignment.slaDeadline ? new Date(issue.assignment.slaDeadline).toLocaleString() : "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
