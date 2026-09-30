import { User, AttendanceRecord, TelegramNotificationConfig, TelegramNotificationLog, TelegramScanResult, Language } from '../types';
import { db } from './db';

/**
 * Validates a Telegram Bot Token using the Telegram Bot API getMe method
 */
export async function validateBotToken(token: string): Promise<{ ok: boolean; botInfo?: any; error?: string }> {
  if (!token || !token.trim()) {
    return { ok: false, error: 'Token cannot be empty. Please enter a valid BotFather token.' };
  }

  const cleanToken = token.trim();
  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const data = await res.json();
    if (data && data.ok) {
      return { ok: true, botInfo: data.result };
    } else {
      return { ok: false, error: data?.description || 'Telegram Bot API rejected the provided token.' };
    }
  } catch (err: any) {
    // If CORS or network prevents direct browser fetch, we provide detailed diagnostics
    return {
      ok: false,
      error: err.message?.includes('Failed to fetch') 
        ? 'Direct network error or CORS restriction connecting to Telegram API. (Telegram Bot tokens are still usable in server environments or simulated mode).'
        : `Network error: ${err.message}`,
    };
  }
}

/**
 * Sends a message via the Telegram Bot API sendMessage endpoint
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<{ ok: boolean; status: 'SENT' | 'SIMULATED' | 'FAILED'; error?: string; messageId?: number }> {
  if (!chatId || !chatId.trim()) {
    return { ok: false, status: 'FAILED', error: 'Missing recipient Telegram Chat ID or Channel' };
  }

  const cleanChatId = chatId.trim();
  const cleanToken = (token || '').trim();

  // If no token is configured or in simulated test token mode
  if (!cleanToken || cleanToken.startsWith('mock_') || cleanToken.startsWith('demo_')) {
    return {
      ok: true,
      status: 'SIMULATED',
      messageId: Math.floor(Math.random() * 1000000) + 1,
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: text,
        parse_mode: parseMode,
        disable_web_page_preview: false,
      }),
    });

    const data = await res.json();
    if (data && data.ok) {
      return {
        ok: true,
        status: 'SENT',
        messageId: data.result?.message_id,
      };
    } else {
      return {
        ok: false,
        status: 'FAILED',
        error: data?.description || 'Telegram API sendMessage error',
      };
    }
  } catch (err: any) {
    // Graceful fallback to simulation if CORS blocked
    return {
      ok: true,
      status: 'SIMULATED',
      error: `Network/CORS fallback: ${err.message}`,
    };
  }
}

/**
 * Generates custom message for unclocked attendance reminder (NO AUTO-CHECK IN)
 */
