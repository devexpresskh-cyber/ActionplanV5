import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  Flag, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  CheckSquare
} from 'lucide-react';
import { Activity, User, Language, PriorityLevel, ActivityStatus } from '../types';
import { db } from '../services/db';

interface TaskScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity;
  currentUser: User;
  lang: Language;
  onSuccess?: (msg: string) => void;
}

export const TaskScheduleModal: React.FC<TaskScheduleModalProps> = ({
  isOpen,
  onClose,
  activity,
  currentUser,
  lang,
  onSuccess,
}) => {
  const [dueDate, setDueDate] = useState(activity?.dueDate || '');
  const [priority, setPriority] = useState<PriorityLevel>(activity?.priority || 'Medium');
  const [status, setStatus] = useState<ActivityStatus>(activity?.status || 'Not Started');
  const [progress, setProgress] = useState<number>(activity?.progressPercentage || 0);
  const [reason, setReason] = useState(activity?.lastAdjustmentReason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Update schedule & priority
      db.updateActivityScheduleAndPriority(activity.id, {
        dueDate,
        priority,
        reason: reason.trim(),
      });

      // 2. If status or progress changed
      if (status !== activity.status || progress !== activity.progressPercentage) {
        db.saveActivity({
          ...activity,
          dueDate,
          priority,
          status,
          progressPercentage: progress,
          completionDate: progress === 100 || status === 'Completed' 
            ? (activity.completionDate || new Date().toISOString().split('T')[0]) 
            : undefined,
        });

        db.addProgressUpdate({
          entityType: 'activity',
          entityId: activity.id,
          previousPercentage: activity.progressPercentage,
          newPercentage: progress,
          description: reason.trim() || `Task updated via schedule manager (${status})`,
        });
      }

      const successMsg = lang === 'km'
        ? `បានកែសម្រួលកាលបរិច្ឆេទ និងអាទិភាពកិច្ចការ ${activity.code} ដោយជោគជ័យ!`
        : `Task ${activity.code} schedule and priority updated successfully!`;

      if (onSuccess) {
        onSuccess(successMsg);
      }
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Failed to update task.');
    }
  };

  if (!isOpen || !activity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300 border border-white/15 shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                  {activity.code}
                </span>
                <span className="text-xs text-slate-300">
                  {lang === 'km' ? 'គ្រប់គ្រងកិច្ចការ និងកាលបរិច្ឆេទ' : 'Task Scheduling & Priority'}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5 line-clamp-1">
                {activity.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Due Date and Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'km' ? 'កាលបរិច្ឆេទកំណត់ (Due Date)' : 'Target Due Date'}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'km' ? 'កម្រិតអាទិភាព (Priority)' : 'Priority Level'}
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Status and Progress */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'km' ? 'ស្ថានភាពកិច្ចការ (Status)' : 'Execution Status'}
              </label>
              <select
                value={status}
                onChange={e => {
                  const s = e.target.value as ActivityStatus;
                  setStatus(s);
                  if (s === 'Completed') setProgress(100);
                  if (s === 'Not Started') setProgress(0);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Delayed">Delayed</option>
                <option value="Under Review">Under Review</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 'km' ? 'វឌ្ឍនភាព (% Progress)' : 'Progress Rate'}
                </label>
                <span className="text-xs font-mono font-bold text-blue-600">{progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={e => {
                  const p = Number(e.target.value);
                  setProgress(p);
                  if (p === 100) setStatus('Completed');
                  else if (p > 0 && status === 'Not Started') setStatus('In Progress');
                }}
                className="w-full accent-blue-600 cursor-pointer mt-2"
              />
            </div>
          </div>

          {/* Adjustment Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'km' ? 'មូលហេតុ ឬកំណត់ចំណាំនៃការកែសម្រួល' : 'Adjustment Justification / Notes'}
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={lang === 'km' 
                ? 'ឧ. ប្តូរអាទិភាពដើម្បីដោះស្រាយឧបសគ្គបច្ចេកទេស, ពន្យារពេល ៣ ថ្ងៃដោយសាររង់ចាំឯកសារ...' 
                : 'e.g. Raised priority to unblock team milestones, shifted deadline due to technical requirement clarification...'}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              {lang === 'km' ? 'បោះបង់' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-70"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Adjustments')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
