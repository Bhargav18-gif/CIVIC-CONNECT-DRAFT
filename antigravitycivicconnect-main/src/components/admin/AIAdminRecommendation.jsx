import { useState, useEffect } from "react";
import { Sparkles, AlertCircle, CheckCircle2, RefreshCw, ChevronRight } from "lucide-react";
import api from "../../utils/api.js";

export default function AIAdminRecommendation({
  issue,
  currentCategory,
  onApplyCategory,
  onRecordDecision,
}) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [decisionState, setDecisionState] = useState(issue?.adminDecision || null);

  const complaintText = issue?.description || issue?.issueDescription || "";

  useEffect(() => {
    if (!complaintText) return;

    let isMounted = true;

    async function fetchRecommendation() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.post("/admin/ai/classify", {
          complaint: complaintText,
          complaint_id: issue.referenceId || issue.id,
        });

        if (isMounted) {
          setRecommendation(data);
          if (issue?.adminDecision) {
            setDecisionState(issue.adminDecision);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn("AI recommendation fetch error:", err);
          setError("AI triage unavailable");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRecommendation();

    return () => {
      isMounted = false;
    };
  }, [issue?.referenceId, complaintText]);

  if (!complaintText) return null;

  const handleAccept = async (dept) => {
    const targetDept = dept || recommendation?.department;
    if (!targetDept) return;

    setDecisionState("accepted");
    onApplyCategory(targetDept);

    const originalVersion = issue?.ai?.textModel?.modelVersion || recommendation?.model_version || "civicconnect-admin-v1.0.0";

    const decisionData = {
      aiPrediction: recommendation.department,
      aiConfidence: recommendation.confidence,
      aiModelVersion: originalVersion,
      adminDecision: targetDept,
      adminOverride: targetDept !== recommendation.department,
      predictionTimestamp: new Date().toISOString(),
    };

    if (onRecordDecision) {
      onRecordDecision(decisionData);
    }

    // Send asynchronous feedback log to AI service
    api.post("/admin/ai/feedback", {
      complaint_id: issue.referenceId || issue.id,
      complaint_text: complaintText,
      original_prediction: recommendation.department,
      original_confidence: recommendation.confidence,
      admin_decision: targetDept,
      is_override: false,
      admin_id: "admin",
      modelVersionAtPrediction: originalVersion,
      timestamp: new Date().toISOString(),
    }).catch((e) => console.warn("AI feedback log failed:", e));
  };

  const handleOverride = (chosenDept) => {
    setDecisionState("overridden");
    onApplyCategory(chosenDept);

    const originalVersion = issue?.ai?.textModel?.modelVersion || recommendation?.model_version || "civicconnect-admin-v1.0.0";

    const decisionData = {
      aiPrediction: recommendation.department,
      aiConfidence: recommendation.confidence,
      aiModelVersion: originalVersion,
      adminDecision: chosenDept,
      adminOverride: true,
      overrideTimestamp: new Date().toISOString(),
    };

    if (onRecordDecision) {
      onRecordDecision(decisionData);
    }

    // Send asynchronous override feedback to AI service
    api.post("/admin/ai/feedback", {
      complaint_id: issue.referenceId || issue.id,
      complaint_text: complaintText,
      original_prediction: recommendation.department,
      original_confidence: recommendation.confidence,
      admin_decision: chosenDept,
      is_override: true,
      admin_id: "admin",
      modelVersionAtPrediction: originalVersion,
      timestamp: new Date().toISOString(),
    }).catch((e) => console.warn("AI override log failed:", e));
  };

  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-4 relative overflow-hidden shadow-lg mb-6">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            AI Admin Recommendation
          </span>
        </div>
        {recommendation?.model_version && (
          <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
            {recommendation.model_version}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
          <RefreshCw size={14} className="animate-spin text-cyan-400" />
          <span>Analyzing complaint description...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {recommendation && !loading && (
        <div className="space-y-3">
          {/* Main Department Recommendation & Confidence */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                Recommended Department
              </span>
              <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
                {recommendation.department}
                {currentCategory?.toLowerCase() === recommendation.department.toLowerCase() && (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                )}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                Confidence
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-xs font-bold ${
                    recommendation.confidence_level === "high"
                      ? "text-emerald-400"
                      : recommendation.confidence_level === "medium"
                      ? "text-yellow-400"
                      : "text-rose-400"
                  }`}
                >
                  {recommendation.confidence_percentage}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                    recommendation.confidence_level === "high"
                      ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                      : recommendation.confidence_level === "medium"
                      ? "bg-yellow-400/10 text-yellow-300 border border-yellow-400/20"
                      : "bg-rose-400/10 text-rose-300 border border-rose-400/20"
                  }`}
                >
                  {recommendation.confidence_level === "high"
                    ? "High Confidence"
                    : "Requires Review"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Guidance */}
          {recommendation.recommended_action && (
            <div className="bg-white/5 border border-white/5 rounded-xl p-2.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Action Guidance ({recommendation.work_type})
              </span>
              <p className="text-xs text-slate-300 leading-snug">
                {recommendation.recommended_action}
              </p>
            </div>
          )}

          {/* If Requires Review / Low Confidence: Show Candidates */}
          {recommendation.requires_admin_review && recommendation.top_predictions?.length > 1 && (
            <div>
              <span className="text-[10px] text-amber-300/80 font-semibold block mb-1.5">
                Possible departments:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {recommendation.top_predictions.map((pred) => (
                  <button
                    key={pred.department}
                    type="button"
                    onClick={() => handleOverride(pred.department)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                      currentCategory?.toLowerCase() === pred.department.toLowerCase()
                        ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span>{pred.department}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {pred.percentage}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {!recommendation.requires_admin_review ? (
              <>
                <button
                  type="button"
                  onClick={() => handleAccept(recommendation.department)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    currentCategory?.toLowerCase() === recommendation.department.toLowerCase()
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 cursor-default"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 shadow-md shadow-cyan-500/20"
                  }`}
                >
                  <CheckCircle2 size={14} />
                  <span>
                    {currentCategory?.toLowerCase() === recommendation.department.toLowerCase()
                      ? "Recommendation Accepted"
                      : "Accept Recommendation"}
                  </span>
                </button>
              </>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Administrator review required. Choose department above or select manually below.
              </p>
            )}
          </div>

          {decisionState && (
            <p className="text-[10px] text-slate-500 pt-1 border-t border-white/5">
              Admin decision: <span className="text-slate-400 font-medium capitalize">{decisionState}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
