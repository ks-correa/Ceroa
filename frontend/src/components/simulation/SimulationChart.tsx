import React from 'react';
import { SimulationResult } from '../../types';

interface SimulationChartProps {
  timeline: SimulationResult['timeline'];
  formatCurrency: (amount: number) => string;
}

const WIDTH = 500;
const HEIGHT = 150;
const PADDING = 12;

export const SimulationChart: React.FC<SimulationChartProps> = ({ timeline, formatCurrency }) => {
  if (timeline.length === 0) {
    return <div className="h-36 grid place-items-center text-xs text-slate-400">La deuda ya está al día.</div>;
  }

  const maxBalance = Math.max(...timeline.flatMap((point) => [point.actualBalance, point.simulatedBalance]), 1);
  const xFor = (index: number) => PADDING + (index * (WIDTH - PADDING * 2)) / Math.max(1, timeline.length - 1);
  const yFor = (balance: number) => PADDING + (1 - balance / maxBalance) * (HEIGHT - PADDING * 2);
  const pointsFor = (key: 'actualBalance' | 'simulatedBalance') =>
    timeline.map((point, index) => `${xFor(index)},${yFor(point[key])}`).join(' ');
  const simulatedPoints = pointsFor('simulatedBalance');
  const areaPoints = `${PADDING},${HEIGHT - PADDING} ${simulatedPoints} ${xFor(timeline.length - 1)},${HEIGHT - PADDING}`;

  return (
    <div>
      <svg className="w-full h-40" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label="Evolución comparada del saldo actual y simulado">
        <defs>
          <linearGradient id="simulation-balance-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#088395" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#088395" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <line key={ratio} x1={PADDING} y1={PADDING + ratio * (HEIGHT - PADDING * 2)} x2={WIDTH - PADDING} y2={PADDING + ratio * (HEIGHT - PADDING * 2)} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="3 3" />
        ))}
        <polygon points={areaPoints} fill="url(#simulation-balance-gradient)" />
        <polyline points={pointsFor('actualBalance')} fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="7 6" vectorEffect="non-scaling-stroke" />
        <polyline points={simulatedPoints} fill="none" stroke="#088395" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {timeline.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={xFor(index)} cy={yFor(point.simulatedBalance)} r="4" fill="#088395">
              <title>{`${point.label}: ${formatCurrency(point.simulatedBalance)}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="grid text-[10px] font-semibold text-slate-400" style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(0, 1fr))` }}>
        {timeline.map((point, index) => <span key={`${point.label}-label-${index}`} className="text-center truncate">{point.label}</span>)}
      </div>
    </div>
  );
};
