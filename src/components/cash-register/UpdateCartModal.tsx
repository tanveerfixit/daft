import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Info, Plus, Minus } from 'lucide-react';
import { CartItem } from './types';

interface UpdateCartModalProps {
  item: CartItem;
  onClose: () => void;
  onSave: (updatedItem: Partial<CartItem>) => void;
}

export const UpdateCartModal: React.FC<UpdateCartModalProps> = ({
  item,
  onClose,
  onSave
}) => {
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Use string states to allow empty inputs during typing
  const [unitPrice, setUnitPrice] = useState<string>(String(item.customPrice ?? item.selling_price ?? 0));
  const [quantity, setQuantity] = useState<string>(String(item.quantity || 1));
  const [discount, setDiscount] = useState<string>(String(item.discount || 0));
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(item.discountType || 'percentage');
  const [notes, setNotes] = useState<string>(item.notes || '');

  const [subtotal, setSubtotal] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  // Auto-focus and auto-select price input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (priceInputRef.current) {
        priceInputRef.current.focus();
        priceInputRef.current.select();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Recalculate totals
  useEffect(() => {
    const p = parseFloat(unitPrice) || 0;
    const q = parseInt(quantity) || 0;
    const d = parseFloat(discount) || 0;

    const calculatedSubtotal = p * q;
    let calculatedTotal = calculatedSubtotal;

    if (discountType === 'percentage') {
      calculatedTotal = calculatedSubtotal * (1 - Math.min(100, Math.max(0, d)) / 100);
    } else {
      calculatedTotal = Math.max(0, calculatedSubtotal - d);
    }

    setSubtotal(calculatedSubtotal);
    setTotal(Math.max(0, calculatedTotal));
  }, [unitPrice, quantity, discount, discountType]);

  const handleSave = () => {
    const q = parseInt(quantity);
    if (isNaN(q) || q <= 0) {
      alert('Quantity must be at least 1');
      return;
    }

    // Stock validation for non-serialized items
    if (item.product_type !== 'serialized' && !(item as any).allow_overselling) {
      const available = (item as any).total_stock || 0;
      if (available > 0 && q > available) {
        alert(`Cannot set quantity to ${q}. Only ${available} available in stock.`);
        return;
      }
    }
    
    onSave({
      customPrice: Math.max(0, parseFloat(unitPrice) || 0),
      quantity: q,
      discount: Math.max(0, parseFloat(discount) || 0),
      discountType,
      notes: notes.trim()
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleStepQuantity = (delta: number) => {
    if (item.product_type === 'serialized') return;
    const curr = parseInt(quantity) || 1;
    const nextVal = Math.max(1, curr + delta);
    setQuantity(String(nextVal));
  };

  const setQuickDiscount = (pct: number) => {
    setDiscountType('percentage');
    setDiscount(String(pct));
  };

  return (
    <div 
      className="fixed inset-0 bg-black/65 flex items-center justify-center z-[110] p-2 sm:p-4 animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-[var(--bg-card)] w-full max-w-lg overflow-hidden border border-[var(--border-base)] rounded-lg shadow-2xl">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-[var(--border-base)] flex justify-between items-center bg-[var(--bg-header)]">
          <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-wider">
            Update Cart Item
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--bg-hover)] text-[var(--text-muted-more)] hover:text-[var(--text-main)] transition-colors rounded-sm cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Product Banner */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-md">
            <Info size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-blue-900 dark:text-blue-200 truncate">{item.product_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-blue-700 dark:text-blue-400 font-mono font-semibold uppercase">{item.sku_code || 'No SKU'}</span>
                {item.imei && (
                  <span className="text-xs text-blue-800 dark:text-blue-300 font-mono font-bold bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.2 rounded-xs">
                    IMEI: {item.imei}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Unit Price */}
            <div>
              <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1 block">
                Unit Price (€)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-[var(--text-muted)]">€</span>
                <input 
                  ref={priceInputRef}
                  type="text"
                  inputMode="decimal"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    const parsed = parseFloat(unitPrice);
                    if (!isNaN(parsed) && unitPrice !== '') {
                      setUnitPrice(parsed.toFixed(2));
                    }
                  }}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-base)] pl-8 pr-3 py-2 text-base font-mono font-bold text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1 block">
                Quantity {item.product_type === 'serialized' ? '(Fixed)' : ''}
              </label>
              <div className="flex items-center gap-1">
                {item.product_type !== 'serialized' && (
                  <button
                    type="button"
                    onClick={() => handleStepQuantity(-1)}
                    disabled={(parseInt(quantity) || 1) <= 1}
                    className="w-9 h-10 flex items-center justify-center rounded border border-[var(--border-base)] bg-[var(--bg-app)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    <Minus size={14} />
                  </button>
                )}
                <input 
                  type="text"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                  onFocus={(e) => e.target.select()}
                  disabled={item.product_type === 'serialized'}
                  className={`w-full bg-[var(--bg-app)] border border-[var(--border-base)] px-3 py-2 text-base font-mono font-bold text-center text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
                    item.product_type === 'serialized' ? 'opacity-50 cursor-not-allowed bg-neutral-200 dark:bg-neutral-900' : ''
                  }`}
                  placeholder="1"
                />
                {item.product_type !== 'serialized' && (
                  <button
                    type="button"
                    onClick={() => handleStepQuantity(1)}
                    className="w-9 h-10 flex items-center justify-center rounded border border-[var(--border-base)] bg-[var(--bg-app)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
              {item.product_type === 'serialized' && (
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Unique IMEI device (Qty: 1)</p>
              )}
            </div>
          </div>

          {/* Discount Section with Quick Chips */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
                Discount
              </label>
              <div className="flex gap-1">
                {[0, 5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setQuickDiscount(pct)}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      discountType === 'percentage' && parseFloat(discount) === pct
                        ? 'bg-blue-600 border-blue-600 text-white font-bold'
                        : 'border-[var(--border-base)] bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input 
                type="text"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(e.target.value.replace(/[^0-9.]/g, ''))}
                onFocus={(e) => e.target.select()}
                className="flex-1 bg-[var(--bg-app)] border border-[var(--border-base)] px-3.5 py-2 text-base font-mono font-bold text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                placeholder="0"
              />
              <select 
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                className="bg-[var(--bg-app)] border border-[var(--border-base)] px-4 py-2 text-base font-bold text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-blue-500 rounded font-mono cursor-pointer"
              >
                <option value="percentage">%</option>
                <option value="fixed">€</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1 block">
              Item Notes (Printed on Receipt & Invoice)
            </label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-base)] px-3.5 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] rounded placeholder:text-[var(--text-muted-more)]"
              placeholder="e.g., Replacement screen warranty, customer request notes..."
            />
          </div>

          {/* Subtotal / Total Summary */}
          <div className="pt-2.5 border-t border-[var(--border-base)] grid grid-cols-2 items-center">
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Subtotal</p>
              <p className="text-lg font-mono font-bold text-[var(--text-main)]">€{subtotal.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Final Total</p>
              <p className="text-2xl font-mono font-black text-blue-600 dark:text-blue-400">€{total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[var(--bg-app)] border-t border-[var(--border-base)] flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 font-bold text-[var(--text-main)] hover:bg-[var(--bg-hover)] border border-[var(--border-base)] uppercase text-xs tracking-widest transition-colors rounded cursor-pointer"
          >
            Cancel [ESC]
          </button>
          <button 
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 uppercase text-xs tracking-widest transition-colors rounded shadow-sm cursor-pointer"
          >
            <Save size={16} />
            Update Item [ENTER]
          </button>
        </div>
      </div>
    </div>
  );
};
