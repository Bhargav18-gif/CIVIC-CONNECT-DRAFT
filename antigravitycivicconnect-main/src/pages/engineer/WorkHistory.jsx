import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import TopHeader from '../../components/layout/TopHeader.jsx';
import EngineerSidebar from '../../components/engineer/EngineerSidebar.jsx';
import api from '../../utils/api.js';
import { History, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function EngineerWorkHistory() {
  const { user } = useAuth();
  const engineerId = user?.uid || user?.id || 'ENG-01';
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/engineer/history?engineerId=' + engineerId);
      setHistory(res.data?.history || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [engineerId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        <EngineerSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <main className="flex-1 lg:pl-64 flex flex-col p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Work & Resolution History</h1>
              <p className="text-sm text-slate-400">Completed jobs, rework logs, and resolution verification archives.</p>
            </div>
            <button
              onClick={fetchHistory}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/10 space-y-3">
            {history.length > 0 ? (
              history.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-cyan-400 font-semibold">{item.referenceId || item.id}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {item.status || 'Resolved'}
                      </span>
                      {item.hasRework && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          Rework Completed
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-white mt-1">{item.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Resolved: {item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center">No completed work records found.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
