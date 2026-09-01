import React from 'react';

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
  const isAwaitingTender = addedPaymentsCount > 0 && !isPaymentComplete;

  const handlePrimaryClick = () => {
    if (isCartEmpty) return;
    if (isPaymentComplete) {
      onCheckout();
    } else if (addedPaymentsCount === 0) {
      onQuickCheckout();
    }
  };

  return (
    <div className="flex flex-col gap-2.5 font-sans" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <button
        id="checkout-btn"
        type="button"
        onClick={handlePrimaryClick}
        disabled={isCartEmpty || isAwaitingTender}
        className={`border rounded py-3.5 font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          isPaymentComplete
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
            : isAwaitingTender
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
        }`}
      >
        {isPaymentComplete
          ? '✓ Complete Sale'
          : isAwaitingTender
            ? `Awaiting Tender (€${Math.max(0, remainingAmount).toFixed(2)} Remaining)`
            : `Pay Full €${Math.max(0, remainingAmount).toFixed(2)} (${paymentMethod})`}
      </button>

      <button
        id="clear-sale-btn"
        type="button"
        onClick={onClearCart}
        disabled={isCartEmpty}
        className="bg-white border border-neutral-300 text-neutral-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 rounded py-2 font-medium text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Clear Sale & Start Over
      </button>
    </div>
  );
};

