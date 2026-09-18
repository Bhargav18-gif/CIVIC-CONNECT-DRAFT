import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Menu, 
  User, 
  Clock, 
  ChevronDown, 
  Check,
  LogOut,
  MapPin,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDepartment } from '../../context/DepartmentContext.jsx';
import api from '../../utils/api.js';

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available', color: 'bg-emerald-500' },
  { value: 'BUSY', label: 'Busy', color: 'bg-amber-500' },
  { value: 'ON_SITE', label: 'On Site', color: 'bg-cyan-500' },
  { value: 'UNAVAILABLE', label: 'Unavailable', color: 'bg-slate-500' }
];

export default function TopHeader({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const deptCtx = useDepartment ? (() => { try { return useDepartment(); } catch(_) { return {}; } })() : {};
  const { departmentId, departmentName, setActiveDepartment, departments = [], permittedDepartmentIds = [] } = deptCtx;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [engineerStatus, setEngineerStatus] = useState('AVAILABLE');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'New complaint #1024 assigned', time: '5m ago', read: false },
    { id: 2, text: 'Pothole repair verified', time: '1h ago', read: false }
  ]);

  const statusDropdownRef = useRef(null);
  const deptDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) setShowStatusDropdown(false);
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target)) setShowDeptDropdown(false);
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) setShowProfileDropdown(false);
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusChange = async (newStatus) => {
    setEngineerStatus(newStatus);
    setShowStatusDropdown(false);
    try {
      // Mock API call
      await fetch('/api/engineer/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engineerId: user.id, status: newStatus })
      });
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentDept = departments.find(d => (d.departmentId || d.id)?.toLowerCase() === (departmentId || '').toLowerCase()) || { name: departmentName || 'Department' };
  const currentStatusObj = STATUS_OPTIONS.find(s => s.value === engineerStatus);

  const role = (user?.role || '').toLowerCase();
  const isEngineer = role === 'engineer' || role === 'field_engineer' || role === 'field engineer';
  const isDeptUser = role === 'department' || role === 'department_supervisor' || role === 'department_head' || role === 'department_user';
  const roleBadgeColor = isEngineer 
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
    : isDeptUser 
    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    : 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  const roleDisplayTitle = isEngineer 
    ? 'Field Engineer' 
    : isDeptUser 
    ? (user?.role === 'department_head' ? 'Department Head' : 'Department Supervisor')
    : (user?.role || 'Staff');

  const canSwitchDept = (permittedDepartmentIds?.length > 1 || role === 'admin');

  return (
    <header className="sticky top-0 z-50 w-full glass backdrop-blur-xl border-b border-white/10 text-white bg-slate-900/80">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        
        {/* Left: Logo & Menu Toggle */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuToggle}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                CivicConnect
              </h1>
            </div>
          </div>
        </div>

        {/* Center/Right items */}
        <div className="flex items-center gap-3 md:gap-6">
          
          {/* Clock - Desktop Only */}
          <div className="hidden lg:flex items-center gap-2 text-slate-300 text-sm font-medium px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{currentTime.toLocaleDateString()}</span>
            <span className="text-white/40">|</span>
            <span className="tabular-nums">{currentTime.toLocaleTimeString()}</span>
          </div>

          {/* Department Switcher */}
          {canSwitchDept && (
            <div className="relative" ref={deptDropdownRef}>
              <button 
                onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm"
              >
                <span className="text-slate-200">{currentDept?.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              
              {showDeptDropdown && (
                <div className="absolute top-full mt-2 w-56 right-0 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 backdrop-blur-xl">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Department</p>
                  </div>
                  {departments.filter(d => permittedDepartmentIds?.includes(d.departmentId || d.id) || role === 'admin').map(dept => {
                    const deptKey = dept.departmentId || dept.id;
                    const isSelected = deptKey?.toLowerCase() === (departmentId || '').toLowerCase();
                    return (
                      <button
                        key={deptKey}
                        onClick={() => {
                          setActiveDepartment(deptKey);
                          setShowDeptDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center justify-between"
                      >
                        <span className={isSelected ? 'text-white font-medium' : 'text-slate-300'}>
                          {dept.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Role Badge */}
          <div className={`hidden sm:flex px-2.5 py-1 rounded-full border text-xs font-medium tracking-wide ${roleBadgeColor}`}>
            {roleDisplayTitle}
          </div>

          {/* Engineer Status Toggle */}
          {isEngineer && (
            <div className="relative" ref={statusDropdownRef}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${currentStatusObj?.color} shadow-sm ring-2 ring-white/10`} />
                <span className="text-sm font-medium hidden sm:block text-slate-200">{currentStatusObj?.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showStatusDropdown && (
                <div className="absolute top-full mt-2 w-40 right-0 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 backdrop-blur-xl">
                  {STATUS_OPTIONS.map(status => (
                    <button
                      key={status.value}
                      onClick={() => handleStatusChange(status.value)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-3"
                    >
                      <div className={`w-2 h-2 rounded-full ${status.color}`} />
                      <span className={engineerStatus === status.value ? 'text-white font-medium' : 'text-slate-300'}>
                        {status.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="h-6 w-px bg-white/10 hidden sm:block mx-1"></div>

          {/* Notifications */}
          <div className="relative" ref={notifDropdownRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
            >
              <Bell className="w-5 h-5 text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full mt-2 w-80 right-0 md:-right-16 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden backdrop-blur-xl">
                <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-cyan-400 hover:text-cyan-300">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <div key={notif.id} className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${notif.read ? 'opacity-60' : ''}`}>
                        <p className="text-sm text-slate-200">{notif.text}</p>
                        <p className="text-xs text-slate-500 mt-1">{notif.time}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      No new notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 flex items-center justify-center text-sm font-semibold shadow-inner">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {showProfileDropdown && (
              <div className="absolute top-full mt-2 w-56 right-0 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 backdrop-blur-xl">
                <div className="px-4 py-3 border-b border-white/10 mb-1 bg-white/5">
                  <p className="font-medium text-sm text-white truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                  <User className="w-4 h-4" /> Profile Settings
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Preferences
                </button>
                
                <div className="my-1 border-t border-white/10"></div>
                
                <button 
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-white/5 hover:text-rose-300 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
