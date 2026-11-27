import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Copy,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { Product, ProductActivity } from '../types';
import ProductFormModal from './ProductFormModal';
import { invalidateCache } from '../utils/cache';

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
  const navigate = useNavigate();
  const { branchSlug } = useParams<{ branchSlug?: string }>();
  const [product, setProduct] = useState<ProductWithStock | null>(null);
  const [activities, setActivities] = useState<ProductActivity[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [activityFilter, setActivityFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityLoading, setActivityLoading] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [copiedSku, setCopiedSku] = useState(false);

  const manageMenuRef = useRef<HTMLDivElement>(null);
  const activityLimit = 50;

  const fetchActivities = useCallback((page = activityPage, filter = activityFilter, search = activitySearch) => {
    setActivityLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(activityLimit),
      activity_type: filter,
      search
    });
    fetch(`/api/products/${productId}/activity?${params.toString()}`)
      .then(res => res.json())
      .then(payload => {
        if (Array.isArray(payload)) {
          setActivities(payload);
          setActivityTotal(payload.length);
        } else {
          setActivities(payload.data || []);
          setActivityTotal(Number(payload.total || 0));
          if (Array.isArray(payload.activityTypes)) {
            setActivityTypes(payload.activityTypes);
          }
        }
      })
      .catch(err => console.error('Failed to fetch product activities:', err))
      .finally(() => setActivityLoading(false));
  }, [productId, activityPage, activityFilter, activitySearch]);

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
    setActivityPage(1);
    setActivityFilter('all');
    setActivitySearch('');
    fetchProductData();
  }, [productId]);

  useEffect(() => {
    if (activeTab === 'activity') {
      const timer = setTimeout(() => {
        fetchActivities(activityPage, activityFilter, activitySearch);
      }, activitySearch ? 200 : 0);
      return () => clearTimeout(timer);
    }
  }, [productId, activeTab, activityPage, activityFilter, activitySearch, fetchActivities]);

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
        invalidateCache('products_');
        invalidateCache('devices_');
        setIsEditing(false);
        fetchProductData();
        if (activeTab === 'activity') {
          fetchActivities(1, activityFilter, activitySearch);
          setActivityPage(1);
        }
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
        invalidateCache('products_');
        onBack();
      }
    } catch (error) {
      console.error('Error archiving product:', error);
    }
  };

  if (loading && !product) return (
    <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono p-8 text-base">
      <div className="border border-neutral-300 dark:border-neutral-800 p-6 text-center bg-white dark:bg-black w-64 rounded">
        <div className="text-sm font-bold uppercase tracking-widest animate-pulse">Loading...</div>
        <div className="text-[11px] mt-2 text-neutral-500">Retrieving system data</div>
      </div>
    </div>
  );
  
  if (!product) return (
    <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-950 text-red-500 font-mono p-8 text-base">
      <div className="border border-red-500 p-6 text-center bg-white dark:bg-black rounded">
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

  const handleAddNote = async () => {
    const trimmed = noteText.trim();
    if (!trimmed || savingNote) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/products/${productId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: 'Note Added', details: trimmed })
      });
      if (res.ok) {
        setNoteText('');
        setShowNoteInput(false);
        setActivityPage(1);
        fetchActivities(1, activityFilter, activitySearch);
      }
    } catch (err) {
      console.error('Failed to add product note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const activityTypeOptions = activityTypes.length > 0
    ? activityTypes
    : Array.from(
        new Set(activities.map(a => a.activity || (a as any).activity_type || 'Activity').filter(Boolean))
      ).sort();

  const totalPages = Math.max(1, Math.ceil(activityTotal / activityLimit));

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-sm p-3 md:p-5 select-none w-full overflow-auto font-sans">
      
      {/* ─── Top Product Header Card ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Avatar + Title + Barcode + Tracking Info */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative w-16 h-16 md:w-20 md:h-20 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center justify-center shrink-0 group">
            <LinkIcon size={36} className="text-neutral-800 dark:text-neutral-200" strokeWidth={2.2} />
            <div 
              className="absolute bottom-1 right-1 p-1 bg-white dark:bg-neutral-900 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 cursor-pointer hover:text-black dark:hover:text-white transition-colors"
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
              <button
                type="button"
                onClick={() => {
                  const code = product.sku_code || product.barcode;
                  if (!code) return;
                  navigator.clipboard?.writeText(String(code)).then(() => {
                    setCopiedSku(true);
                    setTimeout(() => setCopiedSku(false), 1500);
                  }).catch(() => {});
                }}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-mono hover:border-neutral-400 transition-colors cursor-pointer"
                title="Copy SKU / Barcode"
              >
                <Barcode size={13} className="text-neutral-500" />
                <span>{product.sku_code || product.barcode || 'N/A'}</span>
                {copiedSku ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-neutral-400" />}
              </button>
              
              {product.manufacturer_name && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700">•</span>
                  <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                    {product.manufacturer_name}
                  </span>
                </>
              )}

              {product.category_name && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700">•</span>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {product.category_name}
                  </span>
                </>
              )}
            </div>

            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Type: <span className="font-semibold text-neutral-800 dark:text-neutral-200 capitalize">{product.product_type || 'Stock'}</span>
              {product.product_type !== 'service' && (
                <>
                  <span className="mx-2 text-neutral-300 dark:text-neutral-700">•</span>
                  In Stock: <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">{totalStock}</span>
                </>
              )}
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
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-3.5 rounded text-sm inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
              >
                <Settings size={15} />
                <span>Manage</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isManageOpen ? 'rotate-180' : ''}`} />
              </button>

              {isManageOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-sm">
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
                  {product.product_type !== 'service' && (
                    <button
                      onClick={() => { setIsManageOpen(false); onAddInventory(product.id); }}
                      className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-2.5 cursor-pointer font-medium"
                    >
                      <Plus size={15} className="text-amber-500" />
                      <span>Add Inventory</span>
                    </button>
                  )}
                  {product.product_type === 'serialized' && (
                    <button
                      onClick={() => { setIsManageOpen(false); onViewDevices(product.id); }}
                      className="w-full text-left px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-2.5 cursor-pointer font-medium"
                    >
                      <Layers size={15} className="text-neutral-500" />
                      <span>View Devices / Stock</span>
                    </button>
                  )}
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
              className="bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-600 font-medium py-1.5 px-3.5 rounded text-sm inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
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
              ? 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white border-b-white dark:border-b-neutral-900 -mb-[1px] '
              : 'bg-neutral-200/60 dark:bg-neutral-900/40 border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Product Information
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-md border-t border-x transition-colors cursor-pointer ${
            activeTab === 'pricing'
              ? 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white border-b-white dark:border-b-neutral-900 -mb-[1px] '
              : 'bg-neutral-200/60 dark:bg-neutral-900/40 border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Special Pricing
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-md border-t border-x transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white border-b-white dark:border-b-neutral-900 -mb-[1px] '
              : 'bg-neutral-200/60 dark:bg-neutral-900/40 border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Activity Log
        </button>
      </div>

      {/* ─── Tab Content Card ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border-x border-b border-neutral-300 dark:border-neutral-700 rounded-b-md p-6 md:p-8">
        
        {/* TAB 1: Product Information */}
        {activeTab === 'info' && (
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Catalog & Inventory */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 pb-2 mb-3 border-b border-neutral-200 dark:border-neutral-800">
                  Catalog &amp; Stock
                </h3>
                <dl className="divide-y divide-neutral-100 dark:divide-neutral-800/70 text-[15px]">
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">SKU</dt>
                    <dd className="font-mono font-semibold text-neutral-900 dark:text-white">{product.sku_code || '—'}</dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Barcode</dt>
                    <dd className="font-mono font-medium text-neutral-900 dark:text-neutral-100">{product.barcode || '—'}</dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Category</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">{product.category_name || '—'}</dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Manufacturer</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">{product.manufacturer_name || '—'}</dd>
                  </div>
                  {product.product_type !== 'service' && (
                    <>
                      <div className="py-2.5 flex justify-between items-center gap-4">
                        <dt className="text-neutral-500 dark:text-neutral-400">Total Stock</dt>
                        <dd className="flex items-center gap-2.5">
                          {product.product_type === 'serialized' ? (
                            <button
                              onClick={() => onViewDevices(product.id)}
                              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1 tabular-nums"
                            >
                              <span>{totalStock} unit(s)</span>
                              <ExternalLink size={13} />
                            </button>
                          ) : (
                            <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">{totalStock} unit(s)</span>
                          )}
                          <button
                            onClick={() => onAddInventory(product.id)}
                            className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-medium py-0.5 px-2.5 rounded text-xs transition-colors cursor-pointer"
                          >
                            + Add Stock
                          </button>
                        </dd>
                      </div>
                      <div className="py-2.5 flex justify-between gap-4">
                        <dt className="text-neutral-500 dark:text-neutral-400">Minimum Stock</dt>
                        <dd className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">{product.min_stock_level ?? 0}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>

              {/* Right Column: Pricing, Tax & Branch Stock */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 pb-2 mb-3 border-b border-neutral-200 dark:border-neutral-800">
                    Pricing &amp; Tax
                  </h3>
                  <dl className="divide-y divide-neutral-100 dark:divide-neutral-800/70 text-[15px]">
                    <div className="py-2.5 flex justify-between gap-4">
                      <dt className="text-neutral-500 dark:text-neutral-400">Cost Price</dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                        €{(Number(product.cost_price) || 0).toFixed(2)}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between gap-4">
                      <dt className="text-neutral-500 dark:text-neutral-400">Selling Price</dt>
                      <dd className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                        €{(Number(product.selling_price) || 0).toFixed(2)}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between gap-4">
                      <dt className="text-neutral-500 dark:text-neutral-400">Min Selling Price</dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                        €{(Number(product.min_sales_price) || 0).toFixed(2)}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between gap-4">
                      <dt className="text-neutral-500 dark:text-neutral-400">Taxable</dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                        {product.is_taxable === false || product.is_taxable === 0 ? 'No' : 'Yes'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {product.product_type !== 'service' && Array.isArray(product.stock) && product.stock.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 pb-2 mb-3 border-b border-neutral-200 dark:border-neutral-800">
                      Stock by Branch
                    </h3>
                    <dl className="divide-y divide-neutral-100 dark:divide-neutral-800/70 text-sm">
                      {product.stock.map(s => (
                        <div key={s.branch_id} className="py-2 flex justify-between gap-4">
                          <dt className="text-neutral-600 dark:text-neutral-400">{s.branch_name}</dt>
                          <dd className="font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">{s.quantity}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-5 rounded text-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
              >
                <Edit3 size={14} />
                <span>Edit Product</span>
              </button>
              <button 
                onClick={handleArchive}
                className="bg-white dark:bg-neutral-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-medium py-1.5 px-4 rounded text-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
              >
                <Trash2 size={14} />
                <span>Archive Product</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Special Pricing */}
        {activeTab === 'pricing' && (
          <div className="py-12 text-center text-neutral-400 dark:text-neutral-500 text-sm">
            No special pricing adjustments configured for this product.
          </div>
        )}

        {/* TAB 3: Activity Log */}
        {activeTab === 'activity' && (
          <div className="flex flex-col font-sans border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            {/* Activity Log Header */}
            <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap justify-between items-center gap-3 shrink-0">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Activity Log</h3>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={activitySearch}
                    onChange={(e) => { setActivitySearch(e.target.value); setActivityPage(1); }}
                    placeholder="Search logs..."
                    className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 pl-8 pr-3 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500 w-44 sm:w-52"
                  />
                </div>
                <select
                  value={activityFilter}
                  onChange={(e) => { setActivityFilter(e.target.value); setActivityPage(1); }}
                  className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer"
                >
                  <option value="all">All Activities</option>
                  {activityTypeOptions.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNoteInput(prev => !prev)}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-3.5 text-sm transition-colors cursor-pointer active:scale-[0.98]"
                >
                  + Add Note
                </button>
              </div>
            </div>

            {showNoteInput && (
              <div className="px-4 py-2.5 bg-neutral-50/70 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  placeholder="Enter product note..."
                  className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={savingNote || !noteText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-1.5 text-sm font-medium cursor-pointer"
                >
                  {savingNote ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNoteInput(false); setNoteText(''); }}
                  className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Activity Log Table */}
            <div className="overflow-auto max-h-[460px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-50/80 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-center">
                    <th className="py-2.5 px-3 w-24 text-center">Date</th>
                    <th className="py-2.5 px-3 w-20 text-center">Time</th>
                    <th className="py-2.5 px-3 w-36 text-center">User</th>
                    <th className="py-2.5 px-3 w-32 text-center">Branch</th>
                    <th className="py-2.5 px-3 w-44 text-center">Activity</th>
                    <th className="py-2.5 px-3 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                  {activityLoading && activities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400 text-sm">
                        Loading activity logs...
                      </td>
                    </tr>
                  ) : activities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400 text-sm">
                        No activities recorded for this product
                      </td>
                    </tr>
                  ) : (
                    activities.map((activity, idx) => {
                      const canNavigateRef = Boolean(
                        activity.reference_link &&
                        activity.reference_type &&
                        activity.reference_type !== 'product' &&
                        branchSlug
                      );
                      return (
                        <tr 
                          key={`${activity.source || 'act'}_${activity.id}_${idx}`} 
                          className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap tabular-nums">
                            {new Date(activity.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap tabular-nums">
                            {new Date(activity.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                            {activity.user_name && activity.user_name.toLowerCase() !== 'null' ? activity.user_name : 'System'}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                            {activity.branch_name || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                            {activity.activity || (activity as any).activity_type || 'Activity'}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            <div className="flex items-center justify-between gap-2">
                              <span>{activity.details}</span>
                              {canNavigateRef && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/${branchSlug}${activity.reference_link}`)}
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
                                  title={`Open ${activity.reference_type}`}
                                >
                                  <span className="capitalize">{activity.reference_type}</span>
                                  <ExternalLink size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Activity Log Footer */}
            <div className="px-4 py-2 bg-neutral-50/50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
              <span>
                {activityTotal > 0
                  ? `${(activityPage - 1) * activityLimit + 1}-${Math.min(activityPage * activityLimit, activityTotal)} of ${activityTotal}`
                  : '0 of 0'}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={activityPage <= 1}
                    onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                    className="p-1 border border-neutral-300 dark:border-neutral-700 rounded disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span>Page {activityPage} of {totalPages}</span>
                  <button
                    type="button"
                    disabled={activityPage >= totalPages}
                    onClick={() => setActivityPage(p => Math.min(totalPages, p + 1))}
                    className="p-1 border border-neutral-300 dark:border-neutral-700 rounded disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
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
