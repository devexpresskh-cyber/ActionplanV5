import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Printer,
  Filter,
  Search,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
  MapPin,
  Sparkles,
  RefreshCw,
  LogOut,
  LogIn,
  CheckSquare,
  Award,
  AlertTriangle,
  History,
  Trash2,
  Sun,
  Moon,
  Pencil,
  Sliders,
  Globe,
  Lock,
  EyeOff,
  HelpCircle,
  UserCheck,
  FileText,
  Mail,
  Phone,
  Send,
  Bell,
} from 'lucide-react';
import {
  User as UserType,
  Language,
  AttendanceRecord,
  MonthlyAttendanceReport,
  AttendanceStatus,
  ShiftType,
} from '../types';
import { translations } from '../services/i18n';
import { db, WORK_SHIFTS } from '../services/db';
import { webPushService } from '../services/webPushService';
import { WebPushNotificationModal } from './WebPushNotificationModal';
import { ManualAttendanceModal } from './ManualAttendanceModal';
import { AttendanceDossierModal } from './AttendanceDossierModal';
import { EditAttendanceShiftModal } from './EditAttendanceShiftModal';
import { ShiftSchedulesModal } from './ShiftSchedulesModal';
import { NetworkWhitelistView } from './NetworkWhitelistView';
import { ContactSupervisorModal } from './ContactSupervisorModal';
import { TelegramNotificationModal } from './TelegramNotificationModal';
import { sendTelegramMessage, buildOverdueCheckInMessage } from '../services/telegramService';
import { exportToCSV, exportToExcel } from '../services/exportUtils';

