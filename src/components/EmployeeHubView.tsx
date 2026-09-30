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
  Network
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
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-12">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-800 flex items-center space-x-2.5 animate-in slide-in-from-top-3 text-xs font-semibold backdrop-blur-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Greeting & Mobile Status Bar */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
        {/* Subtle background ambient patterns */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-white/20 text-blue-100 text-[11px] font-semibold tracking-wide backdrop-blur-xs">
                {currentUser.role}
              </span>
              <span className="text-blue-200 text-xs">• {departmentName}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Hello, {currentUser.name}!
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-md">
              Here is your daily workspace. Clock your shifts, track assigned focus tasks, and submit fast updates in one tap.
            </p>
          </div>

          {/* Real-time Clock Widget */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/15 text-center sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between">
            <div className="text-left sm:text-right">
              <span className="text-[11px] font-medium text-blue-200 block">{currentDate}</span>
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white block">
                {currentTime || '--:--:--'}
              </span>
            </div>
            <div className="mt-0 sm:mt-1.5 flex items-center space-x-1 text-[11px] text-blue-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Cambodia Standard Time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Shift Punch-In / Punch-Out Card (Strategy 1, 2, 4) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${
              isClockedIn 
                ? 'bg-emerald-100 text-emerald-700' 
                : isShiftClosed 
                ? 'bg-slate-100 text-slate-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">Today's Attendance Status</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isClockedIn 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : isShiftClosed 
                    ? 'bg-slate-100 text-slate-700' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {isClockedIn ? 'Active On Duty' : isShiftClosed ? 'Shift Completed' : 'Not Clocked In'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {todayAtt?.workShift 
                  ? `Assigned: ${todayAtt.workShift}` 
                  : `Standard Shifts: Morning (08:00 - 12:00) • Evening (13:00 - 17:00)`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsWebPushModalOpen(true)}
              className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 transition"
              title="Web Push Attendance Alerts & Settings"
            >
              <Bell className="w-3.5 h-3.5 text-indigo-600" />
              <span>Push Alerts</span>
            </button>

            {todayAtt && (
              <button
                onClick={() => {
                  setEditingRecord(todayAtt);
                  setIsEditShiftModalOpen(true);
                }}
                className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                title="Edit shift type, clock timings or hours"
              >
                <Pencil className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit Shift</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons for Punching In / Out */}
        <div className="pt-4">
          {!todayAtt || !todayAtt.checkInTime ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleClockIn('Morning')}
                className="flex items-center justify-between p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 transition group active:scale-98 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700 group-hover:scale-110 transition">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-amber-900">Clock In: Morning Shift</span>
                    <span className="block text-[11px] text-amber-700/80 font-mono">08:00 - 12:00 (Grace 08:15)</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                onClick={() => handleClockIn('Evening')}
                className="flex items-center justify-between p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 transition group active:scale-98 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 group-hover:scale-110 transition">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-indigo-900">Clock In: Evening Shift</span>
                    <span className="block text-[11px] text-indigo-700/80 font-mono">13:00 - 17:00 (Grace 13:15)</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          ) : !todayAtt.checkOutTime ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl">
              <div className="flex items-center space-x-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                <div className="text-xs text-emerald-900">
                  <span>Clocked in at <strong className="font-mono font-bold">{todayAtt.checkInTime}</strong></span>
                  <span className="mx-2">•</span>
                  <span>Shift: <strong>{todayAtt.shiftType || 'Standard'}</strong></span>
                </div>
              </div>
              <button
                onClick={handleClockOut}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition"
              >
                Clock Out Now (End Shift)
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Completed: <strong className="font-mono">{todayAtt.checkInTime}</strong> to <strong className="font-mono">{todayAtt.checkOutTime}</strong> ({todayAtt.workingHours} hrs logged)
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('attendance')}
                className="text-blue-600 hover:underline font-semibold"
              >
                View Records
              </button>
            </div>
          )}

          {/* Telegram Reminder Alerts Status Strip */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <Send className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="text-slate-600 font-medium">
                Telegram Check-in Alert:
              </span>
              <span className="font-mono text-slate-800 font-semibold bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded text-[11px]">
                {currentUser.telegramHandle || (currentUser.telegramChatId ? `Chat ID: ${currentUser.telegramChatId}` : 'Not Linked')}
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                (Reminds unclocked staff • No auto-check in)
              </span>
            </div>
            <button
              onClick={() => setIsTelegramModalOpen(true)}
              className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition active:scale-95"
            >
              Telegram Alert Center
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Dock - Mobile-First Grid (Strategy 4) */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Action Shortcuts</h3>
          <span className="text-[11px] text-slate-400">1-Tap Shortcuts</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {onOpenVoiceAssistant && (
            <button
              onClick={onOpenVoiceAssistant}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/80 to-white hover:border-indigo-400 shadow-2xs transition active:scale-95 text-center group"
            >
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white group-hover:scale-110 shadow-sm shadow-indigo-500/30 transition mb-2 relative">
                <Mic className="w-5 h-5 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-1" />
              </div>
              <span className="text-xs font-bold text-slate-800">Voice Assistant</span>
              <span className="text-[10px] text-indigo-600 font-medium mt-0.5">Speak & create plans</span>
            </button>
          )}

          <button
            onClick={() => onOpenQuickRequest('task_update')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 shadow-2xs transition active:scale-95 text-center group"
          >
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 group-hover:scale-110 transition mb-2">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Update Task</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Quick milestone slider</span>
          </button>

          <button
            onClick={() => onOpenQuickRequest('leave_request')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 shadow-2xs transition active:scale-95 text-center group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 group-hover:scale-110 transition mb-2">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Request Leave</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Half-day or full shift</span>
          </button>

          <button
            onClick={() => onNavigateTab('departments')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-white hover:border-blue-400 shadow-2xs transition active:scale-95 text-center group"
          >
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 group-hover:scale-110 transition mb-2">
              <Network className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">{lang === 'km' ? 'មែកធាងអង្គភាព' : 'Org Treeview'}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{lang === 'km' ? 'ឋានានុក្រម និងអ្នកទទួលខុសត្រូវ' : 'Hierarchy & Who to ask'}</span>
          </button>

          <button
            onClick={onOpenSearch}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50 shadow-2xs transition active:scale-95 text-center group"
          >
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 group-hover:scale-110 transition mb-2">
              <Search className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Fast Search</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Press Ctrl + K</span>
          </button>

          <button
            onClick={onOpenFeedback}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/50 shadow-2xs transition active:scale-95 text-center group col-span-2 sm:col-span-1"
          >
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 group-hover:scale-110 transition mb-2">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Give Feedback</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Rate app & submit ideas</span>
          </button>
        </div>
      </div>

      {/* Notifications & Alerts Carousel / Banner (Strategy 6) */}
      {unreadNotifs.length > 0 && (
        <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-200/80 text-amber-800 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-900">
                  {unreadNotifs.length} Unread Notification{unreadNotifs.length > 1 ? 's' : ''}
                </span>
                <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-md text-[10px] font-bold">
                  Action required
                </span>
              </div>
              <p className="text-xs text-amber-800/80 truncate mt-0.5">
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
            className="px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-200/60 rounded-lg transition shrink-0 ml-2"
          >
            Dismiss All
          </button>
        </div>
      )}

      {/* Focus Tasks Today with Progressive Disclosure (Strategy 2, 5) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Assigned Focus Tasks ({activeTasks.length})</h3>
              <p className="text-xs text-slate-500">Tap to expand full details, update progress, or view action plan</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('activities')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {activeTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p className="text-xs font-bold text-slate-700">All tasks completed!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">You have no pending activities assigned to your profile today.</p>
            </div>
          ) : (
            activeTasks.map(task => {
              const isExpanded = expandedTaskId === task.id;
              return (
                <div key={task.id} className="p-4 transition hover:bg-slate-50/60">
                  <div 
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    className="flex items-start justify-between cursor-pointer select-none gap-3"
                  >
                    <div className="flex items-start space-x-3 min-w-0 pr-2">
                      {/* 1-Click Task Complete Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTaskComplete(task);
                        }}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition shrink-0 mt-0.5 ${
                          task.status === 'Completed' || task.progressPercentage === 100
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50 text-transparent hover:text-emerald-500'
                        }`}
                        title={task.status === 'Completed' ? 'Mark In Progress' : 'Quick Complete (100%)'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                            {task.code}
                          </span>
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${
                            task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}>
                            {task.title}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                          <span>Due: <strong className="text-slate-700">{task.dueDate}</strong></span>
                          <span>•</span>
                          <span>Weight: <strong className="text-slate-700">{task.weight}%</strong></span>
                          <span>•</span>
                          <span>Status: <strong className={task.status === 'Completed' ? 'text-emerald-600 font-semibold' : 'text-blue-600'}>{task.status}</strong></span>
                        </div>
                        {task.lastAdjustmentReason && (
                          <div className="mt-1">
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-medium">
                              Adjustment: {task.lastAdjustmentReason}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 font-mono">{task.progressPercentage}%</span>
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div 
                            className="h-full bg-blue-600 rounded-full" 
                            style={{ width: `${task.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Progressive Disclosure (Shown only on demand) */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-3 animate-in fade-in duration-150">
                      {task.description && (
                        <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {task.description}
                        </p>
                      )}

                      {/* Quick progress increment buttons */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                          Quick Progress Update:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[25, 50, 75, 100].map(val => (
                            <button
                              key={val}
                              onClick={() => handleQuickProgressUpdate(task.id, val)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                task.progressPercentage === val
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {val === 100 ? '✓ 100% (Complete)' : `${val}%`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onNavigatePlan(task.actionPlanId)}
                            className="flex items-center space-x-1 text-blue-600 hover:underline font-semibold"
                          >
                            <span>Open Associated Action Plan</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setScheduleActivity(task)}
                            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200 transition"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Adjust Deadline & Priority</span>
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Assigned by: {task.teamLeaderId ? 'Team Lead' : 'Department'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* My Owned Action Plans (Employee Self-Service) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'km' ? 'ផែនការសកម្មភាពផ្ទាល់ខ្លួន' : 'My Owned Action Plans'} ({myOwnedPlans.length})
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {lang === 'km' ? 'សិទ្ធិម្ចាស់ពេញលេញ' : 'Full Ownership'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {lang === 'km' 
                  ? 'ក្នុងនាមជាបុគ្គលិក អ្នកអាចបង្កើត កែប្រែ និងលុប/ទុកក្នុងបណ្ណសារនូវផែនការដែលអ្នកជាម្ចាស់'
                  : 'Create, lead, edit, and archive your personal strategic initiatives'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (onOpenCreatePlan) {
                  onOpenCreatePlan();
                } else {
                  onNavigateTab('action-plans');
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'បង្កើតផែនការថ្មី' : 'Create Plan'}</span>
            </button>
            <button
              onClick={() => onNavigateTab('action-plans')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 px-2 py-1.5"
            >
              <span>{lang === 'km' ? 'មើលកាតាឡុក' : 'View Catalog'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {myOwnedPlans.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <FolderKanban className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">
                {lang === 'km' ? 'មិនទាន់មានផែនការផ្ទាល់ខ្លួននៅឡើយទេ' : 'No owned action plans yet'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                {lang === 'km'
                  ? 'អ្នកមានសិទ្ធិបង្កើតផែនការសកម្មភាពថ្មី គ្រប់គ្រងកាលវិភាគ ថវិកា និងសូចនាករ KPI ដោយផ្ទាល់។'
                  : 'You have full permissions to propose and lead strategic action plans. Create your first initiative today.'}
              </p>
              <button
                onClick={() => {
                  if (onOpenCreatePlan) onOpenCreatePlan();
                  else onNavigateTab('action-plans');
                }}
                className="mt-3.5 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'បង្កើតផែនការដំបូងរបស់អ្នក' : 'Create Your First Plan'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {myOwnedPlans.map(plan => {
                const isOverdue = plan.dueDate < todayStr && plan.status !== 'Completed';
                return (
                  <div
                    key={plan.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs bg-white transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200">
                            {plan.planNumber}
                          </span>
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <UserCheck className="w-3 h-3" />
                            <span>{lang === 'km' ? 'ម្ចាស់' : 'Owner'}</span>
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          plan.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          plan.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800' :
                          plan.status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {plan.status}
                        </span>
                      </div>

                      <h4 
                        onClick={() => onNavigatePlan(plan.id)}
                        className="font-bold text-xs text-slate-900 mt-2 hover:text-blue-600 cursor-pointer line-clamp-1"
                        title={plan.title}
                      >
                        {plan.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {plan.description || (lang === 'km' ? 'គ្មានការពិពណ៌នា' : 'No description')}
                      </p>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
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

                      {/* KPI & Due Date */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                        <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                          {lang === 'km' ? 'ផុតកំណត់៖' : 'Due:'} {plan.dueDate}
                        </span>
                        {plan.kpi ? (
                          <span className="font-medium text-slate-700 truncate max-w-[150px]">
                            KPI: {plan.kpiActual}/{plan.kpiTarget} {plan.kpiUnit}
                          </span>
                        ) : (
                          <span>Priority: {plan.priority}</span>
                        )}
                      </div>

                      {/* Alignment Status & Collaboration Badge */}
                      {plan.alignmentStatus && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            plan.alignmentStatus === 'Fully Aligned' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            plan.alignmentStatus === 'Review Needed' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            <Target className="w-2.5 h-2.5" />
                            <span>{plan.alignmentStatus}</span>
                          </span>
                          {plan.nextReviewDate && (
                            <span className="text-[10px] text-slate-400">
                              {lang === 'km' ? 'ត្រួតពិនិត្យ៖' : 'Review:'} {plan.nextReviewDate}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between mt-3 pt-2 border-t border-slate-100 gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {plan.status !== 'Completed' ? (
                          <button
                            type="button"
                            onClick={() => handleQuickCompletePlan(plan.id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition"
                            title={lang === 'km' ? 'សម្គាល់ថាបានបញ្ចប់ ១០០%' : 'Quick complete action plan in 1 click'}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{lang === 'km' ? 'បញ្ចប់ ១០០%' : 'Quick Complete'}</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>{lang === 'km' ? 'បានបញ្ចប់' : 'Completed'}</span>
                          </span>
                        )}

                        {/* Collaborate button */}
                        <button
                          type="button"
                          onClick={() => setCollaborationPlan(plan)}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold border border-indigo-200 transition"
                          title={lang === 'km' ? 'ចែករំលែកដើម្បីសហការ និងមតិកែលម្អ' : 'Share for collaboration and feedback'}
                        >
                          <UsersIcon className="w-3 h-3" />
                          <span>{lang === 'km' ? 'សហការ' : 'Collaborate'}</span>
                        </button>

                        {/* Goal Review button */}
                        <button
                          type="button"
                          onClick={() => setGoalReviewPlan(plan)}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold border border-blue-200 transition"
                          title={lang === 'km' ? 'ត្រួតពិនិត្យការតម្រឹមគោលដៅទៀងទាត់' : 'Periodic goal alignment review'}
                        >
                          <Target className="w-3 h-3" />
                          <span>{lang === 'km' ? 'ត្រួតពិនិត្យគោលដៅ' : 'Review'}</span>
                        </button>

                        <button
                          onClick={() => onNavigatePlan(plan.id)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 px-1.5 py-1"
                        >
                          <span>{lang === 'km' ? 'បើក និងគ្រប់គ្រង' : 'Open'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={e => handleDeleteOwnedPlan(plan, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title={lang === 'km' ? 'ទុកក្នុងបណ្ណសារ / លុប' : 'Archive / Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary Bar (Strategy 10) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-black text-slate-900">96.5%</span>
            <span className="text-[10px] font-semibold text-emerald-600">Punctual</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Tasks</span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-black text-slate-900">{myActivities.length}</span>
            <span className="text-[10px] font-semibold text-blue-600">{completedTasks.length} Done</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly OT Hours</span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-xl font-black text-slate-900">2.5h</span>
            <span className="text-[10px] font-semibold text-indigo-600">Logged</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Help</span>
          <button
            onClick={onOpenHelp}
            className="flex items-center space-x-1 mt-1 text-xs font-bold text-cyan-700 hover:text-cyan-800"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Open Tutorial</span>
          </button>
        </div>
      </div>

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
