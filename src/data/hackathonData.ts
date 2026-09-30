import { Track, TimelineEvent, FaqItem, Coordinator, FacultyLeader } from '../types';

export const EVENT_DETAILS = {
  name: "CRISPR '26",
  title: "CRISPR Gene Editing Technologies",
  subtitle: "National Level Hands-on Workshop",
  tagline: "Precision Genome Editing · Therapeutic Frontiers · In Silico Design",
  institution: "SIMATS Engineering",
  department: "Department of Medical Biotechnology",
  sponsor: "IET (Institute of Engineering and Technology)",
  sponsorFull: "Sponsored by IET - Institute of Engineering and Technology",
  venue: "RB Seminar Hall, SIMATS Engineering, Chennai",
  eventDate: "2026-10-03T09:00:00+05:30",
  dateFormatted: "October 3, 2026 · 09:00 AM IST",
  duration: "1-Day Intensive Workshop",
  studentFee: 200,
  facultyFee: 500,
  registrationClosedDate: "October 1, 2026 · 10:00 PM IST",
  whatsappGroupUrl: "https://chat.whatsapp.com/ESMuU0nwLljLXbWpREEmo2",
  scriptUrl: "https://script.google.com/macros/s/AKfycbzp3Wx0qCvLKkjJPravTiLt-Gb5stHPfGxrDZQQ1CVK8n1GbGNdU2lkH1ckn595ZcHQkg/exec",
  adminScriptUrl: "https://script.google.com/macros/s/AKfycbzp3Wx0qCvLKkjJPravTiLt-Gb5stHPfGxrDZQQ1CVK8n1GbGNdU2lkH1ckn595ZcHQkg/exec",
  googleClientId: "902168382803-6gof845v72ku6k4lp4mecsgr3l1uc3s0.apps.googleusercontent.com"
};

export const TRACKS: Track[] = [
  {
    id: "crispr-core",
    category: "biotech",
    emoji: "🧬",
    title: "CRISPR-Cas9 Fundamentals & Molecular Biology",
    description: "Deep dive into bacterial adaptive immunity, Cas9 endonuclease architecture, PAM sequence recognition, and target DNA cleavage mechanics.",
    badges: ["Cas9 Nuclease", "PAM Recognition", "Double-Strand Breaks", "NHEJ / HDR"]
  },
  {
    id: "grna-design",
    category: "ai",
    emoji: "✂️",
    title: "Guide RNA (gRNA) Design & Target Selection",
    description: "Hands-on protocols for single guide RNA (sgRNA) design, crRNA-tracrRNA chimera synthesis, on-target efficiency scoring, and vector cloning.",
    badges: ["sgRNA Synthesis", "On-Target Scoring", "Plasmid Vectors", "Cloning Protocols"]
  },
  {
    id: "in-silico",
    category: "web",
    emoji: "💻",
    title: "In Silico CRISPR Bioinformatics & Off-Target Screening",
    description: "Computational genome analysis using CRISPR-P, Benchling, NCBI BLAST, and predictive machine learning models for minimizing off-target mutations.",
    badges: ["Benchling", "CRISPR-P", "Off-Target Analysis", "BioPython"]
  },
  {
    id: "advanced-editing",
    category: "iot",
    emoji: "🧪",
    title: "Base Editing & Prime Editing Next-Gen Technologies",
    description: "Exploration of transition and transversion base editors, search-and-replace prime editors, reverse transcriptase fusions, and epigenome modifications.",
    badges: ["Base Editors (CBE/ABE)", "Prime Editing (PE)", "Reverse Transcriptase", "Epigenetics"]
  },
  {
    id: "medical-therapeutics",
    category: "cyber",
    emoji: "🔬",
    title: "Clinical Therapeutics, Gene Therapy & Diagnostics",
    description: "Real-world translation in oncology, monogenic disorder correction (Sickle Cell, Thalassemia), CAR-T cell engineering, and SHERLOCK nucleic acid detection.",
    badges: ["Gene Therapy", "CAR-T Oncology", "SHERLOCK Diagnostics", "Clinical Ethics"]
  }
];

export const TIMELINE: TimelineEvent[] = [
  {
    id: "t1",
    time: "October 3, 2026 · 08:30 AM - 09:00 AM",
    title: "📋 Registration Desk & Delegate Check-In",
    description: "Physical verification, kit collection, and badge issuance at the RB Seminar Hall reception."
  },
  {
    id: "t2",
    time: "October 3, 2026 · 09:00 AM - 09:30 AM",
    title: "✨ Inauguration & IET Sponsor Felicitation",
    description: "Lamp lighting, opening remarks by HOD Dr. Ieshita Pan, and introduction by IET representatives."
  },
  {
    id: "t3",
    time: "October 3, 2026 · 09:30 AM - 11:00 AM",
    title: "🧬 Technical Session 1: Molecular Mechanisms of CRISPR-Cas9",
    description: "Comprehensive keynote on Cas nuclease biology, PAM motifs, cellular repair pathways (NHEJ/HDR), and modern genetic engineering."
  },
  {
    id: "t4",
    time: "October 3, 2026 · 11:00 AM - 11:15 AM",
    title: "☕ High Tea & Delegate Networking Break",
    description: "Connect with biotechnology faculty, research scholars, and fellow participants."
  },
  {
    id: "t5",
    time: "October 3, 2026 · 11:15 AM - 01:00 PM",
    title: "💻 Hands-on In Silico Session: gRNA Design & Computational Modeling",
    description: "Interactive laboratory session on bioinformatics tools, sgRNA design workflows, and off-target prediction software."
  },
  {
    id: "t6",
    time: "October 3, 2026 · 01:00 PM - 02:00 PM",
    title: "🍽️ Lunch Break",
    description: "Campus dining and refreshment break at SIMATS Engineering food courts."
  },
  {
    id: "t7",
    time: "October 3, 2026 · 02:00 PM - 03:30 PM",
    title: "🔬 Technical Session 2: Prime Editing, Base Editing & Medical Therapeutics",
    description: "Exploring next-generation genome editing without double-strand breaks, CAR-T immunotherapy, and clinical trials."
  },
  {
    id: "t8",
    time: "October 3, 2026 · 03:30 PM - 04:30 PM",
    title: "💡 Interactive Case Studies & Q&A Panel",
    description: "Real-world medical case discussions, protocol troubleshooting, and expert-led Q&A."
  },
  {
    id: "t9",
    time: "October 3, 2026 · 04:30 PM - 05:00 PM",
    title: "🎓 Valedictory Ceremony & Certificate Distribution",
    description: "Awarding official IET-sponsored certificates of participation and concluding remarks."
  }
];

