import React, { useState } from 'react';
import { Zap, Moon, Heart, ChevronRight, HelpCircle, ShieldCheck } from 'lucide-react';
import type { HealthReadinessScore } from '../../lib/storage/dailyLogStore';
import { ClinicalInfoModal } from '../modals/ClinicalInfoModal';
import { triggerHaptic } from '../../lib/utils/haptics';

interface HealthReadinessCardProps {
  readiness: HealthReadinessScore;
  onOpenCheckIn?: () => void;
  onViewFullPage?: () => void;
}

export const HealthReadinessCard: React.FC<HealthReadinessCardProps> = ({
  readiness,
  onOpenCheckIn,
  onViewFullPage,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const getStatusColor = () => {
    switch (readiness.category) {
      case 'Optimal':
        return {
          text: 'text-[var(--status-success)]',
          bg: 'bg-[var(--status-success-bg)]',
          ring: 'stroke-[var(--status-success)]',
          border: 'border-[var(--status-success)]',
        };
      case 'Recovered':
        return {
          text: 'text-[var(--teal-primary)]',
          bg: 'bg-[var(--teal-subtle)]',
          ring: 'stroke-[var(--teal-primary)]',
          border: 'border-[var(--teal-primary)]',
        };
      case 'Moderate':
        return {
          text: 'text-[var(--status-caution)]',
          bg: 'bg-[var(--status-caution-bg)]',
          ring: 'stroke-[var(--status-caution)]',
          border: 'border-[var(--status-caution)]',
        };
      case 'Strained':
      default:
        return {
          text: 'text-[var(--status-alert)]',
          bg: 'bg-[var(--status-alert-bg)]',
          ring: 'stroke-[var(--status-alert)]',
          border: 'border-[var(--status-alert)]',
        };
    }
  };

  const style = getStatusColor();
  const circumference = 2 * Math.PI * 38;
  const strokeDashoffset = circumference - (circumference * readiness.score) / 100;

  return (
    <>
      <div className="clinical-card p-4 space-y-3.5">
        {/* Top Title & Modal Trigger */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--teal-primary)]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
              Daily Readiness Score
            </h2>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              setIsDetailsOpen(true);
            }}
            className="text-[var(--teal-primary)] text-xs hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />
            <span>How it works</span>
          </button>
        </div>

        {/* Score & Gauge Centerpiece */}
        <div className="flex items-center gap-4">
          {/* Radial Ring Gauge */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 90 90">
              <circle
                cx="45"
                cy="45"
                r="38"
                className="stroke-[var(--border-color)]"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="45"
                cy="45"
                r="38"
                className={`${style.ring} transition-all duration-700 ease-out`}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold font-mono tracking-tight text-[var(--text-primary)] tabular-nums">
                {readiness.score}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase">
                / 100
              </span>
            </div>
          </div>

          {/* Qualitative Readiness Summary */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono uppercase font-bold border ${style.bg} ${style.text} border-[var(--border-color)]`}>
                {readiness.category}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">Recovery Status</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {readiness.recommendation}
            </p>
          </div>
        </div>

        {/* 3 Contributing Factor Pills */}
        <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
          <div className="p-2 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)]">
              <Zap className="w-3 h-3 text-[var(--teal-primary)] stroke-[2]" />
              <span>Vitals</span>
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
              {readiness.vitalsContribution}<span className="text-[10px] font-normal text-[var(--text-secondary)]">/50</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)]">
              <Moon className="w-3 h-3 text-[var(--teal-primary)] stroke-[2]" />
              <span>Sleep</span>
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
              {readiness.sleepContribution}<span className="text-[10px] font-normal text-[var(--text-secondary)]">/25</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)]">
              <Heart className="w-3 h-3 text-[var(--teal-primary)] stroke-[2]" />
              <span>Lifestyle</span>
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
              {readiness.lifestyleContribution}<span className="text-[10px] font-normal text-[var(--text-secondary)]">/25</span>
            </div>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
          {onViewFullPage ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                onViewFullPage();
              }}
              className="text-xs text-[var(--teal-primary)] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>Full Recovery Analysis</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          ) : <div />}

          {onOpenCheckIn && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenCheckIn();
              }}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Update Log
            </button>
          )}
        </div>
      </div>

      {/* Explanatory Clinical Modal */}
      <ClinicalInfoModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Physiological Readiness Index"
        subtitle="Autonomic nervous system recovery model"
      >
        <div className="space-y-3.5">
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              How Readiness Is Calculated
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Your Daily Readiness Score assesses how well your cardiovascular and autonomic nervous systems have recovered from physiological stress, exercise, and daily life. It weights three core pillars:
            </p>
          </div>

          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
              <span className="font-semibold text-xs text-[var(--text-primary)] block">1. Vitals & HRV (50%)</span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Evaluates beat-to-beat variability (RMSSD) and resting heart rate against normal clinical benchmarks. Higher vagal tone signifies rapid cellular recovery.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
              <span className="font-semibold text-xs text-[var(--text-primary)] block">2. Sleep Duration & Quality (25%)</span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Considers total restorative sleep duration and subjective sleep depth needed for hormone regulation and tissue repair.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
              <span className="font-semibold text-xs text-[var(--text-primary)] block">3. Hydration & Stress (25%)</span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Factor in daily water intake (8 glasses / 2L target) and mental stress levels, which directly influence plasma volume and peripheral resistance.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--teal-primary)] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Readiness recommendations are tailored for general athletic conditioning, energy management, and biofeedback monitoring.
            </p>
          </div>
        </div>
      </ClinicalInfoModal>
    </>
  );
};
