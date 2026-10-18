import React from 'react';
import { UserCheck, Sun } from 'lucide-react';

interface FaceGuideOverlayProps {
  isAligned: boolean;
}

export const FaceGuideOverlay: React.FC<FaceGuideOverlayProps> = () => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3.5 bg-black/30">
      {/* Top Banner */}
      <div className="bg-[#141C24]/90 border border-[#24303C] rounded-md px-3 py-1 text-xs text-white font-mono flex items-center gap-2">
        <UserCheck className="w-3.5 h-3.5 text-[var(--teal-primary)] shrink-0 stroke-[2]" />
        <span>Align Face Within Oval</span>
      </div>

      {/* Face Alignment Oval Reticle */}
      <div className="relative w-48 h-60 rounded-[50%] border border-dashed border-white/30 flex items-center justify-center">
        <div className="absolute top-3 text-center">
          <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-300 bg-[#0E1318]/80 px-2 py-0.5 rounded border border-[#24303C]">
            Forehead & Cheeks ROI
          </span>
        </div>
        <div className="w-40 h-52 rounded-[50%] border border-white/10" />
      </div>

      {/* Ambient Lighting Advice */}
      <div className="bg-[#141C24]/90 px-3 py-1 rounded-md border border-[#24303C] text-[10px] text-neutral-300 flex items-center gap-1.5 font-mono">
        <Sun className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <span>Keep face steady and evenly illuminated</span>
      </div>
    </div>
  );
};
