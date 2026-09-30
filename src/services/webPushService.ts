import { WORK_SHIFTS } from './db';
import { ShiftType } from '../types';

export interface WebPushSettings {
  enabled: boolean;
  checkInAlerts: boolean;
  checkOutAlerts: boolean;
  shiftStartReminder: boolean;
  shiftEndReminder: boolean;
  soundAlerts: boolean;
  vibrationAlerts: boolean;
}

export interface PushNotificationRecord {
  id: string;
  type: 'check-in' | 'check-out' | 'shift-reminder' | 'system';
  title: string;
  body: string;
  timestamp: string;
  icon?: string;
  status: 'sent' | 'fallback-toast' | 'blocked';
}

const SETTINGS_KEY = 'ap_webpush_settings';
const HISTORY_KEY = 'ap_webpush_history';
const TRIGGERED_ALERTS_KEY = 'ap_webpush_triggered_alerts';

const defaultSettings: WebPushSettings = {
  enabled: true,
  checkInAlerts: true,
  checkOutAlerts: true,
  shiftStartReminder: true,
  shiftEndReminder: true,
  soundAlerts: true,
  vibrationAlerts: true,
};

// Web Audio API Synthesizer for distinct chime sound effects
class PushSoundManager {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  // Upbeat, ascending chime for Check-in (C5 -> E5 -> G5)
  public playCheckInTone() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    } catch {
      // Audio playback silently catches if browser prohibits before user gesture
    }
  }

  // Calming, harmonious chime for Check-out (G5 -> E5 -> C5)
  public playCheckOutTone() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const notes = [783.99, 659.25, 523.25]; // G5, E5, C5
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.5);
      });
    } catch {
      // Audio catch
    }
  }

  // Gentle double ping for shift reminder (880Hz, 880Hz)
  public playReminderTone() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      [0, 0.18].forEach((delay) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now + delay);
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.2, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.3);
      });
    } catch {
      // Audio catch
    }
  }
}

const soundManager = new PushSoundManager();

