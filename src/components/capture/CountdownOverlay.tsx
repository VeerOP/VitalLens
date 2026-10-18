import React from 'react';
import { Heart } from 'lucide-react';

interface CountdownOverlayProps {
  elapsedSeconds: number;
  targetSeconds: number;
  currentBpm?: number;
  statusText?: string;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  elapsedSeconds,
  targetSeconds,
  currentBpm = 0,
  statusText = 'Measuring pulse...',
}) => {
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));

  return (
    <div className="flex flex-col items-center justify-center p-2">
      {/* Radial Progress Gauge with Centered Numerical Telemetry */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            className="stroke-[var(--border-color)]"
            strokeWidth="5"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            className="stroke-[var(--teal-primary)] transition-all duration-300 ease-out"
            strokeWidth="5"
            strokeDasharray={263.89}
            strokeDashoffset={263.89 - (263.89 * progressPercent) / 100}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Heart className="w-3.5 h-3.5 text-[var(--teal-primary)] stroke-[2] mb-0.5" />
          <span className="text-xl font-bold font-mono tracking-tight text-[var(--text-primary)] tabular-nums">
            {currentBpm > 0 ? currentBpm : remainingSeconds}
          </span>
          <span className="text-[9px] font-mono font-medium text-[var(--text-muted)] uppercase tracking-wider">
            {currentBpm > 0 ? 'BPM' : 'SECS LEFT'}
          </span>
        </div>
      </div>

      <div className="mt-2 text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] text-[10px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal-primary)]" />
          <span>{progressPercent}% Complete ({elapsedSeconds}/{targetSeconds}s)</span>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] font-mono">{statusText}</p>
      </div>
    </div>
  );
};
