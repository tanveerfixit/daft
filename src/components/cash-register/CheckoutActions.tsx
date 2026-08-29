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
  const handlePrimaryClick = () => {
    if (isCartEmpty) return;
    if (isPaymentComplete) {
      onCheckout();
    } else {
      onQuickCheckout();
    }
  };

  return (
    <div className="flex flex-col gap-2.5 font-sans" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <button
        id="checkout-btn"
        type="button"
        onClick={handlePrimaryClick}
        disabled={isCartEmpty}
        className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 rounded py-3.5 font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPaymentComplete
          ? '✓ Complete Sale'
          : addedPaymentsCount > 0
            ? `Pay Remaining €${Math.max(0, remainingAmount).toFixed(2)} & Complete`
            : `Checkout & Complete (${paymentMethod})`}
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

