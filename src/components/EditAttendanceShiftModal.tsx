import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  User as UserIcon, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  Sun, 
  Moon,
  Sparkles,
  Save,
  RotateCcw
} from 'lucide-react';
import { 
  User as UserType, 
  AttendanceRecord, 
  AttendanceStatus, 
  Language, 
  ShiftType,
  WorkShiftConfig
} from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';

interface EditAttendanceShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onSave: (updatedRecord: AttendanceRecord) => void;
  currentUser: UserType;
  lang: Language;
}

export const EditAttendanceShiftModal: React.FC<EditAttendanceShiftModalProps> = ({
  isOpen,
  onClose,
  record,
  onSave,
  currentUser,
  lang,
}) => {
  const t = translations[lang];
  const workShifts = db.getWorkShifts();

  const [date, setDate] = useState('');
  const [shiftType, setShiftType] = useState<ShiftType>('Morning');
  const [checkInTime, setCheckInTime] = useState('08:00:00');
  const [checkOutTime, setCheckOutTime] = useState('16:30:00');
  const [status, setStatus] = useState<AttendanceStatus>('Present');
  const [workingHours, setWorkingHours] = useState<number>(8.0);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [location, setLocation] = useState('Phnom Penh HQ - Main Tower');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (record) {
      setDate(record.date || '2026-09-17');
      const recShift = (record.shiftType || 
        (record.workShift?.toLowerCase().includes('evening') ? 'Evening' : 'Morning')) as ShiftType;
      setShiftType(recShift);
      setCheckInTime(record.checkInTime || '08:00:00');
      setCheckOutTime(record.checkOutTime || '16:30:00');
      setStatus(record.status || 'Present');
      setWorkingHours(record.workingHours ?? 8.0);
      setOvertimeHours(record.overtimeHours ?? 0);
      setLocation(record.location || 'Phnom Penh HQ - Main Tower');
      setNotes(record.notes || '');
    }
  }, [record]);

  if (!isOpen || !record) return null;

  // Recalculate duration whenever check-in or check-out times change
  const handleCalculateHours = (inTime: string, outTime: string) => {
    if (!inTime || !outTime) return;
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    if (!isNaN(inH) && !isNaN(outH)) {
      const inMinutes = inH * 60 + (inM || 0);
      const outMinutes = outH * 60 + (outM || 0);
      const diff = Math.max(0, outMinutes - inMinutes);
      // deduct 1 hr lunch if > 5 hours
      const actualWork = diff > 300 ? diff - 60 : diff;
      const hours = Math.round((actualWork / 60) * 10) / 10;
      setWorkingHours(hours);
      const ot = hours > 8.0 ? Math.round((hours - 8.0) * 10) / 10 : 0;
      setOvertimeHours(ot);
      if (ot > 0 && status === 'Present') {
        setStatus('Overtime');
      }
    }
  };

  const handleShiftSelect = (selectedShift: ShiftType) => {
    setShiftType(selectedShift);
    const cfg = workShifts[selectedShift];
    if (cfg) {
      setCheckInTime(cfg.startTime);
      setCheckOutTime(cfg.endTime);
      handleCalculateHours(cfg.startTime, cfg.endTime);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cfg = workShifts[shiftType] || workShifts['Morning'];

    const updated = db.updateAttendance(record.id, {
      date,
      shiftType,
      workShift: cfg.fullLabel,
      checkInTime: status === 'Absent' || status === 'On Leave' ? null : checkInTime,
      checkOutTime: status === 'Absent' || status === 'On Leave' ? null : checkOutTime,
      status,
      workingHours: status === 'Absent' || status === 'On Leave' ? 0 : Number(workingHours),
      overtimeHours: status === 'Absent' || status === 'On Leave' ? 0 : Number(overtimeHours),
      location,
      notes: notes.trim() || `Shift adjusted to ${cfg.name} (${cfg.hours}) by ${currentUser.name}`,
    });

    if (updated) {
      onSave(updated);
    }
    onClose();
  };

  const currentShiftConfig = workShifts[shiftType] || workShifts['Morning'];

  return (
    <div 
      id="edit-attendance-shift-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {lang === 'km' ? 'កែប្រែវេនការងារ & កំណត់ត្រាវត្តមាន' : 'Edit Shift & Attendance Record'}
              </h2>
              <p className="text-xs text-slate-300">
                {record.userName} ({record.employeeId || 'EMP'}) &bull; {lang === 'km' ? 'កំណត់ត្រា #' : 'Record #'}{record.id.slice(-6)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Shift Selection Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {lang === 'km' ? 'ជ្រើសរើសវេនការងារ' : 'Select Work Shift'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Morning Shift */}
              <button
                type="button"
                onClick={() => handleShiftSelect('Morning')}
                className={`p-3 rounded-xl border text-left transition flex items-start space-x-3 ${
                  shiftType === 'Morning'
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${shiftType === 'Morning' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {lang === 'km' ? 'វេនព្រឹក (Morning Shift)' : (workShifts['Morning']?.name || 'Morning Shift')}
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-amber-700">
                    {workShifts['Morning']?.hours || '08:00 - 16:30'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {lang === 'km' 
                      ? `អនុគ្រោះយឺត៖ ${workShifts['Morning']?.lateGraceMinute || 15} នាទី • ប្រតិបត្តិការពេលថ្ងៃ`
                      : `Grace: ${workShifts['Morning']?.lateGraceMinute || 15}m • Daytime ops`}
                  </div>
                </div>
              </button>

              {/* Evening Shift */}
              <button
                type="button"
                onClick={() => handleShiftSelect('Evening')}
                className={`p-3 rounded-xl border text-left transition flex items-start space-x-3 ${
                  shiftType === 'Evening'
                    ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${shiftType === 'Evening' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {lang === 'km' ? 'វេនល្ងាច (Evening Shift)' : (workShifts['Evening']?.name || 'Evening Shift')}
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-indigo-700">
                    {workShifts['Evening']?.hours || '14:00 - 22:00'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {lang === 'km'
                      ? `អនុគ្រោះយឺត៖ ${workShifts['Evening']?.lateGraceMinute || 15} នាទី • គាំទ្របច្ចេកទេស`
                      : `Grace: ${workShifts['Evening']?.lateGraceMinute || 15}m • Tech coverage`}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'km' ? 'កាលបរិច្ឆេទវត្តមាន' : 'Attendance Date'}
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'km' ? 'ស្ថានភាពវត្តមាន' : 'Attendance Status'}
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as AttendanceStatus)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Present">
                  {lang === 'km' ? 'មានវត្តមាន (ពេញម៉ោង)' : 'Present (Full Shift)'}
                </option>
                <option value="Late">
                  {lang === 'km' ? 'មកយឺត' : 'Late Arrival'}
                </option>
                <option value="Half Day">
                  {lang === 'km' ? 'កន្លះថ្ងៃ (៤ ម៉ោង)' : 'Half Day (4 hrs)'}
                </option>
                <option value="Overtime">
                  {lang === 'km' ? 'ថែមម៉ោង (> ៨ ម៉ោង)' : 'Overtime (> 8 hrs)'}
                </option>
                <option value="On Leave">
                  {lang === 'km' ? 'ច្បាប់ឈប់សម្រាកដែលបានអនុម័ត' : 'On Approved Leave'}
                </option>
                <option value="Absent">
                  {lang === 'km' ? 'អវត្តមាន (គ្មានការអនុញ្ញាត)' : 'Absent (Unexcused)'}
                </option>
              </select>
            </div>
          </div>

          {/* Clock In & Clock Out Times */}
          {status !== 'Absent' && status !== 'On Leave' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>{lang === 'km' ? 'ម៉ោងកត់ត្រាវត្តមាន (HH:mm:ss)' : 'Shift Clock Timings (HH:mm:ss)'}</span>
                <span className="text-[11px] text-blue-600 font-normal">
                  {lang === 'km' ? 'ស្តង់ដារ៖' : 'Standard:'} {currentShiftConfig?.hours}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {lang === 'km' ? 'ម៉ោងចូលធ្វើការ' : 'Clock-In Time'}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={checkInTime}
                    onChange={e => {
                      setCheckInTime(e.target.value);
                      handleCalculateHours(e.target.value, checkOutTime);
                    }}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {lang === 'km' ? 'ម៉ោងចេញពីធ្វើការ' : 'Clock-Out Time'}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={checkOutTime}
                    onChange={e => {
                      setCheckOutTime(e.target.value);
                      handleCalculateHours(checkInTime, e.target.value);
                    }}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {lang === 'km' ? 'ម៉ោងគណនា' : 'Calculated Hours'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    value={workingHours}
                    onChange={e => setWorkingHours(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold text-slate-800 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {lang === 'km' ? 'ម៉ោងបន្ថែម (OT)' : 'Overtime Hours (OT)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="12"
                    value={overtimeHours}
                    onChange={e => setOvertimeHours(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold text-indigo-700 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Location & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'km' ? 'ទីតាំងបំពេញការងារ' : 'Work Location'}
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Phnom Penh HQ - Main Tower"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'km' ? 'មូលហេតុ / កំណត់ចំណាំ' : 'Reason / Notes'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={lang === 'km' ? 'ឧ. បានប្តូរទៅវេនល្ងាចសម្រាប់ការគាំទ្រការដ្ឋាន' : 'e.g. Switched to Evening shift for site support'}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>
                {lang === 'km' 
                  ? 'ការផ្លាស់ប្តូរត្រូវបានកត់ត្រាដោយផ្ទាល់ក្នុងកំណត់ហេតុសវនកម្ម' 
                  : 'Changes log directly to institutional audit trail'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{lang === 'km' ? 'រក្សាទុកការកែប្រែ' : 'Save Shift Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
