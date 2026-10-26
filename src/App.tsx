import { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import type { TabType } from './components/layout/Navbar';
import { PwaInstallBanner } from './components/layout/PwaInstallBanner';
import { Home } from './pages/Home';
import { ScanFingertip } from './pages/ScanFingertip';
import { ScanFace } from './pages/ScanFace';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { About } from './pages/About';
import { BreathingPacer } from './pages/BreathingPacer';
import { HealthAssistant } from './pages/HealthAssistant';
import { ReadinessPage } from './pages/ReadinessPage';
import { DailyJournalPage } from './pages/DailyJournalPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { AuthPage } from './pages/AuthPage';
import { getCurrentUser, logoutUser, subscribeAuth } from './lib/storage/authStore';
import type { AuthUser } from './lib/storage/authStore';
import type { VitalsContext } from './lib/ai/healthBotEngine';
import { HeartPulse } from 'lucide-react';

const VALID_TABS: TabType[] = [
  'home',
  'scan-finger',
  'scan-face',
  'breathing',
  'assistant',
  'history',
  'settings',
  'about',
  'readiness',
  'journal',
  'medications',
];

export function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    const hash = window.location.hash.replace('#', '') as TabType;
    return VALID_TABS.includes(hash) ? hash : 'home';
  });
  const [latestVitals, setLatestVitals] = useState<VitalsContext | undefined>(undefined);

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    if (window.location.hash.replace('#', '') !== tab) {
      window.location.hash = tab;
    }
  };

  useEffect(() => {
    const unsub = subscribeAuth((user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('vitallens_theme');

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabType;
      if (VALID_TABS.includes(hash)) {
        setActiveTabState(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenAssistant = (vitals?: any) => {
    if (vitals) {
      setLatestVitals(vitals);
    }
    setActiveTab('assistant');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-start sm:justify-center bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors px-4 py-8 pt-safe pb-safe overflow-y-auto">
        <main className="w-full max-w-md mx-auto my-auto py-4">
          <AuthPage onLoginSuccess={(user) => setCurrentUser(user)} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors overflow-x-hidden">
      {/* Safe Area Aware Top Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Viewport (Mobile-first responsive layout) */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-3 pb-28 md:pb-8 overflow-x-hidden min-w-0">
        {/* Safari Add to Home Screen PWA Helper Banner */}
        <PwaInstallBanner />
        {activeTab === 'home' && (
          <Home
            currentUser={currentUser}
            onStartFingertipScan={() => setActiveTab('scan-finger')}
            onStartFaceScan={() => setActiveTab('scan-face')}
            onViewHistory={() => setActiveTab('history')}
            onViewAbout={() => setActiveTab('about')}
            onStartBreathing={() => setActiveTab('breathing')}
            onOpenAssistant={() => handleOpenAssistant()}
            onNavigateReadiness={() => setActiveTab('readiness')}
            onNavigateJournal={() => setActiveTab('journal')}
            onNavigateMedications={() => setActiveTab('medications')}
          />
        )}

        {activeTab === 'scan-finger' && (
          <ScanFingertip
            onBack={() => setActiveTab('home')}
            onViewHistory={() => setActiveTab('history')}
            onOpenAssistantWithVitals={handleOpenAssistant}
          />
        )}

        {activeTab === 'scan-face' && (
          <ScanFace
            onBack={() => setActiveTab('home')}
            onViewHistory={() => setActiveTab('history')}
            onOpenAssistantWithVitals={handleOpenAssistant}
          />
        )}

        {activeTab === 'breathing' && (
          <BreathingPacer
            onBack={() => setActiveTab('home')}
            onStartFingertipScan={() => setActiveTab('scan-finger')}
          />
        )}

        {activeTab === 'assistant' && (
          <HealthAssistant
            onBack={() => setActiveTab('home')}
            vitalsContext={latestVitals}
            onNavigateBreathing={() => setActiveTab('breathing')}
          />
        )}

        {activeTab === 'history' && (
          <History
            onBack={() => setActiveTab('home')}
            onNewScan={() => setActiveTab('scan-finger')}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            onBack={() => setActiveTab('home')}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'about' && <About onBack={() => setActiveTab('home')} />}

        {activeTab === 'readiness' && (
          <ReadinessPage
            onBack={() => setActiveTab('home')}
            onStartBreathing={() => setActiveTab('breathing')}
            onStartMeasurement={() => setActiveTab('scan-finger')}
            onOpenJournal={() => setActiveTab('journal')}
          />
        )}

        {activeTab === 'journal' && (
          <DailyJournalPage
            onBack={() => setActiveTab('home')}
            onNavigateReadiness={() => setActiveTab('readiness')}
          />
        )}

        {activeTab === 'medications' && (
          <MedicationsPage
            onBack={() => setActiveTab('home')}
          />
        )}
      </main>

      {/* Desktop Supplementary Footer */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] py-4 px-4 text-xs text-[var(--text-secondary)] hidden md:block">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[var(--teal-subtle)] text-[var(--teal-primary)] flex items-center justify-center">
              <HeartPulse className="w-3.5 h-3.5 stroke-[2]" />
            </div>
            <span className="font-semibold text-[var(--text-primary)]">VitalLens</span>
            <span className="text-[var(--text-muted)]">— Clinical Optical Photoplethysmography</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('about')}
              className="text-[var(--text-secondary)] hover:text-[var(--teal-primary)] transition-colors cursor-pointer"
            >
              Methodology
            </button>
            <span className="text-[var(--border-color)]">•</span>
            <button
              onClick={() => setActiveTab('settings')}
              className="text-[var(--text-secondary)] hover:text-[var(--teal-primary)] transition-colors cursor-pointer"
            >
              Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
