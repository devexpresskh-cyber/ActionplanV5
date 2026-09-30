import { TelegramNotificationConfig, TelegramNotificationLog } from '../types';

export const defaultTelegramConfig: TelegramNotificationConfig = {
  botToken: '',
  botUsername: '@apms_attendance_alert_bot',
  defaultChatId: '-1002345678901', // Sample Telegram HR Group ID
  groupChannelChatId: '-1002345678901', // Primary Company / Operations Channel or Group ID
  isEnabled: true,
  gracePeriodMinutes: 15,
  reminderTiming: 'all',
  beforeShiftAlertEnabled: true, // Auto alert to Telegram before shift time
  beforeShiftMinutes: 15, // 15 minutes before shift begins
  beforeShiftTarget: 'both', // Both group channel broadcast and scheduled staff
  autoSchedulerEnabled: true, // Runs background automated check
  dispatchedShiftAlertKeys: [],
  notifySupervisorOnAbsence: true,
  supervisorChatId: '-1002345678901',
  includeDirectLink: true,
  lastScanTime: undefined,
  lastPreShiftScanTime: undefined,
};

export const initialTelegramLogs: TelegramNotificationLog[] = [
  {
    id: 'tlog-1',
    timestamp: '2026-09-17T08:15:30Z',
    recipientUserId: 'usr-5',
    recipientName: 'Channary Lim',
    recipientChatId: '984455661',
    type: 'overdue_checkin_alert',
    messageText: '🚨 <b>APMS Attendance Reminder</b>: Dear Channary Lim, you have not clocked in for Morning Shift (08:00 AM). 15 minutes grace period elapsed. Please open APMS to record your attendance. <i>System does NOT auto-check in.</i>',
    status: 'SIMULATED',
    deliveredAt: '2026-09-17T08:15:32Z',
  },
  {
    id: 'tlog-2',
    timestamp: '2026-09-17T08:16:00Z',
    recipientUserId: 'usr-11',
    recipientName: 'Vanna Meas',
    recipientChatId: '887766552',
    type: 'overdue_checkin_alert',
    messageText: '🚨 <b>APMS Attendance Reminder</b>: Dear Vanna Meas, scheduled start time 08:00 AM passed. Please clock in via Employee Hub.',
    status: 'SIMULATED',
    deliveredAt: '2026-09-17T08:16:02Z',
  },
  {
    id: 'tlog-3',
    timestamp: '2026-09-17T08:00:15Z',
    recipientUserId: 'usr-4',
    recipientName: 'Vireak Ou',
    recipientChatId: '892233443',
    type: 'checkin_reminder',
    messageText: '⏰ <b>Shift Start Reminder</b>: Morning Shift begins at 08:00 AM. Remember to record attendance.',
    status: 'SIMULATED',
    deliveredAt: '2026-09-17T08:00:16Z',
  },
];
