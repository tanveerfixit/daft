import React from 'react';
import { Target, RefreshCw, Layers, AlertTriangle, ArrowUpRight } from 'lucide-react';

interface ReorderItem {
  name: string;
  stock: number;
  costPrice: number;
  retailPrice: number;
}

interface GrowthLeversCardProps {
  growthLevers?: {
    attachmentRate: number;
    repairRevenue: number;
    retailRevenue: number;
    repairPercent: number;
    retailPercent: number;
    repeatCustomerRate: number;
    reorderAlerts: ReorderItem[];
  };
}

export default function GrowthLeversCard({
  growthLevers = {
    attachmentRate: 0,
    repairRevenue: 0,
    retailRevenue: 0,
    repairPercent: 0,
    retailPercent: 0,
    repeatCustomerRate: 0,
    reorderAlerts: []
  }
}: GrowthLeversCardProps) {
  const {
    attachmentRate,
    repairPercent,
    retailPercent,
    repeatCustomerRate,
    reorderAlerts
  } = growthLevers;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col h-full">
      {/* Card Header */}
      <div className="bg-neutral-100 dark:bg-neutral-850 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
            Growth & Marketing Levers
          </h3>
        </div>
        <span className="text-[11px] font-medium text-neutral-500 bg-white dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
          Revenue Multipliers
        </span>
      </div>

      <div className="p-4 space-y-5 flex-1 flex flex-col justify-between text-xs">
        
        {/* 1. Attachment / Cross-Sell Rate */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Layers size={14} className="text-purple-500" />
              <span>Accessory Attachment / Upsell Rate</span>
            </span>
            <span className="font-mono font-bold text-neutral-900 dark:text-white text-sm">
              {attachmentRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(attachmentRate, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-neutral-400 mt-1">
            <span>Multi-item baskets (Screen Protector/Case added)</span>
            <span className="text-neutral-500 font-medium">Target: 35%+</span>
          </div>
        </div>

        {/* 2. Revenue Stream Split (Repairs vs Retail) */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              Revenue Stream Split
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">
              Repairs: <b className="text-blue-600 dark:text-blue-400">{repairPercent.toFixed(0)}%</b> · Retail: <b className="text-emerald-600 dark:text-emerald-400">{retailPercent.toFixed(0)}%</b>
            </span>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden flex">
            <div
              className="bg-blue-600 h-full transition-all duration-500"
              style={{ width: `${repairPercent}%` }}
              title={`Repairs: ${repairPercent.toFixed(1)}%`}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${retailPercent}%` }}
              title={`Retail: ${retailPercent.toFixed(1)}%`}
            />
          </div>
        </div>

        {/* 3. Customer Repeat Loyalty Rate */}
        <div className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-850/60 rounded border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <RefreshCw size={15} className="text-emerald-500" />
            <div>
              <div className="font-semibold text-neutral-800 dark:text-neutral-200">Repeat Customer Loyalty Rate</div>
              <div className="text-[10px] text-neutral-400">Returning customers purchasing in this period</div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
              {repeatCustomerRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 4. Stock Reorder Warning */}
        {reorderAlerts && reorderAlerts.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={13} />
                <span>Low Stock Reorder Alert (≤3 left)</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {reorderAlerts.slice(0, 4).map((item, idx) => (
                <div key={idx} className="p-2 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded flex justify-between items-center text-[11px]">
                  <span className="truncate max-w-[130px] font-medium text-amber-900 dark:text-amber-200" title={item.name}>
                    {item.name}
                  </span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0">
                    {item.stock} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <span>✓ All active catalog products currently have adequate stock levels.</span>
          </div>
        )}

      </div>
    </div>
  );
}
