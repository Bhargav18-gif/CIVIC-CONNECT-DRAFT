import React, { useState, useEffect } from 'react';
import { useDepartment } from '../../context/DepartmentContext.jsx';
import TopHeader from '../../components/layout/TopHeader.jsx';
import DepartmentSidebar from '../../components/department/DepartmentSidebar.jsx';
import api from '../../utils/api.js';
import { Clock, AlertTriangle, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';

export default function SLAMonitor() {
  const { departmentId, departmentName } = useDepartment();
  const [slaData, setSlaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchSLA = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/department/sla?departmentId=' + (departmentId || 'Roads'));
      setSlaData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSLA();
  }, [departmentId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        <DepartmentSidebar counts={{ breached: slaData?.counts?.BREACHED }} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:pl-64 flex flex-col p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">SLA Health Monitor</h1>
              <p className="text-sm text-slate-400">Live SLA compliance status for {departmentName || 'department'}.</p>
            </div>
            <button
              onClick={fetchSLA}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass p-4 rounded-2xl border border-white/10">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                SAFE
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-2">{slaData?.counts?.SAFE || 0}</div>
            </div>
            <div className="glass p-4 rounded-2xl border border-white/10">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                WARNING
                <Clock className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-400 mt-2">{slaData?.counts?.WARNING || 0}</div>
            </div>
            <div className="glass p-4 rounded-2xl border border-white/10">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                AT RISK
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-2">{slaData?.counts?.AT_RISK || 0}</div>
            </div>
            <div className="glass p-4 rounded-2xl border border-white/10">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                BREACHED
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400 mt-2">{slaData?.counts?.BREACHED || 0}</div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/10">
            <h3 className="text-sm font-semibold mb-4 text-slate-200">At Risk & Breached Complaints</h3>
            <div className="space-y-3">
              {slaData?.atRiskComplaints?.length > 0 ? (
                slaData.atRiskComplaints.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs text-cyan-400 font-semibold">{item.referenceId || item.id}</span>
                      <h4 className="text-sm font-medium text-white mt-0.5">{item.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">Status: {item.sla?.slaStatus} • {item.sla?.timeRemainingStr}</p>
                    </div>
                    <span className={"text-xs font-bold px-2.5 py-1 rounded-full border " + (item.sla?.isBreached ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30")}>
                      {item.sla?.slaStatus}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No critical SLA risks in this department.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
