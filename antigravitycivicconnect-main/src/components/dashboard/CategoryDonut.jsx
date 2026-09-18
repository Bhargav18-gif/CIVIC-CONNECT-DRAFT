const SEGMENTS = [
  { label: "Roads", value: 34, color: "#22D3EE" },
  { label: "Water", value: 24, color: "#8B5CF6" },
  { label: "Garbage", value: 22, color: "#FB923C" },
  { label: "Electricity", value: 20, color: "#2563EB" },
];

export default function CategoryDonut() {
  const total = SEGMENTS.reduce((sum, s) => sum + s.value, 0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offsetAccum = 0;

  return (
    <div className="glass rounded-2xl p-7">
      <h3 className="font-display font-semibold text-lg mb-1">By category</h3>
      <p className="text-sm text-slate-500 mb-6">This month's reports</p>

      <div className="flex items-center gap-8">
        <svg width="150" height="150" viewBox="0 0 150 150" className="flex-shrink-0">
          <circle cx="75" cy="75" r={radius} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="16" />
          {SEGMENTS.map((seg) => {
            const length = (seg.value / total) * circumference;
            const dasharray = `${length} ${circumference - length}`;
            const dashoffset = circumference - offsetAccum;
            offsetAccum += length;
            return (
              <circle
                key={seg.label}
                cx="75"
                cy="75"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                transform="rotate(-90 75 75)"
                strokeLinecap="round"
              />
            );
          })}
          <text
            x="75"
            y="80"
            textAnchor="middle"
            className="font-display font-bold"
            fill="#F1F5F9"
            fontSize="22"
          >
            {total}
          </text>
        </svg>

        <div className="space-y-3">
          {SEGMENTS.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: seg.color }}
              />
              <span className="text-sm text-slate-300">{seg.label}</span>
              <span className="text-xs text-slate-500 ml-auto">{seg.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
