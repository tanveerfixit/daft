import React, { useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { Customer } from '../../types';
import { safeCustomerName } from '../../utils/customerName';

interface DepositAmountModalProps {
  customer: Customer | null;
  onClose: () => void;
  onAddDeposit: (amount: number) => void;
}

export const DepositAmountModal: React.FC<DepositAmountModalProps> = ({
  customer,
  onClose,
  onAddDeposit
}) => {
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      onAddDeposit(val);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-md overflow-hidden shadow-2xl rounded-none flex flex-col">
        {/* Header */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Deposit to Wallet</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 text-sm">
            {customer && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Customer</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{safeCustomerName(customer)}</p>
                <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  Current Balance: €{(customer.wallet_balance || 0).toFixed(2)}
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1 block">
                Amount to Deposit (€)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono font-bold text-base">€</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 pl-8 pr-3 py-2 text-xl font-mono font-bold text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 rounded-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-none text-sm transition-all cursor-pointer"
            >
              Add to Cart
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
