import React, { useState, useEffect } from 'react';
import { Trash2, List, Link, Edit3 } from 'lucide-react';
import { Product, ProductActivity } from '../types';

interface ProductWithStock extends Product {
  stock: {
    branch_id: number;
    branch_name: string;
    quantity: number;
  }[];
}

type Tab = 'info' | 'pricing' | 'activity';

import ProductFormModal from './ProductFormModal';

export default function ProductDetails({ 
  productId, 
  onBack, 
  onAddInventory,
  onViewDevices
}: { 
  productId: number; 
  onBack: () => void;
  onAddInventory: (productId: number) => void;
  onViewDevices: (productId: number) => void;
}) {
  const [product, setProduct] = useState<ProductWithStock | null>(null);
  const [activities, setActivities] = useState<ProductActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [isEditing, setIsEditing] = useState(false);

  const fetchProductData = () => {
    setLoading(true);
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProductData();
  }, [productId]);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetch(`/api/products/${productId}/activity`)
        .then(res => res.json())
        .then(setActivities);
    }
  }, [productId, activeTab]);

  const handleUpdate = async (formData: Partial<Product>) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsEditing(false);
        fetchProductData();
      }
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this product?')) return;
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        onBack();
      }
    } catch (error) {
      console.error('Error archiving product:', error);
    }
  };

  if (loading && !product) return (
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

  const totalStock = Array.isArray(product.stock) ? product.stock.reduce((acc, s) => acc + s.quantity, 0) : 0;

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-955 dark:text-neutral-100 font-mono text-base px-2 py-2 select-none w-full overflow-auto" style={{ fontSize: '17px' }}>
      {/* Header bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 shrink-0 mb-2">
        <div className="flex items-center justify-between px-4 py-2 flex-wrap md:flex-nowrap gap-2">
          <div className="flex items-center gap-6">
            <h1 className="text-base font-bold tracking-wider uppercase text-[#0285b5] dark:text-[#0285b5]">Product Details</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 font-bold text-sm cursor-pointer rounded-none transition-colors"
            >
              <Edit3 size={13} />
              Edit
            </button>
            <button 
              onClick={handleArchive}
              className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white border border-red-600 font-bold text-sm cursor-pointer rounded-none transition-colors"
            >
              <Trash2 size={13} />
              Archive
            </button>
            <button 
              onClick={onBack}
              className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold text-sm cursor-pointer rounded-none transition-colors"
            >
              <List size={13} />
              Back to List
            </button>
          </div>
        </div>
      </div>

      {/* Tab selectors */}
      <div className="flex border-b border-neutral-300 dark:border-neutral-800 mb-4 bg-white dark:bg-black px-2 pt-2">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 text-sm font-bold border-t border-x -mb-px transition-colors rounded-none cursor-pointer ${
            activeTab === 'info'
              ? 'bg-neutral-200 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 border-b-transparent text-[#0285b5] dark:text-[#0285b5]'
              : 'bg-white dark:bg-black border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
          }`}
        >
          Specification
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 text-sm font-bold border-t border-x -mb-px transition-colors rounded-none cursor-pointer ${
            activeTab === 'pricing'
              ? 'bg-neutral-200 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 border-b-transparent text-[#0285b5] dark:text-[#0285b5]'
              : 'bg-white dark:bg-black border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
          }`}
        >
          Special Pricing
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 text-sm font-bold border-t border-x -mb-px transition-colors rounded-none cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-neutral-200 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 border-b-transparent text-[#0285b5] dark:text-[#0285b5]'
              : 'bg-white dark:bg-black border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
          }`}
        >
          Activity Log
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none p-4">
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left Column: Image Area */}
              <div className="w-full md:w-1/4 flex flex-col items-center">
                <div className="w-48 h-48 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-none flex items-center justify-center mb-4 shadow-none">
                  <Link size={80} className="text-neutral-400 dark:text-neutral-700" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                  <button className="bg-white dark:bg-neutral-900 border border-[#0285b5] text-[#0285b5] hover:bg-blue-50 dark:hover:bg-blue-950/20 text-xs font-bold py-1.5 px-3 rounded-none transition-colors cursor-pointer uppercase">
                    Change Picture
                  </button>
                  <button className="bg-white dark:bg-neutral-900 border border-[#0285b5] text-[#0285b5] hover:bg-blue-50 dark:hover:bg-blue-950/20 text-xs font-bold py-1.5 px-3 rounded-none transition-colors cursor-pointer uppercase">
                    Web Description
                  </button>
                </div>
              </div>

              {/* Right Column: Standard Specification reconciliation table */}
              <div className="flex-1">
                <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 font-mono text-[14px]">
                  <div className="divide-y divide-neutral-300 dark:divide-neutral-800">
                    {/* Product Name */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Product Name :</div>
                      <div className="md:col-span-8 px-3 font-bold text-neutral-900 dark:text-neutral-100 uppercase">{product.product_name}</div>
                    </div>

                    {/* Category */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Category :</div>
                      <div className="md:col-span-8 px-3 text-neutral-850 dark:text-neutral-200 uppercase">{product.category_name || 'UNCATEGORIZED'}</div>
                    </div>

                    {/* Tracking Type */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Inventory Type :</div>
                      <div className="md:col-span-8 px-3 text-neutral-850 dark:text-neutral-200 capitalize">{product.product_type}</div>
                    </div>

                    {/* SKU/Barcode */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">SKU / Barcode :</div>
                      <div className="md:col-span-8 px-3 text-neutral-850 dark:text-neutral-200 font-mono">{product.sku_code || 'N/A'}</div>
                    </div>

                    {/* Stock Levels */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Need / Have / On PO :</div>
                      <div className="md:col-span-8 px-3 flex items-center gap-3">
                        <button 
                          onClick={() => onViewDevices(product.id)}
                          className="text-[#0285b5] font-bold hover:underline cursor-pointer bg-transparent border-0 p-0 text-sm"
                        >
                          0 / {totalStock} / 0
                        </button>
                        <button 
                          onClick={() => onViewDevices(product.id)}
                          className="cursor-pointer bg-transparent border-0 p-0 flex items-center"
                        >
                          <Link size={13} className="text-[#0285b5]" />
                        </button>
                        <button 
                          onClick={() => onAddInventory(product.id)}
                          className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-0.5 px-3 rounded-none text-xs transition-colors cursor-pointer border border-amber-500 uppercase"
                        >
                          Add Stock
                        </button>
                      </div>
                    </div>

                    {/* Minimum Stock */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Minimum Stock :</div>
                      <div className="md:col-span-8 px-3 text-neutral-850 dark:text-neutral-200">0</div>
                    </div>

                    {/* Selling Price */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Selling Price :</div>
                      <div className="md:col-span-8 px-3 font-bold text-neutral-900 dark:text-neutral-100">€{(Number(product.selling_price) || 0).toFixed(2)}</div>
                    </div>

                    {/* Min Selling Price */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Min Selling Price :</div>
                      <div className="md:col-span-8 px-3 text-neutral-850 dark:text-neutral-200">€0.00</div>
                    </div>

                    {/* Taxable */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <div className="md:col-span-4 px-3 md:text-right font-bold text-neutral-500 dark:text-neutral-400 uppercase">Taxable :</div>
                      <div className="md:col-span-8 px-3 text-neutral-850 dark:text-neutral-200 uppercase">YES</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isEditing && (
          <ProductFormModal 
            onClose={() => setIsEditing(false)}
            onSave={handleUpdate}
            initialData={product}
          />
        )}

        {activeTab === 'activity' && (
          <div className="flex flex-col h-full font-mono text-[14px]">
            {/* Activity Log Header */}
            <div className="p-3 bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center rounded-none">
              <h3 className="text-base font-bold text-black dark:text-white uppercase">Activity Log</h3>
              <div className="flex gap-2">
                <select className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none">
                  <option>All Activities</option>
                </select>
                <button className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 font-bold py-1 px-3 rounded-none text-sm cursor-pointer transition-colors">
                  Add New Note
                </button>
              </div>
            </div>

            {/* Activity Log Table */}
            <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-neutral-955 border-b border-neutral-300 dark:border-neutral-800 text-[12px] font-bold text-black dark:text-white uppercase tracking-wider">
                    <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 w-24">Date</th>
                    <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 w-24">Time</th>
                    <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 w-48">User</th>
                    <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 w-64">Activity</th>
                    <th className="px-2 py-1">Details</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-normal">
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-8 text-center text-neutral-400 dark:text-neutral-500 italic text-sm">
                        No activities recorded for this product
                      </td>
                    </tr>
                  ) : (
                    activities.map((activity, idx) => (
                      <tr 
                        key={activity.id} 
                        className={`border-b border-neutral-200 dark:border-neutral-800 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors bg-white dark:bg-black text-neutral-900 dark:text-neutral-100`}
                      >
                        <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {new Date(activity.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                        </td>
                        <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {new Date(activity.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                        </td>
                        <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">{activity.user_name || 'System'}</td>
                        <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-normal">{activity.activity}</td>
                        <td className="px-2 py-1 text-neutral-600 dark:text-neutral-400">{activity.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Activity Log Footer */}
            <div className="p-2 bg-white dark:bg-black border-t border-neutral-300 dark:border-neutral-800 flex justify-between items-center text-[12px] text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <select className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-1 py-0.5 focus:outline-none">
                  <option>20</option>
                </select>
                <span className="font-bold">1-{activities.length}/{activities.length}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <button className="px-2 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none cursor-pointer">«</button>
                <button className="px-3 py-0.5 bg-[#0285b5] border border-[#0285b5] text-white rounded-none font-bold cursor-pointer">1</button>
                <button className="px-2 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none cursor-pointer">»</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="p-8 text-center text-neutral-400 italic font-mono text-[14px]">
            No current special pricing adjustment data available
          </div>
        )}
      </div>
    </div>
  );
}
