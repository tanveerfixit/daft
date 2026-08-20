import React, { useState, useRef, useEffect } from 'react';
import { Calculator, Euro, Check, X } from 'lucide-react';

interface StartingCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (amount: number) => void;
}

export const StartingCashModal: React.FC<StartingCashModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [amount, setAmount] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const denominations = [
    { label: '€500', value: 500 },
    { label: '€200', value: 200 },
    { label: '€100', value: 100 },
    { label: '€50', value: 50 },
    { label: '€20', value: 20 },
    { label: '€10', value: 10 },
    { label: '€5', value: 5 },
    { label: '€2', value: 2 },
    { label: '€1', value: 1 },
    { label: '€0.50', value: 0.5 },
    { label: '€0.20', value: 0.2 },
    { label: '€0.10', value: 0.1 },
    { label: '€0.05', value: 0.05 },
    { label: '€0.02', value: 0.02 },
    { label: '€0.01', value: 0.01 },
  ];

  const [counts, setCounts] = useState<Record<number, number>>(
    denominations.reduce((acc, d) => ({ ...acc, [d.value]: 0 }), {})
  );

  const calcTotal = Object.entries(counts).reduce((sum, [val, count]) => sum + (Number(val) * count), 0);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) {
      setError('Please enter a valid cash amount (e.g. 100.00)');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      const token = sessionStorage.getItem('epos_token') || localStorage.getItem('epos_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/reports/starting-cash', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          starting_balance: num,
          report_date: new Date().toISOString().split('T')[0]
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to save starting cash');
      }

      onSaved(num);
      onClose();
    } catch (err: any) {
      console.error('Error saving starting cash:', err);
      setError(err.message || 'Error saving starting cash');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Euro size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Opening Cash Drawer</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Set starting float for today's session</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close / Skip for now"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {!showCalculator ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Starting Cash Float Amount
              </label>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg font-mono">€</span>
                  <input 
                    ref={inputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                
                <button 
                  type="button"
                  onClick={() => setShowCalculator(true)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  title="Count Cash Denominations"
                >
                  <Calculator size={18} />
                  <span>Calculator</span>
                </button>
              </div>

              {error && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Tip: You can edit or adjust this starting balance anytime from the <span className="font-semibold text-slate-700 dark:text-slate-300">End of Day</span> page.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Skip For Now
              </button>
              
              <button
                type="submit"
                disabled={saving || !amount}
                className="flex-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirm Starting Cash</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Denomination Calculator View */
          <div className="flex flex-col">
            <div className="p-4 overflow-y-auto max-h-[50vh] space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60">
              {denominations.map((d) => (
                <div key={d.value} className="flex items-center justify-between pt-2 pb-1 first:pt-0">
                  <span className="text-xs font-semibold w-16 text-slate-800 dark:text-slate-200">{d.label}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-slate-400">×</span>
                    <input 
                      type="number" 
                      min="0"
                      value={counts[d.value] || ''}
                      onChange={(e) => setCounts(prev => ({ ...prev, [d.value]: parseInt(e.target.value) || 0 }))}
                      className="w-18 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right text-xs outline-none text-slate-900 dark:text-slate-100 font-mono font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500"
                      placeholder="0"
                    />
                    <span className="text-xs font-mono font-bold w-20 text-right text-slate-900 dark:text-slate-100">
                      €{(counts[d.value] * d.value).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">Calculated Float</p>
                <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">€{calcTotal.toFixed(2)}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalculator(false)}
                  className="py-2 px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAmount(calcTotal.toFixed(2));
                    setShowCalculator(false);
                  }}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Apply Amount
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};