import { useEffect, useState } from "react";
import Sidebar from "../../components/admin/Sidebar.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Activity, X } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";

const DEPARTMENTS = [
  "Roads", "Water", "Electricity", "Sanitation", 
  "Drainage", "Traffic", "Public Health", "Municipal Services"
];

const ROLES = [
  { id: "citizen", label: "Citizen" },
  { id: "department_supervisor", label: "Department Supervisor" },
  { id: "department_head", label: "Department Head" },
  { id: "department_user", label: "Department User" },
  { id: "engineer", label: "Field Engineer" },
  { id: "admin", label: "System Admin" }
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [roleFilter, setRoleFilter] = useState("All Roles");

  // Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("citizen");
  const [editDeptId, setEditDeptId] = useState("");
  const [editAllowedDepts, setEditAllowedDepts] = useState([]);
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingUsers(true);
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      fetchedUsers.sort((a, b) => new Date(b.joinedAt || b.lastLoginAt) - new Date(a.joinedAt || a.lastLoginAt));
      setUsers(fetchedUsers);
      setLoadingUsers(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoadingUsers(false);
    });

    setLoadingComplaints(true);
    const unsubscribeComplaints = onSnapshot(collection(db, "complaints"), (snapshot) => {
      const fetchedComplaints = snapshot.docs.map(doc => ({
        userEmail: doc.data().userEmail || ""
      }));
      setComplaints(fetchedComplaints);
      setLoadingComplaints(false);
    }, (error) => {
      console.error("Error fetching complaints for user stats:", error);
      setLoadingComplaints(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeComplaints();
    };
  }, []);

  const combinedUsers = users.map(user => {
    const reportsCount = complaints.filter(c => c.userEmail && c.userEmail.toLowerCase() === user.email.toLowerCase()).length;
    return { ...user, reportsCount };
  });

  const userEmails = combinedUsers.map(u => u.email.toLowerCase());
  const missingUsers = [];
  complaints.forEach(c => {
    if (c.userEmail && !userEmails.includes(c.userEmail.toLowerCase())) {
      if (!missingUsers.find(mu => mu.email.toLowerCase() === c.userEmail.toLowerCase())) {
        missingUsers.push({
          id: `derived-${c.userEmail}`,
          name: c.userName || "Unknown Citizen",
          email: c.userEmail,
          joinedAt: null,
          lastLoginAt: null,
          role: "citizen",
          active: true
        });
      }
    }
  });

  missingUsers.forEach(mu => {
    mu.reportsCount = complaints.filter(c => c.userEmail && c.userEmail.toLowerCase() === mu.email.toLowerCase()).length;
    combinedUsers.push(mu);
  });

  const mockUsers = JSON.parse(localStorage.getItem("cc_users") || "[]");
  mockUsers.forEach(mu => {
    if (!combinedUsers.find(u => u.email.toLowerCase() === mu.email.toLowerCase())) {
      const liveReports = complaints.filter(c => c.userEmail && c.userEmail.toLowerCase() === mu.email.toLowerCase()).length;
      combinedUsers.push({
        ...mu,
        reportsCount: liveReports > 0 ? liveReports : mu.reportsCount,
        lastLoginAt: mu.lastLoginAt || null,
        role: mu.role || "citizen",
        active: mu.active !== false
      });
    }
  });

  const filteredUsers = combinedUsers.filter((u) => {
    const matchesSearch = (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
                          (u.email && u.email.toLowerCase().includes(search.toLowerCase()));
    
    const uRole = u.role || "citizen";
    const matchesRole = roleFilter === "All Roles" || 
                        (roleFilter.toLowerCase() === "department" ? uRole.includes("department") : uRole === roleFilter.toLowerCase());
    
    const uDept = u.departmentName || "None";
    const matchesDept = departmentFilter === "All Departments" || uDept === departmentFilter;

    return matchesSearch && matchesRole && matchesDept;
  });
  
  filteredUsers.sort((a, b) => new Date(b.lastLoginAt || b.joinedAt || 0) - new Date(a.lastLoginAt || a.joinedAt || 0));

  const loading = loadingUsers || loadingComplaints;

  const openManageModal = (user) => {
    setEditingUser(user);
    setEditRole(user.role || "citizen");
    setEditDeptId(user.departmentName || "");
    setEditAllowedDepts(user.allowedDepartmentIds || []);
    setEditActive(user.active !== false);
  };

  const closeManageModal = () => {
    setEditingUser(null);
  };

  const handleAllowedDeptToggle = (dept) => {
    setEditAllowedDepts(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const handleResetDepartment = () => {
    setEditRole("citizen");
    setEditDeptId("");
    setEditAllowedDepts([]);
    setEditActive(true);
  };

  const handleSaveChanges = async () => {
    if (!editingUser) return;
    setSaving(true);
    
    const payload = {
      role: editRole,
      departmentId: editDeptId.toLowerCase().replace(/\s+/g, '_'),
      departmentName: editDeptId,
      allowedDepartmentIds: editAllowedDepts,
      active: editActive,
      updatedAt: new Date().toISOString()
    };

    try {
      if (!editingUser.id.startsWith("derived-") && !editingUser.id.startsWith("mock-")) {
        const userRef = doc(db, "users", editingUser.id);
        await updateDoc(userRef, payload);
      } else {
        // Fallback for mock users
        const existingMock = JSON.parse(localStorage.getItem("cc_users") || "[]");
        const updatedMock = existingMock.map(u => u.id === editingUser.id ? { ...u, ...payload } : u);
        localStorage.setItem("cc_users", JSON.stringify(updatedMock));
      }

      try {
        await fetch("/api/admin/users/" + editingUser.id + "/department", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.log("Server API call failed, continuing with Firestore update", e);
      }

      closeManageModal();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      <Sidebar />

      <main className="flex-1 p-6 sm:p-10 lg:pl-10 lg:pr-10 lg:py-10 max-w-[1400px] mt-16 lg:mt-0 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold font-display text-white tracking-tight">
                User Management
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage citizens, department staff, and platform access.
              </p>
            </div>
            <div className="glass px-4 py-2 rounded-xl text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 flex items-center gap-2 self-start sm:self-auto select-none">
              <Activity size={16} className="animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider">Live Sync</span>
            </div>
          </div>

          <div className="glass rounded-3xl p-5 mb-8 border border-white/5 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-slate-300 focus:outline-none focus:border-cyan-400/50 transition-colors"
              >
                <option value="All Departments">All Departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-slate-300 focus:outline-none focus:border-cyan-400/50 transition-colors"
              >
                <option value="All Roles">All Roles</option>
                <option value="Citizen">Citizen</option>
                <option value="Department">Department (Any)</option>
                <option value="Engineer">Engineer</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="glass rounded-3xl p-16 text-center border border-white/5">
              <p className="text-slate-400 text-sm">No users matching your criteria found.</p>
            </div>
          ) : (
            <div className="glass rounded-3xl overflow-hidden border border-white/5 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role & Status</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Department Info</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Reports</th>
                      <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.01] transition-all">
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 font-bold text-sm shrink-0">
                              {(u.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-200">{u.name}</span>
                              <span className="text-xs text-slate-400">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4.5 px-6">
                          <div className="flex flex-col items-start gap-2">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              {(u.role || "citizen").replace(/_/g, " ")}
                            </span>
                            {u.active !== false ? (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                              </span>
                            ) : (
                              <span className="text-[10px] text-red-400 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400" /> Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4.5 px-6">
                          <div className="flex flex-col gap-1.5">
                            {u.departmentName && u.departmentName !== "None" ? (
                              <span className="text-xs text-cyan-300 font-medium">
                                {u.departmentName}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 italic">No Primary Dept</span>
                            )}
                            
                            {u.allowedDepartmentIds && u.allowedDepartmentIds.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {u.allowedDepartmentIds.map(dept => (
                                  <span key={dept} className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 border border-white/10 text-slate-400">
                                    {dept}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4.5 px-6">
                           <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-[11px] text-slate-300">
                            {u.reportsCount} Reports
                          </span>
                        </td>
                        <td className="py-4.5 px-6 text-right">
                           <button
                            onClick={() => openManageModal(u)}
                            className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold hover:bg-cyan-500/20 transition-all cursor-pointer"
                          >
                            Manage Dept
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Manage Department Modal */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-w-lg w-full rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Manage Department</h3>
                  <p className="text-xs text-slate-400 mt-1">Updating roles for {editingUser.name}</p>
                </div>
                <button onClick={closeManageModal} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  >
                    {ROLES.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Primary Department
                  </label>
                  <select
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  >
                    <option value="">None</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Allowed Departments
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {DEPARTMENTS.map(d => (
                      <label key={d} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          editAllowedDepts.includes(d) ? "bg-cyan-500 border-cyan-500" : "bg-slate-900 border-white/10 group-hover:border-white/20"
                        }`}>
                          {editAllowedDepts.includes(d) && <X size={12} className="text-slate-950 rotate-45" />}
                        </div>
                        <span className="text-sm text-slate-300">{d}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">Account Status</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Toggle user access to the platform</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
              
              <div className="p-6 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
                <button
                  onClick={handleResetDepartment}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Reset
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={closeManageModal}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && <div className="w-4 h-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}