import React, { useState } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  FileText, 
  CheckSquare, 
  Sun, 
  Moon,
  Sparkles
} from 'lucide-react';
import { User, Language, Activity } from '../types';
import { db } from '../services/db';

interface QuickRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  lang: Language;
  onSuccess: (msg: string) => void;
  initialType?: 'task_update' | 'shift_adjust' | 'leave_request';
}

export const QuickRequestModal: React.FC<QuickRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
  onSuccess,
  initialType = 'task_update',
}) => {
  const [requestType, setRequestType] = useState<'task_update' | 'shift_adjust' | 'leave_request'>(initialType);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [progressValue, setProgressValue] = useState<number>(50);
  const [notes, setNotes] = useState<string>('');
  const [shiftType, setShiftType] = useState<'Morning' | 'Evening'>('Morning');
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [leaveDuration, setLeaveDuration] = useState<'Full Day' | 'Morning (08:00 - 12:00)' | 'Evening (13:00 - 17:00)'>('Full Day');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activities = db.getActivities().filter(a => a.assignedEmployeeId === currentUser.id || a.teamLeaderId === currentUser.id);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      if (requestType === 'task_update' && selectedActivityId) {
        const act = activities.find(a => a.id === selectedActivityId);
        if (act) {
          db.updateActivityProgress(act.id, progressValue, notes || `Quick progress updated to ${progressValue}%`);
          onSuccess(`Updated task "${act.title}" to ${progressValue}% successfully.`);
        }
      } else if (requestType === 'shift_adjust') {
        db.logAction(
          currentUser.id,
          currentUser.name,
          'SHIFT_ADJUSTMENT_REQUEST',
          'Attendance',
          `Requested adjustment for ${shiftType} shift on ${targetDate}. Reason: ${notes}`
        );
        onSuccess(`Shift adjustment request for ${targetDate} submitted to your department manager.`);
      } else {
        db.logAction(
          currentUser.id,
          currentUser.name,
          'LEAVE_REQUEST',
          'HR / Leave',
          `Leave request: ${leaveDuration} on ${targetDate}. Reason: ${notes}`
        );
        onSuccess(`Leave request for ${targetDate} (${leaveDuration}) sent for approval.`);
      }

      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Quick Employee Action</h3>
              <p className="text-xs text-slate-500">Streamlined 1-step request with instant manager routing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Type Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-3 bg-slate-100/70 border-b border-slate-200/60">
          <button
            type="button"
            onClick={() => setRequestType('task_update')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition ${
              requestType === 'task_update'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="truncate">Task Update</span>
          </button>
          <button
            type="button"
            onClick={() => setRequestType('shift_adjust')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition ${
              requestType === 'shift_adjust'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="truncate">Shift Correction</span>
          </button>
          <button
            type="button"
            onClick={() => setRequestType('leave_request')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition ${
              requestType === 'leave_request'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="truncate">Leave / Time-off</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {requestType === 'task_update' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Task / Activity
                </label>
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No assigned tasks found. You can still submit notes.</p>
                ) : (
                  <select
                    required
                    value={selectedActivityId}
                    onChange={e => {
                      setSelectedActivityId(e.target.value);
                      const act = activities.find(a => a.id === e.target.value);
                      if (act) setProgressValue(act.progressPercentage);
                    }}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Choose Assigned Activity --</option>
                    {activities.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.code}: {a.title} ({a.progressPercentage}%)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">New Progress Level</label>
                  <span className="text-xs font-extrabold text-blue-600">{progressValue}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressValue}
                  onChange={e => setProgressValue(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100% Done</span>
                </div>
              </div>
            </div>
          )}

          {requestType === 'shift_adjust' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift</label>
                  <select
                    value={shiftType}
                    onChange={e => setShiftType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Morning">Morning (08:00 - 12:00)</option>
                    <option value="Evening">Evening (13:00 - 17:00)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-800 space-y-1">
                <span className="font-bold">Automated Grace Period Verification</span>
                <p className="text-[11px] leading-relaxed">
                  Morning grace cut-off is 08:15; Evening grace cut-off is 13:15. Adjustments are logged with institutional audit trails.
                </p>
              </div>
            </div>
          )}

          {requestType === 'leave_request' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot</label>
                  <select
                    value={leaveDuration}
                    onChange={e => setLeaveDuration(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Full Day">Full Working Day</option>
                    <option value="Morning (08:00 - 12:00)">Morning Half-Day (08:00 - 12:00)</option>
                    <option value="Evening (13:00 - 17:00)">Evening Half-Day (13:00 - 17:00)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Remarks / Comments (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Provide a quick note, milestone reached, or reason..."
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || (requestType === 'task_update' && !selectedActivityId && activities.length > 0)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