export const webPushService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const settings = this.getSettings();
        settings.enabled = true;
        this.saveSettings(settings);
      }
      return perm;
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return 'denied';
    }
  },

  getSettings(): WebPushSettings {
    if (typeof localStorage === 'undefined') return defaultSettings;
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },

  saveSettings(settings: WebPushSettings) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save push settings', e);
    }
  },

  getHistory(): PushNotificationRecord[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  addHistory(record: Omit<PushNotificationRecord, 'id' | 'timestamp'>) {
    const list = this.getHistory();
    const item: PushNotificationRecord = {
      ...record,
      id: `push-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    list.unshift(item);
    if (list.length > 30) list.pop();
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch {
      // Ignore storage errors
    }
    return item;
  },

  clearHistory() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(HISTORY_KEY);
  },

  // Base dispatcher: sends real web push / notification via ServiceWorker or Notification API
  async sendNotification(options: {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    type: 'check-in' | 'check-out' | 'shift-reminder' | 'system';
    vibrate?: number[];
  }): Promise<boolean> {
    const settings = this.getSettings();
    if (!settings.enabled) {
      this.addHistory({
        type: options.type,
        title: options.title,
        body: options.body,
        status: 'blocked',
      });
      return false;
    }

    // Sensory feedback: Vibration
    if (settings.vibrationAlerts && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(options.vibrate || [150, 100, 150]);
      } catch {
        // Safe vibration fallback
      }
    }

    const iconUrl = options.icon || '/pwa-192x192.png';
    const tag = options.tag || `ap-${options.type}-${Date.now()}`;

    // Check notification permission
    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        // Prefer serviceWorkerRegistration.showNotification if registered
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            await reg.showNotification(options.title, {
              body: options.body,
              icon: iconUrl,
              badge: '/pwa-192x192.png',
              tag,
              renotify: true,
              data: { url: window.location.href, timestamp: Date.now() },
            } as NotificationOptions);
            this.addHistory({
              type: options.type,
              title: options.title,
              body: options.body,
              icon: iconUrl,
              status: 'sent',
            });
            return true;
          }
        }

        // Standard Window Notification
        const notif = new Notification(options.title, {
          body: options.body,
          icon: iconUrl,
          badge: '/pwa-192x192.png',
          tag,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        this.addHistory({
          type: options.type,
          title: options.title,
          body: options.body,
          icon: iconUrl,
          status: 'sent',
        });
        return true;
      } catch (err) {
        console.warn('Native notification dispatch failed:', err);
      }
    }

    // If notifications are blocked or not granted, record in history as fallback
    this.addHistory({
      type: options.type,
      title: options.title,
      body: options.body,
      icon: iconUrl,
      status: 'fallback-toast',
    });
    return false;
  },

  // 1. Check-In Web Push Alert
  async sendCheckInAlert(params: {
    userName: string;
    shift: ShiftType;
    time: string;
    status: string;
    location?: string;
  }) {
    const settings = this.getSettings();
    if (settings.soundAlerts) {
      soundManager.playCheckInTone();
    }
    if (!settings.checkInAlerts) return;

    const shiftCfg = WORK_SHIFTS[params.shift] || WORK_SHIFTS.Morning;
    const title = `✅ Check-in Recorded: ${params.userName}`;
    const body = `Punched in for ${shiftCfg.name} at ${params.time} (${params.status}). ${
      params.location ? `Location: ${params.location}` : ''
    } Have a great work day!`;

    await this.sendNotification({
      title,
      body,
      type: 'check-in',
      tag: 'attendance-checkin',
      vibrate: [200, 100, 200],
    });
  },

  // 2. Check-Out Web Push Alert
  async sendCheckOutAlert(params: {
    userName: string;
    shift?: ShiftType;
    time: string;
    workingHours: number;
    overtimeHours?: number;
  }) {
    const settings = this.getSettings();
    if (settings.soundAlerts) {
      soundManager.playCheckOutTone();
    }
    if (!settings.checkOutAlerts) return;

    const title = `👋 Check-out Recorded: ${params.userName}`;
    const otText = params.overtimeHours && params.overtimeHours > 0 ? ` (+${params.overtimeHours}h OT)` : '';
    const body = `Clocked out at ${params.time}. Shift duration: ${params.workingHours}h${otText}. Attendance finalized. Rest well!`;

    await this.sendNotification({
      title,
      body,
      type: 'check-out',
      tag: 'attendance-checkout',
      vibrate: [300, 100, 150],
    });
  },

  // 3. Shift Start Reminder Web Push Alert
  async sendShiftStartReminder(params: {
    userName: string;
    shift: ShiftType;
    scheduledStartTime: string;
  }) {
    const settings = this.getSettings();
    if (settings.soundAlerts) {
      soundManager.playReminderTone();
    }
    if (!settings.shiftStartReminder) return;

    const shiftCfg = WORK_SHIFTS[params.shift] || WORK_SHIFTS.Morning;
    const title = `⏰ Shift Check-in Reminder: ${shiftCfg.name}`;
    const body = `Hello ${params.userName}! Your scheduled shift starts at ${params.scheduledStartTime}. Please check in to log your attendance.`;

    await this.sendNotification({
      title,
      body,
      type: 'shift-reminder',
      tag: `shift-start-${params.shift}`,
      vibrate: [150, 80, 150, 80, 200],
    });
  },

  // 4. Shift End Reminder Web Push Alert
  async sendShiftEndReminder(params: {
    userName: string;
    shift: ShiftType;
    scheduledEndTime: string;
  }) {
    const settings = this.getSettings();
    if (settings.soundAlerts) {
      soundManager.playReminderTone();
    }
    if (!settings.shiftEndReminder) return;

    const shiftCfg = WORK_SHIFTS[params.shift] || WORK_SHIFTS.Morning;
    const title = `🔔 Shift Completed: ${shiftCfg.name}`;
    const body = `Your work hours conclude at ${params.scheduledEndTime}. Remember to punch out before leaving.`;

    await this.sendNotification({
      title,
      body,
      type: 'shift-reminder',
      tag: `shift-end-${params.shift}`,
      vibrate: [200, 100, 200],
    });
  },

  // 5. Test Functions for User Testing
  async triggerTestCheckIn(userName: string = 'Sokha Chan') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    await this.sendCheckInAlert({
      userName,
      shift: 'Morning',
      time: timeStr,
      status: 'Present',
      location: 'Phnom Penh HQ - Main Tower',
    });
  },

  async triggerTestCheckOut(userName: string = 'Sokha Chan') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    await this.sendCheckOutAlert({
      userName,
      shift: 'Morning',
      time: timeStr,
      workingHours: 8.5,
      overtimeHours: 0.5,
    });
  },

  async triggerTestShiftReminder(userName: string = 'Sokha Chan') {
    await this.sendShiftStartReminder({
      userName,
      shift: 'Morning',
      scheduledStartTime: '08:00 AM',
    });
  },

  // Automated background scheduler monitor
  checkAndRunShiftScheduleAlerts(currentUser: { id: string; name: string }, todayAttendance?: { checkInTime?: string | null; checkOutTime?: string | null; shiftType?: ShiftType }) {
    const settings = this.getSettings();
    if (!settings.enabled) return;

    const todayDate = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMinutesOfDay = currentHour * 60 + currentMinute;

    let triggered: Record<string, boolean> = {};
    try {
      const stored = localStorage.getItem(TRIGGERED_ALERTS_KEY);
      triggered = stored ? JSON.parse(stored) : {};
    } catch {
      triggered = {};
    }

    const shiftType = todayAttendance?.shiftType || 'Morning';
    const shiftConfig = WORK_SHIFTS[shiftType] || WORK_SHIFTS.Morning;
    const startHour = shiftConfig.startHour;
    const endHour = shiftConfig.endHour;

    const startMinutesOfDay = startHour * 60;
    const endMinutesOfDay = endHour * 60;

    // Check Start-of-Shift Alert:
    // If not checked in, and current time is between (start - 15min) and (start + 30min)
    const startKey = `${todayDate}_${currentUser.id}_${shiftType}_start_alert`;
    if (!todayAttendance?.checkInTime && !triggered[startKey]) {
      if (currentMinutesOfDay >= startMinutesOfDay - 15 && currentMinutesOfDay <= startMinutesOfDay + 30) {
        triggered[startKey] = true;
        try {
          localStorage.setItem(TRIGGERED_ALERTS_KEY, JSON.stringify(triggered));
        } catch {}
        this.sendShiftStartReminder({
          userName: currentUser.name,
          shift: shiftType,
          scheduledStartTime: `${String(startHour).padStart(2, '0')}:00`,
        });
      }
    }

    // Check End-of-Shift Alert:
    // If checked in but not checked out, and current time >= endHour
    const endKey = `${todayDate}_${currentUser.id}_${shiftType}_end_alert`;
    if (todayAttendance?.checkInTime && !todayAttendance?.checkOutTime && !triggered[endKey]) {
      if (currentMinutesOfDay >= endMinutesOfDay) {
        triggered[endKey] = true;
        try {
          localStorage.setItem(TRIGGERED_ALERTS_KEY, JSON.stringify(triggered));
        } catch {}
        this.sendShiftEndReminder({
          userName: currentUser.name,
          shift: shiftType,
          scheduledEndTime: `${String(endHour).padStart(2, '0')}:00`,
        });
      }
    }
  },
};
