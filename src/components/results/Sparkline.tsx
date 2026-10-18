import React from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#168C83',
  width = 120,
  height = 36,
}) => {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-40">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min > 0.001 ? max - min : 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const normY = (val - min) / range;
    const y = height - (normY * (height - 6) + 3);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
