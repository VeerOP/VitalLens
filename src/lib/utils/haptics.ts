/**
 * VitalLens Mobile Utilities - Haptic Feedback
 *
 * Provides tactile vibration feedback on iPhone & mobile devices during scan lifecycle and taps.
 */

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(25);
        break;
      case 'heavy':
        navigator.vibrate(50);
        break;
      case 'success':
        // Double pulse for scan completion
        navigator.vibrate([30, 50, 40]);
        break;
      case 'warning':
        // Triple pulse for poor signal alert
        navigator.vibrate([20, 30, 20, 30, 20]);
        break;
    }
  } catch {
    // Ignore unsupported device error
  }
}
