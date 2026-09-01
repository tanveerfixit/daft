import React, { useState, useEffect } from 'react';
import { Trash2, List, Link, Edit3, Plus } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-sm px-2 pb-2 pt-0 select-none w-full overflow-auto" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '16px' }}>
      {/* Header bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b border-neutral-300 dark:border-neutral-800 shrink-0 flex justify-between items-center px-4 py-3 mb-2">
        <div className="flex items-center gap-3">
          <h2 className="font-medium text-black dark:text-white" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '24px' }}>Product Details</h2>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 uppercase bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
            {product.product_type}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Edit3 size={15} />
            <span>Edit</span>
          </button>
          <button 
            onClick={handleArchive}
            className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Trash2 size={15} />
            <span>Archive</span>
          </button>
          <button 
            onClick={onBack}
            className="bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <List size={15} />
            <span>Back to List</span>
          </button>
        </div>
      </div>

      {/* Tab selectors */}
      <div className="flex border-b border-neutral-300 dark:border-neutral-800 mb-2 bg-white dark:bg-black px-2 pt-1 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-1 text-xs uppercase font-normal border-b-2 transition-colors cursor-pointer ${
            activeTab === 'info'
              ? 'border-neutral-900 dark:border-neutral-100 text-black dark:text-white bg-neutral-100 dark:bg-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Specification
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-1 text-xs uppercase font-normal border-b-2 transition-colors cursor-pointer ${
            activeTab === 'pricing'
              ? 'border-neutral-900 dark:border-neutral-100 text-black dark:text-white bg-neutral-100 dark:bg-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Special Pricing
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-1 text-xs uppercase font-normal border-b-2 transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'border-neutral-900 dark:border-neutral-100 text-black dark:text-white bg-neutral-100 dark:bg-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Activity Log
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 p-3">
        {activeTab === 'info' && (
          <div className="space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-start">
              {/* Left Column: Compact Image Card */}
              <div className="w-full lg:w-48 shrink-0 flex flex-col items-center p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-md">
                <div className="w-32 h-32 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-md flex items-center justify-center mb-2">
                  <Link size={40} className="text-neutral-400 dark:text-neutral-600" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <button className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs py-1 px-2 uppercase tracking-wide rounded-md cursor-pointer transition-colors">
                    Change Picture
                  </button>
                  <button className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs py-1 px-2 uppercase tracking-wide rounded-md cursor-pointer transition-colors">
                    Web Description
                  </button>
                </div>
              </div>

              {/* Right Column: Borderless clean specification table */}
              <div className="flex-1 w-full">
                <div className="bg-white dark:bg-black overflow-hidden">
                  <table className="w-full border-none text-[15px]">
                    <tbody>
                      {/* Product Name */}
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                          Product Name
                        </td>
                        <td className="py-2 px-3 font-semibold text-black dark:text-white">
                          {product.product_name}
                        </td>
                      </tr>

                      {/* Category */}
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                          Category
                        </td>
                        <td className="py-2 px-3 text-neutral-900 dark:text-neutral-100">
                          {product.category_name || 'Uncategorized'}
                        </td>
                      </tr>

                      {/* Inventory Type */}
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                          Inventory Type
                        </td>
                        <td className="py-2 px-3 capitalize text-neutral-900 dark:text-neutral-100">
                          {product.product_type}
                        </td>
                      </tr>

                      {/* SKU / Barcode */}
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                          SKU / Barcode
                        </td>
                        <td className="py-2 px-3 text-neutral-800 dark:text-neutral-200">
                          {product.sku_code || 'N/A'}
                        </td>
                      </tr>

                      {/* Stock Levels */}
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                          Stock (Need / Have / PO)
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => onViewDevices(product.id)}
                              className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-0 p-0 text-[15px]"
                            >
                              0 / {totalStock} / 0
                            </button>
                            <button 
                              onClick={() => onViewDevices(product.id)}
                              className="cursor-pointer bg-transparent border-0 p-0 text-neutral-500 hover:text-neutral-800 dark:hover:text-white inline-block"
                              title="View Devices"
                            >
                              <Link size={15} />
                            </button>
                            <button 
                              onClick={() => onAddInventory(product.id)}
                              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1 px-3 rounded text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                            >
                              <Plus size={14} />
                              <span>Add Stock</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Minimum Stock */}
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                          Minimum Stock
                        </td>
                        <td className="py-2 px-3 text-neutral-900 dark:text-neutral-100">
                          {product.min_stock_level ?? 0}
                        </td>
                      </tr>

                      {/* Selling Price */}
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                          Selling Price
                        </td>
                        <td className="py-2 px-3 font-semibold text-neutral-900 dark:text-neutral-100">
                          €{(Number(product.selling_price) || 0).toFixed(2)}
                        </td>
                      </tr>

                      {/* Min Selling Price */}
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                          Min Selling Price
                        </td>
                        <td className="py-2 px-3 text-neutral-900 dark:text-neutral-100">
                          €{(Number(product.min_sales_price) || 0).toFixed(2)}
                        </td>
                      </tr>

                      {/* Taxable */}
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                        <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                          Taxable
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[13px] font-semibold ${
                            product.is_taxable === false || product.is_taxable === 0 
                              ? 'text-neutral-500 dark:text-neutral-400' 
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {product.is_taxable === false || product.is_taxable === 0 ? 'No' : 'Yes'}
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
          <div className="flex flex-col h-full text-[15px] font-mono">
            {/* Activity Log Header */}
            <div className="p-2 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-semibold text-black dark:text-white">Activity Log</h3>
              <div className="flex gap-2 items-center">
                <select className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-2 py-0.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none cursor-pointer">
                  <option>All Activities</option>
                </select>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-0.5 px-3 text-xs rounded-md shadow-xs transition-all cursor-pointer font-sans active:scale-[0.98]">
                  + Add Note
                </button>
              </div>
            </div>

            {/* Activity Log Table */}
            <div className="flex-1 overflow-auto bg-white dark:bg-black border-x border-b border-neutral-300 dark:border-neutral-800">
              <table className="w-full text-left border-collapse text-[15px] font-mono">
                <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
                    <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-28 text-center">Date</th>
                    <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-24 text-center">Time</th>
                    <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-36 text-center">User</th>
                    <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-44 text-center">Activity</th>
                    <th className="py-1.5 px-2 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-900">
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-neutral-500 italic text-sm">
                        No activities recorded for this product
                      </td>
                    </tr>
                  ) : (
                    activities.map((activity) => (
                      <tr 
                        key={activity.id} 
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-900 dark:text-neutral-100 text-[15px]"
                      >
                        <td className="py-0.5 px-1.5 border-r border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {new Date(activity.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                        </td>
                        <td className="py-0.5 px-1.5 border-r border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {new Date(activity.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                        </td>
                        <td className="py-0.5 px-1.5 border-r border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">{activity.user_name || 'System'}</td>
                        <td className="py-0.5 px-1.5 border-r border-neutral-300 dark:border-neutral-800">{activity.activity}</td>
                        <td className="py-0.5 px-1.5">{activity.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Activity Log Footer */}
            <div className="p-2 bg-white dark:bg-black border-t border-neutral-300 dark:border-neutral-800 flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400 shrink-0">
              <div className="flex items-center gap-2">
                <select className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-1.5 py-0.5 text-xs outline-none cursor-pointer">
                  <option>20</option>
                </select>
                <span className="font-normal text-xs">1-{activities.length}/{activities.length}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <button className="px-2 py-0.5 border border-neutral-300 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 text-xs cursor-pointer">«</button>
                <button className="px-3 py-0.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rounded-none text-xs font-normal cursor-pointer">1</button>
                <button className="px-2 py-0.5 border border-neutral-300 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 text-xs cursor-pointer">»</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="p-8 text-center text-neutral-500 italic text-xs font-mono">
            No current special pricing adjustment data available
          </div>
        )}
      </div>
    </div>
  );
}
