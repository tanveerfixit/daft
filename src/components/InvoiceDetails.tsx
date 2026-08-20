import { useState, useEffect, useRef } from 'react';
import { List, Printer, ChevronDown, User, Info, Plus, ExternalLink, FileText, Mail, Send, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
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

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailCustomMessage, setEmailCustomMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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
      Loading Invoice Details...
    </div>
  );

  const handleThermalPrint = () => {
    setShowPrintMenu(false);
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

  const handleOpenEmailModal = () => {
    setShowPrintMenu(false);
    setRecipientEmail(invoice.customer?.email || '');
    setEmailSubject(`Invoice ${invoice.invoice_number} from ${company?.name || 'PhoneLab'}`);
    setEmailCustomMessage(`Dear ${invoice.customer?.name || 'Customer'},\n\nPlease find your invoice ${invoice.invoice_number} attached.\n\nTotal: €${(Number(invoice.grand_total) || 0).toFixed(2)}\n\nThank you for your business!`);
    setEmailStatus(null);
    setShowEmailModal(true);
  };

  const handleSendEmailSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setEmailStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recipientEmail.trim(),
          subject: emailSubject.trim(),
          message: emailCustomMessage.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invoice email');
      }

      setEmailStatus({ type: 'success', message: data.message || `Invoice sent to ${recipientEmail.trim()} successfully!` });
      // Refresh activities
      fetch(`/api/invoices/${invoiceId}`)
        .then(r => r.json())
        .then(setInvoice);

      setTimeout(() => {
        setShowEmailModal(false);
      }, 1800);
    } catch (err: any) {
      setEmailStatus({ type: 'error', message: err.message || 'Error sending email. You can also use Email Client.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleOpenMailClient = () => {
    const email = recipientEmail.trim() || invoice.customer?.email || '';
    const subject = encodeURIComponent(emailSubject || `Invoice ${invoice.invoice_number}`);
    const body = encodeURIComponent(emailCustomMessage || `Dear Customer,\n\nPlease find your invoice ${invoice.invoice_number} attached.\n\nTotal: €${(Number(invoice.grand_total) || 0).toFixed(2)}`);
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
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-sm px-3 py-2 select-none w-full overflow-auto">
      {/* Header */}
      <div className="p-3 flex justify-between items-center bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 sticky top-0 z-10 rounded-none shadow-none mb-2.5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-black dark:text-white uppercase">View Invoice - {invoice.invoice_number}</h2>
          {invoice.status === 'void' && (
            <span className="bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2.5 py-0.5 rounded-none text-xs font-bold uppercase tracking-wider border border-red-200 dark:border-red-900/50">
              Void / Refunded
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onBack}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-sm flex items-center gap-1.5 transition-all shadow-none"
          >
            <List size={15} />
            Sales Invoices
          </button>

          {/* Email Button */}
          <button 
            onClick={handleOpenEmailModal}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-sm flex items-center gap-1.5 transition-all shadow-none"
            title="Send Invoice to Any Email Address"
          >
            <Mail size={15} />
            Email
          </button>
          
          {/* Print Dropdown */}
          <div className="relative" ref={printMenuRef}>
            <button 
              onClick={() => setShowPrintMenu(!showPrintMenu)}
              className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-sm flex items-center gap-1.5 transition-all shadow-none"
            >
              <Printer size={15} />
              Print
              <ChevronDown size={13} className={`transition-transform ${showPrintMenu ? 'rotate-180' : ''}`} />
            </button>

            {showPrintMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-black rounded-none shadow-none border border-neutral-300 dark:border-neutral-800 z-50 overflow-hidden text-sm">
                <button
                  onClick={handleThermalPrint}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors rounded-none"
                >
                  <Printer size={14} className="text-neutral-500" />
                  <span className="font-normal">Thermal Print</span>
                </button>
                <div className="border-t border-neutral-300 dark:border-neutral-800" />
                <button
                  onClick={handleA4Print}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors rounded-none"
                >
                  <FileText size={14} className="text-neutral-500" />
                  <span className="font-normal">A4 Print</span>
                </button>
                <div className="border-t border-neutral-300 dark:border-neutral-800" />
                <button
                  onClick={handleOpenEmailModal}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors rounded-none"
                >
                  <Mail size={14} className="text-neutral-500" />
                  <span className="font-normal">Email Invoice</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Customer Info */}
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
            <div className="bg-neutral-200 dark:bg-neutral-900 px-3 py-1.5 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-2">
              <User size={15} className="text-neutral-900 dark:text-neutral-100" />
              <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">Customer info</h3>
            </div>
            <div className="p-3 space-y-2 text-sm font-normal text-neutral-900 dark:text-neutral-100">
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
                <span className="w-28 font-semibold text-neutral-700 dark:text-neutral-300">Customer:</span>
                {invoice.customer_id ? (
                  <button 
                    onClick={() => onSelectCustomer?.(invoice.customer_id!)}
                    className="text-blue-500 flex items-center gap-1 hover:underline font-normal"
                  >
                    {invoice.customer?.name}
                    <ExternalLink size={12} />
                  </button>
                ) : (
                  <span className="text-neutral-500">Unassigned</span>
                )}
              </div>
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
                <span className="w-28 font-semibold text-neutral-700 dark:text-neutral-300">Email:</span>
                <span className="text-neutral-600 dark:text-neutral-400">{invoice.customer?.email || '—'}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold text-neutral-700 dark:text-neutral-300">Phone No.:</span>
                <span className="text-neutral-600 dark:text-neutral-400">{invoice.customer?.phone || '—'}</span>
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
            <div className="bg-neutral-200 dark:bg-neutral-900 px-3 py-1.5 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-2">
              <Info size={15} className="text-neutral-900 dark:text-neutral-100" />
              <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">Order Info</h3>
            </div>
            <div className="p-3 space-y-2 text-sm font-normal text-neutral-900 dark:text-neutral-100">
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
                <span className="w-32 font-semibold text-neutral-700 dark:text-neutral-300">Invoice No.</span>
                <span className="text-neutral-900 dark:text-neutral-100 font-bold">{invoice.invoice_number}</span>
              </div>
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
                <span className="w-32 font-semibold text-neutral-700 dark:text-neutral-300">Sales Person:</span>
                <span className="text-neutral-600 dark:text-neutral-400">Phone Lab</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold text-neutral-700 dark:text-neutral-300">Date:</span>
                <span className="text-neutral-600 dark:text-neutral-400">{formatDate(invoice.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                <th className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800 w-10 text-center">#</th>
                <th className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800">Description</th>
                <th className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800 text-center w-24">Time/Qty</th>
                <th className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800 text-right w-48 min-w-[170px]">Unit Price</th>
                <th className="px-3 py-1.5 text-right w-36 min-w-[120px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="border-b border-neutral-200 dark:border-neutral-800 text-sm font-normal">
                  <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-500">{idx + 1}</td>
                  <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-900 dark:text-neutral-100 font-medium">{item.product_name}</span>
                        {item.imei && (
                          <span className="text-blue-500 flex items-center gap-1 font-normal text-xs">
                            ({item.imei})
                            <ExternalLink size={11} />
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <span className="text-xs text-neutral-500 italic mt-0.5 font-normal">
                          Note: {item.notes}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-700 dark:text-neutral-300">{item.quantity}</td>
                  <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right text-neutral-700 dark:text-neutral-300 font-mono">€{(Number(item.price) || 0).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right text-neutral-900 dark:text-neutral-100 font-mono font-semibold">€{(Number(item.total) || 0).toFixed(2)}</td>
                </tr>
              ))}
              
              {/* Totals */}
              <tr className="bg-white dark:bg-black text-sm">
                <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-black dark:text-white">Taxable Total :</td>
                <td className="px-3 py-1.5 text-right font-mono font-bold text-black dark:text-white">€{(Number(invoice.subtotal) || 0).toFixed(2)}</td>
              </tr>
              <tr className="bg-white dark:bg-black text-sm">
                <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-black dark:text-white">Vat0 (0%) :</td>
                <td className="px-3 py-1.5 text-right font-mono font-bold text-black dark:text-white">€{(Number(invoice.tax_total) || 0).toFixed(2)}</td>
              </tr>
              <tr className="bg-white dark:bg-black text-sm">
                <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-black dark:text-white">Grand Total :</td>
                <td className="px-3 py-1.5 text-right font-mono font-bold text-black dark:text-white">€{(Number(invoice.grand_total) || 0).toFixed(2)}</td>
              </tr>
              
              {/* Payment Info */}
              {invoice.payments && invoice.payments.length > 0 ? (
                invoice.payments.map((payment, idx) => (
                  <tr key={idx} className="bg-white dark:bg-black text-xs text-neutral-500 italic">
                    <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                    <td className="px-3 py-1 border-r border-neutral-200 dark:border-neutral-800 text-right font-normal">
                      {formatDate(payment.paid_at)} {formatTime(payment.paid_at)} {payment.method} Payment
                    </td>
                    <td className="px-3 py-1 text-right font-mono font-normal">€{(Number(payment.amount) || 0).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr className="bg-white dark:bg-black text-xs text-neutral-500 italic">
                  <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                  <td className="px-3 py-1 border-r border-neutral-200 dark:border-neutral-800 text-right font-normal">
                    {formatDate(invoice.created_at)} {formatTime(invoice.created_at)} {invoice.payment_method} Payment
                  </td>
                  <td className="px-3 py-1 text-right font-mono font-normal">€{(Number(invoice.grand_total) || 0).toFixed(2)}</td>
                </tr>
              )}

              {(() => {
                const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const changeDue = Math.max(0, totalPaid - (Number(invoice.grand_total) || 0));
                if (changeDue > 0.005) {
                  return (
                    <tr className="bg-white dark:bg-black text-sm font-bold text-red-600 dark:text-red-400">
                      <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                      <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right">Change Due :</td>
                      <td className="px-3 py-1.5 text-right font-mono font-black text-base">€{changeDue.toFixed(2)}</td>
                    </tr>
                  );
                }
                return null;
              })()}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          {invoice.status !== 'void' ? (
            <button 
              onClick={() => setShowRefundModal(true)}
              className="bg-amber-400 hover:bg-amber-500 text-neutral-900 font-bold py-1 px-5 rounded-none text-sm shadow-none transition-all"
            >
              Create Refund
            </button>
          ) : (
            <div className="text-sm font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 px-3 py-1.5 rounded-none border border-red-200 dark:border-red-900/50">
              This invoice has been refunded.
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
          <div className="bg-neutral-200 dark:bg-neutral-900 px-3 py-1.5 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center">
            <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">Activity Log</h3>
            <div className="flex gap-2">
              <select className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-2 py-0.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none rounded-none">
                <option>All Activities</option>
              </select>
              <button className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-2.5 py-0.5 text-xs font-bold text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900 rounded-none">
                Add New Note
              </button>
            </div>
          </div>
          <table className="w-full text-left border-collapse text-base">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-950 border-b border-neutral-300 dark:border-neutral-800 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                <th className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800 w-32">Date</th>
                <th className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800 w-28">Time</th>
                <th className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800 w-40">User</th>
                <th className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800 w-48">Activity</th>
                <th className="px-3 py-1.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-base">
              {invoice.activities && invoice.activities.length > 0 ? (
                invoice.activities.map((activity) => (
                  <tr key={activity.id} className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
                    <td className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800">{formatDate(activity.created_at)}</td>
                    <td className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800">{formatTime(activity.created_at)}</td>
                    <td className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800">{activity.user_name || 'System'}</td>
                    <td className="px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-800">{activity.activity}</td>
                    <td className="px-3 py-1.5">{activity.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-neutral-400 dark:text-neutral-500 italic text-base">
                    No activities recorded for this invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="p-1.5 bg-white dark:bg-black border-t border-neutral-300 dark:border-neutral-800 flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400">
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
                €{(Number(invoice.grand_total) || 0).toFixed(2)}
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

      {/* Email Invoice Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-lg overflow-hidden shadow-2xl rounded-none">
            <div className="p-4 bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Mail size={20} className="text-neutral-700 dark:text-neutral-300" />
                <h3 className="text-xl font-bold text-black dark:text-white uppercase">Email Invoice</h3>
              </div>
              <button 
                onClick={() => setShowEmailModal(false)} 
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="p-6 space-y-4 bg-white dark:bg-black">
              {/* Invoice Summary Pill */}
              <div className="flex items-center justify-between p-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-sm">
                <div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block uppercase font-bold">Invoice</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{invoice.invoice_number}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block uppercase font-bold">Total Amount</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">€{(Number(invoice.grand_total) || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Recipient Email Input */}
              <div className="space-y-1">
                <label className="text-sm font-bold text-black dark:text-white uppercase flex items-center justify-between">
                  <span>Send To Email Address <span className="text-red-500">*</span></span>
                  {invoice.customer?.email && recipientEmail !== invoice.customer.email && (
                    <button
                      type="button"
                      onClick={() => setRecipientEmail(invoice.customer?.email || '')}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline lowercase font-normal"
                    >
                      Use customer email ({invoice.customer.email})
                    </button>
                  )}
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter any email address (e.g. client@gmail.com)"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none py-2 px-3 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 font-mono"
                  autoFocus
                />
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-sm font-bold text-black dark:text-white uppercase">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Invoice Subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none py-2 px-3 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Message Note */}
              <div className="space-y-1">
                <label className="text-sm font-bold text-black dark:text-white uppercase">
                  Note / Message
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional message to include with the invoice..."
                  value={emailCustomMessage}
                  onChange={(e) => setEmailCustomMessage(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none py-2 px-3 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 font-mono resize-none"
                />
              </div>

              {/* Status Banner */}
              {emailStatus && (
                <div className={`p-3 text-xs flex items-center gap-2 border ${
                  emailStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                }`}>
                  {emailStatus.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                  )}
                  <span>{emailStatus.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleOpenMailClient}
                  className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline flex items-center gap-1"
                >
                  <ExternalLink size={13} />
                  Open in Mail App
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <button 
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 font-bold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 rounded-none text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSendingEmail || !recipientEmail.trim()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-none font-bold text-sm flex items-center gap-2"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
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
                      <div>{item.product_name}{item.imei ? ` (${item.imei})` : ''}</div>
                      {item.notes && (
                        <div className="text-xs text-slate-500 italic mt-0.5">
                          Note: {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-600">€{(Number(item.price) || 0).toFixed(2)}</td>
                    <td className="py-2 text-right font-medium text-slate-800">€{(Number(item.total) || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Subtotal:</span><span>€{(Number(invoice.subtotal) || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Tax (0%):</span><span>€{(Number(invoice.tax_total) || 0).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base border-t border-slate-300 pt-2 mt-2">
                  <span>Grand Total:</span><span>€{(Number(invoice.grand_total) || 0).toFixed(2)}</span>
                </div>
                {(() => {
                  const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                  const changeDue = Math.max(0, totalPaid - (Number(invoice.grand_total) || 0));
                  if (changeDue > 0.005) {
                    return (
                      <div className="flex justify-between font-bold text-sm text-red-600 pt-1">
                        <span>Change Due:</span>
                        <span>€{changeDue.toFixed(2)}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
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
