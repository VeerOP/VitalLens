/**
 * VitalLens Signal Processing - Fast Fourier Transform (FFT) & Spectral Analysis
 *
 * Provides high-resolution frequency domain analysis for cardiac (HR) & respiratory (RR) rates.
 * Uses 2048-point zero-padding and parabolic peak interpolation for sub-bin frequency accuracy (<0.1 BPM),
 * harmonic detection, and robust Signal-to-Noise Ratio (SNR) computation.
 */

import FFT from 'fft.js';

export interface SpectralAnalysis {
  frequencies: number[];  // Frequencies in Hz
  magnitudes: number[];   // Spectral magnitude per bin
  peakFrequency: number;  // Primary peak frequency in Hz with parabolic interpolation
  peakBPM: number;        // Equivalent BPM (Hz * 60)
  snr: number;            // Signal-to-Noise Ratio (dB)
  spectralPurity: number; // Percentage of in-band energy concentrated at peak [0-100]
}

/**
 * Determine optimal FFT size (at least 2048 for high frequency resolution)
 */
function getOptimalFFTSize(n: number): number {
  return Math.max(2048, Math.pow(2, Math.ceil(Math.log2(n))));
}

/**
 * Parabolic / Quadratic interpolation of spectral peak
 * Fits a 2nd-degree polynomial around the discrete peak bin to estimate exact continuous frequency
 */
function interpolateParabolicPeak(
  m1: number,
  m2: number,
  m3: number,
  peakBin: number,
  binWidthHz: number
): number {
  const denom = m1 - 2 * m2 + m3;
  if (Math.abs(denom) < 1e-12) {
    return peakBin * binWidthHz;
  }
  const delta = (0.5 * (m1 - m3)) / denom;
  const clampedDelta = Math.max(-0.5, Math.min(0.5, delta));
  return (peakBin + clampedDelta) * binWidthHz;
}

/**
 * Perform FFT spectral analysis on time-series PPG data
 * @param signal Filtered time series samples
 * @param sampleRate Sampling rate in Hz (e.g. 30 fps)
 * @param minFreqHz Lower frequency bound (e.g. 0.7 Hz)
 * @param maxFreqHz Upper frequency bound (e.g. 3.8 Hz)
 */
export function analyzeSpectrum(
  signal: number[],
  sampleRate: number = 30,
  minFreqHz: number = 0.7,
  maxFreqHz: number = 3.8
): SpectralAnalysis {
  if (!signal || signal.length < 16) {
    return {
      frequencies: [],
      magnitudes: [],
      peakFrequency: 0,
      peakBPM: 0,
      snr: 0,
      spectralPurity: 0,
    };
  }

  const N = getOptimalFFTSize(signal.length);
  const fft = new FFT(N);

  // Mean subtraction (DC removal) and Hanning window application
  const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
  const inComplex = new Array(N * 2).fill(0);

  const L = signal.length;
  for (let i = 0; i < L; i++) {
    // Hanning Window
    const windowWeight = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (L - 1)));
    inComplex[i * 2] = (signal[i] - mean) * windowWeight;
    inComplex[i * 2 + 1] = 0;
  }
  // Remaining items up to N are zero (zero-padding)

  const outComplex = fft.createComplexArray();
  fft.transform(outComplex, inComplex);

  const numBins = N / 2;
  const binWidthHz = sampleRate / N;

  const frequencies: number[] = [];
  const magnitudes: number[] = [];

  let maxMag = -1;
  let peakBinIndex = -1;

  for (let i = 0; i < numBins; i++) {
    const freq = i * binWidthHz;
    const real = outComplex[i * 2];
    const imag = outComplex[i * 2 + 1];
    const mag = Math.sqrt(real * real + imag * imag);

    frequencies.push(freq);
    magnitudes.push(mag);

    if (freq >= minFreqHz && freq <= maxFreqHz) {
      if (mag > maxMag) {
        maxMag = mag;
        peakBinIndex = i;
      }
    }
  }

  if (peakBinIndex < 0 || maxMag <= 0) {
    return {
      frequencies,
      magnitudes,
      peakFrequency: 0,
      peakBPM: 0,
      snr: 0,
      spectralPurity: 0,
    };
  }

  // Refine peak frequency using parabolic interpolation with adjacent bins
  const m1 = peakBinIndex > 0 ? magnitudes[peakBinIndex - 1] : magnitudes[peakBinIndex];
  const m2 = magnitudes[peakBinIndex];
  const m3 = peakBinIndex < numBins - 1 ? magnitudes[peakBinIndex + 1] : magnitudes[peakBinIndex];

  let refinedPeakFreqHz = interpolateParabolicPeak(m1, m2, m3, peakBinIndex, binWidthHz);
  refinedPeakFreqHz = Math.max(minFreqHz, Math.min(maxFreqHz, refinedPeakFreqHz));

  // Check for potential sub-harmonic or harmonic confusion
  // Half harmonic check (e.g. if dominant peak is 2x true HR)
  const halfFreq = refinedPeakFreqHz / 2;
  if (halfFreq >= minFreqHz) {
    const halfBin = Math.round(halfFreq / binWidthHz);
    if (halfBin >= 0 && halfBin < numBins) {
      const halfMag = magnitudes[halfBin];
      // If half frequency has > 65% amplitude of dominant peak, it is likely the true fundamental
      if (halfMag > maxMag * 0.65) {
        refinedPeakFreqHz = halfFreq;
      }
    }
  }

  // Calculate Signal-to-Noise Ratio (SNR) & Spectral Purity
  // Signal power = energy within ±3 bins around fundamental peak and 1st harmonic
  let signalPower = 0;
  let noisePower = 0;
  const harmonicBinIndex = Math.round((refinedPeakFreqHz * 2) / binWidthHz);

  const binHalfWidth = Math.max(3, Math.round(0.15 / binWidthHz)); // ~0.15 Hz integration band

  for (let i = 0; i < numBins; i++) {
    const freq = frequencies[i];
    if (freq < 0.2 || freq > 6.0) continue; // Ignore out-of-band DC and ultra-high frequency sensor noise

    const mag = magnitudes[i];
    const power = mag * mag;

    const inPrimaryPeak = Math.abs(i - peakBinIndex) <= binHalfWidth;
    const inHarmonic =
      harmonicBinIndex > 0 && Math.abs(i - harmonicBinIndex) <= binHalfWidth;

    if (inPrimaryPeak || inHarmonic) {
      signalPower += power;
    } else {
      noisePower += power;
    }
  }

  const snrRaw = noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : 0;
  const snr = Number.isFinite(snrRaw) ? Math.max(0, Math.min(35, Math.round(snrRaw * 10) / 10)) : 0;

  const totalBandPower = signalPower + noisePower;
  const spectralPurity = totalBandPower > 0 ? Math.round((signalPower / totalBandPower) * 100) : 0;

  return {
    frequencies,
    magnitudes,
    peakFrequency: Math.round(refinedPeakFreqHz * 1000) / 1000,
    peakBPM: Math.round(refinedPeakFreqHz * 60 * 10) / 10,
    snr,
    spectralPurity,
  };
}
