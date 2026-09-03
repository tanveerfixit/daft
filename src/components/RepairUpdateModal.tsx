import React, { useState } from 'react';
import { X, CheckCircle, CreditCard, FileText, AlertCircle } from 'lucide-react';
import { Repair } from '../types';

interface RepairUpdateModalProps {
  repair: Repair & { notes?: string };
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: 'new',       label: 'New',          color: 'bg-[var(--bg-zebra)] text-[var(--text-main)] border-[var(--border-header)]' },
  { value: 'diagnosed', label: 'Diagnosed',    color: 'bg-[var(--bg-hover)] text-[var(--brand-primary)] border-[var(--brand-primary)]' },
  { value: 'repairing', label: 'Under Process', color: 'bg-[var(--brand-warning)]/10 text-[var(--brand-warning)] border-[var(--brand-warning)]' },
  { value: 'completed', label: 'Completed',    color: 'bg-[var(--brand-success)]/10 text-[var(--brand-success)] border-[var(--brand-success)]' },
  { value: 'collected', label: 'Collected',    color: 'bg-[var(--bg-accent-subtle)] text-[var(--text-muted)] border-[var(--border-header)]' },
];

export default function RepairUpdateModal({ repair, onClose, onSaved }: RepairUpdateModalProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'quote' | 'notes'>('status');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [status, setStatus] = useState(repair.status || 'new');
  const [notes, setNotes] = useState('');
  const [quotePrice, setQuotePrice] = useState(repair.total_quote ? String(repair.total_quote) : '');

  const currentDeposit = Number(repair.deposit_paid || 0);
  const parsedNewQuote = quotePrice.trim() !== '' ? Math.max(0, parseFloat(quotePrice) || 0) : Number(repair.total_quote || 0);
  const previewRemaining = Math.max(0, parsedNewQuote - currentDeposit);
  const remaining = Number(repair.remaining_balance || 0);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const parsedQuote = quotePrice.trim() !== '' ? Math.max(0, parseFloat(quotePrice) || 0) : undefined;
      const res = await fetch(`/api/repairs/${repair.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes: notes.trim() || undefined,
          total_quote: parsedQuote
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update job');

      setSuccess('Job updated successfully.');
      setTimeout(() => {
        onSaved();
      }, 1200);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === repair.status);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-base)] bg-[var(--bg-zebra)] shrink-0">
          <div>
            <h3 className="font-bold text-base text-[var(--text-main)]">
              Update Repair Job #{repair.id}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {repair.customer_name || 'Walk-in Customer'} • {repair.device_model}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Job Summary Bar */}
        <div className="flex items-center gap-4 px-4 py-2.5 bg-[var(--bg-zebra)] border-b border-[var(--border-base)] text-xs shrink-0">
          <span>
            <span className="text-[var(--text-muted-more)] uppercase font-bold mr-1">Quote</span>
            <span className="font-bold text-[var(--text-main)]">
              {Number(repair.total_quote || 0) > 0 ? `€${Number(repair.total_quote || 0).toFixed(2)}` : 'Pending'}
            </span>
          </span>
          <span>
            <span className="text-[var(--text-muted-more)] uppercase font-bold mr-1">Paid</span>
            <span className="font-bold text-[var(--brand-success)]">€{Number(repair.deposit_paid || 0).toFixed(2)}</span>
          </span>
          <span>
            <span className="text-[var(--text-muted-more)] uppercase font-bold mr-1">Balance</span>
            <span className={`font-bold ${remaining > 0 ? 'text-[var(--brand-danger)]' : Number(repair.total_quote || 0) === 0 ? 'text-[var(--text-muted)]' : 'text-[var(--brand-success)]'}`}>
              {Number(repair.total_quote || 0) === 0 && Number(repair.deposit_paid || 0) === 0 ? '—' : `€${remaining.toFixed(2)}`}
            </span>
          </span>
          {currentStatusOption && (
            <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${currentStatusOption.color}`}>
              {currentStatusOption.label}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-base)] bg-[var(--bg-card)] shrink-0">
          {(['status', 'quote', 'notes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-bold capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {tab === 'status' ? '📋 Status' : tab === 'quote' ? '💶 Quote Price' : '📝 Notes'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">

          {/* STATUS TAB */}
          {activeTab === 'status' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-4">Select New Status</p>
              {STATUS_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 px-4 py-3 rounded border cursor-pointer transition-all ${
                    status === opt.value
                      ? opt.color + ' border-current shadow-sm'
                      : 'border-[var(--border-base)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={status === opt.value}
                    onChange={() => setStatus(opt.value as Repair['status'])}
                    className="accent-[var(--brand-primary)]"
                  />
                  <span className="font-bold text-sm">{opt.label}</span>
                  {repair.status === opt.value && (
                    <span className="ml-auto text-[10px] text-[var(--text-muted-more)] font-bold">CURRENT</span>
                  )}
                </label>
              ))}
            </div>
          )}

          {/* QUOTE TAB */}
          {activeTab === 'quote' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Repair Quote & Pricing</p>
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] mb-1">
                  Total Repair Quote (€)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={quotePrice}
                    onChange={e => setQuotePrice(e.target.value)}
                    className="w-full border border-[var(--border-input)] rounded pl-8 pr-3 py-2 text-base font-bold font-mono focus:border-[var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/10"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted-more)] mt-1">
                  Set or update the final repair price after inspecting the device.
                </p>
              </div>

              <div className="bg-[var(--bg-zebra)] border border-[var(--border-base)] rounded p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Deposit Already Paid:</span>
                  <span className="font-bold text-[var(--brand-success)]">€{currentDeposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--border-base)] pt-2 font-bold text-sm">
                  <span className="text-[var(--text-main)]">Calculated Remaining Due:</span>
                  <span className={previewRemaining > 0 ? 'text-[var(--brand-danger)]' : 'text-[var(--brand-success)]'}>
                    {quotePrice.trim() === '' && currentDeposit === 0 ? '—' : `€${previewRemaining.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {repair.notes && (
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-muted-more)] uppercase tracking-wider mb-2">Previous Notes</p>
                  <div className="bg-[var(--bg-hover)] border border-[var(--border-base)] rounded px-3 py-3 text-xs text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed max-h-40 overflow-auto font-mono">
                    {repair.notes}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted-more)] uppercase tracking-wider mb-2">Add New Note</p>
                <textarea
                  rows={5}
                  className="w-full border border-[var(--border-input)] rounded px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/10 resize-none"
                  placeholder="Add a note about this repair job (e.g. parts ordered, customer called, etc.)..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <p className="text-[10px] text-[var(--text-muted-more)] mt-1">Notes are saved with a timestamp and cannot be deleted.</p>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Messages */}
        {(success || error) && (
          <div className="px-6 pb-2 shrink-0">
            {success && (
              <div className="flex items-center gap-2 bg-[var(--brand-success)]/10 border border-[var(--brand-success)]/20 rounded px-3 py-2 text-sm text-[var(--brand-success)] font-medium">
                <CheckCircle size={16} />
                {success}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 bg-[var(--brand-danger)]/10 border border-[var(--brand-danger)]/20 rounded px-3 py-2 text-sm text-[var(--brand-danger)] font-medium">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border-base)] flex justify-end gap-2 bg-[var(--bg-zebra)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--bg-card)] border border-[var(--border-header)] rounded text-[var(--text-main)] hover:bg-[var(--bg-hover)] text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !!success}
            className="px-6 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded text-sm font-bold transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Update'}
          </button>
        </div>
      </div>
    </div>
  );
}
