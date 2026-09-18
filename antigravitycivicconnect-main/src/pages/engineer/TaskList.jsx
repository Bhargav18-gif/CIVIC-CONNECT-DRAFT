import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import TopHeader from '../../components/layout/TopHeader.jsx';
import EngineerSidebar from '../../components/engineer/EngineerSidebar.jsx';
import api from '../../utils/api.js';
import { CheckSquare, Clock, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EngineerTaskList() {
  const { user } = useAuth();
  const engineerId = user?.uid || user?.id || 'ENG-01';
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/engineer/dashboard?engineerId=' + engineerId);
      setTasks(res.data?.tasks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [engineerId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        <EngineerSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} taskCounts={{ myTasks: tasks.length }} />
        <main className="flex-1 lg:pl-64 flex flex-col p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Assigned Tasks</h1>
              <p className="text-sm text-slate-400">Direct active tasks dispatched to your field queue.</p>
            </div>
            <button
              onClick={fetchTasks}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/10 space-y-3">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div key={task.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-cyan-400 font-semibold">{task.referenceId || task.id}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                        {task.priority || 'Normal'}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-white mt-1">{task.title || task.issueDescription}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{task.location?.address || 'Field Location'} • SLA: {task.sla?.timeRemainingStr}</p>
                  </div>
                  <Link
                    to={'/engineer/tasks/' + task.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors"
                  >
                    Open Task <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center">No assigned tasks currently in your queue.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
