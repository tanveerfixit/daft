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
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-base px-2 py-2 select-none w-full overflow-auto" style={{ fontSize: '17px' }}>
      {/* Header bar */}
      <div className="flex justify-between items-center px-4 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 shrink-0 mb-2 rounded-none shadow-none">
        <h2 className="text-xl font-bold text-black dark:text-white uppercase">Create a New Product</h2>
        <button 
          onClick={onCancel}
          className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-base flex items-center gap-2 transition-all shadow-none"
        >
          <List size={16} />
          List Products
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Basic Information */}
        <section className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
          <div className="px-4 py-1.5 bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800">
            <h3 className="text-base font-bold text-black dark:text-white uppercase">Basic Information</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">Product Name *</label>
              <input
                ref={nameInputRef}
                type="text"
                placeholder="e.g., Replace charging port, includes parts and labor"
                className="w-full p-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-normal"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">Manufacturer / Brand</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 p-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-normal"
                    value={formData.manufacturer_id}
                    onChange={e => setFormData({ ...formData, manufacturer_id: e.target.value })}
                  >
                    <option value="">Select Manufacturer</option>
                    {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => setShowNewManufacturerModal(true)}
                    className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 p-2 rounded-none transition-colors"
                    title="Add New Manufacturer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">Category</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 p-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-normal"
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => setShowNewCategoryModal(true)}
                    className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 p-2 rounded-none transition-colors"
                    title="Add New Category"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">Selling Price</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full p-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-normal"
                  value={formData.selling_price}
                  onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
                />
                <p className="text-xs text-neutral-500">The price the customer pays</p>
              </div>
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">SKU / Barcode</label>
                <input
                  type="text"
                  placeholder="e.g., ZG001AQA"
                  className="w-full p-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-normal"
                  value={formData.sku_code}
                  onChange={e => setFormData({ ...formData, sku_code: e.target.value })}
                />
                <p className="text-xs text-neutral-500">Unique product identifier (Optional)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Inventory & Tracking */}
        <section className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
          <div className="px-4 py-1.5 bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800">
            <h3 className="text-base font-bold text-black dark:text-white uppercase">Inventory & Tracking</h3>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-base font-normal text-neutral-600 dark:text-neutral-400">Select how stock will be tracked for this item:</p>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Track Stock */}
              <div 
                className={`p-3 border rounded-none cursor-pointer transition-colors ${formData.tracking_type === 'stock' ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-500 dark:border-neutral-600' : 'border-neutral-350 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950'}`}
                onClick={() => setFormData({ ...formData, tracking_type: 'stock' })}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="tracking_type"
                    className="mt-1"
                    checked={formData.tracking_type === 'stock'}
                    readOnly
                  />
                  <div className="flex-1">
                    <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">Track Stock</p>
                    <p className="text-sm text-neutral-500">For physical goods (parts, cases, cables) where quantity levels must be exact.</p>
                    
                    {formData.tracking_type === 'stock' && (
                      <div className="mt-2.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          id="has_serial"
                          className="w-4 h-4 rounded-none accent-black dark:accent-white"
                          checked={formData.has_serial}
                          onChange={e => setFormData({ ...formData, has_serial: e.target.checked })}
                        />
                        <label htmlFor="has_serial" className="text-sm font-normal text-neutral-700 dark:text-neutral-300">
                          This item has a Serial Number / IMEI / Unique ID on each piece
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Labor */}
              <div 
                className={`p-3 border rounded-none cursor-pointer transition-colors ${formData.tracking_type === 'non-inventory' ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-500 dark:border-neutral-600' : 'border-neutral-350 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-955'}`}
                onClick={() => setFormData({ ...formData, tracking_type: 'non-inventory' })}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="tracking_type"
                    className="mt-1"
                    checked={formData.tracking_type === 'non-inventory'}
                    readOnly
                  />
                  <div>
                    <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">Labor, Fees & Non-Inventory</p>
                    <p className="text-sm text-neutral-500">For labor charges, diagnostics, fees, and items where quantities are not tracked.</p>
                  </div>
                </div>
              </div>

              {/* Bundles */}
              <div 
                className={`p-3 border rounded-none cursor-pointer transition-colors ${formData.tracking_type === 'bundle' ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-500 dark:border-neutral-600' : 'border-neutral-350 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-955'}`}
                onClick={() => setFormData({ ...formData, tracking_type: 'bundle' })}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="tracking_type"
                    className="mt-1"
                    checked={formData.tracking_type === 'bundle'}
                    readOnly
                  />
                  <div>
                    <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">Bundles</p>
                    <p className="text-sm text-neutral-500">Group multiple existing products or services to sell as a package.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Details */}
        <section className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
          <div className="px-4 py-1.5 bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800">
            <h3 className="text-base font-bold text-black dark:text-white uppercase">Product Details</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="is_taxable"
                className="mt-1 w-4 h-4 rounded-none accent-black dark:accent-white"
                checked={formData.is_taxable}
                onChange={e => setFormData({ ...formData, is_taxable: e.target.checked })}
              />
              <div>
                <label htmlFor="is_taxable" className="text-base font-bold text-neutral-900 dark:text-neutral-100">Taxable</label>
                <p className="text-xs text-neutral-500">Apply standard store tax rate at checkout</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="require_note"
                className="mt-1 w-4 h-4 rounded-none accent-black dark:accent-white"
                checked={formData.require_note}
                onChange={e => setFormData({ ...formData, require_note: e.target.checked })}
              />
              <div>
                <label htmlFor="require_note" className="text-base font-bold text-neutral-900 dark:text-neutral-100">Require Reference Note to Sell</label>
                <p className="text-xs text-neutral-500">Force employee to enter a specific reference note/imei at checkout</p>
              </div>
            </div>

            {formData.tracking_type === 'stock' && (
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 space-y-3">
                <div className="space-y-1">
                  <label className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">Minimum Stock Level</label>
                  <input
                    type="number"
                    className="w-48 p-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-normal"
                    value={formData.min_stock_level}
                    onChange={e => setFormData({ ...formData, min_stock_level: e.target.value })}
                  />
                  <p className="text-xs text-neutral-500">Low stock alert trigger quantity</p>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="allow_overselling"
                    className="mt-1 w-4 h-4 rounded-none accent-black dark:accent-white"
                    checked={formData.allow_overselling}
                    onChange={e => setFormData({ ...formData, allow_overselling: e.target.checked })}
                  />
                  <div>
                    <label htmlFor="allow_overselling" className="text-base font-bold text-neutral-900 dark:text-neutral-100">Allow Overselling</label>
                    <p className="text-xs text-neutral-500">Allow sale of this product when quantity on hand is 0</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Additional Details */}
        <section className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
          <button
            type="button"
            className="w-full px-4 py-2.5 bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 flex items-center justify-between text-left"
            onClick={() => setIsAdditionalDetailsOpen(!isAdditionalDetailsOpen)}
          >
            <h3 className="text-base font-bold text-black dark:text-white uppercase">Additional Details</h3>
            {isAdditionalDetailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {isAdditionalDetailsOpen && (
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">Minimum Sales Price</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-64 p-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-normal"
                  value={formData.min_sales_price}
                  onChange={e => setFormData({ ...formData, min_sales_price: e.target.value })}
                />
                <p className="text-xs text-neutral-500">Prevents sale below this price without override permission</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">Additional Description</label>
                  <textarea
                    rows={3}
                    className="w-full p-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-normal"
                    value={formData.additional_description}
                    onChange={e => setFormData({ ...formData, additional_description: e.target.value })}
                  />
                  <p className="text-xs text-neutral-500">Product description printed on receipt</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">Alert Message</label>
                  <textarea
                    rows={3}
                    className="w-full p-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-normal"
                    value={formData.alert_message}
                    onChange={e => setFormData({ ...formData, alert_message: e.target.value })}
                  />
                  <p className="text-xs text-neutral-500">Upsell reminder or warning alert popup when added to cart</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Footer Buttons */}
        <div className="flex justify-end items-center gap-3 pt-2 pb-8">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1.5 px-4 rounded-none text-base transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndAddAnother}
            disabled={isSaving}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1.5 px-4 rounded-none text-base transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save & Add Another'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-1.5 px-6 rounded-none text-base transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>

      {/* Quick Add Modals */}
      {(showNewCategoryModal || showNewManufacturerModal) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none w-full max-w-md overflow-hidden font-mono text-base" style={{ fontSize: '17px' }}>
            <div className="px-4 py-2 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-900">
              <h3 className="text-base font-bold text-black dark:text-white uppercase">
                {showNewCategoryModal ? 'Add New Category' : 'Add New Manufacturer'}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">Name</label>
                <input
                  type="text"
                  className="w-full p-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-normal"
                  placeholder="Enter name..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setShowNewManufacturerModal(false);
                  setNewItemName('');
                }}
                className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-3 rounded-none text-base transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={showNewCategoryModal ? handleQuickAddCategory : handleQuickAddManufacturer}
                className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-1 px-4 rounded-none text-base transition-colors"
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
