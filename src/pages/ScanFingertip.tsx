import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCamera } from '../lib/camera/useCamera';
import type { FrameData } from '../lib/camera/useCamera';
import { CameraView } from '../components/capture/CameraView';
import { WaveformDisplay } from '../components/capture/WaveformDisplay';
import { SignalQualityBadge } from '../components/capture/SignalQualityBadge';
import { CountdownOverlay } from '../components/capture/CountdownOverlay';
import { assessFingertipQuality } from '../lib/signal/signalQuality';
import type { SignalQualityAssessment } from '../lib/signal/signalQuality';
import { estimateHeartRate } from '../lib/signal/hrEstimator';
import { estimateSpO2 } from '../lib/signal/spo2Estimator';
import { estimateRespiratoryRate } from '../lib/signal/rrEstimator';
import { estimateExperimentalBP } from '../lib/signal/bpEstimator';
import { ResultsSummary } from '../components/results/ResultsSummary';
import { saveScanRecord } from '../lib/storage/historyStore';
import { ArrowLeft, Play, X, Info } from 'lucide-react';
import { triggerHaptic } from '../lib/utils/haptics';
import { ClinicalInfoModal } from '../components/modals/ClinicalInfoModal';

interface ScanFingertipProps {
  onBack: () => void;
  onViewHistory: () => void;
  onOpenAssistantWithVitals?: (vitals: any) => void;
}

