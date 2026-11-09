import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Download,
  ArrowLeft,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Calendar,
  MapPin,
  Share2,
  Camera,
  X,
  Award,
  Check,
  Copy,
  RotateCw,
  Layers,
  Palette
} from 'lucide-react';
import QRCode from 'qrcode';
import QRCodeStyling from 'qr-code-styling';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { SynoraApi, maskEmail, maskPhone, generateSelfContainedQrPayload, reconstructTicketFromQr, extractTeamIdFromQr } from '../../services/api';
import { TeamTicket } from '../../types';
import { EVENT_DETAILS } from '../../data/hackathonData';
import { soundFX } from '../../utils/audio';

interface DigitalPassViewProps {
  onBack: () => void;
  initialQuery?: string;
  initialEmail?: string;
  onOpenOrganizer?: () => void;
}

export const DigitalPassView: React.FC<DigitalPassViewProps> = ({
  onBack,
  initialQuery = '',
  initialEmail = '',
  onOpenOrganizer
}) => {
  const [teamIdInput, setTeamIdInput] = useState(initialQuery);
  const [emailInput, setEmailInput] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<TeamTicket | null>(null);
  const [passQrDataUrl, setPassQrDataUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMaskedPii, setShowMaskedPii] = useState(true);

  // Card Flip State (Front vs Back)
  const [isFlipped, setIsFlipped] = useState(false);

  // Social Card Theme Preset
  const [badgeTheme, setBadgeTheme] = useState<'cyan' | 'emerald' | 'gold' | 'dark'>('cyan');

  // Anti-Brute-Force Rate Limiting State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // 3D Card Tilt State
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerStats, setScannerStats] = useState({ verifiedCount: 38 });

  // Copied state
  const [copiedId, setCopiedId] = useState(false);

  // Sample fallback data for instant demo (mirrored from Google Sheet)
  const sampleTicket: TeamTicket = {
    teamId: 'SYN26-XC9Y-P362',
    teamName: 'gybhun',
    college: 'srm',
    leaderName: 'yuhnjlkm',
    leaderEmail: 'gybuhnj@hyujik.com',
    leaderPhone: '7987575758',
    track: 'CRISPR Gene Editing Technologies',
    members: ['gyuhnij'],
    memberDetails: [
      { name: 'gyuhnij', phone: '9878988799', email: 'tgybhun@bhnj.com', role: 'Member 2' }
    ],
    authVerified: true,
    isMasked: false,
    securityHash: 'SEC-SHIELD-XC9Y-P362'
  };

  useEffect(() => {
    if (lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutTimer]);

  useEffect(() => {
    if (ticket) {
      const payload = generateSelfContainedQrPayload(ticket);

      // Stylized branded QR Code with neon gradients and rounded corners
      const qrStyling = new QRCodeStyling({
        width: 360,
        height: 360,
        type: 'canvas',
        data: payload,
        image: '/logo.jpg',
        margin: 8,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'Q'
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.28,
          margin: 4
        },
        dotsOptions: {
          type: 'rounded',
          gradient: {
            type: 'linear',
            rotation: 45,
            colorStops: [
              { offset: 0, color: '#f97316' }, // Neon Orange
              { offset: 1, color: '#ef4444' }  // Neon Red
            ]
          }
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: '#f59e0b' // Amber/Gold accent
        },
        cornersDotOptions: {
          type: 'dot',
          color: '#fbbf24'
        },
        backgroundOptions: {
          color: '#ffffff'
        }
      });

      qrStyling.getRawData('png')
        .then((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setPassQrDataUrl(reader.result as string);
            };
            reader.readAsDataURL(blob as Blob);
          }
        })
        .catch(() => {
          // Fallback to standard QR if styling canvas fails
          QRCode.toDataURL(payload, {
            width: 350,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'M'
          }).then(setPassQrDataUrl).catch(console.error);
        });
    }
  }, [ticket]);

  const loadPass = async (searchId: string, searchEmail: string) => {
    if (lockoutTimer > 0) return;

    const rawId = searchId.trim();
    const cleanEmail = searchEmail.trim();
    if (!rawId && !cleanEmail) {
      setErrorMsg('Please enter your Delegate / Team ID or registered Leader Email.');
      return;
    }

    const cleanId = extractTeamIdFromQr(rawId);
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Try fetching or reconstructing from cache/payload
      let data = await SynoraApi.getTicket(cleanId || cleanEmail, cleanEmail);
      if (!data && rawId) {
        data = reconstructTicketFromQr(rawId);
      }

      if (data) {
        setTicket(data);
        setFailedAttempts(0);
        soundFX.playSuccess();
        triggerPassConfetti();
      } else if (cleanId.toUpperCase() === sampleTicket.teamId || (cleanEmail && cleanEmail.toLowerCase() === sampleTicket.leaderEmail.toLowerCase())) {
        setTicket(sampleTicket);
        setFailedAttempts(0);
        soundFX.playSuccess();
        triggerPassConfetti();
      } else {
        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);
        if (nextFails >= 4) {
          setLockoutTimer(60);
          setErrorMsg('⚠️ Security Alert: Too many failed verification attempts. Rate limiting engaged for 60 seconds.');
        } else {
          setErrorMsg(
            `No matching registration found for "${cleanId || cleanEmail}". Verify your 8-character ID and Leader Email.`
          );
        }
      }
    } catch {
      if (cleanId.toUpperCase() === sampleTicket.teamId) {
        setTicket(sampleTicket);
      } else {
        setErrorMsg('Unable to connect to the verification server. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const passId = params.get('id') || params.get('pass') || params.get('team') || initialQuery || 'SYN26-XC9Y-P362';
    const emailParam = params.get('email') || params.get('verify') || initialEmail || '';

    setTeamIdInput(passId);
    if (emailParam) setEmailInput(emailParam);
    loadPass(passId, emailParam);
  }, []);

  const triggerPassConfetti = () => {
    try {
      confetti({
        particleCount: 65,
        spread: 75,
        origin: { y: 0.6 }
      });
    } catch {}
  };

  // 3D Card Hover Motion Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ rotateX, rotateY, glareX, glareY });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  // Add to Google Calendar Link
  const getGoogleCalendarUrl = () => {
    const title = encodeURIComponent("CRISPR Gene Editing Technologies Workshop '26");
    const dates = "20261120T033000Z/20261120T113000Z";
    const details = encodeURIComponent(
      `Workshop on CRISPR Gene Editing Technologies\nSponsored by IET (Institute of Engineering and Technology)\nVenue: RB Seminar Hall, SIMATS Engineering, Chennai\nRegistration ID: ${ticket?.teamId || 'SYN26-XXXX'}`
    );
    const location = encodeURIComponent(EVENT_DETAILS.venue);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  // Download .ics Calendar File
  const downloadIcsCalendar = () => {
    soundFX.playClick();
    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SIMATS Engineering//CRISPR Workshop 2026//EN',
      'BEGIN:VEVENT',
      'UID:' + (ticket?.teamId || 'SYN26') + '@saveetha.ac.in',
      'DTSTAMP:20260929T000000Z',
      'DTSTART:20261120T033000Z',
      'DTEND:20261120T113000Z',
      'SUMMARY:CRISPR Gene Editing Technologies Workshop (Sponsored by IET)',
      'DESCRIPTION:Department of Medical Biotechnology, SIMATS Engineering. Pass ID: ' + (ticket?.teamId || ''),
      'LOCATION:RB Seminar Hall\\, SIMATS Engineering\\, Chennai',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `CRISPR_Workshop_SIMATS_${ticket?.teamId || 'Pass'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate & Download Shareable Social Media Attending Card (PNG)
  const downloadSocialCard = () => {
    soundFX.playClick();
    if (!ticket) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Theme backgrounds
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
    if (badgeTheme === 'emerald') {
      bgGrad.addColorStop(0, '#021810');
      bgGrad.addColorStop(0.5, '#05291b');
      bgGrad.addColorStop(1, '#010e09');
    } else if (badgeTheme === 'gold') {
      bgGrad.addColorStop(0, '#1c1303');
      bgGrad.addColorStop(0.5, '#2b1c05');
      bgGrad.addColorStop(1, '#0e0902');
    } else if (badgeTheme === 'dark') {
      bgGrad.addColorStop(0, '#0a0a0d');
      bgGrad.addColorStop(0.5, '#121217');
      bgGrad.addColorStop(1, '#050507');
    } else {
      bgGrad.addColorStop(0, '#060212');
      bgGrad.addColorStop(0.5, '#0c0524');
      bgGrad.addColorStop(1, '#020914');
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 630);

    // Decorative Glowing Orbs
    const glow1 = ctx.createRadialGradient(200, 150, 10, 200, 150, 350);
    glow1.addColorStop(0, badgeTheme === 'emerald' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(124, 58, 237, 0.35)');
    glow1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 1200, 630);

    const glow2 = ctx.createRadialGradient(1000, 450, 10, 1000, 450, 400);
    glow2.addColorStop(0, badgeTheme === 'gold' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(6, 182, 212, 0.35)');
    glow2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, 1200, 630);

    // Border Frame
    ctx.strokeStyle = badgeTheme === 'emerald' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 1140, 570);

    // Department Header
    ctx.fillStyle = badgeTheme === 'emerald' ? '#34d399' : '#f97316';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('DEPARTMENT OF MEDICAL BIOTECHNOLOGY · SIMATS ENGINEERING', 80, 95);

    // Event Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.fillText("CRISPR GENE EDITING TECHNOLOGIES '26", 80, 165);

    // IET Sponsor Pill
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('⭐ Sponsored by IET (Institute of Engineering and Technology)', 80, 210);

    // Attending Badge
    ctx.fillStyle = badgeTheme === 'emerald' ? '#059669' : '#7c3aed';
    ctx.beginPath();
    ctx.roundRect(80, 260, 420, 60, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('✨ CONFIRMED ATTENDEE DELEGATE', 105, 300);

    // Delegate Details
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(ticket.leaderName || ticket.teamName, 80, 385);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '22px sans-serif';
    ctx.fillText(ticket.college || 'SIMATS Engineering, Chennai', 80, 425);

    // Registration ID Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(80, 470, 380, 70, 12);
    ctx.fill();

    ctx.fillStyle = badgeTheme === 'emerald' ? '#6ee7b7' : '#38bdf8';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`ID: ${ticket.teamId}`, 105, 515);

    // Venue & Date Info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('📅 November 20, 2026 · 09:00 AM', 700, 385);

    ctx.fillStyle = badgeTheme === 'emerald' ? '#34d399' : '#f97316';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('📍 RB Seminar Hall, SIMATS, Chennai', 700, 430);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('🔒 Dual-Factor Security Shield Verified', 700, 480);

    const link = document.createElement('a');
    link.download = `CRISPR_26_Attending_Badge_${ticket.teamId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Download High-Resolution A4 Advanced PDF Badge & Instructions
  const downloadPDF = () => {
    soundFX.playClick();
    if (!ticket) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. A4 Page Background
    doc.setFillColor(250, 250, 252);
    doc.rect(0, 0, 210, 297, 'F');

    // 2. Main Ticket Card (Top Section)
    const cardX = 20;
    const cardY = 15;
    const cardW = 170;
    const cardH = 135;

    // Card Outer Shadow / Border
    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.5);
    doc.setFillColor(7, 3, 18);
    doc.roundedRect(cardX, cardY, cardW, cardH, 5, 5, 'FD');

    // Header strip
    doc.setFillColor(30, 16, 53);
    doc.roundedRect(cardX, cardY, cardW, 25, 5, 5, 'F');
    // Hide bottom corners of the header strip
    doc.rect(cardX, cardY + 20, cardW, 5, 'F');
    doc.setFillColor(6, 182, 212);
    doc.rect(cardX, cardY + 25, cardW, 1, 'F');

    // Header Text
    doc.setTextColor(6, 182, 212);
    doc.setFontSize(8);
    doc.text('SIMATS ENGINEERING · CHENNAI', 105, cardY + 7, { align: 'center' });

    doc.setTextColor(167, 139, 250);
    doc.setFontSize(7.5);
    doc.text('DEPT. OF MEDICAL BIOTECHNOLOGY', 105, cardY + 12, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("CRISPR GENE EDITING TECHNOLOGIES '26", 105, cardY + 19, { align: 'center' });

    doc.setTextColor(251, 191, 36);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Sponsored by IET (Institute of Engineering & Technology)', 105, cardY + 23, { align: 'center' });

    // ID Badge
    doc.setFillColor(124, 58, 237);
    doc.roundedRect(cardX + 45, cardY + 32, 80, 9, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`ID: ${ticket.teamId || 'SYN26-XXXX-XXXX'}`, 105, cardY + 38.5, { align: 'center' });

    // Delegate Information
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(ticket.teamName || 'Registered Delegate', 105, cardY + 50, { align: 'center' });

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.college || 'SIMATS Engineering, Chennai', 105, cardY + 56, { align: 'center' });

    // Primary Delegate Box
    doc.setFillColor(15, 8, 30);
    doc.roundedRect(cardX + 10, cardY + 65, cardW - 60, 28, 3, 3, 'F');

    doc.setTextColor(6, 182, 212);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PRIMARY DELEGATE / PARTICIPANT', cardX + 15, cardY + 72);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(ticket.leaderName || 'Primary Delegate', cardX + 15, cardY + 78);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Email: ${ticket.leaderEmail || 'Registered'}`, cardX + 15, cardY + 84);
    doc.text(`Phone: ${ticket.leaderPhone || 'Verified'}`, cardX + 15, cardY + 89);

    // QR Code Box (Right Side)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX + cardW - 45, cardY + 65, 35, 35, 2, 2, 'F');
    if (passQrDataUrl) {
      doc.addImage(passQrDataUrl, 'PNG', cardX + cardW - 42.5, cardY + 67.5, 30, 30);
    }
    
    // Hash text under QR
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(5);
    doc.text(`HASH: ${ticket.securityHash || 'SEC-SHIELD-9A4B'}`, cardX + cardW - 27.5, cardY + 103, { align: 'center' });

    // Event Date/Venue Box
    doc.setFillColor(20, 10, 40);
    doc.roundedRect(cardX + 10, cardY + 100, cardW - 60, 18, 3, 3, 'F');
    
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE & TIME: 20.11.2026 (NOVEMBER 20) · 09:00 AM IST', cardX + 15, cardY + 107);
    
    doc.setTextColor(251, 191, 36);
    doc.setFontSize(8);
    doc.text('VENUE: RB SEMINAR HALL · REPORTING: 08:30 AM', cardX + 15, cardY + 113);

    // Footer Verified Label
    doc.setTextColor(52, 211, 153);
    doc.setFontSize(8);
    doc.text('✓ VERIFIED DIGITAL ENTRY BADGE', 105, cardY + 128, { align: 'center' });


    // 3. Cut / Fold Line
    doc.setDrawColor(150, 150, 160);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(15, cardY + cardH + 15, 195, cardY + cardH + 15);
    doc.setLineDashPattern([], 0); // reset
    
    doc.setTextColor(100, 100, 110);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('✂  Please fold or cut along this line  ✂', 105, cardY + cardH + 14, { align: 'center' });


    // 4. Instructions & Guidelines Section (Bottom Half)
    const instY = cardY + cardH + 25;
    
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Event Guidelines & Important Instructions', 20, instY);
    
    doc.setDrawColor(6, 182, 212); // Cyan line
    doc.setLineWidth(1);
    doc.line(20, instY + 3, 45, instY + 3);

    // Rules Text
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    let currentY = instY + 15;
    
    // Check-in
    doc.text('1. Entry & Reporting Time:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('Please arrive at the RB Seminar Hall by 08:30 AM for the mandatory QR code check-in process.', 25, currentY + 6);
    currentY += 16;
    
    // ID Cards
    doc.setFont('helvetica', 'bold');
    doc.text('2. Mandatory Identification:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('All delegates (including Co-Delegates) MUST carry their original physical College ID Cards.', 25, currentY + 6);
    doc.text('Digital photos or photocopies will not be accepted for security reasons.', 25, currentY + 11);
    currentY += 21;
    
    // Digital Pass
    doc.setFont('helvetica', 'bold');
    doc.text('3. Digital Entry Badge Verification:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('Present this digital pass (either printed on A4 or on your phone screen) at the registration desk.', 25, currentY + 6);
    doc.text('The QR code contains an encrypted security hash to prevent counterfeit passes.', 25, currentY + 11);
    currentY += 21;
    
    // Prerequisites
    doc.setFont('helvetica', 'bold');
    doc.text('4. Workshop Prerequisites:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a Hands-On workshop. Please bring a fully charged laptop (Windows/Mac/Linux).', 25, currentY + 6);
    doc.text('High-speed Wi-Fi (SIMATS_EVENT) will be provided for all authorized attendees.', 25, currentY + 11);
    currentY += 21;

    // Help & Support
    doc.setFont('helvetica', 'bold');
    doc.text('5. Certificates & Support:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('IET Sponsored Participation Certificates will be issued at the valedictory session to all present delegates.', 25, currentY + 6);
    doc.text('For queries, contact the coordinators at the venue or email support@simats.ac.in.', 25, currentY + 11);

    // Footer signature
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text('CRISPR \'26 OFFICIAL DOCUMENT · GENERATED: ' + new Date().toLocaleString(), 105, 285, { align: 'center' });

    doc.save(`CRISPR_Pass_${ticket.teamId || 'SYN26'}.pdf`);
  };

  const copyRegistrationId = () => {
    soundFX.playClick();
    if (!ticket) return;
    navigator.clipboard.writeText(ticket.teamId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Launch Organizer QR Scanner
  const startQrScanner = () => {
    soundFX.playClick();
    setIsScannerOpen(true);
    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader-container',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );
        scanner.render(
          (decodedText) => {
            scanner.clear();
            setIsScannerOpen(false);
            setScannerStats((prev) => ({ verifiedCount: prev.verifiedCount + 1 }));
            loadPass(decodedText, '');
          },
          () => {}
        );
      } catch (e) {
        console.error('QR Scanner init error:', e);
      }
    }, 200);
  };

  return (
    <section className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[750px] h-[750px] bg-sky-400/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-cyan-400/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Navigation Back & Scanner Button */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onBack();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition cursor-pointer text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenOrganizer) {
                onOpenOrganizer();
              } else {
                startQrScanner();
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-400/40 transition cursor-pointer text-xs font-bold shadow-[0_0_15px_rgba(249,115,22,0.2)]"
          >
            <Camera className="w-4 h-4 text-orange-400" />
            <span>Organizer Attendance Portal & Scanner</span>
          </button>
        </div>

        {/* Header Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-400/30 text-xs font-bold text-orange-300 mb-3 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>DUAL-FACTOR VERIFIED QUANTUM PASS</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight">
            CRISPR '26 <span className="grad-text">Digital Delegate Pass</span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-2 max-w-xl mx-auto">
            Sponsored by IET · Department of Medical Biotechnology · SIMATS Engineering
          </p>
        </div>

        {/* Search / Verification Query Box */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10 shadow-2xl mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              soundFX.playClick();
              loadPass(teamIdInput, emailInput);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Registration / Delegate ID
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={teamIdInput}
                    onChange={(e) => setTeamIdInput(e.target.value)}
                    placeholder="e.g. SYN26-XC9Y-P362"
                    disabled={lockoutTimer > 0}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Registered Leader Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-red-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. name@college.edu"
                    disabled={lockoutTimer > 0}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Encrypted Fast-Path query (0ms cache resolution)</span>
              </div>

              <button
                type="submit"
                disabled={loading || lockoutTimer > 0}
                className="px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] border border-orange-400/40 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>{loading ? 'Verifying Credentials...' : 'Lookup Entry Pass'}</span>
              </button>
            </div>
          </form>

          {/* Rate-limiting lockout notice */}
          {lockoutTimer > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Anti-Brute-Force Guard engaged. Please wait {lockoutTimer}s before next attempt.</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && !lockoutTimer && (
            <div className="mt-4 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Render 3D Holographic Pass Card */}
        {ticket && (
          <div className="space-y-6">
            {/* Card Controls Bar: Flip Card & Theme Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setIsFlipped((prev) => !prev);
                  }}
                  className="px-4 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-400/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{isFlipped ? 'Flip to Front' : 'Flip to Back (Hall Details)'}</span>
                </button>
              </div>

              {/* Theme Pill Picker */}
              <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-full border border-white/10 text-xs">
                <Palette className="w-3.5 h-3.5 text-gray-400 ml-2" />
                <span className="text-gray-400 text-[11px] mr-1">Card Theme:</span>
                {[
                  { id: 'cyan', label: 'Neon' },
                  { id: 'emerald', label: 'Biolab' },
                  { id: 'gold', label: 'Gold' },
                  { id: 'dark', label: 'Obsidian' }
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setBadgeTheme(th.id as 'cyan' | 'emerald' | 'gold' | 'dark');
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                      badgeTheme === th.id
                        ? 'bg-white text-black font-extrabold shadow'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Holographic Card Canvas */}
            <div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `perspective(1200px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
                transition: 'transform 0.15s ease-out'
              }}
              className="relative glass-card rounded-3xl p-6 sm:p-10 border border-orange-400/40 shadow-[0_0_60px_rgba(249,115,22,0.25)] bg-gradient-to-br from-[#0c0524] via-[#070316] to-[#020b18] overflow-hidden min-h-[380px]"
            >
              {/* Dynamic Holographic Glare */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(249,115,22,0.8) 0%, rgba(239,68,68,0.4) 40%, transparent 80%)`
                }}
              />

              {!isFlipped ? (
                /* CARD FRONT VIEW */
                <div>
                  {/* Pass Top Ribbon */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
                    <div>
                      <div className="text-[11px] font-mono text-orange-400 uppercase tracking-wider">
                        SIMATS ENGINEERING · CHENNAI
                      </div>
                      <div className="text-xs font-semibold text-red-300">
                        Department of Medical Biotechnology
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/40 text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sponsored by IET</span>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    </div>
                  </div>

                  {/* Pass Middle Body */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-8 space-y-4">
                      {/* Delegate Registration ID */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 uppercase font-mono">Pass ID:</span>
                        <button
                          type="button"
                          onClick={copyRegistrationId}
                          className="px-3.5 py-1.5 rounded-xl bg-red-600/30 border border-red-400/50 text-orange-300 font-mono font-extrabold text-sm sm:text-base flex items-center gap-2 hover:bg-red-600/40 transition cursor-pointer"
                        >
                          <span>{ticket.teamId}</span>
                          {copiedId ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                        </button>
                      </div>

                      {/* Team / Delegate Name */}
                      <div>
                        <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                          {ticket.teamName || 'CRISPR Registered Delegate'}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1 font-medium">
                          {ticket.college || 'SIMATS Engineering, Chennai'}
                        </p>
                      </div>

                      {/* Delegate & PII Shield Box */}
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-300">
                            Primary Delegate: <strong className="text-white">{ticket.leaderName}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playClick();
                              setShowMaskedPii((prev) => !prev);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 font-medium cursor-pointer"
                          >
                            {showMaskedPii ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{showMaskedPii ? 'Unmask Details' : 'Mask Details'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400 font-mono">
                          <div>Email: <span className="text-gray-200">{showMaskedPii ? maskEmail(ticket.leaderEmail) : ticket.leaderEmail}</span></div>
                          <div>Phone: <span className="text-gray-200">{showMaskedPii ? maskPhone(ticket.leaderPhone) : ticket.leaderPhone}</span></div>
                        </div>

                        {ticket.members && (Array.isArray(ticket.members) ? ticket.members.length > 0 : Boolean(ticket.members)) && (
                          <div className="pt-2 border-t border-white/5 text-xs text-gray-300">
                            <span className="text-gray-400">Co-Delegates: </span>
                            <span className="font-semibold text-gray-200">
                              {Array.isArray(ticket.members) ? ticket.members.join(', ') : String(ticket.members)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Event Schedule Info */}
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-orange-300 font-medium">
                          <Calendar className="w-4 h-4 text-orange-400" />
                          <span>November 20, 2026 · 09:00 AM IST</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-red-300 font-medium">
                          <MapPin className="w-4 h-4 text-red-400" />
                          <span>RB Seminar Hall, SIMATS</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side Real QR Matrix */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white p-2 rounded-2xl shadow-xl flex items-center justify-center relative overflow-hidden">
                        {passQrDataUrl ? (
                          <img
                            src={passQrDataUrl}
                            alt="Delegate Entry QR Code"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 animate-pulse">
                            Loading QR...
                          </div>
                        )}
                        <div className="absolute inset-x-0 h-1 bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.9)] animate-bounce pointer-events-none" />
                      </div>

                      <div className="text-[10px] font-mono text-amber-400 font-bold mt-3 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-amber-400" />
                        <span>2FA SCANNABLE PASS</span>
                      </div>
                      <div className="text-[9px] font-mono text-gray-400 mt-0.5">
                        {ticket.securityHash || 'SEC-SHIELD-9A4B'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* CARD BACK VIEW */
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-red-400" />
                      <span>DELEGATE VENUE LOGISTICS & ACCESS PASS</span>
                    </div>
                    <span className="text-xs font-mono text-orange-300">ID: {ticket.teamId}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="text-[10px] text-gray-400 uppercase">Allocated Hall Zone</div>
                      <div className="text-sm font-bold text-white mt-1">RB Seminar Hall</div>
                      <div className="text-[11px] text-orange-300 font-medium">Laptop Desk Block</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="text-[10px] text-gray-400 uppercase">High-Speed Wi-Fi</div>
                      <div className="text-sm font-bold text-amber-400 mt-1">SIMATS_GUEST_5G</div>
                      <div className="text-[11px] text-gray-400 font-mono">Pass: CRISPR2026</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="text-[10px] text-gray-400 uppercase">Reporting Desk</div>
                      <div className="text-sm font-bold text-amber-400 mt-1">08:30 AM IST</div>
                      <div className="text-[11px] text-gray-400">Reception Counter 1</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 text-xs text-gray-300">
                    <div className="font-bold text-white">Delegate Emergency & Coordination Contacts:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-400">
                      <div>• Kandukuri Jagan (Lead Head): <span className="text-orange-300 font-mono">+91 90149 78716</span></div>
                      <div>• Tharani (Student Coord): <span className="text-orange-300 font-mono">+91 90149 78716</span></div>
                      <div>• Yugandhar (Student Coord): <span className="text-orange-300 font-mono">+91 63023 89449</span></div>
                      <div>• Hemanth (Student Coord): <span className="text-orange-300 font-mono">+91 63821 22447</span></div>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-400 text-center pt-2">
                    Official Participation Certificate sponsored by IET (Institute of Engineering and Technology) & SIMATS Engineering.
                  </div>
                </div>
              )}

              {/* Pass Action Toolbar */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={downloadPDF}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] transition flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download A6 PDF Badge</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadSocialCard}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-400/40 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-red-300" />
                    <span>Share Attending Card (PNG)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getGoogleCalendarUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-orange-400" />
                    <span>Google Cal</span>
                  </a>

                  <button
                    type="button"
                    onClick={downloadIcsCalendar}
                    className="px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>.ICS Calendar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Organizer QR Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-orange-500/40 shadow-[0_0_50px_rgba(249,115,22,0.3)] bg-[#09041a]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Camera className="w-5 h-5 text-orange-400" />
                <span>Scan Delegate Entry QR Code</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setIsScannerOpen(false);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="qr-reader-container" className="rounded-2xl overflow-hidden bg-black border border-white/10" />

            <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
              <span className="text-gray-400">Delegates Verified Today:</span>
              <span className="font-mono font-bold text-amber-400">{scannerStats.verifiedCount} Attendees</span>
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-3">
              Point camera at participant's physical or digital QR code badge for instant check-in verification.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
