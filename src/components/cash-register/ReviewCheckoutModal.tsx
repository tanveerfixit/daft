import React, { useState } from 'react';
import { X, Printer, FileText, Check, Loader2 } from 'lucide-react';
import { PaymentEntry } from './types';

interface ReviewCheckoutModalProps {
  grandTotal: number;
  payments: PaymentEntry[];
  isFinalizing?: boolean;
  onCancel: () => void;
  onConfirm: (printPreference: 'Thermal' | 'A4' | null) => void;
}

export const ReviewCheckoutModal: React.FC<ReviewCheckoutModalProps> = ({
  grandTotal,
  payments,
  isFinalizing = false,
  onCancel,
  onConfirm
}) => {
  const [printPreference, setPrintPreference] = useState<'Thermal' | 'A4' | null>(null);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const changeDue = Math.max(0, totalPaid - grandTotal);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 font-mono text-base">
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-md overflow-hidden flex flex-col rounded-none shadow-none text-base">
        
        {/* Header */}
        <div className="bg-neutral-200 dark:bg-neutral-900 px-4 py-2 border-b border-neutral-300 dark:border-neutral-800 rounded-none flex justify-between items-center">
          <h2 className="text-base font-bold text-black dark:text-white uppercase tracking-wider">Review Sale</h2>
          <button 
            onClick={onCancel}
            disabled={isFinalizing}
            className="text-neutral-500 hover:text-neutral-750 dark:hover:text-neutral-350 transition-colors bg-transparent border-0 cursor-pointer disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 bg-white dark:bg-black">
          
          {/* Totals Box */}
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-6 flex flex-col items-center justify-center space-y-1 rounded-none shadow-none">
            <span className="text-[13px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Amount</span>
            <span className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">€{grandTotal.toFixed(2)}</span>
          </div>

          {/* Payment Summary */}
          <div className="space-y-3">
            <h3 className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider border-b border-neutral-300 dark:border-neutral-800 pb-1">Payment Details</h3>
            <div className="space-y-2">
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center text-base font-normal text-neutral-900 dark:text-neutral-100 font-sans">
                  <span className="opacity-80 font-sans">{p.method}</span>
                  <span className="font-mono">€{p.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            {changeDue > 0.005 && (
              <div className="flex justify-between items-center text-lg font-bold text-red-650 dark:text-red-400 pt-2 border-t border-dashed border-neutral-300 dark:border-neutral-800 mt-2">
                <span className="uppercase tracking-tight text-xs font-sans font-bold text-red-650 dark:text-red-400">Change Due</span>
                <span className="font-mono font-bold text-red-650 dark:text-red-400">€{changeDue.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Receipt Options */}
          <div className="space-y-3 pt-3 border-t border-neutral-300 dark:border-neutral-800">
            <h3 className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Receipt Style</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPrintPreference(printPreference === 'Thermal' ? null : 'Thermal')}
                disabled={isFinalizing}
                className={`py-2 flex items-center justify-center gap-2 border font-bold text-sm uppercase tracking-wider transition-colors rounded-none cursor-pointer ${
                  printPreference === 'Thermal' 
                    ? 'border-neutral-500 dark:border-neutral-600 bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white' 
                    : 'border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
                }`}
              >
                <Printer size={15} />
                Thermal
              </button>
              <button
                onClick={() => setPrintPreference(printPreference === 'A4' ? null : 'A4')}
                disabled={isFinalizing}
                className={`py-2 flex items-center justify-center gap-2 border font-bold text-sm uppercase tracking-wider transition-colors rounded-none cursor-pointer ${
                  printPreference === 'A4' 
                    ? 'border-neutral-500 dark:border-neutral-600 bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white' 
                    : 'border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
                }`}
              >
                <FileText size={15} />
                A4
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex border-t border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-955 p-3 justify-end gap-2 shrink-0">
          <button 
            onClick={onCancel}
            disabled={isFinalizing}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1.5 px-4 rounded-none text-base transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(printPreference)}
            disabled={isFinalizing}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-1.5 px-5 rounded-none text-base border border-amber-500 hover:border-amber-600 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isFinalizing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check size={16} strokeWidth={3} />
                Finalize
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
