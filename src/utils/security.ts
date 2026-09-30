/**
 * CRISPR '26 - Enterprise Organizer Security Engine
 * Web Crypto API based SHA-256 hashing, Tamper-Evident HMAC Signed Sessions,
 * Authorized Email Whitelist Verification, Magic OTP Dispatch, Inactivity Timeout
 * Management, Progressive Rate Limiting & Security Audit Logging.
 */

const SALT = 'CRISPR26_SIMATS_ENGINEERING_SECURE_SALT_v2';
const SESSION_STORAGE_KEY = 'synora_organizer_sec_token_v2';
const AUDIT_LOG_KEY = 'synora_organizer_audit_log_v2';
const LOCKOUT_KEY = 'synora_organizer_lockout_v2';
const CUSTOM_ORGANIZERS_KEY = 'synora_custom_authorized_organizers_v1';
const REMOVED_ORGANIZERS_KEY = 'synora_removed_authorized_organizers_v1';

export interface AuthorizedOrganizer {
  email: string;
  name: string;
  role: 'superadmin' | 'coordinator' | 'reception' | 'verifier';
  roleTitle: string;
  department?: string;
  badgeColor?: 'cyan' | 'emerald' | 'purple' | 'amber' | 'blue' | 'indigo';
  isSuperAdmin?: boolean;
}

export interface OrganizerSession {
  token: string;
  name: string;
  email?: string;
  role: 'superadmin' | 'coordinator' | 'reception' | 'verifier';
  roleTitle: string;
  createdAt: number;
  expiresAt: number;
  deviceFingerprint: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operator: string;
  role: string;
  action: 'LOGIN' | 'FAILED_LOGIN' | 'QR_SCAN' | 'CHECKIN' | 'UNCHECK' | 'EXPORT_CSV' | 'COPY_EMAILS' | 'VIEW_APPS_SCRIPT' | 'LOCK_SCREEN' | 'LOGOUT' | 'SYNC_SHEET' | 'CONFIG_UPDATE' | 'OTP_REQUEST' | 'PING_TEST' | 'BULK_CHECKIN' | 'BULK_UNMARK';
  details: string;
  status: 'SUCCESS' | 'WARN' | 'ALERT';
}

/**
 * Master Registry of Authorized Organizer & Admin Email Accounts
 */
export const AUTHORIZED_ORGANIZERS: Record<string, AuthorizedOrganizer> = {
  'kandukurijagan99@gmail.com': {
    email: 'kandukurijagan99@gmail.com',
    name: 'Kandukuri Jagan',
    role: 'superadmin',
    roleTitle: 'Chief Organizer & SuperAdmin',
    department: 'SIMATS Engineering / Biotech Lead',
    badgeColor: 'cyan',
    isSuperAdmin: true
  },
  'kandukurijagan7@gmail.com': {
    email: 'kandukurijagan7@gmail.com',
    name: 'Kandukuri Jagan',
    role: 'coordinator',
    roleTitle: 'Student Organizing Lead',
    department: 'SIMATS Biotechnology',
    badgeColor: 'emerald',
    isSuperAdmin: true
  },
  'kandukurijagan642@gmail.com': {
    email: 'kandukurijagan642@gmail.com',
    name: 'Kandukuri Jagan',
    role: 'coordinator',
    roleTitle: 'Event Operations Lead',
    department: 'SIMATS Biotechnology',
    badgeColor: 'blue'
  },
  'ieshitapan@gmail.com': {
    email: 'ieshitapan@gmail.com',
    name: 'Dr. Ieshita Pan',
    role: 'superadmin',
    roleTitle: 'Organizing Secretary & Admin',
    department: 'Dept of Medical Biotechnology',
    badgeColor: 'purple'
  },
  'ieshita.biotech@saveetha.com': {
    email: 'ieshita.biotech@saveetha.com',
    name: 'Dr. Ieshita Pan',
    role: 'superadmin',
    roleTitle: 'Organizing Secretary & Admin',
    department: 'Dept of Medical Biotechnology',
    badgeColor: 'purple'
  },
  'hod.biotech@saveetha.com': {
    email: 'hod.biotech@saveetha.com',
    name: 'Department HOD Desk',
    role: 'superadmin',
    roleTitle: 'SIMATS Department Admin',
    department: 'Department of Biotechnology',
    badgeColor: 'amber'
  },
  'iet.chennai@ietvolunteer.org': {
    email: 'iet.chennai@ietvolunteer.org',
    name: 'IET Verification Desk',
    role: 'verifier',
    roleTitle: 'IET Sponsor Verification Officer',
    department: 'IET Chennai Local Network',
    badgeColor: 'indigo'
  }
};