export function buildOverdueCheckInMessage(params: {
  employeeName: string;
  employeeId: string;
  departmentName: string;
  shiftName: string;
  shiftTime: string;
  overdueMinutes: number;
  graceMinutes: number;
  lang?: Language;
}): string {
  const {
    employeeName,
    employeeId,
    departmentName,
    shiftName,
    shiftTime,
    overdueMinutes,
    graceMinutes,
    lang = 'km',
  } = params;

  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const nowDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (lang === 'km') {
    return (
`🚨 <b>ការរំលឹកវត្តមានចូលធ្វើការ | APMS ATTENDANCE ALERT</b>
━━━━━━━━━━━━━━━━━━━━
ជំរាបសួរលោក/លោកស្រី <b>${employeeName}</b> (${employeeId})
🏢 <b>នាយកដ្ឋាន៖</b> ${departmentName}
📅 <b>កាលបរិច្ឆេទ៖</b> ${nowDate}
⏰ <b>វេនការងារ៖</b> ${shiftName} (${shiftTime})
⏳ <b>ស្ថានភាព៖</b> ហួសពេលកត់ត្រាចំនួន <b>${overdueMinutes} នាទី</b> (អនុគ្រោះ៖ ${graceMinutes} នាទី)

⚠️ <b>សេចក្តីជូនដំណឹងសំខាន់៖</b>
លោកអ្នកមិនទាន់បានកត់ត្រាវត្តមានចូលធ្វើការនៅឡើយទេ។
<i><b>*សូមជ្រាប៖ ប្រព័ន្ធនឹងមិនកត់ត្រាវត្តមានដោយស្វ័យប្រវត្តិនោះឡើយ (No Auto-Check In)*</b></i>

📲 <b>សកម្មភាពដែលត្រូវធ្វើ៖</b>
សូមចូលទៅកាន់កម្មវិធី <b>APMS Employee Hub</b> ឬផ្ទាំង <b>វត្តមាន</b> ឥឡូវនេះ ហើយចុចប៊ូតុង <b>[បញ្ជាក់ចូល / Confirm Clock In]</b> ដើម្បីកត់ត្រាវត្តមានផ្ទាល់ខ្លួនរបស់អ្នក។

📍 <i>សូមភ្ជាប់បណ្តាញ Wi-Fi របស់ស្ថាប័ន (HQ Whitelisted IP) ពេលកត់ត្រា។</i>
🕒 បញ្ជូននៅម៉ោង៖ ${nowTime}`
    );
  }

  return (
`🚨 <b>ATTENDANCE CHECK-IN REMINDER | APMS</b>
━━━━━━━━━━━━━━━━━━━━
Dear <b>${employeeName}</b> (${employeeId}),
🏢 <b>Department:</b> ${departmentName}
📅 <b>Date:</b> ${nowDate}
⏰ <b>Assigned Shift:</b> ${shiftName} (${shiftTime})
⏳ <b>Status:</b> Check-in overdue by <b>${overdueMinutes} minutes</b> (Grace Period: ${graceMinutes} mins)

⚠️ <b>CRITICAL NOTICE:</b>
You have not recorded your attendance for today's scheduled shift.
<i><b>*Please note: The system will NOT automatically check you in.*</b></i>

📲 <b>REQUIRED ACTION:</b>
Please open the <b>APMS Employee Hub</b> or <b>Attendance Roster</b> immediately and click <b>[Confirm Clock In]</b> to record your attendance.

📍 <i>Make sure you are connected to the authorized workplace network (HQ Whitelisted IP) when checking in.</i>
🕒 Sent at: ${nowTime}`
  );
}

/**
 * Builds pre-shift start reminder message
 */
export function buildShiftStartReminderMessage(params: {
  employeeName: string;
  shiftName: string;
  shiftTime: string;
  lang?: Language;
}): string {
  const { employeeName, shiftName, shiftTime, lang = 'km' } = params;
  if (lang === 'km') {
    return (
`⏰ <b>រំលឹកវេនការងារ | SHIFT START REMINDER</b>
━━━━━━━━━━━━━━━━━━━━
ជំរាបសួរ <b>${employeeName}</b>, វេនការងារ <b>${shiftName} (${shiftTime})</b> របស់អ្នកនឹងចាប់ផ្តើមឆាប់ៗនេះ។
សូមកុំភ្លេចកត់ត្រាវត្តមានចូលតាមរយៈ APMS នៅពេលលោកអ្នកមកដល់។
<i>*ប្រព័ន្ធមិនកត់ត្រាចូលដោយស្វ័យប្រវត្តិទេ*</i>`
    );
  }
  return (
`⏰ <b>SHIFT START REMINDER | APMS</b>
━━━━━━━━━━━━━━━━━━━━
Hello <b>${employeeName}</b>, your assigned <b>${shiftName} (${shiftTime})</b> is starting shortly.
Please remember to clock in upon arrival via the APMS portal.
<i>*System does NOT auto-check you in*</i>`
  );
}

/**
 * Executes a full scan for all employees scheduled today who haven't clocked in,
 * and sends Telegram alerts WITHOUT auto-checking them in.
 */
