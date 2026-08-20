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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col min-h-0 rounded-xl shadow-xs">
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Current Cart</h2>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
        </span>
      </div>
      
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500 italic text-base">
            <p className="font-semibold uppercase tracking-wider text-sm">Your cart is empty</p>
            <p className="text-xs mt-1 text-slate-400">Search for products or scan a barcode to add items</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-base">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 z-10">
              <tr className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2 pl-3 text-center w-12 border-r border-slate-200 dark:border-slate-800">#</th>
                <th className="py-2 px-3 text-left border-r border-slate-200 dark:border-slate-800">Description</th>
                <th className="py-2 px-3 text-center w-28 border-r border-slate-200 dark:border-slate-800">Stock</th>
                <th className="py-2 px-3 text-center w-32 border-r border-slate-200 dark:border-slate-800">Qty</th>
                <th className="py-2 px-3 text-right w-28 border-r border-slate-200 dark:border-slate-800">Price</th>
                <th className="py-2 px-3 text-right w-28 border-r border-slate-200 dark:border-slate-800">Total</th>
                <th className="py-2 pr-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
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
