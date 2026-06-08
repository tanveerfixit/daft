import React, { useState, useEffect, useRef } from 'react';
import { Plus, List } from 'lucide-react';
import { Category, Manufacturer } from '../types';

interface CreateProductProps {
  onCancel: () => void;
  onSave: () => void;
}

export default function CreateProduct({ onCancel, onSave }: CreateProductProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    manufacturer_id: '',
    category_id: '',
    selling_price: '',
    cost_price: '',
    sku_code: '',
    tracking_type: 'stock', // 'stock', 'non-inventory', 'bundle'
    has_serial: false,
    is_taxable: true,
    require_note: false,
    min_stock_level: '0',
    allow_overselling: true,
    min_sales_price: '',
    additional_description: '',
    alert_message: '',
    color: '',
    condition: '',
    storage: ''
  });

  useEffect(() => {
    fetch('/api/categories').then(res => res.json()).then(setCategories);
    fetch('/api/manufacturers').then(res => res.json()).then(setManufacturers);
  }, []);

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showNewManufacturerModal, setShowNewManufacturerModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const [colors, setColors] = useState(['Black', 'White', 'Silver', 'Gold', 'Space Gray', 'Rose Gold', 'Blue', 'Red', 'Green']);
  const [showNewColorModal, setShowNewColorModal] = useState(false);
  const [newColorName, setNewColorName] = useState('');

  const handleQuickAddColor = () => {
    if (!newColorName.trim()) return;
    const trimmed = newColorName.trim();
    if (!colors.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setColors([...colors, trimmed]);
    }
    setFormData(prev => ({ ...prev, color: trimmed }));
    setShowNewColorModal(false);
    setNewColorName('');
  };

  const handleQuickAddCategory = async () => {
    if (!newItemName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItemName })
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories([...categories, newCat]);
        setFormData({ ...formData, category_id: newCat.id });
        setShowNewCategoryModal(false);
        setNewItemName('');
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleQuickAddManufacturer = async () => {
    if (!newItemName.trim()) return;
    try {
      const res = await fetch('/api/manufacturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItemName })
      });
      if (res.ok) {
        const newMan = await res.json();
        setManufacturers([...manufacturers, newMan]);
        setFormData({ ...formData, manufacturer_id: newMan.id });
        setShowNewManufacturerModal(false);
        setNewItemName('');
      }
    } catch (error) {
      console.error('Error adding manufacturer:', error);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    let productType = formData.tracking_type;
    if (formData.tracking_type === 'stock' && formData.has_serial) {
      productType = 'serialized';
    } else if (formData.tracking_type === 'non-inventory') {
      productType = 'service';
    }

    const payload = {
      name: formData.name,
      category_id: formData.category_id ? Number(formData.category_id) : null,
      manufacturer_id: formData.manufacturer_id ? Number(formData.manufacturer_id) : null,
      selling_price: Number(formData.selling_price) || 0,
      cost_price: 0,
      product_type: productType,
      sku_code: formData.sku_code,
      barcode: formData.sku_code || '',
      allow_overselling: formData.allow_overselling
    };

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return true;
      } else {
        const errorData = await response.json();
        alert('Error saving product: ' + (errorData.error || 'Unknown error'));
        return false;
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to connect to the server');
      return false;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    const success = await handleSubmit(e);
    if (success) {
      onSave();
    }
  };

  const handleSaveAndAddAnother = async () => {
    const success = await handleSubmit();
    if (success) {
      setFormData({
        name: '',
        sku_code: '',
        category_id: '',
        manufacturer_id: '',
        selling_price: '',
        cost_price: '',
        tracking_type: 'stock',
        has_serial: false,
        is_taxable: true,
        require_note: false,
        min_stock_level: '0',
        allow_overselling: true,
        min_sales_price: '',
        additional_description: '',
        alert_message: '',
        color: '',
        condition: '',
        storage: ''
      });
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
      alert('Product saved successfully!');
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-955 dark:text-neutral-100 font-mono text-base px-3 py-3 select-none w-full overflow-y-auto">
      {/* Header bar */}
      <div className="max-w-[760px] w-full mx-auto flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-black dark:text-white uppercase tracking-wider">New Product</h2>
        <button 
          onClick={onCancel}
          className="bg-white dark:bg-black border border-neutral-350 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-bold py-1 px-3.5 rounded-none text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <List size={14} />
          List Products
        </button>
      </div>

      {/* Main Single Form Body */}
      <form onSubmit={handleSave} className="max-w-[760px] w-full mx-auto bg-white dark:bg-black p-5 border border-neutral-350 dark:border-neutral-800 space-y-5">
        
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <h3 className="text-[14px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider border-b border-neutral-250 dark:border-neutral-800 pb-1">Basic Information</h3>
          
          <div className="space-y-1">
            <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Product Name *</label>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="e.g. iPhone 13 Charging Port Replacement"
              className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white focus:border-amber-500 text-neutral-900 dark:text-neutral-100 font-normal"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Brand / Manufacturer</label>
              <div className="flex">
                <select
                  className="flex-1 p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white text-neutral-900 dark:text-neutral-100 font-normal"
                  value={formData.manufacturer_id}
                  onChange={e => setFormData({ ...formData, manufacturer_id: e.target.value })}
                >
                  <option value="">Select Manufacturer</option>
                  {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button 
                  type="button" 
                  onClick={() => setShowNewManufacturerModal(true)}
                  className="bg-white dark:bg-black border-y border-r border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 p-2 rounded-none transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Category</label>
              <div className="flex">
                <select
                  className="flex-1 p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white text-neutral-900 dark:text-neutral-100 font-normal"
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button 
                  type="button" 
                  onClick={() => setShowNewCategoryModal(true)}
                  className="bg-white dark:bg-black border-y border-r border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 p-2 rounded-none transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Selling Price (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white focus:border-amber-500 text-neutral-900 dark:text-neutral-100 font-mono"
                value={formData.selling_price}
                onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">SKU / Barcode</label>
              <input
                type="text"
                placeholder="e.g. SKU987654"
                className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white focus:border-amber-500 text-neutral-900 dark:text-neutral-100 font-mono"
                value={formData.sku_code}
                onChange={e => setFormData({ ...formData, sku_code: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Inventory & Options */}
        <div className="space-y-4 pt-1">
          <h3 className="text-[14px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider border-b border-neutral-250 dark:border-neutral-800 pb-1">Inventory & Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Tracking Type</label>
              <select
                className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white text-neutral-900 dark:text-neutral-100 font-normal"
                value={formData.tracking_type}
                onChange={e => setFormData({ ...formData, tracking_type: e.target.value })}
              >
                <option value="stock">Track Physical Stock</option>
                <option value="non-inventory">Labor, Fees & Non-Inventory</option>
                <option value="bundle">Bundles (Packages)</option>
              </select>
            </div>

            {formData.tracking_type === 'stock' && (
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Min Stock Alert Level</label>
                <input
                  type="number"
                  className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white focus:border-amber-500 text-neutral-900 dark:text-neutral-100 font-mono"
                  value={formData.min_stock_level}
                  onChange={e => setFormData({ ...formData, min_stock_level: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Grouped Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {formData.tracking_type === 'stock' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_serial"
                  className="w-4 h-4 rounded-none accent-black dark:accent-white"
                  checked={formData.has_serial}
                  onChange={e => setFormData({ ...formData, has_serial: e.target.checked })}
                />
                <label htmlFor="has_serial" className="text-sm font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  Has Serial / IMEI ID
                </label>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_taxable"
                className="w-4 h-4 rounded-none accent-black dark:accent-white"
                checked={formData.is_taxable}
                onChange={e => setFormData({ ...formData, is_taxable: e.target.checked })}
              />
              <label htmlFor="is_taxable" className="text-sm font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer">
                Taxable Product
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="require_note"
                className="w-4 h-4 rounded-none accent-black dark:accent-white"
                checked={formData.require_note}
                onChange={e => setFormData({ ...formData, require_note: e.target.checked })}
              />
              <label htmlFor="require_note" className="text-sm font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer">
                Require Reference Note
              </label>
            </div>

            {formData.tracking_type === 'stock' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allow_overselling"
                  className="w-4 h-4 rounded-none accent-black dark:accent-white"
                  checked={formData.allow_overselling}
                  onChange={e => setFormData({ ...formData, allow_overselling: e.target.checked })}
                />
                <label htmlFor="allow_overselling" className="text-sm font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  Allow Overselling
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Extra Settings */}
        <div className="space-y-4 pt-1">
          <h3 className="text-[14px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider border-b border-neutral-250 dark:border-neutral-800 pb-1">Additional Details</h3>
          
          {formData.has_serial ? (
            <>
              {/* Row 1: Min Sales Price & Color */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Minimum Sales Price (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white focus:border-amber-500 text-neutral-900 dark:text-neutral-100 font-mono"
                    value={formData.min_sales_price}
                    onChange={e => setFormData({ ...formData, min_sales_price: e.target.value })}
                  />
                  <span className="text-[11px] text-neutral-500 block">Prevents staff from selling bellow this price without override</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Color</label>
                  <select
                    className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white text-neutral-900 dark:text-neutral-100 font-normal"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                  >
                    <option value="">Select Color Name</option>
                    {colors.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['Black', 'White', 'Silver', 'Gold'].map(col => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color: col }))}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-all cursor-pointer font-sans font-medium ${
                          formData.color === col
                            ? 'bg-amber-400 border-amber-500 text-slate-900 font-bold'
                            : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-850'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewColorModal(true)}
                    className="text-[#00abec] hover:underline text-xs font-bold bg-transparent border-0 p-0 cursor-pointer block mt-1"
                  >
                    + Add New Color
                  </button>
                </div>
              </div>

              {/* Row 2: Physical Condition & Storage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Physical Condition</label>
                  <select
                    className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white text-neutral-900 dark:text-neutral-100 font-normal"
                    value={formData.condition}
                    onChange={e => setFormData({ ...formData, condition: e.target.value })}
                  >
                    <option value="">Select Physical Condition</option>
                    <option value="New">New</option>
                    <option value="Grade A">Grade A</option>
                    <option value="Grade B">Grade B</option>
                    <option value="Grade C">Grade C</option>
                    <option value="Faulty">Faulty</option>
                  </select>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['New', 'Grade A', 'Grade B'].map(cond => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, condition: cond }))}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-all cursor-pointer font-sans font-medium ${
                          formData.condition === cond
                            ? 'bg-amber-400 border-amber-500 text-slate-900 font-bold'
                            : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-850'
                        }`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Storage</label>
                  <input
                    type="text"
                    placeholder="e.g., 128 GB"
                    className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white focus:border-amber-500 text-neutral-900 dark:text-neutral-100 font-normal"
                    value={formData.storage}
                    onChange={e => setFormData({ ...formData, storage: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['64 GB', '128 GB', '256 GB', '512 GB'].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, storage: st }))}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-all cursor-pointer font-sans font-medium ${
                          formData.storage === st
                            ? 'bg-amber-400 border-amber-500 text-slate-900 font-bold'
                            : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-850'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Minimum Sales Price (€)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white focus:border-amber-500 text-neutral-900 dark:text-neutral-100 font-mono"
                  value={formData.min_sales_price}
                  onChange={e => setFormData({ ...formData, min_sales_price: e.target.value })}
                />
                <span className="text-[11px] text-neutral-500 block">Prevents staff from selling bellow this price without override</span>
              </div>
              <div className="space-y-1" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Additional Description</label>
              <textarea
                rows={2}
                className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white focus:border-amber-500 text-neutral-900 dark:text-neutral-100 font-sans font-normal"
                value={formData.additional_description}
                onChange={e => setFormData({ ...formData, additional_description: e.target.value })}
              />
              <span className="text-[11px] text-neutral-500 block">This description is for your customers. It will be shown on your receipt (if enabled).</span>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Alert Message</label>
              <textarea
                rows={2}
                className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white focus:border-amber-500 text-neutral-900 dark:text-neutral-100 font-sans font-normal"
                value={formData.alert_message}
                onChange={e => setFormData({ ...formData, alert_message: e.target.value })}
              />
              <span className="text-[11px] text-neutral-500 block">Add a short message that will pop up for your staff at the Point of Sale every time this product is added to the cart. This is perfect for upsell reminders, warnings, or special handling instructions.</span>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex justify-end items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1.5 px-4 rounded-none text-base transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndAddAnother}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1.5 px-4 rounded-none text-base transition-colors cursor-pointer"
          >
            Save & Add Another
          </button>
          <button
            type="submit"
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-1.5 px-6 rounded-none text-base border border-amber-500 hover:border-amber-600 transition-colors cursor-pointer"
          >
            Save Product
          </button>
        </div>
      </form>

      {/* Quick Add Modals */}
      {(showNewCategoryModal || showNewManufacturerModal || showNewColorModal) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (showNewCategoryModal) handleQuickAddCategory();
              else if (showNewManufacturerModal) handleQuickAddManufacturer();
              else handleQuickAddColor();
            }}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none w-full max-w-sm overflow-hidden font-mono text-base"
          >
            <div className="px-4 py-2 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-900">
              <h3 className="text-base font-bold text-black dark:text-white uppercase">
                {showNewCategoryModal ? 'Add Category' : showNewManufacturerModal ? 'Add Manufacturer' : 'Add Color'}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider block">Name</label>
                <input
                  type="text"
                  className="w-full p-2 bg-[#ebf3fe] dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none focus:bg-white text-neutral-900 dark:text-neutral-100 font-normal"
                  placeholder="Enter name..."
                  value={showNewColorModal ? newColorName : newItemName}
                  onChange={(e) => showNewColorModal ? setNewColorName(e.target.value) : setNewItemName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>
            <div className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setShowNewManufacturerModal(false);
                  setShowNewColorModal(false);
                  setNewItemName('');
                  setNewColorName('');
                }}
                className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-base transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-1 px-4 rounded-none text-base transition-colors cursor-pointer"
              >
                Add Now
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
