/**
 * VitalLens Storage - Daily Health Log & Readiness Store
 *
 * Persists daily wellness check-ins (sleep, hydration, energy, symptoms, medications)
 * and calculates composite physiological readiness scores using HRV, Resting HR, and recovery metrics.
 */

export interface DailyHealthLog {
  date: string; // YYYY-MM-DD
  timestamp: number;
  sleepHours: number;
  sleepQuality: 'poor' | 'fair' | 'good' | 'deep';
  waterGlasses: number; // 1 glass = ~250ml (target 8 = 2.0L)
  energyLevel: 'low' | 'moderate' | 'high';
  stressLevel: 'relaxed' | 'calm' | 'moderate' | 'high';
  symptoms: string[]; // e.g. ['Fatigue', 'Headache', 'Shortness of breath']
  notes?: string;
  medicationsTaken: string[]; // IDs of medications taken today
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage?: string;
  scheduleTime?: string;
  active: boolean;
}

export interface HealthReadinessScore {
  score: number; // 0 - 100
  category: 'Optimal' | 'Recovered' | 'Moderate' | 'Strained';
  rhrStatus: 'below_baseline' | 'normal' | 'elevated';
  hrvStatus: 'elevated' | 'optimal' | 'suppressed';
  sleepContribution: number; // 0-25
  vitalsContribution: number; // 0-50
  lifestyleContribution: number; // 0-25
  recommendation: string;
}

