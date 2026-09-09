import React from 'react';
import { DollarSign, TrendingUp, ShoppingCart, Percent, Wrench, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface FinancialMetrics {
  grossRevenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
  aov: number;
  taxTotal: number;
}

interface RepairMetrics {
  open: number;
  added: number;
  invoiced: number;
  fixRate: number;
}

interface ExecutiveKpiStripProps {
  salesCount: number;
  financials?: FinancialMetrics;
  repairs?: RepairMetrics;
}

export default function ExecutiveKpiStrip({
  salesCount = 0,
  financials = {
    grossRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    marginPercent: 0,
    aov: 0,
    taxTotal: 0
  },
  repairs = {
    open: 0,
    added: 0,
    invoiced: 0,
    fixRate: 100
  }
}: ExecutiveKpiStripProps) {
  const { grossRevenue, cogs, grossProfit, marginPercent, aov, taxTotal } = financials;
  const cogsPercent = grossRevenue > 0 ? (cogs / grossRevenue) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-[1600px]">
      
      {/* 1. Gross Revenue */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Gross Revenue</span>
          <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <DollarSign size={15} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
            €{grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500 font-medium">
            <span>{salesCount} transactions</span>
            {taxTotal > 0 && <span className="text-[11px] text-neutral-400">· incl. €{taxTotal.toFixed(2)} VAT</span>}
          </div>
        </div>
      </div>

      {/* 2. Net Gross Profit */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Net Gross Profit</span>
          <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={15} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            €{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {marginPercent.toFixed(1)}% Margin
            </span>
            <span className="text-[11px] text-neutral-400">after product cost</span>
          </div>
        </div>
      </div>

      {/* 3. Cost of Goods (COGS) */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Cost of Goods (COGS)</span>
          <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Percent size={15} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-neutral-800 dark:text-neutral-200">
            €{cogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500 font-medium">
            <span>{cogsPercent.toFixed(1)}% of sales</span>
            <span className="text-[11px] text-neutral-400">· wholesale cost</span>
          </div>
        </div>
      </div>

      {/* 4. Average Order Value (AOV) */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Avg Order Value (AOV)</span>
          <div className="w-7 h-7 rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <ShoppingCart size={15} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
            €{aov.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500 font-medium">
            <span>Basket average</span>
          </div>
        </div>
      </div>

      {/* 5. Repair Success & Fix Rate */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Repair Fix Rate</span>
          <div className="w-7 h-7 rounded-full bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <ShieldCheck size={15} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
            {repairs.fixRate.toFixed(1)}%
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 font-medium">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">{repairs.open} Active Jobs</span>
            <span>· {repairs.invoiced} Invoiced</span>
          </div>
        </div>
      </div>

    </div>
  );
}
