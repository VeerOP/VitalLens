import React from 'react';
import { Moon, Droplets, Zap, Activity, Pill, Calendar } from 'lucide-react';
import type { DailyHealthLog } from '../../lib/storage/dailyLogStore';
import { getAllDailyLogs } from '../../lib/storage/dailyLogStore';

export const LifestyleHistoryView: React.FC = () => {
  const logsMap = getAllDailyLogs();
  const sortedDates = Object.keys(logsMap).sort().reverse();
  const logsList: DailyHealthLog[] = sortedDates.map((d) => logsMap[d]);

  // Compute 7-day rolling statistics
  const recent7 = logsList.slice(0, 7);
  const avgSleep = recent7.length
    ? (recent7.reduce((sum, l) => sum + (l.sleepHours || 7), 0) / recent7.length).toFixed(1)
    : '7.0';
  const avgWater = recent7.length
    ? ((recent7.reduce((sum, l) => sum + (l.waterGlasses || 4), 0) * 0.25) / recent7.length).toFixed(1)
    : '1.5';
  const calmDays = recent7.filter((l) => l.stressLevel === 'calm' || l.stressLevel === 'relaxed').length;

  if (logsList.length === 0) {
    return (
      <div className="clinical-card p-6 text-center space-y-2">
        <Calendar className="w-6 h-6 text-[var(--teal-primary)] mx-auto stroke-[1.8]" />
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">No Daily Logs Yet</h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
          Log your sleep, water, and energy on the Today screen to build your lifestyle trend history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* 7-Day Averages Summary Card */}
      <div className="clinical-card p-4 space-y-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
          7-Day Lifestyle Averages
        </h3>

        <div className="grid grid-cols-3 gap-2 font-mono text-center">
          <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)]">
              <Moon className="w-3 h-3 text-[var(--teal-primary)] stroke-[2]" />
              <span>Avg Sleep</span>
            </div>
            <div className="text-base font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
              {avgSleep} <span className="text-[10px] font-normal text-[var(--text-secondary)]">hrs</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)]">
              <Droplets className="w-3 h-3 text-[var(--teal-primary)] stroke-[2]" />
              <span>Hydration</span>
            </div>
            <div className="text-base font-bold text-[var(--teal-primary)] mt-0.5 tabular-nums">
              {avgWater} <span className="text-[10px] font-normal text-[var(--text-secondary)]">L/day</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)]">
              <Zap className="w-3 h-3 text-[var(--teal-primary)] stroke-[2]" />
              <span>Calm Days</span>
            </div>
            <div className="text-base font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
              {calmDays}<span className="text-[10px] font-normal text-[var(--text-secondary)]">/{recent7.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Logs Timeline List */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono px-1">
          Daily History Log ({logsList.length})
        </h3>

        <div className="space-y-2">
          {logsList.map((log) => {
            const dateObj = new Date(log.date + 'T12:00:00');
            const dateStr = dateObj.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={log.date}
                className="clinical-card p-3.5 space-y-2.5"
              >
                {/* Header row: Date & Sleep badge */}
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                      {dateStr}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)] capitalize font-mono">
                      {log.sleepQuality} sleep
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-[var(--text-primary)] font-mono tabular-nums">
                    {log.sleepHours} hrs
                  </span>
                </div>

                {/* Submetrics: Water, Energy, Stress, Meds */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <Droplets className="w-3.5 h-3.5 text-[var(--teal-primary)]" />
                    <span>{(log.waterGlasses * 0.25).toFixed(1)} L water</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <Zap className="w-3.5 h-3.5 text-[var(--teal-primary)]" />
                    <span className="capitalize">{log.energyLevel} energy</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <Activity className="w-3.5 h-3.5 text-[var(--teal-primary)]" />
                    <span className="capitalize">{log.stressLevel} stress</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <Pill className="w-3.5 h-3.5 text-[var(--teal-primary)]" />
                    <span>{log.medicationsTaken?.length || 0} habits</span>
                  </div>
                </div>

                {/* Symptoms pills if present */}
                {log.symptoms && log.symptoms.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--border-color)]">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Symptoms:</span>
                    {log.symptoms.map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--status-caution-bg)] text-[var(--status-caution)] border border-[var(--border-color)]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
