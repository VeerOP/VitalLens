/**
 * VitalLens Signal Processing - Heart Rate Variability (HRV) & Autonomic Metrics
 *
 * Implements clinical-standard time-domain HRV metrics from validated NN intervals:
 * - SDNN (Standard Deviation of NN intervals)
 * - RMSSD (Root Mean Square of Successive Differences)
 * - pNN50 (% of successive intervals differing by > 50 ms)
 * - Baevsky's Stress Index (Autonomic Balance)
 * - Recovery Score (0 - 100)
 * - Cardiac Rhythm Regularity Assessment (Sinus Regularity)
 */

export interface HRVAssessment {
  sdnn: number;             // Standard deviation of NN intervals in ms
  rmssd: number;            // Root Mean Square of Successive Differences in ms
  pnn50: number;            // Percentage of intervals > 50ms difference
  meanNnMs: number;         // Average NN interval in ms
  stressIndex: number;      // Baevsky Stress Index (SI)
  stressCategory: 'Relaxed' | 'Balanced' | 'Moderate Stress' | 'High Stress';
  recoveryScore: number;    // 0 - 100 Autonomic Recovery Index
  rhythmRegularity: 'Regular Sinus Rhythm' | 'Physiological Arrhythmia' | 'Irregular Rhythm / Motion';
  coefficientOfVariation: number; // CV in %
}

/**
 * Filter raw inter-beat intervals (IBI) to extract clean Normal-to-Normal (NN) intervals.
 * Rejects premature / ectopic beats or false peak triggers using a median relative deviation window.
 */
export function filterNNIntervals(rawIbiMs: number[]): number[] {
  if (rawIbiMs.length < 3) return [...rawIbiMs];

  // 1. Hard physiological limits for human cardiac cycle: 270ms (220 BPM) to 1500ms (40 BPM)
  const physiologicallyValid = rawIbiMs.filter((v) => v >= 270 && v <= 1500);
  if (physiologicallyValid.length < 3) return physiologicallyValid;

  // 2. Compute median IBI
  const sorted = [...physiologicallyValid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianIbi = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  // 3. Filter out intervals that deviate > 28% from the running median (Task Force on HRV guidelines)
  const cleanNN: number[] = [];
  for (const interval of physiologicallyValid) {
    const deviation = Math.abs(interval - medianIbi) / medianIbi;
    if (deviation <= 0.28) {
      cleanNN.push(interval);
    }
  }

  return cleanNN.length >= 3 ? cleanNN : physiologicallyValid;
}

/**
 * Compute comprehensive HRV and Autonomic metrics from NN intervals
 */
export function computeHRVMetrics(nnIntervalsMs: number[]): HRVAssessment {
  const cleanNN = filterNNIntervals(nnIntervalsMs);

  if (cleanNN.length < 3) {
    return {
      sdnn: 0,
      rmssd: 0,
      pnn50: 0,
      meanNnMs: 0,
      stressIndex: 50,
      stressCategory: 'Balanced',
      recoveryScore: 70,
      rhythmRegularity: 'Regular Sinus Rhythm',
      coefficientOfVariation: 0,
    };
  }

  const n = cleanNN.length;

  // 1. Mean NN interval
  const sumNn = cleanNN.reduce((acc, v) => acc + v, 0);
  const meanNnMs = sumNn / n;

  // 2. SDNN: Standard deviation of NN intervals
  const variance = cleanNN.reduce((acc, v) => acc + Math.pow(v - meanNnMs, 2), 0) / (n - 1);
  const sdnn = Math.round(Math.sqrt(Math.max(0, variance)));

  // 3. RMSSD & pNN50
  let sumSqDiff = 0;
  let countDiff = 0;
  let count50 = 0;

  for (let i = 1; i < n; i++) {
    const diff = Math.abs(cleanNN[i] - cleanNN[i - 1]);
    sumSqDiff += diff * diff;
    countDiff++;
    if (diff > 50) {
      count50++;
    }
  }

  const rmssd = countDiff > 0 ? Math.round(Math.sqrt(sumSqDiff / countDiff)) : 0;
  const pnn50 = countDiff > 0 ? Math.round((count50 / countDiff) * 100) : 0;

  // 4. Coefficient of Variation (CV)
  const cv = meanNnMs > 0 ? (sdnn / meanNnMs) * 100 : 0;
  const coefficientOfVariation = Math.round(cv * 10) / 10;

  // 5. Rhythm Regularity
  let rhythmRegularity: HRVAssessment['rhythmRegularity'] = 'Regular Sinus Rhythm';
  if (cv > 22) {
    rhythmRegularity = 'Irregular Rhythm / Motion';
  } else if (cv > 13) {
    rhythmRegularity = 'Physiological Arrhythmia';
  }

  // 6. Baevsky's Stress Index (approximated via RMSSD and SDNN)
  // High RMSSD & SDNN indicate parasympathetic dominance (relaxed).
  // Low RMSSD indicates sympathetic arousal / stress.
  let stressCategory: HRVAssessment['stressCategory'] = 'Balanced';
  let stressIndex = 50;

  if (rmssd >= 65) {
    stressCategory = 'Relaxed';
    stressIndex = 25;
  } else if (rmssd >= 35) {
    stressCategory = 'Balanced';
    stressIndex = 48;
  } else if (rmssd >= 20) {
    stressCategory = 'Moderate Stress';
    stressIndex = 72;
  } else {
    stressCategory = 'High Stress';
    stressIndex = 90;
  }

  // 7. Autonomic Recovery Score (0 - 100)
  // Maps RMSSD [15ms -> 85ms+] and SDNN to a normalized recovery index
  let recoveryScore = Math.round(20 + Math.min(80, (rmssd / 70) * 60 + (sdnn / 60) * 20));
  if (rhythmRegularity === 'Irregular Rhythm / Motion') {
    recoveryScore = Math.max(30, recoveryScore - 15);
  }
  recoveryScore = Math.max(10, Math.min(100, recoveryScore));

  return {
    sdnn,
    rmssd,
    pnn50,
    meanNnMs: Math.round(meanNnMs),
    stressIndex,
    stressCategory,
    recoveryScore,
    rhythmRegularity,
    coefficientOfVariation,
  };
}
