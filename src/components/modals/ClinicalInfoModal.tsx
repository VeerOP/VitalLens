import React from 'react';
import { X } from 'lucide-react';
import { triggerHaptic } from '../../lib/utils/haptics';

interface ClinicalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const ClinicalInfoModal: React.FC<ClinicalInfoModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/35 backdrop-blur-[2px] transition-all animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--border-color)] shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-surface-subtle)]">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          {children}
        </div>

        {/* Bottom Dismiss Button */}
        <div className="p-3.5 border-t border-[var(--border-color)] bg-[var(--bg-surface)] pb-safe">
          <button
            onClick={handleClose}
            className="clinical-btn-primary w-full text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
