/**
 * VitalLens Signal Processing - Signal Quality & Motion Artifact Assessor
 *
 * Analyzes optical illumination, red channel dominance, signal variance, and motion jitter
 * to inform the user whether finger placement or facial positioning is optimal.
 * Provides fine-grained contact states: NO_FINGER, TOO_DARK, BLANCHING, MOTION, FAIR, GOOD.
 */

export interface SignalQualityAssessment {
  status: 'good' | 'fair' | 'poor';
  qualityScore: number;     // 0 to 100
  isFingerCovering: boolean; // True if red light absorption is detected
  hasMotion: boolean;        // True if excessive motion jitter detected
  contactState?: 'optimal' | 'no_finger' | 'blanching' | 'too_dark' | 'motion' | 'partial';
  message: string;           // User actionable guidance
  recommendation: string;
}

/**
 * Assess fingertip PPG camera frame quality
 */
export function assessFingertipQuality(
  currentRed: number,
  currentGreen: number,
  currentBlue: number,
  redBuffer: number[]
): SignalQualityAssessment {
  const totalRgb = currentRed + currentGreen + currentBlue;
  const redRatio = totalRgb > 0 ? currentRed / totalRgb : 0;

  // 1. Extreme low light / covered with non-translucent object
  if (currentRed < 18 && currentGreen < 18 && currentBlue < 18) {
    return {
      status: 'poor',
      qualityScore: 10,
      isFingerCovering: false,
      hasMotion: false,
      contactState: 'too_dark',
      message: 'Lens Blocked or Pitch Black',
      recommendation: 'Ensure camera flash is ON or test under gentle room light.',
    };
  }

  // 2. Blanching detection: pressed too hard against the lens with flash on causes sensor whiteout
  if (currentRed > 250 && currentGreen > 245 && currentBlue > 240) {
    return {
      status: 'poor',
      qualityScore: 25,
      isFingerCovering: true,
      hasMotion: false,
      contactState: 'blanching',
      message: 'Pressed Too Hard (Blanching)',
      recommendation: 'Lighten your finger pressure. Rest your finger gently on the lens.',
    };
  }

  // 3. Finger coverage check:
  // When a translucent finger covers the camera lens, light passes through hemoglobin,
  // making the red channel dominate (redRatio > 0.45 or Red significantly higher than Blue)
  const isFingerCovering =
    currentRed >= 40 &&
    (redRatio > 0.44 || (currentRed > currentGreen * 1.25 && currentRed > currentBlue * 1.35));

  if (!isFingerCovering) {
    return {
      status: 'poor',
      qualityScore: 15,
      isFingerCovering: false,
      hasMotion: false,
      contactState: 'no_finger',
      message: 'Place Fingertip on Camera & Flash',
      recommendation: 'Place your index fingertip gently over the rear camera lens and LED flash.',
    };
  }

  // Initial calibration phase
  if (redBuffer.length < 15) {
    return {
      status: 'fair',
      qualityScore: 65,
      isFingerCovering: true,
      hasMotion: false,
      contactState: 'partial',
      message: 'Calibrating Optical Signal...',
      recommendation: 'Hold your finger steadily against the lens. Acquiring baseline...',
    };
  }

  // 4. Motion artifact assessment via frame-to-frame variance
  const recent = redBuffer.slice(-30);
  let frameDiffSum = 0;
  for (let i = 1; i < recent.length; i++) {
    frameDiffSum += Math.abs(recent[i] - recent[i - 1]);
  }
  const avgFrameDiff = frameDiffSum / (recent.length - 1);

  const hasMotion = avgFrameDiff > 11.0;

  if (hasMotion) {
    return {
      status: 'poor',
      qualityScore: 35,
      isFingerCovering: true,
      hasMotion: true,
      contactState: 'motion',
      message: 'Finger Movement Detected',
      recommendation: 'Rest your hand on a table or flat surface to eliminate tremors.',
    };
  }

  // 5. Pulsatile signal amplitude check
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < recent.length; i++) {
    if (recent[i] < minVal) minVal = recent[i];
    if (recent[i] > maxVal) maxVal = recent[i];
  }
  const peakToPeak = maxVal - minVal;

  if (peakToPeak < 0.6) {
    return {
      status: 'fair',
      qualityScore: 60,
      isFingerCovering: true,
      hasMotion: false,
      contactState: 'partial',
      message: 'Weak Pulsatile Amplitude',
      recommendation: 'Adjust finger position slightly or warm up cold fingers.',
    };
  }

  return {
    status: 'good',
    qualityScore: 96,
    isFingerCovering: true,
    hasMotion: false,
    contactState: 'optimal',
    message: 'Optimal Pulse Signal',
    recommendation: 'Excellent! Hold steady until the scan completes.',
  };
}

/**
 * Assess facial rPPG camera frame quality
 */
export function assessFaceQuality(
  greenMean: number,
  greenBuffer: number[]
): SignalQualityAssessment {
  if (greenMean < 22) {
    return {
      status: 'poor',
      qualityScore: 20,
      isFingerCovering: false,
      hasMotion: false,
      contactState: 'too_dark',
      message: 'Low Ambient Lighting',
      recommendation: 'Move into a brightly lit room or face towards a light source.',
    };
  }

  if (greenBuffer.length > 20) {
    const recent = greenBuffer.slice(-30);
    let diff = 0;
    for (let i = 1; i < recent.length; i++) {
      diff += Math.abs(recent[i] - recent[i - 1]);
    }
    const avgDiff = diff / (recent.length - 1);

    if (avgDiff > 9.0) {
      return {
        status: 'poor',
        qualityScore: 38,
        isFingerCovering: false,
        hasMotion: true,
        contactState: 'motion',
        message: 'Head Movement Detected',
        recommendation: 'Keep your face centered inside the guide oval and refrain from speaking.',
      };
    }
  }

  return {
    status: 'good',
    qualityScore: 94,
    isFingerCovering: false,
    hasMotion: false,
    contactState: 'optimal',
    message: 'Good Face Tracking Signal',
    recommendation: 'Breathe naturally and remain still.',
  };
}
