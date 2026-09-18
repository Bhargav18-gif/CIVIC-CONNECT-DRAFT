export default function Input({
  label,
  icon: Icon,
  error,
  type = "text",
  rightElement,
  ...props
}) {
  return (
    <div className="mb-5">
      {label && (
        <label className="block text-xs font-medium text-slate-400 mb-2">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />
        )}
        <input
          type={type}
          className={`w-full bg-white/5 border ${
            error ? "border-red-400/50" : "border-white/10"
          } rounded-xl py-3 ${Icon ? "pl-11" : "pl-4"} ${
            rightElement ? "pr-11" : "pr-4"
          } text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:bg-white/[0.07] transition-colors`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
