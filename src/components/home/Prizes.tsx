import React from 'react';
import { Award, BookOpen, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { EVENT_DETAILS } from '../../data/hackathonData';

export const Prizes: React.FC = () => {
  return (
    <section id="benefits" className="py-24 bg-[#090514]/70 border-y border-white/5 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Workshop Inclusions & Registration Tiers</span>
        </div>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white mb-2">
          Registration & <span className="grad-text">Delegate Tiers</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto mb-10">
          Subsidized registration fees under {EVENT_DETAILS.sponsor} sponsorship for all technical, science, and biotechnology delegates.
        </p>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-10">
          {/* Student Tier Card */}
          <div className="p-8 rounded-3xl glass-card border border-emerald-500/40 shadow-[0_15px_40px_rgba(16,185,129,0.15)] relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 text-left">
            <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-emerald-500/30">
              UG / PG / Ph.D. Scholars
            </div>

            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl mb-4">
              🎓
            </div>

            <div className="text-xs uppercase font-bold text-emerald-400 tracking-wider mb-1">
              Student Delegate
            </div>
            <div className="font-display font-black text-4xl text-white mb-4">
              ₹200 <span className="text-xs font-normal text-gray-400">/ participant</span>
            </div>

            <ul className="space-y-2.5 text-xs text-gray-300 border-t border-white/10 pt-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Full access to all technical & hands-on sessions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>In Silico gRNA design & bioinformatics workflow kit</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Official IET Sponsored Certificate of Participation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Session high tea, refreshments & delegate kit</span>
              </li>
            </ul>
          </div>

          {/* Faculty Tier Card */}
          <div className="p-8 rounded-3xl glass-card border border-purple-500/40 shadow-[0_15px_40px_rgba(168,85,247,0.15)] relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 text-left">
            <div className="absolute top-0 right-0 bg-purple-500/20 text-purple-300 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-purple-500/30">
              Faculty / Academicians / Industry
            </div>

            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl mb-4">
              👩‍🏫
            </div>

            <div className="text-xs uppercase font-bold text-purple-400 tracking-wider mb-1">
              Faculty / Researcher Delegate
            </div>
            <div className="font-display font-black text-4xl text-white mb-4">
              ₹500 <span className="text-xs font-normal text-gray-400">/ participant</span>
            </div>

            <ul className="space-y-2.5 text-xs text-gray-300 border-t border-white/10 pt-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Complete workshop & advanced technical session access</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Curriculum & laboratory protocol resource compilation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Official IET Sponsored Faculty Delegate Certificate</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Session high tea, networking access & delegate kit</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Perks Highlights Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3 text-left">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">IET Certification</div>
              <div className="text-[11px] text-gray-400">Official certificate from IET & SIMATS</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3 text-left">
            <BookOpen className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">Hands-on In Silico</div>
              <div className="text-[11px] text-gray-400">gRNA design, Benchling & off-target analysis</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3 text-left">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">RB Seminar Hall</div>
              <div className="text-[11px] text-gray-400">October 3, 2026 · 09:00 AM IST</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
