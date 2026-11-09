import React, { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  MessageCircle,
  ArrowRight,
  BookOpen,
  Search,
  CheckCircle2,
  Ticket,
  MapPin,
  Laptop,
  Award,
  ShieldAlert,
  Sparkles,
  X,
  CreditCard,
  Layers,
  Clock
} from 'lucide-react';
import { EVENT_DETAILS } from '../../data/hackathonData';
import { soundFX } from '../../utils/audio';

interface FaqProps {
  onOpenTerms: () => void;
}

interface FaqCategoryItem {
  id: string;
  category: 'registration' | 'venue' | 'hands-on' | 'certificate' | 'security';
  categoryLabel: string;
  question: string;
  answer: string;
  highlights?: string[];
  hasWhatsApp?: boolean;
}

const EXTENDED_FAQS: FaqCategoryItem[] = [
  {
    id: 'faq-1',
    category: 'registration',
    categoryLabel: 'Registration & Fees',
    question: 'Who is eligible to participate in the CRISPR \'26 Workshop?',
    answer: 'The workshop is open to all Undergraduate (B.Tech / B.Sc / B.E.), Postgraduate (M.Tech / M.Sc / MS), and Ph.D. Research Scholars, as well as Faculty Members and Industry Delegates from Biotechnology, Biomedical Engineering, Bioinformatics, Life Sciences, Pharmacy, Microbiology, Biochemistry, and allied technical disciplines across India.',
    highlights: ['Students & Research Scholars', 'Faculty & Academicians', 'Allied Bio-disciplines']
  },
  {
    id: 'faq-2',
    category: 'registration',
    categoryLabel: 'Registration & Fees',
    question: 'What are the registration fees and how do I make payment?',
    answer: 'Under generous sponsorship by the IET (Institute of Engineering and Technology), fees are heavily subsidized: Students & Scholars pay ₹200 per participant; Faculty & Academicians pay ₹500 per participant. Payment is completed securely via UPI (VPA: 9014978716@indus). After paying, simply input your UPI Transaction / Reference (UTR) number and attach a screenshot receipt in the registration portal.',
    highlights: ['Student Tier: ₹200 / person', 'Faculty Tier: ₹500 / person', 'UPI ID: 9014978716@indus']
  },
  {
    id: 'faq-3',
    category: 'venue',
    categoryLabel: 'Venue & Reporting',
    question: 'What is the venue, reporting time, and travel logistics?',
    answer: 'The workshop takes place at the state-of-the-art RB Seminar Hall, SIMATS Engineering, Chennai on October 3, 2026 (03.10.26). Delegates should report by 08:30 AM IST for physical reception check-in, delegate kit pickup, and badge scanning. Formal inauguration begins promptly at 09:00 AM IST.',
    highlights: ['Venue: RB Seminar Hall, SIMATS', 'Date: October 3, 2026', 'Reporting: 08:30 AM IST sharp']
  },
  {
    id: 'faq-4',
    category: 'hands-on',
    categoryLabel: 'Laptops & In Silico Labs',
    question: 'Do I need to bring a personal laptop for the hands-on sessions?',
    answer: 'Yes! Bringing a personal laptop with a modern web browser (Chrome, Firefox, Edge) is highly recommended for the In Silico CRISPR Guide RNA (sgRNA) Design laboratory, off-target screening modules, and computational bioinformatics modeling tools (Benchling, CRISPR-P, NCBI BLAST).',
    highlights: ['Personal laptop recommended', 'Pre-install modern web browser', 'Power outlets provided']
  },
  {
    id: 'faq-5',
    category: 'certificate',
    categoryLabel: 'Certificates & IET',
    question: 'Will I receive an official IET-sponsored Certificate of Participation?',
    answer: 'Yes! Every delegate who physically attends the workshop and completes check-in at the reception desk will receive an official Certificate of Participation jointly issued by the IET (Institute of Engineering and Technology) and SIMATS Engineering Department of Medical Biotechnology during the Valedictory Ceremony at 04:30 PM.',
    highlights: ['Official IET Sponsored', 'Hardcopy + Digital Certificate', 'Awarded at Valedictory']
  },
  {
    id: 'faq-6',
    category: 'security',
    categoryLabel: 'Security & Physical ID',
    question: 'Is a physical College ID Card mandatory for entry?',
    answer: 'Yes. All student and faculty delegates must present their valid physical Institutional / University ID Card at the SIMATS campus security gate and workshop reception desk alongside their digital QR entry pass for security authorization.',
    highlights: ['Physical College ID required', 'Digital Pass QR verification', 'Campus Security Clearance']
  },
  {
    id: 'faq-7',
    category: 'registration',
    categoryLabel: 'Registration & Fees',
    question: 'How do I access and download my Digital Entry Pass after registering?',
    answer: 'Upon submitting your registration form, a unique encrypted Pass ID (e.g., SYN26-XXXX-XXXX) is generated instantly. You can look up and download your high-resolution printable PDF pass badge with encrypted QR code at any time using the "Digital Entry Pass" lookup portal.',
    highlights: ['Instant encrypted Pass ID', 'High-res printable PDF pass', 'Instant QR code badge']
  },
  {
    id: 'faq-8',
    category: 'venue',
    categoryLabel: 'Venue & Reporting',
    question: 'Are refreshments and lunch provided during the 1-day workshop?',
    answer: 'Yes. All registered delegates receive complimentary morning high tea, afternoon networking refreshments, and delegate workshop kits provided courtesy of the IET sponsorship and SIMATS Engineering.',
    highlights: ['Morning High Tea', 'Networking Refreshments', 'Delegate Workshop Kit'],
    hasWhatsApp: true
  }
];

