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
    <div className="p-3.5 bg-white dark:bg-slate-900 font-sans">
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-2">
          <User size={16} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">Customer</h3>
        </div>
        {!selectedCustomer && (
          <button 
            onClick={onOpenNewCustomerModal}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 uppercase tracking-wider bg-transparent border-0 cursor-pointer"
          >
            <UserPlus size={13} />
            New
          </button>
        )}
      </div>

      {selectedCustomer ? (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 flex justify-between items-center font-sans shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-blue-600 text-white flex items-center justify-center font-bold text-sm rounded-lg shrink-0 shadow-2xs">
              {safeCustomerName(selectedCustomer).charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white text-base leading-tight truncate">
                {safeCustomerName(selectedCustomer)}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{selectedCustomer.phone}</p>
                {selectedCustomer.wallet_balance !== undefined && selectedCustomer.wallet_balance !== null && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 font-mono">
                    €{(Number(selectedCustomer.wallet_balance) || 0).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {selectedCustomer.name !== 'Walk-in Customer' && onOpenDepositModal && (
              <button 
                onClick={onOpenDepositModal}
                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-md transition-colors border-0 bg-transparent cursor-pointer"
                title="Deposit to Wallet"
              >
                <Plus size={16} />
              </button>
            )}
            <button 
              onClick={onClearCustomer}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors border-0 bg-transparent cursor-pointer"
              title="Clear Customer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative font-sans">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-slate-400" />
          </div>
          <input 
            type="text"
            className="w-full pl-9 pr-4 py-2 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg text-base focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 font-sans shadow-2xs placeholder:text-slate-400"
            placeholder="Search customer phone or name..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />
          
          {customerSearch && customerResults.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl max-h-[220px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {customerResults.map((customer, idx) => (
                <button
                  key={`${customer.id}-${idx}`}
                  onClick={() => onSelectCustomer(customer)}
                  className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-3 border-0 font-sans cursor-pointer"
                >
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-center text-xs font-bold font-sans shrink-0">
                    {safeCustomerName(customer).charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                      {safeCustomerName(customer)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{customer.phone}</p>
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
