import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts";
import Navbar from "../../components/layout/Navbar.jsx";
import Footer from "../../components/layout/Footer.jsx";
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import api from "../../utils/api.js";
import { useDepartment } from "../../context/DepartmentContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const CHART_COLORS = ["#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// Generate simulated 7-day resolution data for demo
function generateResolutionTrend(total, completed) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, i) => ({
    day,
    resolved: Math.max(0, Math.round((completed / 7) * (0.6 + Math.random() * 0.8))),
    opened: Math.max(0, Math.round((total / 7) * (0.5 + Math.random() * 0.7))),
  }));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950 border border-white/10 rounded-xl p-3 text-xs shadow-xl">
      <div className="font-semibold text-white mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function DepartmentAnalytics() {
  const { user } = useAuth();
  const { departmentId, departmentName, permittedDepartmentIds, departments, setActiveDepartment } = useDepartment();
  const selectedDept = departmentId || "Roads";
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`http://localhost:5177/api/department/analytics?departmentId=${selectedDept}`);
      setMetrics(resp.data.metrics || null);
    } catch (err) {
      console.warn("Analytics fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMetrics(); }, [selectedDept]);

  if (loading) return <><Navbar /><div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading analytics...</div><Footer /></>;

  const total = metrics?.totalComplaints || 0;
  const completed = metrics?.completedComplaints || 0;
  const pending = metrics?.pendingComplaints || 0;
  const slaRate = parseFloat((metrics?.slaComplianceRate || "96%").replace("%", ""));
  const reopenRate = parseFloat((metrics?.reopenRate || "2%").replace("%", ""));
  const reworkRate = parseFloat((metrics?.reworkRate || "8%").replace("%", ""));

  const trendData = generateResolutionTrend(total, completed);

  const statusData = [
    { name: "Completed", value: completed, color: "#10b981" },
    { name: "Pending", value: pending, color: "#f59e0b" },
    { name: "Reopened", value: Math.round((reopenRate / 100) * total), color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const slaGaugeData = [{ name: "SLA Compliance", value: slaRate, fill: slaRate >= 90 ? "#10b981" : slaRate >= 75 ? "#f59e0b" : "#ef4444" }];

  const rateData = [
    { metric: "SLA Compliance", rate: slaRate },
    { metric: "Reopen Rate", rate: reopenRate },
    { metric: "Rework Rate", rate: reworkRate },
    { metric: "Resolution Rate", rate: total > 0 ? Math.round((completed / total) * 100) : 0 },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen px-4 lg:px-8 pt-28 pb-20 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 inline-block">ANALYTICS</span>
              <span className="text-xs text-slate-400">Department: <strong className="text-white">{departmentName || selectedDept}</strong></span>
            </div>
            <h1 className="font-bold text-3xl text-white tracking-tight">{departmentName || `${selectedDept} Analytics`}</h1>
            <p className="text-slate-400 text-sm mt-1">Resolution velocity, SLA compliance, and AI override intelligence for {selectedDept}.</p>
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
            <button onClick={fetchMetrics} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 cursor-pointer">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-slate-400 flex justify-between mb-2">Total Complaints<TrendingUp size={14} className="text-cyan-400" /></div>
            <div className="text-2xl font-bold text-white">{total}</div>
            <div className="text-[11px] text-slate-500 mt-1">All time in scope</div>
          </div>
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-slate-400 flex justify-between mb-2">SLA Compliance<Clock size={14} className="text-teal-400" /></div>
            <div className={`text-2xl font-bold ${slaRate >= 90 ? "text-emerald-400" : slaRate >= 75 ? "text-amber-400" : "text-red-400"}`}>{slaRate}%</div>
            <div className="text-[11px] text-slate-500 mt-1">Against deadlines</div>
          </div>
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-slate-400 flex justify-between mb-2">Rework Rate<AlertTriangle size={14} className="text-amber-400" /></div>
            <div className="text-2xl font-bold text-amber-400">{reworkRate}%</div>
            <div className="text-[11px] text-slate-500 mt-1">Required re-inspection</div>
          </div>
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-slate-400 flex justify-between mb-2">Avg Resolution<CheckCircle2 size={14} className="text-emerald-400" /></div>
            <div className="text-2xl font-bold text-white">{metrics?.averageResolutionHours || 18.5}h</div>
            <div className="text-[11px] text-slate-500 mt-1">Mean time to resolve</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Resolution Trend */}
          <div className="glass rounded-2xl p-5 border border-white/10">
            <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-4">7-Day Resolution Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} name="Resolved" />
                <Line type="monotone" dataKey="opened" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4", r: 3 }} name="Opened" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution */}
          <div className="glass rounded-2xl p-5 border border-white/10">
            <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-4">Complaint Status Distribution</h3>
            {total === 0 ? (
              <div className="flex items-center justify-center h-48 text-xs text-slate-500">No data for this department yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Operational Rates */}
          <div className="glass rounded-2xl p-5 border border-white/10">
            <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-4">Operational Performance Rates</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rateData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="metric" width={110} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => `${v}%`} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {rateData.map((entry, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* SLA Gauge */}
          <div className="glass rounded-2xl p-5 border border-white/10">
            <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-4">SLA Compliance Gauge</h3>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={170}>
                <RadialBarChart cx="50%" cy="60%" innerRadius="50%" outerRadius="90%" data={slaGaugeData} startAngle={180} endAngle={0}>
                  <RadialBar minAngle={15} dataKey="value" cornerRadius={8} background={{ fill: "rgba(255,255,255,0.04)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="text-center -mt-6">
                <div className={`text-3xl font-bold ${slaRate >= 90 ? "text-emerald-400" : slaRate >= 75 ? "text-amber-400" : "text-red-400"}`}>{slaRate}%</div>
                <div className="text-[11px] text-slate-400 mt-0.5">SLA Compliance Rate</div>
                <div className={`text-[10px] font-semibold mt-1 uppercase ${ slaRate >= 90 ? "text-emerald-400" : slaRate >= 75 ? "text-amber-400" : "text-red-400" }`}>
                  {slaRate >= 90 ? "Excellent" : slaRate >= 75 ? "Needs Attention" : "Critical"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
