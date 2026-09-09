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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 max-w-[1600px]">
      
      {/* 1. Gross Revenue */}
      <div className="bg-white dark:bg-neutral-900 rounded-none sm:rounded-lg p-3.5 sm:p-4 flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between pb-2.5 border-b border-blue-200 dark:border-blue-900/60">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Gross Revenue</span>
          <div className="flex items-center justify-center text-blue-600 dark:text-blue-400">
            <DollarSign size={16} />
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
      <div className="bg-white dark:bg-neutral-900 rounded-none sm:rounded-lg p-3.5 sm:p-4 flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between pb-2.5 border-b border-blue-200 dark:border-blue-900/60">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Net Gross Profit</span>
          <div className="flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={16} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            €{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {marginPercent.toFixed(1)}% Margin
            </span>
            <span className="text-[11px] text-neutral-400">after product cost</span>
          </div>
        </div>
      </div>

      {/* 3. Cost of Goods (COGS) */}
      <div className="bg-white dark:bg-neutral-900 rounded-none sm:rounded-lg p-3.5 sm:p-4 flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between pb-2.5 border-b border-blue-200 dark:border-blue-900/60">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Cost of Goods (COGS)</span>
          <div className="flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Percent size={16} />
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
      <div className="bg-white dark:bg-neutral-900 rounded-none sm:rounded-lg p-3.5 sm:p-4 flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between pb-2.5 border-b border-blue-200 dark:border-blue-900/60">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Avg Order Value (AOV)</span>
          <div className="flex items-center justify-center text-purple-600 dark:text-purple-400">
            <ShoppingCart size={16} />
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
      <div className="bg-white dark:bg-neutral-900 rounded-none sm:rounded-lg p-3.5 sm:p-4 flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between pb-2.5 border-b border-blue-200 dark:border-blue-900/60">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Repair Fix Rate</span>
          <div className="flex items-center justify-center text-sky-600 dark:text-sky-400">
            <ShieldCheck size={16} />
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
