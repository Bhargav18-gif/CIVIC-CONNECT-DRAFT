import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import TopHeader from '../../components/layout/TopHeader.jsx';
import EngineerSidebar from '../../components/engineer/EngineerSidebar.jsx';
import api from '../../utils/api.js';
import { Bell, RefreshCw } from 'lucide-react';

export default function EngineerNotifications() {
  const { user } = useAuth();
  const engineerId = user?.uid || user?.id || 'ENG-01';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/notifications?recipientId=' + engineerId + '&recipientType=engineer');
      setNotifications(res.data?.notifications || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [engineerId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        <EngineerSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <main className="flex-1 lg:pl-64 flex flex-col p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Field Dispatch Alerts</h1>
              <p className="text-sm text-slate-400">Task dispatches, reassignment notices, and supervisor rework requests.</p>
            </div>
            <button
              onClick={fetchNotifs}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/10 space-y-3">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div key={n.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{n.title || 'Field Dispatch Alert'}</h4>
                    <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                    <span className="text-[10px] text-slate-500 mt-2 block">{n.timestamp ? new Date(n.timestamp).toLocaleString() : ''}</span>
                  </div>
                  {n.read ? (
                    <span className="text-[10px] text-slate-500">Read</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">New</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center">No dispatch notifications at this time.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
