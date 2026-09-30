import React, { useState } from 'react';
import { 
  HelpCircle, 
  X, 
  Smartphone, 
  Clock, 
  CheckSquare, 
  Command, 
  LifeBuoy, 
  Sun, 
  Moon, 
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { Language } from '../types';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'shifts' | 'tasks' | 'shortcuts' | 'contacts'>('quickstart');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-100 text-cyan-700">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Employee Training & Help Center</h3>
              <p className="text-xs text-slate-500">Quick interactive tutorials, shift guidelines, and keyboard shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-slate-100 px-4 pt-2 bg-white gap-2 scrollbar-none">
          {[
            { id: 'quickstart', label: 'Mobile App Guide', icon: <Smartphone className="w-3.5 h-3.5" /> },
            { id: 'shifts', label: 'Work Shifts (8-12 & 13-17)', icon: <Clock className="w-3.5 h-3.5" /> },
            { id: 'tasks', label: 'Tasks & Progress', icon: <CheckSquare className="w-3.5 h-3.5" /> },
            { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: <Command className="w-3.5 h-3.5" /> },
            { id: 'contacts', label: 'Support & Contacts', icon: <LifeBuoy className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'border-cyan-600 text-cyan-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-slate-700">
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900">Welcome to the Enhanced Employee Experience!</h4>
                  <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                    The system has been transformed with mobile-first ergonomics: one-touch shift punch-in, fast search, streamlined progress updates, and a dedicated employee focus dashboard.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>One-Tap Clock In</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    Check in automatically with your geolocation and shift timings in one tap. No tedious forms needed.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Quick Tasks & Progress</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    Update your milestone progress directly with single-click sliders without wading through admin menus.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Global Command Palette</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    Press <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded-sm font-mono text-[10px]">Ctrl+K</kbd> anywhere to search all documents, activities, and colleagues instantly.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>Feedback & Continuous Evolution</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    Click the feedback button anytime to share mobile bug reports or workflow suggestions directly with HR & Tech administrators.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shifts' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Institutional Standard Shifts</h4>
              
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">Morning Shift (វេនព្រឹក)</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-mono font-bold">
                        08:00 - 12:00
                      </span>
                    </div>
                    <p className="text-xs text-amber-800/80 mt-1">
                      Core morning operations & departmental standups. Grace period ends at <strong>08:15</strong>. Checking in after 08:15 will automatically be flagged as Late.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900">Evening Shift (វេនល្ងាច)</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-mono font-bold">
                        13:00 - 17:00
                      </span>
                    </div>
                    <p className="text-xs text-indigo-800/80 mt-1">
                      Afternoon operations, technical implementation & site coverage. Grace period ends at <strong>13:15</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <strong className="text-slate-800">Shift Editing & Corrections:</strong>
                <p>
                  If you worked a different shift or forgot to clock in/out, you can use the <strong>Edit Shift</strong> button on your daily check-in banner or request an adjustment through your department manager.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Progressive Disclosure in Task Execution</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                To keep the mobile interface clutter-free, tasks use progressive disclosure: essential info (Title, Status, Due Date, Progress Bar) is visible immediately. Tapping any task card expands rich details such as assigned leader, attachments, KPI metric units, and comments.
              </p>

              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-800">1-Click Progress Slider</span>
                  </div>
                  <span className="text-slate-500">Drag or tap 25%, 50%, 75%, 100%</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-800">Instant Sign-Off Request</span>
                  </div>
                  <span className="text-slate-500">Auto-routes to Department Manager</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Productivity Hotkeys</h4>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white text-xs">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-slate-700">Open Command Palette / Search</span>
                  <kbd className="px-2 py-1 bg-slate-100 text-slate-800 rounded-md font-mono text-[11px] border border-slate-200">
                    Ctrl + K / ⌘ + K
                  </kbd>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-slate-700">Close open dialog or modal</span>
                  <kbd className="px-2 py-1 bg-slate-100 text-slate-800 rounded-md font-mono text-[11px] border border-slate-200">
                    Esc
                  </kbd>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-slate-700">Navigate search results</span>
                  <kbd className="px-2 py-1 bg-slate-100 text-slate-800 rounded-md font-mono text-[11px] border border-slate-200">
                    ↑ / ↓ Arrow Keys
                  </kbd>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-slate-700">Select active search item</span>
                  <kbd className="px-2 py-1 bg-slate-100 text-slate-800 rounded-md font-mono text-[11px] border border-slate-200">
                    Enter ↵
                  </kbd>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Internal Institutional Support</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <span className="font-bold text-slate-800">IT & System Support</span>
                  <p className="text-slate-500">For account issues, permissions, and device compatibility.</p>
                  <p className="font-mono text-blue-600 text-[11px] pt-1">support@actionplans.gov.kh</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <span className="font-bold text-slate-800">Human Resources & Attendance</span>
                  <p className="text-slate-500">For shift adjustments, leave approvals, and monthly summaries.</p>
                  <p className="font-mono text-blue-600 text-[11px] pt-1">hr-attendance@actionplans.gov.kh</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
