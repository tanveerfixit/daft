import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Product, Category, Manufacturer } from '../types';

interface ProductFormModalProps {
  onClose: () => void;
  onSave: (product: Partial<Product>) => void;
  initialData?: Partial<Product>;
}

export default function ProductFormModal({ onClose, onSave, initialData }: ProductFormModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
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

  useEffect(() => {
    fetch('/api/categories').then(res => res.json()).then(setCategories);
    fetch('/api/manufacturers').then(res => res.json()).then(setManufacturers);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name?.trim()) return alert('Please enter a product name');
    if (!formData.category_id) return alert('Please select a category');
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 font-mono text-base select-none" style={{ fontSize: '17px' }}>
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-[600px] overflow-hidden flex flex-col rounded-none shadow-none">
        {/* Header */}
        <div className="bg-neutral-200 dark:bg-neutral-900 px-4 py-3 flex justify-between items-center border-b border-neutral-300 dark:border-neutral-800 rounded-none">
          <h3 className="text-black dark:text-white font-bold text-xl uppercase">Product Information</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-750 dark:hover:text-neutral-350 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-8 bg-white dark:bg-black">
          <div className="space-y-4">
            <div className="flex items-center">
              <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Product Name<span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                value={formData.product_name}
                onChange={e => setFormData({ ...formData, product_name: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Category<span className="text-red-500">*</span></label>
              <select
                required
                className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                value={formData.category_id || ''}
                onChange={e => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) || 0 : undefined })}
              >
                <option value="">Select Category *</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex items-center">
              <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Manufacturer</label>
              <select
                className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                value={formData.manufacturer_id || ''}
                onChange={e => setFormData({ ...formData, manufacturer_id: e.target.value ? parseInt(e.target.value) || 0 : undefined })}
              >
                <option value="">Select Manufacturer</option>
                {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <div className="flex items-center">
              <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">SKU Code</label>
              <input
                type="text"
                className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                value={formData.sku_code || ''}
                onChange={e => setFormData({ ...formData, sku_code: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Barcode</label>
              <input
                type="text"
                className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                value={formData.barcode || ''}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Selling Price</label>
              <div className="w-2/3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-base">€</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none pl-7 pr-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.selling_price}
                  onChange={e => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center">
              <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Cost Price</label>
              <div className="w-2/3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-base">€</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none pl-7 pr-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  value={formData.cost_price}
                  onChange={e => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center">
              <label className="w-1/3 text-base font-bold text-black dark:text-white uppercase">Product Type</label>
              <select
                className="w-2/3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none"
                value={formData.product_type}
                onChange={e => setFormData({ ...formData, product_type: e.target.value as any })}
              >
                <option value="stock">Stock</option>
                <option value="serialized">Serialized</option>
                <option value="service">Service</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-neutral-300 dark:border-neutral-800 flex justify-end gap-2 bg-neutral-100 dark:bg-neutral-950 -mx-8 -mb-8 p-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-base font-bold rounded-none shadow-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-base font-bold rounded-none shadow-none transition-colors border border-neutral-300 dark:border-neutral-800"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