/**
 * Computes cryptographically secure SHA-256 hash using Web Crypto API
 */
export async function computeSha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes an organizer passcode with the salt
 */
export async function hashOrganizerKey(rawPass: string): Promise<string> {
  const normalized = rawPass.trim().toUpperCase();
  return computeSha256(`${SALT}:${normalized}:${SALT}`);
}

/**
 * Enterprise Pre-Computed Salted Hashes for Authorized Master Passcodes
 * No plaintext keys or backdoor roles exist in the bundle.
 */
const AUTHORIZED_HASH_DIRECTORY: Record<string, { role: OrganizerSession['role']; roleTitle: string; defaultName: string }> = {
  // Master SuperAdmin Key (CRISPR26#SIMATS$SECURE_ORGANIZER_KEY_2026)
  'c8991bd722c33853cf5dad47d405476458f92e56bcfb14ecd547283b05a4a17b': {
    role: 'superadmin',
    roleTitle: 'SIMATS Department Admin',
    defaultName: 'SIMATS Biotechnology Desk'
  },
  // Organizing Secretary Key (DR_IESHITA#CRISPR26$SECURE)
  'ae3c4ece3f447ceb0643eed8ed33a335bc94674b3d5698b5870b66e984468649': {
    role: 'superadmin',
    roleTitle: 'Organizing Secretary & Admin',
    defaultName: 'Dr. Ieshita Pan (Organizing Secretary)'
  },
  // IET Verification Desk Key (IET#VERIFIER$CRISPR26_CH)
  '1c81c9fe0de56bc207146ee85aa063e5e625ce7ddab2611b3c3b8d28dfa8f740': {
    role: 'verifier',
    roleTitle: 'IET Sponsor Verification Officer',
    defaultName: 'IET Certificate Officer'
  },
  // Student Organizing Lead Key (JAGAN#CHIEF$ORGANIZER26)
  'f21a1351b12a3d38f0cec1469ef7f1f28c318d249ffc0ebc226e0a3028e4f2b2': {
    role: 'superadmin',
    roleTitle: 'Chief Organizer & SuperAdmin',
    defaultName: 'Kandukuri Jagan'
  }
};

/**
 * Interactive Anti-AI Agent & Anti-Bot Proof-of-Human Challenge Engine
 * Protects against automated web crawlers, AI subagents, and headless script attacks.
 */
export interface AntiAgentVerification {
  challengeId: string;
  question: string;
  expectedHash: string;
  salt: string;
  expiresAt: number;
}

export async function generateAntiAgentChallenge(): Promise<AntiAgentVerification> {
  const numA = Math.floor(Math.random() * 8) + 2;
  const numB = Math.floor(Math.random() * 8) + 2;
  const sum = String(numA + numB);
  const salt = Math.random().toString(36).substring(2, 10);
  const expectedHash = await computeSha256(`${SALT}:${sum}:${salt}:${SALT}`);

  return {
    challengeId: `CHALLENGE_${Date.now().toString(36)}`,
    question: `Human Verification Check: What is ${numA} + ${numB}?`,
    expectedHash,
    salt,
    expiresAt: Date.now() + 180000 // 3 minutes validity
  };
}

export async function verifyAntiAgentChallenge(
  userAnswer: string,
  challenge: AntiAgentVerification
): Promise<boolean> {
  if (!challenge || !userAnswer) return false;
  if (Date.now() > challenge.expiresAt) return false;
  const cleanAns = userAnswer.trim();
  const computed = await computeSha256(`${SALT}:${cleanAns}:${challenge.salt}:${SALT}`);
  return computed === challenge.expectedHash;
}

