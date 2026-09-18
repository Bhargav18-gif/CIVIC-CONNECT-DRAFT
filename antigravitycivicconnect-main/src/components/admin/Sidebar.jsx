import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  LogOut,
  Menu,
  X
} from "lucide-react";
import Logo from "../ui/Logo.jsx";

const NAV_ITEMS = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/complaints", label: "Complaints", icon: ClipboardList },
  { path: "/admin/users", label: "Users", icon: Users },
];

export default function Sidebar() {
  const [adminUser, setAdminUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem("cc_admin_user");
    if (userStr) {
      try {
        setAdminUser(JSON.parse(userStr));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("cc_admin_user");
    localStorage.removeItem("cc_admin_token");
    navigate("/admin/login");
  }

  const sidebarContent = (
    <>
      <div className="mb-10 px-1 flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => navigate("/")}>
          <Logo size={28} />
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-3 mb-6 bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 py-1.5 rounded-full text-center text-[10px] font-bold tracking-wider uppercase">
        Admin Portal
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium text-sm ${
                isActive
                  ? "bg-cyan-500/20 text-white shadow-[0_0_15px_-3px_rgba(34,211,238,0.25)] border-l-2 border-cyan-400"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 pt-5 mt-auto">
        <div className="flex items-center gap-3 px-2 mb-5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            {adminUser?.name?.[0] || "A"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{adminUser?.name || "Admin"}</p>
            <p className="text-xs text-slate-400 truncate">{adminUser?.email || "admin@civicconnect.com"}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-medium text-sm"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden w-full h-16 glass border-b border-white/5 fixed top-0 left-0 px-6 flex items-center justify-between z-40">
        <div className="cursor-pointer" onClick={() => navigate("/")}>
          <Logo size={24} />
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="text-slate-400 hover:text-white focus:outline-none transition-colors"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 glass border-r border-white/5 px-5 py-7">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-45"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 w-64 h-full bg-[#0a0f1d] border-r border-white/10 px-5 py-7 flex flex-col z-50 transition-transform duration-350 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}