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
    <tr className="cart-row border-b border-[#d8d8d8] hover:bg-gray-50/50 transition-colors bg-white text-[#333333]">
      {/* Index Column */}
      <td className="text-center px-0.5 py-2 border-r border-[#d8d8d8]">
        {index + 1}
      </td>

      {/* Description Column */}
      <td className="text-left px-3 py-2 border-r border-[#d8d8d8]">
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className="font-medium text-[#333333] leading-tight">
              {item.product_name}
            </span>
            <button 
              type="button"
              onClick={() => onSelectProduct?.(item.id)}
              className="text-xs text-blue-600 hover:underline font-mono"
              title="View Product"
            >
              {item.sku_code || item.barcode || `SKU-${item.id}`}
            </button>
          </div>
          
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
            {item.device_id && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-[#333333] px-1.5 py-0.5 rounded border border-[#d8d8d8] font-mono">
                <Smartphone className="w-3 h-3" />
                {item.imei}
              </span>
            )}
            {item.discount && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                -{item.discount}{item.discountType === 'percentage' ? '%' : '€'}
              </span>
            )}
            {item.product_type !== 'serialized' && (
              <div className="inline-flex items-center gap-1 border border-[#d8d8d8] rounded px-1 py-0.5 bg-gray-50">
                <button 
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, -1, item.device_id)}
                  className="text-[#333333] hover:text-black p-0.5"
                  title="Decrease Qty"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-semibold px-1 min-w-4 text-center">{item.quantity}</span>
                <button 
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, 1, item.device_id)}
                  className="text-[#333333] hover:text-black p-0.5"
                  title="Increase Qty"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          {item.notes && (
            <p className="text-xs text-[#757575] italic mt-0.5 line-clamp-1">"{item.notes}"</p>
          )}
        </div>
      </td>

      {/* Need/Have/OnPO Column */}
      <td className="text-center px-2 py-2 border-r border-[#d8d8d8] whitespace-nowrap">
        <div className="flex items-center justify-center gap-1 font-mono text-sm">
          <span className="text-[#757575]">0</span>
          <span className="text-[#d8d8d8]">/</span>
          <span className={`font-semibold ${(item.total_stock || 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {item.total_stock !== undefined ? item.total_stock : 'Have'}
          </span>
          <span className="text-[#d8d8d8]">/</span>
          <span className="text-[#757575]">0</span>
        </div>
      </td>

      {/* Unit Price Column */}
      <td className="text-right px-2 py-2 border-r border-[#d8d8d8] whitespace-nowrap font-mono">
        €{itemPrice.toFixed(2)}
      </td>

      {/* Total Column */}
      <td className="cart-row-total text-right px-2 py-2 border-r border-[#d8d8d8] whitespace-nowrap font-mono font-medium">
        €{total.toFixed(2)}
      </td>

      {/* Actions Column */}
      <td className="text-center px-1 py-2 whitespace-nowrap">
        <div className="flex items-center justify-center gap-1">
          <button 
            type="button"
            onClick={() => onEdit(item)}
            className="text-[#757575] hover:text-[#333333] transition-colors p-1 cursor-pointer"
            title="Edit Item"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            onClick={() => onRemove(item.id, item.device_id)}
            className="remove-row-btn text-[#333333] hover:text-[#ff6347] transition-colors p-1 cursor-pointer" 
            aria-label="Remove item"
            title="Remove Item"
          >
            <Trash2 className="w-3.5 h-3.5 inline-block" />
          </button>
        </div>
      </td>
    </tr>
  );
};

