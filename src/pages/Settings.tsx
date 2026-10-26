import React, { useState } from 'react';
import { clearAllScanHistory } from '../lib/storage/historyStore';
import {
  Settings as SettingsIcon,
  Trash2,
  Check,
  ShieldCheck,
  ArrowLeft,
  User,
  LogOut,
  BadgeCheck,
  Database,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Unplug,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { triggerHaptic } from '../lib/utils/haptics';
import type { AuthUser } from '../lib/storage/authStore';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from '../lib/storage/supabaseClient';
import {
  syncAllLocalToSupabase,
  syncSupabaseToLocal,
} from '../lib/storage/supabaseService';
import {
  validateGeminiKey,
  cleanGeminiKey,
} from '../lib/ai/healthBotEngine';

interface SettingsProps {
  onBack: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack, currentUser, onLogout }) => {
  const [cleared, setCleared] = useState(false);
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return cleanGeminiKey(localStorage.getItem('vitallens_gemini_key') || '');
  });
  const [savedKeyFeedback, setSavedKeyFeedback] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    testing: boolean;
    success?: boolean;
    model?: string;
    error?: string;
    latencyMs?: number;
  }>({ testing: false });

  // Supabase Cloud DB state
  const [supabaseConfig, setSupabaseConfigState] = useState(() => getSupabaseConfig());
  const [sbUrl, setSbUrl] = useState(supabaseConfig.url);
  const [sbKey, setSbKey] = useState(supabaseConfig.anonKey);
  const [savedSbFeedback, setSavedSbFeedback] = useState(false);
  const [testResult, setTestResult] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
    latencyMs?: number;
  }>({ testing: false });
  const [syncState, setSyncState] = useState<{
    syncing: boolean;
    message?: string;
    isError?: boolean;
  }>({ syncing: false });

  const handleClearHistory = () => {
    if (window.confirm('Delete all saved vitals history from your device?')) {
      clearAllScanHistory();
      setCleared(true);
      triggerHaptic('warning');
      setTimeout(() => setCleared(false), 3000);
    }
  };

  const handleSaveGeminiKey = () => {
    const cleaned = cleanGeminiKey(geminiKey);
    setGeminiKey(cleaned);
    if (cleaned) {
      localStorage.setItem('vitallens_gemini_key', cleaned);
    } else {
      localStorage.removeItem('vitallens_gemini_key');
    }
    setSavedKeyFeedback(true);
    triggerHaptic('success');
    setTimeout(() => setSavedKeyFeedback(false), 2500);
  };

  const handleTestGeminiKey = async () => {
    const cleaned = cleanGeminiKey(geminiKey);
    if (!cleaned || cleaned.length < 10) {
      setGeminiTestResult({
        testing: false,
        success: false,
        error: 'Please enter a valid Gemini API key (starts with AIzaSy...).',
      });
      return;
    }

    setGeminiTestResult({ testing: true });
    triggerHaptic('light');

    const result = await validateGeminiKey(cleaned);
    setGeminiTestResult({
      testing: false,
      success: result.success,
      model: result.model,
      error: result.error,
      latencyMs: result.latencyMs,
    });

    if (result.success) {
      triggerHaptic('success');
    } else {
      triggerHaptic('warning');
    }
  };

  const handleDisconnectGemini = () => {
    setGeminiKey('');
    localStorage.removeItem('vitallens_gemini_key');
    setGeminiTestResult({ testing: false });
    triggerHaptic('light');
  };

  const handleSaveSupabaseConfig = () => {
    if (!sbUrl.trim() || !sbKey.trim()) {
      alert('Please provide both Supabase Project URL and Anon Public Key.');
      return;
    }
    saveSupabaseConfig(sbUrl, sbKey);
    const updated = getSupabaseConfig();
    setSupabaseConfigState(updated);
    setSavedSbFeedback(true);
    triggerHaptic('success');
    setTimeout(() => setSavedSbFeedback(false), 2500);
  };

  const handleDisconnectSupabase = () => {
    if (window.confirm('Disconnect from external Supabase database? Local records in IndexedDB will be preserved.')) {
      clearSupabaseConfig();
      setSbUrl('');
      setSbKey('');
      setSupabaseConfigState(getSupabaseConfig());
      setTestResult({ testing: false });
      setSyncState({ syncing: false });
      triggerHaptic('light');
    }
  };

  const handleTestConnection = async () => {
    setTestResult({ testing: true });
    triggerHaptic('light');

    // If inputs modified but not saved yet, save them first
    if (sbUrl.trim() && sbKey.trim()) {
      saveSupabaseConfig(sbUrl, sbKey);
      setSupabaseConfigState(getSupabaseConfig());
    }

    const res = await testSupabaseConnection();
    setTestResult({
      testing: false,
      success: res.success,
      message: res.message,
      latencyMs: res.latencyMs,
    });

    if (res.success) {
      triggerHaptic('success');
    } else {
      triggerHaptic('warning');
    }
  };

  const handlePushToCloud = async () => {
    setSyncState({ syncing: true, message: 'Uploading local records to Supabase...' });
    triggerHaptic('light');

    const result = await syncAllLocalToSupabase();
    if (result.error) {
      setSyncState({ syncing: false, isError: true, message: `Upload failed: ${result.error}` });
      triggerHaptic('warning');
    } else {
      setSyncState({
        syncing: false,
        isError: false,
        message: `Successfully uploaded ${result.uploaded} record(s) to Supabase cloud!`,
      });
      triggerHaptic('success');
    }
    setTimeout(() => setSyncState({ syncing: false }), 4000);
  };

  const handlePullFromCloud = async () => {
    setSyncState({ syncing: true, message: 'Downloading records from Supabase...' });
    triggerHaptic('light');

    const result = await syncSupabaseToLocal();
    if (result.error) {
      setSyncState({ syncing: false, isError: true, message: `Download failed: ${result.error}` });
      triggerHaptic('warning');
    } else {
      setSyncState({
        syncing: false,
        isError: false,
        message: `Downloaded and synced ${result.downloaded} record(s) to local device!`,
      });
      triggerHaptic('success');
    }
    setTimeout(() => setSyncState({ syncing: false }), 4000);
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
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[var(--teal-primary)] stroke-[2]" />
            <span>Google Gemini AI Engine</span>
          </h3>
          {geminiKey ? (
            <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Configured (Active)</span>
            </span>
          ) : (
            <span className="text-[10px] font-semibold bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] px-2 py-0.5 rounded-full border border-[var(--border-color)]">
              Optional (Offline Clinician Active)
            </span>
          )}
        </div>

        <div className="p-3 bg-[var(--bg-surface-subtle)] rounded-lg border border-[var(--border-color)] space-y-2.5">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-primary)]">Gemini API Key</h4>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Enables multi-turn conversational health analysis, intelligent vitals interpretation, and clinical insights powered by Gemini.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  setGeminiTestResult({ testing: false });
                }}
                placeholder="AIzaSy..."
                className="flex-1 w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] font-mono"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleTestGeminiKey}
                  disabled={geminiTestResult.testing || !geminiKey.trim()}
                  className="clinical-btn-secondary min-h-[38px] flex-1 sm:flex-none text-xs font-mono shrink-0"
                >
                  {geminiTestResult.testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{geminiTestResult.testing ? 'Testing...' : 'Test Key'}</span>
                </button>
                <button
                  onClick={handleSaveGeminiKey}
                  className="clinical-btn-primary min-h-[38px] flex-1 sm:flex-none text-xs font-mono shrink-0"
                >
                  {savedKeyFeedback ? <Check className="w-3.5 h-3.5 stroke-[2]" /> : null}
                  <span>{savedKeyFeedback ? 'Saved' : 'Save Key'}</span>
                </button>
              </div>
            </div>

            {/* Test Connection Results */}
            {geminiTestResult.success && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 flex items-start gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Gemini API Connected Successfully!</div>
                  <div className="text-[11px] opacity-90">Model: {geminiTestResult.model} • Latency: {geminiTestResult.latencyMs}ms</div>
                </div>
              </div>
            )}

            {geminiTestResult.error && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-700 flex items-start gap-2 font-mono">
                <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Connection Failed</div>
                  <div className="text-[11px] opacity-90">{geminiTestResult.error}</div>
                </div>
              </div>
            )}

            {geminiKey && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleDisconnectGemini}
                  className="text-xs text-[var(--status-alert)] hover:underline font-mono cursor-pointer flex items-center gap-1"
                >
                  <Unplug className="w-3 h-3" />
                  <span>Disconnect Key</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. External Cloud Database (Supabase PostgreSQL) */}
      <div className="clinical-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[var(--teal-primary)] stroke-[2]" />
            <span>External Cloud Database (Supabase)</span>
          </h3>
          {supabaseConfig.isConfigured ? (
            <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Connected ({supabaseConfig.source === 'env' ? '.env' : 'Custom'})</span>
            </span>
          ) : (
            <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
              Local Only (Offline)
            </span>
          )}
        </div>

        <div className="p-3 bg-[var(--bg-surface-subtle)] rounded-lg border border-[var(--border-color)] space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-primary)]">PostgreSQL Cloud Synchronization</h4>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
              Connect an external Supabase PostgreSQL database to replicate vitals scans across devices and backup patient records.
            </p>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                Project URL
              </label>
              <input
                type="text"
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                Anon / Public API Key
              </label>
              <input
                type="password"
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleSaveSupabaseConfig}
              className="clinical-btn-primary min-h-[36px] text-xs font-mono shrink-0"
            >
              {savedSbFeedback ? <Check className="w-3.5 h-3.5 stroke-[2]" /> : <Cloud className="w-3.5 h-3.5 stroke-[2]" />}
              <span>{savedSbFeedback ? 'Saved' : 'Save Credentials'}</span>
            </button>

            <button
              onClick={handleTestConnection}
              disabled={testResult.testing}
              className="clinical-btn-secondary min-h-[36px] text-xs shrink-0 cursor-pointer disabled:opacity-50"
            >
              {testResult.testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 stroke-[2]" />
              )}
              <span>{testResult.testing ? 'Testing...' : 'Test Connection'}</span>
            </button>

            {supabaseConfig.isConfigured && (
              <>
                <button
                  onClick={handlePushToCloud}
                  disabled={syncState.syncing}
                  className="clinical-btn-secondary min-h-[36px] text-xs shrink-0 cursor-pointer disabled:opacity-50"
                  title="Push all local scans to Supabase"
                >
                  <CloudUpload className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Push Local to Cloud</span>
                </button>

                <button
                  onClick={handlePullFromCloud}
                  disabled={syncState.syncing}
                  className="clinical-btn-secondary min-h-[36px] text-xs shrink-0 cursor-pointer disabled:opacity-50"
                  title="Pull cloud scans into local database"
                >
                  <CloudDownload className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Pull from Cloud</span>
                </button>

                <button
                  onClick={handleDisconnectSupabase}
                  className="clinical-btn-secondary min-h-[36px] text-xs text-[var(--status-alert)] border-[var(--border-color)] hover:bg-[var(--status-alert-bg)] shrink-0 cursor-pointer"
                  title="Clear credentials and disconnect"
                >
                  <Unplug className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Disconnect</span>
                </button>
              </>
            )}
          </div>

          {/* Test Result Message Box */}
          {testResult.message && (
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              )}
              <div className="flex-1 leading-snug">
                <span>{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Sync Status Feedback */}
          {syncState.message && (
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                syncState.isError
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  : 'bg-[var(--teal-subtle)] border-[var(--teal-primary)]/30 text-[var(--teal-primary)]'
              }`}
            >
              {syncState.syncing ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : syncState.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span className="flex-1">{syncState.message}</span>
            </div>
          )}

          {/* Schema setup notice */}
          <div className="p-2.5 bg-[var(--bg-surface)] rounded-md border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] space-y-1">
            <span className="font-semibold text-[var(--text-primary)] block">Database Schema:</span>
            <p>
              Execute <code className="px-1 py-0.5 bg-[var(--bg-surface-subtle)] rounded text-[10px] font-mono border border-[var(--border-color)]">supabase_schema.sql</code> in your Supabase SQL Editor to create the <code className="font-mono text-[10px]">vitals_records</code> table with Row Level Security.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Storage & Data Persistence */}
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
