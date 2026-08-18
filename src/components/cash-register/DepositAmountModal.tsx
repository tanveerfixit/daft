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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] w-full max-w-sm rounded-lg shadow-2xl animate-in zoom-in-95 duration-300 border border-[var(--border-base)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-base)] bg-[var(--bg-accent-subtle)]">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-[var(--brand-primary)]" />
            <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">Deposit to Wallet</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-[var(--text-muted-more)] hover:text-[var(--text-main)] transition-colors rounded-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {customer && (
              <div className="px-4 py-3 bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 mb-6 rounded-md">
                <p className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-widest mb-1">Customer</p>
                <p className="text-sm font-bold text-[var(--text-main)]">{safeCustomerName(customer)}</p>
                <p className="text-xs font-semibold text-[var(--brand-success)] mt-1">Current Balance: €{(customer.wallet_balance || 0).toFixed(2)}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Amount to Deposit</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted-more)] font-bold text-lg">€</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--bg-app)] border border-[var(--border-base)] text-2xl font-black text-[var(--text-main)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] transition-all font-mono rounded"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex border-t border-[var(--border-base)]">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 font-bold text-[var(--text-muted)] bg-[var(--bg-app)] hover:bg-[var(--bg-hover)] uppercase tracking-widest text-xs transition-colors border-r border-[var(--border-base)] cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3.5 font-bold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] uppercase tracking-widest text-xs transition-colors cursor-pointer"
            >
              Add to Cart
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
