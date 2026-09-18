import { useEffect, useState } from "react";
import Sidebar from "../../components/admin/Sidebar.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import ComplaintDetailsModal from "../../components/admin/ComplaintDetailsModal.jsx";
import ComplaintTable from "../../components/admin/ComplaintTable.jsx";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.js";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import Header from "../../components/admin/Header.jsx";

const CATEGORIES = ["Roads", "Water", "Electricity", "Garbage", "Drainage", "Health", "Transport", "Public Safety"];

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [evidenceFilter, setEvidenceFilter] = useState("all");
  const [supervisionFilter, setSupervisionFilter] = useState("all");
  const [selectedIssue, setSelectedIssue] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "complaints"),
      (snapshot) => {
        const fetchedComplaints = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            referenceId: data.complaintId || doc.id,
            title: data.issueTitle || "Untitled",
            description: data.issueDescription || "",
            status: data.status ? data.status.toLowerCase() : "pending",
            category: data.category || "Unknown",
            priority: data.priority || "normal",
            createdAt: data.createdAt || new Date().toISOString(),
            userEmail: data.userEmail || "",
            userName: data.userName || "",
            location: data.location || null,
            imageURL: data.imageURL || null
          };
        });
        
        fetchedComplaints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setComplaints(fetchedComplaints);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching complaints:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleIssueUpdate = (updatedIssue) => {
    if (selectedIssue && selectedIssue.referenceId === updatedIssue.referenceId) {
      setSelectedIssue(updatedIssue);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      c.referenceId.toLowerCase().includes(searchLower) ||
      c.title.toLowerCase().includes(searchLower) ||
      (c.userName && c.userName.toLowerCase().includes(searchLower)) ||
      (c.category && c.category.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    const matchesPriority = priorityFilter === "all" || c.priority === priorityFilter;
    
    let matchesEvidence = true;
    if (evidenceFilter === "reopened") {
      matchesEvidence = c.history?.some(h => h.action.includes("Reopened")) || false;
    } else if (evidenceFilter === "pending-verification") {
      matchesEvidence = c.status === "resolved" && (!c.citizenVerificationPhotos || c.citizenVerificationPhotos.length === 0);
    } else if (evidenceFilter === "with-verification") {
      matchesEvidence = c.citizenVerificationPhotos && c.citizenVerificationPhotos.length > 0;
    } else if (evidenceFilter === "without-feedback") {
      matchesEvidence = c.status === "resolved" && !c.feedback;
    }

    let matchesSupervision = true;
    if (supervisionFilter === "exceptions") {
      matchesSupervision = c.supervision?.requiresAdmin === true || c.status === "pending review";
    } else if (supervisionFilter === "auto") {
      matchesSupervision = c.ai?.automationMode === "AUTO" || c.status === "assigned";
    } else if (supervisionFilter === "duplicates") {
      matchesSupervision = c.ai?.duplicate?.isDuplicate || c.ai?.duplicate?.isPotentialDuplicate || false;
    } else if (supervisionFilter === "reopened") {
      matchesSupervision = c.status === "reopened";
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesEvidence && matchesSupervision;
  });

  return (
    <div className="min-h-screen flex bg-slate-950">
      <Sidebar />

      <main className="flex-1 p-6 sm:p-10 lg:pl-10 lg:pr-10 lg:py-10 max-w-[1400px] mt-16 lg:mt-0 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Header
            title="Civic Complaints"
            description="Inspect, update, and manage citizen-submitted issues."
          />

          {/* Quick AI Supervision Mode Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSupervisionFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                supervisionFilter === "all"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-white/5 text-slate-400 border border-white/5 hover:text-white"
              }`}
            >
              All Complaints ({complaints.length})
            </button>
            <button
              onClick={() => setSupervisionFilter("exceptions")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                supervisionFilter === "exceptions"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10"
                  : "bg-white/5 text-amber-400/70 border border-white/5 hover:text-amber-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Awaiting Supervisor Review ({complaints.filter(c => c.supervision?.requiresAdmin === true || c.status === "pending review").length})
            </button>
            <button
              onClick={() => setSupervisionFilter("auto")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                supervisionFilter === "auto"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-white/5 text-emerald-400/70 border border-white/5 hover:text-emerald-300"
              }`}
            >
              AI Auto-Approved ({complaints.filter(c => c.ai?.automationMode === "AUTO" || c.status === "assigned").length})
            </button>
            <button
              onClick={() => setSupervisionFilter("duplicates")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                supervisionFilter === "duplicates"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "bg-white/5 text-purple-400/70 border border-white/5 hover:text-purple-300"
              }`}
            >
              Duplicate Flags ({complaints.filter(c => c.ai?.duplicate?.isDuplicate || c.ai?.duplicate?.isPotentialDuplicate).length})
            </button>
            <button
              onClick={() => setSupervisionFilter("reopened")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                supervisionFilter === "reopened"
                  ? "bg-red-500/20 text-red-300 border border-red-500/40"
                  : "bg-white/5 text-red-400/70 border border-white/5 hover:text-red-300"
              }`}
            >
              Citizen Reopened ({complaints.filter(c => c.status === "reopened").length})
            </button>
          </div>

          <div className="glass rounded-3xl p-5 mb-8 border border-white/5 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by ID or title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:w-[600px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl py-3 px-3 text-xs text-white focus:outline-none focus:border-cyan-400/50 transition-colors [&>option]:bg-[#101826] cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending review">Pending Review (AI)</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                  <option value="reopened">Reopened</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl py-3 px-3 text-xs text-white focus:outline-none focus:border-cyan-400/50 transition-colors [&>option]:bg-[#101826] cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl py-3 px-3 text-xs text-white focus:outline-none focus:border-cyan-400/50 transition-colors [&>option]:bg-[#101826] cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
                
                <select
                  value={evidenceFilter}
                  onChange={(e) => setEvidenceFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl py-3 px-3 text-xs text-white focus:outline-none focus:border-cyan-400/50 transition-colors [&>option]:bg-[#101826] cursor-pointer"
                >
                  <option value="all">Evidence: All</option>
                  <option value="reopened">Reopened</option>
                  <option value="pending-verification">Pending Verification</option>
                  <option value="with-verification">With Verification</option>
                  <option value="without-feedback">Without Feedback</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="glass rounded-3xl p-16 text-center border border-white/5">
              <p className="text-slate-400 text-sm">No complaints matching your criteria found.</p>
            </div>
          ) : (
            <ComplaintTable complaints={filteredComplaints} onSelectIssue={setSelectedIssue} />
          )}

          <AnimatePresence>
            {selectedIssue && (
              <ComplaintDetailsModal
                issue={selectedIssue}
                onClose={() => setSelectedIssue(null)}
                onUpdate={handleIssueUpdate}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}