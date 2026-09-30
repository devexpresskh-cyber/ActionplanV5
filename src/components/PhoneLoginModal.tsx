import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  KeyRound
} from 'lucide-react';
import { User, Language } from '../types';
import { db } from '../services/db';

interface PhoneLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  lang: Language;
}

export const PhoneLoginModal: React.FC<PhoneLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  lang,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Real-time matched user lookup as user types
  const matchedUser = phoneNumber.trim().length >= 6 
    ? db.findUserByPhone(phoneNumber.trim()) 
    : undefined;

  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) {
      setError(lang === 'km' ? 'សូមបញ្ចូលលេខទូរស័ព្ទរបស់អ្នក' : 'Please enter your registered phone number.');
      return;
    }
    if (!password) {
      setError(lang === 'km' ? 'សូមបញ្ចូលពាក្យសម្ងាត់របស់អ្នក' : 'Please enter your password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = db.loginWithPhone(trimmedPhone, password);
      setIsLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setError(
          res.error || 
          (lang === 'km' 
            ? 'លេខទូរស័ព្ទ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។ សូមពិនិត្យម្តងទៀត។' 
            : 'Invalid phone number or password. Please verify your credentials.')
        );
      }
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[92vh] overflow-y-auto flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-login-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 id="phone-login-title" className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{lang === 'km' ? 'ចូលដោយលេខទូរស័ព្ទ និងពាក្យសម្ងាត់' : 'Login by Phone Number & Password'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'km' 
                  ? 'ផ្ទៀងផ្ទាត់គណនីបុគ្គលិកដោយលេខទូរស័ព្ទ និងពាក្យសម្ងាត់' 
                  : 'Enterprise authentication with your registered mobile phone and password.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs sm:text-sm animate-in fade-in duration-150">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setError('')} 
                className="text-rose-500 hover:text-rose-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Number Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                  {lang === 'km' ? 'លេខទូរស័ព្ទ (Phone Number)' : 'Mobile Phone Number'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                {matchedUser && (
                  <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-in fade-in duration-150">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{matchedUser.name} ({matchedUser.role})</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <input
                  type="tel"
                  required
                  autoFocus
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="012 889 901 or +855 12 889 901"
                  className="w-full min-h-[48px] h-12 bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono tracking-tight transition"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 pl-1">
                {lang === 'km' 
                  ? 'គាំទ្រទម្រង់ក្នុងស្រុក 012... ឬទម្រង់អន្តរជាតិ +855 12...' 
                  : 'Supports Cambodian formats (+855 12... or 012...) with spaces, dashes, or digits only.'}
              </p>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                  {lang === 'km' ? 'ពាក្យសម្ងាត់ (Password)' : 'Account Password'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-blue-600" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full min-h-[48px] h-12 bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center justify-center w-12 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{lang === 'km' ? 'ចងចាំខ្ញុំលើឧបករណ៍នេះ' : 'Remember me on this device'}</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] h-12 py-3 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>{lang === 'km' ? 'ចូលគណនី (Sign In)' : 'Sign In with Phone'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{lang === 'km' ? 'ប្រព័ន្ធការពារសុវត្ថិភាពទិន្នន័យសាជីវកម្មកម្រិតខ្ពស់' : 'Protected by Enterprise Role-Based Access Governance'}</span>
        </div>
      </div>
    </div>
  );
};
