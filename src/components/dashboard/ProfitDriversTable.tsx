import React from 'react';
import { Award, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

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
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col h-full">
      {/* Card Header */}
      <div className="bg-neutral-100 dark:bg-neutral-850 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-amber-500" />
          <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
            Top 10 Profit Drivers ("Money Makers")
          </h3>
        </div>
        <span className="text-[11px] font-medium text-neutral-500 bg-white dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
          Ranked by Net Profit
        </span>
      </div>

      {/* Table Body */}
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
                      <span className="w-4 h-4 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-500 flex items-center justify-center shrink-0">
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
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      {d.marginPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isLowStock ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <AlertCircle size={10} />
                        <span>{d.currentStock} left</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-neutral-500">
                        <CheckCircle2 size={10} className="text-emerald-500" />
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

      {/* Footer advice */}
      <div className="bg-neutral-50 dark:bg-neutral-850 px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between">
        <span>💡 Strategy: Ensure top-profit heroes never run out of stock to preserve maximum margin.</span>
      </div>
    </div>
  );
}
