import React, { useState } from 'react';
import { X, Clock, Calendar, User, MapPin, FileText, CheckCircle2, Sun, Moon, ShieldCheck, WifiOff } from 'lucide-react';
import { User as UserType, Department, AttendanceRecord, AttendanceStatus, Language, ShiftType } from '../types';
import { translations } from '../services/i18n';
import { WORK_SHIFTS } from '../services/db';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recordData: Omit<AttendanceRecord, 'id' | 'createdAt'>) => void;
  users: UserType[];
  departments: Department[];
  lang: Language;
  currentUser: UserType;
  initialDate?: string;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  users,
  departments,
  lang,
  currentUser,
  initialDate = '2026-09-17',
}) => {
  const t = translations[lang];

  const [userId, setUserId] = useState(currentUser.id);
  const [date, setDate] = useState(initialDate);
  const [shiftType, setShiftType] = useState<ShiftType>('Morning');
  const [checkInTime, setCheckInTime] = useState('08:00:00');
  const [checkOutTime, setCheckOutTime] = useState('16:30:00');
  const [status, setStatus] = useState<AttendanceStatus>('Present');
  const [workingHours, setWorkingHours] = useState(8.0);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [location, setLocation] = useState('Anonymized Campus Zone (Zero-Tracking)');
  const [notes, setNotes] = useState('');
  const [checkInMethod, setCheckInMethod] = useState<'Web Portal' | 'Biometric Sync' | 'QR Code' | 'Manual Adjustment' | 'Manual Self-Attestation (Zero-Tracking)'>('Manual Self-Attestation (Zero-Tracking)');
  const [zeroTrackingMode, setZeroTrackingMode] = useState(true);
  const [vpnMasked, setVpnMasked] = useState(true);

  if (!isOpen) return null;

  const handleShiftChange = (newShift: ShiftType) => {
    setShiftType(newShift);
    if (newShift === 'Morning') {
      setCheckInTime('08:00:00');
      setCheckOutTime('16:30:00');
    } else {
      setCheckInTime('14:00:00');
      setCheckOutTime('22:00:00');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedUser = users.find(u => u.id === userId);
    if (!selectedUser) return;

    const shiftConfig = WORK_SHIFTS[shiftType];

    const finalLocation = zeroTrackingMode 
      ? (location.includes('HQ') ? 'Anonymized Campus Zone (Zero-Tracking)' : 'Anonymized Worksite Zone (Zero-Tracking)')
      : location;

    const finalIp = vpnMasked 
      ? `10.8.0.${Math.floor(10 + Math.random() * 80)} [VPN Tunnel Masked]`
      : '192.168.xxx.xxx [Protected]';

    onSave({
      userId,
      userName: selectedUser.name,
      employeeId: selectedUser.employeeId || 'EMP-999',
      departmentId: selectedUser.departmentId,
      date,
      checkInTime: status === 'Absent' || status === 'On Leave' ? null : checkInTime,
      checkOutTime: status === 'Absent' || status === 'On Leave' ? null : checkOutTime,
      status,
      shiftType,
      workShift: shiftConfig.fullLabel,
      workingHours: status === 'Absent' || status === 'On Leave' ? 0 : Number(workingHours),
      overtimeHours: status === 'Absent' || status === 'On Leave' ? 0 : Number(overtimeHours),
      notes: notes || `Manual attendance recorded by ${currentUser.name} (${shiftConfig.name})`,
      location: finalLocation,
      ipAddress: finalIp,
      checkInMethod,
      verifiedBy: currentUser.id,
      isAnonymized: zeroTrackingMode,
      locationAnonymized: zeroTrackingMode,
      vpnProtected: vpnMasked,
      zeroSignalVerified: zeroTrackingMode,
      privacyMode: zeroTrackingMode ? 'Zero-Tracking' : (vpnMasked ? 'VPN-Masked' : 'Standard'),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {t.manualEntry || (lang === 'km' ? 'ការបញ្ចូលវត្តមានដោយផ្ទាល់' : 'Manual Attendance Entry')}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'km' ? 'កត់ត្រា ឬកែតម្រូវសៀវភៅបញ្ជីវត្តមានបុគ្គលិក' : 'Record or adjust employee attendance ledger'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'km' ? 'ជ្រើសរើសបុគ្គលិក *' : 'Select Employee *'}
            </label>
            <div className="relative">
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                {users.map(u => {
                  const dept = departments.find(d => d.id === u.departmentId);
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.employeeId || 'ID'}) — {dept?.name || 'Dept'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Work Shift Selection (Morning & Evening) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>{t.workShift || (lang === 'km' ? 'វេនការងារ' : 'Work Shift')} *</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {lang === 'km' ? 'កាលវិភាគស្តង់ដារ ២ វេន' : 'Standard 2-Shift Schedule'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleShiftChange('Morning')}
                className={`p-2.5 rounded-lg border text-left transition flex items-start space-x-2.5 ${
                  shiftType === 'Morning'
                    ? 'border-amber-400 bg-amber-50/70 ring-1 ring-amber-400 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-md mt-0.5 ${
                  shiftType === 'Morning' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <span>{t.morningShiftShort || (lang === 'km' ? 'វេនព្រឹក' : 'Morning Shift')}</span>
                  </div>
                  <div className="text-[11px] font-mono text-amber-700 font-medium">
                    08:00 - 16:30
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {lang === 'km' ? 'អនុគ្រោះដល់ 08:15 ព្រឹក' : 'Grace to 08:15 AM'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleShiftChange('Evening')}
                className={`p-2.5 rounded-lg border text-left transition flex items-start space-x-2.5 ${
                  shiftType === 'Evening'
                    ? 'border-indigo-400 bg-indigo-50/70 ring-1 ring-indigo-400 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-md mt-0.5 ${
                  shiftType === 'Evening' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <span>{t.eveningShiftShort || (lang === 'km' ? 'វេនល្ងាច' : 'Evening Shift')}</span>
                  </div>
                  <div className="text-[11px] font-mono text-indigo-700 font-medium">
                    14:00 - 22:00
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {lang === 'km' ? 'អនុគ្រោះដល់ 14:15 រសៀល' : 'Grace to 14:15 PM'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'km' ? 'កាលបរិច្ឆេទ *' : 'Date *'}
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'km' ? 'ស្ថានភាព *' : 'Status *'}
              </label>
              <select
                value={status}
                onChange={e => {
                  const val = e.target.value as AttendanceStatus;
                  setStatus(val);
                  if (val === 'Absent' || val === 'On Leave') {
                    setWorkingHours(0);
                    setOvertimeHours(0);
                  } else if (workingHours === 0) {
                    setWorkingHours(8.0);
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Present">{lang === 'km' ? 'មានវត្តមាន (Present)' : 'Present'}</option>
                <option value="Late">{lang === 'km' ? 'មកយឺត (Late Arrival)' : 'Late Arrival'}</option>
                <option value="Overtime">{lang === 'km' ? 'ម៉ោងបន្ថែម (Overtime Shift)' : 'Overtime Shift'}</option>
                <option value="Half Day">{lang === 'km' ? 'កន្លះថ្ងៃ (Half Day)' : 'Half Day'}</option>
                <option value="On Leave">{lang === 'km' ? 'ច្បាប់សម្រាក (On Leave)' : 'On Leave'}</option>
                <option value="Absent">{lang === 'km' ? 'អវត្តមាន (Unexcused Absent)' : 'Unexcused Absent'}</option>
              </select>
            </div>
          </div>

          {status !== 'Absent' && status !== 'On Leave' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'ម៉ោងចូល' : 'Clock In Time'}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={checkInTime}
                    onChange={e => setCheckInTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'ម៉ោងចេញ' : 'Clock Out Time'}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={checkOutTime}
                    onChange={e => setCheckOutTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'ម៉ោងបំពេញការងារ (ម៉ោង)' : 'Work Hours (Hours)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    value={workingHours}
                    onChange={e => setWorkingHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === 'km' ? 'ម៉ោងបន្ថែម (ថែមម៉ោង)' : 'Overtime Hours (OT)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="12"
                    value={overtimeHours}
                    onChange={e => setOvertimeHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'km' ? 'ទីតាំង' : 'Location'}
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder={lang === 'km' ? 'ការិយាល័យកណ្តាល សាខា ពីចម្ងាយ...' : 'Office HQ, Branch, Remote...'}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'km' ? 'ប្រភពកត់ត្រា' : 'Recording Source'}
              </label>
              <select
                value={checkInMethod}
                onChange={e => setCheckInMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Manual Self-Attestation (Zero-Tracking)">{lang === 'km' ? 'កត់ត្រាវត្តមានដោយដៃ (Zero-Tracking)' : 'Manual Self-Attestation (Zero-Tracking)'}</option>
                <option value="Manual Adjustment">{lang === 'km' ? 'ការកែសម្រួលដោយដៃ (អ្នកគ្រប់គ្រង)' : 'Manual Adjustment (Admin)'}</option>
                <option value="Biometric Sync">{lang === 'km' ? 'ឧបករណ៍ស្កេនមេដៃ (Biometric Sync)' : 'Biometric Device Sync'}</option>
                <option value="QR Code">{lang === 'km' ? 'ម៉ាស៊ីនស្កេន QR សន្តិសុខ' : 'Security Desk QR Scanner'}</option>
                <option value="Web Portal">{lang === 'km' ? 'វិបផតថលបុគ្គលិក' : 'Employee Web Portal'}</option>
              </select>
            </div>
          </div>

          {/* Privacy & Anti-Tracking Shield Controls */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold text-emerald-950">
                  {lang === 'km' ? 'ខែលការពារឯកជនភាព និងការតាមដានទីតាំង' : 'Privacy & Zero-Tracking Protection Shield'}
                </span>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {lang === 'km' ? 'គ្មាន GPS / គ្មាន Wi-Fi Probe' : 'Zero Telemetry'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={zeroTrackingMode}
                  onChange={e => {
                    setZeroTrackingMode(e.target.checked);
                    if (e.target.checked) {
                      setLocation('Anonymized Campus Zone (Zero-Tracking)');
                    }
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span className="text-[11px] text-slate-800">
                  {lang === 'km' ? 'បំប្លែងទីតាំងជាតំបន់អនាមិក' : 'Anonymize Location String'}
                </span>
              </label>

              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={vpnMasked}
                  onChange={e => setVpnMasked(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span className="text-[11px] text-slate-800">
                  {lang === 'km' ? 'បិទបាំង IP តាមរយៈ VPN Subnet' : 'Mask IP via VPN Subnet'}
                </span>
              </label>
            </div>

            <p className="text-[11px] text-emerald-800/90 leading-relaxed">
              {lang === 'km'
                ? 'ប្រព័ន្ធត្រូវបានធានាថាមិនទាមទារសិទ្ធិទីតាំង Geolocation ឬស្កេន Wi-Fi BSSID ឡើយ។'
                : 'Guaranteed: Zero GPS geolocation polling or Wi-Fi beacon probes are transmitted or stored.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'km' ? 'កំណត់ចំណាំ / មូលហេតុនៃការកែតម្រូវ' : 'Notes / Reason for Adjustment'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={lang === 'km' ? 'ឧទាហរណ៍៖ បុគ្គលិកស្នើសុំកត់ត្រាដោយដៃដោយសារប្រជុំនៅការដ្ឋានអតិថិជន...' : 'e.g. Employee requested manual punch due to client site meeting...'}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'រក្សាទុកកំណត់ត្រា' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
