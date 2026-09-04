import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Sparkles, X } from 'lucide-react';
import { Product, Category, Manufacturer } from '../types';
import ProductTypeModal, { ProductTypeKey } from './ProductTypeModal';
import initialAnnouncements from '../data/announcements.json';

export default function ProductList({ 
  onCreateProduct,
  onSelectProduct,
  isActive = true
}: { 
  onCreateProduct: (type?: ProductTypeKey) => void;
  onSelectProduct: (id: number) => void;
  isActive?: boolean;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  
  // Announcement popup state under search bar
  const [activeAnnouncement, setActiveAnnouncement] = useState<any | null>(null);
  const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(false);

  useEffect(() => {
    const handleAnnouncements = (list: any[]) => {
      try {
        const dismissed = localStorage.getItem('epos_dismissed_product_popup');
        const latest = list && list.length > 0 ? list[0] : null;
        if (latest && dismissed !== latest.id) {
          setActiveAnnouncement(latest);
          setShowAnnouncementPopup(true);
        }
      } catch (e) {
        console.error('Failed reading announcement dismissal from localStorage', e);
      }
    };

    fetch('/api/public/announcements')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          handleAnnouncements(data);
        } else {
          handleAnnouncements(initialAnnouncements as any[]);
        }
      })
      .catch(() => {
        handleAnnouncements(initialAnnouncements as any[]);
      });
  }, []);

  const handleDismissPopup = () => {
    setShowAnnouncementPopup(false);
    if (activeAnnouncement) {
      try {
        localStorage.setItem('epos_dismissed_product_popup', activeAnnouncement.id);
      } catch (e) {
        console.error('Failed saving announcement dismissal to localStorage', e);
      }
    }
  };
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Search & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search input to avoid hitting database on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchProducts = () => {
    setIsLoading(true);
    setFetchError('');
    let url = `/api/products?page=${currentPage}&limit=${itemsPerPage}`;
    if (searchQuery.trim() !== '') {
      url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    }
    if (selectedCategory && selectedCategory !== 'All Categories') {
      url += `&category_id=${selectedCategory}`;
    }
    if (selectedManufacturer && selectedManufacturer !== 'All Manufacturers') {
      url += `&manufacturer_id=${selectedManufacturer}`;
    }
    if (selectedType && selectedType !== 'All Types' && selectedType !== 'All Products') {
      url += `&product_type=${selectedType}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && data.products && Array.isArray(data.products)) {
          setProducts(data.products);
          setTotalItems(data.total || 0);
        } else if (Array.isArray(data)) {
          setProducts(data);
          setTotalItems(data.length);
        } else {
          setProducts([]);
          setTotalItems(0);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setProducts([]);
        setTotalItems(0);
        setFetchError('Failed to load products');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage, itemsPerPage, searchQuery, selectedCategory, selectedManufacturer, selectedType]);

  useEffect(() => {
    if (isActive) {
      fetchProducts();
    }
  }, [isActive]);

  useEffect(() => {
    const handleFocus = () => {
      if (isActive) fetchProducts();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isActive, currentPage, itemsPerPage, searchQuery, selectedCategory, selectedManufacturer, selectedType]);

  useEffect(() => {
    fetch('/api/categories').then(res => res.json()).then(setCategories);
    fetch('/api/manufacturers').then(res => res.json()).then(setManufacturers);
  }, []);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [products]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '..', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '..', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '..', currentPage - 1, currentPage, currentPage + 1, '..', totalPages);
      }
    }
    
    return pages.map((p, i) => (
      <React.Fragment key={i}>
        {p === '..' ? (
          <span className="px-2 text-neutral-500 text-xs">..</span>
        ) : (
          <button
            onClick={() => handlePageChange(Number(p))}
            className={`px-3 py-0.5 rounded-none font-normal transition-colors text-xs ${
              currentPage === p 
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black' 
                : 'bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-850 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-850'
            }`}
          >
            {p}
          </button>
        )}
      </React.Fragment>
    ));
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 px-2 pb-2 pt-0 select-none w-full" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '16px' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black shrink-0 flex justify-between items-center px-4 py-3">
        <h2 className="font-medium text-black dark:text-white" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '24px' }}>Products</h2>
        <button 
          onClick={() => setIsTypeModalOpen(true)}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-2 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus size={17} />
          <span>New Product</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-2 flex flex-wrap gap-2 items-center bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-850 shrink-0">
        <select 
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2.5 py-1 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-8 font-normal text-sm cursor-pointer w-44"
        >
          <option value="All Products">All Types</option>
          <option value="stock">Generic Stock</option>
          <option value="serialized">Serialized Device</option>
          <option value="service">Service Item</option>
        </select>
        
        <select 
          value={selectedManufacturer}
          onChange={(e) => { setSelectedManufacturer(e.target.value); setCurrentPage(1); }}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2.5 py-1 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-8 text-sm cursor-pointer w-48"
        >
          <option value="All Manufacturers">All Manufacturers</option>
          {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        
        <select 
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2.5 py-1 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-8 text-sm cursor-pointer w-48"
        >
          <option value="All Categories">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        {(selectedType || selectedManufacturer || selectedCategory || searchInput) && (
          <button
            onClick={() => {
              setSelectedType('');
              setSelectedManufacturer('');
              setSelectedCategory('');
              setSearchInput('');
              setSearchQuery('');
              setCurrentPage(1);
            }}
            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 border border-red-200 dark:border-red-900/60 px-2 py-1 rounded transition-colors cursor-pointer"
            title="Clear all search queries and dropdown filters"
          >
            Reset Filters
          </button>
        )}
        
        <div className="relative flex-1 max-w-md ml-auto">
          <input
            ref={searchInputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search Products, SKU or Barcode..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchInput('');
                setSearchQuery('');
                setCurrentPage(1);
              }
            }}
            className="w-full pl-3 pr-16 py-1 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none text-sm outline-none focus:border-neutral-400 h-8"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                  setCurrentPage(1);
                  searchInputRef.current?.focus();
                }}
                className="p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded cursor-pointer"
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
            <button 
              type="button"
              onClick={() => { setSearchQuery(searchInput); setCurrentPage(1); }}
              className="cursor-pointer text-neutral-500 dark:text-neutral-400"
            >
              <Search size={16} />
            </button>
          </div>

          {/* Announcement popup under search bar */}
          {showAnnouncementPopup && activeAnnouncement && !searchInput && (
            <div className="absolute top-full right-0 left-0 mt-1.5 bg-white dark:bg-neutral-900 border-2 border-red-500 rounded-md shadow-2xl p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200 font-sans">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded bg-red-50 dark:bg-red-950/60 text-red-600">
                    <Sparkles size={14} />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                    What's New · {activeAnnouncement.version || 'Update'}
                  </span>
                </div>
                <button
                  onClick={handleDismissPopup}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded cursor-pointer"
                  title="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="mt-2">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                  {activeAnnouncement.title}
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                  {activeAnnouncement.summary}
                </p>
                {activeAnnouncement.details && (
                  <ul className="mt-1.5 space-y-0.5 list-disc list-inside text-[11px] text-neutral-500 dark:text-neutral-400">
                    {activeAnnouncement.details.slice(0, 2).map((d: string, idx: number) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-neutral-400">
                  {new Date(activeAnnouncement.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <button
                  onClick={handleDismissPopup}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1 rounded text-xs cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  Got it
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-200 dark:border-neutral-850">
        <table className="w-full text-left border-collapse bg-white dark:bg-black text-[16px]">
          <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[15px] font-semibold text-black dark:text-white text-center">
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-36 text-center">Manufacturer</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 text-center">Product Name</th>
              <th className="px-2.5 py-1 border-r border-neutral-300 dark:border-neutral-700 text-center whitespace-nowrap min-w-[130px]">SKU / Barcode</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-40 text-center">Category</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-28 text-center">Price</th>
              <th className="px-1.5 py-1 text-center w-24">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-neutral-500 italic text-base">
                  Loading product records... Please wait
                </td>
              </tr>
            ) : fetchError ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-red-500 italic text-base">
                  {fetchError}
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-neutral-500 italic text-base">
                  No products found matching criteria.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr 
                  key={product.id} 
                  onClick={() => onSelectProduct(product.id)}
                  className="bg-white dark:bg-black hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-[16px]"
                >
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400 truncate">
                    {product.manufacturer_name || '-'}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-900 dark:text-neutral-100 font-normal">
                    {product.product_name}
                  </td>
                  <td className="px-2.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-700 dark:text-neutral-300 font-mono whitespace-nowrap">
                    {product.sku_code || product.barcode || '-'}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400 truncate">
                    {product.category_name || '-'}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right text-neutral-900 dark:text-neutral-100">
                    €{(Number(product.selling_price) || 0).toFixed(2)}
                  </td>
                  <td className="px-1.5 py-0.5 text-center font-bold">
                    <span className={product.total_stock && product.total_stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {product.total_stock || 0}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      <div className="p-2.5 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-850 flex justify-between items-center text-sm text-neutral-600 dark:text-neutral-400 shrink-0">
        <div className="flex items-center gap-4">
          <select 
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2.5 py-1 outline-none cursor-pointer text-sm"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="font-normal text-sm">
            {totalItems > 0 ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)}/${totalItems}` : '0/0'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-sm cursor-pointer"
          >
            «
          </button>
          {renderPageNumbers()}
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-2.5 py-1 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed text-sm cursor-pointer"
          >
            »
          </button>
        </div>
      </div>

      {/* Product Type Selection Modal */}
      <ProductTypeModal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        onSelectType={(type) => {
          setIsTypeModalOpen(false);
          onCreateProduct(type);
        }}
      />
    </div>
  );
}
