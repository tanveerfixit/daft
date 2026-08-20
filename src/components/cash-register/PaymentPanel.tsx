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
      return 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800';
    }
    switch (method.toLowerCase()) {
      case 'cash':
        return 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white shadow-xs';
      case 'card':
        return 'bg-blue-600 border-blue-600 hover:bg-blue-700 text-white shadow-xs';
      case 'wallet':
        return 'bg-purple-600 border-purple-600 hover:bg-purple-700 text-white shadow-xs';
      default:
        return 'bg-slate-800 text-white border-slate-700';
    }
  };

  return (
    <div className="p-3.5 bg-white dark:bg-slate-900 text-base font-sans">
      <div className="flex items-center gap-2 mb-2.5">
        <CreditCard size={16} className="text-blue-600 dark:text-blue-400" />
        <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">Payment</h3>
        {customerBalance > 0 && (
          <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 font-mono">
            Wallet: €{(Number(customerBalance) || 0).toFixed(2)}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Payment Method Buttons */}
        <div className="flex gap-2 w-full font-sans">
          {paymentMethods.map((method) => {
            const isActive = paymentMethod === method;
            return (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`
                  flex-1 py-2 px-3 text-sm font-bold rounded-lg cursor-pointer transition-all border flex items-center justify-center gap-1.5 font-sans
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
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">€</span>
              <input 
                type="number"
                className="w-full pl-7 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg text-lg font-mono font-bold focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-2xs"
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
            className={`w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border transition-all shadow-xs ${
              getMethodColor(paymentMethod, true)
            }`}
          >
            <Plus size={16} strokeWidth={3} />
            <span>Apply €{Number(paymentAmount || 0).toFixed(2)} as {paymentMethod}</span>
          </button>
        </div>

        {addedPayments.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            {addedPayments.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 border border-slate-200 dark:border-slate-700 text-base rounded-lg shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 uppercase text-xs border border-slate-200 dark:border-slate-700">{p.method}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">€{(Number(p.amount) || 0).toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => onRemovePayment(idx)}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer border-0 bg-transparent p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            <div className="flex justify-between items-center px-1 pt-0.5 text-base">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Remaining</span>
              <span className={`font-mono font-bold text-base ${remainingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                €{Math.max(0, remainingAmount).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
