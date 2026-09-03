import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Customer } from '../types';
import { safeCustomerName } from '../utils/customerName';
import CustomerFormModal from './CustomerFormModal';

interface CustomerListProps {
  onSelectCustomer: (id: number) => void;
  isActive?: boolean;
}

export default function CustomerList({ onSelectCustomer, isActive = true }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initialFocusDone = useRef(false);

  const fetchCustomers = () => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(data => setCustomers(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to fetch customers:', err));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (isActive) {
      fetchCustomers();
    }
  }, [isActive]);

  useEffect(() => {
    const handleFocus = () => {
      if (isActive) fetchCustomers();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isActive]);

  useEffect(() => {
    if (!initialFocusDone.current && searchInputRef.current) {
      searchInputRef.current.focus();
      initialFocusDone.current = true;
    }
  }, []);

  const handleAddCustomer = async (customerData: Partial<Customer>) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      if (response.ok) {
        fetchCustomers();
        setIsModalOpen(false);
      } else {
        const err = await response.json();
        alert('Failed to add customer: ' + (err.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  const filtered = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      safeCustomerName(c).toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-sm px-2 pb-2 pt-0 select-none w-full" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '16px' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black shrink-0 flex justify-between items-center px-4 py-3">
        <h2 className="font-medium text-black dark:text-white" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '24px' }}>Customers</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-2 flex flex-wrap gap-2 items-center bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-850 shrink-0">
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 border border-red-200 dark:border-red-900/60 px-2 py-1 rounded transition-colors cursor-pointer"
            title="Clear customer search query"
          >
            Reset Search
          </button>
        )}

        <div className="relative flex-1 max-w-md ml-auto">
          <input
            ref={searchInputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search name, phone or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchQuery('');
              }
            }}
            className="w-full pl-3 pr-16 py-1 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none text-sm font-normal outline-none focus:border-neutral-400 h-8"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded cursor-pointer"
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
            <Search size={16} className="text-neutral-500 dark:text-neutral-400" />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-200 dark:border-neutral-850">
        <table className="w-full text-left border-collapse bg-white dark:bg-black text-[15px]">
          <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 text-center">Name</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-36 text-center">Phone</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-48 text-center">Email</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-40 text-center">Company</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-28 text-center">Wallet</th>
              <th className="px-1.5 py-1 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {filtered.map(customer => (
              <tr 
                key={customer.id} 
                className="bg-white dark:bg-black hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-[15px]"
                onClick={() => onSelectCustomer(customer.id)}
              >
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 font-normal text-neutral-900 dark:text-neutral-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectCustomer(customer.id); }}
                    className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-left text-neutral-900 dark:text-neutral-100 font-normal"
                  >
                    {safeCustomerName(customer)}
                  </button>
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400">{customer.phone || '—'}</td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400">{customer.email || '—'}</td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400">{customer.company || '—'}</td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right font-normal text-emerald-600 dark:text-emerald-400 font-mono">
                  €{Number(customer.wallet_balance || 0).toFixed(2)}
                </td>
                <td className="px-1.5 py-0.5 text-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectCustomer(customer.id); }}
                    className="text-blue-500 hover:underline font-normal text-xs"
                  >
                    View History
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-16 text-center text-neutral-400 dark:text-neutral-500 bg-white dark:bg-black italic text-sm">
                  {searchQuery ? `No customers found for "${searchQuery}"` : 'No customers yet. Add your first customer.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      <div className="p-2 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-850 flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400 shrink-0">
        <div className="flex items-center gap-4">
          <select className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none font-mono">
            <option>auto</option>
          </select>
          <span className="font-normal">1-{filtered.length}/{customers.length}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200">«</button>
          <button className="px-3 py-0.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rounded-none font-normal">1</button>
          <button className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200">»</button>
        </div>
      </div>

      {isModalOpen && (
        <CustomerFormModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddCustomer}
        />
      )}
    </div>
  );
}
