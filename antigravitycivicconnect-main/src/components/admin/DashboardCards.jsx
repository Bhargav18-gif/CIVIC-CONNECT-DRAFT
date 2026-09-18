import { ClipboardList, Clock, CheckCircle2, Users } from "lucide-react";
import StatCard from "./StatCard.jsx";

export default function DashboardCards({ stats }) {
  const cards = [
    {
      title: "Total Complaints",
      value: stats?.total || 0,
      icon: ClipboardList,
      color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    },
    {
      title: "Pending",
      value: stats?.pending || 0,
      icon: Clock,
      color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
    {
      title: "Resolved",
      value: stats?.resolved || 0,
      icon: CheckCircle2,
      color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    },
    {
      title: "Citizens",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <StatCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          color={card.color}
        />
      ))}
    </div>
  );
}