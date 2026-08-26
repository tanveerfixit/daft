import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Customer } from '../types';

interface CustomerFormModalProps {
  onClose: () => void;
  onSave: (customer: Partial<Customer>) => void;
  initialData?: Partial<Customer>;
}

export default function CustomerFormModal({ onClose, onSave, initialData }: CustomerFormModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'address' | 'alert'>('basic');
  const [formData, setFormData] = useState<Partial<Customer>>({
    first_name: '',
    last_name: '',
    email: '',
    offers_email: false,
    company: '',
    phone: '',
    secondary_phone: '',
    fax: '',
    customer_type: 'Individual',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'Ireland',
    alert_message: '',
    ...initialData
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = `${formData.first_name || ''} ${formData.last_name || ''}`.trim();
    // Build a clean payload — only send known fields with explicit null for empties
    // This prevents mysql2 "undefined bind parameter" errors
    const payload = {
      name,
      first_name:      formData.first_name      || null,
      last_name:       formData.last_name        || null,
      phone:           formData.phone            || null,
      email:           formData.email            || null,
      secondary_phone: formData.secondary_phone  || null,
      fax:             formData.fax              || null,
      offers_email:    formData.offers_email     ? 1 : 0,
      company:         formData.company          || null,
      customer_type:   formData.customer_type    || null,
      address_line1:   formData.address_line1    || null,
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 font-mono text-base select-none" style={{ fontSize: '17px' }}>
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-[600px] overflow-hidden flex flex-col rounded-none shadow-none">
        {/* Header */}
        <div className="bg-neutral-200 dark:bg-neutral-900 px-4 py-3 flex justify-between items-center border-b border-neutral-300 dark:border-neutral-800 rounded-none">
          <h3 className="text-black dark:text-white font-bold text-xl uppercase">Customer Information</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-750 dark:hover:text-neutral-350 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-4 flex gap-1 bg-white dark:bg-black">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-8 py-1.5 text-base font-bold border border-neutral-300 dark:border-neutral-800 border-b-0 rounded-none transition-colors ${
              activeTab === 'basic' ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white -mb-px relative z-10' : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
            }`}
          >
            Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`px-8 py-1.5 text-base font-bold border border-neutral-300 dark:border-neutral-800 border-b-0 rounded-none transition-colors ${
              activeTab === 'address' ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white -mb-px relative z-10' : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
            }`}
          >
            Address Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alert')}
            className={`px-8 py-1.5 text-base font-bold border border-neutral-300 dark:border-neutral-800 border-b-0 rounded-none transition-colors ${
              activeTab === 'alert' ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white -mb-px relative z-10' : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
            }`}
          >
            Alert message
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-auto p-8 border-t border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">First Name<span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  autoComplete="off"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.first_name}
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>

              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Last Name</label>
                <input
                  type="text"
                  autoComplete="off"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.last_name}
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>

              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Email Address</label>
                <input
                  type="email"
                  autoComplete="off"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Offers Email</label>
                <div className="w-2/3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded-none border-neutral-350 dark:border-neutral-800 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 focus:ring-0 focus:ring-offset-0 focus:outline-none"
                    checked={Boolean(formData.offers_email)}
                    onChange={e => setFormData({ ...formData, offers_email: e.target.checked })}
                  />
                </div>
              </div>

              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Company</label>
                <input
                  type="text"
                  autoComplete="off"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Phone No.<span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  autoComplete="off"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Secondary Phone</label>
                <input
                  type="text"
                  autoComplete="off"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.secondary_phone}
                  onChange={e => setFormData({ ...formData, secondary_phone: e.target.value })}
                />
              </div>

              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Fax</label>
                <input
                  type="text"
                  autoComplete="off"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.fax}
                  onChange={e => setFormData({ ...formData, fax: e.target.value })}
                />
              </div>

              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Customer Type</label>
                <div className="w-2/3 flex gap-0">
                  <select
                    className="flex-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                    value={formData.customer_type}
                    onChange={e => setFormData({ ...formData, customer_type: e.target.value })}
                  >
                    <option value="Individual">Select Customer Type</option>
                    <option value="Individual">Individual</option>
                    <option value="Business">Business</option>
                  </select>
                  <button type="button" className="bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 border-l-0 px-3 py-1.5 text-black dark:text-white hover:bg-neutral-350 dark:hover:bg-neutral-800 rounded-none flex items-center gap-1 text-base font-bold">
                    <Plus size={14} /> New
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'address' && (
            <div className="space-y-4">
              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Address Line 1</label>
                <input
                  type="text"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.address_line1}
                  onChange={e => setFormData({ ...formData, address_line1: e.target.value })}
                />
              </div>
              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Address Line 2</label>
                <input
                  type="text"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.address_line2}
                  onChange={e => setFormData({ ...formData, address_line2: e.target.value })}
                />
              </div>
              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">City</label>
                <input
                  type="text"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">State</label>
                <input
                  type="text"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Zip Code</label>
                <input
                  type="text"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.zip_code}
                  onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                />
              </div>
              <div className="flex items-center">
                <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Country</label>
                <input
                  type="text"
                  className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeTab === 'alert' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-base font-bold text-black dark:text-white uppercase">Alert Message</label>
                <textarea
                  rows={4}
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-2 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.alert_message}
                  onChange={e => setFormData({ ...formData, alert_message: e.target.value })}
                  placeholder="Enter alert message for this customer..."
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-neutral-300 dark:border-neutral-800 flex justify-end gap-2 bg-neutral-100 dark:bg-neutral-950 -mx-8 -mb-8 p-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-base font-bold rounded-none shadow-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-base font-bold rounded-none shadow-none transition-colors border border-neutral-300 dark:border-neutral-800"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
