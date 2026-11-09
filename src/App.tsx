import React, { useState, useEffect } from 'react';
import { CanvasBackground } from './components/home/CanvasBackground';
import { CustomCursor } from './components/home/CustomCursor';
import { Navbar } from './components/layout/Navbar';
import { Hero } from './components/home/Hero';
import { Stats } from './components/home/Stats';
import { About } from './components/home/About';
import { Timeline } from './components/home/Timeline';
import { Prizes } from './components/home/Prizes';
import { FAQ } from './components/home/FAQ';
import { RegistrationSection } from './components/home/RegistrationSection';
import { FacultyCoordinators } from './components/home/FacultyCoordinators';
import { FacultyOrganizers } from './components/home/FacultyOrganizers';
import { ContactSection } from './components/home/ContactSection';
import { TermsModal } from './components/home/TermsModal';
import { Footer } from './components/layout/Footer';
import { DigitalPassView } from './components/pass/DigitalPassView';
import { OrganizerPortal } from './components/organizer/OrganizerPortal';
import { Ticket } from 'lucide-react';
import { soundFX } from './utils/audio';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'home' | 'pass' | 'organizer'>('home');
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState<string>('SYN26-XC9Y-P362');
  const [selectedPassEmail, setSelectedPassEmail] = useState<string>('');

  useEffect(() => {
    // Detect URL params or hash for deep linking
    const handleUrlRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();

      if (path.includes('organizer') || hash === '#organizer' || search.includes('organizer') || search.includes('admin')) {
        setActiveView('organizer');
      } else if (path.includes('pass') || hash === '#pass' || search.includes('id=') || search.includes('pass=')) {
        setActiveView('pass');
      } else {
        setActiveView('home');
      }
    };

    handleUrlRoute();
    window.addEventListener('hashchange', handleUrlRoute);
    window.addEventListener('popstate', handleUrlRoute);

    return () => {
      window.removeEventListener('hashchange', handleUrlRoute);
      window.removeEventListener('popstate', handleUrlRoute);
    };
  }, []);

  const navigateToView = (view: 'home' | 'pass' | 'organizer') => {
    soundFX.playClick();
    setActiveView(view);
    if (view === 'home') {
      window.history.pushState({}, '', window.location.pathname);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.history.pushState({}, '', `#${view}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToSection = (sectionId: string) => {
    soundFX.playClick();
    if (activeView !== 'home') {
      setActiveView('home');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent text-white selection:bg-orange-500 selection:text-black">
      {/* 3D Particle Constellation Canvas */}
      <CanvasBackground />

      {/* Cyber Neon Cursor Follower */}
      <CustomCursor />

      {/* Top Sticky Navigation (Rendered on Home & Pass views) */}
      {activeView !== 'organizer' && (
        <Navbar
          onOpenPass={() => navigateToView('pass')}
          onOpenOrganizer={() => navigateToView('organizer')}
          activeView={activeView}
          onNavigateHome={() => navigateToView('home')}
        />
      )}

      {/* Main Content Router */}
      <main>
        {activeView === 'home' && (
          <>
            <Hero
              onOpenPass={() => navigateToView('pass')}
              onViewSchedule={() => scrollToSection('timeline')}
            />
            <Stats />
            <About />
            <Timeline />
            <Prizes />
            <FAQ onOpenTerms={() => setIsTermsOpen(true)} />
            <RegistrationSection
              onPassGenerated={(teamId, email) => {
                setSelectedPassId(teamId);
                setSelectedPassEmail(email || '');
                navigateToView('pass');
              }}
              onOpenTerms={() => setIsTermsOpen(true)}
            />
            <FacultyCoordinators />
            <FacultyOrganizers />
            <ContactSection />
          </>
        )}

        {activeView === 'pass' && (
          <DigitalPassView
            onBack={() => navigateToView('home')}
            onOpenOrganizer={() => navigateToView('organizer')}
            initialQuery={selectedPassId}
            initialEmail={selectedPassEmail}
          />
        )}

        {activeView === 'organizer' && (
          <OrganizerPortal
            onBackToHome={() => navigateToView('home')}
            onOpenPass={(teamId) => {
              setSelectedPassId(teamId);
              navigateToView('pass');
            }}
          />
        )}
      </main>

      {/* Shared Terms Modal */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      {/* Site Footer (Rendered on Home & Pass views) */}
      {activeView !== 'organizer' && (
        <Footer
          onOpenTerms={() => setIsTermsOpen(true)}
          onOpenPass={() => navigateToView('pass')}
          onOpenOrganizer={() => navigateToView('organizer')}
        />
      )}

      {/* Mobile Floating Pass Action Pill */}
      {activeView === 'home' && (
        <div className="sm:hidden fixed bottom-4 right-4 z-40">
          <button
            type="button"
            onClick={() => navigateToView('pass')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-[0_4px_20px_rgba(249,115,22,0.4)] border border-orange-400/50 cursor-pointer"
          >
            <Ticket className="w-4 h-4 text-orange-300" />
            <span>Digital Pass</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
