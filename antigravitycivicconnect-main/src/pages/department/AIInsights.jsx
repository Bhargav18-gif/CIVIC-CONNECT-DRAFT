import React, { useState, useEffect } from 'react';
import { useDepartment } from '../../context/DepartmentContext.jsx';
import TopHeader from '../../components/layout/TopHeader.jsx';
import DepartmentSidebar from '../../components/department/DepartmentSidebar.jsx';
import api from '../../utils/api.js';
import { Sparkles, RefreshCw, Lightbulb, TrendingUp } from 'lucide-react';

export default function AIInsights() {
  const { departmentId, departmentName } = useDepartment();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/department/insights?departmentId=' + (departmentId || 'Roads'));
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [departmentId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        <DepartmentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:pl-64 flex flex-col p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AI Operations Insights</h1>
              <p className="text-sm text-slate-400">Continuous learning and predictive patterns for {departmentName || 'department'}.</p>
            </div>
            <button
              onClick={fetchInsights}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold">
                <TrendingUp className="w-4 h-4" /> Operational Metrics
              </div>
              <p className="text-xs text-slate-400">Total Volume: <strong className="text-white">{data?.totalVolume || 0}</strong></p>
              <p className="text-xs text-slate-400">Avg Resolution Time: <strong className="text-white">{data?.averageResolutionHours || 0} hrs</strong></p>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                <Sparkles className="w-4 h-4" /> AI Suggestions
              </div>
              <div className="space-y-3">
                {data?.aiSuggestions?.map((s, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> {s.title}
                    </h4>
                    <p className="text-xs text-slate-400">{s.description}</p>
                    <p className="text-xs text-cyan-400 font-medium">Recommendation: {s.actionableRecommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
