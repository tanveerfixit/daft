import React, { useState, useMemo } from 'react';
import { TrendingUp, BarChart2, DollarSign, ShoppingBag } from 'lucide-react';

export interface TrendDataPoint {
  label: string;
  fullDate?: string;
  total: number;
  count: number;
}

interface SalesTrendChartProps {
  data: TrendDataPoint[];
  title?: string;
  isSingleDay?: boolean;
}

export default function SalesTrendChart({
  data = [],
  title = 'Sales Progression Trend',
  isSingleDay = false,
}: SalesTrendChartProps) {
  const [metric, setMetric] = useState<'total' | 'count'>('total');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter or pad data points
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  const values = points.map(p => p[metric]);
  const maxValue = Math.max(...values, 0);
  const minValue = 0;
  const range = maxValue - minValue || 1;

  // Chart dimensions inside SVG viewBox
  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Coordinate mapping
  const coords = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length === 1) {
      return [{
        x: padding.left + innerWidth / 2,
        y: padding.top + innerHeight - (points[0][metric] / range) * innerHeight,
        point: points[0]
      }];
    }
    return points.map((p, i) => {
      const x = padding.left + (i / (points.length - 1)) * innerWidth;
      const y = padding.top + innerHeight - (p[metric] / range) * innerHeight;
      return { x, y, point: p };
    });
  }, [points, metric, range, innerWidth, innerHeight, padding.left, padding.top]);

  // Construct SVG Path
  const linePath = useMemo(() => {
    if (coords.length === 0) return '';
    if (coords.length === 1) {
      return `M ${coords[0].x} ${coords[0].y}`;
    }
    // Smooth Catmull-Rom or Bezier curve
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [coords]);

  const areaPath = useMemo(() => {
    if (coords.length < 2) return '';
    const bottomY = padding.top + innerHeight;
    return `${linePath} L ${coords[coords.length - 1].x} ${bottomY} L ${coords[0].x} ${bottomY} Z`;
  }, [linePath, coords, padding.top, innerHeight]);

  const totalSum = points.reduce((acc, p) => acc + p.total, 0);
  const totalOrders = points.reduce((acc, p) => acc + p.count, 0);
  const avgValue = points.length > 0 ? (metric === 'total' ? totalSum / points.length : totalOrders / points.length) : 0;

  const activePoint = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : null;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-none sm:rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-blue-200 dark:border-blue-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">{title}</h3>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMetric('total')}
            className={`px-1.5 py-1 transition-colors flex items-center gap-1 cursor-pointer ${
              metric === 'total'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <DollarSign size={13} />
            <span>Revenue (€)</span>
          </button>
          <button
            type="button"
            onClick={() => setMetric('count')}
            className={`px-1.5 py-1 transition-colors flex items-center gap-1 cursor-pointer ${
              metric === 'count'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <ShoppingBag size={13} />
            <span>Orders (#)</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-neutral-500 mr-1.5">Period Peak:</span>
            <span className="font-bold text-neutral-900 dark:text-white font-mono">
              {metric === 'total' ? `€${maxValue.toFixed(2)}` : `${maxValue} orders`}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 mr-1.5">Avg / {isSingleDay ? 'Hour' : 'Day'}:</span>
            <span className="font-bold text-neutral-900 dark:text-white font-mono">
              {metric === 'total' ? `€${avgValue.toFixed(2)}` : avgValue.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="text-neutral-400 text-[11px] hidden sm:block">
          {points.length} data points
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-center relative min-h-[220px]">
        {points.length === 0 || maxValue === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-neutral-400 dark:text-neutral-500 text-xs italic gap-1">
            <BarChart2 size={24} className="opacity-40" />
            <span>No sales transaction data recorded in this period.</span>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto max-h-[220px] overflow-visible select-none"
            >
              <defs>
                <linearGradient id="salesTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y-Axis Horizontal Grid Lines */}
              {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                const y = padding.top + innerHeight * (1 - ratio);
                const gridVal = minValue + ratio * range;
                const displayVal = metric === 'total' ? `€${Math.round(gridVal)}` : Math.round(gridVal);

                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="currentColor"
                      strokeDasharray="3 3"
                      className="text-neutral-200 dark:text-neutral-800"
                      strokeWidth={1}
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-neutral-400 dark:fill-neutral-500 font-mono"
                    >
                      {displayVal}
                    </text>
                  </g>
                );
              })}

              {/* Area Gradient */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#salesTrendGradient)"
                />
              )}

              {/* Line Curve */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* X-Axis Labels (sample ~5-7 labels max to avoid clutter) */}
              {coords.map((c, idx) => {
                const totalPoints = coords.length;
                const step = totalPoints > 10 ? Math.ceil(totalPoints / 6) : 1;
                const showLabel = idx === 0 || idx === totalPoints - 1 || idx % step === 0;

                if (!showLabel) return null;

                return (
                  <text
                    key={idx}
                    x={c.x}
                    y={height - 10}
                    textAnchor="middle"
                    className="text-[10px] fill-neutral-500 dark:fill-neutral-400 font-medium"
                  >
                    {c.point.label}
                  </text>
                );
              })}

              {/* Interactive Hover Crosshair & Dot */}
              {activePoint && (
                <g>
                  {/* Vertical Guideline */}
                  <line
                    x1={activePoint.x}
                    y1={padding.top}
                    x2={activePoint.x}
                    y2={padding.top + innerHeight}
                    stroke="#2563eb"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                  />
                  {/* Outer glowing halo */}
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r={6}
                    fill="#3b82f6"
                    opacity={0.3}
                  />
                  {/* Inner solid dot */}
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r={3.5}
                    fill="#1d4ed8"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                </g>
              )}

              {/* Transparent Click/Hover Capture Rectangles for each point */}
              {coords.map((c, idx) => {
                const segWidth = innerWidth / Math.max(coords.length - 1, 1);
                const rectX = Math.max(c.x - segWidth / 2, padding.left);
                return (
                  <rect
                    key={idx}
                    x={rectX}
                    y={padding.top}
                    width={segWidth}
                    height={innerHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(idx)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                );
              })}
            </svg>

            {/* Floating Tooltip HTML Overlay */}
            {activePoint && (
              <div
                className="absolute pointer-events-none z-20 transform -translate-x-1/2 -translate-y-full mb-3"
                style={{
                  left: `${(activePoint.x / width) * 100}%`,
                  top: `${(activePoint.y / height) * 100}%`,
                }}
              >
                <div className="bg-neutral-900/95 dark:bg-black/95 text-white border border-neutral-700/80 rounded px-3 py-2 text-xs backdrop-blur-sm whitespace-nowrap">
                  <div className="font-bold text-neutral-300 text-[11px] mb-1">
                    {activePoint.point.fullDate || activePoint.point.label}
                  </div>
                  <div className="flex items-center justify-between gap-3 text-emerald-400 font-mono font-bold">
                    <span>Revenue:</span>
                    <span>€{activePoint.point.total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-neutral-300 font-mono text-[11px] mt-0.5">
                    <span>Orders:</span>
                    <span>{activePoint.point.count}</span>
                  </div>
                  {activePoint.point.count > 0 && (
                    <div className="flex items-center justify-between gap-3 text-blue-300 font-mono text-[10px] mt-0.5 pt-0.5 border-t border-neutral-800">
                      <span>Avg Order:</span>
                      <span>€{(activePoint.point.total / activePoint.point.count).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
