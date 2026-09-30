import React from 'react';
import { Sparkles, Dna, Cpu, Award, Microscope } from 'lucide-react';
import { EVENT_DETAILS } from '../../data/hackathonData';

export const About: React.FC = () => {
  const lifecycle = [
    { num: '01', title: 'Target Selection', icon: '🎯' },
    { num: '02', title: 'sgRNA Design', icon: '✂️' },
    { num: '03', title: 'Off-Target Analysis', icon: '💻' },
    { num: '04', title: 'Vector Construction', icon: '🧪' },
    { num: '05', title: 'Cellular Delivery', icon: '🔬' },
    { num: '06', title: 'Assay & Validation', icon: '🧬' },
  ];

  const pillars = [
    {
      num: '1',
      title: 'Target & Bind',
      color: 'text-cyan-400',
      icon: Dna,
      desc: 'Understand molecular recognition mechanisms, PAM motifs, and Cas endonuclease DNA binding architecture.'
    },
    {
      num: '2',
      title: 'Cut & Edit',
      color: 'text-purple-400',
      icon: Microscope,
      desc: 'Master targeted double-strand break induction, Non-Homologous End Joining (NHEJ), and Homology-Directed Repair (HDR).'
    },
    {
      num: '3',
      title: 'In Silico Design',
      color: 'text-pink-400',
      icon: Cpu,
      desc: 'Utilize state-of-the-art computational bioinformatics tools for gRNA optimization and predictive off-target minimization.'
    },
    {
      num: '4',
      title: 'Clinical Impact',
      color: 'text-emerald-400',
      icon: Award,
      desc: 'Explore therapeutic frontiers in oncology, sickle cell anemia, CAR-T cell immunotherapy, and agricultural biotechnology.'
    }
  ];

  return (
    <section id="about" className="py-24 relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          {/* Left Text */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{EVENT_DETAILS.sponsorFull}</span>
            </div>

            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white mb-6">
              About the <span className="grad-text">CRISPR Workshop</span>
            </h2>

            <p className="text-gray-200 text-base sm:text-lg font-medium leading-relaxed mb-4">
              The National Level Hands-on Workshop on <strong>"CRISPR Gene Editing Technologies"</strong> is an intensive training program organized by the Department of Medical Biotechnology, SIMATS Engineering, sponsored by the <strong>Institute of Engineering and Technology (IET)</strong>.
            </p>

            <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-4">
              CRISPR-Cas9 has revolutionized modern biological sciences, enabling unprecedented precision in genome manipulation. This workshop bridges theoretical genetic principles with practical in silico computational workflows and cutting-edge laboratory protocols.
            </p>

            <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-8">
              Participants will gain deep insights into single-guide RNA (sgRNA) design, off-target analysis, base editing, prime editing, and biomedical therapeutic applications for genetic disease correction.
            </p>

            {/* Complete Innovation Lifecycle */}
            <div className="p-5 rounded-2xl glass-card border border-purple-500/20">
              <div className="text-xs uppercase tracking-wider text-cyan-400 font-bold mb-4 flex items-center gap-2">
                <span>⚡ CRISPR Experimental & Computational Pipeline</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {lifecycle.map((item) => (
                  <div
                    key={item.num}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-gray-200 font-medium"
                  >
                    <span className="font-mono text-[10px] text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded">
                      {item.num}
                    </span>
                    <span>{item.icon} {item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Metrics Grid */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl glass-card border border-emerald-500/30 text-center hover:border-emerald-400 transition">
              <div className="font-display font-extrabold text-3xl text-emerald-400 mb-1">₹200</div>
              <div className="text-xs text-emerald-300 uppercase font-semibold tracking-wider">Student Delegate</div>
            </div>

            <div className="p-6 rounded-2xl glass-card border border-purple-500/30 text-center hover:border-purple-400 transition">
              <div className="font-display font-extrabold text-3xl text-purple-300 mb-1">₹500</div>
              <div className="text-xs text-purple-300 uppercase font-semibold tracking-wider">Faculty Delegate</div>
            </div>

            <div className="p-6 rounded-2xl glass-card border border-cyan-500/30 text-center hover:border-cyan-400 transition">
              <div className="font-display font-extrabold text-3xl text-cyan-400 mb-1">IET</div>
              <div className="text-xs text-cyan-300 uppercase font-semibold tracking-wider">Sponsored Event</div>
            </div>

            <div className="p-6 rounded-2xl glass-card border border-pink-500/30 text-center hover:border-pink-400 transition">
              <div className="font-display font-extrabold text-3xl text-pink-400 mb-1">RB Hall</div>
              <div className="text-xs text-pink-300 uppercase font-semibold tracking-wider">Seminar Venue</div>
            </div>
          </div>
        </div>

        {/* Core Pillars Feature Card */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-cyan-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              🧬 Precision Genome Engineering Core
            </div>
            <div className="font-display font-extrabold text-lg sm:text-xl text-white tracking-wide space-x-2">
              <span className="text-cyan-400">Target.</span>
              <span className="text-purple-400">Design.</span>
              <span className="text-pink-400">Edit.</span>
              <span className="text-emerald-400">Translate.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.num} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                    <Icon className={`w-5 h-5 ${p.color}`} />
                  </div>
                  <h3 className={`font-display font-bold text-base ${p.color} mb-1.5`}>
                    {p.num}. {p.title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs sm:text-sm text-gray-300">
            <strong className="text-white font-semibold">Certification & Hands-on Materials:</strong> All registered participants will receive hands-on in silico training material, practical guide protocols, and an official Certificate of Participation certified by IET and SIMATS Engineering.
          </div>
        </div>
      </div>
    </section>
  );
};
