import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Smartphone, AlertCircle } from 'lucide-react';
import { SpeedGridCategory, SpeedGridItem } from '../settings/SpeedGridSettings';

interface SpeedGridProps {
  onAddProduct: (product: any) => void;
  onClose?: () => void;
}

export const SpeedGrid: React.FC<SpeedGridProps> = ({ onAddProduct }) => {
  const [categories, setCategories] = useState<SpeedGridCategory[]>([]);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Device Input Modal State (Model & IMEI Required)
  const [deviceModalItem, setDeviceModalItem] = useState<SpeedGridItem | null>(null);
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceImei, setDeviceImei] = useState('');
  const [devicePrice, setDevicePrice] = useState('');
  const [deviceError, setDeviceError] = useState('');
  const imeiInputRef = useRef<HTMLInputElement>(null);

  const fetchSpeedGrid = async () => {
    try {
      const res = await fetch('/api/speed-grid');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load Speed Grid:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpeedGrid();

    const handleUpdate = () => {
      fetchSpeedGrid();
    };

    window.addEventListener('speed-grid-updated', handleUpdate);
    return () => window.removeEventListener('speed-grid-updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (deviceModalItem) {
      setTimeout(() => {
        imeiInputRef.current?.focus();
      }, 50);
    }
  }, [deviceModalItem]);

  const handleTileClick = (item: SpeedGridItem) => {
    const isDeviceCategory = activeCategory?.name?.toLowerCase() === 'device';
    
    if (isDeviceCategory) {
      // Open Device Modal with 2 Required Fields: Model & IMEI
      setDeviceModalItem(item);
      setDeviceModel(item.custom_label || item.product_name || 'Mobile Device');
      setDeviceImei('');
      setDevicePrice(String(item.selling_price || ''));
      setDeviceError('');
      return;
    }

    const displayName = item.custom_label || item.product_name;
    const productPayload = {
      id: item.sku_id,
      product_id: item.product_id,
      sku_id: item.sku_id,
      name: displayName,
      product_name: displayName,
      selling_price: Number(item.selling_price) || 0,
      cost_price: Number(item.cost_price) || 0,
      sku_code: item.sku_code,
      product_type: item.product_type || 'stock',
      allow_overselling: (item as any).allow_overselling ?? 1,
      alert_message: (item as any).alert_message,
      total_stock: item.stock_quantity ?? 0,
      current_inventory: item.stock_quantity ?? 0,
      quantity: 1,
      notes: item.custom_label && item.custom_label !== item.product_name ? item.custom_label : undefined,
    };
    onAddProduct(productPayload);
  };

  const handleConfirmDevice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!deviceModel.trim()) {
      setDeviceError('Model name is required.');
      return;
    }
    if (!deviceImei.trim()) {
      setDeviceError('IMEI / Serial Number is required.');
      imeiInputRef.current?.focus();
      return;
    }

    if (!deviceModalItem) return;

    const devicePayload = {
      id: deviceModalItem.sku_id,
      product_id: deviceModalItem.product_id,
      sku_id: deviceModalItem.sku_id,
      name: deviceModel.trim(),
      product_name: deviceModel.trim(),
      imei: deviceImei.trim(),
      selling_price: parseFloat(devicePrice) || Number(deviceModalItem.selling_price) || 0,
      cost_price: Number(deviceModalItem.cost_price) || 0,
      sku_code: deviceModalItem.sku_code || '',
      product_type: 'serialized',
      allow_overselling: 1,
      total_stock: 1,
      quantity: 1,
      notes: `IMEI: ${deviceImei.trim()}`
    };

    onAddProduct(devicePayload);
    setDeviceModalItem(null);
    setDeviceModel('');
    setDeviceImei('');
    setDevicePrice('');
    setDeviceError('');
  };

  const activeCategory = categories[activeCategoryIndex];
  const items = activeCategory?.items || [];

  if (isLoading) {
    return (
      <div className="bg-white border border-[#d8d8d8] rounded p-2.5 flex items-center justify-center text-xs text-slate-400 gap-2">
        <Loader2 size={13} className="animate-spin text-blue-600" />
        <span>Loading...</span>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div 
      className="bg-white border-y sm:border border-[#d8d8d8] rounded-none sm:rounded p-2.5 space-y-2.5 transition-all"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* 8 Categories Bar - Clean Text Buttons */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {categories.slice(0, 8).map((cat, idx) => {
          const isActive = activeCategoryIndex === idx;
          return (
            <button
              key={cat.id || idx}
              type="button"
              onClick={() => setActiveCategoryIndex(idx)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer select-none ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Product Items - Clean Compact Text-Only Buttons */}
      {items.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded">
          No products assigned to "{activeCategory?.name || 'this category'}".
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
          {items.map((item, idx) => {
            const displayName = item.custom_label || item.product_name;
            return (
              <button
                key={item.id || idx}
                type="button"
                onClick={() => handleTileClick(item)}
                className="bg-slate-50 hover:bg-blue-50 active:bg-blue-100 border border-slate-200 hover:border-blue-400 px-2.5 py-2 rounded text-left transition-colors cursor-pointer select-none flex items-center justify-between gap-1.5 min-h-[38px] group"
              >
                <span className="text-xs font-medium text-slate-800 group-hover:text-blue-950 truncate">
                  {displayName}
                </span>
                {Number(item.selling_price || 0) > 0 ? (
                  <span className="text-xs font-bold text-emerald-700 shrink-0">
                    €{Number(item.selling_price).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-1.5 py-0.5 rounded shrink-0">
                    + IMEI
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Required Device Input Modal (Model & IMEI) */}
      {deviceModalItem && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Add Device to Sale</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeviceModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmDevice} className="p-4 space-y-3.5">
              {deviceError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-center gap-2 font-medium">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{deviceError}</span>
                </div>
              )}

              {/* 1. Model Name (Required) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Device Model <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deviceModel}
                  onChange={(e) => {
                    setDeviceModel(e.target.value);
                    if (deviceError) setDeviceError('');
                  }}
                  placeholder="e.g. iPhone 13 128GB Blue"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 2. IMEI / Serial Number (Required) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  IMEI / Serial Number <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={imeiInputRef}
                  type="text"
                  required
                  value={deviceImei}
                  onChange={(e) => {
                    setDeviceImei(e.target.value);
                    if (deviceError) setDeviceError('');
                  }}
                  placeholder="Scan or type 15-digit IMEI..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono font-bold tracking-wide text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 3. Selling Price */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Selling Price (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={devicePrice}
                  onChange={(e) => setDevicePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeviceModalItem(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-xs cursor-pointer transition-colors"
                >
                  Add Device to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
