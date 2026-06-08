import React, { useState, useEffect } from 'react';
import { X, Save, Info } from 'lucide-react';
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
  // Use string states to allow empty inputs during typing (Senior UX approach)
  const [unitPrice, setUnitPrice] = useState<string>(String(item.customPrice ?? item.selling_price));
  const [quantity, setQuantity] = useState<string>(String(item.quantity));
  const [discount, setDiscount] = useState<string>(String(item.discount || 0));
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(item.discountType || 'percentage');
  const [notes, setNotes] = useState<string>(item.notes || '');

  const [subtotal, setSubtotal] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const p = parseFloat(unitPrice) || 0;
    const q = parseInt(quantity) || 0;
    const d = parseFloat(discount) || 0;

    const calculatedSubtotal = p * q;
    let calculatedTotal = calculatedSubtotal;

    if (discountType === 'percentage') {
      calculatedTotal = calculatedSubtotal * (1 - d / 100);
    } else {
      calculatedTotal = calculatedSubtotal - d;
    }

    setSubtotal(calculatedSubtotal);
    setTotal(Math.max(0, calculatedTotal));
  }, [unitPrice, quantity, discount, discountType]);

  const handleSave = () => {
    const q = parseInt(quantity);
    if (isNaN(q) || q <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    // Stock validation for non-serialized items
    if (item.product_type !== 'serialized' && !item.allow_overselling) {
      const available = item.total_stock || 0;
      if (q > available) {
        alert(`Cannot set quantity to ${q}. Only ${available} available in stock.`);
        return;
      }
    }
    
    onSave({
      customPrice: parseFloat(unitPrice) || 0,
      quantity: q,
      discount: parseFloat(discount) || 0,
      discountType,
      notes
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 font-mono text-[16px] animate-in fade-in duration-200">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-[620px] overflow-hidden flex flex-col rounded-none shadow-none text-[16px] animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="bg-neutral-200 dark:bg-neutral-900 px-4 py-2 border-b border-neutral-300 dark:border-neutral-800 rounded-none flex justify-between items-center">
          <h3 className="text-base font-bold text-black dark:text-white uppercase tracking-wider">Update POS Cart</h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-750 dark:hover:text-neutral-350 transition-colors bg-transparent border-0 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 bg-white dark:bg-black">
          {/* Product Info Display (matches register styling) */}
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-3 flex flex-col space-y-1 rounded-none shadow-none">
            <p className="text-[15px] font-bold text-neutral-900 dark:text-neutral-100">{item.product_name}</p>
            <p className="text-[11px] text-neutral-500 font-mono uppercase mt-0.5">{item.sku_code || 'No SKU'}</p>
          </div>

          <div className="space-y-4">
            {/* Unit Price Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
              <span className="w-full sm:w-1/3 font-bold text-neutral-900 dark:text-neutral-100">Unit Price:</span>
              <div className="flex-1 flex justify-start">
                <input 
                  type="text"
                  autoFocus
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                  onFocus={(e) => e.target.select()}
                  className="w-full sm:w-40 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1 text-[16px] text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono"
                  placeholder="0.00"
                />
              </div>
              <span className="w-full sm:w-1/4 text-left sm:text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                €{(parseFloat(unitPrice || '0') * parseInt(quantity || '0')).toFixed(2)}
              </span>
            </div>

            {/* QTY Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
              <span className="w-full sm:w-1/3 font-bold text-neutral-900 dark:text-neutral-100">
                QTY <span className="text-red-500 font-bold">*</span>:
              </span>
              <div className="flex-1 flex justify-start">
                <input 
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                  onFocus={(e) => e.target.select()}
                  disabled={item.product_type === 'serialized'}
                  className={`w-full sm:w-40 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1 text-[16px] text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono ${
                    item.product_type === 'serialized' ? 'opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-900' : ''
                  }`}
                  placeholder="0"
                />
              </div>
              <span className="w-full sm:w-1/3 text-left sm:text-right font-bold text-neutral-500 dark:text-neutral-400">
                Subtotal: <span className="font-mono text-neutral-900 dark:text-neutral-100">€{subtotal.toFixed(2)}</span>
              </span>
            </div>

            {/* Discount Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
              <span className="w-full sm:w-1/3 font-bold text-neutral-900 dark:text-neutral-100">Discount :</span>
              <div className="flex-1 flex justify-start items-center">
                <div className="flex border border-neutral-300 dark:border-neutral-800 w-full sm:w-40">
                  <input 
                    type="text"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value.replace(/[^0-9.]/g, ''))}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-white dark:bg-black px-2 py-1 text-[16px] text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono border-0"
                    placeholder="0.00"
                  />
                  <select 
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className="bg-neutral-200 dark:bg-neutral-900 px-1 py-1 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none border-l border-neutral-300 dark:border-neutral-800 font-sans"
                  >
                    <option value="percentage" className="bg-white dark:bg-black">%</option>
                    <option value="fixed" className="bg-white dark:bg-black">€</option>
                  </select>
                </div>
              </div>
              <span className="w-full sm:w-1/4 text-left sm:text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                €{(discountType === 'percentage' ? (subtotal * (parseFloat(discount || '0') / 100)) : parseFloat(discount || '0')).toFixed(2)}
              </span>
            </div>

            <hr className="border-t border-neutral-300 dark:border-neutral-800 my-2" />

            {/* Total Row */}
            <div className="flex justify-end font-mono">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 text-lg">
                Total: €{total.toFixed(2)}
              </span>
            </div>

            {/* Notes / Additional Description Row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
              <span className="w-full sm:w-1/3 font-bold text-neutral-900 dark:text-neutral-100 sm:pt-1">Additional Description:</span>
              <div className="flex-1 w-full">
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-[16px] text-neutral-900 dark:text-neutral-100 focus:outline-none font-sans min-h-[60px]"
                  placeholder=""
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex border-t border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-955 p-3 justify-end gap-2 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-4 rounded-none text-[15px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-1 px-5 rounded-none text-[15px] border border-amber-500 hover:border-amber-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};
