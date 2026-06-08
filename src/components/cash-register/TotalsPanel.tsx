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
    <div className="p-4 border-b border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black font-mono text-lg">
      <div className="flex items-center gap-2 mb-3">
        <Calculator size={18} className="text-neutral-600 dark:text-neutral-400" />
        <h3 className="font-extrabold text-black dark:text-white text-lg uppercase">Summary</h3>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-lg">
          <span className="text-neutral-600 dark:text-neutral-400 font-semibold">Subtotal</span>
          <span className="font-mono font-extrabold text-neutral-900 dark:text-neutral-100">€{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg">
          <span className="text-neutral-600 dark:text-neutral-400 font-semibold">Tax (0%)</span>
          <span className="font-mono font-extrabold text-neutral-900 dark:text-neutral-100">€{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg">
          <span className="text-neutral-600 dark:text-neutral-400 font-semibold">Discount</span>
          <span className="font-mono font-extrabold text-neutral-900 dark:text-neutral-100">-€{discount.toFixed(2)}</span>
        </div>
        <div className="pt-2 border-t border-neutral-300 dark:border-neutral-800 flex justify-between items-end">
          <span className="font-extrabold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[15px]">Total Amount</span>
          <span className="font-mono text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 leading-none">€{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
