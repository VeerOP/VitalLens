import React, { useState } from 'react';
import {
  ArrowLeft,
  Pill,
  Plus,
  Check,
  Trash2,
  Sparkles,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';
import {
  getSavedMedications,
  addMedication,
  removeMedication,
  toggleMedicationTakenToday,
  getTodayHealthLog,
} from '../lib/storage/dailyLogStore';
import type { MedicationItem } from '../lib/storage/dailyLogStore';
import { triggerHaptic } from '../lib/utils/haptics';

interface MedicationsPageProps {
  onBack: () => void;
}

export const MedicationsPage: React.FC<MedicationsPageProps> = ({ onBack }) => {
  const [meds, setMeds] = useState<MedicationItem[]>(() => getSavedMedications());
  const [log, setLog] = useState(() => getTodayHealthLog());
  const [isAdding, setIsAdding] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newSchedule, setNewSchedule] = useState<'Morning' | 'Afternoon' | 'Evening' | 'Bedtime'>('Morning');

  const takenIds = log.medicationsTaken || [];
  const activeMeds = meds.filter((m) => m.active);
  const completedCount = activeMeds.filter((m) => takenIds.includes(m.id)).length;
  const completionPct = activeMeds.length > 0 ? Math.round((completedCount / activeMeds.length) * 100) : 100;

  const handleToggle = (id: string) => {
    triggerHaptic('light');
    const updatedLog = toggleMedicationTakenToday(id);
    setLog(updatedLog);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    triggerHaptic('medium');
    const created = addMedication(newName, newDosage, newSchedule);
    setMeds([...meds, created]);
    setNewName('');
    setNewDosage('');
    setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    removeMedication(id);
    setMeds(meds.filter((m) => m.id !== id));
  };

  const filterBySchedule = (timing: string) => {
    return activeMeds.filter(
      (m) => (m.scheduleTime || 'Morning').toLowerCase() === timing.toLowerCase()
    );
  };

  const morningMeds = filterBySchedule('Morning');
  const afternoonMeds = filterBySchedule('Afternoon');
  const eveningMeds = filterBySchedule('Evening');
  const bedtimeMeds = filterBySchedule('Bedtime');
  const otherMeds = activeMeds.filter(
    (m) =>
      !['morning', 'afternoon', 'evening', 'bedtime'].includes(
        (m.scheduleTime || '').toLowerCase()
      )
  );

  return (
    <div className="space-y-4 pb-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => {
            triggerHaptic('light');
            onBack();
          }}
          className="clinical-btn-secondary min-h-[36px] px-3 py-1 text-xs shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[2]" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsAdding(!isAdding);
          }}
          className="clinical-btn-primary min-h-[36px] px-3 py-1 text-xs inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2]" />
          <span>Add Habit</span>
        </button>
      </div>

      {/* Hero Overview Card */}
      <div className="clinical-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Pill className="w-4 h-4 text-[var(--teal-primary)] stroke-[2] shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
                Adherence Tracker
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Medications & Habits
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Keep track of daily medications, vitamins, and critical wellness protocols.
            </p>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-[var(--teal-primary)] border border-teal-200 font-mono shrink-0">
            {completedCount}/{activeMeds.length} Done
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>Today's Adherence</span>
            <span className="font-semibold text-[var(--text-primary)]">{completionPct}%</span>
          </div>
          <div className="w-full h-2 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden border border-[var(--border-color)]">
            <div
              className="h-full bg-[var(--teal-primary)] rounded-full transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Add New Habit Form Dropdown */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="clinical-card p-4 space-y-3 border-[var(--teal-primary)]/40 bg-[var(--teal-subtle)]/30 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Add Medication or Habit
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                Name or Routine
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Vitamin D3, Blood pressure Rx, Electrolytes"
                className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--teal-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                  Dosage / Amount
                </label>
                <input
                  type="text"
                  value={newDosage}
                  onChange={(e) => setNewDosage(e.target.value)}
                  placeholder="e.g., 2000 IU, 1 capsule"
                  className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--teal-primary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                  Schedule
                </label>
                <select
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--teal-primary)]"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Bedtime">Bedtime</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="clinical-btn-primary w-full text-xs mt-1"
            >
              Save Habit
            </button>
          </div>
        </form>
      )}

      {/* Routine Sections */}
      {/* 1. Morning */}
      {morningMeds.length > 0 && (
        <section className="clinical-card p-4 space-y-2.5">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Sun className="w-4 h-4 text-amber-500 stroke-[2]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">
              Morning Protocol
            </h2>
          </div>
          <div className="space-y-1.5">
            {morningMeds.map((med) => renderMedRow(med))}
          </div>
        </section>
      )}

      {/* 2. Afternoon */}
      {afternoonMeds.length > 0 && (
        <section className="clinical-card p-4 space-y-2.5">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Sun className="w-4 h-4 text-orange-500 stroke-[2]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">
              Afternoon Protocol
            </h2>
          </div>
          <div className="space-y-1.5">
            {afternoonMeds.map((med) => renderMedRow(med))}
          </div>
        </section>
      )}

      {/* 3. Evening */}
      {eveningMeds.length > 0 && (
        <section className="clinical-card p-4 space-y-2.5">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Sunset className="w-4 h-4 text-indigo-500 stroke-[2]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">
              Evening Protocol
            </h2>
          </div>
          <div className="space-y-1.5">
            {eveningMeds.map((med) => renderMedRow(med))}
          </div>
        </section>
      )}

      {/* 4. Bedtime / Other */}
      {(bedtimeMeds.length > 0 || otherMeds.length > 0) && (
        <section className="clinical-card p-4 space-y-2.5">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Moon className="w-4 h-4 text-indigo-600 stroke-[2]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] font-mono">
              Night & Bedtime Protocol
            </h2>
          </div>
          <div className="space-y-1.5">
            {[...bedtimeMeds, ...otherMeds].map((med) => renderMedRow(med))}
          </div>
        </section>
      )}

      {activeMeds.length === 0 && (
        <div className="clinical-card p-8 text-center space-y-3">
          <Pill className="w-8 h-8 text-[var(--text-secondary)] mx-auto opacity-50" />
          <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
            No habits or medications configured yet. Tap "Add Habit" to track daily vitamins, supplements, or prescriptions.
          </p>
        </div>
      )}

      {/* Adherence Best Practices Note */}
      <div className="clinical-card p-4 space-y-2 bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--teal-primary)] stroke-[2]" />
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">
            Clinical Adherence Tips
          </h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Consistent timing reinforces circadian metabolic pathways. Always take fat-soluble vitamins (D, K, Omega-3) with dietary fats for optimal absorption.
        </p>
      </div>
    </div>
  );

  function renderMedRow(med: MedicationItem) {
    const isTaken = takenIds.includes(med.id);
    return (
      <div
        key={med.id}
        onClick={() => handleToggle(med.id)}
        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
          isTaken
            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--teal-primary)]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
              isTaken
                ? 'bg-[var(--status-success)] border-[var(--status-success)] text-white'
                : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-transparent'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>

          <div>
            <span
              className={`text-xs font-semibold block transition-colors ${
                isTaken ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {med.name}
            </span>
            {med.dosage && (
              <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                {med.dosage}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => handleDelete(med.id, e)}
          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--status-alert)] transition-colors cursor-pointer"
          title="Delete habit"
          aria-label="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }
};
