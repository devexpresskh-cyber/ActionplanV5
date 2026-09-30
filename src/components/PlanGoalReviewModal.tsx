import React, { useState } from 'react';
import { 
  X, 
  Target, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  Flag, 
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCw
} from 'lucide-react';
import { ActionPlan, User, Language, PriorityLevel, Objective } from '../types';
import { db } from '../services/db';

interface PlanGoalReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ActionPlan;
  currentUser: User;
  lang: Language;
  onSuccess?: (msg: string) => void;
}

export const PlanGoalReviewModal: React.FC<PlanGoalReviewModalProps> = ({
  isOpen,
  onClose,
  plan,
  currentUser,
  lang,
  onSuccess,
}) => {
  const objectives = db.getObjectives();
  const parentObjective = objectives.find(o => o.id === plan?.objectiveId);

  const [alignmentStatus, setAlignmentStatus] = useState<'Fully Aligned' | 'Review Needed' | 'Shifted Priority'>(
    plan?.alignmentStatus || 'Fully Aligned'
  );
  const [reviewCycle, setReviewCycle] = useState<'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Quarterly'>(
    plan?.reviewCycle || 'Bi-Weekly'
  );
  const [nextReviewDate, setNextReviewDate] = useState<string>(
    plan?.nextReviewDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [reviewNotes, setReviewNotes] = useState('');
  const [newDueDate, setNewDueDate] = useState(plan?.dueDate || '');
  const [newPriority, setNewPriority] = useState<PriorityLevel>(plan?.priority || 'Medium');
  const [adjustSchedule, setAdjustSchedule] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNotes.trim()) {
      setErrorMsg(lang === 'km' ? 'សូមបញ្ចូលកំណត់សម្គាល់ការត្រួតពិនិត្យ និងការតម្រឹមគោលដៅ។' : 'Please provide review notes on goal alignment and progress.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Record periodic review
      db.recordPlanReview(plan.id, {
        reviewNotes: reviewNotes.trim(),
        alignmentStatus,
        nextReviewDate,
        reviewCycle,
      });

      // 2. If schedule adjusted, update it
      if (adjustSchedule && (newDueDate !== plan.dueDate || newPriority !== plan.priority)) {
        db.updatePlanScheduleAndPriority(plan.id, {
          dueDate: newDueDate,
          priority: newPriority,
          reason: `Adjusted during periodic alignment review: "${reviewNotes.slice(0, 80)}"`,
        });
      }

      const successMsg = lang === 'km'
        ? `បានកត់ត្រាការត្រួតពិនិត្យគោលដៅទៀងទាត់សម្រាប់ផែនការ ${plan.planNumber} ដោយជោគជ័យ!`
        : `Periodic goal alignment review logged successfully for ${plan.planNumber}!`;

      if (onSuccess) {
        onSuccess(successMsg);
      }
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Failed to record review.');
    }
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300 border border-white/15 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                  {plan.planNumber}
                </span>
                <span className="text-xs text-slate-300">
                  {lang === 'km' ? 'ការត្រួតពិនិត្យ & តម្រឹមគោលដៅស្ថាប័ន' : 'Goal Alignment & Regular Review'}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5 line-clamp-1">
                {plan.title}
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

        {/* Parent Objective Card */}
        <div className="bg-blue-50/70 border-b border-blue-100 p-4">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-blue-900 block">
                {lang === 'km' ? 'គោលបំណងយុទ្ធសាស្ត្រស្ថាប័នមេ៖' : 'Parent Institutional Objective:'}
              </span>
              <p className="text-blue-800 font-medium leading-relaxed">
                {parentObjective?.title || (lang === 'km' ? 'យុទ្ធសាស្ត្រប្រតិបត្តិការទូទៅរបស់ស្ថាប័ន' : 'General Operational Strategy')}
              </p>
              {parentObjective?.kpi && (
                <div className="text-[11px] text-blue-700 pt-0.5">
                  <span className="font-semibold">KPI: </span>
                  <span>{parentObjective.kpi} ({parentObjective.targetValue} {parentObjective.targetUnit || parentObjective.measurementUnit || '%'})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <span className="font-bold">Error:</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Alignment Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'km' ? 'ស្ថានភាពនៃការតម្រឹមគោលដៅ' : 'Current Alignment Assessment'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Fully Aligned', label: lang === 'km' ? 'ស្របតាមគោលដៅ' : 'Fully Aligned', color: 'text-emerald-700 border-emerald-300 bg-emerald-50' },
                { id: 'Review Needed', label: lang === 'km' ? 'ត្រូវការកែលម្អ' : 'Review Needed', color: 'text-amber-700 border-amber-300 bg-amber-50' },
                { id: 'Shifted Priority', label: lang === 'km' ? 'ប្តូរអាទិភាព' : 'Shifted Priority', color: 'text-rose-700 border-rose-300 bg-rose-50' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAlignmentStatus(item.id as any)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition ${
                    alignmentStatus === item.id 
                      ? `${item.color} ring-2 ring-blue-500 font-bold shadow-xs` 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Review Frequency & Next Review Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'km' ? 'វដ្តនៃការត្រួតពិនិត្យទៀងទាត់' : 'Regular Review Cadence'}
              </label>
              <select
                value={reviewCycle}
                onChange={e => setReviewCycle(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Weekly">{lang === 'km' ? 'ប្រចាំសប្តាហ៍ (Weekly)' : 'Weekly'}</option>
                <option value="Bi-Weekly">{lang === 'km' ? 'រៀងរាល់ ២ សប្តាហ៍ (Bi-Weekly)' : 'Bi-Weekly'}</option>
                <option value="Monthly">{lang === 'km' ? 'ប្រចាំខែ (Monthly)' : 'Monthly'}</option>
                <option value="Quarterly">{lang === 'km' ? 'ប្រចាំត្រីមាស (Quarterly)' : 'Quarterly'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'km' ? 'កាលបរិច្ឆេទត្រួតពិនិត្យលើកក្រោយ' : 'Next Checkpoint Date'}
              </label>
              <input
                type="date"
                value={nextReviewDate}
                onChange={e => setNextReviewDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Review Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'km' ? 'កំណត់សម្គាល់ការត្រួតពិនិត្យ & វឌ្ឍនភាព' : 'Review Observations & Progress Highlights'}
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              placeholder={lang === 'km'
                ? 'បញ្ជាក់ពីវឌ្ឍនភាពសម្រេចបាន ការលុបបំបាត់ឧបសគ្គ និងការប្តេជ្ញាលើលទ្ធផលចុងក្រោយ...'
                : 'Document key milestones reached, alignment with quarterly objectives, and actions taken to stay on schedule...'}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Deadline & Priority Adjustment Toggle */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="adjustScheduleReview"
                  checked={adjustSchedule}
                  onChange={e => setAdjustSchedule(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="adjustScheduleReview" className="text-xs font-bold text-slate-800 cursor-pointer">
                  {lang === 'km' ? 'ធ្វើការកែសម្រួលកាលបរិច្ឆេទ ឬអាទិភាពក្នុងវគ្គត្រួតពិនិត្យនេះ' : 'Adjust Deadline / Priority during this Review'}
                </label>
              </div>
            </div>

            {adjustSchedule && (
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'km' ? 'កាលបរិច្ឆេទកំណត់ថ្មី' : 'Adjusted Due Date'}
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'km' ? 'អាទិភាពថ្មី' : 'Adjusted Priority'}
                  </label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
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
              <span>{isSubmitting ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'កត់ត្រាការត្រួតពិនិត្យ' : 'Log Alignment Review')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
