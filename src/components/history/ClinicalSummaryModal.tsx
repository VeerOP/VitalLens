import React from 'react';
import { X, Printer, Heart, Moon, ShieldCheck } from 'lucide-react';
import type { VitalsRecord } from '../../lib/storage/historyStore';
import { calculatePersonalBaseline } from '../../lib/storage/historyStore';
import { getAllDailyLogs, getSavedMedications } from '../../lib/storage/dailyLogStore';
import { triggerHaptic } from '../../lib/utils/haptics';

interface ClinicalSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: VitalsRecord[];
}

export const ClinicalSummaryModal: React.FC<ClinicalSummaryModalProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  if (!isOpen) return null;

  const baseline = calculatePersonalBaseline(records);
  const logsMap = getAllDailyLogs();
  const logsList = Object.values(logsMap);
  const medications = getSavedMedications();

  const avgSleep = logsList.length
    ? (logsList.reduce((sum, l) => sum + (l.sleepHours || 7), 0) / logsList.length).toFixed(1)
    : '7.0';
  const avgWater = logsList.length
    ? ((logsList.reduce((sum, l) => sum + (l.waterGlasses || 4), 0) * 0.25) / logsList.length).toFixed(1)
    : '1.5';

  const allSymptoms = Array.from(new Set(logsList.flatMap((l) => l.symptoms || [])));

  const handlePrint = () => {
    triggerHaptic('medium');
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-surface-subtle)]">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--teal-primary)] font-bold block">
              VitalLens Health Summary
            </span>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Clinical & Lifestyle Report
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--teal-primary)] hover:bg-[var(--teal-subtle)] transition-colors cursor-pointer"
              title="Print Report"
            >
              <Printer className="w-4 h-4 stroke-[2]" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {/* Patient / Device Context */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] border-b border-[var(--border-color)] pb-2.5">
            <span>Generated: {new Date().toLocaleDateString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <span>Sensor: Camera Optical PPG</span>
          </div>

          {/* Vitals Baseline */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[var(--teal-primary)]" />
              <span>Cardiovascular Baselines ({baseline?.sampleCount || records.length} Scans)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Resting HR</span>
                <span className="text-base font-bold text-[var(--text-primary)]">{baseline?.sevenDayAvgHr ?? 72} BPM</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase block">HRV RMSSD</span>
                <span className="text-base font-bold text-[var(--teal-primary)]">{baseline?.sevenDayAvgHrv ?? 42} ms</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Blood Oxygen</span>
                <span className="text-base font-bold text-[var(--text-primary)]">{baseline?.sevenDayAvgSpo2 ?? 98}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Respiration</span>
                <span className="text-base font-bold text-[var(--text-primary)]">{baseline?.sevenDayAvgRr ?? 15} bpm</span>
              </div>
            </div>
          </div>

          {/* Lifestyle Overview */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-[var(--teal-primary)]" />
              <span>Lifestyle & Recovery Factors</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Average Sleep</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">{avgSleep} hours / night</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Daily Hydration</span>
                <span className="text-sm font-bold text-[var(--teal-primary)]">{avgWater} Liters / day</span>
              </div>
            </div>
          </div>

          {/* Active Habits & Medications */}
          {medications.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider font-mono">
                Active Medications & Habits
              </h4>
              <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-1 text-xs">
                {medications.map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <span className="font-medium text-[var(--text-primary)]">{m.name} {m.dosage ? `(${m.dosage})` : ''}</span>
                    <span className="text-[11px] font-mono text-[var(--text-secondary)]">{m.scheduleTime || 'Daily'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logged Symptoms */}
          {allSymptoms.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider font-mono">
                Reported Symptoms History
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {allSymptoms.map((sym, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--status-caution-bg)] text-[var(--status-caution)] border border-[var(--border-color)]"
                  >
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Notice */}
          <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] flex items-start gap-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[var(--teal-primary)] shrink-0 mt-0.5" />
            <span>
              This automated summary synthesizes optical photoplethysmogram measurements and user-recorded lifestyle logs. It is designed to assist clinical discussions and is not an FDA-cleared diagnostic record.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-end gap-2 bg-[var(--bg-surface-subtle)] shrink-0">
          <button
            onClick={onClose}
            className="clinical-btn-secondary min-h-[36px] px-4 text-xs"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="clinical-btn-primary min-h-[36px] px-4 text-xs flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
