import React from 'react';
import { CameraOff, RefreshCw, Activity } from 'lucide-react';
import { FingerGuideOverlay } from './FingerGuideOverlay';
import { FaceGuideOverlay } from './FaceGuideOverlay';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isStreaming: boolean;
  hasPermission: boolean | null;
  error: string | null;
  scanMode: 'fingertip' | 'face';
  isFingerCovered?: boolean;
  torchSupported?: boolean;
  torchOn?: boolean;
  onToggleTorch?: () => void;
  onRetryCamera: () => void;
  onSimulate?: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  canvasRef,
  isStreaming,
  hasPermission,
  error,
  scanMode,
  isFingerCovered = false,
  torchSupported = false,
  torchOn = false,
  onToggleTorch,
  onRetryCamera,
  onSimulate,
}) => {
  return (
    <div className="camera-viewport relative w-full aspect-[4/5] max-h-[360px] mx-auto rounded-xl overflow-hidden border border-[var(--border-color)] flex items-center justify-center bg-[#06090D]">
      {/* Hidden processing canvas used for frame ROI sampling */}
      <canvas ref={canvasRef} className="hidden" />

      {/* HTML5 Video element */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isStreaming ? 'opacity-100' : 'opacity-0'
        } ${scanMode === 'face' ? 'scale-x-[-1]' : ''}`}
      />

      {/* Streaming Guides */}
      {isStreaming && (
        <>
          {scanMode === 'fingertip' ? (
            <FingerGuideOverlay
              isCovered={isFingerCovered}
              torchSupported={torchSupported}
              torchOn={torchOn}
              onToggleTorch={onToggleTorch || (() => {})}
            />
          ) : (
            <FaceGuideOverlay isAligned={true} />
          )}
        </>
      )}

      {/* Camera Initialization / Requesting State */}
      {hasPermission === null && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#06090D] text-center p-6 space-y-3 z-10">
          <div className="w-9 h-9 rounded-full border-2 border-[var(--teal-primary)] border-t-transparent animate-spin" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-white">Initializing Optical Sensor</p>
            <p className="text-[11px] text-neutral-400 font-mono">
              Please tap "Allow" if prompted by your browser.
            </p>
          </div>
        </div>
      )}

      {/* Camera Permission Denied or Error State */}
      {(hasPermission === false || error) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0E1318] text-center p-6 z-20 space-y-3">
          <div className="w-11 h-11 rounded-lg bg-[var(--status-alert-bg)] text-[var(--status-alert)] flex items-center justify-center border border-[var(--border-color)]">
            <CameraOff className="w-5 h-5 stroke-[2]" />
          </div>
          
          <div className="space-y-1 max-w-xs">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Camera Access Required
            </h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {error || 'Camera permission was not granted. Ensure camera access is allowed in iOS Settings > Safari > Camera.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
            <button
              onClick={onRetryCamera}
              className="clinical-btn-primary w-full text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[2]" />
              <span>Retry Camera Permission</span>
            </button>
            {onSimulate && (
              <button
                onClick={onSimulate}
                className="clinical-btn-secondary w-full text-xs font-mono"
              >
                <Activity className="w-3.5 h-3.5 stroke-[2]" />
                <span>Run Signal Benchmark Demo</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
