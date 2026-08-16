import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search } from 'lucide-react';
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
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [customers]);

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
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-base px-2 py-2 select-none w-full overflow-hidden" style={{ fontSize: '17px' }}>
      {/* Header bar */}
      <div className="flex justify-between items-center px-4 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 shrink-0 mb-2 rounded-none shadow-none">
        <h2 className="text-xl font-bold text-black dark:text-white uppercase">Customers</h2>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search name, phone or email..."
              className="w-full pl-10 pr-4 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none text-neutral-900 dark:text-neutral-100"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-base flex items-center gap-2 transition-all"
          >
            <Plus size={16} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Table — full width, no container */}
      <div className="flex-1 overflow-auto border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-[13px] font-bold text-black dark:text-white uppercase tracking-wider">
            <tr>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800">Name</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800">Phone</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800">Email</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800">Company</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 text-right">Wallet</th>
              <th className="px-2 py-1 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(customer => (
              <tr key={customer.id} className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-base font-normal text-neutral-900 dark:text-neutral-100 bg-white dark:bg-black">
                <td className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 font-normal text-neutral-900 dark:text-neutral-100 font-sans">
                  <button
                    onClick={() => onSelectCustomer(customer.id)}
                    className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-left text-neutral-900 dark:text-neutral-100 font-normal font-sans"
                  >
                    {safeCustomerName(customer)}
                  </button>
                </td>
                <td className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-sans">{customer.phone || '—'}</td>
                <td className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-sans">{customer.email || '—'}</td>
                <td className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-sans">{customer.company || '—'}</td>
                <td className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 text-right font-normal text-emerald-600 dark:text-emerald-400">
                  €{Number(customer.wallet_balance || 0).toFixed(2)}
                </td>
                <td className="px-2 py-1 text-center font-sans">
                  <button
                    onClick={() => onSelectCustomer(customer.id)}
                    className="text-blue-500 hover:underline font-normal text-sm font-sans"
                  >
                    View History
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-16 text-center text-neutral-400 dark:text-neutral-500 bg-white dark:bg-black">
                  {searchQuery ? `No customers found for "${searchQuery}"` : 'No customers yet. Add your first customer.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
