import React from 'react';
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
    <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 overflow-hidden flex-1 flex flex-col min-h-0 rounded-none shadow-none">
      <div className="px-4 py-1.5 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-900 flex justify-between items-center rounded-none">
        <h2 className="text-[15px] font-bold text-black dark:text-white uppercase tracking-wider">Current Cart</h2>
        <span className="text-[15px] font-bold text-black dark:text-white uppercase tracking-wider">
          {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
        </span>
      </div>
      
      <div className="overflow-auto flex-1 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-neutral-450 dark:text-neutral-500 font-mono italic text-base">
            <p className="font-normal uppercase tracking-widest text-[16px]">Your cart is empty</p>
            <p className="text-sm mt-1">Search for products to add them here</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-lg">
            <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 z-10">
              <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-[15px] font-bold text-black dark:text-white uppercase tracking-wider">
                <th className="py-1 pl-2 text-center w-12 border-r border-neutral-300 dark:border-neutral-800">#</th>
                <th className="py-1 px-2 text-left border-r border-neutral-300 dark:border-neutral-800">Description</th>
                <th className="py-1 px-2 text-center w-32 border-r border-neutral-300 dark:border-neutral-800">Inventory</th>
                <th className="py-1 px-2 text-center w-32 border-r border-neutral-300 dark:border-neutral-800">Qty</th>
                <th className="py-1 px-2 text-right w-28 border-r border-neutral-300 dark:border-neutral-800">Price</th>
                <th className="py-1 px-2 text-right w-28 border-r border-neutral-300 dark:border-neutral-800">Total</th>
                <th className="py-1 pr-2 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-normal">
              {cart.map((item, idx) => (
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