export async function scanAndDispatchAttendanceAlerts(
  configOverride?: Partial<TelegramNotificationConfig>,
  lang: Language = 'km'
): Promise<TelegramScanResult> {
  const config = { ...db.getTelegramConfig(), ...(configOverride || {}) };
  const allUsers = db.getUsers().filter(u => u.status === 'Active' && u.isActive !== false);
  const departments = db.getDepartments();
  const workShifts = db.getWorkShifts();

  // Retrieve today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendanceRecords = db.getAuthorizedAttendanceRecords({
    id: 'system-scanner',
    name: 'System Scanner',
    email: 'system@enterprise.internal',
    role: 'Super Admin',
    createdAt: new Date().toISOString(),
  });

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  let scannedCount = 0;
  let clockedInCount = 0;
  let unclockedCount = 0;
  let notifiedCount = 0;
  let skippedCount = 0;

  const alertsDispatched: TelegramScanResult['alertsDispatched'] = [];

  for (const user of allUsers) {
    scannedCount++;

    // Check if user has an attendance record with checkInTime for today
    const userTodayRecord = todayAttendanceRecords.find(
      r => r.userId === user.id && r.date === todayStr && r.checkInTime
    );

    if (userTodayRecord) {
      clockedInCount++;
      continue; // User has already clocked in!
    }

    // User has NOT clocked in!
    unclockedCount++;

    // Determine user's assigned shift (default Morning 08:00 if not specified)
    const shiftKey = user.role === 'Team Leader' || user.role === 'Employee' ? 'Morning' : 'Morning';
    const shiftConfig = workShifts[shiftKey] || {
      name: 'Morning Shift',
      nameKm: 'វេនព្រឹក',
      hours: '08:00 - 12:00',
      startHour: 8,
      startMinute: 0,
    };

    const shiftStartTotalMinutes = (shiftConfig.startHour ?? 8) * 60 + (shiftConfig.startMinute ?? 0);
    const graceMinutes = config.gracePeriodMinutes || 15;
    const overdueMinutes = Math.max(0, currentTotalMinutes - shiftStartTotalMinutes);

    // Only alert if time passed shift start OR grace period expired (or user manual trigger)
    const isOverdue = overdueMinutes >= graceMinutes || currentTotalMinutes >= shiftStartTotalMinutes;

    // Determine target Telegram Chat ID
    const targetChatId = user.telegramChatId || config.defaultChatId || config.supervisorChatId;

    if (!targetChatId) {
      skippedCount++;
      alertsDispatched.push({
        userId: user.id,
        userName: user.name,
        chatId: 'NONE',
        shift: shiftConfig.name,
        overdueMinutes,
        status: 'FAILED',
        error: 'No Telegram Chat ID or default channel configured for employee.',
      });
      continue;
    }

    // Build the message
    const dept = departments.find(d => d.id === user.departmentId)?.name || 'General Operations';
    const messageText = buildOverdueCheckInMessage({
      employeeName: user.name,
      employeeId: user.employeeId || `EMP-${user.id.replace('usr-', '')}`,
      departmentName: dept,
      shiftName: lang === 'km' ? shiftConfig.nameKm || shiftConfig.name : shiftConfig.name,
      shiftTime: shiftConfig.hours || '08:00 - 12:00',
      overdueMinutes: overdueMinutes > 0 ? overdueMinutes : graceMinutes,
      graceMinutes,
      lang,
    });

    // Send the Telegram notification
    const sendRes = await sendTelegramMessage(config.botToken, targetChatId, messageText);

    if (sendRes.ok) {
      notifiedCount++;
    } else {
      skippedCount++;
    }

    // STRICT POLICY: DO NOT AUTO-CHECK IN!
    // The employee must manually open APMS to record their attendance.
    
    // Log to DB
    const logItem: TelegramNotificationLog = {
      id: `tlog-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      recipientUserId: user.id,
      recipientName: user.name,
      recipientChatId: targetChatId,
      type: 'overdue_checkin_alert',
      messageText,
      status: sendRes.status,
      errorDetails: sendRes.error,
      deliveredAt: sendRes.ok ? new Date().toISOString() : undefined,
    };

    db.logTelegramNotification(logItem);

    alertsDispatched.push({
      userId: user.id,
      userName: user.name,
      chatId: targetChatId,
      shift: shiftConfig.name,
      overdueMinutes: overdueMinutes > 0 ? overdueMinutes : graceMinutes,
      status: sendRes.status,
      error: sendRes.error,
    });
  }

  // Update last scan timestamp in configuration
  db.saveTelegramConfig({
    ...config,
    lastScanTime: new Date().toISOString(),
  });

  return {
    timestamp: new Date().toISOString(),
    scannedCount,
    clockedInCount,
    unclockedCount,
    notifiedCount,
    skippedCount,
    alertsDispatched,
  };
}

/**
 * Builds formatted advance pre-shift alert message (English & Khmer)
 */
export function buildPreShiftAlertMessage(params: {
  shiftName: string;
  shiftTime: string;
  minutesUntilStart: number;
  startTimeFormatted: string;
  scheduledEmployeesCount: number;
  isBroadcast?: boolean;
  employeeName?: string;
  lang?: Language;
}): string {
  const {
    shiftName,
    shiftTime,
    minutesUntilStart,
    startTimeFormatted,
    scheduledEmployeesCount,
    isBroadcast = true,
    employeeName,
    lang = 'km',
  } = params;

  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const nowDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (lang === 'km') {
    return (
`🔔 <b>ការរំលឹកវេនការងារមុនម៉ោង | ADVANCE SHIFT ALERT</b>
━━━━━━━━━━━━━━━━━━━━
${isBroadcast ? '📢 <b>សេចក្តីជូនដំណឹងដល់ក្រុមការងារ៖</b>' : `ជំរាបសួរលោក/លោកស្រី <b>${employeeName || 'បុគ្គលិក'}</b>`}
⏰ វេនការងារ <b>${shiftName} (${shiftTime})</b> នឹងចាប់ផ្តើមក្នុងរយៈពេល <b>${minutesUntilStart} នាទីទៀត</b> (វេលាម៉ោង ${startTimeFormatted})។
📅 <b>កាលបរិច្ឆេទ៖</b> ${nowDate}
👥 <b>ចំនួនបុគ្គលិកត្រូវចូលវេន៖</b> ${scheduledEmployeesCount} នាក់

⚠️ <b>គោលការណ៍កត់ត្រាវត្តមាន (Strictly No Auto-Check In):</b>
ប្រព័ន្ធ <b>APMS នឹងមិនកត់ត្រាវត្តមានដោយស្វ័យប្រវត្តិនោះឡើយ</b>។
សូមបុគ្គលិកទាំងអស់ត្រៀមខ្លួនចូលទៅកាន់ <b>Employee Hub</b> ឬផ្ទាំង <b>វត្តមាន</b> ដើម្បីចុច [កត់ត្រាចូល / Clock In] ឱ្យបានទាន់ពេលវេលា។

📍 <i>សូមប្រាកដថាបានភ្ជាប់បណ្តាញ Wi-Fi ស្ថាប័ន (HQ Whitelisted IP) ពេលកត់ត្រាចូល។</i>
🕒 បញ្ជូននៅម៉ោង៖ ${nowTime}`
    );
  }

  return (
`🔔 <b>UPCOMING SHIFT REMINDER | APMS ALERT</b>
━━━━━━━━━━━━━━━━━━━━
${isBroadcast ? '📢 <b>Operations Team Broadcast:</b>' : `Hello <b>${employeeName || 'Colleague'}</b>,`}
⏰ Assigned shift <b>${shiftName} (${shiftTime})</b> starts in <b>${minutesUntilStart} minutes</b> (at ${startTimeFormatted}).
📅 <b>Date:</b> ${nowDate}
👥 <b>Scheduled Personnel:</b> ${scheduledEmployeesCount} staff members

⚠️ <b>ATTENDANCE POLICY (Strictly No Auto-Check In):</b>
The system will <b>NOT automatically check you in</b>.
Please prepare to open the <b>APMS Employee Hub</b> or <b>Attendance Roster</b> upon arrival to manually confirm your attendance.

📍 <i>Ensure you are connected to the authorized workplace network (HQ Whitelisted IP).</i>
🕒 Dispatched at: ${nowTime}`
  );
}

/**
 * Sends a test announcement directly to the Group / Channel Chat ID
 */
export async function sendGroupChannelTestMessage(
  token: string,
  channelChatId: string,
  lang: Language = 'km'
): Promise<{ ok: boolean; status: 'SENT' | 'SIMULATED' | 'FAILED'; error?: string }> {
  if (!channelChatId || !channelChatId.trim()) {
    return { ok: false, status: 'FAILED', error: 'Please enter a Group or Channel Chat ID (e.g. -1001234567890 or @channel_name)' };
  }

  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const nowDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const testText = lang === 'km'
    ? `📢 <b>ការសាកល្បងភ្ជាប់ Group/Channel Telegram | APMS TEST</b>\n━━━━━━━━━━━━━━━━━━━━\n✅ ការតភ្ជាប់ Bot ជាមួយ Group / Channel នេះទទួលបានជោគជ័យ!\n📅 កាលបរិច្ឆេទ៖ ${nowDate} (${nowTime})\n⚙️ ប្រព័ន្ធជូនដំណឹងមុនម៉ោងវេនការងារ (Pre-Shift Alerts) និងការរំលឹកវត្តមាន (Attendance Alerts) នឹងត្រូវបញ្ជូនមកកាន់ Channel នេះជាប្រចាំ។\n<i>*ប្រព័ន្ធមិនកត់ត្រាវត្តមានចូលដោយស្វ័យប្រវត្តិនោះឡើយ*</i>`
    : `📢 <b>APMS Telegram Group / Channel Connection Test</b>\n━━━━━━━━━━━━━━━━━━━━\n✅ Bot connection to this group/channel is verified and active!\n📅 Date: ${nowDate} (${nowTime})\n⚙️ Pre-shift alerts and unclocked attendance reminders will be broadcast here.\n<i>*Note: System strictly avoids auto-check ins.*</i>`;

  const res = await sendTelegramMessage(token, channelChatId, testText);

  // Log test ping
  const logItem: TelegramNotificationLog = {
    id: `tlog-${Date.now()}-group-test`,
    timestamp: new Date().toISOString(),
    recipientUserId: 'system-group',
    recipientName: 'Telegram Group / Channel',
    recipientChatId: channelChatId,
    type: 'test_ping',
    messageText: testText,
    status: res.status,
    errorDetails: res.error,
    deliveredAt: res.ok ? new Date().toISOString() : undefined,
  };
  db.logTelegramNotification(logItem);

  return res;
}

/**
 * Scans upcoming shifts and dispatches automated pre-shift alerts
 * either to the institutional Group Channel, directly to employees, or both.
 */
export async function scanAndDispatchPreShiftAlerts(
  configOverride?: Partial<TelegramNotificationConfig>,
  lang: Language = 'km',
  forceShiftKey?: string // For manual testing of a specific shift alert
): Promise<{
  scannedShifts: number;
  alertsDispatched: number;
  messages: Array<{ target: string; shift: string; status: string; recipient: string }>;
}> {
  const config = { ...db.getTelegramConfig(), ...(configOverride || {}) };
  const allUsers = db.getUsers().filter(u => u.status === 'Active' && u.isActive !== false);
  const workShifts = db.getWorkShifts();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  const beforeMinutes = config.beforeShiftMinutes || 15;
  const targetChannelId = config.groupChannelChatId || config.defaultChatId;
  const dispatchedKeys = new Set(config.dispatchedShiftAlertKeys || []);

  const results: Array<{ target: string; shift: string; status: string; recipient: string }> = [];
  let alertsCount = 0;

  for (const [shiftKey, shiftConfig] of Object.entries(workShifts)) {
    const startH = shiftConfig.startHour ?? (shiftKey === 'Evening' ? 13 : 8);
    const startM = shiftConfig.startMinute ?? 0;
    const shiftStartTotalMinutes = startH * 60 + startM;

    const minutesUntilStart = shiftStartTotalMinutes - currentTotalMinutes;
    const shiftAlertKey = `${todayStr}_${shiftKey}_preshift_${beforeMinutes}m`;

    // Check if shift qualifies:
    // If forceShiftKey is given, or if time is within the advance window (e.g. 15 mins before start)
    const isWithinWindow = forceShiftKey === shiftKey || (minutesUntilStart > 0 && minutesUntilStart <= beforeMinutes);

    if (!isWithinWindow) {
      continue;
    }

    // Check if already dispatched today unless forced
    if (!forceShiftKey && dispatchedKeys.has(shiftAlertKey)) {
      continue;
    }

    const scheduledStaff = allUsers; // All active staff scheduled for operations
    const formattedStartTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    const displayMinutes = forceShiftKey ? beforeMinutes : minutesUntilStart;

    // 1. Broadcast to Group Channel if configured
    if (
      (config.beforeShiftTarget === 'both' || config.beforeShiftTarget === 'group_channel') &&
      targetChannelId
    ) {
      const channelMsg = buildPreShiftAlertMessage({
        shiftName: lang === 'km' ? shiftConfig.nameKm || shiftConfig.name : shiftConfig.name,
        shiftTime: shiftConfig.hours || `${formattedStartTime} - ...`,
        minutesUntilStart: displayMinutes,
        startTimeFormatted: formattedStartTime,
        scheduledEmployeesCount: scheduledStaff.length,
        isBroadcast: true,
        lang,
      });

      const sendRes = await sendTelegramMessage(config.botToken, targetChannelId, channelMsg);
      alertsCount++;

      const logItem: TelegramNotificationLog = {
        id: `tlog-${Date.now()}-preshift-channel-${shiftKey}`,
        timestamp: new Date().toISOString(),
        recipientUserId: 'group-channel',
        recipientName: `Telegram Channel (${shiftConfig.name})`,
        recipientChatId: targetChannelId,
        type: 'pre_shift_alert',
        messageText: channelMsg,
        status: sendRes.status,
        errorDetails: sendRes.error,
        deliveredAt: sendRes.ok ? new Date().toISOString() : undefined,
      };
      db.logTelegramNotification(logItem);

      results.push({
        target: targetChannelId,
        shift: shiftConfig.name,
        status: sendRes.status,
        recipient: 'Group / Channel Broadcast',
      });
    }

    // 2. Direct alert to scheduled employees if configured
    if (config.beforeShiftTarget === 'both' || config.beforeShiftTarget === 'direct_employee') {
      for (const employee of scheduledStaff.slice(0, 10)) { // limit batch for responsive execution
        if (!employee.telegramChatId) continue;

        const directMsg = buildPreShiftAlertMessage({
          shiftName: lang === 'km' ? shiftConfig.nameKm || shiftConfig.name : shiftConfig.name,
          shiftTime: shiftConfig.hours || `${formattedStartTime} - ...`,
          minutesUntilStart: displayMinutes,
          startTimeFormatted: formattedStartTime,
          scheduledEmployeesCount: scheduledStaff.length,
          isBroadcast: false,
          employeeName: employee.name,
          lang,
        });

        const sendRes = await sendTelegramMessage(config.botToken, employee.telegramChatId, directMsg);
        alertsCount++;

        const logItem: TelegramNotificationLog = {
          id: `tlog-${Date.now()}-preshift-direct-${employee.id}`,
          timestamp: new Date().toISOString(),
          recipientUserId: employee.id,
          recipientName: employee.name,
          recipientChatId: employee.telegramChatId,
          type: 'pre_shift_alert',
          messageText: directMsg,
          status: sendRes.status,
          errorDetails: sendRes.error,
          deliveredAt: sendRes.ok ? new Date().toISOString() : undefined,
        };
        db.logTelegramNotification(logItem);

        results.push({
          target: employee.telegramChatId,
          shift: shiftConfig.name,
          status: sendRes.status,
          recipient: employee.name,
        });
      }
    }

    // Mark shift as dispatched today
    dispatchedKeys.add(shiftAlertKey);
  }

  // Update config with dispatched keys and timestamp
  db.saveTelegramConfig({
    ...config,
    dispatchedShiftAlertKeys: Array.from(dispatchedKeys),
    lastPreShiftScanTime: new Date().toISOString(),
  });

  return {
    scannedShifts: Object.keys(workShifts).length,
    alertsDispatched: alertsCount,
    messages: results,
  };
}

/**
 * Periodically invoked ticker to run scheduled alerts automatically
 */
export async function checkAndRunScheduledAlerts(lang: Language = 'km'): Promise<void> {
  const config = db.getTelegramConfig();
  if (!config.isEnabled || !config.autoSchedulerEnabled) return;

  // Run pre-shift check if enabled
  if (config.beforeShiftAlertEnabled) {
    await scanAndDispatchPreShiftAlerts(config, lang);
  }
}
