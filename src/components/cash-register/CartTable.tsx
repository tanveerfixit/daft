import React from 'react';
import { Trash2 } from 'lucide-react';
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
    <div className="bg-white border border-[#d8d8d8] rounded overflow-hidden transition-all duration-200" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div className="overflow-y-auto max-h-[60vh] custom-scrollbar">
        <table className="w-full text-base border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#e5e7eb] text-[#333333]">
              <th className="text-center font-semibold px-1 py-1.5 w-10 border-r border-[#d8d8d8]">#</th>
              <th className="text-left font-semibold px-3 py-1.5 border-r border-[#d8d8d8]">Description</th>
              <th className="text-center font-semibold px-2 py-1.5 whitespace-nowrap w-28 border-r border-[#d8d8d8]">Need/Have/OnPO</th>
              <th className="text-right font-semibold px-2 py-1.5 whitespace-nowrap w-24 border-r border-[#d8d8d8]">Unit Price</th>
              <th className="text-right font-semibold px-2 py-1.5 whitespace-nowrap w-24 border-r border-[#d8d8d8]">Total</th>
              <th className="text-center px-1 py-1.5 w-16">
                <Trash2 className="w-4 h-4 text-[#333333] inline-block" />
              </th>
            </tr>
          </thead>
          <tbody id="cart-body">
            {cart.length === 0 ? (
              <tr id="cart-empty-row">
                <td colSpan={6} className="text-center italic text-[#808080] py-3 text-base">
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

