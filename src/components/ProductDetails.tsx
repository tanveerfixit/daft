import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  List, 
  Link as LinkIcon, 
  Edit3, 
  Plus, 
  Camera, 
  Barcode, 
  Settings, 
  ChevronDown, 
  Layers,
  Copy
} from 'lucide-react';
import { Product, ProductActivity } from '../types';
import ProductFormModal from './ProductFormModal';

interface ProductWithStock extends Product {
  stock: {
    branch_id: number;
    branch_name: string;
    quantity: number;
  }[];
}

type Tab = 'info' | 'pricing' | 'activity';

export default function ProductDetails({ 
  productId, 
  onBack, 
  onAddInventory,
  onViewDevices,
  onCreateSimilar
}: { 
  productId: number; 
  onBack: () => void;
  onAddInventory: (productId: number) => void;
  onViewDevices: (productId: number) => void;
  onCreateSimilar?: (product: Product) => void;
}) {
  const [product, setProduct] = useState<ProductWithStock | null>(null);
  const [activities, setActivities] = useState<ProductActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  const manageMenuRef = useRef<HTMLDivElement>(null);

  const fetchProductData = () => {
    setLoading(true);
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch product:', err);
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
        .then(setActivities)
        .catch(err => console.error('Failed to fetch product activities:', err));
    }
  }, [productId, activeTab]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (manageMenuRef.current && !manageMenuRef.current.contains(event.target as Node)) {
        setIsManageOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <div className="border border-neutral-300 dark:border-neutral-800 p-6 text-center bg-white dark:bg-black w-64 shadow-sm rounded">
        <div className="text-sm font-bold uppercase tracking-widest animate-pulse">Loading...</div>
        <div className="text-[11px] mt-2 text-neutral-500">Retrieving system data</div>
      </div>
    </div>
  );
  
  if (!product) return (
    <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-950 text-red-500 font-mono p-8 text-base">
      <div className="border border-red-500 p-6 text-center bg-white dark:bg-black rounded shadow-sm">
        <div className="text-sm font-bold uppercase tracking-widest">Product Not Found</div>
        <div className="text-[11px] mt-2 text-red-400">The requested product does not exist</div>
        <button 
          onClick={onBack}
          className="mt-4 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-1.5 text-xs rounded uppercase font-semibold cursor-pointer"
        >
          Return to List
        </button>
      </div>
    </div>
  );

  const totalStock = Array.isArray(product.stock) 
    ? product.stock.reduce((acc, s) => acc + s.quantity, 0) 
    : (product.total_stock || 0);

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-sm p-3 md:p-5 select-none w-full overflow-auto font-sans">
      
      {/* ─── Top Product Header Card ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-4 mb-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Avatar + Title + Barcode + Tracking Info */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative w-16 h-16 md:w-20 md:h-20 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center justify-center shrink-0 group">
            <LinkIcon size={36} className="text-neutral-800 dark:text-neutral-200" strokeWidth={2.2} />
            <div 
              className="absolute bottom-1 right-1 p-1 bg-white dark:bg-neutral-900 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 shadow-xs cursor-pointer hover:text-black dark:hover:text-white transition-colors"
              title="Change Picture"
              onClick={() => setIsEditing(true)}
            >
              <Camera size={12} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
              {product.product_name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
                <Barcode size={13} className="text-neutral-500" />
                <span>{product.sku_code || product.barcode || 'N/A'}</span>
              </span>
              
              {product.manufacturer_name && (
                <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                  {product.manufacturer_name}
                </span>
              )}
            </div>

            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
              Inventory &amp; Tracking Type : <span className="font-semibold text-neutral-800 dark:text-neutral-200 capitalize">{product.product_type || 'Stock'}</span>
            </div>
          </div>
        </div>

        {/* Right: Selling Price & Top Action Buttons */}
        <div className="flex flex-col items-start md:items-end justify-between self-stretch md:self-auto gap-3">
          <div className="text-left md:text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] dark:text-blue-400">
              SELLING PRICE
            </div>
            <div className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white leading-none mt-1">
              €{(Number(product.selling_price) || 0).toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-auto md:mt-2">
            {/* Manage Dropdown */}
            <div className="relative" ref={manageMenuRef}>
              <button 
                onClick={() => setIsManageOpen(!isManageOpen)}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-3.5 rounded text-sm inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Settings size={15} />
                <span>Manage</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isManageOpen ? 'rotate-180' : ''}`} />
              </button>

              {isManageOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-sm">
                  <button
                    onClick={() => { setIsManageOpen(false); setIsEditing(true); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <Edit3 size={15} className="text-[var(--brand-primary)]" />
                    <span>Edit Product</span>
                  </button>
                  <button
                    onClick={() => { 
                      setIsManageOpen(false); 
                      if (onCreateSimilar) {
                        onCreateSimilar(product);
                      }
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <Copy size={15} className="text-[var(--brand-primary)]" />
                    <span>Create Similar Product</span>
                  </button>
                  <button
                    onClick={() => { setIsManageOpen(false); onAddInventory(product.id); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <Plus size={15} className="text-amber-500" />
                    <span>Add Inventory</span>
                  </button>
                  <button
                    onClick={() => { setIsManageOpen(false); onViewDevices(product.id); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <Layers size={15} className="text-neutral-500" />
                    <span>View Devices / Stock</span>
                  </button>
                  <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
                  <button
                    onClick={() => { setIsManageOpen(false); handleArchive(); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <Trash2 size={15} />
                    <span>Archive Product</span>
                  </button>
                </div>
              )}
            </div>

            {/* Products List Button */}
            <button 
              onClick={onBack}
              className="bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-600 font-medium py-1.5 px-3.5 rounded text-sm inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <List size={15} />
              <span>Products List</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-neutral-300 dark:border-neutral-800">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-md border-t border-x transition-colors cursor-pointer ${
            activeTab === 'info'
              ? 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white border-b-white dark:border-b-neutral-900 -mb-[1px] shadow-xs'
              : 'bg-neutral-200/60 dark:bg-neutral-900/40 border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Product Information
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-md border-t border-x transition-colors cursor-pointer ${
            activeTab === 'pricing'
              ? 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white border-b-white dark:border-b-neutral-900 -mb-[1px] shadow-xs'
              : 'bg-neutral-200/60 dark:bg-neutral-900/40 border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Special Pricing
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-md border-t border-x transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white border-b-white dark:border-b-neutral-900 -mb-[1px] shadow-xs'
              : 'bg-neutral-200/60 dark:bg-neutral-900/40 border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Activity Log
        </button>
      </div>

      {/* ─── Tab Content Card ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border-x border-b border-neutral-300 dark:border-neutral-700 rounded-b-md p-6 md:p-8 shadow-xs">
        
        {/* TAB 1: Product Information */}
        {activeTab === 'info' && (
          <div className="space-y-4 max-w-4xl text-[15px] md:text-[16px]">
            {/* Need/Have/OnPO Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 min-w-[200px]">
                Need/Have/OnPO :
              </span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => onViewDevices(product.id)}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-0 p-0 text-[16px] inline-flex items-center gap-1.5"
                >
                  <span>0 / {totalStock} / 0</span>
                  <LinkIcon size={16} className="text-blue-500 dark:text-blue-400" />
                </button>
                
                <button 
                  onClick={() => onAddInventory(product.id)}
                  className="bg-[#f1c40f] hover:bg-[#f39c12] text-neutral-950 font-bold py-1 px-3.5 rounded text-[13px] transition-all cursor-pointer shadow-xs active:scale-[0.98] inline-flex items-center gap-1"
                >
                  <span>Add Inventory</span>
                </button>
              </div>
            </div>

            {/* Minimum Stock */}
            <div className="flex items-center">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 min-w-[200px]">
                Minimum Stock :
              </span>
              <span className="text-neutral-800 dark:text-neutral-200 font-normal">
                {product.min_stock_level ?? 0}
              </span>
            </div>

            {/* Selling Price */}
            <div className="flex items-center">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 min-w-[200px]">
                Selling Price :
              </span>
              <span className="text-neutral-800 dark:text-neutral-200 font-normal">
                €{(Number(product.selling_price) || 0).toFixed(2)}
              </span>
            </div>

            {/* Minimum Selling Price */}
            <div className="flex items-center">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 min-w-[200px]">
                Minimum Selling Price :
              </span>
              <span className="text-neutral-800 dark:text-neutral-200 font-normal">
                €{(Number(product.min_sales_price) || 0).toFixed(2)}
              </span>
            </div>

            {/* Taxable */}
            <div className="flex items-center">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 min-w-[200px]">
                Taxable :
              </span>
              <span className="text-neutral-800 dark:text-neutral-200 font-normal">
                {product.is_taxable === false || product.is_taxable === 0 ? 'No' : 'Yes'}
              </span>
            </div>

            {/* Action Buttons directly under Taxable row */}
            <div className="flex items-center gap-3 pt-6">
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-5 rounded text-[14px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <Edit3 size={15} />
                <span>Edit</span>
              </button>
              <button 
                onClick={handleArchive}
                className="bg-[var(--brand-danger)] hover:bg-rose-600 text-white font-medium py-1.5 px-5 rounded text-[14px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <Trash2 size={15} />
                <span>Archive</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Special Pricing */}
        {activeTab === 'pricing' && (
          <div className="p-8 text-center text-neutral-500 italic text-[15px] font-mono">
            No current special pricing adjustment data available
          </div>
        )}

        {/* TAB 3: Activity Log */}
        {activeTab === 'activity' && (
          <div className="flex flex-col text-sm font-mono">
            {/* Activity Log Header */}
            <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex justify-between items-center rounded-t shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">Activity Log</h3>
              <div className="flex gap-2 items-center">
                <select className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none cursor-pointer rounded">
                  <option>All Activities</option>
                </select>
                <button className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-0.5 px-3 text-xs rounded shadow-xs transition-all cursor-pointer font-sans active:scale-[0.98]">
                  + Add Note
                </button>
              </div>
            </div>

            {/* Activity Log Table */}
            <div className="overflow-auto bg-white dark:bg-neutral-900 border-x border-b border-neutral-300 dark:border-neutral-700 max-h-96">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-black dark:text-white text-center">
                    <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-28 text-center">Date</th>
                    <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-24 text-center">Time</th>
                    <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-36 text-center">User</th>
                    <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-44 text-center">Activity</th>
                    <th className="py-1.5 px-2 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-neutral-500 italic text-xs">
                        No activities recorded for this product
                      </td>
                    </tr>
                  ) : (
                    activities.map((activity) => (
                      <tr 
                        key={activity.id} 
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-neutral-900 dark:text-neutral-100 text-xs"
                      >
                        <td className="py-1 px-2 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {new Date(activity.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                        </td>
                        <td className="py-1 px-2 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {new Date(activity.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                        </td>
                        <td className="py-1 px-2 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">{activity.user_name || 'System'}</td>
                        <td className="py-1 px-2 border-r border-neutral-200 dark:border-neutral-800 font-semibold">{activity.activity || (activity as any).activity_type || 'Activity'}</td>
                        <td className="py-1 px-2">{activity.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Activity Log Footer */}
            <div className="p-2 bg-white dark:bg-neutral-900 border-x border-b border-neutral-300 dark:border-neutral-700 rounded-b flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400 shrink-0">
              <div className="flex items-center gap-2">
                <select className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 text-xs outline-none cursor-pointer rounded">
                  <option>20</option>
                </select>
                <span className="font-normal text-xs">1-{activities.length}/{activities.length}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <button className="px-2 py-0.5 border border-neutral-300 dark:border-neutral-700 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs cursor-pointer">«</button>
                <button className="px-2.5 py-0.5 bg-[var(--brand-primary)] text-white rounded text-xs font-semibold cursor-pointer">1</button>
                <button className="px-2 py-0.5 border border-neutral-300 dark:border-neutral-700 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs cursor-pointer">»</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ─── Edit Modal ──────────────────────────────────────────────────────── */}
      {isEditing && (
        <ProductFormModal 
          onClose={() => setIsEditing(false)}
          onSave={handleUpdate}
          initialData={product}
        />
      )}

    </div>
  );
}
