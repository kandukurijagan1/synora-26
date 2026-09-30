import React from 'react';
import { FileText, ShieldCheck, Heart } from 'lucide-react';
import { EVENT_DETAILS } from '../../data/hackathonData';

interface FooterProps {
  onOpenTerms: () => void;
  onOpenPass: () => void;
  onOpenOrganizer?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTerms, onOpenPass, onOpenOrganizer }) => {
  return (
    <footer className="border-t border-white/10 bg-[#060211] text-gray-400 py-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <img
            src="./logo.jpg"
            alt="CRISPR '26"
            className="w-8 h-8 rounded-full border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
            CRISPR <span className="text-cyan-400">'26</span>
          </h2>
        </div>

        <p className="text-sm font-semibold text-gray-200 max-w-xl mx-auto mb-1">
          Workshop on "CRISPR Gene Editing Technologies"
        </p>
        <p className="text-xs text-amber-300 font-medium max-w-xl mx-auto mb-2">
          {EVENT_DETAILS.sponsorFull}
        </p>
        <p className="text-xs text-gray-500 max-w-lg mx-auto mb-6">
          &copy; 2026 {EVENT_DETAILS.department}, {EVENT_DETAILS.institution}. Venue: RB Seminar Hall (Oct 3, 2026).
        </p>

        {/* Quick Footer Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 mb-6">
          <a
            href="#register"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('register');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 text-gray-300 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <span>Workshop Registration ✍️</span>
          </a>

          <span className="text-gray-700 hidden sm:inline">•</span>

          <button
            type="button"
            onClick={onOpenTerms}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Terms & Guidelines</span>
          </button>

          <span className="text-gray-700 hidden sm:inline">•</span>

          <button
            type="button"
            onClick={onOpenPass}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Digital Pass Verification</span>
          </button>

          {onOpenOrganizer && (
            <>
              <span className="text-gray-700 hidden sm:inline">•</span>
              <button
                type="button"
                onClick={onOpenOrganizer}
                className="flex items-center gap-1.5 text-purple-300 hover:text-purple-200 transition-colors cursor-pointer font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Organizer Desk & Attendance Scanner</span>
              </button>
            </>
          )}
        </div>

        <div className="text-[11px] text-gray-600 flex items-center justify-center gap-1">
          <span>Engineered with precision for</span>
          <Heart className="w-3 h-3 text-pink-500 fill-pink-500 inline mx-0.5" />
          <span>{EVENT_DETAILS.institution}</span>
        </div>
      </div>
    </footer>
  );
};
