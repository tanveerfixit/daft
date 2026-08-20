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
    <tr className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      {/* Index Column */}
      <td className="py-2 pl-3 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-400 font-bold">
        <span>#{index + 1}</span>
      </td>

      {/* Description Column */}
      <td className="py-2 px-3 min-w-[250px] border-r border-slate-200 dark:border-slate-800 font-sans">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2 flex-wrap font-sans">
            <span className="text-base font-semibold text-slate-900 dark:text-white leading-tight font-sans">{item.product_name}</span>
            <button 
              onClick={() => onSelectProduct?.(item.id)}
              className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline uppercase"
            >
              {item.sku_code || item.barcode || `SKU-${item.id}`}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap font-sans">
            {item.device_id && (
              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-mono">
                <Smartphone size={12} />
                {item.imei}
              </span>
            )}
            {item.discount && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                -{item.discount}{item.discountType === 'percentage' ? '%' : '€'}
              </span>
            )}
          </div>
          {item.notes && (
            <p className="text-xs text-slate-400 italic mt-0.5 line-clamp-1">"{item.notes}"</p>
          )}
        </div>
      </td>

      {/* Metrics Column (Need/Have/OnPO) */}
      <td className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-center gap-2 text-sm font-mono">
          <div className="flex flex-col items-center" title="Need">
            <span className="text-slate-400">0</span>
          </div>
          <div className="w-[1px] h-4 bg-slate-200 dark:border-slate-700" />
          <div className="flex flex-col items-center" title="Have">
            <span className={`font-bold ${(item.total_stock || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {item.total_stock || 0}
            </span>
          </div>
          <div className="w-[1px] h-4 bg-slate-200 dark:border-slate-700" />
          <div className="flex flex-col items-center" title="OnPO">
            <span className="text-slate-400">0</span>
          </div>
        </div>
      </td>

      {/* Quantity Column */}
      <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-center gap-1.5">
          {item.product_type === 'serialized' ? (
            <span className="w-20 text-center font-mono font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 py-1 rounded-md border border-blue-200 dark:border-blue-800">
              QTY: 1
            </span>
          ) : (
            <>
              <button 
                onClick={() => onUpdateQuantity(item.id, -1, item.device_id)}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <Minus size={13} />
              </button>
              <span className="w-8 text-center font-mono font-bold text-base text-slate-900 dark:text-white">{item.quantity}</span>
              <button 
                onClick={() => onUpdateQuantity(item.id, 1, item.device_id)}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <Plus size={13} />
              </button>
            </>
          )}
        </div>
      </td>

      {/* Unit Price Column */}
      <td className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-800 font-mono text-base font-semibold text-slate-800 dark:text-slate-200">
        <span>€{itemPrice.toFixed(2)}</span>
      </td>

      {/* Total Column */}
      <td className="py-2 px-3 text-right border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-base text-slate-900 dark:text-white">
        <span>€{total.toFixed(2)}</span>
      </td>

      {/* Actions Column */}
      <td className="py-2 pr-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <button 
            onClick={() => onEdit(item)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            title="Edit Item"
          >
            <Pencil size={15} />
          </button>
          <button 
            onClick={() => onRemove(item.id, item.device_id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
            title="Remove Item"
          >
            <Trash2 size={15} className="text-rose-500" />
          </button>
        </div>
      </td>
    </tr>
  );
};
