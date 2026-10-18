import React from 'react';
import { X, Printer, HeartPulse, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';

interface ReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: {
    scanType: 'fingertip' | 'face';
    heartRate: number;
    spo2: number;
    respiratoryRate: number;
    systolicBp: number;
    diastolicBp: number;
    signalQuality: 'good' | 'fair' | 'poor';
    confidence: number;
    hrvRmssd?: number;
    hrvSdnn?: number;
    stressIndex?: number;
    stressCategory?: string;
    recoveryScore?: number;
    rhythmRegularity?: string;
    notes?: string;
  };
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  isOpen,
  onClose,
  scanResult,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 space-y-4 my-8 text-[var(--text-primary)] shadow-card">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--teal-subtle)] text-[var(--teal-primary)] flex items-center justify-center shrink-0">
              <HeartPulse className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Physiological Telemetry Report
                </h2>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--teal-subtle)] text-[var(--teal-primary)] border border-[var(--border-color)] uppercase">
                  Optical PPG
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                VitalLens Optical Sensor Assessment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-[var(--bg-surface-subtle)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] transition-colors cursor-pointer border border-[var(--border-color)]"
              title="Print Report"
            >
              <Printer className="w-4 h-4 stroke-[1.8]" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[var(--bg-surface-subtle)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] transition-colors cursor-pointer border border-[var(--border-color)]"
              title="Close Modal"
            >
              <X className="w-4 h-4 stroke-[1.8]" />
            </button>
          </div>
        </div>

        {/* Capture Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[var(--bg-surface-subtle)] p-3 rounded-lg border border-[var(--border-color)] font-mono">
          <div>
            <span className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">Date</span>
            <div className="font-medium text-[var(--text-primary)] mt-0.5">{currentDate}</div>
          </div>
          <div>
            <span className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">Time</span>
            <div className="font-medium text-[var(--text-primary)] mt-0.5">{currentTime}</div>
          </div>
          <div>
            <span className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">Sensor</span>
            <div className="font-medium text-[var(--text-primary)] mt-0.5">
              {scanResult.scanType === 'fingertip' ? 'Fingertip PPG' : 'Facial rPPG'}
            </div>
          </div>
          <div>
            <span className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">Confidence</span>
            <div className="font-medium text-[var(--status-success)] mt-0.5">
              {scanResult.confidence}% (Grade {scanResult.signalQuality.toUpperCase()})
            </div>
          </div>
        </div>

        {/* Vitals Table */}
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3 h-3 stroke-[2]" /> Measured Parameters
          </h3>
          <div className="overflow-hidden rounded-lg border border-[var(--border-color)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] font-mono text-[10px] uppercase border-b border-[var(--border-color)]">
                <tr>
                  <th className="py-2 px-3">Parameter</th>
                  <th className="py-2 px-3">Measured</th>
                  <th className="py-2 px-3">Reference Interval</th>
                  <th className="py-2 px-3">Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] font-mono text-xs">
                <tr>
                  <td className="py-2 px-3 text-[var(--text-primary)] font-medium">Heart Rate (HR)</td>
                  <td className="py-2 px-3 font-bold text-[var(--teal-primary)] tabular-nums">{scanResult.heartRate} BPM</td>
                  <td className="py-2 px-3 text-[var(--text-secondary)]">60 – 100 BPM</td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center gap-1 text-[var(--status-success)] text-[11px]">
                      <CheckCircle2 className="w-3 h-3 stroke-[2] shrink-0" /> Normal Resting
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--text-primary)] font-medium">Blood Oxygen (SpO2)</td>
                  <td className="py-2 px-3 font-bold text-[var(--teal-primary)] tabular-nums">{scanResult.spo2}%</td>
                  <td className="py-2 px-3 text-[var(--text-secondary)]">95% – 100%</td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center gap-1 text-[var(--status-success)] text-[11px]">
                      <CheckCircle2 className="w-3 h-3 stroke-[2] shrink-0" /> Adequate
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--text-primary)] font-medium">Respiratory Rate (RR)</td>
                  <td className="py-2 px-3 font-bold text-[var(--teal-primary)] tabular-nums">{scanResult.respiratoryRate} bpm</td>
                  <td className="py-2 px-3 text-[var(--text-secondary)]">12 – 20 bpm</td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center gap-1 text-[var(--status-success)] text-[11px]">
                      <CheckCircle2 className="w-3 h-3 stroke-[2] shrink-0" /> Eupnea
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[var(--text-primary)] font-medium">Blood Pressure Trend (BP)*</td>
                  <td className="py-2 px-3 font-bold text-[var(--text-primary)] tabular-nums">{scanResult.systolicBp} / {scanResult.diastolicBp} mmHg</td>
                  <td className="py-2 px-3 text-[var(--text-secondary)]">&lt; 120 / 80 mmHg</td>
                  <td className="py-2 px-3">
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {scanResult.systolicBp < 120 ? 'Optimal Trend' : 'Elevated Trend'}
                    </span>
                  </td>
                </tr>
                {scanResult.hrvRmssd != null && (
                  <tr>
                    <td className="py-2 px-3 text-[var(--text-primary)] font-medium">HRV RMSSD</td>
                    <td className="py-2 px-3 font-bold text-[var(--teal-primary)] tabular-nums">{scanResult.hrvRmssd} ms</td>
                    <td className="py-2 px-3 text-[var(--text-secondary)]">25 – 80 ms</td>
                    <td className="py-2 px-3">
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        {scanResult.stressCategory || 'Balanced Tone'}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Autonomic Recovery & Rhythm */}
        {scanResult.recoveryScore != null && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase font-mono block">
                Autonomic Recovery Index
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold font-mono text-[var(--teal-primary)] tabular-nums">
                  {scanResult.recoveryScore} / 100
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Parasympathetic vagal response
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase font-mono block">
                Cardiac Rhythm Assessment
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <ShieldCheck className="w-4 h-4 text-[var(--status-success)] shrink-0 stroke-[2]" />
                <span className="text-xs font-semibold text-[var(--text-primary)] font-mono">
                  {scanResult.rhythmRegularity || 'Regular Sinus Rhythm'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Clinical Disclaimer */}
        <div className="text-[10px] text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-2.5 leading-relaxed font-mono">
          <p>
            * Disclaimer: VitalLens is an optical sensor research utility. Computed values are algorithmic approximations and not intended for primary clinical diagnosis.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="clinical-btn-secondary min-h-[36px] px-3 text-xs font-mono"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="clinical-btn-primary min-h-[36px] px-3.5 text-xs font-mono"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
