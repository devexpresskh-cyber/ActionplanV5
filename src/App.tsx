import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  Layers, 
  GitPullRequest, 
  Menu,
  Smartphone,
  Sparkles,
  Plus,
  Search,
  MessageSquare,
  HelpCircle,
  CheckCircle2,
  Calendar,
  CheckSquare
} from 'lucide-react';
import { User, Language, NavTab } from './types';
import { db } from './services/db';
import { canRoleAccessTab, getDefaultTabForRole, MENU_RBAC_POLICY } from './services/rbac';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { EmployeeHubView } from './components/EmployeeHubView';
import { ActionPlansView } from './components/ActionPlansView';
import { ActivitiesView } from './components/ActivitiesView';
import { CalendarGanttView } from './components/CalendarGanttView';
import { ReportsView } from './components/ReportsView';
import { DepartmentsEmployeesView } from './components/DepartmentsEmployeesView';
import { ObjectivesView } from './components/ObjectivesView';
import { AuditLogsView } from './components/AuditLogsView';
import { AttendanceView } from './components/AttendanceView';
import { AuthPortal } from './components/AuthPortal';
import { UserProfileModal } from './components/UserProfileModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { FeedbackModal } from './components/FeedbackModal';
import { HelpSupportModal } from './components/HelpSupportModal';
import { QuickRequestModal } from './components/QuickRequestModal';
import { AccessDeniedView } from './components/AccessDeniedView';
import { RbacPermissionsModal } from './components/RbacPermissionsModal';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { WebPushNotificationModal } from './components/WebPushNotificationModal';
import { webPushService } from './services/webPushService';
import { checkAndRunScheduledAlerts } from './services/telegramService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => db.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => db.isAuthenticated());
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [lang, setLang] = useState<Language>('en');
  const [currentTab, setCurrentTab] = useState<NavTab>(() => getDefaultTabForRole(db.getCurrentUser().role));
  const [unauthorizedAttemptTab, setUnauthorizedAttemptTab] = useState<NavTab | null>(null);
  const [targetPlanId, setTargetPlanId] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [showRbacMatrixModal, setShowRbacMatrixModal] = useState<boolean>(false);

  // Mobile experience & voice modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState<boolean>(false);
  const [isWebPushModalOpen, setIsWebPushModalOpen] = useState<boolean>(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isQuickRequestModalOpen, setIsQuickRequestModalOpen] = useState<boolean>(false);
  const [quickRequestType, setQuickRequestType] = useState<'task_update' | 'shift_adjust' | 'leave_request'>('task_update');
  const [globalToast, setGlobalToast] = useState<string | null>(null);
  const [planRefreshKey, setPlanRefreshKey] = useState<number>(0);
  const [autoOpenPlanCreate, setAutoOpenPlanCreate] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setGlobalToast(msg);
    setTimeout(() => setGlobalToast(null), 3500);
  };

  // Safe tab change function with RBAC enforcement and audit logging
  const handleSafeTabChange = (targetTab: NavTab, source: string = 'Navigation') => {
    if (canRoleAccessTab(currentUser.role, targetTab)) {
      setUnauthorizedAttemptTab(null);
      setCurrentTab(targetTab);
      if (targetTab !== 'action-plans') setTargetPlanId(null);
      window.location.hash = targetTab;
      db.logMenuAccess(currentUser, targetTab);
    } else {
      setUnauthorizedAttemptTab(targetTab);
      db.logUnauthorizedAccess(currentUser, targetTab, source);
      showToast(`Access Restricted: [${targetTab}] requires elevated permissions.`);
    }
    setIsMobileNavOpen(false);
  };

  // Global keyboard shortcuts: Ctrl+K for Search, Ctrl+M for Voice Assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsVoiceAssistantOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync with URL Hash and prevent unauthorized direct URL manipulation
  useEffect(() => {
    const checkHash = () => {
      const rawHash = (window.location.hash || '').replace('#', '') as NavTab;
      if (rawHash && MENU_RBAC_POLICY[rawHash]) {
        if (canRoleAccessTab(currentUser.role, rawHash)) {
          setCurrentTab(rawHash);
          setUnauthorizedAttemptTab(null);
        } else {
          setUnauthorizedAttemptTab(rawHash);
          db.logUnauthorizedAccess(currentUser, rawHash, 'Direct URL Hash Navigation');
        }
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [currentUser]);

  // Automated background scheduler for advance pre-shift Telegram alerts
  useEffect(() => {
    // Initial check on load
    checkAndRunScheduledAlerts(lang);

    // Periodically run check every 60 seconds
    const interval = setInterval(() => {
      checkAndRunScheduledAlerts(lang);
    }, 60000);

    return () => clearInterval(interval);
  }, [lang]);

  // Automated background scheduler for Web Push shift check-in and checkout alerts
  useEffect(() => {
    const runShiftCheck = () => {
      const todayAtt = db.getTodayAttendance(currentUser.id);
      webPushService.checkAndRunShiftScheduleAlerts(currentUser, todayAtt);
    };
    runShiftCheck();
    const interval = setInterval(runShiftCheck, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Safe User & Role Switch
  const handleUserChange = (newUser: User) => {
    setCurrentUser(newUser);
    // If the active currentTab is forbidden for the new user, fallback safely
    if (!canRoleAccessTab(newUser.role, currentTab)) {
      const defaultTab = getDefaultTabForRole(newUser.role);
      setCurrentTab(defaultTab);
      window.location.hash = defaultTab;
      setUnauthorizedAttemptTab(null);
    } else if (unauthorizedAttemptTab && canRoleAccessTab(newUser.role, unauthorizedAttemptTab)) {
      setCurrentTab(unauthorizedAttemptTab);
      setUnauthorizedAttemptTab(null);
    }
  };

  const handleResetData = () => {
    db.resetToInitialData();
    const freshUser = db.getCurrentUser();
    setCurrentUser(freshUser);
    setIsAuthenticated(true);
    setCurrentTab(getDefaultTabForRole(freshUser.role));
    setUnauthorizedAttemptTab(null);
    window.location.hash = getDefaultTabForRole(freshUser.role);
  };

  const handleLogout = () => {
    db.logout();
    setIsAuthenticated(false);
  };

  const handleNavigatePlan = (planId: string) => {
    setTargetPlanId(planId);
    handleSafeTabChange('action-plans', 'Plan Link Navigation');
  };

  if (!isAuthenticated) {
    return (
      <AuthPortal
        lang={lang}
        onLanguageChange={l => setLang(l)}
        onLoginSuccess={user => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          setCurrentTab(getDefaultTabForRole(user.role));
          setUnauthorizedAttemptTab(null);
        }}
      />
    );
  }

  // Attendance and approval badge indicators
  const todayAtt = db.getTodayAttendance(currentUser.id);
  const isClockedIn = todayAtt && todayAtt.checkInTime && !todayAtt.checkOutTime;

  // Active view evaluation
  const isAccessDenied = unauthorizedAttemptTab !== null || !canRoleAccessTab(currentUser.role, currentTab);
  const activeAttemptedTab = unauthorizedAttemptTab || currentTab;

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col font-sans ${lang === 'km' ? 'font-khmer' : ''}`}>
      {/* Top Navbar - Full Width */}
      <Navbar
        currentUser={currentUser}
        onUserChange={handleUserChange}
        lang={lang}
        onLanguageChange={l => setLang(l)}
        onResetData={handleResetData}
        onLogout={handleLogout}
        onOpenProfile={() => setShowProfileModal(true)}
        onNavigateTab={tab => handleSafeTabChange(tab, 'Navbar Navigation')}
        isMobileNavOpen={isMobileNavOpen}
        onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onOpenRbacMatrix={() => setShowRbacMatrixModal(true)}
        onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
        onOpenWebPush={() => setIsWebPushModalOpen(true)}
      />

      {/* Main Content Layout with Responsive Sidebar */}
      <div className="flex-1 flex max-w-[1920px] w-full mx-auto relative">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={tab => handleSafeTabChange(tab, 'Sidebar Navigation')}
          lang={lang}
          currentUser={currentUser}
          isOpenMobile={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          onOpenRbacMatrix={() => setShowRbacMatrixModal(true)}
          onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
          onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        />

        {/* Content Area - Full width with responsive padding */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-x-hidden min-w-0 w-full pb-24 lg:pb-6">
          {isAccessDenied ? (
            <AccessDeniedView
              currentUser={currentUser}
              attemptedTab={activeAttemptedTab}
              lang={lang}
              onNavigateHome={tab => handleSafeTabChange(tab, 'Return Home from 403')}
              onOpenRbacMatrix={() => setShowRbacMatrixModal(true)}
            />
          ) : (
            <>
              {currentTab === 'employee-hub' && (
                <EmployeeHubView
                  key={`emp-hub-${planRefreshKey}`}
                  currentUser={currentUser}
                  lang={lang}
                  onNavigateTab={tab => handleSafeTabChange(tab, 'Employee Hub Card')}
                  onNavigatePlan={handleNavigatePlan}
                  onOpenSearch={() => setIsCommandPaletteOpen(true)}
                  onOpenFeedback={() => setIsFeedbackModalOpen(true)}
                  onOpenHelp={() => setIsHelpModalOpen(true)}
                  onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
                  onOpenCreatePlan={() => {
                    setAutoOpenPlanCreate(true);
                    handleSafeTabChange('action-plans', 'Create Plan from Employee Hub');
                  }}
                  onOpenQuickRequest={type => {
                    setQuickRequestType(type || 'task_update');
                    setIsQuickRequestModalOpen(true);
                  }}
                />
              )}

              {currentTab === 'dashboard' && (
                <DashboardView
                  key={`dash-${planRefreshKey}`}
                  currentUser={currentUser}
                  lang={lang}
                  onNavigatePlan={handleNavigatePlan}
                  onNavigateTab={tab => handleSafeTabChange(tab, 'Dashboard Widget')}
                />
              )}

              {currentTab === 'attendance' && (
                <AttendanceView
                  currentUser={currentUser}
                  lang={lang}
                  onNavigateTab={tab => handleSafeTabChange(tab, 'Attendance Screen')}
                />
              )}

              {currentTab === 'action-plans' && (
                <ActionPlansView
                  key={`plans-${planRefreshKey}`}
                  currentUser={currentUser}
                  lang={lang}
                  selectedPlanId={targetPlanId}
                  onSelectPlan={id => setTargetPlanId(id)}
                  onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
                  initialCreateOpen={autoOpenPlanCreate}
                  onClearInitialCreateOpen={() => setAutoOpenPlanCreate(false)}
                />
              )}

              {currentTab === 'activities' && (
                <ActivitiesView
                  currentUser={currentUser}
                  lang={lang}
                />
              )}

              {currentTab === 'progress' && (
                <ActionPlansView
                  currentUser={currentUser}
                  lang={lang}
                  selectedPlanId={targetPlanId}
                  onSelectPlan={id => setTargetPlanId(id)}
                />
              )}

              {currentTab === 'approvals' && (
                <ActionPlansView
                  currentUser={currentUser}
                  lang={lang}
                  selectedPlanId={targetPlanId}
                  onSelectPlan={id => setTargetPlanId(id)}
                />
              )}

              {currentTab === 'objectives' && (
                <ObjectivesView
                  currentUser={currentUser}
                  lang={lang}
                  onNavigatePlan={handleNavigatePlan}
                />
              )}

              {currentTab === 'calendar-gantt' && (
                <CalendarGanttView
                  currentUser={currentUser}
                  lang={lang}
                  onNavigatePlan={handleNavigatePlan}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView
                  currentUser={currentUser}
                  lang={lang}
                />
              )}

              {currentTab === 'departments' && (
                <DepartmentsEmployeesView
                  viewMode="departments"
                  currentUser={currentUser}
                  lang={lang}
                  onNavigatePlan={(planId) => {
                    setTargetPlanId(planId);
                    setCurrentTab('action-plans');
                  }}
                  onNavigateTab={setCurrentTab}
                />
              )}

              {currentTab === 'employees' && (
                <DepartmentsEmployeesView
                  viewMode="employees"
                  currentUser={currentUser}
                  lang={lang}
                  onNavigatePlan={(planId) => {
                    setTargetPlanId(planId);
                    setCurrentTab('action-plans');
                  }}
                  onNavigateTab={setCurrentTab}
                />
              )}

              {currentTab === 'audit-logs' && (
                <AuditLogsView
                  currentUser={currentUser}
                  lang={lang}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Screens below lg) */}
      <nav 
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-xl no-print safe-area-pb"
      >
        {canRoleAccessTab(currentUser.role, 'employee-hub') ? (
          <button
            type="button"
            onClick={() => handleSafeTabChange('employee-hub', 'Mobile Bottom Bar')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[52px] min-h-[48px] active:scale-95 ${
              currentTab === 'employee-hub' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium leading-none">Hub</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSafeTabChange('dashboard', 'Mobile Bottom Bar')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[52px] min-h-[48px] active:scale-95 ${
              currentTab === 'dashboard' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium leading-none">Dashboard</span>
          </button>
        )}

        {canRoleAccessTab(currentUser.role, 'attendance') && (
          <button
            type="button"
            onClick={() => handleSafeTabChange('attendance', 'Mobile Bottom Bar')}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[52px] min-h-[48px] active:scale-95 ${
              currentTab === 'attendance' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium leading-none">Attendance</span>
            {isClockedIn && (
              <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse"></span>
            )}
          </button>
        )}

        {/* Center Floating Quick Action Button */}
        <button
          type="button"
          onClick={() => {
            setQuickRequestType('task_update');
            setIsQuickRequestModalOpen(true);
          }}
          className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/40 hover:scale-105 active:scale-95 transition flex items-center justify-center border-2 border-white focus:outline-hidden"
          title="Quick Action"
          aria-label="Quick Action"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {canRoleAccessTab(currentUser.role, 'action-plans') ? (
          <button
            type="button"
            onClick={() => handleSafeTabChange('action-plans', 'Mobile Bottom Bar')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[52px] min-h-[48px] active:scale-95 ${
              currentTab === 'action-plans' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium leading-none">Plans</span>
          </button>
        ) : canRoleAccessTab(currentUser.role, 'activities') ? (
          <button
            type="button"
            onClick={() => handleSafeTabChange('activities', 'Mobile Bottom Bar')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[52px] min-h-[48px] active:scale-95 ${
              currentTab === 'activities' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium leading-none">Tasks</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSafeTabChange('calendar-gantt', 'Mobile Bottom Bar')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[52px] min-h-[48px] active:scale-95 ${
              currentTab === 'calendar-gantt' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium leading-none">Calendar</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsMobileNavOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[52px] min-h-[48px] active:scale-95 ${
            isMobileNavOpen ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium leading-none">Menu</span>
        </button>
      </nav>

      {/* Global Toast Notification */}
      {globalToast && (
        <div className="fixed bottom-20 right-4 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-800 flex items-center space-x-2.5 animate-in slide-in-from-bottom-3 text-xs font-semibold backdrop-blur-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{globalToast}</span>
        </div>
      )}

      {/* Command Palette (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        currentUser={currentUser}
        lang={lang}
        onNavigateTab={tab => handleSafeTabChange(tab, 'Command Palette')}
        onNavigatePlan={handleNavigatePlan}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
      />

      {/* Employee Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        currentUser={currentUser}
        lang={lang}
      />

      {/* Help & Tutorials Modal */}
      <HelpSupportModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        lang={lang}
      />

      {/* Quick Request & Task Slider Modal */}
      <QuickRequestModal
        isOpen={isQuickRequestModalOpen}
        onClose={() => setIsQuickRequestModalOpen(false)}
        currentUser={currentUser}
        lang={lang}
        initialType={quickRequestType}
        onSuccess={msg => showToast(msg)}
      />

      {/* User Profile & Security Modal */}
      {showProfileModal && (
        <UserProfileModal
          user={currentUser}
          onClose={() => setShowProfileModal(false)}
          lang={lang}
          onUserUpdated={u => handleUserChange(u)}
        />
      )}

      {/* RBAC Permission Matrix & Role Inspection Modal */}
      <RbacPermissionsModal
        isOpen={showRbacMatrixModal}
        onClose={() => setShowRbacMatrixModal(false)}
        currentUser={currentUser}
        onSwitchUser={u => handleUserChange(u)}
        lang={lang}
      />

      {/* Voice-Activated Action Plan Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
        currentUser={currentUser}
        lang={lang}
        onPlanMutated={() => {
          setPlanRefreshKey(prev => prev + 1);
          showToast(lang === 'km' ? 'ផែនការសកម្មភាពត្រូវបានធ្វើបច្ចុប្បន្នភាពតាមសំឡេង' : 'Action plan synchronized via Voice Command');
        }}
        onNavigatePlan={planId => {
          handleSafeTabChange('action-plans', 'Voice Assistant Plan Link');
          handleNavigatePlan(planId);
        }}
      />

      {/* Web Push Attendance Alerts Modal */}
      <WebPushNotificationModal
        isOpen={isWebPushModalOpen}
        onClose={() => setIsWebPushModalOpen(false)}
        currentUser={currentUser}
        lang={lang}
      />

      {/* PWA In-App Install Ambient Banner (Mobile & Desktop) */}
      <PWAInstallBanner />

      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator />
    </div>
  );
}
