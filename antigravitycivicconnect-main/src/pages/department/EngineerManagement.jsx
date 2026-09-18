import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "../../components/layout/Navbar.jsx";
import Footer from "../../components/layout/Footer.jsx";
import { Users, RefreshCw, AlertTriangle, CheckCircle2, Clock, Wrench, ChevronDown, ChevronRight } from "lucide-react";
import api from "../../utils/api.js";
import { useDepartment } from "../../context/DepartmentContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const STATUS_COLOR = {
  available: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  busy: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  travelling: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  on_site: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  off_duty: "bg-slate-700/40 text-slate-400 border-white/10",
};

function WorkloadBar({ current, max }) {
  const pct = Math.min(100, Math.round((current / (max || 5)) * 100));
  const color = pct >= 80 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
        <span>Workload</span>
        <span className="font-mono">{current}/{max || 5} tasks</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function EngineerManagement() {
  const { user } = useAuth();
  const { departmentId, departmentName, permittedDepartmentIds, departments, setActiveDepartment } = useDepartment();
  const selectedDept = departmentId || "Roads";
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchEngineers = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`http://localhost:5177/api/department/engineers?departmentId=${selectedDept}`);
      setEngineers(resp.data.engineers || []);
    } catch (err) {
      console.warn("Engineer fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEngineers(); }, [selectedDept]);

  const availableCount = engineers.filter((e) => (e.currentStatus || "").toLowerCase() === "available").length;
  const busyCount = engineers.filter((e) => ["busy", "on_site", "travelling"].includes((e.currentStatus || "").toLowerCase())).length;
  const avgCompliance = engineers.length > 0 ? (engineers.reduce((s, e) => s + (e.slaComplianceRate || 96), 0) / engineers.length).toFixed(1) : 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen px-4 lg:px-8 pt-28 pb-20 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">ENGINEER MANAGEMENT</span>
              <span className="text-xs text-slate-400">Department: <strong className="text-white">{departmentName || selectedDept}</strong></span>
            </div>
            <h1 className="font-bold text-3xl text-white tracking-tight">{departmentName || `${selectedDept} Field Engineers`}</h1>
            <p className="text-slate-400 text-sm mt-1">Monitor workload, skills, availability, and SLA performance for {selectedDept}.</p>
          </div>
          <div className="flex items-center gap-2">
            {(permittedDepartmentIds.length > 1 || user?.role === "admin") ? (
              <select
                value={selectedDept}
                onChange={(e) => setActiveDepartment(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 text-slate-200 text-xs font-semibold border border-cyan-500/30 focus:outline-none focus:border-cyan-400"
              >
                {(user?.role === "admin" && departments.length > 0
                  ? departments.map((d) => d.departmentId || d.id)
                  : permittedDepartmentIds
                ).map((d) => (
                  <option key={d} value={d}>
                    {d} Department
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 font-medium">
                Scope: <strong className="text-cyan-300">{selectedDept}</strong>
              </div>
            )}
            <button onClick={fetchEngineers} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 cursor-pointer">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-4 border border-white/10"><div className="text-xs text-slate-400 flex justify-between">Total Engineers<Users size={14} className="text-cyan-400" /></div><div className="text-2xl font-bold text-white mt-2">{engineers.length}</div></div>
          <div className="glass rounded-2xl p-4 border border-white/10"><div className="text-xs text-slate-400 flex justify-between">Available<CheckCircle2 size={14} className="text-emerald-400" /></div><div className="text-2xl font-bold text-emerald-400 mt-2">{availableCount}</div></div>
          <div className="glass rounded-2xl p-4 border border-white/10"><div className="text-xs text-slate-400 flex justify-between">On Task<Wrench size={14} className="text-amber-400" /></div><div className="text-2xl font-bold text-amber-400 mt-2">{busyCount}</div></div>
          <div className="glass rounded-2xl p-4 border border-white/10"><div className="text-xs text-slate-400 flex justify-between">Avg SLA Compliance<Clock size={14} className="text-teal-400" /></div><div className="text-2xl font-bold text-teal-400 mt-2">{avgCompliance}%</div></div>
        </div>

        {/* Engineer Cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 glass rounded-2xl border border-white/10">Loading engineers...</div>
          ) : engineers.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 glass rounded-2xl border border-white/10">No engineers found for {selectedDept}.</div>
          ) : (
            engineers.map((eng) => {
              const status = (eng.currentStatus || "available").toLowerCase();
              const isExpanded = expandedId === eng.engineerId;
              return (
                <motion.div key={eng.engineerId} layout className="glass rounded-2xl border border-white/10 overflow-hidden">
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : eng.engineerId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{(eng.name || "?")[0]}</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{eng.name || eng.engineerId}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{eng.engineerId}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${STATUS_COLOR[status] || STATUS_COLOR.available}`}>
                          {status.replace("_", " ")}
                        </span>
                        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-slate-500 mb-0.5">SLA Compliance</div>
                        <div className="font-bold text-teal-400">{eng.slaComplianceRate || 96}%</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-0.5">Avg Resolution</div>
                        <div className="font-bold text-white">{eng.averageResolutionTime || 4.2}h</div>
                      </div>
                      <div className="col-span-2">
                        <WorkloadBar current={eng.workloadCount || 0} max={eng.maxConcurrentTasks || 5} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-5 border-t border-white/5 pt-4 space-y-3">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Specialized Skills</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(eng.skills || []).map((skill) => (
                            <span key={skill} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-medium">{skill}</span>
                          ))}
                        </div>
                      </div>
                      {eng.currentLocation && (
                        <div className="text-xs">
                          <span className="text-slate-500">Last Known Location: </span>
                          <span className="text-slate-300 font-mono">{eng.currentLocation.lat?.toFixed(4)}, {eng.currentLocation.lng?.toFixed(4)}</span>
                        </div>
                      )}
                      {(eng.activeComplaintIds || []).length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Active Task IDs</div>
                          <div className="flex flex-wrap gap-1">
                            {eng.activeComplaintIds.map((cid) => (
                              <span key={cid} className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 text-[10px] font-mono">{cid}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
