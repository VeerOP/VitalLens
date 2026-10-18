/**
 * VitalLens Signal Processing - Digital Filtering Utilities
 *
 * Implements clinical-grade 2nd-order Butterworth IIR Filters:
 * - Butterworth High-Pass Filter (removes DC baseline drift & vasomotion)
 * - Butterworth Low-Pass Filter (removes high-frequency sensor noise)
 * - Cascaded Bandpass Filter with flat passband (0 dB) and sharp rolloff
 * - Zero-phase forward-backward filtering (filtfilt) with mirror reflection padding
 * - Gaussian and moving-average pulse wave smoothers
 */

export interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/**
 * 2nd-order Butterworth Low-Pass Filter
 */
export function butterworthLowpass(cutoffHz: number, sampleRate: number): BiquadCoeffs {
  const safeCutoff = Math.max(0.05, Math.min(cutoffHz, (sampleRate / 2) * 0.95));
  const ita = 1 / Math.tan((Math.PI * safeCutoff) / sampleRate);
  const q = Math.SQRT2; // Butterworth Q = 1 / sqrt(2)
  const b0 = 1 / (1 + q * ita + ita * ita);
  const b1 = 2 * b0;
  const b2 = b0;
  const a1 = 2 * (1 - ita * ita) * b0;
  const a2 = (1 - q * ita + ita * ita) * b0;

  return { b0, b1, b2, a1, a2 };
}

/**
 * 2nd-order Butterworth High-Pass Filter
 */
export function butterworthHighpass(cutoffHz: number, sampleRate: number): BiquadCoeffs {
  const safeCutoff = Math.max(0.02, Math.min(cutoffHz, (sampleRate / 2) * 0.9));
  const ita = 1 / Math.tan((Math.PI * safeCutoff) / sampleRate);
  const q = Math.SQRT2;
  const b0 = 1 / (1 + q * ita + ita * ita);
  const b1 = -2 * b0;
  const b2 = b0;
  const a1 = 2 * (1 - ita * ita) * b0;
  const a2 = (1 - q * ita + ita * ita) * b0;

  return {
    b0: b0 * ita * ita,
    b1: b1 * ita * ita,
    b2: b2 * ita * ita,
    a1,
    a2,
  };
}

/**
 * Apply a Biquad filter forward and backward (zero-phase filtfilt) with boundary padding
 */
export function applyBiquadFiltFilt(data: number[], coeffs: BiquadCoeffs): number[] {
  const n = data.length;
  if (n < 6) return [...data];

  // Reflection padding to eliminate startup and ending transients
  const padLen = Math.min(30, Math.floor(n / 3));
  const paddedLen = n + padLen * 2;
  const padded = new Array(paddedLen);

  const firstVal = data[0];
  for (let i = 0; i < padLen; i++) {
    padded[i] = 2 * firstVal - data[padLen - i];
  }
  for (let i = 0; i < n; i++) {
    padded[padLen + i] = data[i];
  }
  const lastVal = data[n - 1];
  for (let i = 0; i < padLen; i++) {
    padded[padLen + n + i] = 2 * lastVal - data[n - 1 - i - 1];
  }

  // Forward pass
  let x1 = padded[0];
  let x2 = padded[0];
  let y1 = padded[0];
  let y2 = padded[0];
  const fwd = new Array(paddedLen);

  for (let i = 0; i < paddedLen; i++) {
    const s = padded[i];
    const y =
      coeffs.b0 * s +
      coeffs.b1 * x1 +
      coeffs.b2 * x2 -
      coeffs.a1 * y1 -
      coeffs.a2 * y2;
    x2 = x1;
    x1 = s;
    y2 = y1;
    y1 = y;
    fwd[i] = y;
  }

  // Backward pass (reverses phase distortion)
  x1 = fwd[paddedLen - 1];
  x2 = fwd[paddedLen - 1];
  y1 = fwd[paddedLen - 1];
  y2 = fwd[paddedLen - 1];
  const bwd = new Array(paddedLen);

  for (let i = paddedLen - 1; i >= 0; i--) {
    const s = fwd[i];
    const y =
      coeffs.b0 * s +
      coeffs.b1 * x1 +
      coeffs.b2 * x2 -
      coeffs.a1 * y1 -
      coeffs.a2 * y2;
    x2 = x1;
    x1 = s;
    y2 = y1;
    y1 = y;
    bwd[i] = y;
  }

  // Extract unpadded array
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = bwd[padLen + i];
  }

  return result;
}

/**
 * True zero-phase Butterworth Bandpass filter (cascaded High-pass and Low-pass)
 */
export function bandpassFilterArray(
  data: number[],
  lowCutoff: number,
  highCutoff: number,
  sampleRate: number
): number[] {
  if (data.length < 8) return [...data];

  // 1. Subtract mean baseline to center signal around 0
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const centered = data.map((v) => v - mean);

  // 2. Cascade 2nd-order High-Pass and 2nd-order Low-Pass
  const hpCoeffs = butterworthHighpass(lowCutoff, sampleRate);
  const lpCoeffs = butterworthLowpass(highCutoff, sampleRate);

  const hpFiltered = applyBiquadFiltFilt(centered, hpCoeffs);
  const bpFiltered = applyBiquadFiltFilt(hpFiltered, lpCoeffs);

  return bpFiltered;
}

/**
 * Moving Average Smoother to reduce high-frequency noise jitter
 */
export function movingAverageFilter(data: number[], windowSize: number = 3): number[] {
  if (data.length === 0) return [];
  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < data.length) {
        sum += data[idx];
        count++;
      }
    }
    result.push(sum / count);
  }
  return result;
}

/**
 * Gaussian kernel smoother for natural pulse wave reconstruction
 */
export function gaussianSmooth(data: number[], sigma: number = 0.8): number[] {
  if (data.length === 0) return [];
  const radius = Math.ceil(sigma * 2.5);
  const kernel: number[] = [];
  let kernelSum = 0;

  for (let i = -radius; i <= radius; i++) {
    const val = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(val);
    kernelSum += val;
  }

  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= kernelSum;
  }

  const result = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    let acc = 0;
    let weightSum = 0;
    for (let j = -radius; j <= radius; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < data.length) {
        const w = kernel[j + radius];
        acc += data[idx] * w;
        weightSum += w;
      }
    }
    result[i] = weightSum > 0 ? acc / weightSum : data[i];
  }

  return result;
}
