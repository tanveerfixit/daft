import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus, List, AlertTriangle, ArrowRight } from 'lucide-react';
import { Product, Category, Manufacturer } from '../types';
import { ProductTypeKey } from './ProductTypeModal';

interface CreateProductProps {
  onCancel: () => void;
  onSave: () => void;
}

export default function CreateProduct({ onCancel, onSave }: CreateProductProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { branchSlug } = useParams<{ branchSlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const cloneProduct = (location.state as any)?.cloneProduct;
  const initialType = (searchParams.get('type') as ProductTypeKey) || cloneProduct?.product_type || 'stock';

  const [activeType, setActiveType] = useState<ProductTypeKey>(
    ['stock', 'serialized', 'service', 'bundle'].includes(initialType) ? initialType : 'stock'
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const [isAdditionalDetailsOpen, setIsAdditionalDetailsOpen] = useState(
    Boolean(cloneProduct?.min_sales_price || cloneProduct?.additional_description || cloneProduct?.alert_message)
  );
  const [matchedExistingProduct, setMatchedExistingProduct] = useState<Product | null>(null);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: cloneProduct?.name || '',
    manufacturer_id: cloneProduct?.manufacturer_id ? String(cloneProduct.manufacturer_id) : '',
    category_id: cloneProduct?.category_id ? String(cloneProduct.category_id) : '',
    selling_price: cloneProduct?.selling_price !== undefined ? String(cloneProduct.selling_price) : '',
    cost_price: cloneProduct?.cost_price !== undefined ? String(cloneProduct.cost_price) : '',
    sku_code: '',
    is_taxable: cloneProduct?.is_taxable !== undefined ? Boolean(cloneProduct.is_taxable) : true,
    require_note: cloneProduct?.require_note || false,
    min_stock_level: cloneProduct?.min_stock_level !== undefined ? String(cloneProduct.min_stock_level) : '0',
    allow_overselling: cloneProduct?.allow_overselling !== undefined ? Boolean(cloneProduct.allow_overselling) : true,
    min_sales_price: cloneProduct?.min_sales_price !== undefined ? String(cloneProduct.min_sales_price) : '',
    additional_description: cloneProduct?.additional_description || '',
    alert_message: cloneProduct?.alert_message || ''
  });

  const handleTabChange = (type: ProductTypeKey) => {
    setActiveType(type);
    setSearchParams({ type });
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  useEffect(() => {
    fetch('/api/categories').then(res => res.json()).then(setCategories);
    fetch('/api/manufacturers').then(res => res.json()).then(setManufacturers);
    fetch('/api/products?limit=1000')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.products)) {
          setExistingProducts(data.products);
        } else if (Array.isArray(data)) {
          setExistingProducts(data);
        }
      })
      .catch(err => console.error('Error fetching products for suggestions:', err));
  }, []);

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [activeType]);

  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showNewManufacturerModal, setShowNewManufacturerModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsContainerRef.current && !suggestionsContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter existing products when at least 3 characters are typed
  const searchQuery = formData.name.trim().toLowerCase();
  const filteredSuggestions = searchQuery.length >= 3
    ? existingProducts.filter(p => {
        const pName = (p.product_name || p.name || '').toLowerCase();
        const pSku = (p.sku_code || '').toLowerCase();
        const pBarcode = (p.barcode || '').toLowerCase();
        return pName.includes(searchQuery) || pSku.includes(searchQuery) || pBarcode.includes(searchQuery);
      }).slice(0, 10)
    : [];

  const selectProductSuggestion = (matched: Product) => {
    const prodName = matched.product_name || matched.name || '';
    setMatchedExistingProduct(matched);
    setFormData(prev => ({
      ...prev,
      name: prodName,
      category_id: matched.category_id ? String(matched.category_id) : prev.category_id,
      manufacturer_id: matched.manufacturer_id ? String(matched.manufacturer_id) : prev.manufacturer_id,
      selling_price: matched.selling_price !== undefined ? String(matched.selling_price) : prev.selling_price,
      cost_price: matched.cost_price !== undefined ? String(matched.cost_price) : prev.cost_price,
      sku_code: matched.sku_code || prev.sku_code
    }));
    setShowSuggestions(false);
  };

  // Smart handler when typing or picking a name
  const handleNameChange = (val: string) => {
    setShowSuggestions(true);
    const trimmed = val.trim().toLowerCase();
    const matched = existingProducts.find(
      p => (p.product_name || p.name || '').trim().toLowerCase() === trimmed
    );

    if (matched) {
      setMatchedExistingProduct(matched);
      setFormData(prev => ({
        ...prev,
        name: val,
        category_id: matched.category_id ? String(matched.category_id) : prev.category_id,
        manufacturer_id: matched.manufacturer_id ? String(matched.manufacturer_id) : prev.manufacturer_id,
        selling_price: matched.selling_price !== undefined ? String(matched.selling_price) : prev.selling_price,
        cost_price: matched.cost_price !== undefined ? String(matched.cost_price) : prev.cost_price
      }));
    } else {
      setMatchedExistingProduct(null);
      setFormData(prev => ({ ...prev, name: val }));
    }
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
    if (isSaving) return false;

    if (!formData.name?.trim()) {
      alert('Please enter a product name');
      nameInputRef.current?.focus();
      return false;
    }

    // Check if product with the exact same name already exists
    const duplicate = existingProducts.find(
      p => (p.product_name || p.name || '').trim().toLowerCase() === formData.name.trim().toLowerCase()
    );
    if (duplicate) {
      alert('You already have a product with the same name. Add to inventory instead of creating a new product.');
      return false;
    }

    if (!formData.category_id) {
      alert('Please select a category');
      return false;
    }

    setIsSaving(true);
    
    let allowOverselling = formData.allow_overselling;
    if (activeType === 'serialized') {
      allowOverselling = false;
    } else if (activeType === 'service') {
      allowOverselling = true;
    }

    const payload = {
      name: formData.name.trim(),
      category_id: formData.category_id ? Number(formData.category_id) : null,
      manufacturer_id: formData.manufacturer_id ? Number(formData.manufacturer_id) : null,
      selling_price: Number(formData.selling_price) || 0,
      cost_price: Number(formData.cost_price) || 0,
      product_type: activeType,
      sku_code: formData.sku_code.trim(),
      barcode: formData.sku_code.trim() || '',
      allow_overselling: allowOverselling,
      min_stock_level: activeType === 'stock' ? (Number(formData.min_stock_level) || 0) : 0,
      is_taxable: formData.is_taxable,
      require_note: formData.require_note,
      min_sales_price: Number(formData.min_sales_price) || 0,
      additional_description: formData.additional_description,
      alert_message: formData.alert_message
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
        alert('Error saving: ' + (errorData.error || 'Unknown error'));
        return false;
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to connect to server');
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
        category_id: formData.category_id,
        manufacturer_id: formData.manufacturer_id,
        selling_price: '',
        cost_price: '',
        is_taxable: true,
        require_note: false,
        min_stock_level: '0',
        allow_overselling: true,
        min_sales_price: '',
        additional_description: '',
        alert_message: ''
      });
      setMatchedExistingProduct(null);
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 select-none w-full overflow-auto px-2 pb-2 pt-0" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '16px' }}>
      {/* Header bar */}
      <div className="shrink-0 flex justify-between items-center px-1 py-2 mb-2">
        <h2 className="font-bold text-black dark:text-white uppercase tracking-wider" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>
          Create Product
        </h2>
        <button 
          onClick={onCancel}
          className="bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-bold py-1.5 px-4 text-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <List size={15} />
          <span>Back to Products</span>
        </button>
      </div>

      {/* Tabs - Navigational selection preserved */}
      <div className="flex gap-1 bg-white dark:bg-black px-4 pt-3 border-x border-t border-neutral-300 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => handleTabChange('stock')}
          className={`px-5 py-2 text-xs font-bold uppercase tracking-wider border border-neutral-300 dark:border-neutral-800 border-b-0 transition-colors cursor-pointer ${
            activeType === 'stock'
              ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white -mb-px relative z-10'
              : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
          }`}
        >
          General Stock
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('serialized')}
          className={`px-5 py-2 text-xs font-bold uppercase tracking-wider border border-neutral-300 dark:border-neutral-800 border-b-0 transition-colors cursor-pointer ${
            activeType === 'serialized'
              ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white -mb-px relative z-10'
              : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
          }`}
        >
          Serialized Device
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('service')}
          className={`px-5 py-2 text-xs font-bold uppercase tracking-wider border border-neutral-300 dark:border-neutral-800 border-b-0 transition-colors cursor-pointer ${
            activeType === 'service'
              ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white -mb-px relative z-10'
              : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
          }`}
        >
          Service & Labor
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('bundle')}
          className={`px-5 py-2 text-xs font-bold uppercase tracking-wider border border-neutral-300 dark:border-neutral-800 border-b-0 transition-colors cursor-pointer ${
            activeType === 'bundle'
              ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white -mb-px relative z-10'
              : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-950'
          }`}
        >
          Product Bundle
        </button>
      </div>

      {/* Form Body - seamless continuation without horizontal dividing line below tabs */}
      <form onSubmit={handleSave} className="bg-white dark:bg-black border-x border-b border-neutral-300 dark:border-neutral-800 p-5 space-y-4">
        {/* Basic Information Section - removed dividing line under title */}
        <div className="space-y-4">
          <div className="pb-1 flex justify-between items-center">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">
              Basic Information
            </h3>
            {formData.name.trim() && (
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 border ${
                matchedExistingProduct 
                  ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700' 
                  : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
              }`}>
                {matchedExistingProduct ? '✓ Matched Existing Product' : '+ New Product'}
              </span>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                {activeType === 'serialized' ? 'Device / Model Name' : activeType === 'service' ? 'Service Name' : 'Product Name'} <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-neutral-500">
                Type to select from existing or create new
              </span>
            </div>
            <div className="relative">
              <input
                ref={nameInputRef}
                type="text"
                autoComplete="off"
                placeholder={
                  activeType === 'serialized'
                    ? 'Type at least 3 characters (e.g. iPhone, Samsung, iPad)...'
                    : activeType === 'service'
                    ? 'Type at least 3 characters (e.g. Screen, Battery, Diagnostic)...'
                    : 'Type at least 3 characters to search existing or create new...'
                }
                className={`w-full px-3 py-1.5 bg-white dark:bg-black border ${
                  matchedExistingProduct 
                    ? 'border-amber-400 dark:border-amber-600' 
                    : 'border-neutral-300 dark:border-neutral-800'
                } rounded-none text-sm text-neutral-900 dark:text-neutral-100 font-mono outline-none focus:border-neutral-500`}
                value={formData.name}
                onFocus={() => setShowSuggestions(true)}
                onChange={e => handleNameChange(e.target.value)}
                required
              />

              {/* Custom High-Contrast Dropdown Matching EPOS Layout */}
              {showSuggestions && searchQuery.length >= 3 && filteredSuggestions.length > 0 && (
                <div 
                  ref={suggestionsContainerRef}
                  className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 shadow-lg z-50 max-h-64 overflow-y-auto font-mono text-sm"
                >
                  <div className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider flex justify-between items-center">
                    <span>Database Matches ({filteredSuggestions.length})</span>
                    <span className="text-[10px] text-neutral-500">Click to autofill</span>
                  </div>
                  {filteredSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectProductSuggestion(item);
                      }}
                      className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100 block text-xs truncate">
                          {item.product_name || item.name}
                        </span>
                        <span className="text-[11px] text-neutral-500 block truncate">
                          {item.category_name ? `${item.category_name} • ` : ''}
                          {item.manufacturer_name ? `${item.manufacturer_name} • ` : ''}
                          SKU: {item.sku_code || 'N/A'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100 text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800">
                          €{Number(item.selling_price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Duplicate Product Warning Banner with Shortcut to Add Inventory */}
            {matchedExistingProduct && (
              <div className="p-3 bg-amber-50 dark:bg-neutral-900 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs font-mono flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-bold">
                    You already have a product with the same name. Add to inventory instead of creating a new product.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/${branchSlug || 'branch'}/add-inventory/${matchedExistingProduct.id}`)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider shrink-0 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Add to Inventory</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1.5">
                <select
                  required
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm text-neutral-900 dark:text-neutral-100 font-mono outline-none focus:border-neutral-500 cursor-pointer h-9 font-bold"
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">Select Category *</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button 
                  type="button" 
                  onClick={() => setShowNewCategoryModal(true)}
                  className="px-3 bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-800 rounded-none text-xs transition-colors cursor-pointer flex items-center justify-center"
                  title="Add New Category"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                Manufacturer / Brand
              </label>
              <div className="flex gap-1.5">
                <select
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm text-neutral-900 dark:text-neutral-100 font-mono outline-none focus:border-neutral-500 cursor-pointer h-9"
                  value={formData.manufacturer_id}
                  onChange={e => setFormData({ ...formData, manufacturer_id: e.target.value })}
                >
                  <option value="">Select Manufacturer (Optional)</option>
                  {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button 
                  type="button" 
                  onClick={() => setShowNewManufacturerModal(true)}
                  className="px-3 bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-800 rounded-none text-xs transition-colors cursor-pointer flex items-center justify-center"
                  title="Add New Manufacturer"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                Selling Price (€)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">€</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm font-mono text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-500"
                  value={formData.selling_price}
                  onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                Cost Price (€)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">€</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm font-mono text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-500"
                  value={formData.cost_price}
                  onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
              SKU / Barcode
            </label>
            <input
              type="text"
              placeholder="e.g., SKU-104928"
              className="w-full px-3 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm font-mono text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-500"
              value={formData.sku_code}
              onChange={e => setFormData({ ...formData, sku_code: e.target.value })}
            />
          </div>
        </div>

        {/* Inventory & Overselling Configuration */}
        {activeType === 'stock' && (
          <div className="space-y-4 pt-2">
            <div className="pb-1">
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">
                Inventory & Stock Control
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                  Minimum Stock Level
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm font-mono text-neutral-900 dark:text-white outline-none focus:border-neutral-500"
                  value={formData.min_stock_level}
                  onChange={e => setFormData({ ...formData, min_stock_level: e.target.value })}
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    id="allow_overselling"
                    className="w-4 h-4 rounded-none cursor-pointer"
                    checked={formData.allow_overselling}
                    onChange={e => setFormData({ ...formData, allow_overselling: e.target.checked })}
                  />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Allow Overselling (Sell when stock is 0)
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="space-y-4 pt-2">
          <div className="pb-1">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">
              Options
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-2.5 p-3 border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors">
              <input
                type="checkbox"
                id="is_taxable"
                className="mt-0.5 w-4 h-4 rounded-none cursor-pointer"
                checked={formData.is_taxable}
                onChange={e => setFormData({ ...formData, is_taxable: e.target.checked })}
              />
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block uppercase tracking-wider">Taxable Item</span>
                <span className="text-[11px] text-neutral-500">Apply standard VAT rate on POS checkout</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors">
              <input
                type="checkbox"
                id="require_note"
                className="mt-0.5 w-4 h-4 rounded-none cursor-pointer"
                checked={formData.require_note}
                onChange={e => setFormData({ ...formData, require_note: e.target.checked })}
              />
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white block uppercase tracking-wider">Require Reference Note</span>
                <span className="text-[11px] text-neutral-500">Prompt cashier for reference details when selling</span>
              </div>
            </label>
          </div>
        </div>

        {/* Additional Details (Collapsible) - Kept fully functional with clean styling */}
        <div className="pt-2">
          <button
            type="button"
            className="w-full flex items-center justify-between py-2 px-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-left cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-850 transition-colors"
            onClick={() => setIsAdditionalDetailsOpen(!isAdditionalDetailsOpen)}
          >
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">
              [+] Additional Details & Notes
            </span>
            <span className="text-neutral-500">
              {isAdditionalDetailsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          </button>
          
          {isAdditionalDetailsOpen && (
            <div className="space-y-4 pt-4 p-3 border-x border-b border-neutral-300 dark:border-neutral-800">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                  Minimum Sales Price (€)
                </label>
                <div className="relative w-full sm:w-64">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">€</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm font-mono text-neutral-900 dark:text-white outline-none focus:border-neutral-500"
                    value={formData.min_sales_price}
                    onChange={e => setFormData({ ...formData, min_sales_price: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                    Receipt Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Extra notes to print on receipt..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-500 resize-none font-mono"
                    value={formData.additional_description}
                    onChange={e => setFormData({ ...formData, additional_description: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                    Cart Alert / Upsell Reminder
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Upsell reminder for cashier..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm text-neutral-900 dark:text-white outline-none focus:border-neutral-500 resize-none font-mono"
                    value={formData.alert_message}
                    onChange={e => setFormData({ ...formData, alert_message: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end items-center gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndAddAnother}
            disabled={isSaving}
            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-40"
          >
            {isSaving ? 'Saving...' : 'Save & Add Another'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors border border-neutral-300 dark:border-neutral-800 disabled:opacity-40"
          >
            {isSaving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>

      {/* Quick Add Modals */}
      {(showNewCategoryModal || showNewManufacturerModal) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 font-mono select-none" style={{ fontSize: '16px' }}>
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-[450px] overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-900 flex justify-between items-center">
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
                <label className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider block">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm text-neutral-900 dark:text-white focus:border-neutral-500 font-mono outline-none"
                  placeholder="Enter name..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setShowNewManufacturerModal(false);
                  setNewItemName('');
                }}
                className="px-3 py-1 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={showNewCategoryModal ? handleQuickAddCategory : handleQuickAddManufacturer}
                className="px-4 py-1 bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider cursor-pointer"
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
