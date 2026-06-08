import React from 'react';
import { CreditCard, Plus, Trash2, Banknote, Wallet } from 'lucide-react';
import { PaymentEntry } from './types';

interface PaymentPanelProps {
  addedPayments: PaymentEntry[];
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  onAddPayment: () => void;
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
  availableMethods = ['Cash', 'Card']
}) => {
  const paymentMethods = [...availableMethods];
  if (customerBalance > 0 && !paymentMethods.includes('Wallet')) {
    paymentMethods.push('Wallet');
  }

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return <Banknote size={15} />;
      case 'card': return <CreditCard size={15} />;
      case 'wallet': return <Wallet size={15} />;
      default: return null;
    }
  };

  const getMethodColor = (method: string, isActive: boolean) => {
    if (!isActive) {
      return 'bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-950';
    }
    switch (method.toLowerCase()) {
      case 'cash':
        // Vibrant flat emerald-green for Cash selection
        return 'bg-emerald-600 border-emerald-600 dark:bg-emerald-700 dark:border-emerald-700 text-white';
      case 'card':
        // Vibrant flat royal-blue for Card selection
        return 'bg-blue-600 border-blue-600 dark:bg-blue-700 dark:border-blue-700 text-white';
      case 'wallet':
        // Vibrant flat purple for Wallet selection
        return 'bg-purple-600 border-purple-600 dark:bg-purple-700 dark:border-purple-700 text-white';
      default:
        return 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white border-neutral-450 dark:border-neutral-700';
    }
  };

  return (
    <div className="p-4 border-b border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black font-mono text-lg">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard size={18} className="text-neutral-600 dark:text-neutral-400" />
        <h3 className="font-extrabold text-black dark:text-white text-lg uppercase">Payment</h3>
        {customerBalance > 0 && (
          <span className="ml-auto text-[13px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-black px-1.5 py-0.5 rounded-none border border-neutral-300 dark:border-neutral-800">
            Wallet: €{customerBalance.toFixed(2)}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Simplified Payment Method Buttons */}
        <div className="flex gap-2 w-full font-sans">
          {paymentMethods.map((method) => {
            const isActive = paymentMethod === method;
            return (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`
                  flex-1 py-2 px-3 text-[16px] font-extrabold rounded-none cursor-pointer transition-all border flex items-center justify-center gap-1.5 font-sans
                  ${getMethodColor(method, isActive)}
                `}
              >
                {getMethodIcon(method)}
                <span>{method}</span>
              </button>
            );
          })}
        </div>

        {/* Amount Input and Action Button */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-extrabold text-lg">€</span>
              <input 
                type="number"
                className="w-full pl-7 pr-4 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-xl font-mono font-extrabold focus:outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                placeholder="0.00"
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
            </div>
          </div>
          
          <button 
            onClick={onAddPayment}
            className={`w-full py-3 rounded-none font-extrabold text-[16px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border transition-all ${
              getMethodColor(paymentMethod, true)
            }`}
          >
            <Plus size={18} strokeWidth={3} />
            <span>Apply €{Number(paymentAmount || 0).toFixed(2)} as {paymentMethod}</span>
          </button>
        </div>

        {addedPayments.length > 0 && (
          <div className="space-y-2 pt-2">
            {addedPayments.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center bg-neutral-100 dark:bg-neutral-900 p-2 border border-neutral-300 dark:border-neutral-800 text-lg rounded-none">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold bg-white dark:bg-black px-1.5 py-0.5 rounded-none border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 uppercase text-sm">{p.method}</span>
                  <span className="font-mono font-extrabold text-neutral-900 dark:text-neutral-100">€{p.amount.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => onRemovePayment(idx)}
                  className="text-neutral-400 hover:text-red-500 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <div className="flex justify-between items-center px-1 pt-1 text-lg">
              {remainingAmount < 0 ? (
                <>
                  <span className="font-extrabold text-red-650 dark:text-red-400 uppercase tracking-wider text-sm">Change Due</span>
                  <span className="font-mono font-extrabold text-red-650 dark:text-red-400">
                    €{Math.abs(remainingAmount).toFixed(2)}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-extrabold text-neutral-500 uppercase tracking-wider text-sm">Remaining</span>
                  <span className={`font-mono font-extrabold ${remainingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    €{remainingAmount.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