interface AttendanceViewProps {
  currentUser: UserType;
  lang: Language;
  onNavigateTab?: (tab: any) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  currentUser,
  lang,
  onNavigateTab,
}) => {
  const t = translations[lang];
  const isSuperOrAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Administrator';
  const isEmployee = currentUser.role === 'Employee';
  const canManageOthers = db.canAccessOthersAttendance(currentUser);

  // Active view tab: 'daily' | 'monthly-reports' | 'my-history' | 'network-whitelist'
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly-reports' | 'my-history' | 'network-whitelist'>('daily');

  // Contact supervisor or HR modal for attendance assistance / managing others
  const [isContactSupervisorModalOpen, setIsContactSupervisorModalOpen] = useState(false);

  // Telegram Notification & Alert Bot Modal
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  // Web Push Attendance & Shift Alerts Modal
  const [isWebPushModalOpen, setIsWebPushModalOpen] = useState(false);

  // Workplace Network Connection & Settings
  const [currentConnection, setCurrentConnection] = useState(() => db.getCurrentNetworkConnection());
  const [networkSettings, setNetworkSettings] = useState(() => db.getNetworkSettings());

  // Auto-revert if non-admin somehow has network-whitelist active
  useEffect(() => {
    if (activeTab === 'network-whitelist' && !isSuperOrAdmin) {
      setActiveTab('daily');
    }
  }, [activeTab, isSuperOrAdmin]);

  // Real-time clock for display
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Today's record for current user
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | undefined>(() =>
    db.getTodayAttendance(currentUser.id)
  );

  // Attendance Records - strictly authorized based on user role (Employees only access their own records)
  const [records, setRecords] = useState<AttendanceRecord[]>(() => 
    db.getAuthorizedAttendanceRecords(currentUser)
  );

  // Sync authorized attendance records whenever current active user switches
  useEffect(() => {
    setRecords(db.getAuthorizedAttendanceRecords(currentUser));
    setTodayRecord(db.getTodayAttendance(currentUser.id));
  }, [currentUser.id, currentUser.role]);

  // Monthly Reports list
  const [monthlyReports, setMonthlyReports] = useState<MonthlyAttendanceReport[]>(() =>
    db.getMonthlyReports()
  );

  // Selected report for modal dossier
  const [selectedReport, setSelectedReport] = useState<MonthlyAttendanceReport | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // Manual entry modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Edit Shift & Attendance Modal state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isEditShiftModalOpen, setIsEditShiftModalOpen] = useState(false);

  // Shift Governance & Schedules Modal state
  const [isShiftSchedulesModalOpen, setIsShiftSchedulesModalOpen] = useState(false);

  // Filters for Daily View
  const [filterDate, setFilterDate] = useState('2026-09-17');
  const [filterDept, setFilterDept] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterShift, setFilterShift] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-generation form state
  const [reportGenMonth, setReportGenMonth] = useState('2026-09');
  const [reportGenDept, setReportGenDept] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  // Quick check-in form state
  const [checkInShift, setCheckInShift] = useState<ShiftType>('Morning');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkInLocation, setCheckInLocation] = useState('Phnom Penh HQ - Main Tower');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [showCheckOutForm, setShowCheckOutForm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);

  const departments = db.getDepartments();
  const users = db.getUsers();

  const refreshData = () => {
    setRecords(db.getAuthorizedAttendanceRecords(currentUser));
    setTodayRecord(db.getTodayAttendance(currentUser.id));
    setMonthlyReports(db.getMonthlyReports());
    setCurrentConnection(db.getCurrentNetworkConnection());
    setNetworkSettings(db.getNetworkSettings());
  };

  // Handle Quick Check-In
  const handleCheckIn = () => {
    const res = db.checkIn(
      currentUser.id,
      checkInNotes,
      checkInLocation,
      checkInShift,
      undefined,
      {
        clientIp: currentConnection.clientIp,
        networkId: currentConnection.networkId,
        forceSeamless: currentConnection.isWhitelisted && networkSettings.seamlessCheckInEnabled,
      }
    );
    if (res.success) {
      webPushService.sendCheckInAlert({
        userName: currentUser.name,
        shift: checkInShift,
        time: res.record?.checkInTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: res.record?.status || 'Present',
        location: checkInLocation,
      });
    }
    refreshData();
    setShowCheckInForm(false);
    setCheckInNotes('');
    setNotificationBanner(res.message);
    setTimeout(() => setNotificationBanner(null), 4500);
  };

  // Handle Quick Check-Out
  const handleCheckOut = () => {
    const res = db.checkOut(currentUser.id, checkOutNotes);
    if (res.success) {
      webPushService.sendCheckOutAlert({
        userName: currentUser.name,
        shift: res.record?.shiftType || 'Morning',
        time: res.record?.checkOutTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        workingHours: res.record?.workingHours || 8,
        overtimeHours: res.record?.overtimeHours || 0,
      });
    }
    refreshData();
    setShowCheckOutForm(false);
    setCheckOutNotes('');
    setNotificationBanner(res.message);
    setTimeout(() => setNotificationBanner(null), 4500);
  };

  // Handle Manual Save
  const handleSaveManualRecord = (data: Omit<AttendanceRecord, 'id' | 'createdAt'>) => {
    db.manualRecordAttendance(data);
    refreshData();
    setNotificationBanner(`Attendance record for ${data.userName} saved successfully.`);
    setTimeout(() => setNotificationBanner(null), 4000);
  };

  // Handle Open Edit Shift & Attendance Modal
  const handleOpenEditShift = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setIsEditShiftModalOpen(true);
  };

  // Handle Save Edit Shift
  const handleSaveEditShift = (updated: AttendanceRecord) => {
    refreshData();
    setNotificationBanner(`Shift & attendance details for ${updated.userName} updated successfully.`);
    setTimeout(() => setNotificationBanner(null), 4000);
  };

  // Handle Delete Record
  const handleDeleteRecord = (rec: AttendanceRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecordToDelete(rec);
  };

  const handleConfirmDeleteRecord = () => {
    if (!recordToDelete) return;
    try {
      db.deleteAttendance(recordToDelete.id);
      refreshData();
      setNotificationBanner(
        lang === 'km'
          ? `បានលុបកំណត់ត្រាវត្តមានរបស់ ${recordToDelete.userName} ដោយជោគជ័យ។`
          : `Deleted attendance record for ${recordToDelete.userName} successfully.`
      );
      setTimeout(() => setNotificationBanner(null), 4000);
      setRecordToDelete(null);
    } catch (err: any) {
      setNotificationBanner(err.message || 'Failed to delete attendance record.');
      setTimeout(() => setNotificationBanner(null), 4000);
    }
  };

  // Handle Single Telegram Reminder to User (WITHOUT AUTO-CHECK IN!)
  const handleSendTelegramReminderToUser = async (userId: string, userName: string) => {
    const allUsers = db.getUsers();
    const targetUser = allUsers.find(u => u.id === userId);
    const telConfig = db.getTelegramConfig();
    const targetChatId = targetUser?.telegramChatId || telConfig.defaultChatId;

    if (!targetChatId) {
      setNotificationBanner(
        lang === 'km'
          ? `សូមកំណត់ Telegram Chat ID សម្រាប់ ${userName} ជាមុនសិនក្នុងមជ្ឈមណ្ឌល Telegram`
          : `Please configure a Telegram Chat ID for ${userName} in the Telegram Alert Center.`
      );
      setTimeout(() => setNotificationBanner(null), 4500);
      setIsTelegramModalOpen(true);
      return;
    }

    const dept = departments.find(d => d.id === targetUser?.departmentId)?.name || 'General Department';
    const msg = buildOverdueCheckInMessage({
      employeeName: userName,
      employeeId: targetUser?.employeeId || 'EMP',
      departmentName: dept,
      shiftName: lang === 'km' ? 'វេនព្រឹក' : 'Morning Shift',
      shiftTime: '08:00 - 12:00',
      overdueMinutes: 15,
      graceMinutes: telConfig.gracePeriodMinutes || 15,
      lang,
    });

    const res = await sendTelegramMessage(telConfig.botToken, targetChatId, msg);

    db.logTelegramNotification({
      id: `tlog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      recipientUserId: userId,
      recipientName: userName,
      recipientChatId: targetChatId,
      type: 'overdue_checkin_alert',
      messageText: msg,
      status: res.status,
      errorDetails: res.error,
      deliveredAt: res.ok ? new Date().toISOString() : undefined,
    });

    setNotificationBanner(
      lang === 'km'
        ? `បានផ្ញើសាររំលឹកវត្តមានតាម Telegram ទៅកាន់ ${userName} រួចរាល់ (${res.status})។ មិនមានការកត់ត្រាចូលស្វ័យប្រវត្តិទេ។`
        : `Dispatched Telegram check-in alert to ${userName} (${res.status}). No auto-check in performed.`
    );
    setTimeout(() => setNotificationBanner(null), 4500);
  };

  // Handle Automated Monthly Report Generation
  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newRep = db.generateMonthlyReport(reportGenMonth, reportGenDept, currentUser);
      refreshData();
      setIsGenerating(false);
      setSelectedReport(newRep);
      setIsDossierOpen(true);
      setNotificationBanner(`Automated report ${newRep.reportCode} generated successfully.`);
      setTimeout(() => setNotificationBanner(null), 5000);
    }, 600);
  };

  // Filtered Daily Records with strict Employee privacy enforcement
  const filteredRecords = useMemo(() => {
    let base = records;
    // Strict privacy guarantee: Employees can only access their own attendance records
    if (isEmployee) {
      base = base.filter(r => r.userId === currentUser.id);
    }

    return base.filter(r => {
      if (filterDate && r.date !== filterDate) return false;
      if (!isEmployee && filterDept !== 'all' && r.departmentId !== filterDept) return false;
      if (!isEmployee && filterEmployee !== 'all' && r.userId !== filterEmployee) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterShift !== 'all') {
        const isMorning = r.shiftType === 'Morning' || r.workShift?.toLowerCase().includes('morning') || r.workShift?.toLowerCase().includes('08:00');
        const isEvening = r.shiftType === 'Evening' || r.workShift?.toLowerCase().includes('evening') || r.workShift?.toLowerCase().includes('14:00');
        if (filterShift === 'Morning' && !isMorning) return false;
        if (filterShift === 'Evening' && !isEvening) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = r.userName.toLowerCase().includes(q);
        const matchEmpId = r.employeeId?.toLowerCase().includes(q);
        const matchNotes = r.notes?.toLowerCase().includes(q);
        const matchLoc = r.location?.toLowerCase().includes(q);
        const matchShift = r.workShift?.toLowerCase().includes(q);
        if (!matchName && !matchEmpId && !matchNotes && !matchLoc && !matchShift) return false;
      }
      return true;
    });
  }, [records, isEmployee, currentUser.id, filterDate, filterDept, filterEmployee, filterStatus, filterShift, searchQuery]);

  // Filtered Personal History for Current User
  const myHistory = useMemo(() => {
    return records.filter(r => r.userId === currentUser.id);
  }, [records, currentUser.id]);

  // Personal metrics for employee monitoring
  const myTotalWorkingHours = useMemo(() => {
    return Math.round(myHistory.reduce((acc, r) => acc + (r.workingHours || 0), 0) * 10) / 10;
  }, [myHistory]);

  const myTotalOvertimeHours = useMemo(() => {
    return Math.round(myHistory.reduce((acc, r) => acc + (r.overtimeHours || 0), 0) * 10) / 10;
  }, [myHistory]);

  const myPunctualityRate = useMemo(() => {
    if (myHistory.length === 0) return 100;
    const onTimeCount = myHistory.filter(r => r.status === 'Present' || r.status === 'Overtime').length;
    return Math.round((onTimeCount / myHistory.length) * 100);
  }, [myHistory]);

  // Today's enterprise metrics
  const todayRecords = records.filter(r => r.date === '2026-09-17');
  const presentCount = todayRecords.filter(r => r.status === 'Present' || r.status === 'Overtime').length;
  const lateCount = todayRecords.filter(r => r.status === 'Late').length;
  const leaveCount = todayRecords.filter(r => r.status === 'On Leave').length;
  const morningShiftCount = todayRecords.filter(r => r.shiftType === 'Morning' || r.workShift?.toLowerCase().includes('morning') || r.workShift?.toLowerCase().includes('08:00')).length;
  const eveningShiftCount = todayRecords.filter(r => r.shiftType === 'Evening' || r.workShift?.toLowerCase().includes('evening') || r.workShift?.toLowerCase().includes('14:00')).length;
  const totalLoggedCount = todayRecords.length;
  const totalEmployees = users.filter(u => u.status === 'Active' && u.isActive !== false).length;
  const todayCompliancePct = Math.min(100, Math.round(((presentCount + leaveCount * 0.7) / Math.max(1, totalEmployees)) * 100));

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notificationBanner && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
            <span>{notificationBanner}</span>
          </div>
          <button
            onClick={() => setNotificationBanner(null)}
            className="text-emerald-200 hover:text-white p-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                {lang === 'km' ? 'ម៉ូឌុលវត្តមានផ្ទាល់' : 'Live Attendance Module'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {lang === 'km' ? 'អភិបាលកិច្ចកម្លាំងពលកម្មសហគ្រាស' : 'Enterprise Workforce Governance'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {t.attendance || 'Attendance & Time Tracking'}
            </h1>
            <p className="text-xs text-slate-500">
              {lang === 'km'
                ? 'ការតាមដានការកត់ត្រាចូល/ចេញ របាយការណ៍ប្រចាំខែស្វ័យប្រវត្តិ សវនកម្មម៉ោងបន្ថែម និងការភ្ជាប់សកម្មភាព KPI។'
                : 'Clock-in/out tracking, automated monthly reporting, overtime auditing, and KPI activity linkage.'}
            </p>
          </div>

          {/* Real-time Clock & Today's Date */}
          <div className="flex items-center space-x-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">
                {lang === 'km' ? 'ថ្ងៃព្រហស្បតិ៍ ទី១៧ ខែកញ្ញា ឆ្នាំ២០២៦' : 'Thursday, September 17, 2026'}
              </div>
              <div className="text-sm font-mono font-bold text-blue-600">
                {currentTime || '08:00:00 AM'}
              </div>
            </div>
          </div>
        </div>

        {/* User's Personal Clock In / Out Action Banner */}
        <div className="mt-5 pt-5 border-t border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full shrink-0 ${
                todayRecord?.checkOutTime 
                  ? 'bg-slate-400' 
                  : todayRecord?.checkInTime 
                  ? 'bg-emerald-500 animate-pulse' 
                  : 'bg-amber-500'
              }`} />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-800">
                    {currentUser.name} ({currentUser.role})
                  </span>
                  {todayRecord?.shiftType && (
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      todayRecord.shiftType === 'Evening'
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {todayRecord.shiftType === 'Evening' ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}
                      <span>{todayRecord.shiftType === 'Evening' ? (lang === 'km' ? 'វេនល្ងាច' : 'Evening Shift') : (lang === 'km' ? 'វេនព្រឹក' : 'Morning Shift')}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {todayRecord?.checkOutTime ? (
                    <span className="text-slate-700 font-medium">
                      {lang === 'km' ? 'បានបញ្ចប់វេន៖' : 'Shift Completed:'} {todayRecord.checkInTime} - {todayRecord.checkOutTime} ({todayRecord.workingHours} {lang === 'km' ? 'ម៉ោង' : 'hrs logged'}{todayRecord.overtimeHours > 0 ? `, ${todayRecord.overtimeHours}h OT` : ''}) &bull; {todayRecord.workShift}
                    </span>
                  ) : todayRecord?.checkInTime ? (
                    <span className="text-emerald-700 font-medium">
                      {lang === 'km' ? 'បានកត់ត្រាចូលនៅ' : 'Clocked in at'} <span className="font-bold">{todayRecord.checkInTime}</span> ({todayRecord.status}) &bull; {todayRecord.workShift} &bull; {todayRecord.location || 'Office HQ'}
                      {todayRecord.networkWhitelisted && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">
                          IP Verified
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">
                      {lang === 'km'
                        ? 'មិនទាន់បានកត់ត្រាចូលថ្ងៃនេះទេ។ សូមជ្រើសរើសវេនការងាររបស់អ្នក ហើយកត់ត្រាចូលដើម្បីចុះវត្តមាន។'
                        : 'Not clocked in today. Please select your shift and clock in to register your attendance.'}
                    </span>
                  )}
                </p>

                {/* Workplace IP Presence Chip */}
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    <Globe className="w-3.5 h-3.5 text-teal-600" />
                    <span className="font-mono text-[11px] font-semibold">{currentConnection.clientIp}</span>
                    <span className="text-slate-400 text-[10px]">({currentConnection.networkName || 'Client IP'})</span>
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      currentConnection.isWhitelisted
                        ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {currentConnection.isWhitelisted
                      ? lang === 'km' ? 'IP អនុញ្ញាត (Whitelisted)' : 'Whitelisted IP (Seamless)'
                      : lang === 'km' ? 'IP ក្រៅប្រព័ន្ធ' : 'External / Remote IP'}
                  </span>

                  {currentConnection.isWhitelisted && networkSettings.seamlessCheckInEnabled && (
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{lang === 'km' ? 'កត់ត្រារហ័ស ១-Tap សកម្ម' : '1-Tap Seamless Ready'}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {!todayRecord?.checkInTime ? (
                <>
                  {!showCheckInForm ? (
                    <button
                      onClick={() => setShowCheckInForm(true)}
                      className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition active:scale-95"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{t.checkInNow || 'Clock In Now'}</span>
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-emerald-200 shadow-sm w-full sm:w-auto">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* 2-Shift Toggle Buttons */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setCheckInShift('Morning')}
                            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                              checkInShift === 'Morning'
                                ? 'bg-white text-amber-800 shadow-xs ring-1 ring-amber-400/50'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Sun className="w-3 h-3 text-amber-500" />
                            <span>{t.morningShiftShort || 'Morning'}</span>
                            <span className="text-[10px] text-slate-400 font-normal ml-0.5">(08:00)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCheckInShift('Evening')}
                            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                              checkInShift === 'Evening'
                                ? 'bg-white text-indigo-800 shadow-xs ring-1 ring-indigo-400/50'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Moon className="w-3 h-3 text-indigo-500" />
                            <span>{t.eveningShiftShort || 'Evening'}</span>
                            <span className="text-[10px] text-slate-400 font-normal ml-0.5">(14:00)</span>
                          </button>
                        </div>

                        <input
                          type="text"
                          placeholder={lang === 'km' ? 'កំណត់ចំណាំ (ជាជម្រើស)...' : 'Notes (optional)...'}
                          value={checkInNotes}
                          onChange={e => setCheckInNotes(e.target.value)}
                          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-36"
                        />
                        <select
                          value={checkInLocation}
                          onChange={e => setCheckInLocation(e.target.value)}
                          className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden bg-white"
                        >
                          <option value="Phnom Penh HQ - Main Tower">{lang === 'km' ? 'ការិយាល័យកណ្តាល (HQ)' : 'HQ Tower'}</option>
                          <option value="HQ Data Center - Room 102">{lang === 'km' ? 'មជ្ឈមណ្ឌលទិន្នន័យ (DC)' : 'Data Center'}</option>
                          <option value="Tech Wing - Engineering Desk">{lang === 'km' ? 'ផ្នែកបច្ចេកវិទ្យា' : 'Tech Wing'}</option>
                          <option value="Remote / Client Field Site">{lang === 'km' ? 'ពីចម្ងាយ / ការដ្ឋាន' : 'Remote / Field'}</option>
                        </select>
                        <button
                          onClick={handleCheckIn}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{lang === 'km' ? 'បញ្ជាក់ចូល' : 'Confirm Clock In'}</span>
                        </button>
                        <button
                          onClick={() => setShowCheckInForm(false)}
                          className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                        >
                          {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                        </button>
                      </div>

                      {/* Workplace IP Connection Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                          <Globe className="w-3.5 h-3.5 text-teal-600" />
                          <span>
                            {lang === 'km' ? 'អាសយដ្ឋាន IP:' : 'Client IP:'}{' '}
                            <strong className="text-slate-800 dark:text-slate-200">{currentConnection.clientIp}</strong> ({currentConnection.networkName || 'Workplace IP'})
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            currentConnection.isWhitelisted
                              ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {currentConnection.isWhitelisted
                            ? (lang === 'km' ? 'IP អនុញ្ញាត' : 'Whitelisted IP')
                            : (lang === 'km' ? 'IP ក្រៅប្រព័ន្ធ' : 'External IP')}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : !todayRecord.checkOutTime ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditShift(todayRecord)}
                    className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition active:scale-95"
                    title={lang === 'km' ? 'កែប្រែប្រភេទវេន ឬម៉ោង' : 'Edit shift type, hours or clock timings'}
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === 'km' ? 'កែប្រែវេន' : 'Edit Shift'}</span>
                  </button>
                  {!showCheckOutForm ? (
                    <button
                      onClick={() => setShowCheckOutForm(true)}
                      className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition active:scale-95"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t.checkOutNow || 'Clock Out Now'}</span>
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-xs w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder={lang === 'km' ? 'កំណត់ចំណាំពេលចេញ...' : 'Checkout notes / summary...'}
                        value={checkOutNotes}
                        onChange={e => setCheckOutNotes(e.target.value)}
                        className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-rose-500 w-full sm:w-52"
                      />
                      <button
                        onClick={handleCheckOut}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md"
                      >
                        {lang === 'km' ? 'បញ្ជាក់ការចេញ' : 'Confirm Clock Out'}
                      </button>
                      <button
                        onClick={() => setShowCheckOutForm(false)}
                        className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                      >
                        {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditShift(todayRecord)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition"
                    title={lang === 'km' ? 'កែប្រែព័ត៌មានវេនថ្ងៃនេះ' : 'Edit shift details for today'}
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === 'km' ? 'កែប្រែវេន' : 'Edit Shift'}</span>
                  </button>
                  <span className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-200 rounded-lg">
                    {lang === 'km' ? 'បានបិទវេន' : 'Shift Closed'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick KPI Counters & Shift Distribution */}
        {isEmployee ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500">
                {lang === 'km' ? 'ស្ថានភាពថ្ងៃនេះ' : "Today's Status"}
              </span>
              <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                {todayRecord?.checkOutTime ? (
                  <span className="text-slate-600 font-semibold">{lang === 'km' ? 'បានបញ្ចប់វេន' : 'Shift Completed'}</span>
                ) : todayRecord?.checkInTime ? (
                  <span className="text-emerald-700">{lang === 'km' ? 'បានចូលធ្វើការ' : 'Clocked In'} ({todayRecord.checkInTime})</span>
                ) : (
                  <span className="text-amber-700">{lang === 'km' ? 'មិនទាន់កត់ត្រា' : 'Not Clocked In'}</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/80">
              <span className="text-[11px] font-medium text-amber-800 flex items-center space-x-1">
                <Sun className="w-3 h-3 text-amber-500" />
                <span>{lang === 'km' ? 'វេនការងារ' : 'Assigned Shift'}</span>
              </span>
              <div className="text-xs font-bold text-amber-900 mt-1 truncate">
                {todayRecord?.workShift || 'Morning (08:00 - 16:30)'}
              </div>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/80">
              <span className="text-[11px] font-medium text-emerald-800">
                {lang === 'km' ? 'អត្រាអនុលោមភាព' : 'My Compliance'}
              </span>
              <div className="text-base font-bold text-emerald-700 mt-0.5">
                {myPunctualityRate}% <span className="text-[10px] font-normal text-slate-500">{lang === 'km' ? 'ទាន់ពេល' : 'punctual'}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500">
                {lang === 'km' ? 'ម៉ោងបំពេញការងារ' : 'Logged Hours'}
              </span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {myTotalWorkingHours}h <span className="text-[10px] font-normal text-slate-500">{lang === 'km' ? 'ខែនេះ' : 'month'}</span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-200/80">
              <span className="text-[11px] font-medium text-indigo-800 flex items-center space-x-1">
                <Moon className="w-3 h-3 text-indigo-500" />
                <span>{lang === 'km' ? 'ម៉ោងបន្ថែម (OT)' : 'Overtime Logged'}</span>
              </span>
              <div className="text-base font-bold text-indigo-900 mt-0.5">
                +{myTotalOvertimeHours}h
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200/80">
              <span className="text-[11px] font-medium text-blue-800 flex items-center space-x-1">
                <Lock className="w-3 h-3 text-blue-600" />
                <span>{lang === 'km' ? 'ភាពឯកជន' : 'Privacy Protection'}</span>
              </span>
              <div className="text-xs font-bold text-blue-900 mt-1 truncate">
                {lang === 'km' ? 'ផ្ទាល់ខ្លួនប៉ុណ្ណោះ' : 'Self-Access Only'}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500">
                {lang === 'km' ? 'សរុបថ្ងៃនេះ' : "Today's Total"}
              </span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-base font-bold text-slate-900">{totalLoggedCount} / {totalEmployees}</span>
                <span className="text-[11px] font-semibold text-emerald-600">({todayCompliancePct}%)</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500">
                {lang === 'km' ? 'មានវត្តមាន & សកម្ម' : 'Present & Active'}
              </span>
              <div className="text-base font-bold text-emerald-700 mt-0.5">
                {presentCount} <span className="text-xs font-normal text-slate-500">{lang === 'km' ? 'នាក់' : 'staff'}</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/80">
              <span className="text-[11px] font-medium text-amber-800 flex items-center space-x-1">
                <Sun className="w-3 h-3 text-amber-500" />
                <span>{t.morningShiftShort || 'Morning Shift'}</span>
              </span>
              <div className="text-base font-bold text-amber-900 mt-0.5">
                {morningShiftCount} <span className="text-xs font-normal text-slate-500">{lang === 'km' ? 'នាក់' : 'staff'} (08:00)</span>
              </div>
            </div>
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-200/80">
              <span className="text-[11px] font-medium text-indigo-800 flex items-center space-x-1">
                <Moon className="w-3 h-3 text-indigo-500" />
                <span>{t.eveningShiftShort || 'Evening Shift'}</span>
              </span>
              <div className="text-base font-bold text-indigo-900 mt-0.5">
                {eveningShiftCount} <span className="text-xs font-normal text-slate-500">{lang === 'km' ? 'នាក់' : 'staff'} (14:00)</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500">
                {lang === 'km' ? 'មកយឺត' : 'Late Arrivals'}
              </span>
              <div className="text-base font-bold text-amber-600 mt-0.5">
                {lateCount} <span className="text-xs font-normal text-slate-500">{lang === 'km' ? 'នាក់' : 'flagged'}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500">
                {lang === 'km' ? 'ច្បាប់ឈប់សម្រាក' : 'On Approved Leave'}
              </span>
              <div className="text-base font-bold text-blue-600 mt-0.5">
                {leaveCount} <span className="text-xs font-normal text-slate-500">{lang === 'km' ? 'នាក់' : 'staff'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Privacy Protection & Assistance Notice Banner */}
        <div className="mt-4 p-4 rounded-xl border border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {lang === 'km' ? 'គោលការណ៍ឯកជនភាពវត្តមានបុគ្គលិក' : 'Employee Attendance Privacy Policy'}
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {isEmployee ? (lang === 'km' ? 'ចូលមើលផ្ទាល់ខ្លួនប៉ុណ្ណោះ' : 'Self-Access Only') : (lang === 'km' ? 'សិទ្ធិគ្រប់គ្រងស្ថាប័ន' : 'Supervisor / Admin Authorized')}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                {lang === 'km'
                  ? 'បុគ្គលិកអាចចូលមើលបានតែកំណត់ត្រាវត្តមានផ្ទាល់ខ្លួនរបស់ពួកគេប៉ុណ្ណោះ។ ការណ៍នេះធានាភាពឯកជន និងអនុញ្ញាតឱ្យបុគ្គលម្នាក់ៗតាមដានវត្តមានរបស់ខ្លួនដោយគ្មានការរំខាន។ ប្រសិនបើលោកអ្នកត្រូវការពិនិត្យ ឬគ្រប់គ្រងវត្តមានសម្រាប់អ្នកដទៃ សូមទាក់ទងអ្នកគ្រប់គ្រងផ្ទាល់ ឬផ្នែកធនធានមនុស្ស (HR) ដើម្បីទទួលបានជំនួយ។'
                  : 'Employees can only access their own attendance records. This ensures privacy and allows individuals to monitor their attendance without interference. If you need to check or manage attendance for others, please contact your supervisor or HR department for assistance.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-center">
            <button
              onClick={() => setIsContactSupervisorModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg shadow-xs transition active:scale-95 whitespace-nowrap"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === 'km' ? 'ទាក់ទងអ្នកគ្រប់គ្រង ឬ HR' : 'Contact Supervisor / HR'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'daily'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{lang === 'km' ? 'បញ្ជីវត្តមានប្រចាំថ្ងៃ' : 'Daily Attendance Roster'}</span>
          </button>
          <button
            onClick={() => setActiveTab('monthly-reports')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'monthly-reports'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.automatedMonthlyReport || 'Automated Monthly Reports'}</span>
            <span className="px-1.5 py-0.2 bg-blue-500 text-white rounded-full text-[10px] font-bold">
              {monthlyReports.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('my-history')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'my-history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{lang === 'km' ? 'កំណត់ត្រាវត្តមានរបស់ខ្ញុំ' : 'My Attendance Log'}</span>
          </button>

          {/* Only Admin can manage IP whitelist to accept checkin and checkout */}
          {isSuperOrAdmin && (
            <button
              id="tab-btn-network-whitelist-main"
              onClick={() => setActiveTab('network-whitelist')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'network-whitelist'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-teal-800 bg-teal-50 hover:bg-teal-100 hover:text-teal-900 border border-teal-200/80'
              }`}
            >
              <Globe className="w-4 h-4 text-teal-600" />
              <span>{lang === 'km' ? 'គ្រប់គ្រង IP អនុញ្ញាត (Admin)' : 'Manage Allowed IPs (Admin)'}</span>
              <span className="px-1.5 py-0.2 bg-teal-200 text-teal-900 rounded-full text-[10px] font-bold">
                {currentConnection.isWhitelisted ? 'Whitelisted' : 'External'}
              </span>
            </button>
          )}
        </div>

        {/* Action buttons */}
        {activeTab === 'daily' && (
          <div className="flex items-center space-x-2">
            {isEmployee && (
              <button
                id="btn-contact-supervisor-attendance"
                onClick={() => setIsContactSupervisorModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition"
                title={lang === 'km' ? 'ទាក់ទងអ្នកគ្រប់គ្រង ឬ HR សម្រាប់ជំនួយវត្តមាន' : 'Contact your supervisor or HR department for attendance assistance'}
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>{lang === 'km' ? 'ជំនួយពីអ្នកគ្រប់គ្រង / HR' : 'Supervisor / HR Assistance'}</span>
              </button>
            )}
            <button
              id="btn-telegram-attendance-alerts"
              onClick={() => setIsTelegramModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition shadow-2xs"
              title={lang === 'km' ? 'ប្រព័ន្ធជូនដំណឹងមុនម៉ោងវេនការងារ និងវត្តមានតាម Telegram (Admin Bot & Channel ID)' : 'Telegram Bot & Channel Settings • Advance Pre-Shift Alerts'}
            >
              <Send className="w-3.5 h-3.5 text-sky-600" />
              <span>{lang === 'km' ? 'Telegram & ជូនដំណឹងមុនម៉ោង' : 'Telegram & Pre-Shift Alerts'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>
            <button
              id="btn-webpush-attendance-alerts"
              onClick={() => setIsWebPushModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition shadow-2xs"
              title={lang === 'km' ? 'ប្រព័ន្ធជូនដំណឹង Web Push លើទូរស័ព្ទ និងកុំព្យូទ័រពេលកត់ត្រាវត្តមានចូល/ចេញ' : 'Web Push Browser & Mobile Alerts for Check-in / Check-out'}
            >
              <Bell className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'km' ? 'Web Push វត្តមាន' : 'Web Push Alerts'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            </button>
            <button
              onClick={() => setIsShiftSchedulesModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition"
              title={lang === 'km' ? 'កំណត់រចនាសម្ព័ន្ធកាលវិភាគវេនការងារ' : 'Configure institutional shift schedules and hours'}
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'km' ? 'កាលវិភាគវេនការងារ' : 'Shift Schedules'}</span>
            </button>
            {(currentUser.role === 'Super Admin' || currentUser.role === 'Administrator' || currentUser.role === 'Department Manager') && (
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.manualEntry || 'Manual Entry / Adjustment'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: DAILY ROSTER */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date */}
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Department */}
              {isEmployee ? (
                <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold">{departments.find(d => d.id === currentUser.departmentId)?.name || 'Department'}</span>
                </div>
              ) : (
                <select
                  value={filterDept}
                  onChange={e => setFilterDept(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden bg-white"
                >
                  <option value="all">{lang === 'km' ? 'គ្រប់នាយកដ្ឋាន' : 'All Departments'}</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}

              {/* Status */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden bg-white"
              >
                <option value="all">{lang === 'km' ? 'គ្រប់ស្ថានភាព' : 'All Statuses'}</option>
                <option value="Present">{lang === 'km' ? 'មានវត្តមាន' : 'Present'}</option>
                <option value="Late">{lang === 'km' ? 'មកយឺត' : 'Late'}</option>
                <option value="Overtime">{lang === 'km' ? 'ថែមម៉ោង' : 'Overtime'}</option>
                <option value="Half Day">{lang === 'km' ? 'កន្លះថ្ងៃ' : 'Half Day'}</option>
                <option value="On Leave">{lang === 'km' ? 'ច្បាប់ឈប់សម្រាក' : 'On Leave'}</option>
                <option value="Absent">{lang === 'km' ? 'អវត្តមាន' : 'Absent'}</option>
              </select>

              {/* Work Shift Filter */}
              <select
                value={filterShift}
                onChange={e => setFilterShift(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden bg-white font-medium text-slate-700"
              >
                <option value="all">{t.allShifts || (lang === 'km' ? 'គ្រប់វេនទាំងអស់' : 'All Shifts')}</option>
                <option value="Morning">☀️ {t.morningShiftShort || 'Morning Shift'} (08:00 - 16:30)</option>
                <option value="Evening">🌙 {t.eveningShiftShort || 'Evening Shift'} (14:00 - 22:00)</option>
              </select>

              {/* Employee */}
              {isEmployee ? (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-800 shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>{currentUser.name}</span>
                  <span className="text-[10px] text-blue-600/70 font-normal">({lang === 'km' ? 'កំណត់ត្រាផ្ទាល់ខ្លួន' : 'Self Only'})</span>
                </div>
              ) : (
                <select
                  value={filterEmployee}
                  onChange={e => setFilterEmployee(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden bg-white"
                >
                  <option value="all">{lang === 'km' ? 'បុគ្គលិកទាំងអស់' : 'All Employees'}</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={lang === 'km' ? 'ស្វែងរកបុគ្គលិក ទីតាំង សម្គាល់...' : 'Search staff, location, remarks...'}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{lang === 'km' ? 'បុគ្គលិក' : 'Employee'}</th>
                    <th className="py-3 px-3">{lang === 'km' ? 'កាលបរិច្ឆេទ & វេន' : 'Date & Shift'}</th>
                    <th className="py-3 px-3 text-center">{lang === 'km' ? 'ម៉ោងចូល' : 'Clock In'}</th>
                    <th className="py-3 px-3 text-center">{lang === 'km' ? 'ម៉ោងចេញ' : 'Clock Out'}</th>
                    <th className="py-3 px-3 text-center">{lang === 'km' ? 'រយៈពេល' : 'Duration'}</th>
                    <th className="py-3 px-3 text-center">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                    <th className="py-3 px-3">{lang === 'km' ? 'ទីតាំង & ឧបករណ៍' : 'Location & Device'}</th>
                    <th className="py-3 px-3">{lang === 'km' ? 'កំណត់ចំណាំ' : 'Notes'}</th>
                    <th className="py-3 px-3 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium">
                          {lang === 'km' ? 'រកមិនឃើញកំណត់ត្រាវត្តមានសម្រាប់កាលបរិច្ឆេទ ឬតម្រងនេះទេ។' : 'No attendance records found for this date or filter.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map(rec => {
                      const empDept = departments.find(d => d.id === rec.departmentId);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{rec.userName}</div>
                            <div className="text-[11px] text-slate-400">
                              {rec.employeeId || 'EMP'} • {empDept?.name || 'Dept'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{rec.date}</div>
                            <div className="mt-1">
                              {rec.shiftType === 'Evening' || rec.workShift?.toLowerCase().includes('evening') || rec.workShift?.toLowerCase().includes('14:00') ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                                  <Moon className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span>{lang === 'km' ? 'វេនល្ងាច' : 'Evening'}</span>
                                  <span className="text-[9px] text-indigo-500/80 font-mono font-normal">14:00-22:00</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                  <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span>{lang === 'km' ? 'វេនព្រឹក' : 'Morning'}</span>
                                  <span className="text-[9px] text-amber-600/80 font-mono font-normal">08:00-16:30</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-medium">
                            {rec.checkInTime ? (
                              <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                {rec.checkInTime}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-medium">
                            {rec.checkOutTime ? (
                              <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                {rec.checkOutTime}
                              </span>
                            ) : rec.checkInTime ? (
                              <span className="text-emerald-600 font-semibold animate-pulse text-[11px]">
                                {lang === 'km' ? 'កំពុងបំពេញការងារ' : 'In Progress'}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-medium">
                            {rec.workingHours > 0 ? (
                              <div>
                                <span className="text-slate-800 font-bold">{rec.workingHours}h</span>
                                {rec.overtimeHours > 0 && (
                                  <span className="ml-1 text-indigo-600 text-[10px] font-bold">
                                    (+{rec.overtimeHours}h OT)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">0h</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              rec.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : rec.status === 'Late'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : rec.status === 'Overtime'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : rec.status === 'On Leave'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {rec.status === 'Present' && lang === 'km' ? 'មានវត្តមាន' :
                               rec.status === 'Late' && lang === 'km' ? 'មកយឺត' :
                               rec.status === 'Overtime' && lang === 'km' ? 'ថែមម៉ោង' :
                               rec.status === 'On Leave' && lang === 'km' ? 'ច្បាប់ឈប់សម្រាក' :
                               rec.status === 'Absent' && lang === 'km' ? 'អវត្តមាន' :
                               rec.status === 'Half Day' && lang === 'km' ? 'កន្លះថ្ងៃ' : rec.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[11px]">
                            <div className="flex items-center space-x-1 text-slate-700 font-medium truncate max-w-[160px]">
                              {rec.isAnonymized || rec.zeroSignalVerified || rec.checkInMethod?.includes('Zero-Tracking') ? (
                                <span title="Zero-Tracking Anonymized Zone" className="inline-flex items-center">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                </span>
                              ) : (
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              )}
                              <span className={`truncate ${rec.isAnonymized || rec.locationAnonymized ? 'text-emerald-800 font-semibold' : ''}`}>
                                {rec.location || 'Anonymized Campus Zone'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[10px]">
                              {(rec.zeroSignalVerified || rec.checkInMethod?.includes('Zero-Tracking')) && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                                  Zero-Track
                                </span>
                              )}
                              {(rec.vpnProtected || rec.ipAddress?.includes('VPN')) && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-mono">
                                  VPN
                                </span>
                              )}
                              <span className="text-slate-400 font-mono">
                                {(rec.checkInMethod || '').replace('Manual Self-Attestation (Zero-Tracking)', 'Self-Attest')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-500 max-w-[150px] truncate">
                            {rec.notes || '—'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {isEmployee ? (
                                <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  <Lock className="w-2.5 h-2.5 text-blue-500" />
                                  <span>{lang === 'km' ? 'ផ្ទាល់ខ្លួន' : 'My Record'}</span>
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleSendTelegramReminderToUser(rec.userId, rec.userName)}
                                    className="p-1 text-slate-400 hover:text-sky-600 rounded-md hover:bg-sky-50 transition"
                                    title={
                                      lang === 'km'
                                        ? `ផ្ញើសាររំលឹកវត្តមានតាម Telegram ទៅកាន់ ${rec.userName} (មិនកត់ត្រាស្វ័យប្រវត្តិ)`
                                        : `Send Telegram check-in reminder to ${rec.userName} (No auto-check in)`
                                    }
                                  >
                                    <Send className="w-3.5 h-3.5 text-sky-600" />
                                  </button>
                                  {(currentUser.role === 'Super Admin' || currentUser.role === 'Administrator' || currentUser.role === 'Department Manager') && (
                                    <button
                                      onClick={() => handleOpenEditShift(rec)}
                                      className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition"
                                      title="Edit shift & attendance"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {(currentUser.role === 'Super Admin' || currentUser.role === 'Administrator') && (
                                    <button
                                      onClick={(e) => handleDeleteRecord(rec, e)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition"
                                      title={lang === 'km' ? 'លុបកំណត់ត្រាវត្តមាន' : 'Delete record'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATED MONTHLY REPORTS */}
      {activeTab === 'monthly-reports' && (
        <div className="space-y-6">
          {/* Employee Privacy Guidance or Generator Control Card */}
          {isEmployee ? (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold border border-blue-400/30">
                  <Lock className="w-3 h-3 text-blue-300" />
                  <span>{lang === 'km' ? 'គោលការណ៍ឯកជនភាពវត្តមានបុគ្គលិក' : 'Employee Privacy & Access Control'}</span>
                </div>
                <h3 className="text-base font-bold">
                  {lang === 'km' ? 'ការគ្រប់គ្រង និងទាញយករបាយការណ៍សង្ខេបស្ថាប័ន' : 'Institutional Monthly Reports & Individual Audits'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lang === 'km'
                    ? 'បុគ្គលិកអាចចូលមើលបានតែកំណត់ត្រាវត្តមានផ្ទាល់ខ្លួនរបស់ពួកគេប៉ុណ្ណោះ។ ការណ៍នេះធានាភាពឯកជន និងអនុញ្ញាតឱ្យបុគ្គលម្នាក់ៗតាមដានវត្តមានរបស់ខ្លួនដោយគ្មានការរំខាន។ ប្រសិនបើលោកអ្នកត្រូវការពិនិត្យ ឬគ្រប់គ្រងវត្តមានសម្រាប់អ្នកដទៃ សូមទាក់ទងអ្នកគ្រប់គ្រងផ្ទាល់ ឬផ្នែកធនធានមនុស្ស (HR) ដើម្បីទទួលបានជំនួយ។'
                    : 'Employees can only access their own attendance records. This ensures privacy and allows individuals to monitor their attendance without interference. If you need to check or manage attendance for others, please contact your supervisor or HR department for assistance.'}
                </p>
              </div>
              <div className="shrink-0">
                <button
                  onClick={() => setIsContactSupervisorModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition active:scale-95"
                >
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'km' ? 'ទាក់ទងអ្នកគ្រប់គ្រង ឬ HR' : 'Contact Supervisor / HR'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'ការវិភាគថ្នាក់ដឹកនាំស្វ័យប្រវត្តិ' : 'Automated Executive Analytics'}</span>
                  </div>
                  <h2 className="text-lg font-bold">
                    {t.autoGenerate || (lang === 'km' ? '⚡ បង្កើតរបាយការណ៍វត្តមានប្រចាំខែស្វ័យប្រវត្តិ' : '⚡ Auto-Generate Monthly Attendance Report')}
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lang === 'km'
                      ? 'ចងក្រងការកត់ត្រាវត្តមានប្រចាំថ្ងៃទាំងអស់ដោយស្វ័យប្រវត្តិ គណនាអត្រាអនុលោមភាពវត្តមានបុគ្គលិក ធ្វើសវនកម្មម៉ោងបន្ថែម និងភ្ជាប់ជាមួយលទ្ធផលសកម្មភាពផែនការសកម្មភាព។'
                      : 'Automatically compiles all daily punches, calculates employee attendance compliance rates, audits logged overtime hours, and cross-references deliverables with completed action plan activities.'}
                  </p>
                </div>

                {/* Generator Controls */}
                <div className="flex flex-wrap items-center gap-3 bg-white/10 p-3.5 rounded-xl backdrop-blur-xs border border-white/10 shrink-0">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-200 mb-1">
                      {lang === 'km' ? 'ខែ' : 'Month'}
                    </label>
                    <select
                      value={reportGenMonth}
                      onChange={e => setReportGenMonth(e.target.value)}
                      className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-hidden focus:border-blue-400"
                    >
                      <option value="2026-09">{lang === 'km' ? 'កញ្ញា ២០២៦' : 'September 2026'}</option>
                      <option value="2026-08">{lang === 'km' ? 'សីហា ២០២៦' : 'August 2026'}</option>
                      <option value="2026-07">{lang === 'km' ? 'កក្កដា ២០២៦' : 'July 2026'}</option>
                      <option value="2026-06">{lang === 'km' ? 'មិថុនា ២០២៦' : 'June 2026'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-200 mb-1">
                      {lang === 'km' ? 'នាយកដ្ឋាន' : 'Department'}
                    </label>
                    <select
                      value={reportGenDept}
                      onChange={e => setReportGenDept(e.target.value)}
                      className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-hidden focus:border-blue-400"
                    >
                      <option value="all">{lang === 'km' ? 'គ្រប់នាយកដ្ឋាន' : 'All Departments'}</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="self-end pt-2 sm:pt-0">
                    <button
                      onClick={handleGenerateReport}
                      disabled={isGenerating}
                      className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-75"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{lang === 'km' ? 'កំពុងចងក្រង...' : 'Compiling...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>{lang === 'km' ? 'បង្កើតរបាយការណ៍សង្ខេប' : 'Generate Dossier'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Published Reports Catalog */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {lang === 'km' ? `របាយការណ៍សង្ខេបប្រចាំខែដែលបានបង្កើត (${monthlyReports.length})` : `Generated Monthly Report Dossiers (${monthlyReports.length})`}
              </h3>
              <span className="text-xs text-slate-400">
                {lang === 'km' ? 'រក្សាទុកក្នុងកន្លែងផ្ទុកសុវត្ថិភាពសម្រាប់សវនកម្មធនធានមនុស្សផ្លូវការ' : 'Persisted in secure storage for official HR audits'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {monthlyReports.map(rep => (
                <div
                  key={rep.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {rep.reportCode}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {lang === 'km' ? 'បានបង្កើត៖' : 'Generated:'} {new Date(rep.generatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">
                      {rep.monthLabel} {lang === 'km' ? 'សវនកម្មវត្តមាន & កម្លាំងពលកម្ម' : 'Attendance & Labor Audit'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {lang === 'km' ? 'នាយកដ្ឋាន៖' : 'Department:'} <span className="font-semibold text-slate-700">{rep.departmentName}</span>
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 rounded-lg p-2.5 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {lang === 'km' ? 'ការអនុលោម' : 'Compliance'}
                        </span>
                        <div className="text-sm font-bold text-emerald-600">{rep.averageAttendanceRate}%</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {lang === 'km' ? 'ម៉ោងបានកត់ត្រា' : 'Hours Logged'}
                        </span>
                        <div className="text-sm font-bold text-slate-800">{rep.totalHoursLogged}h</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {lang === 'km' ? 'ថែមម៉ោង' : 'Overtime'}
                        </span>
                        <div className="text-sm font-bold text-indigo-600">+{rep.totalOvertimeHours}h</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedReport(rep);
                        setIsDossierOpen(true);
                      }}
                      className="flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                    >
                      <span>{lang === 'km' ? 'មើលរបាយការណ៍ផ្លូវការ' : 'View Official Dossier'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => {
                          const headers = ['Employee ID', 'Employee Name', 'Department', 'Position', 'Present', 'Late', 'Leave', 'Work Hours', 'Overtime Hours', 'Compliance (%)'];
                          const rows = rep.employeeSummaries.map(e => [e.employeeId, e.employeeName, e.departmentName, e.position, e.presentDays, e.lateDays, e.leaveDays, e.totalWorkingHours, e.totalOvertimeHours, `${e.attendanceRate}%`]);
                          exportToExcel(`${rep.reportCode}`, headers, rows);
                        }}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        title={lang === 'km' ? 'ទាញយកឯកសារ Excel' : 'Download Excel'}
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReport(rep);
                          setIsDossierOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                        title={lang === 'km' ? 'បោះពុម្ព' : 'Print'}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY ATTENDANCE HISTORY */}
      {activeTab === 'my-history' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{currentUser.name}</h3>
                <p className="text-xs text-slate-500">
                  {currentUser.position} • {departments.find(d => d.id === currentUser.departmentId)?.name}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                    <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'ម៉ោងចូល' : 'Clock In'}</th>
                    <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'ម៉ោងចេញ' : 'Clock Out'}</th>
                    <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'ម៉ោងបំពេញការងារ' : 'Working Hours'}</th>
                    <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'ថែមម៉ោង' : 'Overtime'}</th>
                    <th className="py-2.5 px-3 text-center">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                    <th className="py-2.5 px-3">{lang === 'km' ? 'ទីតាំង' : 'Location'}</th>
                    <th className="py-2.5 px-3">{lang === 'km' ? 'សម្គាល់' : 'Remarks'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {myHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        {lang === 'km' ? 'រកមិនឃើញប្រវត្តវត្តមានសម្រាប់គណនីរបស់អ្នកទេ។' : 'No attendance history found for your profile.'}
                      </td>
                    </tr>
                  ) : (
                    myHistory.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{rec.date}</td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {rec.checkInTime || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {rec.checkOutTime || (rec.checkInTime ? (lang === 'km' ? 'កំពុងបំពេញការងារ' : 'Active') : '—')}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {rec.workingHours}h
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-600">
                          {rec.overtimeHours > 0 ? `+${rec.overtimeHours}h` : '0h'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === 'Present'
                              ? 'bg-emerald-50 text-emerald-700'
                              : rec.status === 'Late'
                              ? 'bg-amber-50 text-amber-700'
                              : rec.status === 'Overtime'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}>
                            {rec.status === 'Present' && lang === 'km' ? 'មានវត្តមាន' :
                             rec.status === 'Late' && lang === 'km' ? 'មកយឺត' :
                             rec.status === 'Overtime' && lang === 'km' ? 'ថែមម៉ោង' :
                             rec.status === 'On Leave' && lang === 'km' ? 'ច្បាប់ឈប់សម្រាក' :
                             rec.status === 'Absent' && lang === 'km' ? 'អវត្តមាន' : rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500 truncate max-w-[150px]">
                          {rec.location || 'Office HQ'}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400 truncate max-w-[150px]">
                          {rec.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Workplace Internet & Wi-Fi Whitelist Tab (Admin Only) */}
      {activeTab === 'network-whitelist' && isSuperOrAdmin && (
        <NetworkWhitelistView
          currentUserRole={currentUser.role}
          lang={lang}
          onRefresh={refreshData}
        />
      )}

      {/* Manual Attendance Modal */}
      <ManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSave={handleSaveManualRecord}
        users={users}
        departments={departments}
        lang={lang}
        currentUser={currentUser}
        initialDate={filterDate}
      />

      {/* Official Monthly Report Dossier Modal */}
      <AttendanceDossierModal
        report={selectedReport}
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        lang={lang}
      />

      {/* Edit Shift & Attendance Modal */}
      <EditAttendanceShiftModal
        isOpen={isEditShiftModalOpen}
        onClose={() => {
          setIsEditShiftModalOpen(false);
          setEditingRecord(null);
        }}
        record={editingRecord}
        onSave={handleSaveEditShift}
        currentUser={currentUser}
        lang={lang}
      />

      {/* Shift Governance & Schedules Modal */}
      <ShiftSchedulesModal
        isOpen={isShiftSchedulesModalOpen}
        onClose={() => setIsShiftSchedulesModalOpen(false)}
        onSaved={refreshData}
        lang={lang}
      />

      {/* Contact Supervisor or HR Assistance Modal */}
      <ContactSupervisorModal
        isOpen={isContactSupervisorModalOpen}
        onClose={() => setIsContactSupervisorModalOpen(false)}
        currentUser={currentUser}
        lang={lang}
      />

      {/* CONFIRM DELETE ATTENDANCE RECORD MODAL */}
      {recordToDelete && (
        <div 
          id="confirm-delete-attendance-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'km' ? 'បញ្ជាក់ការលុបកំណត់ត្រាវត្តមាន' : 'Confirm Delete Attendance Record'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'km' ? 'ដកការកត់ត្រាវត្តមានចេញពីប្រព័ន្ធ' : 'Remove attendance entry from records'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{recordToDelete.userName}</span>
                <span className="text-slate-500 font-mono">{recordToDelete.date}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {lang === 'km'
                  ? `តើអ្នកពិតជាចង់លុបកំណត់ត្រាវត្តមានរបស់ ${recordToDelete.userName} សម្រាប់ថ្ងៃទី ${recordToDelete.date} (${recordToDelete.shiftType || recordToDelete.workShift || 'វេនការងារ'}) មែនទេ?`
                  : `Are you sure you want to delete the attendance record for ${recordToDelete.userName} on ${recordToDelete.date} (${recordToDelete.shiftType || recordToDelete.workShift || 'Work'} Shift)?`}
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecord}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'យល់ព្រមលុប' : 'Yes, Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Attendance Notification & Bot Alerts Modal */}
      <TelegramNotificationModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        currentUser={currentUser}
        lang={lang}
        onToast={(msg) => {
          setNotificationBanner(msg);
          setTimeout(() => setNotificationBanner(null), 4500);
        }}
      />

      {/* Web Push Attendance & Shift Alerts Modal */}
      <WebPushNotificationModal
        isOpen={isWebPushModalOpen}
        onClose={() => setIsWebPushModalOpen(false)}
        currentUser={currentUser}
        lang={lang}
      />
    </div>
  );
};
