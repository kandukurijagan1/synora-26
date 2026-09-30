import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Search,
  Camera,
  Users,
  Award,
  Download,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  LogOut,
  FileSpreadsheet,
  Building,
  GraduationCap,
  CheckCheck,
  UserCheck,
  ExternalLink,
  X,
  CreditCard,
  Code2,
  Database,
  Sparkles,
  FileCode,
  ShieldAlert,
  History,
  Clock,
  Fingerprint,
  Settings,
  Link2,
  Mail,
  Send,
  UserPlus,
  Trash2,
  AtSign,
  Key,
  Volume2,
  VolumeX,
  Zap,
  Layers,
  Printer,
  HelpCircle,
  RotateCcw,
  FlipHorizontal,
  Upload
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { SynoraApi, extractTeamIdFromQr, reconstructTicketFromQr } from '../../services/api';
import { decodeQrFromImageFile } from '../../utils/qrDecoder';
import { GOOGLE_APPS_SCRIPT_SOURCE } from '../../data/appsScriptSource';
import {
  authenticateAuthorizedEmail,
  sendOtpToAuthorizedEmail,
  verifyEmailOtp,
  checkEmailAuthorization,
  getAllAuthorizedOrganizers,
  addAuthorizedOrganizer,
  removeAuthorizedOrganizer,
  validateActiveSession,
  terminateSession,
  getLockoutStatus,
  logAuditEvent,
  getAuditLogs,
  generateAntiAgentChallenge,
  verifyAntiAgentChallenge,
  AntiAgentVerification,
  OrganizerSession,
  AuthorizedOrganizer,
  AuditLogEntry
} from '../../utils/security';
import { TeamTicket } from '../../types';
import { soundFX } from '../../utils/audio';

interface OrganizerPortalProps {
  onBackToHome: () => void;
  onOpenPass?: (teamId: string) => void;
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const OrganizerPortal: React.FC<OrganizerPortalProps> = ({
  onBackToHome,
  onOpenPass
}) => {
  // Authentication & Session State
  const [session, setSession] = useState<OrganizerSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [organizerName, setOrganizerName] = useState('Desk Coordinator');
  
  // Login Modes: 'google' (OAuth - Primary) | 'otp' (Gmail Code)
  const [loginMode, setLoginMode] = useState<'google' | 'otp'>('google');
  const [emailInput, setEmailInput] = useState('kandukurijagan99@gmail.com');
  const [detectedOrganizer, setDetectedOrganizer] = useState<AuthorizedOrganizer | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<string>('--:--');

  // Google OAuth State
  const [googleClientId, setGoogleClientId] = useState(() => {
    const saved = localStorage.getItem('crispr26_google_client_id');
    if (saved && !saved.includes('sample-cr26')) return saved;
    return '902168382803-6gof845v72ku6k4lp4mecsgr3l1uc3s0.apps.googleusercontent.com';
  });
  const [isGoogleConfigOpen, setIsGoogleConfigOpen] = useState(false);
  const [googleConfigInput, setGoogleConfigInput] = useState(googleClientId);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Real Gmail Code Dispatch State
  const [otpInput, setOtpInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpFeedback, setOtpFeedback] = useState<string | null>(null);

  // Anti-AI Agent & Bot Proof-of-Humanity Challenge State
  const [humanChallenge, setHumanChallenge] = useState<AntiAgentVerification | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [isHumanVerified, setIsHumanVerified] = useState(false);

  // Authorized Organizers Modal State
  const [isOrganizersModalOpen, setIsOrganizersModalOpen] = useState(false);
  const [authorizedOrganizersList, setAuthorizedOrganizersList] = useState<AuthorizedOrganizer[]>([]);
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgRole, setNewOrgRole] = useState<'superadmin' | 'coordinator' | 'reception' | 'verifier'>('coordinator');
  const [newOrgDept, setNewOrgDept] = useState('SIMATS Biotechnology');

  // Activity & Audit Log State
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Live Attendance Data
  const [teams, setTeams] = useState<TeamTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'present' | 'pending' | 'student' | 'faculty'>('all');
  const [selectedTeam, setSelectedTeam] = useState<TeamTicket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState(false);

  // Google Sheet Live Sync & API Config State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const [apiConfigUrl, setApiConfigUrl] = useState(SynoraApi.getScriptUrl());
  const [apiConfigSaved, setApiConfigSaved] = useState(false);

