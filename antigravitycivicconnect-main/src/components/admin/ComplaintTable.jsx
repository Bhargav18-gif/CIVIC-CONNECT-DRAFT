import StatusBadge from "../ui/StatusBadge.jsx";
import { Camera, Star } from "lucide-react";

export default function ComplaintTable({ complaints, onSelectIssue }) {
  // Helper to count photos safely
  const countPhotos = (arr) => Array.isArray(arr) ? arr.length : 0;

  return (
    <div className="glass rounded-3xl overflow-hidden border border-white/5 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">ID / Title</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Citizen Photos</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Dept Photos</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Verification</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Feedback</th>
              <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {complaints.map((c) => {
              const citizenCount = countPhotos(c.citizenPhotos) + countPhotos(c.citizenAdditionalPhotos) + (c.imageURL ? 1 : 0);
              const deptCount = countPhotos(c.departmentProgressPhotos) + countPhotos(c.departmentCompletionPhotos);
              const verifCount = countPhotos(c.citizenVerificationPhotos);
              
              return (
                <tr key={c.referenceId} className="hover:bg-white/[0.01] transition-all">
                  <td className="py-4.5 px-6">
                    <div className="font-mono text-xs font-semibold text-cyan-400 mb-1">{c.referenceId}</div>
                    <div className="text-xs font-medium text-slate-200 max-w-[200px] truncate" title={c.title}>{c.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{c.category} &bull; {new Date(c.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="py-4.5 px-6">
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={c.status} />
                      {c.ai?.automationMode === "AUTO" ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                          AI Auto-Approved
                        </span>
                      ) : c.supervision?.requiresAdmin ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                          Admin Review Required
                        </span>
                      ) : null}
                      {c.ai?.duplicate?.isDuplicate && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20 font-semibold">
                          Duplicate Match
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4.5 px-6 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      {c.imageURL || (c.citizenPhotos && c.citizenPhotos[0]?.url) ? (
                        <div className="w-10 h-10 rounded overflow-hidden border border-white/10 shrink-0">
                          <img 
                            src={c.imageURL || c.citizenPhotos[0].url} 
                            className="w-full h-full object-cover" 
                            alt="evidence" 
                          />
                        </div>
                      ) : null}
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300">
                        <Camera size={12} className="text-cyan-400" />
                        <span className="font-mono">{citizenCount}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4.5 px-6 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300">
                      <Camera size={14} className="text-emerald-400" />
                      <span className="font-mono">{deptCount}</span>
                    </div>
                  </td>
                  <td className="py-4.5 px-6 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300">
                      <Camera size={14} className={verifCount > 0 ? "text-blue-400" : "text-slate-500"} />
                      <span className="font-mono">{verifCount}</span>
                    </div>
                  </td>
                  <td className="py-4.5 px-6 text-center">
                    {c.feedback && c.feedback.rating ? (
                      <div className="inline-flex gap-0.5 items-center bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                        <span className="text-xs font-bold text-white mr-1">{c.feedback.rating}</span>
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">No feedback</span>
                    )}
                  </td>
                  <td className="py-4.5 px-6 text-right">
                    <button
                      onClick={() => onSelectIssue(c)}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 text-xs font-semibold hover:bg-cyan-400 hover:text-slate-950 hover:border-transparent transition-all cursor-pointer"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
