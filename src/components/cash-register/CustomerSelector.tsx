import React from 'react';
import { User, UserPlus, Search, X, Plus } from 'lucide-react';
import { Customer } from '../../types';
import { safeCustomerName } from '../../utils/customerName';

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  customerSearch: string;
  setCustomerSearch: (query: string) => void;
  customerResults: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onClearCustomer: () => void;
  onOpenNewCustomerModal: () => void;
  onOpenDepositModal?: () => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomer,
  customerSearch,
  setCustomerSearch,
  customerResults,
  onSelectCustomer,
  onClearCustomer,
  onOpenNewCustomerModal,
  onOpenDepositModal
}) => {
  return (
    <div className="p-4 border-b border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black font-mono">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <User size={16} className="text-neutral-600 dark:text-neutral-400" />
          <h3 className="font-bold text-black dark:text-white text-base uppercase">Customer</h3>
        </div>
        {!selectedCustomer && (
          <button 
            onClick={onOpenNewCustomerModal}
            className="text-[12px] font-bold text-neutral-900 dark:text-neutral-100 hover:underline flex items-center gap-1 uppercase tracking-wider bg-transparent border-0 cursor-pointer"
          >
            <UserPlus size={12} />
            New
          </button>
        )}
      </div>

      {selectedCustomer ? (
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-md p-2 flex justify-between items-center font-sans">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center font-bold rounded-sm border border-neutral-300 dark:border-neutral-700">
              {safeCustomerName(selectedCustomer).charAt(0) || '?'}
            </div>
            <div>
              <p className="font-bold text-neutral-900 dark:text-neutral-100 text-base leading-tight">
                {safeCustomerName(selectedCustomer)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-normal">{selectedCustomer.phone}</p>
                {selectedCustomer.wallet_balance !== undefined && selectedCustomer.wallet_balance !== null && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-black px-1.5 py-0.5 rounded-sm border border-neutral-300 dark:border-neutral-800 font-mono">
                    Wallet: €{(Number(selectedCustomer.wallet_balance) || 0).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedCustomer.name !== 'Walk-in Customer' && onOpenDepositModal && (
              <button 
                onClick={onOpenDepositModal}
                className="p-1 text-emerald-600 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-sm transition-colors border-0 bg-transparent cursor-pointer"
                title="Deposit to Wallet"
              >
                <Plus size={16} />
              </button>
            )}
            <button 
              onClick={onClearCustomer}
              className="p-1 text-red-650 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-sm transition-colors border-0 bg-transparent cursor-pointer"
              title="Clear Customer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative font-sans">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-neutral-500" />
          </div>
          <input 
            type="text"
            className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-sans"
            placeholder="Search phone or name..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />
          
          {customerSearch && customerResults.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 shadow-lg rounded-md max-h-[200px] overflow-y-auto">
              {customerResults.map((customer, idx) => (
                <button
                  key={`${customer.id}-${idx}`}
                  onClick={() => onSelectCustomer(customer)}
                  className="w-full text-left p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 last:border-0 rounded-none font-sans cursor-pointer"
                >
                  <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-sm flex items-center justify-center text-neutral-550 dark:text-neutral-400 text-xs font-bold font-sans">
                    {safeCustomerName(customer).charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                      {safeCustomerName(customer)}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">{customer.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
