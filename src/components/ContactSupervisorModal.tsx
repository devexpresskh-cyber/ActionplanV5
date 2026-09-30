import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  Send, 
  UserCheck, 
  Building2, 
  Mail, 
  Phone, 
  CheckCircle2, 
  HelpCircle,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';
import { User, Language } from '../types';
import { db } from '../services/db';

interface ContactSupervisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  lang: Language;
  onSuccess?: (msg: string) => void;
}

export const ContactSupervisorModal: React.FC<ContactSupervisorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
  onSuccess,
}) => {
  const [requestType, setRequestType] = useState<string>('team_attendance_inquiry');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [recipient, setRecipient] = useState<'supervisor' | 'hr' | 'both'>('supervisor');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const supervisor = db.getSupervisorForUser(currentUser);
  const hrContact = db.getHrContact();
  const userDept = db.getDepartments().find(d => d.id === currentUser.departmentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      // Log assistance action in audit log
      db.logAction(
        currentUser.id,
        currentUser.name,
        'ATTENDANCE_ASSISTANCE_REQUEST',
        'Attendance',
        `Submitted attendance assistance ticket (${requestType}) to ${recipient.toUpperCase()}: "${subject || message.slice(0, 40)}..."`
      );

      // Create notification for supervisor if present
      if (supervisor && (recipient === 'supervisor' || recipient === 'both')) {
        db.addNotification({
          userId: supervisor.id,
          title: `Attendance Request: ${currentUser.name}`,
          message: `${currentUser.name} submitted an attendance inquiry regarding ${requestType}. Reason: ${message.slice(0, 100)}`,
          type: 'approval_request',
        });
      }

      // Create notification for HR if present
      if (hrContact.hrDirector && (recipient === 'hr' || recipient === 'both')) {
        db.addNotification({
          userId: hrContact.hrDirector.id,
          title: `HR Attendance Ticket: ${currentUser.name}`,
          message: `${currentUser.name} (${userDept?.name || 'Department'}) requested attendance assistance: ${message.slice(0, 100)}`,
          type: 'approval_request',
        });
      }

      setIsSubmitting(false);
      setSubmittedSuccess(true);

      const successMsg = lang === 'km'
        ? 'សំណើសុំជំនួយវត្តមានត្រូវបានបញ្ជូនទៅអ្នកគ្រប់គ្រង និងផ្នែកធនធានមនុស្សរួចរាល់ហើយ!'
        : 'Your attendance assistance ticket has been forwarded to your supervisor and HR department!';

      if (onSuccess) {
        onSuccess(successMsg);
      }

      setTimeout(() => {
        setSubmittedSuccess(false);
        setMessage('');
        setSubject('');
        onClose();
      }, 2000);
    }, 500);
  };

  return (
    <div 
      id="contact-supervisor-hr-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {lang === 'km' ? 'ជំនួយការវត្តមាន' : 'Attendance Assistance'}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {lang === 'km' ? 'គោលការណ៍ឯកជនភាព' : 'Privacy Protocol'}
                </span>
              </div>
              <h2 className="text-base font-bold mt-1">
                {lang === 'km' ? 'ទាក់ទងអ្នកគ្រប់គ្រង ឬផ្នែកធនធានមនុស្ស (HR)' : 'Contact Supervisor or HR Department'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Privacy Policy Callout */}
          <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 text-xs">
            <div className="flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">
                  {lang === 'km' ? 'ការការពារឯកជនភាពវត្តមានបុគ្គលិក' : 'Employee Attendance Privacy Protection'}
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {lang === 'km'
                    ? 'បុគ្គលិកអាចចូលមើលបានតែកំណត់ត្រាវត្តមានផ្ទាល់ខ្លួនរបស់ពួកគេប៉ុណ្ណោះ។ ការណ៍នេះធានាភាពឯកជន និងអនុញ្ញាតឱ្យបុគ្គលម្នាក់ៗតាមដានវត្តមានរបស់ខ្លួនដោយគ្មានការរំខាន។ ប្រសិនបើលោកអ្នកត្រូវការពិនិត្យ ឬគ្រប់គ្រងវត្តមានសម្រាប់អ្នកដទៃ សូមទាក់ទងអ្នកគ្រប់គ្រងផ្ទាល់ ឬផ្នែកធនធានមនុស្ស (HR) ដើម្បីទទួលបានជំនួយ។'
                    : 'Employees can only access their own attendance records. This ensures privacy and allows individuals to monitor their attendance without interference. If you need to check or manage attendance for others, please contact your supervisor or HR department for assistance.'}
                </p>
              </div>
            </div>
          </div>

          {submittedSuccess ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'km' ? 'សំណើសុំជំនួយត្រូវបានបញ្ជូនរួចរាល់' : 'Assistance Request Submitted'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                {lang === 'km'
                  ? 'អ្នកគ្រប់គ្រងផ្ទាល់ និងផ្នែកធនធានមនុស្សត្រូវបានជូនដំណឹងរួចរាល់ហើយ។ ពួកគេនឹងឆ្លើយតប និងពិនិត្យមើលវត្តមានតាមសំណើរបស់អ្នក។'
                  : 'Your designated supervisor and HR department have received your attendance inquiry. They will review and coordinate the necessary attendance records on your behalf.'}
              </p>
            </div>
          ) : (
            <>
              {/* Designated Assistance Contacts */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>{lang === 'km' ? 'ទំនាក់ទំនងផ្លូវការសម្រាប់ជំនួយ' : 'Official Assistance Contacts'}</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Supervisor Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                        {lang === 'km' ? 'អ្នកគ្រប់គ្រងផ្ទាល់ (Supervisor)' : 'Designated Supervisor'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs mt-1">
                      {supervisor?.name || 'Vireak Ou (Lead Software Architect)'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {supervisor?.position || 'Team Leader / Supervisor'} • {userDept?.name || 'Department'}
                    </div>
                    <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{supervisor?.email || 'vireak.lead@enterprise.com'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{supervisor?.phone || '+855 89 223 344'}</span>
                      </div>
                    </div>
                  </div>

                  {/* HR Department Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                        {lang === 'km' ? 'ផ្នែកធនធានមនុស្ស (HR)' : 'Human Resources (HR)'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs mt-1">
                      {hrContact.hrDirector?.name || 'Kolab Vong (HR Director)'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {hrContact.departmentName}
                    </div>
                    <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{hrContact.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{hrContact.office}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inquiry Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'km' ? 'ផ្ញើសំណើទៅកាន់' : 'Send Request To'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRecipient('supervisor')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition text-center ${
                        recipient === 'supervisor'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {lang === 'km' ? 'អ្នកគ្រប់គ្រង' : 'Supervisor'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipient('hr')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition text-center ${
                        recipient === 'hr'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {lang === 'km' ? 'ផ្នែក HR' : 'HR Dept'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipient('both')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition text-center ${
                        recipient === 'both'
                          ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {lang === 'km' ? 'ទាំងពីរ (Supervisor & HR)' : 'Both (Coordinated)'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'km' ? 'ប្រភេទជំនួយដែលត្រូវការ' : 'Assistance Category'}
                  </label>
                  <select
                    value={requestType}
                    onChange={e => setRequestType(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="team_attendance_inquiry">
                      {lang === 'km' ? 'ពិនិត្យ/គ្រប់គ្រងវត្តមានសម្រាប់អ្នកដទៃ (សិទ្ធិតាមឋានានុក្រម)' : 'Check or manage attendance for others (Supervisory inquiry)'}
                    </option>
                    <option value="punch_correction">
                      {lang === 'km' ? 'កែតម្រូវម៉ោងចូល/ចេញ ឬវេនការងារ' : 'Clock-in/out time adjustment or shift correction'}
                    </option>
                    <option value="leave_documentation">
                      {lang === 'km' ? 'ឯកសារច្បាប់ឈប់សម្រាក និងការបញ្ជាក់វត្តមានផ្លូវការ' : 'Leave documentation & official attendance verification'}
                    </option>
                    <option value="privacy_inquiry">
                      {lang === 'km' ? 'សំណួរទាក់ទងនឹងគោលការណ៍ឯកជនភាព និងកំណត់ត្រា' : 'Privacy policy & record handling inquiry'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'km' ? 'ចំណងជើងសង្ខេប' : 'Subject Summary'}
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder={lang === 'km' ? 'ឧ. ស្នើសុំពិនិត្យវត្តមានក្រុមការងារ ឬកែម៉ោងចូល...' : 'e.g. Inquire on team member attendance or punch correction...'}
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'km' ? 'ព័ត៌មានលម្អិតនៃសំណើ' : 'Details / Specific Request'}
                    <span className="text-rose-500 ml-0.5">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={lang === 'km' ? 'សូមបញ្ជាក់ឈ្មោះបុគ្គលិក កាលបរិច្ឆេទ ឬមូលហេតុដែលលោកអ្នកត្រូវការជំនួយ...' : 'Please specify the colleague name, date, or reason you need supervisor/HR assistance...'}
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  >
                    {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? (lang === 'km' ? 'កំពុងបញ្ជូន...' : 'Sending...') : (lang === 'km' ? 'បញ្ជូនសំណើ' : 'Submit Assistance Ticket')}</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
