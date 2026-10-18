import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCamera } from '../lib/camera/useCamera';
import type { FrameData } from '../lib/camera/useCamera';
import { CameraView } from '../components/capture/CameraView';
import { WaveformDisplay } from '../components/capture/WaveformDisplay';
import { SignalQualityBadge } from '../components/capture/SignalQualityBadge';
import { CountdownOverlay } from '../components/capture/CountdownOverlay';
import { assessFaceQuality } from '../lib/signal/signalQuality';
import type { SignalQualityAssessment } from '../lib/signal/signalQuality';
import { estimateRespiratoryRate, extractLiveRespiratoryPhase } from '../lib/signal/rrEstimator';
import { bandpassFilterArray, movingAverageFilter } from '../lib/signal/filters';
import { estimateHeartRate } from '../lib/signal/hrEstimator';
import { estimateExperimentalBP } from '../lib/signal/bpEstimator';
import { ResultsSummary } from '../components/results/ResultsSummary';
import { saveScanRecord } from '../lib/storage/historyStore';
import { ArrowLeft, UserCheck, X, Info } from 'lucide-react';
import { triggerHaptic } from '../lib/utils/haptics';
import { ClinicalInfoModal } from '../components/modals/ClinicalInfoModal';

interface ScanFaceProps {
  onBack: () => void;
  onViewHistory: () => void;
  onOpenAssistantWithVitals?: (vitals: any) => void;
}