export const FAQ: React.FC<FaqProps> = ({ onOpenTerms }) => {
  const [openId, setOpenId] = useState<string | null>('faq-1');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [guideTab, setGuideTab] = useState<'roadmap' | 'payment' | 'checklist' | 'certificate'>('roadmap');

  const toggleAccordion = (id: string) => {
    soundFX.playClick();
    setOpenId(openId === id ? null : id);
  };

  const categories = [
    { id: 'all', label: '🌟 All Questions' },
    { id: 'registration', label: '📝 Registration & Fees' },
    { id: 'venue', label: '🏛️ Venue & Reporting' },
    { id: 'hands-on', label: '💻 Laptops & Labs' },
    { id: 'certificate', label: '🎓 Certificates & IET' },
    { id: 'security', label: '🔒 Security & ID' }
  ];

  const filteredFaqs = EXTENDED_FAQS.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="faq" className="py-24 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & INSTRUCTIONS FIRST                                       */}
        {/* ========================================================================= */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-400/30 text-orange-300 text-xs font-semibold mb-3 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
            <HelpCircle className="w-4 h-4 text-orange-400" />
            <span>Delegate Onboarding & Help Center</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-white mb-3 tracking-tight">
            How It Works & <span className="grad-text">Delegate FAQs</span>
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed max-w-2xl mx-auto">
            Everything you need to know about <strong>CRISPR '26</strong> — from online registration, UPI fee payment, and digital QR passes to event day check-in and IET certificate issuance.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setIsGuideModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition cursor-pointer border border-orange-400/40"
            >
              <BookOpen className="w-4 h-4" />
              <span>📖 Open Complete Workshop Instructions Modal</span>
            </button>

            <a
              href={EVENT_DETAILS.whatsappGroupUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#25d366]/20 hover:bg-[#25d366]/30 text-amber-300 border border-[#25d366]/40 transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-amber-400" />
              <span>Join Official WhatsApp Group</span>
            </a>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. 4-STAGE STEP-BY-STEP PARTICIPATION ROADMAP (PRO DEVELOPER FLOW)        */}
        {/* ========================================================================= */}
        <div className="mb-14 p-6 sm:p-8 rounded-3xl glass-card border border-red-500/25 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Step-by-Step Participant Roadmap</span>
              </div>
              <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white mt-1">
                4 Simple Steps to Complete Your Workshop Journey
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-orange-500/10 border border-orange-400/30 text-orange-300 self-start sm:self-auto">
              November 20, 2026 · SIMATS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-orange-400/40 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center font-mono font-extrabold text-orange-300 text-xs shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                    01
                  </span>
                  <CreditCard className="w-4 h-4 text-orange-400" />
                </div>
                <h4 className="font-bold text-sm text-white mb-1">1. Register &amp; Pay UPI</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Choose Student (₹200) or Faculty (₹500) tier, complete UPI payment to <span className="font-mono text-orange-300">9014978716@indus</span>, and upload your payment screenshot.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/5 text-[11px] font-semibold text-orange-400">
                ⚡ Sub-second confirmation
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-red-400/40 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center font-mono font-extrabold text-red-300 text-xs shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                    02
                  </span>
                  <Ticket className="w-4 h-4 text-red-400" />
                </div>
                <h4 className="font-bold text-sm text-white mb-1">2. Get Encrypted Pass</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Instantly obtain your unique Pass ID (<span className="font-mono text-red-300">SYN26-XXXX-XXXX</span>) and download your digital QR entry pass / printable PDF.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/5 text-[11px] font-semibold text-red-400">
                🪪 Printable PDF &amp; QR Badge
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/40 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center font-mono font-extrabold text-amber-300 text-xs shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                    03
                  </span>
                  <MapPin className="w-4 h-4 text-amber-400" />
                </div>
                <h4 className="font-bold text-sm text-white mb-1">3. Check-In on Oct 3</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Report at RB Seminar Hall, SIMATS Engineering by <strong className="text-white">08:30 AM</strong> with your physical College ID card to scan your QR pass and collect delegate kit.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/5 text-[11px] font-semibold text-amber-400">
                🏢 RB Seminar Hall Reception
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/40 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center font-mono font-extrabold text-amber-300 text-xs shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                    04
                  </span>
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <h4 className="font-bold text-sm text-white mb-1">4. Lab &amp; IET Certificate</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Participate in hands-on In Silico gRNA modeling on your laptop and receive official IET-sponsored Certificate of Participation during the valedictory session.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/5 text-[11px] font-semibold text-amber-400">
                🎓 Sponsored by IET
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. CATEGORY FILTERS & LIVE SEARCH BAR                                    */}
        {/* ========================================================================= */}
        <div className="mb-8 space-y-4">
          {/* Category Filter Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setSelectedCategory(cat.id);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.35)] border border-orange-300/40'
                    : 'bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08] border border-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Live Search Input */}
          <div className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g. fees, laptop, certificate, venue)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-full bg-black/40 border border-white/15 text-white text-xs placeholder-gray-400 focus:outline-none focus:border-orange-400 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search result count */}
          <div className="text-center text-xs text-gray-400">
            Showing <strong className="text-orange-300">{filteredFaqs.length}</strong> matching question(s)
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. EXPANDABLE ACCORDION LIST                                             */}
        {/* ========================================================================= */}
        {filteredFaqs.length === 0 ? (
          <div className="p-8 rounded-3xl glass-card border border-white/10 text-center max-w-md mx-auto mb-10">
            <HelpCircle className="w-10 h-10 text-gray-500 mx-auto mb-2" />
            <h4 className="font-bold text-white text-sm">No matching questions found</h4>
            <p className="text-xs text-gray-400 mt-1">
              Try searching with different keywords or switch back to "All Questions".
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-1.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-400/40 hover:bg-orange-500/30 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-10">
            {filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl glass-card transition-all duration-300 overflow-hidden border ${
                    isOpen
                      ? 'border-orange-400/50 shadow-[0_4px_25px_rgba(249,115,22,0.15)] bg-gradient-to-b from-[#0f1738] to-[#0a0f26]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    className="w-full py-4 px-6 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-gray-200 hover:text-white cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                      <span>{faq.question}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-orange-400 shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-orange-300' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5 pt-2 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/5 animate-in fade-in duration-200">
                      <p className="mb-3">{faq.answer}</p>

                      {faq.highlights && faq.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {faq.highlights.map((h, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-orange-300"
                            >
                              <CheckCircle2 className="w-3 h-3 text-amber-400" />
                              <span>{h}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {faq.hasWhatsApp && (
                        <a
                          href={EVENT_DETAILS.whatsappGroupUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 hover:border-amber-400 text-amber-300 transition-colors mt-2"
                        >
                          <MessageCircle className="w-5 h-5 text-amber-400 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>Official Participant WhatsApp Broadcast</span>
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            </div>
                            <div className="text-[11px] text-amber-400/80">
                              Join for real-time desk allocations &amp; announcements
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-amber-400 ml-2" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. OFFICIAL TERMS & SUPPORT CARD                                         */}
        {/* ========================================================================= */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-red-500/30 text-center flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h4 className="font-bold text-white text-sm sm:text-base">Need Complete Rules &amp; Policies?</h4>
            </div>
            <p className="text-xs text-gray-400 max-w-xl">
              Read our full delegate code of conduct, non-refund policy, and SIMATS campus physical ID verification protocol.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onOpenTerms();
            }}
            className="px-6 py-3 rounded-full text-xs font-bold bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-400/40 transition whitespace-nowrap cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          >
            📜 View Official Terms &amp; Policies
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. COMPLETE INSTRUCTIONS MODAL POPUP                                      */}
      {/* ========================================================================= */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl rounded-3xl glass-card border border-orange-500/40 shadow-2xl overflow-hidden bg-[#0a0e27] max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-900/40 to-orange-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-orange-300">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base sm:text-lg text-white">
                    CRISPR '26 Delegate Instruction Guide
                  </h3>
                  <p className="text-[11px] text-orange-300">
                    Department of Medical Biotechnology · SIMATS Engineering (Sponsored by IET)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setIsGuideModalOpen(false);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-white/10 overflow-x-auto bg-black/30 p-2 gap-1 text-xs font-semibold">
              {[
                { id: 'roadmap', label: '🗺️ Workshop Flow', icon: Layers },
                { id: 'payment', label: '💳 Payment Guide', icon: CreditCard },
                { id: 'checklist', label: '🎒 Event Checklist', icon: CheckCircle2 },
                { id: 'certificate', label: '🎓 IET Certificate', icon: Award }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setGuideTab(tab.id as any);
                  }}
                  className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    guideTab === tab.id
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-400/40'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Tab Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed flex-1">
              {guideTab === 'roadmap' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-white text-base">Workshop Day Agenda Overview</h4>
                  <p className="text-gray-400">
                    The one-day intensive national workshop is scheduled on <strong className="text-white">November 20, 2026</strong> at RB Seminar Hall, SIMATS Engineering:
                  </p>
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
                      <Clock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">08:30 AM – 09:00 AM:</strong> Reception Check-in, QR scanning &amp; Kit Distribution.
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">09:00 AM – 09:30 AM:</strong> Formal Inauguration &amp; IET Felicitation.
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
                      <Laptop className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">09:30 AM – 01:00 PM:</strong> Keynote on Cas9 mechanisms + Hands-on In Silico gRNA Design.
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
                      <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">02:00 PM – 05:00 PM:</strong> Prime Editing, Base Editing &amp; Valedictory Certificate Distribution.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {guideTab === 'payment' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-white text-base">UPI Payment &amp; Pass Verification</h4>
                  <p className="text-gray-400">
                    Payment is handled directly through verified UPI to prevent intermediary gateway delays:
                  </p>
                  <div className="p-4 rounded-2xl bg-orange-950/30 border border-orange-500/30 space-y-2">
                    <div className="font-bold text-white">Official UPI Virtual Payment Address (VPA):</div>
                    <div className="font-mono text-orange-300 font-extrabold text-base">9014978716@indus</div>
                    <div className="text-[11px] text-gray-400">
                      Receiver: CRISPR Workshop SIMATS / Student Coordinator
                    </div>
                  </div>
                  <ul className="space-y-1.5 list-disc list-inside text-gray-400">
                    <li>Student delegate fee: ₹200 per participant.</li>
                    <li>Faculty delegate fee: ₹500 per participant.</li>
                    <li>Make sure to note down your 12-digit UPI Reference (UTR) number.</li>
                    <li>Upload a clear screenshot of your successful transaction in the registration form.</li>
                  </ul>
                </div>
              )}

              {guideTab === 'checklist' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-white text-base">Event Day Checklist (What to Bring)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        <span>1. Physical College ID</span>
                      </div>
                      <p className="text-xs text-gray-400">Mandatory for campus gate pass and identity check at reception.</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-orange-400" />
                        <span>2. Digital QR Pass</span>
                      </div>
                      <p className="text-xs text-gray-400">Keep your pass PDF or screenshot ready on your mobile device.</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-red-400" />
                        <span>3. Personal Laptop</span>
                      </div>
                      <p className="text-xs text-gray-400">Required for hands-on CRISPR computational modeling labs.</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        <span>4. Formal / Semi-formal Dress</span>
                      </div>
                      <p className="text-xs text-gray-400">Compliant with SIMATS institutional academic standards.</p>
                    </div>
                  </div>
                </div>
              )}

              {guideTab === 'certificate' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-white text-base">IET Certification Eligibility</h4>
                  <p className="text-gray-400">
                    Official Certificates of Participation are sponsored by the <strong className="text-orange-300">IET (Institute of Engineering and Technology)</strong>:
                  </p>
                  <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>Certificate Criteria</span>
                    </div>
                    <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                      <li>Delegate must be marked <strong>PRESENT</strong> at the reception QR desk on Oct 3.</li>
                      <li>Active participation in the technical lectures and hands-on session.</li>
                      <li>Distributed physically during the Valedictory Ceremony at 04:30 PM.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setIsGuideModalOpen(false);
                }}
                className="px-5 py-2 rounded-full text-xs font-bold bg-orange-500 hover:bg-orange-400 text-black transition cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
