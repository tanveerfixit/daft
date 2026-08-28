import React from 'react';
import { Smartphone, X, Loader2, Check } from 'lucide-react';

interface ImeiSelectorModalProps {
  product: any;
  availableImeis: any[];
  isLoading: boolean;
  onClose: () => void;
  onSelect: (device: any) => void;
}

export const ImeiSelectorModal: React.FC<ImeiSelectorModalProps> = ({
  product,
  availableImeis,
  isLoading,
  onClose,
  onSelect
}) => {
  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-neutral-700 dark:text-neutral-300" />
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Select IMEI / Serial</h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Product Summary */}
        <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800 text-sm">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Product</p>
          <p className="font-bold text-neutral-900 dark:text-neutral-100">{product.product_name}</p>
        </div>

        {/* List of IMEIs */}
        <div className="max-h-[320px] overflow-y-auto bg-white dark:bg-black divide-y divide-neutral-200 dark:divide-neutral-800">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-neutral-400">
              <Loader2 size={28} className="animate-spin mb-2" />
              <p className="text-sm">Fetching available units...</p>
            </div>
          ) : availableImeis.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 italic text-sm">
              No available units in stock for this branch.
            </div>
          ) : (
            availableImeis.map(device => (
              <button
                key={device.id}
                type="button"
                onClick={() => onSelect(device)}
                className="w-full text-left p-3.5 hover:bg-neutral-100 dark:hover:bg-neutral-900/60 transition-colors flex justify-between items-center group cursor-pointer"
              >
                <div>
                  <p className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {device.imei}
                  </p>
                  <p className="text-xs text-neutral-500 uppercase font-medium mt-0.5">Status: {device.status}</p>
                </div>
                <div className="border border-neutral-300 dark:border-neutral-700 group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white text-neutral-700 dark:text-neutral-300 px-3 py-1 text-xs font-bold transition-all">
                  Select
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none text-sm cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
