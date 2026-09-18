import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDepartment } from '../../context/DepartmentContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import TopHeader from '../../components/layout/TopHeader.jsx';
import DepartmentSidebar from '../../components/department/DepartmentSidebar.jsx';
import api from '../../utils/api.js';
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldAlert,
  User,
  MapPin,
  RefreshCw,
  Send,
  RotateCcw,
  PauseCircle,
} from 'lucide-react';

export default function ComplaintDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { departmentId, departmentName } = useDepartment();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [msg, setMsg] = useState(null);

  // Form states
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [escalateReason, setEscalateReason] = useState('');

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const [cRes, eRes] = await Promise.all([
        api.get('/api/complaints/' + id),
        api.get('/api/department/engineers?departmentId=' + (departmentId || 'Roads')),
      ]);
      setComplaint(cRes.data);
      setEngineers(eRes.data?.engineers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id, departmentId]);

  const handleAssign = async () => {
    if (!selectedEngineer) return;
    try {
      const eng = engineers.find(e => (e.id || e.engineerId) === selectedEngineer) || { name: selectedEngineer };
      await api.post('/api/department/tasks/' + id + '/assign', {
        engineerId: selectedEngineer,
        engineerName: eng.name || selectedEngineer,
        supervisorId: user?.uid || 'supervisor',
      });
      setMsg('Assigned successfully!');
      fetchDetails();
    } catch (e) {
      setMsg(e.response?.data?.error || e.message);
    }
  };

  const handleEscalate = async () => {
    if (!escalateReason) return;
    try {
      await api.post('/api/department/tasks/' + id + '/escalate', {
        supervisorId: user?.uid || 'supervisor',
        reason: escalateReason,
      });
      setMsg('Escalated successfully!');
      fetchDetails();
    } catch (e) {
      setMsg(e.response?.data?.error || e.message);
    }
  };

  const handleHold = async () => {
    if (!holdReason) return;
    try {
      await api.post('/api/department/tasks/' + id + '/hold', {
        supervisorId: user?.uid || 'supervisor',
        reason: holdReason,
      });
      setMsg('Placed on hold!');
      fetchDetails();
    } catch (e) {
      setMsg(e.response?.data?.error || e.message);
    }
  };

  const handleReopen = async () => {
    if (!reopenReason) return;
    try {
      await api.post('/api/department/tasks/' + id + '/reopen', {
        supervisorId: user?.uid || 'supervisor',
        reopenReason,
      });
      setMsg('Reopened successfully!');
      fetchDetails();
    } catch (e) {
      setMsg(e.response?.data?.error || e.message);
    }
  };

  const handleApprove = async () => {
    try {
      await api.post('/api/department/tasks/' + id + '/approve', {
        supervisorId: user?.uid || 'supervisor',
        reviewNotes: 'Supervisor verified resolution.',
      });
      setMsg('Approved & Closed successfully!');
      fetchDetails();
    } catch (e) {
      setMsg(e.response?.data?.error || e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        <DepartmentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:pl-64 flex flex-col p-6 space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Complaint Deep Dive #{id}</h1>
              <p className="text-sm text-slate-400">Department Operational Control Center</p>
            </div>
          </div>

          {msg && (
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300">
              {msg}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading task details...</div>
          ) : !complaint ? (
            <div className="py-12 text-center text-slate-400 text-xs">Complaint not found.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Complaint & SLA Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass rounded-2xl p-6 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {complaint.complaintId || complaint.id}
                    </span>
                    <span className="text-xs uppercase font-bold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {complaint.status || complaint.workflowStatus}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white">
                    {complaint.title || complaint.issueDescription || 'Civic Issue'}
                  </h3>

                  <p className="text-sm text-slate-300">
                    {complaint.description || complaint.issueDescription || 'No description provided.'}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                      <span className="text-slate-500">Category</span>
                      <p className="font-medium text-slate-200 mt-0.5">{complaint.category || departmentName}</p>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                      <span className="text-slate-500">Priority</span>
                      <p className="font-medium text-slate-200 mt-0.5 uppercase">{complaint.priority || 'Normal'}</p>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                      <span className="text-slate-500">Assigned Engineer</span>
                      <p className="font-medium text-cyan-300 mt-0.5">
                        {complaint.assignedEngineerId || complaint.assignment?.engineerName || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Recommendation Card */}
                {complaint.assignment?.aiRecommendation && (
                  <div className="glass rounded-2xl p-6 border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-blue-950/20 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      AI Continuous Learning Recommendation
                    </div>
                    <p className="text-xs text-slate-300">
                      Recommended Engineer:{' '}
                      <strong className="text-white">
                        {complaint.assignment.aiRecommendation.recommendedEngineerName ||
                          complaint.assignment.aiRecommendation.recommendedEngineerId}
                      </strong>
                    </p>
                    <p className="text-xs text-slate-400">
                      Rationale: {complaint.assignment.aiRecommendation.reason || 'Optimized match based on skill and proximity.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Supervisor Actions */}
              <div className="space-y-6">
                <div className="glass rounded-2xl p-6 border border-white/10 space-y-4">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">Supervisor Actions</h4>

                  {/* Assign/Reassign */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-300 font-medium">Assign to Engineer</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedEngineer}
                        onChange={(e) => setSelectedEngineer(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200"
                      >
                        <option value="">Select engineer...</option>
                        {engineers.map((eng) => (
                          <option key={eng.id || eng.engineerId} value={eng.id || eng.engineerId}>
                            {eng.name || eng.fullName || eng.engineerId}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssign}
                        className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs transition-colors"
                      >
                        Assign
                      </button>
                    </div>
                  </div>

                  {/* Escalate */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-xs text-slate-300 font-medium">Escalate Task</label>
                    <input
                      type="text"
                      placeholder="Escalation reason..."
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200"
                    />
                    <button
                      onClick={handleEscalate}
                      className="w-full py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                    >
                      Escalate to Department Head
                    </button>
                  </div>

                  {/* Hold */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-xs text-slate-300 font-medium">Put on Hold</label>
                    <input
                      type="text"
                      placeholder="Hold reason (e.g., weather)..."
                      value={holdReason}
                      onChange={(e) => setHoldReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200"
                    />
                    <button
                      onClick={handleHold}
                      className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                    >
                      Place on Hold
                    </button>
                  </div>

                  {/* Approve */}
                  <div className="pt-2 border-t border-white/5">
                    <button
                      onClick={handleApprove}
                      className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Approve & Close Task
                    </button>
                  </div>

                  {/* Reopen */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-xs text-slate-300 font-medium">Reopen Complaint</label>
                    <input
                      type="text"
                      placeholder="Reopening reason..."
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200"
                    />
                    <button
                      onClick={handleReopen}
                      className="w-full py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
                    >
                      Reopen Complaint
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
