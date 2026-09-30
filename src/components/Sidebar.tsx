import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  Layers, 
  CheckSquare, 
  TrendingUp, 
  GitPullRequest, 
  Building2, 
  Users, 
  Calendar, 
  FileSpreadsheet, 
  ShieldAlert, 
  Clock,
  X,
  Smartphone,
  Sparkles,
  Lock,
  Eye,
  ShieldCheck,
  ChevronRight,
  Info,
  Mic,
  MessageSquare
} from 'lucide-react';
import { Language, User, NavTab } from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';
import { 
  canRoleAccessTab, 
  ROLE_DEFINITIONS, 
  getAllowedTabsForRole, 
  MENU_RBAC_POLICY,
  getRoleAccessTier
} from '../services/rbac';
import { PWAInstallButton } from './PWAInstallButton';

export type { NavTab };

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  lang: Language;
  currentUser: User;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenRbacMatrix?: () => void;
  onOpenVoiceAssistant?: () => void;
  onOpenFeedback?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  lang,
  currentUser,
  isOpenMobile,
  onCloseMobile,
  onOpenRbacMatrix,
  onOpenVoiceAssistant,
  onOpenFeedback,
}) => {
  const t = translations[lang];
  const [showLockedItems, setShowLockedItems] = useState(false);
  const [restrictedTooltip, setRestrictedTooltip] = useState<string | null>(null);

  // Dynamic badge counts
  const allPlans = db.getPlans();
  const pendingApprovalsCount = allPlans.filter(p => p.approvalStatus === 'Pending Review' || p.approvalStatus === 'Pending Completion').length;
  const overdueCount = allPlans.filter(p => new Date(p.dueDate) < new Date() && p.status !== 'Completed').length;
  const todayAtt = db.getTodayAttendance(currentUser.id);
  const isClockedIn = todayAtt && todayAtt.checkInTime && !todayAtt.checkOutTime;

  const roleMeta = ROLE_DEFINITIONS[currentUser.role];
  const allowedTabs = getAllowedTabsForRole(currentUser.role);

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number; badgeColor?: string }[] = [
    { 
      id: 'employee-hub', 
      label: lang === 'km' ? 'មជ្ឈមណ្ឌលបុគ្គលិក (ទូរស័ព្ទ)' : 'Employee Hub (Mobile)', 
      icon: Smartphone,
      badge: lang === 'km' ? 'ផ្ដោត' : 'Focus',
      badgeColor: 'bg-blue-600 text-white'
    },
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { 
      id: 'attendance', 
      label: t.attendance || 'Attendance & Time', 
      icon: Clock, 
      badge: isClockedIn ? (lang === 'km' ? 'ចូល' : 'In') : undefined, 
      badgeColor: 'bg-emerald-500 text-white' 
    },
    { id: 'action-plans', label: t.actionPlans, icon: Layers, badge: overdueCount > 0 ? overdueCount : undefined, badgeColor: 'bg-rose-500 text-white' },
    { id: 'activities', label: t.activities, icon: CheckSquare },
    { id: 'progress', label: t.progressTracking, icon: TrendingUp },
    { id: 'approvals', label: t.approvalWorkflow, icon: GitPullRequest, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined, badgeColor: 'bg-amber-500 text-white' },
    { id: 'objectives', label: t.objectives, icon: Target },
    { id: 'calendar-gantt', label: t.calendarGantt, icon: Calendar },
    { id: 'reports', label: t.reports, icon: FileSpreadsheet },
    { id: 'departments', label: t.departments, icon: Building2 },
    { id: 'employees', label: t.employees, icon: Users },
    { id: 'audit-logs', label: t.auditLogs, icon: ShieldAlert },
  ];

  const handleItemClick = (tabId: NavTab, isAllowed: boolean, isMobileView: boolean) => {
    if (!isAllowed) {
      const rule = MENU_RBAC_POLICY[tabId];
      const msg = lang === 'km'
        ? `ត្រូវបានកម្រិត៖ '${rule?.title || tabId}' តម្រូវឱ្យមានសិទ្ធិ [${rule?.allowedRoles.join(', ')}]។ តួនាទីបច្ចុប្បន្ន៖ ${currentUser.role}។`
        : `Restricted: '${rule?.title || tabId}' requires [${rule?.allowedRoles.join(', ')}]. Active role: ${currentUser.role}.`;
      setRestrictedTooltip(msg);
      setTimeout(() => setRestrictedTooltip(null), 4000);
      return;
    }

    onTabChange(tabId);
    if (isMobileView && onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderNavList = (isMobileView = false) => (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Role Access Indicator Card - Hidden for Employee role */}
      {currentUser.role !== 'Employee' && (
        <div className="px-3 pt-3 pb-2">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 truncate">
                <span className={`w-2 h-2 rounded-full ${roleMeta ? 'bg-blue-400' : 'bg-slate-400'}`} />
                <span className="font-bold text-white truncate">{currentUser.role}</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                {allowedTabs.length}/13
              </span>
            </div>

            <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
              {getRoleAccessTier(currentUser.role, lang) || roleMeta?.accessTier || 'Active Role Tier'}
            </div>

            {onOpenRbacMatrix && (
              <button
                onClick={onOpenRbacMatrix}
                className="mt-2 w-full py-1 px-2 rounded-lg bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white transition text-[11px] font-semibold flex items-center justify-center space-x-1 border border-slate-600/40"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>{lang === 'km' ? 'ពិនិត្យតារាងសិទ្ធិ RBAC' : 'Inspect RBAC Matrix'}</span>
              </button>
            )}
          </div>

          {/* Restricted Items Visibility Toggle */}
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-slate-400">
            <span>{lang === 'km' ? `បង្ហាញផ្ទាំងចាក់សោ (${13 - allowedTabs.length})` : `Show Locked (${13 - allowedTabs.length})`}</span>
            <button
              onClick={() => setShowLockedItems(!showLockedItems)}
              className={`w-7 h-4 rounded-full transition-colors relative flex items-center ${
                showLockedItems ? 'bg-blue-600' : 'bg-slate-700'
              }`}
              title={lang === 'km' ? 'បិទ/បើកការបង្ហាញផ្ទាំងម៉ឺនុយដែលគ្មានសិទ្ធិ' : 'Toggle visibility of unpermitted menu items'}
            >
              <div 
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  showLockedItems ? 'translate-x-3.5' : 'translate-x-0.5'
                }`} 
              />
            </button>
          </div>
        </div>
      )}

      {/* Restricted Alert Banner (if clicked on locked item) */}
      {restrictedTooltip && (
        <div className="mx-3 my-1 p-2 rounded-lg bg-rose-950/80 border border-rose-800 text-[11px] text-rose-200 animate-in fade-in flex items-start space-x-1.5">
          <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-tight">{restrictedTooltip}</div>
        </div>
      )}

      {/* Nav Items List */}
      <nav className="px-3 py-1 space-y-1">
        {navItems.map(item => {
          const isAllowed = canRoleAccessTab(currentUser.role, item.id);
          if (!isAllowed && !showLockedItems) {
            return null;
          }

          const Icon = item.icon;
          const isActive = currentTab === item.id;

          if (!isAllowed) {
            // Locked Item Render (Strategy 6 UI Transparency)
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id, false, isMobileView)}
                className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-400 hover:bg-slate-800/40 transition opacity-60 border border-transparent hover:border-slate-800"
                title={lang === 'km' ? `ការចូលប្រើត្រូវបានកម្រិតសម្រាប់ ${currentUser.role}` : `Access Restricted for ${currentUser.role}`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                    {lang === 'km' ? 'ចាក់សោ' : 'Locked'}
                  </span>
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id, true, isMobileView)}
              className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-xs font-semibold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${item.badgeColor || 'bg-slate-700 text-slate-200'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (lg and above) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 no-print min-h-[calc(100vh-4rem)] border-r border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            {lang === 'km' ? 'ការរុករក' : 'Navigation'}
          </div>
          <span className="text-[10px] text-blue-400 font-bold bg-blue-950 px-1.5 py-0.5 rounded border border-blue-900">
            RBAC Guard
          </span>
        </div>
        {renderNavList(false)}

        {/* PWA Install Action */}
        <div className="p-3 border-t border-slate-800">
          <PWAInstallButton variant="sidebar" label={lang === 'km' ? 'ដំឡើង PWA App' : 'Install PWA App'} />
        </div>

        {/* Footer System Status */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{lang === 'km' ? 'ប្រព័ន្ធដំណើរការធម្មតា' : 'System Online'}</span>
            </span>
            <span className="font-mono text-slate-400">APMS v1.0</span>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (screens below lg) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-out Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  AP
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold text-white leading-tight">
                    {lang === 'km' ? 'ម៉ឺនុយរុករក' : 'Navigation Menu'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                    {currentUser.name}
                  </div>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-hidden"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavList(true)}

            {/* PWA Install in Mobile Drawer */}
            <div className="p-3 border-t border-slate-800">
              <PWAInstallButton variant="sidebar" label={lang === 'km' ? 'ដំឡើង PWA App លើទូរស័ព្ទ' : 'Install App to Home Screen'} />
            </div>

            {/* Quick Mobile Drawer Tools */}
            {(onOpenVoiceAssistant || onOpenFeedback) && (
              <div className="p-3 border-t border-slate-800 bg-slate-950/30 flex items-center space-x-2">
                {onOpenVoiceAssistant && (
                  <button
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                      onOpenVoiceAssistant();
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 text-xs font-semibold transition"
                  >
                    <Mic className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{lang === 'km' ? 'បញ្ជាសំឡេង' : 'Voice AI'}</span>
                  </button>
                )}
                {onOpenFeedback && (
                  <button
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                      onOpenFeedback();
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                    <span>{lang === 'km' ? 'មតិកែលម្អ' : 'Feedback'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Footer System Status in Mobile Drawer */}
            <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/50">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{lang === 'km' ? 'ប្រព័ន្ធដំណើរការធម្មតា' : 'System Online'}</span>
                </span>
                <span className="font-mono text-slate-400 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
