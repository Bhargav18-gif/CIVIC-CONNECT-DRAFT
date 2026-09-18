export default function Header({ title, description }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-display text-white tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-slate-400 text-sm mt-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
