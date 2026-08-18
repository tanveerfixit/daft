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
  tax: number;
  discount: number;
  total: number;
  
  addedPayments: PaymentEntry[];
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  onAddPayment: () => void;
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
    <div className="w-[380px] h-full flex flex-col bg-white dark:bg-black border-l border-neutral-300 dark:border-neutral-800 overflow-hidden rounded-none shadow-none">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div>
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
        </div>
        
        <div>
          <TotalsPanel 
            subtotal={props.subtotal}
            tax={props.tax}
            discount={props.discount}
            total={props.total}
          />
        </div>
        
        <div>
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
        </div>
      </div>
      
      {/* Sticky Footer Area */}
      <div className="shrink-0 p-4 border-t border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 rounded-none">
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
      </div>
    </div>
  );
};