  // Performance & Filter States
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isDenseView, setIsDenseView] = useState(() => localStorage.getItem('crispr26_dense_view') === 'true');
  const [isMuted, setIsMuted] = useState(() => soundFX.getMuted());
  const [latencyInfo, setLatencyInfo] = useState<{ latencyMs: number | null; ok: boolean | null; message: string; lastTested: string | null }>({
    latencyMs: null,
    ok: null,
    message: 'Apps Script Ready',
    lastTested: null
  });
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState<'off' | '30s' | '60s'>('off');
  const [isKioskMode, setIsKioskMode] = useState(true); // Continuous rapid scanner mode enabled by default
  const [sessionScanHistory, setSessionScanHistory] = useState<Array<{ teamId: string; teamName: string; time: string; timestamp: number }>>([]);
  const [collegeFilter, setCollegeFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [sortBy, setSortBy] = useState<'registeredAt' | 'teamName' | 'teamId' | 'checkinTime' | 'totalFee'>('registeredAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // QR Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modalManualQuery, setModalManualQuery] = useState('');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Copy Feedback
  const [copiedMails, setCopiedMails] = useState(false);
  const [copiedTeamId, setCopiedTeamId] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Modal Scroll Lock Guard (Prevents background page scrolling or footer overlapping when modals are open)
  const isAnyModalOpen =
    isScannerOpen ||
    isDetailModalOpen ||
    isReceiptModalOpen ||
    isAppsScriptModalOpen ||
    isOrganizersModalOpen ||
    isAuditLogModalOpen ||
    isApiConfigOpen ||
    isShortcutsModalOpen;

  useEffect(() => {
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || '';
      };
    }
  }, [isAnyModalOpen]);

  // Initialize and validate session on mount
  useEffect(() => {
    void (async () => {
      // Check lockout status
      const lock = getLockoutStatus();
      if (lock.isLocked) {
        setLockoutTimer(lock.remainingSeconds);
      }

      // Verify signed active session
      const validSession = await validateActiveSession();
      if (validSession) {
        setSession(validSession);
        setIsAuthenticated(true);
        setOrganizerName(validSession.name);
      }
    })();

    loadAttendanceData();
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutTimer]);

  // Session Time Remaining Calculation (Interval)
  useEffect(() => {
    if (!isAuthenticated || !session) return;

    const updateRemaining = () => {
      const now = Date.now();
      const diffMs = session.expiresAt - now;
      if (diffMs <= 0) {
        handleLockScreen('Session expired after 4 hours');
        return;
      }
      const totalMinutes = Math.floor(diffMs / (60 * 1000));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setSessionTimeRemaining(`${hours}h ${minutes.toString().padStart(2, '0')}m`);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 30000); // every 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, session]);

  // Inactivity auto-lock guard (15 minutes idle time)
  useEffect(() => {
    if (!isAuthenticated) return;

    let idleTimer: NodeJS.Timeout;
    const IDLE_LIMIT = 15 * 60 * 1000; // 15 Minutes

    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        soundFX.playClick();
        terminateSession('Desk auto-locked due to 15 minutes of inactivity');
        setIsAuthenticated(false);
        setSession(null);
        setAuthError('🔒 Desk auto-locked due to 15 minutes of inactivity for security.');
      }, IDLE_LIMIT);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetIdle));
    resetIdle();

    return () => {
      clearTimeout(idleTimer);
      events.forEach((evt) => window.removeEventListener(evt, resetIdle));
    };
  }, [isAuthenticated]);

  // Global Keyboard Power Shortcuts Handler
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

      // 1. Escape: Close modals or unfocus search
      if (e.key === 'Escape') {
        if (isScannerOpen) { stopCameraScanner(); return; }
        if (isDetailModalOpen) { setIsDetailModalOpen(false); return; }
        if (isReceiptModalOpen) { setIsReceiptModalOpen(false); return; }
        if (isAppsScriptModalOpen) { setIsAppsScriptModalOpen(false); return; }
        if (isOrganizersModalOpen) { setIsOrganizersModalOpen(false); return; }
        if (isAuditLogModalOpen) { setIsAuditLogModalOpen(false); return; }
        if (isApiConfigOpen) { setIsApiConfigOpen(false); return; }
        if (isShortcutsModalOpen) { setIsShortcutsModalOpen(false); return; }
        if (isInputFocused) { (activeEl as HTMLElement).blur(); }
        return;
      }

      // 2. Hotkeys with Ctrl or Alt modifiers
      if (e.ctrlKey || e.altKey) {
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
          return;
        }
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          void handleSyncSheet(true);
          return;
        }
        if (e.key.toLowerCase() === 'q') {
          e.preventDefault();
          if (isScannerOpen) stopCameraScanner();
          else startCameraScanner();
          return;
        }
        if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          handleExportCsv();
          return;
        }
        if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          handleCopyCertificateEmails();
          return;
        }
        if (e.key.toLowerCase() === 'b' && selectedTeamIds.length > 0) {
          e.preventDefault();
          void handleBulkMarkPresent();
          return;
        }
      }

      // 3. Single-key shortcuts when NOT inside an input/textarea
      if (!isInputFocused) {
        if (e.key === '/') {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
          return;
        }
        if (e.key === '?') {
          e.preventDefault();
          setIsShortcutsModalOpen((prev) => !prev);
          soundFX.playClick();
          return;
        }
        if (e.key === '1') { setActiveTab('all'); soundFX.playClick(); return; }
        if (e.key === '2') { setActiveTab('present'); soundFX.playClick(); return; }
        if (e.key === '3') { setActiveTab('pending'); soundFX.playClick(); return; }
        if (e.key === '4') { setActiveTab('student'); soundFX.playClick(); return; }
        if (e.key === '5') { setActiveTab('faculty'); soundFX.playClick(); return; }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAuthenticated,
    isScannerOpen,
    isDetailModalOpen,
    isReceiptModalOpen,
    isAppsScriptModalOpen,
    isOrganizersModalOpen,
    isAuditLogModalOpen,
    isApiConfigOpen,
    isShortcutsModalOpen,
    selectedTeamIds
  ]);

  // Auto-Sync background polling
  useEffect(() => {
    if (!isAuthenticated || autoSyncInterval === 'off') return;
    const intervalMs = autoSyncInterval === '30s' ? 30000 : 60000;
    const timer = setInterval(() => {
      void handleSyncSheet(false);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isAuthenticated, autoSyncInterval]);

  // Network Ping Test
  const handleTestPing = async () => {
    setIsTestingPing(true);
    soundFX.playPamLock();
    try {
      const res = await SynoraApi.measurePing();
      setLatencyInfo({
        latencyMs: res.latencyMs,
        ok: res.ok,
        message: res.message,
        lastTested: new Date().toLocaleTimeString()
      });
      if (res.ok) soundFX.playSuccess();
      else soundFX.playClick();
      logAuditEvent('PING_TEST', `Latency test: ${res.latencyMs}ms (${res.ok ? 'OK' : 'FAIL'})`, res.ok ? 'SUCCESS' : 'WARN', session?.name || organizerName, session?.roleTitle || 'Organizer');
    } catch {
      setLatencyInfo({
        latencyMs: 999,
        ok: false,
        message: 'Ping Failed',
        lastTested: new Date().toLocaleTimeString()
      });
    } finally {
      setIsTestingPing(false);
    }
  };

  // Sound FX Toggle
  const handleToggleSound = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
    if (!muted) soundFX.playSuccess();
  };

  // Dense View Toggle
  const handleToggleDenseView = () => {
    soundFX.playClick();
    setIsDenseView((prev) => {
      const next = !prev;
      localStorage.setItem('crispr26_dense_view', String(next));
      return next;
    });
  };

  // Bulk Mark Attendance Present
  const handleBulkMarkPresent = async () => {
    if (selectedTeamIds.length === 0) return;
    soundFX.playSuccess();
    try {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    } catch {}

    const res = await SynoraApi.bulkMarkAttendance(selectedTeamIds, organizerName);
    loadAttendanceData();
    logAuditEvent('BULK_CHECKIN', `Checked in ${res.count} teams`, 'SUCCESS', session?.name || organizerName, session?.roleTitle || 'Organizer');
    setSyncFeedback(`✅ Checked in ${res.count} teams!`);
    setSelectedTeamIds([]);
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  // Bulk Unmark Attendance
  const handleBulkUnmark = async () => {
    if (selectedTeamIds.length === 0) return;
    soundFX.playClick();
    const res = await SynoraApi.bulkUnmarkAttendance(selectedTeamIds);
    loadAttendanceData();
    logAuditEvent('BULK_UNMARK', `Reverted check-in for ${res.count} teams`, 'SUCCESS', session?.name || organizerName, session?.roleTitle || 'Organizer');
    setSyncFeedback(`🔄 Reverted check-in for ${res.count} teams.`);
    setSelectedTeamIds([]);
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  // Bulk Copy Selected Emails
  const handleBulkCopyEmails = () => {
    soundFX.playClick();
    const selectedTeamsList = teams.filter((t) => selectedTeamIds.includes(t.teamId));
    const emails: string[] = [];
    selectedTeamsList.forEach((t) => {
      if (t.leaderEmail) emails.push(t.leaderEmail);
      if (Array.isArray(t.memberDetails)) {
        t.memberDetails.forEach((m) => {
          if (m.email) emails.push(m.email);
        });
      }
    });
    const unique = Array.from(new Set(emails));
    navigator.clipboard.writeText(unique.join(', '));
    setCopiedMails(true);
    setTimeout(() => setCopiedMails(false), 2500);
  };

  // Bulk Export Selected Rows to CSV
  const handleBulkExportCsv = () => {
    soundFX.playClick();
    const selectedTeamsList = teams.filter((t) => selectedTeamIds.includes(t.teamId));
    const csvData = SynoraApi.exportAttendanceCsv(selectedTeamsList);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CRISPR26_Selected_${selectedTeamsList.length}_Teams_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle Single Row Selection
  const handleToggleSelectRow = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  // Toggle Select All Visible Rows
  const handleToggleSelectAll = () => {
    if (selectedTeamIds.length === filteredTeams.length && filteredTeams.length > 0) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(filteredTeams.map((t) => t.teamId));
    }
  };

  // Print Pass Badge Helper
  const handlePrintBadge = (team: TeamTicket) => {
    soundFX.playClick();
    const printWindow = window.open('', '_blank', 'width=800,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>CRISPR '26 Entry Pass - ${team.teamId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111; }
            .card { border: 2px solid #000; border-radius: 16px; padding: 24px; max-width: 500px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: 800; text-transform: uppercase; }
            .subtitle { font-size: 12px; color: #555; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
            .label { color: #666; font-weight: 600; }
            .value { font-weight: 700; }
            .tag { display: inline-block; padding: 4px 10px; background: #e0f2fe; color: #0369a1; border-radius: 6px; font-weight: 800; font-size: 14px; }
            .footer { text-align: center; font-size: 10px; color: #777; margin-top: 16px; border-top: 1px dashed #aaa; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="title">CRISPR '26 Workshop</div>
              <div class="subtitle">SIMATS Engineering · Department of Medical Biotechnology (Sponsored by IET)</div>
              <div style="margin-top:8px;"><span class="tag">${team.teamId}</span></div>
            </div>
            <div class="row"><span class="label">Team / Delegate:</span><span class="value">${team.teamName}</span></div>
            <div class="row"><span class="label">Team Leader:</span><span class="value">${team.leaderName}</span></div>
            <div class="row"><span class="label">Mobile:</span><span class="value">${team.leaderPhone || 'N/A'}</span></div>
            <div class="row"><span class="label">Email:</span><span class="value">${team.leaderEmail}</span></div>
            <div class="row"><span class="label">College:</span><span class="value">${team.college}</span></div>
            <div class="row"><span class="label">Category:</span><span class="value">${(team.participantCategory || 'student').toUpperCase()} TIER</span></div>
            <div class="row"><span class="label">Venue:</span><span class="value">RB Seminar Hall</span></div>
            <div class="row"><span class="label">Status:</span><span class="value">${team.checkedIn ? 'PRESENT (VERIFIED)' : 'REGISTERED DELEGATE'}</span></div>
            <div class="footer">Please present this pass badge at the registration desk for verification.</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const loadAttendanceData = () => {
    const data = SynoraApi.getAllTeams();
    setTeams([...data]);
  };

  // Sync latest registration & attendance records from Google Sheet
  const handleSyncSheet = async (showNotification = true) => {
    setIsSyncing(true);
    if (showNotification) soundFX.playClick();

    try {
      const res = await SynoraApi.syncWithGoogleSheet();
      setTeams([...res.teams]);
      if (showNotification) {
        if (res.success) {
          soundFX.playSuccess();
          setSyncFeedback(`✅ Synchronized ${res.count} teams from Google Sheets!`);
          logAuditEvent('SYNC_SHEET', `Synchronized ${res.count} teams with Google Sheet`, 'SUCCESS', session?.name || organizerName, session?.roleTitle || 'Organizer');
        } else {
          setSyncFeedback(`ℹ️ ${res.message}`);
        }
      }
    } catch {
      if (showNotification) {
        setSyncFeedback('⚠️ Connection timeout syncing with Google Sheets.');
      }
    } finally {
      setIsSyncing(false);
      if (showNotification) {
        setTimeout(() => setSyncFeedback(null), 3500);
      }
    }
  };

  // Save custom Apps Script Web App URL
  const handleSaveApiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.playClick();
    SynoraApi.setScriptUrl(apiConfigUrl);
    setApiConfigSaved(true);
    logAuditEvent('CONFIG_UPDATE', 'Updated Google Sheets integration URL', 'SUCCESS', session?.name || organizerName, session?.roleTitle || 'Organizer');
    await handleSyncSheet(true);
    setTimeout(() => {
      setApiConfigSaved(false);
      setIsApiConfigOpen(false);
    }, 1500);
  };

  // Reset Apps Script URL to default
  const handleResetApiUrl = () => {
    soundFX.playClick();
    SynoraApi.setScriptUrl('');
    setApiConfigUrl(SynoraApi.getScriptUrl());
    setApiConfigSaved(true);
    setTimeout(() => setApiConfigSaved(false), 2000);
  };

  // Load and refresh authorized organizers list
  const refreshOrganizersList = () => {
    setAuthorizedOrganizersList(getAllAuthorizedOrganizers());
  };

  useEffect(() => {
    refreshOrganizersList();
  }, []);

  // Live check of email input against authorized directory
  useEffect(() => {
    const clean = emailInput.trim().toLowerCase();
    if (clean) {
      const match = checkEmailAuthorization(clean);
      setDetectedOrganizer(match);
    } else {
      setDetectedOrganizer(null);
    }
  }, [emailInput]);

  // Google Credential Verification Handler (Called by Google Identity Services)
  const handleGoogleVerifiedCredential = async (credential: string) => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const googleUser = JSON.parse(jsonPayload);
      const verifiedEmail = googleUser.email?.trim().toLowerCase();

      if (!verifiedEmail) {
        setAuthError('Could not verify email from Google account response.');
        return;
      }

      const match = checkEmailAuthorization(verifiedEmail);
      if (!match) {
        setAuthError(`🚫 Access Denied: Google Account "${verifiedEmail}" is not listed in the approved organizers list.`);
        return;
      }

      const res = await authenticateAuthorizedEmail(verifiedEmail);
      if (res.success && res.session) {
        soundFX.playSuccess();
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
        setSession(res.session);
        setIsAuthenticated(true);
        setOrganizerName(res.session.name);
        void handleSyncSheet(false);
      } else {
        setAuthError(res.error || 'Authentication error.');
      }
    } catch (err) {
      console.error('Google token decode error:', err);
      setAuthError('Failed to parse Google login response.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Trigger Google OAuth Popup
  const handleGoogleOAuthPopup = () => {
    setIsAuthenticating(true);
    setAuthError(null);

    const win = window as any;
    if (win.google && win.google.accounts) {
      // 1. Try OAuth2 token client popup
      if (win.google.accounts.oauth2) {
        try {
          const tokenClient = win.google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: 'email profile openid',
            callback: async (resp: any) => {
              if (resp && resp.access_token) {
                try {
                  const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${resp.access_token}` }
                  });
                  const uData = await uRes.json();
                  const verifiedEmail = uData.email?.trim().toLowerCase();
                  if (verifiedEmail) {
                    const match = checkEmailAuthorization(verifiedEmail);
                    if (match) {
                      const res = await authenticateAuthorizedEmail(verifiedEmail);
                      if (res.success && res.session) {
                        soundFX.playSuccess();
                        try {
                          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                        } catch {}
                        setSession(res.session);
                        setIsAuthenticated(true);
                        setOrganizerName(res.session.name);
                        void handleSyncSheet(false);
                      }
                    } else {
                      setAuthError(`🚫 Access Denied: Google Account "${verifiedEmail}" is not listed in the approved organizers list.`);
                    }
                  }
                } catch (e) {
                  setAuthError('Could not fetch user profile from Google.');
                } finally {
                  setIsAuthenticating(false);
                }
              } else {
                setIsAuthenticating(false);
              }
            },
            error_callback: (err: any) => {
              console.error('Google OAuth error:', err);
              setIsAuthenticating(false);
              setAuthError('Google sign-in popup was closed. You can also sign in via Email Login Code.');
            }
          });
          tokenClient.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (err) {
          console.warn('OAuth tokenClient error:', err);
        }
      }

      // 2. Try Google Identity Services One-Tap prompt
      if (win.google.accounts.id) {
        try {
          win.google.accounts.id.prompt();
          setIsAuthenticating(false);
          return;
        } catch (e) {}
      }
    }

    // Fallback if Google GIS popup is unavailable in local sandbox
    setIsAuthenticating(false);
    setLoginMode('otp');
    setAuthError('Please verify using a 6-digit Login Code sent to your Gmail inbox.');
  };

  // Google Identity Services (GIS) Listener & Button Renderer
  useEffect(() => {
    const win = window as any;
    if (win.google && win.google.accounts && win.google.accounts.id) {
      try {
        win.google.accounts.id.initialize({
          client_id: googleClientId,
          auto_select: false,
          callback: (response: any) => {
            if (response && response.credential) {
              void handleGoogleVerifiedCredential(response.credential);
            }
          }
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = '';
          win.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'filled_blue',
            size: 'large',
            shape: 'pill',
            width: 280,
            text: 'continue_with'
          });
        }
      } catch {}
    }
  }, [googleClientId, isAuthenticated, loginMode]);

  const refreshHumanChallenge = async () => {
    try {
      const ch = await generateAntiAgentChallenge();
      setHumanChallenge(ch);
      setChallengeAnswer('');
    } catch {}
  };

  useEffect(() => {
    if (!isAuthenticated) {
      void refreshHumanChallenge();
    }
  }, [isAuthenticated]);

  // Send 6-Digit Code to Authorized Gmail (Anti-AI Agent & Whitelist Guarded)
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setAuthError('Please enter your organizer email address.');
      return;
    }

    // Anti-AI Agent / Bot Proof-of-Humanity Verification Check
    if (!isHumanVerified && humanChallenge) {
      const isPassed = await verifyAntiAgentChallenge(challengeAnswer, humanChallenge);
      if (!isPassed) {
        soundFX.playClick();
        setAuthError('🛡️ Anti-Agent Verification failed. Please answer the Human Verification Check accurately.');
        void refreshHumanChallenge();
        return;
      }
      setIsHumanVerified(true);
    }

    const authCheck = checkEmailAuthorization(cleanEmail);
    if (!authCheck) {
      soundFX.playClick();
      setAuthError(`🚫 Access Denied: "${cleanEmail}" is not in the approved organizer list.`);
      return;
    }

    setIsSendingOtp(true);
    setAuthError(null);
    setOtpFeedback(null);
    soundFX.playClick();

    try {
      const res = await sendOtpToAuthorizedEmail(cleanEmail, SynoraApi.getScriptUrl());
      if (res.success) {
        soundFX.playSuccess();
        setLoginMode('otp');
        setOtpFeedback(res.message);
        setOtpInput('');
      } else {
        soundFX.playClick();
        setAuthError(res.message);
      }
    } catch (err) {
      setAuthError('Could not connect to the email verification service.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify 6-Digit Email Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    if (!otpInput.trim()) {
      setAuthError('Please enter the 6-digit login code sent to your Gmail.');
      return;
    }

    setAuthError(null);
    setIsAuthenticating(true);

    try {
      const res = await verifyEmailOtp(emailInput.trim(), otpInput.trim());
      if (res.success && res.session) {
        soundFX.playSuccess();
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
        setSession(res.session);
        setIsAuthenticated(true);
        setOrganizerName(res.session.name);
        setOtpInput('');
        setOtpFeedback(null);
        void handleSyncSheet(false);
      } else {
        soundFX.playClick();
        setAuthError(res.error || 'Incorrect 6-digit login code.');
      }
    } catch (err) {
      setAuthError('Error verifying code. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Save Google Client ID
  const handleSaveGoogleClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = googleConfigInput.trim();
    if (clean) {
      localStorage.setItem('crispr26_google_client_id', clean);
      setGoogleClientId(clean);
      setIsGoogleConfigOpen(false);
      soundFX.playSuccess();
    }
  };

  // Chief Organizer Access Check (Strictly restricted to kandukurijagan99@gmail.com only)
  const isChiefAdmin = session?.email?.toLowerCase().trim() === 'kandukurijagan99@gmail.com';

  // Add Authorized Organizer (Restricted to kandukurijagan99@gmail.com only)
  const handleAddNewOrganizer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChiefAdmin) {
      alert('Access Restricted: Only the Chief Organizer (kandukurijagan99@gmail.com) has permission to add new organizer accounts.');
      return;
    }
    if (!newOrgEmail.trim() || !newOrgName.trim()) return;

    soundFX.playSuccess();
    addAuthorizedOrganizer({
      email: newOrgEmail.trim().toLowerCase(),
      name: newOrgName.trim(),
      role: newOrgRole,
      roleTitle:
        newOrgRole === 'superadmin'
          ? 'Faculty Admin & Lead'
          : newOrgRole === 'coordinator'
          ? 'Event Coordinator'
          : newOrgRole === 'reception'
          ? 'Reception Desk'
          : 'Certificate Verifier',
      department: newOrgDept.trim() || 'SIMATS Engineering'
    });

    setNewOrgEmail('');
    setNewOrgName('');
    setAuthorizedOrganizersList(getAllAuthorizedOrganizers());
  };

  // Remove Authorized Organizer (Restricted to kandukurijagan99@gmail.com only)
  const handleRemoveOrganizer = (email: string) => {
    if (!isChiefAdmin) {
      alert('Access Restricted: Only the Chief Organizer (kandukurijagan99@gmail.com) has permission to remove organizer accounts.');
      return;
    }
    soundFX.playClick();
    removeAuthorizedOrganizer(email);
    setAuthorizedOrganizersList((prev) => prev.filter((o) => o.email.toLowerCase() !== email.toLowerCase()));
  };

  const handleLockScreen = (reason = 'Desk locked') => {
    soundFX.playClick();
    terminateSession(reason);
    setIsAuthenticated(false);
    setSession(null);
    setAuthError('🔒 Desk locked. Please log in to resume.');
  };

  const handleLogout = () => {
    soundFX.playClick();
    terminateSession('Organizer clicked logout');
    setIsAuthenticated(false);
    setSession(null);
    setAuthError(null);
  };

  const handleOpenAuditLogs = () => {
    soundFX.playClick();
    setAuditLogs(getAuditLogs());
    setIsAuditLogModalOpen(true);
  };

  // Core QR Processing logic (handles Camera, Image File, and In-Modal Manual Lookup)
  const handleProcessScannedCode = async (decodedText: string) => {
    const raw = (decodedText || '').trim();
    if (!raw) return;

    const now = Date.now();
    if (raw === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2500) {
      return;
    }
    lastScannedCodeRef.current = raw;
    lastScannedTimeRef.current = now;

    try {
      const extractedId = extractTeamIdFromQr(raw);
      setScanFeedback(`🔍 Checking Pass "${extractedId || raw}"...`);

      // 1. Lookup in local roster first
      const all = SynoraApi.getAllTeams();
      let hit: TeamTicket | null | undefined = all.find(
        (t) =>
          t.teamId.toUpperCase() === extractedId.toUpperCase() ||
          t.leaderEmail.toLowerCase() === extractedId.toLowerCase() ||
          t.teamName.toLowerCase() === extractedId.toLowerCase() ||
          (t.leaderPhone && t.leaderPhone.replace(/\D/g, '') === extractedId.replace(/\D/g, ''))
      );

      // 2. Try reconstruct directly from scanned self-contained payload if present
      if (!hit) {
        hit = reconstructTicketFromQr(raw);
      }

      // 3. If not found in local memory, query Google Sheets backend live
      if (!hit) {
        hit = await SynoraApi.getTicket(extractedId);
      }

      if (hit) {
        soundFX.playSuccess();
        const res = await SynoraApi.markAttendance(hit.teamId, organizerName);
        loadAttendanceData();

        setSessionScanHistory((prev) => [
          {
            teamId: hit!.teamId,
            teamName: hit!.teamName,
            time: new Date().toLocaleTimeString(),
            timestamp: Date.now()
          },
          ...prev.slice(0, 19)
        ]);

        setScanFeedback(`✅ Verified & Checked In: ${hit.teamName} (${hit.teamId})`);
        try {
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.5 } });
        } catch {}

        if (!isKioskMode) {
          setSelectedTeam(res.ticket || hit);
          setIsDetailModalOpen(true);
          await stopCameraScanner();
        }
      } else {
        soundFX.playClick();
        setScanFeedback(`⚠️ Scanned ID "${extractedId}" not found in registered records.`);
      }
    } catch (err) {
      console.error('Scan processing error:', err);
      setScanFeedback('⚠️ Error reading pass data. Try searching manually.');
    }
  };

  // Launch Pro Camera QR Scanner directly (Zero default html5-qrcode clutter)
  const startCameraScanner = async (facingOverride?: unknown) => {
    soundFX.playClick();
    setIsScannerOpen(true);
    setScanFeedback(null);
    setCameraError(null);
    setIsCameraActive(false);

    const facing: 'environment' | 'user' =
      typeof facingOverride === 'string' && (facingOverride === 'environment' || facingOverride === 'user')
        ? facingOverride
        : cameraFacingMode;

    setTimeout(async () => {
      try {
        if (qrScannerRef.current) {
          try {
            if (qrScannerRef.current.isScanning) {
              await qrScannerRef.current.stop();
            }
            qrScannerRef.current.clear();
          } catch {}
          qrScannerRef.current = null;
        }

        const scanner = new Html5Qrcode('organizer-qr-reader');
        qrScannerRef.current = scanner;

        const config = {
          fps: 20,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await scanner.start(
          { facingMode: facing },
          config,
          (decodedText) => {
            void handleProcessScannedCode(decodedText);
          },
          () => {} // suppress per-frame no-code scan ticks
        );

        setIsCameraActive(true);
      } catch (e: any) {
        console.error('Camera Scanner start error:', e);
        setCameraError(
          e?.message ||
          'Camera access not available. Please allow camera permissions or upload a QR image screenshot.'
        );
        setIsCameraActive(false);
      }
    }, 150);
  };

  const stopCameraScanner = async () => {
    soundFX.playClick();
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        qrScannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      qrScannerRef.current = null;
    }
    setIsCameraActive(false);
    setIsScannerOpen(false);
  };

  const handleToggleCameraFacing = async () => {
    soundFX.playClick();
    const newFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(newFacing);
    if (isScannerOpen) {
      await startCameraScanner(newFacing);
    }
  };

  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundFX.playClick();
    setScanFeedback('🔍 Analyzing QR image file (7-pass decoder)...');

    try {
      const decodedResult = await decodeQrFromImageFile(file);
      if (decodedResult) {
        await handleProcessScannedCode(decodedResult);
      } else {
        setScanFeedback('⚠️ Could not decode QR code from this image. Please ensure the QR code is clearly visible.');
      }
    } catch (err: any) {
      console.error('Error reading QR image:', err);
      setScanFeedback(err?.message || '⚠️ No valid QR code detected in the selected image.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Quick Manual Check-in / ID Lookup
  const handleQuickLookup = async (queryText: string) => {
    const cleanId = extractTeamIdFromQr(queryText).trim();
    if (!cleanId) return;

    soundFX.playClick();
    setIsSearchingLive(true);

    try {
      const all = SynoraApi.getAllTeams();
      let hit: TeamTicket | null | undefined = all.find(
        (t) =>
          t.teamId.toUpperCase() === cleanId.toUpperCase() ||
          t.leaderEmail.toLowerCase() === cleanId.toLowerCase() ||
          t.teamName.toLowerCase() === cleanId.toLowerCase() ||
          (t.leaderPhone && t.leaderPhone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
      );

      if (!hit) {
        hit = await SynoraApi.getTicket(cleanId);
      }

      if (hit) {
        soundFX.playSuccess();
        const res = await SynoraApi.markAttendance(hit.teamId, organizerName);
        loadAttendanceData();
        setSelectedTeam(res.ticket || hit);
        setIsDetailModalOpen(true);
        try {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
        } catch {}
      } else {
        alert(`Team / Pass ID "${cleanId}" not found in registered list.`);
      }
    } catch (e) {
      console.error('Quick lookup error:', e);
    } finally {
      setIsSearchingLive(false);
    }
  };

  // Toggle Attendance Check-in for a team
  const toggleAttendance = async (team: TeamTicket) => {
    soundFX.playClick();
    if (team.checkedIn) {
      const res = await SynoraApi.unmarkAttendance(team.teamId);
      loadAttendanceData();
      if (selectedTeam && selectedTeam.teamId === team.teamId) {
        setSelectedTeam({ ...res.ticket });
      }
    } else {
      const res = await SynoraApi.markAttendance(team.teamId, organizerName);
      loadAttendanceData();
      soundFX.playSuccess();
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}
      if (selectedTeam && selectedTeam.teamId === team.teamId) {
        setSelectedTeam({ ...res.ticket });
      }
    }
  };

  // Export Attendance CSV for Certificates
  const handleExportCsv = () => {
    soundFX.playClick();
    const csvData = SynoraApi.exportAttendanceCsv(teams);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CRISPR26_Present_Attendance_Register_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Email List of Present Delegates
  const handleCopyCertificateEmails = () => {
    soundFX.playClick();
    const presentTeams = teams.filter((t) => t.checkedIn);
    const emailList: string[] = [];

    presentTeams.forEach((t) => {
      if (t.leaderEmail) emailList.push(t.leaderEmail);
      if (Array.isArray(t.memberDetails)) {
        t.memberDetails.forEach((m) => {
          if (m.email) emailList.push(m.email);
        });
      }
    });

    const uniqueEmails = Array.from(new Set(emailList));
    navigator.clipboard.writeText(uniqueEmails.join(', '));
    setCopiedMails(true);
    setTimeout(() => setCopiedMails(false), 2500);
  };

  // KPI Calculations
  const totalRegisteredTeams = teams.length;
  const presentTeamsList = teams.filter((t) => t.checkedIn);
  const presentTeamsCount = presentTeamsList.length;
  const pendingTeamsCount = totalRegisteredTeams - presentTeamsCount;
  const checkinPercentage = totalRegisteredTeams > 0 ? Math.round((presentTeamsCount / totalRegisteredTeams) * 100) : 0;

  const totalPresentDelegates = presentTeamsList.reduce((acc, t) => {
    const coDelegates = Array.isArray(t.memberDetails) ? t.memberDetails.length : Array.isArray(t.members) ? t.members.length : 1;
    return acc + 1 + coDelegates;
  }, 0);

  // Filtered & Sorted Teams List
  const filteredTeams = teams
    .filter((t) => {
      // Tab filter
      if (activeTab === 'present' && !t.checkedIn) return false;
      if (activeTab === 'pending' && t.checkedIn) return false;
      if (activeTab === 'student' && t.participantCategory === 'faculty') return false;
      if (activeTab === 'faculty' && t.participantCategory !== 'faculty') return false;

      // College type filter
      if (collegeFilter === 'internal' && t.collegeType !== 'internal') return false;
      if (collegeFilter === 'external' && t.collegeType === 'internal') return false;

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const extractedId = extractTeamIdFromQr(searchQuery).toLowerCase().trim();
      const cleanQ = q.replace(/\D/g, '');

      const nameMatch = t.teamName.toLowerCase().includes(q) || t.leaderName.toLowerCase().includes(q);
      const idMatch = t.teamId.toLowerCase().includes(q) || (extractedId && t.teamId.toLowerCase().includes(extractedId));
      const emailMatch = t.leaderEmail.toLowerCase().includes(q);
      const collegeMatch = t.college.toLowerCase().includes(q);
      const phoneMatch = cleanQ.length > 3 && t.leaderPhone?.replace(/\D/g, '').includes(cleanQ);

      const memberMatch =
        Array.isArray(t.memberDetails) &&
        t.memberDetails.some(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            (m.email && m.email.toLowerCase().includes(q)) ||
            (cleanQ.length > 3 && m.phone?.replace(/\D/g, '').includes(cleanQ))
        );

      return nameMatch || idMatch || emailMatch || collegeMatch || phoneMatch || memberMatch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'teamName') {
        comparison = a.teamName.localeCompare(b.teamName);
      } else if (sortBy === 'teamId') {
        comparison = a.teamId.localeCompare(b.teamId);
      } else if (sortBy === 'checkinTime') {
        comparison = (a.checkinTime || '').localeCompare(b.checkinTime || '');
      } else if (sortBy === 'totalFee') {
        comparison = (a.totalFee || 0) - (b.totalFee || 0);
      } else {
        comparison = (a.registeredAt || '').localeCompare(b.registeredAt || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1329] via-[#0f172a] to-[#070e1c] text-slate-100 pt-16 pb-16 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-7xl mx-auto">
        
        {/* ==================== LOGIN SCREEN (IF NOT LOGGED IN) ==================== */}
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto my-12 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center mb-6">
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 mb-4 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Event Website</span>
              </button>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600/30 via-purple-600/30 to-emerald-600/30 border border-cyan-500/40 flex items-center justify-center mx-auto mb-3 shadow-[0_0_35px_rgba(6,182,212,0.3)]">
                <ShieldCheck className="w-8 h-8 text-cyan-300" />
              </div>
              <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
                Organizer <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-emerald-400">Portal Login</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                SIMATS Engineering · CRISPR '26 Workshop Management
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500" />

              {/* Login Method Selector Tabs (Google OAuth vs Gmail Code) */}
              <div className="flex rounded-2xl bg-slate-950/60 p-1 border border-slate-700/70 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setLoginMode('google');
                    setAuthError(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    loginMode === 'google'
                      ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GoogleIcon className="w-4 h-4" />
                  <span>Google Sign-In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setLoginMode('otp');
                    setAuthError(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    loginMode === 'otp'
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Login Code</span>
                </button>
              </div>

              {/* OPTION 1: GOOGLE SIGN-IN */}
              {loginMode === 'google' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-center space-y-3">
                    <p className="text-xs text-slate-300">
                      Sign in with your approved organizer Google account.
                    </p>

                    {/* Google Identity Services Render Container */}
                    <div className="flex justify-center">
                      <div ref={googleBtnContainerRef} className="min-h-[44px]"></div>
                    </div>

                    {/* One-Click Google Login Button */}
                    <button
                      type="button"
                      onClick={handleGoogleOAuthPopup}
                      disabled={lockoutTimer > 0 || isAuthenticating}
                      className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-white hover:bg-slate-100 text-slate-900 shadow-[0_4px_25px_rgba(255,255,255,0.15)] disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-3 border border-white/80 active:scale-[0.99]"
                    >
                      {isAuthenticating ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin text-cyan-600" />
                          <span>Connecting to Google...</span>
                        </>
                      ) : (
                        <>
                          <GoogleIcon className="w-5 h-5" />
                          <span>Sign In with Google Account</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-slate-300 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Approved Organizers Only</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Only authorized coordinators (<code className="text-cyan-300">kandukurijagan99@gmail.com</code>, <code className="text-purple-300">ieshitapan@gmail.com</code>, etc.) will be granted access.
                    </p>
                  </div>

                  {/* Google OAuth Client Settings */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setIsGoogleConfigOpen(!isGoogleConfigOpen)}
                      className="text-[11px] text-slate-400 hover:text-cyan-400 transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Google OAuth Settings</span>
                    </button>

                    {isGoogleConfigOpen && (
                      <form onSubmit={handleSaveGoogleClientId} className="mt-2 p-3 rounded-xl bg-slate-950/60 border border-slate-700/60 space-y-2 text-left">
                        <label className="text-[10px] uppercase font-mono text-slate-400 block">
                          Google Cloud OAuth Client ID:
                        </label>
                        <input
                          type="text"
                          value={googleConfigInput}
                          onChange={(e) => setGoogleConfigInput(e.target.value)}
                          placeholder="xxxx.apps.googleusercontent.com"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          type="submit"
                          className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition"
                        >
                          Save Client ID
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* OPTION 2: EMAIL LOGIN CODE (GMAIL 6-DIGIT CODE) */}
              {loginMode === 'otp' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <form onSubmit={otpFeedback ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                        <span>Authorized Organizer Email *</span>
                        <span className="text-[10px] text-cyan-400 font-mono">Gmail Inbox</span>
                      </label>
                      <div className="relative">
                        <AtSign className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => {
                            setEmailInput(e.target.value);
                            setAuthError(null);
                          }}
                          placeholder="e.g. kandukurijagan99@gmail.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400 transition"
                          required
                        />
                      </div>
                    </div>

                    {detectedOrganizer && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Authorized: <strong>{detectedOrganizer.name}</strong> ({detectedOrganizer.roleTitle})
                        </span>
                      </div>
                    )}

                    {otpFeedback ? (
                      <div className="space-y-3 pt-1">
                        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{otpFeedback}</span>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                            <span>Enter 6-Digit Code from your Gmail *</span>
                            <span className="text-[10px] text-purple-400 font-mono">Valid for 5 mins</span>
                          </label>
                          <div className="relative">
                            <Key className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              maxLength={6}
                              value={otpInput}
                              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                              placeholder="e.g. 482910"
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-base tracking-widest font-mono text-center focus:outline-none focus:border-cyan-400 transition"
                              autoFocus
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={lockoutTimer > 0 || isAuthenticating}
                          className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 via-cyan-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isAuthenticating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Verifying Code...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              <span>Verify Code &amp; Log In</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={isSendingOtp}
                            className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                          >
                            Resend Code
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOtpFeedback(null);
                              setOtpInput('');
                            }}
                            className="text-xs text-slate-400 hover:text-white cursor-pointer"
                          >
                            Use different email
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {humanChallenge && (
                          <div className="p-3 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Anti-Agent Human Check</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => void refreshHumanChallenge()}
                                className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>New Check</span>
                              </button>
                            </div>
                            <p className="text-xs text-slate-300 font-mono">
                              {humanChallenge.question}
                            </p>
                            <input
                              type="text"
                              value={challengeAnswer}
                              onChange={(e) => setChallengeAnswer(e.target.value)}
                              placeholder="Type calculation answer..."
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 transition"
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={lockoutTimer > 0 || isSendingOtp}
                          className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-cyan-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isSendingOtp ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Sending code to Gmail...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 text-cyan-300" />
                              <span>Send 6-Digit Login Code</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* Error Message Box */}
              {authError && (
                <div className="p-3 mt-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-in shake duration-200">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Security Info Footer */}
              <div className="mt-6 pt-4 border-t border-slate-700/60 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Verified Organizer Access Only</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Protected Access &amp; Activity Log</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== MAIN ORGANIZER DASHBOARD ==================== */
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Top Navigation & Status Bar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 shadow-2xl">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="Return to Main Website"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h1 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
                      <span>CRISPR '26 Organizer &amp; Attendance Desk</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                        Live Desk
                      </span>
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      {session?.roleTitle || 'Organizer'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Active: <strong className="text-cyan-300">{organizerName}</strong></span>
                    <span>·</span>
                    <span>Venue: RB Seminar Hall</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 font-mono bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>{sessionTimeRemaining}</span>
                    </span>
                    <span>·</span>
                    {/* Live Sheet Latency */}
                    <button
                      type="button"
                      onClick={handleTestPing}
                      disabled={isTestingPing}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 transition cursor-pointer"
                      title="Check Google Sheet connection status"
                    >
                      <Zap className={`w-3 h-3 text-yellow-400 ${isTestingPing ? 'animate-spin' : ''}`} />
                      <span>
                        {isTestingPing
                          ? 'Pinging...'
                          : latencyInfo.latencyMs !== null
                          ? `⚡ ${latencyInfo.latencyMs}ms · Online`
                          : '⚡ Ping Sheet'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* Scan Participant QR Button */}
                <button
                  type="button"
                  onClick={() => void startCameraScanner()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5 transition cursor-pointer"
                  title="Scan Participant QR Pass [Ctrl+Q]"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Pass</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-black/20 text-[10px] font-mono font-normal">
                    Ctrl+Q
                  </kbd>
                </button>

                {/* Sync Sheet */}
                <button
                  type="button"
                  onClick={() => handleSyncSheet(true)}
                  disabled={isSyncing}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-200 border border-cyan-500/40 flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50"
                  title="Sync with Google Sheets [Ctrl+S]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Live'}</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-white/10 text-[10px] font-mono text-cyan-300">
                    Ctrl+S
                  </kbd>
                </button>

                {/* Auto-Sync Interval Selector */}
                <div className="relative inline-flex items-center">
                  <select
                    value={autoSyncInterval}
                    onChange={(e) => {
                      setAutoSyncInterval(e.target.value as any);
                      soundFX.playClick();
                    }}
                    className="px-2.5 py-2 rounded-xl text-[11px] font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus:outline-none focus:border-cyan-400 transition cursor-pointer"
                    title="Automatic background sheet sync interval"
                  >
                    <option value="off" className="bg-slate-900 text-slate-300">Auto: Off</option>
                    <option value="30s" className="bg-slate-900 text-emerald-300">Auto: 30s</option>
                    <option value="60s" className="bg-slate-900 text-cyan-300">Auto: 60s</option>
                  </select>
                </div>

                {/* Export CSV */}
                <button
                  type="button"
                  onClick={() => {
                    logAuditEvent('EXPORT_CSV', `Exported attendance sheet CSV (${teams.length} teams)`, 'SUCCESS', session?.name || organizerName, session?.roleTitle || 'Organizer');
                    handleExportCsv();
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                  title="Export Attendance Sheet to CSV [Ctrl+E]"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CSV</span>
                </button>

                {/* Copy Certificate Emails */}
                <button
                  type="button"
                  onClick={() => {
                    logAuditEvent('COPY_EMAILS', `Copied ${presentTeamsList.length} present delegate email addresses`, 'SUCCESS', session?.name || organizerName, session?.roleTitle || 'Organizer');
                    handleCopyCertificateEmails();
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                  title="Copy Present Participant Emails for Certificate Dispatch [Ctrl+M]"
                >
                  {copiedMails ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-purple-400" />
                      <span>Cert Mails</span>
                    </>
                  )}
                </button>

                {/* Sound Mute/Unmute Toggle */}
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    isMuted
                      ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                  title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Shortcuts HUD */}
                <button
                  type="button"
                  onClick={() => setIsShortcutsModalOpen(true)}
                  className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition cursor-pointer"
                  title="Keyboard Shortcuts [?]"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                {/* Google Sheets Setup Code (Chief Admin Only) */}
                {isChiefAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      logAuditEvent('VIEW_APPS_SCRIPT', 'Opened Google Apps Script integration code', 'SUCCESS', session?.name || organizerName, session?.roleTitle || 'Organizer');
                      setIsAppsScriptModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition cursor-pointer"
                    title="View Google Sheets Sync Script Code (SuperAdmin)"
                  >
                    <Code2 className="w-4 h-4" />
                  </button>
                )}

                {/* Manage Approved Organizers (Chief Admin Only) */}
                {isChiefAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      refreshOrganizersList();
                      setIsOrganizersModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition cursor-pointer"
                    title="Manage Approved Organizer Accounts (SuperAdmin)"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                )}

                {/* API Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setApiConfigUrl(SynoraApi.getScriptUrl());
                    setIsApiConfigOpen(true);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                  title="Configure Google Apps Script URL"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Activity Logs */}
                <button
                  type="button"
                  onClick={handleOpenAuditLogs}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition cursor-pointer"
                  title="View Recent Activity Log"
                >
                  <History className="w-4 h-4" />
                </button>

                {/* Lock Screen */}
                <button
                  type="button"
                  onClick={() => handleLockScreen('Desk locked by coordinator')}
                  className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition cursor-pointer"
                  title="Lock Desk Immediately"
                >
                  <Lock className="w-4 h-4" />
                </button>

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition cursor-pointer"
                  title="Logout Session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Sync Toast */}
            {syncFeedback && (
              <div className="p-3.5 rounded-2xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-200 text-xs flex items-center justify-between shadow-[0_0_20px_rgba(6,182,212,0.2)] animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-semibold">{syncFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncFeedback(null)}
                  className="text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 shadow-lg">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Registered Teams</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="font-display font-extrabold text-2xl text-white">
                  {totalRegisteredTeams}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Total registered teams</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 shadow-lg">
                <div className="flex items-center justify-between text-xs text-emerald-300 mb-1">
                  <span>Present Teams</span>
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="font-display font-extrabold text-2xl text-emerald-400">
                  {presentTeamsCount} <span className="text-xs font-normal text-emerald-300/80">({checkinPercentage}%)</span>
                </div>
                <div className="text-[11px] text-emerald-400/80 mt-0.5">Checked in at RB Hall</div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 shadow-lg">
                <div className="flex items-center justify-between text-xs text-amber-300 mb-1">
                  <span>Awaiting Arrival</span>
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                </div>
                <div className="font-display font-extrabold text-2xl text-amber-400">
                  {pendingTeamsCount}
                </div>
                <div className="text-[11px] text-amber-400/80 mt-0.5">Pending check-in</div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 shadow-lg">
                <div className="flex items-center justify-between text-xs text-purple-300 mb-1">
                  <span>Certificate Eligible</span>
                  <Award className="w-4 h-4 text-purple-400" />
                </div>
                <div className="font-display font-extrabold text-2xl text-purple-300">
                  {totalPresentDelegates} <span className="text-xs font-normal text-purple-300/80">Delegates</span>
                </div>
                <div className="text-[11px] text-purple-300/80 mt-0.5">Verified attendees</div>
              </div>
            </div>

            {/* Quick Search & Filter Controls */}
            <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 space-y-3 shadow-lg">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                
                {/* Search Bar */}
                <div className="relative w-full md:w-[440px] flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          handleQuickLookup(searchQuery);
                        }
                      }}
                      placeholder="Search Pass ID, Name, Phone, Email... [/]"
                      className="w-full pl-10 pr-16 py-2 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400 transition"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {searchQuery ? (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-slate-400 hover:text-white text-xs px-1"
                        >
                          ✕
                        </button>
                      ) : (
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
                          /
                        </kbd>
                      )}
                    </div>
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => handleQuickLookup(searchQuery)}
                      disabled={isSearchingLive}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400/40 shrink-0 transition flex items-center gap-1 cursor-pointer"
                      title="Verify and Mark Attendance"
                    >
                      {isSearchingLive ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                      <span>Check-in</span>
                    </button>
                  )}
                </div>

                {/* Primary Category Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('all'); soundFX.playClick(); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    All ({totalRegisteredTeams})
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('present'); soundFX.playClick(); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'present'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    Present ({presentTeamsCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('pending'); soundFX.playClick(); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    Pending ({pendingTeamsCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('student'); soundFX.playClick(); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'student'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    Students
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('faculty'); soundFX.playClick(); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'faculty'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    Faculty
                  </button>
                </div>
              </div>

              {/* Secondary Filter & Sorter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-700/60 text-xs">
                {/* College Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">College:</span>
                  <button
                    type="button"
                    onClick={() => { setCollegeFilter('all'); soundFX.playClick(); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                      collegeFilter === 'all'
                        ? 'bg-slate-700 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Colleges
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCollegeFilter('internal'); soundFX.playClick(); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                      collegeFilter === 'internal'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SIMATS Internal
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCollegeFilter('external'); soundFX.playClick(); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                      collegeFilter === 'external'
                        ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    External Universities
                  </button>
                </div>

                {/* Sorter & Density View */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value as any);
                        soundFX.playClick();
                      }}
                      className="px-2 py-1 rounded-md bg-slate-950 text-[11px] text-slate-200 border border-slate-700 focus:outline-none focus:border-cyan-400 transition"
                    >
                      <option value="registeredAt">Registration Date</option>
                      <option value="teamName">Team / Delegate Name</option>
                      <option value="teamId">Pass ID</option>
                      <option value="checkinTime">Check-in Time</option>
                      <option value="totalFee">Fee Amount</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                        soundFX.playClick();
                      }}
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-mono"
                      title={sortOrder === 'asc' ? 'Ascending Order' : 'Descending Order'}
                    >
                      {sortOrder === 'asc' ? '▲' : '▼'}
                    </button>
                  </div>

                  {/* Compact / Dense View Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleDenseView}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1 ${
                      isDenseView
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                    title="Toggle High Density Table View"
                  >
                    <Layers className="w-3 h-3" />
                    <span>{isDenseView ? 'Compact' : 'Standard'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance Roster Table */}
            <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 overflow-hidden shadow-2xl relative">
              <div className="p-4 bg-slate-950/40 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-white">
                    Attendance Register &amp; Certificate Dispatch
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  {selectedTeamIds.length > 0 && (
                    <span className="text-cyan-300 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                      {selectedTeamIds.length} Selected
                    </span>
                  )}
                  <span>
                    Showing {filteredTeams.length} of {totalRegisteredTeams} Teams
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-700/80 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={selectedTeamIds.length === filteredTeams.length && filteredTeams.length > 0}
                          onChange={handleToggleSelectAll}
                          className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                          title="Select All Visible Teams"
                        />
                      </th>
                      <th className="py-2.5 px-3">Pass ID</th>
                      <th className="py-2.5 px-3">Team &amp; College</th>
                      <th className="py-2.5 px-3">Team Leader</th>
                      <th className="py-2.5 px-3">Co-Delegates</th>
                      <th className="py-2.5 px-3">Category &amp; Fee</th>
                      <th className="py-2.5 px-3">Attendance Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredTeams.length > 0 ? (
                      filteredTeams.map((team) => {
                        const isSelected = selectedTeamIds.includes(team.teamId);
                        const cellPadding = isDenseView ? 'py-1.5 px-3' : 'py-3 px-4';
                        return (
                          <tr
                            key={team.teamId}
                            className={`hover:bg-slate-800/50 transition ${
                              isSelected
                                ? 'bg-cyan-950/40'
                                : team.checkedIn
                                ? 'bg-emerald-950/20'
                                : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className={`${cellPadding} text-center`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectRow(team.teamId)}
                                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                              />
                            </td>

                            {/* Pass ID */}
                            <td className={`${cellPadding} font-mono font-bold text-cyan-300`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTeam(team);
                                  setIsDetailModalOpen(true);
                                }}
                                className="hover:underline text-left cursor-pointer"
                              >
                                {team.teamId}
                              </button>
                            </td>

                            {/* Team & College */}
                            <td className={cellPadding}>
                              <div className="font-bold text-white">{team.teamName}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Building className="w-3 h-3 text-purple-400 shrink-0" />
                                <span className="truncate max-w-[180px]">{team.college}</span>
                              </div>
                            </td>

                            {/* Team Leader */}
                            <td className={cellPadding}>
                              <div className="font-semibold text-slate-200">{team.leaderName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                📞 {team.leaderPhone || 'N/A'}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                                ✉️ {team.leaderEmail}
                              </div>
                            </td>

                            {/* Co-Delegates */}
                            <td className={cellPadding}>
                              {Array.isArray(team.memberDetails) && team.memberDetails.length > 0 ? (
                                <div className="space-y-0.5">
                                  {team.memberDetails.map((m, idx) => (
                                    <div key={idx} className="text-[11px] text-slate-300 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                                      <span className="truncate max-w-[140px]">{m.name}</span>
                                      {m.phone && (
                                        <span className="text-[10px] text-slate-400 font-mono">({m.phone})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : Array.isArray(team.members) && team.members.length > 0 ? (
                                <div className="text-[11px] text-slate-300 truncate max-w-[160px]">
                                  {team.members.join(', ')}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">Solo / No members</span>
                              )}
                            </td>

                            {/* Category & Fee */}
                            <td className={cellPadding}>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                  team.participantCategory === 'faculty'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                }`}
                              >
                                {team.participantCategory || 'student'}
                              </span>
                              <div className="font-mono text-emerald-400 font-bold mt-0.5">
                                ₹{team.totalFee || (team.participantCategory === 'faculty' ? 1000 : 400)}
                              </div>
                            </td>

                            {/* Attendance Status */}
                            <td className={cellPadding}>
                              {team.checkedIn ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    <CheckCheck className="w-3 h-3" />
                                    <span>PRESENT</span>
                                  </span>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {team.checkinTime || 'Verified'}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                  <span>Pending</span>
                                </span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className={`${cellPadding} text-right`}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleAttendance(team)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    team.checkedIn
                                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30'
                                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                  }`}
                                >
                                  {team.checkedIn ? 'Undo' : 'Check-in'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTeam(team);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                                  title="View Details"
                                >
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No teams found matching the selected filter or search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Floating Bulk Action Bar (Docked at bottom when rows are selected) */}
            {selectedTeamIds.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 duration-300">
                <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl px-5 py-3 shadow-[0_15px_50px_rgba(6,182,212,0.3)] flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 border-r border-slate-700 pr-3 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="font-bold text-white">{selectedTeamIds.length} Teams Selected</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBulkMarkPresent}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      title="Mark Present [Ctrl+B]"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark Present</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleBulkUnmark}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revert Check-in</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleBulkCopyEmails}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-purple-400" />
                      <span>Copy Emails</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleBulkExportCsv}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Export CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTeamIds([])}
                      className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer ml-1"
                      title="Clear Selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================== CAMERA QR SCANNER MODAL ==================== */}
        {isScannerOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-slate-900/95 border border-cyan-500/40 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-[0_20px_70px_rgba(6,182,212,0.25)] space-y-4 max-h-[95vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">Live Pass Scanner</h3>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-400 animate-pulse' : cameraError ? 'bg-amber-400' : 'bg-cyan-400 animate-ping'}`} />
                      <span className="text-slate-400 font-mono">
                        {isCameraActive ? 'Camera Active' : cameraError ? 'Camera Paused' : 'Connecting Stream...'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={stopCameraScanner}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close Scanner"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Controls Toolbar */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                {/* Continuous Rapid Kiosk Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setIsKioskMode(!isKioskMode);
                    soundFX.playClick();
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    isKioskMode
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Fast Scan keeps scanner open after every successful scan"
                >
                  <Zap className={`w-3.5 h-3.5 ${isKioskMode ? 'text-emerald-400 fill-emerald-400/30' : ''}`} />
                  <span className="text-[10px] font-bold">{isKioskMode ? 'Fast Scan ON' : 'Fast Scan OFF'}</span>
                </button>

                {/* Flip Camera */}
                <button
                  type="button"
                  onClick={handleToggleCameraFacing}
                  className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                  title="Switch between rear and front camera"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-bold">{cameraFacingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}</span>
                </button>

                {/* Upload Image QR */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 hover:text-purple-300 hover:border-purple-500/30 flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                  title="Upload QR screenshot image"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] font-bold">Upload Image</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleScanImageFile}
                  className="hidden"
                />
              </div>

              {/* Viewfinder Viewport Container */}
              <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-3xl overflow-hidden bg-slate-950 border border-cyan-500/30 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center">
                
                {/* Futuristic HUD Corner Brackets */}
                <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg pointer-events-none z-10 shadow-[0_0_8px_#06b6d4]" />
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg pointer-events-none z-10 shadow-[0_0_8px_#06b6d4]" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg pointer-events-none z-10 shadow-[0_0_8px_#06b6d4]" />
                <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-400 rounded-br-lg pointer-events-none z-10 shadow-[0_0_8px_#06b6d4]" />

                {/* Laser Scanning Line */}
                {isCameraActive && (
                  <div className="absolute inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-scanner-laser pointer-events-none z-20" />
                )}

                {/* Live Camera Stream Mount Node */}
                <div id="organizer-qr-reader" className="w-full h-full flex items-center justify-center" />

                {/* Camera Error / Permission Fallback */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-30">
                    <ShieldAlert className="w-10 h-10 text-amber-400 animate-pulse" />
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {cameraError}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCameraScanner()}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer"
                      >
                        Retry Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                      >
                        Pick QR Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* In-Modal Quick ID / Search Input Fallback */}
              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    type="text"
                    value={modalManualQuery}
                    onChange={(e) => setModalManualQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && modalManualQuery.trim()) {
                        void handleProcessScannedCode(modalManualQuery);
                        setModalManualQuery('');
                      }
                    }}
                    placeholder="Or enter Pass ID, Email, Phone..."
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition pr-20"
                  />
                  <button
                    type="button"
                    disabled={!modalManualQuery.trim()}
                    onClick={() => {
                      if (modalManualQuery.trim()) {
                        void handleProcessScannedCode(modalManualQuery);
                        setModalManualQuery('');
                      }
                    }}
                    className="absolute right-1 top-1 bottom-1 px-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Check In</span>
                  </button>
                </div>
              </div>

              {/* Scan Feedback Banner */}
              {scanFeedback && (
                <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs text-center font-semibold animate-in fade-in">
                  {scanFeedback}
                </div>
              )}

              {/* Session Scan History */}
              {sessionScanHistory.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Scanned in this session ({sessionScanHistory.length}):</span>
                    <button
                      type="button"
                      onClick={() => setSessionScanHistory([])}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Clear Log
                    </button>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                    {sessionScanHistory.map((item, idx) => (
                      <div
                        key={`${item.teamId}-${idx}`}
                        className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div className="truncate mr-2">
                          <span className="font-bold text-white">{item.teamName}</span>{' '}
                          <span className="text-[10px] font-mono text-cyan-300">({item.teamId})</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              soundFX.playClick();
                              await SynoraApi.unmarkAttendance(item.teamId);
                              loadAttendanceData();
                              setSessionScanHistory((prev) => prev.filter((s) => s.teamId !== item.teamId));
                            }}
                            className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                          >
                            Undo
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400">
                  CRISPR '26 Fast Desk
                </span>
                <button
                  type="button"
                  onClick={stopCameraScanner}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                >
                  Done Scanning
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TEAM FULL DETAILS MODAL ==================== */}
        {isDetailModalOpen && selectedTeam && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_20px_60px_rgba(168,85,247,0.3)] space-y-5 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-700 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                      {selectedTeam.teamId}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        selectedTeam.participantCategory === 'faculty'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {selectedTeam.participantCategory || 'Student'} Tier
                    </span>
                  </div>
                  <h3 className="font-display font-extrabold text-2xl text-white">
                    {selectedTeam.teamName}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedTeam.college} ({selectedTeam.collegeType === 'internal' ? 'SIMATS Internal' : 'External University'})
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Attendance Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  selectedTeam.checkedIn
                    ? 'bg-emerald-950/40 border-emerald-500/40'
                    : 'bg-amber-950/30 border-amber-500/30'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-slate-300">Attendance Status:</div>
                  <div className="font-bold text-base mt-0.5 flex items-center gap-2">
                    {selectedTeam.checkedIn ? (
                      <>
                        <CheckCheck className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-300">PRESENT · Eligible for Certificate</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-300">Pending Check-in</span>
                      </>
                    )}
                  </div>
                  {selectedTeam.checkinTime && (
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Checked in at: {selectedTeam.checkinTime} (by {selectedTeam.verifiedBy || 'Organizer'})
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleAttendance(selectedTeam)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shadow ${
                    selectedTeam.checkedIn
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  {selectedTeam.checkedIn ? 'Undo Check-in' : '✅ Mark Present & Confirm'}
                </button>
              </div>

              {/* Primary Leader Details */}
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4" />
                  <span>Team Leader (Member 1)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Full Name:</span>{' '}
                    <strong className="text-white">{selectedTeam.leaderName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">WhatsApp / Mobile:</span>{' '}
                    <strong className="text-emerald-400 font-mono">{selectedTeam.leaderPhone || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Email Address:</span>{' '}
                    <strong className="text-slate-200">{selectedTeam.leaderEmail}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Designation / Year:</span>{' '}
                    <strong className="text-purple-300">{selectedTeam.leaderDesignation || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Co-Delegates Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>Accompanying Team Members</span>
                </div>

                {Array.isArray(selectedTeam.memberDetails) && selectedTeam.memberDetails.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {selectedTeam.memberDetails.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-600/40 border border-purple-400/50 text-purple-300 flex items-center justify-center text-[10px]">
                              {idx + 2}
                            </span>
                            <span>{m.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({m.role || `Member ${idx + 2}`})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            {m.phone && <span>📞 {m.phone}</span>}
                            {m.email && <span>✉️ {m.email}</span>}
                            {m.designation && <span className="text-purple-300">🎓 {m.designation}</span>}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 self-start sm:self-auto">
                          Certificate Eligible
                        </span>
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(selectedTeam.members) && selectedTeam.members.length > 0 ? (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-700 text-xs">
                    {selectedTeam.members.map((m, idx) => (
                      <div key={idx} className="py-1 text-slate-200">
                        👤 Member {idx + 2}: <strong>{m}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic p-3">No co-delegates listed.</div>
                )}
              </div>

              {/* Payment Details */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-700 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400">Total Registration Fee:</span>
                  <div className="font-mono font-bold text-base text-emerald-400">
                    ₹{selectedTeam.totalFee || (selectedTeam.participantCategory === 'faculty' ? 1000 : 400)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">UPI Ref / UTR ID:</span>
                  <div className="font-mono font-bold text-cyan-300">
                    {selectedTeam.txnId || 'Verified via UPI'}
                  </div>
                </div>

                {selectedTeam.paymentScreenshotBase64 && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsReceiptModalOpen(true)}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>View Uploaded Payment Receipt</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedTeam.teamId);
                      setCopiedTeamId(true);
                      setTimeout(() => setCopiedTeamId(false), 2000);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedTeamId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTeamId ? 'Copied ID!' : 'Copy ID'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintBadge(selectedTeam)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-200 border border-cyan-500/40 transition cursor-pointer flex items-center gap-1.5"
                    title="Print Entry Pass Badge"
                  >
                    <Printer className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Print Badge</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenPass && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        onOpenPass(selectedTeam.teamId);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-400/40 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Digital Pass</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== KEYBOARD SHORTCUTS HUD MODAL ==================== */}
        {isShortcutsModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[0_20px_60px_rgba(6,182,212,0.3)] space-y-5">
              <div className="flex items-start justify-between border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-lg text-white">
                      Keyboard Shortcuts
                    </h3>
                    <p className="text-xs text-slate-400">
                      Quick hotkeys for faster desk check-in operations
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShortcutsModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { keys: ['/ ', 'Ctrl + K'], desc: 'Focus instant search bar' },
                  { keys: ['Ctrl + Q'], desc: 'Launch camera pass QR scanner' },
                  { keys: ['Ctrl + S'], desc: 'Force sync live Google Sheet' },
                  { keys: ['Ctrl + B'], desc: 'Bulk check-in selected teams' },
                  { keys: ['Ctrl + E'], desc: 'Export full attendance CSV' },
                  { keys: ['Ctrl + M'], desc: 'Copy present participant emails' },
                  { keys: ['1 .. 5'], desc: 'Switch tabs: All, Present, Pending, Students, Faculty' },
                  { keys: ['Esc'], desc: 'Dismiss any open modal or unfocus search' },
                  { keys: ['?'], desc: 'Open this shortcuts cheatsheet' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-700/60 flex items-center justify-between"
                  >
                    <span className="text-slate-300">{item.desc}</span>
                    <div className="flex items-center gap-1 font-mono">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold text-[11px]"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                <span className="text-[11px] text-slate-400 font-mono">CRISPR '26 Desk</span>
                <button
                  type="button"
                  onClick={() => setIsShortcutsModalOpen(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== RECEIPT VIEWER MODAL ==================== */}
        {isReceiptModalOpen && selectedTeam?.paymentScreenshotBase64 && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-md w-full p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="font-bold text-xs text-white">UPI Payment Receipt</span>
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-700 max-h-96 flex items-center justify-center bg-black">
                <img
                  src={selectedTeam.paymentScreenshotBase64}
                  alt="Payment Receipt"
                  className="max-h-96 object-contain"
                />
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== GOOGLE APPS SCRIPT BACKEND SETUP MODAL ==================== */}
        {isAppsScriptModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-[0_20px_60px_rgba(168,85,247,0.3)] space-y-6 max-h-[92vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Google Sheets Live Sync
                      </span>
                      <span className="text-xs text-purple-300 font-semibold">Google Sheets &amp; Apps Script</span>
                    </div>
                    <h3 className="font-display font-extrabold text-2xl text-white mt-0.5">
                      Spreadsheet Integration Code
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAppsScriptModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Dual Sheet Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
                    <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                    <span>Sheet 1: "Registrations" (Master List)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Stores all registered participants, leader details, co-delegate lists, college, and payment status.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    <span>Sheet 2: "Attendance" (Present Teams)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Auto-updated when a pass is scanned. Stores arrival time and certificate eligibility.
                  </p>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-700 space-y-3">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>3-Minute Google Sheets Setup Guide</span>
                </div>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Open <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-cyan-300 underline font-semibold">Google Sheets</a> and create a new spreadsheet.
                  </li>
                  <li>
                    Click <strong className="text-white">Extensions &gt; Apps Script</strong> in the top menu.
                  </li>
                  <li>
                    Replace the code in <code className="text-purple-300 bg-slate-800 px-1 py-0.5 rounded">Code.gs</code> with the code below.
                  </li>
                  <li>
                    Click <strong className="text-white">Deploy &gt; New deployment</strong>.
                  </li>
                  <li>
                    Select <strong className="text-cyan-300">Web app</strong>, set access to <strong className="text-emerald-300">Anyone</strong>, and deploy.
                  </li>
                  <li>
                    Copy the Web app URL and paste it into Organizer Settings.
                  </li>
                </ol>
              </div>

              {/* Script Action Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                    <FileCode className="w-4 h-4" />
                    <span>Google Apps Script Code (Code.gs)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SOURCE);
                      setCopiedScript(true);
                      soundFX.playSuccess();
                      setTimeout(() => setCopiedScript(false), 3000);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span className="text-emerald-300">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Apps Script Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Code Preview */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 max-h-80 overflow-y-auto font-mono text-[11px] p-4 text-slate-300 leading-relaxed">
                  <pre className="whitespace-pre-wrap">{GOOGLE_APPS_SCRIPT_SOURCE}</pre>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <span className="text-xs text-slate-400">
                  📁 File is also saved in repository at <code className="text-cyan-300 font-mono">google-apps-script/Code.gs</code>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAppsScriptModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ==================== ACTIVITY & AUDIT LOG MODAL ==================== */}
        {isAuditLogModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-[0_20px_60px_rgba(6,182,212,0.3)] space-y-5 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        Activity History
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">Live Event Log</span>
                    </div>
                    <h3 className="font-display font-extrabold text-2xl text-white mt-0.5">
                      Recent Activity &amp; Check-in Log
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAuditLogModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Live chronological record of logins, check-ins, scans, and sheet synchronizations.
              </p>

              {/* Log List */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => {
                    const isAlert = log.status === 'ALERT';
                    const isWarn = log.status === 'WARN';
                    return (
                      <div
                        key={log.id}
                        className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                          isAlert
                            ? 'bg-red-950/30 border-red-500/40 text-red-200'
                            : isWarn
                            ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                            : 'bg-slate-950/60 border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                isAlert
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : isWarn
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {log.action}
                            </span>
                            <span className="font-semibold text-white">{log.details}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>Organizer: <strong className="text-slate-300">{log.operator}</strong> ({log.role})</span>
                          </div>
                        </div>

                        <div className="text-[10px] font-mono text-slate-400 self-start sm:self-auto shrink-0">
                          ⏱️ {log.timestamp}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No activity events logged yet in this session.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                <span className="text-[11px] text-slate-400 font-mono">
                  {auditLogs.length} Events Recorded
                </span>
                <button
                  type="button"
                  onClick={() => setIsAuditLogModalOpen(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                >
                  Close Activity Log
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ==================== GOOGLE APPS SCRIPT API CONFIG MODAL ==================== */}
        {isApiConfigOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-[0_20px_60px_rgba(6,182,212,0.3)] space-y-5">
              <div className="flex items-start justify-between border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-lg text-white">
                      Google Sheets Web App URL
                    </h3>
                    <p className="text-xs text-slate-400">
                      Connection endpoint for live registration and attendance sync
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApiConfigOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveApiConfig} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>Deployed Web App URL</span>
                    <span className="text-[10px] text-cyan-400 font-mono">/exec URL</span>
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={apiConfigUrl}
                      onChange={(e) => setApiConfigUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 transition"
                      required
                    />
                  </div>
                </div>

                {apiConfigSaved && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Configuration updated and synchronized!</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleResetApiUrl}
                    className="text-xs text-slate-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Reset to Default URL
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsApiConfigOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSyncing}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    >
                      {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Save &amp; Test Sync</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== AUTHORIZED ORGANIZERS MODAL ==================== */}
        {isOrganizersModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_20px_60px_rgba(16,185,129,0.3)] space-y-6 max-h-[90vh] flex flex-col">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-700 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-lg text-white">
                      Approved Organizers Directory
                    </h3>
                    <p className="text-xs text-slate-400">
                      Coordinators permitted to log in via Google or Email Code
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOrganizersModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Organizers List */}
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                <span className="text-xs font-semibold text-slate-300 block">
                  Approved Coordinator Emails ({authorizedOrganizersList.length}):
                </span>
                
                <div className="space-y-2">
                  {authorizedOrganizersList.map((org) => {
                    return (
                      <div
                        key={org.email}
                        className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-700 flex items-center justify-between gap-3 hover:border-emerald-500/30 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{org.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              org.role === 'superadmin'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : org.role === 'coordinator'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}>
                              {org.roleTitle}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                            <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{org.email}</span>
                            <span>·</span>
                            <span className="text-slate-400">{org.department || 'SIMATS Engineering'}</span>
                          </div>
                        </div>

                        {/* Removal action (Restricted strictly to Chief Organizer kandukurijagan99@gmail.com) */}
                        {isChiefAdmin && org.email.toLowerCase() !== 'kandukurijagan99@gmail.com' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOrganizer(org.email)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition cursor-pointer"
                            title="Remove from Approved List"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add New Authorized Organizer Section (Restricted to kandukurijagan99@gmail.com) */}
                <div className="pt-4 border-t border-slate-700">
                  {isChiefAdmin ? (
                    <>
                      <span className="text-xs font-semibold text-emerald-300 block mb-3 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4" />
                        <span>Add New Organizer / Coordinator:</span>
                      </span>

                      <form onSubmit={handleAddNewOrganizer} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <input
                            type="email"
                            value={newOrgEmail}
                            onChange={(e) => setNewOrgEmail(e.target.value)}
                            placeholder="Coordinator Email (e.g. name@saveetha.com)"
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-400 transition"
                            required
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            placeholder="Full Name (e.g. John Doe)"
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-400 transition"
                            required
                          />
                        </div>

                        <div>
                          <select
                            value={newOrgRole}
                            onChange={(e) => setNewOrgRole(e.target.value as any)}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-400 transition"
                          >
                            <option value="coordinator">Student Event Coordinator</option>
                            <option value="reception">Reception &amp; QR Desk</option>
                            <option value="verifier">Certificate Verifier</option>
                            <option value="superadmin">Faculty Admin</option>
                          </select>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={newOrgDept}
                            onChange={(e) => setNewOrgDept(e.target.value)}
                            placeholder="Department / Institution"
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-400 transition"
                          />
                        </div>

                        <div className="sm:col-span-2 flex justify-end pt-1">
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add Organizer</span>
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-700/80 text-xs text-slate-400 flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-200 block mb-0.5">Management Restricted</span>
                        <span>Adding and removing authorized organizer accounts is strictly restricted to Chief Organizer (<code>kandukurijagan99@gmail.com</code>).</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-700 shrink-0">
                <span className="text-[11px] text-slate-400 font-mono">
                  Saved locally and active for this device
                </span>
                <button
                  type="button"
                  onClick={() => setIsOrganizersModalOpen(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
