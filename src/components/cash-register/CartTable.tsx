import React from 'react';
import { Trash2, Minus, Plus, Pencil, ExternalLink } from 'lucide-react';
import { CartRow } from './CartRow';
import { CartItem } from './types';

interface CartTableProps {
  cart: CartItem[];
  onUpdateQuantity: (id: number, delta: number, deviceId?: number) => void;
  onUpdatePrice: (id: number, newPrice: number, deviceId?: number) => void;
  onRemove: (id: number, deviceId?: number) => void;
  onOpenImeiSelector: (product: any) => void;
  onEdit: (item: CartItem) => void;
  onSelectProduct?: (id: number) => void;
}

export const CartTable: React.FC<CartTableProps> = ({
  cart,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
  onOpenImeiSelector,
  onEdit,
  onSelectProduct
}) => {
  return (
    <div className="bg-white dark:bg-black border border-[#d8d8d8] dark:border-neutral-800 rounded-none overflow-hidden font-sans transition-all duration-200">
      {/* Mobile Card View (hidden on md and up) */}
      <div className="md:hidden divide-y divide-[#d8d8d8] dark:divide-neutral-800 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {cart.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 italic text-sm">
            No product in cart. Scan or search above.
          </div>
        ) : (
          cart.map((item, idx) => {
            const itemPrice = Number(item.customPrice ?? item.selling_price ?? 0);
            let itemTotal = itemPrice * (Number(item.quantity) || 1);
            if (item.discount) {
              const d = Number(item.discount) || 0;
              if (item.discountType === 'percentage') {
                itemTotal = itemTotal * (1 - d / 100);
              } else {
                itemTotal = itemTotal - d;
              }
            }
            itemTotal = Math.max(0, isNaN(itemTotal) ? 0 : itemTotal);

            return (
              <div key={`${item.id}-${item.device_id || idx}`} className="p-3.5 space-y-2.5 bg-white dark:bg-black">
                {/* Row 1: Item Name, SKU, Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs text-neutral-400 font-bold">#{idx + 1}</span>
                      <span className="font-medium text-neutral-900 dark:text-neutral-100 text-[15px]">
                        {item.product_name}
                      </span>
                      {(item.sku_code || item.barcode) && (
                        <button
                          type="button"
                          onClick={() => onSelectProduct?.(item.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono inline-flex items-center gap-0.5 cursor-pointer"
                          title="View Product"
                        >
                          <span>({item.sku_code || item.barcode})</span>
                          <ExternalLink size={11} className="opacity-70" />
                        </button>
                      )}
                    </div>

                    {/* Serial / IMEI */}
                    {item.imei && (
                      <div className="mt-1">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-mono inline-flex items-center gap-1">
                          <span>IMEI: {item.imei}</span>
                          <ExternalLink size={10} className="opacity-70" />
                        </span>
                      </div>
                    )}

                    {/* Notes or Discount */}
                    {item.notes && (
                      <div className="text-xs text-neutral-500 italic mt-0.5">
                        "{item.notes}"
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => onRemove(item.id, item.device_id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Row 2: Quantity controls, Unit Price, Total & Edit */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-850">
                  {/* Quantity Stepper */}
                  <div className="flex items-center border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
                    {item.product_type !== 'serialized' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, -1, item.device_id)}
                          disabled={(Number(item.quantity) || 1) <= 1}
                          className="px-2.5 py-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                          title="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="px-3 py-1 font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 min-w-[28px] text-center">
                          {item.quantity || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, 1, item.device_id)}
                          className="px-2.5 py-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                          title="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
                        Qty: 1 (Serial)
                      </span>
                    )}
                  </div>

                  {/* Price details and Edit button */}
                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <div className="text-[11px] text-neutral-500 font-mono">
                        €{itemPrice.toFixed(2)} / ea
                        {item.discount && (
                          <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                            (-{item.discount}{item.discountType === 'percentage' ? '%' : '€'})
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        €{itemTotal.toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="p-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                      title="Edit price/discount"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (hidden on mobile, 100% original on md and up) */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar">
        <table className="w-full min-w-[540px] md:min-w-0 text-[15px] sm:text-[16px] border-collapse">
          <thead className="sticky top-0 z-10" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
              <th className="text-center px-2 py-1.5 w-10 border-r border-neutral-300 dark:border-neutral-700">#</th>
              <th className="text-center px-3 py-1.5 border-r border-neutral-300 dark:border-neutral-700">Description</th>
              <th className="text-center px-2 py-1.5 whitespace-nowrap w-28 border-r border-neutral-300 dark:border-neutral-700">Need/Have/OnPO</th>
              <th className="text-center px-3 py-1.5 whitespace-nowrap w-24 border-r border-neutral-300 dark:border-neutral-700">Unit Price</th>
              <th className="text-center px-3 py-1.5 whitespace-nowrap w-24 border-r border-neutral-300 dark:border-neutral-700">Total</th>
              <th className="text-center px-2 py-1.5 w-14">
                <Trash2 className="w-4 h-4 text-neutral-500 inline-block" />
              </th>
            </tr>
          </thead>
          <tbody id="cart-body" className="divide-y divide-[#d8d8d8] dark:divide-neutral-800">
            {cart.length === 0 ? (
              <tr id="cart-empty-row">
                <td colSpan={6} className="text-center italic text-neutral-400 py-6 text-[15px]">
                  No product in cart.
                </td>
              </tr>
            ) : (
              cart.map((item, idx) => (
                <CartRow 
                  key={`${item.id}-${item.device_id || idx}`}
                  item={item}
                  index={idx}
                  onUpdateQuantity={onUpdateQuantity}
                  onUpdatePrice={onUpdatePrice}
                  onRemove={onRemove}
                  onOpenImeiSelector={onOpenImeiSelector}
                  onEdit={onEdit}
                  onSelectProduct={onSelectProduct}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
