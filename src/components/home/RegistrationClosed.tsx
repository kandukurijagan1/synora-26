import React from 'react';
import { Lock, Calendar, MapPin, IdCard, MessageCircle, Ticket } from 'lucide-react';
import { EVENT_DETAILS } from '../../data/hackathonData';

interface RegistrationClosedProps {
  onOpenPass: () => void;
}

export const RegistrationClosed: React.FC<RegistrationClosedProps> = ({ onOpenPass }) => {
  return (
    <section id="register" className="py-24 bg-gradient-to-b from-[#03000a] to-[#090514] relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Portal Status</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white mb-2">
            Registrations <span className="text-red-400">Closed</span>
          </h2>
          <p className="text-sm text-gray-400 mb-3">
            Online delegate registrations for CRISPR '26 Workshop are officially closed.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Capacity Reached · {EVENT_DETAILS.registrationClosedDate}</span>
          </div>
        </div>

        {/* Central Closed Card */}
        <div className="p-8 sm:p-10 rounded-3xl glass-card border border-red-500/30 shadow-[0_15px_50px_rgba(239,68,68,0.15)] text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-3xl mx-auto mb-5 shadow-[0_0_25px_rgba(239,68,68,0.25)]">
            🔒
          </div>

          <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white mb-4">
            Registrations for CRISPR '26 Workshop Are Officially Closed
          </h3>

          <div className="max-w-2xl mx-auto p-4 rounded-xl bg-red-950/20 border border-red-500/20 mb-6 text-xs sm:text-sm text-red-200 leading-relaxed">
            ⚠️ Due to an overwhelming response and a high volume of participant registrations, we have reached maximum venue capacity and registrations have been closed. No new submissions can be accepted.
          </div>

          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto mb-8 leading-relaxed">
            We sincerely thank all delegates, faculty, and institutions across the country for the tremendous enthusiasm in CRISPR '26 National Level Workshop!
          </p>

          {/* Quick Logistics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
              <Calendar className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Event Date</div>
              <div className="text-xs font-bold text-white mt-0.5">{EVENT_DETAILS.dateFormatted}</div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
              <MapPin className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Venue</div>
              <div className="text-xs font-bold text-white mt-0.5">{EVENT_DETAILS.venue}</div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
              <IdCard className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Mandatory Entry</div>
              <div className="text-xs font-bold text-emerald-300 mt-0.5">Physical College ID Card</div>
            </div>
          </div>

          {/* Already Registered? Digital Pass CTA */}
          <div className="p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div>
              <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 mb-1">
                <Ticket className="w-4 h-4 text-cyan-400" />
                <span>Already Registered Your Team?</span>
              </div>
              <p className="text-xs text-gray-300">
                Look up your official digital pass, dynamic team roster, and download your entry ticket PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenPass}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] transition cursor-pointer whitespace-nowrap"
            >
              🪪 Access Digital Pass
            </button>
          </div>

          {/* Official WhatsApp Group Box */}
          <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
              <MessageCircle className="w-4 h-4" />
              <span>Official Participant WhatsApp Group</span>
            </div>
            <p className="text-xs text-gray-400 max-w-lg mx-auto mb-4">
              All registered team leaders and members should join the official broadcast group for real-time announcements, track schedules, desk allocations, and mentorship updates.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="p-1.5 bg-white rounded-xl shadow-md">
                <img
                  src="./whatsapp_qr.png"
                  alt="Synora WhatsApp QR"
                  className="w-24 h-24 rounded-lg object-contain"
                  onError={(e) => {
                    // Fallback to QR API
                    (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(EVENT_DETAILS.whatsappGroupUrl)}`;
                  }}
                />
              </div>
              <div className="text-center sm:text-left">
                <a
                  href={EVENT_DETAILS.whatsappGroupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#25d366] hover:bg-[#20ba59] text-white text-xs font-bold shadow-[0_0_20px_rgba(37,211,102,0.4)] transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Join WhatsApp Group →</span>
                </a>
                <div className="text-[11px] text-gray-400 mt-2">
                  For registered Team Leaders & Members
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
