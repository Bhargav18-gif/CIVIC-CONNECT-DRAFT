const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#FB923C", bg: "bg-amber-400/10", text: "text-amber-300" },
  "pending review": { label: "AI Review Required", color: "#F59E0B", bg: "bg-amber-500/10", text: "text-amber-300" },
  assigned: { label: "AI Auto-Approved", color: "#38BDF8", bg: "bg-sky-400/10", text: "text-sky-300" },
  "in-progress": { label: "In Progress", color: "#22D3EE", bg: "bg-cyan-400/10", text: "text-cyan-300" },
  resolved: { label: "Resolved", color: "#34D399", bg: "bg-emerald-400/10", text: "text-emerald-300" },
  rejected: { label: "Rejected", color: "#F87171", bg: "bg-red-400/10", text: "text-red-300" },
  reopened: { label: "Reopened (Escalated)", color: "#EF4444", bg: "bg-rose-500/10", text: "text-rose-300" },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className="pulse-dot" style={{ background: config.color, color: config.color }} />
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
