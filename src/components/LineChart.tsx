import { format } from 'date-fns';

export interface LineChartProps {
  points: { date: string; value: number }[];
  ariaLabel?: string;
  /** Which point to emphasize: the highest value (default) or the most recent one. */
  highlight?: 'max' | 'last';
}

/** Accepts both yyyy-MM-dd and full ISO strings. */
const fmtChartDate = (s: string) => {
  const day = s.length === 10 ? new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) : new Date(s);
  return format(day, 'dd/MM/yyyy');
};

/** Minimal dependency-free line chart. */
export default function LineChart({ points, ariaLabel = 'Biểu đồ xu hướng', highlight = 'max' }: LineChartProps) {
  const W = 600;
  const H = 180;
  const pad = { l: 36, r: 12, t: 12, b: 24 };
  const values = points.map(p => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = max - min;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / range) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const bestIdx = highlight === 'last' ? values.length - 1 : values.indexOf(Math.max(...values));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
      {[min, (min + max) / 2, max].map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity="0.08" />
          <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.4">
            {Math.round(v * 10) / 10}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#FF6B00" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === bestIdx ? 5 : 3} fill={i === bestIdx ? '#FF6B00' : '#141414'} stroke="#FF6B00" strokeWidth="2" />
      ))}
      <text x={pad.l} y={H - 6} fontSize="10" fill="currentColor" fillOpacity="0.4">
        {fmtChartDate(points[0].date)}
      </text>
      <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.4">
        {fmtChartDate(points[points.length - 1].date)}
      </text>
    </svg>
  );
}
