import React from 'react';
import { GraduationCap } from 'lucide-react';
import { FACULTY_COORDINATORS, EVENT_DETAILS } from '../../data/hackathonData';

export const FacultyCoordinators: React.FC = () => {
  return (
    <section id="faculty-coordinators" className="py-20 border-t border-white/5 relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-3 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Academic Mentorship</span>
        </div>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white mb-2 tracking-tight">
          Faculty <span className="grad-text">Coordinators</span>
        </h2>
        <p className="text-sm text-gray-300 mb-10">
          {EVENT_DETAILS.department}, {EVENT_DETAILS.institution}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {FACULTY_COORDINATORS.map((coord, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl glass-card border border-purple-500/30 hover:border-cyan-400/60 transition-all duration-300 flex items-center gap-4 text-left shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/15 transition-all" />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600/40 to-cyan-500/30 border border-purple-400/50 flex items-center justify-center text-2xl shrink-0 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                {coord.avatarEmoji}
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white mb-0.5">
                  {coord.name}
                </h3>
                <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  {coord.role}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {coord.department}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
