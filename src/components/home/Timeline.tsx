import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Dna,
  Laptop,
  Coffee,
  Award,
  Users,
  Layers
} from 'lucide-react';
import { EVENT_DETAILS } from '../../data/hackathonData';
import { soundFX } from '../../utils/audio';

interface TimelineItem {
  id: string;
  sessionNum: string;
  time: string;
  duration: string;
  title: string;
  type: string;
  accentColor: 'cyan' | 'purple' | 'emerald' | 'amber' | 'blue';
  venue: string;
  description: string;
  topics?: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const TIMELINE_EVENTS: TimelineItem[] = [
  {
    id: 't1',
    sessionNum: '01',
    time: '08:30 AM – 09:00 AM',
    duration: '30 mins',
    title: 'Registration & Delegate Check-In',
    type: 'Reception',
    accentColor: 'cyan',
    venue: 'RB Seminar Hall Reception',
    description: 'Physical registration check, digital pass QR scanning, welcome kit collection, and badge issuance.',
    topics: ['QR Check-in', 'Delegate Kit', 'Badge Issuance'],
    icon: Users
  },
  {
    id: 't2',
    sessionNum: '02',
    time: '09:00 AM – 09:30 AM',
    duration: '30 mins',
    title: 'Inauguration & IET Sponsor Felicitation',
    type: 'Inauguration',
    accentColor: 'amber',
    venue: 'RB Seminar Hall Main Stage',
    description: 'Traditional lamp lighting, opening address by Organizing Secretary Dr. Ieshita Pan, and introduction by IET representatives.',
    topics: ['Lamp Lighting', 'Welcome Remarks', 'IET Overview'],
    icon: Sparkles
  },
  {
    id: 't3',
    sessionNum: '03',
    time: '09:30 AM – 11:00 AM',
    duration: '90 mins',
    title: 'Technical Session 1: Molecular Mechanisms of CRISPR-Cas9',
    type: 'Keynote Lecture',
    accentColor: 'cyan',
    venue: 'RB Seminar Hall',
    description: 'Detailed keynote on Cas9 nuclease architecture, PAM motifs (5\'-NGG), guide RNA binding, and cellular DNA repair pathways (NHEJ & HDR).',
    topics: ['Cas9 Endonuclease', 'PAM Recognition', 'NHEJ & HDR Pathways'],
    icon: Dna
  },
  {
    id: 't4',
    sessionNum: '04',
    time: '11:00 AM – 11:15 AM',
    duration: '15 mins',
    title: 'High Tea & Networking Break',
    type: 'Refreshment',
    accentColor: 'purple',
    venue: 'Seminar Hall Lounge',
    description: 'Connect with biotechnology faculty, research scholars, and fellow delegates over refreshments.',
    topics: ['High Tea', 'Networking', 'Peer Interaction'],
    icon: Coffee
  },
  {
    id: 't5',
    sessionNum: '05',
    time: '11:15 AM – 01:00 PM',
    duration: '105 mins',
    title: 'Hands-on In Silico Session: gRNA Design & Computational Modeling',
    type: 'Hands-on Lab',
    accentColor: 'emerald',
    venue: 'Biotechnology Computational Lab',
    description: 'Practical interactive lab using bioinformatics tools for single-guide RNA (sgRNA) design, secondary structure prediction, and off-target minimization.',
    topics: ['sgRNA Design', 'CHOPCHOP / Benchling', 'Off-Target Scoring'],
    icon: Laptop
  },
  {
    id: 't6',
    sessionNum: '06',
    time: '01:00 PM – 02:00 PM',
    duration: '60 mins',
    title: 'Campus Lunch Break',
    type: 'Dining',
    accentColor: 'purple',
    venue: 'SIMATS Engineering Food Courts',
    description: 'Buffet lunch and informal interactions for delegates and faculty.',
    topics: ['Buffet Lunch', 'Informal Discussions'],
    icon: Coffee
  },
  {
    id: 't7',
    sessionNum: '07',
    time: '02:00 PM – 03:30 PM',
    duration: '90 mins',
    title: 'Technical Session 2: Prime Editing & Medical Therapeutics',
    type: 'Keynote Lecture',
    accentColor: 'cyan',
    venue: 'RB Seminar Hall',
    description: 'Next-generation genome editing: Cytosine & Adenine base editors (CBE/ABE), Prime Editing, CAR-T cell immunotherapy, and clinical trials.',
    topics: ['Base Editing', 'Prime Editing', 'CAR-T Oncology', 'Gene Therapy'],
    icon: Dna
  },
  {
    id: 't8',
    sessionNum: '08',
    time: '03:30 PM – 04:30 PM',
    duration: '60 mins',
    title: 'Interactive Case Studies & Q&A Panel',
    type: 'Expert Panel',
    accentColor: 'blue',
    venue: 'RB Seminar Hall',
    description: 'Real-world protocol troubleshooting, experimental design discussions, and open-floor interactive Q&A with experts.',
    topics: ['Case Studies', 'Troubleshooting', 'Open Q&A'],
    icon: Users
  },
  {
    id: 't9',
    sessionNum: '09',
    time: '04:30 PM – 05:00 PM',
    duration: '30 mins',
    title: 'Valedictory Ceremony & Certificate Distribution',
    type: 'Valedictory',
    accentColor: 'amber',
    venue: 'RB Seminar Hall',
    description: 'Valedictory address, distribution of official IET-sponsored certificates of participation, and concluding photo session.',
    topics: ['IET Certificates', 'Awards', 'Vote of Thanks'],
    icon: Award
  }
];

export const Timeline: React.FC = () => {
  const [activeSessionId, setActiveSessionId] = useState<string>('t3');

  const getAccent = (color: TimelineItem['accentColor']) => {
    switch (color) {
      case 'cyan':
        return {
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          dot: 'bg-cyan-400 shadow-[0_0_15px_#06b6d4]',
          borderHover: 'hover:border-cyan-500/60',
          activeCard: 'border-cyan-500/80 shadow-[0_0_30px_rgba(6,182,212,0.25)]',
          iconColor: 'text-cyan-400'
        };
      case 'emerald':
        return {
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400 shadow-[0_0_15px_#10b981]',
          borderHover: 'hover:border-emerald-500/60',
          activeCard: 'border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.25)]',
          iconColor: 'text-emerald-400'
        };
      case 'amber':
        return {
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400 shadow-[0_0_15px_#f59e0b]',
          borderHover: 'hover:border-amber-500/60',
          activeCard: 'border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.25)]',
          iconColor: 'text-amber-400'
        };
      case 'blue':
        return {
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          dot: 'bg-blue-400 shadow-[0_0_15px_#3b82f6]',
          borderHover: 'hover:border-blue-500/60',
          activeCard: 'border-blue-500/80 shadow-[0_0_30px_rgba(59,130,246,0.25)]',
          iconColor: 'text-blue-400'
        };
      default:
        return {
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          dot: 'bg-purple-400 shadow-[0_0_15px_#a855f7]',
          borderHover: 'hover:border-purple-500/60',
          activeCard: 'border-purple-500/80 shadow-[0_0_30px_rgba(168,85,247,0.25)]',
          iconColor: 'text-purple-400'
        };
    }
  };

  return (
    <section id="timeline" className="py-24 relative z-10 overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Simple & Clean Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Saturday, October 3, 2026 · Event Itinerary</span>
          </div>

          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight mb-3">
            Workshop <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-emerald-400">Schedule</span>
          </h2>
          
          <p className="text-sm text-slate-300">
            1-Day Program at <strong>{EVENT_DETAILS.venue}</strong> · 08:30 AM to 05:00 PM
          </p>
        </div>

        {/* Vertical Timeline Structure */}
        <div className="relative">
          
          {/* Continuous Animated Vertical Spine */}
          <div className="absolute left-4 sm:left-48 top-6 bottom-6 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-emerald-500 opacity-70 z-0" />

          {/* Timeline Items List */}
          <div className="space-y-6 sm:space-y-8 relative z-10">
            {TIMELINE_EVENTS.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeSessionId === item.id;
              const style = getAccent(item.accentColor);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    soundFX.playClick();
                    setActiveSessionId(item.id);
                  }}
                  className="relative flex flex-col sm:flex-row items-start gap-4 sm:gap-10 group cursor-pointer"
                >
                  {/* Left Column (Desktop): Time & Session Number */}
                  <div className="hidden sm:flex flex-col items-end w-40 shrink-0 pt-3 text-right">
                    <span className="font-mono text-sm font-bold text-cyan-300 tracking-tight">
                      {item.time.split('–')[0]}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.time.split('–')[1] ? `to ${item.time.split('–')[1]}` : ''}
                    </span>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                      {item.duration}
                    </span>
                  </div>

                  {/* Center Node Beacon */}
                  <div className="absolute left-4 sm:left-48 -translate-x-1/2 top-4 z-20">
                    <div
                      className={`w-5 h-5 rounded-full border-2 border-slate-900 ${style.dot} transition-all duration-300 group-hover:scale-125 ${
                        isActive ? 'scale-125 ring-4 ring-cyan-400/30' : ''
                      }`}
                    />
                  </div>

                  {/* Right Column: Card Content */}
                  <div className="w-full pl-10 sm:pl-0 flex-1">
                    <div
                      className={`p-5 sm:p-6 rounded-2xl bg-slate-900/80 backdrop-blur-xl border transition-all duration-300 shadow-xl ${
                        style.borderHover
                      } ${
                        isActive
                          ? `${style.activeCard} -translate-y-1`
                          : 'border-slate-700/60 hover:-translate-y-1'
                      }`}
                    >
                      {/* Mobile Time Header */}
                      <div className="flex sm:hidden items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{item.time}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
                          {item.duration}
                        </span>
                      </div>

                      {/* Header Badge & Session Number */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                            SESSION {item.sessionNum}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${style.badge}`}>
                            {item.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>{item.venue}</span>
                        </div>
                      </div>

                      {/* Session Title */}
                      <h3 className="font-display font-extrabold text-base sm:text-lg text-white mb-2 flex items-center gap-2 group-hover:text-cyan-200 transition-colors">
                        <IconComponent className={`w-4 h-4 shrink-0 ${style.iconColor}`} />
                        <span>{item.title}</span>
                      </h3>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
                        {item.description}
                      </p>

                      {/* Key Topics / Highlights */}
                      {item.topics && item.topics.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-800/80">
                          {item.topics.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-medium text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/60"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Simple Summary Footer */}
        <div className="mt-14 p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-700/60 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Official Certificates sponsored by <strong>IET Chennai Local Network</strong> will be issued at the Valedictory Ceremony.</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 font-mono">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>9 Sessions · Full Day Program</span>
          </div>
        </div>

      </div>
    </section>
  );
};
