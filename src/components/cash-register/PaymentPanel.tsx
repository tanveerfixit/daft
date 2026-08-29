import React from 'react';
import { PaymentEntry } from './types';

interface PaymentPanelProps {
  addedPayments: PaymentEntry[];
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  onAddPayment: (method?: string, amount?: number) => void;
  onRemovePayment: (index: number) => void;
  remainingAmount: number;
  customerBalance?: number;
  availableMethods: string[];
}

export const PaymentPanel: React.FC<PaymentPanelProps> = ({
  addedPayments,
  paymentMethod,
  setPaymentMethod,
  paymentAmount,
  setPaymentAmount,
  onAddPayment,
  onRemovePayment,
  remainingAmount,
  customerBalance = 0,
  availableMethods = ['Cash', 'Card', 'Other']
}) => {
  const methods = ['Cash', 'Card', 'Other'];
  if (customerBalance > 0 && !methods.includes('Wallet')) {
    methods.push('Wallet');
  }

  const handleMethodClick = (m: string) => {
    setPaymentMethod(m);
    // If user clicks the method button directly, apply currently typed or remaining amount with this method immediately
    const parsed = parseFloat(paymentAmount);
    const amt = !isNaN(parsed) && parsed > 0 ? parsed : remainingAmount;
    if (amt > 0) {
      onAddPayment(m, amt);
    }
  };

  return (
    <div className="pay-widget bg-white border border-[#d8d8d8] rounded p-4 flex flex-col gap-3 text-lg" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div className="flex items-center justify-between text-[#333333]">
        <span>Remaining:</span>
        <span className="pay-widget-remaining font-semibold text-xl">
          €{Math.max(0, remainingAmount).toFixed(2)}
        </span>
      </div>

      <input 
        type="number" 
        step="0.01" 
        min="0" 
        placeholder="Enter amount" 
        className="pay-widget-amount border border-[#d8d8d8] rounded px-3 py-2 outline-none text-[#333333] placeholder-[#757575] text-lg bg-white"
        value={paymentAmount}
        onChange={(e) => setPaymentAmount(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAddPayment();
          }
        }}
      />

      <div className={`grid ${methods.length > 3 ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
        {methods.map((m) => {
          const isActive = paymentMethod.toLowerCase() === m.toLowerCase();

          let activeClasses = '';
          let inactiveClasses = '';

          if (m.toLowerCase() === 'cash') {
            activeClasses = 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold';
            inactiveClasses = 'bg-white border-neutral-300 text-neutral-800 hover:border-emerald-500 hover:bg-emerald-50/50';
          } else if (m.toLowerCase() === 'card') {
            activeClasses = 'bg-blue-600 border-blue-600 text-white shadow-sm font-bold';
            inactiveClasses = 'bg-white border-neutral-300 text-neutral-800 hover:border-blue-500 hover:bg-blue-50/50';
          } else if (m.toLowerCase() === 'wallet') {
            activeClasses = 'bg-purple-600 border-purple-600 text-white shadow-sm font-bold';
            inactiveClasses = 'bg-white border-neutral-300 text-neutral-800 hover:border-purple-500 hover:bg-purple-50/50';
          } else {
            activeClasses = 'bg-amber-600 border-amber-600 text-white shadow-sm font-bold';
            inactiveClasses = 'bg-white border-neutral-300 text-neutral-800 hover:border-amber-500 hover:bg-amber-50/50';
          }

          return (
            <button
              key={m}
              type="button"
              onClick={() => handleMethodClick(m)}
              className={`pay-widget-btn border rounded py-2.5 font-semibold text-base transition-all cursor-pointer ${
                isActive ? activeClasses : inactiveClasses
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>

      {addedPayments.length > 0 && (
        <div className="pay-widget-list flex flex-col gap-1 text-base text-[#333333] pt-2 border-t border-[#d8d8d8]">
          {addedPayments.map((p, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <span className="font-medium">{p.method}</span>
              <span className="flex items-center gap-2">
                <span className="font-semibold">€{Number(p.amount).toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => onRemovePayment(i)}
                  aria-label="Remove payment"
                  className="pay-widget-remove text-[#757575] hover:text-[#ff6347] leading-none text-xl p-0.5 cursor-pointer bg-transparent border-0"
                >
                  &times;
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

