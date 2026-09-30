import React from 'react';
import { Phone, Users, Sparkles } from 'lucide-react';
import { MAIN_TECH_LEAD, STUDENT_COORDINATORS } from '../../data/hackathonData';

export const ContactSection: React.FC = () => {
  return (
    <section id="contact" className="py-24 bg-[#090514]/80 border-t border-white/5 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
            <Users className="w-3.5 h-3.5" />
            <span>Organizing Committee</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white mb-2">
            Coordinators & <span className="grad-text">Support</span>
          </h2>
          <p className="text-sm text-gray-400">
            Have questions about rules, venue directions, or event schedule? Reach out to our student helpline coordinators.
          </p>
        </div>

        {/* Main Tech Lead & Overall Event Head Card */}
        <div className="mb-12 p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/40 shadow-[0_10px_40px_rgba(245,158,11,0.15)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 text-left">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500/30 to-purple-600/30 border-2 border-amber-400 flex items-center justify-center text-xl font-black text-amber-300 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              {MAIN_TECH_LEAD.initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-display font-extrabold text-xl text-white">
                  {MAIN_TECH_LEAD.name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Main Tech Lead
                </span>
              </div>
              <div className="text-xs font-bold text-amber-200/90 uppercase tracking-wide mb-1">
                {MAIN_TECH_LEAD.subtitle}
              </div>
              <div className="text-xs text-gray-400">
                {MAIN_TECH_LEAD.description}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-600 to-amber-700 text-white border border-amber-400/50 shadow-[0_4px_15px_rgba(245,158,11,0.3)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{MAIN_TECH_LEAD.badge}</span>
            </span>
          </div>
        </div>

        {/* 3 Equal Student Helpline Coordinators */}
        <div>
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              📞 Direct Student Helplines
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STUDENT_COORDINATORS.map((coord, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl glass-card border border-white/10 hover:border-cyan-400/40 transition-all duration-300 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)] group hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-lg">
                      {coord.avatar}
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-base text-white">
                        {coord.name}
                      </h4>
                      <div className="text-[11px] text-cyan-300 font-semibold">
                        {coord.role}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-300 mb-6 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Mobile: </span>
                    <strong className="text-white font-mono">{coord.phone}</strong>
                  </div>
                </div>

                <a
                  href={`tel:${coord.rawPhone}`}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-400/40 transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {coord.name}</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
