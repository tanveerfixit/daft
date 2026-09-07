import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  Zap, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Save, 
  Check, 
  Loader2, 
  X, 
  Package, 
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

export interface SpeedGridItem {
  id?: number;
  category_id?: number;
  product_id: number;
  sku_id: number;
  custom_label?: string | null;
  sort_order: number;
  product_name?: string;
  product_type?: string;
  sku_code?: string;
  selling_price?: number | string;
  cost_price?: number | string;
  stock_quantity?: number;
  units_sold?: number;
}

export interface SpeedGridCategory {
  id?: number;
  name: string;
  sort_order: number;
  items: SpeedGridItem[];
}

export default function SpeedGridSettings() {
  const [categories, setCategories] = useState<SpeedGridCategory[]>([]);
  const [activeCatIndex, setActiveCatIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);

  // Top Sellers Modal
  const [showTopSellersModal, setShowTopSellersModal] = useState(false);
  const [topSellers, setTopSellers] = useState<any[]>([]);
  const [isLoadingTopSellers, setIsLoadingTopSellers] = useState(false);
  const [topSellerDays, setTopSellerDays] = useState(30);

  // Load Speed Grid Data
  const loadSpeedGrid = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/speed-grid');
      if (!res.ok) throw new Error('Failed to load Speed Grid configuration');
      const data = await res.json();
      
      let cats: SpeedGridCategory[] = data.categories || [];
      // Ensure exactly 8 categories exist
      if (cats.length < 8) {
        const defaultNames = [
          'Accessories',
          'Device',
          'Vape',
          'Screen Protectors',
          'Cables & Chargers',
          'Cases & Covers',
          'Repairs & Services',
          'Trending'
        ];
        while (cats.length < 8) {
          const idx = cats.length;
          cats.push({
            name: defaultNames[idx] || `Category ${idx + 1}`,
            sort_order: idx + 1,
            items: []
          });
        }
      }
      setCategories(cats);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error loading speed grid' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSpeedGrid();
  }, []);

  // Search Products for adding
  const searchProducts = async (q: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/speed-grid/search-products?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (showAddModal) {
      const timer = setTimeout(() => {
        searchProducts(searchQuery);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, showAddModal]);

  // Load Top Sellers
  const fetchTopSellers = async (days = topSellerDays) => {
    setIsLoadingTopSellers(true);
    try {
      const res = await fetch(`/api/speed-grid/top-sellers?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setTopSellers(data || []);
      }
    } catch (err) {
      console.error('Top sellers fetch error:', err);
    } finally {
      setIsLoadingTopSellers(false);
    }
  };

  const handleOpenTopSellers = () => {
    setShowTopSellersModal(true);
    fetchTopSellers(topSellerDays);
  };

  const currentCategory = categories[activeCatIndex] || {
    name: `Category ${activeCatIndex + 1}`,
    sort_order: activeCatIndex + 1,
    items: []
  };

  // Update Category Name
  const handleUpdateCategoryName = (newName: string) => {
    setCategories(prev => {
      const updated = [...prev];
      if (updated[activeCatIndex]) {
        updated[activeCatIndex] = {
          ...updated[activeCatIndex],
          name: newName
        };
      }
      return updated;
    });
  };

  // Add Item to active category
  const handleSelectProductForSlot = (product: any) => {
    setCategories(prev => {
      const updated = [...prev];
      const activeCat = { ...updated[activeCatIndex] };
      const items = [...(activeCat.items || [])];

      const newItem: SpeedGridItem = {
        product_id: product.product_id,
        sku_id: product.sku_id,
        custom_label: '',
        sort_order: targetSlotIndex !== null ? targetSlotIndex + 1 : items.length + 1,
        product_name: product.product_name,
        product_type: product.product_type,
        sku_code: product.sku_code,
        selling_price: product.selling_price,
        cost_price: product.cost_price,
        stock_quantity: product.stock_quantity
      };

      if (targetSlotIndex !== null && targetSlotIndex < items.length) {
        // Replace existing slot
        items[targetSlotIndex] = newItem;
      } else {
        // Append
        if (items.length < 20) {
          items.push(newItem);
        }
      }

      // Re-normalize sort_orders
      activeCat.items = items.map((it, idx) => ({ ...it, sort_order: idx + 1 }));
      updated[activeCatIndex] = activeCat;
      return updated;
    });

    setShowAddModal(false);
    setSearchQuery('');
    setTargetSlotIndex(null);
  };

  // Auto-populate from Top Sellers
  const handleApplyTopSellers = (selectedItems: any[]) => {
    setCategories(prev => {
      const updated = [...prev];
      const activeCat = { ...updated[activeCatIndex] };

      const newItems: SpeedGridItem[] = selectedItems.slice(0, 20).map((it, idx) => ({
        product_id: it.product_id,
        sku_id: it.sku_id,
        custom_label: '',
        sort_order: idx + 1,
        product_name: it.product_name,
        product_type: it.product_type,
        sku_code: it.sku_code,
        selling_price: it.selling_price,
        cost_price: it.cost_price,
        stock_quantity: it.stock_quantity,
        units_sold: it.units_sold
      }));

      activeCat.items = newItems;
      updated[activeCatIndex] = activeCat;
      return updated;
    });

    setShowTopSellersModal(false);
    setStatusMessage({
      type: 'success',
      text: `Auto-filled category "${currentCategory.name}" with top ${selectedItems.length} best sellers!`
    });
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setCategories(prev => {
      const updated = [...prev];
      const activeCat = { ...updated[activeCatIndex] };
      const items = activeCat.items.filter((_, idx) => idx !== index);
      activeCat.items = items.map((it, idx) => ({ ...it, sort_order: idx + 1 }));
      updated[activeCatIndex] = activeCat;
      return updated;
    });
  };

  // Clear Category
  const handleClearCategory = () => {
    if (window.confirm(`Are you sure you want to clear all product slots in "${currentCategory.name}"?`)) {
      setCategories(prev => {
        const updated = [...prev];
        const activeCat = { ...updated[activeCatIndex] };
        activeCat.items = [];
        updated[activeCatIndex] = activeCat;
        return updated;
      });
    }
  };

  // Update Custom Label
  const handleUpdateCustomLabel = (index: number, label: string) => {
    setCategories(prev => {
      const updated = [...prev];
      const activeCat = { ...updated[activeCatIndex] };
      const items = [...activeCat.items];
      if (items[index]) {
        items[index] = { ...items[index], custom_label: label };
      }
      activeCat.items = items;
      updated[activeCatIndex] = activeCat;
      return updated;
    });
  };

  // Move Item Up / Down
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    setCategories(prev => {
      const updated = [...prev];
      const activeCat = { ...updated[activeCatIndex] };
      const items = [...activeCat.items];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex >= 0 && targetIndex < items.length) {
        const temp = items[index];
        items[index] = items[targetIndex];
        items[targetIndex] = temp;
        activeCat.items = items.map((it, idx) => ({ ...it, sort_order: idx + 1 }));
        updated[activeCatIndex] = activeCat;
      }
      return updated;
    });
  };

  // Save All Changes
  const handleSaveAll = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/speed-grid/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save Speed Grid settings');
      }

      setStatusMessage({ type: 'success', text: '✓ Speed Grid configuration saved successfully!' });
      // Notify active POS / Cash Register components
      window.dispatchEvent(new CustomEvent('speed-grid-updated'));
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving settings' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Loading Speed Grid configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2.5">
            <LayoutGrid className="text-blue-600" size={24} />
            Speed Grid Manager (POS 1-Click Tiles)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure 8 category tabs and up to 20 products per category for instant 1-click checkout at the register.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md shadow-xs transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Speed Grid
        </button>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div className={`p-4 rounded-md text-sm font-medium flex items-center justify-between ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* 8 Category Tabs Selector */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
          Select Category (1 of 8)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {categories.slice(0, 8).map((cat, idx) => {
            const isActive = activeCatIndex === idx;
            const count = cat.items?.length || 0;
            return (
              <button
                key={idx}
                onClick={() => setActiveCatIndex(idx)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-md border text-center transition-all ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-medium'
                }`}
              >
                <span className="text-xs truncate w-full">{idx + 1}. {cat.name || `Cat ${idx + 1}`}</span>
                <span className={`text-[10px] mt-1 px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}/20
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Category Header & Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              #{activeCatIndex + 1}
            </div>
            <div className="flex-1 max-w-sm">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Category Name</label>
              <input
                type="text"
                value={currentCategory.name}
                onChange={(e) => handleUpdateCategoryName(e.target.value)}
                placeholder={`Category ${activeCatIndex + 1}`}
                className="w-full text-base font-bold text-slate-800 border-b border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:outline-none py-1 bg-transparent"
              />
            </div>
          </div>

          {/* Category Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenTopSellers}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold rounded-md transition-colors"
              title="Auto-fill slots with top selling items from invoices"
            >
              <Sparkles size={14} className="text-amber-600" />
              ⚡ Auto-Fill Top Sellers (Last 30 Days)
            </button>

            <button
              onClick={() => {
                setTargetSlotIndex(null);
                setShowAddModal(true);
              }}
              disabled={currentCategory.items.length >= 20}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
            >
              <Plus size={14} />
              Add Product Slot
            </button>

            {currentCategory.items.length > 0 && (
              <button
                onClick={handleClearCategory}
                className="flex items-center gap-1 px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-semibold rounded-md transition-colors"
              >
                <Trash2 size={13} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Product Slots Table / Cards */}
        {currentCategory.items.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
            <Package size={36} className="mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No products assigned to "{currentCategory.name}" yet.</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Click <strong>"Add Product Slot"</strong> to pick items manually, or click <strong>"⚡ Auto-Fill Top Sellers"</strong> to populate from past 30-day invoice sales.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setTargetSlotIndex(null);
                  setShowAddModal(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs"
              >
                + Add First Product
              </button>
              <button
                onClick={handleOpenTopSellers}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-md shadow-xs"
              >
                ⚡ Auto-Fill Best Sellers
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-2">
              <span>Assigned Products ({currentCategory.items.length} / 20 slots)</span>
              <span>Reorder / Custom Label / Price</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentCategory.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-200 rounded-lg transition-all shadow-2xs group"
                >
                  {/* Slot Number & Reorder */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => handleMoveItem(idx, 'down')}
                        disabled={idx === currentCategory.items.length - 1}
                        className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Product Details & Custom Label Input */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate" title={item.product_name}>
                        {item.product_name}
                      </h4>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        €{Number(item.selling_price || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="text"
                        value={item.custom_label || ''}
                        onChange={(e) => handleUpdateCustomLabel(idx, e.target.value)}
                        placeholder="Custom label (optional, e.g. 15 Pro Max)"
                        className="w-full text-[11px] px-2 py-1 bg-white border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Replace & Remove */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setTargetSlotIndex(idx);
                        setShowAddModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Replace product in this slot"
                    >
                      <Search size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      title="Remove product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* POS Interactive Preview Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-white space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Live Cash Register POS Preview</h4>
          </div>
          <span className="text-[11px] text-slate-400">Category: {currentCategory.name}</span>
        </div>

        {/* Category bar preview */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.slice(0, 8).map((cat, idx) => (
            <div
              key={idx}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-default ${
                activeCatIndex === idx ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {cat.name}
            </div>
          ))}
        </div>

        {/* Product tiles preview */}
        {currentCategory.items.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No products in this category preview yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 pt-1">
            {currentCategory.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-800 border border-slate-700 px-2.5 py-2 rounded text-left flex items-center justify-between gap-1.5 min-h-[38px]"
              >
                <span className="text-xs font-medium text-slate-100 truncate">
                  {item.custom_label || item.product_name}
                </span>
                <span className="text-xs font-bold text-emerald-400 shrink-0">
                  €{Number(item.selling_price || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Search & Add Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {targetSlotIndex !== null ? `Replace Product at Slot #${targetSlotIndex + 1}` : `Add Product to "${currentCategory.name}"`}
                </h3>
                <p className="text-xs text-slate-500">Pick standard items or services (serialized phones excluded)</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                <X size={18} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search product name, SKU, or barcode..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 max-h-96">
              {isSearching ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
                  <Loader2 size={16} className="animate-spin mr-2 text-blue-600" />
                  Searching products...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  {searchQuery ? 'No matching standard products found.' : 'Type to search products or select from available inventory.'}
                </div>
              ) : (
                searchResults.map((prod) => (
                  <div
                    key={prod.sku_id}
                    onClick={() => handleSelectProductForSlot(prod)}
                    className="py-2.5 px-2 hover:bg-blue-50 rounded flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                        {prod.product_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        SKU: {prod.sku_code} {prod.category_name ? `· ${prod.category_name}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-700">
                        €{Number(prod.selling_price || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {prod.product_type === 'service' ? 'Service' : `Stock: ${prod.stock_quantity ?? 0}`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Auto-Fill from Top Sellers */}
      {showTopSellersModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Top Selling Products (Invoice History)</h3>
                  <p className="text-xs text-slate-500">Auto-calculated from highest volume sales in POS</p>
                </div>
              </div>
              <button onClick={() => setShowTopSellersModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                <X size={18} />
              </button>
            </div>

            {/* Date filter bar */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Sales Period:</span>
                <select
                  value={topSellerDays}
                  onChange={(e) => {
                    const d = Number(e.target.value);
                    setTopSellerDays(d);
                    fetchTopSellers(d);
                  }}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days (Recommended)</option>
                  <option value={60}>Last 60 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>
              </div>

              <span className="text-xs text-slate-500">
                Found {topSellers.length} top products
              </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 max-h-96">
              {isLoadingTopSellers ? (
                <div className="flex items-center justify-center py-10 text-slate-400 text-xs">
                  <Loader2 size={18} className="animate-spin mr-2 text-amber-600" />
                  Analyzing sales history...
                </div>
              ) : topSellers.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No sales data found for the selected period.
                </div>
              ) : (
                topSellers.map((item, idx) => (
                  <div key={item.sku_id} className="py-2.5 px-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{item.product_name}</div>
                        <div className="text-[11px] text-slate-400">SKU: {item.sku_code}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800">
                        {item.units_sold} sold
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        €{Number(item.selling_price || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setShowTopSellersModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded"
              >
                Cancel
              </button>

              <button
                onClick={() => handleApplyTopSellers(topSellers)}
                disabled={topSellers.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md shadow-xs disabled:opacity-50"
              >
                <Sparkles size={14} />
                Apply to "{currentCategory.name}"
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
