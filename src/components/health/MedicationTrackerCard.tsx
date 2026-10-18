import React, { useState, useEffect } from 'react';
import { Pill, Plus, Check, Trash2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { MedicationItem } from '../../lib/storage/dailyLogStore';
import {
  getSavedMedications,
  addMedication,
  removeMedication,
  toggleMedicationTakenToday,
  getTodayHealthLog,
} from '../../lib/storage/dailyLogStore';
import { triggerHaptic } from '../../lib/utils/haptics';

interface MedicationTrackerCardProps {
  onViewFullPage?: () => void;
}

export const MedicationTrackerCard: React.FC<MedicationTrackerCardProps> = ({ onViewFullPage }) => {
  const [meds, setMeds] = useState<MedicationItem[]>([]);
  const [takenIds, setTakenIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('Morning');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const loadData = () => {
    setMeds(getSavedMedications());
    const log = getTodayHealthLog();
    setTakenIds(log.medicationsTaken || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleTaken = (id: string) => {
    triggerHaptic('medium');
    const updated = toggleMedicationTakenToday(id);
    setTakenIds(updated.medicationsTaken || []);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    triggerHaptic('success');
    addMedication(newName.trim(), newDosage.trim(), newTime);
    setNewName('');
    setNewDosage('');
    setIsAdding(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    triggerHaptic('warning');
    removeMedication(id);
    loadData();
  };

  const totalCount = meds.length;
  const takenCount = meds.filter((m) => takenIds.includes(m.id)).length;

  return (
    <div className="clinical-card p-4 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--teal-primary)]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
            Medications & Habits
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[var(--text-secondary)] tabular-nums">
            {takenCount}/{totalCount} taken
          </span>
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsCollapsed(!isCollapsed);
            }}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-0.5"
            aria-label="Toggle medications"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          {/* Medications Checklist */}
          {meds.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-subtle)] rounded-lg border border-[var(--border-color)]">
              No medications or habits scheduled. Tap Add to track your daily supplements.
            </div>
          ) : (
            <div className="space-y-1.5">
              {meds.map((med) => {
                const isTaken = takenIds.includes(med.id);
                return (
                  <div
                    key={med.id}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                      isTaken
                        ? 'bg-[var(--status-success-bg)] border-[var(--border-color)]'
                        : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] hover:border-[var(--teal-primary)]'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleTaken(med.id)}
                      className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-all ${
                          isTaken
                            ? 'bg-[var(--status-success)] border-[var(--status-success)] text-white shadow-xs'
                            : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs font-semibold tracking-tight ${
                              isTaken ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {med.name}
                          </span>
                          {med.dosage && (
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">
                              • {med.dosage}
                            </span>
                          )}
                        </div>
                        {med.scheduleTime && (
                          <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 mt-0.5 font-mono">
                            <Clock className="w-2.5 h-2.5 inline" /> {med.scheduleTime}
                          </span>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={() => handleDelete(med.id)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--status-alert)] transition-colors cursor-pointer shrink-0"
                      title="Remove habit"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.8]" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Form or Button */}
          {isAdding ? (
            <form onSubmit={handleAdd} className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-2">
              <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-[var(--teal-primary)]" />
                <span>Add Medication / Supplement</span>
              </h4>

              <div className="space-y-1.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name (e.g. Vitamin D3, BP Medication)"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)]"
                  autoFocus
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    placeholder="Dosage (e.g. 5mg, 1000 IU)"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)]"
                  />
                  <select
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--teal-primary)]"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Before Bed">Before Bed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="clinical-btn-secondary min-h-[32px] px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="clinical-btn-primary min-h-[32px] px-3 text-xs"
                >
                  Save Habit
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsAdding(true);
              }}
              className="w-full py-2 text-xs text-[var(--teal-primary)] hover:bg-[var(--teal-subtle)] border border-dashed border-[var(--border-color)] rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-medium"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" />
              <span>Add Medication / Supplement</span>
            </button>
          )}
        </div>
      )}

      {onViewFullPage && (
        <div className="pt-2 border-t border-[var(--border-color)]">
          <button
            onClick={() => {
              triggerHaptic('light');
              onViewFullPage();
            }}
            className="text-xs text-[var(--teal-primary)] hover:underline flex items-center justify-between w-full font-semibold cursor-pointer"
          >
            <span>Manage All Habits & Schedule</span>
            <span className="font-mono text-sm">→</span>
          </button>
        </div>
      )}
    </div>
  );
};
