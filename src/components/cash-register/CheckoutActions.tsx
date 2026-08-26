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
    <div className="flex flex-col gap-3 font-sans" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <button
        id="checkout-btn"
        type="button"
        onClick={handlePrimaryClick}
        disabled={isCartEmpty}
        className={`border rounded py-3 font-semibold text-base transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isPaymentComplete
            ? 'bg-green-500 hover:bg-green-600 border-green-500 text-white'
            : 'bg-[#e6e6e6] hover:bg-[#d8d8d8] border-[#d8d8d8] text-[#333333]'
        }`}
      >
        {isPaymentComplete
          ? 'Checkout & Complete'
          : addedPaymentsCount > 0
            ? `Pay Remaining €${Math.max(0, remainingAmount).toFixed(2)} & Complete`
            : `Checkout & Complete (${paymentMethod})`}
      </button>

      <button
        id="clear-sale-btn"
        type="button"
        onClick={onClearCart}
        className="bg-[#f9fafb] border border-[#ff6347] text-[#ff6347] hover:bg-orange-50 rounded py-3 font-semibold text-base transition-colors cursor-pointer"
      >
        Clear Sale & Start Over
      </button>
    </div>
  );
};

