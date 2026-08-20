import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search } from 'lucide-react';
import { Product, Category, Manufacturer } from '../types';

export default function ProductList({ 
  onCreateProduct,
  onSelectProduct,
  isActive = true
}: { 
  onCreateProduct: () => void;
  onSelectProduct: (id: number) => void;
  isActive?: boolean;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  
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
          <span className="px-2 text-neutral-500">..</span>
        ) : (
          <button
            onClick={() => handlePageChange(Number(p))}
            className={`px-3 py-1 rounded-none font-bold transition-colors ${
              currentPage === p 
                ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-800' 
                : 'border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-900'
            }`}
          >
            {p}
          </button>
        )}
      </React.Fragment>
    ));
  };

  return (
    <div className="flex flex-col h-full bg-slate-100/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans text-base p-3 select-none w-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0 mb-3 px-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Manage Products</h2>
        <button 
          onClick={onCreateProduct}
          className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-1.5 px-4 rounded-lg text-sm flex items-center gap-2 transition-all shadow-xs border border-amber-500 cursor-pointer"
        >
          <Plus size={16} />
          Create Product
        </button>
      </div>

      <div className="p-3 flex flex-wrap gap-2.5 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs mb-3">
        <select 
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
          className="bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 w-44 cursor-pointer"
        >
          <option value="All Products">All Types</option>
          <option value="stock">Generic Stock</option>
          <option value="serialized">Serialized Device</option>
          <option value="service">Service Item</option>
        </select>
        <select 
          value={selectedManufacturer}
          onChange={(e) => { setSelectedManufacturer(e.target.value); setCurrentPage(1); }}
          className="bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 w-48 cursor-pointer"
        >
          <option value="All Manufacturers">All Manufacturers</option>
          {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select 
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
          className="bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 w-48 cursor-pointer"
        >
          <option value="All Categories">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <div className="relative flex-1 max-w-md ml-auto">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search Products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-3 pr-10 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg text-base focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <div 
            onClick={() => { setSearchQuery(searchInput); setCurrentPage(1); }}
            className="absolute right-0 top-0 h-full w-10 flex items-center justify-center border-l border-slate-300 dark:border-slate-700 rounded-r-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <Search size={16} />
          </div>
        </div>
      </div>

      {/* Table Content */}
      {isLoading && <div className="flex items-center justify-center py-12 text-slate-500"><span>Loading products...</span></div>}
      {fetchError && <div className="flex items-center justify-center py-12 text-red-500"><span>{fetchError}</span></div>}
      <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-xs" style={{ display: (isLoading || fetchError) ? 'none' : 'block' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="px-3 py-2.5 border-r border-slate-200 dark:border-slate-800 w-32">Manufacturer</th>
              <th className="px-3 py-2.5 border-r border-slate-200 dark:border-slate-800 min-w-[280px]">Product Name</th>
              <th className="px-3 py-2.5 border-r border-slate-200 dark:border-slate-800 w-36">SKU/Barcode</th>
              <th className="px-3 py-2.5 border-r border-slate-200 dark:border-slate-800 w-40">Category</th>
              <th className="px-3 py-2.5 border-r border-slate-200 dark:border-slate-800 text-right w-28">Selling Price</th>
              <th className="px-3 py-2.5 text-center w-24">Stock (Total)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-slate-400 dark:text-slate-500 italic">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr 
                  key={product.id} 
                  onClick={() => onSelectProduct(product.id)}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 cursor-pointer transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <td className="px-3 py-2 border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium w-32 truncate">
                    {product.manufacturer_name || '-'}
                  </td>
                  <td className="px-3 py-2 border-r border-slate-100 dark:border-slate-800 font-semibold text-base text-slate-900 dark:text-white min-w-[280px]">
                    {product.product_name}
                  </td>
                  <td className="px-3 py-2 border-r border-slate-100 dark:border-slate-800 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold w-36">
                    {product.sku_code || product.barcode || '-'}
                  </td>
                  <td className="px-3 py-2 border-r border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm w-40">
                    <span className="truncate block">{product.category_name || '-'}</span>
                  </td>
                  <td className="px-3 py-2 border-r border-slate-100 dark:border-slate-800 text-right font-mono font-bold text-base text-slate-900 dark:text-white w-28">
                    €{(Number(product.selling_price) || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center w-24">
                    <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                      product.total_stock && product.total_stock > 0 
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' 
                        : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                    }`}>
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
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs mt-3 flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <select 
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none text-slate-900 dark:text-slate-100 text-sm cursor-pointer"
          >
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
          <span className="font-medium text-xs">
            {totalItems > 0 ? `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems}` : '0 items'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-slate-100 transition-colors cursor-pointer text-xs font-bold"
          >
            « Prev
          </button>
          {renderPageNumbers()}
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-slate-100 transition-colors cursor-pointer text-xs font-bold"
          >
            Next »
          </button>
        </div>
      </div>
    </div>
  );
}
