import React, { useState, useEffect, useRef } from 'react';
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
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!isFinalizing) {
          onConfirm(printPreference);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (!isFinalizing) {
          onCancel();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isFinalizing, onConfirm, onCancel, printPreference]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const changeDue = Math.max(0, totalPaid - grandTotal);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-3 sm:p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-neutral-300 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col rounded-none">
        
        {/* Header */}
        <div className="p-4 bg-neutral-100 border-b border-neutral-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-neutral-900">
            Review Sale & Settlement
          </h3>
          <button 
            type="button"
            onClick={onCancel}
            disabled={isFinalizing}
            className="text-neutral-500 hover:text-neutral-800 cursor-pointer disabled:opacity-30"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 bg-white text-neutral-900 text-sm">
          
          {/* Total Amount Box */}
          <div className="bg-neutral-50 border border-neutral-200 p-5 flex flex-col items-center justify-center space-y-1">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
              Total Sale Amount
            </span>
            <span className="text-4xl sm:text-5xl font-black tabular-nums text-neutral-900 tracking-tight">
              €{grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Payment Details */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider border-b border-neutral-200 pb-1">
              Payment Tendered
            </h4>
            <div className="space-y-1.5">
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 text-sm text-neutral-900">
                  <span className="font-semibold bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800 border border-neutral-200">
                    {p.method}
                  </span>
                  <span className="tabular-nums font-bold text-base">
                    €{p.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Change Due Section */}
          {changeDue > 0.005 && (
            <div className="bg-red-50 border border-red-300 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Coins size={20} className="text-red-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                  Change Due to Customer
                </span>
              </div>
              <span className="text-3xl tabular-nums font-black text-red-600">
                €{changeDue.toFixed(2)}
              </span>
            </div>
          )}

          {/* Receipt Print Style Selector */}
          <div className="space-y-2 pt-2 border-t border-neutral-200">
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
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
                    : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
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
                    : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
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
                    : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                <span>No Receipt</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-neutral-100 border-t border-neutral-200 flex justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onCancel}
            disabled={isFinalizing}
            className="px-5 py-2 bg-white border border-neutral-300 font-semibold text-neutral-800 hover:bg-neutral-100 rounded-none text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button 
            ref={confirmBtnRef}
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
