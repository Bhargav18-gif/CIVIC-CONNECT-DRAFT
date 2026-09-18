import React, { useState, useEffect } from 'react';
import { useDepartment } from '../../context/DepartmentContext.jsx';
import TopHeader from '../../components/layout/TopHeader.jsx';
import DepartmentSidebar from '../../components/department/DepartmentSidebar.jsx';
import api from '../../utils/api.js';
import { Users, RefreshCw, Activity } from 'lucide-react';

export default function ResourceManager() {
  const { departmentId, departmentName } = useDepartment();
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/department/engineers?departmentId=' + (departmentId || 'Roads'));
      setEngineers(res.data?.engineers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [departmentId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        <DepartmentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:pl-64 flex flex-col p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Resource Manager</h1>
              <p className="text-sm text-slate-400">Field engineer capacity and workload allocation for {departmentName || 'department'}.</p>
            </div>
            <button
              onClick={fetchResources}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {engineers.map((eng) => (
              <div key={eng.id || eng.engineerId} className="glass p-5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">{eng.name || eng.fullName}</h4>
                  <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full border " + (eng.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30')}>
                    {eng.status || 'AVAILABLE'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{eng.email || 'Engineer'}</p>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span>Current Workload:</span>
                  <strong className="text-white">{eng.activeTasks || eng.workloadCount || 0} tasks</strong>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
