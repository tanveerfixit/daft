import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Plus, Minus } from 'lucide-react';
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
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(item.discountType || 'fixed');
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

  const setQuickDiscount = (val: number) => {
    if (parseFloat(discount) === val) {
      setDiscount('0');
    } else {
      setDiscount(String(val));
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 font-sans animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-lg overflow-hidden shadow-2xl rounded-none flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <div className="min-w-0 pr-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate">
              {item.product_name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
              {item.sku_code && <span>SKU: {item.sku_code}</span>}
              {item.imei && <span className="text-blue-600 dark:text-blue-400 font-semibold">IMEI: {item.imei}</span>}
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 text-sm">
          <div className="grid grid-cols-2 gap-4">
            {/* Unit Price */}
            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1 block">
                Unit Price (€)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-neutral-500">€</span>
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
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 pl-8 pr-3 py-2 text-sm font-mono font-bold text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 rounded-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1 block">
                Quantity {item.product_type === 'serialized' ? '(Fixed)' : ''}
              </label>
              <div className="flex items-center gap-1">
                {item.product_type !== 'serialized' && (
                  <button
                    type="button"
                    onClick={() => handleStepQuantity(-1)}
                    disabled={(parseInt(quantity) || 1) <= 1}
                    className="w-9 h-9 flex items-center justify-center rounded-none border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
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
                  className={`w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm font-mono font-bold text-center text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 rounded-none ${
                    item.product_type === 'serialized' ? 'opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-900' : ''
                  }`}
                  placeholder="1"
                />
                {item.product_type !== 'serialized' && (
                  <button
                    type="button"
                    onClick={() => handleStepQuantity(1)}
                    className="w-9 h-9 flex items-center justify-center rounded-none border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 cursor-pointer shrink-0"
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

          {/* Discount Section with Quick Chips Below Input */}
          <div>
            <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1 block">
              Discount
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(e.target.value.replace(/[^0-9.]/g, ''))}
                onFocus={(e) => e.target.select()}
                className="flex-1 bg-white border border-neutral-300 px-3 py-2 text-sm font-mono font-bold text-neutral-900 outline-none focus:border-blue-500 rounded-none"
                placeholder="0"
              />
              <select 
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                className="bg-white border border-neutral-300 px-3 py-2 text-sm font-bold text-neutral-900 outline-none focus:border-blue-500 rounded-none font-mono cursor-pointer"
              >
                <option value="fixed">€</option>
                <option value="percentage">%</option>
              </select>
            </div>

            {/* Quick Selection Buttons Under the Input Field on Left Side */}
            <div className="flex items-center gap-1.5 mt-2 justify-start">
              {[5, 10, 15, 20].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQuickDiscount(val)}
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-none border transition-all cursor-pointer ${
                    parseFloat(discount) === val
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-neutral-300 bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                  }`}
                >
                  {discountType === 'percentage' ? `${val}%` : `€${val}`}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1 block">
              Item Notes (Printed on Receipt & Invoice)
            </label>
            <textarea 
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 rounded-none resize-none"
              placeholder="e.g., Replacement screen warranty, customer request notes..."
            />
          </div>

          {/* Subtotal / Total Summary */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Subtotal</p>
              <p className="text-base font-mono font-bold text-neutral-800 dark:text-neutral-200">€{subtotal.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Final Total</p>
              <p className="text-2xl font-mono font-black text-amber-500">€{total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none text-sm cursor-pointer"
          >
            Cancel [ESC]
          </button>
          <button 
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-none text-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <Save size={16} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
