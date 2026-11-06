import React, { useState, useEffect, useRef } from 'react';
import { Banknote, CreditCard, Ticket, ChevronDown, X, Check } from 'lucide-react';
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
  const [showOtherMenu, setShowOtherMenu] = useState(false);
  const [cnQuery, setCnQuery] = useState('');
  const [cnLookupResult, setCnLookupResult] = useState<CreditNote | null>(null);
  const [cnError, setCnError] = useState('');
  const [cnLoading, setCnLoading] = useState(false);
  const [customerCreditNotes, setCustomerCreditNotes] = useState<CreditNote[]>([]);
  const otherMenuRef = useRef<HTMLDivElement>(null);

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

  // Close "Other Methods" dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (otherMenuRef.current && !otherMenuRef.current.contains(event.target as Node)) {
        setShowOtherMenu(false);
      }
    };
    if (showOtherMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showOtherMenu]);

  // Filter out Cash and Card to get secondary/other methods
  const otherMethodsList = availableMethods.filter(
    m => m.toLowerCase() !== 'cash' && m.toLowerCase() !== 'card'
  );
  if (otherMethodsList.length === 0) {
    otherMethodsList.push('Other');
  }

  // Calculate remaining customer wallet balance accounting for already added payments
  const alreadyUsedWallet = addedPayments
    .filter(p => p.method === 'Wallet' || p.method === 'Customer Wallet')
    .reduce((s, p) => s + Number(p.amount), 0);
  const availableWalletBalance = Math.max(0, customerBalance - alreadyUsedWallet);

  const handlePrimaryClick = (m: 'Cash' | 'Card') => {
    setPaymentMethod(m);
    setShowCnInput(false);
    setShowOtherMenu(false);
    const parsed = parseFloat(paymentAmount);
    const amt = !isNaN(parsed) && parsed > 0 ? parsed : remainingAmount;
    if (amt > 0) {
      onAddPayment(m, amt);
    }
  };

  const handleSelectOtherMethod = (m: string) => {
    setPaymentMethod(m);
    setShowOtherMenu(false);
    setShowCnInput(false);
    const parsed = parseFloat(paymentAmount);
    const amt = !isNaN(parsed) && parsed > 0 ? parsed : remainingAmount;
    if (amt > 0) {
      onAddPayment(m, amt);
    }
  };

  const handleApplyWallet = () => {
    const parsed = parseFloat(paymentAmount);
    const desired = !isNaN(parsed) && parsed > 0 ? parsed : remainingAmount;
    const applyAmt = Number(Math.min(desired, availableWalletBalance).toFixed(2));
    if (applyAmt <= 0) {
      alert(`No remaining wallet balance available (€${availableWalletBalance.toFixed(2)}).`);
      return;
    }
    setPaymentMethod('Wallet');
    onAddPayment('Wallet', applyAmt);
    setShowCnInput(false);
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

  const isCashActive = paymentMethod.toLowerCase() === 'cash';
  const isCardActive = paymentMethod.toLowerCase() === 'card';
  const hasStoreCreditAvailable = availableWalletBalance > 0.009 || customerCreditNotes.length > 0;

  return (
    <div className="pay-widget bg-white border-y sm:border border-[#d8d8d8] rounded-none sm:rounded p-4 flex flex-col gap-3 text-lg" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Remaining Due Display */}
      <div className="flex items-center justify-between text-[#333333]">
        <span className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Remaining Due:</span>
        <span className="pay-widget-remaining font-mono font-bold text-2xl text-neutral-900">
          €{Math.max(0, remainingAmount).toFixed(2)}
        </span>
      </div>

      {/* Amount Input */}
      <div className="relative">
        <input 
          type="number" 
          step="0.01" 
          min="0" 
          placeholder="Enter amount" 
          className="pay-widget-amount w-full border border-[#d8d8d8] rounded px-3 py-2 outline-none text-[#333333] placeholder-[#757575] text-lg bg-white focus:border-blue-500 transition-colors"
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
        {paymentAmount && remainingAmount > 0 && Number(paymentAmount) !== remainingAmount && (
          <button
            type="button"
            onClick={() => setPaymentAmount(remainingAmount.toFixed(2))}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded cursor-pointer"
            title="Set to full remaining balance"
          >
            Full €{remainingAmount.toFixed(2)}
          </button>
        )}
      </div>

      {/* Primary Row: Large Cash & Card Buttons (95% of Transactions) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => handlePrimaryClick('Cash')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded font-bold text-base transition-all cursor-pointer border ${
            isCashActive
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
              : 'bg-white border-emerald-600 text-emerald-800 hover:bg-emerald-50/70 hover:border-emerald-700'
          }`}
        >
          <Banknote size={20} className={isCashActive ? 'text-white' : 'text-emerald-700'} />
          <span>Cash</span>
        </button>

        <button
          type="button"
          onClick={() => handlePrimaryClick('Card')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded font-bold text-base transition-all cursor-pointer border ${
            isCardActive
              ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-300'
              : 'bg-white border-blue-600 text-blue-800 hover:bg-blue-50/70 hover:border-blue-700'
          }`}
        >
          <CreditCard size={20} className={isCardActive ? 'text-white' : 'text-blue-700'} />
          <span>Card</span>
        </button>
      </div>

      {/* Secondary Row: Store Credit / Credit Note & Other Methods */}
      <div className="grid grid-cols-2 gap-2.5 relative" ref={otherMenuRef}>
        {/* Store Credit / Credit Note Toggle */}
        <button
          type="button"
          onClick={() => {
            setShowCnInput(prev => !prev);
            setShowOtherMenu(false);
            setCnError('');
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded font-semibold text-xs sm:text-sm transition-all cursor-pointer border ${
            showCnInput
              ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
              : hasStoreCreditAvailable
                ? 'bg-purple-50 border-purple-300 text-purple-900 hover:bg-purple-100'
                : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400'
          }`}
        >
          <Ticket size={16} className={showCnInput ? 'text-white' : 'text-purple-600'} />
          <span className="truncate">Store Credit / CN</span>
          {hasStoreCreditAvailable && (
            <span className="bg-purple-200 text-purple-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
              {availableWalletBalance > 0 ? `€${availableWalletBalance.toFixed(0)}` : '✓'}
            </span>
          )}
        </button>

        {/* Other Payment Methods Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowOtherMenu(prev => !prev);
              setShowCnInput(false);
            }}
            className={`w-full flex items-center justify-between py-2 px-2.5 rounded font-semibold text-xs sm:text-sm transition-all cursor-pointer border ${
              !isCashActive && !isCardActive && !showCnInput && paymentMethod !== 'Cash' && paymentMethod !== 'Card'
                ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400'
            }`}
          >
            <span className="truncate">
              {!isCashActive && !isCardActive && !showCnInput && paymentMethod !== 'Cash' && paymentMethod !== 'Card'
                ? paymentMethod
                : 'Other Methods'}
            </span>
            <ChevronDown size={14} className={`shrink-0 transition-transform ${showOtherMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Flyout Menu for Other Methods */}
          {showOtherMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-neutral-300 rounded shadow-lg z-30 py-1 text-sm font-normal overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100">
                Alternative Tenders
              </div>
              {otherMethodsList.map((m) => {
                const isSelected = paymentMethod.toLowerCase() === m.toLowerCase();
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelectOtherMethod(m)}
                    className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-neutral-100 text-neutral-800 cursor-pointer"
                  >
                    <span>{m}</span>
                    {isSelected && <Check size={14} className="text-amber-600" />}
                  </button>
                );
              })}
              {availableWalletBalance > 0.009 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowOtherMenu(false);
                    handleApplyWallet();
                  }}
                  className="w-full text-left px-3 py-2 flex items-center justify-between bg-purple-50 hover:bg-purple-100 text-purple-900 border-t border-purple-100 cursor-pointer text-xs font-semibold"
                >
                  <span>Customer Wallet</span>
                  <span className="font-mono font-bold text-emerald-700">€{availableWalletBalance.toFixed(2)}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Credit Note & Store Credit Expanded Panel */}
      {showCnInput && (
        <div className="bg-purple-50/80 border border-purple-200 rounded p-3 flex flex-col gap-2.5 text-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-purple-200 pb-1.5">
            <span className="font-bold text-purple-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <Ticket size={14} />
              <span>Redeem Credit Note or Wallet</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setShowCnInput(false);
                setCnError('');
                setCnLookupResult(null);
              }}
              className="text-neutral-500 hover:text-neutral-800 text-xs font-bold cursor-pointer bg-transparent border-0 p-0"
            >
              Close &times;
            </button>
          </div>

          {/* Quick Apply Customer Wallet if available */}
          {availableWalletBalance > 0.009 && (
            <div className="bg-white border border-purple-300 rounded p-2 flex items-center justify-between gap-2">
              <div className="text-xs">
                <span className="font-bold text-neutral-800">Customer Wallet Balance</span>
                <div className="text-neutral-500">Available: <strong className="text-emerald-700 font-mono">€{availableWalletBalance.toFixed(2)}</strong></div>
              </div>
              <button
                type="button"
                onClick={handleApplyWallet}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded text-xs cursor-pointer shrink-0"
              >
                Apply €{Math.min(
                  availableWalletBalance,
                  (!isNaN(parseFloat(paymentAmount)) && parseFloat(paymentAmount) > 0 ? parseFloat(paymentAmount) : remainingAmount)
                ).toFixed(2)}
              </button>
            </div>
          )}

          {/* Active Credit Notes on Attached Customer Profile */}
          {customerCreditNotes.length > 0 && !cnLookupResult && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-purple-900 uppercase">Customer Active Credit Notes:</div>
              {customerCreditNotes.map((cn) => {
                const alreadyApplied = addedPayments
                  .filter(p => p.credit_note_id === cn.id || p.credit_note_number === cn.credit_note_number)
                  .reduce((sum, p) => sum + Number(p.amount), 0);
                const avail = Math.max(0, Number(cn.remaining_amount) - alreadyApplied);
                if (avail <= 0.009) return null;
                return (
                  <div key={cn.id} className="bg-white border border-purple-200 rounded px-2.5 py-1.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-purple-900">{cn.credit_note_number}</span>
                      <span className="text-neutral-500 ml-2">Available: <strong className="text-emerald-700 font-mono">€{avail.toFixed(2)}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyCreditNote({ ...cn, remaining_amount: avail })}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-2.5 py-1 rounded text-xs cursor-pointer"
                    >
                      Use
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Scan or Type Credit Note Number (for Walk-ins or Physical Receipts) */}
          <div className="space-y-1 pt-1 border-t border-purple-200">
            <label className="text-[11px] font-semibold text-purple-900 uppercase">Scan / Enter Credit Note Code:</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="CN-MAIN-2611-0001"
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
          </div>

          {cnError && (
            <div className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded px-2 py-1">
              {cnError}
            </div>
          )}

          {cnLookupResult && (
            <div className="bg-white border border-purple-300 rounded p-2.5 flex items-center justify-between gap-2">
              <div className="text-xs">
                <div className="font-bold font-mono text-purple-900">{cnLookupResult.credit_note_number}</div>
                <div className="text-neutral-600">
                  {cnLookupResult.customer_name || 'Walk-in Customer'} • Avail: <span className="font-bold text-emerald-700 font-mono">€{Number(cnLookupResult.remaining_amount).toFixed(2)}</span>
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
        </div>
      )}

      {/* Added Payments List */}
      {addedPayments.length > 0 && (
        <div className="pay-widget-list flex flex-col gap-1 text-base text-[#333333] pt-2 border-t border-[#d8d8d8]">
          {addedPayments.map((p, i) => (
            <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-neutral-50 border border-neutral-200">
              <span className="font-medium text-sm text-neutral-800">{p.method}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-neutral-900">€{Number(p.amount).toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => onRemovePayment(i)}
                  aria-label="Remove payment"
                  className="pay-widget-remove text-[#757575] hover:text-[#ff6347] leading-none text-xl p-0.5 cursor-pointer bg-transparent border-0"
                  title="Remove this tender"
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

