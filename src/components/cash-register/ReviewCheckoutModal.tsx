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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-lg overflow-hidden flex flex-col rounded-none shadow-2xl">
        
        {/* Header */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Review Sale & Settlement
          </h3>
          <button 
            type="button"
            onClick={onCancel}
            disabled={isFinalizing}
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer disabled:opacity-30"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 text-sm">
          
          {/* Total Amount Box */}
          <div className="bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 p-5 flex flex-col items-center justify-center space-y-1">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
              Total Sale Amount
            </span>
            <span className="text-4xl sm:text-5xl font-black font-mono text-neutral-900 dark:text-neutral-100 tracking-tight">
              €{grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Payment Details */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 pb-1">
              Payment Tendered
            </h4>
            <div className="space-y-1.5">
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-sm text-neutral-900 dark:text-neutral-100">
                  <span className="font-semibold bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                    {p.method}
                  </span>
                  <span className="font-mono font-bold text-base">
                    €{p.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Change Due Section */}
          {changeDue > 0.005 && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Coins size={20} className="text-red-600 dark:text-red-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                  Change Due to Customer
                </span>
              </div>
              <span className="text-3xl font-mono font-black text-red-600 dark:text-red-400">
                €{changeDue.toFixed(2)}
              </span>
            </div>
          )}

          {/* Receipt Print Style Selector */}
          <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
              Choose Print Type:
            </h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setPrintPreference(printPreference === 'Thermal' ? null : 'Thermal')}
                disabled={isFinalizing}
                className={`py-2.5 flex items-center justify-center gap-1.5 border font-semibold tracking-wider transition-all rounded-none cursor-pointer ${
                  printPreference === 'Thermal' 
                    ? 'border-blue-600 bg-blue-600 text-white' 
                    : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Printer size={15} />
                <span>Thermal</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintPreference(printPreference === 'A4' ? null : 'A4')}
                disabled={isFinalizing}
                className={`py-2.5 flex items-center justify-center gap-1.5 border font-semibold tracking-wider transition-all rounded-none cursor-pointer ${
                  printPreference === 'A4' 
                    ? 'border-blue-600 bg-blue-600 text-white' 
                    : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <FileText size={15} />
                <span>Full Page (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintPreference(null)}
                disabled={isFinalizing}
                className={`py-2.5 flex items-center justify-center gap-1.5 border font-semibold tracking-wider transition-all rounded-none cursor-pointer ${
                  printPreference === null 
                    ? 'border-blue-600 bg-blue-600 text-white' 
                    : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span>No Receipt</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onCancel}
            disabled={isFinalizing}
            className="px-5 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => onConfirm(printPreference)}
            disabled={isFinalizing}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-none text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isFinalizing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing Sale...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Complete Sale [ENTER]</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
