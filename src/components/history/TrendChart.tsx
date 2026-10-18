import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { VitalsRecord } from '../../lib/storage/historyStore';
import { calculatePersonalBaseline } from '../../lib/storage/historyStore';
import { Heart, Activity, Wind, Gauge, Zap } from 'lucide-react';

interface TrendChartProps {
  records: VitalsRecord[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ records }) => {
  const [selectedMetric, setSelectedMetric] = useState<'hr' | 'spo2' | 'rr' | 'bp' | 'hrv'>('hr');
  const baseline = calculatePersonalBaseline(records);

  if (!records || records.length === 0) {
    return (
      <div className="clinical-card p-6 text-center text-[var(--text-secondary)] font-mono text-xs">
        <p>No historical telemetry available to plot trends yet.</p>
      </div>
    );
  }

  // Format data for Recharts (reverse to sort chronologically ascending)
  const chartData = [...records].reverse().map((r) => {
    const dateStr = new Date(r.timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return {
      date: dateStr,
      heartRate: r.heartRate,
      spo2: r.spo2,
      respiratoryRate: r.respiratoryRate,
      systolicBp: r.systolicBp,
      diastolicBp: r.diastolicBp,
      hrvRmssd: r.hrvRmssd || 40,
      recoveryScore: r.recoveryScore || 75,
    };
  });

  const getSummaryStats = () => {
    let values: number[] = [];
    switch (selectedMetric) {
      case 'spo2':
        values = chartData.map((d) => d.spo2);
        break;
      case 'rr':
        values = chartData.map((d) => d.respiratoryRate);
        break;
      case 'bp':
        values = chartData.map((d) => d.systolicBp);
        break;
      case 'hrv':
        values = chartData.map((d) => d.hrvRmssd);
        break;
      case 'hr':
      default:
        values = chartData.map((d) => d.heartRate);
        break;
    }

    if (values.length === 0) return { avg: 0, min: 0, max: 0 };
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { avg, min, max };
  };

  const stats = getSummaryStats();

  const getMetricConfig = () => {
    switch (selectedMetric) {
      case 'spo2':
        return {
          key: 'spo2',
          name: 'SpO2 (%)',
          color: '#168C83',
          domain: [85, 100],
          unit: '%',
        };
      case 'rr':
        return {
          key: 'respiratoryRate',
          name: 'Respiratory Rate (bpm)',
          color: '#168C83',
          domain: [6, 30],
          unit: ' bpm',
        };
      case 'bp':
        return {
          key: 'systolicBp',
          name: 'Systolic BP (mmHg)',
          color: '#168C83',
          domain: [80, 160],
          unit: ' mmHg',
        };
      case 'hrv':
        return {
          key: 'hrvRmssd',
          name: 'HRV RMSSD (ms)',
          color: '#168C83',
          domain: [10, 100],
          unit: ' ms',
        };
      case 'hr':
      default:
        return {
          key: 'heartRate',
          name: 'Heart Rate (BPM)',
          color: '#168C83',
          domain: [40, 160],
          unit: ' BPM',
        };
    }
  };

  const metricConfig = getMetricConfig();

  return (
    <div className="clinical-card p-4 space-y-3.5">
      {/* Metric Selector Segmented Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-[var(--border-color)] pb-3">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">
          Vitals Trend
        </h3>

        <div className="flex items-center gap-1 bg-[var(--bg-surface-subtle)] p-1 rounded-lg border border-[var(--border-color)] flex-wrap">
          <button
            onClick={() => setSelectedMetric('hr')}
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              selectedMetric === 'hr'
                ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Heart className="w-3 h-3 stroke-[2]" />
            <span>HR</span>
          </button>
          <button
            onClick={() => setSelectedMetric('spo2')}
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              selectedMetric === 'spo2'
                ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Activity className="w-3 h-3 stroke-[2]" />
            <span>SpO2</span>
          </button>
          <button
            onClick={() => setSelectedMetric('rr')}
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              selectedMetric === 'rr'
                ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Wind className="w-3 h-3 stroke-[2]" />
            <span>RR</span>
          </button>
          <button
            onClick={() => setSelectedMetric('bp')}
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              selectedMetric === 'bp'
                ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Gauge className="w-3 h-3 stroke-[2]" />
            <span>BP</span>
          </button>
          <button
            onClick={() => setSelectedMetric('hrv')}
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              selectedMetric === 'hrv'
                ? 'bg-[var(--bg-surface)] text-[var(--teal-primary)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Zap className="w-3 h-3 stroke-[2]" />
            <span>HRV</span>
          </button>
        </div>
      </div>

      {/* 7-day Baseline & Trend Indicator */}
      {baseline && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs font-mono">
          <span className="text-[var(--text-secondary)]">
            Baseline: <strong className="text-[var(--text-primary)] font-bold">{selectedMetric === 'hr' ? `${baseline.sevenDayAvgHr} BPM` : selectedMetric === 'hrv' ? `${baseline.sevenDayAvgHrv} ms` : selectedMetric === 'spo2' ? `${baseline.sevenDayAvgSpo2}%` : `${baseline.sevenDayAvgRr} bpm`}</strong>
          </span>
          {selectedMetric === 'hr' && (
            <span className={`font-semibold ${baseline.hrDelta <= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-caution)]'}`}>
              {baseline.hrDelta > 0 ? `+${baseline.hrDelta} BPM` : `${baseline.hrDelta} BPM`} vs 7d avg
            </span>
          )}
          {selectedMetric === 'hrv' && (
            <span className={`font-semibold ${baseline.hrvDelta >= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-alert)]'}`}>
              {baseline.hrvDelta > 0 ? `+${baseline.hrvDelta} ms` : `${baseline.hrvDelta} ms`} vs 7d avg
            </span>
          )}
        </div>
      )}

      {/* Summary Stat Badges */}
      <div className="grid grid-cols-3 gap-2 font-mono">
        <div className="bg-[var(--bg-surface-subtle)] p-2.5 rounded-lg border border-[var(--border-color)] text-center">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Mean</span>
          <div className="text-base font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
            {stats.avg} <span className="text-[10px] font-normal text-[var(--text-secondary)]">{metricConfig.unit}</span>
          </div>
        </div>
        <div className="bg-[var(--bg-surface-subtle)] p-2.5 rounded-lg border border-[var(--border-color)] text-center">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Min</span>
          <div className="text-base font-bold text-[var(--teal-primary)] mt-0.5 tabular-nums">
            {stats.min} <span className="text-[10px] font-normal text-[var(--text-secondary)]">{metricConfig.unit}</span>
          </div>
        </div>
        <div className="bg-[var(--bg-surface-subtle)] p-2.5 rounded-lg border border-[var(--border-color)] text-center">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Max</span>
          <div className="text-base font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
            {stats.max} <span className="text-[10px] font-normal text-[var(--text-secondary)]">{metricConfig.unit}</span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-52 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis
              dataKey="date"
              stroke="var(--text-secondary)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
              fontFamily="ui-monospace, monospace"
            />
            <YAxis
              domain={metricConfig.domain}
              stroke="var(--text-secondary)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
              fontFamily="ui-monospace, monospace"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '11px',
                fontFamily: 'ui-monospace, monospace',
                boxShadow: 'var(--shadow-card)',
              }}
            />
            <Line
              type="monotone"
              dataKey={metricConfig.key}
              name={metricConfig.name}
              stroke={metricConfig.color}
              strokeWidth={2}
              dot={{ fill: metricConfig.color, r: 3, strokeWidth: 1, stroke: 'var(--bg-surface)' }}
              activeDot={{ r: 4.5, stroke: '#FFFFFF', strokeWidth: 1.5 }}
            />
            {selectedMetric === 'bp' && (
              <Line
                type="monotone"
                dataKey="diastolicBp"
                name="Diastolic BP (mmHg)"
                stroke="#637381"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ fill: '#637381', r: 2.5 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
