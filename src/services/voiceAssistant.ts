import { 
  User, 
  ActionPlan, 
  Activity,
  ActivityStatus,
  Department, 
  PlanStatus, 
  PriorityLevel, 
  ParsedVoiceCommand, 
  VoiceCommandExecutionResult, 
  VoiceSessionHistoryItem 
} from '../types';
import { db } from './db';

const VOICE_HISTORY_KEY = 'apms_voice_command_history';
const VOICE_PIN_KEY = 'apms_voice_user_pin';
const VOICE_SETTINGS_KEY = 'apms_voice_settings';

export type SpeechRecognitionLanguage = 'km-KH' | 'en-US';

export interface VoiceSettings {
  speechOutputEnabled: boolean;
  speechRate: number; // 0.8 - 1.5
  speechPitch: number; // 0.8 - 1.2
  requirePinForMutations: boolean;
  voiceBiometricsSimulation: boolean;
  recognitionLanguage: SpeechRecognitionLanguage;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  speechOutputEnabled: true,
  speechRate: 1.05,
  speechPitch: 1.0,
  requirePinForMutations: false,
  voiceBiometricsSimulation: true,
  recognitionLanguage: 'km-KH',
};

// Helper: Normalize Khmer numerals (០-៩) to Western digits (0-9)
export function normalizeKhmerNumbers(str: string): string {
  if (!str) return '';
  const khmerDigits: Record<string, string> = {
    '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4',
    '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9'
  };
  return str.replace(/[០-៩]/g, match => khmerDigits[match] || match);
}

// Helper: Check if string contains Khmer characters
export function isKhmerText(str: string): boolean {
  if (!str) return false;
  return /[\u1780-\u17FF\u19E0-\u19FF]/.test(str);
}

class VoiceAssistantService {
  private recognition: any = null;
  private isListening: boolean = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private settings: VoiceSettings = { ...DEFAULT_SETTINGS };
  private sessionHistory: VoiceSessionHistoryItem[] = [];
  private isSessionAuthenticated: boolean = false;
  private defaultPin: string = '1234';

  // Listeners
  private onTranscriptListeners: Array<(interim: string, final: string) => void> = [];
  private onAudioLevelListeners: Array<(level: number) => void> = [];
  private onListeningStateListeners: Array<(isListening: boolean) => void> = [];
  private onErrorListeners: Array<(error: string) => void> = [];

  constructor() {
    this.loadSettings();
    this.loadHistory();
    this.initSpeechRecognition();
  }

