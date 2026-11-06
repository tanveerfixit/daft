import React, { useState, useEffect } from 'react';
import { PaymentEntry } from './types';
import { CreditNote } from '../../types';

interface PaymentPanelProps {
  addedPayments: PaymentEntry[];
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  onAddPayment: (method?: string, amount?: number, extra?: { credit_note_id?: number; credit_note_number?: string }) => void;
  onRemovePayment: (index: number) => void;
  remainingAmount: number;
  customerBalance?: number;
  customerId?: number | null;
  availableMethods: string[];
}

export const PaymentPanel: React.FC<PaymentPanelProps> = ({
  addedPayments,
  paymentMethod,
  setPaymentMethod,
  paymentAmount,
  setPaymentAmount,
  onAddPayment,
  onRemovePayment,
  remainingAmount,
  customerBalance = 0,
  customerId = null,
  availableMethods = ['Cash', 'Card', 'Other']
}) => {
  const [showCnInput, setShowCnInput] = useState(false);
  const [cnQuery, setCnQuery] = useState('');
  const [cnLookupResult, setCnLookupResult] = useState<CreditNote | null>(null);
  const [cnError, setCnError] = useState('');
  const [cnLoading, setCnLoading] = useState(false);
  const [customerCreditNotes, setCustomerCreditNotes] = useState<CreditNote[]>([]);

  useEffect(() => {
    if (customerId) {
      fetch(`/api/customers/${customerId}/credit-notes`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            setCustomerCreditNotes(data.filter((c: CreditNote) => (c.status === 'active' || c.status === 'partially_used') && Number(c.remaining_amount) > 0.009));
          } else {
            setCustomerCreditNotes([]);
          }
        })
        .catch(() => setCustomerCreditNotes([]));
    } else {
      setCustomerCreditNotes([]);
    }
  }, [customerId]);

  const methods = ['Cash', 'Card', 'Credit Note', 'Other'];
  if (customerBalance > 0 && !methods.includes('Wallet')) {
    methods.push('Wallet');
  }

  const handleMethodClick = (m: string) => {
    setPaymentMethod(m);
    if (m === 'Credit Note') {
      setShowCnInput(prev => !prev);
      setCnError('');
      return;
    }
    setShowCnInput(false);
    // If user clicks the method button directly, apply currently typed or remaining amount with this method immediately
    const parsed = parseFloat(paymentAmount);
    const amt = !isNaN(parsed) && parsed > 0 ? parsed : remainingAmount;
    if (amt > 0) {
      if (m === 'Wallet') {
        const alreadyUsedWallet = addedPayments
          .filter(p => p.method === 'Wallet' || p.method === 'Customer Wallet')
          .reduce((s, p) => s + Number(p.amount), 0);
        const availWallet = Math.max(0, customerBalance - alreadyUsedWallet);
        const applyAmt = Math.min(amt, availWallet);
        if (applyAmt <= 0) {
          alert(`No remaining wallet balance available (€${ customerBalance.toFixed(2) }).`);
          return;
        }
        onAddPayment(m, Number(applyAmt.toFixed(2)));
        return;
      }
      onAddPayment(m, amt);
    }
  };

  const handleLookupCreditNote = async (codeToLookup?: string) => {
    const code = (codeToLookup ?? cnQuery).trim();
    if (!code) return;
    setCnLoading(true);
    setCnError('');
    setCnLookupResult(null);
    try {
      const res = await fetch(`/api/invoices/credit-note/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        setCnError(data.error || 'Credit Note not found');
      } else {
        const alreadyApplied = addedPayments
          .filter(p => p.credit_note_id === data.id || p.credit_note_number === data.credit_note_number)
          .reduce((sum, p) => sum + Number(p.amount), 0);
        const avail = Math.max(0, Number(data.remaining_amount) - alreadyApplied);
        if (avail <= 0.009 || (data.status !== 'active' && data.status !== 'partially_used')) {
          setCnError(`Credit Note ${data.credit_note_number} has €${avail.toFixed(2)} remaining (${data.status}).`);
        } else {
          setCnLookupResult({ ...data, remaining_amount: avail });
        }
      }
    } catch (e: any) {
      setCnError('Failed to look up Credit Note');
    } finally {
      setCnLoading(false);
    }
  };

  const handleApplyCreditNote = (cn: CreditNote) => {
    const alreadyApplied = addedPayments
      .filter(p => p.credit_note_id === cn.id || p.credit_note_number === cn.credit_note_number)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const avail = Math.max(0, Number(cn.remaining_amount) - (cnLookupResult?.id === cn.id ? 0 : alreadyApplied));
    if (avail <= 0.009) {
      setCnError(`Credit Note ${cn.credit_note_number} has already been applied.`);
      return;
    }
    const parsed = parseFloat(paymentAmount);
    const desired = !isNaN(parsed) && parsed > 0 ? parsed : (remainingAmount > 0 ? remainingAmount : avail);
    const amtToApply = Number(Math.min(avail, desired).toFixed(2));
    if (amtToApply <= 0) {
      setCnError('Cart remaining amount is €0.00');
      return;
    }
    onAddPayment(`Credit Note (${cn.credit_note_number})`, amtToApply, {
      credit_note_id: cn.id,
      credit_note_number: cn.credit_note_number
    });
    setCnLookupResult(null);
    setCnQuery('');
    setShowCnInput(false);
  };

  return (
    <div className="pay-widget bg-white border-y sm:border border-[#d8d8d8] rounded-none sm:rounded p-4 flex flex-col gap-3 text-lg" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div className="flex items-center justify-between text-[#333333]">
        <span>Remaining:</span>
        <span className="pay-widget-remaining font-semibold text-xl">
          €{Math.max(0, remainingAmount).toFixed(2)}
        </span>
      </div>

      <input 
        type="number" 
        step="0.01" 
        min="0" 
        placeholder="Enter amount" 
        className="pay-widget-amount border border-[#d8d8d8] rounded px-3 py-2 outline-none text-[#333333] placeholder-[#757575] text-lg bg-white"
        value={paymentAmount}
        onChange={(e) => setPaymentAmount(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAddPayment();
          }
        }}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {methods.map((m) => {
          const isActive = paymentMethod.toLowerCase() === m.toLowerCase();

          let activeClasses = '';
          let inactiveClasses = '';

          if (m.toLowerCase() === 'cash') {
            activeClasses = 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold';
            inactiveClasses = 'bg-white border-neutral-300 text-neutral-800 hover:border-emerald-500 hover:bg-emerald-50/50';
          } else if (m.toLowerCase() === 'card') {
            activeClasses = 'bg-blue-600 border-blue-600 text-white shadow-sm font-bold';
            inactiveClasses = 'bg-white border-neutral-300 text-neutral-800 hover:border-blue-500 hover:bg-blue-50/50';
          } else if (m.toLowerCase() === 'wallet' || m.toLowerCase() === 'credit note') {
            activeClasses = 'bg-purple-600 border-purple-600 text-white shadow-sm font-bold';
            inactiveClasses = 'bg-white border-neutral-300 text-neutral-800 hover:border-purple-500 hover:bg-purple-50/50';
          } else {
            activeClasses = 'bg-amber-600 border-amber-600 text-white shadow-sm font-bold';
            inactiveClasses = 'bg-white border-neutral-300 text-neutral-800 hover:border-amber-500 hover:bg-amber-50/50';
          }

          return (
            <button
              key={m}
              type="button"
              onClick={() => handleMethodClick(m)}
              className={`pay-widget-btn border rounded py-2.5 px-1 font-semibold text-sm sm:text-base transition-all cursor-pointer truncate ${
                isActive ? activeClasses : inactiveClasses
              }`}
              title={m}
            >
              {m === 'Credit Note' ? 'Credit Note' : m}
            </button>
          );
        })}
      </div>

      {showCnInput && (
        <div className="bg-purple-50/70 border border-purple-200 rounded p-2.5 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-900 text-xs uppercase tracking-wide">Redeem Credit Note</span>
            <button
              type="button"
              onClick={() => {
                setShowCnInput(false);
                setCnError('');
                setCnLookupResult(null);
              }}
              className="text-neutral-500 hover:text-neutral-800 text-xs font-bold cursor-pointer bg-transparent border-0"
            >
              Close &times;
            </button>
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Scan or type CN-# (e.g. CN-MAIN-...)"
              value={cnQuery}
              onChange={(e) => setCnQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLookupCreditNote();
                }
              }}
              className="flex-1 bg-white border border-purple-300 rounded px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-purple-600 font-mono uppercase"
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleLookupCreditNote()}
              disabled={cnLoading || !cnQuery.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded text-xs cursor-pointer shrink-0"
            >
              {cnLoading ? '...' : 'Find'}
            </button>
          </div>

          {cnError && (
            <div className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded px-2 py-1">
              {cnError}
            </div>
          )}

          {cnLookupResult && (
            <div className="bg-white border border-purple-300 rounded p-2 flex items-center justify-between gap-2">
              <div className="text-xs">
                <div className="font-bold font-mono text-purple-900">{cnLookupResult.credit_note_number}</div>
                <div className="text-neutral-600">
                  {cnLookupResult.customer_name || 'Walk-in Customer'} • Avail: <span className="font-bold text-emerald-700">€{Number(cnLookupResult.remaining_amount).toFixed(2)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleApplyCreditNote(cnLookupResult)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-xs cursor-pointer shrink-0"
              >
                Apply €{Math.min(
                  Number(cnLookupResult.remaining_amount),
                  (!isNaN(parseFloat(paymentAmount)) && parseFloat(paymentAmount) > 0 ? parseFloat(paymentAmount) : (remainingAmount > 0 ? remainingAmount : Number(cnLookupResult.remaining_amount)))
                ).toFixed(2)}
              </button>
            </div>
          )}

          {customerCreditNotes.length > 0 && !cnLookupResult && (
            <div className="pt-1 border-t border-purple-200 space-y-1">
              <div className="text-[11px] font-semibold text-purple-800">Customer Active Credit Notes:</div>
              {customerCreditNotes.map((cn) => {
                const alreadyApplied = addedPayments
                  .filter(p => p.credit_note_id === cn.id || p.credit_note_number === cn.credit_note_number)
                  .reduce((sum, p) => sum + Number(p.amount), 0);
                const avail = Math.max(0, Number(cn.remaining_amount) - alreadyApplied);
                if (avail <= 0.009) return null;
                return (
                  <div key={cn.id} className="bg-white border border-purple-200 rounded px-2 py-1 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-purple-800">{cn.credit_note_number}</span>
                      <span className="text-neutral-600 ml-2">Avail: <strong className="text-emerald-700">€{avail.toFixed(2)}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyCreditNote({ ...cn, remaining_amount: avail })}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-2.5 py-0.5 rounded text-[11px] cursor-pointer"
                    >
                      Use
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {addedPayments.length > 0 && (
        <div className="pay-widget-list flex flex-col gap-1 text-base text-[#333333] pt-2 border-t border-[#d8d8d8]">
          {addedPayments.map((p, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <span className="font-medium">{p.method}</span>
              <span className="flex items-center gap-2">
                <span className="font-semibold">€{Number(p.amount).toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => onRemovePayment(i)}
                  aria-label="Remove payment"
                  className="pay-widget-remove text-[#757575] hover:text-[#ff6347] leading-none text-xl p-0.5 cursor-pointer bg-transparent border-0"
                >
                  &times;
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

