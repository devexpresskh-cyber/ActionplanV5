import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Sun, 
  Moon, 
  Sparkles, 
  Search, 
  Send, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  MessageSquare, 
  HelpCircle, 
  Award, 
  TrendingUp, 
  Layers, 
  CheckSquare, 
  Sliders, 
  Pencil,
  Bell,
  ArrowRight,
  ExternalLink,
  Mic,
  UserCheck,
  FolderKanban,
  Trash2,
  Edit3,
  Check,
  CheckCircle,
  Target,
  Users as UsersIcon,
  Network,
  QrCode,
  Zap,
  BadgeDollarSign,
} from 'lucide-react';
import { User, Language, ActionPlan, Activity, AttendanceRecord } from '../types';
import { translations } from '../services/i18n';
import { db, WORK_SHIFTS } from '../services/db';
import { webPushService } from '../services/webPushService';
import { NavTab } from './Sidebar';
import { EditAttendanceShiftModal } from './EditAttendanceShiftModal';
import { PlanCollaborationModal } from './PlanCollaborationModal';
import { PlanGoalReviewModal } from './PlanGoalReviewModal';
import { TaskScheduleModal } from './TaskScheduleModal';
import { TelegramNotificationModal } from './TelegramNotificationModal';
import { WebPushNotificationModal } from './WebPushNotificationModal';

interface EmployeeHubViewProps {
  currentUser: User;
  lang: Language;
  onNavigateTab: (tab: NavTab) => void;
  onNavigatePlan: (planId: string) => void;
  onOpenSearch: () => void;
  onOpenFeedback: () => void;
  onOpenHelp: () => void;
  onOpenQuickRequest: (type?: 'task_update' | 'shift_adjust' | 'leave_request') => void;
  onOpenVoiceAssistant?: () => void;
  onOpenCreatePlan?: () => void;
}

