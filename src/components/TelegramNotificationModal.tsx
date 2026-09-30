import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  Bot,
  Settings,
  Users,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Play,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  Sliders,
  BellRing,
  Smartphone,
  Info,
  Building2,
  UserCheck,
  Globe,
  Radio,
  Lock,
  Unlock,
  MessageCircle,
  HelpCircle,
  Volume2
} from 'lucide-react';
import { User, Language, TelegramNotificationConfig, TelegramNotificationLog, TelegramScanResult } from '../types';
import { db } from '../services/db';
import { 
  validateBotToken, 
  sendTelegramMessage, 
  scanAndDispatchAttendanceAlerts, 
  buildOverdueCheckInMessage,
  buildPreShiftAlertMessage,
  sendGroupChannelTestMessage,
  scanAndDispatchPreShiftAlerts
} from '../services/telegramService';
import { defaultTelegramConfig } from '../data/telegramData';

interface TelegramNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User;
  lang: Language;
  onToast: (msg: string) => void;
}

export const TelegramNotificationModal: React.FC<TelegramNotificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
  onToast,
}) => {
  const user = currentUser || db.getCurrentUser() || {
    id: 'usr-guest',
    name: 'Staff Member',
    email: '',
    role: 'Employee' as const,
    createdAt: new Date().toISOString(),
  };
  const isAdmin = Boolean(user?.role === 'Super Admin' || user?.role === 'Administrator');
  
  // Navigation tabs: 'preshift' (Advance alert before shift) | 'scanner' (Overdue alert) | 'directory' | 'config' (Bot & Channel ID) | 'logs'
  const [activeTab, setActiveTab] = useState<'preshift' | 'scanner' | 'directory' | 'config' | 'logs'>('preshift');

  // Configuration state with default fallback
  const [config, setConfig] = useState<TelegramNotificationConfig>(() => {
    try {
      return { ...defaultTelegramConfig, ...db.getTelegramConfig() };
    } catch {
      return { ...defaultTelegramConfig };
    }
  });
  const [showToken, setShowToken] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [botValidationResult, setBotValidationResult] = useState<{ ok: boolean; botInfo?: any; error?: string } | null>(null);

  // Group / Channel test state
  const [isTestingChannel, setIsTestingChannel] = useState(false);
  const [channelTestResult, setChannelTestResult] = useState<{ ok: boolean; status: string; error?: string } | null>(null);

  // Pre-shift manual test state
  const [isDispatchingPreShift, setIsDispatchingPreShift] = useState(false);
  const [preShiftTestKey, setPreShiftTestKey] = useState<string>('Morning');
  const [preShiftResult, setPreShiftResult] = useState<{
    scannedShifts: number;
    alertsDispatched: number;
    messages: Array<{ target: string; shift: string; status: string; recipient: string }>;
  } | null>(null);

  // Users & Directory state
  const [users, setUsers] = useState<User[]>(() => {
    try {
      return db.getUsers() || [];
    } catch {
      return [];
    }
  });
  const [departments, setDepartments] = useState(() => {
    try {
      return db.getDepartments() || [];
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editChatId, setEditChatId] = useState('');
  const [editHandle, setEditHandle] = useState('');

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<TelegramScanResult | null>(null);

  // Logs state
  const [logs, setLogs] = useState<TelegramNotificationLog[]>(() => {
    try {
      return db.getTelegramLogs() || [];
    } catch {
      return [];
    }
  });
  const [logFilter, setLogFilter] = useState<'ALL' | 'SENT' | 'SIMULATED' | 'FAILED'>('ALL');

  // Preview language
  const [previewLang, setPreviewLang] = useState<Language>(lang);

  // Refresh logs, users, and config on open
  useEffect(() => {
    if (isOpen) {
      try {
        setConfig({ ...defaultTelegramConfig, ...db.getTelegramConfig() });
        setUsers(db.getUsers() || []);
        setLogs(db.getTelegramLogs() || []);
      } catch (err) {
        console.error('Failed to reload telegram modal data:', err);
      }
      setBotValidationResult(null);
      setChannelTestResult(null);
    }
  }, [isOpen]);

  // Handle save configuration (Admin only for security)
  const handleSaveConfig = () => {
    if (!isAdmin) {
      onToast(lang === 'km' ? 'មានតែ Admin ប៉ុណ្ណោះដែលអាចកែប្រែ Bot Token និង Channel ID បាន' : 'Only Administrators can change Bot Token and Channel configurations.');
      return;
    }
    db.saveTelegramConfig(config);
    onToast(lang === 'km' ? 'បានរក្សាទុកការកំណត់រចនាសម្ព័ន្ធ Telegram ដោយជោគជ័យ' : 'Telegram Bot & Channel settings saved successfully.');
  };

  // Handle Token Verification
  const handleVerifyToken = async () => {
    if (!config.botToken || !config.botToken.trim()) {
      setBotValidationResult({ ok: false, error: 'Please enter a Telegram bot token first.' });
      return;
    }
    setIsValidatingToken(true);
    setBotValidationResult(null);
    try {
      const res = await validateBotToken(config.botToken);
      setBotValidationResult(res);
      if (res.ok && res.botInfo) {
        const updatedConfig = {
          ...config,
          botUsername: `@${res.botInfo.username}`,
        };
        setConfig(updatedConfig);
        db.saveTelegramConfig(updatedConfig);
        onToast(lang === 'km' ? `បានភ្ជាប់ Bot @${res.botInfo.username} ដោយជោគជ័យ!` : `Connected to Bot @${res.botInfo.username} successfully!`);
      }
    } finally {
      setIsValidatingToken(false);
    }
  };

  // Handle Test Group / Channel Ping
  const handleTestGroupChannel = async () => {
    const targetChannel = config.groupChannelChatId || config.defaultChatId;
    if (!targetChannel || !targetChannel.trim()) {
      setChannelTestResult({ ok: false, status: 'FAILED', error: 'Please enter a Group or Channel Chat ID (e.g. -1001234567890 or @channel_name).' });
      return;
    }

    setIsTestingChannel(true);
    setChannelTestResult(null);
    try {
      const res = await sendGroupChannelTestMessage(config.botToken, targetChannel, lang);
      setChannelTestResult(res);
      setLogs(db.getTelegramLogs());
      if (res.ok) {
        onToast(lang === 'km' ? `បានផ្ញើសារសាកល្បងទៅកាន់ Channel/Group (${res.status})` : `Test broadcast delivered to Group / Channel (${res.status})`);
      } else {
        onToast(`Group dispatch error: ${res.error}`);
      }
    } finally {
      setIsTestingChannel(false);
    }
  };

  // Handle Dispatching Pre-Shift Alert (Advance alert before shift)
  const handleDispatchPreShift = async () => {
    setIsDispatchingPreShift(true);
    try {
      const res = await scanAndDispatchPreShiftAlerts(config, lang, preShiftTestKey);
      setPreShiftResult(res);
      setLogs(db.getTelegramLogs());
      onToast(
        lang === 'km'
          ? `បានបញ្ជូនការរំលឹកមុនម៉ោងវេនការងារ ${res.alertsDispatched} សារជោគជ័យ (មិនមានការកត់ត្រាចូលស្វ័យប្រវត្តិទេ)`
          : `Dispatched ${res.alertsDispatched} advance pre-shift alerts. (Zero auto-check ins executed).`
      );
    } catch (err: any) {
      onToast(`Pre-shift dispatch error: ${err.message}`);
    } finally {
      setIsDispatchingPreShift(false);
    }
  };

  // Handle Load Demo / Test Token
  const handleLoadDemoToken = () => {
    const demoConfig: TelegramNotificationConfig = {
      ...config,
      botToken: 'demo_bot_token_test_mode_7891234567:AAFltTestModeToken',
      botUsername: '@apms_attendance_alert_bot',
      groupChannelChatId: '-1002345678901',
      defaultChatId: '-1002345678901',
      isEnabled: true,
      beforeShiftAlertEnabled: true,
      beforeShiftMinutes: 15,
      beforeShiftTarget: 'both',
      autoSchedulerEnabled: true,
    };
    setConfig(demoConfig);
    db.saveTelegramConfig(demoConfig);
    setBotValidationResult({
      ok: true,
      botInfo: {
        id: 7891234567,
        is_bot: true,
        first_name: 'APMS Attendance Alert Bot (Demo)',
        username: 'apms_attendance_alert_bot',
        can_join_groups: true,
      },
    });
    onToast(lang === 'km' ? 'បានកំណត់ Demo Bot & Channel សម្រាប់ការសាកល្បងដោយជោគជ័យ' : 'Demo Bot & Channel activated for instant test simulation.');
  };

  // Handle Full Scanner Dispatch (Overdue without auto-check in)
  const handleRunScanner = async () => {
    setIsScanning(true);
    try {
      const res = await scanAndDispatchAttendanceAlerts(config, lang);
      setScanResult(res);
      setLogs(db.getTelegramLogs());
      onToast(
        lang === 'km'
          ? `បានស្កេនបុគ្គលិក ${res.scannedCount} នាក់៖ បានបញ្ជូនសាររំលឹក ${res.notifiedCount} នាក់ (មិនមានការកត់ត្រាចូលស្វ័យប្រវត្តិទេ)`
          : `Scanned ${res.scannedCount} staff: ${res.notifiedCount} alerts dispatched. (Zero auto-check ins executed).`
      );
    } catch (err: any) {
      onToast(`Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Send Single Test Ping to specific employee
  const handleSendTestToUser = async (targetUser: User) => {
    const targetChatId = targetUser.telegramChatId || config.groupChannelChatId || config.defaultChatId;
    if (!targetChatId) {
      onToast(lang === 'km' ? 'សូមបញ្ចូល Telegram Chat ID សម្រាប់បុគ្គលិកនេះជាមុនសិន' : 'Please assign a Telegram Chat ID for this employee first.');
      return;
    }

    const testMsg = buildOverdueCheckInMessage({
      employeeName: targetUser.name,
      employeeId: targetUser.employeeId || 'EMP-TEST',
      departmentName: departments.find(d => d.id === targetUser.departmentId)?.name || 'General Operations',
      shiftName: lang === 'km' ? 'វេនព្រឹក' : 'Morning Shift',
      shiftTime: '08:00 - 12:00',
      overdueMinutes: 15,
      graceMinutes: config.gracePeriodMinutes || 15,
      lang,
    });

    const res = await sendTelegramMessage(config.botToken, targetChatId, testMsg);
    
    const newLog: TelegramNotificationLog = {
      id: `tlog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      recipientUserId: targetUser.id,
      recipientName: targetUser.name,
      recipientChatId: targetChatId,
      type: 'test_ping',
      messageText: testMsg,
      status: res.status,
      errorDetails: res.error,
      deliveredAt: res.ok ? new Date().toISOString() : undefined,
    };
    db.logTelegramNotification(newLog);
    setLogs(db.getTelegramLogs());

    if (res.ok) {
      onToast(
        lang === 'km'
          ? `បានផ្ញើសារសាកល្បងទៅកាន់ ${targetUser.name} (${res.status})`
          : `Test message dispatched to ${targetUser.name} (${res.status})`
      );
    } else {
      onToast(`Dispatch failed: ${res.error}`);
    }
  };

  // Handle User Telegram Details Update
  const handleSaveUserTelegram = (userId: string) => {
    db.updateUserTelegram(userId, {
      telegramChatId: editChatId.trim(),
      telegramHandle: editHandle.trim(),
    });
    setUsers(db.getUsers());
    setEditingUserId(null);
    onToast(lang === 'km' ? 'បានកែប្រែព័ត៌មាន Telegram របស់បុគ្គលិកដោយជោគជ័យ' : 'Employee Telegram information updated.');
  };

  // Filtered users for directory
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    const q = (searchQuery || '').toLowerCase().trim();
    return users.filter(u => {
      if (!u) return false;
      if (!q) return true;
      const nameMatch = (u.name || '').toLowerCase().includes(q) || (u.nameKhmer && u.nameKhmer.toLowerCase().includes(q));
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const handleMatch = u.telegramHandle && u.telegramHandle.toLowerCase().includes(q);
      const chatMatch = u.telegramChatId && u.telegramChatId.includes(q);
      return Boolean(nameMatch || emailMatch || handleMatch || chatMatch);
    });
  }, [users, searchQuery]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    if (logFilter === 'ALL') return logs;
    return logs.filter(l => l && l.status === logFilter);
  }, [logs, logFilter]);

  // Sample pre-shift message for live preview
  const previewPreShiftMessage = useMemo(() => {
    return buildPreShiftAlertMessage({
      shiftName: previewLang === 'km' ? 'វេនព្រឹក (Morning Shift)' : 'Morning Shift',
      shiftTime: '08:00 - 12:00',
      minutesUntilStart: config?.beforeShiftMinutes || 15,
      startTimeFormatted: '08:00 AM',
      scheduledEmployeesCount: Array.isArray(users) ? users.length : 0,
      isBroadcast: true,
      lang: previewLang,
    });
  }, [users, config?.beforeShiftMinutes, previewLang]);

  // Sample overdue check-in message
  const previewOverdueMessage = useMemo(() => {
    return buildOverdueCheckInMessage({
      employeeName: user?.name || 'Staff Member',
      employeeId: user?.employeeId || 'EMP-001',
      departmentName: 'Technology & Operations',
      shiftName: previewLang === 'km' ? 'វេនព្រឹក' : 'Morning Shift',
      shiftTime: '08:00 - 12:00',
      overdueMinutes: 15,
      graceMinutes: config?.gracePeriodMinutes || 15,
      lang: previewLang,
    });
  }, [user, config?.gracePeriodMinutes, previewLang]);

  if (!isOpen) return null;

  return (
    <div 
      id="telegram-notification-modal-container"
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs border border-white/20">
              <Send className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  {lang === 'km' ? 'មជ្ឈមណ្ឌលជូនដំណឹង Telegram' : 'Telegram Attendance Notification Center'}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  {config.isEnabled ? (lang === 'km' ? 'ដំណើរការ' : 'Active') : (lang === 'km' ? 'បានផ្អាក' : 'Disabled')}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  {lang === 'km' ? 'មិនកត់ត្រាស្វ័យប្រវត្តិ' : 'Strictly No Auto-Check In'}
                </span>
              </div>
              <p className="text-xs text-blue-100/80 mt-0.5">
                {lang === 'km'
                  ? 'ការរំលឹកមុនម៉ោងវេនការងារ និងជូនដំណឹងបុគ្គលិកដែលមិនទាន់កត់ត្រាចូល ដោយមិនកត់ត្រាចូលដោយស្វ័យប្រវត្តិនោះឡើយ'
                  : 'Pre-shift alerts & unclocked attendance notifications directly via Telegram Bot and Group Channel (Zero auto-check ins).'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 py-2 gap-2 overflow-x-auto shrink-0">
          {/* TAB 1: PRE-SHIFT ALERT (USER REQUIREMENT) */}
          <button
            onClick={() => setActiveTab('preshift')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'preshift'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'រំលឹកមុនម៉ោងវេនការងារ' : 'Advance Pre-Shift Alert'}</span>
            {config.beforeShiftAlertEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* TAB 2: OVERDUE SCANNER */}
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'scanner'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'ស្កេនរកអ្នកអវត្តមាន' : 'Overdue Scanner'}</span>
            {scanResult && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                {scanResult.unclockedCount}
              </span>
            )}
          </button>

          {/* TAB 3: BOT & CHANNEL CONFIG (USER REQUIREMENT: ADMIN CAN CHANGE TOKEN & CHANNEL CHAT ID) */}
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'config'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'ការកំណត់ Bot & Channel ID (Admin)' : 'Bot Token & Channel Setup (Admin)'}</span>
            {isAdmin ? (
              <span className="px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase">Admin</span>
            ) : (
              <Lock className="w-3 h-3 text-slate-400" />
            )}
          </button>

          {/* TAB 4: EMPLOYEE DIRECTORY */}
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'directory'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'បញ្ជី Telegram បុគ្គលិក' : 'Employee Directory'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {users.length}
            </span>
          </button>

          {/* TAB 5: AUDIT LOGS */}
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'កំណត់ត្រាបញ្ជូនសារ' : 'Audit Logs'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {logs.length}
            </span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* TAB 1: ADVANCE PRE-SHIFT ALERT */}
          {activeTab === 'preshift' && (
            <div className="space-y-5">
              {/* Feature Banner */}
              <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-slate-50 p-4 rounded-xl border border-sky-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {lang === 'km' ? 'ការរំលឹកវេនការងារជាមុន (Auto Alert Before Shift Time)' : 'Advance Shift Auto-Notification (Before Shift Time)'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {lang === 'km'
                        ? 'ប្រព័ន្ធផ្ញើសាររំលឹកស្វ័យប្រវត្តិតាម Telegram មុនពេលវេនការងារចាប់ផ្តើម (ឧ. ១៥ នាទីមុនម៉ោង ០៨:០០ ឬ ១៣:០០) ទៅកាន់ Telegram Group Channel ឬបុគ្គលិក ដើម្បីត្រៀមកត់ត្រាចូលដោយផ្ទាល់។'
                        : 'Automatically broadcasts reminders to your Telegram Group Channel and scheduled staff minutes before shift starts so everyone prepares to clock in manually.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {lang === 'km' ? 'ស្ថានភាព៖' : 'Status:'}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                    config.beforeShiftAlertEnabled 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    {config.beforeShiftAlertEnabled ? (lang === 'km' ? 'បើកដំណើរការ' : 'Enabled') : (lang === 'km' ? 'បានបិទ' : 'Disabled')}
                  </span>
                </div>
              </div>

              {/* Pre-Shift Automation Settings Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {lang === 'km' ? 'ការកំណត់ការរំលឹកមុនម៉ោង' : 'Advance Pre-Shift Alert Configurations'}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500">
                      {lang === 'km' ? 'ស្កេនស្វ័យប្រវត្តិក្នុងផ្ទៃខាងក្រោយ' : 'Auto Background Scanner:'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.autoSchedulerEnabled}
                        disabled={!isAdmin}
                        onChange={e => {
                          const updated = { ...config, autoSchedulerEnabled: e.target.checked };
                          setConfig(updated);
                          if (isAdmin) db.saveTelegramConfig(updated);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {/* Master Toggle */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      {lang === 'km' ? 'បើកការរំលឹកមុនម៉ោង' : 'Enable Pre-Shift Alert'}
                    </span>
                    <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.beforeShiftAlertEnabled}
                        disabled={!isAdmin}
                        onChange={e => {
                          const updated = { ...config, beforeShiftAlertEnabled: e.target.checked };
                          setConfig(updated);
                          if (isAdmin) db.saveTelegramConfig(updated);
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold">
                        {lang === 'km' ? 'ជូនដំណឹងស្វ័យប្រវត្តិតាម Telegram' : 'Auto-alert before shift start'}
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'km' ? 'ផ្ញើសាររំលឹកមុនពេលវេនការងារចាប់ផ្តើម' : 'Triggers notification ahead of scheduled start.'}
                    </p>
                  </div>

                  {/* Warning Lead Time */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      {lang === 'km' ? 'ជូនដំណឹងមុនម៉ោងចំនួន (នាទី)' : 'Lead Time Before Shift (Mins)'}
                    </label>
                    <select
                      value={config.beforeShiftMinutes || 15}
                      disabled={!isAdmin}
                      onChange={e => {
                        const updated = { ...config, beforeShiftMinutes: Number(e.target.value) };
                        setConfig(updated);
                        if (isAdmin) db.saveTelegramConfig(updated);
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                    >
                      <option value={10}>10 {lang === 'km' ? 'នាទីមុន' : 'Minutes Before'}</option>
                      <option value={15}>15 {lang === 'km' ? 'នាទីមុន (ណែនាំ)' : 'Minutes Before (Recommended)'}</option>
                      <option value={30}>30 {lang === 'km' ? 'នាទីមុន' : 'Minutes Before'}</option>
                      <option value={45}>45 {lang === 'km' ? 'នាទីមុន' : 'Minutes Before'}</option>
                      <option value={60}>60 {lang === 'km' ? 'នាទីមុន (១ ម៉ោង)' : 'Minutes Before (1 Hour)'}</option>
                    </select>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'km' ? 'ឧ. ១៥ នាទីមុនម៉ោង ០៨:០០ (ម៉ោង ០៧:៤៥)' : 'e.g., 15m before 08:00 AM (at 07:45 AM).'}
                    </p>
                  </div>

                  {/* Delivery Target Destination */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      {lang === 'km' ? 'ទិសដៅបញ្ជូនសារ' : 'Broadcast Destination'}
                    </label>
                    <select
                      value={config.beforeShiftTarget || 'both'}
                      disabled={!isAdmin}
                      onChange={e => {
                        const updated = { ...config, beforeShiftTarget: e.target.value as any };
                        setConfig(updated);
                        if (isAdmin) db.saveTelegramConfig(updated);
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                    >
                      <option value="both">{lang === 'km' ? 'ទាំង Group Channel & បុគ្គលិកផ្ទាល់' : 'Both Group Channel & Staff'}</option>
                      <option value="group_channel">{lang === 'km' ? 'តែ Group / Channel ប៉ុណ្ណោះ' : 'Group / Channel Broadcast Only'}</option>
                      <option value="direct_employee">{lang === 'km' ? 'តែបុគ្គលិកដែលត្រូវចូលវេន' : 'Direct to Scheduled Staff Only'}</option>
                    </select>
                    <p className="text-[11px] text-slate-500 truncate">
                      {lang === 'km' ? 'Channel: ' : 'Target Channel: '}
                      <span className="font-mono text-slate-700 font-semibold">{config.groupChannelChatId || config.defaultChatId || 'Not set'}</span>
                    </p>
                  </div>
                </div>

                {/* Instant Trigger Test Dispatcher */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-600">
                      {lang === 'km' ? 'សាកល្បងបញ្ជូនការរំលឹកមុនម៉ោងសម្រាប់វេន៖' : 'Test Pre-Shift Dispatch for Shift:'}
                    </span>
                    <select
                      value={preShiftTestKey}
                      onChange={e => setPreShiftTestKey(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold"
                    >
                      <option value="Morning">{lang === 'km' ? 'វេនព្រឹក (08:00 - 12:00)' : 'Morning Shift (08:00 - 12:00)'}</option>
                      <option value="Evening">{lang === 'km' ? 'វេនរសៀល (13:00 - 17:00)' : 'Evening Shift (13:00 - 17:00)'}</option>
                    </select>
                  </div>

                  <button
                    onClick={handleDispatchPreShift}
                    disabled={isDispatchingPreShift}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
                  >
                    {isDispatchingPreShift ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{lang === 'km' ? 'កំពុងបញ្ជូន...' : 'Dispatching Pre-Shift...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{lang === 'km' ? 'បញ្ជូនការរំលឹកមុនម៉ោងឥឡូវនេះ (Test)' : 'Dispatch Pre-Shift Alert Now (Test)'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Dispatch Results Panel if triggered */}
                {preShiftResult && (
                  <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between text-indigo-900 font-bold">
                      <div className="flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>
                          {lang === 'km' ? 'លទ្ធផលបញ្ជូនការរំលឹកមុនម៉ោង៖' : 'Pre-Shift Dispatch Output:'}
                        </span>
                      </div>
                      <span>
                        {preShiftResult.alertsDispatched} {lang === 'km' ? 'សារបានបញ្ជូន' : 'messages delivered'}
                      </span>
                    </div>
                    <div className="divide-y divide-indigo-100/60 max-h-36 overflow-y-auto">
                      {preShiftResult.messages.map((m, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between text-[11px] text-slate-700">
                          <span className="font-semibold">{m.recipient} ({m.shift})</span>
                          <span className="font-mono text-slate-500">ID: {m.target}</span>
                          <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800 text-[10px]">
                            {m.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview of Advance Pre-Shift Message */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-bold text-slate-800">
                      {lang === 'km' ? 'គំរូសារដែលផ្ញើមុនពេលវេនការងារចាប់ផ្តើម' : 'Pre-Shift Telegram Alert Message Preview'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setPreviewLang('km')}
                      className={`px-2 py-0.5 text-[11px] rounded font-semibold ${previewLang === 'km' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                      ភាសាខ្មែរ
                    </button>
                    <button
                      onClick={() => setPreviewLang('en')}
                      className={`px-2 py-0.5 text-[11px] rounded font-semibold ${previewLang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-line leading-relaxed shadow-inner">
                  {previewPreShiftMessage}
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  {lang === 'km'
                    ? '* សារនេះបញ្ជាក់យ៉ាងច្បាស់ដល់បុគ្គលិកថា ប្រព័ន្ធមិនកត់ត្រាវត្តមានចូលដោយស្វ័យប្រវត្តិនោះឡើយ ដោយតម្រូវឱ្យបុគ្គលិកចុចកត់ត្រាចូលដោយផ្ទាល់តាម APMS។'
                    : '* Note: Message explicitly alerts staff to record their attendance upon arrival. System strictly avoids automatic check-ins.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: OVERDUE SCANNER & DISPATCHER */}
          {activeTab === 'scanner' && (
            <div className="space-y-5">
              {/* Architecture Guarantee Banner */}
              <div className="bg-gradient-to-r from-amber-50 via-blue-50/50 to-slate-50 p-4 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {lang === 'km' ? 'គោលការណ៍កត់ត្រាវត្តមានដោយផ្ទាល់ (No Auto-Check In)' : 'Manual Verification Rule (No Auto-Check In)'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {lang === 'km'
                        ? 'ប្រព័ន្ធស្កេនរកបុគ្គលិកដែលមិនទាន់បានកត់ត្រាវត្តមានចូលតាមវេនកំណត់ ហើយផ្ញើសាររំលឹកតាម Telegram ផ្ទាល់ខ្លួន ដើម្បីឱ្យបុគ្គលិកចូលទៅកាន់ APMS និងចុចកត់ត្រាដោយខ្លួនឯង។ ប្រព័ន្ធមិនកត់ត្រាចូលដោយស្វ័យប្រវត្តិនោះឡើយ។'
                        : 'Identifies scheduled employees who haven’t clocked in today, sending personalized Telegram reminders to manually log into APMS and record attendance. The system never executes automatic clock-ins.'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    {lang === 'km' ? 'រយៈពេលអនុគ្រោះ៖' : 'Grace Period:'}
                  </span>
                  <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    +{config.gracePeriodMinutes || 15} {lang === 'km' ? 'នាទី' : 'Minutes'}
                  </span>
                </div>
              </div>

              {/* Action Trigger Box */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {lang === 'km' ? 'ស្កេនរកបុគ្គលិកដែលអវត្តមាន និងបញ្ជូនសាររំលឹក' : 'Scan Unclocked Employees & Dispatch Telegram Alerts'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'km'
                      ? 'ពិនិត្យកាលវិភាគវេនការងារថ្ងៃនេះ រកឃើញបុគ្គលិកណាដែលមិនទាន់បានកត់ត្រាចូល ហើយផ្ញើសាររំលឹកភ្លាមៗ។'
                      : 'Evaluates today’s scheduled shift roster, detects missing check-in records past grace period, and dispatches Telegram notifications.'}
                  </p>
                  {config.lastScanTime && (
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {lang === 'km' ? 'ស្កេនចុងក្រោយ៖' : 'Last Scanned:'} {new Date(config.lastScanTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handleRunScanner}
                    disabled={isScanning}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{lang === 'km' ? 'កំពុងស្កេន...' : 'Scanning Roster...'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>{lang === 'km' ? 'ស្កេន & បញ្ជូនការរំលឹកឥឡូវនេះ' : 'Scan & Dispatch Alerts Now'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Scanner Results Panel */}
              {scanResult ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-medium text-slate-500">{lang === 'km' ? 'បានស្កេនសរុប' : 'Total Evaluated'}</span>
                      <div className="text-xl font-bold text-slate-800 mt-0.5">{scanResult.scannedCount}</div>
                    </div>
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-xs font-medium text-emerald-700">{lang === 'km' ? 'បានកត់ត្រារួច' : 'Clocked In (On Time)'}</span>
                      <div className="text-xl font-bold text-emerald-800 mt-0.5">{scanResult.clockedInCount}</div>
                    </div>
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="text-xs font-medium text-amber-700">{lang === 'km' ? 'មិនទាន់កត់ត្រា' : 'Unclocked / Overdue'}</span>
                      <div className="text-xl font-bold text-amber-800 mt-0.5">{scanResult.unclockedCount}</div>
                    </div>
                    <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
                      <span className="text-xs font-medium text-blue-700">{lang === 'km' ? 'សាររំលឹកបានបញ្ជូន' : 'Alerts Dispatched'}</span>
                      <div className="text-xl font-bold text-blue-800 mt-0.5">{scanResult.notifiedCount}</div>
                    </div>
                  </div>

                  {/* Dispatched alerts breakdown */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{lang === 'km' ? 'បញ្ជីបុគ្គលិកដែលបានជូនដំណឹង' : 'Dispatched Notification Queue'}</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        {scanResult.alertsDispatched.length} {lang === 'km' ? 'នាក់' : 'records'}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {scanResult.alertsDispatched.map(item => (
                        <div key={item.userId} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                              {item.userName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{item.userName}</div>
                              <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                                <span>{item.shift}</span>
                                <span>&bull;</span>
                                <span className="text-amber-600 font-semibold">+{item.overdueMinutes}m overdue</span>
                                <span>&bull;</span>
                                <span className="font-mono text-slate-400">ID: {item.chatId}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'SENT'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : item.status === 'SIMULATED'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {item.status === 'SENT' ? 'Telegram API Sent' : item.status === 'SIMULATED' ? 'Simulated Dispatch' : 'Failed'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    {lang === 'km' ? 'មិនទាន់មានការស្កេនក្នុងវគ្គនេះនៅឡើយទេ' : 'No scan has been run in this session yet.'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                    {lang === 'km'
                      ? 'ចុចប៊ូតុង "ស្កេន & បញ្ជូនការរំលឹកឥឡូវនេះ" ខាងលើដើម្បីស្វែងរកបុគ្គលិកដែលមិនទាន់បានកត់ត្រាចូលថ្ងៃនេះ និងផ្ញើសាររំលឹកតាម Telegram។'
                      : 'Click the "Scan & Dispatch Alerts Now" button above to evaluate today’s attendance records and deliver reminders.'}
                  </p>
                </div>
              )}

              {/* Sample Overdue Message Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">
                      {lang === 'km' ? 'គំរូសាររំលឹកពេលហួសម៉ោងចូលធ្វើការ' : 'Overdue Check-in Message Preview'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setPreviewLang('km')}
                      className={`px-2 py-0.5 text-[11px] rounded font-semibold ${previewLang === 'km' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                      ភាសាខ្មែរ
                    </button>
                    <button
                      onClick={() => setPreviewLang('en')}
                      className={`px-2 py-0.5 text-[11px] rounded font-semibold ${previewLang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-line leading-relaxed shadow-inner">
                  {previewOverdueMessage}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BOT SETUP & GROUP CHANNEL (USER REQUIREMENT: ADMIN CAN CHANGE TOKEN & CHANNEL CHAT ID) */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Admin Access Status Notice */}
              <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                isAdmin 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <div className="flex items-center space-x-2.5">
                  {isAdmin ? (
                    <Unlock className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {isAdmin 
                        ? (lang === 'km' ? 'របៀបគ្រប់គ្រង Admin (Admin Configuration Mode)' : 'Admin Configuration Mode Enabled')
                        : (lang === 'km' ? 'មានតែ Admin ប៉ុណ្ណោះដែលអាចកែប្រែ Bot Token និង Channel ID បាន' : 'Read-Only: Bot Token and Group Channel ID can only be altered by Administrators.')
                      }
                    </span>
                    <span className="text-[11px] opacity-90">
                      {lang === 'km'
                        ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin) អាចផ្លាស់ប្តូរ Telegram Bot API Token និង Group / Channel Chat ID បាននៅទីនេះ។'
                        : 'Administrators can configure institutional Bot Token, Group / Channel ID, and alert schedules below.'}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 rounded bg-white/60 font-mono text-[10px] font-bold shrink-0 border border-current">
                  Role: {currentUser.role}
                </span>
              </div>

              {/* BotFather Step-by-step Setup Guide */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-800/40 shadow-xl space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {lang === 'km' ? 'ជំហានបង្កើត Bot តាម BotFather & ភ្ជាប់ Channel/Group' : 'Setup Telegram Bot & Group / Channel'}
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      {lang === 'km' ? 'អនុវត្តតាម ៣ ជំហានងាយៗដើម្បីទទួលបាន Token និង Chat ID' : 'Follow these instructions to connect your Telegram Bot and institutional Channel/Group'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1.5">
                    <div className="flex items-center space-x-2 text-xs font-bold text-sky-400">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">1</span>
                      <span>{lang === 'km' ? 'បង្កើត Bot នៅ @BotFather' : 'Create Bot via @BotFather'}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {lang === 'km' ? 'ស្វែងរក' : 'Search'} <strong className="text-white">@BotFather</strong> {lang === 'km' ? 'ផ្ញើ /newbot ហើយចម្លង Bot API Token ផ្លូវការ។' : 'send /newbot and copy the HTTP API token.'}
                    </p>
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold underline mt-1"
                    >
                      <span>https://t.me/BotFather</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1.5">
                    <div className="flex items-center space-x-2 text-xs font-bold text-sky-400">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">2</span>
                      <span>{lang === 'km' ? 'បញ្ចូល Bot ក្នុង Group / Channel' : 'Add Bot to Group/Channel'}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {lang === 'km' ? 'បន្ថែម Bot របស់អ្នកជា' : 'Add your bot as an'} <strong className="text-white">Administrator</strong> {lang === 'km' ? 'ទៅកាន់ Telegram Group ឬ Channel ដោយបើកសិទ្ធិ "Post Messages"។' : 'to your Group or Channel with permission to post messages.'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1.5">
                    <div className="flex items-center space-x-2 text-xs font-bold text-sky-400">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">3</span>
                      <span>{lang === 'km' ? 'ចម្លង Chat ID / @channel' : 'Paste Token & Chat ID'}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {lang === 'km' ? 'បញ្ចូលលេខ Chat ID (ឧ. -100...) ឬ @channelname រួចចុច Save & Test Ping។' : 'Enter the Chat ID (starts with -100... or @channelname) and click Save & Test.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bot Token & Group Channel Configuration Form (USER REQUIREMENT) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {lang === 'km' ? 'ការកំណត់រចនាសម្ព័ន្ធ Telegram Bot Token & Group Channel' : 'Telegram Bot API Token & Group Channel Settings'}
                    </h4>
                    <span className="text-xs text-slate-500">
                      {lang === 'km' ? 'អ្នកគ្រប់គ្រងអាចកែប្រែ Bot API Token និង Channel ID បានគ្រប់ពេលវេលា' : 'Configured tokens and chat IDs persist across the institutional attendance service.'}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleLoadDemoToken}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                    >
                      <span>{lang === 'km' ? 'ប្រើ Demo Bot & Channel' : 'Use Demo Bot & Channel'}</span>
                    </button>
                  )}
                </div>

                {/* 1. BOT TOKEN FIELD */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>{lang === 'km' ? 'Telegram Bot API Token (ពី @BotFather) *' : 'Telegram Bot API Token (from @BotFather) *'}</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      Format: <code>1234567890:ABC-DEF...</code>
                    </span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={config.botToken}
                        disabled={!isAdmin}
                        onChange={e => setConfig({ ...config, botToken: e.target.value })}
                        placeholder="e.g. 7891234567:AAFltXYZ..."
                        className="w-full text-xs font-mono px-3 py-2.5 pr-10 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyToken}
                      disabled={isValidatingToken || !config.botToken || !isAdmin}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 shrink-0"
                    >
                      {isValidatingToken ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>{lang === 'km' ? 'ផ្ទៀងផ្ទាត់ Token' : 'Verify Token'}</span>
                    </button>
                  </div>
                </div>

                {/* Validation Result Box */}
                {botValidationResult && (
                  <div className={`p-3.5 rounded-xl border text-xs ${
                    botValidationResult.ok 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {botValidationResult.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        {botValidationResult.ok ? (
                          <>
                            <div className="font-bold">
                              {lang === 'km' ? 'បានភ្ជាប់ Telegram Bot ដោយជោគជ័យ!' : 'Telegram Bot Verified & Connected!'}
                            </div>
                            <div className="text-[11px] mt-0.5 font-mono text-emerald-800">
                              Bot Name: {botValidationResult.botInfo?.first_name} &bull; Username: @{botValidationResult.botInfo?.username} (ID: {botValidationResult.botInfo?.id})
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-bold">{lang === 'km' ? 'ការផ្ទៀងផ្ទាត់មិនជោគជ័យ' : 'Verification Failed'}</div>
                            <div className="text-[11px] mt-0.5 text-rose-700">{botValidationResult.error}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. GROUP / CHANNEL CHAT ID FIELD (USER REQUIREMENT) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>{lang === 'km' ? 'Group / Channel Chat ID *' : 'Telegram Group / Channel Chat ID *'}</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      Channel format: <code>-100xxxxxxxxxx</code> or <code>@channel_username</code>
                    </span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={config.groupChannelChatId || ''}
                      disabled={!isAdmin}
                      onChange={e => setConfig({ ...config, groupChannelChatId: e.target.value, defaultChatId: e.target.value })}
                      placeholder="e.g. -1002345678901 or @my_company_channel"
                      className="w-full text-xs font-mono px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                    />

                    <button
                      type="button"
                      onClick={handleTestGroupChannel}
                      disabled={isTestingChannel || !isAdmin}
                      className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 shrink-0"
                    >
                      {isTestingChannel ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{lang === 'km' ? 'តេស្តផ្ញើសារទៅ Channel' : 'Test Channel Ping'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'km'
                      ? 'Chat ID នេះនឹងត្រូវប្រើសម្រាប់បញ្ជូនការរំលឹកមុនម៉ោងវេនការងារ (Pre-Shift Alerts) និងការរំលឹកវត្តមានទូទៅដល់ក្រុមការងារ។'
                      : 'Used to broadcast advance pre-shift alerts and team attendance reminders to your organization group or channel.'}
                  </p>
                </div>

                {/* Channel Test Result Box */}
                {channelTestResult && (
                  <div className={`p-3.5 rounded-xl border text-xs ${
                    channelTestResult.ok 
                      ? 'bg-sky-50 border-sky-300 text-sky-950' 
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {channelTestResult.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        {channelTestResult.ok ? (
                          <>
                            <div className="font-bold">
                              {lang === 'km' ? 'បានផ្ញើសារសាកល្បងទៅកាន់ Channel ជោគជ័យ!' : 'Group / Channel Dispatch Verified!'}
                            </div>
                            <div className="text-[11px] mt-0.5 text-sky-800">
                              Status: {channelTestResult.status} &bull; Broadcasted test message to: {config.groupChannelChatId || config.defaultChatId}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-bold">{lang === 'km' ? 'ការផ្ញើសារសាកល្បងមិនជោគជ័យ' : 'Channel Dispatch Failed'}</div>
                            <div className="text-[11px] mt-0.5 text-rose-700">{channelTestResult.error}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SUPERVISOR ALERT & OVERDUE GRACE PERIOD */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      {lang === 'km' ? 'Supervisor / HR Alerts Chat ID' : 'Supervisor / HR Alerts Chat ID'}
                    </label>
                    <input
                      type="text"
                      value={config.supervisorChatId || ''}
                      disabled={!isAdmin}
                      onChange={e => setConfig({ ...config, supervisorChatId: e.target.value })}
                      placeholder="-1002345678901 or private chat ID"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden disabled:bg-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      {lang === 'km' ? 'រយៈពេលអនុគ្រោះមុនពេលផ្ញើសាររំលឹកអវត្តមាន (នាទី)' : 'Overdue Grace Period (Minutes)'}
                    </label>
                    <select
                      value={config.gracePeriodMinutes}
                      disabled={!isAdmin}
                      onChange={e => setConfig({ ...config, gracePeriodMinutes: Number(e.target.value) })}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden bg-white disabled:bg-slate-100"
                    >
                      <option value={5}>5 {lang === 'km' ? 'នាទី' : 'Minutes'}</option>
                      <option value={10}>10 {lang === 'km' ? 'នាទី' : 'Minutes'}</option>
                      <option value={15}>15 {lang === 'km' ? 'នាទី (ស្តង់ដារ)' : 'Minutes (Default)'}</option>
                      <option value={30}>30 {lang === 'km' ? 'នាទី' : 'Minutes'}</option>
                      <option value={45}>45 {lang === 'km' ? 'នាទី' : 'Minutes'}</option>
                      <option value={60}>60 {lang === 'km' ? 'នាទី (១ ម៉ោង)' : 'Minutes (1 Hour)'}</option>
                    </select>
                  </div>
                </div>

                {/* Save Credentials Action Bar */}
                {isAdmin && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {lang === 'km' ? 'ការកំណត់នឹងត្រូវរក្សាទុកជាអចិន្ត្រៃយ៍ក្នុងមូលដ្ឋានទិន្នន័យស្ថាប័ន' : 'Settings persist in institutional state and activate automated pre-shift alerts.'}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 flex items-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{lang === 'km' ? 'រក្សាទុកការកំណត់ Bot & Channel' : 'Save Bot Token & Channel Settings'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: EMPLOYEE DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={lang === 'km' ? 'ស្វែងរកតាមឈ្មោះ អ៊ីមែល ឬ Telegram Handle...' : 'Search staff by name, email, or Telegram handle...'}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                  <span className="font-semibold text-slate-700">{filteredUsers.length}</span> {lang === 'km' ? 'បុគ្គលិកក្នុងបញ្ជី' : 'Staff Members in Directory'}
                </div>
              </div>

              {/* Guide on finding Chat ID */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  {lang === 'km'
                    ? 'ដើម្បីឱ្យបុគ្គលិកទទួលបានការជូនដំណឹងផ្ទាល់ខ្លួនតាម Telegram ពួកគេត្រូវចាប់ផ្តើមជជែក (/start) ជាមួយ Bot របស់អ្នក។ ដើម្បីរក Chat ID បុគ្គលិកអាចផ្ញើសារទៅកាន់ @userinfobot ឬប្រើលេខ Chat ID ផ្ទាល់ខ្លួនរបស់ពួកគេ។'
                    : 'To receive individual Telegram alerts, staff must send /start to your bot. Staff can retrieve their unique Chat ID via @userinfobot on Telegram.'}
                </p>
              </div>

              {/* Table of Employees */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">{lang === 'km' ? 'បុគ្គលិក' : 'Employee'}</th>
                      <th className="p-3">{lang === 'km' ? 'នាយកដ្ឋាន' : 'Department'}</th>
                      <th className="p-3">Telegram Handle</th>
                      <th className="p-3">Telegram Chat ID</th>
                      <th className="p-3 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(user => {
                      const isEditing = editingUserId === user.id;
                      const dept = departments.find(d => d.id === user.departmentId);

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/60 transition">
                          <td className="p-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{user.name}</div>
                                <div className="text-[10px] text-slate-400">{user.role} &bull; {user.employeeId || 'EMP'}</div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 text-slate-600">
                            {dept?.name || 'General'}
                          </td>

                          <td className="p-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editHandle}
                                onChange={e => setEditHandle(e.target.value)}
                                placeholder="@username"
                                className="px-2 py-1 border border-blue-400 rounded text-xs w-28 focus:outline-hidden"
                              />
                            ) : (
                              <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {user.telegramHandle || (lang === 'km' ? 'មិនទាន់មាន' : 'None')}
                              </span>
                            )}
                          </td>

                          <td className="p-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editChatId}
                                onChange={e => setEditChatId(e.target.value)}
                                placeholder="123456789"
                                className="px-2 py-1 border border-blue-400 rounded text-xs w-32 focus:outline-hidden"
                              />
                            ) : (
                              <span className="font-mono text-slate-800 font-semibold text-[11px]">
                                {user.telegramChatId || (
                                  <span className="text-sky-700 font-normal italic">
                                    {config.groupChannelChatId ? `Uses Channel (${config.groupChannelChatId})` : 'Uses Default'}
                                  </span>
                                )}
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => handleSaveUserTelegram(user.id)}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700"
                                >
                                  {lang === 'km' ? 'រក្សាទុក' : 'Save'}
                                </button>
                                <button
                                  onClick={() => setEditingUserId(null)}
                                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px] hover:bg-slate-300"
                                >
                                  {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => {
                                    setEditingUserId(user.id);
                                    setEditChatId(user.telegramChatId || '');
                                    setEditHandle(user.telegramHandle || '');
                                  }}
                                  className="px-2 py-1 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded font-semibold transition"
                                >
                                  {lang === 'km' ? 'កែប្រែ' : 'Edit'}
                                </button>
                                <button
                                  onClick={() => handleSendTestToUser(user)}
                                  className="px-2 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded font-semibold transition flex items-center space-x-1"
                                  title="Send test message to this employee"
                                >
                                  <Send className="w-3 h-3 text-blue-600" />
                                  <span>{lang === 'km' ? 'សាកល្បង' : 'Test'}</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-500">{lang === 'km' ? 'ច្រោះតាមស្ថានភាព៖' : 'Filter by Status:'}</span>
                  {(['ALL', 'SENT', 'SIMULATED', 'FAILED'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setLogFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        logFilter === st ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    db.clearTelegramLogs();
                    setLogs([]);
                    onToast(lang === 'km' ? 'បានសម្អាតកំណត់ត្រា Telegram រួចរាល់' : 'Telegram audit logs cleared.');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                >
                  {lang === 'km' ? 'សម្អាតកំណត់ត្រាទាំងអស់' : 'Clear All Logs'}
                </button>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                  {lang === 'km' ? 'មិនមានកំណត់ត្រាបញ្ជូនសារនៅក្នុងប្រព័ន្ធទេ' : 'No Telegram delivery logs found.'}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {filteredLogs.map(item => (
                    <div key={item.id} className="p-3.5 hover:bg-slate-50 transition space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{item.recipientName}</span>
                          <span className="font-mono text-slate-400 text-[11px]">Chat: {item.recipientChatId}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {item.type}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'SENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'SIMULATED'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 font-mono bg-slate-50 p-2 rounded border border-slate-100 truncate">
                        {(item.messageText || '').replace(/<[^>]*>?/gm, '')}
                      </p>

                      {item.errorDetails && (
                        <p className="text-[10px] text-rose-600 font-mono">
                          Error: {item.errorDetails}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {lang === 'km' ? 'ប្រព័ន្ធដំណើរការធម្មតា &bull; គ្មានការកត់ត្រាចូលដោយស្វ័យប្រវត្តិនោះឡើយ' : 'Pre-Shift & Attendance Alerts Active &bull; Strictly No Auto-Check In'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition"
          >
            {lang === 'km' ? 'បិទផ្ទាំង' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
