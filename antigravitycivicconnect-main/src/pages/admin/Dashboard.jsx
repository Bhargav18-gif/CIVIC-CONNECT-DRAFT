import { useEffect, useState } from "react";
import Sidebar from "../../components/admin/Sidebar.jsx";
import DashboardCards from "../../components/admin/DashboardCards.jsx";
import DepartmentProgress from "../../components/admin/DepartmentProgress.jsx";
import ComplaintTrends from "../../components/admin/ComplaintTrends.jsx";
import api from "../../utils/api.js";
import { motion } from "framer-motion";
import Header from "../../components/admin/Header.jsx";

import AIPerformanceCard from "../../components/admin/AIPerformanceCard.jsx";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data } = await api.get("/admin/stats");
        setStats(data);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-950">
      <Sidebar />

      <main className="flex-1 p-6 sm:p-10 lg:pl-10 lg:pr-10 lg:py-10 max-w-[1400px] mt-16 lg:mt-0 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Header
            title="Admin Dashboard"
            description="Overview of civic complaints, user participation, and department response."
          />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-10">
              <DashboardCards stats={stats} />

              <AIPerformanceCard />

              <div className="grid lg:grid-cols-3 gap-8 mt-10">

                <div className="lg:col-span-2 space-y-10">
                  <ComplaintTrends />
                  <DepartmentProgress />
                </div>

                <div className="glass rounded-3xl p-6 sm:p-7 flex flex-col mt-10">
                  <div>
                    <h3 className="text-xl font-bold font-display text-white mb-4">Quick Links & Actions</h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Access quick administrative tools to filter complaints, examine citizen profiles, or assign departments.
                    </p>
                  </div>
                  <div className="space-y-3 mt-auto">
                    <button
                      onClick={() => window.location.href = "/admin/complaints"}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-cyan-400/30 transition-all group cursor-pointer"
                    >
                      <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Manage Complaints</span>
                      <span className="text-xs text-cyan-400 font-mono font-bold">GO &rarr;</span>
                    </button>
                    <button
                      onClick={() => window.location.href = "/admin/users"}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-cyan-400/30 transition-all group cursor-pointer"
                    >
                      <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">View Registered Citizens</span>
                      <span className="text-xs text-cyan-400 font-mono font-bold">GO &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}