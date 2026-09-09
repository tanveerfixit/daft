import React, { useState, useMemo } from 'react';
import { Clock, Zap, ShoppingBag, DollarSign } from 'lucide-react';

export interface HourlyDataPoint {
  hour: number;
  label: string;
  count: number;
  total: number;
}

interface PeakTradingHoursChartProps {
  data: HourlyDataPoint[];
  title?: string;
}

export default function PeakTradingHoursChart({
  data = [],
  title = 'Peak Trading Hours',
}: PeakTradingHoursChartProps) {
  const [metric, setMetric] = useState<'count' | 'total'>('count');
  const [showFullDay, setShowFullDay] = useState(false);
  const [hoveredHour, setHoveredHour] = useState<HourlyDataPoint | null>(null);

  // Filter shop hours (08:00 to 21:00) or 24 hours
  const filteredHours = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (showFullDay) return data;
    // Default to 8 AM to 9 PM
    return data.filter(d => d.hour >= 8 && d.hour <= 21);
  }, [data, showFullDay]);

  const maxVal = useMemo(() => {
    return Math.max(...filteredHours.map(h => h[metric]), 0);
  }, [filteredHours, metric]);

  const peakHour = useMemo(() => {
    if (filteredHours.length === 0 || maxVal === 0) return null;
    return filteredHours.reduce((prev, curr) => (curr[metric] > prev[metric] ? curr : prev), filteredHours[0]);
  }, [filteredHours, maxVal, metric]);

  const totalOrders = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);
  const totalRevenue = useMemo(() => data.reduce((sum, d) => sum + d.total, 0), [data]);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded border border-neutral-300 dark:border-neutral-800 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-neutral-100 dark:bg-neutral-850 px-4 py-3 border-b border-neutral-300 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">{title}</h3>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFullDay(prev => !prev)}
            className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 cursor-pointer"
          >
            {showFullDay ? 'Store Hours (8am-9pm)' : '24h View'}
          </button>

          <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetric('count')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                metric === 'count'
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
              }`}
            >
              <ShoppingBag size={12} />
              <span>Orders (#)</span>
            </button>
            <button
              type="button"
              onClick={() => setMetric('total')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                metric === 'total'
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
              }`}
            >
              <DollarSign size={12} />
              <span>Sales (€)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="px-5 py-2.5 bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Zap size={13} className="text-amber-500" />
            <span className="text-neutral-500">Busiest Rush Hour:</span>
            <span className="font-bold text-neutral-900 dark:text-white font-mono">
              {peakHour && maxVal > 0 ? (
                `${peakHour.label} (${metric === 'count' ? `${peakHour.count} orders` : `€${peakHour.total.toFixed(2)}`})`
              ) : (
                '—'
              )}
            </span>
          </div>
        </div>
        <div className="text-neutral-500 text-xs font-mono font-semibold">
          Total: {totalOrders} orders ({`€${totalRevenue.toFixed(2)}`})
        </div>
      </div>

      {/* Bar Distribution Chart */}
      <div className="p-4 flex-1 flex flex-col justify-end min-h-[220px]">
        {maxVal === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-neutral-400 dark:text-neutral-500 text-xs italic gap-1">
            <Clock size={24} className="opacity-40" />
            <span>No hourly traffic recorded in this timeframe.</span>
          </div>
        ) : (
          <div className="w-full flex flex-col justify-end h-44 relative">
            {/* Bars container */}
            <div className="grid items-end gap-1 sm:gap-2 h-36 w-full" style={{ gridTemplateColumns: `repeat(${filteredHours.length}, minmax(0, 1fr))` }}>
              {filteredHours.map((h) => {
                const val = h[metric];
                const heightPercent = maxVal > 0 ? Math.max((val / maxVal) * 100, 4) : 4;
                const isPeak = val === maxVal && val > 0;
                const isHovered = hoveredHour?.hour === h.hour;

                let barBg = 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700';
                if (val > 0) {
                  if (isPeak) {
                    barBg = 'bg-gradient-to-t from-purple-700 to-indigo-500 hover:from-purple-600 hover:to-indigo-400';
                  } else if (val >= maxVal * 0.5) {
                    barBg = 'bg-gradient-to-t from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400';
                  } else {
                    barBg = 'bg-blue-400/80 dark:bg-blue-600/60 hover:bg-blue-500';
                  }
                }

                return (
                  <div
                    key={h.hour}
                    className="flex flex-col items-center h-full justify-end group relative cursor-pointer"
                    onMouseEnter={() => setHoveredHour(h)}
                    onMouseLeave={() => setHoveredHour(null)}
                  >
                    {/* Bar Pillar */}
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${barBg} ${
                        isHovered ? 'ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-neutral-900' : ''
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Hour Labels */}
            <div className="grid gap-1 sm:gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 w-full text-center" style={{ gridTemplateColumns: `repeat(${filteredHours.length}, minmax(0, 1fr))` }}>
              {filteredHours.map((h, idx) => {
                // Show every alternate label if tight
                const isOdd = idx % 2 === 1;
                return (
                  <span
                    key={h.hour}
                    className={`text-[9px] sm:text-[10px] truncate font-medium ${
                      hoveredHour?.hour === h.hour
                        ? 'text-purple-600 dark:text-purple-400 font-bold'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    {showFullDay && isOdd ? '' : h.label.replace(' ', '')}
                  </span>
                );
              })}
            </div>

            {/* Floating Details Hover Tooltip */}
            {hoveredHour && (
              <div className="absolute top-0 right-4 z-20 bg-neutral-900/95 dark:bg-black/95 text-white border border-neutral-700/80 rounded px-3 py-2 text-xs backdrop-blur-sm pointer-events-none">
                <div className="font-bold text-neutral-300 text-[11px] mb-1">
                  Time Slot: {hoveredHour.label} - {((hoveredHour.hour + 1) % 24) === 0 ? '12 AM' : ((hoveredHour.hour + 1) % 24) < 12 ? `${(hoveredHour.hour + 1) % 24} AM` : ((hoveredHour.hour + 1) % 24) === 12 ? '12 PM' : `${((hoveredHour.hour + 1) % 24) - 12} PM`}
                </div>
                <div className="flex items-center justify-between gap-3 text-purple-300 font-mono font-bold">
                  <span>Transactions:</span>
                  <span>{hoveredHour.count} orders</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-emerald-400 font-mono text-[11px] mt-0.5">
                  <span>Sales Volume:</span>
                  <span>€{hoveredHour.total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
