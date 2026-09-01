import React, { useState, useEffect } from 'react';
import { X, Plus, Smartphone, User, CreditCard, Banknote, Wallet, MoreHorizontal } from 'lucide-react';
import { Customer } from '../types';
import { safeCustomerName } from '../utils/customerName';

interface RepairIntakeFormProps {
  onClose: () => void;
  onSuccess: (jobId: number, takeDepositAmount?: number, jobDetails?: any) => void;
  initialCustomerId?: number | null;
}

export default function RepairIntakeForm({ onClose, onSuccess, initialCustomerId }: RepairIntakeFormProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  
  const [formData, setFormData] = useState({
    customer_id: initialCustomerId || null,
    first_name: '',
    last_name: '',
    phone: '',
    country_code: '+353',
    device_model: '',
    issue: '',
    total_quote: 0
  });

  useEffect(() => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(data => {
        setCustomers(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Failed to fetch customers:', err));
  }, []);

  // Handle phone search and auto-fill
  useEffect(() => {
    const cleanSearch = searchPhone.replace(/[\s\-\(\)]/g, '');
    const targetLength = cleanSearch.startsWith('0') ? 10 : 9;
    
    if (cleanSearch.length >= targetLength) {
      const match = customers.find(c => {
        const cleanPhone = (c.phone || '').replace(/[\s\-\(\)]/g, '');
        if (!cleanPhone) return false;
        return cleanPhone === cleanSearch || cleanPhone.endsWith(cleanSearch) || cleanSearch.endsWith(cleanPhone);
      });
      
      if (match) {
        setSelectedCustomer(match);
        setFormData(prev => ({ 
          ...prev, 
          customer_id: match.id, 
          first_name: match.first_name || match.name || '',
          last_name: match.last_name || '',
          phone: match.phone 
        }));
      } else {
        setSelectedCustomer(null);
        setFormData(prev => ({ ...prev, customer_id: null, phone: searchPhone }));
      }
    } else {
      setSelectedCustomer(null);
      setFormData(prev => ({ ...prev, customer_id: null, phone: searchPhone }));
    }
  }, [searchPhone, customers]);

  const handleCreateJob = async (takeDeposit?: boolean) => {
    if (!formData.device_model.trim()) {
      alert('Please enter the device model');
      return;
    }
    if (!formData.customer_id && !formData.first_name.trim() && !searchPhone.trim()) {
      alert('Please enter customer contact details');
      return;
    }

    const parsedDeposit = parseFloat(depositAmount) || 0;
    // Default shouldTakeDeposit to true if depositAmount > 0 unless explicitly false (skip deposit)
    const shouldTakeDeposit = takeDeposit === false 
      ? false 
      : (takeDeposit === true || parsedDeposit > 0);
    const finalDepositAmount = parsedDeposit > 0 
      ? parsedDeposit 
      : (shouldTakeDeposit ? (formData.total_quote || 0) : 0);

    setLoading(true);
    try {
      const payload = {
        ...formData,
        issue: formData.issue.trim() || 'General Inspection / Repair',
        phone: formData.phone.startsWith('+') ? formData.phone : `${formData.country_code}${formData.phone}`,
        deposit_paid: 0,
        remaining_balance: formData.total_quote || 0,
        status: 'new'
      };

      const response = await fetch('/api/repairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create repair job');
      }
      
      const data = await response.json();

      onSuccess(
        data.id,
        shouldTakeDeposit && finalDepositAmount > 0 ? finalDepositAmount : 0,
        {
          customer_id: data.customer_id || formData.customer_id,
          device_model: formData.device_model
        }
      );
    } catch (err: any) {
      alert('Error creating repair job: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded shadow-2xl w-full max-w-[600px] overflow-hidden flex flex-col h-full max-h-[85vh]">
        {/* Header */}
        <div className="bg-[var(--bg-accent-subtle)] px-4 py-3 flex justify-between items-center border-b border-[var(--border-header)] shrink-0">
          <h3 className="text-[var(--text-main)] font-bold text-lg">New Repair Job</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab Headers (Stylistic Match) */}
        <div className="px-4 pt-4 flex gap-1 bg-[var(--bg-card)] border-b border-[var(--border-base)] shrink-0">
          <div className="px-8 py-2 text-sm font-bold border border-[var(--border-header)] border-b-0 rounded-t bg-[var(--bg-card)] text-[var(--text-main)] -mb-px relative z-10">
            Job Intake Details
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={(e) => { e.preventDefault(); handleCreateJob(); }} autoComplete="off" className="flex-1 overflow-auto p-8 space-y-4">
          
          <div className="text-[11px] font-bold text-[var(--text-muted-more)] uppercase tracking-wider mb-4 border-b border-[var(--border-base)] pb-1">
            Customer Information
          </div>

          <div className="flex items-center">
            <label className="w-1/3 text-sm font-bold text-[var(--text-main)]">
              Phone No.<span className="text-red-500">*</span>
            </label>
            <div className="w-2/3 flex gap-2">
              <select
                value={formData.country_code}
                onChange={e => setFormData({ ...formData, country_code: e.target.value })}
                className="border border-[var(--border-input)] rounded px-2 py-1.5 text-sm bg-[var(--bg-card)] focus:border-[var(--brand-primary)] focus:outline-none"
              >
                <option value="+353">IE +353</option>
                <option value="+44">UK +44</option>
                <option value="+1">US +1</option>
              </select>
              <input
                type="tel"
                required
                className="flex-1 border border-[var(--border-input)] rounded px-3 py-1.5 text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                placeholder="Search phone or enter new..."
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center">
            <label className="w-1/3 text-sm font-bold text-[var(--text-main)]">
              First Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-2/3 border border-[var(--border-input)] rounded px-3 py-1.5 text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              value={formData.first_name}
              onChange={e => setFormData({ ...formData, first_name: e.target.value })}
            />
          </div>

          <div className="flex items-center">
            <label className="w-1/3 text-sm font-bold text-[var(--text-main)]">Last Name</label>
            <input
              type="text"
              className="w-2/3 border border-[var(--border-input)] rounded px-3 py-1.5 text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              value={formData.last_name}
              onChange={e => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>

          <div className="text-[11px] font-bold text-[var(--text-muted-more)] uppercase tracking-wider mt-6 mb-4 border-b border-[var(--border-base)] pb-1">
            Device Details
          </div>

          <div className="flex items-center">
            <label className="w-1/3 text-sm font-bold text-[var(--text-main)]">
              Device Model<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. iPhone 13, Samsung S22"
              className="w-2/3 border border-[var(--border-input)] rounded px-3 py-1.5 text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              value={formData.device_model}
              onChange={e => setFormData({ ...formData, device_model: e.target.value })}
            />
          </div>

          <div className="flex items-start">
            <label className="w-1/3 text-sm font-bold text-[var(--text-main)] pt-2">
              Problem Description
            </label>
            <textarea
              rows={2}
              placeholder="Describe the issue (optional, can be updated later)..."
              className="w-2/3 border border-[var(--border-input)] rounded px-3 py-1.5 text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              value={formData.issue}
              onChange={e => setFormData({ ...formData, issue: e.target.value })}
            />
          </div>

          <div className="text-[11px] font-bold text-[var(--text-muted-more)] uppercase tracking-wider mt-6 mb-4 border-b border-[var(--border-base)] pb-1">
            Quote & Deposit
          </div>

          <div className="flex items-center">
            <label className="w-1/3 text-sm font-bold text-[var(--text-main)]">Total Quote</label>
            <div className="w-2/3 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">€</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full border border-[var(--border-input)] rounded px-7 py-1.5 text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-mono"
                value={formData.total_quote}
                onChange={e => setFormData({ ...formData, total_quote: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center">
            <label className="w-1/3 text-sm font-bold text-[var(--text-main)]">Deposit (Optional)</label>
            <div className="w-2/3 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">€</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full border border-[var(--border-input)] rounded px-7 py-1.5 text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-mono"
                placeholder="Amount to take at register now..."
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-auto px-4 py-3 border-t border-[var(--border-base)] flex items-center justify-between bg-[var(--bg-zebra)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--bg-card)] border border-[var(--border-header)] rounded text-[var(--text-main)] hover:bg-[var(--bg-hover)] text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {parseFloat(depositAmount) > 0 ? (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCreateJob(false)}
                  className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  title="Create job without taking deposit now"
                >
                  Skip Deposit
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCreateJob(true)}
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CreditCard size={15} />
                  <span>Create & Pay €{parseFloat(depositAmount).toFixed(2)} Deposit →</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCreateJob(false)}
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Create Repair Job
                </button>
                {formData.total_quote > 0 && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleCreateJob(true)}
                    className="px-4 py-1.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard size={15} />
                    <span>Pay Full €{(formData.total_quote || 0).toFixed(2)} at Register</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
