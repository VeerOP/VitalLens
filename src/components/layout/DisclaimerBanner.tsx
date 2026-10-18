import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface DisclaimerBannerProps {
  compact?: boolean;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-2.5 text-[11px] text-[var(--text-secondary)] flex items-center gap-2 font-mono">
        <Info className="w-3.5 h-3.5 shrink-0 text-[var(--teal-primary)] stroke-[2]" />
        <span>
          <strong className="text-[var(--text-primary)] font-medium">Notice:</strong> Non-diagnostic physiological telemetry estimated via optical sensors.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-xl p-3.5 text-xs text-[var(--text-secondary)] flex items-start gap-2.5 my-3">
      <ShieldCheck className="w-4 h-4 text-[var(--teal-primary)] shrink-0 mt-0.5 stroke-[2]" />
      <div className="space-y-0.5">
        <h4 className="font-semibold text-[var(--text-primary)] text-xs">
          Clinical Guidance & Technology Scope
        </h4>
        <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
          VitalLens computes physiological estimates using optical photoplethysmography (PPG). Readings are designed for wellness tracking, athletic telemetry, and personal observation, and are <strong className="text-[var(--text-primary)]">not a replacement for medical diagnosis or clinical devices</strong>.
        </p>
      </div>
    </div>
  );
};
