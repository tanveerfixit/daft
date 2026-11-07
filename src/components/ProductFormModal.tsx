import React, { useState, useEffect } from 'react';
import { X, Save, Smartphone, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { Product, Category, Manufacturer, Supplier } from '../types';

interface ProductFormModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product> & { cascade_device_price?: boolean; exclude_custom_priced_devices?: boolean }) => void;
  initialData?: Partial<Product> & { in_stock_devices_count?: number; stock?: Array<{ quantity: number }> };
  categories?: Category[];
  manufacturers?: Manufacturer[];
  suppliers?: Supplier[];
}

export default function ProductFormModal({
  isOpen = true,
  onClose,
  onSave,
  initialData,
  categories: initialCategories,
  manufacturers: initialManufacturers,
  suppliers: initialSuppliers
}: ProductFormModalProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(initialManufacturers || []);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers || []);

  const [formData, setFormData] = useState<Partial<Product> & { supplier_id?: number }>({
    product_name: '',
    category_id: undefined,
    manufacturer_id: undefined,
    supplier_id: undefined,
    sku_code: '',
    barcode: '',
    selling_price: 0,
    cost_price: 0,
    product_type: 'stock',
    ...(initialData as any)
  });

  const [existingProducts, setExistingProducts] = useState<any[]>([]);
  const [showCascadePrompt, setShowCascadePrompt] = useState(false);
  const [cascadeMode, setCascadeMode] = useState<'catalog_only' | 'all_in_stock'>('all_in_stock');
  const [excludeCustomPriced, setExcludeCustomPriced] = useState(false);

  const originalSellingPrice = Number(initialData?.selling_price || 0);
  const currentSellingPrice = Number(formData.selling_price || 0);
  const isEditingSerialized = Boolean(initialData?.id) && formData.product_type === 'serialized';
  const isSerializedPriceChanged = isEditingSerialized && Math.abs(currentSellingPrice - originalSellingPrice) >= 0.005;
  const inStockUnitsCount = Number(
    initialData?.in_stock_devices_count ??
    (Array.isArray(initialData?.stock) ? initialData.stock.reduce((sum, s) => sum + Number(s.quantity || 0), 0) : initialData?.total_stock) ??
    0
  );

  useEffect(() => {
    if (initialData) {
      setFormData({
        product_name: '',
        category_id: undefined,
        manufacturer_id: undefined,
        supplier_id: undefined,
        sku_code: '',
        barcode: '',
        selling_price: 0,
        cost_price: 0,
        product_type: 'stock',
        ...(initialData as any)
      });
      setShowCascadePrompt(false);
    }
  }, [initialData]);

  const getDefaultCategoryId = (type: string | undefined, catList: Category[]): number | undefined => {
    if (!catList || catList.length === 0) return undefined;
    if (type === 'serialized') {
      const phones = catList.find(c => c.name.trim().toLowerCase() === 'phones')
        || catList.find(c => c.name.trim().toLowerCase() === 'phone')
        || catList.find(c => c.name.trim().toLowerCase().includes('phone'));
      return phones ? phones.id : undefined;
    } else if (type === 'stock' || !type) {
      const accessories = catList.find(c => c.name.trim().toLowerCase() === 'accessories')
        || catList.find(c => c.name.trim().toLowerCase() === 'accessory')
        || catList.find(c => c.name.trim().toLowerCase().includes('accessories'));
      return accessories ? accessories.id : undefined;
    }
    return undefined;
  };

  useEffect(() => {
    if (isOpen) {
      if (!initialCategories) {
        fetch('/api/categories')
          .then(res => res.json())
          .then(data => {
            const list = Array.isArray(data) ? data : [];
            setCategories(list);
            if (!initialData?.category_id) {
              setFormData(prev => ({
                ...prev,
                category_id: prev.category_id ?? getDefaultCategoryId(prev.product_type || 'stock', list)
              }));
            }
          })
          .catch(console.error);
      } else if (!initialData?.category_id) {
        setFormData(prev => ({
          ...prev,
          category_id: prev.category_id ?? getDefaultCategoryId(prev.product_type || 'stock', initialCategories)
        }));
      }

      if (!initialManufacturers) {
        fetch('/api/manufacturers')
          .then(res => res.json())
          .then(data => setManufacturers(Array.isArray(data) ? data : []))
          .catch(console.error);
      }
      if (!initialSuppliers) {
        fetch('/api/suppliers')
          .then(res => res.json())
          .then(data => setSuppliers(Array.isArray(data) ? data : []))
          .catch(console.error);
      }
      fetch('/api/products')
        .then(res => res.json())
        .then(data => setExistingProducts(Array.isArray(data) ? data : []))
        .catch(err => console.error('Failed to fetch existing products:', err));
    }
  }, [isOpen, initialCategories, initialManufacturers, initialSuppliers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData?.id && !formData.supplier_id) {
      alert('Please select a supplier. Supplier is required.');
      return;
    }
    if (isSerializedPriceChanged && !showCascadePrompt) {
      setShowCascadePrompt(true);
      return;
    }
    onSave({
      ...formData,
      cascade_device_price: isSerializedPriceChanged && cascadeMode === 'all_in_stock',
      exclude_custom_priced_devices: isSerializedPriceChanged && cascadeMode === 'all_in_stock' && excludeCustomPriced
    });
  };

  const handleProductNameSelect = (name: string) => {
    const matched = existingProducts.find(
      p => (p.product_name || p.name)?.toLowerCase() === name.toLowerCase()
    );
    if (matched) {
      setFormData(prev => ({
        ...prev,
        product_name: matched.product_name || matched.name,
        category_id: matched.category_id ?? prev.category_id,
        manufacturer_id: matched.manufacturer_id ?? prev.manufacturer_id,
        supplier_id: matched.supplier_id ?? prev.supplier_id,
        cost_price: matched.cost_price ? Number(matched.cost_price) : prev.cost_price,
        selling_price: matched.selling_price ? Number(matched.selling_price) : prev.selling_price,
        product_type: matched.product_type ?? prev.product_type
      }));
    } else {
      setFormData(prev => ({ ...prev, product_name: name }));
    }
  };

  const productSuggestions = Array.from(
    new Set(
      existingProducts
        .map(p => p.product_name || p.name)
        .filter(Boolean)
    )
  ).sort();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-xl overflow-hidden shadow-2xl rounded-none flex flex-col">
        {/* Header */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            {showCascadePrompt ? (
              <>
                <Smartphone size={18} className="text-blue-600 dark:text-blue-400" />
                <span>Cascade Price Update Confirmation</span>
              </>
            ) : (
              initialData?.id ? 'Edit Product' : 'Product Information'
            )}
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4 bg-white dark:bg-black text-sm text-neutral-900 dark:text-neutral-100">
          {showCascadePrompt ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-neutral-900 dark:text-neutral-100 flex items-start gap-3">
                <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold text-sm text-blue-900 dark:text-blue-200 mb-1">
                    Selling Price Changed: €{originalSellingPrice.toFixed(2)} &rarr; €{currentSellingPrice.toFixed(2)}
                  </p>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    Choose how this price change should apply to <strong>{formData.product_name}</strong> ({inStockUnitsCount} unit{inStockUnitsCount === 1 ? '' : 's'} currently in stock):
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <label
                  onClick={() => setCascadeMode('all_in_stock')}
                  className={`block p-3.5 border cursor-pointer transition-all ${
                    cascadeMode === 'all_in_stock'
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="cascadeMode"
                      checked={cascadeMode === 'all_in_stock'}
                      onChange={() => setCascadeMode('all_in_stock')}
                      className="mt-1 accent-blue-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-between">
                        <span>Update all unsold units in stock</span>
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-bold">
                          {inStockUnitsCount} in stock
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        Updates the selling price of existing in-stock IMEI / serial units in the Device section to <strong>€{currentSellingPrice.toFixed(2)}</strong>. Sold units and cost prices are never changed.
                      </p>

                      {cascadeMode === 'all_in_stock' && (
                        <label
                          onClick={e => e.stopPropagation()}
                          className="mt-3 pt-2.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2 text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={excludeCustomPriced}
                            onChange={e => setExcludeCustomPriced(e.target.checked)}
                            className="accent-blue-600 cursor-pointer"
                          />
                          <span>
                            Exclude units with custom price overrides (only update units priced at €{originalSellingPrice.toFixed(2)})
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setCascadeMode('catalog_only')}
                  className={`block p-3.5 border cursor-pointer transition-all ${
                    cascadeMode === 'catalog_only'
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="cascadeMode"
                      checked={cascadeMode === 'catalog_only'}
                      onChange={() => setCascadeMode('catalog_only')}
                      className="mt-1 accent-blue-600 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-neutral-100">
                        Update catalog default price only
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        Existing in-stock IMEI units keep their current selling prices. Only future device intakes will default to <strong>€{currentSellingPrice.toFixed(2)}</strong>.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center gap-3 -mx-6 -mb-6 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCascadePrompt(false)}
                  className="px-4 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none text-sm cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft size={15} />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-none text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check size={16} />
                  <span>Confirm &amp; Save</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Product Name<span className="text-red-500">*</span>
                  </label>
                  <div className="sm:w-2/3 relative">
                    <input
                      required
                      list="product-name-suggestions"
                      type="text"
                      placeholder="Select or type product name..."
                      className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                      value={formData.product_name}
                      onChange={e => handleProductNameSelect(e.target.value)}
                    />
                    <datalist id="product-name-suggestions">
                      {productSuggestions.map((name, i) => (
                        <option key={i} value={name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Category<span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 cursor-pointer font-bold"
                    value={formData.category_id || ''}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) || 0 : undefined })}
                  >
                    <option value="">Select Category *</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Supplier{!initialData?.id && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    required={!initialData?.id}
                    className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 cursor-pointer font-bold"
                    value={formData.supplier_id || ''}
                    onChange={e => setFormData({ ...formData, supplier_id: e.target.value ? parseInt(e.target.value) || 0 : undefined })}
                  >
                    <option value="">{initialData?.id ? 'Select Supplier' : 'Select Supplier *'}</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Manufacturer
                  </label>
                  <select
                    className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 cursor-pointer"
                    value={formData.manufacturer_id || ''}
                    onChange={e => setFormData({ ...formData, manufacturer_id: e.target.value ? parseInt(e.target.value) || 0 : undefined })}
                  >
                    <option value="">Select Manufacturer</option>
                    {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    placeholder="Optional SKU"
                    className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm font-mono text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                    value={formData.sku_code || ''}
                    onChange={e => setFormData({ ...formData, sku_code: e.target.value })}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Barcode
                  </label>
                  <input
                    type="text"
                    placeholder="Optional barcode / EAN"
                    className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm font-mono text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                    value={formData.barcode || ''}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3">
                  <label className="sm:w-1/3 sm:pt-2 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Selling Price (€)
                  </label>
                  <div className="sm:w-2/3 space-y-1.5">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono">€</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none pl-8 pr-3 py-2 text-sm font-mono font-semibold text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                        value={formData.selling_price}
                        onChange={e => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    {isSerializedPriceChanged && (
                      <div className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-200 flex items-center justify-between">
                        <span>
                          Price changed (€{originalSellingPrice.toFixed(2)} &rarr; €{currentSellingPrice.toFixed(2)}). You'll choose whether to update {inStockUnitsCount} in-stock IMEI unit{inStockUnitsCount === 1 ? '' : 's'} on Save.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Cost Price (€)
                  </label>
                  <div className="sm:w-2/3 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono">€</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none pl-8 pr-3 py-2 text-sm font-mono font-semibold text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                      value={formData.cost_price}
                      onChange={e => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Product Type
                  </label>
                  <select
                    className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 cursor-pointer"
                    value={formData.product_type}
                    onChange={e => setFormData({ ...formData, product_type: e.target.value as any })}
                  >
                    <option value="stock">General Stock</option>
                    <option value="serialized">Serialized Device (IMEI Tracked)</option>
                    <option value="service">Service & Labor</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3 -mx-6 -mb-6 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-none text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <Save size={16} />
                  <span>{isSerializedPriceChanged ? 'Continue to Price Options' : 'Save Product'}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
