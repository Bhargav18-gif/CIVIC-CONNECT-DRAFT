import React, { useState, useEffect } from 'react';
import { useDepartment } from '../../context/DepartmentContext.jsx';
import TopHeader from '../../components/layout/TopHeader.jsx';
import DepartmentSidebar from '../../components/department/DepartmentSidebar.jsx';
import api from '../../utils/api.js';
import { AlertTriangle, ShieldAlert, RefreshCw, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EscalationCenter() {
  const { departmentId, departmentName } = useDepartment();
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/department/escalations?departmentId=' + (departmentId || 'Roads'));
      setEscalations(res.data?.escalations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
  }, [departmentId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        <DepartmentSidebar counts={{ escalated: escalations.length }} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:pl-64 flex flex-col p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Escalation Center</h1>
              <p className="text-sm text-slate-400">High-priority and supervisor-escalated tasks for {departmentName || 'department'}.</p>
            </div>
            <button
              onClick={fetchEscalations}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/10">
            <h3 className="text-sm font-semibold mb-4 text-slate-200">Active Escalations ({escalations.length})</h3>
            <div className="space-y-3">
              {escalations.length > 0 ? (
                escalations.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-rose-400 font-semibold">{item.referenceId || item.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          ESCALATED
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-white mt-1">{item.title || item.issueDescription}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Reason: {item.supervision?.escalationReason || 'SLA breached with urgent priority'}
                      </p>
                    </div>
                    <Link
                      to={'/department/tasks/' + item.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors"
                    >
                      View Deep Dive <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-8 text-center">No escalated complaints at this time.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
