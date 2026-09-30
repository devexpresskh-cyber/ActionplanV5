import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, CheckCircle, Info, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'sidebar' | 'banner' | 'card';
  className?: string;
  label?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  className = '',
  label,
}) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [installSuccessToast, setInstallSuccessToast] = useState(false);

  // If running in standalone installed mode, don't nag the user
  if (isStandalone) {
    if (variant === 'card') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>PWA App Installed & Active</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstallSuccessToast(true);
        setTimeout(() => setInstallSuccessToast(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowInfoModal(true);
    }
  };

  const buttonText = label || (isIOS ? 'Install on iOS' : 'Install App');

  return (
    <>
      {variant === 'navbar' && (
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shadow-xs transition active:scale-95 group shrink-0 ${className}`}
          title="Install Action Plan App to your Home Screen / Desktop"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition" />
          <span className="hidden sm:inline font-bold">{buttonText}</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:from-indigo-700 hover:to-blue-700 transition active:scale-98 text-xs font-bold ${className}`}
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className="truncate">{buttonText}</span>
        </button>
      )}

      {variant === 'card' && (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition active:scale-95 ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>{buttonText}</span>
        </button>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                  AP
                </div>
                <h3 className="text-base font-bold text-slate-900">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-600">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    Tap the Share button <Share2 className="w-3.5 h-3.5 text-blue-600 inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Located in Safari&apos;s bottom toolbar (or top right on iPad).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    Select &quot;Add to Home Screen&quot; <PlusSquare className="w-3.5 h-3.5 text-indigo-600 inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Scroll down through share options and tap &quot;Add to Home Screen&quot;.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  Launch directly from your Home Screen for full-screen mode, offline caching, and push notifications!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* General Browser Installation Info Modal (Desktop Chrome / Edge / Firefox) */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  AP
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Install Progressive Web App</h3>
                  <p className="text-[11px] text-slate-500">Run as a standalone native app</p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <p>
                The Action Plan Management System is a verified <strong>Progressive Web App (PWA)</strong>. You can install it on your device for fast access, offline data viewing, and shift alerts.
              </p>

              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  How to install on your browser:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                  <li><strong>Chrome / Edge:</strong> Click the install icon in the right side of the address bar, or open menu (⋮) &rarr; &quot;Install Action Plan...&quot;</li>
                  <li><strong>Android:</strong> Tap browser menu (⋮) &rarr; &quot;Install app&quot; or &quot;Add to Home screen&quot;</li>
                  <li><strong>Safari (iOS/macOS):</strong> Tap Share button &rarr; &quot;Add to Home Screen&quot; / &quot;Add to Dock&quot;</li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Success notification */}
      {installSuccessToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-top">
          <CheckCircle className="w-4 h-4" />
          <span>App installed successfully! Check your home screen or apps list.</span>
        </div>
      )}
    </>
  );
};
