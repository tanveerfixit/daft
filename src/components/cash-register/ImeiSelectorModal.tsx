import React from 'react';
import { Smartphone, X, Loader2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#2c3e50] text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Smartphone size={18} />
            <h3 className="font-bold">Select IMEI/Serial</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white rounded-sm">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase">Product</p>
          <p className="font-bold text-slate-800">{product.product_name}</p>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={32} className="animate-spin mb-2" />
              <p className="text-sm">Fetching available units...</p>
            </div>
          ) : availableImeis.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic">
              No available units in stock.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {availableImeis.map(device => (
                <button
                  key={device.id}
                  onClick={() => onSelect(device)}
                  className="w-full text-left p-4 hover:bg-blue-50 transition-colors flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <p className="font-mono font-bold text-slate-800 group-hover:text-blue-700">{device.imei}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Status: {device.status}</p>
                  </div>
                  <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-sm text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    SELECT
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 rounded-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
