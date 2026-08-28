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
    <div className="bg-white dark:bg-black border border-[#d8d8d8] dark:border-neutral-800 rounded-none overflow-hidden font-sans transition-all duration-200">
      <div className="overflow-y-auto max-h-[60vh] custom-scrollbar">
        <table className="w-full text-[16px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-[#d8d8d8] dark:border-neutral-800 text-[14px] font-bold text-neutral-800 dark:text-neutral-200">
              <th className="text-center px-1 py-2 w-10 border-r border-[#d8d8d8] dark:border-neutral-800">#</th>
              <th className="text-left px-3 py-2 border-r border-[#d8d8d8] dark:border-neutral-800">Description</th>
              <th className="text-center px-2 py-2 whitespace-nowrap w-28 border-r border-[#d8d8d8] dark:border-neutral-800">Need/Have/OnPO</th>
              <th className="text-right px-3 py-2 whitespace-nowrap w-24 border-r border-[#d8d8d8] dark:border-neutral-800">Unit Price</th>
              <th className="text-right px-3 py-2 whitespace-nowrap w-24 border-r border-[#d8d8d8] dark:border-neutral-800">Total</th>
              <th className="text-center px-2 py-2 w-14">
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
