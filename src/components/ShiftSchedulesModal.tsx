import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  Sun, 
  Moon, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Sliders, 
  AlertCircle 
} from 'lucide-react';
import { WorkShiftConfig, Language } from '../types';
import { db } from '../services/db';

interface ShiftSchedulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  lang: Language;
}

export const ShiftSchedulesModal: React.FC<ShiftSchedulesModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  lang,
}) => {
  const [shifts, setShifts] = useState<Record<string, WorkShiftConfig>>(() => db.getWorkShifts());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = (shiftId: string, field: keyof WorkShiftConfig, value: any) => {
    setShifts(prev => {
      const current = prev[shiftId];
      if (!current) return prev;
      return {
        ...prev,
        [shiftId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    Object.keys(shifts).forEach(key => {
      const s = shifts[key];
      // Format hours string
      const hours = `${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)}`;
      db.updateWorkShift(key, {
        ...s,
        hours,
        fullLabel: `${s.name} (${hours})`,
      });
    });

    setSuccessMessage('Shift operational schedules successfully updated and enforced.');
    setTimeout(() => {
      setSuccessMessage(null);
      onSaved();
      onClose();
    }, 900);
  };

  const handleConfirmReset = () => {
    const reset = db.resetWorkShifts();
    setShifts(reset);
    setShowResetConfirm(false);
    setSuccessMessage('Restored standard system shift hours.');
    setTimeout(() => {
      setSuccessMessage(null);
      onSaved();
    }, 900);
  };

  return (
    <div 
      id="shift-schedules-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {lang === 'km' ? 'ការគ្រប់គ្រងវេនការងារស្ថាប័ន' : 'Institutional Work Shift Governance'}
              </h2>
              <p className="text-xs text-slate-300">
                {lang === 'km'
                  ? 'កំណត់រចនាសម្ព័ន្ធម៉ោងប្រតិបត្តិការ រយៈពេលអនុគ្រោះ និងវិធានវេនការងារ'
                  : 'Configure operational hours, punctuality thresholds, and shift rules'}
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

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSaveAll} className="p-6 space-y-6">
          {/* Morning Shift Configuration */}
          {shifts['Morning'] && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-amber-500 text-white shadow-xs">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      {lang === 'km' ? 'វេនព្រឹក (វេនចម្បងពេលថ្ងៃ)' : `${shifts['Morning'].name} (Core Day Shift)`}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'km' ? 'ប្រតិបត្តិការពេលថ្ងៃ ការប្រជុំផែនការ & អភិបាលកិច្ចប្រតិបត្តិ' : 'Daytime operations, planning standups & executive governance'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {lang === 'km' ? 'វេនចម្បង' : 'Primary Shift'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/50">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'km' ? 'ម៉ោងចាប់ផ្តើម (ចូល)' : 'Start Time (Check-In)'}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={shifts['Morning'].startTime}
                    onChange={e => handleUpdate('Morning', 'startTime', e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'km' ? 'ម៉ោងបញ្ចប់ (ចេញ)' : 'End Time (Check-Out)'}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={shifts['Morning'].endTime}
                    onChange={e => handleUpdate('Morning', 'endTime', e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'km' ? 'អនុគ្រោះយឺត (នាទី)' : 'Late Grace (Minutes)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={shifts['Morning'].lateGraceMinute}
                    onChange={e => handleUpdate('Morning', 'lateGraceMinute', Number(e.target.value))}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'km' ? 'ការពិពណ៌នាវេន & គោលបំណង' : 'Shift Description & Focus'}
                </label>
                <input
                  type="text"
                  value={shifts['Morning'].description}
                  onChange={e => handleUpdate('Morning', 'description', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>
          )}

          {/* Evening Shift Configuration */}
          {shifts['Evening'] && (
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      {lang === 'km' ? 'វេនល្ងាច (វេនរសៀល/យប់)' : `${shifts['Evening'].name} (Afternoon/Evening Shift)`}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'km' ? 'ការគាំទ្របច្ចេកទេស ការត្រួតពិនិត្យប្រព័ន្ធ & ការគ្រប់គ្រងទីតាំង' : 'Technical support, system supervision & site coverage'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  {lang === 'km' ? 'វេនបន្ទាប់បន្សំ' : 'Secondary Shift'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-200/50">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'km' ? 'ម៉ោងចាប់ផ្តើម (ចូល)' : 'Start Time (Check-In)'}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={shifts['Evening'].startTime}
                    onChange={e => handleUpdate('Evening', 'startTime', e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'km' ? 'ម៉ោងបញ្ចប់ (ចេញ)' : 'End Time (Check-Out)'}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={shifts['Evening'].endTime}
                    onChange={e => handleUpdate('Evening', 'endTime', e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'km' ? 'អនុគ្រោះយឺត (នាទី)' : 'Late Grace (Minutes)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={shifts['Evening'].lateGraceMinute}
                    onChange={e => handleUpdate('Evening', 'lateGraceMinute', Number(e.target.value))}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'km' ? 'ការពិពណ៌នាវេន & គោលបំណង' : 'Shift Description & Focus'}
                </label>
                <input
                  type="text"
                  value={shifts['Evening'].description}
                  onChange={e => handleUpdate('Evening', 'description', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {showResetConfirm ? (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs"
                >
                  {lang === 'km' ? 'បញ្ជាក់ការកំណត់ឡើងវិញ' : 'Confirm Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition"
                >
                  {lang === 'km' ? 'ទេ' : 'No'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'កំណត់ឡើងវិញដូចដើម' : 'Reset to Defaults'}</span>
              </button>
            )}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl transition"
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{lang === 'km' ? 'រក្សាទុកគោលការណ៍វេន' : 'Save Shift Policies'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