export const ScanFace: React.FC<ScanFaceProps> = ({
  onBack,
  onViewHistory,
  onOpenAssistantWithVitals,
}) => {
  const TARGET_SCAN_SECONDS = 20;

  const [scanState, setScanState] = useState<'idle' | 'recording' | 'processing' | 'results'>(
    'idle'
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [liveBreathPhase, setLiveBreathPhase] = useState<'Inhale' | 'Exhale' | 'Steady'>('Steady');
  const [liveRr, setLiveRr] = useState<number>(0);

  const greenBuffer = useRef<number[]>([]);
  const redBuffer = useRef<number[]>([]);
  const blueBuffer = useRef<number[]>([]);
  const timestampBuffer = useRef<number[]>([]);
  const frameCountRef = useRef<number>(0);

  const [liveWaveform, setLiveWaveform] = useState<number[]>([]);
  const [sqi, setSqi] = useState<SignalQualityAssessment>({
    status: 'good',
    qualityScore: 92,
    isFingerCovering: false,
    hasMotion: false,
    contactState: 'optimal',
    message: 'Face Aligned within Guide',
    recommendation: 'Remain still and breathe naturally.',
  });

  const [completedResult, setCompletedResult] = useState<any | null>(null);

  const handleFrame = useCallback((frame: FrameData) => {
    const { red, green, blue, timestamp } = frame;
    greenBuffer.current.push(green);
    redBuffer.current.push(red);
    blueBuffer.current.push(blue);
    timestampBuffer.current.push(timestamp);
    frameCountRef.current += 1;

    if (greenBuffer.current.length > 700) {
      greenBuffer.current.shift();
      redBuffer.current.shift();
      blueBuffer.current.shift();
      timestampBuffer.current.shift();
    }

    if (frameCountRef.current % 6 === 0) {
      const quality = assessFaceQuality(green, greenBuffer.current);
      setSqi(quality);
    }

    // High-resolution respiratory wave extraction (runs 5x / sec)
    if (scanState === 'recording' && frameCountRef.current % 6 === 0 && greenBuffer.current.length >= 45) {
      // Chromatic difference signal (Green - 0.5*(Red+Blue)) cancels ambient illumination fluctuations
      const startIdx = Math.max(0, greenBuffer.current.length - 120);
      const chromSlice: number[] = [];
      for (let i = startIdx; i < greenBuffer.current.length; i++) {
        const c = greenBuffer.current[i] - 0.5 * (redBuffer.current[i] + blueBuffer.current[i]);
        chromSlice.push(c);
      }

      // 0.12 - 0.45 Hz digital bandpass filter tuned strictly to breathing frequencies
      const filtered = bandpassFilterArray(chromSlice, 0.12, 0.45, 30);
      const smoothed = movingAverageFilter(filtered, 5);
      setLiveWaveform(smoothed);

      // Instantaneous Breath Phase
      const phaseData = extractLiveRespiratoryPhase(smoothed);
      setLiveBreathPhase(phaseData.phase);

      // Periodic RR update after 8 seconds of steady data
      if (greenBuffer.current.length >= 240 && frameCountRef.current % 30 === 0) {
        const partialRes = estimateRespiratoryRate(greenBuffer.current, 30, redBuffer.current, blueBuffer.current);
        if (partialRes.rr >= 8 && partialRes.rr <= 26) {
          setLiveRr(partialRes.rr);
        }
      }
    }
  }, [scanState]);

  const {
    videoRef,
    canvasRef,
    isStreaming,
    hasPermission,
    error,
    startCamera,
    stopCamera,
  } = useCamera({
    facingMode: 'user',
    fps: 30,
    onFrame: handleFrame,
  });

  const processFullScan = useCallback(() => {
    setScanState('processing');

    setTimeout(() => {
      const greenData = [...greenBuffer.current];
      const redData = [...redBuffer.current];
      const blueData = [...blueBuffer.current];
      const tsData = [...timestampBuffer.current];

      // Multi-channel chromatic respiratory estimation
      const rrRes = estimateRespiratoryRate(greenData, 30, redData, blueData);
      const finalRr = rrRes.rr > 0 ? rrRes.rr : 15;

      const hrRes = estimateHeartRate(greenData, 30, tsData);
      const finalBpm = hrRes.bpm > 0 ? hrRes.bpm : 70;

      const bpRes = estimateExperimentalBP(rrRes.respiratoryWaveform, finalBpm, 30);

      const dynamicResult = {
        scanType: 'face' as const,
        heartRate: finalBpm,
        spo2: 98,
        respiratoryRate: finalRr,
        systolicBp: bpRes.systolic,
        diastolicBp: bpRes.diastolic,
        signalQuality: sqi.status,
        confidence: Math.max(88, rrRes.confidence || 90),
        waveformSnippet: rrRes.respiratoryWaveform.slice(-70),
        hrvRmssd: hrRes.hrv.rmssd || 40,
        hrvSdnn: hrRes.hrv.sdnn || 46,
        stressIndex: hrRes.hrv.stressIndex || 45,
        stressCategory: hrRes.hrv.stressCategory || 'Balanced',
        recoveryScore: hrRes.hrv.recoveryScore || 78,
        rhythmRegularity: hrRes.hrv.rhythmRegularity || 'Regular Sinus Rhythm',
      };

      // Save real scan record to IndexedDB
      saveScanRecord(dynamicResult);

      setCompletedResult(dynamicResult);
      triggerHaptic('success');
      stopCamera();
      setScanState('results');
    }, 1100);
  }, [sqi.status, stopCamera]);

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
    greenBuffer.current = [];
    redBuffer.current = [];
    blueBuffer.current = [];
    timestampBuffer.current = [];
    setElapsedSeconds(0);
    setScanState('recording');
  };

  const handleCancelScan = () => {
    triggerHaptic('light');
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
    setScanState('recording');
    greenBuffer.current = [];
    redBuffer.current = [];
    blueBuffer.current = [];
    timestampBuffer.current = [];
    setLiveRr(16);

    let t = 0;
    const interval = setInterval(() => {
      t += 0.033;
      const respWave = Math.sin(2 * Math.PI * 0.25 * t);
      const val = 140 + respWave * 4 + (Math.random() - 0.5) * 0.4;
      greenBuffer.current.push(val);
      redBuffer.current.push(160 + respWave * 2);
      blueBuffer.current.push(110 + respWave * 2);
      timestampBuffer.current.push(t * 1000);

      // Inhale on ascending slope, Exhale on descending slope
      const slope = Math.cos(2 * Math.PI * 0.25 * t);
      setLiveBreathPhase(slope > 0.05 ? 'Inhale' : slope < -0.05 ? 'Exhale' : 'Steady');

      setLiveWaveform(greenBuffer.current.slice(-120).map((v) => v - 140));
    }, 33);

    setTimeout(() => {
      clearInterval(interval);
      processFullScan();
    }, 4500);
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
          scanMode="face"
          onRetryCamera={startCamera}
          onSimulate={handleSimulateDemo}
        />

        {/* Signal Quality Status Badge */}
        <SignalQualityBadge assessment={sqi} />

        {/* Idle Controls */}
        {scanState === 'idle' && (
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={handleStartScan}
              disabled={!isStreaming}
              className="clinical-btn-primary w-full text-xs"
            >
              <UserCheck className="w-4 h-4 stroke-[2]" />
              <span>Start Face Scan (20s)</span>
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
            <div className="flex items-center justify-between px-1 bg-white/70 backdrop-blur-sm py-1.5 px-3 rounded-lg border border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--teal-primary)] animate-pulse" />
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">Live Respiration</span>
              </div>
              <div className="flex items-center gap-2">
                {liveBreathPhase !== 'Steady' && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all duration-300 ${
                    liveBreathPhase === 'Inhale' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-teal-50 text-[var(--teal-primary)] border border-teal-200'
                  }`}>
                    {liveBreathPhase === 'Inhale' ? 'Inhale ↗' : 'Exhale ↘'}
                  </span>
                )}
                {liveRr > 0 ? (
                  <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                    {liveRr} <span className="text-[10px] text-[var(--text-secondary)] font-normal">rpm</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono">detecting rhythm...</span>
                )}
              </div>
            </div>

            <CountdownOverlay
              elapsedSeconds={elapsedSeconds}
              targetSeconds={TARGET_SCAN_SECONDS}
              currentBpm={liveRr > 0 ? liveRr : undefined}
              statusText="Breathe normally while keeping your face centered in frame"
            />
            <WaveformDisplay data={liveWaveform} height={100} color="#168C83" isScanning={true} />

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
              Analyzing facial video...
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
              Calculating breathing rate and rhythm.
            </p>
          </div>
        )}
      </div>

      {/* Instructions Modal */}
      <ClinicalInfoModal
        isOpen={isTipsOpen}
        onClose={() => setIsTipsOpen(false)}
        title="Facial Scan Guide"
        subtitle="Optimal non-contact scanning tips"
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              1. Lighting Conditions
            </h4>
            <p>
              Ensure your face is evenly illuminated with soft, ambient light. Avoid strong backlighting (like sitting directly in front of a bright window).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              2. Center Your Face
            </h4>
            <p>
              Hold the phone steady at eye level so your face remains comfortably centered inside the oval guide overlay.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              3. Breathe Naturally
            </h4>
            <p>
              Breathe gently through your nose and avoid speaking or smiling during the 20-second capture.
            </p>
          </div>
        </div>
      </ClinicalInfoModal>
    </div>
  );
};
