import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode,
  Camera,
  X,
  RefreshCw,
  Flashlight,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sun,
  Moon,
  Users,
  ShieldCheck,
  Building2,
  ArrowRight,
  Maximize2,
  Minimize2,
  Upload,
  Download,
  Printer,
  Zap,
  Info
} from 'lucide-react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { User, Language, ShiftType, AttendanceRecord } from '../types';
import { db, WORK_SHIFTS } from '../services/db';
import { qrAudio } from '../services/qrAudio';
import { webPushService } from '../services/webPushService';

interface QrAttendanceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  lang: Language;
  onAttendanceUpdated: () => void;
  initialTab?: 'scanner' | 'my-badge' | 'kiosk-display';
}

interface ScanLogItem {
  id: string;
  timestamp: string;
  userName: string;
  employeeId?: string;
  departmentName?: string;
  shift: ShiftType;
  action: 'checkIn' | 'checkOut' | 'none';
  status: string;
  duration?: number;
  message: string;
  success: boolean;
}

export const QrAttendanceScannerModal: React.FC<QrAttendanceScannerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
  onAttendanceUpdated,
  initialTab = 'scanner',
}) => {
  // Modal tabs: 'scanner' | 'my-badge' | 'kiosk-display'
  const [activeTab, setActiveTab] = useState<'scanner' | 'my-badge' | 'kiosk-display'>(initialTab);

  // Shift selection: 'Auto' | 'Morning' | 'Evening'
  const [selectedShiftMode, setSelectedShiftMode] = useState<ShiftType | 'Auto'>('Auto');
  // Action selection: 'auto' | 'checkIn' | 'checkOut'
  const [actionSelection, setActionSelection] = useState<'auto' | 'checkIn' | 'checkOut'>('auto');

  // Audio mute toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Camera stream & scanning state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  // Peak Hours Throughput counter & logs
  const [peakHourCount, setPeakHourCount] = useState(0);
  const [recentScans, setRecentScans] = useState<ScanLogItem[]>([]);

  // Instant Feedback Overlay for the currently scanned person
  const [activeResult, setActiveResult] = useState<{
    success: boolean;
    user?: User;
    action: 'checkIn' | 'checkOut' | 'none';
    shift: ShiftType;
    message: string;
    timestamp: string;
    record?: AttendanceRecord;
  } | null>(null);

  // Generated QR data URLs
  const [myBadgeQrUrl, setMyBadgeQrUrl] = useState<string>('');
  const [stationKioskQrUrl, setStationKioskQrUrl] = useState<string>('');

  // Fullscreen toggle for Kiosk mode
  const [isFullscreen, setIsFullscreen] = useState(false);
  const kioskContainerRef = useRef<HTMLDivElement | null>(null);

  // Live real-time clock
  const [liveClock, setLiveClock] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCameraError(null);
      setActiveResult(null);
    }
  }, [isOpen, initialTab]);

  // Generate My Badge QR Code (Dynamic signature payload)
  useEffect(() => {
    if (!currentUser) return;
    const badgePayload = JSON.stringify({
      type: 'apms_employee_badge',
      userId: currentUser.id,
      employeeId: currentUser.employeeId || 'EMP-001',
      name: currentUser.name,
      departmentId: currentUser.departmentId,
      role: currentUser.role,
      phone: currentUser.phone,
      issuedAt: '2026-09-01',
      checksum: `sig-${currentUser.id.slice(-4)}-2026`,
    });

    QRCode.toDataURL(badgePayload, {
      width: 480,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(url => setMyBadgeQrUrl(url))
      .catch(err => console.error('Failed to generate badge QR:', err));
  }, [currentUser]);

  // Generate Workplace Station Kiosk QR Code
  useEffect(() => {
    const stationPayload = JSON.stringify({
      type: 'apms_kiosk_station',
      stationId: 'kiosk-hq-gate-a',
      stationName: 'Phnom Penh HQ - Main Gate Kiosk A',
      location: 'Phnom Penh HQ - Main Entrance Gate A',
      activeShifts: ['Morning', 'Evening'],
      enforcePeakHours: true,
      timestamp: Date.now(),
    });

    QRCode.toDataURL(stationPayload, {
      width: 520,
      margin: 2,
      color: {
        dark: '#0284c7',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(url => setStationKioskQrUrl(url))
      .catch(err => console.error('Failed to generate station QR:', err));
  }, []);

  // Stop camera media tracks cleanly
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  // Process Instant QR Scan Result
  const handleDecodedQrCode = useCallback((qrData: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Call high-speed instant QR attendance processor in db
    const res = db.instantQrScanAttendance({
      qrData,
      scannedByUserId: currentUser.id,
      preferredShift: selectedShiftMode,
      forceAction: actionSelection,
      stationLocation: 'Phnom Penh HQ - Main Entrance Gate A',
    });

    // Sound & Haptic Feedback
    if (soundEnabled) {
      if (res.action === 'checkIn') {
        qrAudio.playCheckInSuccess();
      } else if (res.action === 'checkOut') {
        qrAudio.playCheckOutSuccess();
      } else if (res.sound === 'warning') {
        qrAudio.playWarning();
      } else {
        qrAudio.playError();
      }
    }
    qrAudio.triggerHaptic(res.success ? 'success' : res.sound === 'warning' ? 'warning' : 'error');

    // Notify Web Push service if checkIn or checkOut occurred
    if (res.success && res.user && res.record) {
      if (res.action === 'checkIn') {
        webPushService.sendCheckInAlert({
          userName: res.user.name,
          shift: res.shift,
          time: res.record.checkInTime || res.instantTimestamp,
          status: res.record.status,
          location: res.record.location || 'HQ Main Gate (QR Code)',
        });
      } else if (res.action === 'checkOut') {
        webPushService.sendCheckOutAlert({
          userName: res.user.name,
          shift: res.shift,
          time: res.record.checkOutTime || res.instantTimestamp,
          workingHours: res.record.workingHours || 4,
          overtimeHours: res.record.overtimeHours || 0,
        });
      }
    }

    // Set Active Feedback overlay
    setActiveResult({
      success: res.success,
      user: res.user,
      action: res.action,
      shift: res.shift,
      message: res.message,
      timestamp: res.instantTimestamp,
      record: res.record,
    });

    // Increment Peak Hour counter & prepend to recent scans
    if (res.user) {
      setPeakHourCount(prev => prev + 1);
      const newScanItem: ScanLogItem = {
        id: `scan-${Date.now()}`,
        timestamp: res.instantTimestamp,
        userName: res.user.name,
        employeeId: res.user.employeeId,
        departmentName: db.getDepartments().find(d => d.id === res.user?.departmentId)?.name || 'General',
        shift: res.shift,
        action: res.action,
        status: res.record?.status || 'Present',
        duration: res.record?.workingHours,
        message: res.message,
        success: res.success,
      };
      setRecentScans(prev => [newScanItem, ...prev.slice(0, 9)]);
    }

    // Trigger parent refresh
    onAttendanceUpdated();

    // Auto-resume camera scanning after 1.4s for peak-hour continuous queue!
    setTimeout(() => {
      isProcessingRef.current = false;
      setActiveResult(null);
    }, 1400);
  }, [actionSelection, currentUser.id, onAttendanceUpdated, selectedShiftMode, soundEnabled]);

  // Frame processing loop for continuous video decoding
  const tickScanner = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessingRef.current) {
      animFrameRef.current = requestAnimationFrame(tickScanner);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data && !isProcessingRef.current) {
        handleDecodedQrCode(code.data);
      }
    }

    animFrameRef.current = requestAnimationFrame(tickScanner);
  }, [handleDecodedQrCode]);

  // Start camera media stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        lang === 'km' 
          ? 'កម្មវិធីរុករកនេះមិនគាំទ្រការប្រើប្រាស់កាមេរ៉ាផ្ទាល់ទេ។ សូមប្រើការបង្ហោះរូបភាព QR ជំនួសវិញ។' 
          : 'Camera access is not supported by your browser environment. You may use QR file upload instead.'
      );
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities && videoTrack.getCapabilities()) as { torch?: boolean } | undefined;
        setHasTorch(Boolean(capabilities?.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        animFrameRef.current = requestAnimationFrame(tickScanner);
      }
    } catch (err: unknown) {
      console.warn('Camera access denied or failed:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setCameraError(
        lang === 'km'
          ? `មិនអាចបើកកាមេរ៉ាបានទេ (${errMsg})។ សូមអនុញ្ញាតសិទ្ធិកាមេរ៉ាក្នុង browser ឬប្រើការបង្ហោះរូបភាពកូដ QR ផ្លូវការ APMS ជំនួសវិញ។`
          : `Unable to access camera (${errMsg}). Please verify camera permissions or upload an official APMS system QR code image below.`
      );
    }
  }, [facingMode, lang, stopCamera, tickScanner]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const newTorch = !torchOn;
      await (track as MediaStreamTrack & { applyConstraints?: (c: any) => Promise<void> }).applyConstraints({
        advanced: [{ torch: newTorch }],
      });
      setTorchOn(newTorch);
    } catch {
      // Torch not supported on some platforms
    }
  };

  // Flip Camera
  const flipCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Start or Stop Camera when tab or open state changes
  useEffect(() => {
    if (isOpen && activeTab === 'scanner') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode, startCamera, stopCamera]);

  // Handle Image File Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          handleDecodedQrCode(code.data);
        } else {
          alert(lang === 'km' ? 'រកមិនឃើញកូដ QR ក្នុងរូបភាពនេះទេ។' : 'No QR code could be found in the uploaded image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Toggle Fullscreen for Station Kiosk Display
  const toggleFullscreen = () => {
    if (!kioskContainerRef.current) return;
    if (!document.fullscreenElement) {
      kioskContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 ${lang === 'km' ? 'font-khmer' : ''}`}>
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col text-slate-100">
        
        {/* Header with Title & Peak Hours Fast-Track Status (Zero Overlap Responsive) */}
        <div className="p-3 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0">
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight break-words">
                  {lang === 'km' ? 'ម៉ាស៊ីនស្កេន QR វត្តមានល្បឿនលឿន' : 'Peak Hours Instant QR Shift Attendance'}
                </h2>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-700/60 shrink-0">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span>Fast-Track</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>System QR Only</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                <span>{lang === 'km' ? 'វេនព្រឹក (០៨:០០ - ១២:០០) & វេនល្ងាច (១៣:០០ - ១៧:០០)' : 'Dual Shifts: Morning (08:00 - 12:00) & Evening (13:00 - 17:00)'}</span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-emerald-400 font-mono font-semibold">{liveClock}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
            {/* Audio Toggle Button */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Chimes' : 'Unmute Chimes'}
              className={`p-2 rounded-xl border transition ${
                soundEnabled 
                  ? 'bg-slate-800 text-cyan-400 border-slate-700 hover:bg-slate-700' 
                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Scanner | My Badge | Station Kiosk (Mobile Responsive) */}
        <div className="px-3 sm:px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-1 sm:space-x-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className={`px-2.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{lang === 'km' ? 'កាមេរ៉ាស្កេន' : 'Scanner'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my-badge')}
              className={`px-2.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
                activeTab === 'my-badge'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{lang === 'km' ? 'កាត QR ខ្ញុំ' : 'My Badge'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kiosk-display')}
              className={`px-2.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
                activeTab === 'kiosk-display'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{lang === 'km' ? 'ច្រកទ្វារ Kiosk' : 'Station Kiosk'}</span>
            </button>
          </div>

          {/* Peak Hours Session Counter */}
          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-900/80 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400">{lang === 'km' ? 'ស្កេនវេននេះ:' : 'Fast-Track Scans:'}</span>
            <span className="font-bold text-white font-mono text-sm">{peakHourCount}</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: INSTANT CAMERA SCANNER                             */}
        {/* ========================================================= */}
        {activeTab === 'scanner' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            
            {/* Shift & Action Override Toolbar (Responsive & Zero Overlap) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-950/70 p-2.5 sm:p-3 rounded-2xl border border-slate-800 text-xs">
              
              {/* Shift Selector */}
              <div className="flex items-center space-x-2 min-w-0">
                <span className="font-semibold text-slate-400 whitespace-nowrap text-[11px] sm:text-xs shrink-0">
                  {lang === 'km' ? 'វេន:' : 'Shift:'}
                </span>
                <div className="grid grid-cols-3 gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => setSelectedShiftMode('Auto')}
                    className={`py-1 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium transition text-center truncate ${
                      selectedShiftMode === 'Auto'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    ⚡ Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedShiftMode('Morning')}
                    className={`py-1 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium transition flex items-center justify-center space-x-1 truncate ${
                      selectedShiftMode === 'Morning'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Sun className="w-3 h-3 shrink-0" />
                    <span>{lang === 'km' ? 'ព្រឹក' : 'Morning'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedShiftMode('Evening')}
                    className={`py-1 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium transition flex items-center justify-center space-x-1 truncate ${
                      selectedShiftMode === 'Evening'
                        ? 'bg-indigo-500 text-white font-bold shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Moon className="w-3 h-3 shrink-0" />
                    <span>{lang === 'km' ? 'ល្ងាច' : 'Evening'}</span>
                  </button>
                </div>
              </div>

              {/* Action Selector */}
              <div className="flex items-center space-x-2 min-w-0">
                <span className="font-semibold text-slate-400 whitespace-nowrap text-[11px] sm:text-xs shrink-0">
                  {lang === 'km' ? 'សកម្មភាព:' : 'Action:'}
                </span>
                <div className="grid grid-cols-3 gap-1 flex-1">
                  <button
                    type="button"
                    onClick={() => setActionSelection('auto')}
                    className={`py-1 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium transition text-center truncate ${
                      actionSelection === 'auto'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    🔄 Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionSelection('checkIn')}
                    className={`py-1 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium transition text-center truncate ${
                      actionSelection === 'checkIn'
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    📥 In
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionSelection('checkOut')}
                    className={`py-1 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium transition text-center truncate ${
                      actionSelection === 'checkOut'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    📤 Out
                  </button>
                </div>
              </div>

            </div>

            {/* Video Viewport / Scanner Reticle Container */}
            <div className="relative w-full max-w-lg mx-auto aspect-4/3 sm:aspect-16/10 bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-700 shadow-inner flex items-center justify-center">
              
              {/* Actual Video Track */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />

              {/* Hidden Canvas for Decoding Frames */}
              <canvas ref={canvasRef} className="hidden" />

              {/* High-Tech Reticle & Laser Sweep Animation */}
              {cameraActive && !activeResult && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                  {/* Outer dim mask */}
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-cyan-400/40 rounded-3xl overflow-hidden">
                    {/* Corner Radar Brackets */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />

                    {/* Animated Scanning Laser Sweep */}
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse transition-all duration-700" 
                      style={{
                        animation: 'scannerSweep 2.2s ease-in-out infinite alternate',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Instant Scan Success / Result Flash Overlay */}
              {activeResult && (
                <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-150 backdrop-blur-md ${
                  activeResult.success 
                    ? activeResult.action === 'checkIn' 
                      ? 'bg-emerald-950/90 border-4 border-emerald-500' 
                      : 'bg-blue-950/90 border-4 border-blue-500'
                    : 'bg-rose-950/90 border-4 border-rose-500'
                }`}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-2xl animate-bounce"
                    style={{
                      backgroundColor: activeResult.success 
                        ? activeResult.action === 'checkIn' ? '#10b981' : '#3b82f6'
                        : '#f43f5e'
                    }}
                  >
                    {activeResult.success ? (
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    ) : (
                      <AlertCircle className="w-10 h-10 text-white" />
                    )}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
                    {!activeResult.success
                      ? (lang === 'km' ? 'ការស្កេនត្រូវបានបដិសេធ (QR មិនត្រឹមត្រូវ)' : 'Scan Rejected: Invalid QR')
                      : activeResult.action === 'checkIn' 
                      ? (lang === 'km' ? 'បានចូលធ្វើការជោគជ័យ!' : 'Checked In Successfully!')
                      : activeResult.action === 'checkOut'
                      ? (lang === 'km' ? 'បានចេញពីធ្វើការជោគជ័យ!' : 'Checked Out Successfully!')
                      : (lang === 'km' ? 'ស្ថានភាពវត្តមាន' : 'Attendance Verified')}
                  </h3>

                  {activeResult.user && (
                    <div className="space-y-1 mb-2">
                      <p className="text-lg font-bold text-white">
                        {activeResult.user.name}
                      </p>
                      <div className="flex items-center justify-center space-x-2 text-xs">
                        <span className="px-2.5 py-0.5 rounded-full font-semibold bg-white/20 text-white">
                          {activeResult.shift === 'Morning' ? '☀️ Morning Shift' : '🌙 Evening Shift'}
                        </span>
                        <span className="font-mono text-slate-200">
                          {activeResult.timestamp}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-slate-200 max-w-sm">
                    {activeResult.message}
                  </p>

                  <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/40 text-[11px] text-slate-300 font-mono">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    <span>Auto-resuming in 1s for next staff...</span>
                  </div>
                </div>
              )}

              {/* Camera Error Message */}
              {cameraError && !cameraActive && (
                <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-950/95 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-sm">
                    {cameraError}
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center space-x-2 shadow-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{lang === 'km' ? 'ព្យាយាមបើកកាមេរ៉ាម្តងទៀត' : 'Retry Camera'}</span>
                  </button>
                </div>
              )}

              {/* Floating Camera Control Buttons */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                <div className="flex items-center space-x-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/60 text-xs text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{cameraActive ? 'Scanning Active' : 'Scanner Idle'}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2.5 rounded-2xl border transition shadow-lg ${
                        torchOn 
                          ? 'bg-amber-400 text-slate-950 border-amber-300' 
                          : 'bg-slate-900/80 text-white border-slate-700 hover:bg-slate-800'
                      }`}
                      title="Toggle Torch/Flashlight"
                    >
                      <Flashlight className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={flipCamera}
                    className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 transition shadow-lg"
                    title="Switch Camera (Front/Back)"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <label 
                    className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer transition shadow-lg flex items-center justify-center"
                    title="Upload QR Image"
                  >
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

              {/* System QR Verification Notice */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
                <div className="flex items-center space-x-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium truncate">
                    {lang === 'km' 
                      ? 'ប្រព័ន្ធសុវត្ថិភាព QR: អនុញ្ញាតតែការស្កេនកាតផ្លូវការ APMS ប៉ុណ្ណោះ' 
                      : 'System QR Security: Only authentic APMS badges or Station Kiosks can be scanned'}
                  </span>
                </div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 shrink-0 ml-2">
                  OFFICIAL ONLY
                </span>
              </div>

            {/* Recent Scans Drawer / Table */}
            {recentScans.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lang === 'km' ? 'ប្រវត្តិស្កេនថ្មីៗក្នុងវេននេះ' : 'Live Scans Stream (Peak-Hours Log)'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400 font-semibold">{recentScans.length} records</span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {recentScans.map(scan => (
                    <div
                      key={scan.id}
                      className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs animate-in fade-in duration-150"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          scan.action === 'checkIn' ? 'bg-emerald-400' : 'bg-blue-400'
                        }`} />
                        <span className="font-semibold text-slate-200 truncate">{scan.userName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({scan.employeeId})</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                          scan.shift === 'Morning' ? 'bg-amber-950 text-amber-300' : 'bg-indigo-950 text-indigo-300'
                        }`}>
                          {scan.shift}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] shrink-0 font-mono">
                        <span className={scan.action === 'checkIn' ? 'text-emerald-400 font-bold' : 'text-blue-400 font-bold'}>
                          {scan.action === 'checkIn' ? 'IN' : 'OUT'}
                        </span>
                        <span className="text-slate-400">{scan.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MY DIGITAL EMPLOYEE QR BADGE                       */}
        {/* ========================================================= */}
        {activeTab === 'my-badge' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center space-y-6">
            
            {/* Visual Employee Digital ID Card */}
            <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-700/80 rounded-3xl p-6 shadow-2xl text-center space-y-5 relative overflow-hidden">
              
              {/* Top Card Header Ribbon */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
                <div className="flex items-center space-x-1.5 font-bold text-cyan-400 uppercase tracking-wider text-[10px]">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Enterprise ID Pass</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">2026-2027</span>
              </div>

              {/* Employee Photo & Info */}
              <div className="flex flex-col items-center space-y-2">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white text-2xl font-black flex items-center justify-center shadow-xl shadow-cyan-500/20 border-2 border-slate-700">
                  {currentUser.name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{currentUser.name}</h3>
                  <p className="text-xs text-cyan-400 font-medium">{currentUser.position || currentUser.role}</p>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    ID: <span className="text-slate-200 font-bold">{currentUser.employeeId || 'EMP-001'}</span>
                  </p>
                </div>
              </div>

              {/* Large QR Code Display */}
              <div className="p-3.5 bg-white rounded-2xl shadow-xl inline-block mx-auto border-2 border-slate-200">
                {myBadgeQrUrl ? (
                  <img
                    src={myBadgeQrUrl}
                    alt="Employee QR Badge"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              {/* Dual Shifts Indicator */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                <p className="text-[11px] text-slate-400 font-medium">
                  {lang === 'km' ? 'វេនការងារប្រចាំថ្ងៃដែលត្រូវស្កេន:' : 'Mandatory Daily Work Shifts:'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-1.5 bg-amber-950/40 rounded-xl border border-amber-800/40 text-amber-300">
                    ☀️ <strong>Morning</strong>: 08:00 - 12:00
                  </div>
                  <div className="p-1.5 bg-indigo-950/40 rounded-xl border border-indigo-800/40 text-indigo-300">
                    🌙 <strong>Evening</strong>: 13:00 - 17:00
                  </div>
                </div>
              </div>

              {/* Anti-Fraud Watermark */}
              <div className="text-[10px] text-slate-500 font-mono">
                Watermark: APMS-SEC-AUTH • {liveClock}
              </div>

            </div>

            {/* Action Buttons: Download & Print */}
            <div className="flex items-center space-x-3">
              <a
                href={myBadgeQrUrl}
                download={`Badge-${currentUser.employeeId || 'EMP'}-${currentUser.name.replace(/\s+/g, '_')}.png`}
                className="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-cyan-600/25"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'km' ? 'ទាញយកកូដ QR' : 'Download QR Badge'}</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'km' ? 'បោះពុម្ពកាត' : 'Print Badge'}</span>
              </button>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: WORKPLACE STATION QR KIOSK DISPLAY                 */}
        {/* ========================================================= */}
        {activeTab === 'kiosk-display' && (
          <div 
            ref={kioskContainerRef}
            className={`flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center space-y-6 ${
              isFullscreen ? 'bg-slate-950 p-10 fixed inset-0 z-50' : ''
            }`}
          >
            <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Kiosk Station Gate A
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Phnom Penh HQ - Main Entrance
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Toggle Fullscreen Kiosk Mode"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Station QR Code Display */}
              <div className="p-4 bg-white rounded-3xl shadow-2xl inline-block mx-auto border-4 border-cyan-500/40">
                {stationKioskQrUrl ? (
                  <img
                    src={stationKioskQrUrl}
                    alt="Workplace Station QR"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  </div>
                )}
              </div>

              {/* Live Clock & Shift Status */}
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-black font-mono text-white tracking-wider">
                  {liveClock}
                </p>
                <p className="text-xs text-slate-400">
                  {lang === 'km' 
                    ? 'ស្កេនកូដនេះជាមួយទូរស័ព្ទរបស់អ្នក ដើម្បីចូល ឬចេញពីធ្វើការភ្លាមៗ' 
                    : 'Point your mobile camera at this QR code for instantaneous check-in or checkout.'}
                </p>
              </div>

              {/* Dual Shifts Banner */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-left">
                  <div className="flex items-center space-x-1.5 text-amber-400 font-bold mb-0.5">
                    <Sun className="w-3.5 h-3.5" />
                    <span>Morning Shift</span>
                  </div>
                  <p className="text-[11px] text-slate-300">08:00 - 12:00</p>
                  <span className="text-[10px] text-amber-400/80">Grace to 08:15</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-left">
                  <div className="flex items-center space-x-1.5 text-indigo-400 font-bold mb-0.5">
                    <Moon className="w-3.5 h-3.5" />
                    <span>Evening Shift</span>
                  </div>
                  <p className="text-[11px] text-slate-300">13:00 - 17:00</p>
                  <span className="text-[10px] text-indigo-400/80">Grace to 13:15</span>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
