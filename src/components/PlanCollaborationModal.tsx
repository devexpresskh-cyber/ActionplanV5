import React, { useState } from 'react';
import { 
  X, 
  Users, 
  MessageSquare, 
  Send, 
  Calendar, 
  Flag, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  HelpCircle,
  TrendingUp,
  Target
} from 'lucide-react';
import { ActionPlan, User, Language, PriorityLevel, PlanCollaborationReview } from '../types';
import { db } from '../services/db';

interface PlanCollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ActionPlan;
  currentUser: User;
  lang: Language;
  onSuccess?: (msg: string) => void;
}

export const PlanCollaborationModal: React.FC<PlanCollaborationModalProps> = ({
  isOpen,
  onClose,
  plan,
  currentUser,
  lang,
  onSuccess,
}) => {
  const users = db.getUsers();
  const departments = db.getDepartments();
  const planDept = departments.find(d => d.id === plan?.departmentId);

  // Find user's supervisor / department manager
  const userDept = departments.find(d => d.id === currentUser?.departmentId);
  const supervisor = users.find(u => 
    u.departmentId === (userDept?.id || plan?.departmentId) && 
    (u.role === 'Department Manager' || u.role === 'Team Leader') &&
    u.id !== currentUser?.id
  ) || users.find(u => u.role === 'Department Manager' && u.id !== currentUser?.id) || users[0];

  const [selectedReviewerId, setSelectedReviewerId] = useState<string>(supervisor ? supervisor.id : (users[0]?.id || ''));
  const [reviewType, setReviewType] = useState<'Supervisor Feedback' | 'Team Support' | 'Regular Goal Alignment' | 'Deadline Adjustment'>('Supervisor Feedback');
  const [notes, setNotes] = useState('');
  const [includeAdjustment, setIncludeAdjustment] = useState(false);
  const [proposedDueDate, setProposedDueDate] = useState(plan?.dueDate || '');
  const [proposedPriority, setProposedPriority] = useState<PriorityLevel>(plan?.priority || 'Medium');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const quickPrompts = [
    lang === 'km' 
      ? 'សូមផ្តល់យោបល់កែលម្អលើចំណុចដៅនៃផែនការនេះ និងការបែងចែកកិច្ចការ។'
      : 'Please review milestones and provide guidance on execution priorities.',
    lang === 'km'
      ? 'ត្រូវការជំនួយគាំទ្របន្ថែមលើធនធាន និងការដោះស្រាយភាពជាប់គាំង។'
      : 'Requesting team support to clear cross-department dependencies.',
    lang === 'km'
      ? 'ស្នើសុំការពិនិត្យសម្របសម្រួលកាលបរិច្ឆេទដើម្បីធានាគុណភាពការងារ។'
      : 'Proposing a schedule adjustment to ensure thorough deliverable quality.',
    lang === 'km'
      ? 'ការត្រួតពិនិត្យទៀងទាត់៖ ផែនការកំពុងដំណើរការស្របតាមគោលបំណងស្ថាប័ន។'
      : 'Regular alignment review: verifying objectives align with company goals.'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setErrorMsg(lang === 'km' ? 'សូមបញ្ចូលខ្លឹមសារសំណើ ឬសំណួររបស់អ្នក។' : 'Please provide notes or questions for your review request.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      db.addPlanCollaborationReview(plan.id, {
        reviewerId: selectedReviewerId,
        reviewType,
        notes: notes.trim(),
        adjustmentProposed: includeAdjustment ? {
          newDueDate: proposedDueDate,
          newPriority: proposedPriority,
          reason: adjustmentReason || notes.slice(0, 100),
        } : undefined,
      });

      const reviewer = users.find(u => u.id === selectedReviewerId);
      const successText = lang === 'km'
        ? `បានផ្ញើសំណើសហការ និងមតិកែលម្អទៅ ${reviewer?.name || 'សហការី'} ដោយជោគជ័យ!`
        : `Shared plan and sent review request to ${reviewer?.name || 'colleague'} successfully!`;

      if (onSuccess) {
        onSuccess(successText);
      }
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Failed to submit collaboration request.');
    }
  };

  if (!isOpen || !plan) return null;

  const existingReviews: PlanCollaborationReview[] = plan.collaborationReviews || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300 border border-white/15 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                  {plan.planNumber}
                </span>
                <span className="text-xs text-slate-300">
                  {lang === 'km' ? 'កិច្ចសហការ និងការផ្តល់មតិ' : 'Collaboration & Feedback'}
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

        {/* Plan Highlights Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                {lang === 'km' ? 'វឌ្ឍនភាព' : 'Progress'}
              </span>
              <span className="font-bold text-slate-800">{plan.completionPercentage}%</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                {lang === 'km' ? 'កាលបរិច្ឆេទកំណត់' : 'Due Date'}
              </span>
              <span className="font-bold text-slate-800">{plan.dueDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                {lang === 'km' ? 'អាទិភាព' : 'Priority'}
              </span>
              <span className={`inline-flex items-center font-bold px-2 py-0.2 rounded-full text-[10px] ${
                plan.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                plan.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {plan.priority}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            <span>{planDept?.name || 'Department'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <span className="font-bold">Notice:</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Review Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'km' ? 'គោលបំណងនៃកិច្ចសហការ' : 'Collaboration Goal'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Supervisor Feedback', label: lang === 'km' ? 'មតិអ្នកគ្រប់គ្រង' : 'Supervisor Feedback', icon: ShieldCheck },
                { id: 'Team Support', label: lang === 'km' ? 'ជំនួយពីក្រុមការងារ' : 'Team Support', icon: Users },
                { id: 'Regular Goal Alignment', label: lang === 'km' ? 'ពិនិត្យគោលដៅ' : 'Goal Alignment', icon: Target },
                { id: 'Deadline Adjustment', label: lang === 'km' ? 'កែសម្រួលកាលបរិច្ឆេទ' : 'Deadline Shift', icon: Calendar },
              ].map(item => {
                const Icon = item.icon;
                const isSelected = reviewType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setReviewType(item.id as any);
                      if (item.id === 'Deadline Adjustment') setIncludeAdjustment(true);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col items-start gap-1.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select Reviewer / Collaborator */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'km' ? 'ជ្រើសរើសអ្នកត្រួតពិនិត្យ ឬសហការី' : 'Select Reviewer or Collaborator'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedReviewerId}
                onChange={e => setSelectedReviewerId(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role} ({departments.find(d => d.id === u.departmentId)?.name || 'General'})
                  </option>
                ))}
              </select>

              {supervisor && (
                <button
                  type="button"
                  onClick={() => setSelectedReviewerId(supervisor.id)}
                  className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center space-x-1.5 transition ${
                    selectedReviewerId === supervisor.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'អ្នកគ្រប់គ្រងផ្ទាល់' : 'My Supervisor'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Collaboration Notes / Questions */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                {lang === 'km' ? 'ខ្លឹមសារសំណើ ឬការពិភាក្សា' : 'Review Request Notes & Discussion'}
              </label>
              <span className="text-[10px] text-slate-400">{notes.length}/500</span>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={lang === 'km' 
                ? 'បញ្ជាក់ចំណុចដែលអ្នកត្រូវការជំនួយ មតិកែលម្អ ឬការសម្របសម្រួលគោលដៅ...' 
                : 'Describe what guidance, feedback, or support you need from your supervisor or team...'}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              maxLength={500}
            />

            {/* Quick Suggestions */}
            <div className="mt-2">
              <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                {lang === 'km' ? 'គំរូរហ័ស៖' : 'Quick templates:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNotes(prompt)}
                    className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2 py-1 rounded-md transition text-left"
                  >
                    "{prompt.slice(0, 42)}..."
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Schedule / Priority Adjustment Section */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeAdjustment"
                  checked={includeAdjustment}
                  onChange={e => setIncludeAdjustment(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeAdjustment" className="text-xs font-bold text-slate-800 cursor-pointer">
                  {lang === 'km' ? 'ស្នើសុំការកែសម្រួលកាលបរិច្ឆេទ ឬអាទិភាព' : 'Propose Deadline or Priority Adjustment'}
                </label>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                {lang === 'km' ? 'ស្របតាមគោលការណ៍ទទួលខុសត្រូវ' : 'Accountability & Alignment'}
              </span>
            </div>

            {includeAdjustment && (
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'km' ? 'កាលបរិច្ឆេទថ្មីស្នើឡើង' : 'Proposed New Due Date'}
                  </label>
                  <input
                    type="date"
                    value={proposedDueDate}
                    onChange={e => setProposedDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'km' ? 'កម្រិតអាទិភាពថ្មី' : 'Proposed Priority'}
                  </label>
                  <select
                    value={proposedPriority}
                    onChange={e => setProposedPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'km' ? 'មូលហេតុនៃការកែសម្រួល' : 'Justification for Adjustment'}
                  </label>
                  <input
                    type="text"
                    value={adjustmentReason}
                    onChange={e => setAdjustmentReason(e.target.value)}
                    placeholder={lang === 'km' ? 'មូលហេតុ (ឧ. ការពន្យារពេលផ្នែកផ្គត់ផ្គង់, ការបន្ថែមវិសាលភាព...)' : 'Reason (e.g. scope clarification, vendor dependency, quality assurance...)'}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Previous Collaboration History */}
          {existingReviews.length > 0 && (
            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'km' ? 'ប្រវត្តិនៃការពិភាក្សា និងមតិកែលម្អ' : 'Past Review Discussions'} ({existingReviews.length})</span>
              </h4>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {existingReviews.map(rev => {
                  const reqUser = users.find(u => u.id === rev.requestedById);
                  const revUser = users.find(u => u.id === rev.reviewerId);
                  return (
                    <div key={rev.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700">
                          {reqUser?.name} ➔ {revUser?.name}
                        </span>
                        <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] italic">"{rev.notes}"</p>
                      {rev.feedback && (
                        <div className="mt-1.5 p-1.5 rounded bg-blue-50 text-blue-800 text-[11px]">
                          <span className="font-semibold">{revUser?.name}: </span>
                          <span>{rev.feedback}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
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
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? (lang === 'km' ? 'កំពុងផ្ញើ...' : 'Sending...') : (lang === 'km' ? 'ចែករំលែក & ស្នើសុំមតិ' : 'Share & Request Feedback')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
