import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Smartphone } from 'lucide-react';
import { Product, Branch, Supplier } from '../types';
import { useAuth } from '../context/AuthContext';

export default function AddInventory({ 
  productId, 
  onBack, 
  onSuccess 
}: { 
  productId: number; 
  onBack: () => void;
  onSuccess: () => void;
}) {
  const { currentUser } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [branchId, setBranchId] = useState<string>(currentUser?.branch_id?.toString() || '');
  const [supplierId, setSupplierId] = useState<string>('');
  const [poNumber, setPoNumber] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  
  // Quick Add Supplier State
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({ name: '', phone: '', email: '' });
  const [supplierStatus, setSupplierStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

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

  // Serialized Items State
  const [items, setItems] = useState<{ imei: string; color: string; gb: string; condition: string }[]>([
    { imei: '', color: '', gb: '', condition: 'New' }
  ]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${productId}`).then(res => res.json()),
      fetch('/api/branches').then(res => res.json()),
      fetch('/api/suppliers').then(res => res.json())
    ]).then(([prodData, branchData, supplierData]) => {
      setProduct(prodData);
      setBranches(branchData);
      if (currentUser?.branch_id) {
        setBranchId(currentUser.branch_id.toString());
      } else if (branchData.length > 0) {
        setBranchId(branchData[0].id.toString());
      }
      setSuppliers(supplierData);
      setCostPrice(prodData.cost_price?.toString() || '');
      setSellingPrice(prodData.selling_price?.toString() || '');
      setLoading(false);
    });
  }, [productId, currentUser]);

  const handleAddItem = () => {
    setItems([...items, { imei: '', color: '', gb: '', condition: 'New' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!branchId) return alert('Please select a branch');

    const filteredItems = product?.product_type === 'serialized'
      ? items.filter(item => item.imei && item.imei.trim() !== '')
      : [];

    if (product?.product_type === 'serialized' && filteredItems.length === 0) {
      return alert('Please enter at least one valid IMEI/Serial number.');
    }

    const payload = {
      sku_id: productId,
      branch_id: parseInt(branchId),
      quantity: product?.product_type === 'serialized' ? filteredItems.length : parseInt(quantity),
      cost_price: parseFloat(costPrice),
      selling_price: parseFloat(sellingPrice),
      supplier_id: supplierId ? parseInt(supplierId) : null,
      po_number: poNumber,
      items: filteredItems
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
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-955 dark:text-neutral-100 font-mono text-base px-2 py-2 select-none w-full overflow-auto" style={{ fontSize: '17px' }}>
      {/* Header bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 shrink-0 mb-2">
        <div className="flex items-center justify-between px-4 py-2 flex-wrap md:flex-nowrap gap-2">
          <div className="flex items-center gap-6">
            <h1 className="text-base font-bold tracking-wider uppercase text-[#0285b5] dark:text-[#0285b5]">Add Inventory</h1>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden lg:inline">
              {product.manufacturer_name && <span className="font-bold text-neutral-700 dark:text-neutral-300">{product.manufacturer_name}</span>} • {product.product_name} • <span className="font-mono">{product.sku_code}</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => handleSubmit()}
              className="flex items-center gap-1 px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 font-bold text-sm cursor-pointer rounded-none transition-colors"
            >
              <Save size={13} />
              Save Inventory
            </button>
            <button 
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold text-sm cursor-pointer rounded-none transition-colors"
            >
              <ArrowLeft size={13} />
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Specification Reconciliation Style Grid */}
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 font-mono text-[14px]">
            <div className="divide-y divide-neutral-300 dark:divide-neutral-800">
              {/* Product Info Description */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-neutral-50 dark:bg-neutral-950 font-bold">
                <div className="md:col-span-4 px-3 md:text-right text-neutral-600 dark:text-neutral-400">PRODUCT TO INCREASE :</div>
                <div className="md:col-span-8 px-3 text-neutral-900 dark:text-neutral-100 uppercase">
                  {product.manufacturer_name && `${product.manufacturer_name} - `}{product.product_name} ({product.sku_code})
                </div>
              </div>

              {/* Branch Selection (Locked to Active Branch) */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Active Branch :</div>
                <div className="md:col-span-8 px-3">
                  <span className="inline-block bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 px-3 py-1.5 text-sm font-bold uppercase rounded-none select-none">
                    {currentUser?.branch_name || 'Loading active branch...'}
                  </span>
                </div>
              </div>

              {/* Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Supplier :</div>
                <div className="md:col-span-8 px-3 flex items-center gap-4">
                  <select 
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full max-w-md bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  >
                    <option value="">Choose Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button 
                    type="button"
                    onClick={() => setShowNewSupplierModal(true)}
                    className="text-[#0285b5] hover:underline text-xs font-bold flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer"
                  >
                    <Plus size={12} /> Quick Add
                  </button>
                </div>
              </div>

              {/* PO Reference */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">PO Reference :</div>
                <div className="md:col-span-8 px-3">
                  <input 
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="e.g. PO-12345"
                    className="w-full max-w-md bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Cost Price */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Cost Price (€) :</div>
                <div className="md:col-span-8 px-3">
                  <input 
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full max-w-[150px] bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Selling Price */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Selling Price (€) :</div>
                <div className="md:col-span-8 px-3">
                  <input 
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full max-w-[150px] bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Non-Serialized Quantity */}
              {product.product_type !== 'serialized' && (
                <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Quantity to Add :</div>
                  <div className="md:col-span-8 px-3">
                    <input 
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full max-w-[150px] bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Serialized Items Table */}
          {product.product_type === 'serialized' && (
            <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 font-mono text-[14px]">
              <div className="p-3 bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center rounded-none">
                <h3 className="text-base font-bold text-black dark:text-white uppercase flex items-center gap-2">
                  <Smartphone size={16} className="text-[#0285b5]" />
                  Serialized Items
                </h3>
                <button 
                  type="button"
                  onClick={handleAddItem}
                  className="bg-[#0285b5] hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-none text-xs flex items-center gap-1 transition-all cursor-pointer border border-[#0285b5]"
                >
                  <Plus size={12} />
                  Add Row
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-955 border-b border-neutral-300 dark:border-neutral-800 text-[11px] font-bold text-black dark:text-white uppercase tracking-wider">
                      <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800 w-12 text-center">#</th>
                      <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800">IMEI / Serial Number</th>
                      <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800">Color</th>
                      <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800">GB</th>
                      <th className="px-3 py-2 border-r border-neutral-300 dark:border-neutral-800">Condition</th>
                      <th className="px-3 py-2 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-850">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-900 text-sm bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
                        <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-500 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800">
                          <input 
                            type="text"
                            required
                            value={item.imei}
                            onChange={(e) => handleItemChange(idx, 'imei', e.target.value)}
                            placeholder="Scan IMEI..."
                            className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none outline-none font-mono text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                          />
                        </td>
                        <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800">
                          <input 
                            type="text"
                            value={item.color}
                            onChange={(e) => handleItemChange(idx, 'color', e.target.value)}
                            placeholder="Color"
                            className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                          />
                        </td>
                        <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800">
                          <input 
                            type="text"
                            value={item.gb}
                            onChange={(e) => handleItemChange(idx, 'gb', e.target.value)}
                            placeholder="GB"
                            className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                          />
                        </td>
                        <td className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800">
                          <select 
                            value={item.condition}
                            onChange={(e) => handleItemChange(idx, 'condition', e.target.value)}
                            className="bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none outline-none text-neutral-900 dark:text-neutral-100 cursor-pointer"
                          >
                            <option className="bg-white dark:bg-black text-black dark:text-white">New</option>
                            <option className="bg-white dark:bg-black text-black dark:text-white">A</option>
                            <option className="bg-white dark:bg-black text-black dark:text-white">B</option>
                            <option className="bg-white dark:bg-black text-black dark:text-white">C</option>
                            <option className="bg-white dark:bg-black text-black dark:text-white">Faulty</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {items.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-neutral-400 hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800 text-right text-xs">
                <span className="font-bold text-neutral-500 uppercase mr-2">Total Rows:</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">{items.length}</span>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Quick Add Supplier Modal */}
      {showNewSupplierModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 font-mono text-base">
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-md overflow-hidden flex flex-col rounded-none shadow-none">
            <div className="bg-neutral-100 dark:bg-neutral-900 px-4 py-2.5 border-b border-neutral-300 dark:border-neutral-800">
              <h3 className="font-bold text-black dark:text-white uppercase text-sm">Add New Supplier</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {supplierStatus && (
                <div className={`p-2 border text-sm font-bold rounded-none ${
                  supplierStatus.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {supplierStatus.msg}
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 uppercase">Supplier Name *</label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-0"
                  placeholder="e.g. Apple Wholesale"
                  value={newSupplierData.name}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Phone</label>
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-0"
                    placeholder="Phone number"
                    value={newSupplierData.phone}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Email</label>
                  <input
                    type="email"
                    className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-0"
                    placeholder="Email address"
                    value={newSupplierData.email}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-950 px-4 py-3 border-t border-neutral-300 dark:border-neutral-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleQuickAddSupplier}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded-none text-xs cursor-pointer transition-colors border border-blue-600 uppercase"
              >
                Add Supplier
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewSupplierModal(false);
                  setNewSupplierData({ name: '', phone: '', email: '' });
                }}
                className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold py-1 px-4 rounded-none text-xs cursor-pointer transition-colors uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
