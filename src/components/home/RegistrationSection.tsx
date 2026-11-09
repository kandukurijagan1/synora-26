import React, { useState } from 'react';
import {
  Users,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Upload,
  ArrowRight,
  ArrowLeft,
  Ticket,
  FileCheck,
  MessageCircle,
  PlusCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  UserPlus,
  Trash2,
  Phone,
  Mail,
  User,
  Building,
  GraduationCap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EVENT_DETAILS } from '../../data/hackathonData';
import { SynoraApi } from '../../services/api';
import { soundFX } from '../../utils/audio';

interface RegistrationSectionProps {
  onPassGenerated: (teamId: string, leaderEmail?: string) => void;
  onOpenTerms: () => void;
}

export const RegistrationSection: React.FC<RegistrationSectionProps> = ({
  onPassGenerated,
  onOpenTerms
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedTeamId, setCopiedTeamId] = useState(false);

  // Quick Pass Search Input
  const [quickSearchInput, setQuickSearchInput] = useState('');

  // Step 1: Category, Team Name (MUST), & College
  const [participantCategory, setParticipantCategory] = useState<'student' | 'faculty'>('student');
  const [teamName, setTeamName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [collegeType, setCollegeType] = useState<'internal' | 'external'>('external');

  // Step 2: Team Leader (Primary Delegate)
  const [leaderName, setLeaderName] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderDesignation, setLeaderDesignation] = useState('3rd Year B.Tech / B.Sc / B.E.');

  // Step 3: Co-Delegates / Team Members (Minimum 2 Members Required)
  const [hasMember1, setHasMember1] = useState(true); // Member 2 is mandatory
  const [member1Name, setMember1Name] = useState('');
  const [member1Phone, setMember1Phone] = useState('');
  const [member1Email, setMember1Email] = useState('');
  const [member1Year, setMember1Year] = useState('3rd Year B.Tech / B.Sc / B.E.');

  const [hasMember2, setHasMember2] = useState(false);
  const [member2Name, setMember2Name] = useState('');
  const [member2Phone, setMember2Phone] = useState('');
  const [member2Email, setMember2Email] = useState('');
  const [member2Year, setMember2Year] = useState('3rd Year B.Tech / B.Sc / B.E.');

  const [hasMember3, setHasMember3] = useState(false);
  const [member3Name, setMember3Name] = useState('');
  const [member3Phone, setMember3Phone] = useState('');
  const [member3Email, setMember3Email] = useState('');
  const [member3Year, setMember3Year] = useState('3rd Year B.Tech / B.Sc / B.E.');

  // Step 4: Payment & Verification Details
  const [internalRegNo, setInternalRegNo] = useState('');
  const [txnId, setTxnId] = useState('');
  const [paymentScreenshotName, setPaymentScreenshotName] = useState('');
  const [paymentScreenshotBase64, setPaymentScreenshotBase64] = useState('');
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  // SIMATS Student College ID Card State (Mandatory for internal SIMATS students only)
  const [collegeIdCardName, setCollegeIdCardName] = useState('');
  const [collegeIdCardBase64, setCollegeIdCardBase64] = useState('');
  const [isCompressingIdCard, setIsCompressingIdCard] = useState(false);

  // Step 5: Submission & Review
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedTeamId, setSubmittedTeamId] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Delegate Count & Pricing Calculations
  const totalDelegates = 1 + (hasMember1 ? 1 : 0) + (hasMember2 ? 1 : 0) + (hasMember3 ? 1 : 0);
  const perPersonFee = collegeType === 'internal'
    ? 0
    : (participantCategory === 'faculty' ? EVENT_DETAILS.facultyFee : EVENT_DETAILS.studentFee);
  const totalFee = collegeType === 'internal' ? 0 : totalDelegates * perPersonFee;

  const defaultDesignationsStudent = [
    '1st Year B.Tech / B.Sc / B.E.',
    '2nd Year B.Tech / B.Sc / B.E.',
    '3rd Year B.Tech / B.Sc / B.E.',
    'Final Year B.Tech / B.Sc / B.E.',
    'Postgraduate (M.Tech / M.Sc / MS)',
    'Ph.D. Research Scholar'
  ];

  const defaultDesignationsFaculty = [
    'Assistant Professor',
    'Associate Professor',
    'Professor',
    'Head of Department / Dean',
    'Postdoctoral Research Fellow',
    'Industry Delegate / Scientist'
  ];

  const designationsList = participantCategory === 'faculty' ? defaultDesignationsFaculty : defaultDesignationsStudent;

  const copyUpiId = () => {
    soundFX.playClick();
    navigator.clipboard.writeText('9014978716@indus');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Client-Side Canvas Image Compressor for UPI Payment Screenshot (< 20ms)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setStepError('File size exceeds 8MB limit.');
      return;
    }

    setIsCompressingImage(true);
    setPaymentScreenshotName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.55);
          setPaymentScreenshotBase64(compressedDataUrl);
        } else {
          setPaymentScreenshotBase64(event.target?.result as string);
        }
        setIsCompressingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeUploadedFile = () => {
    soundFX.playClick();
    setPaymentScreenshotName('');
    setPaymentScreenshotBase64('');
  };

  // Client-Side Canvas Image Compressor for SIMATS College ID Card (< 20ms)
  const handleIdCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setStepError('ID card file size exceeds 8MB limit.');
      return;
    }

    setIsCompressingIdCard(true);
    setCollegeIdCardName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.55);
          setCollegeIdCardBase64(compressedDataUrl);
        } else {
          setCollegeIdCardBase64(event.target?.result as string);
        }
        setIsCompressingIdCard(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeIdCardFile = () => {
    soundFX.playClick();
    setCollegeIdCardName('');
    setCollegeIdCardBase64('');
  };

  // Step-by-Step Validation
  const validateStep = (step: number): boolean => {
    setStepError(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // STEP 1: Team Name (MUST), Category, Institution
    if (step === 1) {
      if (!teamName.trim() || teamName.trim().length < 2) {
        setStepError('Team / Delegate Name is required (minimum 2 characters).');
        return false;
      }
      const cleanTName = teamName.trim().toLowerCase();
      const existingTeams = SynoraApi.getAllTeams();
      const nameExists = existingTeams.some(
        (t) => t && t.teamName && t.teamName.trim().toLowerCase() === cleanTName
      );
      if (nameExists) {
        setStepError(`Team name "${teamName.trim()}" is already registered. Please choose a unique team name.`);
        return false;
      }

      if (!collegeName.trim() || collegeName.trim().length < 2) {
        setStepError('Please enter your College, Institute, or University name.');
        return false;
      }
      return true;
    }

    // STEP 2: Team Leader Details (Name, 10-digit Phone, Email)
    if (step === 2) {
      if (!leaderName.trim() || leaderName.trim().length < 2) {
        setStepError('Please enter Team Leader Full Name (minimum 2 characters).');
        return false;
      }
      const cleanPhone = leaderPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        setStepError('Please enter a valid 10-digit Mobile / WhatsApp number for the Team Leader.');
        return false;
      }
      if (!leaderEmail.trim() || !emailRegex.test(leaderEmail.trim())) {
        setStepError('Please enter a valid Email Address for the Team Leader.');
        return false;
      }

      const cleanLEmail = leaderEmail.trim().toLowerCase();
      const cleanLPhone = cleanPhone.slice(-10);
      const isLeaderWhitelisted = cleanLEmail === 'kandukurijagan99@gmail.com' || cleanLEmail.includes('kandukurijagan99');

      if (!isLeaderWhitelisted) {
        const existingTeams = SynoraApi.getAllTeams();
        for (const t of existingTeams) {
          if (!t) continue;
          const tEmails = [t.leaderEmail, ...(t.memberDetails?.map((m) => m?.email) || [])].filter(Boolean).map((e) => (e as string).toLowerCase().trim());
          if (tEmails.includes(cleanLEmail)) {
            setStepError(`Email address "${leaderEmail.trim()}" is already registered with another team.`);
            return false;
          }
          const tPhones = [t.leaderPhone, ...(t.memberDetails?.map((m) => m?.phone) || [])].filter(Boolean).map((p) => (p as string).replace(/\D/g, '').slice(-10));
          if (tPhones.includes(cleanLPhone)) {
            setStepError(`Mobile number "${cleanPhone}" is already registered with another team.`);
            return false;
          }
        }
      }

      return true;
    }

    // STEP 3: Co-Delegates / Team Members (Minimum 2 Members Required)
    if (step === 3) {
      // Member 2 is strictly mandatory (Min 2 members per team)
      if (!member1Name.trim() || member1Name.trim().length < 2) {
        setStepError('Please enter Full Name for Member 2 (minimum 2 characters).');
        return false;
      }
      const cleanPhone1 = member1Phone.replace(/\D/g, '');
      if (cleanPhone1.length < 10) {
        setStepError('Please enter a valid 10-digit Mobile number for Member 2.');
        return false;
      }
      if (!member1Email.trim() || !emailRegex.test(member1Email.trim())) {
        setStepError('Please enter a valid Email Address for Member 2.');
        return false;
      }

      // Check intra-team duplicate with Leader
      const cleanLEmail = leaderEmail.trim().toLowerCase();
      const cleanLPhone = leaderPhone.replace(/\D/g, '').slice(-10);
      const cleanM1Email = member1Email.trim().toLowerCase();
      const cleanM1Phone = cleanPhone1.slice(-10);

      if (cleanM1Email === cleanLEmail) {
        setStepError('Member 2 cannot have the same email address as the Team Leader.');
        return false;
      }
      if (cleanM1Phone === cleanLPhone) {
        setStepError('Member 2 cannot have the same mobile number as the Team Leader.');
        return false;
      }

      const isWhitelisted = cleanLEmail === 'kandukurijagan99@gmail.com' || cleanLEmail.includes('kandukurijagan99');

      if (!isWhitelisted) {
        const existingTeams = SynoraApi.getAllTeams();
        for (const t of existingTeams) {
          if (!t) continue;
          const tEmails = [t.leaderEmail, ...(t.memberDetails?.map((m) => m?.email) || [])].filter(Boolean).map((e) => (e as string).toLowerCase().trim());
          if (tEmails.includes(cleanM1Email)) {
            setStepError(`Member 2 email "${member1Email.trim()}" is already registered with another team.`);
            return false;
          }
          const tPhones = [t.leaderPhone, ...(t.memberDetails?.map((m) => m?.phone) || [])].filter(Boolean).map((p) => (p as string).replace(/\D/g, '').slice(-10));
          if (tPhones.includes(cleanM1Phone)) {
            setStepError(`Member 2 mobile "${cleanPhone1}" is already registered with another team.`);
            return false;
          }
        }
      }

      if (hasMember2) {
        if (!member2Name.trim() || member2Name.trim().length < 2) {
          setStepError('Please enter Full Name for Member 3.');
          return false;
        }
        const cleanPhone2 = member2Phone.replace(/\D/g, '');
        if (cleanPhone2.length < 10) {
          setStepError('Please enter a valid 10-digit Mobile number for Member 3.');
          return false;
        }
        if (!member2Email.trim() || !emailRegex.test(member2Email.trim())) {
          setStepError('Please enter a valid Email Address for Member 3.');
          return false;
        }

        const cleanM2Email = member2Email.trim().toLowerCase();
        const cleanM2Phone = cleanPhone2.slice(-10);

        if (cleanM2Email === cleanLEmail || cleanM2Email === cleanM1Email) {
          setStepError('Member 3 cannot share the same email address as Leader or Member 2.');
          return false;
        }
        if (cleanM2Phone === cleanLPhone || cleanM2Phone === cleanM1Phone) {
          setStepError('Member 3 cannot share the same mobile number as Leader or Member 2.');
          return false;
        }

        if (!isWhitelisted) {
          const existingTeams = SynoraApi.getAllTeams();
          for (const t of existingTeams) {
            if (!t) continue;
            const tEmails = [t.leaderEmail, ...(t.memberDetails?.map((m) => m?.email) || [])].filter(Boolean).map((e) => (e as string).toLowerCase().trim());
            if (tEmails.includes(cleanM2Email)) {
              setStepError(`Member 3 email "${member2Email.trim()}" is already registered with another team.`);
              return false;
            }
            const tPhones = [t.leaderPhone, ...(t.memberDetails?.map((m) => m?.phone) || [])].filter(Boolean).map((p) => (p as string).replace(/\D/g, '').slice(-10));
            if (tPhones.includes(cleanM2Phone)) {
              setStepError(`Member 3 mobile "${cleanPhone2}" is already registered with another team.`);
              return false;
            }
          }
        }
      }

      if (hasMember3) {
        if (!member3Name.trim() || member3Name.trim().length < 2) {
          setStepError('Please enter Full Name for Member 4.');
          return false;
        }
        const cleanPhone3 = member3Phone.replace(/\D/g, '');
        if (cleanPhone3.length < 10) {
          setStepError('Please enter a valid 10-digit Mobile number for Member 4.');
          return false;
        }
        if (!member3Email.trim() || !emailRegex.test(member3Email.trim())) {
          setStepError('Please enter a valid Email Address for Member 4.');
          return false;
        }

        const cleanM3Email = member3Email.trim().toLowerCase();
        const cleanM3Phone = cleanPhone3.slice(-10);

        if (cleanM3Email === cleanLEmail || cleanM3Email === cleanM1Email || (hasMember2 && cleanM3Email === member2Email.trim().toLowerCase())) {
          setStepError('Member 4 cannot share the same email address as existing team members.');
          return false;
        }
        if (cleanM3Phone === cleanLPhone || cleanM3Phone === cleanM1Phone || (hasMember2 && cleanM3Phone === member2Phone.replace(/\D/g, '').slice(-10))) {
          setStepError('Member 4 cannot share the same mobile number as existing team members.');
          return false;
        }

        if (!isWhitelisted) {
          const existingTeams = SynoraApi.getAllTeams();
          for (const t of existingTeams) {
            if (!t) continue;
            const tEmails = [t.leaderEmail, ...(t.memberDetails?.map((m) => m?.email) || [])].filter(Boolean).map((e) => (e as string).toLowerCase().trim());
            if (tEmails.includes(cleanM3Email)) {
              setStepError(`Member 4 email "${member3Email.trim()}" is already registered with another team.`);
              return false;
            }
            const tPhones = [t.leaderPhone, ...(t.memberDetails?.map((m) => m?.phone) || [])].filter(Boolean).map((p) => (p as string).replace(/\D/g, '').slice(-10));
            if (tPhones.includes(cleanM3Phone)) {
              setStepError(`Member 4 mobile "${cleanPhone3}" is already registered with another team.`);
              return false;
            }
          }
        }
      }
      return true;
    }

    // STEP 4: UPI Payment OR SIMATS Student Verification
    if (step === 4) {
      // For SIMATS Internal Students ONLY: registration number & college ID card are mandatory (No payment required)
      if (collegeType === 'internal') {
        if (!internalRegNo.trim() || internalRegNo.trim().length < 3) {
          setStepError('Please enter your valid SIMATS Registration / Student ID Number (e.g. 192001001).');
          return false;
        }
        if (!collegeIdCardBase64) {
          setStepError('SIMATS College ID Card attachment is mandatory for SIMATS student verification. Please attach your ID card photo.');
          return false;
        }
        return true;
      }

      // For External Delegates: UPI transaction ID & payment screenshot are mandatory
      if (!txnId.trim()) {
        setStepError('Please enter your UPI Transaction / Reference / UTR Number.');
        return false;
      }
      if (!paymentScreenshotBase64) {
        setStepError('Payment screenshot receipt is mandatory for safety & verification. Please upload your UPI payment screenshot.');
        return false;
      }
      return true;
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      soundFX.playClick();
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      setStepError(null);
    }
  };

  const prevStep = () => {
    soundFX.playClick();
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setStepError(null);
  };

  // Submit Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (collegeType === 'internal') {
      if (!internalRegNo.trim() || internalRegNo.trim().length < 3) {
        setSubmitError('Please enter your SIMATS Registration / Student ID Number.');
        return;
      }
      if (!collegeIdCardBase64) {
        setSubmitError('SIMATS College ID Card attachment is mandatory for SIMATS students. Please attach your ID card.');
        return;
      }
    } else {
      if (!txnId.trim()) {
        setSubmitError('Please enter your UPI Transaction / Reference / UTR Number.');
        return;
      }
      if (!paymentScreenshotBase64) {
        setSubmitError('Payment screenshot receipt is mandatory for safety & verification. Please upload your UPI payment screenshot.');
        return;
      }
    }
    if (!termsAccepted) {
      setSubmitError('Please accept the Workshop Terms & Conditions to proceed.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const finalTxnId = collegeType === 'internal' ? `SIMATS-${internalRegNo.trim() || 'VERIFIED'}` : txnId.trim();
    const finalFee = collegeType === 'internal' ? 0 : totalFee;

    const result = await SynoraApi.registerTeam({
      teamName: teamName.trim(),
      track: EVENT_DETAILS.title,
      college: collegeName.trim(),
      collegeType,
      participantCategory,
      leaderName: leaderName.trim(),
      leaderEmail: leaderEmail.trim(),
      leaderPhone: leaderPhone.trim(),
      leaderYear: leaderDesignation,
      member1Name: member1Name.trim(),
      member1Email: member1Email.trim(),
      member1Phone: member1Phone.trim(),
      member1Year: member1Year,
      member2Name: hasMember2 ? member2Name.trim() : undefined,
      member2Email: hasMember2 ? member2Email.trim() : undefined,
      member2Phone: hasMember2 ? member2Phone.trim() : undefined,
      member2Year: hasMember2 ? member2Year : undefined,
      member3Name: hasMember3 ? member3Name.trim() : undefined,
      member3Email: hasMember3 ? member3Email.trim() : undefined,
      member3Phone: hasMember3 ? member3Phone.trim() : undefined,
      member3Year: hasMember3 ? member3Year : undefined,
      internalRegNo: internalRegNo.trim() || undefined,
      txnId: finalTxnId,
      totalFee: finalFee,
      paymentScreenshotBase64: paymentScreenshotBase64 || undefined,
      paymentScreenshotName: paymentScreenshotName || undefined,
      collegeIdCardBase64: collegeIdCardBase64 || undefined,
      collegeIdCardName: collegeIdCardName || undefined
    });

    setIsSubmitting(false);

    if (result.success && result.teamId) {
      setSubmittedTeamId(result.teamId);
      soundFX.playSuccess();
      try {
        confetti({
          particleCount: 120,
          spread: 85,
          origin: { y: 0.6 }
        });
      } catch {}
      
      // Automatically trigger download/view pass after 2.5s to let animation finish
      setTimeout(() => {
        onPassGenerated(result.teamId || '', leaderEmail.trim());
      }, 2500);
    } else {
      setSubmitError(result.message || 'Registration failed. Please check your details and try again.');
    }
  };

  const resetForm = () => {
    soundFX.playClick();
    setCurrentStep(1);
    setTeamName('');
    setCollegeType('external');
    setCollegeName('');
    setLeaderName('');
    setLeaderEmail('');
    setLeaderPhone('');
    setLeaderDesignation(participantCategory === 'faculty' ? 'Assistant Professor' : '3rd Year B.Tech / B.Sc / B.E.');
    setHasMember1(true);
    setMember1Name('');
    setMember1Email('');
    setMember1Phone('');
    setMember1Year(participantCategory === 'faculty' ? 'Assistant Professor' : '3rd Year B.Tech / B.Sc / B.E.');
    setHasMember2(false);
    setMember2Name('');
    setMember2Email('');
    setMember2Phone('');
    setMember2Year(participantCategory === 'faculty' ? 'Assistant Professor' : '3rd Year B.Tech / B.Sc / B.E.');
    setHasMember3(false);
    setMember3Name('');
    setMember3Email('');
    setMember3Phone('');
    setMember3Year(participantCategory === 'faculty' ? 'Assistant Professor' : '3rd Year B.Tech / B.Sc / B.E.');
    setInternalRegNo('');
    setTxnId('');
    setPaymentScreenshotName('');
    setPaymentScreenshotBase64('');
    setCollegeIdCardName('');
    setCollegeIdCardBase64('');
    setTermsAccepted(false);
    setSubmitError(null);
    setStepError(null);
    setSubmittedTeamId(null);
  };

  const stepLabels = [
    { num: 1, title: 'Team Profile', subtitle: 'Category & Name' },
    { num: 2, title: 'Team Leader', subtitle: 'Contact Info' },
    { num: 3, title: 'Members', subtitle: 'Co-Delegates' },
    { num: 4, title: collegeType === 'internal' ? 'Verification' : 'Payment', subtitle: collegeType === 'internal' ? 'ID & Reg No' : 'UPI & UTR' },
    { num: 5, title: 'Review & Pass', subtitle: 'Instant Badge' }
  ];

  const upiPayUrl = `upi://pay?pa=9014978716@indus&pn=CRISPR%20Workshop%20SIMATS&am=${totalFee}&cu=INR&tn=CRISPR26%20Registration`;

  return (
    <section id="register" className="py-24 relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{EVENT_DETAILS.sponsorFull}</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white mb-2">
            Workshop <span className="grad-text">Registration</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            National Level Hands-on Workshop on <strong>"CRISPR Gene Editing Technologies"</strong> · November 20, 2026 at RB Seminar Hall.
          </p>

          {/* Quick Already Registered Pass Finder */}
          <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <Ticket className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Already registered? Look up your official pass:</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={quickSearchInput}
                onChange={(e) => setQuickSearchInput(e.target.value)}
                placeholder="Enter Mobile / Email / Pass ID"
                className="w-full sm:w-52 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-orange-400"
              />
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onPassGenerated(quickSearchInput, quickSearchInput);
                }}
                className="px-3.5 py-1.5 rounded-lg font-bold text-xs bg-orange-500 hover:bg-orange-400 text-black shrink-0 transition cursor-pointer"
              >
                Find Pass
              </button>
            </div>
          </div>
        </div>

        {/* ==================== ANIMATED CONFIRMATION & STEP-BY-STEP WORKFLOW GUIDE ==================== */}
        {submittedTeamId ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            
            {/* 1. Main Celebration & Hero Pass Card */}
            <div className="p-8 sm:p-10 rounded-3xl glass-card border border-amber-500/40 text-center shadow-[0_20px_60px_rgba(245,158,11,0.25)] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 animate-pulse" />
              
              {/* Success Badge with Glowing Ripple Animation */}
              <div className="relative inline-block mb-4">
                <svg className="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle className="success-checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                  <path className="success-checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
                <span className="absolute inset-0 rounded-full border border-amber-400/20 animate-ping" style={{ animationDelay: '1.2s', animationDuration: '2s' }} />
              </div>

              <div className="success-text-animate">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Registration Confirmed · CRISPR '26 Workshop</span>
                </div>

                <h3 className="font-display font-extrabold text-2xl sm:text-4xl text-amber-400 mb-2 tracking-tight uppercase" style={{ textShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
                  Registered Successfully! 🎉
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto mb-6 leading-relaxed">
                Welcome to the <strong className="text-orange-300">CRISPR '26 National Level Hands-on Workshop</strong> on Gene Editing Technologies! Your registration for Team <strong className="text-white">"{teamName}"</strong> led by <strong className="text-white">{leaderName}</strong> is active and recorded in our live database.
              </p>

              {/* Holographic Pass ID Card */}
              <div className="inline-block p-6 rounded-2xl bg-gradient-to-br from-[#0c061a] to-[#12082b] border border-orange-500/40 mb-6 max-w-lg w-full text-left relative overflow-hidden shadow-[0_10px_40px_rgba(249,115,22,0.15)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-300">CRISPR '26 Workshop Pass</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Verified
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block">Encrypted Delegate Pass ID:</span>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="font-mono font-extrabold text-2xl sm:text-3xl text-orange-400 tracking-wider">
                        {submittedTeamId}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playClick();
                          navigator.clipboard.writeText(submittedTeamId);
                          setCopiedTeamId(true);
                          setTimeout(() => setCopiedTeamId(false), 2000);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition cursor-pointer border border-white/10"
                      >
                        {copiedTeamId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-amber-400 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-orange-300" />
                            <span>Copy ID</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs text-gray-300">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold block">Team Name</span>
                      <span className="font-bold text-white truncate block">{teamName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold block">Leader Contact</span>
                      <span className="font-mono text-orange-300 truncate block">{leaderPhone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold block">Institution</span>
                      <span className="text-gray-300 truncate block">{collegeName || 'SIMATS Engineering'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold block">Headcount</span>
                      <span className="font-semibold text-red-300">{totalDelegates} Delegate(s)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Primary Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    onPassGenerated(submittedTeamId, leaderEmail);
                  }}
                  className="px-7 py-3.5 rounded-full font-bold text-sm bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_0_25px_rgba(249,115,22,0.4)] transition flex items-center gap-2 cursor-pointer"
                >
                  <Ticket className="w-4 h-4 text-orange-300" />
                  <span>View &amp; Download Digital Entry Pass (PDF / QR)</span>
                </button>

                <a
                  href={EVENT_DETAILS.whatsappGroupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3.5 rounded-full font-bold text-sm bg-[#25d366] hover:bg-[#20ba59] text-white shadow-[0_0_20px_rgba(37,211,102,0.35)] transition flex items-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Join Delegate WhatsApp Group</span>
                </a>
              </div>
            </div>

            {/* 2. Visual "How It Actually Works" Step-by-Step Instructions Guide */}
            <div className="p-6 sm:p-8 rounded-3xl glass-card border border-red-500/30 shadow-2xl">
              <div className="text-center max-w-xl mx-auto mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span>Workshop Delegate Roadmap</span>
                </div>
                <h4 className="font-display font-extrabold text-xl sm:text-2xl text-white">
                  How the Workshop Process <span className="grad-text">Actually Works</span>
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Follow these 4 simple steps from registration to hands-on sessions &amp; certification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Step 1 */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-orange-500/40 transition space-y-2 relative overflow-hidden group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-xs font-mono font-bold text-orange-300 shrink-0">
                      01
                    </div>
                    <h5 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-orange-400" />
                      <span>Save Your Pass ID &amp; QR Code</span>
                    </h5>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pl-11">
                    Your official Pass ID <strong className="text-orange-300 font-mono">[{submittedTeamId}]</strong> is your verified entry key. Click <em>"View &amp; Download Digital Entry Pass"</em> above to save your pass or download the high-resolution PDF pass with QR code.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-red-500/40 transition space-y-2 relative overflow-hidden group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-xs font-mono font-bold text-red-300 shrink-0">
                      02
                    </div>
                    <h5 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-red-400" />
                      <span>Automated 5-Minute Email Dispatch</span>
                    </h5>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pl-11">
                    Our automated background engine queues your confirmation email and QR ticket, delivering it to <strong className="text-red-300 font-mono">{leaderEmail}</strong> within 5 minutes. (Please check your Inbox and Spam folders).
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-amber-500/40 transition space-y-2 relative overflow-hidden group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-mono font-bold text-amber-300 shrink-0">
                      03
                    </div>
                    <h5 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-amber-400" />
                      <span>Join WhatsApp Broadcast Group</span>
                    </h5>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pl-11">
                    Join the official WhatsApp group to receive in silico CRISPR software installation guides (Benchling, BioPython, sgRNA tools), technical session schedules, and lab instructions.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-amber-500/40 transition space-y-2 relative overflow-hidden group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-mono font-bold text-amber-300 shrink-0">
                      04
                    </div>
                    <h5 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-amber-400" />
                      <span>On-Spot QR Check-In &amp; IET Certificate</span>
                    </h5>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pl-11">
                    On <strong>Friday, November 20, 2026 at 08:30 AM</strong>, present your Digital Pass at the <strong>RB Seminar Hall Reception Desk</strong> for badge &amp; kit issuance. Complete the hands-on workshop to receive your IET-sponsored Certificate!
                  </p>
                </div>

              </div>

              {/* Bottom Support & Register Another Delegate Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-5 border-t border-white/10 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Venue: RB Seminar Hall, SIMATS Engineering, Chennai</span>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-orange-400" />
                  <span>Register Another Delegate / Team</span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* ==================== 5-STEP ADVANCED WIZARD ==================== */
          <div className="rounded-3xl glass-card border border-red-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden">
            
            {/* Step Progress Indicators Header */}
            <div className="p-5 bg-[#0a0518] border-b border-white/10">
              <div className="flex items-center justify-between max-w-3xl mx-auto relative">
                {stepLabels.map((step) => {
                  const isActive = currentStep === step.num;
                  const isDone = currentStep > step.num;

                  return (
                    <div key={step.num} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          isActive
                            ? 'bg-red-600 text-white ring-4 ring-red-600/30 shadow-[0_0_15px_#7c3aed]'
                            : isDone
                            ? 'bg-orange-500 text-black font-extrabold'
                            : 'bg-white/5 border border-white/10 text-gray-400'
                        }`}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : step.num}
                      </div>
                      <div className="text-center mt-1.5 hidden sm:block">
                        <div className={`text-[11px] font-bold ${
                          isActive ? 'text-white' : isDone ? 'text-orange-400' : 'text-gray-500'
                        }`}>
                          {step.title}
                        </div>
                        <div className="text-[9px] text-gray-500 leading-none">
                          {step.subtitle}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Steps Body */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-6">
              
              {/* ==================== STEP 1: CATEGORY & TEAM PROFILE (TEAM NAME IS MUST) ==================== */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-white/5 pb-3">
                    <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-orange-400" />
                      <span>Step 1: Delegate Category & Team Profile</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Select your participant tier and provide your mandatory Team / Delegate Name and Institution.
                    </p>
                  </div>

                  {/* 1. Delegate Tier Cards */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-2">
                      Select Delegate Category *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playClick();
                          setParticipantCategory('student');
                          setLeaderDesignation('3rd Year B.Tech / B.Sc / B.E.');
                          setMember1Year('3rd Year B.Tech / B.Sc / B.E.');
                          setMember2Year('3rd Year B.Tech / B.Sc / B.E.');
                          setMember3Year('3rd Year B.Tech / B.Sc / B.E.');
                        }}
                        className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                          participantCategory === 'student'
                            ? 'bg-amber-950/40 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                            : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-amber-300">🎓 Student Delegate</span>
                          <span className="font-display font-extrabold text-lg text-amber-400">
                            {collegeType === 'internal' ? '₹0 (Free)' : '₹200'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {collegeType === 'internal' ? 'SIMATS Student ID verification · Free Entry' : 'UG / PG Students & Ph.D. Research Scholars'}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playClick();
                          setParticipantCategory('faculty');
                          setLeaderDesignation('Assistant Professor');
                          setMember1Year('Assistant Professor');
                          setMember2Year('Assistant Professor');
                          setMember3Year('Assistant Professor');
                        }}
                        className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                          participantCategory === 'faculty'
                            ? 'bg-red-950/40 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.25)]'
                            : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-red-300">🔬 Faculty / Researcher</span>
                          <span className="font-display font-extrabold text-lg text-red-400">
                            {collegeType === 'internal' ? '₹0 (Free)' : '₹500'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400">Professors, Postdocs & Industry Delegates</div>
                      </button>
                    </div>
                  </div>

                  {/* 2. Team / Delegate Name (MANDATORY MUST) */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      Team / Delegate Name <span className="text-red-400 font-bold">* (Mandatory)</span>
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="e.g. CRISPR Innovators / BioGen Team / Individual Name"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400 transition"
                        required
                      />
                    </div>
                  </div>

                  {/* 3. Event Info Banner */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      Workshop Title
                    </label>
                    <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-orange-500/30 text-orange-300 text-xs font-semibold flex items-center justify-between">
                      <span>🧬 CRISPR Gene Editing Technologies</span>
                      <span className="text-[10px] text-gray-400 font-mono">November 20, 2026 · RB Seminar Hall</span>
                    </div>
                  </div>

                  {/* 4. College / University Name */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      College / University / Institute Name *
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-red-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        placeholder="e.g. SIMATS Engineering / Anna University / SRM / IIT Madras"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-red-400 transition"
                        required
                      />
                    </div>
                  </div>

                  {/* 5. College Type */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      Institution Type *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCollegeType('external')}
                        className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          collegeType === 'external'
                            ? 'bg-red-600/30 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                            : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span>External College / University</span>
                        <span className="text-[10px] text-gray-400">UPI Payment Required</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCollegeType('internal');
                          if (!collegeName) setCollegeName('SIMATS Engineering, Chennai');
                        }}
                        className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          collegeType === 'internal'
                            ? 'bg-orange-500/30 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.25)]'
                            : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span>SIMATS Student / Internal</span>
                        <span className="text-[10px] text-amber-400 font-bold">100% Free · ID Card Verification</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== STEP 2: TEAM LEADER (PRIMARY DELEGATE) ==================== */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-white/5 pb-3">
                    <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-red-400" />
                      <span>Step 2: Team Leader (Primary Delegate) Details</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Official credentials for certificate issuance and physical entry pass verification.
                    </p>
                  </div>

                  {/* Leader Full Name */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      Team Leader Full Name (As required on IET Certificate) *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={leaderName}
                        onChange={(e) => setLeaderName(e.target.value)}
                        placeholder="e.g. Kandukuri Jagan"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400 transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Leader Phone & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                        Team Leader WhatsApp / Mobile Number *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={leaderPhone}
                          onChange={(e) => setLeaderPhone(e.target.value)}
                          placeholder="e.g. 9014978716"
                          maxLength={10}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400 font-mono transition"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                        Team Leader Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-red-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={leaderEmail}
                          onChange={(e) => setLeaderEmail(e.target.value)}
                          placeholder="e.g. jagan@gmail.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400 transition"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Leader Designation */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      {participantCategory === 'faculty' ? 'Designation / Academic Role *' : 'Year of Study / Academic Level *'}
                    </label>
                    <select
                      value={leaderDesignation}
                      onChange={(e) => setLeaderDesignation(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0e0720] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400 transition"
                    >
                      {designationsList.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ==================== STEP 3: CO-DELEGATES (TEAM MEMBERS - MINIMUM 2) ==================== */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-white/5 pb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-pink-400" />
                        <span>Step 3: Team Members (Minimum 2 Members Required)</span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Each team requires a minimum of 2 members (Leader + Member 2). You can add up to 4 members in total.
                      </p>
                    </div>

                    {/* Member Quick-Add Button */}
                    {(!hasMember2 || !hasMember3) && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playClick();
                          if (!hasMember2) setHasMember2(true);
                          else if (!hasMember3) setHasMember3(true);
                        }}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-400/40 flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{!hasMember2 ? '+ Add Member 3' : '+ Add Member 4'}</span>
                      </button>
                    )}
                  </div>

                  {/* Leader Summary Pill */}
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-gray-300">
                        Primary Leader (Member 1): <strong className="text-white">{leaderName || 'Leader'}</strong> ({leaderPhone || 'Phone'})
                      </span>
                    </div>
                    <span className="text-amber-400 font-bold font-mono">₹{perPersonFee}</span>
                  </div>

                  {/* ----------------- MEMBER 2 DETAILS (MANDATORY) ----------------- */}
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-red-500/30 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-red-600/40 border border-red-400/60 text-red-300 flex items-center justify-center text-xs font-bold">
                          2
                        </span>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Member 2 Details (Mandatory)
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-red-300 bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 rounded-full">
                        Required (Min 2 Members)
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                        Member 2 Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-red-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={member1Name}
                          onChange={(e) => setMember1Name(e.target.value)}
                          placeholder="e.g. Tharani R"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-red-400 transition"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                          Member 2 WhatsApp / Mobile Number *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            value={member1Phone}
                            onChange={(e) => setMember1Phone(e.target.value)}
                            placeholder="e.g. 9014978716"
                            maxLength={10}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-red-400 font-mono transition"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                          Member 2 Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={member1Email}
                            onChange={(e) => setMember1Email(e.target.value)}
                            placeholder="e.g. member2@gmail.com"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-red-400 transition"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                        {participantCategory === 'faculty' ? 'Member 2 Designation *' : 'Member 2 Year of Study *'}
                      </label>
                      <select
                        value={member1Year}
                        onChange={(e) => setMember1Year(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0e0720] border border-white/10 text-white text-sm focus:outline-none focus:border-red-400 transition"
                      >
                        {designationsList.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ----------------- MEMBER 3 DETAILS ----------------- */}
                  {hasMember2 && (
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-orange-500/30 space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-orange-600/40 border border-orange-400/60 text-orange-300 flex items-center justify-center text-xs font-bold">
                            3
                          </span>
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Member 3 Details
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playClick();
                            setHasMember2(false);
                            setMember2Name('');
                            setMember2Phone('');
                            setMember2Email('');
                          }}
                          className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                          Member 3 Full Name *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={member2Name}
                            onChange={(e) => setMember2Name(e.target.value)}
                            placeholder="e.g. Yugandhar P"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400 transition"
                            required={hasMember2}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                            Member 3 WhatsApp / Mobile Number *
                          </label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="tel"
                              value={member2Phone}
                              onChange={(e) => setMember2Phone(e.target.value)}
                              placeholder="e.g. 6302389449"
                              maxLength={10}
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400 font-mono transition"
                              required={hasMember2}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                            Member 3 Email Address *
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-red-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              value={member2Email}
                              onChange={(e) => setMember2Email(e.target.value)}
                              placeholder="e.g. member3@gmail.com"
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400 transition"
                              required={hasMember2}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                          {participantCategory === 'faculty' ? 'Member 3 Designation *' : 'Member 3 Year of Study *'}
                        </label>
                        <select
                          value={member2Year}
                          onChange={(e) => setMember2Year(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#0e0720] border border-white/10 text-white text-sm focus:outline-none focus:border-orange-400 transition"
                        >
                          {designationsList.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* ----------------- MEMBER 4 DETAILS ----------------- */}
                  {hasMember3 && (
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-pink-500/30 space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-pink-600/40 border border-pink-400/60 text-pink-300 flex items-center justify-center text-xs font-bold">
                            4
                          </span>
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Member 4 Details
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playClick();
                            setHasMember3(false);
                            setMember3Name('');
                            setMember3Phone('');
                            setMember3Email('');
                          }}
                          className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                          Member 4 Full Name *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-pink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={member3Name}
                            onChange={(e) => setMember3Name(e.target.value)}
                            placeholder="e.g. Hemanth K"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-pink-400 transition"
                            required={hasMember3}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                            Member 4 WhatsApp / Mobile Number *
                          </label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="tel"
                              value={member3Phone}
                              onChange={(e) => setMember3Phone(e.target.value)}
                              placeholder="e.g. 6382122447"
                              maxLength={10}
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-pink-400 font-mono transition"
                              required={hasMember3}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                            Member 4 Email Address *
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              value={member3Email}
                              onChange={(e) => setMember3Email(e.target.value)}
                              placeholder="e.g. member4@gmail.com"
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-pink-400 transition"
                              required={hasMember3}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                          {participantCategory === 'faculty' ? 'Member 4 Designation *' : 'Member 4 Year of Study *'}
                        </label>
                        <select
                          value={member3Year}
                          onChange={(e) => setMember3Year(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#0e0720] border border-white/10 text-white text-sm focus:outline-none focus:border-pink-400 transition"
                        >
                          {designationsList.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Optional Co-Delegates Addition CTA (Up to 4 delegates) */}
                  {(!hasMember2 || !hasMember3) && (
                    <div className="flex justify-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playClick();
                          if (!hasMember2) setHasMember2(true);
                          else if (!hasMember3) setHasMember3(true);
                        }}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] text-orange-300 border border-orange-400/30 flex items-center gap-2 transition cursor-pointer hover:border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                      >
                        <UserPlus className="w-4 h-4 text-orange-400" />
                        <span>{!hasMember2 ? '+ Add Member 3 (Optional)' : '+ Add Member 4 (Optional)'}</span>
                      </button>
                    </div>
                  )}

                  {/* Real-time Dynamic Fee Summary Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#0e0720] to-orange-950/40 border border-red-500/30 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-gray-300">
                      Total Booking Size: <strong className="text-white">{totalDelegates} Delegate(s)</strong>
                      <span className="text-gray-400 text-[11px] block mt-0.5">
                        {collegeType === 'internal'
                          ? 'SIMATS Student Exemption (100% Free Entry Waiver)'
                          : `${totalDelegates} × ₹${perPersonFee} (${participantCategory === 'faculty' ? 'Faculty Tier' : 'Student Tier'})`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider block">Total Payable</span>
                      <span className="font-display font-extrabold text-2xl text-amber-400">
                        {collegeType === 'internal' ? '₹0 (Free Entry)' : `₹${totalFee}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== STEP 4 (INTERNAL): SIMATS STUDENT VERIFICATION ONLY ==================== */}
              {currentStep === 4 && collegeType === 'internal' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-white/5 pb-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-semibold mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                      <span>SIMATS Student 100% Fee Exemption</span>
                    </div>
                    <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                      <Building className="w-5 h-5 text-orange-400" />
                      <span>Step 4: SIMATS Student Verification</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      SIMATS students are exempted from workshop registration fees. Please enter your SIMATS Student Registration Number and attach your College ID Card for internal verification.
                    </p>
                  </div>

                  {/* Fee Waiver Highlight Card */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-orange-950/40 via-[#0a1826] to-black border border-orange-500/40 text-center relative overflow-hidden shadow-[0_0_30px_rgba(249,115,22,0.15)]">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>100% Registration Fee Waived</span>
                    </div>
                    <div className="font-display font-black text-4xl sm:text-5xl text-amber-400 mb-2 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                      ₹0 <span className="text-lg font-normal text-gray-400">(Free Entry)</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      Internal SIMATS Student Delegate · Team <strong className="text-white">"{teamName}"</strong> ({totalDelegates} Delegate{totalDelegates > 1 ? 's' : ''})
                    </div>
                    <p className="text-[11px] text-orange-300/80 mt-2 max-w-md mx-auto">
                      No UPI payment is required. Your registration is validated with your official SIMATS Student Registration Number &amp; College ID Card photo.
                    </p>
                  </div>

                  {/* Verification Input Box */}
                  <div className="p-6 rounded-2xl bg-orange-950/20 border border-orange-500/40 space-y-5 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-orange-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Required Credentials for Verification
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-400/30">
                        2 Requirements Only
                      </span>
                    </div>

                    {/* 1. SIMATS Registration Number Input */}
                    <div>
                      <label className="text-xs font-semibold text-gray-200 block mb-1.5">
                        SIMATS Student Registration / ID Number <span className="text-red-400 font-bold">* (Mandatory)</span>
                      </label>
                      <div className="relative">
                        <GraduationCap className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={internalRegNo}
                          onChange={(e) => setInternalRegNo(e.target.value)}
                          placeholder="e.g. 192001001 or 152301045"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-orange-500/40 text-white text-sm focus:outline-none focus:border-orange-400 font-mono transition"
                          required
                        />
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        Enter your official SIMATS University Student Registration Number.
                      </span>
                    </div>

                    {/* 2. SIMATS College ID Card Upload */}
                    <div>
                      <label className="text-xs font-semibold text-gray-200 block mb-1.5">
                        Attach SIMATS College ID Card Photo <span className="text-red-400 font-bold">* (Mandatory)</span>
                      </label>
                      <div className={`p-5 rounded-2xl border border-dashed text-center transition ${
                        collegeIdCardName
                          ? 'border-amber-500/60 bg-amber-950/20'
                          : 'border-orange-400/30 bg-white/[0.02] hover:border-orange-400/60'
                      }`}>
                        {collegeIdCardName ? (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                              <span className="font-bold text-amber-400">ID Card Attached:</span>
                              <span className="font-medium text-white break-all">{collegeIdCardName}</span>
                              {isCompressingIdCard && (
                                <span className="text-orange-400 font-mono text-[10px] animate-pulse">(Optimizing...)</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={removeIdCardFile}
                              className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition cursor-pointer"
                            >
                              Remove / Replace
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center gap-2 py-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-400/30 flex items-center justify-center text-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
                              <Upload className="w-5 h-5" />
                            </div>
                            <div className="text-xs font-bold text-white">
                              Click to upload your SIMATS College ID Card photo / scan
                            </div>
                            <span className="text-[11px] text-gray-400">
                              PNG, JPG, JPEG up to 8MB (Instant auto-compression)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleIdCardUpload}
                              className="hidden"
                              required
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== STEP 4 (EXTERNAL): UPI FEE PAYMENT ==================== */}
              {currentStep === 4 && collegeType === 'external' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-white/5 pb-3">
                    <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-400" />
                      <span>Step 4: Registration Fee Payment (UPI)</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Pay using any UPI App (Google Pay, PhonePe, Paytm, BHIM) and enter the 12-digit UTR / Ref Number.
                    </p>
                  </div>

                  {/* Total Fee Highlight Card */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-red-950/40 via-orange-950/20 to-black border border-orange-500/30 text-center">
                    <div className="text-xs uppercase tracking-wider text-orange-400 font-bold mb-1">
                      Total Payable Registration Fee
                    </div>
                    <div className="font-display font-black text-4xl sm:text-5xl text-white mb-2 drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                      ₹{totalFee}
                    </div>
                    <div className="text-xs text-gray-300">
                      {totalDelegates} Delegate(s) for Team <strong className="text-white">{teamName}</strong>
                    </div>

                    {/* 1-Tap UPI Launch Button */}
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-white/10">
                      <a
                        href={upiPayUrl}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition cursor-pointer"
                      >
                        <span>⚡ 1-Tap Pay ₹{totalFee} via UPI App</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* UPI ID & Copy Box */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="text-xs text-gray-400">Official Event UPI ID:</div>
                      <div className="font-mono font-bold text-base text-orange-400 select-all">
                        9014978716@indus
                      </div>
                      <div className="text-[11px] text-gray-500">Department of Medical Biotechnology / Synora</div>
                    </div>

                    <button
                      type="button"
                      onClick={copyUpiId}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400 font-bold">Copied UPI!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy UPI ID</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Transaction ID Input */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      UPI Transaction / Ref / UTR Number <span className="text-red-400 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={txnId}
                      onChange={(e) => setTxnId(e.target.value)}
                      placeholder="Enter UPI Transaction / UTR / Reference ID"
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400 font-mono transition"
                      required
                    />
                  </div>

                  {/* Screenshot Upload with Local Canvas Compression */}
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      Upload Payment Receipt Screenshot <span className="text-red-400 font-bold">* (Mandatory for Safety & Verification)</span>
                    </label>
                    <div className={`p-5 rounded-2xl border border-dashed text-center transition ${
                      paymentScreenshotName
                        ? 'border-amber-500/60 bg-amber-950/20'
                        : 'border-white/20 bg-white/[0.02] hover:border-orange-400/60'
                    }`}>
                      {paymentScreenshotName ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                            <span className="font-bold text-amber-400">Receipt Attached:</span>
                            <span className="font-medium text-white break-all">{paymentScreenshotName}</span>
                            {isCompressingImage && (
                              <span className="text-orange-400 font-mono text-[10px] animate-pulse">(Optimizing...)</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={removeUploadedFile}
                            className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition cursor-pointer"
                          >
                            Remove / Replace
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-2 py-2">
                          <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-400/30 flex items-center justify-center text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-bold text-white">
                            Click to upload your UPI payment receipt screenshot
                          </div>
                          <span className="text-[11px] text-gray-400">
                            PNG, JPG, JPEG up to 8MB (Auto-compressed for instant upload)
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            required={collegeType === 'external'}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== STEP 5: REVIEW SUMMARY & CONFIRM ==================== */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-white/5 pb-3">
                    <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-amber-400" />
                      <span>Step 5: Review Registration & Confirm</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Verify all delegate names, mobile numbers, and emails before generating your official encrypted workshop pass.
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Workshop Title:</span>
                      <span className="font-bold text-white text-right">CRISPR Gene Editing Technologies</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Team / Delegate Name:</span>
                      <span className="font-bold text-orange-300">{teamName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Sponsor:</span>
                      <span className="font-bold text-amber-300">IET (Institute of Engineering and Technology)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Delegate Category:</span>
                      <span className="font-bold text-orange-300">
                        {collegeType === 'internal'
                          ? 'SIMATS Student Delegate (100% Fee Exemption · ₹0)'
                          : participantCategory === 'faculty'
                          ? 'Faculty / Researcher Delegate (₹500/person)'
                          : 'Student Delegate (₹200/person)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Institution:</span>
                      <span className="font-bold text-white">{collegeName} ({collegeType === 'internal' ? 'SIMATS Internal' : 'External'})</span>
                    </div>

                    {collegeType === 'internal' && (
                      <div className="py-2 border-b border-white/5 bg-orange-950/30 px-3 rounded-lg flex flex-col sm:flex-row justify-between gap-1">
                        <span className="text-orange-300 font-bold">🏛️ SIMATS Student Reg No:</span>
                        <span className="font-mono font-bold text-white">{internalRegNo || 'N/A'} (ID Card: {collegeIdCardName ? 'Attached' : 'Pending'})</span>
                      </div>
                    )}

                    {/* Team Leader Line */}
                    <div className="py-2 border-b border-white/5 bg-orange-950/20 px-3 rounded-lg">
                      <div className="font-bold text-orange-300 mb-0.5">👤 Team Leader:</div>
                      <div className="text-gray-200">{leaderName} · 📞 {leaderPhone} · ✉️ {leaderEmail}</div>
                      <div className="text-[11px] text-gray-400">{leaderDesignation}</div>
                    </div>

                    {/* Co-Delegates Summary */}
                    {hasMember1 && (
                      <div className="py-1.5 border-b border-white/5 px-3">
                        <div className="font-bold text-red-300 mb-0.5">👤 Member 2:</div>
                        <div className="text-gray-200">{member1Name} · 📞 {member1Phone} · ✉️ {member1Email}</div>
                        <div className="text-[11px] text-gray-400">{member1Year}</div>
                      </div>
                    )}
                    {hasMember2 && (
                      <div className="py-1.5 border-b border-white/5 px-3">
                        <div className="font-bold text-orange-300 mb-0.5">👤 Member 3:</div>
                        <div className="text-gray-200">{member2Name} · 📞 {member2Phone} · ✉️ {member2Email}</div>
                        <div className="text-[11px] text-gray-400">{member2Year}</div>
                      </div>
                    )}
                    {hasMember3 && (
                      <div className="py-1.5 border-b border-white/5 px-3">
                        <div className="font-bold text-pink-300 mb-0.5">👤 Member 4:</div>
                        <div className="text-gray-200">{member3Name} · 📞 {member3Phone} · ✉️ {member3Email}</div>
                        <div className="text-[11px] text-gray-400">{member3Year}</div>
                      </div>
                    )}

                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Venue & Date:</span>
                      <span className="font-bold text-red-300">RB Seminar Hall · November 20, 2026 (09:00 AM)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400">Total Delegates / Amount:</span>
                      <span className="font-bold text-amber-400">
                        {collegeType === 'internal' ? `${totalDelegates} Delegate(s) · Free Entry (₹0)` : `${totalDelegates} Delegate(s) · ₹${totalFee}`}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-400">{collegeType === 'internal' ? 'Verification Status:' : 'UPI Ref / UTR ID:'}</span>
                      <span className="font-mono font-bold text-orange-400">
                        {collegeType === 'internal' ? `SIMATS-VERIFIED (${internalRegNo})` : txnId}
                      </span>
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-red-600 focus:ring-red-500 bg-white/10 border-white/20"
                        required
                      />
                      <span>
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={onOpenTerms}
                          className="text-orange-400 underline hover:text-orange-300 font-semibold"
                        >
                          Workshop Terms & Conditions
                        </button>
                        , non-refundable registration policy, and confirm bringing official institutional ID for venue entry.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Error Alert Box */}
              {(stepError || submitError) && (
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{stepError || submitError}</span>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                ) : <div />}

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2.5 rounded-full font-bold text-xs bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || !termsAccepted}
                    className="px-8 py-3 rounded-full font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Generating Secure Pass...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Generate Digital Pass</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
};
