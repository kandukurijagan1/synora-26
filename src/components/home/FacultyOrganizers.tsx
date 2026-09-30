import React from 'react';
import { Award } from 'lucide-react';
import { FACULTY_ORGANIZERS, EVENT_DETAILS } from '../../data/hackathonData';

export const FacultyOrganizers: React.FC = () => {
  return (
    <section id="faculty-organizers" className="py-20 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold mb-3 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <Award className="w-3.5 h-3.5 text-cyan-400" />
          <span>Academic Leadership</span>
        </div>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white mb-2 tracking-tight">
          Faculty <span className="grad-text">Organizers</span>
        </h2>
        <p className="text-sm text-gray-300 mb-10">
          {EVENT_DETAILS.department}, {EVENT_DETAILS.institution}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FACULTY_ORGANIZERS.map((org, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl glass-card border border-white/10 hover:border-cyan-400/50 transition-all duration-300 flex flex-col items-center text-center shadow-[0_8px_25px_rgba(0,0,0,0.4)] hover:-translate-y-1 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/15 transition-all" />
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-2xl mb-3 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                {org.avatarEmoji}
              </div>
              <h3 className="font-display font-bold text-sm text-white mb-1">
                {org.name}
              </h3>
              <div className="text-[11px] font-bold text-cyan-300">
                {org.role}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
