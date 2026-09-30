export interface Track {
  id: string;
  category: 'all' | 'ai' | 'biotech' | 'web' | 'iot' | 'cyber';
  emoji: string;
  title: string;
  description: string;
  badges: string[];
}

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  icon?: string;
  phase?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  hasWhatsApp?: boolean;
}

export interface Coordinator {
  name: string;
  role: string;
  department: string;
  phone?: string;
  avatarEmoji: string;
  highlight?: boolean;
}

export interface FacultyLeader {
  name: string;
  role: string;
  avatarEmoji: string;
}

export interface TeamTicketMember {
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  role?: string;
}

export interface TeamTicket {
  teamId: string;
  teamName: string;
  college: string;
  collegeType?: 'internal' | 'external';
  leaderName: string;
  leaderEmail: string;
  leaderPhone?: string;
  leaderDesignation?: string;
  track?: string;
  members: string[] | string;
  memberDetails?: TeamTicketMember[];
  checkedIn?: boolean;
  checkinTime?: string;
  registeredAt?: string;
  authVerified?: boolean;
  isMasked?: boolean;
  securityHash?: string;
  participantCategory?: 'student' | 'faculty';
  totalFee?: number;
  txnId?: string;
  internalRegNo?: string;
  paymentScreenshotBase64?: string;
  collegeIdCardBase64?: string;
  collegeIdCardName?: string;
  verifiedBy?: string;
  certificateStatus?: 'pending' | 'eligible' | 'issued';
}

export interface RegistrationFormData {
  teamName: string;
  track: string;
  college: string;
  collegeType: 'internal' | 'external';
  participantCategory?: 'student' | 'faculty';
  leaderName: string;
  leaderEmail: string;
  leaderPhone: string;
  leaderYear: string;
  member1Name: string;
  member1Email?: string;
  member1Phone?: string;
  member1Year?: string;
  member2Name?: string;
  member2Email?: string;
  member2Phone?: string;
  member2Year?: string;
  member3Name?: string;
  member3Email?: string;
  member3Phone?: string;
  member3Year?: string;
  internalRegNo?: string;
  txnId?: string;
  totalFee: number;
  paymentScreenshotBase64?: string;
  paymentScreenshotName?: string;
  collegeIdCardBase64?: string;
  collegeIdCardName?: string;
}

export interface RegistrationResponse {
  success: boolean;
  teamId?: string;
  message?: string;
  ticket?: TeamTicket;
}

export interface DeskStats {
  totalRegistered: number;
  totalCheckedIn: number;
  totalPending: number;
}

export interface EmailConfig {
  autoSendEmails: boolean;
  pendingEmailsCount: number;
  remainingDailyQuota: number | string;
}

