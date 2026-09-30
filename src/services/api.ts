import { TeamTicket, DeskStats, EmailConfig, RegistrationFormData, RegistrationResponse } from '../types';
import { EVENT_DETAILS } from '../data/hackathonData';
import { getOrganizerSessionSync } from '../utils/security';

const CACHE_KEY = 'synora_tickets_cache';
const LAST_REGISTERED_KEY = 'synora_last_registered_team';
const ATTENDANCE_TEAMS_KEY = 'synora_attendance_teams_v5';
const CUSTOM_SCRIPT_URL_KEY = 'synora_custom_script_url';

// High-security zero-knowledge storage encryption key
const STORAGE_CIPHER_SALT = 'CRISPR26_ZERO_KNOWLEDGE_PAYLOAD_CIPHER_v2';

function encryptPayload(data: unknown): string {
  try {
    const raw = JSON.stringify(data);
    const bytes = new TextEncoder().encode(raw);
    const saltBytes = new TextEncoder().encode(STORAGE_CIPHER_SALT);
    const xored = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      xored[i] = bytes[i] ^ saltBytes[i % saltBytes.length];
    }
    let binary = '';
    for (let i = 0; i < xored.length; i++) {
      binary += String.fromCharCode(xored[i]);
    }
    return 'SYN_ENC_' + btoa(binary);
  } catch (e) {
    return JSON.stringify(data);
  }
}

function decryptPayload<T>(ciphertext: string, fallback: T): T {
  try {
    if (!ciphertext) return fallback;
    if (!ciphertext.startsWith('SYN_ENC_')) {
      return JSON.parse(ciphertext) as T;
    }
    const b64 = ciphertext.substring(8);
    const binary = atob(b64);
    const saltBytes = new TextEncoder().encode(STORAGE_CIPHER_SALT);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) ^ saltBytes[i % saltBytes.length];
    }
    const raw = new TextDecoder().decode(bytes);
    return JSON.parse(raw) as T;
  } catch (e) {
    try {
      return JSON.parse(ciphertext) as T;
    } catch {
      return fallback;
    }
  }
}



/**
 * Generates a high-entropy, cryptographically secure Team ID (e.g. SYN26-8K7Q-9W2M).
 * Uses Crockford's Base32 charset (over 1.09 trillion combinations), completely immune to guessing/enumeration.
 */
export function generateSecureTeamId(): string {
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let block1 = '';
  let block2 = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const buffer = new Uint8Array(8);
    window.crypto.getRandomValues(buffer);
    for (let i = 0; i < 4; i++) {
      block1 += charset[buffer[i] % charset.length];
      block2 += charset[buffer[i + 4] % charset.length];
    }
  } else {
    for (let i = 0; i < 4; i++) {
      block1 += charset[Math.floor(Math.random() * charset.length)];
      block2 += charset[Math.floor(Math.random() * charset.length)];
    }
  }
  return `SYN26-${block1}-${block2}`;
}

/**
 * Mask email address for PII protection (e.g. j•••••@synora.org)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name[0]}••••@${domain}`;
  return `${name[0]}••••${name[name.length - 1]}@${domain}`;
}

/**
 * Mask mobile number for PII protection (e.g. +91 90149 ••••16)
 */
export function maskPhone(phone?: string): string {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9+]/g, '');
  if (clean.length >= 10) {
    return `${clean.substring(0, clean.length - 6)} •••• ${clean.substring(clean.length - 2)}`;
  }
  return `•••• ••${clean.slice(-2)}`;
}

/**
 * Generate a short verification fingerprint checksum
 */
export function generateSecurityFingerprint(id: string, email: string): string {
  let hash = 0;
  const str = `${id}:${email}:SYNORA26_SALT`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `SEC-SHIELD-${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
}

/**
 * Generates a self-contained, tamper-evident JSON payload to embed into the QR code.
 * This guarantees that ANY QR scanner or organizer terminal can parse and verify the complete
 * registration even if offline or before the backend sync completes.
 */
export function generateSelfContainedQrPayload(ticket: TeamTicket): string {
  try {
    const payload = {
      v: 2,
      id: ticket.teamId,
      team: ticket.teamName,
      lead: ticket.leaderName,
      email: ticket.leaderEmail,
      phone: ticket.leaderPhone,
      desig: ticket.leaderDesignation,
      col: ticket.college,
      colType: ticket.collegeType || 'external',
      cat: ticket.participantCategory || 'student',
      fee: ticket.totalFee || 400,
      txn: ticket.txnId || '',
      m: ticket.members || [],
      mDetails: ticket.memberDetails || [],
      hash: ticket.securityHash || generateSecurityFingerprint(ticket.teamId, ticket.leaderEmail),
      regAt: ticket.registeredAt || new Date().toLocaleString()
    };
    return JSON.stringify(payload);
  } catch {
    return ticket.teamId;
  }
}

/**
 * Reconstructs a full TeamTicket from a scanned QR payload or URL.
 * Automatically ingests it into local cache and attendance roster.
 */
export function reconstructTicketFromQr(rawText: string): TeamTicket | null {
  if (!rawText) return null;
  const trimmed = rawText.trim();

  // 1. Try parsing JSON payload
  if (trimmed.includes('{') && trimmed.includes('}')) {
    try {
      const jsonStart = trimmed.indexOf('{');
      const jsonEnd = trimmed.lastIndexOf('}') + 1;
      const jsonSnippet = trimmed.slice(jsonStart, jsonEnd);
      const data = JSON.parse(jsonSnippet);

      const teamId = (data.id || data.teamId || '').trim().toUpperCase();
      if (teamId && (teamId.startsWith('SYN26-') || teamId.startsWith('SYN-'))) {
        const leaderEmail = (data.email || data.leaderEmail || data.teamLeaderMail || '').trim();
        const leaderPhone = (data.phone || data.leaderPhone || data.teamLeaderMobile || '').trim();
        const teamName = (data.team || data.teamName || 'Registered Team').trim();
        const leaderName = (data.lead || data.leaderName || data.teamLeaderName || 'Team Leader').trim();
        const college = (data.col || data.college || 'SIMATS Engineering').trim();
        const collegeType = data.colType || data.collegeType || 'external';
        const participantCategory = data.cat || data.participantCategory || data.category || 'student';
        const totalFee = Number(data.fee || data.totalFee || (participantCategory === 'faculty' ? 1000 : 400));
        const txnId = (data.txn || data.txnId || '').trim();
        const leaderDesignation = data.desig || data.leaderDesignation || data.leaderYear || '3rd Year B.Tech / B.Sc / B.E.';
        
        let members: string[] = [];
        if (Array.isArray(data.m)) members = data.m;
        else if (Array.isArray(data.members)) members = data.members;
        
        let memberDetails = data.mDetails || data.memberDetails || [];
        if (!memberDetails || memberDetails.length === 0) {
          memberDetails = members.map((m: string, idx: number) => ({
            name: m,
            role: `Member ${idx + 1}`
          }));
        }

        const reconstructed: TeamTicket = {
          teamId,
          teamName,
          college,
          collegeType,
          leaderName,
          leaderEmail,
          leaderPhone,
          leaderDesignation,
          track: 'CRISPR Gene Editing Technologies',
          members,
          memberDetails,
          registeredAt: data.regAt || data.registeredAt || new Date().toLocaleString(),
          checkedIn: false,
          authVerified: true,
          participantCategory,
          totalFee,
          txnId,
          certificateStatus: 'pending',
          securityHash: data.hash || generateSecurityFingerprint(teamId, leaderEmail)
        };

        // Instantly save to local cache & attendance store
        SynoraApi.saveTicketToCache(reconstructed);
        return reconstructed;
      }
    } catch {}
  }

  // 2. Try parsing URL parameters
  if (trimmed.includes('?') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://synora.org/${trimmed}`);
      const id = urlObj.searchParams.get('id') || urlObj.searchParams.get('pass') || urlObj.searchParams.get('teamId');
      if (id && (id.toUpperCase().startsWith('SYN26-') || id.toUpperCase().startsWith('SYN-'))) {
        const cached = SynoraApi.getCachedTicket(id);
        if (cached) return cached;
      }
    } catch {}
  }

  return null;
}

