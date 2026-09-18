import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import TopHeader from '../../components/layout/TopHeader.jsx';
import EngineerSidebar from '../../components/engineer/EngineerSidebar.jsx';
import api from '../../utils/api.js';
import { Award, ShieldCheck, Clock, RefreshCw, Star } from 'lucide-react';

export default function EngineerPerformance() {
  const { user } = useAuth();
  const engineerId = user?.uid || user?.id || 'ENG-01';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchPerf = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/engineer/performance?engineerId=' + engineerId);
      setData(res.data?.performance || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerf();
  }, [engineerId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        <EngineerSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <main className="flex-1 lg:pl-64 flex flex-col p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Performance & Scorecard</h1>
              <p className="text-sm text-slate-400">Quality score, SLA compliance, and achievements.</p>
            </div>
            <button
              onClick={fetchPerf}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
              <Award className="w-10 h-10 text-cyan-400 mb-2" />
              <h3 className="text-3xl font-bold text-white">{data?.score || 92} / 100</h3>
              <p className="text-xs text-slate-400 mt-1">Field Performance Score</p>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
              <Clock className="w-10 h-10 text-emerald-400 mb-2" />
              <h3 className="text-3xl font-bold text-emerald-400">{data?.slaComplianceRate || '96.5%'}</h3>
              <p className="text-xs text-slate-400 mt-1">SLA Compliance Rate</p>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
              <ShieldCheck className="w-10 h-10 text-amber-400 mb-2" />
              <h3 className="text-3xl font-bold text-white">{data?.completedCount || 0}</h3>
              <p className="text-xs text-slate-400 mt-1">Total Tasks Resolved</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/10">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Earned Badges & Distinctions</h3>
            <div className="flex flex-wrap gap-2">
              {data?.badges?.map((b, i) => (
                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {b}
                </span>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
