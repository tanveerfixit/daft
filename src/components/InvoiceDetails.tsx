import React, { useState, useEffect, useRef } from 'react';
import { 
  List, Printer, ChevronDown, User, Info, Plus, ExternalLink, 
  FileText, Mail, Send, Loader2, CheckCircle2, AlertCircle, X, 
  Trash2, Banknote, RotateCcw, CheckSquare, Square
} from 'lucide-react';
import { Invoice, InvoiceItem, Customer } from '../types';
import ThermalReceipt from './ThermalReceipt';
import { useThermalSettings } from '../hooks/useThermalSettings';
import { getInvoiceTaxDetails } from '../utils/tax';

interface Props {
  invoiceId: number;
  onBack: () => void;
  onSelectCustomer?: (id: number) => void;
}

export default function InvoiceDetails({ invoiceId, onBack, onSelectCustomer }: Props) {
  const [invoice, setInvoice] = useState<(Invoice & { items: InvoiceItem[], customer?: Customer }) | null>(null);
  
  // Refund 2-Step Flow States
  const [isRefundView, setIsRefundView] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [refundMethod, setRefundMethod] = useState<'Debit Card' | 'Cash' | 'Customer Wallet' | 'Other'>('Debit Card');
  const [printType, setPrintType] = useState<'thermal' | 'a4' | 'email' | 'none'>('thermal');
  const [selectedRefundItems, setSelectedRefundItems] = useState<Record<number, number>>({});
  const [selectedImeis, setSelectedImeis] = useState<Record<number, boolean>>({});
  const [restockReturned, setRestockReturned] = useState(true);
  const [refundNotes, setRefundNotes] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Printing & Email States
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [printMode, setPrintMode] = useState<'thermal' | 'a4' | null>(null);
  const printMenuRef = useRef<HTMLDivElement>(null);
  const { settings, company } = useThermalSettings();

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailCustomMessage, setEmailCustomMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Note Modal & Activity Filter States
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [activityFilter, setActivityFilter] = useState('All Activities');

  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNote.trim()) return;
    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: 'Note Added', details: newNote.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.activities) {
          setInvoice(prev => prev ? ({ ...prev, activities: data.activities }) : null);
        } else {
          fetchInvoice();
        }
        setNewNote('');
        setShowNoteModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Failed to save note: ' + (err.error || 'Server error'));
      }
    } catch (err: any) {
      console.error('Error saving note:', err);
      alert('Error saving note: ' + (err.message || err));
    } finally {
      setIsSavingNote(false);
    }
  };

  const fetchInvoice = () => {
    fetch(`/api/invoices/${invoiceId}`)
      .then(res => res.json())
      .then(data => {
        setInvoice(data);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  // Close print menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (printMenuRef.current && !printMenuRef.current.contains(e.target as Node)) {
        setShowPrintMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (!invoice) return;
    setRecipientEmail(invoice.customer?.email || '');
    setEmailSubject(`Invoice ${invoice.invoice_number} from ${company?.name || 'Phone Lab'}`);
    setEmailCustomMessage('');
    setEmailStatus(null);
    setShowEmailModal(true);
    setShowPrintMenu(false);
  };

  const handleSendEmailSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setEmailStatus({ type: 'error', message: 'Please provide a valid email address.' });
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

      setEmailStatus({ type: 'success', message: 'Invoice email sent successfully!' });
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
    if (!invoice) return;
    const email = recipientEmail.trim() || invoice.customer?.email || '';
    const subject = encodeURIComponent(emailSubject || `Invoice ${invoice.invoice_number}`);
    const body = encodeURIComponent(emailCustomMessage || `Dear Customer,\n\nPlease find your invoice ${invoice.invoice_number} attached.\n\nTotal: €${(Number(invoice.grand_total) || 0).toFixed(2)}`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  // Open Step 1: Refund Items View
  const handleStartRefund = () => {
    if (!invoice) return;
    const initialSelection: Record<number, number> = {};
    const initialImeis: Record<number, boolean> = {};

    (invoice.items || []).forEach(item => {
      if (item.id) {
        const returnable = Math.max(0, item.quantity - (Number(item.refunded_quantity) || 0));
        if (returnable > 0) {
          initialSelection[item.id] = returnable;
          if (item.imei) {
            initialImeis[item.id] = true;
          }
        }
      }
    });

    setSelectedRefundItems(initialSelection);
    setSelectedImeis(initialImeis);
    setRestockReturned(true);
    setRefundNotes('');
    setRefundMethod('Debit Card');
    setPrintType('thermal');
    setIsRefundView(true);
  };

  // Open Step 2: Settlement Modal
  const handleOpenSettlementModal = () => {
    const refundTotal = getCalculatedRefundTotal();
    if (refundTotal <= 0) {
      alert('Please select at least one item to refund.');
      return;
    }
    setShowSettlementModal(true);
  };

  // Final Step 2 Submission
  const handleCompleteRefund = async () => {
    if (!invoice) return;

    const itemsPayload = Object.entries(selectedRefundItems)
      .map(([id, qty]) => ({ item_id: Number(id), quantity: Number(qty) }))
      .filter(item => item.quantity > 0);

    if (itemsPayload.length === 0) {
      alert('Please select at least one item and quantity to refund.');
      return;
    }

    setIsSubmittingRefund(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: refundMethod,
          restock: restockReturned,
          items: itemsPayload,
          notes: refundNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowSettlementModal(false);
        setIsRefundView(false);
        fetchInvoice();

        // Handle auto print / email according to cashier selection
        if (printType === 'thermal') {
          handleThermalPrint();
        } else if (printType === 'a4') {
          handleA4Print();
        } else if (printType === 'email') {
          handleOpenEmailModal();
        }
      } else {
        alert(data.error || 'Failed to process refund');
      }
    } catch (err: any) {
      alert('Error processing refund: ' + err.message);
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const getCalculatedRefundTotal = () => {
    if (!invoice || !invoice.items) return 0;
    return invoice.items.reduce((sum, item) => {
      if (!item.id) return sum;
      const qty = selectedRefundItems[item.id] || 0;
      if (qty <= 0) return sum;
      const unitPrice = Number(item.total) / Number(item.quantity);
      return sum + (unitPrice * qty);
    }, 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  };

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono p-8 text-sm">
        Loading invoice details...
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: STEP 1 - REFUND ITEMS VIEW (Matching Image 1)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isRefundView) {
    const refundTotal = getCalculatedRefundTotal();
    const totalPaymentsReceived = (invoice.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return (
      <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-sans text-sm px-3 py-2 select-none w-full overflow-auto">
        {/* Header */}
        <div className="py-2 flex justify-between items-center sticky top-0 z-10 mb-2 bg-neutral-100 dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Refund Items</h2>
          </div>
          <button 
            onClick={() => setIsRefundView(false)}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-sm flex items-center gap-1.5 transition-all shadow-none cursor-pointer"
          >
            <List size={15} />
            Sales Invoices
          </button>
        </div>

        {/* Card: Invoice Entries */}
        <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
          {/* Card Header Bar */}
          <div className="bg-neutral-100 dark:bg-neutral-900 px-4 py-2.5 border-b border-neutral-300 dark:border-neutral-800 flex flex-wrap justify-between items-center gap-3">
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Invoice Entries</span>
            
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-800 dark:text-neutral-200 font-bold">Sales Person<span className="text-red-500">*</span></span>
                <select className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-2 py-1 rounded-none text-neutral-800 dark:text-neutral-200 text-xs outline-none cursor-pointer">
                  <option>Phone Lab</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-800 dark:text-neutral-200 font-bold">Customer<span className="text-red-500">*</span></span>
                <input 
                  type="text" 
                  readOnly 
                  value={invoice.customer?.name || 'Walk-in Customer'} 
                  className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-2 py-1 rounded-none text-neutral-800 dark:text-neutral-200 text-xs w-44 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Refund Items Table */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800 w-10 text-center">#</th>
                <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800">Description</th>
                <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800 text-center w-36">Purchased Time/Qty</th>
                <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800 text-center w-48">Previously Returned Time/Qty</th>
                <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800 text-center w-36">Return Time/Qty</th>
                <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800 text-right w-28">Unit Price</th>
                <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800 text-right w-28">Total</th>
                <th className="px-3 py-2 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="text-[13.5px]">
              {invoice.items.map((item, idx) => {
                const returnableQty = Math.max(0, item.quantity - (Number(item.refunded_quantity) || 0));
                const selectedQty = selectedRefundItems[item.id || 0] || 0;
                const unitPrice = Number(item.total) / Number(item.quantity);
                const itemRefundTotal = unitPrice * selectedQty;
                const isImeiSelected = !!selectedImeis[item.id || 0];

                return (
                  <tr key={item.id || idx} className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                    <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-neutral-100 flex-wrap">
                          <span>
                            {item.product_name}
                            {item.sku_code && <span className="text-blue-600 dark:text-blue-400 ml-1">({item.sku_code})</span>}
                          </span>
                          <ExternalLink size={12} className="text-blue-500 opacity-70 inline" />
                        </div>

                        {/* Serialized Device Checkboxes (Matching Image 1) */}
                        {item.imei && (
                          <div className="mt-1.5 pl-2 space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isImeiSelected}
                                disabled={returnableQty === 0}
                                onChange={(e) => {
                                  if (item.id) {
                                    const checked = e.target.checked;
                                    setSelectedImeis(prev => ({ ...prev, [item.id!]: checked }));
                                    setSelectedRefundItems(prev => ({ ...prev, [item.id!]: checked ? 1 : 0 }));
                                  }
                                }}
                                className="w-3.5 h-3.5 text-blue-600 rounded-none cursor-pointer"
                              />
                              <span className="font-semibold text-blue-600 dark:text-blue-400">Select All</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer ml-3 font-mono">
                              <input
                                type="checkbox"
                                checked={isImeiSelected}
                                disabled={returnableQty === 0}
                                onChange={(e) => {
                                  if (item.id) {
                                    const checked = e.target.checked;
                                    setSelectedImeis(prev => ({ ...prev, [item.id!]: checked }));
                                    setSelectedRefundItems(prev => ({ ...prev, [item.id!]: checked ? 1 : 0 }));
                                  }
                                }}
                                className="w-3.5 h-3.5 text-blue-600 rounded-none cursor-pointer"
                              />
                              <span>{item.imei}</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Purchased Qty */}
                    <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center font-mono">
                      {item.quantity}
                    </td>

                    {/* Previously Returned Qty */}
                    <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center font-mono text-neutral-600 dark:text-neutral-400">
                      {Number(item.refunded_quantity) || 0}
                    </td>

                    {/* Return Qty Input */}
                    <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center">
                      {returnableQty > 0 ? (
                        <select
                          value={selectedQty}
                          onChange={(e) => {
                            if (item.id) {
                              const val = Number(e.target.value);
                              setSelectedRefundItems(prev => ({ ...prev, [item.id!]: val }));
                              if (item.imei) {
                                setSelectedImeis(prev => ({ ...prev, [item.id!]: val > 0 }));
                              }
                            }
                          }}
                          className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-xs font-mono text-center outline-none cursor-pointer"
                        >
                          <option value={0}>0</option>
                          {Array.from({ length: returnableQty }, (_, i) => i + 1).map(q => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-red-500 italic font-semibold">Fully Returned</span>
                      )}
                    </td>

                    {/* Unit Price */}
                    <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono text-neutral-800 dark:text-neutral-200">
                      €{unitPrice.toFixed(2)}
                    </td>

                    {/* Total Refund for Item */}
                    <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                      €{itemRefundTotal.toFixed(2)}
                    </td>

                    {/* Action Icon */}
                    <td className="px-3 py-2 text-center">
                      {selectedQty > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (item.id) {
                              setSelectedRefundItems(prev => ({ ...prev, [item.id!]: 0 }));
                              if (item.imei) setSelectedImeis(prev => ({ ...prev, [item.id!]: false }));
                            }
                          }}
                          className="text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Remove from return"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Totals Section */}
              {(() => {
                const taxDetails = getInvoiceTaxDetails(invoice);
                return (
                  <>
                    <tr className="bg-white dark:bg-black text-sm">
                      <td colSpan={5} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                      <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-neutral-800 dark:text-neutral-200">
                        {taxDetails.taxType === 'included' ? 'Net Total (Excl. VAT) :' : 'Taxable Total :'}
                      </td>
                      <td colSpan={2} className="px-3 py-1.5 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        €{taxDetails.netAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-white dark:bg-black text-sm">
                      <td colSpan={5} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                      <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-neutral-800 dark:text-neutral-200">
                        {taxDetails.label} :
                      </td>
                      <td colSpan={2} className="px-3 py-1.5 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        €{taxDetails.taxAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-white dark:bg-black text-sm">
                      <td colSpan={5} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                      <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-neutral-800 dark:text-neutral-200">Grand Total :</td>
                      <td colSpan={2} className="px-3 py-1.5 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        €{taxDetails.grandTotal.toFixed(2)}
                      </td>
                    </tr>
                  </>
                );
              })()}

              {/* Historical Payment Lines */}
              {(invoice.payments || []).map((pmt, pIdx) => (
                <tr key={pIdx} className="bg-white dark:bg-black text-xs text-neutral-700 dark:text-neutral-300">
                  <td colSpan={5} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                  <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono text-neutral-600 dark:text-neutral-400">
                    {formatDate(pmt.paid_at)} {formatTime(pmt.paid_at)} {pmt.method} :
                  </td>
                  <td colSpan={2} className="px-3 py-1.5 text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    €{(Number(pmt.amount) || 0).toFixed(2)}
                  </td>
                </tr>
              ))}

              <tr className="bg-white dark:bg-black text-sm">
                <td colSpan={5} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-neutral-800 dark:text-neutral-200">Total Payment Received :</td>
                <td colSpan={2} className="px-3 py-1.5 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">€{totalPaymentsReceived.toFixed(2)}</td>
              </tr>

              {/* Live Refund Total Highlighted */}
              <tr className="bg-amber-100/90 border-t border-b border-amber-300 text-base">
                <td colSpan={5} className="border-r border-neutral-200"></td>
                <td className="px-3 py-2 border-r border-neutral-200 text-right font-bold text-amber-900 uppercase">Refund Total :</td>
                <td colSpan={2} className="px-3 py-2 text-right font-mono font-black text-xl text-amber-700">€{refundTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Actions matching Image 1 */}
        <div className="flex justify-end items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => setIsRefundView(false)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-none text-sm shadow-none transition-all flex items-center gap-2 cursor-pointer"
          >
            <X size={16} />
            <span>Cancel</span>
          </button>
          
          <button
            type="button"
            onClick={handleOpenSettlementModal}
            disabled={refundTotal <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-none text-sm shadow-none transition-all flex items-center gap-2 cursor-pointer"
          >
            <Banknote size={18} />
            <span>Refund Items</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            RENDER: STEP 2 - SETTLEMENT MODAL (Matching Image 2)
           ───────────────────────────────────────────────────────────────────────────── */}
        {showSettlementModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-lg overflow-hidden shadow-2xl rounded-none flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Please give REFUND of
                </h3>
                <button 
                  onClick={() => setShowSettlementModal(false)}
                  className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6 bg-white dark:bg-black text-center">
                {/* Huge Highlighted Refund Total in Gold/Amber */}
                <div className="text-5xl font-black font-mono text-amber-500 tracking-tight">
                  €{refundTotal.toFixed(2)}
                </div>

                {/* Choose how refund was given */}
                <div className="text-left space-y-2 max-w-md mx-auto">
                  <label className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">
                    Choose how the refund was given:
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-3 py-2 rounded-none text-sm text-neutral-900 dark:text-neutral-100 outline-none cursor-pointer"
                  >
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Customer Wallet">Customer Wallet / Store Credit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Choose print type (Matching Image 2 Radio Group) */}
                <div className="text-left space-y-2 max-w-md mx-auto">
                  <label className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block">
                    Choose print type:
                  </label>
                  <div className="flex flex-wrap items-center gap-5 text-sm">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="printType"
                        value="a4"
                        checked={printType === 'a4'}
                        onChange={() => setPrintType('a4')}
                        className="text-blue-600 cursor-pointer"
                      />
                      <span>Full Page</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="printType"
                        value="thermal"
                        checked={printType === 'thermal'}
                        onChange={() => setPrintType('thermal')}
                        className="text-blue-600 cursor-pointer"
                      />
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Thermal</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="printType"
                        value="email"
                        checked={printType === 'email'}
                        onChange={() => setPrintType('email')}
                        className="text-blue-600 cursor-pointer"
                      />
                      <span>Email</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="printType"
                        value="none"
                        checked={printType === 'none'}
                        onChange={() => setPrintType('none')}
                        className="text-blue-600 cursor-pointer"
                      />
                      <span>No Receipt</span>
                    </label>
                  </div>
                </div>

                {/* Restock Checkbox */}
                <div className="text-left max-w-md mx-auto bg-neutral-50 dark:bg-neutral-900/50 p-2.5 border border-neutral-200 dark:border-neutral-800">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={restockReturned}
                      onChange={(e) => setRestockReturned(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded-none cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Restock returned items back to branch inventory (+qty)
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer Modal Actions matching Image 2 */}
              <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(false)}
                  disabled={isSubmittingRefund}
                  className="px-5 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteRefund}
                  disabled={isSubmittingRefund}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-none text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmittingRefund ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Complete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: STANDARD INVOICE VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-sans text-sm px-3 py-2 select-none w-full overflow-auto">
      {/* Header */}
      <div className="py-2 flex justify-between items-center sticky top-0 z-10 mb-2.5 bg-neutral-100 dark:bg-neutral-950">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            View Invoice - {invoice.invoice_number}
          </h2>
          {invoice.status === 'void' && (
            <span className="bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2.5 py-0.5 rounded-none text-xs font-bold uppercase tracking-wider border border-red-200 dark:border-red-900/50">
              Void / Fully Refunded
            </span>
          )}
          {invoice.status === 'partially_refunded' && (
            <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-none text-xs font-bold uppercase tracking-wider border border-amber-300 dark:border-amber-900/50">
              Partially Refunded
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onBack}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-sm flex items-center gap-1.5 transition-all shadow-none cursor-pointer"
          >
            <List size={15} />
            Sales Invoices
          </button>

          {/* Email Button */}
          <button 
            onClick={handleOpenEmailModal}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-sm flex items-center gap-1.5 transition-all shadow-none cursor-pointer"
            title="Send Invoice to Any Email Address"
          >
            <Mail size={15} />
            Email
          </button>
          
          {/* Print Dropdown */}
          <div className="relative" ref={printMenuRef}>
            <button 
              onClick={() => setShowPrintMenu(!showPrintMenu)}
              className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-sm flex items-center gap-1.5 transition-all shadow-none cursor-pointer"
            >
              <Printer size={15} />
              Print
              <ChevronDown size={13} className={`transition-transform ${showPrintMenu ? 'rotate-180' : ''}`} />
            </button>

            {showPrintMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-black rounded-none shadow-none border border-neutral-300 dark:border-neutral-800 z-50 overflow-hidden text-sm">
                <button
                  onClick={handleThermalPrint}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors rounded-none cursor-pointer"
                >
                  <Printer size={14} className="text-neutral-500" />
                  <span className="font-normal">Thermal Print</span>
                </button>
                <div className="border-t border-neutral-300 dark:border-neutral-800" />
                <button
                  onClick={handleA4Print}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors rounded-none cursor-pointer"
                >
                  <FileText size={14} className="text-neutral-500" />
                  <span className="font-normal">A4 Print</span>
                </button>
                <div className="border-t border-neutral-300 dark:border-neutral-800" />
                <button
                  onClick={handleOpenEmailModal}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors rounded-none cursor-pointer"
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
            <div className="bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-2">
              <User size={15} className="text-neutral-700 dark:text-neutral-300" />
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Customer info</h3>
            </div>
            <div className="p-3 space-y-2 text-sm text-neutral-900 dark:text-neutral-100">
              <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
                <span className="w-28 font-bold text-neutral-800 dark:text-neutral-200">Customer:</span>
                {invoice.customer_id ? (
                  <button 
                    onClick={() => onSelectCustomer?.(invoice.customer_id!)}
                    className="text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline font-normal cursor-pointer"
                  >
                    <span>{invoice.customer?.name}</span>
                    <ExternalLink size={12} className="inline opacity-80" />
                  </button>
                ) : (
                  <span className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-normal cursor-pointer">
                    <span>{invoice.customer?.name || 'Walk in Customer'}</span>
                    <ExternalLink size={12} className="inline opacity-80" />
                  </span>
                )}
              </div>
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
                <span className="w-28 font-bold text-neutral-800 dark:text-neutral-200">Email:</span>
                <span className="text-neutral-600 dark:text-neutral-400">{invoice.customer?.email || ''}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-neutral-800 dark:text-neutral-200">Phone No.:</span>
                <span className="text-neutral-600 dark:text-neutral-400">{invoice.customer?.phone || ''}</span>
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
            <div className="bg-neutral-100 dark:bg-neutral-900 px-3 py-1.5 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-2">
              <Info size={15} className="text-neutral-700 dark:text-neutral-300" />
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Order Info</h3>
            </div>
            <div className="p-3 space-y-2 text-sm text-neutral-900 dark:text-neutral-100">
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
                <span className="w-32 font-bold text-neutral-800 dark:text-neutral-200">Invoice No.</span>
                <span className="text-neutral-900 dark:text-neutral-100 font-mono font-bold">{invoice.invoice_number}</span>
              </div>
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-1.5">
                <span className="w-32 font-bold text-neutral-800 dark:text-neutral-200">Sales Person:</span>
                <span className="text-neutral-700 dark:text-neutral-300">Phone Lab</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-neutral-800 dark:text-neutral-200">Date:</span>
                <span className="text-neutral-700 dark:text-neutral-300 font-mono">{formatDate(invoice.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800 w-10 text-center">#</th>
                <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800">Description</th>
                <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800 text-center w-28">Time/Qty</th>
                <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800 text-right w-36">Unit Price</th>
                <th className="px-3 py-2 text-right w-36">Total</th>
              </tr>
            </thead>
            <tbody className="text-[13.5px]">
              {invoice.items.map((item, idx) => {
                const isItemRefunded = (Number(item.refunded_quantity) || 0) > 0;
                const isFullyRefunded = (Number(item.refunded_quantity) || 0) >= item.quantity;
                return (
                  <tr key={idx} className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                    <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-500 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                            {item.product_name}
                            {item.sku_code && <span className="text-blue-600 dark:text-blue-400 ml-1">({item.sku_code})</span>}
                          </span>
                          <ExternalLink size={12} className="text-blue-500 opacity-70 inline" />
                          
                          {isItemRefunded && (
                            <span className={`text-[11px] font-bold px-1.5 py-0.2 border ml-2 ${
                              isFullyRefunded 
                                ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50' 
                                : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-900/50'
                            }`}>
                              Refunded ({item.refunded_quantity}/{item.quantity})
                            </span>
                          )}
                        </div>

                        {/* IMEI on its own line below with link icon matching reference image */}
                        {item.imei && (
                          <div className="mt-0.5">
                            <span className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs inline-flex items-center gap-1 cursor-pointer">
                              <span>{item.imei}</span>
                              <ExternalLink size={11} className="inline opacity-70" />
                            </span>
                          </div>
                        )}

                        {item.notes && (
                          <span className="text-xs text-neutral-500 italic mt-0.5 font-normal">
                            Note: {item.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-800 dark:text-neutral-200 font-mono">{item.quantity}</td>
                    <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-right text-neutral-800 dark:text-neutral-200 font-mono">€{(Number(item.price) || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-neutral-900 dark:text-neutral-100 font-mono font-semibold">€{(Number(item.total) || 0).toFixed(2)}</td>
                  </tr>
                );
              })}
              
              {/* Totals */}
              {(() => {
                const taxDetails = getInvoiceTaxDetails(invoice);
                return (
                  <>
                    <tr className="bg-white dark:bg-black text-sm">
                      <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                      <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-neutral-800 dark:text-neutral-200">
                        {taxDetails.taxType === 'included' ? 'Net Total (Excl. VAT) :' : 'Taxable Total :'}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        €{taxDetails.netAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-white dark:bg-black text-sm">
                      <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                      <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-neutral-800 dark:text-neutral-200">
                        {taxDetails.label} :
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        €{taxDetails.taxAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-white dark:bg-black text-sm">
                      <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                      <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-bold text-neutral-900 dark:text-neutral-100">Grand Total :</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">€{(Number(invoice.grand_total) || 0).toFixed(2)}</td>
                    </tr>
                  </>
                );
              })()}
              
              {/* Payment Info */}
              {invoice.payments && invoice.payments.length > 0 ? (
                invoice.payments.map((payment, idx) => (
                  <tr key={idx} className="bg-white dark:bg-black text-xs text-neutral-700 dark:text-neutral-300">
                    <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                    <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono text-neutral-600 dark:text-neutral-400">
                      {formatDate(payment.paid_at)} {formatTime(payment.paid_at)} {payment.method} Payment
                    </td>
                    <td className={`px-3 py-1.5 text-right font-mono font-semibold ${(Number(payment.amount) || 0) < 0 ? 'text-red-600 font-bold' : 'text-neutral-900 dark:text-neutral-100'}`}>
                      €{(Number(payment.amount) || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="bg-white dark:bg-black text-xs text-neutral-700 dark:text-neutral-300">
                  <td colSpan={3} className="border-r border-neutral-200 dark:border-neutral-800"></td>
                  <td className="px-3 py-1.5 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono text-neutral-600 dark:text-neutral-400">
                    {formatDate(invoice.created_at)} {formatTime(invoice.created_at)} {invoice.payment_method} Payment
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">€{(Number(invoice.grand_total) || 0).toFixed(2)}</td>
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
        <div className="flex justify-end items-center gap-3">
          {invoice.status !== 'void' ? (
            <button 
              onClick={handleStartRefund}
              className="bg-amber-400 hover:bg-amber-500 text-neutral-900 font-bold py-1.5 px-5 rounded-none text-sm shadow-none transition-all cursor-pointer flex items-center gap-2"
            >
              <RotateCcw size={15} />
              <span>Create Refund</span>
              {invoice.status === 'partially_refunded' && (
                <span className="text-xs font-normal opacity-85">(Partial Remaining)</span>
              )}
            </button>
          ) : (
            <div className="text-sm font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 px-3 py-1.5 rounded-none border border-red-200 dark:border-red-900/50">
              This invoice has been fully refunded.
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-850 rounded-none shadow-none overflow-hidden">
          <div className="bg-neutral-100 dark:bg-neutral-900/60 px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-850 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-black dark:text-white">Activity Log</h3>
            <div className="flex gap-2 items-center">
              <select 
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 px-2 py-0.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none rounded-none cursor-pointer"
              >
                <option value="All Activities">All Activities</option>
                {Array.from(new Set((invoice.activities || []).map(a => a.activity).filter(Boolean))).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <button 
                onClick={() => setShowNoteModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 text-xs rounded-none shadow-none transition-all cursor-pointer font-sans active:scale-[0.98] flex items-center gap-1.5"
              >
                <Plus size={13} />
                <span>Add Note</span>
              </button>
            </div>
          </div>
          <table className="w-full text-left border-collapse text-[15px]">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-[15px] font-semibold text-black dark:text-white">
                <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-28">Date</th>
                <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-800 w-24">Time</th>
                <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-800 w-36">User</th>
                <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-800 w-44">Activity</th>
                <th className="px-1.5 py-0.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900 text-[15px]">
              {(() => {
                const activities = (invoice.activities || []).filter(a => activityFilter === 'All Activities' || a.activity === activityFilter);
                if (activities.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-neutral-400 dark:text-neutral-500 italic text-sm">
                        {activityFilter === 'All Activities' ? 'No activities recorded for this invoice.' : `No activities found for "${activityFilter}".`}
                      </td>
                    </tr>
                  );
                }
                return activities.map((activity) => (
                  <tr key={activity.id} className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-50/80 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
                    <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">{formatDate(activity.created_at)}</td>
                    <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">{formatTime(activity.created_at)}</td>
                    <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">{activity.user_name || 'System'}</td>
                    <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-800">{activity.activity}</td>
                    <td className="px-1.5 py-0.5">{activity.details}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
          <div className="p-1.5 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-850 flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <select className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-1 py-0.5 outline-none font-mono">
                <option>auto</option>
              </select>
              <span className="font-bold">1-1/1</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200">«</button>
              <button className="px-3 py-0.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rounded-none font-normal">1</button>
              <button className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200">»</button>
            </div>
          </div>
        </div>
      </div>

      {/* Email Invoice Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 font-sans animate-in fade-in duration-150">
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-lg overflow-hidden shadow-2xl rounded-none flex flex-col">
            <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-neutral-700 dark:text-neutral-300" />
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Email Invoice</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowEmailModal(false)} 
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="p-6 space-y-4 bg-white dark:bg-black text-sm text-neutral-900 dark:text-neutral-100">
              {/* Invoice Summary Pill */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                <div>
                  <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider block">Invoice</span>
                  <span className="font-bold font-mono text-neutral-900 dark:text-neutral-100">{invoice.invoice_number}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider block">Total Amount</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">€{(Number(invoice.grand_total) || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Recipient Email Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Send To Email Address <span className="text-red-500">*</span></span>
                  {invoice.customer?.email && recipientEmail !== invoice.customer.email && (
                    <button
                      type="button"
                      onClick={() => setRecipientEmail(invoice.customer?.email || '')}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline lowercase font-normal cursor-pointer"
                    >
                      Use customer email ({invoice.customer.email})
                    </button>
                  )}
                </label>
                <input
                  type="email"
                  required
                  placeholder="client@gmail.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Invoice Subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                />
              </div>

              {/* Message Note */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block">
                  Note / Message
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional message to include with the invoice..."
                  value={emailCustomMessage}
                  onChange={(e) => setEmailCustomMessage(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 resize-none"
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

              {/* Footer */}
              <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between -mx-6 -mb-6 mt-6">
                <button
                  type="button"
                  onClick={handleOpenMailClient}
                  className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink size={13} />
                  Open in Mail App
                </button>

                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-5 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSendingEmail || !recipientEmail.trim()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-none text-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Send Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 font-sans animate-in fade-in duration-150">
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-lg overflow-hidden shadow-2xl rounded-none flex flex-col">
            <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-neutral-700 dark:text-neutral-300" />
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Add Invoice Note</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowNoteModal(false);
                  setNewNote('');
                }} 
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddNote} className="p-6 space-y-4 bg-white dark:bg-black text-sm text-neutral-900 dark:text-neutral-100">
              {/* Invoice Info Pill */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                <div>
                  <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider block">Invoice</span>
                  <span className="font-bold font-mono text-neutral-900 dark:text-neutral-100">{invoice.invoice_number}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider block">Customer</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{invoice.customer?.name || 'Walk-in Customer'}</span>
                </div>
              </div>

              {/* Note Details Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block">
                  Note / Activity Details <span className="text-red-500">*</span>
                </label>
                <textarea 
                  autoFocus
                  required
                  rows={4}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter internal note or activity details regarding this invoice..."
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none p-3 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 placeholder:text-neutral-400 resize-none font-sans"
                />
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3 -mx-6 -mb-6 mt-6">
                <button 
                  type="button"
                  onClick={() => {
                    setShowNoteModal(false);
                    setNewNote('');
                  }}
                  className="px-5 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSavingNote || !newNote.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-none text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      <span>Save Note</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Print Container */}
      {printMode === 'thermal' && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
          <ThermalReceipt invoice={invoice} settings={settings} company={company} />
        </div>
      )}

      {/* A4 Print Container */}
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
              {(() => {
                const taxDetails = getInvoiceTaxDetails(invoice);
                return (
                  <div className="w-56 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{taxDetails.taxType === 'included' ? 'Net (Excl. VAT):' : 'Subtotal:'}</span>
                      <span>€{taxDetails.netAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{taxDetails.label}:</span>
                      <span>€{taxDetails.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t border-slate-300 pt-2 mt-2">
                      <span>Grand Total:</span><span>€{taxDetails.grandTotal.toFixed(2)}</span>
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
                );
              })()}
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
