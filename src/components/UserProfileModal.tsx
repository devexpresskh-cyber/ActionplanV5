import React, { useState } from 'react';
import { 
  X, 
  User as UserIcon, 
  Shield, 
  KeyRound, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Check, 
  AlertCircle,
  Calendar,
  Lock,
  BadgeCheck,
  Edit3,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  Send
} from 'lucide-react';
import { User, Language, UserRole } from '../types';
import { db } from '../services/db';
import { translations } from '../services/i18n';
import { sendTelegramMessage } from '../services/telegramService';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  lang: Language;
  onUserUpdated?: (user: User) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  lang,
  onUserUpdated,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'permissions'>('profile');

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [editPosition, setEditPosition] = useState(user.position || '');
  const [editTelegramHandle, setEditTelegramHandle] = useState(user.telegramHandle || '');
  const [editTelegramChatId, setEditTelegramChatId] = useState(user.telegramChatId || '');
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const departments = db.getDepartments();
  const dept = departments.find(d => d.id === user.departmentId);

  const permissionsMap: Record<UserRole, string[]> = {
    'Super Admin': [
      'Manage all organizational departments and units',
      'Create, edit, and delete any employee account & assign roles',
      'Manage corporate strategic objectives & KPIs',
      'Approve and reject action plans across all departments',
      'Oversee all operational activities and milestones',
      'Access security audit logs & export historical trails',
      'Configure system parameters and database schemas'
    ],
    'Administrator': [
      'Create and update departments and organizational units',
      'Create and manage employee profiles and role assignments',
      'Manage strategic objectives and alignment indicators',
      'Approve and manage multi-department action plans',
      'Generate enterprise PDF, Excel, and CSV performance reports'
    ],
    'Department Manager': [
      'Create and submit action plans for own department',
      'Approve and review action plans for own department',
      'Assign activities to team leaders and employees',
      'Monitor departmental budget allocation & KPI progress',
      'Submit action plans for final completion review'
    ],
    'Team Leader': [
      'Supervise assigned activities and milestones',
      'Validate deliverables and dependency completions',
      'Log activity progress updates and obstacles',
      'Coordinate team members within assigned action plans'
    ],
    'Employee': [
      'View assigned action plans and activities',
      'Record task progress %, hours spent, and obstacles',
      'Mark deliverables as completed for review'
    ],
    'Executive / Viewer': [
      'Read-only access to all dashboard KPI metrics',
      'View annual strategic objective progress',
      'Generate and download enterprise analytical reports',
      'Inspect calendar timelines and Gantt visual milestones'
    ]
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!editName.trim()) {
      setProfileError('Full Name is required.');
      return;
    }

    try {
      const updated = db.saveUser({
        id: user.id,
        name: editName.trim(),
        email: user.email,
        phone: editPhone.trim(),
        position: editPosition.trim(),
        departmentId: user.departmentId,
        role: user.role,
        employeeId: user.employeeId,
        telegramHandle: editTelegramHandle.trim(),
        telegramChatId: editTelegramChatId.trim(),
      });
      setProfileSuccess('Profile details successfully updated.');
      setIsEditingProfile(false);
      if (onUserUpdated) {
        onUserUpdated(updated);
      }
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    }
  };

  const handleTestDirectTelegram = async () => {
    const targetChatId = (isEditingProfile ? editTelegramChatId : user.telegramChatId)?.trim();
    if (!targetChatId) {
      setProfileError('Please enter a valid Telegram Chat ID first.');
      return;
    }

    setIsTestingTelegram(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const config = db.getTelegramConfig();
      const testText = lang === 'km'
        ? `🔔 <b>ការតេស្តសារផ្ទាល់ខ្លួន | APMS DIRECT ALERT</b>\n━━━━━━━━━━━━━━━━━━━━\nជំរាបសួរ <b>${user.name}</b> (${user.employeeId || 'EMP'})\n✅ ការតភ្ជាប់សារផ្ទាល់ខ្លួនតាម Telegram របស់អ្នកទទួលបានជោគជ័យ!\n⏰ លោកអ្នកនឹងទទួលបានការរំលឹកចូលធ្វើការ និងព័ត៌មានវេនការងារផ្ទាល់ខ្លួននៅទីនេះ។\n<i>*ប្រព័ន្ធមិនកត់ត្រាវត្តមានចូលដោយស្វ័យប្រវត្តិនោះឡើយ*</i>`
        : `🔔 <b>APMS Direct Telegram Alert Test</b>\n━━━━━━━━━━━━━━━━━━━━\nHello <b>${user.name}</b> (${user.employeeId || 'EMP'})\n✅ Direct personal notification route is active!\n⏰ You will receive personal shift reminders and attendance alerts here directly.\n<i>*Note: System strictly does not auto-check you in.*</i>`;

      const res = await sendTelegramMessage(config.botToken, targetChatId, testText);
      if (res.ok) {
        setProfileSuccess(lang === 'km' ? 'បានផ្ញើសារតេស្តទៅកាន់ Telegram របស់អ្នកដោយជោគជ័យ!' : 'Direct Telegram test ping delivered successfully!');
      } else {
        setProfileError(res.error || 'Failed to send Telegram test message.');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Error sending test message.');
    } finally {
      setIsTestingTelegram(false);
      setTimeout(() => setProfileSuccess(''), 4000);
    }
  };

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = 'Pass#';
    for (let i = 0; i < 7; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setConfirmPassword(pass);
    setShowNewPass(true);
    setShowConfirmPass(true);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must contain at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordsDoNotMatch);
      return;
    }

    const res = db.changePassword(user.id, currentPassword, newPassword);
    if (res.success) {
      setPasswordSuccess(t.passwordChangedSuccess);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } else {
      setPasswordError(res.error || 'Failed to change password.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">{user.name}</h2>
              <p className="text-xs text-slate-300 font-mono flex items-center space-x-1.5 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>{user.role}</span>
                <span>•</span>
                <span>{user.employeeId || 'EMP'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'permissions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Role Permissions
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Security & Password
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {profileError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center space-x-2 text-xs">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-xs">
                  {isEditingProfile ? 'Edit Profile Details' : 'Personal & Employment Records'}
                </span>
                {!isEditingProfile ? (
                  <button
                    onClick={() => {
                      setEditName(user.name);
                      setEditPhone(user.phone || '');
                      setEditPosition(user.position || '');
                      setEditTelegramHandle(user.telegramHandle || '');
                      setEditTelegramChatId(user.telegramChatId || '');
                      setIsEditingProfile(true);
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="text-slate-500 hover:text-slate-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleProfileSubmit} className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Corporate Email (Institutional ID)</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs text-slate-500 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Email address is managed by system administrator</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Designation / Position</label>
                      <input
                        type="text"
                        value={editPosition}
                        onChange={e => setEditPosition(e.target.value)}
                        placeholder="e.g. Senior Specialist"
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-slate-700">Phone Number</label>
                        <span className="text-[10px] text-emerald-600 font-medium">Used for Phone Login</span>
                      </div>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        placeholder="012 345 678 or +855 12 345 678"
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Enables login using mobile phone and account password</span>
                    </div>
                  </div>

                  {/* Direct Telegram Route Settings */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center space-x-1.5">
                      <Send className="w-3.5 h-3.5 text-sky-600" />
                      <span className="font-semibold text-slate-800 text-xs">Direct Telegram Notifications</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Telegram Handle</label>
                        <input
                          type="text"
                          value={editTelegramHandle}
                          onChange={e => setEditTelegramHandle(e.target.value)}
                          placeholder="@username"
                          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Personal Telegram Chat ID</label>
                        <input
                          type="text"
                          value={editTelegramChatId}
                          onChange={e => setEditTelegramChatId(e.target.value)}
                          placeholder="e.g. 584920192"
                          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      💡 To find your personal Chat ID, send a message to <b>@userinfobot</b> on Telegram. Remember to also send <b>/start</b> to the corporate bot so it has permission to message you.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>Corporate Email</span>
                      </span>
                      <p className="font-semibold text-slate-900 break-all">{user.email}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
                        <Briefcase className="w-3 h-3" />
                        <span>Designation / Position</span>
                      </span>
                      <p className="font-semibold text-slate-900">{user.position || 'Staff Member'}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
                        <Building2 className="w-3 h-3" />
                        <span>Department</span>
                      </span>
                      <p className="font-semibold text-slate-900">{dept?.name || 'Enterprise'}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-blue-600" />
                          <span>Contact Phone</span>
                        </span>
                        {user.phone && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Phone Login Active
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900 font-mono">{user.phone || 'Not recorded'}</p>
                    </div>
                  </div>

                  {/* Direct Telegram Notification Route Card */}
                  <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
                          <Send className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">Personal Telegram Direct Delivery</h4>
                          <p className="text-[10px] text-slate-500">1-on-1 shift and attendance alerts directly to your private chat</p>
                        </div>
                      </div>
                      {user.telegramChatId ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          Direct Route Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                          Channel Broadcast Only
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/80 p-2 rounded-lg border border-sky-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Telegram Handle</span>
                        <span className="font-mono font-semibold text-slate-800 text-xs">
                          {user.telegramHandle || 'Not set'}
                        </span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-sky-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Telegram Chat ID</span>
                        <span className="font-mono font-semibold text-slate-800 text-xs">
                          {user.telegramChatId || 'Not set'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                      <p className="text-[10px] text-slate-500">
                        {!user.telegramChatId
                          ? 'Click "Edit Profile" above to configure your personal Telegram Chat ID for 1-on-1 alerts.'
                          : 'Pre-shift alerts and check-in reminders route directly to your account.'}
                      </p>
                      {user.telegramChatId && (
                        <button
                          type="button"
                          onClick={handleTestDirectTelegram}
                          disabled={isTestingTelegram}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white rounded-lg font-bold text-[11px] transition shadow-xs flex items-center space-x-1 shrink-0 self-end sm:self-auto"
                        >
                          <Send className="w-3 h-3" />
                          <span>{isTestingTelegram ? 'Sending...' : 'Test Direct Ping'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-start space-x-3 text-blue-900">
                <BadgeCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Authentication Status: Verified</p>
                  <p className="text-[11px] text-blue-700">
                    Account active under Spatie RBAC policy with full institutional audit logging.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Authorized capabilities for role <strong className="text-slate-900">{user.role}</strong>:
              </p>
              <ul className="space-y-2">
                {(permissionsMap[user.role] || []).map((perm, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{perm}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              {passwordError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center space-x-2 text-xs">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password (default: Password@123)"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-9 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    New Password (min 6 characters)
                  </label>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="flex items-center space-x-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-9 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-9 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Update Account Password
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