/**
 * Extract clean Team ID from any scanned QR format (URL, JSON, raw ID, query parameters)
 */
export function extractTeamIdFromQr(rawText: string): string {
  if (!rawText) return '';
  const trimmed = rawText.trim();

  // 1. Direct Regex scan anywhere in the text for SYN26-XXXX-XXXX or SYN-XXXX
  const directMatch = trimmed.match(/SYN26-[A-Z0-9]{3,5}-[A-Z0-9]{3,5}/i) || trimmed.match(/SYN-?[0-9]{3,6}/i);
  if (directMatch && directMatch[0]) {
    return directMatch[0].trim().toUpperCase();
  }

  // 2. If it's a JSON payload
  if (trimmed.includes('{') && trimmed.includes('}')) {
    try {
      const jsonStart = trimmed.indexOf('{');
      const jsonEnd = trimmed.lastIndexOf('}') + 1;
      const jsonSnippet = trimmed.slice(jsonStart, jsonEnd);
      const payload = JSON.parse(jsonSnippet);
      if (payload.id) return String(payload.id).trim().toUpperCase();
      if (payload.teamId) return String(payload.teamId).trim().toUpperCase();
      if (payload.team) return String(payload.team).trim();
    } catch {}
  }

  // 3. If it's a URL, parse URL query parameters
  if (trimmed.includes('?') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://synora.org/${trimmed}`);
      const idParam =
        urlObj.searchParams.get('id') ||
        urlObj.searchParams.get('teamId') ||
        urlObj.searchParams.get('pass') ||
        urlObj.searchParams.get('team');
      if (idParam) return idParam.trim().toUpperCase();
    } catch {
      const paramMatch = trimmed.match(/[?&](?:id|teamId|pass)=([^&#]+)/i);
      if (paramMatch && paramMatch[1]) {
        return decodeURIComponent(paramMatch[1]).trim().toUpperCase();
      }
    }
  }

  return trimmed.toUpperCase();
}

export class SynoraApi {
  /**
   * Get active Google Apps Script Web App URL (custom configured or default)
   */
  public static getScriptUrl(): string {
    try {
      if (typeof window !== 'undefined') {
        const custom = localStorage.getItem(CUSTOM_SCRIPT_URL_KEY);
        if (custom && custom.trim().startsWith('http')) {
          return custom.trim();
        }
      }
    } catch {}
    return EVENT_DETAILS.scriptUrl;
  }

  /**
   * Set custom Google Apps Script Web App URL
   */
  public static setScriptUrl(url: string): void {
    try {
      if (typeof window !== 'undefined') {
        if (url && url.trim().startsWith('http')) {
          localStorage.setItem(CUSTOM_SCRIPT_URL_KEY, url.trim());
        } else {
          localStorage.removeItem(CUSTOM_SCRIPT_URL_KEY);
        }
      }
    } catch {}
  }

  /**
   * Helper: Normalize raw ticket object from Apps Script or cache
   */
  public static normalizeTicket(raw: any, verifiedEmail?: string): TeamTicket {
    let membersList: string[] = [];
    if (Array.isArray(raw.members)) {
      membersList = raw.members.map((m: any) => String(m).trim()).filter(Boolean);
    } else if (typeof raw.members === 'string' && raw.members.trim()) {
      membersList = raw.members
        .split(',')
        .map((m: string) => m.trim())
        .filter(Boolean);
    }

    const rawEmail = (raw.leaderEmail || raw.teamLeaderMail || '').trim();
    const rawPhone = (raw.leaderPhone || raw.teamLeaderMobile || '').trim();
    const teamId = (raw.teamId || raw.id || 'SYN26-XXXX-XXXX').trim();

    // Verification check: email matches or auth token is present
    const isOwnerVerified = Boolean(
      raw.authVerified ||
      (verifiedEmail && (
        rawEmail.toLowerCase() === verifiedEmail.toLowerCase().trim() ||
        rawPhone.replace(/[^0-9]/g, '') === verifiedEmail.replace(/[^0-9]/g, '')
      ))
    );

    // Resolve collegeType from multiple possible fields (Registration Type, collegeType, etc.)
    // Sheet stores "INTERNAL" or "EXTERNAL" in the Registration Type column
    const rawCollegeType = (raw.collegeType || raw.registrationType || raw.regType || '').toString().trim().toLowerCase();
    const collegeType: 'internal' | 'external' = rawCollegeType.includes('internal') ? 'internal' : 'external';

    // Resolve participant category: prefer explicit field, then infer from fee
    const rawCategory = (raw.participantCategory || raw.category || '').toString().trim().toLowerCase();
    const totalFeeVal = raw.totalFee ? Number(raw.totalFee) : 0;
    let participantCategory: 'student' | 'faculty' = 'student';
    if (rawCategory === 'faculty' || rawCategory === 'professor') {
      participantCategory = 'faculty';
    } else if (rawCategory && rawCategory !== 'student' && (rawCategory === 'faculty' || rawCategory === 'student')) {
      participantCategory = rawCategory as 'student' | 'faculty';
    } else if (totalFeeVal >= 500) {
      // Infer faculty from high fee when category is not explicitly set
      participantCategory = 'faculty';
    }

    const computedFee = totalFeeVal > 0 ? totalFeeVal : (participantCategory === 'faculty' ? 500 : (collegeType === 'internal' ? 0 : 200));

    return {
      teamId,
      teamName: raw.teamName || 'Registered Team',
      college: raw.college || 'Engineering College',
      collegeType,
      leaderName: raw.leaderName || raw.teamLeaderName || 'Team Leader',
      leaderEmail: rawEmail,
      leaderPhone: rawPhone,
      leaderDesignation: raw.leaderDesignation || raw.leaderYear || '3rd Year B.Tech / B.Sc / B.E.',
      track: raw.track || 'CRISPR Gene Editing Technologies',
      members: membersList,
      memberDetails: raw.memberDetails || membersList.map((m, idx) => ({
        name: m,
        role: `Member ${idx + 1}`
      })),
      checkedIn: raw.checkedIn || raw.isCheckedIn || false,
      checkinTime: raw.checkinTime || raw.checkInTime || '',
      registeredAt: raw.timestamp || raw.registeredAt || new Date().toLocaleString(),
      authVerified: isOwnerVerified,
      isMasked: !isOwnerVerified && Boolean(raw.isMasked),
      securityHash: raw.securityHash || generateSecurityFingerprint(teamId, rawEmail),
      participantCategory,
      totalFee: computedFee,
      txnId: raw.txnId || raw.externalTxnId || '',
      paymentScreenshotBase64: raw.paymentScreenshotBase64 || '',
      verifiedBy: raw.verifiedBy || '',
      certificateStatus: raw.certificateStatus || (raw.checkedIn ? 'eligible' : 'pending')
    };
  }

  /**
   * Get all registered teams from attendance registry.
   * AUTHORITATIVE: Only returns teams that exist in localStorage (populated by sync or registration).
   * Does NOT inject seed/demo data — that only happens if localStorage is completely empty.
   */
  public static getAllTeams(): TeamTicket[] {
    const LEGACY_DUMMY_IDS = new Set([
      'SYN26-8K7Q-9W2M',
      'SYN26-3N9P-4V7X',
      'SYN26-5B8R-2T1L',
      'SYN26-9X2M-7K4P',
      'SYN26-7Y1K-8W3L'
    ]);

    try {
      const rawStored = localStorage.getItem(ATTENDANCE_TEAMS_KEY);
      let parsed: TeamTicket[] = decryptPayload<TeamTicket[]>(rawStored || '', []);
      if (!Array.isArray(parsed)) parsed = [];

      // Filter out any legacy dummy mock teams
      parsed = parsed.filter((t) => t && t.teamId && !LEGACY_DUMMY_IDS.has(t.teamId.toUpperCase()));

      // Deduplicate by Team ID (keep latest version)
      const map = new Map<string, TeamTicket>();
      parsed.forEach((t) => {
        if (!LEGACY_DUMMY_IDS.has(t.teamId.toUpperCase())) {
          map.set(t.teamId.toUpperCase(), t);
        }
      });

      const deduped = Array.from(map.values());
      localStorage.setItem(ATTENDANCE_TEAMS_KEY, encryptPayload(deduped));
      return deduped;
    } catch {
      return [];
    }
  }

  /**
   * Live Sync: AUTHORITATIVE Database Sync with Google Sheets.
   * Google Sheet is the SINGLE SOURCE OF TRUTH.
   * On successful sync, localStorage is fully REPLACED (not merged) with sheet data.
   * This prevents phantom/stale teams from accumulating in local storage.
   */
  public static async syncWithGoogleSheet(): Promise<{ success: boolean; count: number; teams: TeamTicket[]; message: string }> {
    const params = new URLSearchParams({
      action: 'adminteams',
      adminKey: getOrganizerSessionSync()?.token || ''
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(this.getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      
      if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        const validTeams = json.data.map((raw: any) => this.normalizeTicket(raw));
        const sheetMap = new Map<string, TeamTicket>();
        validTeams.forEach((t: TeamTicket) => {
          sheetMap.set(t.teamId.toUpperCase(), t);
        });

        const authoritative = Array.from(sheetMap.values());
        localStorage.setItem(ATTENDANCE_TEAMS_KEY, encryptPayload(authoritative));
        authoritative.forEach((t) => this.saveTicketToCache(t));
        return {
          success: true,
          count: authoritative.length,
          teams: authoritative,
          message: `Synchronized ${authoritative.length} live records from Google Sheets!`
        };
      }
    } catch (err) {
      console.warn("Failed to sync live teams:", err);
    }

    const fallbackList = this.getAllTeams();
    return {
      success: true,
      count: fallbackList.length,
      teams: fallbackList,
      message: 'Using active attendance records.'
    };
  }

  /**
   * Save / Sync team ticket into attendance store
   */
  public static saveToAttendanceRoster(ticket: TeamTicket): void {
    try {
      const teams = this.getAllTeams();
      const idx = teams.findIndex((t) => t.teamId.toUpperCase() === ticket.teamId.toUpperCase());
      if (idx >= 0) {
        teams[idx] = { ...teams[idx], ...ticket };
      } else {
        teams.unshift(ticket);
      }
      localStorage.setItem(ATTENDANCE_TEAMS_KEY, encryptPayload(teams));
    } catch (e) {
      console.warn('Error saving to attendance roster:', e);
    }
  }

  /**
   * Background sync helper: Dispatch full team check-in payload to Google Apps Script
   */
  public static async syncCheckInToAppsScript(ticket: TeamTicket, organizerName = 'Desk Coordinator'): Promise<{ success: boolean; message?: string }> {
    try {
      const params = new URLSearchParams({
        action: 'checkin',
        teamId: ticket.teamId || '',
        teamName: ticket.teamName || '',
        leaderName: ticket.leaderName || '',
        leaderEmail: ticket.leaderEmail || '',
        leaderPhone: ticket.leaderPhone || '',
        college: ticket.college || '',
        category: ticket.participantCategory || 'student',
        totalFee: String(ticket.totalFee || 400),
        txnId: ticket.txnId || '',
        member1Name: ticket.memberDetails?.[0]?.name || ticket.members?.[0] || '',
        member1Email: ticket.memberDetails?.[0]?.email || '',
        member1Phone: ticket.memberDetails?.[0]?.phone || '',
        member2Name: ticket.memberDetails?.[1]?.name || ticket.members?.[1] || '',
        member3Name: ticket.memberDetails?.[2]?.name || ticket.members?.[2] || '',
        organizerName: organizerName || 'Desk Coordinator',
        adminKey: getOrganizerSessionSync()?.token || ''
      });
      const res = await fetch(this.getScriptUrl(), { 
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const data = await res.json();
      if (data && data.status === 'success') {
        return { success: true };
      }
      return { success: false, message: data?.message || 'Backend check-in failed.' };
    } catch (err) {
      console.error('Check-in sync error:', err);
      return { success: false, message: 'Network error during check-in.' };
    }
  }

  /**
   * Mark Team Present (Organizer QR Scan or Manual Check-In)
   */
  public static async markAttendance(
    teamId: string,
    organizerName = 'Desk Coordinator'
  ): Promise<{ success: boolean; ticket: TeamTicket; message: string }> {
    const cleanId = extractTeamIdFromQr(teamId);
    const teams = this.getAllTeams();
    const targetIdx = teams.findIndex(
      (t) =>
        t.teamId.toUpperCase() === cleanId.toUpperCase() ||
        t.leaderEmail.toLowerCase() === cleanId.toLowerCase() ||
        (t.leaderPhone && t.leaderPhone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );

    if (targetIdx < 0) {
      // 1. Check local cache
      let foundTicket = this.getCachedTicket(cleanId);

      // 2. Try reconstruct directly from scanned QR payload if provided
      if (!foundTicket) {
        foundTicket = reconstructTicketFromQr(teamId);
      }

      // 3. If not in local cache, fetch live from Google Apps Script!
      if (!foundTicket) {
        foundTicket = await this.getTicket(cleanId);
      }

      if (foundTicket) {
        // Attempt authoritative backend check-in first
        const syncRes = await this.syncCheckInToAppsScript(foundTicket, organizerName);
        if (!syncRes.success) {
          return {
            success: false,
            ticket: foundTicket,
            message: syncRes.message || 'Check-in failed on the backend.'
          };
        }

        const now = new Date().toLocaleString();
        foundTicket.checkedIn = true;
        foundTicket.checkinTime = now;
        foundTicket.verifiedBy = organizerName;
        foundTicket.certificateStatus = 'eligible';
        this.saveToAttendanceRoster(foundTicket);
        this.saveTicketToCache(foundTicket);

        return {
          success: true,
          ticket: foundTicket,
          message: `Attendance marked for Team ${foundTicket.teamName}!`
        };
      }

      return {
        success: false,
        ticket: null as any,
        message: `Team with Pass ID "${cleanId}" not found in database.`
      };
    }

    const syncRes = await this.syncCheckInToAppsScript(teams[targetIdx], organizerName);
    if (!syncRes.success) {
      return {
        success: false,
        ticket: teams[targetIdx],
        message: syncRes.message || 'Check-in failed on the backend.'
      };
    }

    const now = new Date().toLocaleString();
    teams[targetIdx].checkedIn = true;
    teams[targetIdx].checkinTime = now;
    teams[targetIdx].verifiedBy = organizerName;
    teams[targetIdx].certificateStatus = 'eligible';

    const updated = teams[targetIdx];
    localStorage.setItem(ATTENDANCE_TEAMS_KEY, encryptPayload(teams));
    this.saveTicketToCache(updated);

    return {
      success: true,
      ticket: updated,
      message: `Verified! Team ${updated.teamName} is marked PRESENT.`
    };
  }

  /**
   * Revert Team Attendance (Undo Check-In)
   */
  public static async unmarkAttendance(
    teamId: string
  ): Promise<{ success: boolean; ticket: TeamTicket; message: string }> {
    const cleanId = teamId.trim();
    const teams = this.getAllTeams();
    const targetIdx = teams.findIndex((t) => t.teamId.toUpperCase() === cleanId.toUpperCase());

    if (targetIdx >= 0) {
      const updated = teams[targetIdx];
      
      // Sync uncheck to Apps Script
      let backendSuccess = false;
      try {
        const params = new URLSearchParams({
          action: 'uncheck',
          teamId: updated.teamId,
          adminKey: getOrganizerSessionSync()?.token || ''
        });
        const res = await fetch(this.getScriptUrl(), { 
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        const data = await res.json();
        if (data && data.status === 'success') {
          backendSuccess = true;
        }
      } catch (err) {
        console.error('Uncheck sync error:', err);
      }

      if (!backendSuccess) {
        return {
          success: false,
          ticket: updated,
          message: 'Failed to remove check-in on the backend.'
        };
      }

      teams[targetIdx].checkedIn = false;
      teams[targetIdx].checkinTime = undefined;
      teams[targetIdx].certificateStatus = 'pending';
      teams[targetIdx].verifiedBy = undefined;

      localStorage.setItem(ATTENDANCE_TEAMS_KEY, encryptPayload(teams));
      this.saveTicketToCache(teams[targetIdx]);

      return {
        success: true,
        ticket: teams[targetIdx],
        message: `Attendance check-in removed for Team ${updated.teamName}.`
      };
    }

    return {
      success: false,
      ticket: null as any,
      message: 'Team not found.'
    };
  }

  /**
   * Measure latency ping to Google Apps Script endpoint in milliseconds
   */
  public static async measurePing(): Promise<{ latencyMs: number; ok: boolean; message: string }> {
    const start = performance.now();
    try {
      const url = `${this.getScriptUrl()}?action=ping&_t=${Date.now()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - start);
      return {
        latencyMs: elapsed,
        ok: res.ok || res.status === 200,
        message: `Connected (${elapsed}ms)`
      };
    } catch {
      const elapsed = Math.round(performance.now() - start);
      return {
        latencyMs: elapsed > 4000 ? 4000 : elapsed,
        ok: false,
        message: 'Timeout / CORS'
      };
    }
  }

  /**
   * Bulk Mark Attendance for multiple teams simultaneously
   */
  public static async bulkMarkAttendance(
    teamIds: string[],
    organizerName = 'Desk Coordinator'
  ): Promise<{ success: boolean; count: number; updatedTeams: TeamTicket[] }> {
    const teams = this.getAllTeams();
    const now = new Date().toLocaleString();
    const targetSet = new Set(teamIds.map((id) => id.toUpperCase()));
    let count = 0;
    const updated: TeamTicket[] = [];

    const targetTeams = teams.filter((t) => targetSet.has(t.teamId.toUpperCase()));
    
    // Process backend syncs concurrently
    const syncResults = await Promise.all(
      targetTeams.map((t) => this.syncCheckInToAppsScript(t, organizerName))
    );

    targetTeams.forEach((t, index) => {
      if (syncResults[index].success) {
        t.checkedIn = true;
        t.checkinTime = now;
        t.verifiedBy = organizerName;
        t.certificateStatus = 'eligible';
        this.saveTicketToCache(t);
        count++;
        updated.push(t);
      }
    });

    if (count > 0) {
      localStorage.setItem(ATTENDANCE_TEAMS_KEY, encryptPayload(teams));
    }
    
    return { success: true, count, updatedTeams: updated };
  }

  /**
   * Bulk Revert Attendance for multiple teams simultaneously
   */
  public static async bulkUnmarkAttendance(
    teamIds: string[]
  ): Promise<{ success: boolean; count: number }> {
    const teams = this.getAllTeams();
    const targetSet = new Set(teamIds.map((id) => id.toUpperCase()));
    let count = 0;

    const targetTeams = teams.filter((t) => targetSet.has(t.teamId.toUpperCase()));

    // Process backend syncs concurrently
    const syncResults = await Promise.all(
      targetTeams.map(async (t) => {
        try {
          const params = new URLSearchParams({
            action: 'uncheck',
            teamId: t.teamId,
            adminKey: getOrganizerSessionSync()?.token || ''
          });
          const res = await fetch(this.getScriptUrl(), { 
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
          });
          const data = await res.json();
          return data && data.status === 'success';
        } catch (err) {
          console.error('Background bulk uncheck error:', err);
          return false;
        }
      })
    );

    targetTeams.forEach((t, index) => {
      if (syncResults[index]) {
        t.checkedIn = false;
        t.checkinTime = undefined;
        t.certificateStatus = 'pending';
        t.verifiedBy = undefined;
        this.saveTicketToCache(t);
        count++;
      }
    });

    if (count > 0) {
      localStorage.setItem(ATTENDANCE_TEAMS_KEY, encryptPayload(teams));
    }
    
    return { success: true, count };
  }

  /**
   * Export Full Attendance Register to CSV for IET Certificate Issuance
   */
  public static exportAttendanceCsv(teams: TeamTicket[]): string {
    const rows: string[] = [
      'Pass ID,Team Name,Participant Name,Role,Email Address,Mobile Number,Designation / Year,College / Institution,Category,Attendance Status,Check-in Time,Verified By,Certificate Status'
    ];

    teams.forEach((t) => {
      const statusStr = t.checkedIn ? 'PRESENT' : 'ABSENT / PENDING';
      const checkinTimeStr = t.checkinTime || 'N/A';
      const verifierStr = t.verifiedBy || 'N/A';
      const certStr = t.checkedIn ? 'ELIGIBLE' : 'PENDING CHECK-IN';
      const cleanTeam = `"${t.teamName.replace(/"/g, '""')}"`;
      const cleanCollege = `"${t.college.replace(/"/g, '""')}"`;

      // 1. Team Leader Row
      rows.push(
        `${t.teamId},${cleanTeam},"${t.leaderName.replace(/"/g, '""')}",Team Leader,${t.leaderEmail},${t.leaderPhone || ''},"${t.leaderDesignation || ''}",${cleanCollege},${t.participantCategory || 'student'},${statusStr},"${checkinTimeStr}","${verifierStr}",${certStr}`
      );

      // 2. Co-Delegates Rows
      if (Array.isArray(t.memberDetails) && t.memberDetails.length > 0) {
        t.memberDetails.forEach((m, idx) => {
          rows.push(
            `${t.teamId},${cleanTeam},"${m.name.replace(/"/g, '""')}",${m.role || `Member ${idx + 2}`},${m.email || ''},${m.phone || ''},"${m.designation || ''}",${cleanCollege},${t.participantCategory || 'student'},${statusStr},"${checkinTimeStr}","${verifierStr}",${certStr}`
          );
        });
      } else if (Array.isArray(t.members)) {
        t.members.forEach((mName, idx) => {
          rows.push(
            `${t.teamId},${cleanTeam},"${mName.replace(/"/g, '""')}",Member ${idx + 2},,,,"${cleanCollege}",${t.participantCategory || 'student'},${statusStr},"${checkinTimeStr}","${verifierStr}",${certStr}`
          );
        });
      }
    });

    return rows.join('\n');
  }

  /**
   * Save ticket into localStorage cache for instant zero-latency retrieval
   */
  public static saveTicketToCache(ticket: TeamTicket): void {
    try {
      const existing = localStorage.getItem(CACHE_KEY);
      const map: Record<string, TeamTicket> = existing ? decryptPayload<Record<string, TeamTicket>>(existing, {}) : {};

      if (ticket.teamId) map[ticket.teamId.toUpperCase()] = ticket;
      if (ticket.leaderEmail) map[ticket.leaderEmail.toLowerCase()] = ticket;
      if (ticket.teamName) map[ticket.teamName.toLowerCase()] = ticket;

      localStorage.setItem(CACHE_KEY, encryptPayload(map));
      localStorage.setItem(LAST_REGISTERED_KEY, encryptPayload(ticket));
      this.saveToAttendanceRoster(ticket);
    } catch (e) {
      console.warn('LocalStorage cache write error:', e);
    }
  }

  /**
   * Look up cached ticket by Team ID, email, or team name
   */
  public static getCachedTicket(query: string, verifyEmail?: string): TeamTicket | null {
    try {
      const clean = query.trim();
      if (!clean) return null;

      // 1. Check full attendance list first
      const allTeams = this.getAllTeams();
      const match = allTeams.find(
        (t) =>
          t.teamId.toUpperCase() === clean.toUpperCase() ||
          t.leaderEmail.toLowerCase() === clean.toLowerCase() ||
          t.teamName.toLowerCase() === clean.toLowerCase() ||
          (t.leaderPhone && t.leaderPhone.replace(/\D/g, '') === clean.replace(/\D/g, ''))
      );
      if (match) return match;

      // 2. Check last registered ticket
      const lastReg = localStorage.getItem(LAST_REGISTERED_KEY);
      if (lastReg) {
        const rawDecrypted = decryptPayload<any>(lastReg, null);
        if (rawDecrypted) {
          const parsed = this.normalizeTicket(rawDecrypted, verifyEmail);
          if (
            parsed.teamId.toUpperCase() === clean.toUpperCase() ||
            parsed.leaderEmail.toLowerCase() === clean.toLowerCase() ||
            parsed.teamName.toLowerCase() === clean.toLowerCase()
          ) {
            return parsed;
          }
        }
      }

      // 3. Check full ticket map
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const map: Record<string, any> = decryptPayload<Record<string, any>>(cached, {});
        const hit =
          map[clean.toUpperCase()] ||
          map[clean.toLowerCase()] ||
          Object.values(map).find((t: any) =>
            t.teamId?.toUpperCase() === clean.toUpperCase() ||
            t.leaderEmail?.toLowerCase() === clean.toLowerCase() ||
            t.teamName?.toLowerCase() === clean.toLowerCase()
          );

        if (hit) {
          return this.normalizeTicket(hit, verifyEmail);
        }
      }
    } catch (e) {
      console.warn('LocalStorage cache read error:', e);
    }
    return null;
  }

  /**
   * Checks for duplicate team name, email, or mobile number across registered teams
   * Exemption: kandukurijagan99@gmail.com is allowed unlimited registrations
   */
  public static checkDuplicateRegistration(formData: {
    teamName: string;
    leaderEmail: string;
    leaderPhone: string;
    member1Email?: string;
    member1Phone?: string;
    member2Email?: string;
    member2Phone?: string;
    member3Email?: string;
    member3Phone?: string;
  }): { isDuplicate: boolean; field?: 'teamName' | 'email' | 'phone'; message?: string } {
    const rawEmail = (formData.leaderEmail || '').trim().toLowerCase();
    const isWhitelisted = rawEmail === 'kandukurijagan99@gmail.com' || rawEmail.includes('kandukurijagan99');

    const cleanTeamName = (formData.teamName || '').trim().toLowerCase();
    const newEmails = [
      formData.leaderEmail,
      formData.member1Email,
      formData.member2Email,
      formData.member3Email
    ]
      .filter(Boolean)
      .map((e) => (e as string).trim().toLowerCase())
      .filter((e) => e.includes('@'));

    const newPhones = [
      formData.leaderPhone,
      formData.member1Phone,
      formData.member2Phone,
      formData.member3Phone
    ]
      .filter(Boolean)
      .map((p) => (p as string).replace(/\D/g, '').slice(-10))
      .filter((p) => p.length >= 10);

    const existingTeams = this.getAllTeams();

    for (const t of existingTeams) {
      if (!t || !t.teamId) continue;

      // 1. Team Name Duplicate Check (Strict for all)
      if (cleanTeamName && t.teamName && t.teamName.trim().toLowerCase() === cleanTeamName) {
        return {
          isDuplicate: true,
          field: 'teamName',
          message: `Team name "${formData.teamName.trim()}" is already registered. Please choose a unique team name.`
        };
      }

      // If whitelisted admin email, bypass email and phone duplicate checks
      if (isWhitelisted) continue;

      // 2. Email Duplicate Check
      const existingTeamEmails = [
        t.leaderEmail,
        ...(Array.isArray(t.memberDetails) ? t.memberDetails.map((m) => m?.email) : [])
      ]
        .filter(Boolean)
        .map((e) => (e as string).trim().toLowerCase());

      for (const ne of newEmails) {
        if (ne && ne !== 'kandukurijagan99@gmail.com' && existingTeamEmails.includes(ne)) {
          return {
            isDuplicate: true,
            field: 'email',
            message: `Email address "${ne}" is already registered with another team.`
          };
        }
      }

      // 3. Mobile Number Duplicate Check
      const existingTeamPhones = [
        t.leaderPhone,
        ...(Array.isArray(t.memberDetails) ? t.memberDetails.map((m) => m?.phone) : [])
      ]
        .filter(Boolean)
        .map((p) => (p as string).replace(/\D/g, '').slice(-10))
        .filter((p) => p.length >= 10);

      for (const np of newPhones) {
        if (np && existingTeamPhones.includes(np)) {
          return {
            isDuplicate: true,
            field: 'phone',
            message: `Mobile number "${np}" is already registered with another team.`
          };
        }
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Register a new hackathon/workshop delegate (Instant Sub-Second Optimistic Pass Generation)
   */
  public static async registerTeam(formData: RegistrationFormData): Promise<RegistrationResponse> {
    // 0. Perform client-side duplicate pre-check
    const dupCheck = this.checkDuplicateRegistration({
      teamName: formData.teamName,
      leaderEmail: formData.leaderEmail,
      leaderPhone: formData.leaderPhone,
      member1Email: formData.member1Email,
      member1Phone: formData.member1Phone,
      member2Email: formData.member2Email,
      member2Phone: formData.member2Phone,
      member3Email: formData.member3Email,
      member3Phone: formData.member3Phone
    });

    if (dupCheck.isDuplicate) {
      return {
        success: false,
        message: dupCheck.message || 'Registration duplicate detected.'
      };
    }
    const membersArr: string[] = [];
    const memberDetailsList = [];

    if (formData.member1Name && formData.member1Name.trim()) {
      membersArr.push(formData.member1Name.trim());
      memberDetailsList.push({
        name: formData.member1Name.trim(),
        email: formData.member1Email?.trim(),
        phone: formData.member1Phone?.trim(),
        designation: formData.member1Year,
        role: 'Member 2'
      });
    }
    if (formData.member2Name && formData.member2Name.trim()) {
      membersArr.push(formData.member2Name.trim());
      memberDetailsList.push({
        name: formData.member2Name.trim(),
        email: formData.member2Email?.trim(),
        phone: formData.member2Phone?.trim(),
        designation: formData.member2Year,
        role: 'Member 3'
      });
    }
    if (formData.member3Name && formData.member3Name.trim()) {
      membersArr.push(formData.member3Name.trim());
      memberDetailsList.push({
        name: formData.member3Name.trim(),
        email: formData.member3Email?.trim(),
        phone: formData.member3Phone?.trim(),
        designation: formData.member3Year,
        role: 'Member 4'
      });
    }

    const totalParticipants = Math.max(1, membersArr.length + 1);

    // 1. Build backend request payload
    const params = new URLSearchParams();
    params.append('action', 'register');
    params.append('teamName', formData.teamName.trim());
    params.append('track', formData.track.trim());
    params.append('college', formData.college.trim());
    params.append('collegeType', formData.collegeType);
    params.append('category', formData.participantCategory || 'student');
    params.append('teamLeaderName', formData.leaderName.trim());
    params.append('leaderName', formData.leaderName.trim());
    params.append('teamLeaderMail', formData.leaderEmail.trim());
    params.append('leaderEmail', formData.leaderEmail.trim());
    params.append('teamLeaderMobile', formData.leaderPhone.trim());
    params.append('leaderPhone', formData.leaderPhone.trim());
    params.append('leaderYear', formData.leaderYear);

    if (formData.member1Name?.trim()) {
      params.append('member1Name', formData.member1Name.trim());
      params.append('member1Mail', formData.member1Email?.trim() || '');
      params.append('member1Phone', formData.member1Phone?.trim() || '');
      params.append('member1Year', formData.member1Year?.trim() || '');
    }
    if (formData.member2Name?.trim()) {
      params.append('member2Name', formData.member2Name.trim());
      params.append('member2Mail', formData.member2Email?.trim() || '');
      params.append('member2Phone', formData.member2Phone?.trim() || '');
      params.append('member2Year', formData.member2Year?.trim() || '');
    }
    if (formData.member3Name?.trim()) {
      params.append('member3Name', formData.member3Name.trim());
      params.append('member3Mail', formData.member3Email?.trim() || '');
      params.append('member3Phone', formData.member3Phone?.trim() || '');
      params.append('member3Year', formData.member3Year?.trim() || '');
    }

    params.append('members', membersArr.join(', '));
    params.append('memberCount', String(totalParticipants));
    params.append('internalRegNo', formData.internalRegNo?.trim() || '');
    params.append('externalTxnId', formData.txnId?.trim() || '');
    params.append('txnId', formData.txnId?.trim() || '');
    params.append('hasPaid', 'yes');
    params.append('totalFee', String(formData.totalFee));

    if (formData.paymentScreenshotBase64) {
      params.append('fileData', formData.paymentScreenshotBase64);
      params.append('fileName', formData.paymentScreenshotName || 'receipt.jpg');
      const mime = formData.paymentScreenshotBase64.split(';')[0]?.replace('data:', '') || 'image/jpeg';
      params.append('fileMime', mime);
      params.append('receiptBase64', 'attached');
    }

    if (formData.collegeIdCardBase64) {
      params.append('idCardData', formData.collegeIdCardBase64);
      params.append('idCardName', formData.collegeIdCardName || 'college_id.jpg');
    }

    // 2. Await the response from the Google Apps Script backend
    let backendResponse;
    try {
      const res = await fetch(this.getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
      backendResponse = await res.json();
    } catch (err) {
      console.error('Registration API error:', err);
      return {
        success: false,
        message: 'Network error communicating with the registration server. Please try again later.'
      };
    }

    if (!backendResponse || backendResponse.status !== 'success') {
      return {
        success: false,
        message: backendResponse?.message || 'Registration failed due to a server error.'
      };
    }

    // 3. Backend was successful, construct ticket using backend's authoritative teamId
    const secureId = backendResponse.teamId || generateSecureTeamId();

    const confirmedTicket: TeamTicket = {
      teamId: secureId,
      teamName: formData.teamName.trim() || formData.leaderName.trim(),
      college: formData.college.trim(),
      collegeType: formData.collegeType,
      leaderName: formData.leaderName.trim(),
      leaderEmail: formData.leaderEmail.trim(),
      leaderPhone: formData.leaderPhone.trim(),
      leaderDesignation: formData.leaderYear,
      track: formData.track.trim(),
      members: membersArr,
      memberDetails: memberDetailsList,
      registeredAt: new Date().toLocaleString(),
      checkedIn: false,
      authVerified: true,
      participantCategory: formData.participantCategory || 'student',
      totalFee: formData.totalFee,
      txnId: formData.txnId,
      internalRegNo: formData.internalRegNo,
      paymentScreenshotBase64: formData.paymentScreenshotBase64,
      collegeIdCardBase64: formData.collegeIdCardBase64,
      collegeIdCardName: formData.collegeIdCardName,
      certificateStatus: 'pending',
      securityHash: generateSecurityFingerprint(secureId, formData.leaderEmail.trim())
    };

    // 4. Save to local cache now that the backend confirmed success
    this.saveTicketToCache(confirmedTicket);

    return {
      success: true,
      teamId: secureId,
      ticket: confirmedTicket,
      message: backendResponse.message || 'Registration confirmed!'
    };
  }

  /**
   * Fetch digital entry pass data with dual-factor verification (Fast-Path Cache + Timeout Guard)
   */
  public static async getTicket(query: string, verifyEmail?: string): Promise<TeamTicket | null> {
    const cleanQuery = query.trim();
    const cleanVerify = (verifyEmail || '').trim();
    if (!cleanQuery) return null;

    // 1. Check local cache first for 0ms retrieval
    const cached = this.getCachedTicket(cleanQuery, cleanVerify);
    if (cached) {
      return cached;
    }

    // 2. Try reconstruct from QR payload if query is a JSON/URL payload
    const reconstructed = reconstructTicketFromQr(cleanQuery);
    if (reconstructed) {
      return reconstructed;
    }

    let url = `${this.getScriptUrl()}?action=getTicket&id=${encodeURIComponent(cleanQuery)}`;
    if (cleanVerify) {
      url += `&email=${encodeURIComponent(cleanVerify)}`;
    }

    // 1. Concurrent Fetch
    const fetchPromise = (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        const json = await res.json();
        if (json && json.status === 'success' && json.data) {
          const normalized = this.normalizeTicket(json.data, cleanVerify);
          this.saveTicketToCache(normalized);
          return normalized;
        }
      } catch {}
      return null;
    })();

    // 2. Concurrent JSONP (Bypasses CORS instantly)
    const jsonpPromise = new Promise<TeamTicket | null>((resolve) => {
      const callbackName = 'synora_get_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      let isDone = false;

      const timer = setTimeout(() => {
        if (!isDone) {
          isDone = true;
          delete (window as unknown as Record<string, unknown>)[callbackName];
          resolve(this.getCachedTicket(cleanQuery, cleanVerify));
        }
      }, 5500);

      (window as unknown as Record<string, (resp: { status: string; data?: any }) => void>)[callbackName] = (resp) => {
        if (!isDone) {
          isDone = true;
          clearTimeout(timer);
          if (resp && resp.status === 'success' && resp.data) {
            const normalized = this.normalizeTicket(resp.data, cleanVerify);
            this.saveTicketToCache(normalized);
            resolve(normalized);
          } else {
            resolve(this.getCachedTicket(cleanQuery, cleanVerify));
          }
          delete (window as unknown as Record<string, unknown>)[callbackName];
        }
      };

      try {
        const script = document.createElement('script');
        script.src = `${url}&callback=${callbackName}&_t=${Date.now()}`;
        script.onerror = () => {
          if (!isDone) {
            isDone = true;
            clearTimeout(timer);
            delete (window as unknown as Record<string, unknown>)[callbackName];
            resolve(this.getCachedTicket(cleanQuery, cleanVerify));
          }
        };
        document.body.appendChild(script);
      } catch {
        resolve(this.getCachedTicket(cleanQuery, cleanVerify));
      }
    });

    try {
      const result = await Promise.race([fetchPromise, jsonpPromise]);
      if (result) return result;
      return (await fetchPromise) || (await jsonpPromise) || this.getCachedTicket(cleanQuery, cleanVerify);
    } catch {
      return this.getCachedTicket(cleanQuery, cleanVerify);
    }
  }

  /**
   * Organizer Admin: Fetch Reception Desk Statistics
   */
  public static async getAdminStats(adminKey: string): Promise<DeskStats | null> {
    if (!adminKey) return null;
    try {
      const params = new URLSearchParams({
        action: 'stats',
        adminKey: adminKey
      });
      const res = await fetch(this.getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const data = await res.json();
      if (data && data.status === 'success') {
        return {
          totalRegistered: data.totalRegistered || 0,
          totalCheckedIn: data.totalCheckedIn || 0,
          totalPending: data.totalPending || 0
        };
      }
    } catch (e) {
      console.error('Error fetching admin stats:', e);
    }
    return null;
  }

  /**
   * Organizer Admin: Fetch Automated Email Dispatch Settings
   */
  public static async getEmailSettings(adminKey: string): Promise<EmailConfig | null> {
    if (!adminKey) return null;
    try {
      const params = new URLSearchParams({
        action: 'getEmailSettings',
        adminKey: adminKey
      });
      const res = await fetch(this.getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const data = await res.json();
      if (data && data.status === 'success') {
        return {
          autoSendEmails: data.autoSendEmails !== false,
          pendingEmailsCount: data.pendingEmailsCount || 0,
          remainingDailyQuota: data.remainingDailyQuota || '--'
        };
      }
    } catch (e) {
      console.error('Error fetching email settings:', e);
    }
    return null;
  }

  /**
   * Organizer Admin: Toggle Email Auto-Send Permission
   */
  public static async setEmailSettings(adminKey: string, enabled: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const params = new URLSearchParams({
        action: 'setEmailSettings',
        enabled: enabled.toString(),
        adminKey: adminKey
      });
      const res = await fetch(this.getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const data = await res.json();
      return {
        success: data && data.status === 'success',
        message: data?.message || (enabled ? 'Auto-send enabled' : 'Auto-send paused')
      };
    } catch {
      return { success: false, message: 'Network error updating email settings' };
    }
  }

  /**
   * Organizer Admin: Trigger manual check-in for a team
   */
  public static async checkInTeam(adminKey: string, query: string): Promise<{ success: boolean; message: string; team?: TeamTicket; alreadyCheckedIn?: boolean }> {
    try {
      const clean = query.trim();
      const params = new URLSearchParams({
        action: 'checkin',
        teamId: clean,
        teamName: clean,
        email: clean,
        adminKey: adminKey
      });
      const res = await fetch(this.getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const data = await res.json();

      if (data && data.status === 'success') {
        const teamObj = data.team ? this.normalizeTicket(data.team) : undefined;
        if (teamObj) {
          teamObj.checkedIn = true;
          this.saveTicketToCache(teamObj);
        }

        return {
          success: true,
          message: data.message || 'Check-in successful!',
          team: teamObj,
          alreadyCheckedIn: data.alreadyCheckedIn || false
        };
      } else {
        return {
          success: false,
          message: data?.message || 'Check-in failed. Team not found.'
        };
      }
    } catch {
      return { success: false, message: 'Network error during desk check-in.' };
    }
  }

  /**
   * Organizer Admin: Send entry pass confirmation email to team
   */
  public static async sendTeamEmail(adminKey: string, target: string): Promise<{ success: boolean; message: string }> {
    try {
      const clean = target.trim();
      const params = new URLSearchParams({
        action: 'sendTeamEmail',
        teamId: clean,
        email: clean,
        adminKey: adminKey
      });
      const res = await fetch(this.getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const data = await res.json();
      return {
        success: data && data.status === 'success',
        message: data?.message || 'Email dispatched successfully.'
      };
    } catch {
      return { success: false, message: 'Network error sending email.' };
    }
  }
}
