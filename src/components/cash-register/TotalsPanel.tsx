import React from 'react';

interface TotalsPanelProps {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  totalQty?: number;
  taxOption?: string;
  setTaxOption?: (opt: string) => void;
}

export const TotalsPanel: React.FC<TotalsPanelProps> = ({
  subtotal,
  tax,
  discount,
  total,
  totalQty = 0,
  taxOption = '0-excluded',
  setTaxOption
}) => {
  return (
    <div className="bg-white border border-[#d8d8d8] rounded p-5 flex flex-col gap-4" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[#333333]">Taxable Total :</span>
        <span className="text-[#333333]">€{subtotal.toFixed(2)}</span>
      </div>

      {discount > 0 && (
        <div className="flex items-center justify-between">
          <span className="font-semibold text-emerald-600">Discount :</span>
          <span className="text-emerald-600 font-medium">-€{discount.toFixed(2)}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-[#333333]">Tax:</span>
        <select 
          value={taxOption}
          onChange={(e) => setTaxOption?.(e.target.value)}
          className="w-28 border border-[#d8d8d8] rounded px-2 py-1.5 bg-white text-[#333333] text-sm outline-none"
        >
          <option value="0-excluded">0%</option>
          <option value="23-excluded">23% Ex.</option>
          <option value="23-included">23% Inc.</option>
        </select>
        <span className="text-[#333333]">€{tax.toFixed(2)}</span>
      </div>

      <hr className="border-[#d8d8d8]" />

      <div className="text-[#333333]">
        Total Time/QTY: <span className="font-semibold">{totalQty}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-bold text-[#333333]">Grand Total :</span>
        <span className="font-bold text-[#333333] text-xl">€{total.toFixed(2)}</span>
      </div>
    </div>
  );
};

