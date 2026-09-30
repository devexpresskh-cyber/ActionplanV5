import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Send, ShieldCheck, History } from 'lucide-react';
import { ActionPlan, Language, User, ApprovalActionType } from '../types';
import { translations } from '../services/i18n';
import { db } from '../services/db';

interface ApprovalModalProps {
  plan: ActionPlan;
  currentUser: User;
  lang: Language;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  plan,
  currentUser,
  lang,
  onClose,
  onSuccess,
}) => {
  const t = translations[lang];
  const [selectedAction, setSelectedAction] = useState<ApprovalActionType>('Approve');
  const [comments, setComments] = useState<string>('');
  const [error, setError] = useState<string>('');

  const approvals = db.getApprovals(plan.id);
  const users = db.getUsers();

  const handleExecute = (actionType: ApprovalActionType) => {
    setSelectedAction(actionType);
    if ((actionType === 'Reject' || actionType === 'Request Revision') && !comments.trim()) {
      setError(t.rejectionReason);
      return;
    }

    try {
      db.handleApprovalAction(plan.id, actionType, comments);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || (lang === 'km' ? 'សកម្មភាពអនុម័តបានបរាជ័យ។' : 'Approval action failed.'));
    }
  };

  // Determine allowed actions based on current status and user role
  const isManagerOrAdmin = ['Super Admin', 'Administrator', 'Department Manager'].includes(currentUser.role);
  const isOwnerOrCreator = plan.ownerId === currentUser.id || plan.createdById === currentUser.id;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t.approvalWorkflow}
              </h3>
              <p className="text-xs text-slate-500">
                {plan.planNumber}: {plan.title}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Current State Summary */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">
                {lang === 'km' ? 'ស្ថានភាពវដ្តជីវិត៖' : 'Lifecycle Status:'}
              </span>
              <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800">
                {plan.status === 'Draft' ? t.draft : plan.status === 'Submitted' ? t.submitted : plan.status === 'Approved' ? t.approved : plan.status === 'In Progress' ? t.inProgress : plan.status === 'Completed' ? t.completed : plan.status === 'Rejected' ? t.rejected : plan.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">
                {lang === 'km' ? 'ស្ថានភាពអនុម័ត៖' : 'Approval State:'}
              </span>
              <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                {plan.approvalStatus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">
                {lang === 'km' ? 'វឌ្ឍនភាពសម្រេច៖' : 'Completion Progress:'}
              </span>
              <span className="font-mono font-bold text-slate-800">{plan.completionPercentage}%</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Decision Form */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              {t.approvalComments}
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={e => {
                setComments(e.target.value);
                if (error) setError('');
              }}
              placeholder={lang === 'km' ? 'ផ្តល់មតិយោបល់ ការឆ្លើយតប ឬហេតុផលសម្រាប់ការសម្រេចចិត្តអនុម័តនេះ...' : 'Provide comments, feedback, or justification for this approval decision...'}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            {(selectedAction === 'Reject' || selectedAction === 'Request Revision') && (
              <p className="text-[11px] text-rose-600 font-medium">
                {lang === 'km'
                  ? '* តម្រូវឱ្យមានមូលហេតុបដិសេធ ឬស្នើសុំកែប្រែច្បាស់លាស់ ស្របតាមអនុលោមភាពសវនកម្មសហគ្រាស។'
                  : '* A clear rejection or revision reason is required by enterprise audit compliance.'}
              </p>
            )}
          </div>

          {/* Action Trigger Buttons */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-slate-700 mb-2">
              {lang === 'km' ? 'សកម្មភាពដែលអាចធ្វើបាន៖' : 'Available Actions:'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* If Draft, allow Submit for Approval */}
              {(plan.status === 'Draft' || plan.approvalStatus === 'Revision Requested') && (
                <button
                  type="button"
                  onClick={() => handleExecute('Submit for Approval')}
                  className="flex items-center justify-center space-x-1.5 p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'ដាក់ស្នើសម្រាប់ការត្រួតពិនិត្យ' : 'Submit for Review'}</span>
                </button>
              )}

              {/* If In Review or Submitted, allow Manager/Admin to Approve / Reject / Request Revision */}
              {(plan.status === 'Submitted' || plan.status === 'In Review' || plan.approvalStatus === 'Pending Review') && isManagerOrAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => handleExecute('Approve')}
                    className="flex items-center justify-center space-x-1.5 p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'អនុម័តផែនការ' : `${t.approve} Plan`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecute('Reject')}
                    className="flex items-center justify-center space-x-1.5 p-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'បដិសេធផែនការ' : `${t.reject} Plan`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecute('Request Revision')}
                    className="flex items-center justify-center space-x-1.5 p-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{t.requestRevision}</span>
                  </button>
                </>
              )}

              {/* If In Progress and 100%, allow Submit for Completion */}
              {plan.status === 'In Progress' && (
                <button
                  type="button"
                  onClick={() => handleExecute('Submit for Completion')}
                  className="flex items-center justify-center space-x-1.5 p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'ដាក់ស្នើសម្រាប់ការបញ្ចប់' : 'Submit for Completion'}</span>
                </button>
              )}

              {/* If Pending Completion, allow Final Approve Completion */}
              {plan.status === 'Submitted for Completion' && isManagerOrAdmin && (
                <button
                  type="button"
                  onClick={() => handleExecute('Final Approve Completion')}
                  className="col-span-full flex items-center justify-center space-x-1.5 p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'ការចុះហត្ថលេខាចុងក្រោយ៖ បញ្ចប់ផែនការ' : 'Final Sign-off: Complete Plan'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Audit History Trail */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center space-x-1.5 mb-3 text-xs font-bold text-slate-800">
              <History className="w-4 h-4 text-slate-500" />
              <span>{t.approvalHistory} ({approvals.length})</span>
            </div>

            {approvals.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                {lang === 'km' ? 'មិនទាន់មានការពិនិត្យអនុម័តជាផ្លូវការត្រូវបានកត់ត្រានៅឡើយទេ។' : 'No formal approval reviews logged yet.'}
              </p>
            ) : (
              <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                {approvals.map(appr => {
                  const reviewer = users.find(u => u.id === appr.reviewerId);
                  return (
                    <div key={appr.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
                        <span className="font-semibold text-slate-800">
                          {reviewer?.name || (lang === 'km' ? 'អ្នកត្រួតពិនិត្យ' : 'Reviewer')} ({appr.reviewerRole})
                        </span>
                        <span>{new Date(appr.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          appr.decision === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          appr.decision === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {appr.action}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {lang === 'km' ? `ដំណាក់កាល៖ ${appr.stage}` : `Stage: ${appr.stage}`}
                        </span>
                      </div>
                      <p className="text-slate-700 italic">"{appr.comments}"</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
          >
            {lang === 'km' ? 'បិទ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