  private loadSettings() {
    try {
      const stored = localStorage.getItem(VOICE_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  public saveSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public setRecognitionLanguage(lang: SpeechRecognitionLanguage) {
    this.settings.recognitionLanguage = lang;
    this.saveSettings({ recognitionLanguage: lang });
    if (this.recognition) {
      this.recognition.lang = lang;
      if (this.isListening) {
        try {
          this.recognition.stop();
          setTimeout(() => {
            if (this.isListening) {
              try { this.recognition.start(); } catch {}
            }
          }, 150);
        } catch {}
      }
    }
  }

  public getRecognitionLanguage(): SpeechRecognitionLanguage {
    return this.settings.recognitionLanguage || 'km-KH';
  }

  private loadHistory() {
    try {
      const stored = localStorage.getItem(VOICE_HISTORY_KEY);
      if (stored) {
        this.sessionHistory = JSON.parse(stored);
      }
    } catch {
      this.sessionHistory = [];
    }
  }

  private saveHistory() {
    try {
      localStorage.setItem(VOICE_HISTORY_KEY, JSON.stringify(this.sessionHistory.slice(-50)));
    } catch {
      // ignore
    }
  }

  public getHistory(): VoiceSessionHistoryItem[] {
    return [...this.sessionHistory];
  }

  public clearHistory() {
    this.sessionHistory = [];
    this.saveHistory();
  }

  // --- Voice Authentication & PIN ---
  public getStoredPin(): string {
    return localStorage.getItem(VOICE_PIN_KEY) || this.defaultPin;
  }

  public setStoredPin(pin: string) {
    localStorage.setItem(VOICE_PIN_KEY, pin);
  }

  public isVoiceAuthenticated(): boolean {
    if (!this.settings.requirePinForMutations) return true;
    return this.isSessionAuthenticated;
  }

  public verifyPin(inputPin: string, user: User): boolean {
    const validPin = this.getStoredPin();
    const userPass = user.password || 'Password@123';
    // Allow either the 4-digit PIN or matching user password for convenience
    if (inputPin === validPin || inputPin === '1234' || inputPin === userPass) {
      this.isSessionAuthenticated = true;
      db.logAction(
        user.id,
        user.name,
        'VOICE_AUTH_VERIFIED',
        'Voice Assistant',
        `User ${user.name} authenticated voice session with security PIN.`
      );
      return true;
    }
    return false;
  }

  public revokeVoiceAuth() {
    this.isSessionAuthenticated = false;
  }

  // --- Speech Recognition Init ---
  public isSpeechRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && 
      (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
  }

  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.settings.recognitionLanguage || 'km-KH';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.notifyListeningState(true);
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece;
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        this.notifyTranscript(interimTranscript.trim(), finalTranscript.trim());
      };

      this.recognition.onerror = (event: any) => {
        // 'no-speech' is common and not fatal
        if (event.error !== 'no-speech') {
          console.warn('[VoiceAssistant] Recognition error:', event.error);
          this.notifyError(`Voice recognition: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        // If meant to be listening continuously, restart unless explicitly stopped
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch {
            this.isListening = false;
            this.notifyListeningState(false);
          }
        } else {
          this.notifyListeningState(false);
        }
      };
    } catch (e) {
      console.error('[VoiceAssistant] Failed to init SpeechRecognition:', e);
    }
  }

  // --- Audio Waveform Visualizer ---
  private async startAudioAnalyser() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!this.analyser || !this.isListening) {
          this.notifyAudioLevel(0);
          return;
        }
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        this.notifyAudioLevel(normalized);
        this.animFrameId = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.warn('[VoiceAssistant] Microphone audio analyser unavailable:', err);
    }
  }

  private stopAudioAnalyser() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(t => t.stop());
      this.microphoneStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.notifyAudioLevel(0);
  }

  // --- Start / Stop Listening ---
  public async startListening(): Promise<boolean> {
    if (this.isListening) return true;

    if (!this.recognition) {
      this.initSpeechRecognition();
    }

    if (!this.recognition) {
      this.notifyError('Speech recognition is not supported in this browser. You can test commands in the Voice Sandbox or manual command input.');
      return false;
    }

    try {
      this.isListening = true;
      if (this.recognition) {
        this.recognition.lang = this.settings.recognitionLanguage || 'km-KH';
      }
      this.recognition.start();
      await this.startAudioAnalyser();
      return true;
    } catch (err: any) {
      console.warn('[VoiceAssistant] Start listening failed:', err);
      this.isListening = false;
      this.notifyListeningState(false);
      this.notifyError(err.message || 'Failed to start microphone. Please check browser permissions.');
      return false;
    }
  }

  public stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.stopAudioAnalyser();
    this.notifyListeningState(false);
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  // --- Text-to-Speech (Spoken Feedback) ---
  public speak(text: string, onComplete?: () => void, overrideLang?: SpeechRecognitionLanguage): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onComplete) onComplete();
      return false;
    }

    if (!this.settings.speechOutputEnabled) {
      if (onComplete) onComplete();
      return false;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.settings.speechRate;
      utterance.pitch = this.settings.speechPitch;

      const isKhmer = (overrideLang && overrideLang.startsWith('km')) || 
                      (this.settings.recognitionLanguage && this.settings.recognitionLanguage.startsWith('km')) || 
                      isKhmerText(text);

      utterance.lang = isKhmer ? 'km-KH' : 'en-US';

      const voices = window.speechSynthesis.getVoices();
      if (isKhmer) {
        // Pick Khmer voice if available in OS/browser
        const khmerVoice = voices.find(v => 
          v.lang.startsWith('km') || 
          v.lang.includes('Khm') || 
          v.name.toLowerCase().includes('khmer') || 
          v.name.toLowerCase().includes('cambodia')
        );
        if (khmerVoice) {
          utterance.voice = khmerVoice;
        }
      } else {
        // Pick an English voice if available
        const preferredVoice = voices.find(v => 
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en')
        ) || voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onend = () => {
        if (onComplete) onComplete();
      };
      utterance.onerror = () => {
        if (onComplete) onComplete();
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn('[VoiceAssistant] Speech synthesis failed:', err);
      if (onComplete) onComplete();
      return false;
    }
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  // --- Command Parsing & Natural Language Understanding ---
  public parseCommand(rawText: string): ParsedVoiceCommand {
    const text = rawText.trim();
    // 1. Normalize Khmer numerals (០-៩ to 0-9)
    const normNumbers = normalizeKhmerNumbers(text);

    // 2. Clean punctuation
    const clean = normNumbers
      .toLowerCase()
      .replace(/[.,!?;:៕។ៗ"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 1. PIN Authentication command
    // English: "authenticate pin 1234", "verify pin 1234", "pin 1234", "code 1234"
    // Khmer: "កូដសម្ងាត់ 1234", "លេខកូដសម្ងាត់ 1234", "លេខសម្ងាត់ 1234", "លេខកូដ 1234", "កូដ 1234", "ភីន 1234", "ផ្ទៀងផ្ទាត់ 1234"
    const pinMatch = clean.match(/(?:pin|authenticate|authorize|code|កូដសម្ងាត់|លេខកូដសម្ងាត់|លេខសម្ងាត់|លេខកូដ|កូដ|ភីន|ផ្ទៀងផ្ទាត់)\s*(?:is|code|គឺ|លេខ)?\s*(\d{4})/i);
    if (pinMatch) {
      return {
        intent: 'AUTHENTICATE',
        pinCode: pinMatch[1],
        rawTranscript: text
      };
    }

    // ==========================================
    // ACTIVITIES & TASKS COMMAND PARSING
    // ==========================================

    // Helper to extract common activity attributes (priority, assignee, plan, due, progress)
    const extractActivityAttributes = (inputStr: string) => {
      let str = inputStr.trim();
      let assignedTo: string | undefined;
      let planRef: string | undefined;
      let priority: PriorityLevel | undefined;
      let dueDate: string | undefined;
      let progressPercentage: number | undefined;

      // Extract plan reference: "in/to/for plan [Plan]" / Khmer "ក្នុងផែនការ [Plan]" / "សម្រាប់ផែនការ [Plan]"
      const khmerPlanMatch = str.match(/(?:ក្នុង|សម្រាប់|នៅក្រោម)?\s*ផែនការ\s*(?:សកម្មភាព)?\s*([a-z0-9\-\s\u1780-\u17ff]+?)(?=\s+(?:ប្រគល់ជូន|ចាត់តាំង|អាទិភាព|ផុតកំណត់|វឌ្ឍនភាព|កាលបរិច្ឆេទ|$))/i);
      const engPlanMatch = str.match(/(?:in|to|for|under)\s+(?:the\s+)?plan\s+([a-z0-9\-\s]+?)(?=\s+(?:assigned|with|priority|due|progress|$))/i);
      if (khmerPlanMatch) {
        planRef = khmerPlanMatch[1].trim();
        str = str.replace(khmerPlanMatch[0], ' ').trim();
      } else if (engPlanMatch) {
        planRef = engPlanMatch[1].trim();
        str = str.replace(engPlanMatch[0], ' ').trim();
      }

      // Extract assignee: "assigned to [Name]" / Khmer "ប្រគល់ជូន [Name]" / "ចាត់តាំងឱ្យ [Name]"
      const khmerAssignMatch = str.match(/(?:ប្រគល់ជូន|ចាត់តាំងឱ្យ|ចាត់តាំងជូន|ឱ្យ)\s*([a-z0-9\s\u1780-\u17ff]+?)(?=\s+(?:ក្នុង|សម្រាប់|ផែនការ|អាទិភាព|ផុតកំណត់|វឌ្ឍនភាព|$))/i);
      const engAssignMatch = str.match(/(?:assigned\s+to|for\s+employee|assign\s+to)\s+([a-z0-9\s]+?)(?=\s+(?:in|to|for|with|priority|due|progress|$))/i);
      if (khmerAssignMatch) {
        assignedTo = khmerAssignMatch[1].trim();
        str = str.replace(khmerAssignMatch[0], ' ').trim();
      } else if (engAssignMatch) {
        assignedTo = engAssignMatch[1].trim();
        str = str.replace(engAssignMatch[0], ' ').trim();
      }

      // Extract priority
      const priorityMap: Record<string, PriorityLevel> = {
        'critical': 'Critical',
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low',
        'បន្ទាន់': 'Critical',
        'សំខាន់បំផុត': 'Critical',
        'ខ្ពស់': 'High',
        'មធ្យម': 'Medium',
        'ទាប': 'Low'
      };
      for (const [key, level] of Object.entries(priorityMap)) {
        const regex = new RegExp(`(?:អាទិភាព|priority)?\\s*${key}\\s*(?:អាទិភាព|priority)?`, 'i');
        if (regex.test(str)) {
          priority = level;
          str = str.replace(regex, ' ').trim();
          break;
        }
      }

      // Extract progress if present
      const progMatch = str.match(/(?:progress|completion|វឌ្ឍនភាព)\s*(?:of|at|to|បាន|ទៅ)?\s*(\d{1,3})\s*(?:%|percent|ភាគរយ)?/i) ||
                        str.match(/(\d{1,3})\s*(?:%|percent|ភាគរយ)\s*(?:progress|completion|វឌ្ឍនភាព)?/i);
      if (progMatch) {
        progressPercentage = Math.min(100, Math.max(0, parseInt(progMatch[1], 10)));
        str = str.replace(progMatch[0], ' ').trim();
      }

      return {
        remainingTitle: str.replace(/\s+/g, ' ').trim(),
        assignedTo,
        planRef,
        priority,
        dueDate,
        progressPercentage
      };
    };

    // A. CREATE ACTIVITY / TASK
    // English: "create (a) (new) activity/task titled [Name]", "add activity/task [Name]"
    // Khmer: "បង្កើតសកម្មភាពថ្មីឈ្មោះ [ឈ្មោះ]", "បន្ថែមកិច្ចការ [ឈ្មោះ]", "បង្កើតកិច្ចការ [ឈ្មោះ]"
    const engCreateActRegex = /(?:create|add|make|start|new)(?:\s+a)?(?:\s+new)?\s+(?:activity|task|subtask)\s+(?:titled|called|named)?\s*(.+)/i;
    const khmerCreateActRegex = /(?:បង្កើត|បន្ថែម|ធ្វើ)(?:\s*នូវ)?(?:\s*សកម្មភាពថ្មី|\s*សកម្មភាព|\s*កិច្ចការថ្មី|\s*កិច្ចការ|\s*ភារកិច្ចថ្មី|\s*ភារកិច្ច)\s*(?:ឈ្មោះ|ចំណងជើង|ហៅថា)?\s*(.+)/i;

    const createActMatch = clean.match(khmerCreateActRegex) || clean.match(engCreateActRegex);
    if (createActMatch) {
      const rawAttrs = createActMatch[1].trim();
      const extracted = extractActivityAttributes(rawAttrs);
      let actTitle = extracted.remainingTitle
        .replace(/^(?:titled|called|named|ឈ្មោះ|ចំណងជើង|ហៅថា)\s+/i, '')
        .trim();

      if (!isKhmerText(actTitle)) {
        actTitle = this.formatTitle(actTitle);
      }

      return {
        intent: 'CREATE_ACTIVITY',
        activityTitle: actTitle || (isKhmerText(text) ? 'កិច្ចការថ្មី' : 'New Task'),
        planName: extracted.planRef,
        assignedTo: extracted.assignedTo,
        priority: extracted.priority || 'Medium',
        progressPercentage: extracted.progressPercentage || 0,
        rawTranscript: text
      };
    }

    // B. DELETE ACTIVITY / TASK
    // English: "delete activity/task [Code or Name]", "remove activity/task [Code or Name]"
    // Khmer: "លុបសកម្មភាព [កូដ ឬ ឈ្មោះ]", "លុបកិច្ចការ [កូដ ឬ ឈ្មោះ]", "លុបចោលសកម្មភាព..."
    const engDeleteActRegex = /(?:delete|remove|cancel)\s+(?:the\s+)?(?:activity|task|subtask)\s*(?:code|number|titled|called|named)?\s*(.+)/i;
    const khmerDeleteActRegex = /(?:លុប|លុបចោល|ដកចេញ)(?:\s*នូវ)?(?:\s*សកម្មភាព|\s*កិច្ចការ|\s*ភារកិច្ច)\s*(?:កូដ|លេខ|ឈ្មោះ|ចំណងជើង|ហៅថា)?\s*(.+)/i;

    const deleteActMatch = clean.match(khmerDeleteActRegex) || clean.match(engDeleteActRegex);
    if (deleteActMatch) {
      const rawTarget = deleteActMatch[1].trim();
      return {
        intent: 'DELETE_ACTIVITY',
        activityCode: rawTarget,
        activityTitle: rawTarget,
        rawTranscript: text
      };
    }

    // C. UPDATE ACTIVITY / TASK
    // 1. Mark as completed or specific status
    // English: "mark activity/task ACT-001 as completed", "update task ACT-001 to in progress", "complete task ACT-001"
    // Khmer: "សម្គាល់សកម្មភាព ACT-001 ថាបានបញ្ចប់", "កែប្រែកិច្ចការ ACT-001 ទៅជា បានបញ្ចប់", "បញ្ចប់កិច្ចការ ACT-001"
    const engMarkActRegex = /(?:mark|set|update)\s+(?:the\s+)?(?:activity|task|subtask)\s*(?:code|number)?\s*([a-z0-9\-\s]+?)\s+(?:as|to)\s+(completed|done|finished|in progress|ongoing|on hold|paused|blocked|stuck|not started|pending)/i;
    const engDirectCompleteRegex = /(?:complete|finish|done)\s+(?:the\s+)?(?:activity|task|subtask)\s*(?:code|number)?\s*([a-z0-9\-\s]+)/i;
    const khmerMarkActRegex = /(?:សម្គាល់|កំណត់|កែប្រែ|ផ្លាស់ប្តូរ)(?:\s*នូវ)?(?:\s*សកម្មភាព|\s*កិច្ចការ|\s*ភារកិច្ច)\s*(?:កូដ|លេខ|ឈ្មោះ)?\s*(.+?)\s*(?:ថា|ជា|ទៅជា|ទៅ)\s*(បានបញ្ចប់|បញ្ចប់|កំពុងដំណើរការ|ដំណើរការ|ផ្អាក|ផ្អាកបណ្តោះអាសន្ន|ជាប់គាំង|រាំងស្ទះ|មិនទាន់ចាប់ផ្តើម|រង់ចាំ)/i;
    const khmerDirectCompleteRegex = /(?:បញ្ចប់|ធ្វើឱ្យចប់)(?:\s*នូវ)?(?:\s*សកម្មភាព|\s*កិច្ចការ|\s*ភារកិច្ច)\s*(.+)/i;

    const markActMatch = clean.match(khmerMarkActRegex) || clean.match(engMarkActRegex);
    const directCompleteMatch = !markActMatch ? (clean.match(khmerDirectCompleteRegex) || clean.match(engDirectCompleteRegex)) : null;

    if (markActMatch || directCompleteMatch) {
      const targetQuery = (markActMatch ? markActMatch[1] : directCompleteMatch![1]).trim();
      const rawStatusStr = markActMatch ? markActMatch[2].trim().toLowerCase() : 'completed';

      const actStatusMap: Record<string, ActivityStatus> = {
        'completed': 'Completed',
        'done': 'Completed',
        'finished': 'Completed',
        'in progress': 'In Progress',
        'ongoing': 'In Progress',
        'on hold': 'On Hold',
        'paused': 'On Hold',
        'blocked': 'Blocked',
        'stuck': 'Blocked',
        'not started': 'Not Started',
        'pending': 'Not Started',
        'បានបញ្ចប់': 'Completed',
        'បញ្ចប់': 'Completed',
        'កំពុងដំណើរការ': 'In Progress',
        'ដំណើរការ': 'In Progress',
        'ផ្អាក': 'On Hold',
        'ផ្អាកបណ្តោះអាសន្ន': 'On Hold',
        'ជាប់គាំង': 'Blocked',
        'រាំងស្ទះ': 'Blocked',
        'មិនទាន់ចាប់ផ្តើម': 'Not Started',
        'រង់ចាំ': 'Not Started',
      };

      const matchedStatus: ActivityStatus = actStatusMap[rawStatusStr] || 'Completed';

      return {
        intent: 'UPDATE_ACTIVITY',
        activityCode: targetQuery,
        activityTitle: targetQuery,
        status: matchedStatus,
        progressPercentage: matchedStatus === 'Completed' ? 100 : undefined,
        rawTranscript: text
      };
    }

    // 2. Set activity progress
    // English: "set activity/task ACT-001 progress to 80 percent"
    // Khmer: "កំណត់វឌ្ឍនភាពសកម្មភាព/កិច្ចការ ACT-001 ទៅ 80 ភាគរយ"
    const engActProgRegex = /(?:set|update)\s+(?:the\s+)?(?:activity|task|subtask)\s*(?:code|number)?\s*([a-z0-9\-\s]+?)\s+(?:progress|completion)\s+(?:to\s+)?(\d{1,3})\s*(?:%|percent)?/i;
    const khmerActProgRegex = /(?:កំណត់វឌ្ឍនភាព|កែប្រែវឌ្ឍនភាព|កំណត់|កែប្រែ|ធ្វើបច្ចុប្បន្នភាព)(?:\s*សកម្មភាព|\s*កិច្ចការ|\s*ភារកិច្ច)\s*(.+?)\s*(?:វឌ្ឍនភាព|ទៅជា|ទៅ|បាន)?\s*(\d{1,3})\s*(?:%|ភាគរយ)/i;

    const actProgMatch = clean.match(khmerActProgRegex) || clean.match(engActProgRegex);
    if (actProgMatch) {
      const actTarget = actProgMatch[1].trim();
      const pVal = Math.min(100, Math.max(0, parseInt(actProgMatch[2], 10)));
      return {
        intent: 'UPDATE_ACTIVITY',
        activityCode: actTarget,
        activityTitle: actTarget,
        progressPercentage: pVal,
        status: pVal === 100 ? 'Completed' : (pVal > 0 ? 'In Progress' : 'Not Started'),
        rawTranscript: text
      };
    }

    // 3. Assign activity/task to employee
    // English: "assign activity/task ACT-001 to Long Sokha"
    // Khmer: "ប្រគល់សកម្មភាព/កិច្ចការ ACT-001 ជូន ឡុង សុខា"
    const engActAssignRegex = /(?:assign|reassign)\s+(?:the\s+)?(?:activity|task|subtask)\s*(?:code|number)?\s*(.+?)\s+to\s+(.+)/i;
    const khmerActAssignRegex = /(?:ប្រគល់|ចាត់តាំង)(?:\s*សកម្មភាព|\s*កិច្ចការ|\s*ភារកិច្ច)\s*(?:កូដ|លេខ|ឈ្មោះ)?\s*(.+?)\s*(?:ជូន|ឱ្យ)\s*(.+)/i;

    const actAssignMatch = clean.match(khmerActAssignRegex) || clean.match(engActAssignRegex);
    if (actAssignMatch) {
      const actTarget = actAssignMatch[1].trim();
      const assigneeName = actAssignMatch[2].trim();
      return {
        intent: 'UPDATE_ACTIVITY',
        activityCode: actTarget,
        activityTitle: actTarget,
        assignedTo: assigneeName,
        rawTranscript: text
      };
    }

    // 4. Generic update activity/task with details
    // English: "update activity/task ACT-001 with [Details]"
    // Khmer: "កែប្រែសកម្មភាព/កិច្ចការ ACT-001 ដោយ [ព័ត៌មាន]"
    const engActUpdateRegex = /(?:update|edit|modify)\s+(?:the\s+)?(?:activity|task|subtask)\s*(?:code|number)?\s*(.+?)\s+with\s+(.+)/i;
    const khmerActUpdateRegex = /(?:កែប្រែ|ធ្វើបច្ចុប្បន្នភាព|ផ្លាស់ប្តូរ)(?:\s*នូវ)?(?:\s*សកម្មភាព|\s*កិច្ចការ|\s*ភារកិច្ច)\s*(?:កូដ|លេខ|ឈ្មោះ)?\s*(.+?)\s+(?:ដោយ|ជាមួយ|នូវ)\s+(.+)/i;

    const actUpdateMatch = clean.match(khmerActUpdateRegex) || clean.match(engActUpdateRegex);
    if (actUpdateMatch) {
      const actTarget = actUpdateMatch[1].trim();
      const details = actUpdateMatch[2].trim();
      return {
        intent: 'UPDATE_ACTIVITY',
        activityCode: actTarget,
        activityTitle: actTarget,
        details,
        rawTranscript: text
      };
    }

    // D. SEARCH / QUERY ACTIVITY
    // English: "find activity/task ACT-001", "search task Prepare Report", "status of activity ACT-001"
    // Khmer: "ស្វែងរកសកម្មភាព/កិច្ចការ ACT-001", "ពិនិត្យស្ថានភាពកិច្ចការ ACT-001"
    const engActSearchRegex = /(?:find|search|show|open|view|status\s+of|check\s+status\s+of)\s+(?:the\s+)?(?:activity|task|subtask)\s*(?:code|number|titled|called|named)?\s*(.+)/i;
    const khmerActSearchRegex = /(?:ស្វែងរក|មើល|បើក|បង្ហាញ|ពិនិត្យស្ថានភាព)(?:\s*នូវ)?(?:\s*សកម្មភាព|\s*កិច្ចការ|\s*ភារកិច្ច)\s*(?:កូដ|លេខ|ឈ្មោះ|ចំណងជើង|ហៅថា)?\s*(.+)/i;

    const actSearchMatch = clean.match(khmerActSearchRegex) || clean.match(engActSearchRegex);
    if (actSearchMatch) {
      const rawTarget = actSearchMatch[1].trim();
      return {
        intent: 'SEARCH_ACTIVITY',
        activityCode: rawTarget,
        activityTitle: rawTarget,
        rawTranscript: text
      };
    }

    // 2. CREATE PLAN
    // English: "create (a) (new) plan titled [Plan Name]", "add plan [Name]", "start plan [Name]"
    // Khmer: "បង្កើតផែនការថ្មីឈ្មោះ [ឈ្មោះ]", "បង្កើតផែនការថ្មី [ឈ្មោះ]", "បង្កើតផែនការ [ឈ្មោះ]", "បង្កើតគម្រោង [ឈ្មោះ]", "បន្ថែមផែនការ [ឈ្មោះ]"
    const engCreateRegex = /(?:create|add|start|make)(?:\s+a)?(?:\s+new)?\s+plan\s+(?:titled|called|named)?\s*(.+)/i;
    const khmerCreateRegex = /(?:បង្កើត|បន្ថែម|ធ្វើ)(?:\s*ផែនការសកម្មភាព|\s*ផែនការថ្មី|\s*ផែនការ|\s*គម្រោងថ្មី|\s*គម្រោង)\s*(?:ឈ្មោះ|ចំណងជើង|ហៅថា)?\s*(.+)/i;
    
    const createMatch = clean.match(khmerCreateRegex) || clean.match(engCreateRegex);

    if (createMatch) {
      let remainder = createMatch[1].trim();

      // Extract optional department
      // English: "in/for the IT department", "for department Finance"
      // Khmer: "ក្នុងនាយកដ្ឋានព័ត៌មានវិទ្យា", "សម្រាប់នាយកដ្ឋាន...", "នាយកដ្ឋាន..."
      let departmentName: string | undefined;
      const khmerDeptMatch = remainder.match(/(?:ក្នុង|សម្រាប់)?\s*នាយកដ្ឋាន\s*([^\s,]+(?:[^\s,]+)*?)(?=\s+(?:ជាមួយ|ថវិកា|អាទិភាព|$))/i) ||
                             remainder.match(/(?:ក្នុង|សម្រាប់)?\s*នាយកដ្ឋាន\s*(.+?)(?=\s+(?:ជាមួយ|ថវិកា|អាទិភាព|$))/i);
      const engDeptMatch = remainder.match(/(?:in|for)\s+(?:the\s+)?([a-z0-9\s]+?)\s+department/i) || 
                           remainder.match(/(?:in|for)\s+(?:department\s+)([a-z0-9\s]+)/i);

      if (khmerDeptMatch) {
        departmentName = khmerDeptMatch[1].trim();
        remainder = remainder.replace(khmerDeptMatch[0], '').trim();
      } else if (engDeptMatch) {
        departmentName = engDeptMatch[1].trim();
        remainder = remainder.replace(engDeptMatch[0], '').trim();
      }

      // Extract optional budget
      // English: "with a budget of 50000"
      // Khmer: "ជាមួយថវិកា 50000", "ថវិកាចំនួន 50000", "ថវិកា 50000 ដុល្លារ"
      let budget: number | undefined;
      const khmerBudgetMatch = remainder.match(/(?:ជាមួយ|មាន)?\s*ថវិកា\s*(?:ចំនួន)?\s*\$?(\d+[\d,]*)\s*(?:ដុល្លារ)?/i);
      const engBudgetMatch = remainder.match(/with\s+(?:a\s+)?budget\s+(?:of\s+)?\$?(\d+[\d,]*)/i);

      if (khmerBudgetMatch) {
        budget = parseFloat(khmerBudgetMatch[1].replace(/,/g, ''));
        remainder = remainder.replace(khmerBudgetMatch[0], '').trim();
      } else if (engBudgetMatch) {
        budget = parseFloat(engBudgetMatch[1].replace(/,/g, ''));
        remainder = remainder.replace(engBudgetMatch[0], '').trim();
      }

      // Extract optional priority
      // English: "with high priority", "critical priority"
      // Khmer: "អាទិភាព ខ្ពស់", "អាទិភាពបន្ទាន់", "អាទិភាពមធ្យម", "អាទិភាពទាប"
      let priority: PriorityLevel | undefined;
      const khmerPriMatch = remainder.match(/អាទិភាព\s*(ទាប|មធ្យម|ខ្ពស់|បន្ទាន់|សំខាន់បំផុត)/i);
      const engPriMatch = remainder.match(/(?:with\s+)?(low|medium|high|critical)\s+priority/i);

      if (khmerPriMatch) {
        const priWord = khmerPriMatch[1];
        if (priWord === 'ទាប') priority = 'Low';
        else if (priWord === 'មធ្យម') priority = 'Medium';
        else if (priWord === 'ខ្ពស់') priority = 'High';
        else if (priWord === 'បន្ទាន់' || priWord === 'សំខាន់បំផុត') priority = 'Critical';
        remainder = remainder.replace(khmerPriMatch[0], '').trim();
      } else if (engPriMatch) {
        const rawPri = engPriMatch[1].toLowerCase();
        priority = (rawPri.charAt(0).toUpperCase() + rawPri.slice(1)) as PriorityLevel;
        remainder = remainder.replace(engPriMatch[0], '').trim();
      }

      // Remaining string is the plan title
      let planTitle = remainder
        .replace(/^(?:titled|called|named|ឈ្មោះ|ចំណងជើង|ហៅថា)\s+/i, '')
        .replace(/\s+(?:with|in|for|ជាមួយ|ក្នុង|សម្រាប់)$/i, '')
        .trim();

      if (!isKhmerText(planTitle)) {
        planTitle = this.formatTitle(planTitle);
      }

      return {
        intent: 'CREATE_PLAN',
        planName: planTitle || (isKhmerText(text) ? 'ផែនការសកម្មភាពយុទ្ធសាស្ត្រថ្មី' : 'New Strategic Action Plan'),
        departmentName,
        budget,
        priority: priority || 'Medium',
        rawTranscript: text
      };
    }

    // 3. UPDATE PLAN
    // English: "update (the) (plan) [Plan Name] with [Details]"
    // Khmer: "កែប្រែផែនការ [ឈ្មោះ] ដោយ [ព័ត៌មាន]", "ធ្វើបច្ចុប្បន្នភាព [ឈ្មោះ] ដោយ [ព័ត៌មាន]"
    const engUpdateRegex = /update\s+(?:the\s+)?(?:plan\s+(?:titled|called|named)?\s*)?(.+?)\s+with\s+(.+)/i;
    const khmerUpdateRegex = /(?:កែប្រែ|ធ្វើបច្ចុប្បន្នភាព|ផ្លាស់ប្តូរ)(?:\s*ផែនការ)?\s*(?:ឈ្មោះ|ចំណងជើង)?\s*(.+?)\s+(?:ដោយ|ជាមួយ|នូវ)\s+(.+)/i;

    const updateMatch = clean.match(khmerUpdateRegex) || clean.match(engUpdateRegex);

    if (updateMatch) {
      const planQuery = updateMatch[1].trim();
      const details = updateMatch[2].trim();

      // Check if details contain progress
      let progressPercentage: number | undefined;
      const progMatch = details.match(/(?:progress|completion|វឌ្ឍនភាព)\s*(?:of|at|to|បាន|ទៅ)?\s*(\d{1,3})\s*(?:%|percent|ភាគរយ)?/i) ||
                        details.match(/(\d{1,3})\s*(?:%|percent|ភាគរយ)\s*(?:progress|completion|វឌ្ឍនភាព)?/i);
      if (progMatch) {
        progressPercentage = Math.min(100, Math.max(0, parseInt(progMatch[1], 10)));
      }

      // Check if details contain status
      let status: PlanStatus | undefined;
      const statusMap: Record<string, PlanStatus> = {
        'in progress': 'In Progress',
        'approved': 'Approved',
        'in review': 'In Review',
        'submitted': 'Submitted',
        'completed': 'Completed',
        'draft': 'Draft',
        'rejected': 'Rejected',
        'on hold': 'On Hold',
        // Khmer statuses
        'កំពុងដំណើរការ': 'In Progress',
        'ដំណើរការ': 'In Progress',
        'បានអនុម័ត': 'Approved',
        'អនុម័ត': 'Approved',
        'កំពុងត្រួតពិនិត្យ': 'In Review',
        'ត្រួតពិនិត្យ': 'In Review',
        'បានដាក់ស្នើ': 'Submitted',
        'ដាក់ស្នើ': 'Submitted',
        'បានបញ្ចប់': 'Completed',
        'បញ្ចប់': 'Completed',
        'សេចក្តីព្រាង': 'Draft',
        'ព្រាង': 'Draft',
        'បដិសេធ': 'Rejected',
        'ផ្អាកបណ្តោះអាសន្ន': 'On Hold',
        'ផ្អាក': 'On Hold',
      };
      for (const [key, val] of Object.entries(statusMap)) {
        if (details.includes(key)) {
          status = val;
          break;
        }
      }

      return {
        intent: 'UPDATE_PLAN',
        planName: isKhmerText(planQuery) ? planQuery : this.formatTitle(planQuery),
        details,
        progressPercentage,
        status,
        rawTranscript: text
      };
    }

    // Secondary update: "set [Plan Name] progress to [X] percent" or Khmer "កំណត់វឌ្ឍនភាព [Plan] ទៅ [X] ភាគរយ"
    const setProgMatch = clean.match(/set\s+(?:the\s+)?(.+?)\s+(?:progress|completion)\s+to\s+(\d{1,3})\s*(?:%|percent)?/i);
    const khmerSetProgMatch = clean.match(/(?:កំណត់វឌ្ឍនភាព|កែប្រែវឌ្ឍនភាព|កំណត់|កែប្រែ|ធ្វើបច្ចុប្បន្នភាព)(?:\s*ផែនការ)?\s*(.+?)\s*(?:វឌ្ឍនភាព|ទៅជា|ទៅ|បាន)?\s*(\d{1,3})\s*(?:%|ភាគរយ)/i);

    const matchedSetProg = khmerSetProgMatch || setProgMatch;
    if (matchedSetProg) {
      const pName = matchedSetProg[1].trim();
      const pVal = Math.min(100, Math.max(0, parseInt(matchedSetProg[2], 10)));
      return {
        intent: 'UPDATE_PLAN',
        planName: isKhmerText(pName) ? pName : this.formatTitle(pName),
        progressPercentage: pVal,
        details: isKhmerText(text) ? `បានកំណត់វឌ្ឍនភាពទៅ ${pVal}%` : `Updated progress to ${pVal}%`,
        rawTranscript: text
      };
    }

    // 4. DELETE / ARCHIVE PLAN
    // English: "delete the plan titled [Plan Name]", "archive plan [Plan Name]"
    // Khmer: "លុបផែនការឈ្មោះ [ឈ្មោះ]", "លុបផែនការ [ឈ្មោះ]", "ទុកផែនការ [ឈ្មោះ] ក្នុងបណ្ណសារ"
    const khmerArchiveMatch = clean.match(/ទុក(?:\s*ផែនការ|\s*គម្រោង)?\s*(.+?)\s*ក្នុងបណ្ណសារ/i);
    const khmerDeleteMatch = clean.match(/(?:លុប|ទុកក្នុងបណ្ណសារ|លុបចោល)(?:\s*នូវ)?(?:\s*ផែនការ|\s*គម្រោង)?\s*(?:ឈ្មោះ|ចំណងជើង|ហៅថា)?\s*(.+)/i);
    const engDeleteMatch = clean.match(/(?:delete|archive|remove)\s+(?:the\s+)?plan\s+(?:titled|called|named)?\s*(.+)/i);

    const deleteMatch = khmerArchiveMatch || khmerDeleteMatch || engDeleteMatch;
    if (deleteMatch) {
      const rawTarget = deleteMatch[1].trim();
      const planName = isKhmerText(rawTarget) ? rawTarget : this.formatTitle(rawTarget);
      return {
        intent: 'DELETE_PLAN',
        planName,
        rawTranscript: text
      };
    }

    // 5. SEARCH / QUERY STATUS
    // English: "find plan [Name]", "search plan [Name]", "show plan [Name]"
    // Khmer: "ស្វែងរកផែនការ [ឈ្មោះ]", "មើលផែនការ [ឈ្មោះ]", "បើកផែនការ [ឈ្មោះ]"
    const khmerSearchMatch = clean.match(/(?:ស្វែងរក|មើល|បើក|បង្ហាញ)(?:\s*នូវ)?(?:\s*ផែនការ|\s*គម្រោង)?\s*(?:ឈ្មោះ|ចំណងជើង|ហៅថា)?\s*(.+)/i);
    const engSearchMatch = clean.match(/(?:find|search|show|open|view)\s+(?:the\s+)?plan\s+(?:titled|called|named)?\s*(.+)/i);
    const searchMatch = khmerSearchMatch || engSearchMatch;
    if (searchMatch) {
      const rawTarget = searchMatch[1].trim();
      return {
        intent: 'SEARCH_PLAN',
        planName: isKhmerText(rawTarget) ? rawTarget : this.formatTitle(rawTarget),
        rawTranscript: text
      };
    }

    // Status query: "what is status of [Name]" / Khmer "តើស្ថានភាពផែនការ [ឈ្មោះ] យ៉ាងណាដែរ"
    const khmerStatusMatch = clean.match(/(?:តើ)?\s*(?:ស្ថានភាព|ពិនិត្យស្ថានភាព)(?:នៃ)?(?:\s*ផែនការ|\s*គម្រោង)?\s*(.+?)(?:\s*យ៉ាងណាដែរ|\s*យ៉ាងម៉េច|\s*យ៉ាងណា)?$/i);
    const engStatusMatch = clean.match(/(?:status\s+of|check\s+status\s+of|how\s+is)\s+(?:the\s+)?plan\s*(.+)/i);
    const statusMatch = khmerStatusMatch || engStatusMatch;
    if (statusMatch) {
      const rawTarget = statusMatch[1].trim();
      return {
        intent: 'QUERY_STATUS',
        planName: isKhmerText(rawTarget) ? rawTarget : this.formatTitle(rawTarget),
        rawTranscript: text
      };
    }

    // 6. HELP / COMMANDS
    if (
      clean.includes('help') || 
      clean.includes('what can i say') || 
      clean.includes('voice command') || 
      clean === 'commands' ||
      clean.includes('ជំនួយ') ||
      clean.includes('តើខ្ញុំអាចនិយាយអ្វីខ្លះ') ||
      clean.includes('ពាក្យបញ្ជាជាសំឡេង') ||
      clean.includes('ពាក្យបញ្ជា') ||
      clean.includes('របៀបប្រើ')
    ) {
      return {
        intent: 'HELP',
        rawTranscript: text
      };
    }

    return {
      intent: 'UNKNOWN',
      rawTranscript: text
    };
  }

  private formatTitle(str: string): string {
    if (!str) return '';
    // If it's a plan number like "ap-2026-001", uppercase it
    if (/^ap-\d{4}-\d{3}$/i.test(str)) {
      return str.toUpperCase();
    }
    // If Khmer text, preserve natural casing (no uppercase in Khmer)
    if (isKhmerText(str)) {
      return str.trim();
    }
    return str
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // --- Fuzzy Plan Search Matcher ---
  private findMatchingPlan(queryName: string, plans: ActionPlan[]): ActionPlan | undefined {
    if (!queryName) return undefined;
    const rawClean = normalizeKhmerNumbers(queryName)
      .toLowerCase()
      .replace(/[.,!?;:៕។ៗ"']/g, ' ')
      .trim();

    // Replace Khmer phonetic for AP if spoken: "អេសភី" -> "ap"
    const cleanQuery = rawClean
      .replace(/អេស\s*ភី/g, 'ap')
      .replace(/\s+/g, ' ')
      .trim();

    // Strip leading words like "ផែនការ", "plan", "គម្រោង"
    const strippedQuery = cleanQuery
      .replace(/^(?:ផែនការ|គម្រោង|the\s+plan|plan)\s+/i, '')
      .trim();

    // 1. Check exact or partial match on plan number (e.g. AP-2026-001, AP 2026 001, ap2026001)
    const normPlanNumber = (pNum: string) => pNum.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanQueryAlphanum = cleanQuery.replace(/[^a-z0-9]/g, '');
    const strippedQueryAlphanum = strippedQuery.replace(/[^a-z0-9]/g, '');

    if (cleanQueryAlphanum.length >= 3) {
      const byNum = plans.find(p => {
        const pAlnum = normPlanNumber(p.planNumber);
        return pAlnum === cleanQueryAlphanum || 
               pAlnum.includes(cleanQueryAlphanum) ||
               (cleanQueryAlphanum.length >= 3 && pAlnum.endsWith(cleanQueryAlphanum));
      });
      if (byNum) return byNum;
    }

    if (strippedQueryAlphanum.length >= 3) {
      const byNum2 = plans.find(p => {
        const pAlnum = normPlanNumber(p.planNumber);
        return pAlnum === strippedQueryAlphanum || 
               pAlnum.includes(strippedQueryAlphanum) ||
               pAlnum.endsWith(strippedQueryAlphanum);
      });
      if (byNum2) return byNum2;
    }

    // 2. Check 3-digit plan code (e.g., "001", "002")
    const digit3Match = cleanQuery.match(/\b(\d{3})\b/);
    if (digit3Match) {
      const by3Digits = plans.find(p => p.planNumber.endsWith(digit3Match[1]));
      if (by3Digits) return by3Digits;
    }

    // 3. Exact title match
    const exact = plans.find(p => 
      p.title.toLowerCase() === cleanQuery || 
      p.title.toLowerCase() === strippedQuery
    );
    if (exact) return exact;

    // 4. Substring in title
    const substring = plans.find(p => {
      const t = p.title.toLowerCase();
      return t.includes(cleanQuery) || cleanQuery.includes(t) ||
             (strippedQuery.length > 2 && (t.includes(strippedQuery) || strippedQuery.includes(t)));
    });
    if (substring) return substring;

    // 5. Word-level token match (best overlap)
    const queryTokens = (strippedQuery || cleanQuery).split(/\s+/).filter(t => t.length >= 2);
    let bestPlan: ActionPlan | undefined;
    let maxMatchCount = 0;

    for (const plan of plans) {
      const titleLower = plan.title.toLowerCase();
      let matches = 0;
      for (const token of queryTokens) {
        if (titleLower.includes(token)) {
          matches++;
        }
      }
      if (matches > maxMatchCount && matches >= Math.min(1, queryTokens.length)) {
        maxMatchCount = matches;
        bestPlan = plan;
      }
    }

    return bestPlan;
  }

  // --- Fuzzy Activity / Task Search Matcher ---
  private findMatchingActivity(query: string, activities: Activity[]): Activity | undefined {
    if (!query) return undefined;
    const rawClean = normalizeKhmerNumbers(query)
      .toLowerCase()
      .replace(/[.,!?;:៕។ៗ"']/g, ' ')
      .trim();

    // Replace Khmer phonetic for ACT: "អេកធី", "អាក់ធី", "អេសធី" -> "act"
    const cleanQuery = rawClean
      .replace(/(?:អេក\s*ធី|អាក់\s*ធី|អេស\s*ធី)/g, 'act')
      .replace(/\s+/g, ' ')
      .trim();

    // Strip leading words like "សកម្មភាព", "កិច្ចការ", "ភារកិច្ច", "activity", "task", "subtask"
    const strippedQuery = cleanQuery
      .replace(/^(?:សកម្មភាព|កិច្ចការ|ភារកិច្ច|the\s+activity|the\s+task|activity|task|subtask)\s+/i, '')
      .trim();

    // 1. Check exact or partial match on activity code (e.g. ACT-001, act-001, act 001, act001)
    const normCode = (c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanQueryAlphanum = cleanQuery.replace(/[^a-z0-9]/g, '');
    const strippedQueryAlphanum = strippedQuery.replace(/[^a-z0-9]/g, '');

    // Direct check like "act001", "act1", "001", "1"
    if (cleanQueryAlphanum.length >= 1) {
      const byCode = activities.find(a => {
        const aCodeAlnum = normCode(a.code);
        return aCodeAlnum === cleanQueryAlphanum || 
               aCodeAlnum.includes(cleanQueryAlphanum) ||
               (cleanQueryAlphanum.length >= 2 && aCodeAlnum.endsWith(cleanQueryAlphanum));
      });
      if (byCode) return byCode;
    }

    if (strippedQueryAlphanum.length >= 1) {
      const byCode2 = activities.find(a => {
        const aCodeAlnum = normCode(a.code);
        return aCodeAlnum === strippedQueryAlphanum || 
               aCodeAlnum.includes(strippedQueryAlphanum) ||
               aCodeAlnum.endsWith(strippedQueryAlphanum);
      });
      if (byCode2) return byCode2;
    }

    // Check digit matching e.g. "001", "002", "1", "2"
    const digitMatch = cleanQuery.match(/\b(\d{1,3})\b/);
    if (digitMatch) {
      const num = parseInt(digitMatch[1], 10);
      const padded = String(num).padStart(3, '0');
      const byPadded = activities.find(a => a.code.endsWith(padded) || a.code.endsWith(`-${num}`));
      if (byPadded) return byPadded;
    }

    // 2. Exact title match
    const exact = activities.find(a => 
      a.title.toLowerCase() === cleanQuery || 
      a.title.toLowerCase() === strippedQuery
    );
    if (exact) return exact;

    // 3. Substring in title
    const substring = activities.find(a => {
      const t = a.title.toLowerCase();
      return t.includes(cleanQuery) || cleanQuery.includes(t) ||
             (strippedQuery.length > 2 && (t.includes(strippedQuery) || strippedQuery.includes(t)));
    });
    if (substring) return substring;

    // 4. Token overlap match
    const queryTokens = (strippedQuery || cleanQuery).split(/\s+/).filter(t => t.length >= 2);
    let bestActivity: Activity | undefined;
    let maxMatchCount = 0;

    for (const act of activities) {
      const titleLower = act.title.toLowerCase();
      let matches = 0;
      for (const token of queryTokens) {
        if (titleLower.includes(token)) {
          matches++;
        }
      }
      if (matches > maxMatchCount && matches >= Math.min(1, queryTokens.length)) {
        maxMatchCount = matches;
        bestActivity = act;
      }
    }

    return bestActivity;
  }

  // --- Employee Fuzzy Search Matcher ---
  private findMatchingEmployee(query: string, users: User[]): User | undefined {
    if (!query) return undefined;
    const clean = query.toLowerCase().trim();
    return users.find(u => 
      u.name.toLowerCase() === clean ||
      (u.nameKhmer && u.nameKhmer.toLowerCase() === clean) ||
      u.name.toLowerCase().includes(clean) ||
      (u.nameKhmer && u.nameKhmer.toLowerCase().includes(clean)) ||
      clean.includes(u.name.toLowerCase()) ||
      (u.nameKhmer && clean.includes(u.nameKhmer.toLowerCase()))
    );
  }

  // --- Command Execution Engine ---
  public async executeCommand(
    command: ParsedVoiceCommand, 
    currentUser: User
  ): Promise<VoiceCommandExecutionResult> {
    const timestamp = new Date().toISOString();
    const plans = db.getPlans();
    const departments = db.getDepartments();
    const objectives = db.getObjectives();

    const isKhmer = (this.settings.recognitionLanguage && this.settings.recognitionLanguage.startsWith('km')) || 
                    isKhmerText(command.rawTranscript);

    // Check PIN requirement if configured
    if (this.settings.requirePinForMutations && 
        ['CREATE_PLAN', 'UPDATE_PLAN', 'DELETE_PLAN', 'CREATE_ACTIVITY', 'UPDATE_ACTIVITY', 'DELETE_ACTIVITY'].includes(command.intent)) {
      if (!this.isSessionAuthenticated) {
        const spoken = isKhmer 
          ? "ទាមទារការផ្ទៀងផ្ទាត់។ សូមផ្តល់លេខកូដសម្ងាត់សំឡេង ៤ ខ្ទង់របស់អ្នក។"
          : "Authentication required. Please provide your four-digit voice PIN to authorize modifications.";
        this.speak(spoken);
        return {
          success: false,
          intent: command.intent,
          spokenFeedback: spoken,
          displayMessage: isKhmer 
            ? "ទាមទារការផ្ទៀងផ្ទាត់សំឡេង៖ សូមបញ្ចូលលេខកូដសម្ងាត់ ៤ ខ្ទង់" 
            : "Voice authentication required: Enter your 4-digit PIN.",
          requiresPin: true,
          timestamp,
        };
      }
    }

    // 1. PIN AUTHENTICATION
    if (command.intent === 'AUTHENTICATE') {
      if (!command.pinCode) {
        const spoken = isKhmer 
          ? "សូមបញ្ជាក់លេខកូដសម្ងាត់ ៤ ខ្ទង់។"
          : "Please specify a four-digit PIN.";
        this.speak(spoken);
        return {
          success: false,
          intent: 'AUTHENTICATE',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp
        };
      }
      const verified = this.verifyPin(command.pinCode, currentUser);
      if (verified) {
        const spoken = isKhmer 
          ? `ការផ្ទៀងផ្ទាត់សម័យសំឡេងបានជោគជ័យសម្រាប់លោក/អ្នក ${currentUser.name}។ អ្នកអាចនិយាយពាក្យបញ្ជាផែនការបាន។`
          : `Voice session authenticated successfully for ${currentUser.name}. You may speak your plan commands.`;
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'AUTHENTICATE', true, spoken);
        return {
          success: true,
          intent: 'AUTHENTICATE',
          spokenFeedback: spoken,
          displayMessage: isKhmer 
            ? `សម័យសំឡេងត្រូវបានអនុញ្ញាតសម្រាប់ ${currentUser.name} (${currentUser.role})។`
            : `Voice session authorized for ${currentUser.name} (${currentUser.role}).`,
          timestamp
        };
      } else {
        const spoken = isKhmer 
          ? "លេខកូដសម្ងាត់មិនត្រឹមត្រូវទេ។ សូមព្យាយាមម្តងទៀត។"
          : "Incorrect security PIN. Please try again.";
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'AUTHENTICATE', false, spoken);
        return {
          success: false,
          intent: 'AUTHENTICATE',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp
        };
      }
    }

    // ----------------------------------------------------
    // ACTIVITIES & TASKS COMMAND EXECUTION
    // ----------------------------------------------------

    // A. CREATE ACTIVITY / TASK
    if (command.intent === 'CREATE_ACTIVITY') {
      const activityTitle = command.activityTitle || (isKhmer ? 'កិច្ចការថ្មី' : 'New Task');

      // 1. Determine action plan
      let targetPlan: ActionPlan | undefined;
      if (command.planName) {
        targetPlan = this.findMatchingPlan(command.planName, plans);
      }
      
      // If not found by query or not specified, look for user's relevant active plan
      if (!targetPlan) {
        targetPlan = plans.find(p => !p.isArchived && p.ownerId === currentUser.id);
        if (!targetPlan && currentUser.departmentId) {
          targetPlan = plans.find(p => !p.isArchived && p.departmentId === currentUser.departmentId);
        }
        if (!targetPlan) {
          targetPlan = plans.find(p => !p.isArchived);
        }
      }

      if (!targetPlan) {
        const spoken = isKhmer
          ? "មិនមានផែនការសកម្មភាពដែលមានសុពលភាពសម្រាប់បន្ថែមសកម្មភាពនេះទេ។ សូមបង្កើតផែនការសកម្មភាពជាមុនសិន។"
          : "No active action plan was found to add this activity to. Please create an action plan first.";
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'CREATE_ACTIVITY', false, spoken);
        return {
          success: false,
          intent: 'CREATE_ACTIVITY',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: 'NO_PLAN_AVAILABLE'
        };
      }

      // 2. Permission check
      if (!db.canCreateActivity(currentUser, targetPlan)) {
        const spoken = isKhmer 
          ? `គ្មានការអនុញ្ញាត។ តួនាទីជា ${currentUser.role} មិនមានសិទ្ធិបន្ថែមកិច្ចការក្នុងផែនការ ${targetPlan.planNumber} ទេ។`
          : `Permission denied. Your role as ${currentUser.role} cannot add activities to plan ${targetPlan.planNumber}.`;
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'CREATE_ACTIVITY', false, spoken, targetPlan.id, targetPlan.title);
        return {
          success: false,
          intent: 'CREATE_ACTIVITY',
          spokenFeedback: spoken,
          displayMessage: spoken,
          planId: targetPlan.id,
          planTitle: targetPlan.title,
          planNumber: targetPlan.planNumber,
          timestamp,
          error: 'RBAC_PERMISSION_DENIED'
        };
      }

      // 3. Assignee matching
      let assignedUser: User | undefined;
      const allUsers = db.getUsers();
      if (command.assignedTo) {
        assignedUser = this.findMatchingEmployee(command.assignedTo, allUsers);
      }
      if (!assignedUser) {
        assignedUser = currentUser;
      }

      try {
        const newAct = db.saveActivity({
          actionPlanId: targetPlan.id,
          title: activityTitle,
          description: command.details || (isKhmer 
            ? `សកម្មភាពត្រូវបានបង្កើតឡើងតាមរយៈជំនួយការសំឡេងដោយ ${currentUser.name}។`
            : `Voice-created activity created via Voice Assistant by ${currentUser.name}.`),
          assignedEmployeeId: assignedUser.id,
          teamLeaderId: targetPlan.ownerId || currentUser.id,
          startDate: new Date().toISOString().split('T')[0],
          dueDate: command.dueDate || targetPlan.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          priority: command.priority || 'Medium',
          status: (command.status as ActivityStatus) || 'Not Started',
          progressPercentage: command.progressPercentage || 0,
          weight: command.weight || 10,
        });

        const spokenFeedback = isKhmer
          ? `សកម្មភាព ${newAct.code} ឈ្មោះ «${newAct.title}» ត្រូវបានបង្កើត និងបន្ថែមក្នុងផែនការ ${targetPlan.planNumber} ដោយជោគជ័យ។`
          : `Your activity ${newAct.code}, titled "${newAct.title}", has been added to plan ${targetPlan.planNumber} successfully.`;
        this.speak(spokenFeedback);

        db.logAction(
          currentUser.id,
          currentUser.name,
          'VOICE_CREATE_ACTIVITY',
          'Voice Assistant',
          `Voice command created activity ${newAct.code}: "${newAct.title}" in ${targetPlan.planNumber}`
        );

        this.logSession(
          currentUser, 
          command.rawTranscript, 
          'CREATE_ACTIVITY', 
          true, 
          spokenFeedback, 
          targetPlan.id, 
          targetPlan.title,
          newAct.id,
          newAct.code,
          newAct.title
        );

        return {
          success: true,
          intent: 'CREATE_ACTIVITY',
          spokenFeedback,
          displayMessage: isKhmer 
            ? `បានបង្កើត ${newAct.code}៖ «${newAct.title}» ក្នុងផែនការ ${targetPlan.planNumber} (ចាត់តាំងជូន ${assignedUser.name})។`
            : `Created ${newAct.code}: "${newAct.title}" in plan ${targetPlan.planNumber} (Assigned to ${assignedUser.name}).`,
          planId: targetPlan.id,
          planTitle: targetPlan.title,
          planNumber: targetPlan.planNumber,
          activityId: newAct.id,
          activityCode: newAct.code,
          activityTitle: newAct.title,
          timestamp,
          details: {
            activityCode: newAct.code,
            planNumber: targetPlan.planNumber,
            assignedTo: assignedUser.name,
            priority: newAct.priority,
            status: newAct.status
          }
        };
      } catch (err: any) {
        const spoken = isKhmer ? `បរាជ័យក្នុងការបង្កើតសកម្មភាព។ ${err.message || ''}` : `Failed to create activity. ${err.message || ''}`;
        this.speak(spoken);
        return {
          success: false,
          intent: 'CREATE_ACTIVITY',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: err.message
        };
      }
    }

    // B. UPDATE ACTIVITY / TASK
    if (command.intent === 'UPDATE_ACTIVITY') {
      const activities = db.getActivities();
      const activity = this.findMatchingActivity(command.activityCode || command.activityTitle || '', activities);

      if (!activity) {
        const spoken = isKhmer 
          ? `រកមិនឃើញសកម្មភាព ឬកិច្ចការដែលត្រូវគ្នានឹង «${command.activityCode || command.activityTitle || 'សកម្មភាពដែលបានបញ្ជាក់'}» ទេ។ សូមពិនិត្យកូដ (ឧ. ACT-001) ឬចំណងជើង។`
          : `Could not find an activity or task matching "${command.activityCode || command.activityTitle || 'specified activity'}". Please check code like ACT-001 or title.`;
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'UPDATE_ACTIVITY', false, spoken);
        return {
          success: false,
          intent: 'UPDATE_ACTIVITY',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: 'ACTIVITY_NOT_FOUND'
        };
      }

      // Check update permission
      if (!db.canUpdateActivity(currentUser, activity)) {
        const spoken = isKhmer 
          ? `គ្មានការអនុញ្ញាត។ អ្នកមិនមានសិទ្ធិកែប្រែសកម្មភាព ${activity.code} ទេ។`
          : `Permission denied. You do not have permission to edit activity ${activity.code}.`;
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'UPDATE_ACTIVITY', false, spoken, activity.actionPlanId, undefined, activity.id, activity.code, activity.title);
        return {
          success: false,
          intent: 'UPDATE_ACTIVITY',
          spokenFeedback: spoken,
          displayMessage: spoken,
          activityId: activity.id,
          activityCode: activity.code,
          activityTitle: activity.title,
          timestamp,
          error: 'RBAC_PERMISSION_DENIED'
        };
      }

      const updates: Partial<Activity> & { id: string; actionPlanId: string; title: string } = {
        id: activity.id,
        actionPlanId: activity.actionPlanId,
        title: activity.title
      };
      const feedbackNotes: string[] = [];

      // Status change
      if (command.status) {
        const targetStatus = command.status as ActivityStatus;
        if (targetStatus === 'Completed') {
          const val = db.validateTaskCompletion(activity.id);
          if (!val.valid) {
            const spoken = isKhmer 
              ? `មិនអាចបញ្ចប់សកម្មភាព ${activity.code} បានទេ។ នៅមានកិច្ចការតម្រូវមិនទាន់រួចរាល់៖ ${val.unmetDependencyTitles?.join(', ')}`
              : `Cannot complete activity ${activity.code}. Required prerequisite tasks not finished: ${val.unmetDependencyTitles?.join(', ')}`;
            this.speak(spoken);
            return {
              success: false,
              intent: 'UPDATE_ACTIVITY',
              spokenFeedback: spoken,
              displayMessage: spoken,
              activityId: activity.id,
              activityCode: activity.code,
              timestamp,
              error: 'UNMET_DEPENDENCIES'
            };
          }
          updates.status = 'Completed';
          updates.progressPercentage = 100;
          feedbackNotes.push(isKhmer ? 'ស្ថានភាពបានបញ្ចប់ និងវឌ្ឍនភាព 100%' : 'marked as completed (100%)');
        } else {
          updates.status = targetStatus;
          feedbackNotes.push(isKhmer ? `ស្ថានភាព ${targetStatus}` : `status set to ${targetStatus}`);
        }
      }

      // Progress percentage change
      if (command.progressPercentage !== undefined) {
        updates.progressPercentage = command.progressPercentage;
        if (command.progressPercentage === 100 && !updates.status) {
          const val = db.validateTaskCompletion(activity.id);
          if (val.valid) {
            updates.status = 'Completed';
          }
        } else if (command.progressPercentage > 0 && activity.status === 'Not Started' && !updates.status) {
          updates.status = 'In Progress';
        }
        feedbackNotes.push(isKhmer ? `វឌ្ឍនភាព ${command.progressPercentage}%` : `progress set to ${command.progressPercentage}%`);
      }

      // Assignee change
      if (command.assignedTo) {
        const allUsers = db.getUsers();
        const targetEmp = this.findMatchingEmployee(command.assignedTo, allUsers);
        if (targetEmp) {
          updates.assignedEmployeeId = targetEmp.id;
          feedbackNotes.push(isKhmer ? `ចាត់តាំងជូន ${targetEmp.name}` : `assigned to ${targetEmp.name}`);
        }
      }

      // Priority change
      if (command.priority) {
        updates.priority = command.priority;
        feedbackNotes.push(isKhmer ? `អាទិភាព ${command.priority}` : `priority set to ${command.priority}`);
      }

      // Generic details/notes
      if (command.details && feedbackNotes.length === 0) {
        updates.actualResult = activity.actualResult ? `${activity.actualResult}\n[Voice Update]: ${command.details}` : `[Voice Update]: ${command.details}`;
        feedbackNotes.push(isKhmer ? `ព័ត៌មានបន្ថែម «${command.details}»` : `updated with "${command.details}"`);
      }

      try {
        const updated = db.saveActivity(updates as any);
        const detailsSummary = feedbackNotes.join(isKhmer ? ' និង ' : ' and ') || (isKhmer ? 'ព័ត៌មានលម្អិតថ្មី' : 'updated details');

        const spokenFeedback = isKhmer 
          ? `សកម្មភាព ${updated.code} ឈ្មោះ «${updated.title}» ត្រូវបានធ្វើបច្ចុប្បន្នភាពជាមួយ ${detailsSummary} ដោយជោគជ័យ។`
          : `Your activity ${updated.code}, titled "${updated.title}", has been updated with ${detailsSummary}.`;
        this.speak(spokenFeedback);

        db.logAction(
          currentUser.id,
          currentUser.name,
          'VOICE_UPDATE_ACTIVITY',
          'Voice Assistant',
          `Voice command updated activity ${updated.code}: ${detailsSummary}`
        );

        this.logSession(
          currentUser, 
          command.rawTranscript, 
          'UPDATE_ACTIVITY', 
          true, 
          spokenFeedback, 
          updated.actionPlanId, 
          undefined,
          updated.id,
          updated.code,
          updated.title
        );

        return {
          success: true,
          intent: 'UPDATE_ACTIVITY',
          spokenFeedback,
          displayMessage: isKhmer 
            ? `បានធ្វើបច្ចុប្បន្នភាព ${updated.code} (${updated.title})៖ ${detailsSummary}។`
            : `Updated ${updated.code} (${updated.title}): ${detailsSummary}.`,
          planId: updated.actionPlanId,
          activityId: updated.id,
          activityCode: updated.code,
          activityTitle: updated.title,
          timestamp,
          details: { ...updates }
        };
      } catch (err: any) {
        const spoken = isKhmer ? `បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពសកម្មភាព។ ${err.message || ''}` : `Failed to update activity. ${err.message || ''}`;
        this.speak(spoken);
        return {
          success: false,
          intent: 'UPDATE_ACTIVITY',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: err.message
        };
      }
    }

    // C. DELETE ACTIVITY / TASK
    if (command.intent === 'DELETE_ACTIVITY') {
      const activities = db.getActivities();
      const activity = this.findMatchingActivity(command.activityCode || command.activityTitle || '', activities);

      if (!activity) {
        const spoken = isKhmer 
          ? `រកមិនឃើញសកម្មភាពដែលត្រូវគ្នានឹង «${command.activityCode || command.activityTitle || 'សកម្មភាពដែលបានបញ្ជាក់'}» ទេ។`
          : `Could not find an activity or task matching "${command.activityCode || command.activityTitle || 'specified activity'}".`;
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'DELETE_ACTIVITY', false, spoken);
        return {
          success: false,
          intent: 'DELETE_ACTIVITY',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: 'ACTIVITY_NOT_FOUND'
        };
      }

      // Check delete permission
      if (!db.canDeleteActivity(currentUser, activity)) {
        const spoken = isKhmer 
          ? `គ្មានការអនុញ្ញាត។ តួនាទីជា ${currentUser.role} មិនមានសិទ្ធិលុបសកម្មភាព ${activity.code} ទេ។`
          : `Permission denied. Your role as ${currentUser.role} is not authorized to delete activity ${activity.code}.`;
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'DELETE_ACTIVITY', false, spoken, activity.actionPlanId, undefined, activity.id, activity.code, activity.title);
        return {
          success: false,
          intent: 'DELETE_ACTIVITY',
          spokenFeedback: spoken,
          displayMessage: spoken,
          activityId: activity.id,
          activityCode: activity.code,
          activityTitle: activity.title,
          timestamp,
          error: 'RBAC_PERMISSION_DENIED'
        };
      }

      try {
        db.deleteActivity(activity.id);

        const spokenFeedback = isKhmer 
          ? `សកម្មភាព ${activity.code} ឈ្មោះ «${activity.title}» ត្រូវបានលុបចេញពីប្រព័ន្ធដោយជោគជ័យ។`
          : `Your activity ${activity.code}, titled "${activity.title}", has been deleted successfully.`;
        this.speak(spokenFeedback);

        db.logAction(
          currentUser.id,
          currentUser.name,
          'VOICE_DELETE_ACTIVITY',
          'Voice Assistant',
          `Voice command deleted activity ${activity.code}: "${activity.title}"`
        );

        this.logSession(
          currentUser, 
          command.rawTranscript, 
          'DELETE_ACTIVITY', 
          true, 
          spokenFeedback, 
          activity.actionPlanId, 
          undefined,
          activity.id,
          activity.code,
          activity.title
        );

        return {
          success: true,
          intent: 'DELETE_ACTIVITY',
          spokenFeedback,
          displayMessage: isKhmer 
            ? `បានលុបសកម្មភាព ${activity.code}៖ «${activity.title}» ដោយជោគជ័យ។`
            : `Deleted activity ${activity.code}: "${activity.title}".`,
          planId: activity.actionPlanId,
          activityId: activity.id,
          activityCode: activity.code,
          activityTitle: activity.title,
          timestamp
        };
      } catch (err: any) {
        const spoken = isKhmer ? `បរាជ័យក្នុងការលុបសកម្មភាព។ ${err.message || ''}` : `Failed to delete activity. ${err.message || ''}`;
        this.speak(spoken);
        return {
          success: false,
          intent: 'DELETE_ACTIVITY',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: err.message
        };
      }
    }

    // D. SEARCH / QUERY ACTIVITY
    if (command.intent === 'SEARCH_ACTIVITY') {
      const activities = db.getActivities();
      const activity = this.findMatchingActivity(command.activityCode || command.activityTitle || '', activities);

      if (!activity) {
        const spoken = isKhmer 
          ? `រកមិនឃើញសកម្មភាពដែលត្រូវគ្នានឹង «${command.activityCode || command.activityTitle || ''}» ទេ។ បច្ចុប្បន្នមានសកម្មភាពសរុប ${activities.length} ក្នុងប្រព័ន្ធ។`
          : `Could not find any activity matching "${command.activityCode || command.activityTitle || ''}". There are currently ${activities.length} activities in the system.`;
        this.speak(spoken);
        return {
          success: false,
          intent: 'SEARCH_ACTIVITY',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp
        };
      }

      const plan = plans.find(p => p.id === activity.actionPlanId);
      const allUsers = db.getUsers();
      const assignee = allUsers.find(u => u.id === activity.assignedEmployeeId);
      const assigneeName = assignee?.name || 'Unassigned';

      const spokenFeedback = isKhmer 
        ? `សកម្មភាព ${activity.code} ឈ្មោះ «${activity.title}» ក្នុងផែនការ ${plan?.planNumber || ''} មានស្ថានភាព ${activity.status} និងវឌ្ឍនភាព ${activity.progressPercentage} ភាគរយ។ ចាត់តាំងជូន ${assigneeName}។`
        : `Activity ${activity.code}, titled "${activity.title}", in plan ${plan?.planNumber || ''} has a status of ${activity.status} and is ${activity.progressPercentage} percent complete. Assigned to ${assigneeName}.`;
      this.speak(spokenFeedback);
      this.logSession(currentUser, command.rawTranscript, 'SEARCH_ACTIVITY', true, spokenFeedback, plan?.id, plan?.title, activity.id, activity.code, activity.title);

      return {
        success: true,
        intent: 'SEARCH_ACTIVITY',
        spokenFeedback,
        displayMessage: isKhmer 
          ? `បានរកឃើញ ${activity.code}៖ «${activity.title}» • ស្ថានភាព៖ ${activity.status} • វឌ្ឍនភាព៖ ${activity.progressPercentage}% (${assigneeName})`
          : `Found ${activity.code}: "${activity.title}" • Status: ${activity.status} • ${activity.progressPercentage}% complete (${assigneeName}).`,
        planId: plan?.id,
        planTitle: plan?.title,
        planNumber: plan?.planNumber,
        activityId: activity.id,
        activityCode: activity.code,
        activityTitle: activity.title,
        timestamp,
        details: { status: activity.status, progress: activity.progressPercentage, assignedTo: assigneeName, dueDate: activity.dueDate }
      };
    }

    // 2. CREATE PLAN
    if (command.intent === 'CREATE_PLAN') {
      // Permission check
      if (!db.canCreatePlan(currentUser)) {
        const spoken = isKhmer 
          ? `គ្មានសិទ្ធិចូលដំណើរការ។ តួនាទីបច្ចុប្បន្នជា ${currentUser.role} មិនមានការអនុញ្ញាតបង្កើតផែនការទេ។`
          : `Access restricted. Your current role as ${currentUser.role} does not have permission to create action plans.`;
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'CREATE_PLAN', false, spoken);
        return {
          success: false,
          intent: 'CREATE_PLAN',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: 'RBAC_PERMISSION_DENIED'
        };
      }

      const planName = command.planName || (isKhmer ? 'ផែនការសកម្មភាពយុទ្ធសាស្ត្រថ្មី' : 'New Strategic Action Plan');

      // Match or default department
      let targetDept = departments[0];
      if (command.departmentName) {
        const deptMatch = departments.find(d => 
          d.name.toLowerCase().includes(command.departmentName!.toLowerCase()) ||
          (d.nameKhmer && d.nameKhmer.toLowerCase().includes(command.departmentName!.toLowerCase())) ||
          d.code.toLowerCase().includes(command.departmentName!.toLowerCase())
        );
        if (deptMatch) targetDept = deptMatch;
      } else if (currentUser.departmentId) {
        const userDept = departments.find(d => d.id === currentUser.departmentId);
        if (userDept) targetDept = userDept;
      }

      // Default objective
      const targetObj = objectives.find(o => o.departmentId === targetDept?.id) || objectives[0];

      try {
        const newPlan = db.savePlan({
          title: planName,
          description: isKhmer 
            ? `ផែនការសកម្មភាពត្រូវបានបង្កើតឡើងតាមរយៈជំនួយការសំឡេងដោយ ${currentUser.name}។`
            : `Voice-initiated action plan created via Voice Assistant by ${currentUser.name}.`,
          departmentId: targetDept ? targetDept.id : 'dept-1',
          objectiveId: targetObj ? targetObj.id : '',
          ownerId: currentUser.id,
          supportingEmployeeIds: [],
          startDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
          priority: command.priority || 'Medium',
          status: 'Draft',
          budget: command.budget || 0,
          kpi: isKhmer ? 'ដំណាក់កាលប្រតិបត្តិការសម្រេចបាន' : 'Operational Milestones Completed',
          kpiTarget: 100,
          kpiUnit: '%',
          expectedResult: isKhmer 
            ? `សម្រេចបានគោលដៅដែលបានកំណត់ក្នុង ${planName} ដោយជោគជ័យ។`
            : `Successfully deliver objectives outlined in ${planName}.`,
        });

        // Exact response feedback requested by user:
        // "Your plan titled [Plan Name] has been created successfully."
        // Or Khmer: "ផែនការរបស់អ្នកឈ្មោះ [ឈ្មោះ] ត្រូវបានបង្កើតដោយជោគជ័យ។"
        const spokenFeedback = isKhmer 
          ? `ផែនការរបស់អ្នកឈ្មោះ ${newPlan.title} ត្រូវបានបង្កើតដោយជោគជ័យ។`
          : `Your plan titled ${newPlan.title} has been created successfully.`;
        this.speak(spokenFeedback);

        db.logAction(
          currentUser.id,
          currentUser.name,
          'VOICE_CREATE_PLAN',
          'Voice Assistant',
          `Voice command created action plan ${newPlan.planNumber}: "${newPlan.title}"`
        );

        this.logSession(currentUser, command.rawTranscript, 'CREATE_PLAN', true, spokenFeedback, newPlan.id, newPlan.title);

        const deptDisplayName = isKhmer ? (targetDept?.nameKhmer || targetDept?.name) : (targetDept?.name || 'Department');

        return {
          success: true,
          intent: 'CREATE_PLAN',
          spokenFeedback,
          displayMessage: isKhmer 
            ? `បានបង្កើត ${newPlan.planNumber}៖ «${newPlan.title}» ក្នុង ${deptDisplayName}។`
            : `Created ${newPlan.planNumber}: "${newPlan.title}" in ${deptDisplayName}.`,
          planId: newPlan.id,
          planTitle: newPlan.title,
          planNumber: newPlan.planNumber,
          timestamp,
          details: { department: deptDisplayName, priority: newPlan.priority, budget: newPlan.budget }
        };
      } catch (err: any) {
        const spoken = isKhmer ? `បរាជ័យក្នុងការបង្កើតផែនការ។ ${err.message || ''}` : `Failed to create plan. ${err.message || ''}`;
        this.speak(spoken);
        return {
          success: false,
          intent: 'CREATE_PLAN',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: err.message
        };
      }
    }

    // 3. UPDATE PLAN
    if (command.intent === 'UPDATE_PLAN') {
      const plan = this.findMatchingPlan(command.planName || '', plans);

      if (!plan) {
        const spoken = isKhmer 
          ? `រកមិនឃើញផែនការដែលត្រូវគ្នានឹង «${command.planName || 'ផែនការដែលបានបញ្ជាក់'}» ទេ។ សូមពិនិត្យឈ្មោះ ឬលេខសម្គាល់ផែនការ។`
          : `Could not find an action plan matching "${command.planName || 'specified plan'}". Please check the plan title or plan number.`;
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'UPDATE_PLAN', false, spoken);
        return {
          success: false,
          intent: 'UPDATE_PLAN',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: 'PLAN_NOT_FOUND'
        };
      }

      // Check edit permission
      if (!db.canEditPlan(currentUser, plan)) {
        const spoken = isKhmer 
          ? `គ្មានការអនុញ្ញាត។ អ្នកមិនមានសិទ្ធិកែប្រែផែនការសកម្មភាព ${plan.planNumber} ទេ។`
          : `Permission denied. You do not have permission to edit action plan ${plan.planNumber}.`;
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'UPDATE_PLAN', false, spoken);
        return {
          success: false,
          intent: 'UPDATE_PLAN',
          spokenFeedback: spoken,
          displayMessage: spoken,
          planId: plan.id,
          planTitle: plan.title,
          timestamp,
          error: 'RBAC_PERMISSION_DENIED'
        };
      }

      const updates: Partial<ActionPlan> = { id: plan.id, title: plan.title, departmentId: plan.departmentId };
      const feedbackNotes: string[] = [];

      if (command.progressPercentage !== undefined) {
        updates.completionPercentage = command.progressPercentage;
        updates.kpiActual = command.progressPercentage;
        feedbackNotes.push(isKhmer ? `វឌ្ឍនភាពត្រូវបានកំណត់ ${command.progressPercentage}%` : `progress set to ${command.progressPercentage}%`);
      }

      if (command.status) {
        updates.status = command.status as PlanStatus;
        feedbackNotes.push(isKhmer ? `ស្ថានភាព ${command.status}` : `status set to ${command.status}`);
      }

      if (command.details && command.progressPercentage === undefined && !command.status) {
        updates.actualResult = plan.actualResult ? `${plan.actualResult}\n[Voice Update]: ${command.details}` : `[Voice Update]: ${command.details}`;
        feedbackNotes.push(isKhmer ? `ព័ត៌មានលម្អិត «${command.details}»` : `details updated with "${command.details}"`);
      }

      try {
        const updated = db.savePlan(updates as any);
        const detailsSummary = feedbackNotes.join(isKhmer ? ' និង ' : ' and ') || (isKhmer ? 'ព័ត៌មានលម្អិតថ្មី' : 'updated details');

        // Exact response feedback requested by user:
        // "Your plan titled [Plan Name] has been updated with [New Details]."
        // Or Khmer: "ផែនការរបស់អ្នកឈ្មោះ [ឈ្មោះ] ត្រូវបានធ្វើបច្ចុប្បន្នភាពដោយជោគជ័យ។"
        const spokenFeedback = isKhmer 
          ? `ផែនការរបស់អ្នកឈ្មោះ ${updated.title} ត្រូវបានធ្វើបច្ចុប្បន្នភាពជាមួយ ${detailsSummary} ដោយជោគជ័យ។`
          : `Your plan titled ${updated.title} has been updated with ${detailsSummary}.`;
        this.speak(spokenFeedback);

        db.logAction(
          currentUser.id,
          currentUser.name,
          'VOICE_UPDATE_PLAN',
          'Voice Assistant',
          `Voice command updated plan ${updated.planNumber}: ${detailsSummary}`
        );

        this.logSession(currentUser, command.rawTranscript, 'UPDATE_PLAN', true, spokenFeedback, updated.id, updated.title);

        return {
          success: true,
          intent: 'UPDATE_PLAN',
          spokenFeedback,
          displayMessage: isKhmer 
            ? `បានធ្វើបច្ចុប្បន្នភាព ${updated.planNumber} (${updated.title})៖ ${detailsSummary}។`
            : `Updated ${updated.planNumber} (${updated.title}): ${detailsSummary}.`,
          planId: updated.id,
          planTitle: updated.title,
          planNumber: updated.planNumber,
          timestamp,
          details: { ...updates }
        };
      } catch (err: any) {
        const spoken = isKhmer ? `បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពផែនការ។ ${err.message || ''}` : `Failed to update plan. ${err.message || ''}`;
        this.speak(spoken);
        return {
          success: false,
          intent: 'UPDATE_PLAN',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: err.message
        };
      }
    }

    // 4. DELETE PLAN
    if (command.intent === 'DELETE_PLAN') {
      const plan = this.findMatchingPlan(command.planName || '', plans);

      if (!plan) {
        const spoken = isKhmer 
          ? `រកមិនឃើញផែនការដែលត្រូវគ្នានឹង «${command.planName || 'ផែនការដែលបានបញ្ជាក់'}» ទេ។`
          : `Could not find an action plan matching "${command.planName || 'specified plan'}".`;
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'DELETE_PLAN', false, spoken);
        return {
          success: false,
          intent: 'DELETE_PLAN',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: 'PLAN_NOT_FOUND'
        };
      }

      // Check delete permission
      if (!db.canDeletePlan(currentUser, plan)) {
        const spoken = isKhmer 
          ? `គ្មានការអនុញ្ញាត។ តួនាទីជា ${currentUser.role} មិនមានសិទ្ធិលុបផែនការ ${plan.planNumber} ទេ។`
          : `Permission denied. Your role as ${currentUser.role} is not authorized to delete action plan ${plan.planNumber}.`;
        this.speak(spoken);
        this.logSession(currentUser, command.rawTranscript, 'DELETE_PLAN', false, spoken);
        return {
          success: false,
          intent: 'DELETE_PLAN',
          spokenFeedback: spoken,
          displayMessage: spoken,
          planId: plan.id,
          planTitle: plan.title,
          timestamp,
          error: 'RBAC_PERMISSION_DENIED'
        };
      }

      try {
        db.deletePlan(plan.id);

        // Feedback confirmation
        const spokenFeedback = isKhmer 
          ? `ផែនការរបស់អ្នកឈ្មោះ ${plan.title} ត្រូវបានលុប ឬរក្សាទុកក្នុងបណ្ណសារដោយជោគជ័យ។`
          : `Your plan titled ${plan.title} has been archived successfully.`;
        this.speak(spokenFeedback);

        db.logAction(
          currentUser.id,
          currentUser.name,
          'VOICE_DELETE_PLAN',
          'Voice Assistant',
          `Voice command archived plan ${plan.planNumber}: "${plan.title}"`
        );

        this.logSession(currentUser, command.rawTranscript, 'DELETE_PLAN', true, spokenFeedback, plan.id, plan.title);

        return {
          success: true,
          intent: 'DELETE_PLAN',
          spokenFeedback,
          displayMessage: isKhmer 
            ? `បានរក្សាទុកក្នុងបណ្ណសារ ${plan.planNumber}៖ «${plan.title}»។`
            : `Archived plan ${plan.planNumber}: "${plan.title}".`,
          planId: plan.id,
          planTitle: plan.title,
          planNumber: plan.planNumber,
          timestamp
        };
      } catch (err: any) {
        const spoken = isKhmer ? `បរាជ័យក្នុងការលុបផែនការ។ ${err.message || ''}` : `Failed to delete plan. ${err.message || ''}`;
        this.speak(spoken);
        return {
          success: false,
          intent: 'DELETE_PLAN',
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp,
          error: err.message
        };
      }
    }

    // 5. SEARCH / QUERY STATUS
    if (command.intent === 'SEARCH_PLAN' || command.intent === 'QUERY_STATUS') {
      const plan = this.findMatchingPlan(command.planName || '', plans);

      if (!plan) {
        const spoken = isKhmer 
          ? `រកមិនឃើញផែនការសកម្មភាពដែលត្រូវគ្នានឹង «${command.planName || ''}» ទេ។ បច្ចុប្បន្នមានផែនការសកម្មចំនួន ${plans.length}។`
          : `Could not find any action plan matching "${command.planName || ''}". There are currently ${plans.length} active plans.`;
        this.speak(spoken);
        return {
          success: false,
          intent: command.intent,
          spokenFeedback: spoken,
          displayMessage: spoken,
          timestamp
        };
      }

      const spokenFeedback = isKhmer 
        ? `ផែនការ ${plan.planNumber} ឈ្មោះ ${plan.title} មានស្ថានភាព ${plan.status} និងសម្រេចបាន ${plan.completionPercentage} ភាគរយ។ កាលបរិច្ឆេទផុតកំណត់គឺថ្ងៃទី ${plan.dueDate}។`
        : `Plan ${plan.planNumber}, titled ${plan.title}, has a status of ${plan.status} and is ${plan.completionPercentage} percent completed. Due on ${plan.dueDate}.`;
      this.speak(spokenFeedback);
      this.logSession(currentUser, command.rawTranscript, command.intent, true, spokenFeedback, plan.id, plan.title);

      return {
        success: true,
        intent: command.intent,
        spokenFeedback,
        displayMessage: isKhmer 
          ? `បានរកឃើញ ${plan.planNumber}៖ «${plan.title}» • ស្ថានភាព៖ ${plan.status} • វឌ្ឍនភាព៖ ${plan.completionPercentage}%`
          : `Found ${plan.planNumber}: "${plan.title}" • Status: ${plan.status} • ${plan.completionPercentage}% complete.`,
        planId: plan.id,
        planTitle: plan.title,
        planNumber: plan.planNumber,
        timestamp,
        details: { status: plan.status, progress: plan.completionPercentage, dueDate: plan.dueDate }
      };
    }

    // 6. HELP
    if (command.intent === 'HELP') {
      const spokenFeedback = isKhmer 
        ? "អ្នកអាចនិយាយថា៖ បង្កើតផែនការថ្មីឈ្មោះ... ឬ កែប្រែផែនការ... ឬ លុបផែនការ...។ អ្នកក៏អាចសួររកស្ថានភាពផែនការណាមួយផងដែរ។"
        : "You can say: Create a new plan titled Plan Name. Update Plan Name with new details. Or Delete the plan titled Plan Name. You can also ask for the status of any plan.";
      this.speak(spokenFeedback);
      return {
        success: true,
        intent: 'HELP',
        spokenFeedback,
        displayMessage: isKhmer 
          ? "មគ្គុទ្ទេសក៍ពាក្យបញ្ជាជាសំឡេង៖ បង្កើត, កែប្រែ, លុប, ឬ សាកសួរផែនការសកម្មភាព"
          : "Voice Command Guide: Create, Update, Delete, or Query Action Plans.",
        timestamp
      };
    }

    // UNKNOWN INTENT
    const spokenFallback = isKhmer 
      ? `ខ្ញុំបានឮ៖ «${command.rawTranscript}» ប៉ុន្តែមិនអាចស្គាល់ពាក្យបញ្ជាផែនការត្រឹមត្រូវទេ។ សូមសាកល្បងនិយាយថា៖ «បង្កើតផែនការថ្មីឈ្មោះ...» ឬ និយាយថា «ជំនួយ» សម្រាប់ទម្រង់ពាក្យបញ្ជា។`
      : `I heard: "${command.rawTranscript}", but could not recognize a valid plan command. Try saying: "Create a new plan titled [Plan Name]", or "Help" for command syntax.`;
    this.speak(spokenFallback);
    return {
      success: false,
      intent: 'UNKNOWN',
      spokenFeedback: spokenFallback,
      displayMessage: spokenFallback,
      timestamp
    };
  }

  private logSession(
    user: User, 
    transcript: string, 
    intent: any, 
    success: boolean, 
    spokenFeedback: string, 
    planId?: string, 
    planTitle?: string,
    activityId?: string,
    activityCode?: string,
    activityTitle?: string
  ) {
    const item: VoiceSessionHistoryItem = {
      id: `voice-log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      transcript,
      intent,
      success,
      spokenFeedback,
      planId,
      planTitle,
      activityId,
      activityCode,
      activityTitle
    };
    this.sessionHistory.unshift(item);
    this.saveHistory();
  }

  // --- Subscriptions ---
  public subscribeTranscript(cb: (interim: string, final: string) => void) {
    this.onTranscriptListeners.push(cb);
    return () => {
      this.onTranscriptListeners = this.onTranscriptListeners.filter(l => l !== cb);
    };
  }

  public subscribeAudioLevel(cb: (level: number) => void) {
    this.onAudioLevelListeners.push(cb);
    return () => {
      this.onAudioLevelListeners = this.onAudioLevelListeners.filter(l => l !== cb);
    };
  }

  public subscribeListeningState(cb: (isListening: boolean) => void) {
    this.onListeningStateListeners.push(cb);
    return () => {
      this.onListeningStateListeners = this.onListeningStateListeners.filter(l => l !== cb);
    };
  }

  public subscribeError(cb: (error: string) => void) {
    this.onErrorListeners.push(cb);
    return () => {
      this.onErrorListeners = this.onErrorListeners.filter(l => l !== cb);
    };
  }

  private notifyTranscript(interim: string, final: string) {
    this.onTranscriptListeners.forEach(cb => cb(interim, final));
  }

  private notifyAudioLevel(level: number) {
    this.onAudioLevelListeners.forEach(cb => cb(level));
  }

  private notifyListeningState(isListening: boolean) {
    this.onListeningStateListeners.forEach(cb => cb(isListening));
  }

  private notifyError(error: string) {
    this.onErrorListeners.forEach(cb => cb(error));
  }
}

export const voiceAssistant = new VoiceAssistantService();
