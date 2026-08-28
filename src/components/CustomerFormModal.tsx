import React, { useState, useEffect } from 'react';
import { X, Plus, Save } from 'lucide-react';
import { Customer } from '../types';

interface CustomerFormModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSave: (customer: Partial<Customer>) => void;
  initialData?: Partial<Customer>;
}

export default function CustomerFormModal({
  isOpen = true,
  onClose,
  onSave,
  initialData
}: CustomerFormModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'address' | 'alert'>('basic');
  const [formData, setFormData] = useState<Partial<Customer>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    secondary_phone: '',
    company: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    website: '',
    customer_type: 'Individual',
    offers_email: false,
    alert_message: '',
    ...initialData
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        secondary_phone: '',
        company: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
        website: '',
        customer_type: 'Individual',
        offers_email: false,
        alert_message: '',
        ...initialData
      });
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${formData.first_name || ''} ${formData.last_name || ''}`.trim();
    const payload = {
      ...formData,
      name: fullName || formData.first_name || 'Walk-in Customer',
      company:         formData.company          || null,
      address_line2:   formData.address_line2    || null,
      city:            formData.city             || null,
      state:           formData.state            || null,
      zip_code:        formData.zip_code         || null,
      country:         formData.country          || null,
      website:         formData.website          || null,
      alert_message:   formData.alert_message    || null,
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-xl overflow-hidden shadow-2xl rounded-none flex flex-col">
        {/* Header */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {initialData?.id ? 'Edit Customer' : 'Customer Information'}
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 flex gap-2 bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeTab === 'basic' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeTab === 'address' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Address Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alert')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeTab === 'alert' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Alert Message
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-auto p-6 space-y-4 bg-white dark:bg-black text-sm text-neutral-900 dark:text-neutral-100">
          {activeTab === 'basic' && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  First Name<span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  autoComplete="off"
                  placeholder="First name"
                  className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  value={formData.first_name}
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Last Name
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Last name"
                  className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  value={formData.last_name}
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  autoComplete="off"
                  placeholder="customer@example.com"
                  className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Phone No.<span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  autoComplete="off"
                  placeholder="Primary phone"
                  className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Secondary Phone
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Alternative phone"
                  className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  value={formData.secondary_phone}
                  onChange={e => setFormData({ ...formData, secondary_phone: e.target.value })}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Company
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Company name"
                  className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Customer Type
                </label>
                <select
                  className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 cursor-pointer"
                  value={formData.customer_type}
                  onChange={e => setFormData({ ...formData, customer_type: e.target.value })}
                >
                  <option value="Individual">Individual</option>
                  <option value="Business">Business</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'address' && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Address Line 1</label>
                <input
                  type="text"
                  placeholder="Street address"
                  className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  value={formData.address_line1}
                  onChange={e => setFormData({ ...formData, address_line1: e.target.value })}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Address Line 2</label>
                <input
                  type="text"
                  placeholder="Apartment, suite, unit"
                  className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  value={formData.address_line2}
                  onChange={e => setFormData({ ...formData, address_line2: e.target.value })}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">City</label>
                <input
                  type="text"
                  placeholder="City"
                  className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Postcode / Zip</label>
                <input
                  type="text"
                  placeholder="Postal code"
                  className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  value={formData.zip_code}
                  onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeTab === 'alert' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block">
                Alert Message
              </label>
              <textarea
                rows={4}
                className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 resize-none"
                value={formData.alert_message}
                onChange={e => setFormData({ ...formData, alert_message: e.target.value })}
                placeholder="Enter special customer note or warning (displays automatically during checkout)..."
              />
            </div>
          )}

          {/* Footer */}
          <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3 -mx-6 -mb-6 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-none text-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <Save size={16} />
              <span>Save Customer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
