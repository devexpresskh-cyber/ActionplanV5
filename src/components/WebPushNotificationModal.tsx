import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  Vibrate, 
  Clock, 
  Sparkles, 
  X, 
  ShieldCheck, 
  Send, 
  Trash2,
  HelpCircle,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { webPushService, WebPushSettings, PushNotificationRecord } from '../services/webPushService';
import { User, Language } from '../types';

interface WebPushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  lang: Language;
}

export const WebPushNotificationModal: React.FC<WebPushNotificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [settings, setSettings] = useState<WebPushSettings>(() => webPushService.getSettings());
  const [history, setHistory] = useState<PushNotificationRecord[]>(() => webPushService.getHistory());
  const [testStatusMsg, setTestStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermission(webPushService.getPermission());
      setSettings(webPushService.getSettings());
      setHistory(webPushService.getHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const perm = await webPushService.requestPermission();
    setPermission(perm);
    setSettings(webPushService.getSettings());
    if (perm === 'granted') {
      setTestStatusMsg('Web Push notifications enabled successfully!');
      webPushService.triggerTestCheckIn(currentUser.name);
      setHistory(webPushService.getHistory());
    } else if (perm === 'denied') {
      setTestStatusMsg('Notifications blocked by browser settings. Please enable them in your browser site permissions.');
    }
    setTimeout(() => setTestStatusMsg(null), 5000);
  };

  const handleToggleSetting = (key: keyof WebPushSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    webPushService.saveSettings(updated);
  };

  const handleTestCheckIn = async () => {
    await webPushService.triggerTestCheckIn(currentUser.name);
    setHistory(webPushService.getHistory());
    setTestStatusMsg('Sent Check-in Web Push test alert with chime & vibration!');
    setTimeout(() => setTestStatusMsg(null), 4000);
  };

  const handleTestCheckOut = async () => {
    await webPushService.triggerTestCheckOut(currentUser.name);
    setHistory(webPushService.getHistory());
    setTestStatusMsg('Sent Check-out Web Push test alert with chime & vibration!');
    setTimeout(() => setTestStatusMsg(null), 4000);
  };

  const handleTestShiftReminder = async () => {
    await webPushService.triggerTestShiftReminder(currentUser.name);
    setHistory(webPushService.getHistory());
    setTestStatusMsg('Sent Shift Start Reminder test alert!');
    setTimeout(() => setTestStatusMsg(null), 4000);
  };

  const handleClearHistory = () => {
    webPushService.clearHistory();
    setHistory([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 text-slate-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/80 border border-indigo-400/30 flex items-center justify-center text-white shadow-sm">
              <Bell className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">Web Push Attendance Alerts</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  PWA Ready
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Browser push notifications for check-in, check-out &amp; shift reminders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Permission Status Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            permission === 'granted'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : permission === 'denied'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-start gap-3">
              {permission === 'granted' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : permission === 'denied' ? (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold text-xs sm:text-sm">
                  {permission === 'granted'
                    ? 'Browser Push Notifications: Active & Granted'
                    : permission === 'denied'
                    ? 'Browser Push Notifications: Blocked'
                    : 'Browser Push Notifications: Not Yet Enabled'}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {permission === 'granted'
                    ? 'You will receive real-time alerts on your device for attendance actions and scheduled shift reminders.'
                    : permission === 'denied'
                    ? 'Your browser has blocked push notifications. Please update permissions in your browser URL bar.'
                    : 'Grant permission to receive instant mobile and desktop push notifications when clocking in/out.'}
                </p>
              </div>
            </div>

            {permission !== 'granted' && permission !== 'unsupported' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition shrink-0 active:scale-95"
              >
                Enable Web Push
              </button>
            )}
          </div>

          {/* Test Status Feedback Banner */}
          {testStatusMsg && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{testStatusMsg}</span>
            </div>
          )}

          {/* Settings Toggles Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Notification Preferences
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Check-in Alerts */}
              <div 
                onClick={() => handleToggleSetting('checkInAlerts')}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Check-In Alerts</p>
                    <p className="text-[11px] text-slate-500">Instant push when punched in</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.checkInAlerts}
                  onChange={() => {}}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Check-out Alerts */}
              <div 
                onClick={() => handleToggleSetting('checkOutAlerts')}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Check-Out Alerts</p>
                    <p className="text-[11px] text-slate-500">Total hours logged summary</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.checkOutAlerts}
                  onChange={() => {}}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Shift Start Reminder */}
              <div 
                onClick={() => handleToggleSetting('shiftStartReminder')}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Shift Start Reminder</p>
                    <p className="text-[11px] text-slate-500">Prompt if not clocked in</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.shiftStartReminder}
                  onChange={() => {}}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Shift End Reminder */}
              <div 
                onClick={() => handleToggleSetting('shiftEndReminder')}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Shift End Reminder</p>
                    <p className="text-[11px] text-slate-500">Alert to punch out on time</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.shiftEndReminder}
                  onChange={() => {}}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Audio Chimes */}
              <div 
                onClick={() => handleToggleSetting('soundAlerts')}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Audio Chimes</p>
                    <p className="text-[11px] text-slate-500">Harmonic feedback sounds</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundAlerts}
                  onChange={() => {}}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Mobile Vibration */}
              <div 
                onClick={() => handleToggleSetting('vibrationAlerts')}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <Vibrate className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Vibration Feedback</p>
                    <p className="text-[11px] text-slate-500">Haptic vibration on mobile</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.vibrationAlerts}
                  onChange={() => {}}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Interactive Test Triggers */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-indigo-600" />
                Live Alert Test Triggers
              </h4>
              <span className="text-[10px] text-slate-500">Simulate push alerts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleTestCheckIn}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition active:scale-95 shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Test Check-In</span>
              </button>

              <button
                type="button"
                onClick={handleTestCheckOut}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition active:scale-95 shadow-xs"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Test Check-Out</span>
              </button>

              <button
                type="button"
                onClick={handleTestShiftReminder}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition active:scale-95 shadow-xs"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Test Reminder</span>
              </button>
            </div>
          </div>

          {/* Push Alert History */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recent Alert Dispatch Log ({history.length})
              </h4>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-600 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Log</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                No notifications logged yet. Click one of the test buttons above to trigger a test alert.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">{item.title}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold shrink-0 ${
                          item.status === 'sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'blocked'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.body}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>PWA &amp; Background Web Push Enabled</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
