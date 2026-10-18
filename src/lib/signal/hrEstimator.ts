/**
 * VitalLens Signal Processing - Heart Rate (HR) Estimator
 *
 * Integrates zero-phase cascaded Butterworth filtering, parabolic FFT frequency analysis,
 * and adaptive time-domain peak detection to output an accurate Heart Rate (BPM),
 * signal-to-noise ratio, confidence score, and HRV recovery metrics.
 */

import { bandpassFilterArray, movingAverageFilter, gaussianSmooth } from './filters';
import { analyzeSpectrum } from './fft';
import { detectPeaks } from './peakDetection';
import type { HRVAssessment } from './hrvMetrics';
import { computeHRVMetrics } from './hrvMetrics';

export interface HREstimationResult {
  bpm: number;              // Final cross-validated heart rate
  timeDomainBpm: number;    // Peak-detection BPM
  fftBpm: number;           // High-resolution FFT dominant frequency BPM
  confidence: number;       // 0 - 100% confidence score
  snrDb: number;            // Signal-to-noise ratio in dB
  spectralPurity: number;   // % of in-band energy at peak
  filteredSignal: number[]; // Processed display waveform
  rawSignal: number[];      // Raw channel intensity input
  hrvRmssd: number;         // Heart rate variability RMSSD in ms
  hrv: HRVAssessment;       // Comprehensive HRV assessment
  effectiveFps: number;     // True computed frame rate
}

/**
 * Compute true effective sampling frequency from recorded timestamps
 */
export function computeEffectiveFps(
  timestamps?: number[],
  fallbackFps: number = 30
): number {
  if (!timestamps || timestamps.length < 5) return fallbackFps;

  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  const durationSec = (last - first) / 1000;

  if (durationSec <= 0.1 || !Number.isFinite(durationSec)) {
    return fallbackFps;
  }

  const fps = (timestamps.length - 1) / durationSec;
  return Math.max(15, Math.min(65, Math.round(fps * 10) / 10));
}

/**
 * Estimate Heart Rate from a raw red-channel PPG signal array
 * @param rawRedSignal Mean red channel values per frame over 10-20 seconds
 * @param nominalSampleRate Nominal sampling rate in Hz (~30 fps)
 * @param timestamps Optional frame timestamps in ms
 */
export function estimateHeartRate(
  rawRedSignal: number[],
  nominalSampleRate: number = 30,
  timestamps?: number[]
): HREstimationResult {
  const emptyHRV = computeHRVMetrics([]);

  if (!rawRedSignal || rawRedSignal.length < 30) {
    return {
      bpm: 0,
      timeDomainBpm: 0,
      fftBpm: 0,
      confidence: 0,
      snrDb: 0,
      spectralPurity: 0,
      filteredSignal: [],
      rawSignal: rawRedSignal || [],
      hrvRmssd: 0,
      hrv: emptyHRV,
      effectiveFps: nominalSampleRate,
    };
  }

  // 1. Calculate true effective sampling frequency from timestamps
  const effectiveFps = computeEffectiveFps(timestamps, nominalSampleRate);

  // 2. Invert signal (optical absorption: blood pulse expansion causes drop in reflection)
  const meanRaw = rawRedSignal.reduce((a, b) => a + b, 0) / rawRedSignal.length;
  const inverted = rawRedSignal.map((v) => -(v - meanRaw));

  // 3. True zero-phase Band-pass Filter: 0.70 Hz to 3.80 Hz (42 BPM - 228 BPM)
  const filtered = bandpassFilterArray(inverted, 0.70, 3.80, effectiveFps);
  const smoothed = movingAverageFilter(filtered, 3);
  const waveOut = gaussianSmooth(smoothed, 0.8);

  // 4. Frequency-domain analysis via 2048-pt Parabolic FFT
  const spectrum = analyzeSpectrum(waveOut, effectiveFps, 0.70, 3.80);
  const fftBpm = spectrum.peakBPM;

  // 5. Time-domain peak detection with adaptive refractory guided by FFT spectral peak
  const peakResult = detectPeaks(waveOut, effectiveFps, timestamps, fftBpm);
  let timeDomainBpm = peakResult.meanBpm;

  // 6. Harmonic octave reconciliation
  // Check if peak detector caught double-frequency (dicrotic notch) or half-frequency
  if (fftBpm > 0 && timeDomainBpm > 0) {
    const ratio = timeDomainBpm / fftBpm;
    if (ratio >= 1.85 && ratio <= 2.15 && spectrum.snr > 8) {
      // Time domain double-counted dicrotic waves
      timeDomainBpm = Math.round(timeDomainBpm / 2);
    } else if (ratio >= 0.45 && ratio <= 0.55 && spectrum.snr > 8) {
      // Time domain missed alternating beats
      timeDomainBpm = Math.round(timeDomainBpm * 2);
    }
  }

  // 7. Cross-validate & weighted dual-domain fusion
  let finalBpm = 0;
  let confidence = 0;

  if (fftBpm > 0 && timeDomainBpm > 0) {
    const diff = Math.abs(fftBpm - timeDomainBpm);

    if (diff <= 4.0) {
      // Exceptional alignment
      finalBpm = Math.round(timeDomainBpm * 0.5 + fftBpm * 0.5);
      confidence = Math.min(99, Math.round(88 + spectrum.snr * 0.5 + spectrum.spectralPurity * 0.08));
    } else if (diff <= 10.0) {
      // High concordance
      if (spectrum.snr > 10) {
        finalBpm = Math.round(fftBpm * 0.65 + timeDomainBpm * 0.35);
      } else {
        finalBpm = Math.round(timeDomainBpm * 0.65 + fftBpm * 0.35);
      }
      confidence = Math.min(94, Math.round(76 + spectrum.snr * 0.45));
    } else if (diff <= 18.0) {
      // Moderate discrepancy
      if (spectrum.snr > 12) {
        finalBpm = Math.round(fftBpm);
        confidence = Math.round(68 + spectrum.snr * 0.3);
      } else if (peakResult.nnIntervalsMs.length >= 8) {
        finalBpm = timeDomainBpm;
        confidence = 65;
      } else {
        finalBpm = Math.round(fftBpm * 0.5 + timeDomainBpm * 0.5);
        confidence = 55;
      }
    } else {
      // Large discrepancy
      finalBpm = spectrum.snr >= 10 ? Math.round(fftBpm) : (timeDomainBpm || Math.round(fftBpm));
      confidence = Math.max(35, Math.round(45 + spectrum.snr * 0.25));
    }
  } else {
    finalBpm = Math.round(fftBpm || timeDomainBpm || 0);
    confidence = finalBpm > 0 ? 55 : 0;
  }

  // Plausible physiological human bounds [40 - 210 BPM]
  finalBpm = Math.max(40, Math.min(210, finalBpm));

  return {
    bpm: finalBpm,
    timeDomainBpm,
    fftBpm,
    confidence,
    snrDb: spectrum.snr,
    spectralPurity: spectrum.spectralPurity,
    filteredSignal: waveOut,
    rawSignal: rawRedSignal,
    hrvRmssd: peakResult.hrvRmssd,
    hrv: peakResult.hrv,
    effectiveFps,
  };
}
