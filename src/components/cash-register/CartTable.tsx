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
