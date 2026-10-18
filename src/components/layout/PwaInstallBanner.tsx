import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { triggerHaptic } from '../../lib/utils/haptics';

export const PwaInstallBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show in native Capacitor app or standalone mode
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      return;
    }

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const dismissed = localStorage.getItem('vitallens_pwa_dismissed');

    if (isIos && !isStandalone && !dismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    triggerHaptic('light');
    setShowBanner(false);
    localStorage.setItem('vitallens_pwa_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="w-full clinical-card p-3.5 relative mb-3">
      <button
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md cursor-pointer transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4 stroke-[1.8]" />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[var(--teal-subtle)] text-[var(--teal-primary)] shrink-0">
          <Smartphone className="w-4 h-4 stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h4 className="font-semibold text-xs text-[var(--text-primary)]">
            Run VitalLens as an iPhone App
          </h4>
          <div className="text-[11px] text-[var(--text-secondary)] mt-1.5 space-y-1">
            <div className="flex items-center gap-1">
              <span>1. Tap Safari's</span>
              <Share className="w-3 h-3 text-[var(--teal-primary)] shrink-0 inline" />
              <strong>Share</strong>
            </div>
            <div className="flex items-center gap-1">
              <span>2. Select</span>
              <PlusSquare className="w-3 h-3 text-[var(--teal-primary)] shrink-0 inline" />
              <strong>Add to Home Screen</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
