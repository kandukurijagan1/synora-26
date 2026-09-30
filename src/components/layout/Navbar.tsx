import React, { useState, useEffect } from 'react';
import { Menu, X, Ticket, ShieldCheck } from 'lucide-react';
import { EVENT_DETAILS } from '../../data/hackathonData';
import { soundFX } from '../../utils/audio';

interface NavbarProps {
  onOpenPass: () => void;
  onOpenOrganizer?: () => void;
  activeView: 'home' | 'pass' | 'organizer';
  onNavigateHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenPass,
  onOpenOrganizer,
  activeView,
  onNavigateHome
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Schedule', href: '#timeline' },
    { label: 'Registration Fees', href: '#benefits' },
    { label: 'Register', href: '#register' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Coordinators', href: '#contact' }
  ];

  const handleLinkClick = (href: string) => {
    soundFX.playClick();
    setMobileMenuOpen(false);
    if (activeView !== 'home') {
      onNavigateHome();
      setTimeout(() => {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Real-time Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 z-[100] transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
      />

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-slate-900/90 backdrop-blur-md border-b border-white/10 shadow-lg shadow-purple-950/20 py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo & Title */}
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onNavigateHome();
            }}
            className="flex items-center gap-3 group text-left cursor-pointer"
          >
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 opacity-60 group-hover:opacity-100 blur transition duration-300" />
              <img
                src="./logo.jpg"
                alt="CRISPR Logo"
                className="relative w-9 h-9 rounded-full object-cover border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="font-display font-extrabold text-lg tracking-tight text-white flex items-center">
                CRISPR<span className="text-cyan-400 ml-1">'26</span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium block leading-none -mt-0.5">
                {EVENT_DETAILS.department} · {EVENT_DETAILS.institution}
              </span>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1.5 rounded-full border border-white/10 backdrop-blur-md">
            {navLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => handleLinkClick(link.href)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Action Header Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {onOpenOrganizer && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onOpenOrganizer();
                }}
                className={`px-3 py-2 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'organizer'
                    ? 'bg-purple-600 text-white shadow-[0_0_15px_#7c3aed]'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-purple-300 border border-purple-500/30'
                }`}
                title="Event Staff & Organizer Check-in Desk"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Organizer Desk</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onOpenPass();
              }}
              className="px-3.5 py-2 rounded-full text-xs font-bold bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-cyan-400" />
              <span>Digital Pass</span>
            </button>

            <button
              type="button"
              onClick={() => handleLinkClick('#register')}
              className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition cursor-pointer"
            >
              <span>Register Now</span>
            </button>
          </div>

          {/* Mobile Hamburger & Controls */}
          <div className="flex md:hidden items-center gap-2">
            {onOpenOrganizer && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onOpenOrganizer();
                }}
                className="p-2 rounded-full bg-purple-950/40 border border-purple-500/40 text-purple-300 cursor-pointer"
                aria-label="Organizer Desk"
                title="Organizer Desk"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onOpenPass();
              }}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-cyan-400 cursor-pointer"
              aria-label="Open Entry Pass"
            >
              <Ticket className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-gray-200 hover:text-white cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-3 pb-6 bg-[#090514]/95 backdrop-blur-xl border-b border-white/10 mt-2 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => handleLinkClick(link.href)}
                className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition cursor-pointer block"
              >
                {link.label}
              </button>
            ))}

            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              {onOpenOrganizer && (
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setMobileMenuOpen(false);
                    onOpenOrganizer();
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-950/40 text-purple-300 border border-purple-500/40 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Organizer & Attendance Desk Login</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setMobileMenuOpen(false);
                  onOpenPass();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/5 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Lookup Digital Entry Pass</span>
              </button>

              <button
                type="button"
                onClick={() => handleLinkClick('#register')}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-black flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                <span>Register Now</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