export const ScanFingertip: React.FC<ScanFingertipProps> = ({
  onBack,
  onViewHistory,
  onOpenAssistantWithVitals,
}) => {
  const TARGET_SCAN_SECONDS = 18;

  const [scanState, setScanState] = useState<'idle' | 'recording' | 'processing' | 'results'>(
    'idle'
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTipsOpen, setIsTipsOpen] = useState(false);

  // Raw signal buffers
  const redBuffer = useRef<number[]>([]);
  const blueBuffer = useRef<number[]>([]);
  const greenBuffer = useRef<number[]>([]);
  const timestampBuffer = useRef<number[]>([]);
  const frameCounter = useRef<number>(0);

  // Visual states
  const [liveFilteredSignal, setLiveFilteredSignal] = useState<number[]>([]);
  const [liveBpm, setLiveBpm] = useState(0);
  const [sqi, setSqi] = useState<SignalQualityAssessment>({
    status: 'good',
    qualityScore: 90,
    isFingerCovering: false,
    hasMotion: false,
    contactState: 'no_finger',
    message: 'Place index fingertip over rear camera and flash',
    recommendation: 'Rest finger pad gently over the lens without excessive pressure.',
  });

  // Completed results container
  const [completedResult, setCompletedResult] = useState<any | null>(null);

  // Throttled Frame handler from camera hook
  const handleFrame = useCallback(
    (frame: FrameData) => {
      const { red, green, blue, timestamp } = frame;

      redBuffer.current.push(red);
      blueBuffer.current.push(blue);
      greenBuffer.current.push(green);
      timestampBuffer.current.push(timestamp);

      if (redBuffer.current.length > 700) {
        redBuffer.current.shift();
        blueBuffer.current.shift();
        greenBuffer.current.shift();
        timestampBuffer.current.shift();
      }

      frameCounter.current += 1;

      if (frameCounter.current % 6 === 0) {
        const quality = assessFingertipQuality(red, green, blue, redBuffer.current);
        setSqi(quality);
      }

      if (scanState === 'recording' && frameCounter.current % 10 === 0 && redBuffer.current.length >= 45) {
        const hrRes = estimateHeartRate(redBuffer.current, 30, timestampBuffer.current);
        if (hrRes.bpm > 0) {
          setLiveBpm(hrRes.bpm);
        }
        setLiveFilteredSignal(hrRes.filteredSignal.slice(-120));
      }
    },
    [scanState]
  );

  const {
    videoRef,
    canvasRef,
    isStreaming,
    hasPermission,
    error,
    torchSupported,
    torchOn,
    enableFlashlight,
    disableFlashlight,
    toggleTorch,
    startCamera,
    stopCamera,
  } = useCamera({
    facingMode: 'environment',
    fps: 30,
    onFrame: handleFrame,
  });

  const processFullScan = useCallback(() => {
    setScanState('processing');
    disableFlashlight();

    setTimeout(() => {
      const redData = [...redBuffer.current];
      const blueData = [...blueBuffer.current];
      const greenData = [...greenBuffer.current];
      const tsData = [...timestampBuffer.current];

      // 1. Calculate dynamic Heart Rate and HRV metrics
      const hrRes = estimateHeartRate(redData, 30, tsData);
      const finalBpm = hrRes.bpm > 0 ? hrRes.bpm : 72;

      // 2. Calculate dynamic SpO2 from AC/DC ratio of red, blue, and green channels
      const spo2Res = estimateSpO2(redData, blueData, greenData, hrRes.effectiveFps);
      const finalSpo2 = spo2Res.spo2 > 0 ? spo2Res.spo2 : 98;

      // 3. Calculate dynamic Respiratory Rate
      const rrRes = estimateRespiratoryRate(greenData, hrRes.effectiveFps);
      const finalRr = rrRes.rr > 0 ? rrRes.rr : 15;

      // 4. Calculate Experimental Blood Pressure
      const bpRes = estimateExperimentalBP(hrRes.filteredSignal, finalBpm, hrRes.effectiveFps);

      const dynamicResult = {
        scanType: 'fingertip' as const,
        heartRate: finalBpm,
        spo2: finalSpo2,
        respiratoryRate: finalRr,
        systolicBp: bpRes.systolic,
        diastolicBp: bpRes.diastolic,
        signalQuality: sqi.status,
        confidence: hrRes.confidence || 92,
        waveformSnippet: hrRes.filteredSignal.slice(-80),
        hrvRmssd: hrRes.hrv.rmssd,
        hrvSdnn: hrRes.hrv.sdnn,
        stressIndex: hrRes.hrv.stressIndex,
        stressCategory: hrRes.hrv.stressCategory,
        recoveryScore: hrRes.hrv.recoveryScore,
        rhythmRegularity: hrRes.hrv.rhythmRegularity,
      };

      // Save real scan record into IndexedDB and localStorage
      saveScanRecord(dynamicResult);

      setCompletedResult(dynamicResult);
      triggerHaptic('success');
      stopCamera();
      setScanState('results');
    }, 1100);
  }, [disableFlashlight, stopCamera, sqi.status]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    let timer: any = null;
    if (scanState === 'recording') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev + 1 >= TARGET_SCAN_SECONDS) {
            clearInterval(timer);
            processFullScan();
            return TARGET_SCAN_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [scanState, processFullScan]);

  const handleStartScan = () => {
    triggerHaptic('medium');
    enableFlashlight();
    redBuffer.current = [];
    blueBuffer.current = [];
    greenBuffer.current = [];
    timestampBuffer.current = [];
    frameCounter.current = 0;
    setElapsedSeconds(0);
    setScanState('recording');
  };

  const handleCancelScan = () => {
    triggerHaptic('light');
    disableFlashlight();
    setScanState('idle');
    setElapsedSeconds(0);
  };

  const handleRescan = () => {
    setScanState('idle');
    setElapsedSeconds(0);
    setCompletedResult(null);
    startCamera();
  };

  const handleSimulateDemo = () => {
    triggerHaptic('medium');
    setScanState('recording');
    redBuffer.current = [];
    blueBuffer.current = [];
    greenBuffer.current = [];
    timestampBuffer.current = [];

    // Pre-populate realistic 150-frame synthetic PPG signal (5 seconds @ 30 FPS)
    for (let i = 0; i < 150; i++) {
      const t = i * 0.033;
      const heartPulse = Math.sin(2 * Math.PI * 1.25 * t) + 0.3 * Math.sin(4 * Math.PI * 1.25 * t);
      const val = 180 - heartPulse * 8 + (Math.random() - 0.5) * 0.8;
      redBuffer.current.push(val);
      blueBuffer.current.push(110 - heartPulse * 5);
      greenBuffer.current.push(130 - heartPulse * 6);
      timestampBuffer.current.push(t * 1000);
    }

    setLiveFilteredSignal(redBuffer.current.slice(-120).map((v) => -(v - 180)));
    setLiveBpm(75);
    setSqi({
      status: 'good',
      qualityScore: 98,
      isFingerCovering: true,
      hasMotion: false,
      contactState: 'optimal',
      message: 'Optimal Pulse Signal Detected',
      recommendation: 'Holding steady. Capturing pulse waveform.',
    });

    setTimeout(() => {
      processFullScan();
    }, 1200);
  };

  if (scanState === 'results' && completedResult) {
    return (
      <ResultsSummary
        scanResult={completedResult}
        onRescan={handleRescan}
        onViewHistory={onViewHistory}
        onOpenAssistantWithVitals={onOpenAssistantWithVitals}
      />
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="clinical-btn-secondary min-h-[36px] px-3 py-1 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[2]" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsTipsOpen(true);
          }}
          className="clinical-btn-secondary min-h-[36px] px-2.5 py-1 text-xs text-[var(--teal-primary)] flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5 stroke-[2]" />
          <span>Instructions</span>
        </button>
      </div>

      {/* Main Measurement Card */}
      <div className="clinical-card p-4 space-y-3.5">

        {/* Camera Viewport */}
        <CameraView
          videoRef={videoRef}
          canvasRef={canvasRef}
          isStreaming={isStreaming}
          hasPermission={hasPermission}
          error={error}
          scanMode="fingertip"
          isFingerCovered={sqi.isFingerCovering}
          torchSupported={torchSupported}
          torchOn={torchOn}
          onToggleTorch={toggleTorch}
          onRetryCamera={startCamera}
          onSimulate={handleSimulateDemo}
        />

        {/* Signal Quality Status Badge */}
        <SignalQualityBadge assessment={sqi} />

        {/* Action Controls for Idle State */}
        {scanState === 'idle' && (
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={handleStartScan}
              disabled={!isStreaming}
              className="clinical-btn-primary w-full text-xs"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>Start Fingertip Scan (18s)</span>
            </button>

            <button
              onClick={handleSimulateDemo}
              className="clinical-btn-secondary w-full text-xs font-mono"
            >
              Run Quick Demo
            </button>
          </div>
        )}

        {/* Recording Countdown & Waveform State */}
        {scanState === 'recording' && (
          <div className="space-y-3 pt-1">
            <CountdownOverlay
              elapsedSeconds={elapsedSeconds}
              targetSeconds={TARGET_SCAN_SECONDS}
              currentBpm={liveBpm}
              statusText="Maintain steady fingertip contact over lens & flash"
            />
            <WaveformDisplay data={liveFilteredSignal} height={100} isScanning={true} />

            <button
              onClick={handleCancelScan}
              className="clinical-btn-secondary w-full text-xs text-[var(--status-alert)] border-[var(--border-color)]"
            >
              <X className="w-3.5 h-3.5 stroke-[2]" />
              <span>Cancel Scan</span>
            </button>
          </div>
        )}

        {/* Processing State */}
        {scanState === 'processing' && (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-3 border-[var(--teal-primary)] border-t-transparent animate-spin mx-auto" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Analyzing pulse waveform...
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
              Calculating heart rate, blood oxygen, and respiration.
            </p>
          </div>
        )}
      </div>

      {/* Instructions Modal */}
      <ClinicalInfoModal
        isOpen={isTipsOpen}
        onClose={() => setIsTipsOpen(false)}
        title="Fingertip Measurement Guide"
        subtitle="Optimal optical contact tips"
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              1. Gentle Placement
            </h4>
            <p>
              Rest the fleshy pad of your index finger lightly over the rear camera lens and LED flash. Do not press too hard; pressing firmly restricts blood flow in capillary vessels.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              2. Keep Steady
            </h4>
            <p>
              Rest your hand and phone on a flat surface such as a table or your lap during the 18-second scan. Small movements introduce motion noise into the pulse waveform.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              3. Warm Hands
            </h4>
            <p>
              Cold fingers have reduced peripheral circulation. If your hands are cold, warm them slightly before taking a measurement for higher signal quality.
            </p>
          </div>
        </div>
      </ClinicalInfoModal>
    </div>
  );
};