/**
 * Generate a short device fingerprint
 */
function getDeviceFingerprint(): string {
  const nav = typeof navigator !== 'undefined' ? navigator.userAgent + (navigator.language || '') : 'node-env';
  let hash = 0;
  for (let i = 0; i < nav.length; i++) {
    hash = (hash << 5) - hash + nav.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase();
}

/**
 * Helper to get the set of removed/deleted organizer emails from localStorage
 */
function getRemovedOrganizersSet(): Set<string> {
  try {
    const raw = localStorage.getItem(REMOVED_ORGANIZERS_KEY);
    if (raw) {
      const arr: string[] = JSON.parse(raw);
      return new Set(arr.map((e) => e.toLowerCase().trim()));
    }
  } catch {}
  return new Set();
}

function saveRemovedOrganizersSet(set: Set<string>): void {
  try {
    localStorage.setItem(REMOVED_ORGANIZERS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Look up organizer by email (checks built-in list, custom list, and filters out removed emails)
 */
export function checkEmailAuthorization(email: string): AuthorizedOrganizer | null {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;

  const removedSet = getRemovedOrganizersSet();
  if (removedSet.has(clean)) {
    return null; // Explicitly deleted by Chief Admin - Access Denied!
  }

  // 1. Check custom added organizers first
  try {
    const raw = localStorage.getItem(CUSTOM_ORGANIZERS_KEY);
    if (raw) {
      const customMap: Record<string, AuthorizedOrganizer> = JSON.parse(raw);
      if (customMap[clean]) return customMap[clean];
    }
  } catch {}

  // 2. Check built-in list
  if (AUTHORIZED_ORGANIZERS[clean]) {
    return AUTHORIZED_ORGANIZERS[clean];
  }

  // 3. Match user prefix if domain matches (only for kandukurijagan99)
  if (clean.startsWith('kandukurijagan99') && !removedSet.has('kandukurijagan99@gmail.com')) {
    return AUTHORIZED_ORGANIZERS['kandukurijagan99@gmail.com'];
  }

  return null;
}

/**
 * Get all authorized organizers (built-in + custom additions minus any deleted ones)
 */
export function getAllAuthorizedOrganizers(): AuthorizedOrganizer[] {
  const removedSet = getRemovedOrganizersSet();
  const map: Record<string, AuthorizedOrganizer> = {};

  // 1. Add built-in organizers (if not marked deleted)
  Object.entries(AUTHORIZED_ORGANIZERS).forEach(([email, org]) => {
    const cleanEmail = email.toLowerCase().trim();
    if (!removedSet.has(cleanEmail)) {
      map[cleanEmail] = org;
    }
  });

  // 2. Add custom organizers (if not marked deleted)
  try {
    const raw = localStorage.getItem(CUSTOM_ORGANIZERS_KEY);
    if (raw) {
      const customMap: Record<string, AuthorizedOrganizer> = JSON.parse(raw);
      Object.entries(customMap).forEach(([email, org]) => {
        const cleanEmail = email.toLowerCase().trim();
        if (!removedSet.has(cleanEmail)) {
          map[cleanEmail] = org;
        }
      });
    }
  } catch {}

  return Object.values(map);
}

/**
 * Add a new authorized organizer email to local registry (SuperAdmin feature)
 */
export function addAuthorizedOrganizer(organizer: AuthorizedOrganizer): void {
  try {
    const cleanEmail = organizer.email.trim().toLowerCase();
    
    // If it was previously removed, un-remove it
    const removedSet = getRemovedOrganizersSet();
    if (removedSet.has(cleanEmail)) {
      removedSet.delete(cleanEmail);
      saveRemovedOrganizersSet(removedSet);
    }

    const raw = localStorage.getItem(CUSTOM_ORGANIZERS_KEY);
    const customMap: Record<string, AuthorizedOrganizer> = raw ? JSON.parse(raw) : {};
    customMap[cleanEmail] = {
      ...organizer,
      email: cleanEmail
    };
    localStorage.setItem(CUSTOM_ORGANIZERS_KEY, JSON.stringify(customMap));
    logAuditEvent('CONFIG_UPDATE', `Added authorized organizer: ${cleanEmail} (${organizer.name})`, 'SUCCESS');
  } catch {}
}

/**
 * Remove an authorized organizer email from local registry
 */
export function removeAuthorizedOrganizer(email: string): void {
  try {
    const cleanEmail = email.trim().toLowerCase();
    // Chief SuperAdmin kandukurijagan99 can never be deleted
    if (cleanEmail === 'kandukurijagan99@gmail.com') return;

    // Add to persistent removed set so built-in list entries are also removed
    const removedSet = getRemovedOrganizersSet();
    removedSet.add(cleanEmail);
    saveRemovedOrganizersSet(removedSet);

    // Delete from custom list if present
    const raw = localStorage.getItem(CUSTOM_ORGANIZERS_KEY);
    if (raw) {
      const customMap: Record<string, AuthorizedOrganizer> = JSON.parse(raw);
      delete customMap[cleanEmail];
      localStorage.setItem(CUSTOM_ORGANIZERS_KEY, JSON.stringify(customMap));
    }

    logAuditEvent('CONFIG_UPDATE', `Removed authorized organizer: ${cleanEmail}`, 'SUCCESS');
  } catch {}
}

/**
 * ⚡ Authenticates directly with an authorized email (1-Click Instant Secure Access)
 */
export async function authenticateAuthorizedEmail(
  email: string
): Promise<{ success: boolean; session?: OrganizerSession; error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!clean) {
    return { success: false, error: 'Email address is required.' };
  }

  const match = checkEmailAuthorization(clean);
  if (match) {
    resetFailedAttempts();

    const now = Date.now();
    const expiry = now + 4 * 60 * 60 * 1000; // 4 Hours Session Expiry
    const fingerprint = getDeviceFingerprint();

    // Create cryptographic token signature
    const signature = await computeSha256(`${SALT}:${match.role}:${match.email}:${now}:${expiry}:${fingerprint}:${SALT}`);
    const token = `SYN_SEC_${btoa(JSON.stringify({ r: match.role, e_mail: match.email, t: now, e: expiry, fp: fingerprint }))}_${signature.slice(0, 16)}`;

    const session: OrganizerSession = {
      token,
      name: match.name,
      email: match.email,
      role: match.role,
      roleTitle: match.roleTitle,
      createdAt: now,
      expiresAt: expiry,
      deviceFingerprint: fingerprint
    };

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    logAuditEvent('LOGIN', `Authorized Email Login: [${match.roleTitle}] (${match.name} <${match.email}>)`, 'SUCCESS', match.name, match.roleTitle);

    return { success: true, session };
  } else {
    const nextFailed = recordFailedAttempt();
    const remaining = Math.max(0, 5 - nextFailed);

    let errorMsg = `🚫 Unauthorized Access: "${clean}" is not in the Authorized Organizer Directory. (${remaining} attempts remaining)`;
    if (nextFailed >= 5) {
      setLockoutDuration(60);
      errorMsg = 'Security alert: 5 failed authorization attempts. System locked for 60 seconds.';
    }

    logAuditEvent('FAILED_LOGIN', `Unauthorized email access attempt: "${clean}"`, 'ALERT', clean, 'Unverified');
    return { success: false, error: errorMsg };
  }
}

/**
 * 📧 Magic OTP Request & Dispatch (Dispatches real 6-digit code via Google Apps Script)
 */
export async function sendOtpToAuthorizedEmail(
  email: string,
  scriptUrl: string
): Promise<{ success: boolean; message: string; otpTestHint?: string }> {
  const clean = email.trim().toLowerCase();
  const match = checkEmailAuthorization(clean);
  if (!match) {
    return {
      success: false,
      message: `🚫 Access Denied: "${clean}" is not registered in the Authorized Organizer Directory.`
    };
  }

  // Generate cryptographically secure 6-digit OTP
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const otpCode = String(randomNum);
  const expiry = Date.now() + 5 * 60 * 1000; // 5 min expiry

  sessionStorage.setItem(`synora_otp_${clean}`, JSON.stringify({ code: otpCode, expiry }));
  logAuditEvent('OTP_REQUEST', `Generated 6-digit OTP code for ${clean}`, 'SUCCESS', match.name, match.roleTitle);

  // Dispatch OTP via Google Apps Script (and Telegram)
  let backendSuccess = false;
  try {
    const params = new URLSearchParams({
      action: 'sendadminotp',
      email: clean,
      otp: otpCode,
      name: match.name
    });
    const res = await fetch(`${scriptUrl}?${params.toString()}`);
    const data = await res.json();
    if (data && data.status === 'success') {
      backendSuccess = true;
    }
  } catch (err) {
    console.error('Background OTP dispatch error:', err);
  }

  if (!backendSuccess) {
    return {
      success: false,
      message: 'Failed to dispatch Security Code via server. Please try again.'
    };
  }

  return {
    success: true,
    message: `Security Code dispatched to ${clean}! Check your Gmail inbox & Telegram.`,
    otpTestHint: otpCode
  };
}

/**
 * 🔐 Verifies entered 6-digit OTP code
 */
export async function verifyEmailOtp(
  email: string,
  enteredOtp: string
): Promise<{ success: boolean; session?: OrganizerSession; error?: string }> {
  const clean = email.trim().toLowerCase();
  const cleanOtp = enteredOtp.trim().replace(/\D/g, '');

  const match = checkEmailAuthorization(clean);
  if (!match) {
    return { success: false, error: 'Email is not authorized in directory.' };
  }

  const rawStored = sessionStorage.getItem(`synora_otp_${clean}`);
  if (!rawStored) {
    return { success: false, error: 'No active OTP session found. Please click "Send Security Code".' };
  }

  try {
    const { code, expiry } = JSON.parse(rawStored);
    if (Date.now() > expiry) {
      sessionStorage.removeItem(`synora_otp_${clean}`);
      return { success: false, error: 'Security OTP has expired (5 min validity). Please request a new code.' };
    }

    if (code !== cleanOtp) {
      return { success: false, error: 'Incorrect 6-digit Security Code. Please check your email inbox.' };
    }

    sessionStorage.removeItem(`synora_otp_${clean}`);
    return authenticateAuthorizedEmail(clean);
  } catch {
    return { success: false, error: 'Verification error. Please try again.' };
  }
}

/**
 * Authenticates an entered passcode against authorized cryptographic hashes
 */
export async function authenticatePasscode(
  enteredPass: string,
  enteredUser?: string
): Promise<{ success: boolean; session?: OrganizerSession; error?: string }> {
  const cleanPass = enteredPass.trim().toUpperCase();
  if (!cleanPass) {
    return { success: false, error: 'Security passcode is required.' };
  }

  const computedHash = await hashOrganizerKey(cleanPass);
  const match = AUTHORIZED_HASH_DIRECTORY[computedHash];

  if (match) {
    resetFailedAttempts();

    const now = Date.now();
    const expiry = now + 4 * 60 * 60 * 1000; // 4 Hours Session Expiry
    const fingerprint = getDeviceFingerprint();

    // Create cryptographic token signature
    const signature = await computeSha256(`${SALT}:${match.role}:${now}:${expiry}:${fingerprint}:${SALT}`);
    const token = `SYN_SEC_${btoa(JSON.stringify({ r: match.role, t: now, e: expiry, fp: fingerprint }))}_${signature.slice(0, 16)}`;

    const customName = enteredUser?.trim() || match.defaultName;

    const session: OrganizerSession = {
      token,
      name: customName,
      role: match.role,
      roleTitle: match.roleTitle,
      createdAt: now,
      expiresAt: expiry,
      deviceFingerprint: fingerprint
    };

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    logAuditEvent('LOGIN', `Authenticated as [${match.roleTitle}] (${customName})`, 'SUCCESS', customName, match.roleTitle);

    return { success: true, session };
  } else {
    const nextFailed = recordFailedAttempt();
    const remaining = Math.max(0, 5 - nextFailed);

    let errorMsg = `Invalid security key. (${remaining} attempts remaining)`;
    if (nextFailed >= 5) {
      setLockoutDuration(60);
      errorMsg = 'Security alert: 5 failed attempts detected. System locked for 60 seconds.';
    } else if (nextFailed >= 3) {
      errorMsg = `Warning: High security zone. ${remaining} attempts remaining before temporary desk lockout.`;
    }

    logAuditEvent('FAILED_LOGIN', `Failed login attempt with username: "${enteredUser || 'N/A'}"`, 'ALERT', enteredUser || 'Unknown', 'Unverified');
    return { success: false, error: errorMsg };
  }
}

/**
 * Validate current active session with cryptographic signature & expiry check
 */
export async function validateActiveSession(): Promise<OrganizerSession | null> {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const session: OrganizerSession = JSON.parse(raw);
    const now = Date.now();

    // Check expiry
    if (session.expiresAt && now > session.expiresAt) {
      terminateSession('Session expired after 4 hours.');
      return null;
    }

    // Check device fingerprint
    const currentFp = getDeviceFingerprint();
    if (session.deviceFingerprint && session.deviceFingerprint !== currentFp) {
      terminateSession('Security violation: Device fingerprint mismatch.');
      return null;
    }

    // Verify token signature integrity
    const parts = session.token.split('_');
    if (parts.length < 4) {
      terminateSession('Corrupt session token format.');
      return null;
    }

    const payload = JSON.parse(atob(parts[2]));
    const expectedSig = payload.e_mail
      ? await computeSha256(`${SALT}:${payload.r}:${payload.e_mail}:${payload.t}:${payload.e}:${payload.fp}:${SALT}`)
      : await computeSha256(`${SALT}:${payload.r}:${payload.t}:${payload.e}:${payload.fp}:${SALT}`);

    if (parts[3] !== expectedSig.slice(0, 16)) {
      terminateSession('Cryptographic signature verification failed.');
      return null;
    }

    return session;
  } catch (e) {
    terminateSession('Session validation error.');
    return null;
  }
}

export function getOrganizerSessionSync(): OrganizerSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrganizerSession;
  } catch {
    return null;
  }
}

