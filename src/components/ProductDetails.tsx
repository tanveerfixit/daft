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
    <div className="flex flex-col h-full bg-slate-100/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans text-base p-3 select-none w-full overflow-auto">
      {/* Header bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs mb-3 px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Product Details</h1>
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
              {product.product_type}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm cursor-pointer rounded-md transition-colors shadow-xs"
            >
              <Edit3 size={16} />
              Edit
            </button>
            <button 
              onClick={handleArchive}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm cursor-pointer rounded-md transition-colors shadow-xs"
            >
              <Trash2 size={16} />
              Archive
            </button>
            <button 
              onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-sm cursor-pointer rounded-md transition-colors"
            >
              <List size={16} />
              Back to List
            </button>
          </div>
        </div>
      </div>

      {/* Tab selectors */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-3 bg-white dark:bg-slate-900 rounded-t-lg px-3 pt-1.5 gap-1">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-5 py-2.5 text-base font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'info'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Specification
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-5 py-2.5 text-base font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'pricing'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Special Pricing
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-5 py-2.5 text-base font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Activity Log
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs p-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-5 items-start">
              {/* Left Column: Compact Image Card */}
              <div className="w-full lg:w-56 shrink-0 flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="w-36 h-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center mb-3 shadow-2xs">
                  <Link size={52} className="text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <button className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold py-1.5 px-2 rounded-md transition-colors cursor-pointer uppercase tracking-wider">
                    Change Picture
                  </button>
                  <button className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold py-1.5 px-2 rounded-md transition-colors cursor-pointer uppercase tracking-wider">
                    Web Description
                  </button>
                </div>
              </div>

              {/* Right Column: High-contrast compact table */}
              <div className="flex-1 w-full">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-base">
                      {/* Product Name */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="w-1/3 py-2.5 px-4 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                          Product Name
                        </td>
                        <td className="py-2.5 px-4 text-xl font-bold text-slate-900 dark:text-white">
                          {product.product_name}
                        </td>
                      </tr>

                      {/* Category */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="w-1/3 py-2.5 px-4 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                          Category
                        </td>
                        <td className="py-2.5 px-4 text-lg font-semibold text-slate-800 dark:text-slate-200 uppercase">
                          {product.category_name || 'UNCATEGORIZED'}
                        </td>
                      </tr>

                      {/* Inventory Type */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="w-1/3 py-2.5 px-4 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                          Inventory Type
                        </td>
                        <td className="py-2.5 px-4 text-lg font-semibold text-slate-800 dark:text-slate-200 capitalize">
                          {product.product_type}
                        </td>
                      </tr>

                      {/* SKU / Barcode */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="w-1/3 py-2.5 px-4 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                          SKU / Barcode
                        </td>
                        <td className="py-2.5 px-4 text-lg font-mono font-bold text-slate-800 dark:text-slate-200">
                          {product.sku_code || 'N/A'}
                        </td>
                      </tr>

                      {/* Stock Levels */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="w-1/3 py-2.5 px-4 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                          Stock (Need / Have / PO)
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => onViewDevices(product.id)}
                              className="text-xl font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-0 p-0"
                            >
                              0 / {totalStock} / 0
                            </button>
                            <button 
                              onClick={() => onViewDevices(product.id)}
                              className="cursor-pointer bg-transparent border-0 p-0 text-blue-600 dark:text-blue-400 hover:opacity-80"
                              title="View Devices"
                            >
                              <Link size={18} />
                            </button>
                            <button 
                              onClick={() => onAddInventory(product.id)}
                              className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-1 px-3 rounded text-sm transition-colors cursor-pointer border border-amber-500 uppercase tracking-wider shadow-2xs ml-1"
                            >
                              Add Stock
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Minimum Stock */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="w-1/3 py-2.5 px-4 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                          Minimum Stock
                        </td>
                        <td className="py-2.5 px-4 text-lg font-semibold text-slate-800 dark:text-slate-200">
                          {product.min_stock_level ?? 0}
                        </td>
                      </tr>

                      {/* Selling Price */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="w-1/3 py-2.5 px-4 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                          Selling Price
                        </td>
                        <td className="py-2.5 px-4 text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                          €{(Number(product.selling_price) || 0).toFixed(2)}
                        </td>
                      </tr>

                      {/* Min Selling Price */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="w-1/3 py-2.5 px-4 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                          Min Selling Price
                        </td>
                        <td className="py-2.5 px-4 text-lg font-mono font-bold text-slate-800 dark:text-slate-200">
                          €{(Number(product.min_sales_price) || 0).toFixed(2)}
                        </td>
                      </tr>

                      {/* Taxable */}
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="w-1/3 py-2.5 px-4 text-base font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
                          Taxable
                        </td>
                        <td className="py-2.5 px-4 text-base font-bold">
                          <span className={`px-3 py-0.5 rounded text-sm uppercase font-bold ${
                            product.is_taxable === false || product.is_taxable === 0 
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' 
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          }`}>
                            {product.is_taxable === false || product.is_taxable === 0 ? 'NO' : 'YES'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
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
          <div className="flex flex-col h-full text-base">
            {/* Activity Log Header */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center rounded-t-lg">
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Activity Log</h3>
              <div className="flex gap-2 items-center">
                <select className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-sm text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer">
                  <option>All Activities</option>
                </select>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded text-sm cursor-pointer transition-colors shadow-2xs">
                  Add New Note
                </button>
              </div>
            </div>

            {/* Activity Log Table */}
            <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-lg">
              <table className="w-full text-left border-collapse text-base">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <th className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 w-32">Date</th>
                    <th className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 w-28">Time</th>
                    <th className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 w-40">User</th>
                    <th className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 w-48">Activity</th>
                    <th className="py-1.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400 italic text-base">
                        No activities recorded for this product
                      </td>
                    </tr>
                  ) : (
                    activities.map((activity) => (
                      <tr 
                        key={activity.id} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors text-slate-900 dark:text-slate-100 text-base"
                      >
                        <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800">
                          {new Date(activity.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800">
                          {new Date(activity.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800">{activity.user_name || 'System'}</td>
                        <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800">{activity.activity}</td>
                        <td className="py-1.5 px-3">{activity.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Activity Log Footer */}
            <div className="p-1.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1 rounded-lg">
              <div className="flex items-center gap-2">
                <select className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs focus:outline-none cursor-pointer">
                  <option>20</option>
                </select>
                <span className="font-semibold text-xs">1-{activities.length}/{activities.length}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <button className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-xs cursor-pointer">«</button>
                <button className="px-2.5 py-0.5 bg-blue-600 border border-blue-600 text-white rounded text-xs font-bold cursor-pointer">1</button>
                <button className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-xs cursor-pointer">»</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="p-8 text-center text-slate-400 italic text-base">
            No current special pricing adjustment data available
          </div>
        )}
      </div>
    </div>
  );
}
