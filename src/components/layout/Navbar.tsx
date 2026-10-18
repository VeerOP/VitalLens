import React from 'react';
import {
  HeartPulse,
  Activity,
  Wind,
  LineChart,
  Bot,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { triggerHaptic } from '../../lib/utils/haptics';

export type TabType =
  | 'home'
  | 'scan-finger'
  | 'scan-face'
  | 'breathing'
  | 'assistant'
  | 'history'
  | 'settings'
  | 'about'
  | 'readiness'
  | 'journal'
  | 'medications';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const handleTabClick = (tab: TabType) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  return (
    <>
      {/* Top Header — Sticky translucent glass, safe-area aware, restrained */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-[var(--border-color)]/80 px-4 pt-safe transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-4xl mx-auto h-12 flex items-center justify-between">
          {/* Brand Logo & Clean Title */}
          <button
            onClick={() => handleTabClick('home')}
            className="flex items-center gap-2 bg-transparent border-none cursor-pointer text-left focus:outline-none"
          >
            <div className="w-7 h-7 rounded-lg bg-[var(--teal-subtle)] text-[var(--teal-primary)] flex items-center justify-center shrink-0">
              <HeartPulse className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="font-semibold text-base tracking-tight text-[var(--text-primary)]">
              VitalLens
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[var(--bg-surface-subtle)] p-1 rounded-lg border border-[var(--border-color)]">
            <button
              onClick={() => handleTabClick('home')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleTabClick('scan-finger')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'scan-finger' || activeTab === 'scan-face'
                  ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 stroke-[2]" />
              <span>Measure</span>
            </button>
            <button
              onClick={() => handleTabClick('breathing')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'breathing'
                  ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Wind className="w-3.5 h-3.5 stroke-[2]" />
              <span>Pacer</span>
            </button>
            <button
              onClick={() => handleTabClick('history')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LineChart className="w-3.5 h-3.5 stroke-[2]" />
              <span>Records</span>
            </button>
            <button
              onClick={() => handleTabClick('assistant')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'assistant'
                  ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Bot className="w-3.5 h-3.5 stroke-[2]" />
              <span>Consult</span>
            </button>
            <button
              onClick={() => handleTabClick('about')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1 ${
                activeTab === 'about'
                  ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Methodology & Validation"
            >
              <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </nav>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleTabClick('settings')}
              className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
                activeTab === 'settings'
                  ? 'bg-[var(--teal-subtle)] text-[var(--teal-primary)] border-[var(--teal-primary)]'
                  : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
              }`}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 stroke-[1.8]" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile iPhone Bottom Tab Bar — Native Apple Health Architecture with Glassy Blur */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-[var(--border-color)]/70 px-2 pt-1 pb-safe flex items-center justify-around transition-all shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        {/* Tab 1: Today Overview */}
        <button
          onClick={() => handleTabClick('home')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'home'
              ? 'text-[var(--teal-primary)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          aria-label="Today Overview"
        >
          <HeartPulse className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] tracking-tight">Today</span>
        </button>

        {/* Tab 2: Measure (Fingertip) */}
        <button
          onClick={() => handleTabClick('scan-finger')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'scan-finger' || activeTab === 'scan-face'
              ? 'text-[var(--teal-primary)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          aria-label="Measure Vitals"
        >
          <Activity className={`w-5 h-5 ${activeTab === 'scan-finger' || activeTab === 'scan-face' ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] tracking-tight">Measure</span>
        </button>

        {/* Tab 3: Biofeedback Pacer */}
        <button
          onClick={() => handleTabClick('breathing')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'breathing'
              ? 'text-[var(--teal-primary)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          aria-label="Breathing Pacer"
        >
          <Wind className={`w-5 h-5 ${activeTab === 'breathing' ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] tracking-tight">Pacer</span>
        </button>

        {/* Tab 4: Records / Trends */}
        <button
          onClick={() => handleTabClick('history')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'text-[var(--teal-primary)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          aria-label="Health Records"
        >
          <LineChart className={`w-5 h-5 ${activeTab === 'history' ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] tracking-tight">Records</span>
        </button>

        {/* Tab 5: AI Clinician Consultation */}
        <button
          onClick={() => handleTabClick('assistant')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'assistant'
              ? 'text-[var(--teal-primary)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          aria-label="AI Consultation"
        >
          <Bot className={`w-5 h-5 ${activeTab === 'assistant' ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] tracking-tight">Consult</span>
        </button>
      </nav>
    </>
  );
};
