import React from 'react';
import { Sun, Sunset, Moon, Activity, Wind, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../../lib/utils/haptics';

interface CircadianPromptsCardProps {
  onStartFingertipScan: () => void;
  onStartBreathing: () => void;
}

export const CircadianPromptsCard: React.FC<CircadianPromptsCardProps> = ({
  onStartFingertipScan,
  onStartBreathing,
}) => {
  const hour = new Date().getHours();

  let title = '';
  let subtitle = '';
  let icon = <Sun className="w-4 h-4 text-amber-500 stroke-[2]" />;
  let actionLabel = '';
  let actionFn = onStartFingertipScan;
  let actionIcon = <Activity className="w-3.5 h-3.5 stroke-[2]" />;

  if (hour < 11) {
    title = 'Morning Resting Baseline Window';
    subtitle = 'Best time to measure resting HR & HRV before caffeine or physical exertion.';
    icon = <Sun className="w-4 h-4 text-amber-500 stroke-[2]" />;
    actionLabel = 'Record Baseline Vitals';
    actionFn = onStartFingertipScan;
    actionIcon = <Activity className="w-3.5 h-3.5 stroke-[2]" />;
  } else if (hour < 18) {
    title = 'Midday Autonomic Reset Window';
    subtitle = 'Stimulate parasympathetic vagal recovery with a 2-minute paced breathing cycle.';
    icon = <Sunset className="w-4 h-4 text-orange-500 stroke-[2]" />;
    actionLabel = 'Start 2-Min Reset';
    actionFn = onStartBreathing;
    actionIcon = <Wind className="w-3.5 h-3.5 stroke-[2]" />;
  } else {
    title = 'Evening Wind-Down Window';
    subtitle = 'Check end-of-day cardiovascular recovery score before preparing for restorative sleep.';
    icon = <Moon className="w-4 h-4 text-indigo-400 stroke-[2]" />;
    actionLabel = 'Check Recovery Vitals';
    actionFn = onStartFingertipScan;
    actionIcon = <Activity className="w-3.5 h-3.5 stroke-[2]" />;
  }

  return (
    <div className="clinical-card p-3.5 flex items-center justify-between gap-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className="p-2 rounded-lg bg-[var(--bg-surface)] text-[var(--teal-primary)] border border-[var(--border-color)] shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {title}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>

      <button
        onClick={() => {
          triggerHaptic('medium');
          actionFn();
        }}
        className="clinical-btn-primary min-h-[34px] px-3 text-xs shrink-0 inline-flex items-center gap-1.5"
      >
        {actionIcon}
        <span className="hidden sm:inline">{actionLabel}</span>
        <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
      </button>
    </div>
  );
};
