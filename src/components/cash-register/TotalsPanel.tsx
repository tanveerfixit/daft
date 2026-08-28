import React from 'react';

interface TotalsPanelProps {
  subtotal: number;
  taxableTotal?: number;
  tax: number;
  discount: number;
  total: number;
  totalQty?: number;
  taxOption?: string;
  setTaxOption?: (opt: string) => void;
}

export const TotalsPanel: React.FC<TotalsPanelProps> = ({
  subtotal,
  taxableTotal,
  tax,
  discount,
  total,
  totalQty = 0,
  taxOption = '0-excluded',
  setTaxOption
}) => {
  const netTaxable = taxableTotal !== undefined ? taxableTotal : Math.max(0, subtotal - discount);

  return (
    <div className="bg-white border border-[#d8d8d8] rounded p-5 flex flex-col gap-3 font-sans">
      {/* Subtotal (Gross Amount before discount) */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-neutral-700">Subtotal :</span>
        <span className="font-mono font-medium text-neutral-900">€{subtotal.toFixed(2)}</span>
      </div>

      {/* Discount */}
      {discount > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-emerald-600">Discount :</span>
          <span className="font-mono font-semibold text-emerald-600">-€{discount.toFixed(2)}</span>
        </div>
      )}

      {/* Taxable Total (Net Amount after discount) */}
      {discount > 0 && (
        <div className="flex items-center justify-between text-sm bg-neutral-50 px-2 py-1 border border-neutral-200">
          <span className="font-semibold text-neutral-800">Taxable Total :</span>
          <span className="font-mono font-bold text-neutral-900">€{netTaxable.toFixed(2)}</span>
        </div>
      )}

      {/* Tax Rate & Amount */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-neutral-700">Tax:</span>
        <select 
          value={taxOption}
          onChange={(e) => setTaxOption?.(e.target.value)}
          className="w-28 border border-neutral-300 rounded px-2 py-1 bg-white text-neutral-800 text-xs outline-none cursor-pointer"
        >
          <option value="0-excluded">0%</option>
          <option value="23-excluded">23% Ex.</option>
          <option value="23-included">23% Inc.</option>
        </select>
        <span className="font-mono font-medium text-neutral-900">€{tax.toFixed(2)}</span>
      </div>

      <hr className="border-neutral-200" />

      <div className="text-neutral-600 text-xs">
        Total Items / QTY: <span className="font-bold text-neutral-900 font-mono">{totalQty}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-bold text-neutral-900 text-base">Grand Total :</span>
        <span className="font-black text-neutral-900 text-2xl font-mono">€{total.toFixed(2)}</span>
      </div>
    </div>
  );
};
