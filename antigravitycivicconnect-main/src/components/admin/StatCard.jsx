export default function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="glass rounded-2xl p-6 text-white shadow-lg border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">
            {title}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold font-display mt-3 tracking-tight">
            {value.toLocaleString()}
          </h2>
        </div>
        <div className={`p-3 rounded-xl border ${color} flex items-center justify-center`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="absolute -bottom-1 right-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </div>
  );
}