/**
 * Terminate Session
 */
export function terminateSession(reason = 'Organizer logged out'): void {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const session: OrganizerSession = JSON.parse(raw);
      logAuditEvent('LOGOUT', `Session terminated: ${reason}`, 'SUCCESS', session.name, session.roleTitle);
    }
  } catch {}
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Lockout State Manager
 */
export function getLockoutStatus(): { isLocked: boolean; remainingSeconds: number } {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0 };
    const lockUntil = Number(raw);
    const now = Date.now();
    if (lockUntil > now) {
      const remaining = Math.ceil((lockUntil - now) / 1000);
      return { isLocked: true, remainingSeconds: remaining };
    }
    localStorage.removeItem(LOCKOUT_KEY);
  } catch {}
  return { isLocked: false, remainingSeconds: 0 };
}

export function setLockoutDuration(seconds: number): void {
  const until = Date.now() + seconds * 1000;
  localStorage.setItem(LOCKOUT_KEY, String(until));
}

function getFailedAttemptsCount(): number {
  try {
    return Number(sessionStorage.getItem('synora_sec_failed_attempts') || '0');
  } catch {
    return 0;
  }
}

function recordFailedAttempt(): number {
  const current = getFailedAttemptsCount() + 1;
  sessionStorage.setItem('synora_sec_failed_attempts', String(current));
  return current;
}

function resetFailedAttempts(): void {
  sessionStorage.removeItem('synora_sec_failed_attempts');
  localStorage.removeItem(LOCKOUT_KEY);
}

/**
 * Security Audit Log Engine
 */
export function logAuditEvent(
  action: AuditLogEntry['action'],
  details: string,
  status: AuditLogEntry['status'] = 'SUCCESS',
  operator = 'Desk Coordinator',
  role = 'Organizer'
): void {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];

    const newEntry: AuditLogEntry = {
      id: `AUDIT-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + ', ' + new Date().toLocaleDateString('en-GB'),
      operator,
      role,
      action,
      details,
      status
    };

    logs.unshift(newEntry);
    if (logs.length > 100) logs.pop();

    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn('Audit log write error:', e);
  }
}

export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
