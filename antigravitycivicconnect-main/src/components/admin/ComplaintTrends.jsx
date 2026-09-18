import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Jan", complaints: 400, resolved: 240 },
  { name: "Feb", complaints: 300, resolved: 139 },
  { name: "Mar", complaints: 200, resolved: 980 },
  { name: "Apr", complaints: 278, resolved: 390 },
  { name: "May", complaints: 189, resolved: 480 },
  { name: "Jun", complaints: 239, resolved: 380 },
  { name: "Jul", complaints: 349, resolved: 430 },
];

export default function ComplaintTrends() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="glass rounded-3xl p-6 mt-10">
      <h2 className="text-xl font-semibold text-white mb-6">Complaint Trends</h2>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
              itemStyle={{ color: "#fff" }}
            />
            <Line type="monotone" dataKey="complaints" stroke="#22d3ee" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#22d3ee", strokeWidth: 0 }} />
            <Line type="monotone" dataKey="resolved" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#8b5cf6", strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