export const FAQS: FaqItem[] = [
  {
    id: "faq-1",
    question: "Who can attend this workshop?",
    answer: "The workshop is open to all Undergraduate / Postgraduate students, Ph.D. Research Scholars, and Faculty members from Biotechnology, Biomedical, Bioinformatics, Life Sciences, Pharmacy, and allied technical disciplines."
  },
  {
    id: "faq-2",
    question: "What are the registration fees?",
    answer: "Registration fees are subsidized under IET sponsorship: Students pay ₹200 per participant, and Faculty / Researchers pay ₹500 per participant. Payment is securely made via UPI during registration."
  },
  {
    id: "faq-3",
    question: "What is the venue and reporting time?",
    answer: "The workshop is held at RB Seminar Hall, SIMATS Engineering, Chennai on October 3, 2026 (03.10.26). Delegates should report by 08:30 AM for registration verification and badge pickup."
  },
  {
    id: "faq-4",
    question: "Will I receive an official certificate?",
    answer: "Yes! All verified attendees will receive an official Certificate of Participation sponsored by IET (Institute of Engineering and Technology) and SIMATS Engineering."
  },
  {
    id: "faq-5",
    question: "Do participants need to bring physical college ID cards?",
    answer: "Yes, all students and faculty delegates must carry their official institutional ID cards for security verification at the SIMATS campus gate and registration desk."
  },
  {
    id: "faq-6",
    question: "Should I bring a laptop for hands-on sessions?",
    answer: "Bringing a personal laptop is highly recommended for the In Silico CRISPR gRNA design and computational genome analysis hands-on modules."
  },
  {
    id: "faq-7",
    question: "What is the refund and cancellation policy?",
    answer: "Registration fees are strictly non-refundable once registered as seats in RB Seminar Hall are limited and allocated on a first-come, first-served basis."
  },
  {
    id: "faq-8",
    question: "How do I download my digital entry pass?",
    answer: "Upon completing the online registration form, you will receive an encrypted Team/Delegate ID (SYN26-XXXX-XXXX). You can view and download your PDF entry pass anytime from the 'Entry Pass' portal."
  }
];

export const FACULTY_COORDINATORS: Coordinator[] = [
  {
    name: "Dr. Sathya A B",
    role: "Faculty Coordinator",
    department: "Dept. of Medical Biotechnology",
    avatarEmoji: "👩‍🏫"
  },
  {
    name: "Dr. Vijayalakshmi R",
    role: "Faculty Coordinator",
    department: "Dept. of Medical Biotechnology",
    avatarEmoji: "👩‍🏫"
  }
];

export const FACULTY_ORGANIZERS: FacultyLeader[] = [
  {
    name: "Dr. Ieshita Pan",
    role: "HOD & Chief Organizer",
    avatarEmoji: "🎓"
  },
  {
    name: "Dr. I. Praveen Kumar",
    role: "Faculty Organizer",
    avatarEmoji: "🎓"
  },
  {
    name: "Dr. Ashley George Thomas",
    role: "Faculty Organizer",
    avatarEmoji: "🎓"
  },
  {
    name: "Dr. S. Moogambigai",
    role: "Faculty Organizer",
    avatarEmoji: "🎓"
  }
];

export const MAIN_TECH_LEAD = {
  name: "Kandukuri Jagan",
  role: "Main Tech Lead & Overall Event Head",
  subtitle: "Overall Event Head & Lead Architect · Department of Medical Biotechnology",
  description: "Technical Architecture, System Automation & Event Operations",
  badge: "Lead Organizer",
  initials: "KJ"
};

export const STUDENT_COORDINATORS = [
  {
    name: "Tharani",
    role: "🌟 Student Coordinator",
    phone: "+91 90149 78716",
    rawPhone: "+919014978716",
    avatar: "👩‍💼"
  },
  {
    name: "Yugandhar",
    role: "🌟 Student Coordinator",
    phone: "+91 63023 89449",
    rawPhone: "+916302389449",
    avatar: "👨‍💼"
  },
  {
    name: "Hemanth",
    role: "🌟 Student Coordinator",
    phone: "+91 63821 22447",
    rawPhone: "+916382122447",
    avatar: "👨‍💼"
  }
];
