import React, { useState } from 'react';
import {
  Droplets,
  Moon,
  Zap,
  Activity,
  Plus,
  Minus,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DailyHealthLog } from '../../lib/storage/dailyLogStore';
import { saveTodayHealthLog } from '../../lib/storage/dailyLogStore';
import { triggerHaptic } from '../../lib/utils/haptics';

interface DailyCheckInCardProps {
  initialLog: DailyHealthLog;
  onLogUpdated: (updated: DailyHealthLog) => void;
  onViewFullPage?: () => void;
}

const SYMPTOM_OPTIONS = [
  'None / Normal',
  'Fatigue',
  'Headache',
  'Palpitations',
  'Shortness of breath',
  'Muscle soreness',
];

export const DailyCheckInCard: React.FC<DailyCheckInCardProps> = ({
  initialLog,
  onLogUpdated,
  onViewFullPage,
}) => {
  const [log, setLog] = useState<DailyHealthLog>(initialLog);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const updateField = (partial: Partial<DailyHealthLog>) => {
    triggerHaptic('light');
    const updated = saveTodayHealthLog(partial);
    setLog(updated);
    onLogUpdated(updated);
  };

  const adjustWater = (delta: number) => {
    const next = Math.max(0, Math.min(16, (log.waterGlasses || 0) + delta));
    updateField({ waterGlasses: next });
  };

  const toggleSymptom = (symptom: string) => {
    let next: string[] = [];
    if (symptom === 'None / Normal') {
      next = [];
    } else {
      const current = log.symptoms || [];
      if (current.includes(symptom)) {
        next = current.filter((s) => s !== symptom);
      } else {
        next = [...current.filter((s) => s !== 'None / Normal'), symptom];
      }
    }
    updateField({ symptoms: next });
  };

  const waterMl = log.waterGlasses * 250;
  const waterTargetMl = 2000;
  const waterPercent = Math.min(100, Math.round((waterMl / waterTargetMl) * 100));

  return (
    <div className="clinical-card p-4 space-y-3.5">
      {/* Header with expand/collapse toggle */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--teal-primary)]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
            Daily Health Check-in
          </h2>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsExpanded(!isExpanded);
          }}
          className="text-xs text-[var(--teal-primary)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
        >
          <span>{isExpanded ? 'Hide' : 'Log details'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 1. Interactive Hydration (Always visible, clean 1-tap tracker) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
            <Droplets className="w-3.5 h-3.5 text-[var(--teal-primary)] stroke-[2]" />
            <span>Hydration</span>
          </div>
          <span className="font-mono text-xs text-[var(--text-secondary)] tabular-nums">
            {(waterMl / 1000).toFixed(1)} L / 2.0 L ({log.waterGlasses} glasses)
          </span>
        </div>

        {/* 8-Segment Interactive Water Droplet Bar */}
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 8 }).map((_, idx) => {
            const isFilled = idx < log.waterGlasses;
            return (
              <button
                key={idx}
                onClick={() => {
                  triggerHaptic('light');
                  updateField({ waterGlasses: isFilled && idx === log.waterGlasses - 1 ? idx : idx + 1 });
                }}
                className={`h-7 rounded-md transition-all flex items-center justify-center cursor-pointer border ${
                  isFilled
                    ? 'bg-[var(--teal-primary)] text-white border-[var(--teal-primary)] shadow-xs'
                    : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--teal-primary)]'
                }`}
                title={`Glass ${idx + 1} (250ml)`}
                aria-label={`Water glass ${idx + 1}`}
              >
                <Droplets className="w-3 h-3 stroke-[2]" />
              </button>
            );
          })}
        </div>

        {/* Plus / Minus Quick Stepper */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            {waterPercent}% of 2L target
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustWater(-1)}
              disabled={log.waterGlasses <= 0}
              className="p-1 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
              title="Remove 1 glass"
            >
              <Minus className="w-3 h-3 stroke-[2]" />
            </button>
            <button
              onClick={() => adjustWater(1)}
              className="px-2 py-0.5 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs font-mono text-[var(--teal-primary)] hover:bg-[var(--teal-subtle)] flex items-center gap-1 cursor-pointer font-medium"
              title="Add 1 glass"
            >
              <Plus className="w-3 h-3 stroke-[2]" />
              <span>250ml</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Sections: Sleep, Stress, Symptoms */}
      {isExpanded && (
        <div className="space-y-3.5 pt-2 border-t border-[var(--border-color)] animate-in fade-in duration-200">
          {/* 2. Sleep Tracking */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                <Moon className="w-3.5 h-3.5 text-[var(--teal-primary)] stroke-[2]" />
                <span>Last Night's Sleep</span>
              </div>
              <span className="font-mono text-xs font-bold text-[var(--text-primary)] tabular-nums">
                {log.sleepHours.toFixed(1)} hrs
              </span>
            </div>

            {/* Hours Stepper & Quality Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateField({ sleepHours: Math.max(3, log.sleepHours - 0.5) })}
                className="p-1.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5 stroke-[2]" />
              </button>
              <div className="flex-1 text-center font-mono text-xs py-1.5 bg-[var(--bg-surface-subtle)] rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] font-semibold">
                {log.sleepHours} hours
              </div>
              <button
                onClick={() => updateField({ sleepHours: Math.min(14, log.sleepHours + 0.5) })}
                className="p-1.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>

            {/* Quality Segmented Pills */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {(['poor', 'fair', 'good', 'deep'] as const).map((q) => {
                const isSelected = log.sleepQuality === q;
                return (
                  <button
                    key={q}
                    onClick={() => updateField({ sleepQuality: q })}
                    className={`py-1.5 text-[11px] font-medium rounded-lg capitalize border transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[var(--teal-primary)] text-white border-[var(--teal-primary)] shadow-xs'
                        : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Energy & Stress Level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--text-primary)]">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[var(--teal-primary)] stroke-[2]" />
                <span>Energy & Stress</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Energy */}
              <div className="space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Energy</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['low', 'moderate', 'high'] as const).map((lvl) => {
                    const isSelected = log.energyLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        onClick={() => updateField({ energyLevel: lvl })}
                        className={`py-1 text-[10px] font-medium rounded capitalize border transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-[var(--teal-primary)] text-white border-[var(--teal-primary)]'
                            : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-color)]'
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stress */}
              <div className="space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Stress</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['calm', 'moderate', 'high'] as const).map((lvl) => {
                    const isSelected = log.stressLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        onClick={() => updateField({ stressLevel: lvl })}
                        className={`py-1 text-[10px] font-medium rounded capitalize border transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-[var(--teal-primary)] text-white border-[var(--teal-primary)]'
                            : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-color)]'
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Symptoms Tracker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--text-primary)]">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[var(--teal-primary)] stroke-[2]" />
                <span>Symptoms (Optional)</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {log.symptoms?.length ? `${log.symptoms.length} logged` : 'None'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_OPTIONS.map((sym) => {
                const isSelected =
                  sym === 'None / Normal'
                    ? !log.symptoms || log.symptoms.length === 0
                    : log.symptoms?.includes(sym);

                return (
                  <button
                    key={sym}
                    onClick={() => toggleSymptom(sym)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? sym === 'None / Normal'
                          ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--border-color)] font-semibold'
                          : 'bg-[var(--status-alert-bg)] text-[var(--status-alert)] border-[var(--border-color)] font-semibold'
                        : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    <span>{sym}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {onViewFullPage && (
        <div className="pt-1.5 border-t border-[var(--border-color)]">
          <button
            onClick={() => {
              triggerHaptic('light');
              onViewFullPage();
            }}
            className="text-xs text-[var(--teal-primary)] hover:underline flex items-center justify-between w-full font-semibold cursor-pointer"
          >
            <span>Open Full Health Journal</span>
            <span className="font-mono text-sm">→</span>
          </button>
        </div>
      )}
    </div>
  );
};
