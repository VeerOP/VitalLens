/**
 * VitalLens Signal Processing - Time Domain Peak Detection
 *
 * Finds systolic peaks in filtered PPG waveforms using dynamic adaptive thresholding,
 * refractory window enforcement, and dicrotic notch reflection suppression.
 */

import { computeHRVMetrics, filterNNIntervals } from './hrvMetrics';
import type { HRVAssessment } from './hrvMetrics';

export interface PeakData {
  indices: number[];      // Sample indices where systolic peaks occur
  timestamps: number[];   // Timestamps in milliseconds
  ibiMs: number[];        // Raw Inter-Beat Intervals in ms
  nnIntervalsMs: number[];// Filtered Normal-to-Normal intervals in ms
  meanBpm: number;        // Heart Rate derived from peak intervals
  hrvRmssd: number;       // Heart Rate Variability (RMSSD in ms)
  hrv: HRVAssessment;     // Full HRV assessment
}

/**
 * Detect systolic peaks in filtered signal
 * @param signal Filtered PPG waveform (mean-centered, bandpass filtered)
 * @param sampleRate FPS of recorded frames (~20 - 60 fps)
 * @param timestamps Optional array of frame timestamps in ms
 * @param expectedBpm Optional expected BPM from FFT to set optimal refractory window
 */
export function detectPeaks(
  signal: number[],
  sampleRate: number = 30,
  timestamps?: number[],
  expectedBpm?: number
): PeakData {
  const emptyHRV = computeHRVMetrics([]);

  if (signal.length < sampleRate * 2) {
    return {
      indices: [],
      timestamps: [],
      ibiMs: [],
      nnIntervalsMs: [],
      meanBpm: 0,
      hrvRmssd: 0,
      hrv: emptyHRV,
    };
  }

  // 1. Calculate threshold based on signal mean & standard deviation
  const sum = signal.reduce((acc, val) => acc + val, 0);
  const mean = sum / signal.length;
  const variance = signal.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / signal.length;
  const stdDev = Math.sqrt(variance);

  // Peak must exceed mean + 0.20 * stdDev
  const minPeakHeight = mean + 0.20 * stdDev;

  // Adaptive refractory distance:
  // If expectedBpm is provided, scale refractory window to ~55% of cardiac cycle
  let minDistance = Math.max(5, Math.floor(sampleRate * 0.26));
  if (expectedBpm && expectedBpm > 40 && expectedBpm < 220) {
    const cycleSec = 60 / expectedBpm;
    minDistance = Math.max(5, Math.floor(sampleRate * cycleSec * 0.52));
  }

  // Candidate local maxima
  const candidates: { index: number; value: number }[] = [];
  for (let i = 1; i < signal.length - 1; i++) {
    const val = signal[i];
    if (val > signal[i - 1] && val >= signal[i + 1] && val > minPeakHeight) {
      candidates.push({ index: i, value: val });
    }
  }

  // Refractory enforcement & dicrotic notch suppression
  const peakIndices: number[] = [];

  for (const c of candidates) {
    if (peakIndices.length === 0) {
      peakIndices.push(c.index);
      continue;
    }

    const lastIdx = peakIndices[peakIndices.length - 1];
    const dist = c.index - lastIdx;

    if (dist >= minDistance) {
      // Dicrotic notch suppression: if dist is relatively short and amplitude is much smaller
      const isDicrotic = dist < sampleRate * 0.48 && c.value < signal[lastIdx] * 0.65;
      if (!isDicrotic) {
        peakIndices.push(c.index);
      }
    } else {
      // Within refractory zone: keep the higher peak
      if (c.value > signal[lastIdx]) {
        peakIndices[peakIndices.length - 1] = c.index;
      }
    }
  }

  // Inter-Beat Intervals (IBI)
  const peakTimestamps: number[] = [];
  const rawIbiMs: number[] = [];

  for (let i = 0; i < peakIndices.length; i++) {
    const idx = peakIndices[i];
    const ts = timestamps && timestamps[idx] != null ? timestamps[idx] : (idx / sampleRate) * 1000;
    peakTimestamps.push(ts);

    if (i > 0) {
      const interval = ts - peakTimestamps[i - 1];
      if (interval >= 260 && interval <= 1600) {
        rawIbiMs.push(interval);
      }
    }
  }

  // Clean NN intervals & compute HRV
  const nnIntervalsMs = filterNNIntervals(rawIbiMs);
  const hrv = computeHRVMetrics(nnIntervalsMs);

  let meanBpm = 0;
  if (nnIntervalsMs.length > 0) {
    const avgNn = nnIntervalsMs.reduce((a, b) => a + b, 0) / nnIntervalsMs.length;
    meanBpm = Math.round(60000 / avgNn);
  }

  return {
    indices: peakIndices,
    timestamps: peakTimestamps,
    ibiMs: rawIbiMs,
    nnIntervalsMs,
    meanBpm,
    hrvRmssd: hrv.rmssd,
    hrv,
  };
}
