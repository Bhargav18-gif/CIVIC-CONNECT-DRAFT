import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, RotateCcw, Cpu, Database, BarChart3, Sliders, ShieldCheck, AlertTriangle, Eye, FileText, CheckCircle2 } from "lucide-react";
import api from "../../utils/api.js";

export default function AIPerformanceCard() {
  const [statusData, setStatusData] = useState(null);
  const [versionsData, setVersionsData] = useState([]);
  const [autoConfig, setAutoConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [scanningSla, setScanningSla] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRollbackVersion, setSelectedRollbackVersion] = useState("");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeRun, setActiveRun] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, versionsRes, configRes, runsRes] = await Promise.all([
        api.get("/admin/ai/training-status"),
        api.get("/admin/ai/model/versions"),
        api.get("/admin/automation-config"),
        api.get("/admin/ai/training/runs").catch(() => ({ data: { runs: [] } })),
      ]);
      setStatusData(statusRes.data);
      setVersionsData(versionsRes.data?.versions || []);
      setAutoConfig(configRes.data?.config || {});
      if (runsRes.data?.runs?.length > 0) {
        setActiveRun(runsRes.data.runs[0]);
      }
      if (versionsRes.data?.active_production_version) {
        setSelectedRollbackVersion(versionsRes.data.active_production_version);
      }
    } catch (err) {
      console.warn("Failed to fetch AI training status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunRetraining = async (force = true) => {
    setRetraining(true);
    setMessage("");
    try {
      const { data } = await api.post("/admin/ai/training/run", { force });
      setMessage(data.message || "Continuous learning training run triggered.");
      // Poll runs
      setTimeout(async () => {
        await fetchData();
        setRetraining(false);
      }, 3000);
    } catch (err) {
      setMessage("Failed to trigger retraining pipeline.");
      setRetraining(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedRollbackVersion) return;
    setRollingBack(true);
    setMessage("");
    try {
      const { data } = await api.post("/admin/ai/model/rollback", {
        target_version: selectedRollbackVersion,
      });
      setMessage(`Switched active production model to ${data.new_active_version || selectedRollbackVersion}`);
      await fetchData();
    } catch (err) {
      setMessage("Rollback failed.");
    } finally {
      setRollingBack(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await api.post("/admin/automation-config", autoConfig);
      setMessage("Automation policy configuration updated successfully.");
      setShowConfigModal(false);
    } catch (err) {
      setMessage("Failed to save automation configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleScanSla = async () => {
    setScanningSla(true);
    try {
      const { data } = await api.post("/admin/sla/scan");
      setMessage(`SLA scan completed: ${data.escalatedCount} complaints escalated to supervisors.`);
    } catch (err) {
      setMessage("SLA scan failed.");
    } finally {
      setScanningSla(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 border border-cyan-500/20 flex items-center justify-center py-12">
        <RefreshCw size={20} className="animate-spin text-cyan-400 mr-2" />
        <span className="text-xs text-slate-400 font-medium">Loading Supervised Autonomous AI Gateway Metrics...</span>
      </div>
    );
  }

  const overridesByDept = statusData?.override_breakdown_by_department || {};

  return (
    <div className="glass-strong rounded-3xl p-6 border border-cyan-500/20 relative overflow-hidden shadow-xl mb-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-cyan-400" />
            <h3 className="text-lg font-bold font-display text-white">
              Supervised Autonomous AI Control Center
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Real-time telemetry for multi-model autonomous routing (DistilBERT + Civic YOLO + Gemini 2.5), exception queue, and continuous retraining.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowConfigModal(!showConfigModal)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sliders size={13} />
            Policy Settings
          </button>
          <button
            onClick={handleScanSla}
            disabled={scanningSla}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ShieldCheck size={13} />
            {scanningSla ? "Scanning SLA..." : "Run SLA Scan"}
          </button>
          <span className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 font-bold flex items-center gap-1.5">
            <Cpu size={14} /> Model: {statusData?.current_model_version || "civicconnect-distilbert-v1"}
          </span>
        </div>
      </div>

      {message && (
        <div className="bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs rounded-2xl p-3 mb-6 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-slate-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Policy Settings Drawer / Modal */}
      {showConfigModal && autoConfig && (
        <form onSubmit={handleSaveConfig} className="bg-slate-900/90 border border-cyan-400/30 rounded-2xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders size={15} className="text-cyan-400" />
              Autonomous Policy & Confidence Threshold Configuration
            </h4>
            <button type="button" onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white text-xs">Close</button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Text Confidence Threshold (DistilBERT)</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="1.0"
                value={autoConfig.textConfidenceThreshold}
                onChange={(e) => setAutoConfig({ ...autoConfig, textConfidenceThreshold: parseFloat(e.target.value) })}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Vision Confidence Threshold (YOLO)</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="1.0"
                value={autoConfig.visionConfidenceThreshold}
                onChange={(e) => setAutoConfig({ ...autoConfig, visionConfidenceThreshold: parseFloat(e.target.value) })}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Duplicate Proximity Radius (Meters)</label>
              <input
                type="number"
                step="10"
                min="20"
                max="500"
                value={autoConfig.duplicateDistanceMeters}
                onChange={(e) => setAutoConfig({ ...autoConfig, duplicateDistanceMeters: parseFloat(e.target.value) })}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoConfig.autoRoutingEnabled}
                onChange={(e) => setAutoConfig({ ...autoConfig, autoRoutingEnabled: e.target.checked })}
                className="rounded text-cyan-500"
              />
              Auto-Routing Enabled
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoConfig.requireAdminForUrgent}
                onChange={(e) => setAutoConfig({ ...autoConfig, requireAdminForUrgent: e.target.checked })}
                className="rounded text-cyan-500"
              />
              Require Admin for Urgent Cases
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoConfig.requireAdminForModelConflict}
                onChange={(e) => setAutoConfig({ ...autoConfig, requireAdminForModelConflict: e.target.checked })}
                className="rounded text-cyan-500"
              />
              Require Admin for Model Conflicts
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoConfig.requireAdminForPotentialDuplicate}
                onChange={(e) => setAutoConfig({ ...autoConfig, requireAdminForPotentialDuplicate: e.target.checked })}
                className="rounded text-cyan-500"
              />
              Queue Potential Duplicates
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer disabled:opacity-50"
            >
              {savingConfig ? "Saving Policy..." : "Apply Policy Changes"}
            </button>
          </div>
        </form>
      )}

      {/* Key Operations Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">Total Predictions Logged</span>
          <span className="text-xl font-bold font-display text-white">{statusData?.total_predictions_logged || 0}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Feedback Pool: {statusData?.feedback_pool_size || 0}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">Supervisor Acceptance</span>
          <span className="text-xl font-bold font-display text-emerald-400">{statusData?.acceptance_rate_percentage || "100.0%"}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Accepted: {statusData?.admin_acceptances || 0}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">Supervisor Overrides</span>
          <span className="text-xl font-bold font-display text-rose-400">{statusData?.admin_overrides || 0}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Override Rate: {statusData?.override_rate_percentage || "0.0%"}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">DistilBERT Test Macro F1</span>
          <span className="text-xl font-bold font-display text-cyan-300">{(statusData?.active_model_macro_f1 * 100)?.toFixed(1) || "99.9"}%</span>
          <span className="text-[10px] text-slate-500 block mt-1">Dataset: {statusData?.training_dataset_size || 10000} samples</span>
        </div>
      </div>

      {/* Override Breakdown & Retraining Controls */}
      <div className="grid md:grid-cols-2 gap-6 pt-2">
        {/* Override Breakdown by Department */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={15} className="text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Department Override Telemetry
            </span>
          </div>

          {Object.keys(overridesByDept).length === 0 ? (
            <p className="text-xs text-slate-500 py-4 italic">No administrator overrides recorded yet. Autonomous predictions match ground-truth supervisor decisions.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(overridesByDept).map(([dept, count]) => (
                <div key={dept} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                  <span className="text-slate-300 font-medium">{dept}</span>
                  <span className="text-rose-400 font-mono font-semibold">{count} overrides</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Continuous Retraining & Rollback Management */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database size={15} className="text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Continuous Learning Retraining & Rollback
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Retraining threshold: Requires <strong className="text-white">{statusData?.min_required_feedback_examples || 10} verified decisions</strong>. Candidate models are evaluated on holdout data and deployed only if Macro F1 ≥ 0.75 without degradation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => handleRunRetraining(true)}
              disabled={retraining}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {retraining ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              <span>{retraining ? "Executing Continuous Learning..." : "Run Retraining Pipeline"}</span>
            </button>

            {versionsData.length > 1 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedRollbackVersion}
                  onChange={(e) => setSelectedRollbackVersion(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-xs text-white rounded-xl px-2.5 py-2 focus:outline-none"
                >
                  {versionsData.map((v) => (
                    <option key={v.model_version} value={v.model_version}>
                      {v.model_version} ({v.status})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleRollback}
                  disabled={rollingBack}
                  className="py-2 px-3 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  <span>Rollback</span>
                </button>
              </div>
            )}
          </div>

          {/* Latest Training Run & Gate Results */}
          {activeRun && (
            <div className="mt-4 p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-cyan-400" />
                  Latest Training Run: {activeRun.run_id}
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  activeRun.status === "passed" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                  activeRun.status === "running" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse" :
                  activeRun.status === "rejected" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                  "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}>
                  {activeRun.status}
                </span>
              </div>

              {activeRun.gate_results && (
                <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
                  <div className="bg-white/5 p-1.5 rounded text-center">
                    <span className="text-slate-500 block">Accuracy Gate</span>
                    <span className={activeRun.gate_results.accuracy === "PASS" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {activeRun.gate_results.accuracy}
                    </span>
                  </div>
                  <div className="bg-white/5 p-1.5 rounded text-center">
                    <span className="text-slate-500 block">Macro F1 Gate</span>
                    <span className={activeRun.gate_results.macro_f1 === "PASS" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {activeRun.gate_results.macro_f1}
                    </span>
                  </div>
                  <div className="bg-white/5 p-1.5 rounded text-center">
                    <span className="text-slate-500 block">Golden Test</span>
                    <span className={activeRun.gate_results.golden_set === "PASS" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {activeRun.gate_results.golden_set}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