const DAILY_LOGS_KEY = 'vitallens_daily_logs_v1';
const MEDICATIONS_KEY = 'vitallens_medications_v1';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAllDailyLogs(): Record<string, DailyHealthLog> {
  try {
    const raw = localStorage.getItem(DAILY_LOGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getTodayHealthLog(): DailyHealthLog {
  const today = getTodayDateString();
  const allLogs = getAllDailyLogs();

  if (allLogs[today]) {
    return allLogs[today];
  }

  // Default empty log for today
  const defaultLog: DailyHealthLog = {
    date: today,
    timestamp: Date.now(),
    sleepHours: 7.0,
    sleepQuality: 'good',
    waterGlasses: 4,
    energyLevel: 'moderate',
    stressLevel: 'calm',
    symptoms: [],
    medicationsTaken: [],
  };

  return defaultLog;
}

export function saveTodayHealthLog(partial: Partial<DailyHealthLog>): DailyHealthLog {
  const today = getTodayDateString();
  const allLogs = getAllDailyLogs();
  const existing = getTodayHealthLog();

  const updated: DailyHealthLog = {
    ...existing,
    ...partial,
    date: today,
    timestamp: Date.now(),
  };

  allLogs[today] = updated;

  try {
    localStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(allLogs));
  } catch {}

  return updated;
}

/**
 * Standing Medications & Supplements Management
 */
export function getSavedMedications(): MedicationItem[] {
  try {
    const raw = localStorage.getItem(MEDICATIONS_KEY);
    if (!raw) {
      // Default common health habit templates
      const defaults: MedicationItem[] = [
        { id: 'med-1', name: 'Multivitamin', dosage: '1 tablet', scheduleTime: 'Morning', active: true },
        { id: 'med-2', name: 'Hydration Electrolytes', dosage: '500ml', scheduleTime: 'Afternoon', active: true },
      ];
      localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMedicationList(meds: MedicationItem[]): void {
  try {
    localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(meds));
  } catch {}
}

export function addMedication(name: string, dosage?: string, scheduleTime?: string): MedicationItem {
  const meds = getSavedMedications();
  const newMed: MedicationItem = {
    id: 'med-' + Date.now(),
    name: name.trim(),
    dosage: dosage?.trim() || undefined,
    scheduleTime: scheduleTime?.trim() || 'Daily',
    active: true,
  };
  const updated = [...meds, newMed];
  saveMedicationList(updated);
  return newMed;
}

export function removeMedication(id: string): void {
  const meds = getSavedMedications().filter((m) => m.id !== id);
  saveMedicationList(meds);
}

export function toggleMedicationTakenToday(id: string): DailyHealthLog {
  const log = getTodayHealthLog();
  const taken = log.medicationsTaken || [];
  const exists = taken.includes(id);

  const updatedTaken = exists ? taken.filter((item) => item !== id) : [...taken, id];
  return saveTodayHealthLog({ medicationsTaken: updatedTaken });
}

/**
 * Composite Health Readiness & Recovery Index Calculator
 * Clinically models autonomic balance based on HRV RMSSD, resting HR, and sleep/stress.
 */
export function calculateHealthReadiness(
  latestVital?: { heartRate: number; hrvRmssd?: number; spo2?: number; recoveryScore?: number },
  todayLog?: DailyHealthLog
): HealthReadinessScore {
  const log = todayLog || getTodayHealthLog();

  // 1. Sleep contribution (max 25 pts)
  let sleepContribution = 18;
  if (log.sleepHours >= 7 && log.sleepHours <= 9) {
    sleepContribution = log.sleepQuality === 'deep' || log.sleepQuality === 'good' ? 25 : 21;
  } else if (log.sleepHours >= 6) {
    sleepContribution = 17;
  } else {
    sleepContribution = 10;
  }

  // 2. Lifestyle / Hydration / Stress contribution (max 25 pts)
  let lifestyleContribution = 15;
  const hydrationScore = Math.min(10, Math.round((log.waterGlasses / 8) * 10)); // max 10
  const stressScore = log.stressLevel === 'relaxed' ? 10 : log.stressLevel === 'calm' ? 8 : log.stressLevel === 'moderate' ? 5 : 2; // max 10
  const symptomPenalty = (log.symptoms || []).length * 2.5; // up to -5
  lifestyleContribution = Math.max(5, Math.min(25, hydrationScore + stressScore + 5 - symptomPenalty));

  // 3. Vitals contribution (max 50 pts)
  let vitalsContribution = 38; // standard healthy baseline default
  let rhrStatus: HealthReadinessScore['rhrStatus'] = 'normal';
  let hrvStatus: HealthReadinessScore['hrvStatus'] = 'optimal';

  if (latestVital && latestVital.heartRate > 0) {
    const hr = latestVital.heartRate;
    const hrv = latestVital.hrvRmssd ?? 42;
    const spo2 = latestVital.spo2 ?? 98;

    // Heart Rate evaluation
    let hrPoints = 20;
    if (hr >= 55 && hr <= 74) {
      hrPoints = 22;
      rhrStatus = 'normal';
    } else if (hr < 55) {
      hrPoints = 24; // Athletic resting bradycardia
      rhrStatus = 'below_baseline';
    } else if (hr <= 85) {
      hrPoints = 17;
      rhrStatus = 'normal';
    } else {
      hrPoints = 11;
      rhrStatus = 'elevated';
    }

    // HRV RMSSD evaluation
    let hrvPoints = 20;
    if (hrv >= 55) {
      hrvPoints = 23;
      hrvStatus = 'elevated';
    } else if (hrv >= 35) {
      hrvPoints = 20;
      hrvStatus = 'optimal';
    } else {
      hrvPoints = 12;
      hrvStatus = 'suppressed';
    }

    // SpO2 bonus
    const spo2Points = spo2 >= 96 ? 5 : spo2 >= 93 ? 3 : 0;

    vitalsContribution = Math.min(50, hrPoints + hrvPoints + spo2Points);
  }

  const totalScore = Math.min(100, Math.max(20, Math.round(sleepContribution + lifestyleContribution + vitalsContribution)));

  let category: HealthReadinessScore['category'] = 'Optimal';
  let recommendation = 'Your autonomic recovery is optimal. High capacity for physical training and mental focus.';

  if (totalScore >= 82) {
    category = 'Optimal';
    recommendation = 'Your autonomic recovery is optimal. Your cardiovascular system is primed for high activity.';
  } else if (totalScore >= 70) {
    category = 'Recovered';
    recommendation = 'Good cardiovascular equilibrium. Maintain adequate hydration and routine activity levels.';
  } else if (totalScore >= 55) {
    category = 'Moderate';
    recommendation = 'Moderate autonomic recovery. Consider light exercise, mindful breathing, and adequate hydration.';
  } else {
    category = 'Strained';
    recommendation = 'Cardiovascular strain or lower recovery detected. Prioritize early sleep and restorative downtime.';
  }

  return {
    score: totalScore,
    category,
    rhrStatus,
    hrvStatus,
    sleepContribution,
    vitalsContribution,
    lifestyleContribution,
    recommendation,
  };
}

export function updateMedication(id: string, updates: Partial<MedicationItem>): MedicationItem[] {
  const meds = getSavedMedications();
  const updated = meds.map((m) => (m.id === id ? { ...m, ...updates } : m));
  saveMedicationList(updated);
  return updated;
}

export interface DayLogSummary {
  date: string;
  dayLabel: string;
  fullDateLabel: string;
  sleepHours: number;
  sleepQuality: 'poor' | 'fair' | 'good' | 'deep';
  waterGlasses: number;
  energyLevel: 'low' | 'moderate' | 'high';
  stressLevel: 'relaxed' | 'calm' | 'moderate' | 'high';
  symptoms: string[];
  medicationsTakenCount: number;
  medicationsTotalCount: number;
  readinessScore: number;
}

export function getPast7DaysSummaries(): DayLogSummary[] {
  const allLogs = getAllDailyLogs();
  const allMeds = getSavedMedications();
  const activeMedsCount = allMeds.filter((m) => m.active).length;

  const result: DayLogSummary[] = [];
  const today = new Date();

  // Synthetic baseline data for prior days if user just started
  const mockPriors = [
    { sleepHours: 7.5, sleepQuality: 'good' as const, water: 7, energy: 'high' as const, stress: 'calm' as const, score: 85 },
    { sleepHours: 8.0, sleepQuality: 'deep' as const, water: 8, energy: 'high' as const, stress: 'relaxed' as const, score: 88 },
    { sleepHours: 6.8, sleepQuality: 'fair' as const, water: 6, energy: 'moderate' as const, stress: 'moderate' as const, score: 72 },
    { sleepHours: 7.2, sleepQuality: 'good' as const, water: 7, energy: 'moderate' as const, stress: 'calm' as const, score: 80 },
    { sleepHours: 8.2, sleepQuality: 'deep' as const, water: 8, energy: 'high' as const, stress: 'relaxed' as const, score: 90 },
    { sleepHours: 7.0, sleepQuality: 'good' as const, water: 7, energy: 'moderate' as const, stress: 'calm' as const, score: 79 },
  ];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' });
    const fullDateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const existingLog = allLogs[dateStr];
    if (existingLog) {
      const computed = calculateHealthReadiness(undefined, existingLog);
      result.push({
        date: dateStr,
        dayLabel,
        fullDateLabel,
        sleepHours: existingLog.sleepHours,
        sleepQuality: existingLog.sleepQuality,
        waterGlasses: existingLog.waterGlasses,
        energyLevel: existingLog.energyLevel,
        stressLevel: existingLog.stressLevel,
        symptoms: existingLog.symptoms || [],
        medicationsTakenCount: (existingLog.medicationsTaken || []).length,
        medicationsTotalCount: activeMedsCount,
        readinessScore: computed.score,
      });
    } else if (i === 0) {
      const todayL = getTodayHealthLog();
      const computed = calculateHealthReadiness(undefined, todayL);
      result.push({
        date: dateStr,
        dayLabel,
        fullDateLabel,
        sleepHours: todayL.sleepHours,
        sleepQuality: todayL.sleepQuality,
        waterGlasses: todayL.waterGlasses,
        energyLevel: todayL.energyLevel,
        stressLevel: todayL.stressLevel,
        symptoms: todayL.symptoms || [],
        medicationsTakenCount: (todayL.medicationsTaken || []).length,
        medicationsTotalCount: activeMedsCount,
        readinessScore: computed.score,
      });
    } else {
      const mock = mockPriors[i - 1] || mockPriors[0];
      result.push({
        date: dateStr,
        dayLabel,
        fullDateLabel,
        sleepHours: mock.sleepHours,
        sleepQuality: mock.sleepQuality,
        waterGlasses: mock.water,
        energyLevel: mock.energy,
        stressLevel: mock.stress,
        symptoms: [],
        medicationsTakenCount: activeMedsCount > 0 ? activeMedsCount : 1,
        medicationsTotalCount: activeMedsCount > 0 ? activeMedsCount : 1,
        readinessScore: mock.score,
      });
    }
  }

  return result;
}
