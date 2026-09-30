import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Trash2, 
  Edit3, 
  Search, 
  HelpCircle, 
  X, 
  Play, 
  RotateCcw, 
  Send, 
  ExternalLink, 
  BookOpen, 
  FlaskConical, 
  Sliders, 
  Check, 
  ChevronRight,
  Info,
  Globe
} from 'lucide-react';
import { User, Language, VoiceCommandExecutionResult, VoiceSessionHistoryItem, PlanStatus } from '../types';
import { voiceAssistant, VoiceSettings, SpeechRecognitionLanguage, isKhmerText } from '../services/voiceAssistant';
import { db } from '../services/db';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  lang: Language;
  onPlanMutated?: () => void;
  onNavigatePlan?: (planId: string) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
  onPlanMutated,
  onNavigatePlan,
}) => {
  // Navigation tabs within assistant
  const [activeTab, setActiveTab] = useState<'assistant' | 'commands' | 'training' | 'sandbox' | 'history'>('assistant');

  // Voice state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [lastExecutionResult, setLastExecutionResult] = useState<VoiceCommandExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings & Security
  const [settings, setSettings] = useState<VoiceSettings>(() => voiceAssistant.getSettings());
  const [pinInput, setPinInput] = useState<string>('');
  const [isPinUnlocked, setIsPinUnlocked] = useState<boolean>(() => voiceAssistant.isVoiceAuthenticated());
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // History & Sandbox
  const [history, setHistory] = useState<VoiceSessionHistoryItem[]>(() => voiceAssistant.getHistory());
  const [sandboxResult, setSandboxResult] = useState<VoiceCommandExecutionResult | null>(null);

  const isKhmerMode = settings.recognitionLanguage === 'km-KH';

  const handleLanguageChange = (newLang: SpeechRecognitionLanguage) => {
    voiceAssistant.setRecognitionLanguage(newLang);
    setSettings(prev => ({ ...prev, recognitionLanguage: newLang }));
  };

  // Sandbox & Practice phrases
  const practicePhrases = useMemo(() => {
    if (isKhmerMode) {
      return [
        {
          title: 'បង្កើតផែនការថ្មី',
          command: 'បង្កើតផែនការថ្មីឈ្មោះ ការពង្រីកសេវាធនាគារឌីជីថល',
          category: 'ការបង្កើត',
          desc: 'បង្កើតផែនការសកម្មភាពថ្មីជាសេចក្តីព្រាង និងកំណត់អ្នកទទួលខុសត្រូវ'
        },
        {
          title: 'បង្កើតជាមួយនាយកដ្ឋាន និងថវិកា',
          command: 'បង្កើតផែនការថ្មីឈ្មោះ ការធ្វើទំនើបកម្មប្រព័ន្ធ IT ក្នុងនាយកដ្ឋានព័ត៌មានវិទ្យា ជាមួយថវិកា 50000',
          category: 'ការបង្កើត',
          desc: 'ស្គាល់នាយកដ្ឋាន គោលដៅយុទ្ធសាស្ត្រ និងទំហំថវិកាដោយស្វ័យប្រវត្តិ'
        },
        {
          title: 'កែប្រែវឌ្ឍនភាព',
          command: 'កែប្រែផែនការ ការពង្រីកសេវាធនាគារឌីជីថល ដោយវឌ្ឍនភាព 85 ភាគរយ',
          category: 'វឌ្ឍនភាព',
          desc: 'កែប្រែភាគរយវឌ្ឍនភាព ដំណាក់កាលសម្រេច និងសូចនាករ KPI'
        },
        {
          title: 'កែប្រែស្ថានភាព និងព័ត៌មាន',
          command: 'កែប្រែផែនការ ការពង្រីកសេវាធនាគារឌីជីថល ដោយស្ថានភាពកំពុងដំណើរការ',
          category: 'បច្ចុប្បន្នភាព',
          desc: 'ផ្លាស់ប្តូរស្ថានភាពផែនការ និងកត់ត្រាកំណត់ចំណាំលម្អិត'
        },
        {
          title: 'សាកសួរស្ថានភាពផែនការ',
          command: 'តើស្ថានភាពផែនការ ការពង្រីកសេវាធនាគារឌីជីថល យ៉ាងណាដែរ',
          category: 'សាកសួរ',
          desc: 'ទាញយកវឌ្ឍនភាពបច្ចុប្បន្ន ស្ថានភាព និងកាលបរិច្ឆេទផុតកំណត់'
        },
        {
          title: 'លុប ឬរក្សាទុកក្នុងបណ្ណសារ',
          command: 'លុបផែនការឈ្មោះ សេចក្តីព្រាងយុទ្ធនាការទីផ្សារ',
          category: 'ការគ្រប់គ្រង',
          desc: 'លុប ឬរក្សាទុកក្នុងបណ្ណសារដោយត្រួតពិនិត្យសិទ្ធិ RBAC'
        },
        {
          title: 'បង្កើតសកម្មភាព/កិច្ចការថ្មី',
          command: 'បង្កើតសកម្មភាពថ្មីឈ្មោះ រៀបចំរបាយការណ៍ហិរញ្ញវត្ថុ ក្នុងផែនការ AP-2026-001 អាទិភាពខ្ពស់',
          category: 'សកម្មភាព/កិច្ចការ',
          desc: 'បង្កើតកិច្ចការថ្មី ភ្ជាប់ជាមួយផែនការសកម្មភាព និងកំណត់កម្រិតអាទិភាព'
        },
        {
          title: 'កែប្រែវឌ្ឍនភាព ឬបញ្ចប់កិច្ចការ',
          command: 'សម្គាល់សកម្មភាព ACT-001 ថាបានបញ្ចប់',
          category: 'សកម្មភាព/កិច្ចការ',
          desc: 'សម្គាល់កិច្ចការថាបានបញ្ចប់ ពិនិត្យកិច្ចការតម្រូវ (Dependencies) និងកែប្រែវឌ្ឍនភាពទៅ 100%'
        },
        {
          title: 'កំណត់វឌ្ឍនភាព ឬចាត់តាំងកិច្ចការ',
          command: 'កំណត់វឌ្ឍនភាពសកម្មភាព ACT-001 ទៅ 80 ភាគរយ',
          category: 'សកម្មភាព/កិច្ចការ',
          desc: 'ធ្វើបច្ចុប្បន្នភាពភាគរយវឌ្ឍនភាព ឬប្រគល់ជូនបុគ្គលិកទទួលខុសត្រូវ'
        },
        {
          title: 'លុបសកម្មភាព/កិច្ចការ',
          command: 'លុបសកម្មភាព ACT-001',
          category: 'សកម្មភាព/កិច្ចការ',
          desc: 'លុបសកម្មភាពដោយត្រួតពិនិត្យសិទ្ធិ RBAC និងកិច្ចការអាស្រ័យ'
        }
      ];
    }
    return [
      {
        title: 'Create Plan',
        command: 'Create a new plan titled Supply Chain Digitization',
        category: 'Creation',
        desc: 'Creates a new action plan with draft status and assigned owner'
      },
      {
        title: 'Create with Department & Budget',
        command: 'Create a new plan titled Cloud Infrastructure Migration in IT Department with budget 50000',
        category: 'Creation',
        desc: 'Auto-detects department, strategic objective, and initial budget'
      },
      {
        title: 'Update Progress',
        command: 'Update the Digital Banking Expansion with progress 85 percent',
        category: 'Progress',
        desc: 'Updates progress percentage, milestone delivery, and KPI progress'
      },
      {
        title: 'Update Status & Details',
        command: 'Update the Employee Wellbeing Initiative with status In Progress and notes phase one launched',
        category: 'Updates',
        desc: 'Changes status and appends detailed progress log'
      },
      {
        title: 'Query Plan Status',
        command: 'What is the status of the Cybersecurity Audit plan',
        category: 'Query',
        desc: 'Retrieves current progress, review stage, and target due date'
      },
      {
        title: 'Delete / Archive Plan',
        command: 'Delete the plan titled Draft Marketing Test',
        category: 'Management',
        desc: 'Safely archives target plan after checking RBAC permissions'
      },
      {
        title: 'Create Activity / Task',
        command: 'Create task Prepare Financial Audit in plan AP-2026-001 with high priority',
        category: 'Activities & Tasks',
        desc: 'Adds a new task to a specific action plan with assignee and priority'
      },
      {
        title: 'Mark Activity Completed',
        command: 'Mark activity ACT-001 as completed',
        category: 'Activities & Tasks',
        desc: 'Marks task completed (100%) after validating prerequisite dependencies'
      },
      {
        title: 'Update Activity Progress',
        command: 'Set task ACT-001 progress to 80 percent',
        category: 'Activities & Tasks',
        desc: 'Updates task completion percentage and shifts status to In Progress'
      },
      {
        title: 'Delete Activity / Task',
        command: 'Delete activity ACT-001',
        category: 'Activities & Tasks',
        desc: 'Deletes task while checking RBAC permissions and dependency constraints'
      }
    ];
  }, [isKhmerMode]);

  // Subscribe to voice assistant engine
  useEffect(() => {
    if (!isOpen) {
      voiceAssistant.stopListening();
      voiceAssistant.stopSpeaking();
      return;
    }

    const unsubListening = voiceAssistant.subscribeListeningState(state => {
      setIsListening(state);
    });

    const unsubAudio = voiceAssistant.subscribeAudioLevel(level => {
      setAudioLevel(level);
    });

    const unsubTranscript = (interim: string, final: string) => {
      setInterimTranscript(interim);
      if (final) {
        setFinalTranscript(final);
        handleExecuteVoiceCommand(final);
      }
    };
    const unsubTranscriptClean = voiceAssistant.subscribeTranscript(unsubTranscript);

    const unsubError = voiceAssistant.subscribeError(err => {
      setErrorMessage(err);
      setTimeout(() => setErrorMessage(null), 6000);
    });

    setIsPinUnlocked(voiceAssistant.isVoiceAuthenticated());
    setHistory(voiceAssistant.getHistory());

    return () => {
      unsubListening();
      unsubAudio();
      unsubTranscriptClean();
      unsubError();
      voiceAssistant.stopListening();
      voiceAssistant.stopSpeaking();
    };
  }, [isOpen]);

  // Execute recognized command
  const handleExecuteVoiceCommand = async (transcript: string) => {
    if (!transcript.trim()) return;
    setIsExecuting(true);
    setErrorMessage(null);

    try {
      const parsed = voiceAssistant.parseCommand(transcript);
      const result = await voiceAssistant.executeCommand(parsed, currentUser);
      setLastExecutionResult(result);
      setHistory(voiceAssistant.getHistory());

      if (result.success) {
        if (onPlanMutated) onPlanMutated();
      } else if (result.requiresPin) {
        setShowPinModal(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing voice command.');
    } finally {
      setIsExecuting(false);
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      voiceAssistant.stopListening();
    } else {
      setErrorMessage(null);
      setInterimTranscript('');
      setFinalTranscript('');
      const started = await voiceAssistant.startListening();
      if (!started) {
        setIsListening(false);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const text = manualInput.trim();
    setFinalTranscript(text);
    setManualInput('');
    handleExecuteVoiceCommand(text);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    const ok = voiceAssistant.verifyPin(pinInput.trim(), currentUser);
    if (ok) {
      setIsPinUnlocked(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError(null);
      // If there was a pending command that required PIN, re-execute
      if (finalTranscript) {
        handleExecuteVoiceCommand(finalTranscript);
      }
    } else {
      setPinError('Invalid security PIN. Default is 1234 or your account password.');
    }
  };

  const handleToggleMute = () => {
    const updated = !settings.speechOutputEnabled;
    voiceAssistant.saveSettings({ speechOutputEnabled: updated });
    setSettings(prev => ({ ...prev, speechOutputEnabled: updated }));
    if (!updated) {
      voiceAssistant.stopSpeaking();
    }
  };

  const handleToggleRequirePin = () => {
    const updated = !settings.requirePinForMutations;
    voiceAssistant.saveSettings({ requirePinForMutations: updated });
    setSettings(prev => ({ ...prev, requirePinForMutations: updated }));
    if (updated) {
      voiceAssistant.revokeVoiceAuth();
      setIsPinUnlocked(false);
    }
  };

  const testAudioOutput = () => {
    voiceAssistant.speak(`Voice confirmation test active. Hello ${currentUser.name}, your voice-activated system is operating normally.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center p-2 sm:p-4 items-start sm:items-center">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 relative overflow-hidden shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0">
              <Mic className={`w-4 h-4 sm:w-5 sm:h-5 ${isListening ? 'text-emerald-300 animate-pulse' : 'text-white'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h2 className="text-xs sm:text-base font-bold tracking-tight truncate">
                  {lang === 'km' ? 'ជំនួយការសំឡេងផែនការសកម្មភាព' : 'Voice Action Plan Assistant'}
                </h2>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center space-x-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{isListening ? 'Listening' : 'Ready'}</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-blue-100/80 truncate">
                {lang === 'km' 
                  ? 'បង្កើត កែប្រែ និងគ្រប់គ្រងផែនការសកម្មភាពតាមរយៈសំឡេង' 
                  : 'Voice-activated creation, updates, and management for enterprise action plans'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
            {/* Language Selector (Khmer / English) */}
            <div className="flex items-center rounded-lg bg-white/15 p-0.5 border border-white/20 shrink-0">
              <button
                type="button"
                onClick={() => handleLanguageChange('km-KH')}
                className={`px-1.5 sm:px-2 py-1 rounded-md text-[11px] sm:text-xs font-bold transition whitespace-nowrap flex items-center space-x-1 ${
                  settings.recognitionLanguage === 'km-KH'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
                title="Voice recognition & synthesis in Khmer (ភាសាខ្មែរ)"
              >
                <span>🇰🇭 ខ្មែរ</span>
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en-US')}
                className={`px-1.5 sm:px-2 py-1 rounded-md text-[11px] sm:text-xs font-bold transition whitespace-nowrap flex items-center space-x-1 ${
                  settings.recognitionLanguage === 'en-US'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
                title="Voice recognition & synthesis in English"
              >
                <span>🇺🇸 EN</span>
              </button>
            </div>

            {/* Audio Speech Output Toggle */}
            <button
              onClick={handleToggleMute}
              className={`p-1.5 sm:p-2 rounded-lg text-xs font-semibold border transition shrink-0 ${
                settings.speechOutputEnabled 
                  ? 'bg-white/15 text-white border-white/20 hover:bg-white/25' 
                  : 'bg-rose-500/30 text-rose-200 border-rose-400/40 hover:bg-rose-500/40'
              }`}
              title={settings.speechOutputEnabled ? 'Voice feedback is audible (Click to mute)' : 'Voice feedback is muted (Click to unmute)'}
            >
              {settings.speechOutputEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition shrink-0"
              aria-label="Close voice assistant"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-3 sm:px-4 text-xs font-semibold overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-3.5 py-2.5 border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'assistant'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Console</span>
          </button>

          <button
            onClick={() => setActiveTab('commands')}
            className={`px-3.5 py-2.5 border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'commands'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Command Structure</span>
          </button>

          <button
            onClick={() => setActiveTab('training')}
            className={`px-3.5 py-2.5 border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'training'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Training & Practice</span>
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-3.5 py-2.5 border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'sandbox'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Testing & Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2.5 border-b-2 transition flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Activity History ({history.length})</span>
          </button>
        </div>

        {/* Security & User Session Bar */}
        <div className="bg-slate-100/70 px-3 sm:px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-slate-700">Operator:</span>
            <span className="font-bold text-slate-900">{currentUser.name}</span>
            <span className="px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-800 text-[10px] font-semibold">
              {currentUser.role}
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setShowPinModal(true)}
              className="flex items-center space-x-1 text-slate-600 hover:text-blue-600 font-medium transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>Voice PIN: {settings.requirePinForMutations ? (isPinUnlocked ? 'Verified' : 'Locked') : 'Optional'}</span>
            </button>

            <button
              onClick={handleToggleRequirePin}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition ${
                settings.requirePinForMutations
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {settings.requirePinForMutations ? 'Strict PIN Mode: ON' : 'Strict PIN Mode: OFF'}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Global Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Notice: </span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* TAB 1: ASSISTANT CONSOLE */}
          {activeTab === 'assistant' && (
            <div className="space-y-5">
              {/* Mic & Waveform Card */}
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-lg border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
                {/* Background ambient glow */}
                <div className={`absolute w-64 h-64 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
                  isListening ? 'bg-blue-500/20 opacity-100' : 'bg-indigo-500/5 opacity-50'
                }`} />

                {/* Big Mic Button with Pulsing Wave */}
                <div className="relative mb-4">
                  {isListening && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping scale-125" />
                      <div className="absolute -inset-2 rounded-full border border-blue-400/40 animate-pulse" />
                    </>
                  )}
                  <button
                    onClick={toggleListening}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95 ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/50'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/50 hover:scale-105'
                    }`}
                    title={isListening ? 'Click to Stop Listening' : 'Click to Speak a Plan Command'}
                  >
                    {isListening ? (
                      <MicOff className="w-9 h-9 stroke-[2.2]" />
                    ) : (
                      <Mic className="w-9 h-9 stroke-[2.2]" />
                    )}
                  </button>
                </div>

                {/* Audio Level Waveform Indicator */}
                <div className="flex items-center justify-center space-x-1 h-8 mb-3">
                  {[...Array(16)].map((_, i) => {
                    const dynamicHeight = isListening 
                      ? Math.max(4, Math.min(32, (audioLevel / 3) * ((i % 5) + 1))) 
                      : 4;
                    return (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-75 ${
                          isListening ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-700'
                        }`}
                        style={{ height: `${dynamicHeight}px` }}
                      />
                    );
                  })}
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    {isListening ? 'Listening to your spoken command...' : 'Tap the microphone to speak'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Try: <span className="text-blue-300 font-mono">"Create a new plan titled Logistics Hub"</span> or <span className="text-blue-300 font-mono">"Update plan AP-2026-001 with 80% progress"</span>
                  </p>
                </div>

                {/* Real-time Transcription Display */}
                <div className="mt-5 w-full max-w-lg bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 text-left min-h-[60px] flex flex-col justify-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                    <span>Live Spoken Transcript</span>
                    {isExecuting && <span className="text-blue-400 animate-pulse">Executing command...</span>}
                  </div>
                  <div className="text-xs sm:text-sm text-white font-medium">
                    {interimTranscript ? (
                      <span className="text-blue-300 animate-pulse font-mono">
                        "{interimTranscript}"
                      </span>
                    ) : finalTranscript ? (
                      <span className="text-emerald-300 font-mono">
                        "{finalTranscript}"
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">
                        Spoken speech transcript will appear here in real-time...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Feedback Receipt Card (Point 5 from User Request) */}
              {lastExecutionResult && (
                <div className={`p-4 rounded-xl border transition-all ${
                  lastExecutionResult.success
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : lastExecutionResult.requiresPin
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                    : 'bg-rose-50/90 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        lastExecutionResult.success
                          ? 'bg-emerald-600 text-white'
                          : lastExecutionResult.requiresPin
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}>
                        {lastExecutionResult.success ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : lastExecutionResult.requiresPin ? (
                          <KeyRound className="w-5 h-5" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {(lastExecutionResult?.intent || 'COMMAND').replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(lastExecutionResult.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold mt-0.5">
                          {lastExecutionResult.displayMessage}
                        </h4>
                        <div className="mt-1.5 flex items-center space-x-2 text-xs bg-white/70 p-2 rounded-lg border border-slate-200/80">
                          <Volume2 className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="italic text-slate-700">
                            "{lastExecutionResult.spokenFeedback}"
                          </span>
                          <button
                            onClick={() => voiceAssistant.speak(lastExecutionResult.spokenFeedback)}
                            className="text-[10px] font-bold text-blue-700 hover:underline ml-auto shrink-0"
                          >
                            Replay Audio
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Link if plan was created/updated */}
                    {lastExecutionResult.planId && onNavigatePlan && (
                      <button
                        onClick={() => {
                          onNavigatePlan(lastExecutionResult.planId!);
                          onClose();
                        }}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50 shadow-2xs shrink-0"
                      >
                        <span>View Plan</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Manual Command Input (Fallback for noisy environments or muted mics) */}
              <form onSubmit={handleManualSubmit} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>{isKhmerMode ? 'វាយបញ្ចូលពាក្យបញ្ជាជាសំឡេងដោយផ្ទាល់' : 'Type Voice Command Directly'}</span>
                  <span className="text-[11px] text-slate-400">
                    {isKhmerMode ? 'កម្មវិធីវិភាគភាសាខ្មែរ/អង់គ្លេស' : 'Natural Language Parser'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    placeholder={
                      isKhmerMode 
                        ? 'ឧទាហរណ៍៖ បង្កើតផែនការថ្មីឈ្មោះ ការពង្រីកសេវាធនាគារឌីជីថល...'
                        : 'e.g. Create a new plan titled Employee Safety Protocol...'
                    }
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={!manualInput.trim()}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1"
                  >
                    <span>{isKhmerMode ? 'ប្រតិបត្តិ' : 'Execute'}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Quick Spoken Templates */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {isKhmerMode ? 'គំរូពាក្យបញ្ជាសំឡេងរហ័ស (ភាសាខ្មែរ)' : 'Fast Spoken Command Templates'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {isKhmerMode ? (
                    <>
                      <button
                        onClick={() => {
                          const phrase = "បង្កើតផែនការថ្មីឈ្មោះ ការពង្រីកសេវាធនាគារឌីជីថល";
                          setFinalTranscript(phrase);
                          handleExecuteVoiceCommand(phrase);
                        }}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-left transition group"
                      >
                        <span className="text-[10px] font-bold text-blue-600 uppercase block mb-1">បង្កើតផែនការ</span>
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 block">
                          «បង្កើតផែនការថ្មីឈ្មោះ [ឈ្មោះ]»
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">បង្កើតផែនការសកម្មភាពថ្មី</span>
                      </button>

                      <button
                        onClick={() => {
                          const firstPlan = db.getPlans()[0];
                          const phrase = firstPlan 
                            ? `កែប្រែផែនការ ${firstPlan.title} ដោយវឌ្ឍនភាព 90 ភាគរយ` 
                            : "កែប្រែផែនការ ការពង្រីកសេវាធនាគារ ដោយវឌ្ឍនភាព 80 ភាគរយ";
                          setFinalTranscript(phrase);
                          handleExecuteVoiceCommand(phrase);
                        }}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition group"
                      >
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">វឌ្ឍនភាពផែនការ</span>
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700 block">
                          «កែប្រែ [ផែនការ] ដោយវឌ្ឍនភាព [ភាគរយ]»
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">កែប្រែ % វឌ្ឍនភាព និង KPI</span>
                      </button>

                      <button
                        onClick={() => {
                          const firstPlan = db.getPlans()[0];
                          const planCode = firstPlan ? firstPlan.planNumber : 'AP-2026-001';
                          const phrase = `បង្កើតសកម្មភាពថ្មីឈ្មោះ រៀបចំរបាយការណ៍ហិរញ្ញវត្ថុ ក្នុងផែនការ ${planCode} អាទិភាពខ្ពស់`;
                          setFinalTranscript(phrase);
                          handleExecuteVoiceCommand(phrase);
                        }}
                        className="p-3 rounded-xl border border-indigo-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition group"
                      >
                        <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">បង្កើតសកម្មភាព</span>
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700 block">
                          «បង្កើតសកម្មភាពថ្មីឈ្មោះ [ឈ្មោះ]»
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">បង្កើតកិច្ចការថ្មីក្នុងផែនការ</span>
                      </button>

                      <button
                        onClick={() => {
                          const firstAct = db.getActivities()[0];
                          const actCode = firstAct ? firstAct.code : 'ACT-001';
                          const phrase = `សម្គាល់សកម្មភាព ${actCode} ថាបានបញ្ចប់`;
                          setFinalTranscript(phrase);
                          handleExecuteVoiceCommand(phrase);
                        }}
                        className="p-3 rounded-xl border border-teal-200 bg-white hover:border-teal-300 hover:bg-teal-50/40 text-left transition group"
                      >
                        <span className="text-[10px] font-bold text-teal-600 uppercase block mb-1">បញ្ចប់កិច្ចការ</span>
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-teal-700 block">
                          «សម្គាល់សកម្មភាព [កូដ] ថាបានបញ្ចប់»
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">បញ្ចប់កិច្ចការ និងផ្ទៀងផ្ទាត់តម្រូវ</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const phrase = "Create a new plan titled Customer Success Expansion";
                          setFinalTranscript(phrase);
                          handleExecuteVoiceCommand(phrase);
                        }}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-left transition group"
                      >
                        <span className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Create Plan</span>
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 block">
                          "Create a new plan titled [Name]"
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">Create draft action plan</span>
                      </button>

                      <button
                        onClick={() => {
                          const firstPlan = db.getPlans()[0];
                          const phrase = firstPlan 
                            ? `Update ${firstPlan.title} with progress 90 percent` 
                            : "Update Digital Transformation with progress 80 percent";
                          setFinalTranscript(phrase);
                          handleExecuteVoiceCommand(phrase);
                        }}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition group"
                      >
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Update Plan</span>
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700 block">
                          "Update [Plan] with [Progress]"
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">Updates % milestone & kpi</span>
                      </button>

                      <button
                        onClick={() => {
                          const firstPlan = db.getPlans()[0];
                          const planCode = firstPlan ? firstPlan.planNumber : 'AP-2026-001';
                          const phrase = `Create task Prepare Security Checklist in plan ${planCode} with high priority`;
                          setFinalTranscript(phrase);
                          handleExecuteVoiceCommand(phrase);
                        }}
                        className="p-3 rounded-xl border border-indigo-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition group"
                      >
                        <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Create Task</span>
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700 block">
                          "Create task [Name] in plan [Plan]"
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">Add activity under target plan</span>
                      </button>

                      <button
                        onClick={() => {
                          const firstAct = db.getActivities()[0];
                          const actCode = firstAct ? firstAct.code : 'ACT-001';
                          const phrase = `Mark activity ${actCode} as completed`;
                          setFinalTranscript(phrase);
                          handleExecuteVoiceCommand(phrase);
                        }}
                        className="p-3 rounded-xl border border-teal-200 bg-white hover:border-teal-300 hover:bg-teal-50/40 text-left transition group"
                      >
                        <span className="text-[10px] font-bold text-teal-600 uppercase block mb-1">Complete Task</span>
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-teal-700 block">
                          "Mark activity [Code] as completed"
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">Set 100% & check dependencies</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMMAND STRUCTURE */}
          {activeTab === 'commands' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Defined Voice Command Grammar (ភាសាខ្មែរ & English)</h4>
                  <p className="mt-0.5 text-blue-800">
                    The voice recognition engine recognizes standardized enterprise commands in both Khmer (ភាសាខ្មែរ) and English. You can speak naturally; the parser handles variations, filler words, and parameter extraction.
                  </p>
                </div>
              </div>

              {/* Command 1: Create a new plan */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs whitespace-nowrap">
                      1. CREATE PLAN (បង្កើតផែនការ)
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Syntax</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    "Create a new plan titled [Plan Name]" / «បង្កើតផែនការថ្មីឈ្មោះ [ឈ្មោះ]»
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Initializes a new draft action plan under the user's department with automatic plan numbering (e.g. <span className="font-mono font-semibold">AP-2026-004</span>).
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-700">Supported Khmer (ភាសាខ្មែរ) Variations:</div>
                  <div className="text-slate-600 font-mono">• «បង្កើតផែនការថ្មីឈ្មោះ ការពង្រីកសេវាធនាគារឌីជីថល»</div>
                  <div className="text-slate-600 font-mono">• «បង្កើតផែនការឈ្មោះ ការពង្រឹងសុវត្ថិភាព IT ក្នុងនាយកដ្ឋានព័ត៌មានវិទ្យា ថវិកា 50000»</div>
                  <div className="text-slate-600 font-mono">• «បន្ថែមផែនការថ្មីហៅថា គម្រោងពង្រីកសាខា»</div>
                  <div className="font-semibold text-slate-700 pt-1">Supported English Variations:</div>
                  <div className="text-slate-600 font-mono">• "Create a new plan titled Supply Chain Optimization"</div>
                  <div className="text-slate-600 font-mono">• "Create plan titled Enterprise Security Upgrade in IT Department"</div>
                  <div className="text-slate-600 font-mono">• "Add a new plan called Branch Expansion with budget 25000"</div>
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => {
                      setActiveTab('assistant');
                      const sample = isKhmerMode 
                        ? "បង្កើតផែនការថ្មីឈ្មោះ ការពង្រីកសេវាធនាគារឌីជីថល" 
                        : "Create a new plan titled Enterprise Security Upgrade";
                      setFinalTranscript(sample);
                      handleExecuteVoiceCommand(sample);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                  >
                    <span>{isKhmerMode ? 'សាកល្បងពាក្យបញ្ជានេះឥឡូវនេះ' : 'Try this command now'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Command 2: Update the plan */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-xs whitespace-nowrap">
                      2. UPDATE PLAN (កែប្រែផែនការ)
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Syntax</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    "Update the [Plan Name] with [New Details]" / «កែប្រែផែនការ [ឈ្មោះ] ដោយ [ព័ត៌មានថ្មី]»
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Updates an existing plan's progress percentage, review status, or appends results and progress comments.
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-700">Supported Khmer (ភាសាខ្មែរ) Variations:</div>
                  <div className="text-slate-600 font-mono">• «កែប្រែផែនការ ការពង្រីកសេវាធនាគារ ដោយវឌ្ឍនភាព 80 ភាគរយ»</div>
                  <div className="text-slate-600 font-mono">• «កែប្រែផែនការ AP-2026-001 ដោយស្ថានភាពកំពុងដំណើរការ»</div>
                  <div className="text-slate-600 font-mono">• «កំណត់វឌ្ឍនភាពផែនការ ការពង្រីកសេវាធនាគារ ទៅ 95 ភាគរយ»</div>
                  <div className="font-semibold text-slate-700 pt-1">Supported English Variations:</div>
                  <div className="text-slate-600 font-mono">• "Update the Digital Banking Expansion with progress 80 percent"</div>
                  <div className="text-slate-600 font-mono">• "Update AP-2026-001 with status in progress"</div>
                  <div className="text-slate-600 font-mono">• "Set the Core Banking Migration progress to 95 percent"</div>
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => {
                      setActiveTab('assistant');
                      const p = db.getPlans()[0];
                      const cmd = isKhmerMode 
                        ? `កែប្រែផែនការ ${p?.title || 'ការពង្រីកសេវាធនាគារ'} ដោយវឌ្ឍនភាព 75 ភាគរយ`
                        : `Update ${p?.title || 'Digital Banking'} with progress 75 percent`;
                      setFinalTranscript(cmd);
                      handleExecuteVoiceCommand(cmd);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                  >
                    <span>{isKhmerMode ? 'សាកល្បងពាក្យបញ្ជានេះឥឡូវនេះ' : 'Try this command now'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Command 3: Delete the plan */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-xs whitespace-nowrap">
                      3. DELETE / ARCHIVE PLAN (លុប ឬរក្សាទុកក្នុងបណ្ណសារ)
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Syntax</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    "Delete the plan titled [Plan Name]" / «លុបផែនការឈ្មោះ [ឈ្មោះ]»
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Safely archives the target plan. RBAC rules are strictly enforced: only authorized roles (Super Admin, Administrator, Department Manager, or Employee owners for their draft plans) can delete.
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-700">Supported Khmer (ភាសាខ្មែរ) Variations:</div>
                  <div className="text-slate-600 font-mono">• «លុបផែនការឈ្មោះ សេចក្តីព្រាងយុទ្ធនាការទីផ្សារ»</div>
                  <div className="text-slate-600 font-mono">• «រក្សាទុកក្នុងបណ្ណសារនូវផែនការ AP-2026-003»</div>
                  <div className="text-slate-600 font-mono">• «លុបចោលផែនការ គំនិតផ្តួចផ្តើមបណ្តោះអាសន្ន»</div>
                  <div className="font-semibold text-slate-700 pt-1">Supported English Variations:</div>
                  <div className="text-slate-600 font-mono">• "Delete the plan titled Draft Marketing Test"</div>
                  <div className="text-slate-600 font-mono">• "Archive plan AP-2026-003"</div>
                  <div className="text-slate-600 font-mono">• "Remove the plan titled Temporary Initiative"</div>
                </div>
              </div>

              {/* Command 4: Query & Help */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-xs whitespace-nowrap">
                      4. QUERY & NAVIGATION (សាកសួរ និងស្វែងរក)
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Syntax</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    "What is the status of [Plan Name]" / «តើស្ថានភាពផែនការ [ឈ្មោះ] យ៉ាងណាដែរ»
                  </h4>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-700">Supported Khmer (ភាសាខ្មែរ) Variations:</div>
                  <div className="text-slate-600 font-mono">• «ស្វែងរកផែនការ ការពង្រីកសេវាធនាគារឌីជីថល»</div>
                  <div className="text-slate-600 font-mono">• «តើស្ថានភាពផែនការ ការពង្រីកសេវាធនាគារ យ៉ាងណាដែរ»</div>
                  <div className="text-slate-600 font-mono">• «ជំនួយ» ឬ «តើខ្ញុំអាចនិយាយអ្វីបានខ្លះ»</div>
                  <div className="font-semibold text-slate-700 pt-1">Supported English Variations:</div>
                  <div className="text-slate-600 font-mono">• "Search plan Core Banking Migration"</div>
                  <div className="text-slate-600 font-mono">• "What is the status of the Customer Portal Upgrade"</div>
                  <div className="text-slate-600 font-mono">• "Help" or "What can I say"</div>
                </div>
              </div>

              {/* Command 5: Create Activity / Task */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs whitespace-nowrap">
                      5. CREATE ACTIVITY / TASK (បង្កើតសកម្មភាព ឬកិច្ចការ)
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Syntax</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    "Create task [Task Name] in plan [Plan]" / «បង្កើតសកម្មភាពថ្មីឈ្មោះ [ឈ្មោះ] ក្នុងផែនការ [ផែនការ]»
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Creates an activity or sub-task directly linked to an action plan. Automatically extracts assignees, priority (Low, Medium, High, Urgent), start date, and due date.
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-700">Supported Khmer (ភាសាខ្មែរ) Variations:</div>
                  <div className="text-slate-600 font-mono">• «បង្កើតសកម្មភាពថ្មីឈ្មោះ រៀបចំរបាយការណ៍ហិរញ្ញវត្ថុ ក្នុងផែនការ AP-2026-001 អាទិភាពខ្ពស់»</div>
                  <div className="text-slate-600 font-mono">• «បន្ថែមសកម្មភាព រៀបចំកិច្ចប្រជុំត្រួតពិនិត្យ ក្នុងផែនការ ការពង្រីកសេវាធនាគារឌីជីថល»</div>
                  <div className="text-slate-600 font-mono">• «បង្កើតកិច្ចការ ធ្វើតេស្តសុវត្ថិភាព ក្នុងផែនការ AP-2026-002»</div>
                  <div className="font-semibold text-slate-700 pt-1">Supported English Variations:</div>
                  <div className="text-slate-600 font-mono">• "Create task Prepare Security Checklist in plan AP-2026-001 with high priority"</div>
                  <div className="text-slate-600 font-mono">• "Add activity Review API contracts in Digital Banking Expansion"</div>
                  <div className="text-slate-600 font-mono">• "Create task Database Migration in plan Cloud Infrastructure Migration"</div>
                </div>
              </div>

              {/* Command 6: Update / Complete Activity */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-xs whitespace-nowrap">
                      6. UPDATE & COMPLETE ACTIVITY (កែប្រែ ឬបញ្ចប់កិច្ចការ)
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Syntax</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    "Mark activity [Code] as completed" / «សម្គាល់សកម្មភាព [កូដ] ថាបានបញ្ចប់»
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Updates progress percentage, changes status, assigns staff members, or marks as complete. Automatically validates prerequisite dependency constraints before completion.
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-700">Supported Khmer (ភាសាខ្មែរ) Variations:</div>
                  <div className="text-slate-600 font-mono">• «សម្គាល់សកម្មភាព ACT-001 ថាបានបញ្ចប់» (កំណត់វឌ្ឍនភាព 100%)</div>
                  <div className="text-slate-600 font-mono">• «កំណត់វឌ្ឍនភាពសកម្មភាព ACT-001 ទៅ 75 ភាគរយ»</div>
                  <div className="text-slate-600 font-mono">• «កែប្រែសកម្មភាព ACT-002 ដោយស្ថានភាពកំពុងដំណើរការ»</div>
                  <div className="font-semibold text-slate-700 pt-1">Supported English Variations:</div>
                  <div className="text-slate-600 font-mono">• "Mark activity ACT-001 as completed" (Validates dependency chains)</div>
                  <div className="text-slate-600 font-mono">• "Set task ACT-001 progress to 80 percent"</div>
                  <div className="text-slate-600 font-mono">• "Update activity ACT-002 with status in progress"</div>
                </div>
              </div>

              {/* Command 7: Delete Activity */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-xs whitespace-nowrap">
                      7. DELETE ACTIVITY / TASK (លុបសកម្មភាព ឬកិច្ចការ)
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Syntax</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    "Delete activity [Code]" / «លុបសកម្មភាព [កូដ]»
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Removes an activity after verifying user permissions (super admin, admin, department manager, or creator) and confirming no blocking dependencies rely on it.
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-700">Supported Khmer (ភាសាខ្មែរ) Variations:</div>
                  <div className="text-slate-600 font-mono">• «លុបសកម្មភាព ACT-003»</div>
                  <div className="text-slate-600 font-mono">• «លុបកិច្ចការឈ្មោះ ធ្វើតេស្តសុវត្ថិភាពបឋម»</div>
                  <div className="font-semibold text-slate-700 pt-1">Supported English Variations:</div>
                  <div className="text-slate-600 font-mono">• "Delete activity ACT-003"</div>
                  <div className="text-slate-600 font-mono">• "Remove task titled Preliminary Security Audit"</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRAINING & SUPPORT (Point 6 from User Request) */}
          {activeTab === 'training' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-950">
                <h4 className="font-bold text-sm text-indigo-900 mb-1">
                  Employee Voice Command Training Lab
                </h4>
                <p className="text-indigo-800">
                  Welcome to voice training. This module familiarizes employees with voice input, verifies your microphone calibration, tests audio output synthesis, and checks parsing confidence.
                </p>
              </div>

              {/* Hardware & Speech Calibration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Microphone Calibration</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      voiceAssistant.isSpeechRecognitionSupported() 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {voiceAssistant.isSpeechRecognitionSupported() ? 'Web Speech API Supported' : 'Fallback Mode'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Test your headset or microphone. The visualizer shows decibel sensitivity in real-time.
                  </p>
                  <button
                    onClick={toggleListening}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      isListening ? 'bg-rose-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{isListening ? 'Stop Mic Test' : 'Start Mic Audio Test'}</span>
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Audio Feedback Synthesis</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                      SpeechSynthesis TTS
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Verify that your computer audio plays the confirmation feedback loud and clear.
                  </p>
                  <button
                    onClick={testAudioOutput}
                    className="w-full py-2 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition flex items-center justify-center space-x-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Test Voice Confirmation</span>
                  </button>
                </div>
              </div>

              {/* Guided Training Phrases */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Interactive Practice Phrases
                </h4>
                <div className="space-y-2">
                  {practicePhrases.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700 uppercase">
                            {item.category}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{item.title}</span>
                        </div>
                        <div className="text-xs font-mono text-blue-700 bg-blue-50/70 px-2.5 py-1 rounded-md border border-blue-100">
                          "{item.command}"
                        </div>
                        <p className="text-[11px] text-slate-500">{item.desc}</p>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('assistant');
                          setFinalTranscript(item.command);
                          handleExecuteVoiceCommand(item.command);
                        }}
                        className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 transition flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Practice Phrase</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TESTING & SANDBOX (Point 7 from User Request) */}
          {activeTab === 'sandbox' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 flex items-start space-x-3">
                <FlaskConical className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-900">
                    Voice Command Simulation Sandbox
                  </h4>
                  <p className="mt-0.5 text-emerald-800">
                    Test parsing accuracy, authorization guards, and database state updates without speaking out loud. Run simulation test cases to iterate and validate the system.
                  </p>
                </div>
              </div>

              {/* Sandbox Test Cases Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Test Case 1</span>
                  <h4 className="text-xs font-bold text-slate-800">Create Action Plan Test</h4>
                  <p className="text-[11px] text-slate-500">
                    Simulates voice input: <span className="font-mono">"Create a new plan titled Customer Data Platform Upgrade"</span>
                  </p>
                  <button
                    onClick={async () => {
                      const phrase = "Create a new plan titled Customer Data Platform Upgrade";
                      const parsed = voiceAssistant.parseCommand(phrase);
                      const res = await voiceAssistant.executeCommand(parsed, currentUser);
                      setSandboxResult(res);
                      if (onPlanMutated) onPlanMutated();
                    }}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                  >
                    Run Creation Test
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-blue-700 uppercase">Test Case 2</span>
                  <h4 className="text-xs font-bold text-slate-800">Update Progress & KPI Test</h4>
                  <p className="text-[11px] text-slate-500">
                    Simulates voice input: <span className="font-mono">"Update AP-2026-001 with progress 88 percent"</span>
                  </p>
                  <button
                    onClick={async () => {
                      const phrase = "Update AP-2026-001 with progress 88 percent";
                      const parsed = voiceAssistant.parseCommand(phrase);
                      const res = await voiceAssistant.executeCommand(parsed, currentUser);
                      setSandboxResult(res);
                      if (onPlanMutated) onPlanMutated();
                    }}
                    className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                  >
                    Run Progress Update Test
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-purple-700 uppercase">Test Case 3</span>
                  <h4 className="text-xs font-bold text-slate-800">Status Query Test</h4>
                  <p className="text-[11px] text-slate-500">
                    Simulates voice input: <span className="font-mono">"What is the status of the Digital Banking Expansion plan"</span>
                  </p>
                  <button
                    onClick={async () => {
                      const phrase = "What is the status of the Digital Banking Expansion plan";
                      const parsed = voiceAssistant.parseCommand(phrase);
                      const res = await voiceAssistant.executeCommand(parsed, currentUser);
                      setSandboxResult(res);
                    }}
                    className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition"
                  >
                    Run Query Test
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-rose-700 uppercase">Test Case 4</span>
                  <h4 className="text-xs font-bold text-slate-800">RBAC Permission Guard Test</h4>
                  <p className="text-[11px] text-slate-500">
                    Tests security boundary if a basic employee tries to delete or modify restricted plans.
                  </p>
                  <button
                    onClick={async () => {
                      // Mock test with Employee role to test guard
                      const mockEmp: User = { ...currentUser, role: 'Employee' };
                      const phrase = "Delete the plan titled Core Banking Migration";
                      const parsed = voiceAssistant.parseCommand(phrase);
                      const res = await voiceAssistant.executeCommand(parsed, mockEmp);
                      setSandboxResult(res);
                    }}
                    className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition"
                  >
                    Run Guard Test (Simulate Employee)
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 sm:col-span-2">
                  <span className="text-xs font-bold text-teal-700 uppercase">Test Case 5</span>
                  <h4 className="text-xs font-bold text-slate-800">Activity & Task Management Test</h4>
                  <p className="text-[11px] text-slate-500">
                    Simulates voice input: <span className="font-mono">"Mark activity ACT-001 as completed"</span> (validates dependencies and updates progress to 100%)
                  </p>
                  <button
                    onClick={async () => {
                      const firstAct = db.getActivities()[0];
                      const actCode = firstAct ? firstAct.code : 'ACT-001';
                      const phrase = `Mark activity ${actCode} as completed`;
                      const parsed = voiceAssistant.parseCommand(phrase);
                      const res = await voiceAssistant.executeCommand(parsed, currentUser);
                      setSandboxResult(res);
                      if (onPlanMutated) onPlanMutated();
                    }}
                    className="w-full py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition"
                  >
                    Run Task Completion Test
                  </button>
                </div>
              </div>

              {/* Sandbox Output Inspector */}
              {sandboxResult && (
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
                    <span>Sandbox Execution Result</span>
                    <span className={sandboxResult.success ? 'text-emerald-400' : 'text-rose-400'}>
                      {sandboxResult.success ? 'SUCCESS (200 OK)' : 'REJECTED / GUARDED'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Intent: </span>
                    <span className="text-blue-300 font-bold">{sandboxResult.intent}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Spoken Feedback: </span>
                    <span className="text-emerald-300">"{sandboxResult.spokenFeedback}"</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Display Message: </span>
                    <span>{sandboxResult.displayMessage}</span>
                  </div>
                  {sandboxResult.planId && (
                    <div>
                      <span className="text-slate-400">Target Plan ID: </span>
                      <span className="text-amber-300">{sandboxResult.planId}</span>
                    </div>
                  )}
                  {sandboxResult.activityId && (
                    <div>
                      <span className="text-slate-400">Target Activity ID: </span>
                      <span className="text-teal-300">{sandboxResult.activityId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: HISTORY & AUDIT LOG */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Voice Command Execution Log</h4>
                  <p className="text-[11px] text-slate-400">Real-time log of spoken instructions and outcomes</p>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      voiceAssistant.clearHistory();
                      setHistory([]);
                    }}
                    className="text-xs text-rose-600 hover:underline flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Log</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No voice commands executed in this session yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Speak commands using the microphone to populate history.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map(item => (
                    <div
                      key={item.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${
                            item.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.intent}
                          </span>
                          <span className="font-bold text-slate-800">{item.userName}</span>
                          <span className="text-slate-400 text-[10px]">({item.userRole})</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 font-mono bg-slate-50 px-2 py-1 rounded-sm border border-slate-100">
                        "{item.transcript}"
                      </div>

                      {(item.activityCode || item.activityTitle) && (
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-mono font-bold border border-teal-200">
                            {item.activityCode || 'Activity'}
                          </span>
                          {item.activityTitle && (
                            <span className="text-slate-700 font-medium truncate max-w-xs">
                              {item.activityTitle}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-slate-600 flex items-center space-x-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="italic text-[11px]">{item.spokenFeedback}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 sm:px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 text-xs shrink-0">
          <div className="flex items-center space-x-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Voice engine connected • Web Speech Recognition & Synthesis</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Voice PIN Verification Modal (Point 2 from User Request) */}
        {showPinModal && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Voice Authentication PIN</h3>
                <p className="text-xs text-slate-500">
                  Authenticate your session before modifying or deleting plans via voice.
                </p>
              </div>

              {pinError && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200 text-center">
                  {pinError}
                </div>
              )}

              <form onSubmit={handleVerifyPin} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                    Enter 4-Digit Security PIN
                  </label>
                  <input
                    type="password"
                    maxLength={10}
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    placeholder="e.g. 1234"
                    autoFocus
                    className="w-full text-center tracking-widest text-lg font-mono font-bold py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="block text-[11px] text-slate-400 text-center mt-1">
                    Default PIN is 1234 or your user password
                  </span>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPinModal(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                  >
                    Verify & Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
