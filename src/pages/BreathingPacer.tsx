import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Wind, HelpCircle } from 'lucide-react';
import { triggerHaptic } from '../lib/utils/haptics';
import { ClinicalInfoModal } from '../components/modals/ClinicalInfoModal';

interface BreathingPacerProps {
  onBack: () => void;
  onStartFingertipScan?: () => void;
}

type BreathingTechnique = 'coherent' | 'box' | '478';

interface TechniqueConfig {
  name: string;
  shortLabel: string;
  cycles: { phase: 'Inhale' | 'Hold' | 'Exhale' | 'Rest'; duration: number }[];
  description: string;
}

const TECHNIQUES: Record<BreathingTechnique, TechniqueConfig> = {
  coherent: {
    name: 'Coherent Resonance (5.5s)',
    shortLabel: 'Coherent (5.5s)',
    cycles: [
      { phase: 'Inhale', duration: 5.5 },
      { phase: 'Exhale', duration: 5.5 },
    ],
    description: 'Breathe at ~5.5 seconds in and 5.5 seconds out (~5.5 breaths/min). This aligns respiration with heart rate variability to stimulate parasympathetic vagal recovery.',
  },
  box: {
    name: 'Box Breathing (4-4-4-4)',
    shortLabel: 'Box (4s)',
    cycles: [
      { phase: 'Inhale', duration: 4 },
      { phase: 'Hold', duration: 4 },
      { phase: 'Exhale', duration: 4 },
      { phase: 'Rest', duration: 4 },
    ],
    description: 'Equal intervals of inhale, hold, exhale, and rest. Used to rapidly reduce acute stress and steady the sympathetic nervous system.',
  },
  478: {
    name: '4-7-8 Deep Relaxation',
    shortLabel: 'Relax (4-7-8)',
    cycles: [
      { phase: 'Inhale', duration: 4 },
      { phase: 'Hold', duration: 7 },
      { phase: 'Exhale', duration: 8 },
    ],
    description: 'Extended exhalation stimulates acetylcholine release and slows heart rate, helping the body unwind before rest.',
  },
};

export const BreathingPacer: React.FC<BreathingPacerProps> = ({
  onBack,
}) => {
  const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique>('coherent');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentCycleIndex, setCurrentCycleIndex] = useState<number>(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState<number>(5.5);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const activeTechnique = TECHNIQUES[selectedTechnique];
  const currentStep = activeTechnique.cycles[currentCycleIndex];

  const timerRef = useRef<any>(null);

  useEffect(() => {
    setIsActive(false);
    setCurrentCycleIndex(0);
    setPhaseSecondsLeft(activeTechnique.cycles[0].duration);
    setCompletedCycles(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [selectedTechnique, activeTechnique]);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = 100;
    timerRef.current = setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        const next = Math.max(0, Math.round((prev - 0.1) * 10) / 10);
        if (next <= 0) {
          triggerHaptic('light');
          setCurrentCycleIndex((prevIdx) => {
            const nextIdx = (prevIdx + 1) % activeTechnique.cycles.length;
            if (nextIdx === 0) {
              setCompletedCycles((c) => c + 1);
            }
            return nextIdx;
          });
          return activeTechnique.cycles[(currentCycleIndex + 1) % activeTechnique.cycles.length].duration;
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, activeTechnique, currentCycleIndex]);

  const togglePacing = () => {
    triggerHaptic('medium');
    setIsActive((prev) => !prev);
  };

  const handleReset = () => {
    triggerHaptic('light');
    setIsActive(false);
    setCurrentCycleIndex(0);
    setPhaseSecondsLeft(activeTechnique.cycles[0].duration);
    setCompletedCycles(0);
  };

  const computeRingScale = () => {
    if (!isActive) return 1.0;
    const progress = 1 - phaseSecondsLeft / currentStep.duration;

    switch (currentStep.phase) {
      case 'Inhale':
        return 0.9 + progress * 0.24;
      case 'Hold':
        return 1.14;
      case 'Exhale':
        return 1.14 - progress * 0.24;
      case 'Rest':
      default:
        return 0.9;
    }
  };

  const circleScale = computeRingScale();

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
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
            setIsInfoOpen(true);
          }}
          className="clinical-btn-secondary min-h-[36px] px-2.5 py-1 text-xs text-[var(--teal-primary)] flex items-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />
          <span>How it works</span>
        </button>
      </div>

      {/* Clean Segmented Technique Selector */}
      <div className="flex items-center p-1 bg-[var(--bg-surface-subtle)] rounded-xl border border-[var(--border-color)] gap-1">
        {(Object.keys(TECHNIQUES) as BreathingTechnique[]).map((key) => {
          const config = TECHNIQUES[key];
          const isSelected = selectedTechnique === key;
          return (
            <button
              key={key}
              onClick={() => {
                triggerHaptic('light');
                setSelectedTechnique(key);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                isSelected
                  ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {config.shortLabel}
            </button>
          );
        })}
      </div>

      {/* Main Breathing Pacer Centerpiece */}
      <div className="clinical-card p-6 text-center flex flex-col items-center justify-center min-h-[320px]">
        {/* Breathing Circle Ring */}
        <div className="relative flex items-center justify-center my-4">
          <div
            className="w-48 h-48 rounded-full border border-[var(--teal-primary)] flex items-center justify-center transition-transform duration-300 ease-out"
            style={{
              transform: `scale(${circleScale})`,
            }}
          >
            {/* Inner Core */}
            <div className="w-34 h-34 rounded-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] flex flex-col items-center justify-center p-3 shadow-xs">
              <Wind className="w-5 h-5 text-[var(--teal-primary)] mb-1 stroke-[2]" />
              <span className="text-xs uppercase font-mono tracking-widest text-[var(--teal-primary)] font-bold">
                {isActive ? currentStep.phase : 'Ready'}
              </span>
              <div className="text-3xl font-bold text-[var(--text-primary)] mt-0.5 font-mono tabular-nums">
                {isActive ? phaseSecondsLeft.toFixed(1) : `${currentStep.duration}s`}
              </div>
            </div>
          </div>
        </div>

        {/* Status text & cycles */}
        <div className="space-y-1 mt-1">
          <p className="text-xs text-[var(--text-secondary)]">
            {isActive
              ? `${currentStep.phase} smoothly through your diaphragm`
              : 'Tap Start to begin guided breathing'}
          </p>
          <div className="text-[11px] text-[var(--text-muted)] font-mono">
            Cycles Completed: <span className="font-bold text-[var(--teal-primary)] tabular-nums">{completedCycles}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={togglePacing}
            className={`min-h-[44px] px-7 rounded-lg font-semibold text-xs tracking-wide transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
              isActive
                ? 'bg-[var(--status-caution)] text-white hover:opacity-90'
                : 'clinical-btn-primary'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>Start</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="clinical-btn-secondary min-h-[44px] p-2.5"
            title="Reset Pacer"
            aria-label="Reset Session"
          >
            <RotateCcw className="w-4 h-4 stroke-[1.8]" />
          </button>
        </div>
      </div>

      {/* Info Modal */}
      <ClinicalInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="Breathing Techniques & HRV"
        subtitle="Vagal nerve stimulation via respiration"
      >
        <div className="space-y-3">
          {(Object.keys(TECHNIQUES) as BreathingTechnique[]).map((key) => {
            const config = TECHNIQUES[key];
            return (
              <div key={key} className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                  {config.name}
                </h4>
                <p>{config.description}</p>
              </div>
            );
          })}
        </div>
      </ClinicalInfoModal>
    </div>
  );
};
