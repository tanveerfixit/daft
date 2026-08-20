import React from 'react';
import { Calculator } from 'lucide-react';

interface TotalsPanelProps {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export const TotalsPanel: React.FC<TotalsPanelProps> = ({
  subtotal,
  tax,
  discount,
  total
}) => {
  return (
    <div className="p-3.5 bg-white dark:bg-slate-900 font-sans">
      <div className="flex items-center gap-2 mb-2.5">
        <Calculator size={16} className="text-blue-600 dark:text-blue-400" />
        <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">Summary</h3>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex justify-between text-base">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Subtotal</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">€{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Tax (0%)</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">€{tax.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-base">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Discount</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">-€{discount.toFixed(2)}</span>
          </div>
        )}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline mt-2">
          <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">Total Amount</span>
          <span className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400 leading-none">€{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
