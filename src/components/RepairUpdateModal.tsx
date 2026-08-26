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
  const [activeTab, setActiveTab] = useState<'status' | 'payment' | 'notes'>('status');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState(repair.status || 'new');
  const [notes, setNotes] = useState('');
  const [collectedAmount, setCollectedAmount] = useState('');
  const [collectedMethod, setCollectedMethod] = useState('Cash');

  const remaining = Number(repair.remaining_balance || 0);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const collected = parseFloat(collectedAmount) || 0;
    if (collected > remaining) {
      setError(`Cannot collect more than the remaining balance (€${remaining.toFixed(2)})`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/repairs/${repair.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes,
          collected_amount: collected,
          collected_method: collectedMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update job');

      let msg = 'Job updated successfully.';
      if (data.invoice_number) msg += ` Invoice ${data.invoice_number} created.`;
      setSuccess(msg);

      setTimeout(() => {
        onSaved();
      }, 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === repair.status);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-[var(--bg-card)] rounded shadow-2xl w-full max-w-[560px] overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        
        {/* Header */}
        <div className="bg-[var(--bg-accent-subtle)] px-4 py-3 flex justify-between items-center border-b border-[var(--border-header)] shrink-0">
          <div>
            <h3 className="text-[var(--text-main)] font-bold text-base">
              Job #{repair.id} — {repair.device_model}
            </h3>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">{repair.customer_name || 'Unknown Customer'}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Job Summary Bar */}
        <div className="flex items-center gap-4 px-4 py-2.5 bg-[var(--bg-zebra)] border-b border-[var(--border-base)] text-xs shrink-0">
          <span>
            <span className="text-[var(--text-muted-more)] uppercase font-bold mr-1">Quote</span>
            <span className="font-bold text-[var(--text-main)]">€{Number(repair.total_quote || 0).toFixed(2)}</span>
          </span>
          <span>
            <span className="text-[var(--text-muted-more)] uppercase font-bold mr-1">Paid</span>
            <span className="font-bold text-[var(--brand-success)]">€{Number(repair.deposit_paid || 0).toFixed(2)}</span>
          </span>
          <span>
            <span className="text-[var(--text-muted-more)] uppercase font-bold mr-1">Balance</span>
            <span className={`font-bold ${remaining > 0 ? 'text-[var(--brand-danger)]' : 'text-[var(--brand-success)]'}`}>
              €{remaining.toFixed(2)}
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
          {(['status', 'payment', 'notes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-bold capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {tab === 'status' ? '📋 Status' : tab === 'payment' ? '💳 Payment' : '📝 Notes'}
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

          {/* PAYMENT TAB */}
          {activeTab === 'payment' && (
            <div className="space-y-4">
              <div className="bg-[var(--brand-danger)]/10 border border-[var(--brand-danger)]/20 rounded p-4 text-center">
                <div className="text-xs text-[var(--brand-danger)] uppercase font-bold tracking-wider">Remaining Balance</div>
                <div className="text-3xl font-black text-[var(--brand-danger)] mt-1">€{remaining.toFixed(2)}</div>
              </div>

              {remaining <= 0 ? (
                <div className="flex items-center gap-2 text-[var(--brand-success)] bg-[var(--brand-success)]/10 border border-[var(--brand-success)]/20 rounded p-4">
                  <CheckCircle size={18} />
                  <span className="text-sm font-bold">This job is fully paid.</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center">
                    <label className="w-1/3 text-sm font-bold text-[var(--text-main)]">Amount to Collect</label>
                    <div className="w-2/3 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-more)] text-sm">€</span>
                      <input
                        type="number"
                        step="0.01"
                        max={remaining}
                        className="w-full border border-[var(--border-input)] rounded pl-7 pr-3 py-1.5 text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/10"
                        placeholder={`Max €${remaining.toFixed(2)}`}
                        value={collectedAmount}
                        onChange={e => setCollectedAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="w-1/3 text-sm font-bold text-[var(--text-main)]">Payment Method</label>
                    <select
                      className="w-2/3 border border-[var(--border-input)] rounded px-3 py-1.5 text-sm focus:border-[var(--brand-primary)] focus:outline-none"
                      value={collectedMethod}
                      onChange={e => setCollectedMethod(e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Wallet">Wallet</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setCollectedAmount(String(remaining))}
                    className="w-full text-center text-xs text-[var(--brand-primary)] hover:underline"
                  >
                    Collect full balance (€{remaining.toFixed(2)})
                  </button>
                  <div className="bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 rounded px-4 py-3 text-[11px] text-[var(--brand-primary)] flex items-start gap-2">
                    <FileText size={14} className="shrink-0 mt-0.5" />
                    <span>A repair invoice <strong>RE-{String(repair.id).padStart(5, '0')}</strong> will be automatically created and saved when payment is collected.</span>
                  </div>
                </>
              )}
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
