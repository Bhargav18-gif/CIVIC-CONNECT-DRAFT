import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  Sparkles,
  Bell,
  RefreshCw,
  LogOut,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { useDepartment } from '../../context/DepartmentContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function DepartmentSidebar({ counts = {}, isOpen, onClose }) {
  const deptCtx = useDepartment ? (() => { try { return useDepartment(); } catch(_) { return {}; } })() : {};
  const { departmentName } = deptCtx;
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    {
      label: 'Live Operations',
      path: '/department/dashboard',
      icon: LayoutDashboard,
      badge: counts.active || null,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      label: 'Complaint Queue',
      path: '/department/queue',
      icon: Inbox,
      badge: counts.unassigned || null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      label: 'Escalation Center',
      path: '/department/escalations',
      icon: AlertTriangle,
      badge: counts.escalated || null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
    },
    {
      label: 'SLA Health Monitor',
      path: '/department/sla',
      icon: Clock,
      badge: counts.breached || null,
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    },
    {
      label: 'Field Operations Map',
      path: '/department/map',
      icon: MapPin,
    },
    {
      label: 'Resource Manager',
      path: '/department/resources',
      icon: Users,
    },
    {
      label: 'AI Operations Insights',
      path: '/department/insights',
      icon: Sparkles,
      sparkle: true,
    },
    {
      label: 'Dispatch Notifications',
      path: '/department/notifications',
      icon: Bell,
      badge: counts.notifications || null,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
  ];

  return (
    <aside
      className={'fixed inset-y-0 left-0 z-40 w-64 glass backdrop-blur-xl border-r border-white/10 bg-slate-900/95 flex flex-col transition-transform duration-200 lg:translate-x-0 ' + (isOpen ? 'translate-x-0' : '-translate-x-full')}
    >
      <div className='h-16 px-5 flex items-center justify-between border-b border-white/10'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20'>
            <Building2 className='w-5 h-5 text-white' />
          </div>
          <div>
            <h2 className='text-sm font-bold tracking-tight text-white'>CivicOps Command</h2>
            <p className='text-[11px] text-cyan-400 font-medium truncate max-w-[130px]'>
              {departmentName || 'Department Portal'}
            </p>
          </div>
        </div>
      </div>

      <nav className='flex-1 px-3 py-4 space-y-1.5 overflow-y-auto'>
        <div className='px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400'>
          Department Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={'group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ' + (isActive ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-white border border-cyan-500/30 shadow-md shadow-cyan-500/10' : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent')}
            >
              <div className='flex items-center gap-3'>
                <Icon
                  className={'w-4 h-4 transition-colors ' + (isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200') + (item.sparkle ? ' text-amber-400' : '')}
                />
                <span>{item.label}</span>
              </div>

              <div className='flex items-center gap-1.5'>
                {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={'text-[10px] font-bold px-1.5 py-0.5 rounded-full border ' + item.badgeColor}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className='w-3.5 h-3.5 text-cyan-400' />}
              </div>
            </NavLink>
          );
        })}
      </nav>

      <div className='p-3 border-t border-white/10 space-y-2 bg-black/20'>
        <NavLink
          to='/department/select'
          className='w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors'
        >
          <RefreshCw className='w-3.5 h-3.5 text-cyan-400' />
          <span>Switch Department</span>
        </NavLink>

        <div className='flex items-center justify-between px-2 pt-1 text-xs'>
          <div className='truncate max-w-[150px]'>
            <p className='font-medium text-white truncate'>{user?.name || user?.email}</p>
            <p className='text-[10px] text-slate-400 capitalize'>{user?.role || 'Supervisor'}</p>
          </div>
          <button
            onClick={logout}
            title='Sign Out'
            className='p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors'
          >
            <LogOut className='w-4 h-4' />
          </button>
        </div>
      </div>
    </aside>
  );
}
