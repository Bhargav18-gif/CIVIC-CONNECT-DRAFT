import { useEffect, useState } from "react";
import api from "../../utils/api";

const FALLBACK_DEPARTMENTS = [
  { name: "Roads", total: 120, resolved: 80 },
  { name: "Water", total: 90, resolved: 52 },
  { name: "Electricity", total: 70, resolved: 40 },
  { name: "Garbage", total: 60, resolved: 35 },
  { name: "Drainage", total: 45, resolved: 22 },
  { name: "Health", total: 30, resolved: 25 },
];

export default function DepartmentProgress() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchStats() {
      setLoading(true);
      // try a few common endpoints for aggregated stats
      const endpoints = [
        "/departments/stats",
        "/issues/department-stats",
        "/issues/stats",
      ];

      for (const ep of endpoints) {
        try {
          const { data } = await api.get(ep);
          if (!mounted) return;
          // Expecting an array of { name, total, resolved }
          if (Array.isArray(data)) {
            setDepartments(
              data.map((d) => ({ name: d.name, total: d.total || 0, resolved: d.resolved || 0 }))
            );
            setLoading(false);
            return;
          }
          // Some APIs wrap in .stats or .data
          if (data.stats && Array.isArray(data.stats)) {
            setDepartments(
              data.stats.map((d) => ({ name: d.name, total: d.total || 0, resolved: d.resolved || 0 }))
            );
            setLoading(false);
            return;
          }
        } catch (err) {
          // try next endpoint
        }
      }

      // fallback to static sample data
      if (mounted) {
        setDepartments(FALLBACK_DEPARTMENTS);
        setLoading(false);
      }
    }

    fetchStats();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-semibold text-white mb-4">Department Progress</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading && <div className="text-sm text-slate-400">Loading department stats...</div>}

        {!loading && departments.map((d) => {
          const total = d.total || 0;
          const resolved = d.resolved || 0;
          const percent = total > 0 ? Math.round((resolved / total) * 100) : 0;

          return (
            <div key={d.name} className="bg-slate-800 rounded-xl p-4 text-white shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{d.name}</p>
                  <p className="text-xs text-slate-300 mt-1">{resolved.toLocaleString()} resolved of {total.toLocaleString()}</p>
                </div>
                <div className="text-sm font-bold">{percent}%</div>
              </div>

              <div className="mt-3 bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 bg-gradient-to-r from-cyan-400 to-violet-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
