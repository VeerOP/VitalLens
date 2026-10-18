import React from 'react';
import { Signal, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { SignalQualityAssessment } from '../../lib/signal/signalQuality';

interface SignalQualityBadgeProps {
  assessment: SignalQualityAssessment;
}

export const SignalQualityBadge: React.FC<SignalQualityBadgeProps> = ({ assessment }) => {
  const getBadgeStyle = () => {
    switch (assessment.status) {
      case 'good':
        return {
          bg: 'bg-[var(--status-success-bg)] border-[var(--border-color)] text-[var(--status-success)]',
          icon: <CheckCircle2 className="w-3.5 h-3.5 stroke-[2] shrink-0" />,
          label: 'Good Signal',
          barColor: 'bg-[var(--status-success)]',
        };
      case 'fair':
        return {
          bg: 'bg-[var(--status-caution-bg)] border-[var(--border-color)] text-[var(--status-caution)]',
          icon: <AlertCircle className="w-3.5 h-3.5 stroke-[2] shrink-0" />,
          label: 'Fair Signal',
          barColor: 'bg-[var(--status-caution)]',
        };
      case 'poor':
      default:
        return {
          bg: 'bg-[var(--status-alert-bg)] border-[var(--border-color)] text-[var(--status-alert)]',
          icon: <ShieldAlert className="w-3.5 h-3.5 stroke-[2] shrink-0" />,
          label: 'Low Signal',
          barColor: 'bg-[var(--status-alert)]',
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <div className={`rounded-lg border p-2.5 ${style.bg} transition-colors`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          {style.icon}
          <span className="font-mono font-semibold text-[11px] tracking-wide uppercase">
            {style.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono opacity-90">
          <Signal className="w-3 h-3 stroke-[2]" />
          <span>Quality {assessment.qualityScore}%</span>
        </div>
      </div>

      {/* Meter Bar */}
      <div className="w-full h-1 bg-[var(--border-color)] rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full ${style.barColor} transition-all duration-300 rounded-full`}
          style={{ width: `${Math.max(5, assessment.qualityScore)}%` }}
        />
      </div>

      <p className="text-[11px] leading-tight font-medium text-[var(--text-primary)]">
        {assessment.message}
      </p>
      {assessment.recommendation && (
        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono">
          {assessment.recommendation}
        </p>
      )}
    </div>
  );
};
