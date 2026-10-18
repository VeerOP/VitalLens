import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Sparkline } from './Sparkline';

export interface VitalCardProps {
  title: string;
  value: number | string;
  unit: string;
  normalRange: string;
  status: 'normal' | 'borderline' | 'abnormal';
  statusText: string;
  icon: React.ReactNode;
  waveformSnippet?: number[];
  isExperimental?: boolean;
  disclaimerText?: string;
}

export const VitalCard: React.FC<VitalCardProps> = ({
  title,
  value,
  unit,
  normalRange,
  status,
  statusText,
  icon,
  waveformSnippet,
  isExperimental = false,
  disclaimerText,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'normal':
        return {
          bg: 'bg-[var(--status-success-bg)] border-[var(--border-color)] text-[var(--status-success)]',
          icon: <CheckCircle2 className="w-3 h-3 stroke-[2] shrink-0" />,
          color: '#23845D',
        };
      case 'borderline':
        return {
          bg: 'bg-[var(--status-caution-bg)] border-[var(--border-color)] text-[var(--status-caution)]',
          icon: <AlertCircle className="w-3 h-3 stroke-[2] shrink-0" />,
          color: '#A66A13',
        };
      case 'abnormal':
      default:
        return {
          bg: 'bg-[var(--status-alert-bg)] border-[var(--border-color)] text-[var(--status-alert)]',
          icon: <AlertCircle className="w-3 h-3 stroke-[2] shrink-0" />,
          color: '#B83A45',
        };
    }
  };

  const statusStyle = getStatusBadge();

  return (
    <div className="clinical-card p-4 flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-surface-subtle)] text-[var(--teal-primary)] flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-xs text-[var(--text-primary)] tracking-tight">
                  {title}
                </h3>
                {isExperimental && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                    Est
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                Ref: {normalRange}
              </p>
            </div>
          </div>

          <div
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold border flex items-center gap-1 ${statusStyle.bg}`}
          >
            {statusStyle.icon}
            <span>{statusText}</span>
          </div>
        </div>

        {/* Numeric Telemetry Display with Tabular Numerals */}
        <div className="flex items-baseline gap-1 my-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[var(--text-primary)] tabular-nums">
            {value}
          </span>
          <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">
            {unit}
          </span>
        </div>
      </div>

      {/* Sparkline & Metadata Footer */}
      <div className="mt-3 pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
        {waveformSnippet && waveformSnippet.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Wave:</span>
            <Sparkline data={waveformSnippet} color={statusStyle.color} width={88} height={20} />
          </div>
        ) : (
          <div className="text-[10px] text-[var(--text-secondary)] font-mono flex items-center gap-1">
            <Info className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            <span>PPG Analyzed</span>
          </div>
        )}

        {isExperimental && (
          <div
            className="text-[9px] font-mono text-[var(--text-muted)] text-right max-w-[130px] leading-tight"
            title={disclaimerText || 'Pulse morphology relative trend.'}
          >
            Relative trend
          </div>
        )}
      </div>
    </div>
  );
};
