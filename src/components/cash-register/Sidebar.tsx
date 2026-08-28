import React from 'react';
import { CustomerSelector } from './CustomerSelector';
import { TotalsPanel } from './TotalsPanel';
import { PaymentPanel } from './PaymentPanel';
import { CheckoutActions } from './CheckoutActions';
import { Customer } from '../../types';
import { PaymentEntry } from './types';

interface SidebarProps {
  selectedCustomer: Customer | null;
  customerSearch: string;
  setCustomerSearch: (query: string) => void;
  customerResults: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onClearCustomer: () => void;
  onOpenNewCustomerModal: () => void;
  onOpenDepositModal?: () => void;
  
  subtotal: number;
  taxableTotal?: number;
  tax: number;
  discount: number;
  total: number;
  totalQty?: number;
  taxOption?: string;
  setTaxOption?: (opt: string) => void;
  
  addedPayments: PaymentEntry[];
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  onAddPayment: (method?: string, amount?: number) => void;
  onRemovePayment: (index: number) => void;
  remainingAmount: number;
  
  onCheckout: () => void;
  onQuickCheckout: () => void;
  onClearCart: () => void;
  isCartEmpty: boolean;
  isPaymentComplete: boolean;
  availableMethods: string[];
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  return (
    <aside className="flex flex-col gap-4 text-[18px] w-full lg:w-[400px] shrink-0" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Customer Search */}
      <CustomerSelector 
        selectedCustomer={props.selectedCustomer}
        customerSearch={props.customerSearch}
        setCustomerSearch={props.setCustomerSearch}
        customerResults={props.customerResults}
        onSelectCustomer={props.onSelectCustomer}
        onClearCustomer={props.onClearCustomer}
        onOpenNewCustomerModal={props.onOpenNewCustomerModal}
        onOpenDepositModal={props.onOpenDepositModal}
      />

      {/* Totals */}
      <TotalsPanel 
        subtotal={props.subtotal}
        taxableTotal={props.taxableTotal}
        tax={props.tax}
        discount={props.discount}
        total={props.total}
        totalQty={props.totalQty}
        taxOption={props.taxOption}
        setTaxOption={props.setTaxOption}
      />

      {/* Quick Payment */}
      <PaymentPanel 
        addedPayments={props.addedPayments}
        paymentMethod={props.paymentMethod}
        setPaymentMethod={props.setPaymentMethod}
        paymentAmount={props.paymentAmount}
        setPaymentAmount={props.setPaymentAmount}
        onAddPayment={props.onAddPayment}
        onRemovePayment={props.onRemovePayment}
        remainingAmount={props.remainingAmount}
        customerBalance={props.selectedCustomer?.wallet_balance || 0}
        availableMethods={props.availableMethods}
      />

      {/* Actions */}
      <CheckoutActions 
        onCheckout={props.onCheckout}
        onQuickCheckout={props.onQuickCheckout}
        onClearCart={props.onClearCart}
        isCartEmpty={props.isCartEmpty}
        isPaymentComplete={props.isPaymentComplete}
        remainingAmount={props.remainingAmount}
        paymentMethod={props.paymentMethod}
        addedPaymentsCount={props.addedPayments.length}
        paymentAmount={props.paymentAmount}
      />
    </aside>
  );
};

