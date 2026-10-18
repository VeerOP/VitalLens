import React from 'react';
import { deleteScanRecord, clearAllScanHistory } from '../../lib/storage/historyStore';
import type { VitalsRecord } from '../../lib/storage/historyStore';
import { Trash2, Calendar, Fingerprint, UserCheck, Heart, Activity, Wind, Gauge, ShieldCheck, Zap, Plus } from 'lucide-react';
import { triggerHaptic } from '../../lib/utils/haptics';

interface HistoryListProps {
  records: VitalsRecord[];
  onRefresh: () => void;
  onNewScan?: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ records, onRefresh, onNewScan }) => {
  const handleDelete = (id: string) => {
    triggerHaptic('warning');
    deleteScanRecord(id);
    onRefresh();
  };

  const handleClearAll = () => {
    if (window.confirm('Permanently purge all saved telemetry records?')) {
      triggerHaptic('warning');
      clearAllScanHistory();
      onRefresh();
    }
  };

  if (!records || records.length === 0) {
    return (
      <div className="clinical-card p-8 text-center rounded-xl space-y-3">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] flex items-center justify-center mx-auto">
          <Calendar className="w-5 h-5 stroke-[1.8]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            No Measurements Saved
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
            Save a measurement after scanning to build your vitals history.
          </p>
        </div>
        {onNewScan && (
          <button
            onClick={onNewScan}
            className="clinical-btn-primary text-xs mx-auto"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
            <span>Take First Measurement</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
        <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono">
          Past Readings ({records.length})
        </h3>
        <button
          onClick={handleClearAll}
          className="text-[11px] font-mono text-[var(--status-alert)] hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 stroke-[1.8]" />
          <span>Clear All</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {records.map((record) => {
          const dateStr = new Date(record.timestamp).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={record.id}
              className="clinical-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              {/* Left Column: Timestamp & Type */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface-subtle)] text-[var(--teal-primary)] flex items-center justify-center shrink-0">
                  {record.scanType === 'fingertip' ? (
                    <Fingerprint className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <UserCheck className="w-4 h-4 stroke-[2]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                      {dateStr}
                    </span>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                      {record.scanType}
                    </span>
                    {record.recoveryScore != null && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--teal-subtle)] text-[var(--teal-primary)] border border-[var(--border-color)] flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> Rec {record.recoveryScore}%
                      </span>
                    )}
                  </div>
                  {record.rhythmRegularity && (
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono">
                      <ShieldCheck className="w-3 h-3 text-[var(--teal-primary)] stroke-[2]" />
                      <span>{record.rhythmRegularity}</span>
                    </div>
                  )}
                  {record.notes && (
                    <p className="text-[11px] text-[var(--text-secondary)] italic mt-0.5 font-mono">
                      "{record.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Middle Column: Numerical Telemetry Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <div className="flex items-center gap-1 bg-[var(--bg-surface-subtle)] px-2 py-1 rounded-md border border-[var(--border-color)]">
                  <Heart className="w-3 h-3 text-[var(--teal-primary)] stroke-[2]" />
                  <span className="font-bold text-[var(--text-primary)] tabular-nums">{record.heartRate}</span>
                  <span className="text-[9px] text-[var(--text-secondary)]">BPM</span>
                </div>

                <div className="flex items-center gap-1 bg-[var(--bg-surface-subtle)] px-2 py-1 rounded-md border border-[var(--border-color)]">
                  <Activity className="w-3 h-3 text-[var(--teal-primary)] stroke-[2]" />
                  <span className="font-bold text-[var(--text-primary)] tabular-nums">{record.spo2}%</span>
                  <span className="text-[9px] text-[var(--text-secondary)]">SpO2</span>
                </div>

                <div className="flex items-center gap-1 bg-[var(--bg-surface-subtle)] px-2 py-1 rounded-md border border-[var(--border-color)]">
                  <Wind className="w-3 h-3 text-[var(--teal-primary)] stroke-[2]" />
                  <span className="font-bold text-[var(--text-primary)] tabular-nums">{record.respiratoryRate}</span>
                  <span className="text-[9px] text-[var(--text-secondary)]">bpm</span>
                </div>

                <div className="flex items-center gap-1 bg-[var(--bg-surface-subtle)] px-2 py-1 rounded-md border border-[var(--border-color)]">
                  <Gauge className="w-3 h-3 text-[var(--teal-primary)] stroke-[2]" />
                  <span className="font-bold text-[var(--text-primary)] tabular-nums">
                    {record.systolicBp}/{record.diastolicBp}
                  </span>
                  <span className="text-[9px] text-[var(--text-secondary)]">BP</span>
                </div>

                {record.hrvRmssd != null && record.hrvRmssd > 0 && (
                  <div className="flex items-center gap-1 bg-[var(--bg-surface-subtle)] px-2 py-1 rounded-md border border-[var(--border-color)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal-primary)]" />
                    <span className="font-bold text-[var(--text-primary)] tabular-nums">{record.hrvRmssd}</span>
                    <span className="text-[9px] text-[var(--text-secondary)]">ms</span>
                  </div>
                )}

                {/* Right Column: Delete Button */}
                <button
                  onClick={() => handleDelete(record.id)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--status-alert)] transition-colors cursor-pointer rounded-md hover:bg-[var(--status-alert-bg)]"
                  title="Delete record"
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[1.8]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
