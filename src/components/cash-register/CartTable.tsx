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

export const CartTable: React.FC<CartTableProps> = React.memo(({
  cart,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
  onOpenImeiSelector,
  onEdit,
  onSelectProduct
}) => {
  return (
    <div className="bg-white border border-neutral-200 overflow-hidden font-sans flex flex-col lg:h-full">
      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-neutral-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {cart.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">
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
              <div key={`${item.id}-${item.device_id || idx}`} className="p-3.5 space-y-2.5 bg-white">
                {/* Row 1: Item Name, SKU, Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs text-neutral-400 font-semibold">#{idx + 1}</span>
                      <span className="font-medium text-neutral-900 text-sm">
                        {item.product_name}
                      </span>
                      {(item.sku_code || item.barcode) && (
                        <button
                          type="button"
                          onClick={() => onSelectProduct?.(item.id)}
                          className="text-xs text-blue-600 hover:underline font-mono inline-flex items-center gap-0.5 cursor-pointer"
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
                        <span className="text-xs text-blue-600 font-mono inline-flex items-center gap-1">
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
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-neutral-100 transition-colors shrink-0 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Row 2: Quantity controls, Unit Price, Total & Edit */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                  <div className="flex items-center border border-neutral-300 bg-neutral-50">
                    {item.product_type !== 'serialized' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, -1, item.device_id)}
                          disabled={(Number(item.quantity) || 1) <= 1}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-neutral-600 hover:bg-neutral-200 disabled:opacity-30 cursor-pointer"
                          title="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="px-2 py-1 tabular-nums font-semibold text-sm text-neutral-900 min-w-[28px] text-center">
                          {item.quantity || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, 1, item.device_id)}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                          title="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 font-mono font-semibold text-xs text-neutral-900">
                        Qty: 1 (Serial)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right tabular-nums">
                      <div className="text-xs text-neutral-500">
                        €{itemPrice.toFixed(2)} / ea
                        {item.discount && (
                          <span className="text-emerald-600 ml-1">
                            (-{item.discount}{item.discountType === 'percentage' ? '%' : '€'})
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-neutral-900">
                        €{itemTotal.toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 cursor-pointer"
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

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 min-h-[260px] custom-scrollbar">
        <table className="w-full min-w-[540px] md:min-w-0 text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-neutral-100 border-b border-neutral-200 text-xs font-medium text-neutral-600 uppercase tracking-wider text-center">
              <th className="text-center px-2 py-2.5 w-10">#</th>
              <th className="text-left px-3 py-2.5">Description</th>
              <th className="text-center px-2 py-2.5 whitespace-nowrap w-28">Need/Have/OnPO</th>
              <th className="text-right px-3 py-2.5 whitespace-nowrap w-24">Unit Price</th>
              <th className="text-right px-3 py-2.5 whitespace-nowrap w-24">Total</th>
              <th className="text-center px-2 py-2.5 w-12">
                <Trash2 className="w-4 h-4 text-neutral-500 inline-block" />
              </th>
            </tr>
          </thead>
          <tbody id="cart-body" className="divide-y divide-neutral-100">
            {cart.length === 0 ? (
              <tr id="cart-empty-row">
                <td colSpan={6} className="text-center text-neutral-400 py-10 text-sm">
                  No product in cart. Scan barcode or search above.
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
});
