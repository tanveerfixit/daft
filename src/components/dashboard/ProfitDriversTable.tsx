import React, { useState } from 'react';
import { Award, AlertCircle, CheckCircle2, TrendingUp, ChevronDown } from 'lucide-react';

export interface ProfitDriver {
  name: string;
  qtySold: number;
  revenue: number;
  profit: number;
  marginPercent: number;
  currentStock: number;
}

interface ProfitDriversTableProps {
  drivers: ProfitDriver[];
}

export default function ProfitDriversTable({ drivers = [] }: ProfitDriversTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-none sm:rounded-lg overflow-hidden flex flex-col">
      {/* Card Header (Clickable Toggle) */}
      <div 
        onClick={() => setIsCollapsed(prev => !prev)}
        className={`bg-white dark:bg-neutral-900 px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-850/50 ${
          !isCollapsed ? 'border-b border-blue-200 dark:border-blue-900/60' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <Award size={18} className="text-amber-500" />
          <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
            Top 10 Profit Drivers ("Money Makers")
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-neutral-400 hidden sm:inline">
            Ranked by Net Profit
          </span>
          <ChevronDown 
            size={16} 
            className={`text-neutral-400 transition-transform duration-200 ${!isCollapsed ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`} 
          />
        </div>
      </div>

      {/* Collapsible Table Body */}
      {!isCollapsed && (
        <div className="overflow-auto max-h-[380px] flex-1">
          <table className="w-full text-left border-collapse text-xs relative">
          <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-850 border-b border-neutral-200 dark:border-neutral-800">
            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-850">Product / Item</th>
              <th className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-850 text-center">Units Sold</th>
              <th className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-850 text-right">Revenue</th>
              <th className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-850 text-right font-bold text-neutral-900 dark:text-white">Net Profit</th>
              <th className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-850 text-right">Margin</th>
              <th className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-850 text-center">Stock Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
            {drivers.map((d, idx) => {
              const isLowStock = d.currentStock <= 3;

              return (
                <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-neutral-400 w-3 shrink-0 text-center">
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-[180px] sm:max-w-[240px]" title={d.name}>
                        {d.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-medium text-neutral-700 dark:text-neutral-300">
                    {d.qtySold}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                    €{d.revenue.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    €{d.profit.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {d.marginPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isLowStock ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <AlertCircle size={11} />
                        <span>{d.currentStock} left</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500">
                        <CheckCircle2 size={11} className="text-emerald-500" />
                        <span>{d.currentStock} in stock</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-400 dark:text-neutral-500 italic text-xs">
                  No sales items recorded in this timeframe to calculate profit ranking.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
