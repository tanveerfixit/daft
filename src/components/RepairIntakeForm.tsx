import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Save, Smartphone, Phone, Mail, User, CreditCard, Wrench } from 'lucide-react';
import { Customer } from '../types';

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
  
  // Two-way view state: Short by default, extended on "More info"
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    customer_id: initialCustomerId || null,
    full_name: '',
    phone: '',
    email: '',
    country_code: '+353',
    device_model: '',
    issue: '',
    total_quote: '' as string | number,
    deposit_amount: '' as string | number
  });

  // Fetch customer directory for phone lookup
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
        const name = match.name || `${match.first_name || ''} ${match.last_name || ''}`.trim();
        setFormData(prev => ({ 
          ...prev, 
          customer_id: match.id, 
          full_name: name || prev.full_name,
          email: match.email || prev.email,
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

  const quickIssues = [
    'Screen Replacement',
    'Battery Issue',
    'Charging Port',
    'Water Damage',
    'Not Turning On',
    'Back Glass'
  ];

  const handleCreateJob = async (takeDeposit?: boolean) => {
    if (!formData.device_model.trim()) {
      alert('Please enter the Device Name / Model (e.g. iPhone 13)');
      return;
    }
    if (!formData.customer_id && !formData.full_name.trim() && !searchPhone.trim()) {
      alert('Please enter customer phone and name');
      return;
    }

    const parsedQuote = parseFloat(String(formData.total_quote)) || 0;
    const parsedDeposit = parseFloat(String(formData.deposit_amount)) || 0;

    const shouldTakeDeposit = takeDeposit === false 
      ? false 
      : (takeDeposit === true || parsedDeposit > 0);
    const finalDepositAmount = parsedDeposit > 0 
      ? parsedDeposit 
      : (shouldTakeDeposit ? parsedQuote : 0);

    setLoading(true);
    try {
      // Split full name into first and last for database consistency
      const nameParts = formData.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const payload = {
        customer_id: formData.customer_id,
        customer_name: formData.full_name.trim(),
        first_name: firstName,
        last_name: lastName,
        email: formData.email.trim() || null,
        phone: formData.phone.startsWith('+') ? formData.phone : `${formData.country_code}${formData.phone}`,
        device_model: formData.device_model.trim(),
        issue: formData.issue.trim() || 'General Inspection / Repair',
        total_quote: parsedQuote,
        deposit_paid: 0,
        remaining_balance: parsedQuote,
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

  const hasDeposit = parseFloat(String(formData.deposit_amount)) > 0;
  const quoteVal = parseFloat(String(formData.total_quote)) || 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded shadow-2xl overflow-hidden flex flex-col my-auto border border-neutral-200 dark:border-neutral-800 transition-all">
        
        {/* Header - Large, clear and high contrast */}
        <div className="bg-neutral-100 dark:bg-neutral-800 px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center">
              <Wrench size={18} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
                New Repair Job
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Quick customer intake form
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors cursor-pointer"
            title="Close Form"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form Body */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleCreateJob(); }} 
          autoComplete="off" 
          className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4 max-h-[75vh]"
        >
          {/* 1. Phone Number */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone size={16} className="text-blue-600 dark:text-blue-400" />
                Phone Number <span className="text-red-500">*</span>
              </span>
              {selectedCustomer && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  ✓ Returning Customer
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <select
                value={formData.country_code}
                onChange={e => setFormData({ ...formData, country_code: e.target.value })}
                className="h-12 px-2.5 sm:px-3 border-2 border-neutral-300 dark:border-neutral-700 rounded text-sm sm:text-base font-semibold bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:border-blue-600 focus:outline-none cursor-pointer shrink-0"
              >
                <option value="+353">IE +353</option>
                <option value="+44">UK +44</option>
                <option value="+1">US +1</option>
              </select>
              <input
                type="tel"
                required
                className="flex-1 h-12 border-2 border-neutral-300 dark:border-neutral-700 rounded px-3.5 sm:px-4 text-base sm:text-lg font-mono text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 bg-white dark:bg-neutral-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 outline-none transition-all"
                placeholder="e.g. 087 123 4567"
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
              />
            </div>
          </div>

          {/* 2. Full Name */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1.5 flex items-center gap-1.5">
              <User size={16} className="text-blue-600 dark:text-blue-400" />
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Murphy"
              className="w-full h-12 border-2 border-neutral-300 dark:border-neutral-700 rounded px-3.5 sm:px-4 text-base sm:text-lg font-medium text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 bg-white dark:bg-neutral-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 outline-none transition-all"
              value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          {/* 3. Email (Optional) */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1.5 flex items-center gap-1.5">
              <Mail size={16} className="text-neutral-500" />
              Email Address <span className="text-neutral-400 dark:text-neutral-500 text-xs font-normal">(Optional for updates)</span>
            </label>
            <input
              type="email"
              placeholder="e.g. customer@gmail.com"
              className="w-full h-12 border-2 border-neutral-300 dark:border-neutral-700 rounded px-3.5 sm:px-4 text-sm sm:text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 bg-white dark:bg-neutral-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 outline-none transition-all"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {/* 4. Device Name / Model */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1.5 flex items-center gap-1.5">
              <Smartphone size={16} className="text-blue-600 dark:text-blue-400" />
              Device Name / Model <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. iPhone 13 Pro, Samsung S22, iPad 9th Gen"
              className="w-full h-12 border-2 border-neutral-300 dark:border-neutral-700 rounded px-3.5 sm:px-4 text-base sm:text-lg font-medium text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 bg-white dark:bg-neutral-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 outline-none transition-all"
              value={formData.device_model}
              onChange={e => setFormData({ ...formData, device_model: e.target.value })}
            />
          </div>

          {/* ─── Expand / Collapse "More Info" Toggle ─── */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowMoreInfo(!showMoreInfo)}
              className="w-full py-2.5 px-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 border border-neutral-300 dark:border-neutral-700 rounded text-sm sm:text-base font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>{showMoreInfo ? '− Hide Additional Details' : '+ More Info (Issue description, Quote, Deposit)'}</span>
              {showMoreInfo ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {/* ─── Extended Fields Section (Long Mode) ─── */}
          {showMoreInfo && (
            <div className="space-y-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 animate-in fade-in duration-200">
              
              {/* Problem / Issue Description */}
              <div>
                <label className="block text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
                  Problem Description
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {quickIssues.map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => {
                        const current = formData.issue.trim();
                        const updated = current ? `${current}, ${issue}` : issue;
                        setFormData({ ...formData, issue: updated });
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300 transition-colors cursor-pointer font-medium"
                    >
                      + {issue}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  placeholder="Describe the problem or symptoms..."
                  className="w-full p-3 border-2 border-neutral-300 dark:border-neutral-700 rounded text-sm sm:text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 bg-white dark:bg-neutral-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 outline-none transition-all"
                  value={formData.issue}
                  onChange={e => setFormData({ ...formData, issue: e.target.value })}
                />
              </div>

              {/* Quote & Deposit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Estimated Quote (€)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-base">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full h-12 pl-8 pr-3 border-2 border-neutral-300 dark:border-neutral-700 rounded text-base sm:text-lg font-mono font-semibold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 focus:border-blue-600 outline-none"
                      value={formData.total_quote}
                      onChange={e => setFormData({ ...formData, total_quote: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Deposit Amount (€)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-base">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full h-12 pl-8 pr-3 border-2 border-neutral-300 dark:border-neutral-700 rounded text-base sm:text-lg font-mono font-semibold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 focus:border-blue-600 outline-none"
                      value={formData.deposit_amount}
                      onChange={e => setFormData({ ...formData, deposit_amount: e.target.value })}
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Primary Action Button directly inside form for seamless thumb reach on mobile */}
          <div className="pt-2 sm:hidden">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 bg-blue-600 hover:bg-blue-700 text-white rounded text-lg font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save size={20} />
              <span>{hasDeposit ? `Save & Pay €${parseFloat(String(formData.deposit_amount)).toFixed(2)} Deposit` : 'Save Repair Job'}</span>
            </button>
          </div>
        </form>

        {/* Footer (Desktop & Tablet Action Bar) */}
        <div className="px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {hasDeposit ? (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCreateJob(false)}
                  className="px-3 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Skip Deposit
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCreateJob(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm sm:text-base font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CreditCard size={18} />
                  <span>Pay €{parseFloat(String(formData.deposit_amount)).toFixed(2)} Deposit →</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCreateJob(false)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm sm:text-base font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save size={18} />
                  <span>Save Repair Job</span>
                </button>
                {quoteVal > 0 && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleCreateJob(true)}
                    className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <CreditCard size={15} />
                    <span>Pay Full €{quoteVal.toFixed(2)}</span>
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
