import React, { useState, useEffect } from 'react';
import { fetchAllHistoryAsync, getScanHistory } from '../lib/storage/historyStore';
import type { VitalsRecord } from '../lib/storage/historyStore';
import { isSupabaseConfigured } from '../lib/storage/supabaseClient';
import { TrendChart } from '../components/history/TrendChart';
import { HistoryList } from '../components/history/HistoryList';
import { LifestyleHistoryView } from '../components/history/LifestyleHistoryView';
import { ClinicalSummaryModal } from '../components/history/ClinicalSummaryModal';
import { ArrowLeft, RefreshCw, Plus, FileText, Activity, Moon, Cloud } from 'lucide-react';
import { triggerHaptic } from '../lib/utils/haptics';

interface HistoryProps {
  onBack: () => void;
  onNewScan: () => void;
}

export const History: React.FC<HistoryProps> = ({ onBack, onNewScan }) => {
  const [records, setRecords] = useState<VitalsRecord[]>([]);
  const [viewMode, setViewMode] = useState<'vitals' | 'lifestyle'>('vitals');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await fetchAllHistoryAsync();
      setRecords(data);
    } catch {
      setRecords(getScanHistory());
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRefresh = () => {
    triggerHaptic('light');
    loadHistory();
  };

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-150">
      {/* Report Modal */}
      <ClinicalSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        records={records}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
        <div>
          <button
            onClick={onBack}
            className="clinical-btn-secondary min-h-[34px] px-2.5 py-1 text-xs mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2]" />
            <span>Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Health Records & Trends
            </h1>
            {isSupabaseConfigured() && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <Cloud className="w-3 h-3 stroke-[2]" />
                <span>Cloud Synced</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsSummaryOpen(true);
            }}
            className="clinical-btn-secondary min-h-[38px] px-3 text-xs flex items-center gap-1.5"
            title="Generate Clinical Doctor's Report"
          >
            <FileText className="w-3.5 h-3.5 text-[var(--teal-primary)] stroke-[2]" />
            <span>Report</span>
          </button>

          <button
            onClick={handleRefresh}
            className="clinical-btn-secondary min-h-[38px] p-2"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4 stroke-[1.8]" />
          </button>

          <button
            onClick={() => {
              triggerHaptic('medium');
              onNewScan();
            }}
            className="clinical-btn-primary min-h-[38px] px-3.5 text-xs flex-1 sm:flex-initial"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
            <span>New Scan</span>
          </button>
        </div>
      </div>

      {/* Segmented Mode Selector */}
      <div className="flex items-center p-1 bg-[var(--bg-surface-subtle)] rounded-xl border border-[var(--border-color)] gap-1">
        <button
          onClick={() => {
            triggerHaptic('light');
            setViewMode('vitals');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            viewMode === 'vitals'
              ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Activity className="w-3.5 h-3.5 stroke-[2]" />
          <span>Vitals Telemetry</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setViewMode('lifestyle');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            viewMode === 'lifestyle'
              ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Moon className="w-3.5 h-3.5 stroke-[2]" />
          <span>Lifestyle & Habits</span>
        </button>
      </div>

      {/* View Mode Content */}
      {viewMode === 'vitals' ? (
        <>
          {/* Interactive Trend Chart with 7-Day Baseline */}
          <TrendChart records={records} />

          {/* Full History Records List */}
          <HistoryList records={records} onRefresh={loadHistory} onNewScan={onNewScan} />
        </>
      ) : (
        <LifestyleHistoryView />
      )}
    </div>
  );
};
