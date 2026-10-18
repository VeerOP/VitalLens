import React, { useEffect, useRef } from 'react';

interface WaveformDisplayProps {
  data: number[];
  height?: number;
  color?: string;
  isScanning?: boolean;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  data,
  height = 110,
  color = '#168C83',
  isScanning = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Draw subtle physiological telemetry grid
    ctx.strokeStyle = 'rgba(23, 43, 58, 0.05)';
    ctx.lineWidth = 1;

    for (let x = 0; x < w; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (!data || data.length < 2) {
      // Flat baseline standby wave
      ctx.strokeStyle = 'rgba(23, 43, 58, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      return;
    }

    // Determine min/max for normalization
    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal > 0.001 ? maxVal - minVal : 1;

    const points: { x: number; y: number }[] = [];
    const maxPoints = Math.min(data.length, 120);
    const subset = data.slice(-maxPoints);

    const stepX = w / (maxPoints - 1);

    for (let i = 0; i < subset.length; i++) {
      const x = i * stepX;
      const normY = (subset[i] - minVal) / range;
      const y = h - (normY * (h * 0.72) + h * 0.14);
      points.push({ x, y });
    }

    // Draw smooth, clinical pulse line (no glow/shadowBlur)
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    if (points.length > 1) {
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Explicitly no shadow blur
    ctx.shadowBlur = 0;
    ctx.stroke();

    // Subtle leading point
    if (points.length > 0) {
      const lead = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(lead.x, lead.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [data, height, color, isScanning]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] p-2">
      <div className="absolute top-2 left-2.5 z-10 flex items-center gap-1.5 text-[10px] font-mono text-[var(--teal-primary)] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal-primary)]" />
        <span>LIVE PPG SIGNAL</span>
      </div>
      <canvas ref={canvasRef} className="w-full h-24 block" />
    </div>
  );
};
