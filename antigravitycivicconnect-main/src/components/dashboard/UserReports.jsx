import { useState, useEffect, useMemo, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.js";
import { Calendar, MapPin, Search, Filter, SortDesc, BarChart2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import StatusBadge from "../ui/StatusBadge.jsx";
import Button from "../ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import toast, { Toaster } from "react-hot-toast";
import ComplaintDetailModal from "./ComplaintDetailModal.jsx";
import { motion, AnimatePresence } from "framer-motion";

export default function UserReports({ userEmail }) {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Ref to track previous reports for diffing and notifications
  const prevReportsRef = useRef([]);

  // States for Search, Filter, Sort
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("Newest First");
  const [selectedIssue, setSelectedIssue] = useState(null);

  useEffect(() => {
    // If no user ID, fallback to email. Wait, earlier we passed userId.
    if (!user?.id && !user?.uid && !userEmail) {
      setLoading(false);
      return;
    }

    const userId = user?.id || user?.uid;
    const q = userId 
      ? query(collection(db, "complaints"), where("userId", "==", userId))
      : query(collection(db, "complaints"), where("userEmail", "==", userEmail));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedReports = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Diff with prevReports to find status changes
        const prevReports = prevReportsRef.current;
        if (prevReports.length > 0) {
          fetchedReports.forEach(newReport => {
            const oldReport = prevReports.find(r => r.id === newReport.id);
            if (oldReport && oldReport.status !== newReport.status) {
              toast.success(`Update: ${newReport.title || newReport.issueTitle} is now ${newReport.status}`, {
                icon: '🔔',
                style: {
                  borderRadius: '10px',
                  background: '#1e293b',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                },
              });
            }
          });
        }
        
        prevReportsRef.current = fetchedReports;
        setReports(fetchedReports);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching user reports:", err);
        // Fallback if userId query fails (due to missing index etc), we try email.
        if (userId && err.code === "failed-precondition") {
            const fbQuery = query(collection(db, "complaints"), where("userEmail", "==", userEmail));
            onSnapshot(fbQuery, (fbSnap) => {
                const fbReports = fbSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                prevReportsRef.current = fbReports;
                setReports(fbReports);
                setLoading(false);
            }, (fbErr) => {
                setError("Failed to load reports. Please try again later.");
                setLoading(false);
            });
        } else {
            setError("Failed to load reports. Please try again later.");
            setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [userEmail, user?.uid]);

  // Derived state: Filtering & Sorting
  const filteredAndSortedReports = useMemo(() => {
    let result = [...reports];

    // Filter Search
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.complaintId?.toLowerCase().includes(lower) ||
          r.referenceId?.toLowerCase().includes(lower) ||
          r.issueTitle?.toLowerCase().includes(lower) ||
          r.title?.toLowerCase().includes(lower) ||
          r.department?.toLowerCase().includes(lower) ||
          r.category?.toLowerCase().includes(lower) ||
          r.address?.toLowerCase().includes(lower)
      );
    }

    // Filter Status
    if (filterStatus !== "All") {
      result = result.filter(
        (r) => (r.status || "").toLowerCase() === filterStatus.toLowerCase()
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      
      switch (sortBy) {
        case "Newest First":
          return dateB - dateA;
        case "Oldest First":
          return dateA - dateB;
        case "Priority": {
          const p = { emergency: 4, high: 3, urgent: 3, medium: 2, normal: 2, low: 1 };
          const pA = p[a.priority?.toLowerCase()] || 0;
          const pB = p[b.priority?.toLowerCase()] || 0;
          return pB - pA;
        }
        case "Department": {
          const dA = (a.department || a.category || "").toLowerCase();
          const dB = (b.department || b.category || "").toLowerCase();
          return dA.localeCompare(dB);
        }
        case "Status": {
          const sA = (a.status || "").toLowerCase();
          const sB = (b.status || "").toLowerCase();
          return sA.localeCompare(sB);
        }
        default:
          return dateB - dateA;
      }
    });

    return result;
  }, [reports, searchTerm, filterStatus, sortBy]);

  // Derived Statistics
  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => ["pending review", "pending", "submitted"].includes(r.status?.toLowerCase())).length;
    const inProgress = reports.filter((r) => ["assigned", "in-progress", "in progress", "department inspection required"].includes(r.status?.toLowerCase())).length;
    const completed = reports.filter((r) => ["resolved", "completed", "ready for citizen verification"].includes(r.status?.toLowerCase())).length;
    const closed = reports.filter((r) => r.status?.toLowerCase() === "closed").length;

    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    reports.forEach((r) => {
      if (r.createdAt && r.updatedAt && (r.status?.toLowerCase() === "completed" || r.status?.toLowerCase() === "closed" || r.status?.toLowerCase() === "resolved")) {
        const diff = new Date(r.updatedAt) - new Date(r.createdAt);
        if (diff > 0) {
          totalResolutionTime += diff;
          resolvedCount++;
        }
      }
    });

    const avgResTimeDays = resolvedCount > 0 ? (totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24)).toFixed(1) : "-";

    return { total, pending, inProgress, completed, closed, avgResTimeDays };
  }, [reports]);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* STATISTICS */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Pending", value: stats.pending, color: "text-amber-400" },
          { label: "In Progress", value: stats.inProgress, color: "text-cyan-400" },
          { label: "Completed", value: stats.completed, color: "text-emerald-400" },
          { label: "Closed", value: stats.closed, color: "text-slate-400" },
          { label: "Avg Resolution", value: `${stats.avgResTimeDays}d`, color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-xs font-medium text-slate-400">{s.label}</p>
            <p className={`text-2xl font-bold font-display mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-bold font-display text-white mb-2">My Reports</h2>
            <p className="text-slate-400 text-sm">Real-time status of all your submitted issues.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search complaints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 w-full md:w-48"
              />
            </div>

            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none bg-black/20 border border-white/10 rounded-xl py-2 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-cyan-400/50 w-full md:w-36"
              >
                <option value="All">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Reopened">Reopened</option>
              </select>
              <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-black/20 border border-white/10 rounded-xl py-2 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-cyan-400/50 w-full md:w-36"
              >
                <option value="Newest First">Newest First</option>
                <option value="Oldest First">Oldest First</option>
                <option value="Priority">Priority</option>
                <option value="Department">Department</option>
                <option value="Status">Status</option>
              </select>
              <SortDesc size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white/5 border border-white/5 rounded-2xl h-32 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl text-sm flex items-center gap-2">
             <AlertCircle size={16} />
            {error}
          </div>
        ) : filteredAndSortedReports.length === 0 ? (
          <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
               <BarChart2 size={32} className="text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 font-display">No reports found</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm">
               {searchTerm || filterStatus !== "All" ? "No reports match your current filters." : "You haven't submitted any complaints yet. Report your first issue to make a difference."}
            </p>
            {searchTerm || filterStatus !== "All" ? (
               <Button onClick={() => { setSearchTerm(""); setFilterStatus("All"); }} variant="secondary">Clear Filters</Button>
            ) : (
               <Button to="/report" icon={MapPin}>Report an Issue</Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
               {filteredAndSortedReports.map((report) => (
               <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  key={report.id}
                  onClick={() => setSelectedIssue(report)}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-5 items-start justify-between hover:bg-white/10 transition-all cursor-pointer group hover:border-cyan-500/30"
               >
                  <div className="flex-1 w-full">
                     <div className="flex flex-wrap items-center gap-3 mb-3">
                     <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded">
                        {report.complaintId || report.referenceId || report.id}
                     </span>
                     <StatusBadge status={report.status?.toLowerCase() || "pending"} />
                     {report.priority && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                           report.priority.toLowerCase() === 'emergency' ? 'border-red-500/50 text-red-400 bg-red-500/10' :
                           report.priority.toLowerCase() === 'high' || report.priority.toLowerCase() === 'urgent' ? 'border-orange-500/50 text-orange-400 bg-orange-500/10' :
                           report.priority.toLowerCase() === 'medium' || report.priority.toLowerCase() === 'normal' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                           'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                        }`}>
                           {report.priority}
                        </span>
                     )}
                     </div>
                     
                     <h3 className="text-lg font-bold text-white mb-2 font-display group-hover:text-cyan-300 transition-colors">
                        {report.issueTitle || report.title}
                     </h3>
                     <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                        {report.issueDescription || report.description}
                     </p>
                     
                     <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                     <span className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded-md border border-white/5">
                        <MapPin size={12} className="text-cyan-500" /> {report.category || report.department}
                     </span>
                     <span className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded-md border border-white/5">
                        <Calendar size={12} className="text-purple-500" />
                        {new Date(report.createdAt).toLocaleDateString("en-IN", {
                           day: "numeric", month: "short", year: "numeric"
                        })}
                     </span>
                     {(report.status?.toLowerCase() === "resolved" || report.status?.toLowerCase() === "completed") && (
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 font-medium">
                           <CheckCircle size={12} /> Needs Verification
                        </span>
                     )}
                     </div>
                  </div>
                  
                  <div className="shrink-0 w-full md:w-32 aspect-video md:aspect-square bg-black/30 rounded-xl overflow-hidden border border-white/5">
                     {(report.imageURL || report.images?.[0]) ? (
                        <img 
                           src={report.imageURL || report.images[0]} 
                           alt="Issue thumbnail" 
                           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                     ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                           <AlertCircle size={24} className="mb-1 opacity-50" />
                           <span className="text-[10px] uppercase font-bold tracking-wider">No Image</span>
                        </div>
                     )}
                  </div>
               </motion.div>
               ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {selectedIssue && (
         <ComplaintDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
      )}
    </div>
  );
}
