import React from 'react';
import { X, Package, Smartphone, Wrench, Layers, ChevronRight } from 'lucide-react';

export type ProductTypeKey = 'stock' | 'serialized' | 'service' | 'bundle';

interface ProductTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: ProductTypeKey) => void;
}

export default function ProductTypeModal({ isOpen, onClose, onSelectType }: ProductTypeModalProps) {
  if (!isOpen) return null;

  const options: { key: ProductTypeKey; title: string; subtitle: string; icon: React.ReactNode }[] = [
    {
      key: 'stock',
      title: 'General Stock',
      subtitle: 'Standard quantity items (Cases, Cables, Chargers, Parts)',
      icon: <Package size={20} className="text-neutral-700 dark:text-neutral-300" />
    },
    {
      key: 'serialized',
      title: 'Serialized Device',
      subtitle: 'Tracked by unique IMEI or Serial (Phones, Tablets, Laptops)',
      icon: <Smartphone size={20} className="text-neutral-700 dark:text-neutral-300" />
    },
    {
      key: 'service',
      title: 'Service & Labor',
      subtitle: 'Non-inventory items (Repair labor, Diagnostics, Unlock fees)',
      icon: <Wrench size={20} className="text-neutral-700 dark:text-neutral-300" />
    },
    {
      key: 'bundle',
      title: 'Product Bundle',
      subtitle: 'Combo package grouping multiple products or services',
      icon: <Layers size={20} className="text-neutral-700 dark:text-neutral-300" />
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 font-mono select-none" style={{ fontSize: '16px' }}>
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-[560px] overflow-hidden flex flex-col rounded-none shadow-none">
        {/* Header */}
        <div className="bg-neutral-200 dark:bg-neutral-900 px-4 py-3 flex justify-between items-center border-b border-neutral-300 dark:border-neutral-800">
          <h3 className="text-black dark:text-white font-bold text-base uppercase tracking-wider">
            Select Product Type
          </h3>
          <button 
            onClick={onClose} 
            className="text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Option List */}
        <div className="p-4 space-y-2 bg-white dark:bg-black">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onSelectType(opt.key)}
              className="w-full text-left p-3 border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer flex items-center gap-3.5 group"
            >
              <div className="p-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 group-hover:border-neutral-500 shrink-0">
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  {opt.title}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                  {opt.subtitle}
                </div>
              </div>
              <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-xs font-bold rounded-none cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
