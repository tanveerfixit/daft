import React from 'react';
import { Check, Trash2, Zap } from 'lucide-react';

interface CheckoutActionsProps {
  onCheckout: () => void;
  onQuickCheckout: () => void;
  onClearCart: () => void;
  isCartEmpty: boolean;
  isPaymentComplete: boolean;
  remainingAmount: number;
  paymentMethod: string;
  addedPaymentsCount: number;
  paymentAmount?: string;
}

export const CheckoutActions: React.FC<CheckoutActionsProps> = ({
  onCheckout,
  onQuickCheckout,
  onClearCart,
  isCartEmpty,
  isPaymentComplete,
  remainingAmount,
  paymentMethod,
  addedPaymentsCount,
  paymentAmount = ''
}) => {
  const getMethodColorClass = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white';
      case 'card':
        return 'bg-blue-600 border-blue-600 hover:bg-blue-700 text-white';
      case 'wallet':
        return 'bg-purple-600 border-purple-600 hover:bg-purple-700 text-white';
      default:
        return 'bg-amber-400 border-amber-500 hover:bg-amber-500 text-slate-900';
    }
  };

  const typedAmount = parseFloat(paymentAmount) || 0;

  return (
    <div className="space-y-2.5 font-sans">
      {isPaymentComplete ? (
        <button 
          onClick={onCheckout}
          disabled={isCartEmpty}
          className="w-full py-3.5 rounded-lg font-bold text-base uppercase tracking-wider flex items-center justify-center gap-2 border border-amber-500 bg-amber-400 text-slate-900 hover:bg-amber-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 dark:disabled:border-slate-700 disabled:opacity-50 cursor-pointer transition-all shadow-sm"
        >
          <Check size={20} strokeWidth={3} />
          <span>Complete Checkout</span>
        </button>
      ) : (
        <button 
          onClick={onQuickCheckout}
          disabled={isCartEmpty}
          className={`w-full py-3.5 rounded-lg font-bold text-base uppercase tracking-wider flex items-center justify-center gap-2 border cursor-pointer transition-all disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 dark:disabled:border-slate-700 disabled:opacity-50 shadow-sm ${
            isCartEmpty ? '' : getMethodColorClass(paymentMethod)
          }`}
        >
          <Zap size={20} strokeWidth={3} className="animate-pulse" />
          <span>
            {addedPaymentsCount > 0 
              ? `Pay €${Math.max(0, remainingAmount).toFixed(2)} & Finish` 
              : (typedAmount > 0 
                  ? `Quick Pay €${typedAmount.toFixed(2)} (${paymentMethod})` 
                  : `Quick Checkout (${paymentMethod})`)}
          </span>
        </button>
      )}
      
      <button 
        onClick={onClearCart}
        className="w-full py-2.5 rounded-lg font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 cursor-pointer transition-colors"
      >
        <Trash2 size={16} />
        Discard Transaction
      </button>
    </div>
  );
};
