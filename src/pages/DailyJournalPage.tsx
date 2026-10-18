import React, { useState } from 'react';
import {
  ArrowLeft,
  Droplets,
  Moon,
  Zap,
  ShieldAlert,
  Plus,
  Minus,
  Check,
  Calendar,
  FileText,
} from 'lucide-react';
import {
  getTodayHealthLog,
  saveTodayHealthLog,
  getPast7DaysSummaries,
} from '../lib/storage/dailyLogStore';
import type { DailyHealthLog } from '../lib/storage/dailyLogStore';
import { triggerHaptic } from '../lib/utils/haptics';

interface DailyJournalPageProps {
  onBack: () => void;
  onNavigateReadiness?: () => void;
}

const COMMON_SYMPTOMS = [
  'Fatigue',
  'Headache',
  'Muscle soreness',
  'Brain fog',
  'Dizziness',
  'Shortness of breath',
  'Cough',
  'Palpitations',
];

export const DailyJournalPage: React.FC<DailyJournalPageProps> = ({
  onBack,
  onNavigateReadiness,
}) => {
  const [log, setLog] = useState<DailyHealthLog>(() => getTodayHealthLog());
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [notesText, setNotesText] = useState(log.notes || '');

  const past7Days = getPast7DaysSummaries();

  const handleUpdate = (partial: Partial<DailyHealthLog>) => {
    triggerHaptic('light');
    const updated = saveTodayHealthLog(partial);
    setLog(updated);
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 1500);
  };

  const handleAdjustWater = (delta: number) => {
    const nextVal = Math.max(0, Math.min(16, log.waterGlasses + delta));
    handleUpdate({ waterGlasses: nextVal });
  };

  const handleToggleSymptom = (symptom: string) => {
    const current = log.symptoms || [];
    const exists = current.includes(symptom);
    const updated = exists ? current.filter((s) => s !== symptom) : [...current, symptom];
    handleUpdate({ symptoms: updated });
  };

  const handleSaveNotes = () => {
    handleUpdate({ notes: notesText.trim() });
  };

  const waterMl = log.waterGlasses * 250;
  const targetMl = 2000;
  const waterPct = Math.min(100, Math.round((waterMl / targetMl) * 100));

  return (
    <div className="space-y-4 pb-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            triggerHaptic('light');
            onBack();
          }}
          className="clinical-btn-secondary min-h-[36px] px-3 py-1 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[2]" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-mono">
          <Calendar className="w-3.5 h-3.5" />
          <span>{log.date}</span>
          {isSavedFeedback && (
            <span className="text-[var(--status-success)] flex items-center gap-1 font-sans text-[11px] ml-1">
              <Check className="w-3 h-3 stroke-[3]" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Page Title Card */}
      <div className="clinical-card p-4 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Daily Health Journal
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Log daily lifestyle inputs to refine your recovery and autonomic model.
            </p>
          </div>
          {onNavigateReadiness && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onNavigateReadiness();
              }}
              className="text-xs text-[var(--teal-primary)] hover:underline font-semibold shrink-0"
            >
              View Readiness →
            </button>
          )}
        </div>
      </div>

      {/* 1. Hydration Station */}
      <section className="clinical-card p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-600 stroke-[2]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">
              Hydration Balance
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
            {waterMl} <span className="text-[10px] text-[var(--text-secondary)] font-normal">/ {targetMl} ml</span>
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>Daily Target: 8 glasses (2.0L)</span>
            <span className="font-semibold text-[var(--text-primary)]">{waterPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden border border-[var(--border-color)]">
            <div
              className="h-full bg-cyan-600 rounded-full transition-all duration-300"
              style={{ width: `${waterPct}%` }}
            />
          </div>
        </div>

        {/* Quick Steppers & Glasses Grid */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAdjustWater(-1)}
              disabled={log.waterGlasses <= 0}
              className="w-9 h-9 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-40 active:scale-95 transition-all cursor-pointer"
              title="Remove 1 glass (-250ml)"
            >
              <Minus className="w-4 h-4 stroke-[2]" />
            </button>
            <div className="text-center px-2">
              <span className="text-lg font-bold font-mono text-[var(--text-primary)]">
                {log.waterGlasses}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block -mt-1">glasses</span>
            </div>
            <button
              onClick={() => handleAdjustWater(1)}
              className="w-9 h-9 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
              title="Add 1 glass (+250ml)"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAdjustWater(1)}
              className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] hover:border-cyan-600 transition-colors cursor-pointer"
            >
              +250ml
            </button>
            <button
              onClick={() => handleAdjustWater(2)}
              className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 transition-colors cursor-pointer"
            >
              +500ml Bottle
            </button>
          </div>
        </div>
      </section>

      {/* 2. Sleep Architecture */}
      <section className="clinical-card p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-600 stroke-[2]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">
              Sleep Duration & Quality
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
            {log.sleepHours} hrs
          </span>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">Total Time Asleep:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUpdate({ sleepHours: Math.max(3, +(log.sleepHours - 0.5).toFixed(1)) })}
              className="w-8 h-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2]" />
            </button>
            <span className="w-16 text-center text-sm font-bold font-mono text-[var(--text-primary)]">
              {log.sleepHours} h
            </span>
            <button
              onClick={() => handleUpdate({ sleepHours: Math.min(13, +(log.sleepHours + 0.5).toFixed(1)) })}
              className="w-8 h-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Quality Selector */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] text-[var(--text-secondary)] block">Sleep Restfulness:</span>
          <div className="grid grid-cols-4 gap-2">
            {(['poor', 'fair', 'good', 'deep'] as const).map((q) => (
              <button
                key={q}
                onClick={() => handleUpdate({ sleepQuality: q })}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium capitalize border transition-all cursor-pointer ${
                  log.sleepQuality === q
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-semibold'
                    : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] text-[var(--text-secondary)]'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Energy & Stress State */}
      <section className="clinical-card p-4 space-y-3.5">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2.5">
          <Zap className="w-4 h-4 text-amber-500 stroke-[2]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">
            Energy & Stress State
          </h2>
        </div>

        {/* Energy Level */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-[var(--text-secondary)] block">Energy Level:</span>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'moderate', 'high'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleUpdate({ energyLevel: lvl })}
                className={`py-2 px-2 rounded-lg text-xs font-medium capitalize border transition-all cursor-pointer ${
                  log.energyLevel === lvl
                    ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                    : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] text-[var(--text-secondary)]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Stress Level */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
          <span className="text-[11px] text-[var(--text-secondary)] block">Perceived Stress:</span>
          <div className="grid grid-cols-4 gap-1.5">
            {(['relaxed', 'calm', 'moderate', 'high'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleUpdate({ stressLevel: lvl })}
                className={`py-1.5 px-1 text-center rounded-lg text-xs font-medium capitalize border transition-all cursor-pointer ${
                  log.stressLevel === lvl
                    ? 'bg-teal-50 border-teal-300 text-[var(--teal-primary)] font-semibold'
                    : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] text-[var(--text-secondary)]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Clinical Symptoms Log */}
      <section className="clinical-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 stroke-[2]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">
              Symptom Checklist
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)]">
            {(log.symptoms || []).length === 0 ? 'None selected' : `${log.symptoms.length} reported`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {COMMON_SYMPTOMS.map((sym) => {
            const isSelected = (log.symptoms || []).includes(sym);
            return (
              <button
                key={sym}
                onClick={() => handleToggleSymptom(sym)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                    : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {isSelected ? `✓ ${sym}` : `+ ${sym}`}
              </button>
            );
          })}
        </div>

        {/* Clinical Notes input */}
        <div className="pt-2">
          <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
            Notes / Observations:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="e.g., Felt energized after 30min walk..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--teal-primary)]"
            />
            <button
              onClick={handleSaveNotes}
              className="clinical-btn-secondary px-3 py-1 text-xs"
            >
              Save
            </button>
          </div>
        </div>
      </section>

      {/* 5. 7-Day Journal Log History */}
      <section className="clinical-card p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2.5">
          <FileText className="w-4 h-4 text-[var(--teal-primary)] stroke-[2]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">
            Past 7 Days History
          </h2>
        </div>

        <div className="divide-y divide-[var(--border-color)] text-xs">
          {past7Days.map((d) => (
            <div key={d.date} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-[var(--text-primary)]">{d.fullDateLabel}</span>
                <span className="text-[10px] text-[var(--text-secondary)] ml-2 font-mono">({d.dayLabel})</span>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] mt-0.5">
                  <span>Sleep: {d.sleepHours}h ({d.sleepQuality})</span>
                  <span>•</span>
                  <span>Water: {d.waterGlasses * 250}ml</span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono font-semibold text-[var(--teal-primary)]">
                  {d.readinessScore} <span className="text-[10px] text-[var(--text-secondary)]">Score</span>
                </span>
                <div className="text-[10px] text-[var(--text-secondary)] capitalize">
                  {d.energyLevel} energy
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
