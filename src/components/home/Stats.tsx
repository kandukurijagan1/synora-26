import React from 'react';

export const Stats: React.FC = () => {
  const statsList = [
    { value: '5', label: 'Core Technical Modules' },
    { value: 'IET', label: 'Sponsored Workshop' },
    { value: '1-Day', label: 'Hands-on In Silico Training' },
    { value: 'RB Hall', label: 'Venue · Oct 3, 2026' }
  ];

  return (
    <section className="py-12 border-y border-white/5 bg-[#090514]/60 backdrop-blur-sm relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
          {statsList.map((stat, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl glass-card border border-white/10 hover:border-cyan-400/40 transition-all duration-300"
            >
              <div className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl grad-text mb-1">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
