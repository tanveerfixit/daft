import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Plus, List } from 'lucide-react';
import { Category, Manufacturer } from '../types';

interface CreateProductProps {
  onCancel: () => void;
  onSave: () => void;
}

export default function CreateProduct({ onCancel, onSave }: CreateProductProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isAdditionalDetailsOpen, setIsAdditionalDetailsOpen] = useState(true);
  
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
    alert_message: ''
  });

  useEffect(() => {
    fetch('/api/categories').then(res => res.json()).then(setCategories);
    fetch('/api/manufacturers').then(res => res.json()).then(setManufacturers);
  }, []);

  // Automatic primary input focus on mounting
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showNewManufacturerModal, setShowNewManufacturerModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    if (isSaving) return false;

    if (!formData.name?.trim()) {
      return alert('Please enter a product name');
    }
    if (!formData.category_id) {
      return alert('Please select a category');
    }

    setIsSaving(true);
    
    // Determine product type based on tracking selection
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
      cost_price: Number(formData.cost_price) || 0,
      product_type: productType,
      sku_code: formData.sku_code,
      barcode: formData.sku_code || '',
      allow_overselling: formData.allow_overselling,
      min_stock_level: Number(formData.min_stock_level) || 0,
      is_taxable: formData.is_taxable,
      require_note: formData.require_note,
      min_sales_price: Number(formData.min_sales_price) || 0,
      additional_description: formData.additional_description,
      alert_message: formData.alert_message
    };

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    } finally {
      setIsSaving(false);
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
        alert_message: ''
      });
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
      alert('Product saved! You can add another one.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-sm px-2 py-2 select-none w-full overflow-auto" style={{ fontSize: '15px' }}>
      {/* Header bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b border-neutral-300 dark:border-neutral-800 shrink-0 flex justify-between items-center px-4 py-3 mb-2">
        <h2 className="text-xl font-medium text-black dark:text-white">Create Product</h2>
        <button 
          onClick={onCancel}
          className="bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <List size={15} />
          <span>Back to Products</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 p-4 space-y-4 rounded-none">
        {/* Basic Information */}
        <div className="space-y-3">
          <div className="pb-1 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">Basic Information</h3>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="e.g., iPhone 15 Screen Replacement, Charging Cable, Labor Fee"
              className="w-full px-2.5 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-xs text-neutral-900 dark:text-neutral-100 font-mono outline-none focus:border-neutral-500"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1.5">
                <select
                  required
                  className="flex-1 px-2.5 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-xs text-neutral-900 dark:text-neutral-100 font-mono outline-none focus:border-neutral-500 cursor-pointer h-7 font-bold"
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">Select Category *</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button 
                  type="button" 
                  onClick={() => setShowNewCategoryModal(true)}
                  className="px-2.5 py-1 bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-800 rounded-none text-xs transition-colors cursor-pointer"
                  title="Add New Category"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                Manufacturer / Brand
              </label>
              <div className="flex gap-1.5">
                <select
                  className="flex-1 px-2.5 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-xs text-neutral-900 dark:text-neutral-100 font-mono outline-none focus:border-neutral-500 cursor-pointer h-7"
                  value={formData.manufacturer_id}
                  onChange={e => setFormData({ ...formData, manufacturer_id: e.target.value })}
                >
                  <option value="">Select Manufacturer (Optional)</option>
                  {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button 
                  type="button" 
                  onClick={() => setShowNewManufacturerModal(true)}
                  className="px-2.5 py-1 bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-800 rounded-none text-xs transition-colors cursor-pointer"
                  title="Add New Manufacturer"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">Selling Price (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full px-2.5 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-xs font-mono text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-500"
                value={formData.selling_price}
                onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
              />
              <p className="text-[10px] text-neutral-500">Retail price charged to customer at checkout</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">SKU / Barcode</label>
              <input
                type="text"
                placeholder="e.g., SKU-104928"
                className="w-full px-2.5 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-xs font-mono text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-500"
                value={formData.sku_code}
                onChange={e => setFormData({ ...formData, sku_code: e.target.value })}
              />
              <p className="text-[10px] text-neutral-500">Unique barcode or internal SKU code</p>
            </div>
          </div>
        </div>

        {/* Inventory & Tracking */}
        <div className="space-y-3 pt-2">
          <div className="pb-1 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">Inventory & Tracking</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Track Stock */}
            <div 
              className={`p-2.5 border rounded-none transition-all cursor-pointer ${
                formData.tracking_type === 'stock' 
                  ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-500 dark:border-neutral-400' 
                  : 'border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950'
              }`}
              onClick={() => setFormData({ ...formData, tracking_type: 'stock' })}
            >
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  name="tracking_type"
                  checked={formData.tracking_type === 'stock'}
                  readOnly
                />
                <span className="text-xs font-bold text-neutral-900 dark:text-white">Track Stock</span>
              </div>
              <p className="text-[11px] text-neutral-500 pl-5">For physical parts, cases, cables with exact quantity.</p>
            </div>

            {/* Labor / Services */}
            <div 
              className={`p-2.5 border rounded-none transition-all cursor-pointer ${
                formData.tracking_type === 'non-inventory' 
                  ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-500 dark:border-neutral-400' 
                  : 'border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950'
              }`}
              onClick={() => setFormData({ ...formData, tracking_type: 'non-inventory' })}
            >
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  name="tracking_type"
                  checked={formData.tracking_type === 'non-inventory'}
                  readOnly
                />
                <span className="text-xs font-bold text-neutral-900 dark:text-white">Labor & Fees</span>
              </div>
              <p className="text-[11px] text-neutral-500 pl-5">For diagnostics, repairs, service fees without stock count.</p>
            </div>

            {/* Bundles */}
            <div 
              className={`p-2.5 border rounded-none transition-all cursor-pointer ${
                formData.tracking_type === 'bundle' 
                  ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-500 dark:border-neutral-400' 
                  : 'border-neutral-300 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950'
              }`}
              onClick={() => setFormData({ ...formData, tracking_type: 'bundle' })}
            >
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  name="tracking_type"
                  checked={formData.tracking_type === 'bundle'}
                  readOnly
                />
                <span className="text-xs font-bold text-neutral-900 dark:text-white">Product Bundle</span>
              </div>
              <p className="text-[11px] text-neutral-500 pl-5">Group multiple products or services together.</p>
            </div>
          </div>

          {formData.tracking_type === 'stock' && (
            <div className="p-2 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-800 flex items-center gap-2">
              <input
                type="checkbox"
                id="has_serial"
                className="w-3.5 h-3.5 rounded-none cursor-pointer"
                checked={formData.has_serial}
                onChange={e => setFormData({ ...formData, has_serial: e.target.checked })}
              />
              <label htmlFor="has_serial" className="text-xs font-normal text-neutral-800 dark:text-neutral-200 cursor-pointer">
                This item has a Serial Number / IMEI tracked on each piece (e.g. phones, tablets)
              </label>
            </div>
          )}
        </div>

        {/* Product Details & Policies */}
        <div className="space-y-3 pt-2">
          <div className="pb-1 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">Product Details & Rules</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-2 p-2 border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors">
              <input
                type="checkbox"
                id="is_taxable"
                className="mt-0.5 w-3.5 h-3.5 rounded-none cursor-pointer"
                checked={formData.is_taxable}
                onChange={e => setFormData({ ...formData, is_taxable: e.target.checked })}
              />
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">Taxable Item</span>
                <span className="text-[10px] text-neutral-500">Apply standard VAT rate on POS checkout</span>
              </div>
            </label>

            <label className="flex items-start gap-2 p-2 border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors">
              <input
                type="checkbox"
                id="require_note"
                className="mt-0.5 w-3.5 h-3.5 rounded-none cursor-pointer"
                checked={formData.require_note}
                onChange={e => setFormData({ ...formData, require_note: e.target.checked })}
              />
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">Require Reference Note</span>
                <span className="text-[10px] text-neutral-500">Prompt cashier for reference details when selling</span>
              </div>
            </label>
          </div>

          {formData.tracking_type === 'stock' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">Minimum Stock Level</label>
                <input
                  type="number"
                  className="w-full px-2.5 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-xs font-mono text-neutral-900 dark:text-white outline-none focus:border-neutral-500"
                  value={formData.min_stock_level}
                  onChange={e => setFormData({ ...formData, min_stock_level: e.target.value })}
                />
                <p className="text-[10px] text-neutral-500">Trigger low inventory alert below this quantity</p>
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-start gap-2 p-2 w-full border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    id="allow_overselling"
                    className="mt-0.5 w-3.5 h-3.5 rounded-none cursor-pointer"
                    checked={formData.allow_overselling}
                    onChange={e => setFormData({ ...formData, allow_overselling: e.target.checked })}
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block">Allow Overselling</span>
                    <span className="text-[10px] text-neutral-500">Allow item to be sold even when on-hand stock is 0</span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Additional Details (Collapsible) */}
        <div className="pt-2">
          <button
            type="button"
            className="w-full flex items-center justify-between py-1.5 px-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-left cursor-pointer"
            onClick={() => setIsAdditionalDetailsOpen(!isAdditionalDetailsOpen)}
          >
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">
              [+] Additional Details & Notes
            </span>
            <span className="text-neutral-500">
              {isAdditionalDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>
          
          {isAdditionalDetailsOpen && (
            <div className="space-y-3 pt-3 p-2 border-x border-b border-neutral-300 dark:border-neutral-800">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">Minimum Sales Price (€)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full sm:w-60 px-2.5 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-xs font-mono text-neutral-900 dark:text-white outline-none focus:border-neutral-500"
                  value={formData.min_sales_price}
                  onChange={e => setFormData({ ...formData, min_sales_price: e.target.value })}
                />
                <p className="text-[10px] text-neutral-500">Prevents selling below this price without manager override</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">Receipt Description</label>
                  <textarea
                    rows={2}
                    placeholder="Extra notes to print under item name on receipt..."
                    className="w-full px-2.5 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-xs text-neutral-900 dark:text-white outline-none focus:border-neutral-500 resize-none font-mono"
                    value={formData.additional_description}
                    onChange={e => setFormData({ ...formData, additional_description: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">Cart Alert / Upsell Reminder</label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Offer tempered glass screen protector..."
                    className="w-full px-2.5 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-xs text-neutral-900 dark:text-white outline-none focus:border-neutral-500 resize-none font-mono"
                    value={formData.alert_message}
                    onChange={e => setFormData({ ...formData, alert_message: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end items-center gap-2 pt-3 border-t border-neutral-300 dark:border-neutral-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-md font-medium text-xs cursor-pointer font-sans shadow-xs transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndAddAnother}
            disabled={isSaving}
            className="px-3.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700 rounded-md font-medium text-xs cursor-pointer font-sans shadow-xs transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {isSaving ? 'Saving...' : 'Save & Add Another'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-xs flex items-center gap-1.5 cursor-pointer font-sans shadow-xs hover:shadow transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {isSaving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>

      {/* Quick Add Modals */}
      {(showNewCategoryModal || showNewManufacturerModal) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-md shadow-lg w-full max-w-md overflow-hidden font-mono text-sm" style={{ fontSize: '15px' }}>
            <div className="px-4 py-2 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-900 flex justify-between items-center">
              <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                {showNewCategoryModal ? 'Add New Category' : 'Add New Manufacturer'}
              </h3>
              <button 
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setShowNewManufacturerModal(false);
                  setNewItemName('');
                }}
                className="text-neutral-500 hover:text-black dark:hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">Name</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-xs text-neutral-900 dark:text-white focus:border-neutral-500 font-mono outline-none"
                  placeholder="Enter name..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800 flex justify-end gap-2 font-sans">
              <button
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setShowNewManufacturerModal(false);
                  setNewItemName('');
                }}
                className="px-3 py-1 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-md text-xs font-medium cursor-pointer shadow-xs transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={showNewCategoryModal ? handleQuickAddCategory : handleQuickAddManufacturer}
                className="px-3.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-xs cursor-pointer shadow-xs transition-all active:scale-[0.98]"
              >
                Add Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
