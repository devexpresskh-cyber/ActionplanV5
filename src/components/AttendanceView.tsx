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
  QrCode,
  Zap,
  Camera,
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
import { QrAttendanceScannerModal } from './QrAttendanceScannerModal';
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

  // Instant QR Attendance Scanner Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalTab, setQrModalTab] = useState<'scanner' | 'my-badge' | 'kiosk-display'>('scanner');
  const handleOpenQrScanner = (tab: 'scanner' | 'my-badge' | 'kiosk-display' = 'scanner') => {
    setQrModalTab(tab);
    setIsQrModalOpen(true);
  };

  // Structured dual shift status for today (Morning 08:00 - 12:00 and Evening 13:00 - 17:00)
  const todayShiftStatus = useMemo(() => db.getTodayShiftStatus(currentUser.id), [currentUser.id, records]);

  // Handle Shift-specific 1-tap clock in/out
  const handleShiftClockIn = (shift: ShiftType) => {
    const res = db.checkIn(
      currentUser.id,
      `Clock-in for ${shift} Shift`,
      checkInLocation || 'Phnom Penh HQ - Main Tower',
      shift,
      undefined,
      {
        clientIp: currentConnection.clientIp,
        networkId: currentConnection.networkId,
        forceSeamless: currentConnection.isWhitelisted && networkSettings.seamlessCheckInEnabled,
      },
      'Web Portal'
    );
    if (res.success) {
      webPushService.sendCheckInAlert({
        userName: currentUser.name,
        shift: shift,
        time: res.record?.checkInTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: res.record?.status || 'Present',
        location: checkInLocation,
      });
    }
    refreshData();
    setNotificationBanner(res.message);
    setTimeout(() => setNotificationBanner(null), 4500);
  };

  const handleShiftClockOut = (shift: ShiftType) => {
    const res = db.checkOut(currentUser.id, `${shift} Shift completed`, shift, 'Web Portal');
    if (res.success) {
      webPushService.sendCheckOutAlert({
        userName: currentUser.name,
        shift: shift,
        time: res.record?.checkOutTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        workingHours: res.record?.workingHours || 4,
        overtimeHours: res.record?.overtimeHours || 0,
      });
    }
    refreshData();
    setNotificationBanner(res.message);
    setTimeout(() => setNotificationBanner(null), 4500);
  };

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
    <div className="space-y-2.5 sm:space-y-3.5 max-w-7xl mx-auto">
      {/* Toast Notification Banner */}
      {notificationBanner && (
        <div className="bg-emerald-600 text-white px-3.5 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-3 duration-200">
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

      {/* Top Header Card - Compact & Mobile-App Style */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-3 sm:p-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.2 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                {lang === 'km' ? 'ម៉ូឌុលវត្តមានផ្ទាល់' : 'Live Attendance'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                {lang === 'km' ? 'អភិបាលកិច្ចកម្លាំងពលកម្ម' : 'Workforce Governance'}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {t.attendance || 'Attendance & Time Tracking'}
            </h1>
            <p className="text-[11px] text-slate-500 line-clamp-1">
              {lang === 'km'
                ? 'ការតាមដានការកត់ត្រាចូល/ចេញ របាយការណ៍ស្វ័យប្រវត្តិ និងសវនកម្មម៉ោងបន្ថែម។'
                : 'Clock-in/out tracking, automated monthly reporting, and overtime auditing.'}
            </p>
          </div>

          {/* Real-time Clock & Today's Date - Compact Badge */}
          <div className="flex items-center space-x-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-600">
                {lang === 'km' ? 'ថ្ងៃព្រហស្បតិ៍ ទី១៧ ខែកញ្ញា' : 'Thursday, Sep 17, 2026'}
              </div>
              <div className="text-xs sm:text-sm font-mono font-bold text-blue-600">
                {currentTime || '08:00:00 AM'}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PEAK HOURS INSTANT QR SHIFT ATTENDANCE COMMAND BANNER     */}
        {/* ========================================================= */}
        <div className="mt-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-cyan-950/70 to-slate-900 border border-cyan-500/40 p-2.5 sm:p-3 shadow-sm text-white relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 relative z-10">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/30 shrink-0">
                <QrCode className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>{lang === 'km' ? 'ស្កេន QR វត្តមានចូល-ចេញរហ័ស' : 'Peak Hours Fast-Track QR Scanner'}</span>
                  </h3>
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-700/60">
                    <Zap className="w-2.5 h-2.5 text-cyan-400" />
                    <span>&lt; 0.2s</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-1 max-w-xl">
                  {lang === 'km'
                    ? 'ស្កេនកូដ QR ភ្លាមៗដើម្បីចូល ឬចេញពីធ្វើការ។ បុគ្គលិកត្រូវកត់ត្រាទាំង ២ វេន៖ ព្រឹក និង ល្ងាច។'
                    : 'Instant QR shift check-in / checkout. Staff must record attendance for BOTH Morning and Evening shifts.'}
                </p>
              </div>
            </div>

            {/* Quick QR Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenQrScanner('scanner')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white font-bold text-xs rounded-lg shadow-sm transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'ស្កេន QR' : 'Scan QR'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenQrScanner('my-badge')}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg font-semibold text-xs transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'km' ? 'កាត QR ខ្ញុំ' : 'My Badge'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenQrScanner('kiosk-display')}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg font-semibold text-xs transition"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{lang === 'km' ? 'ច្រកទ្វារ' : 'Kiosk'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MANDATORY DUAL-SHIFT DAILY SCHEDULE & STATUS COMMAND CARD */}
        {/* ========================================================= */}
        <div className="mt-2.5 bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-2xs space-y-2.5">
          
          {/* Card Top: Policy Requirement Notice & Overall Daily Progress */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                todayShiftStatus.bothCompleted 
                  ? 'bg-emerald-500' 
                  : todayShiftStatus.hasMorningIn || todayShiftStatus.hasEveningIn
                  ? 'bg-blue-500 animate-pulse'
                  : 'bg-amber-500'
              }`} />
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    {currentUser.name} ({currentUser.role})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentUser.employeeId || 'EMP'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === 'km' 
                    ? 'កាតព្វកិច្ចចុះវត្តមាន ២ វេន/ថ្ងៃ (វេនព្រឹក & វេនល្ងាច)' 
                    : 'Mandatory Dual-Shift Policy (Morning & Evening Shifts)'}
                </p>
              </div>
            </div>

            {/* Overall Daily Compliance Badge */}
            <div className="flex items-center space-x-2 shrink-0">
              <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                todayShiftStatus.bothCompleted
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : todayShiftStatus.morningCompleted
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : todayShiftStatus.hasMorningIn
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {todayShiftStatus.bothCompleted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{lang === 'km' ? 'បានបញ្ចប់ ២ វេន (១០០%)' : 'Both Completed (100%)'}</span>
                  </>
                ) : todayShiftStatus.morningCompleted ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === 'km' ? 'ព្រឹកចប់ • រង់ចាំល្ងាច' : 'Morning Done • Evening Pending'}</span>
                  </>
                ) : todayShiftStatus.hasMorningIn ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{lang === 'km' ? 'កំពុងបំពេញវេនព្រឹក' : 'Morning In Progress'}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{lang === 'km' ? 'មិនទាន់កត់ត្រាថ្ងៃនេះ' : 'Pending Check-In'}</span>
                  </>
                )}
                <span className="font-mono text-xs font-black ml-1">({todayShiftStatus.totalHours}h)</span>
              </span>
            </div>
          </div>

          {/* Dual Shifts Display Grid: Morning Shift & Evening Shift Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            
            {/* ☀️ SHIFT 1: MORNING SHIFT (08:00 - 12:00) */}
            <div className={`p-3 rounded-xl border transition-all ${
              todayShiftStatus.morningCompleted
                ? 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs'
                : todayShiftStatus.hasMorningIn && !todayShiftStatus.hasMorningOut
                ? 'bg-amber-50/50 border-amber-300 shadow-2xs ring-1 ring-amber-400/40'
                : 'bg-slate-50/70 border-slate-200 hover:border-amber-300/80'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Sun className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{lang === 'km' ? 'វេនព្រឹក' : 'Morning Shift'}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-normal bg-amber-100 text-amber-800">
                        08:00 - 12:00
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      {lang === 'km' ? 'អនុគ្រោះដល់ ០៨:១៥' : 'Grace threshold to 08:15 AM'}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                {todayShiftStatus.morningCompleted ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{lang === 'km' ? 'បានបញ្ចប់' : 'Completed'}</span>
                  </span>
                ) : todayShiftStatus.hasMorningIn ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>{lang === 'km' ? 'កំពុងបំពេញ' : 'In Progress'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    <span>{lang === 'km' ? 'មិនទាន់កត់ត្រា' : 'Pending In'}</span>
                  </span>
                )}
              </div>

              {/* Shift Details & Timestamps */}
              <div className="py-2 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px]">{lang === 'km' ? 'ម៉ោងចូល:' : 'Clock In:'}</span>
                  <span className="font-mono font-semibold text-slate-900 text-xs">
                    {todayShiftStatus.morningRecord?.checkInTime ? (
                      <span className="text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded text-[11px]">
                        {todayShiftStatus.morningRecord.checkInTime} ({todayShiftStatus.morningRecord.status})
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px]">{lang === 'km' ? 'ម៉ោងចេញ:' : 'Clock Out:'}</span>
                  <span className="font-mono font-semibold text-slate-900 text-xs">
                    {todayShiftStatus.morningRecord?.checkOutTime ? (
                      <span className="text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                        {todayShiftStatus.morningRecord.checkOutTime}
                      </span>
                    ) : todayShiftStatus.hasMorningIn ? (
                      <span className="text-amber-600 italic text-[11px]">Expected ~12:00</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px]">{lang === 'km' ? 'ម៉ោងបំពេញ / វិធីសាស្ត្រ:' : 'Duration / Method:'}</span>
                  <span className="text-slate-800 font-medium text-xs">
                    {todayShiftStatus.morningRecord?.workingHours ? `${todayShiftStatus.morningRecord.workingHours} hrs • ` : ''}
                    <span className="text-slate-500 font-mono text-[10px]">
                      {todayShiftStatus.morningRecord?.checkInMethod || '—'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Shift Action Buttons */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1.5">
                {!todayShiftStatus.hasMorningIn ? (
                  <div className="flex items-center space-x-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => handleOpenQrScanner('scanner')}
                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-95"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ស្កេន QR' : 'QR In'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiftClockIn('Morning')}
                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-95"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ចូល ១-Tap' : '1-Tap In'}</span>
                    </button>
                  </div>
                ) : !todayShiftStatus.hasMorningOut ? (
                  <div className="flex items-center space-x-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => handleOpenQrScanner('scanner')}
                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-95"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ស្កេន QR' : 'QR Out'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiftClockOut('Morning')}
                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-95"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ចេញ ១-Tap' : '1-Tap Out'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold text-emerald-700 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{lang === 'km' ? 'វេនព្រឹកបានបញ្ចប់' : 'Morning Shift Finished'}</span>
                    </span>
                    {todayShiftStatus.morningRecord && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditShift(todayShiftStatus.morningRecord!)}
                        className="px-2 py-0.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md shadow-2xs"
                      >
                        <Pencil className="w-3 h-3 inline mr-1" />
                        {lang === 'km' ? 'កែប្រែ' : 'Edit'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 🌙 SHIFT 2: EVENING SHIFT (13:00 - 17:00) */}
            <div className={`p-3 rounded-xl border transition-all ${
              todayShiftStatus.eveningCompleted
                ? 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs'
                : todayShiftStatus.hasEveningIn && !todayShiftStatus.hasEveningOut
                ? 'bg-indigo-50/50 border-indigo-300 shadow-2xs ring-1 ring-indigo-400/40'
                : 'bg-slate-50/70 border-slate-200 hover:border-indigo-300/80'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                    <Moon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{lang === 'km' ? 'វេនល្ងាច' : 'Evening Shift'}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-normal bg-indigo-100 text-indigo-800">
                        13:00 - 17:00
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      {lang === 'km' ? 'អនុគ្រោះដល់ ១៣:១៥' : 'Grace threshold to 13:15 PM'}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                {todayShiftStatus.eveningCompleted ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{lang === 'km' ? 'បានបញ្ចប់' : 'Completed'}</span>
                  </span>
                ) : todayShiftStatus.hasEveningIn ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 animate-pulse">
                    <Clock className="w-3 h-3 text-indigo-600" />
                    <span>{lang === 'km' ? 'កំពុងបំពេញ' : 'In Progress'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    <span>{lang === 'km' ? 'មិនទាន់កត់ត្រា' : 'Pending In'}</span>
                  </span>
                )}
              </div>

              {/* Shift Details & Timestamps */}
              <div className="py-2 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px]">{lang === 'km' ? 'ម៉ោងចូល:' : 'Clock In:'}</span>
                  <span className="font-mono font-semibold text-slate-900 text-xs">
                    {todayShiftStatus.eveningRecord?.checkInTime ? (
                      <span className="text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded text-[11px]">
                        {todayShiftStatus.eveningRecord.checkInTime} ({todayShiftStatus.eveningRecord.status})
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px]">{lang === 'km' ? 'ម៉ោងចេញ:' : 'Clock Out:'}</span>
                  <span className="font-mono font-semibold text-slate-900 text-xs">
                    {todayShiftStatus.eveningRecord?.checkOutTime ? (
                      <span className="text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                        {todayShiftStatus.eveningRecord.checkOutTime}
                      </span>
                    ) : todayShiftStatus.hasEveningIn ? (
                      <span className="text-indigo-600 italic text-[11px]">Expected ~17:00</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px]">{lang === 'km' ? 'ម៉ោងបំពេញ / វិធីសាស្ត្រ:' : 'Duration / Method:'}</span>
                  <span className="text-slate-800 font-medium text-xs">
                    {todayShiftStatus.eveningRecord?.workingHours ? `${todayShiftStatus.eveningRecord.workingHours} hrs • ` : ''}
                    <span className="text-slate-500 font-mono text-[10px]">
                      {todayShiftStatus.eveningRecord?.checkInMethod || '—'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Shift Action Buttons */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1.5">
                {!todayShiftStatus.hasEveningIn ? (
                  <div className="flex items-center space-x-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => handleOpenQrScanner('scanner')}
                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-95"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ស្កេន QR' : 'QR In'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiftClockIn('Evening')}
                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-95"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ចូល ១-Tap' : '1-Tap In'}</span>
                    </button>
                  </div>
                ) : !todayShiftStatus.hasEveningOut ? (
                  <div className="flex items-center space-x-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => handleOpenQrScanner('scanner')}
                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-95"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ស្កេន QR' : 'QR Out'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiftClockOut('Evening')}
                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-95"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ចេញ ១-Tap' : '1-Tap Out'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold text-emerald-700 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{lang === 'km' ? 'វេនល្ងាចបានបញ្ចប់' : 'Evening Shift Finished'}</span>
                    </span>
                    {todayShiftStatus.eveningRecord && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditShift(todayShiftStatus.eveningRecord!)}
                        className="px-2 py-0.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md shadow-2xs"
                      >
                        <Pencil className="w-3 h-3 inline mr-1" />
                        {lang === 'km' ? 'កែប្រែ' : 'Edit'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Workplace IP Presence Footer Chip */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                <Globe className="w-3 h-3 text-teal-600" />
                <span className="font-mono text-[10px] font-semibold">{currentConnection.clientIp}</span>
                <span className="text-slate-400 text-[10px] hidden sm:inline">({currentConnection.networkName || 'Client IP'})</span>
              </span>

              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                  currentConnection.isWhitelisted
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {currentConnection.isWhitelisted
                  ? (lang === 'km' ? 'IP អនុញ្ញាត' : 'Whitelisted IP')
                  : (lang === 'km' ? 'IP ក្រៅប្រព័ន្ធ' : 'External IP')}
              </span>
            </div>

            <div className="text-[10px] text-slate-500 font-medium">
              {lang === 'km' ? 'កាលបរិច្ឆេទប្រព័ន្ធ៖' : 'System Date:'}{' '}
              <strong className="text-slate-700">2026-09-17</strong>
            </div>
          </div>
        </div>

        {/* Quick KPI Counters & Shift Distribution - Compact Grid */}
        {isEmployee ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-2.5">
            <div className="p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === 'km' ? 'ស្ថានភាពថ្ងៃនេះ' : "Today's Status"}
              </span>
              <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                {todayRecord?.checkOutTime ? (
                  <span className="text-slate-600 font-semibold">{lang === 'km' ? 'បានបញ្ចប់វេន' : 'Shift Completed'}</span>
                ) : todayRecord?.checkInTime ? (
                  <span className="text-emerald-700">{lang === 'km' ? 'បានចូលធ្វើការ' : 'Clocked In'} ({todayRecord.checkInTime})</span>
                ) : (
                  <span className="text-amber-700">{lang === 'km' ? 'មិនទាន់កត់ត្រា' : 'Not Clocked In'}</span>
                )}
              </div>
            </div>

            <div className="p-2 sm:p-2.5 bg-amber-50/50 rounded-xl border border-amber-200/80">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1">
                <Sun className="w-3 h-3 text-amber-500" />
                <span>{lang === 'km' ? 'វេនការងារ' : 'Assigned Shift'}</span>
              </span>
              <div className="text-xs font-bold text-amber-900 mt-0.5 truncate">
                {todayRecord?.workShift || 'Morning & Evening'}
              </div>
            </div>

            <div className="p-2 sm:p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                {lang === 'km' ? 'អត្រាអនុលោមភាព' : 'Compliance'}
              </span>
              <div className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5">
                {myPunctualityRate}% <span className="text-[10px] font-normal text-slate-500">{lang === 'km' ? 'ទាន់ពេល' : 'punctual'}</span>
              </div>
            </div>

            <div className="p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === 'km' ? 'ម៉ោងបំពេញការងារ' : 'Logged Hours'}
              </span>
              <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                {myTotalWorkingHours}h <span className="text-[10px] font-normal text-slate-500">{lang === 'km' ? 'ខែនេះ' : 'mo'}</span>
              </div>
            </div>

            <div className="p-2 sm:p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-200/80">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center space-x-1">
                <Moon className="w-3 h-3 text-indigo-500" />
                <span>{lang === 'km' ? 'ម៉ោងបន្ថែម (OT)' : 'Overtime'}</span>
              </span>
              <div className="text-sm sm:text-base font-bold text-indigo-900 mt-0.5">
                +{myTotalOvertimeHours}h
              </div>
            </div>

            <div className="p-2 sm:p-2.5 bg-blue-50/50 rounded-xl border border-blue-200/80">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center space-x-1">
                <Lock className="w-3 h-3 text-blue-600" />
                <span>{lang === 'km' ? 'ភាពឯកជន' : 'Privacy'}</span>
              </span>
              <div className="text-xs font-bold text-blue-900 mt-0.5 truncate">
                {lang === 'km' ? 'ផ្ទាល់ខ្លួនប៉ុណ្ណោះ' : 'Self-Access Only'}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-2.5">
            <div className="p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === 'km' ? 'សរុបថ្ងៃនេះ' : "Today's Total"}
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-sm sm:text-base font-bold text-slate-900">{totalLoggedCount}/{totalEmployees}</span>
                <span className="text-[10px] font-semibold text-emerald-600">({todayCompliancePct}%)</span>
              </div>
            </div>
            <div className="p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === 'km' ? 'មានវត្តមាន & សកម្ម' : 'Present'}
              </span>
              <div className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5">
                {presentCount} <span className="text-[10px] font-normal text-slate-500">{lang === 'km' ? 'នាក់' : 'staff'}</span>
              </div>
            </div>
            <div className="p-2 sm:p-2.5 bg-amber-50/50 rounded-xl border border-amber-200/80">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-1">
                <Sun className="w-3 h-3 text-amber-500" />
                <span>{t.morningShiftShort || 'Morning'}</span>
              </span>
              <div className="text-sm sm:text-base font-bold text-amber-900 mt-0.5">
                {morningShiftCount} <span className="text-[10px] font-normal text-slate-500">08:00</span>
              </div>
            </div>
            <div className="p-2 sm:p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-200/80">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center space-x-1">
                <Moon className="w-3 h-3 text-indigo-500" />
                <span>{t.eveningShiftShort || 'Evening'}</span>
              </span>
              <div className="text-sm sm:text-base font-bold text-indigo-900 mt-0.5">
                {eveningShiftCount} <span className="text-[10px] font-normal text-slate-500">13:00</span>
              </div>
            </div>
            <div className="p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === 'km' ? 'មកយឺត' : 'Late'}
              </span>
              <div className="text-sm sm:text-base font-bold text-amber-600 mt-0.5">
                {lateCount} <span className="text-[10px] font-normal text-slate-500">flagged</span>
              </div>
            </div>
            <div className="p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === 'km' ? 'ច្បាប់ឈប់សម្រាក' : 'On Leave'}
              </span>
              <div className="text-sm sm:text-base font-bold text-blue-600 mt-0.5">
                {leaveCount} <span className="text-[10px] font-normal text-slate-500">approved</span>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Privacy Protection & Assistance Notice Banner - Compact Bar */}
        <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl border border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  {lang === 'km' ? 'គោលការណ៍ឯកជនភាពវត្តមាន' : 'Attendance Privacy Compliance'}
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {isEmployee ? (lang === 'km' ? 'ផ្ទាល់ខ្លួន' : 'Self-Access') : (lang === 'km' ? 'សិទ្ធិគ្រប់គ្រង' : 'Authorized')}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 truncate">
                {lang === 'km'
                  ? 'បុគ្គលិកអាចចូលមើលបានតែកំណត់ត្រាវត្តមានផ្ទាល់ខ្លួនរបស់ពួកគេប៉ុណ្ណោះ ដើម្បីធានាឯកជនភាព។'
                  : 'Employees can access their own verified attendance logs. Contact supervisor for team audits.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-center">
            <button
              onClick={() => setIsContactSupervisorModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg shadow-2xs transition active:scale-95 whitespace-nowrap"
            >
              <HelpCircle className="w-3 h-3 text-blue-600" />
              <span>{lang === 'km' ? 'ជំនួយ HR' : 'Contact HR'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Responsive Scrollable Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'daily'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'បញ្ជីវត្តមានប្រចាំថ្ងៃ' : 'Daily Roster'}</span>
          </button>
          <button
            onClick={() => setActiveTab('monthly-reports')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'monthly-reports'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t.automatedMonthlyReport || 'Monthly Reports'}</span>
            <span className="px-1.5 py-0.2 bg-blue-500 text-white rounded-full text-[10px] font-bold">
              {monthlyReports.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('my-history')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'my-history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'កំណត់ត្រារបស់ខ្ញុំ' : 'My Log'}</span>
          </button>

          {/* Only Admin can manage IP whitelist */}
          {isSuperOrAdmin && (
            <button
              id="tab-btn-network-whitelist-main"
              onClick={() => setActiveTab('network-whitelist')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'network-whitelist'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-teal-800 bg-teal-50 hover:bg-teal-100 hover:text-teal-900 border border-teal-200/80'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              <span>{lang === 'km' ? 'គ្រប់គ្រង IP' : 'Allowed IPs'}</span>
            </button>
          )}
        </div>

        {/* Action buttons - Compact Pill Row */}
        {activeTab === 'daily' && (
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              id="btn-quick-qr-scanner-attendance"
              onClick={() => handleOpenQrScanner('scanner')}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-cyan-900 bg-cyan-100/80 border border-cyan-300 hover:bg-cyan-200/80 rounded-lg transition shadow-2xs whitespace-nowrap"
              title="Instant QR Scanner"
            >
              <QrCode className="w-3 h-3 text-cyan-700" />
              <span>QR Scan</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
            </button>

            <button
              id="btn-telegram-attendance-alerts"
              onClick={() => setIsTelegramModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition shadow-2xs whitespace-nowrap"
              title="Telegram Alerts"
            >
              <Send className="w-3 h-3 text-sky-600" />
              <span>Telegram</span>
            </button>

            <button
              id="btn-webpush-attendance-alerts"
              onClick={() => setIsWebPushModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition shadow-2xs whitespace-nowrap"
              title="Push Alerts"
            >
              <Bell className="w-3 h-3 text-indigo-600" />
              <span>Push</span>
            </button>

            <button
              onClick={() => setIsShiftSchedulesModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition whitespace-nowrap"
              title="Shift Schedules"
            >
              <Sliders className="w-3 h-3 text-slate-500" />
              <span>Shifts</span>
            </button>

            {(currentUser.role === 'Super Admin' || currentUser.role === 'Administrator' || currentUser.role === 'Department Manager') && (
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition whitespace-nowrap"
              >
                <Plus className="w-3 h-3" />
                <span>Manual</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: DAILY ROSTER */}
      {activeTab === 'daily' && (
        <div className="space-y-2.5 sm:space-y-3">
          {/* Filters Bar - Compact */}
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Date */}
              <div className="flex items-center space-x-1 px-2 py-1 border border-slate-200 rounded-lg bg-slate-50/50">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="text-xs bg-transparent focus:outline-hidden"
                />
              </div>

              {/* Department */}
              {isEmployee ? (
                <div className="flex items-center space-x-1 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  <span className="font-semibold">{departments.find(d => d.id === currentUser.departmentId)?.name || 'Department'}</span>
                </div>
              ) : (
                <select
                  value={filterDept}
                  onChange={e => setFilterDept(e.target.value)}
                  className="text-xs px-2 py-1 border border-slate-200 rounded-lg focus:outline-hidden bg-white"
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
                className="text-xs px-2 py-1 border border-slate-200 rounded-lg focus:outline-hidden bg-white"
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
                className="text-xs px-2 py-1 border border-slate-200 rounded-lg focus:outline-hidden bg-white font-medium text-slate-700"
              >
                <option value="all">{t.allShifts || (lang === 'km' ? 'គ្រប់វេន' : 'All Shifts')}</option>
                <option value="Morning">☀️ {lang === 'km' ? 'វេនព្រឹក' : 'Morning'} (08:00)</option>
                <option value="Evening">🌙 {lang === 'km' ? 'វេនល្ងាច' : 'Evening'} (13:00)</option>
              </select>

              {/* Employee */}
              {isEmployee ? (
                <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-800">
                  <Lock className="w-3 h-3 text-blue-600" />
                  <span>{currentUser.name}</span>
                </div>
              ) : (
                <select
                  value={filterEmployee}
                  onChange={e => setFilterEmployee(e.target.value)}
                  className="text-xs px-2 py-1 border border-slate-200 rounded-lg focus:outline-hidden bg-white max-w-[160px]"
                >
                  <option value="all">{lang === 'km' ? 'គ្រប់បុគ្គលិក' : 'All Staff'}</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={lang === 'km' ? 'ស្វែងរក...' : 'Search staff...'}
                className="w-full pl-7 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Roster Display: Mobile App Card List (sm:hidden) & Desktop Table (hidden sm:block) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Mobile View: Clean App Cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Clock className="w-7 h-7 mx-auto mb-1 text-slate-300" />
                  <p className="text-xs font-medium">No records found</p>
                </div>
              ) : (
                filteredRecords.map(rec => {
                  const empDept = departments.find(d => d.id === rec.departmentId);
                  const isEvening = rec.shiftType === 'Evening' || rec.workShift?.toLowerCase().includes('evening') || rec.workShift?.toLowerCase().includes('13:00');
                  return (
                    <div key={rec.id} className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block truncate">{rec.userName}</span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {rec.employeeId || 'EMP'} • {empDept?.name || 'Dept'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                          rec.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          rec.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          rec.status === 'Overtime' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          rec.status === 'On Leave' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {rec.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs bg-slate-50/70 p-2 rounded-lg">
                        <div className="flex items-center space-x-1.5">
                          {isEvening ? (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
                              <Moon className="w-2.5 h-2.5" />
                              <span>Eve</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                              <Sun className="w-2.5 h-2.5" />
                              <span>Morn</span>
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-slate-700">
                            {rec.checkInTime || '—'} → {rec.checkOutTime || (rec.checkInTime ? 'Active' : '—')}
                          </span>
                        </div>
                        <span className="font-bold text-slate-800 text-xs font-mono">
                          {rec.workingHours}h {rec.overtimeHours > 0 ? `(+${rec.overtimeHours}h)` : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <div className="flex items-center space-x-1 truncate max-w-[200px]">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{rec.location || 'Campus'}</span>
                          {rec.checkInMethod === 'QR Code' && (
                            <span className="px-1 py-0.2 rounded bg-cyan-100 text-cyan-800 text-[9px] font-bold">QR</span>
                          )}
                        </div>
                        {isEmployee ? (
                          <span className="text-[10px] font-semibold text-blue-700">Verified</span>
                        ) : (
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => handleSendTelegramReminderToUser(rec.userId, rec.userName)}
                              className="p-1 text-slate-400 hover:text-sky-600 rounded"
                            >
                              <Send className="w-3.5 h-3.5 text-sky-600" />
                            </button>
                            {(currentUser.role === 'Super Admin' || currentUser.role === 'Administrator' || currentUser.role === 'Department Manager') && (
                              <button
                                onClick={() => handleOpenEditShift(rec)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop View: Dense Clean Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">{lang === 'km' ? 'បុគ្គលិក' : 'Employee'}</th>
                    <th className="py-2.5 px-3">{lang === 'km' ? 'កាលបរិច្ឆេទ & វេន' : 'Date & Shift'}</th>
                    <th className="py-2.5 px-2 text-center">{lang === 'km' ? 'ម៉ោងចូល' : 'Clock In'}</th>
                    <th className="py-2.5 px-2 text-center">{lang === 'km' ? 'ម៉ោងចេញ' : 'Clock Out'}</th>
                    <th className="py-2.5 px-2 text-center">{lang === 'km' ? 'រយៈពេល' : 'Duration'}</th>
                    <th className="py-2.5 px-2 text-center">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                    <th className="py-2.5 px-3">{lang === 'km' ? 'ទីតាំង & ឧបករណ៍' : 'Location & Device'}</th>
                    <th className="py-2.5 px-2.5">{lang === 'km' ? 'កំណត់ចំណាំ' : 'Notes'}</th>
                    <th className="py-2.5 px-3 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        <Clock className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
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
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-900">{rec.userName}</div>
                            <div className="text-[10px] text-slate-400">
                              {rec.employeeId || 'EMP'} • {empDept?.name || 'Dept'}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-800 text-xs">{rec.date}</div>
                            <div className="mt-0.5">
                              {rec.shiftType === 'Evening' || rec.workShift?.toLowerCase().includes('evening') || rec.workShift?.toLowerCase().includes('13:00') ? (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                                  <Moon className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                  <span>{lang === 'km' ? 'វេនល្ងាច' : 'Evening'}</span>
                                  <span className="text-[9px] text-indigo-500/80 font-mono font-normal">13:00-17:00</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                  <Sun className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                  <span>{lang === 'km' ? 'វេនព្រឹក' : 'Morning'}</span>
                                  <span className="text-[9px] text-amber-600/80 font-mono font-normal">08:00-12:00</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-medium">
                            {rec.checkInTime ? (
                              <span className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {rec.checkInTime}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-medium">
                            {rec.checkOutTime ? (
                              <span className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {rec.checkOutTime}
                              </span>
                            ) : rec.checkInTime ? (
                              <span className="text-emerald-600 font-semibold animate-pulse text-[11px]">
                                {lang === 'km' ? 'កំពុងបំពេញ' : 'Active'}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-medium">
                            {rec.workingHours > 0 ? (
                              <div>
                                <span className="text-slate-800 font-bold">{rec.workingHours}h</span>
                                {rec.overtimeHours > 0 && (
                                  <span className="ml-1 text-indigo-600 text-[10px] font-bold">
                                    (+{rec.overtimeHours}h)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">0h</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
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
                          <td className="py-2 px-3 text-[11px]">
                            <div className="flex items-center space-x-1 text-slate-700 font-medium truncate max-w-[150px]">
                              {rec.isAnonymized || rec.zeroSignalVerified || rec.checkInMethod?.includes('Zero-Tracking') ? (
                                <span title="Zero-Tracking Anonymized Zone" className="inline-flex items-center">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                </span>
                              ) : (
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              )}
                              <span className={`truncate ${rec.isAnonymized || rec.locationAnonymized ? 'text-emerald-800 font-semibold' : ''}`}>
                                {rec.location || 'Campus'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[10px]">
                              {rec.checkInMethod === 'QR Code' && (
                                <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 border border-cyan-300 text-[9px] font-bold">
                                  <QrCode className="w-2.5 h-2.5 text-cyan-600" />
                                  <span>QR</span>
                                </span>
                              )}
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
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-[11px] text-slate-500 max-w-[120px] truncate">
                            {rec.notes || '—'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {isEmployee ? (
                                <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  <Lock className="w-2.5 h-2.5 text-blue-500" />
                                  <span>{lang === 'km' ? 'ផ្ទាល់ខ្លួន' : 'Self'}</span>
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleSendTelegramReminderToUser(rec.userId, rec.userName)}
                                    className="p-1 text-slate-400 hover:text-sky-600 rounded-md hover:bg-sky-50 transition"
                                    title={
                                      lang === 'km'
                                        ? `ផ្ញើសាររំលឹកវត្តមានតាម Telegram ទៅកាន់ ${rec.userName}`
                                        : `Send Telegram reminder to ${rec.userName}`
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
        <div className="space-y-2.5 sm:space-y-3.5">
          {/* Employee Privacy Guidance or Generator Control Card */}
          {isEmployee ? (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-3 sm:p-4 rounded-xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="space-y-1 max-w-2xl">
                <div className="inline-flex items-center space-x-1 px-2 py-0.2 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-bold border border-blue-400/30">
                  <Lock className="w-2.5 h-2.5 text-blue-300" />
                  <span>{lang === 'km' ? 'គោលការណ៍ឯកជនភាព' : 'Employee Privacy'}</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  {lang === 'km' ? 'ការគ្រប់គ្រង និងទាញយករបាយការណ៍សង្ខេបស្ថាប័ន' : 'Institutional Monthly Reports & Individual Audits'}
                </h3>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {lang === 'km'
                    ? 'បុគ្គលិកអាចចូលមើលបានតែកំណត់ត្រាវត្តមានផ្ទាល់ខ្លួនរបស់ពួកគេប៉ុណ្ណោះ។'
                    : 'Employees can access personal verified logs. Contact supervisor or HR for institutional reports.'}
                </p>
              </div>
              <div className="shrink-0">
                <button
                  onClick={() => setIsContactSupervisorModalOpen(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-2xs transition active:scale-95"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>{lang === 'km' ? 'ទាក់ទង HR' : 'Contact HR'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-3 sm:p-4 rounded-xl shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1 max-w-xl">
                  <div className="inline-flex items-center space-x-1 px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                    <Sparkles className="w-3 h-3" />
                    <span>{lang === 'km' ? 'ការវិភាគថ្នាក់ដឹកនាំស្វ័យប្រវត្តិ' : 'Executive Analytics'}</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    {t.autoGenerate || (lang === 'km' ? '⚡ បង្កើតរបាយការណ៍វត្តមានប្រចាំខែស្វ័យប្រវត្តិ' : '⚡ Auto-Generate Monthly Attendance Report')}
                  </h2>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {lang === 'km'
                      ? 'ចងក្រងការកត់ត្រាវត្តមានប្រចាំថ្ងៃ គណនាអត្រាអនុលោមភាព និងធ្វើសវនកម្មម៉ោងបន្ថែម។'
                      : 'Compiles all daily punches, calculates employee attendance compliance rates, and audits overtime.'}
                  </p>
                </div>

                {/* Generator Controls */}
                <div className="flex flex-wrap items-center gap-2 bg-white/10 p-2.5 rounded-xl backdrop-blur-xs border border-white/10 shrink-0">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-200 mb-0.5">
                      {lang === 'km' ? 'ខែ' : 'Month'}
                    </label>
                    <select
                      value={reportGenMonth}
                      onChange={e => setReportGenMonth(e.target.value)}
                      className="bg-slate-800 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-hidden focus:border-blue-400"
                    >
                      <option value="2026-09">{lang === 'km' ? 'កញ្ញា ២០២៦' : 'September 2026'}</option>
                      <option value="2026-08">{lang === 'km' ? 'សីហា ២០២៦' : 'August 2026'}</option>
                      <option value="2026-07">{lang === 'km' ? 'កក្កដា ២០២៦' : 'July 2026'}</option>
                      <option value="2026-06">{lang === 'km' ? 'មិថុនា ២០២៦' : 'June 2026'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-200 mb-0.5">
                      {lang === 'km' ? 'នាយកដ្ឋាន' : 'Department'}
                    </label>
                    <select
                      value={reportGenDept}
                      onChange={e => setReportGenDept(e.target.value)}
                      className="bg-slate-800 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-hidden focus:border-blue-400"
                    >
                      <option value="all">{lang === 'km' ? 'គ្រប់នាយកដ្ឋាន' : 'All Departments'}</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="self-end pt-1 sm:pt-0">
                    <button
                      onClick={handleGenerateReport}
                      disabled={isGenerating}
                      className="flex items-center space-x-1.5 px-3 py-1 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-2xs transition active:scale-95 disabled:opacity-75"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{lang === 'km' ? 'កំពុងចងក្រង...' : 'Compiling...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>{lang === 'km' ? 'បង្កើតរបាយការណ៍' : 'Generate'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Published Reports Catalog */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                {lang === 'km' ? `របាយការណ៍សង្ខេប (${monthlyReports.length})` : `Monthly Report Dossiers (${monthlyReports.length})`}
              </h3>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {lang === 'km' ? 'រក្សាទុកក្នុងកន្លែងផ្ទុកសុវត្ថិភាព' : 'Persisted in secure storage'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {monthlyReports.map(rep => (
                <div
                  key={rep.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition p-3.5 flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.2 text-[10px] font-bold font-mono rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {rep.reportCode}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(rep.generatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {rep.monthLabel} {lang === 'km' ? 'សវនកម្មវត្តមាន' : 'Attendance Audit'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'km' ? 'នាយកដ្ឋាន៖' : 'Department:'} <span className="font-semibold text-slate-700">{rep.departmentName}</span>
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-1.5 py-1.5 bg-slate-50 rounded-lg p-2 text-center">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                          {lang === 'km' ? 'ការអនុលោម' : 'Compliance'}
                        </span>
                        <div className="text-xs sm:text-sm font-bold text-emerald-600">{rep.averageAttendanceRate}%</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                          {lang === 'km' ? 'ម៉ោងកត់ត្រា' : 'Hours'}
                        </span>
                        <div className="text-xs sm:text-sm font-bold text-slate-800">{rep.totalHoursLogged}h</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                          {lang === 'km' ? 'ថែមម៉ោង' : 'Overtime'}
                        </span>
                        <div className="text-xs sm:text-sm font-bold text-indigo-600">+{rep.totalOvertimeHours}h</div>
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
                      className="flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                    >
                      <span>{lang === 'km' ? 'មើលរបាយការណ៍' : 'View Dossier'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          const headers = ['Employee ID', 'Employee Name', 'Department', 'Position', 'Present', 'Late', 'Leave', 'Work Hours', 'Overtime Hours', 'Compliance (%)'];
                          const rows = rep.employeeSummaries.map(e => [e.employeeId, e.employeeName, e.departmentName, e.position, e.presentDays, e.lateDays, e.leaveDays, e.totalWorkingHours, e.totalOvertimeHours, `${e.attendanceRate}%`]);
                          exportToExcel(`${rep.reportCode}`, headers, rows);
                        }}
                        className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        title="Download Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReport(rep);
                          setIsDossierOpen(true);
                        }}
                        className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                        title="Print"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY ATTENDANCE HISTORY - Responsive Mobile Cards & Desktop Table */}
      {activeTab === 'my-history' && (
        <div className="space-y-2.5">
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">{currentUser.name}</h3>
                <p className="text-[10px] text-slate-500">
                  {currentUser.position} • {departments.find(d => d.id === currentUser.departmentId)?.name}
                </p>
              </div>
            </div>

            {/* Mobile View: Cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {myHistory.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  <Clock className="w-7 h-7 mx-auto mb-1 text-slate-300" />
                  <p className="text-xs font-medium">No attendance history found</p>
                </div>
              ) : (
                myHistory.map(rec => (
                  <div key={rec.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{rec.date}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        rec.status === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                        rec.status === 'Late' ? 'bg-amber-50 text-amber-700' :
                        rec.status === 'Overtime' ? 'bg-indigo-50 text-indigo-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {rec.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50/70 p-2 rounded-lg">
                      <span className="font-mono text-[11px]">
                        {rec.checkInTime || '—'} → {rec.checkOutTime || (rec.checkInTime ? 'Active' : '—')}
                      </span>
                      <span className="font-bold text-slate-800 text-xs font-mono">
                        {rec.workingHours}h {rec.overtimeHours > 0 ? `(+${rec.overtimeHours}h)` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>{rec.location || 'Campus'}</span>
                      <span>{rec.notes || '—'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2 px-3">{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                    <th className="py-2 px-2 text-center">{lang === 'km' ? 'ម៉ោងចូល' : 'Clock In'}</th>
                    <th className="py-2 px-2 text-center">{lang === 'km' ? 'ម៉ោងចេញ' : 'Clock Out'}</th>
                    <th className="py-2 px-2 text-center">{lang === 'km' ? 'ម៉ោងបំពេញ' : 'Hours'}</th>
                    <th className="py-2 px-2 text-center">{lang === 'km' ? 'ថែមម៉ោង' : 'Overtime'}</th>
                    <th className="py-2 px-2 text-center">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                    <th className="py-2 px-3">{lang === 'km' ? 'ទីតាំង' : 'Location'}</th>
                    <th className="py-2 px-2">{lang === 'km' ? 'សម្គាល់' : 'Remarks'}</th>
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
                        <td className="py-2 px-3 font-semibold text-slate-800 text-xs">{rec.date}</td>
                        <td className="py-2 px-2 text-center font-mono text-[11px]">
                          {rec.checkInTime || '—'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-[11px]">
                          {rec.checkOutTime || (rec.checkInTime ? (lang === 'km' ? 'កំពុងបំពេញ' : 'Active') : '—')}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-800">
                          {rec.workingHours}h
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-indigo-600">
                          {rec.overtimeHours > 0 ? `+${rec.overtimeHours}h` : '0h'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
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
                        <td className="py-2 px-3 text-[11px] text-slate-500 truncate max-w-[140px]">
                          {rec.location || 'HQ'}
                        </td>
                        <td className="py-2 px-2 text-[11px] text-slate-400 truncate max-w-[120px]">
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

      {/* Instant QR Shift Attendance & Fast-Track Kiosk Modal */}
      <QrAttendanceScannerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        currentUser={currentUser}
        lang={lang}
        onAttendanceUpdated={refreshData}
        initialTab={qrModalTab}
      />
    </div>
  );
};
