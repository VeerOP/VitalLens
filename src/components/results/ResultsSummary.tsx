import React, { useState } from 'react';
import {
  Heart,
  Activity,
  Wind,
  Gauge,
  RotateCcw,
  Save,
  Check,
  Printer,
  Zap,
  Bot,
  HelpCircle,
  Info,
} from 'lucide-react';
import { VitalCard } from './VitalCard';
import { saveScanRecord } from '../../lib/storage/historyStore';
import { ReportCardModal } from './ReportCardModal';
import { ClinicalInfoModal } from '../modals/ClinicalInfoModal';
import { triggerHaptic } from '../../lib/utils/haptics';

export interface ScanResultData {
  scanType: 'fingertip' | 'face';
  heartRate: number;
  spo2: number;
  respiratoryRate: number;
  systolicBp: number;
  diastolicBp: number;
  signalQuality: 'good' | 'fair' | 'poor';
  confidence: number;
  waveformSnippet?: number[];
  hrvRmssd?: number;
  hrvSdnn?: number;
  stressIndex?: number;
  stressCategory?: string;
  recoveryScore?: number;
  rhythmRegularity?: string;
  notes?: string;
}

interface ResultsSummaryProps {
  scanResult: ScanResultData;
  onRescan: () => void;
  onViewHistory: () => void;
  onOpenAssistantWithVitals?: (vitals: ScanResultData) => void;
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({
  scanResult,
  onRescan,
  onViewHistory,
  onOpenAssistantWithVitals,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [notes, setNotes] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);

  const handleSave = () => {
    triggerHaptic('success');
    saveScanRecord({
      scanType: scanResult.scanType,
      heartRate: scanResult.heartRate,
      spo2: scanResult.spo2,
      respiratoryRate: scanResult.respiratoryRate,
      systolicBp: scanResult.systolicBp,
      diastolicBp: scanResult.diastolicBp,
      signalQuality: scanResult.signalQuality,
      confidence: scanResult.confidence,
      waveformSnippet: scanResult.waveformSnippet,
      hrvRmssd: scanResult.hrvRmssd,
      hrvSdnn: scanResult.hrvSdnn,
      stressIndex: scanResult.stressIndex,
      stressCategory: scanResult.stressCategory,
      recoveryScore: scanResult.recoveryScore,
      rhythmRegularity: scanResult.rhythmRegularity,
      notes: notes.trim() || undefined,
    });
    setIsSaved(true);
  };

  const getHrStatus = (hr: number): 'normal' | 'borderline' | 'abnormal' => {
    if (hr >= 60 && hr <= 100) return 'normal';
    if ((hr >= 50 && hr < 60) || (hr > 100 && hr <= 110)) return 'borderline';
    return 'abnormal';
  };

  const getSpo2Status = (spo2: number): 'normal' | 'borderline' | 'abnormal' => {
    if (spo2 >= 95) return 'normal';
    if (spo2 >= 92) return 'borderline';
    return 'abnormal';
  };

  const getRrStatus = (rr: number): 'normal' | 'borderline' | 'abnormal' => {
    if (rr >= 12 && rr <= 20) return 'normal';
    if ((rr >= 10 && rr < 12) || (rr > 20 && rr <= 24)) return 'borderline';
    return 'abnormal';
  };

  const getBpStatus = (systolic: number): 'normal' | 'borderline' | 'abnormal' => {
    if (systolic < 120) return 'normal';
    if (systolic < 130) return 'borderline';
    return 'abnormal';
  };

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-200">
      {/* Printable Clinical Report Modal */}
      <ReportCardModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        scanResult={scanResult}
      />

      {/* Header & Quick Actions */}
      <div className="clinical-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[var(--status-success-bg)] text-[var(--status-success)] font-semibold border border-[var(--border-color)]">
              Scan Complete
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {timeStr} • {scanResult.scanType === 'fingertip' ? 'Fingertip' : 'Face'}
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] mt-1">
            Vitals Assessment
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsReportOpen(true)}
            className="clinical-btn-secondary min-h-[36px] px-3 text-xs"
            title="Generate Clinical Report"
          >
            <Printer className="w-3.5 h-3.5 text-[var(--teal-primary)] shrink-0" />
            <span>Report</span>
          </button>

          <button
            onClick={onRescan}
            className="clinical-btn-secondary min-h-[36px] px-3 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>Rescan</span>
          </button>

          <button
            onClick={() => {
              if (!isSaved) handleSave();
              onViewHistory();
            }}
            className="clinical-btn-primary min-h-[36px] px-3.5 text-xs flex-1 sm:flex-initial"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 stroke-[2] shrink-0" /> : <Save className="w-3.5 h-3.5 stroke-[2] shrink-0" />}
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Recovery & Rhythm Highlight Row (Clean & Compact) */}
      {(scanResult.recoveryScore != null || scanResult.rhythmRegularity != null) && (
        <div className="clinical-card p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--teal-subtle)] text-[var(--teal-primary)] flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {scanResult.stressCategory || 'Balanced Tone'}
                </span>
                <span className="text-xs text-[var(--teal-primary)] font-mono font-semibold">
                  Score {scanResult.recoveryScore ?? 75}/100
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-secondary)]">
                {scanResult.rhythmRegularity || 'Regular Sinus Rhythm'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              setIsExplainOpen(true);
            }}
            className="text-[var(--teal-primary)] text-xs hover:underline flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>
        </div>
      )}

      {/* Vitals Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Heart Rate */}
        <VitalCard
          title="Heart Rate"
          value={scanResult.heartRate}
          unit="BPM"
          normalRange="60 – 100"
          status={getHrStatus(scanResult.heartRate)}
          statusText={
            scanResult.heartRate < 60
              ? 'Bradycardia'
              : scanResult.heartRate > 100
              ? 'Tachycardia'
              : 'Normal Resting'
          }
          icon={<Heart className="w-4 h-4 stroke-[2]" />}
          waveformSnippet={scanResult.waveformSnippet}
        />

        {/* SpO2 */}
        <VitalCard
          title="Blood Oxygen"
          value={scanResult.spo2}
          unit="%"
          normalRange="≥ 95%"
          status={getSpo2Status(scanResult.spo2)}
          statusText={
            scanResult.spo2 >= 95
              ? 'Optimal'
              : scanResult.spo2 >= 90
              ? 'Borderline'
              : 'Low'
          }
          icon={<Activity className="w-4 h-4 stroke-[2]" />}
        />

        {/* Respiratory Rate */}
        <VitalCard
          title="Respiration"
          value={scanResult.respiratoryRate}
          unit="bpm"
          normalRange="12 – 20"
          status={getRrStatus(scanResult.respiratoryRate)}
          statusText="Normal"
          icon={<Wind className="w-4 h-4 stroke-[2]" />}
        />

        {/* Blood Pressure Trend (Experimental) */}
        <VitalCard
          title="Blood Pressure"
          value={`${scanResult.systolicBp}/${scanResult.diastolicBp}`}
          unit="mmHg"
          normalRange="< 120/80"
          status={getBpStatus(scanResult.systolicBp)}
          statusText={scanResult.systolicBp < 120 ? 'Optimal' : 'Elevated'}
          icon={<Gauge className="w-4 h-4 stroke-[2]" />}
          isExperimental={true}
        />
      </div>

      {/* Optional Session Note */}
      <div className="clinical-card p-3 space-y-1">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note (e.g. morning resting, after coffee)..."
          className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)]"
        />
      </div>

      {/* Quick AI Clinician CTA */}
      {onOpenAssistantWithVitals && (
        <div className="clinical-card p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--teal-subtle)] text-[var(--teal-primary)] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                Have questions about this reading?
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Ask the AI assistant for guidance on your vitals.
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenAssistantWithVitals(scanResult)}
            className="clinical-btn-secondary min-h-[34px] text-xs px-3 text-[var(--teal-primary)] border-[var(--border-color)] cursor-pointer shrink-0"
          >
            <span>Ask Assistant</span>
          </button>
        </div>
      )}

      {/* Subtle Disclaimer Trigger */}
      <div className="text-center pt-1">
        <button
          onClick={() => setIsExplainOpen(true)}
          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--teal-primary)] inline-flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Understanding your metrics & reference ranges</span>
        </button>
      </div>

      {/* Details Modal */}
      <ClinicalInfoModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        title="Vitals Details & HRV Analysis"
        subtitle="Physiological metrics explained"
      >
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              Heart Rate & Rhythm
            </h4>
            <p>
              Your heart rate was {scanResult.heartRate} BPM with {scanResult.rhythmRegularity || 'regular sinus rhythm'}. A typical resting heart rate for adults ranges between 60 and 100 beats per minute.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-1">
              Blood Oxygen (SpO2)
            </h4>
            <p>
              Measured at {scanResult.spo2}%. Normal arterial oxygen saturation at sea level is typically 95% to 100%. Readings below 90% warrant attention and re-measurement.
            </p>
          </div>

          {scanResult.hrvRmssd != null && (
            <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
              <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                Heart Rate Variability (RMSSD: {scanResult.hrvRmssd} ms)
              </h4>
              <p className="text-[11px]">
                RMSSD measures beat-to-beat variability in heart rate. Higher HRV generally indicates robust parasympathetic nervous system tone and good physical recovery.
              </p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-0.5">
              Notice
            </h4>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Optical camera estimation is intended for wellness and biofeedback tracking. It should not be used as a substitute for professional clinical diagnosis.
            </p>
          </div>
        </div>
      </ClinicalInfoModal>
    </div>
  );
};
