import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Product, Category, Manufacturer } from '../types';

interface ProductFormModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>) => void;
  initialData?: Partial<Product>;
  categories?: Category[];
  manufacturers?: Manufacturer[];
}

export default function ProductFormModal({
  isOpen = true,
  onClose,
  onSave,
  initialData,
  categories: initialCategories,
  manufacturers: initialManufacturers
}: ProductFormModalProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(initialManufacturers || []);

  const [formData, setFormData] = useState<Partial<Product>>({
    product_name: '',
    category_id: undefined,
    manufacturer_id: undefined,
    sku_code: '',
    barcode: '',
    selling_price: 0,
    cost_price: 0,
    product_type: 'stock',
    ...initialData
  });

  const [existingProducts, setExistingProducts] = useState<any[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        product_name: '',
        category_id: undefined,
        manufacturer_id: undefined,
        sku_code: '',
        barcode: '',
        selling_price: 0,
        cost_price: 0,
        product_type: 'stock',
        ...initialData
      });
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
      fetch('/api/products')
        .then(res => res.json())
        .then(data => setExistingProducts(Array.isArray(data) ? data : []))
        .catch(err => console.error('Failed to fetch existing products:', err));
    }
  }, [isOpen, initialCategories, initialManufacturers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {initialData?.id ? 'Edit Product' : 'Product Information'}
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
                className="sm:w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500 cursor-pointer"
                value={formData.category_id || ''}
                onChange={e => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) || 0 : undefined })}
              >
                <option value="">Select Category *</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <label className="sm:w-1/3 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                Selling Price (€)
              </label>
              <div className="sm:w-2/3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono">€</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-none pl-8 pr-3 py-2 text-sm font-mono font-semibold text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  value={formData.selling_price}
                  onChange={e => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                />
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
              <span>Save Product</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
