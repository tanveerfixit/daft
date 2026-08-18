import React, { useState } from 'react';
import { X, Printer, FileText, Check, Loader2, Coins } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[110] p-3 sm:p-4 font-mono text-base animate-in fade-in duration-150">
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-lg overflow-hidden flex flex-col rounded-none shadow-2xl">
        
        {/* Header */}
        <div className="bg-neutral-200 dark:bg-neutral-900 px-5 py-3 border-b border-neutral-300 dark:border-neutral-800 rounded-none flex justify-between items-center">
          <h2 className="text-lg font-black text-black dark:text-white uppercase tracking-wider">
            Review Sale
          </h2>
          <button 
            onClick={onCancel}
            disabled={isFinalizing}
            className="p-1 hover:bg-neutral-300 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors border-0 cursor-pointer disabled:opacity-30"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 bg-white dark:bg-black">
          
          {/* Total Amount Box */}
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-5 flex flex-col items-center justify-center space-y-1 rounded-none">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
              Total Amount
            </span>
            <span className="text-4xl sm:text-5xl font-black font-mono text-neutral-900 dark:text-neutral-100 tracking-tight">
              €{grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Payment Details */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
              Payment Tendered
            </h3>
            <div className="space-y-2">
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-base text-neutral-900 dark:text-neutral-100 font-sans">
                  <span className="font-bold bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 uppercase text-xs text-neutral-800 dark:text-neutral-200">
                    {p.method}
                  </span>
                  <span className="font-mono font-bold text-lg">
                    €{p.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Prominent Change Due Section in Bold Red */}
          {changeDue > 0.005 && (
            <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-500 dark:border-red-600 p-4 flex justify-between items-center rounded-none shadow-xs">
              <div className="flex items-center gap-2">
                <Coins size={24} className="text-red-600 dark:text-red-400" />
                <span className="text-sm font-black uppercase tracking-wider text-red-700 dark:text-red-300">
                  Change Due
                </span>
              </div>
              <span className="text-3xl sm:text-4xl font-mono font-black text-red-600 dark:text-red-400 tracking-tight">
                €{changeDue.toFixed(2)}
              </span>
            </div>
          )}

          {/* Receipt Style Selector */}
          <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              Print Receipt (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-3 font-sans">
              <button
                onClick={() => setPrintPreference(printPreference === 'Thermal' ? null : 'Thermal')}
                disabled={isFinalizing}
                className={`py-3 flex items-center justify-center gap-2 border font-bold text-sm uppercase tracking-wider transition-all rounded-none cursor-pointer ${
                  printPreference === 'Thermal' 
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm' 
                    : 'border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Printer size={18} />
                Thermal
              </button>
              <button
                onClick={() => setPrintPreference(printPreference === 'A4' ? null : 'A4')}
                disabled={isFinalizing}
                className={`py-3 flex items-center justify-center gap-2 border font-bold text-sm uppercase tracking-wider transition-all rounded-none cursor-pointer ${
                  printPreference === 'A4' 
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm' 
                    : 'border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <FileText size={18} />
                A4
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex border-t border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 p-4 justify-end gap-3 shrink-0">
          <button 
            onClick={onCancel}
            disabled={isFinalizing}
            className="flex-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-bold py-3.5 px-4 rounded-none text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(printPreference)}
            disabled={isFinalizing}
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black py-3.5 px-5 rounded-none text-sm uppercase tracking-wider border border-amber-500 hover:border-amber-600 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isFinalizing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check size={18} strokeWidth={3} />
                <span>Finalize Sale</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
