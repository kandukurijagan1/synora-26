import React, { useState, useEffect } from 'react';
import { Award, Zap, MapPin, Calendar, Ticket, CalendarDays, Sparkles } from 'lucide-react';
import { EVENT_DETAILS } from '../../data/hackathonData';

interface HeroProps {
  onOpenPass: () => void;
  onViewSchedule: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenPass, onViewSchedule }) => {
  // Typewriter effect phrases for CRISPR workshop
  const phrases = [
    'CRISPR-Cas9 Genome Editing',
    'In Silico Guide RNA (gRNA) Design',
    'Base Editing & Prime Editing',
    'Therapeutic Gene Correction',
    'Bioinformatics & Off-Target Screening'
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayText === currentPhrase) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setPhraseIdx((prev) => (prev + 1) % phrases.length);
    } else {
      const speed = isDeleting ? 40 : 80;
      timer = setTimeout(() => {
        setDisplayText((prev) =>
          isDeleting ? currentPhrase.substring(0, prev.length - 1) : currentPhrase.substring(0, prev.length + 1)
        );
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIdx]);

  // Live countdown to October 3, 2026 09:00:00 IST
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    const targetDate = new Date(EVENT_DETAILS.eventDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, targetDate - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, mins, secs });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen pt-32 pb-20 flex items-center justify-center overflow-hidden">
      {/* Glow Orbs in Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-600/20 to-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-emerald-600/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Floating CRISPR Emblem with Dual Glow Rings */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute -inset-4 rounded-full border border-purple-500/40 animate-[spin_12s_linear_infinite]" />
          <div className="absolute -inset-8 rounded-full border border-dashed border-cyan-400/30 animate-[spin_18s_linear_infinite_reverse]" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden p-1 bg-gradient-to-br from-purple-600 via-cyan-500 to-emerald-400 shadow-[0_0_35px_rgba(124,58,237,0.5)]">
            <img
              src="./logo.jpg"
              alt="CRISPR '26 Emblem"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center font-display font-extrabold text-white text-2xl bg-[#090514]">🧬</div>';
              }}
            />
          </div>
        </div>

        {/* Institution & Department Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-gray-300 font-medium mb-3 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{EVENT_DETAILS.department} · {EVENT_DETAILS.institution}</span>
        </div>

        {/* IET Sponsorship Pill */}
        <div className="block mb-6">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-xs sm:text-sm font-semibold text-white shadow-[0_0_25px_rgba(6,182,212,0.25)] backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>
              <strong className="text-cyan-300 tracking-wide">{EVENT_DETAILS.sponsorFull}</strong>
            </span>
          </div>
        </div>

        {/* Main Cinematic Title */}
        <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl tracking-tight text-white uppercase mb-4 drop-shadow-[0_0_40px_rgba(6,182,212,0.35)]">
          CRISPR GENE <span className="grad-text">EDITING</span> TECHNOLOGIES
        </h1>

        {/* Dynamic Typewriter Subtitle */}
        <h2 className="text-lg sm:text-2xl font-semibold text-gray-200 mb-4 min-h-[44px]">
          Hands-on National Workshop on{' '}
          <span className="grad-text underline decoration-cyan-400/40 underline-offset-4">
            {displayText}
          </span>
          <span className="animate-pulse text-cyan-400">|</span>
        </h2>

        {/* Paragraph description */}
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          An intensive one-day national hands-on workshop covering fundamental and next-generation CRISPR-Cas genome engineering, in silico gRNA bioinformatics, vector delivery, and medical therapeutic breakthroughs.
        </p>

        {/* Key Event Highlights Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto mb-10">
          <div className="glass-card rounded-xl p-3 flex items-center justify-center gap-2 border border-white/10 hover:border-emerald-500/40 transition">
            <Award className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-gray-200">Students & Scholars</span>
          </div>

          <div className="glass-card rounded-xl p-3 flex items-center justify-center gap-2 border border-white/10 hover:border-purple-500/40 transition">
            <Zap className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-gray-200">Faculty & Researchers</span>
          </div>

          <div className="glass-card rounded-xl p-3 flex items-center justify-center gap-2 border border-white/10 hover:border-cyan-500/40 transition">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-gray-200">RB Seminar Hall</span>
          </div>

          <div className="glass-card rounded-xl p-3 flex items-center justify-center gap-2 border border-white/10 hover:border-pink-500/40 transition">
            <Calendar className="w-4 h-4 text-pink-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-gray-200">October 3, 2026</span>
          </div>
        </div>

        {/* Countdown HUD Module */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-3">
            ⏳ Workshop Kickoff Countdown (IST)
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Mins', value: timeLeft.mins },
              { label: 'Secs', value: timeLeft.secs },
            ].map((item) => (
              <div
                key={item.label}
                className="glass-card rounded-2xl py-3 px-2 sm:p-4 border border-cyan-500/20 bg-gradient-to-b from-white/[0.04] to-transparent shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
              >
                <div className="font-mono font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
                  {String(item.value).padStart(2, '0')}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-400 uppercase font-medium tracking-wider mt-1">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <a
            href="#register"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('register');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 py-3 rounded-full font-bold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.4)] border border-emerald-400/50 transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <span>✍️ Register for Workshop</span>
          </a>

          <button
            type="button"
            onClick={onOpenPass}
            className="px-6 py-3 rounded-full font-bold text-sm bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-[0_0_25px_rgba(124,58,237,0.4)] border border-cyan-400/50 transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Ticket className="w-4 h-4 text-cyan-300" />
            <span>🪪 Digital Entry Pass</span>
          </button>

          <button
            type="button"
            onClick={onViewSchedule}
            className="px-6 py-3 rounded-full font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-200 border border-white/20 hover:border-cyan-400/50 transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <CalendarDays className="w-4 h-4 text-cyan-400" />
            <span>📅 Workshop Schedule</span>
          </button>
        </div>
      </div>
    </section>
  );
};
