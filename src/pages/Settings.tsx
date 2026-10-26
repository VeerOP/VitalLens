import React, { useState } from 'react';
import { clearAllScanHistory } from '../lib/storage/historyStore';
import {
  Settings as SettingsIcon,
  Trash2,
  Check,
  Key,
  ShieldCheck,
  ArrowLeft,
  User,
  LogOut,
  BadgeCheck,
} from 'lucide-react';
import { triggerHaptic } from '../lib/utils/haptics';
import type { AuthUser } from '../lib/storage/authStore';

interface SettingsProps {
  onBack: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack, currentUser, onLogout }) => {
  const [cleared, setCleared] = useState(false);
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return localStorage.getItem('vitallens_gemini_key') || '';
  });
  const [savedKeyFeedback, setSavedKeyFeedback] = useState(false);

  const handleClearHistory = () => {
    if (window.confirm('Delete all saved vitals history from your device?')) {
      clearAllScanHistory();
      setCleared(true);
      triggerHaptic('warning');
      setTimeout(() => setCleared(false), 3000);
    }
  };

  const handleSaveGeminiKey = () => {
    localStorage.setItem('vitallens_gemini_key', geminiKey.trim());
    setSavedKeyFeedback(true);
    triggerHaptic('success');
    setTimeout(() => setSavedKeyFeedback(false), 2500);
  };

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-200">
      <div className="border-b border-[var(--border-color)] pb-3">
        <button
          onClick={onBack}
          className="clinical-btn-secondary min-h-[34px] px-2.5 py-1 text-xs mb-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[2]" />
          <span>Dashboard</span>
        </button>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-[var(--teal-primary)] stroke-[2]" />
          <span>Settings</span>
        </h1>
      </div>

      {/* 0. Account Profile & Session Management */}
      {currentUser && (
        <div className="clinical-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <User className="w-4 h-4 text-[var(--teal-primary)] stroke-[2]" />
              <span>Active Account Session</span>
            </h3>
            <span className="text-[10px] font-semibold bg-[var(--teal-subtle)] text-[var(--teal-primary)] px-2 py-0.5 rounded-full border border-[var(--teal-primary)]/20">
              Authenticated
            </span>
          </div>

          <div className="p-3 bg-[var(--bg-surface-subtle)] rounded-lg border border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--teal-subtle)] text-[var(--teal-primary)] font-bold text-base flex items-center justify-center border border-[var(--teal-primary)]/30 shrink-0">
                {currentUser.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {currentUser.fullName}
                  </h4>
                  <span className="text-[10px] font-medium text-[var(--teal-primary)] bg-white px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                  @{currentUser.username} {currentUser.email ? `• ${currentUser.email}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <BadgeCheck className="w-3.5 h-3.5 text-[var(--teal-primary)] stroke-[2]" />
                <span>Encrypted local session</span>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    if (window.confirm('Are you sure you want to log out?')) {
                      onLogout();
                    }
                  }}
                  className="clinical-btn-secondary min-h-[34px] px-3 py-1 text-xs text-[var(--status-alert)] border-[var(--border-color)] hover:bg-[var(--status-alert-bg)] shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. AI Assistant Configuration */}
      <div className="clinical-card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <Key className="w-4 h-4 text-[var(--teal-primary)] stroke-[2]" />
          <span>Google Gemini AI</span>
        </h3>
        <div className="p-3 bg-[var(--bg-surface-subtle)] rounded-lg border border-[var(--border-color)] space-y-2.5">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-primary)]">Gemini API Key</h4>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Enter an optional Gemini API key to enable conversational health advice.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] font-mono"
            />
            <button
              onClick={handleSaveGeminiKey}
              className="clinical-btn-primary min-h-[38px] w-full sm:w-auto text-xs font-mono shrink-0"
            >
              {savedKeyFeedback ? <Check className="w-3.5 h-3.5 stroke-[2]" /> : null}
              <span>{savedKeyFeedback ? 'Saved' : 'Save Key'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Storage & Data Persistence */}
      <div className="clinical-card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[var(--teal-primary)] stroke-[2]" />
          <span>Data & Privacy</span>
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-[var(--bg-surface-subtle)] rounded-lg border border-[var(--border-color)]">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-primary)]">On-Device Storage</h4>
            <p className="text-[11px] text-[var(--text-secondary)]">All vitals records stay strictly on your device.</p>
          </div>

          <button
            onClick={handleClearHistory}
            className="clinical-btn-secondary min-h-[38px] w-full sm:w-auto text-xs px-3 text-[var(--status-alert)] border-[var(--border-color)] shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
            <span>{cleared ? 'History Cleared' : 'Clear All History'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
