import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, Mail, MapPin, FileText, CreditCard, History, Save, ChevronDown, Trash2 } from 'lucide-react';
import { Customer, Invoice, Payment } from '../types';
import { safeCustomerName } from '../utils/customerName';

interface CustomerDetailsProps {
  customerId: number;
  onBack: () => void;
  onSelectInvoice?: (id: number) => void;
  onCreateInvoice?: () => void;
  onCreateRepair?: () => void;
  onDeposit?: () => void;
}

interface CustomerActivity {
  id: number;
  activity: string;
  details: string;
  user_name: string;
  created_at: string;
}

import CustomerFormModal from './CustomerFormModal';
import { X, Plus } from 'lucide-react';

export default function CustomerDetails({ 
  customerId, 
  onBack, 
  onSelectInvoice,
  onCreateInvoice,
  onCreateRepair,
  onDeposit
}: CustomerDetailsProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<(Payment & { invoice_number: string })[]>([]);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'properties' | 'credits' | 'terms' | 'activity'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const fetchCustomerData = () => {
    fetch(`/api/customers/${customerId}`).then(res => res.json()).then(data => {
      setCustomer(data);
    });
    fetch(`/api/customers/${customerId}/invoices`)
      .then(res => res.json())
      .then(data => setInvoices(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching invoices:', err);
        setInvoices([]);
      });
    fetch(`/api/customers/${customerId}/payments`)
      .then(res => res.json())
      .then(data => setPayments(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching payments:', err);
        setPayments([]);
      });
    fetch(`/api/customers/${customerId}/activity`)
      .then(res => res.json())
      .then(data => setActivities(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching activities:', err);
        setActivities([]);
      });
  };

  useEffect(() => {
    fetchCustomerData();
  }, [customerId]);

  const handleUpdate = async (formData: Partial<Customer>) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setCustomer({ ...customer!, ...formData });
        setIsEditing(false);
        fetch(`/api/customers/${customerId}/activity`).then(res => res.json()).then(setActivities);
      }
    } catch (error) {
      console.error('Failed to update customer:', error);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this customer?')) return;
    
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        onBack();
      }
    } catch (error) {
      console.error('Error archiving customer:', error);
    }
  };

  if (!customer) return (
    <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono p-8 text-lg">
      *** LOADING SYSTEM DATA ***
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-base px-2 pb-2 pt-0 select-none w-full overflow-auto" style={{ fontSize: '17px' }}>

      {/* Header Tabs */}
      <div className="flex justify-between items-end bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 pt-2 px-2 shrink-0 rounded-none shadow-none mb-2 flex-wrap md:flex-nowrap">
        <div className="flex gap-1 items-end overflow-x-auto">
          <button 
            onClick={() => setActiveTab('info')}
            className={`px-4 py-1.5 border border-neutral-300 dark:border-neutral-800 border-b-0 text-base font-bold -mb-px relative transition-colors rounded-none ${
              activeTab === 'info' ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white' : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
            }`}
          >
            Customer Information
          </button>

          <button 
            onClick={() => setActiveTab('properties')}
            className={`px-4 py-1.5 border border-neutral-300 dark:border-neutral-800 border-b-0 text-base font-bold -mb-px relative transition-colors rounded-none ${
              activeTab === 'properties' ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white' : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
            }`}
          >
            Customer Properties
          </button>

          <button 
            onClick={() => setActiveTab('credits')}
            className={`px-4 py-1.5 border border-neutral-300 dark:border-neutral-800 border-b-0 text-base font-bold -mb-px relative transition-colors rounded-none ${
              activeTab === 'credits' ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white' : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
            }`}
          >
            Wallet & Ledger
          </button>

          <button 
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-1.5 border border-neutral-300 dark:border-neutral-800 border-b-0 text-base font-bold -mb-px relative transition-colors rounded-none ${
              activeTab === 'terms' ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white' : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
            }`}
          >
            Payment Terms
          </button>

          <button 
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-1.5 border border-neutral-300 dark:border-neutral-800 border-b-0 text-base font-bold -mb-px relative transition-colors rounded-none ${
              activeTab === 'activity' ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white' : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
            }`}
          >
            Activity Log
          </button>
        </div>

        <div className="pb-2 pr-2 flex gap-2">
          <button 
            onClick={handleArchive}
            className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 text-red-600 dark:text-red-400 text-sm font-bold rounded-none shadow-none hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <Trash2 size={12} />
            Archive
          </button>
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-bold rounded-none shadow-none hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            Customers List
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex flex-col md:flex-row gap-4">

        {/* Left Panel */}
        <div className="w-full md:w-[40%] p-4 border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black flex gap-6 overflow-auto rounded-none shadow-none">

          {/* Avatar */}
          <div className="shrink-0 pt-2">
            <div className="w-[120px] h-[120px] rounded-none border border-neutral-300 dark:border-neutral-800 flex items-center justify-center bg-white dark:bg-black overflow-hidden shadow-none">
              {safeCustomerName(customer) !== 'Unknown' ? (
                <span className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">{safeCustomerName(customer).charAt(0)}</span>
              ) : (
                <User size={64} className="text-neutral-300 dark:text-neutral-700" />
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex-1 space-y-4 pt-2 font-normal text-neutral-900 dark:text-neutral-100">

            <div className="space-y-1">
              <h2 className="text-[#3498db] dark:text-[#3498db] font-bold uppercase tracking-tight" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>
                {customer.company || safeCustomerName(customer)}
              </h2>
              {customer.company && (
                <p className="text-[#3498db] dark:text-[#3498db] text-sm font-semibold tracking-tight" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  {safeCustomerName(customer)}
                </p>
              )}
            </div>

            <div className="space-y-2 text-base font-normal text-neutral-900 dark:text-neutral-100">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-neutral-500" />
                {customer.email || 'No email provided'}
              </div>

              <div className="flex items-center gap-2">
                <Phone size={14} className="text-neutral-500" />
                {customer.phone || 'No phone provided'}
              </div>
            </div>

            <div className="text-sm font-normal text-neutral-900 dark:text-neutral-100 leading-snug pt-2">
              <p className="mb-1">Customer Type : Individual</p>
              {customer.address_line1 ? (
                <>
                  <p>{customer.address_line1}</p>
                  <p>{customer.city}, {customer.state} {customer.zip_code}</p>
                </>
              ) : (
                <p>{customer.address || 'No address provided'}</p>
              )}
              <p>Ireland</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 flex-wrap">

              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 px-5 py-1 text-sm font-normal rounded-none shadow-none transition-colors"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>

              <button className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 px-3 py-1 text-sm font-normal rounded-none shadow-none transition-colors">
                Merge Customers
              </button>

              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-sm font-normal rounded-none shadow-none transition-colors">
                Trade In
              </button>

              <button 
                onClick={handleArchive}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-sm font-normal rounded-none shadow-none transition-colors"
              >
                Archive
              </button>

              {/* Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 px-3 py-1 text-sm font-normal rounded-none shadow-none flex items-center justify-between min-w-[110px] transition-colors"
                >
                  Create New
                  <ChevronDown size={14} className={`transition-transform ${showCreateMenu ? 'rotate-180' : ''}`} />
                </button>

                {showCreateMenu && (
                  <div className="absolute top-full left-0 w-full flex flex-col z-10 shadow-none border border-neutral-300 dark:border-neutral-800 mt-1 bg-white dark:bg-black rounded-none overflow-hidden">
                    <button className="bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm text-left hover:bg-neutral-200 dark:hover:bg-neutral-900 font-bold border-b border-neutral-300 dark:border-neutral-800 rounded-none">
                      Create New
                    </button>

                    <button 
                      onClick={() => {
                        setShowCreateMenu(false);
                        onCreateInvoice?.();
                      }}
                      className="bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm text-left hover:bg-neutral-200 dark:hover:bg-neutral-900 font-normal border-b border-neutral-300 dark:border-neutral-800 rounded-none"
                    >
                      Cash Register
                    </button>

                    <button 
                      onClick={() => {
                        setShowCreateMenu(false);
                        onCreateRepair?.();
                      }}
                      className="bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm text-left hover:bg-neutral-200 dark:hover:bg-neutral-900 font-normal border-b border-neutral-300 dark:border-neutral-800 rounded-none"
                    >
                      Repair Ticket
                    </button>

                    <button 
                      onClick={() => {
                        setShowCreateMenu(false);
                      }}
                      className="bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm text-left hover:bg-neutral-200 dark:hover:bg-neutral-900 font-normal border-b border-neutral-300 dark:border-neutral-800 rounded-none"
                    >
                      Order
                    </button>

                    <button 
                      onClick={() => {
                        setShowCreateMenu(false);
                        onDeposit?.();
                      }}
                      className="bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm text-left hover:bg-neutral-200 dark:hover:bg-neutral-900 font-normal rounded-none"
                    >
                      Deposit
                    </button>
                  </div>
                )}
              </div>

            </div>

      {isEditing && (
        <CustomerFormModal 
          onClose={() => setIsEditing(false)}
          onSave={handleUpdate}
          initialData={customer}
        />
      )}

          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 overflow-auto p-4 rounded-none shadow-none">
          {activeTab === 'info' && (
            <div className="space-y-8">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-neutral-250 dark:bg-neutral-900 p-4 rounded-none border border-neutral-300 dark:border-neutral-800">
                  <p className="text-[12px] font-bold text-black dark:text-white uppercase mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">€{invoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0).toFixed(2)}</p>
                </div>
                <div className="bg-neutral-250 dark:bg-neutral-900 p-4 rounded-none border border-neutral-300 dark:border-neutral-800">
                  <p className="text-[12px] font-bold text-black dark:text-white uppercase mb-1">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">€{invoices.filter(i => i.status !== 'paid').reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0).toFixed(2)}</p>
                </div>
                <div className="bg-neutral-250 dark:bg-neutral-900 p-4 rounded-none border border-neutral-300 dark:border-neutral-800">
                  <p className="text-[12px] font-bold text-black dark:text-white uppercase mb-1">Wallet Balance</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">€{(Number(customer.wallet_balance) || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-base font-bold text-black dark:text-white uppercase tracking-wider border-b border-neutral-300 dark:border-neutral-800 pb-2">Recent Invoices</h3>
                <div className="border border-neutral-300 dark:border-neutral-800 rounded-none overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-200 dark:bg-neutral-900">
                      <tr className="text-[12px] font-bold text-black dark:text-white uppercase tracking-wider border-b border-neutral-300 dark:border-neutral-800">
                        <th className="px-4 py-2">Invoice #</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-normal">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500 italic text-sm bg-white dark:bg-black">No invoices found.</td>
                        </tr>
                      ) : (
                        invoices.slice(0, 5).map(inv => (
                          <tr key={inv.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-sm bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-normal">
                            <td className="px-4 py-3 font-normal">
                              <button 
                                onClick={() => onSelectInvoice?.(inv.id)}
                                className="font-normal text-blue-600 hover:underline"
                              >
                                {inv.invoice_number}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 font-normal">{new Date(inv.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-normal">
                              <span className={`px-2 py-0.5 rounded-none text-[11px] font-bold uppercase ${
                                inv.status === 'paid' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700' : 
                                inv.status === 'void' ? 'bg-red-100 dark:bg-red-950/40 text-red-700' : 'bg-orange-100 dark:bg-orange-950/40 text-orange-750 dark:text-orange-400'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-normal text-neutral-900 dark:text-neutral-100">€{(Number(inv.grand_total) || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <h3 className="text-base font-bold text-black dark:text-white uppercase tracking-wider border-b border-neutral-300 dark:border-neutral-800 pb-2 mt-8">Recent Payments</h3>
                <div className="border border-neutral-300 dark:border-neutral-800 rounded-none overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-200 dark:bg-neutral-900">
                      <tr className="text-[12px] font-bold text-black dark:text-white uppercase tracking-wider border-b border-neutral-300 dark:border-neutral-800">
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Method</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-normal">
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500 italic text-sm bg-white dark:bg-black">No payments found.</td>
                        </tr>
                      ) : (
                        payments.slice(0, 5).map(p => (
                          <tr key={p.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-sm bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
                            <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 font-normal">{new Date(p.paid_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-normal">
                              <span className={`px-2 py-0.5 rounded-none text-[11px] font-bold uppercase ${
                                p.type === 'deposit' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                              }`}>
                                {p.type || 'payment'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-normal">
                              <span className="bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded-none text-[10px] font-normal text-neutral-750 dark:text-neutral-200">{p.method}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-normal text-emerald-600 dark:text-emerald-400">€{(Number(p.amount) || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'properties' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-black dark:text-white uppercase tracking-wider border-b border-neutral-300 dark:border-neutral-800 pb-2">Customer Properties</h3>
              <div className="grid grid-cols-2 gap-6 font-normal">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-bold text-neutral-400 uppercase mb-1">Tax ID / VAT Number</label>
                    <p className="text-base font-normal text-neutral-900 dark:text-neutral-100">{customer.fax || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-neutral-400 uppercase mb-1">Website</label>
                    <p className="text-base font-normal text-blue-500 hover:underline cursor-pointer">{customer.website || 'Not set'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-bold text-neutral-400 uppercase mb-1">Customer Group</label>
                    <p className="text-base font-normal text-neutral-900 dark:text-neutral-100">General Customers</p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-neutral-400 uppercase mb-1">Price Level</label>
                    <p className="text-base font-normal text-neutral-900 dark:text-neutral-100">Retail</p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <label className="block text-[12px] font-bold text-neutral-400 uppercase mb-1">Alert Message</label>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-none text-base text-amber-800 dark:text-amber-300 min-h-[60px] font-normal">
                  {customer.alert_message || 'No alert message set for this customer.'}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credits' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-black dark:text-white uppercase tracking-wider border-b border-neutral-300 dark:border-neutral-800 pb-2">Wallet & Ledger</h3>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/50 p-6 rounded-none flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Available Balance</p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">€{(Number(customer.wallet_balance) || 0).toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => onDeposit?.()}
                  className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-4 py-2 font-bold text-xs text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors rounded-none"
                >
                  Add Deposit
                </button>
              </div>
              
              <h4 className="text-sm font-bold text-black dark:text-white uppercase mt-8 mb-4">Payment Ledger</h4>
              <div className="border border-neutral-300 dark:border-neutral-800 rounded-none overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-neutral-200 dark:bg-neutral-900">
                    <tr className="text-[12px] font-bold text-black dark:text-white uppercase tracking-wider border-b border-neutral-300 dark:border-neutral-800">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Method</th>
                      <th className="px-4 py-2">Reference</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-normal">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500 italic text-sm bg-white dark:bg-black">No transactions found.</td>
                      </tr>
                    ) : (
                      payments.map(p => (
                        <tr key={p.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-sm bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-normal">
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 font-normal">{new Date(p.paid_at).toLocaleString()}</td>
                          <td className="px-4 py-3 font-normal">
                            <span className={`px-2 py-0.5 rounded-none text-[11px] font-bold uppercase ${
                              p.type === 'deposit' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700' : 
                              p.type === 'wallet_use' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                            }`}>
                              {p.type?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 font-normal">{p.method}</td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 font-normal">{p.invoice_number || '-'}</td>
                          <td className={`px-4 py-3 text-right font-normal ${p.type === 'wallet_use' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {p.type === 'wallet_use' ? '-' : '+'}€{(Number(p.amount) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-black dark:text-white uppercase tracking-wider border-b border-neutral-300 dark:border-neutral-800 pb-2">Payment Terms</h3>
              <div className="grid grid-cols-2 gap-6 font-normal">
                <div className="p-4 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none">
                  <label className="block text-[12px] font-bold text-neutral-400 uppercase mb-1">Default Terms</label>
                  <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">Due on Receipt</p>
                </div>
                <div className="p-4 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none">
                  <label className="block text-[12px] font-bold text-neutral-400 uppercase mb-1">Credit Limit</label>
                  <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">€0.00</p>
                </div>
              </div>
              <div className="p-4 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none">
                <label className="block text-[12px] font-bold text-neutral-400 uppercase mb-1">Internal Notes</label>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 italic">No internal notes for this customer.</p>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-2">
              <h3 className="text-base font-bold uppercase tracking-wider border-b border-neutral-300 dark:border-neutral-800 pb-1">Activity Log</h3>
              {activities.length === 0 ? (
                <p className="text-center text-neutral-400 dark:text-neutral-500 italic py-4 text-base font-normal">No activity recorded yet.</p>
              ) : (
                <div className="border border-neutral-300 dark:border-neutral-800 overflow-hidden">
                  <table className="w-full text-left text-base border-collapse">
                    <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
                        <th className="py-1.5 px-3 border-r border-neutral-300 dark:border-neutral-700 w-32 text-center">Date</th>
                        <th className="py-1.5 px-3 border-r border-neutral-300 dark:border-neutral-700 w-28 text-center">Time</th>
                        <th className="py-1.5 px-3 border-r border-neutral-300 dark:border-neutral-700 w-40 text-center">User</th>
                        <th className="py-1.5 px-3 border-r border-neutral-300 dark:border-neutral-700 w-48 text-center">Activity</th>
                        <th className="py-1.5 px-3 text-center">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-base">
                      {activities.map(act => (
                        <tr key={act.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
                          <td className="py-1.5 px-3 border-r border-neutral-200 dark:border-neutral-800">{new Date(act.created_at).toLocaleDateString('en-GB')}</td>
                          <td className="py-1.5 px-3 border-r border-neutral-200 dark:border-neutral-800">{new Date(act.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-1.5 px-3 border-r border-neutral-200 dark:border-neutral-800">{act.user_name || 'System'}</td>
                          <td className="py-1.5 px-3 border-r border-neutral-200 dark:border-neutral-800">{act.activity}</td>
                          <td className="py-1.5 px-3">{act.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
