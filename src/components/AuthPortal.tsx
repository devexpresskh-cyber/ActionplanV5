import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  User as UserIcon, 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Globe, 
  Phone, 
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Info,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { User, Language, UserRole } from '../types';
import { db } from '../services/db';
import { translations } from '../services/i18n';

interface AuthPortalProps {
  onLoginSuccess: (user: User) => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  onLoginSuccess,
  lang,
  onLanguageChange,
}) => {
  const t = translations[lang];
  // Strictly two tabs: Sign In and Register. Quick 1-click role login removed.
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  
  // Sign In State - Users enter credentials manually
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [signInError, setSignInError] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regDeptId, setRegDeptId] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Employee');
  const [regPosition, setRegPosition] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Collapsible Corporate Credentials Reference (No 1-click login; manual typing guide)
  const [showCredentialsGuide, setShowCredentialsGuide] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const departments = db.getDepartments();

  // Corporate demo accounts reference list
  const corporateAccounts = [
    {
      role: 'Super Admin' as UserRole,
      title: 'Chief Information Officer (CIO)',
      email: 'sokha.superadmin@enterprise.com',
      badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
    },
    {
      role: 'Administrator' as UserRole,
      title: 'VP of Corporate Governance',
      email: 'chan.admin@enterprise.com',
      badgeColor: 'bg-blue-950/80 text-blue-300 border-blue-700/60',
    },
    {
      role: 'Department Manager' as UserRole,
      title: 'Director of IT & Infrastructure',
      email: 'sophal.manager@enterprise.com',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
    },
    {
      role: 'Team Leader' as UserRole,
      title: 'Lead Software Architect',
      email: 'kosal.leader@enterprise.com',
      badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
    },
    {
      role: 'Employee' as UserRole,
      title: 'Cloud & Database Administrator',
      email: 'sreymom.employee@enterprise.com',
      badgeColor: 'bg-slate-900 text-slate-300 border-slate-700',
    },
    {
      role: 'Executive / Viewer' as UserRole,
      title: 'Chief Executive Officer (CEO)',
      email: 'bunthoeun.executive@enterprise.com',
      badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60',
    },
  ];

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');

    if (!signInEmail.trim()) {
      setSignInError(lang === 'km' ? 'សូមបញ្ចូលអ៊ីមែលសាជីវកម្មរបស់អ្នក' : 'Please enter your corporate email address.');
      return;
    }
    if (!signInPassword) {
      setSignInError(lang === 'km' ? 'សូមបញ្ចូលពាក្យសម្ងាត់របស់អ្នក' : 'Please enter your account password.');
      return;
    }

    setSignInLoading(true);

    setTimeout(() => {
      const result = db.login(signInEmail, signInPassword);
      setSignInLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setSignInError(result.error || t.invalidCredentials);
      }
    }, 350);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setRegError(lang === 'km' ? 'សូមបំពេញរាល់ព័ត៌មានដែលត្រូវការ (*) ទាំងអស់' : 'Please complete all required fields (*).');
      return;
    }
    if (regPassword.length < 6) {
      setRegError(lang === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ' : 'Password must contain at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError(t.passwordsDoNotMatch);
      return;
    }

    setRegLoading(true);
    setTimeout(() => {
      const result = db.register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        departmentId: regDeptId || (departments[0]?.id ?? 'dept-1'),
        role: regRole,
        position: regPosition.trim() || 'Enterprise Staff',
        phone: regPhone.trim(),
      });
      setRegLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setRegError(result.error || 'Failed to create account.');
      }
    }, 400);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    const res = db.resetPassword(forgotEmail);
    setForgotSuccess(res.success);
    setForgotMessage(res.message);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white ${lang === 'km' ? 'font-khmer' : ''}`}>
      {/* Top Floating Header with Safe Padding & Accessible Controls */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0 border border-blue-400/20">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="truncate">{t.systemTitle}</span>
              <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold shrink-0 hidden xs:inline-block">
                APMS
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              {lang === 'km' ? 'វិបផតថលគ្រប់គ្រងផែនការ និងវត្តមានសហគ្រាស' : 'Enterprise Action Plan & Governance Portal'}
            </p>
          </div>
        </div>

        {/* Language Selector (Touch Friendly 44px target) */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`min-h-[38px] px-3 rounded-lg text-xs font-bold transition flex items-center justify-center ${
              lang === 'en' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
            aria-label="Switch to English"
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('km')}
            className={`min-h-[38px] px-3 rounded-lg text-xs font-bold transition flex items-center justify-center font-khmer ${
              lang === 'km' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
            aria-label="Switch to Khmer"
          >
            ខ្មែរ
          </button>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="w-full max-w-xl mx-auto px-4 py-4 sm:py-8 flex-1 flex flex-col justify-center">
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden transition-all duration-200">
          
          {/* Mobile-Friendly Segmented Switcher (48px Touch Height) */}
          <div className="p-2.5 sm:p-3 bg-slate-950/80 border-b border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('signin'); setSignInError(''); }}
              className={`flex-1 min-h-[48px] h-12 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 active:scale-[0.99] ${
                activeTab === 'signin'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/90'
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>{t.signIn}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('register'); setRegError(''); }}
              className={`flex-1 min-h-[48px] h-12 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 active:scale-[0.99] ${
                activeTab === 'register'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/90'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>{t.signUp}</span>
            </button>
          </div>

          <div className="p-5 sm:p-8">
            {/* ======================================================== */}
            {/* TAB 1: MOBILE-FRIENDLY SIGN IN (MANUAL CREDENTIALS ENTRY) */}
            {/* ======================================================== */}
            {activeTab === 'signin' && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {t.welcomeBack}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {lang === 'km' 
                      ? 'សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់របស់អ្នកដើម្បីចូលប្រើប្រព័ន្ធ'
                      : 'Please enter your corporate credentials manually to proceed.'}
                  </p>
                </div>

                {/* Error Banner with Smooth Shake */}
                {signInError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between text-rose-300 text-xs sm:text-sm animate-in fade-in duration-200">
                    <div className="flex items-center space-x-2.5">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-rose-400" />
                      <span>{signInError}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSignInError('')} 
                      className="text-rose-400 hover:text-rose-200 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Corporate Email Input - Minimum 48px Height, 16px font on mobile */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                      {t.emailAddress} <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={signInEmail}
                        onChange={e => setSignInEmail(e.target.value)}
                        placeholder="your.name@enterprise.com"
                        className="w-full min-h-[48px] h-12 bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-11 pr-4 text-base sm:text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Password Input - Minimum 48px Height & Accessible Eye Button */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-300">
                        {t.password} <span className="text-blue-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition py-1 px-1 -mr-1"
                      >
                        {t.forgotPassword}
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={signInPassword}
                        onChange={e => setSignInPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full min-h-[48px] h-12 bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-11 pr-12 text-base sm:text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center justify-center w-12 text-slate-400 hover:text-slate-200 transition focus:outline-hidden"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox with 44px+ hit area */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center space-x-2.5 cursor-pointer py-1.5 select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-md border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-xs sm:text-sm text-slate-400 font-medium">
                        {t.rememberMe}
                      </span>
                    </label>
                  </div>

                  {/* Submit Button (48px Touch Target, Full Width) */}
                  <button
                    type="submit"
                    disabled={signInLoading}
                    className="w-full min-h-[48px] h-12 py-3 px-5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm sm:text-base font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {signInLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{t.signIn}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Collapsible Corporate Demo Credentials Reference (Manual Typing Guide) */}
                <div className="mt-6 pt-5 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCredentialsGuide(!showCredentialsGuide)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 text-xs text-slate-300 transition"
                  >
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="font-bold">
                        {lang === 'km' ? 'បញ្ជីគណនីគំរូសហគ្រាស (សម្រាប់វាយបញ្ចូល)' : 'Corporate Demo Credentials Guide'}
                      </span>
                    </div>
                    {showCredentialsGuide ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {showCredentialsGuide && (
                    <div className="mt-2.5 p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800/80">
                        <span>
                          {lang === 'km' ? 'ពាក្យសម្ងាត់រួមសម្រាប់គ្រប់គណនីគំរូ៖' : 'Universal Password for Demo Accounts:'}
                        </span>
                        <span className="font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                          Password@123
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {corporateAccounts.map(account => (
                          <div
                            key={account.email}
                            className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5 mb-0.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${account.badgeColor}`}>
                                  {account.role}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-300 truncate">
                                {account.email}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyEmail(account.email)}
                              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0"
                              title="Copy email to clipboard"
                            >
                              {copiedEmail === account.email ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>

                      <p className="text-[10px] text-slate-500 pt-1 italic">
                        {lang === 'km'
                          ? 'ចំណាំ៖ មុខងារ Quick 1-Click Login ត្រូវបានបិទ។ សូមចម្លង ឬវាយបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់ខាងលើដោយផ្ទាល់ដៃ។'
                          : 'Note: 1-click bypass is removed for security compliance. Users are required to enter credentials manually into the login form above.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: MOBILE-FRIENDLY SIGN UP / REGISTER ACCOUNT        */}
            {/* ======================================================== */}
            {activeTab === 'register' && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {t.createAccountTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {lang === 'km'
                      ? 'បង្កើតគណនីថ្មីក្នុងប្រព័ន្ធគ្រប់គ្រងផែនការ និងវត្តមានសហគ្រាស'
                      : 'Join the Enterprise Action Plan & Attendance Management System.'}
                  </p>
                </div>

                {regError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between text-rose-300 text-xs sm:text-sm">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-rose-400" />
                      <span>{regError}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setRegError('')} 
                      className="text-rose-400 hover:text-rose-200 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Full Name & Corporate Email (1 column mobile, 2 tablet) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1">
                        {lang === 'km' ? 'ឈ្មោះពេញ' : 'Full Name'} <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={e => setRegName(e.target.value)}
                          placeholder="e.g. Sokha Chan"
                          className="w-full min-h-[48px] h-12 bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-10 pr-3.5 text-base sm:text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1">
                        {lang === 'km' ? 'អ៊ីមែលសាជីវកម្ម' : 'Corporate Email'} <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                          placeholder="name@enterprise.gov.kh"
                          className="w-full min-h-[48px] h-12 bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-10 pr-3.5 text-base sm:text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1">
                        {lang === 'km' ? 'ពាក្យសម្ងាត់ (យ៉ាងតិច ៦ តួ)' : 'Password (min 6 chars)'} <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full min-h-[48px] h-12 bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-10 pr-11 text-base sm:text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center justify-center w-10 text-slate-400 hover:text-slate-200"
                        >
                          {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1">
                        {lang === 'km' ? 'ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់' : 'Confirm Password'} <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          required
                          value={regConfirmPassword}
                          onChange={e => setRegConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full min-h-[48px] h-12 bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-10 pr-11 text-base sm:text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center justify-center w-10 text-slate-400 hover:text-slate-200"
                        >
                          {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Department & Role Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1">
                        {lang === 'km' ? 'នាយកដ្ឋាន' : 'Department'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <select
                          value={regDeptId}
                          onChange={e => setRegDeptId(e.target.value)}
                          className="w-full min-h-[48px] h-12 bg-slate-950 border border-slate-700/80 rounded-2xl pl-10 pr-8 text-base sm:text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 appearance-none shadow-inner"
                        >
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1">
                        {lang === 'km' ? 'តួនាទី RBAC' : 'Assigned Role'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Shield className="w-4 h-4" />
                        </div>
                        <select
                          value={regRole}
                          onChange={e => setRegRole(e.target.value as UserRole)}
                          className="w-full min-h-[48px] h-12 bg-slate-950 border border-slate-700/80 rounded-2xl pl-10 pr-8 text-base sm:text-sm text-white focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 appearance-none shadow-inner"
                        >
                          <option value="Employee">{lang === 'km' ? 'បុគ្គលិក (Employee)' : 'Employee (Task Execution)'}</option>
                          <option value="Team Leader">{lang === 'km' ? 'ប្រធានក្រុម (Team Leader)' : 'Team Leader (Task Oversight)'}</option>
                          <option value="Department Manager">{lang === 'km' ? 'ប្រធាននាយកដ្ឋាន (Manager)' : 'Department Manager (Plan Approval)'}</option>
                          <option value="Administrator">{lang === 'km' ? 'អ្នកគ្រប់គ្រង (Admin)' : 'Administrator (System Governance)'}</option>
                          <option value="Executive / Viewer">{lang === 'km' ? 'ថ្នាក់ដឹកនាំ / មើលរបាយការណ៍' : 'Executive / Viewer (Reports & Audit)'}</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Position & Phone Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1">
                        {lang === 'km' ? 'មុខតំណែង / តួនាទីការងារ' : 'Position / Job Title'}
                      </label>
                      <input
                        type="text"
                        value={regPosition}
                        onChange={e => setRegPosition(e.target.value)}
                        placeholder="e.g. Senior Project Specialist"
                        className="w-full min-h-[48px] h-12 bg-slate-950/90 border border-slate-700/80 rounded-2xl px-4 text-base sm:text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1">
                        {lang === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={e => setRegPhone(e.target.value)}
                          placeholder="+855 12 345 678"
                          className="w-full min-h-[48px] h-12 bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-10 pr-4 text-base sm:text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Registration Button (48px Touch Target, Full Width) */}
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full min-h-[48px] h-12 py-3 px-5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm sm:text-base font-bold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {regLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{lang === 'km' ? 'បង្កើតគណនី និងចូលប្រព័ន្ធ' : 'Create Account & Enter'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* System Footer Badges */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 text-center sm:flex sm:items-center sm:justify-between border-t border-slate-900 text-[11px] text-slate-500">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mb-2 sm:mb-0">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Secure Enterprise Auth</span>
          </span>
          <span>•</span>
          <span>Spatie RBAC Guarded</span>
          <span>•</span>
          <span>UTF-8 Khmer Unicode Battambang</span>
        </div>
        <div>
          Action Plan Management System &copy; 2026
        </div>
      </footer>

      {/* Forgot Password Modal (Touch Optimized) */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-blue-400" />
                <span>{t.forgotPassword}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {lang === 'km'
                ? 'សូមបញ្ចូលអ៊ីមែលសាជីវកម្មរបស់អ្នក ដើម្បីកំណត់ពាក្យសម្ងាត់ឡើងវិញទៅកាន់ពាក្យសម្ងាត់លំនាំដើមរបស់ប្រព័ន្ធ (Password@123)'
                : 'Enter your corporate email address to reset your account password back to default credentials (Password@123).'}
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.emailAddress}
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="corporate.email@enterprise.com"
                  className="w-full min-h-[48px] h-12 bg-slate-950 border border-slate-700 rounded-2xl px-4 text-base sm:text-sm text-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {forgotMessage && (
                <div className={`p-3 rounded-xl text-xs sm:text-sm ${
                  forgotSuccess 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  {forgotMessage}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm text-slate-400 hover:bg-slate-800 font-semibold"
                >
                  {lang === 'km' ? 'បិទ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition"
                >
                  {lang === 'km' ? 'កំណត់ពាក្យសម្ងាត់ឡើងវិញ' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
