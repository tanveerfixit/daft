import React from 'react';
import { X, Plus } from 'lucide-react';
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
    <div className="flex flex-col gap-1 relative" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {selectedCustomer ? (
        <div className="flex items-center justify-between gap-3 bg-white border border-[#d8d8d8] rounded p-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#333333] text-base truncate">
              {safeCustomerName(selectedCustomer)}
            </p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-[#757575]">
              <span>{selectedCustomer.phone}</span>
              {selectedCustomer.wallet_balance !== undefined && selectedCustomer.wallet_balance !== null && (
                <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Wallet: €{(Number(selectedCustomer.wallet_balance) || 0).toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedCustomer.name !== 'Walk-in Customer' && onOpenDepositModal && (
              <button 
                type="button"
                onClick={onOpenDepositModal}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200 cursor-pointer"
                title="Deposit to Wallet"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button 
              type="button"
              onClick={onClearCustomer}
              className="p-1.5 text-[#757575] hover:text-[#ff6347] hover:bg-gray-50 rounded border border-[#d8d8d8] cursor-pointer"
              title="Clear Customer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-stretch gap-3 bg-white border border-[#d8d8d8] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded p-3 transition-all">
          <input
            type="text"
            placeholder="Search Customers"
            className="flex-1 border border-[#d8d8d8] focus:border-blue-500 rounded px-3 py-2 outline-none text-[#333333] placeholder-[#757575] text-base bg-white"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />
          <button
            type="button"
            onClick={onOpenNewCustomerModal}
            className="flex items-center gap-1 border border-[#d8d8d8] rounded px-4 py-2 bg-[#e5e7eb] text-[#333333] hover:bg-[#d8d8d8] whitespace-nowrap font-medium cursor-pointer"
          >
            <span className="text-lg leading-none">+</span> New
          </button>
        </div>
      )}

      {/* Customer search results dropdown */}
      {!selectedCustomer && customerSearch && customerResults.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-[#d8d8d8] shadow-lg rounded max-h-56 overflow-y-auto divide-y divide-[#d8d8d8]">
          {customerResults.map((customer, idx) => (
            <button
              key={`${customer.id}-${idx}`}
              onClick={() => onSelectCustomer(customer)}
              className="w-full text-left p-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between border-0 cursor-pointer font-sans"
            >
              <div className="min-w-0">
                <p className="text-base font-semibold text-[#333333] leading-tight truncate">
                  {safeCustomerName(customer)}
                </p>
                <p className="text-xs text-[#757575]">{customer.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

