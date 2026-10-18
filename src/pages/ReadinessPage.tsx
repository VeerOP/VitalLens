import React, { useState } from 'react';
import {
  ArrowLeft,
  Info,
  Zap,
  Moon,
  Activity,
  Droplets,
  TrendingUp,
  Sparkles,
  Wind,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  getTodayHealthLog,
  calculateHealthReadiness,
  getPast7DaysSummaries,
} from '../lib/storage/dailyLogStore';
import { getScanHistory } from '../lib/storage/historyStore';
import { ClinicalInfoModal } from '../components/modals/ClinicalInfoModal';
import { triggerHaptic } from '../lib/utils/haptics';

interface ReadinessPageProps {
  onBack: () => void;
  onStartBreathing?: () => void;
  onStartMeasurement?: () => void;
  onOpenJournal?: () => void;
}

export const ReadinessPage: React.FC<ReadinessPageProps> = ({
  onBack,
  onStartBreathing,
  onStartMeasurement,
  onOpenJournal,
}) => {
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const todayLog = getTodayHealthLog();
  const history = getScanHistory();
  const latestVital = history && history.length > 0 ? history[0] : undefined;

  const readiness = calculateHealthReadiness(
    latestVital
      ? {
          heartRate: latestVital.heartRate,
          hrvRmssd: latestVital.hrvRmssd,
          spo2: latestVital.spo2,
          recoveryScore: latestVital.recoveryScore,
        }
      : undefined,
    todayLog
  );

  const past7Days = getPast7DaysSummaries();
  const avg7DayScore = Math.round(
    past7Days.reduce((acc, curr) => acc + curr.readinessScore, 0) / past7Days.length
  );

  const getScoreColor = (score: number) => {
    if (score >= 82) return 'text-[var(--status-success)]';
    if (score >= 70) return 'text-[var(--teal-primary)]';
    if (score >= 55) return 'text-[var(--status-caution)]';
    return 'text-[var(--status-alert)]';
  };

  const getBarColor = (score: number) => {
    if (score >= 82) return 'bg-[var(--status-success)]';
    if (score >= 70) return 'bg-[var(--teal-primary)]';
    if (score >= 55) return 'bg-[var(--status-caution)]';
    return 'bg-[var(--status-alert)]';
  };

  return (
    <div className="space-y-4 pb-8 animate-in fade-in duration-200">
      {/* Top Navigation Bar */}
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

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsMethodologyOpen(true);
          }}
          className="clinical-btn-secondary min-h-[36px] px-2.5 py-1 text-xs text-[var(--teal-primary)] flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5 stroke-[2]" />
          <span>Methodology</span>
        </button>
      </div>

      {/* Main Readiness Hero Banner */}
      <div className="clinical-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-[var(--teal-primary)] stroke-[2] shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
                Autonomic Readiness
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Recovery Index
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Composite autonomic recovery and physiological capacity for today.
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${
              readiness.category === 'Optimal'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : readiness.category === 'Recovered'
                ? 'bg-teal-50 text-[var(--teal-primary)] border-teal-200'
                : readiness.category === 'Moderate'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {readiness.category}
          </span>
        </div>

        {/* Score Readout Gauge */}
        <div className="flex items-baseline gap-3 pt-1">
          <span className={`text-5xl font-bold tracking-tight tabular-nums ${getScoreColor(readiness.score)}`}>
            {readiness.score}
          </span>
          <div className="text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">/ 100</span>
            <div className="flex items-center gap-1 text-[11px] mt-0.5">
              <span>7-Day Baseline:</span>
              <strong className="text-[var(--text-primary)] font-mono">{avg7DayScore}</strong>
            </div>
          </div>
        </div>

        {/* Progress Fill Bar */}
        <div className="w-full h-2.5 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden border border-[var(--border-color)]">
          <div
            className={`h-full transition-all duration-700 ease-out ${getBarColor(readiness.score)}`}
            style={{ width: `${readiness.score}%` }}
          />
        </div>

        <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-subtle)] p-3 rounded-lg border border-[var(--border-color)] leading-relaxed">
          {readiness.recommendation}
        </p>
      </div>

      {/* 7-Day Trend Chart */}
      <section className="clinical-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--teal-primary)] stroke-[2]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">
              7-Day Readiness Trend
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">
            Avg: <strong className="text-[var(--text-primary)]">{avg7DayScore}</strong>
          </span>
        </div>

        {/* Bar Visualizer */}
        <div className="grid grid-cols-7 gap-2 pt-2 items-end h-32 px-1">
          {past7Days.map((day, idx) => {
            const isToday = idx === past7Days.length - 1;
            const heightPercent = Math.max(15, Math.min(100, day.readinessScore));
            return (
              <div key={day.date} className="flex flex-col items-center h-full justify-end gap-1.5">
                <span className="text-[10px] font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                  {day.readinessScore}
                </span>
                <div className="w-full bg-[var(--bg-surface-subtle)] rounded-t-md h-20 relative flex items-end overflow-hidden">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${getBarColor(day.readinessScore)} ${
                      isToday ? 'opacity-100 ring-2 ring-[var(--teal-primary)]/40' : 'opacity-85'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] tracking-tight ${
                    isToday
                      ? 'font-bold text-[var(--teal-primary)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3 Pillars Breakdown */}
      <section className="clinical-card p-4 space-y-3.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono border-b border-[var(--border-color)] pb-2">
          Pillars of Autonomic Recovery
        </h2>

        {/* Pillar 1: Sleep */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5 text-indigo-600 stroke-[2]" />
              <span className="font-semibold text-[var(--text-primary)]">Sleep Architecture</span>
            </div>
            <span className="font-mono font-medium text-[var(--text-primary)]">
              {readiness.sleepContribution} <span className="text-[10px] text-[var(--text-secondary)]">/ 25 pts</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${(readiness.sleepContribution / 25) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[var(--text-secondary)] pt-0.5">
            <span>Duration: <strong className="text-[var(--text-primary)]">{todayLog.sleepHours} hrs</strong></span>
            <span className="capitalize">Quality: <strong className="text-[var(--text-primary)]">{todayLog.sleepQuality}</strong></span>
          </div>
        </div>

        {/* Pillar 2: Vitals & Autonomic Tone */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[var(--teal-primary)] stroke-[2]" />
              <span className="font-semibold text-[var(--text-primary)]">Vitals & Autonomic Balance</span>
            </div>
            <span className="font-mono font-medium text-[var(--text-primary)]">
              {readiness.vitalsContribution} <span className="text-[10px] text-[var(--text-secondary)]">/ 50 pts</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--teal-primary)] rounded-full transition-all duration-500"
              style={{ width: `${(readiness.vitalsContribution / 50) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[var(--text-secondary)] pt-0.5">
            <span>Resting HR: <strong className="text-[var(--text-primary)] capitalize">{readiness.rhrStatus.replace('_', ' ')}</strong></span>
            <span>HRV RMSSD: <strong className="text-[var(--text-primary)] capitalize">{readiness.hrvStatus}</strong></span>
          </div>
        </div>

        {/* Pillar 3: Lifestyle & Metabolic */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-cyan-600 stroke-[2]" />
              <span className="font-semibold text-[var(--text-primary)]">Lifestyle & Hydration</span>
            </div>
            <span className="font-mono font-medium text-[var(--text-primary)]">
              {readiness.lifestyleContribution} <span className="text-[10px] text-[var(--text-secondary)]">/ 25 pts</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-600 rounded-full transition-all duration-500"
              style={{ width: `${(readiness.lifestyleContribution / 25) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[var(--text-secondary)] pt-0.5">
            <span>Hydration: <strong className="text-[var(--text-primary)]">{todayLog.waterGlasses} / 8 glasses</strong></span>
            <span>Stress: <strong className="text-[var(--text-primary)] capitalize">{todayLog.stressLevel}</strong></span>
          </div>
        </div>
      </section>

      {/* Daily Prescription & Protocols */}
      <section className="clinical-card p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2.5">
          <Sparkles className="w-4 h-4 text-[var(--teal-primary)] stroke-[2]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">
            Optimized Protocols for Today
          </h2>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] stroke-[2] shrink-0 mt-0.5" />
            <div className="text-xs">
              <h3 className="font-semibold text-[var(--text-primary)]">Physical Exertion Window</h3>
              <p className="text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                {readiness.score >= 75
                  ? 'Your autonomic nervous system shows strong parasympathetic recovery. High-intensity interval or resistance training is well tolerated today.'
                  : 'Parasympathetic tone indicates slight fatigue. Favor steady-state Zone 2 walking, light mobility, or recovery work today.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <Wind className="w-4 h-4 text-[var(--teal-primary)] stroke-[2] shrink-0 mt-0.5" />
            <div className="text-xs flex-1">
              <h3 className="font-semibold text-[var(--text-primary)]">Autonomic Pacing</h3>
              <p className="text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Do a 3-minute resonant breathing session at 5.5 breaths per minute to stimulate vagal tone and synchronize heart rate oscillations.
              </p>
              {onStartBreathing && (
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    onStartBreathing();
                  }}
                  className="mt-2 text-xs text-[var(--teal-primary)] font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Open Resonant Pacer</span>
                  <span>→</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {onStartMeasurement && (
          <button
            onClick={() => {
              triggerHaptic('medium');
              onStartMeasurement();
            }}
            className="clinical-btn-primary w-full text-xs"
          >
            <Activity className="w-4 h-4 stroke-[2]" />
            <span>Update Today's Vitals</span>
          </button>
        )}

        {onOpenJournal && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenJournal();
            }}
            className="clinical-btn-secondary w-full text-xs"
          >
            <Calendar className="w-4 h-4 stroke-[2]" />
            <span>Open Health Journal</span>
          </button>
        )}
      </div>

      {/* Methodology Modal */}
      <ClinicalInfoModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
        title="Readiness Score Algorithm"
        subtitle="Clinical Autonomic Recovery Modeling"
      >
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              Physiological Weighting Formula
            </h4>
            <p>
              The VitalLens Health Readiness Index (0–100) measures how prepared your autonomic nervous system is to handle physical stress and cognitive demand:
            </p>
            <ul className="list-disc pl-4 space-y-1 mt-2 text-[11px]">
              <li><strong>Vitals (50%):</strong> Heart Rate Variability (RMSSD) reflecting vagal nerve activation, plus baseline resting heart rate.</li>
              <li><strong>Sleep (25%):</strong> Duration, restorative slow-wave sleep quality, and awakening count.</li>
              <li><strong>Lifestyle (25%):</strong> Hydration equilibrium (2.0L baseline) minus acute physiological strain and symptoms.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              Heart Rate Variability (HRV RMSSD)
            </h4>
            <p>
              Root Mean Square of Successive Differences (RMSSD) is the gold standard clinical metric for assessing parasympathetic cardiac modulation. A higher RMSSD relative to your personal baseline signals readiness; a suppressed RMSSD reflects acute fatigue or stress.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-0.5">
              Clinical Disclaimer
            </h4>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Readiness scores are intended for wellness tracking and athletic load balancing. They do not diagnose cardiac pathology or autonomic dysregulation.
            </p>
          </div>
        </div>
      </ClinicalInfoModal>
    </div>
  );
};
