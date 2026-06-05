import { useState, useEffect, useRef } from 'react';
import { List, Printer, ChevronDown, User, Info, Plus, ExternalLink, FileText, Mail } from 'lucide-react';
import { Invoice, InvoiceItem, Customer } from '../types';
import ThermalReceipt from './ThermalReceipt';
import { useThermalSettings } from '../hooks/useThermalSettings';

interface Props {
  invoiceId: number;
  onBack: () => void;
  onSelectCustomer?: (id: number) => void;
}

export default function InvoiceDetails({ invoiceId, onBack, onSelectCustomer }: Props) {
  const [invoice, setInvoice] = useState<(Invoice & { items: InvoiceItem[], customer?: Customer }) | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Debit Card'>('Cash');
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [printMode, setPrintMode] = useState<'thermal' | 'a4' | null>(null);
  const printMenuRef = useRef<HTMLDivElement>(null);
  const { settings, company, loading: settingsLoading } = useThermalSettings();

  useEffect(() => {
    fetch(`/api/invoices/${invoiceId}`)
      .then(res => res.json())
      .then(setInvoice);
  }, [invoiceId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (printMenuRef.current && !printMenuRef.current.contains(e.target as Node)) {
        setShowPrintMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!invoice) return (
    <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono p-8 text-lg">
      *** LOADING SYSTEM DATA ***
    </div>
  );

  const handleThermalPrint = () => {
    setShowPrintMenu(false);
    if (settingsLoading) {
      alert('Loading printer settings, please wait a moment...');
      return;
    }
    setPrintMode('thermal');
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode(null), 500);
    }, 100);
  };

  const handleA4Print = () => {
    setShowPrintMenu(false);
    setPrintMode('a4');
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode(null), 500);
    }, 100);
  };

  const handleEmailInvoice = () => {
    setShowPrintMenu(false);
    const email = invoice.customer?.email;
    if (!email) {
      alert('No email address found for this customer.');
      return;
    }
    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number}`);
    const body = encodeURIComponent(`Dear ${invoice.customer?.name || 'Customer'},\n\nPlease find your invoice ${invoice.invoice_number} attached.\n\nTotal: €${invoice.grand_total.toFixed(2)}\n\nThank you for your business!`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleRefund = async () => {
    const res = await fetch(`/api/invoices/${invoiceId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: refundMethod })
    });
    if (res.ok) {
      alert('Refund created successfully');
      setShowRefundModal(false);
      fetch(`/api/invoices/${invoiceId}`)
        .then(res => res.json())
        .then(setInvoice);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-base px-2 py-2 select-none w-full overflow-auto" style={{ fontSize: '17px' }}>
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 sticky top-0 z-10 rounded-none shadow-none mb-2">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-black dark:text-white uppercase">View Invoice - {invoice.invoice_number}</h2>
          {invoice.status === 'void' && (
            <span className="bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-3 py-0.5 rounded-none text-sm font-bold uppercase tracking-wider border border-red-200 dark:border-red-900/50">
              Void / Refunded
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onBack}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-base flex items-center gap-2 transition-all shadow-none"
          >
            <List size={16} />
            Sales Invoices
          </button>
          
          {/* Print Dropdown */}
          <div className="relative" ref={printMenuRef}>
            <button 
              onClick={() => setShowPrintMenu(!showPrintMenu)}
              className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-base flex items-center gap-2 transition-all shadow-none"
            >
              <Printer size={16} />
              Print
              <ChevronDown size={14} className={`transition-transform ${showPrintMenu ? 'rotate-180' : ''}`} />
            </button>

            {showPrintMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-black rounded-none shadow-none border border-neutral-300 dark:border-neutral-800 z-50 overflow-hidden">
                <button
                  onClick={handleThermalPrint}
                  className="w-full flex items-center gap-3 px-4 py-2 text-base text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors rounded-none"
                >
                  <Printer size={15} className="text-neutral-500" />
                  <span className="font-normal">Thermal Print</span>
                </button>
                <div className="border-t border-neutral-300 dark:border-neutral-800" />
                <button
                  onClick={handleA4Print}
                  className="w-full flex items-center gap-3 px-4 py-2 text-base text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors rounded-none"
                >
                  <FileText size={15} className="text-neutral-500" />
                  <span className="font-normal">A4 Print</span>
                </button>
                <div className="border-t border-neutral-300 dark:border-neutral-800" />
                <button
                  onClick={handleEmailInvoice}
                  className="w-full flex items-center gap-3 px-4 py-2 text-base text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors rounded-none"
                >
                  <Mail size={15} className="text-neutral-500" />
                  <span className="font-normal">Email Invoice</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Info */}
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
            <div className="bg-neutral-200 dark:bg-neutral-900 px-4 py-2 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-2">
              <User size={16} className="text-neutral-900 dark:text-neutral-100" />
              <h3 className="text-base font-bold text-black dark:text-white uppercase">Customer info</h3>
            </div>
            <div className="p-4 space-y-3 text-base font-normal text-neutral-900 dark:text-neutral-100">
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <span className="w-24 font-normal text-neutral-900 dark:text-neutral-100">Customer:</span>
                {invoice.customer_id ? (
                  <button 
                    onClick={() => onSelectCustomer?.(invoice.customer_id!)}
                    className="text-blue-500 flex items-center gap-1 hover:underline font-normal text-base"
                  >
                    {invoice.customer?.name}
                    <ExternalLink size={12} />
                  </button>
                ) : (
                  <span className="text-neutral-500">Unassigned</span>
                )}
              </div>
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <span className="w-24 font-normal text-neutral-900 dark:text-neutral-100">Email:</span>
                <span className="text-neutral-600 dark:text-neutral-400">{invoice.customer?.email || ''}</span>
              </div>
              <div className="flex">
                <span className="w-24 font-normal text-neutral-900 dark:text-neutral-100">Phone No.:</span>
                <span className="text-neutral-600 dark:text-neutral-400">{invoice.customer?.phone || ''}</span>
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
            <div className="bg-neutral-200 dark:bg-neutral-900 px-4 py-2 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-2">
              <Info size={16} className="text-neutral-900 dark:text-neutral-100" />
              <h3 className="text-base font-bold text-black dark:text-white uppercase">Order Info</h3>
            </div>
            <div className="p-4 space-y-3 text-base font-normal text-neutral-900 dark:text-neutral-100">
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <span className="w-32 font-normal text-neutral-900 dark:text-neutral-100">Invoice No.</span>
                <span className="text-neutral-600 dark:text-neutral-400">{invoice.invoice_number}</span>
              </div>
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <span className="w-32 font-normal text-neutral-900 dark:text-neutral-100">Sales Person:</span>
                <span className="text-neutral-600 dark:text-neutral-400">Phone Lab</span>
              </div>
              <div className="flex">
                <span className="w-32 font-normal text-neutral-900 dark:text-neutral-100">Date:</span>
                <span className="text-neutral-600 dark:text-neutral-400">{formatDate(invoice.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-[13px] font-bold text-black dark:text-white uppercase tracking-wider">
                <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 w-12 text-center">#</th>
                <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800">Description</th>
                <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 text-center w-32">Time/Qty</th>
                <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 text-right w-32">Unit Price</th>
                <th className="px-4 py-2 text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="border-b border-neutral-200 dark:border-neutral-800 text-base font-normal">
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-500">{idx + 1}</td>
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-neutral-900 dark:text-neutral-100 font-normal">{item.product_name}</span>
                      {item.notes && (
                        <span className="text-neutral-500 italic text-sm">
                          ({item.notes})
                        </span>
                      )}
                      {item.imei && (
                        <span className="text-blue-500 flex items-center gap-1 font-normal">
                          ({item.imei})
                          <ExternalLink size={12} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-600 dark:text-neutral-400">{item.quantity}</td>
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-right text-neutral-600 dark:text-neutral-400">€{item.price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-neutral-900 dark:text-neutral-100 font-normal">€{item.total.toFixed(2)}</td>
                </tr>
              ))}
              
              {/* Totals */}
              <tr className="bg-white dark:bg-black text-base">
                <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-black dark:text-white">Taxable Total :</td>
                <td className="px-4 py-2 text-right font-bold text-black dark:text-white">€{invoice.subtotal.toFixed(2)}</td>
              </tr>
              <tr className="bg-white dark:bg-black text-base">
                <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-black dark:text-white">Vat0 (0%) :</td>
                <td className="px-4 py-2 text-right font-bold text-black dark:text-white">€{invoice.tax_total.toFixed(2)}</td>
              </tr>
              <tr className="bg-white dark:bg-black text-base">
                <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-black dark:text-white">Grand Total :</td>
                <td className="px-4 py-2 text-right font-bold text-black dark:text-white">€{invoice.grand_total.toFixed(2)}</td>
              </tr>
              
              {/* Payment Info */}
              {invoice.payments && invoice.payments.length > 0 ? (
                invoice.payments.map((payment, idx) => (
                  <tr key={idx} className="bg-white dark:bg-black text-sm text-neutral-500 italic">
                    <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                    <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-right font-normal">
                      {formatDate(payment.paid_at)} {formatTime(payment.paid_at)} {payment.method} Payment
                    </td>
                    <td className="px-4 py-2 text-right font-normal">€{payment.amount.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr className="bg-white dark:bg-black text-sm text-neutral-500 italic">
                  <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-right font-normal">
                    {formatDate(invoice.created_at)} {formatTime(invoice.created_at)} {invoice.payment_method} Payment
                  </td>
                  <td className="px-4 py-2 text-right font-normal">€{invoice.grand_total.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          {invoice.status !== 'void' ? (
            <button 
              onClick={() => setShowRefundModal(true)}
              className="bg-amber-400 hover:bg-amber-500 text-neutral-900 font-bold py-1.5 px-6 rounded-none text-base shadow-none transition-all"
            >
              Create Refund
            </button>
          ) : (
            <div className="text-base font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 px-4 py-2 rounded-none border border-red-200 dark:border-red-900/50">
              This invoice has been refunded.
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
          <div className="bg-neutral-200 dark:bg-neutral-900 px-4 py-2 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center">
            <h3 className="text-base font-bold text-black dark:text-white uppercase tracking-wider">Activity Log</h3>
            <div className="flex gap-2">
              <select className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none rounded-none">
                <option>All Activities</option>
              </select>
              <button className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-3 py-1 text-sm font-bold text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900 rounded-none">
                Add New Note
              </button>
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-950 border-b border-neutral-300 dark:border-neutral-800 text-[12px] font-bold text-black dark:text-white uppercase tracking-wider">
                <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 w-24">Date</th>
                <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 w-24">Time</th>
                <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 w-40">User</th>
                <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 w-48">Activity</th>
                <th className="px-4 py-2">Details</th>
              </tr>
            </thead>
            <tbody className="text-sm font-normal">
              {invoice.activities && invoice.activities.length > 0 ? (
                invoice.activities.map((activity) => (
                  <tr key={activity.id} className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900">
                    <td className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800">{formatDate(activity.created_at)}</td>
                    <td className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800">{formatTime(activity.created_at)}</td>
                    <td className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800">{activity.user_name || 'System'}</td>
                    <td className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 font-normal">{activity.activity}</td>
                    <td className="px-4 py-2">{activity.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500 italic">
                    No activities recorded for this invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="p-2 bg-white dark:bg-black border-t border-neutral-300 dark:border-neutral-800 flex justify-between items-center text-[12px] text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <select className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-1 py-0.5 focus:outline-none rounded-none">
                <option>auto</option>
              </select>
              <span className="font-bold">1-1/1</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="px-1.5 py-0.5 border border-neutral-300 dark:border-neutral-800 rounded-none hover:bg-neutral-200 dark:hover:bg-neutral-900">«</button>
              <button className="px-2 py-0.5 bg-neutral-300 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none font-bold">1</button>
              <button className="px-1.5 py-0.5 border border-neutral-300 dark:border-neutral-800 rounded-none hover:bg-neutral-200 dark:hover:bg-neutral-900">»</button>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-md overflow-hidden shadow-none rounded-none">
            <div className="p-4 bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-black dark:text-white uppercase">Create Refund</h3>
              <button onClick={() => setShowRefundModal(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 bg-white dark:bg-black">
              <p className="text-base text-neutral-900 dark:text-neutral-100 font-normal">Are you sure you want to create a refund for invoice <span className="font-bold text-black dark:text-white">{invoice.invoice_number}</span>?</p>
              <div className="text-3xl font-bold text-center text-red-600 dark:text-red-400">
                €{invoice.grand_total.toFixed(2)}
              </div>
              <div className="space-y-2">
                <label className="text-base font-bold text-black dark:text-white uppercase">Refund Method</label>
                <select 
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as any)}
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none py-2 px-3 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-0"
                >
                  <option value="Cash">Cash</option>
                  <option value="Debit Card">Debit Card</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800 flex justify-end gap-3">
              <button 
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 font-bold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 rounded-none text-base"
              >
                Cancel
              </button>
              <button 
                onClick={handleRefund}
                className="px-6 py-2 bg-red-600 text-white rounded-none font-bold hover:bg-red-700 text-base"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Print Container - only visible when printing in thermal mode */}
      {printMode === 'thermal' && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
          <ThermalReceipt invoice={invoice} settings={settings} company={company} />
        </div>
      )}

      {/* A4 Print Container - only visible when printing in A4 mode */}
      {printMode === 'a4' && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: A4; margin: 15mm; }
              body * { visibility: hidden; }
              .a4-print-container, .a4-print-container * { visibility: visible; }
              .a4-print-container { position: fixed; inset: 0; padding: 0; }
            }
          `}} />
          <div className="a4-print-container max-w-2xl mx-auto font-sans">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">{company?.name}</h1>
                <p className="text-slate-500">{company?.address}</p>
                <p className="text-slate-500">{company?.phone}</p>
                <p className="text-slate-500">{company?.email}</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-indigo-600">INVOICE</h2>
                <p className="text-slate-600 font-medium">{invoice.invoice_number}</p>
                <p className="text-slate-500 text-sm">{formatDate(invoice.created_at)}</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Bill To</p>
              <p className="font-bold text-slate-800">{invoice.customer?.name || 'Walk-in Customer'}</p>
              {invoice.customer?.email && <p className="text-slate-600 text-sm">{invoice.customer.email}</p>}
              {invoice.customer?.phone && <p className="text-slate-600 text-sm">{invoice.customer.phone}</p>}
            </div>

            <table className="w-full mb-6 text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-2 font-bold text-slate-700">Description</th>
                  <th className="text-center py-2 font-bold text-slate-700 w-16">Qty</th>
                  <th className="text-right py-2 font-bold text-slate-700 w-24">Unit Price</th>
                  <th className="text-right py-2 font-bold text-slate-700 w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2 text-slate-800">
                      <div>
                        {item.product_name}
                        {item.notes && <span className="text-slate-500 text-xs italic ml-2">({item.notes})</span>}
                      </div>
                      {item.imei && <div className="text-xs text-slate-500">IMEI: {item.imei}</div>}
                    </td>
                    <td className="py-2 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-600">€{item.price.toFixed(2)}</td>
                    <td className="py-2 text-right font-medium text-slate-800">€{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Subtotal:</span><span>€{invoice.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Tax (0%):</span><span>€{invoice.tax_total.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base border-t border-slate-300 pt-2 mt-2">
                  <span>Grand Total:</span><span>€{invoice.grand_total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
              Thank you for your business!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
