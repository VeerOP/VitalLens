import React, { useState, useEffect } from 'react';
import {
  Activity,
  UserCheck,
  ArrowRight,
  Heart,
  Clock,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { getScanHistory } from '../lib/storage/historyStore';
import type { VitalsRecord } from '../lib/storage/historyStore';
import { ClinicalInfoModal } from '../components/modals/ClinicalInfoModal';
import { HealthReadinessCard } from '../components/health/HealthReadinessCard';
import { DailyCheckInCard } from '../components/health/DailyCheckInCard';
import { MedicationTrackerCard } from '../components/health/MedicationTrackerCard';
import { CircadianPromptsCard } from '../components/health/CircadianPromptsCard';
import { calculateHealthReadiness, getTodayHealthLog } from '../lib/storage/dailyLogStore';
import { triggerHaptic } from '../lib/utils/haptics';

interface HomeProps {
  onStartFingertipScan: () => void;
  onStartFaceScan: () => void;
  onViewHistory: () => void;
  onViewAbout: () => void;
  onStartBreathing?: () => void;
  onOpenAssistant?: () => void;
  onNavigateReadiness?: () => void;
  onNavigateJournal?: () => void;
  onNavigateMedications?: () => void;
}

export const Home: React.FC<HomeProps> = ({
  onStartFingertipScan,
  onStartFaceScan,
  onViewHistory,
  onStartBreathing,
  onNavigateReadiness,
  onNavigateJournal,
  onNavigateMedications,
}) => {
  const [latestRecord, setLatestRecord] = useState<VitalsRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<VitalsRecord[]>([]);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isVitalsDetailOpen, setIsVitalsDetailOpen] = useState(false);
  const [todayLog, setTodayLog] = useState(() => getTodayHealthLog());

  const readiness = calculateHealthReadiness(
    latestRecord
      ? {
          heartRate: latestRecord.heartRate,
          hrvRmssd: latestRecord.hrvRmssd,
          spo2: latestRecord.spo2,
          recoveryScore: latestRecord.recoveryScore,
        }
      : undefined,
    todayLog
  );

  useEffect(() => {
    try {
      const history = getScanHistory();
      if (history && history.length > 0) {
        setLatestRecord(history[0]);
        setRecentRecords(history.slice(0, 3));
      }
    } catch {
      // Fallback
    }
  }, []);

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatRecordTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Today, ${timeStr}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-200">
      {/* 1. Header Greeting & Info Modal Trigger */}
      <div className="flex items-center justify-between pt-1 gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] text-[var(--text-secondary)] tracking-tight block">
            {todayStr}
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] truncate">
            {getGreeting()}
          </h1>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsHowItWorksOpen(true);
          }}
          className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          title="How VitalLens Works"
          aria-label="How it works"
        >
          <HelpCircle className="w-4 h-4 text-[var(--teal-primary)] stroke-[2] shrink-0" />
          <span className="text-xs font-medium">How it works</span>
        </button>
      </div>

      {/* 2. Circadian Health Action Prompt */}
      <CircadianPromptsCard
        onStartFingertipScan={onStartFingertipScan}
        onStartBreathing={onStartBreathing || onStartFingertipScan}
      />

      {/* 3. Daily Health Readiness & Autonomic Recovery Score */}
      <HealthReadinessCard
        readiness={readiness}
        onViewFullPage={onNavigateReadiness}
      />

      {/* 4. Latest Vitals Card (or Inviting Initial State) */}
      <section className="clinical-card p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--teal-primary)]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
              {latestRecord ? 'Latest Reading' : 'Vitals Status'}
            </h2>
          </div>

          {latestRecord ? (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Clock className="w-3.5 h-3.5 stroke-[1.8]" />
              <span>{formatRecordTime(latestRecord.timestamp)}</span>
            </div>
          ) : (
            <span className="text-[11px] text-[var(--text-muted)]">
              No measurements yet
            </span>
          )}
        </div>

        {latestRecord ? (
          <div className="pt-3.5 space-y-3">
            {/* Primary 4-Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Heart Rate */}
              <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Heart Rate</span>
                  <Heart className="w-3.5 h-3.5 text-[var(--teal-primary)] stroke-[2]" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                    {latestRecord.heartRate}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-mono">BPM</span>
                </div>
                <span className="text-[10px] text-[var(--status-success)] font-medium mt-0.5 block">
                  Normal (60–100)
                </span>
              </div>

              {/* SpO2 */}
              <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Oxygen</span>
                  <Activity className="w-3.5 h-3.5 text-[var(--teal-primary)] stroke-[2]" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                    {latestRecord.spo2}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-mono">%</span>
                </div>
                <span className="text-[10px] text-[var(--status-success)] font-medium mt-0.5 block">
                  Optimal (≥95%)
                </span>
              </div>

              {/* Respiration */}
              <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Breathing</span>
                  <span className="text-[10px] text-[var(--text-muted)]">RR</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                    {latestRecord.respiratoryRate}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-mono">bpm</span>
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] mt-0.5 block">
                  Normal (12–20)
                </span>
              </div>

              {/* Blood Pressure Trend */}
              <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Blood Pressure</span>
                  <span className="text-[9px] uppercase px-1 rounded bg-[var(--border-color)] text-[var(--text-secondary)]">Est</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                    {latestRecord.systolicBp}/{latestRecord.diastolicBp}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] mt-0.5 block">
                  mmHg
                </span>
              </div>
            </div>

            {/* Quick Details Trigger */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-[var(--border-color)]">
              <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--teal-primary)]" />
                <span>Optimal Signal Quality</span>
              </span>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsVitalsDetailOpen(true);
                }}
                className="text-[var(--teal-primary)] hover:underline font-medium inline-flex items-center gap-1 text-xs cursor-pointer"
              >
                <span>More Details</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-7 text-center space-y-3">
            <div className="w-11 h-11 rounded-full bg-[var(--teal-subtle)] text-[var(--teal-primary)] flex items-center justify-center mx-auto">
              <Heart className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Ready to measure your vitals
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
                Check your resting heart rate, blood oxygen, and respiration in 18 seconds.
              </p>
            </div>
            <button
              onClick={() => {
                triggerHaptic('medium');
                onStartFingertipScan();
              }}
              className="clinical-btn-primary mx-auto text-xs px-5 py-2 inline-flex items-center gap-2"
            >
              <Activity className="w-4 h-4 stroke-[2]" />
              <span>Take First Measurement</span>
            </button>
          </div>
        )}
      </section>

      {/* 5. Daily Health Check-in (Water, Sleep, Energy, Symptoms) */}
      <DailyCheckInCard
        initialLog={todayLog}
        onLogUpdated={(newLog) => setTodayLog(newLog)}
        onViewFullPage={onNavigateJournal}
      />

      {/* 6. Medications & Health Habits Tracker */}
      <MedicationTrackerCard
        onViewFullPage={onNavigateMedications}
      />

      {/* 7. Measurement Modalities (Clean & Compact) */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider font-mono px-1">
          Start Measurement
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Fingertip Scan Card */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              onStartFingertipScan();
            }}
            className="clinical-card p-4 hover:border-[var(--teal-primary)] transition-all text-left flex items-center justify-between group cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--teal-subtle)] text-[var(--teal-primary)] flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--teal-primary)] transition-colors">
                    Fingertip Scan
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--teal-primary)] bg-[var(--teal-subtle)] px-1.5 py-0.5 rounded">
                    18s
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Rear camera & flash
                </p>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--teal-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Facial Scan Card */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              onStartFaceScan();
            }}
            className="clinical-card p-4 hover:border-[var(--text-secondary)] transition-all text-left flex items-center justify-between group cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-primary)] transition-colors">
                    Face Scan
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] px-1.5 py-0.5 rounded">
                    20s
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Front camera video
                </p>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>
      </section>

      {/* 4. Recent Readings (Clean, compact list) */}
      {recentRecords.length > 0 && (
        <section className="clinical-card p-4 space-y-2.5">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Recent Readings
            </h3>
            <button
              onClick={onViewHistory}
              className="text-xs text-[var(--teal-primary)] hover:underline font-medium cursor-pointer"
            >
              See all
            </button>
          </div>

          <div className="divide-y divide-[var(--border-color)]">
            {recentRecords.map((r) => (
              <div
                key={r.id}
                onClick={onViewHistory}
                className="py-2 flex items-center justify-between text-xs cursor-pointer hover:bg-[var(--bg-surface-subtle)] px-1 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-primary)] font-medium">
                    {formatRecordTime(r.timestamp)}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase">
                    • {r.scanType}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[var(--text-primary)] font-semibold tabular-nums">
                    {r.heartRate} <span className="text-[10px] font-normal text-[var(--text-muted)]">BPM</span>
                  </span>
                  <span className="text-[var(--text-secondary)] tabular-nums">
                    {r.spo2}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Minimal Clinical Notice */}
      <div className="text-center pt-2 px-2">
        <button
          onClick={() => setIsHowItWorksOpen(true)}
          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--teal-primary)] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors max-w-full text-center flex-wrap"
        >
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>General wellness & biofeedback monitor. Learn more</span>
        </button>
      </div>

      {/* MODAL 1: How VitalLens Works */}
      <ClinicalInfoModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        title="How VitalLens Works"
        subtitle="Optical Photoplethysmography (PPG)"
      >
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              Optical Pulse Wave Detection
            </h4>
            <p>
              With each heartbeat, blood rushes through micro-capillaries in your fingertip, subtly changing how light from your iPhone flash is absorbed. VitalLens analyzes these micro-chromatic shifts at 30 frames per second to calculate heart rate and pulse wave metrics.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              Blood Oxygen (SpO2) Estimation
            </h4>
            <p>
              Oxygenated and deoxygenated hemoglobin absorb red and blue/green light wavelengths differently. VitalLens applies a dual-wavelength ratio-of-ratios algorithm to estimate your blood oxygen saturation percentage.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              Normal Reference Ranges
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li><strong>Resting Heart Rate:</strong> 60 – 100 BPM (athletes may be lower)</li>
              <li><strong>Oxygen Saturation:</strong> 95% – 100%</li>
              <li><strong>Respiratory Rate:</strong> 12 – 20 breaths per minute</li>
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-0.5">
              Medical Disclaimer
            </h4>
            <p className="text-[11px] text-[var(--text-secondary)]">
              VitalLens is not a certified medical device and is intended solely for wellness, fitness, and biofeedback monitoring. Always consult a licensed medical professional for diagnostic evaluations.
            </p>
          </div>
        </div>
      </ClinicalInfoModal>

      {/* MODAL 2: Vitals Details Breakdown */}
      {latestRecord && (
        <ClinicalInfoModal
          isOpen={isVitalsDetailOpen}
          onClose={() => setIsVitalsDetailOpen(false)}
          title="Measurement Breakdown"
          subtitle={`Recorded on ${formatRecordTime(latestRecord.timestamp)}`}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">HEART RATE</span>
                <span className="text-base font-bold text-[var(--text-primary)]">{latestRecord.heartRate} BPM</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">BLOOD OXYGEN</span>
                <span className="text-base font-bold text-[var(--text-primary)]">{latestRecord.spo2}% SpO2</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">RESPIRATION</span>
                <span className="text-base font-bold text-[var(--text-primary)]">{latestRecord.respiratoryRate} bpm</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">BLOOD PRESSURE (EST)</span>
                <span className="text-base font-bold text-[var(--text-primary)]">{latestRecord.systolicBp}/{latestRecord.diastolicBp} mmHg</span>
              </div>
            </div>

            {latestRecord.hrvRmssd != null && (
              <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">Heart Rate Variability (HRV)</span>
                  <span className="font-bold text-[var(--teal-primary)] font-mono">{latestRecord.hrvRmssd} ms RMSSD</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  RMSSD reflects vagal autonomic activity. Higher values typically correlate with better cardiovascular recovery and parasympathetic activation.
                </p>
              </div>
            )}
          </div>
        </ClinicalInfoModal>
      )}
    </div>
  );
};
