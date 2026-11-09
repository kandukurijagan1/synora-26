import React from 'react';
import { X, ShieldAlert, IdCard, Award, Users, BookOpen } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[85vh] rounded-3xl glass-card border border-red-500/40 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(124,58,237,0.3)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-[#0f0728] to-[#1e1035] border-b border-red-500/40 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-orange-300 uppercase tracking-widest">
              CRISPR WORKSHOP GUIDELINES
            </div>
            <h3 className="font-display font-extrabold text-xl text-white mt-0.5">
              📜 Workshop Terms & Guidelines
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
          {/* Term 1 */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="font-bold text-orange-400 mb-1 flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>1. Delegate Eligibility & Categories</span>
            </div>
            <p className="text-gray-400">
              The workshop on <strong>"CRISPR Gene Editing Technologies"</strong> is open to all UG/PG students, Ph.D. scholars, and Faculty members from Biotechnology, Biomedical, Life Sciences, Pharmacy, and allied engineering streams.
            </p>
          </div>

          {/* Term 2 - Refund Policy */}
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30">
            <div className="font-bold text-red-300 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>2. Registration Fee & Strict Non-Refund Policy</span>
            </div>
            <p className="text-red-200">
              Registration fees (<strong>₹200 for Students</strong> · <strong>₹500 for Faculty/Researchers</strong>) are non-refundable once registered. Seat allocation in RB Seminar Hall is confirmed upon successful fee verification.
            </p>
          </div>

          {/* Term 3 */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="font-bold text-orange-400 mb-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>3. In Silico Hands-on Sessions & Laptops</span>
            </div>
            <p className="text-gray-400">
              Delegates are encouraged to bring a personal laptop for the hands-on in silico sgRNA design, Benchling workflows, and bioinformatics off-target screening modules.
            </p>
          </div>

          {/* Term 4 - Mandatory ID */}
          <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-500/30">
            <div className="font-bold text-orange-300 mb-1 flex items-center gap-2">
              <IdCard className="w-4 h-4 text-orange-400" />
              <span>4. Mandatory Physical Institutional ID Cards & Reporting</span>
            </div>
            <p className="text-orange-100">
              <strong className="text-white">All delegates must carry physical institutional ID cards.</strong> Verification and badge collection starts at <strong>08:30 AM on November 20, 2026</strong> at <strong>RB Seminar Hall, SIMATS Engineering</strong>.
            </p>
          </div>

          {/* Term 5 */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="font-bold text-orange-400 mb-1 flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>5. Official IET Certification</span>
            </div>
            <p className="text-gray-400">
              Official Certificates of Participation sponsored by the <strong>Institute of Engineering and Technology (IET)</strong> and SIMATS Engineering will be awarded to all verified attendees during the valedictory session.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#090514] border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500 transition shadow-[0_0_15px_rgba(249,115,22,0.3)] cursor-pointer"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
