/**
 * VitalLens Signal Processing - SpO2 (Blood Oxygen) Estimator
 *
 * Computes peripheral blood oxygen saturation using the Ratio-of-Ratios (R)
 * derived from alternating pulsatile (AC) and static baseline (DC) optical absorption
 * across Red (~660nm) and Blue/Green (~470nm) channels:
 *
 * R = (AC_red / DC_red) / (AC_ref / DC_ref)
 * SpO2 = 110 - 25 * R
 *
 * Enhanced with bandpass isolation of true pulsatile AC components to eliminate
 * ambient light drift distortion.
 */

import { bandpassFilterArray } from './filters';

export interface SpO2Result {
  spo2: number;          // Estimated blood oxygen percentage (85% - 100%)
  ratioOfRatios: number; // R value
  acRed: number;
  dcRed: number;
  acBlue: number;
  dcBlue: number;
  isReliable: boolean;
  confidence: number;    // 0 - 100%
  statusText: string;
}

/**
 * Estimate SpO2 from simultaneous Red and Blue time series buffers
 * @param redSignal Array of mean red channel intensities
 * @param blueSignal Array of mean blue channel intensities
 * @param greenSignal Optional array of green channel intensities for reference stabilization
 * @param sampleRate Frame sampling rate in Hz (~30 fps)
 */
export function estimateSpO2(
  redSignal: number[],
  blueSignal: number[],
  greenSignal?: number[],
  sampleRate: number = 30
): SpO2Result {
  if (
    !redSignal ||
    !blueSignal ||
    redSignal.length < sampleRate * 3 ||
    redSignal.length !== blueSignal.length
  ) {
    return {
      spo2: 0,
      ratioOfRatios: 0,
      acRed: 0,
      dcRed: 0,
      acBlue: 0,
      dcBlue: 0,
      isReliable: false,
      confidence: 0,
      statusText: 'Insufficient frames',
    };
  }

  // 1. Calculate DC components (mean optical baseline)
  const dcRed = redSignal.reduce((a, b) => a + b, 0) / redSignal.length;
  const rawDcBlue = blueSignal.reduce((a, b) => a + b, 0) / blueSignal.length;

  // Use blended reference (70% Blue + 30% Green) if green available, for sensor optical balance
  let refSignal = blueSignal;
  let dcRef = rawDcBlue;

  if (greenSignal && greenSignal.length === redSignal.length) {
    refSignal = new Array(blueSignal.length);
    let sumRef = 0;
    for (let i = 0; i < blueSignal.length; i++) {
      const val = blueSignal[i] * 0.75 + greenSignal[i] * 0.25;
      refSignal[i] = val;
      sumRef += val;
    }
    dcRef = sumRef / blueSignal.length;
  }

  if (dcRed < 10 || dcRef < 10) {
    return {
      spo2: 0,
      ratioOfRatios: 0,
      acRed: 0,
      dcRed,
      acBlue: 0,
      dcBlue: dcRef,
      isReliable: false,
      confidence: 0,
      statusText: 'Low camera illumination',
    };
  }

  // 2. Isolate true pulsatile AC components via bandpass filter (0.7 Hz - 3.8 Hz)
  const acRedWave = bandpassFilterArray(redSignal, 0.7, 3.8, sampleRate);
  const acRefWave = bandpassFilterArray(refSignal, 0.7, 3.8, sampleRate);

  // Compute Root-Mean-Square (RMS) amplitude of pulsatile AC
  let sumSqRed = 0;
  let sumSqRef = 0;
  for (let i = 0; i < acRedWave.length; i++) {
    sumSqRed += acRedWave[i] * acRedWave[i];
    sumSqRef += acRefWave[i] * acRefWave[i];
  }

  const acRed = Math.sqrt(sumSqRed / acRedWave.length);
  const acRef = Math.sqrt(sumSqRef / acRefWave.length);

  if (acRed < 0.04 || acRef < 0.04) {
    return {
      spo2: 0,
      ratioOfRatios: 0,
      acRed,
      dcRed,
      acBlue: acRef,
      dcBlue: dcRef,
      isReliable: false,
      confidence: 20,
      statusText: 'Weak pulse amplitude',
    };
  }

  // 3. Ratio of Ratios: R = (AC_red / DC_red) / (AC_ref / DC_ref)
  const rRed = acRed / dcRed;
  const rRef = acRef / dcRef;

  const R = rRed / (rRef || 1e-6);

  // 4. Calibration Curve: SpO2 = 110 - 25 * R
  let calculatedSpo2 = 110 - 25 * R;

  // Sensor saturation calibration compression
  if (calculatedSpo2 > 99) {
    calculatedSpo2 = 98.6 + (calculatedSpo2 - 99) * 0.12;
  }

  // Bound to physiological range for living human respiration [85% - 100%]
  const boundedSpo2 = Math.min(100, Math.max(85, Math.round(calculatedSpo2 * 10) / 10));

  const isReliable = R >= 0.25 && R <= 1.45 && acRed >= 0.1;
  const confidence = isReliable ? Math.min(96, Math.round(80 + Math.min(16, acRed * 10))) : 45;

  let statusText = 'Normal Saturation';
  if (boundedSpo2 < 90) statusText = 'Low SpO2 (Hypoxemia)';
  else if (boundedSpo2 < 95) statusText = 'Borderline Saturation';

  return {
    spo2: Math.round(boundedSpo2),
    ratioOfRatios: Math.round(R * 1000) / 1000,
    acRed: Math.round(acRed * 100) / 100,
    dcRed: Math.round(dcRed * 10) / 10,
    acBlue: Math.round(acRef * 100) / 100,
    dcBlue: Math.round(dcRef * 10) / 10,
    isReliable,
    confidence,
    statusText,
  };
}
