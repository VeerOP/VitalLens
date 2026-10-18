import React from 'react';
import { Fingerprint, Zap, ZapOff, Info } from 'lucide-react';

interface FingerGuideOverlayProps {
  isCovered: boolean;
  torchSupported: boolean;
  torchOn: boolean;
  onToggleTorch: () => void;
}

export const FingerGuideOverlay: React.FC<FingerGuideOverlayProps> = ({
  isCovered,
  torchSupported,
  torchOn,
  onToggleTorch,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3.5 bg-black/30">
      {/* Top Coupling Status Pill */}
      <div className="pointer-events-auto bg-[#141C24]/90 backdrop-blur-xs border border-[#24303C] rounded-md px-3 py-1 text-xs text-white flex items-center gap-2 font-mono">
        <span
          className={`w-2 h-2 rounded-full ${
            isCovered ? 'bg-[var(--status-success)]' : 'bg-[var(--status-caution)]'
          }`}
        />
        <span>{isCovered ? 'Fingertip Coupled • Keep Steady' : 'Cover rear lens & flash gently'}</span>
      </div>

      {/* Target Reticle (Clinical, non-glowing) */}
      <div className="relative w-36 h-36 rounded-full border border-dashed border-white/20 flex items-center justify-center">
        <div
          className={`w-28 h-28 rounded-full transition-colors duration-200 flex flex-col items-center justify-center border ${
            isCovered
              ? 'bg-[#11281E]/60 border-[var(--status-success)]'
              : 'bg-[#141C24]/60 border-white/20'
          }`}
        >
          <Fingerprint
            className={`w-10 h-10 transition-colors ${
              isCovered ? 'text-[var(--status-success)]' : 'text-neutral-400'
            }`}
          />
          <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-300 mt-1 font-semibold">
            {isCovered ? 'SIGNAL DETECTED' : 'POSITION FINGER'}
          </span>
        </div>
      </div>

      {/* Flash Torch Control */}
      <div className="pointer-events-auto">
        {torchSupported ? (
          <button
            onClick={onToggleTorch}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border transition-colors cursor-pointer active:scale-95 ${
              torchOn
                ? 'bg-[var(--teal-primary)] text-white border-[var(--teal-primary)]'
                : 'bg-[#141C24] text-neutral-300 border-[#24303C] hover:bg-[#1D2630]'
            }`}
          >
            {torchOn ? <Zap className="w-3.5 h-3.5 fill-current stroke-[1.5]" /> : <ZapOff className="w-3.5 h-3.5 stroke-[1.5]" />}
            <span>{torchOn ? 'Flashlight On' : 'Enable Flashlight'}</span>
          </button>
        ) : (
          <div className="text-[10px] text-neutral-300 bg-[#141C24]/90 px-2.5 py-1 rounded-md border border-[#24303C] flex items-center gap-1.5 font-mono">
            <Info className="w-3 h-3 text-neutral-400 shrink-0" />
            <span>Position under bright ambient light</span>
          </div>
        )}
      </div>
    </div>
  );
};
