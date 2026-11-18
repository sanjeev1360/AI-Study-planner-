import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  ListTree,
  Sparkles,
  CalendarDays,
  FileCheck2,
  TrendingUp,
  Settings,
  GraduationCap,
  LogOut,
  X,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ActiveTab =
  | 'dashboard'
  | 'subjects'
  | 'topics'
  | 'generate'
  | 'timetable'
  | 'assignments'
  | 'progress'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
}) => {
  const { user, logout, isDemoUser } = useAuth();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subjects', label: 'My Subjects', icon: BookOpen },
    { id: 'topics', label: 'Topic Management', icon: ListTree },
    { id: 'generate', label: 'Generate Study Plan', icon: Sparkles, badge: 'AI Engine' },
    { id: 'timetable', label: 'My Timetable', icon: CalendarDays },
    { id: 'assignments', label: 'Assignments & Deadlines', icon: FileCheck2 },
    { id: 'progress', label: 'Progress Reports', icon: TrendingUp },
    { id: 'settings', label: 'Profile & Preferences', icon: Settings },
  ];

  const handleSelect = (id: ActiveTab) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex h-18 items-center justify-between px-6 border-b border-slate-100 bg-linear-to-r from-blue-50/50 via-purple-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                AI Study Planner
              </span>
              <span className="block text-[11px] font-medium text-slate-500">
                Academic SESD Portal
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Student card info */}
        {user && (
          <div className="p-4 mx-3 my-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-linear-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {user.full_name
                  ? user.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'ST'}
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-800 truncate">{user.full_name}</p>
                  {isDemoUser && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                      Demo
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{user.major || 'College Student'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 px-3 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer with logout and quick credentials status */}
        <div className="border-t border-slate-100 p-4 space-y-2">
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5 text-slate-400 group-hover:text-rose-600" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
