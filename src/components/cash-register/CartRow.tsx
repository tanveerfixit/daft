import React from 'react';
import { Minus, Plus, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { CartItem } from './types';

interface CartRowProps {
  item: CartItem;
  index: number;
  onUpdateQuantity: (id: number, delta: number, deviceId?: number) => void;
  onUpdatePrice: (id: number, newPrice: number, deviceId?: number) => void;
  onRemove: (id: number, deviceId?: number) => void;
  onOpenImeiSelector: (product: any) => void;
  onEdit: (item: CartItem) => void;
  onSelectProduct?: (id: number) => void;
}

export const CartRow: React.FC<CartRowProps> = ({
  item,
  index,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
  onOpenImeiSelector,
  onEdit,
  onSelectProduct
}) => {
  const itemPrice = Number(item.customPrice ?? item.selling_price ?? 0);
  
  // Calculate total with discount
  let total = itemPrice * (Number(item.quantity) || 1);
  if (item.discount) {
    const d = Number(item.discount) || 0;
    if (item.discountType === 'percentage') {
      total = total * (1 - d / 100);
    } else {
      total = total - d;
    }
  }
  total = Math.max(0, isNaN(total) ? 0 : total);

  return (
    <tr className="cart-row border-b border-[#d8d8d8] dark:border-neutral-800 hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40 transition-colors bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 text-[16px]">
      {/* Index Column */}
      <td className="text-center px-1 py-2 border-r border-[#d8d8d8] dark:border-neutral-800 text-neutral-500 font-mono w-10 text-[15px]">
        {index + 1}
      </td>

      {/* Description Column: Product Name (Not bold, 16px) + SKU + Serial/IMEI all on the same line */}
      <td className="text-left px-3 py-2 border-r border-[#d8d8d8] dark:border-neutral-800">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Product Name (Not Bold, 16px) */}
          <span className="font-normal text-neutral-900 dark:text-neutral-100 text-[16px]">
            {item.product_name}
          </span>

          {/* SKU next to name */}
          {(item.sku_code || item.barcode) && (
            <button 
              type="button"
              onClick={() => onSelectProduct?.(item.id)}
              className="text-[14px] text-blue-600 dark:text-blue-400 hover:underline font-mono inline-flex items-center gap-0.5 cursor-pointer"
              title="View Product"
            >
              <span>({item.sku_code || item.barcode})</span>
              <ExternalLink size={12} className="inline opacity-70" />
            </button>
          )}

          {/* Serial / IMEI next to name */}
          {item.imei && (
            <span className="text-[14px] text-blue-600 dark:text-blue-400 hover:underline font-mono inline-flex items-center gap-0.5 cursor-pointer">
              <span>({item.imei})</span>
              <ExternalLink size={12} className="inline opacity-70" />
            </span>
          )}

          {/* Discount Tag (if any) */}
          {item.discount ? (
            <span className="text-[14px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              (-{item.discount}{item.discountType === 'percentage' ? '%' : '€'})
            </span>
          ) : null}

          {/* Item Notes (if any) */}
          {item.notes && (
            <span className="text-[13px] text-neutral-500 italic">
              - "{item.notes}"
            </span>
          )}
        </div>
      </td>

      {/* Need / Have / OnPO Column */}
      <td className="text-center px-2 py-2 border-r border-[#d8d8d8] dark:border-neutral-800 whitespace-nowrap w-28 font-mono text-[16px]">
        <div className="flex items-center justify-center gap-1.5">
          {/* Subtle minus button for non-serialized */}
          {item.product_type !== 'serialized' && (Number(item.quantity) || 1) > 1 && (
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, -1, item.device_id)}
              className="text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors p-0.5 cursor-pointer"
              title="Decrease quantity"
            >
              <Minus size={13} />
            </button>
          )}

          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {item.quantity || 1}
          </span>

          {/* Subtle plus button for non-serialized */}
          {item.product_type !== 'serialized' && (
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.id, 1, item.device_id)}
              className="text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors p-0.5 cursor-pointer"
              title="Increase quantity"
            >
              <Plus size={13} />
            </button>
          )}

          <span className="text-neutral-300 dark:text-neutral-700">/</span>
          <span className={`font-semibold ${(item.total_stock || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {item.total_stock !== undefined ? item.total_stock : '0'}
          </span>
          <span className="text-neutral-300 dark:text-neutral-700">/</span>
          <span className="text-neutral-400">0</span>
        </div>
      </td>

      {/* Unit Price Column */}
      <td className="text-right px-3 py-2 border-r border-[#d8d8d8] dark:border-neutral-800 whitespace-nowrap font-mono text-[16px] text-neutral-800 dark:text-neutral-200 w-24">
        €{itemPrice.toFixed(2)}
      </td>

      {/* Total Column */}
      <td className="cart-row-total text-right px-3 py-2 border-r border-[#d8d8d8] dark:border-neutral-800 whitespace-nowrap font-mono font-semibold text-[16px] text-neutral-900 dark:text-neutral-100 w-24">
        €{total.toFixed(2)}
      </td>

      {/* Actions Column */}
      <td className="text-center px-2 py-2 whitespace-nowrap w-14">
        <div className="flex items-center justify-center gap-2">
          <button 
            type="button"
            onClick={() => onEdit(item)}
            className="text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-0.5 cursor-pointer"
            title="Edit Item"
          >
            <Pencil size={15} />
          </button>
          <button 
            type="button" 
            onClick={() => onRemove(item.id, item.device_id)}
            className="remove-row-btn text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-0.5 cursor-pointer" 
            aria-label="Remove item"
            title="Remove Item"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
};