export const EmployeeHubView: React.FC<EmployeeHubViewProps> = ({
  currentUser,
  lang,
  onNavigateTab,
  onNavigatePlan,
  onOpenSearch,
  onOpenFeedback,
  onOpenHelp,
  onOpenQuickRequest,
  onOpenVoiceAssistant,
  onOpenCreatePlan,
}) => {
  const t = translations[lang];
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isEditShiftModalOpen, setIsEditShiftModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hubViewMode, setHubViewMode] = useState<'all' | 'shifts' | 'tasks' | 'plans'>('all');

  // Real-time clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayAtt = useMemo(() => db.getTodayAttendance(currentUser.id), [currentUser.id, refreshKey]);
  const shiftStatus = useMemo(() => db.getTodayShiftStatus(currentUser.id), [currentUser.id, refreshKey]);
  const isClockedIn = !!(todayAtt && todayAtt.checkInTime && !todayAtt.checkOutTime);
  const isShiftClosed = !!(todayAtt && todayAtt.checkInTime && todayAtt.checkOutTime);

  // User's assigned activities
  const allActivities = useMemo(() => db.getActivities(), [refreshKey]);
  const myActivities = useMemo(() => {
    return allActivities.filter(a => a.assignedEmployeeId === currentUser.id || a.teamLeaderId === currentUser.id);
  }, [allActivities, currentUser.id]);

  const activeTasks = myActivities.filter(a => a.status !== 'Completed');
  const completedTasks = myActivities.filter(a => a.status === 'Completed');

  // User's owned action plans
  const myOwnedPlans = useMemo(() => {
    return db.getAuthorizedPlans(currentUser).filter(p => p.ownerId === currentUser.id || p.createdById === currentUser.id);
  }, [currentUser.id, refreshKey]);

  // Delete confirmation modal state
  const [planToDelete, setPlanToDelete] = useState<ActionPlan | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Collaboration and Review Modals
  const [collaborationPlan, setCollaborationPlan] = useState<ActionPlan | null>(null);
  const [goalReviewPlan, setGoalReviewPlan] = useState<ActionPlan | null>(null);
  const [scheduleActivity, setScheduleActivity] = useState<Activity | null>(null);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isWebPushModalOpen, setIsWebPushModalOpen] = useState(false);

  // Handle plan deletion / archive from hub
  const handleDeleteOwnedPlan = (plan: ActionPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlanToDelete(plan);
    setDeleteError(null);
  };

  const handleConfirmDeleteOwnedPlan = () => {
    if (!planToDelete) return;
    try {
      db.deletePlan(planToDelete.id);
      setRefreshKey(k => k + 1);
      showToast(lang === 'km' ? `បានទុកផែនការ ${planToDelete.planNumber} ក្នុងបណ្ណសារជោគជ័យ` : `Archived action plan ${planToDelete.planNumber} successfully`);
      setPlanToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to archive action plan.');
    }
  };

  // Notifications for current user
  const notifications = useMemo(() => db.getNotifications(currentUser.id), [currentUser.id, refreshKey]);
  const unreadNotifs = notifications.filter(n => !n.isRead);

  // Department name for current user
  const departmentName = useMemo(() => db.getDepartments().find(d => d.id === currentUser.departmentId)?.name || 'Operations', [currentUser.departmentId]);

  // Determine current active shift suggestion based on current time
  const currentHour = new Date().getHours();
  const suggestedShift = currentHour >= 12 ? 'Evening' : 'Morning';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Quick 1-tap Clock In
  const handleClockIn = (shift: 'Morning' | 'Evening' = suggestedShift) => {
    const shiftConfig = WORK_SHIFTS[shift] || (shift === 'Evening' 
      ? { startHour: 13, startMinute: 0, lateGraceHour: 13, lateGraceMinute: 15, hours: '13:00 - 17:00' }
      : { startHour: 8, startMinute: 0, lateGraceHour: 8, lateGraceMinute: 15, hours: '08:00 - 12:00' }
    );

    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();

    let status: 'Present' | 'Late' = 'Present';
    if (curH > shiftConfig.lateGraceHour || (curH === shiftConfig.lateGraceHour && curM > shiftConfig.lateGraceMinute)) {
      status = 'Late';
    }

    const timeStr = now.toTimeString().split(' ')[0];
    const res = db.checkIn(currentUser.id, `Mobile clock-in for ${shift} shift (${status})`, 'Phnom Penh HQ - Main Tower', shift);
    if (res.success) {
      webPushService.sendCheckInAlert({
        userName: currentUser.name,
        shift: shift,
        time: res.record?.checkInTime || timeStr.substring(0, 5),
        status: status,
        location: 'Phnom Penh HQ - Main Tower',
      });
    }
    setRefreshKey(k => k + 1);
    showToast(`Clocked in successfully for ${shift} Shift at ${timeStr.substring(0, 5)} (${status})`);
  };

  // Quick 1-tap Clock Out
  const handleClockOut = () => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const res = db.checkOut(currentUser.id, 'Completed daily shift duties');
    if (res.success) {
      webPushService.sendCheckOutAlert({
        userName: currentUser.name,
        shift: res.record?.shiftType || 'Morning',
        time: res.record?.checkOutTime || timeStr.substring(0, 5),
        workingHours: res.record?.workingHours || 8,
        overtimeHours: res.record?.overtimeHours || 0,
      });
    }
    setRefreshKey(k => k + 1);
    showToast(`Clocked out successfully at ${timeStr.substring(0, 5)}. Shift closed.`);
  };

  // Quick 1-tap task progress update
  const handleQuickProgressUpdate = (activityId: string, newProgress: number) => {
    db.updateActivityProgress(activityId, newProgress, `Updated to ${newProgress}% via Quick Mobile Hub`);
    setRefreshKey(k => k + 1);
    showToast(`Task progress updated to ${newProgress}%`);
  };

  // Instant task completion toggle with dependency check
  const handleToggleTaskComplete = (task: Activity) => {
    if (task.status !== 'Completed' && task.progressPercentage < 100) {
      const validation = db.validateDependencies(task.id);
      if (!validation.canComplete) {
        showToast(
          lang === 'km'
            ? `មិនអាចបញ្ចប់កិច្ចការបានទេ។ សូមបញ្ចប់កិច្ចការជាមុនសិន៖ ${validation.blockingActivities.map(b => b.code).join(', ')}`
            : `Cannot complete yet. Prerequisites pending: ${validation.blockingActivities.map(b => b.code).join(', ')}`
        );
        return;
      }
      db.saveActivity({
        ...task,
        status: 'Completed',
        progressPercentage: 100,
        completionDate: new Date().toISOString().split('T')[0],
      });
      db.addProgressUpdate({
        entityType: 'activity',
        entityId: task.id,
        previousPercentage: task.progressPercentage,
        newPercentage: 100,
        description: lang === 'km' ? 'បានបញ្ចប់កិច្ចការតាមរយៈបញ្ជីរហ័ស' : 'Completed task via quick 1-click checkbox',
      });
      setRefreshKey(k => k + 1);
      showToast(lang === 'km' ? `កិច្ចការ ${task.code} បានបញ្ចប់ ១០០%!` : `Task ${task.code} completed 100%!`);
    } else {
      // Revert to in progress
      db.saveActivity({
        ...task,
        status: 'In Progress',
        progressPercentage: 50,
      });
      setRefreshKey(k => k + 1);
      showToast(lang === 'km' ? `កិច្ចការ ${task.code} បានបើកដំណើរការឡើងវិញ` : `Task ${task.code} reverted to In Progress`);
    }
  };

  // Instant action plan completion for owned plans
  const handleQuickCompletePlan = (planId: string) => {
    const updated = db.updatePlanProgress(
      planId, 
      100, 
      lang === 'km' ? 'បានបញ្ចប់ផែនការសកម្មភាព' : 'Completed action plan via quick employee action'
    );
    if (updated) {
      setRefreshKey(k => k + 1);
      showToast(lang === 'km' ? `ផែនការ ${updated.planNumber} បានបញ្ចប់ ១០០%!` : `Action plan ${updated.planNumber} marked 100% complete!`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-2.5 sm:space-y-3 pb-8">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900/95 text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-800 flex items-center space-x-2.5 animate-in slide-in-from-top-3 text-xs font-semibold backdrop-blur-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Greeting & Mobile Status Bar - Clean, Compact & Modern */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-3 sm:p-3.5 text-white shadow-md shadow-blue-900/15 relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0 border border-white/20 shadow-xs">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold truncate text-white">{currentUser.name}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-blue-100 text-[10px] font-semibold">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-[11px] text-blue-200 truncate mt-0.5">
                {departmentName}
              </p>
            </div>
          </div>

          {/* Compact Clock & Date */}
          <div className="text-right shrink-0 bg-white/10 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-white/15">
            <span className="text-xs sm:text-sm font-black font-mono tracking-tight text-white block">
              {currentTime || '--:--:--'}
            </span>
            <span className="text-[10px] text-blue-200 block -mt-0.5">
              {currentDate}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile App Segmented Navigation Bar - Zero Dead Scroll */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold select-none shadow-2xs">
        <button
          type="button"
          onClick={() => setHubViewMode('all')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
            hubViewMode === 'all'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {lang === 'km' ? 'ទាំងអស់' : 'All'}
        </button>
        <button
          type="button"
          onClick={() => setHubViewMode('shifts')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
            hubViewMode === 'shifts'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {lang === 'km' ? 'វត្តមាន & វេន' : 'Shifts & Time'}
        </button>
        <button
          type="button"
          onClick={() => setHubViewMode('tasks')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition flex items-center justify-center space-x-1 ${
            hubViewMode === 'tasks'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>{lang === 'km' ? 'កិច្ចការ' : 'Tasks'}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            hubViewMode === 'tasks' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300 text-slate-700'
          }`}>
            {activeTasks.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setHubViewMode('plans')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition flex items-center justify-center space-x-1 ${
            hubViewMode === 'plans'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>{lang === 'km' ? 'ផែនការ' : 'Plans'}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            hubViewMode === 'plans' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
          }`}>
            {myOwnedPlans.length}
          </span>
        </button>
      </div>

      {/* Voice Assistant Quick Launch Card - 1-Tap Access for Employees */}
      {onOpenVoiceAssistant && (
        <div className="bg-gradient-to-r from-indigo-900/90 via-blue-900/90 to-slate-900/90 rounded-xl p-2.5 sm:p-3 text-white flex items-center justify-between gap-2.5 shadow-xs border border-indigo-700/50">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Mic className="w-4 h-4 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate text-white">
                {lang === 'km' ? 'ជំនួយការសំឡេង AI សម្រាប់បុគ្គលិក' : 'Employee Voice Action Assistant'}
              </div>
              <p className="text-[10px] text-blue-200 truncate">
                {lang === 'km' ? 'ចុចនិយាយ ឬជ្រើសរើស 1-Tap ដើម្បីពិនិត្យកិច្ចការ និងវត្តមាន' : 'Speak or tap 1-tap shortcuts for tasks, plans & shifts'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenVoiceAssistant}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center space-x-1 shrink-0 active:scale-95 shadow-2xs"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'បើក Voice AI' : 'Open Voice AI'}</span>
          </button>
        </div>
      )}

      {/* Primary Shift Punch-In / Punch-Out Card - Compact Mobile-App Design */}
      {(hubViewMode === 'all' || hubViewMode === 'shifts') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 sm:p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 ${
                isClockedIn 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : isShiftClosed 
                  ? 'bg-slate-100 text-slate-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {lang === 'km' ? 'វត្តមាន & វេនការងារ' : "Today's Attendance"}
                  </h3>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isClockedIn 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : isShiftClosed 
                      ? 'bg-slate-100 text-slate-700' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {isClockedIn ? 'On Duty' : isShiftClosed ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Morning (08:00-12:00) • Evening (13:00-17:00)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onNavigateTab('attendance')}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 text-xs font-bold transition active:scale-95"
                title="Instant QR Scanner"
              >
                <QrCode className="w-3.5 h-3.5 text-cyan-600" />
                <span className="hidden sm:inline">QR Scan</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWebPushModalOpen(true)}
                className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 transition"
                title="Push Alerts"
              >
                <Bell className="w-3.5 h-3.5 text-indigo-600" />
              </button>

              {todayAtt && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord(todayAtt);
                    setIsEditShiftModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                  title="Edit Shift"
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-600" />
                </button>
              )}
            </div>
          </div>

          {/* Clock In / Out Action Rows */}
          {isClockedIn ? (
            <div className="flex items-center justify-between gap-2.5 bg-emerald-50/70 border border-emerald-300 p-2.5 rounded-xl text-xs">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <div className="text-emerald-900 truncate">
                  <span>In at <strong className="font-mono font-bold">{todayAtt.checkInTime}</strong></span>
                  <span className="mx-1">•</span>
                  <span><strong>{todayAtt.shiftType || 'Standard'}</strong></span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClockOut}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition shrink-0"
              >
                Clock Out Now
              </button>
            </div>
          ) : shiftStatus.bothCompleted ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Both Shifts Completed Today!</strong> ({shiftStatus.totalHours} hrs)</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('attendance')}
                className="text-blue-600 hover:underline font-bold text-xs"
              >
                Log &gt;
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Morning Shift */}
              {shiftStatus.morningCompleted ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 text-xs">
                  <div className="flex items-center space-x-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-emerald-900 block truncate">Morning (Done)</span>
                      <span className="text-[10px] text-emerald-700 font-mono">
                        {shiftStatus.morningRecord?.checkInTime} - {shiftStatus.morningRecord?.checkOutTime} ({shiftStatus.morningRecord?.workingHours}h)
                      </span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">100%</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleClockIn('Morning')}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 transition active:scale-98 text-left"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <div className="p-1 rounded-md bg-amber-100 text-amber-700">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-amber-900 block">Morning Shift</span>
                      <span className="text-[10px] text-amber-700 font-mono">08:00 - 12:00</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-700 flex items-center">
                    <span>In</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              )}

              {/* Evening Shift */}
              {shiftStatus.eveningCompleted ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 text-xs">
                  <div className="flex items-center space-x-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-emerald-900 block truncate">Evening (Done)</span>
                      <span className="text-[10px] text-emerald-700 font-mono">
                        {shiftStatus.eveningRecord?.checkInTime} - {shiftStatus.eveningRecord?.checkOutTime} ({shiftStatus.eveningRecord?.workingHours}h)
                      </span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">100%</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleClockIn('Evening')}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 transition active:scale-98 text-left"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <div className="p-1 rounded-md bg-indigo-100 text-indigo-700">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-indigo-900 block">Evening Shift</span>
                      <span className="text-[10px] text-indigo-700 font-mono">13:00 - 17:00</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 flex items-center">
                    <span>In</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Telegram Reminder Bar - Compact Strip */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center space-x-1.5 truncate">
              <Send className="w-3 h-3 text-sky-500 shrink-0" />
              <span className="truncate">Telegram:</span>
              <span className="font-mono text-slate-700 font-semibold bg-slate-100 px-1.5 py-0.2 rounded text-[10px] truncate">
                {currentUser.telegramHandle || (currentUser.telegramChatId ? `ID: ${currentUser.telegramChatId}` : 'Not Linked')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTelegramModalOpen(true)}
              className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 transition shrink-0 ml-2"
            >
              Alert Center &gt;
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Dock - Compact Native Mobile App Icons Row */}
      {(hubViewMode === 'all' || hubViewMode === 'shifts') && (
        <div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {onOpenVoiceAssistant && (
              <button
                type="button"
                onClick={onOpenVoiceAssistant}
                className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/70 to-white hover:border-indigo-400 transition active:scale-95 text-center group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-1 group-hover:scale-105 transition shadow-2xs">
                  <Mic className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 truncate w-full">{lang === 'km' ? 'សំឡេង' : 'Voice AI'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenQuickRequest('task_update')}
              className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition active:scale-95 text-center group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <CheckSquare className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 truncate w-full">{lang === 'km' ? 'កែប្រែកិច្ចការ' : 'Task Slider'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenQuickRequest('leave_request')}
              className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition active:scale-95 text-center group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 truncate w-full">{lang === 'km' ? 'សុំច្បាប់' : 'Leave'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('departments')}
              className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-blue-200/80 bg-white hover:border-blue-400 transition active:scale-95 text-center group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <Network className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 truncate w-full">{lang === 'km' ? 'មែកធាង' : 'Org Tree'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenSearch}
              className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white hover:border-purple-300 transition active:scale-95 text-center group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <Search className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 truncate w-full">{lang === 'km' ? 'ស្វែងរក' : 'Search'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenFeedback}
              className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white hover:border-rose-300 transition active:scale-95 text-center group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 truncate w-full">{lang === 'km' ? 'មតិកែលម្អ' : 'Feedback'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Notifications & Alerts Carousel / Banner - Compact */}
      {(hubViewMode === 'all' || hubViewMode === 'tasks') && unreadNotifs.length > 0 && (
        <div className="p-2.5 sm:p-3 rounded-xl border border-amber-200 bg-amber-50/80 shadow-2xs flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-200/80 text-amber-800 shrink-0">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-amber-900 truncate">
                  {unreadNotifs.length} Unread Alert{unreadNotifs.length > 1 ? 's' : ''}
                </span>
                <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded text-[10px] font-bold">
                  Action
                </span>
              </div>
              <p className="text-[11px] text-amber-800/80 truncate">
                {unreadNotifs[0].title}: {unreadNotifs[0].message}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              db.markAllNotificationsAsRead(currentUser.id);
              setRefreshKey(k => k + 1);
              showToast('Marked all notifications as read');
            }}
            className="px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-200/60 rounded-md transition shrink-0 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Focus Tasks Today with Progressive Disclosure - Compact Mobile Design */}
      {(hubViewMode === 'all' || hubViewMode === 'tasks') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 sm:p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {lang === 'km' ? 'កិច្ចការផ្ដោតអារម្មណ៍' : 'My Assigned Focus Tasks'} ({activeTasks.length})
                </h3>
                <p className="text-[11px] text-slate-500">Tap to expand details, update progress or sliders</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('activities')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {activeTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-1.5 text-emerald-500" />
                <p className="text-xs font-bold text-slate-700">All tasks completed!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No pending activities assigned to your profile today.</p>
              </div>
            ) : (
              activeTasks.map(task => {
                const isExpanded = expandedTaskId === task.id;
                return (
                  <div key={task.id} className="p-2.5 sm:p-3 transition hover:bg-slate-50/60">
                    <div 
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="flex items-start justify-between cursor-pointer select-none gap-2.5"
                    >
                      <div className="flex items-start space-x-2.5 min-w-0 pr-1">
                        {/* 1-Click Task Complete Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTaskComplete(task);
                          }}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 mt-0.5 ${
                            task.status === 'Completed' || task.progressPercentage === 100
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50 text-transparent hover:text-emerald-500'
                          }`}
                          title={task.status === 'Completed' ? 'Mark In Progress' : 'Quick Complete (100%)'}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                              {task.code}
                            </span>
                            <h4 className={`text-xs sm:text-sm font-bold truncate ${
                              task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}>
                              {task.title}
                            </h4>
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                            <span>Due: <strong className="text-slate-700">{task.dueDate}</strong></span>
                            <span>•</span>
                            <span>Weight: <strong className="text-slate-700">{task.weight}%</strong></span>
                            <span>•</span>
                            <span className={task.status === 'Completed' ? 'text-emerald-600 font-semibold' : 'text-blue-600 font-medium'}>
                              {task.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 font-mono">{task.progressPercentage}%</span>
                          <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                            <div 
                              className="h-full bg-blue-600 rounded-full" 
                              style={{ width: `${task.progressPercentage}%` }}
                            />
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {/* Progressive Disclosure (Shown on demand) */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs space-y-2 animate-in fade-in duration-150">
                        {task.description && (
                          <p className="text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                            {task.description}
                          </p>
                        )}

                        {/* Quick progress increment buttons */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold text-slate-600">Update:</span>
                          <div className="flex flex-wrap gap-1">
                            {[25, 50, 75, 100].map(val => (
                              <button
                                key={val}
                                onClick={() => handleQuickProgressUpdate(task.id, val)}
                                className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                                  task.progressPercentage === val
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {val === 100 ? '✓ 100%' : `${val}%`}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between pt-1 gap-2 text-[11px]">
                          <button
                            onClick={() => onNavigatePlan(task.actionPlanId)}
                            className="flex items-center space-x-1 text-blue-600 hover:underline font-semibold"
                          >
                            <span>Open Plan</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setScheduleActivity(task)}
                            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Schedule & Priority</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* My Owned Action Plans (Employee Self-Service) */}
      {(hubViewMode === 'all' || hubViewMode === 'plans') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    {lang === 'km' ? 'ផែនការសកម្មភាពផ្ទាល់ខ្លួន' : 'My Owned Action Plans'} ({myOwnedPlans.length})
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Owner
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === 'km' ? 'គ្រប់គ្រង និងបញ្ចប់ផែនការសកម្មភាពផ្ទាល់ខ្លួន' : 'Manage & complete your initiatives'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  if (onOpenCreatePlan) onOpenCreatePlan();
                  else onNavigateTab('action-plans');
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'ផែនការថ្មី' : 'New Plan'}</span>
              </button>
              <button
                onClick={() => onNavigateTab('action-plans')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-0.5 px-1.5 py-1"
              >
                <span>Catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-3.5">
            {myOwnedPlans.length === 0 ? (
              <div className="py-6 px-3 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <FolderKanban className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">
                  {lang === 'km' ? 'មិនទាន់មានផែនការផ្ទាល់ខ្លួននៅឡើយទេ' : 'No owned action plans yet'}
                </p>
                <button
                  onClick={() => {
                    if (onOpenCreatePlan) onOpenCreatePlan();
                    else onNavigateTab('action-plans');
                  }}
                  className="mt-2 inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'បង្កើតផែនការដំបូង' : 'Create First Plan'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {myOwnedPlans.map(plan => {
                  const isOverdue = plan.dueDate < todayStr && plan.status !== 'Completed';
                  return (
                    <div
                      key={plan.id}
                      className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs bg-white transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded text-[10px] border border-blue-200">
                              {plan.planNumber}
                            </span>
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>Owner</span>
                            </span>
                          </div>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            plan.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                            plan.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {plan.status}
                          </span>
                        </div>

                        <h4 
                          onClick={() => onNavigatePlan(plan.id)}
                          className="font-bold text-xs text-slate-900 mt-1.5 hover:text-blue-600 cursor-pointer line-clamp-1"
                          title={plan.title}
                        >
                          {plan.title}
                        </h4>

                        {/* Progress Bar */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                            <span>{lang === 'km' ? 'វឌ្ឍនភាព' : 'Progress'}</span>
                            <span className="font-bold text-slate-800">{plan.completionPercentage}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${plan.completionPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Due Date & KPI */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100">
                          <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                            Due: {plan.dueDate}
                          </span>
                          <span className="truncate max-w-[140px]">
                            {plan.kpi ? `KPI: ${plan.kpiActual}/${plan.kpiTarget}` : `Priority: ${plan.priority}`}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 gap-1.5">
                        <div className="flex items-center space-x-1">
                          {plan.status !== 'Completed' ? (
                            <button
                              type="button"
                              onClick={() => handleQuickCompletePlan(plan.id)}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>100%</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700">Done</span>
                          )}

                          <button
                            type="button"
                            onClick={() => setCollaborationPlan(plan)}
                            className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold border border-indigo-200 transition"
                          >
                            <UsersIcon className="w-2.5 h-2.5" />
                            <span>Collab</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setGoalReviewPlan(plan)}
                            className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-semibold border border-blue-200 transition"
                          >
                            <Target className="w-2.5 h-2.5" />
                            <span>Goal</span>
                          </button>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => onNavigatePlan(plan.id)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            Open
                          </button>
                          <button
                            onClick={e => handleDeleteOwnedPlan(plan, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Summary Bar - Compact 4-Card Strip */}
      {hubViewMode === 'all' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-base sm:text-lg font-black text-slate-900">96.5%</span>
              <span className="text-[10px] font-semibold text-emerald-600">Punctual</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Tasks</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-base sm:text-lg font-black text-slate-900">{myActivities.length}</span>
              <span className="text-[10px] font-semibold text-blue-600">{completedTasks.length} Done</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly OT</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-base sm:text-lg font-black text-slate-900">2.5h</span>
              <span className="text-[10px] font-semibold text-indigo-600">Logged</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick Guide</span>
            <button
              type="button"
              onClick={onOpenHelp}
              className="flex items-center space-x-1 mt-0.5 text-xs font-bold text-cyan-700 hover:text-cyan-800"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Tutorial</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Shift Modal */}
      <EditAttendanceShiftModal
        isOpen={isEditShiftModalOpen}
        onClose={() => {
          setIsEditShiftModalOpen(false);
          setEditingRecord(null);
        }}
        record={editingRecord}
        onSave={() => {
          setRefreshKey(k => k + 1);
          showToast('Shift & attendance updated successfully');
        }}
        currentUser={currentUser}
        lang={lang}
      />

      {/* Delete Confirmation Modal for Owned Plan */}
      {planToDelete && (
        <div 
          id="hub-delete-plan-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'km' ? 'បញ្ជាក់ការទុកក្នុងបណ្ណសារ / លុប' : 'Confirm Archive / Delete'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'km' ? 'ដកផែនការផ្ទាល់ខ្លួនចេញពីបញ្ជីសកម្ម' : 'Remove owned plan from active dashboard'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {planToDelete.planNumber}
                </span>
                <span className="font-semibold text-slate-900 line-clamp-1">{planToDelete.title}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {lang === 'km'
                  ? `តើអ្នកពិតជាចង់ទុកផែនការ ${planToDelete.planNumber} ក្នុងបណ្ណសារមែនទេ?`
                  : `Are you sure you want to archive action plan ${planToDelete.planNumber}?`}
              </p>
            </div>

            {deleteError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPlanToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOwnedPlan}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'យល់ព្រមលុប / ទុកក្នុងបណ្ណសារ' : 'Yes, Archive Plan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN COLLABORATION & FEEDBACK MODAL */}
      {collaborationPlan && (
        <PlanCollaborationModal
          isOpen={!!collaborationPlan}
          onClose={() => setCollaborationPlan(null)}
          plan={collaborationPlan}
          currentUser={currentUser}
          lang={lang}
          onSuccess={() => {
            setRefreshKey(k => k + 1);
          }}
        />
      )}

      {/* PLAN GOAL REVIEW MODAL */}
      {goalReviewPlan && (
        <PlanGoalReviewModal
          isOpen={!!goalReviewPlan}
          onClose={() => setGoalReviewPlan(null)}
          plan={goalReviewPlan}
          currentUser={currentUser}
          lang={lang}
          onSuccess={() => {
            setRefreshKey(k => k + 1);
          }}
        />
      )}

      {/* TASK SCHEDULE & PRIORITY ADJUSTMENT MODAL */}
      {scheduleActivity && (
        <TaskScheduleModal
          isOpen={!!scheduleActivity}
          onClose={() => setScheduleActivity(null)}
          activity={scheduleActivity}
          currentUser={currentUser}
          lang={lang}
          onSuccess={() => {
            setRefreshKey(k => k + 1);
          }}
        />
      )}

      {/* TELEGRAM ATTENDANCE NOTIFICATIONS MODAL */}
      <TelegramNotificationModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        currentUser={currentUser}
        lang={lang}
        onToast={(msg) => showToast(msg)}
      />

      {/* WEB PUSH ATTENDANCE ALERTS MODAL */}
      <WebPushNotificationModal
        isOpen={isWebPushModalOpen}
        onClose={() => setIsWebPushModalOpen(false)}
        currentUser={currentUser}
        lang={lang}
      />
    </div>
  );
};
