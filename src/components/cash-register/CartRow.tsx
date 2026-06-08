import React from 'react';
import { Minus, Plus, Trash2, Pencil, Smartphone } from 'lucide-react';
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
  const itemPrice = item.customPrice ?? item.selling_price;
  
  // Calculate total with discount
  let total = itemPrice * item.quantity;
  if (item.discount) {
    if (item.discountType === 'percentage') {
      total = total * (1 - item.discount / 100);
    } else {
      total = total - item.discount;
    }
  }
  total = Math.max(0, total);

  return (
    <tr className="group border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors bg-white dark:bg-black">
      {/* Index Column */}
      <td className="py-1.5 pl-2 text-center border-r border-neutral-300 dark:border-neutral-800 font-mono text-base text-neutral-500 font-bold">
        <span>#{index + 1}</span>
      </td>

      {/* Description Column */}
      <td className="py-1.5 px-2.5 min-w-[250px] border-r border-neutral-300 dark:border-neutral-800 font-sans">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2 flex-wrap font-sans">
            <span className="text-[18px] font-normal text-neutral-900 dark:text-neutral-100 leading-tight font-sans">{item.product_name}</span>
            <button 
              onClick={() => onSelectProduct?.(item.id)}
              className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline uppercase"
            >
              {item.sku_code || item.barcode || `SKU-${item.id}`}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap font-sans">
            {item.device_id && (
              <span className="inline-flex items-center gap-1 bg-neutral-200 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-xs px-1.5 py-0.5 rounded-none border border-neutral-300 dark:border-neutral-800 font-mono">
                <Smartphone size={12} />
                {item.imei}
              </span>
            )}
            {item.discount && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-none border border-emerald-500/20">
                -{item.discount}{item.discountType === 'percentage' ? '%' : '€'}
              </span>
            )}
          </div>
          {item.notes && (
            <p className="text-sm text-neutral-500 italic mt-1 line-clamp-1">"{item.notes}"</p>
          )}
        </div>
      </td>

      {/* Metrics Column (Need/Have/OnPO) */}
      <td className="py-1.5 px-2 text-center border-r border-neutral-300 dark:border-neutral-800">
        <div className="flex items-center justify-center gap-2 text-base font-mono">
          <div className="flex flex-col items-center" title="Need">
            <span className="text-neutral-650 dark:text-neutral-400">0</span>
          </div>
          <div className="w-[1px] h-4 bg-neutral-350 dark:bg-neutral-800" />
          <div className="flex flex-col items-center" title="Have">
            <span className={`font-bold ${(item.total_stock || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-650 dark:text-red-400'}`}>
              {item.total_stock || 0}
            </span>
          </div>
          <div className="w-[1px] h-4 bg-neutral-350 dark:bg-neutral-800" />
          <div className="flex flex-col items-center" title="OnPO">
            <span className="text-neutral-650 dark:text-neutral-400">0</span>
          </div>
        </div>
      </td>

      {/* Quantity Column */}
      <td className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-800">
        <div className="flex items-center justify-center gap-2">
          {item.product_type === 'serialized' ? (
            <span className="w-20 text-center font-mono font-bold text-[15px] text-blue-650 dark:text-blue-400 bg-blue-500/10 py-0.5 rounded-none border border-blue-200 dark:border-blue-800">
              QTY: 1
            </span>
          ) : (
            <>
              <button 
                onClick={() => onUpdateQuantity(item.id, -1, item.device_id)}
                className="w-6 h-6 flex items-center justify-center rounded-none border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors"
              >
                <Minus size={12} />
              </button>
              <span className="w-8 text-center font-mono font-bold text-[17px] text-neutral-900 dark:text-neutral-100">{item.quantity}</span>
              <button 
                onClick={() => onUpdateQuantity(item.id, 1, item.device_id)}
                className="w-6 h-6 flex items-center justify-center rounded-none border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors"
              >
                <Plus size={12} />
              </button>
            </>
          )}
        </div>
      </td>

      {/* Unit Price Column */}
      <td className="py-1.5 px-2 text-right border-r border-neutral-300 dark:border-neutral-800 font-mono text-neutral-900 dark:text-neutral-100">
        <span>€{itemPrice.toFixed(2)}</span>
      </td>

      {/* Total Column */}
      <td className="py-1.5 px-2 text-right border-r border-neutral-300 dark:border-neutral-800 font-mono font-bold text-neutral-900 dark:text-neutral-100">
        <span>€{total.toFixed(2)}</span>
      </td>

      {/* Actions Column */}
      <td className="py-1.5 pr-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <button 
            onClick={() => onEdit(item)}
            className="p-1 text-neutral-600 hover:text-blue-500 hover:bg-neutral-200 dark:hover:bg-neutral-900 rounded-none transition-colors"
            title="Edit Item"
          >
            <Pencil size={14} />
          </button>
          <button 
            onClick={() => onRemove(item.id, item.device_id)}
            className="p-1 text-neutral-650 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-neutral-900 rounded-none transition-colors"
            title="Remove Item"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        </div>
      </td>
    </tr>
  );
};
