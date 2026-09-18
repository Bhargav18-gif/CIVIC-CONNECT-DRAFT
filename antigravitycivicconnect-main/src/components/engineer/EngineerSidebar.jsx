import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Navigation, 
  MapPin, 
  Clock, 
  History, 
  Camera, 
  Bell, 
  Award, 
  User, 
  Settings, 
  LogOut,
  X
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext.jsx';

const EngineerSidebar = ({ 
  isOpen, 
  setIsOpen, 
  engineerName, 
  engineerId, 
  status = "Available", // Available, Busy, On Site
  taskCounts = { myTasks: 0, urgent: 0, rework: 0 } 
}) => {
  const { user, logout } = useAuth();
  const displayName = engineerName || user?.name || user?.email || "Field Engineer";
  const displayId = engineerId || user?.uid || user?.id || "FE-UNIT";

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'bg-emerald-500';
      case 'Busy': return 'bg-amber-500';
      case 'On Site': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/engineer/dashboard', icon: LayoutDashboard },
    { 
      name: 'My Tasks', 
      path: '/engineer/tasks', 
      icon: CheckSquare, 
      badge: taskCounts.myTasks, 
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
    },
    { name: 'My Route', path: '/engineer/route', icon: Navigation },
    { name: 'Map', path: '/engineer/map', icon: MapPin },
    { 
      name: 'SLA Alerts', 
      path: '/engineer/sla', 
      icon: Clock, 
      badge: taskCounts.urgent, 
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30' 
    },
    { 
      name: 'Work History', 
      path: '/engineer/history', 
      icon: History,
      badge: taskCounts.rework > 0 ? taskCounts.rework : null,
      badgeColor: 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
    },
    { name: 'Evidence', path: '/engineer/evidence', icon: Camera },
    { name: 'Notifications', path: '/engineer/notifications', icon: Bell },
    { name: 'Performance', path: '/engineer/performance', icon: Award },
    { name: 'Profile', path: '/engineer/profile', icon: User },
    { name: 'Settings', path: '/engineer/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto glass bg-slate-950/80 border-r border-white/10 text-slate-300 flex flex-col h-screen ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header / Branding */}
        <div className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20">
              C
            </div>
            <span className="font-bold text-xl text-white tracking-tight">Civic<span className="text-cyan-400">Connect</span></span>
          </div>
          <button 
            className="lg:hidden p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engineer Status Card */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3 shrink-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-cyan-400 font-semibold">
              {displayName.charAt(0)}
            </div>
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${getStatusColor(status)}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">{displayName}</h2>
            <p className="text-xs text-slate-400 truncate">{displayId}</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <nav className="px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-cyan-500/10 text-cyan-400' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }
                `}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="flex-1">{item.name}</span>
                {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default EngineerSidebar;
