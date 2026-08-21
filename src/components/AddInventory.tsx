import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Smartphone, AlertTriangle, Check } from 'lucide-react';
import { Product, Branch, Supplier } from '../types';

interface SerializedItem {
  imei: string;
  color: string;
  gb: string;
  condition: string;
  duplicateError?: string | null;
  isChecking?: boolean;
}

export default function AddInventory({ 
  productId, 
  onBack, 
  onSuccess 
}: { 
  productId: number; 
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [branchId, setBranchId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [poNumber, setPoNumber] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  
  // Quick Add Supplier State
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({ name: '', phone: '', email: '' });
  const [supplierStatus, setSupplierStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Serialized Items State
  const [items, setItems] = useState<SerializedItem[]>([
    { imei: '', color: '', gb: '128', condition: 'New' }
  ]);

  // Input refs for barcode scanner navigation
  const imeiInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleQuickAddSupplier = async () => {
    if (!newSupplierData.name.trim()) return;
    setSupplierStatus(null);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSupplierData,
          contact_person: newSupplierData.name // Default to name
        })
      });
      if (res.ok) {
        const newSup = await res.json();
        setSuppliers(prev => [...prev, newSup]);
        setSupplierId(newSup.id.toString());
        setNewSupplierData({ name: '', phone: '', email: '' });
        setSupplierStatus({ type: 'success', msg: 'Supplier added successfully!' });
        setTimeout(() => {
          setShowNewSupplierModal(false);
          setSupplierStatus(null);
        }, 1500);
      } else {
        const err = await res.json();
        setSupplierStatus({ type: 'error', msg: err.error || 'Failed to add supplier' });
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
      setSupplierStatus({ type: 'error', msg: 'Connection error' });
    }
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${productId}`).then(res => res.json()),
      fetch('/api/branches').then(res => res.json()),
      fetch('/api/suppliers').then(res => res.json())
    ]).then(([prodData, branchData, supplierData]) => {
      setProduct(prodData);
      setBranches(branchData);
      if (branchData.length > 0) {
        setBranchId(branchData[0].id.toString());
      }
      setSuppliers(supplierData);
      setCostPrice(prodData.cost_price?.toString() || '');
      setSellingPrice(prodData.selling_price?.toString() || '');
      setLoading(false);
    });
  }, [productId]);

  // Auto focus first IMEI input when serialized product is loaded
  useEffect(() => {
    if (!loading && product?.product_type === 'serialized') {
      setTimeout(() => {
        imeiInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [loading, product]);

  const checkImeiDuplicate = async (imei: string, index: number, currentItems: SerializedItem[]) => {
    const cleanImei = imei.trim();
    if (!cleanImei) {
      setItems(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], duplicateError: null, isChecking: false };
        }
        return updated;
      });
      return;
    }

    // 1. Check in-batch duplicate
    const isBatchDuplicate = currentItems.some((it, i) => i !== index && it.imei.trim().toLowerCase() === cleanImei.toLowerCase());
    if (isBatchDuplicate) {
      setItems(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            duplicateError: 'Duplicate IMEI in current list',
            isChecking: false
          };
        }
        return updated;
      });
      return;
    }

    // 2. Check Database inventory duplicate
    try {
      setItems(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], isChecking: true };
        }
        return updated;
      });

      const res = await fetch(`/api/devices/check-imei?imei=${encodeURIComponent(cleanImei)}`);
      const data = await res.json();

      setItems(prev => {
        const updated = [...prev];
        if (updated[index]) {
          if (data.exists && data.device) {
            const dev = data.device;
            updated[index] = {
              ...updated[index],
              duplicateError: `Already in inventory: ${dev.product_name || 'Device'} (${dev.status || 'in_stock'}${dev.branch_name ? ' @ ' + dev.branch_name : ''})`,
              isChecking: false
            };
          } else {
            updated[index] = {
              ...updated[index],
              duplicateError: null,
              isChecking: false
            };
          }
        }
        return updated;
      });
    } catch (err) {
      console.error('Error checking IMEI:', err);
      setItems(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], isChecking: false };
        }
        return updated;
      });
    }
  };

  const handleAddItem = (defaultValues?: Partial<SerializedItem>) => {
    const newItem: SerializedItem = {
      imei: defaultValues?.imei || '',
      color: defaultValues?.color || '',
      gb: defaultValues?.gb || '128',
      condition: defaultValues?.condition || 'New',
      duplicateError: null
    };

    setItems(prev => {
      const nextList = [...prev, newItem];
      const nextIndex = nextList.length - 1;
      setTimeout(() => {
        imeiInputRefs.current[nextIndex]?.focus();
      }, 50);
      return nextList;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => {
      const remaining = prev.filter((_, i) => i !== index);
      // Re-validate remaining items for duplicates
      setTimeout(() => {
        remaining.forEach((it, idx) => {
          if (it.imei.trim()) {
            checkImeiDuplicate(it.imei, idx, remaining);
          }
        });
      }, 50);
      return remaining;
    });
  };

  const handleItemChange = (index: number, field: keyof SerializedItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'imei') {
        // Trigger duplicate check
        checkImeiDuplicate(value, index, updated);
      }
      return updated;
    });
  };

  // Barcode scan handler: on Enter key, advance to next row or create a new row immediately
  const handleImeiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      
      const currentItem = items[idx];
      const currentImei = currentItem?.imei?.trim();
      
      if (currentImei) {
        // Validate current IMEI
        checkImeiDuplicate(currentImei, idx, items);
      }

      if (idx === items.length - 1) {
        // We are on the last line: auto create next line and copy GB & Condition from current row
        handleAddItem({
          gb: currentItem?.gb || '128',
          condition: currentItem?.condition || 'New',
          color: currentItem?.color || ''
        });
      } else {
        // Focus the existing next line's IMEI field
        imeiInputRefs.current[idx + 1]?.focus();
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!branchId) return alert('Please select a branch');

    let validSerializedItems: typeof items = [];
    if (product?.product_type === 'serialized') {
      // Filter out any blank or empty rows
      validSerializedItems = items.filter(it => it.imei && it.imei.trim().length > 0);
      
      if (validSerializedItems.length === 0) {
        return alert('Please enter at least one device with an IMEI / Serial number.');
      }

      const duplicateErrors = validSerializedItems.filter(it => it.duplicateError);
      if (duplicateErrors.length > 0) {
        return alert(`Cannot save: ${duplicateErrors.length} item(s) have duplicate/invalid IMEIs. Please resolve errors before saving.`);
      }
    }

    const payload = {
      sku_id: productId,
      branch_id: parseInt(branchId),
      quantity: product?.product_type === 'serialized' ? validSerializedItems.length : parseInt(quantity),
      cost_price: parseFloat(costPrice) || 0,
      selling_price: parseFloat(sellingPrice) || 0,
      supplier_id: supplierId ? parseInt(supplierId) : null,
      po_number: poNumber,
      items: product?.product_type === 'serialized' ? validSerializedItems.map(it => ({
        imei: it.imei.trim(),
        color: it.color,
        gb: it.gb,
        condition: it.condition
      })) : []
    };

    try {
      const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to add inventory');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono p-8 text-base">
      <div className="border border-neutral-300 dark:border-neutral-800 p-6 text-center bg-white dark:bg-black w-64">
        <div className="text-sm font-bold uppercase tracking-widest animate-pulse">Loading...</div>
        <div className="text-[10px] mt-2 text-neutral-500">Retrieving system data</div>
      </div>
    </div>
  );
  
  if (!product) return (
    <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-950 text-red-500 font-mono p-8 text-base">
      <div className="border border-red-500 p-6 text-center bg-white dark:bg-black">
        <div className="text-sm font-bold uppercase tracking-widest">Product Not Found</div>
        <div className="text-[10px] mt-2 text-red-400">The requested product does not exist</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-100/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans text-base p-3 select-none w-full overflow-auto">
      {/* Reusable Datalist for Storage options */}
      <datalist id="storage-presets">
        <option value="128" />
        <option value="256" />
        <option value="64" />
        <option value="512" />
        <option value="1TB" />
        <option value="128GB" />
        <option value="256GB" />
        <option value="64GB" />
        <option value="512GB" />
      </datalist>

      {/* Header bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs mb-3 px-4 py-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Add Inventory</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
              {product.product_type}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 hidden lg:inline">
              {product.manufacturer_name && <span className="font-semibold text-slate-700 dark:text-slate-300">{product.manufacturer_name} • </span>}
              {product.product_name} 
              {product.sku_code && <span className="font-mono text-xs ml-1 text-slate-400">({product.sku_code})</span>}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => handleSubmit()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm cursor-pointer rounded-md transition-colors shadow-xs"
            >
              <Save size={15} />
              Save Inventory
            </button>
            <button 
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-sm cursor-pointer rounded-md transition-colors"
            >
              <ArrowLeft size={15} />
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Specification Style Compact Configuration Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Product Info Description */}
                <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                  <td className="w-1/3 py-1.5 px-3 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                    Product To Increase
                  </td>
                  <td className="py-1.5 px-3 text-lg font-bold text-slate-900 dark:text-white uppercase">
                    {product.manufacturer_name && `${product.manufacturer_name} - `}{product.product_name} {product.sku_code && `(${product.sku_code})`}
                  </td>
                </tr>

                {/* Branch Selection */}
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="w-1/3 py-1.5 px-3 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                    Select Branch *
                  </td>
                  <td className="py-1.5 px-3">
                    <select 
                      required
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                    >
                      <option value="">Choose Branch</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </td>
                </tr>

                {/* Supplier */}
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="w-1/3 py-1.5 px-3 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                    Supplier
                  </td>
                  <td className="py-1.5 px-3">
                    <div className="flex items-center gap-3">
                      <select 
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                      >
                        <option value="">Choose Supplier</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <button 
                        type="button"
                        onClick={() => setShowNewSupplierModal(true)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer whitespace-nowrap"
                      >
                        <Plus size={14} /> Quick Add
                      </button>
                    </div>
                  </td>
                </tr>

                {/* PO Reference */}
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="w-1/3 py-1.5 px-3 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                    PO Reference
                  </td>
                  <td className="py-1.5 px-3">
                    <input 
                      type="text"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="e.g. PO-12345"
                      className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </td>
                </tr>

                {/* Cost Price */}
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="w-1/3 py-1.5 px-3 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                    Cost Price (€)
                  </td>
                  <td className="py-1.5 px-3">
                    <input 
                      type="number"
                      step="0.01"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full max-w-[160px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono font-bold"
                    />
                  </td>
                </tr>

                {/* Selling Price */}
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="w-1/3 py-1.5 px-3 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                    Selling Price (€)
                  </td>
                  <td className="py-1.5 px-3">
                    <input 
                      type="number"
                      step="0.01"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full max-w-[160px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-lg text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500 font-mono font-bold"
                    />
                  </td>
                </tr>

                {/* Non-Serialized Quantity */}
                {product.product_type !== 'serialized' && (
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="w-1/3 py-1.5 px-3 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                      Quantity to Add
                    </td>
                    <td className="py-1.5 px-3">
                      <input 
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full max-w-[160px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono font-bold"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Serialized Items Table */}
          {product.product_type === 'serialized' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs mt-4">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Smartphone size={18} className="text-blue-600 dark:text-blue-400" />
                    Serialized Items
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-medium">
                    Scan barcode & press Enter to auto-advance
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleAddItem()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3.5 rounded-md text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Plus size={13} />
                  Add Row
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-1.5 px-2.5 w-12 text-center">#</th>
                      <th className="py-1.5 px-2.5 min-w-[280px]">IMEI / Serial Number</th>
                      <th className="py-1.5 px-2.5 w-48">Storage (GB)</th>
                      <th className="py-1.5 px-2.5 w-44">Color</th>
                      <th className="py-1.5 px-2.5 w-40">Condition</th>
                      <th className="py-1.5 px-2.5 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {items.map((item, idx) => {
                      const hasError = !!item.duplicateError;
                      return (
                        <tr 
                          key={idx} 
                          className={`text-base transition-colors ${
                            hasError 
                              ? 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200' 
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <td className="py-1.5 px-2.5 text-center text-slate-500 font-mono text-base font-bold align-top pt-2">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2.5 align-top">
                            <div className="relative">
                              <input 
                                ref={el => { imeiInputRefs.current[idx] = el; }}
                                type="text"
                                required
                                value={item.imei}
                                onChange={(e) => handleItemChange(idx, 'imei', e.target.value)}
                                onKeyDown={(e) => handleImeiKeyDown(e, idx)}
                                onBlur={() => checkImeiDuplicate(item.imei, idx, items)}
                                placeholder="Scan or type IMEI (Press Enter for next line)..."
                                className={`w-full px-2.5 py-1 text-base font-mono border rounded-md focus:outline-none transition-colors ${
                                  hasError 
                                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold focus:ring-1 focus:ring-rose-500' 
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-500'
                                }`}
                              />
                              {item.isChecking && (
                                <span className="absolute right-2 top-1.5 text-xs text-slate-400 animate-pulse font-mono">
                                  checking...
                                </span>
                              )}
                            </div>
                            {item.duplicateError && (
                              <div className="flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1 bg-rose-100/60 dark:bg-rose-950/80 p-1.5 rounded-md border border-rose-300 dark:border-rose-800">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                                <span>{item.duplicateError}</span>
                              </div>
                            )}
                          </td>

                          {/* Storage with 128, 256 dropdown & manual entry */}
                          <td className="py-1.5 px-2.5 align-top">
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="text"
                                list="storage-presets"
                                value={item.gb}
                                onChange={(e) => handleItemChange(idx, 'gb', e.target.value)}
                                placeholder="128, 256..."
                                className="w-full px-2.5 py-1 text-base border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:border-blue-500 font-medium"
                              />
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleItemChange(idx, 'gb', '128')}
                                  className={`px-2 py-0.5 text-xs font-bold rounded-md border transition-colors cursor-pointer ${
                                    item.gb === '128' || item.gb === '128GB'
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                                  }`}
                                  title="Quick select 128"
                                >
                                  128
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleItemChange(idx, 'gb', '256')}
                                  className={`px-2 py-0.5 text-xs font-bold rounded-md border transition-colors cursor-pointer ${
                                    item.gb === '256' || item.gb === '256GB'
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                                  }`}
                                  title="Quick select 256"
                                >
                                  256
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Color */}
                          <td className="py-1.5 px-2.5 align-top">
                            <input 
                              type="text"
                              value={item.color}
                              onChange={(e) => handleItemChange(idx, 'color', e.target.value)}
                              placeholder="e.g. Black, Blue"
                              className="w-full px-2.5 py-1 text-base border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:border-blue-500"
                            />
                          </td>

                          {/* Condition */}
                          <td className="py-1.5 px-2.5 align-top">
                            <select 
                              value={item.condition}
                              onChange={(e) => handleItemChange(idx, 'condition', e.target.value)}
                              className="w-full px-2.5 py-1 text-base border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                            >
                              <option value="New">New</option>
                              <option value="A">Grade A</option>
                              <option value="B">Grade B</option>
                              <option value="C">Grade C</option>
                              <option value="Faulty">Faulty</option>
                            </select>
                          </td>

                          {/* Remove button */}
                          <td className="py-1.5 px-2.5 text-center align-top pt-2">
                            {items.length > 1 && (
                              <button 
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer bg-transparent border-none p-0"
                                title="Remove row"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
                <div>
                  {items.some(i => i.duplicateError) ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                      <AlertTriangle size={15} />
                      Duplicate / existing IMEI detected in table
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                      <Check size={15} /> Ready to save
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-slate-500 uppercase mr-2 text-xs">Total Items:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-base">{items.length}</span>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Quick Add Supplier Modal */}
      {showNewSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-base">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col rounded-xl shadow-xl">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Add New Supplier</h3>
            </div>
            
            <div className="p-5 space-y-4">
              {supplierStatus && (
                <div className={`p-3 border text-sm font-semibold rounded-lg ${
                  supplierStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
                }`}>
                  {supplierStatus.msg}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Supplier Name *</label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Apple Wholesale"
                  value={newSupplierData.name}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    placeholder="Phone number"
                    value={newSupplierData.phone}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    placeholder="Email address"
                    value={newSupplierData.email}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowNewSupplierModal(false);
                  setNewSupplierData({ name: '', phone: '', email: '' });
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold py-1.5 px-4 rounded-md text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAddSupplier}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-md text-sm cursor-pointer transition-colors shadow-xs"
              >
                Add Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
