import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isStandalone, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    setIsDismissed(dismissed);
  }, []);

  // Do not show if already in standalone app or dismissed
  if (isStandalone || isDismissed) {
    return null;
  }

  // Only show if browser supports prompt or is iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      handleDismiss();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-40 sm:max-w-md bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white rounded-2xl p-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white shrink-0 shadow-md">
            <Smartphone className="w-5 h-5 text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">Install Action Plan App</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
              Add to Home Screen for fast mobile access, offline mode &amp; real-time attendance shift push alerts!
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? 'Install (iOS)' : 'Install Now'}</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 text-xs font-medium transition"
              >
                Maybe later
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-slate-800">
            <h3 className="text-base font-bold text-slate-900">Install on iPhone / iPad</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              1. Tap the <strong>Share</strong> button at the bottom of Safari.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
              3. Tap <strong>Add</strong> in the top-right corner.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowIOSModal(false);
                handleDismiss();
              }}
              className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
