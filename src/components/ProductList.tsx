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
          <span className="px-2 text-neutral-500 font-mono text-xs">..</span>
        ) : (
          <button
            onClick={() => handlePageChange(Number(p))}
            className={`px-3 py-0.5 rounded-none font-normal transition-colors font-mono text-xs ${
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
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-sm px-2 py-2 select-none w-full" style={{ fontSize: '15px' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black shrink-0 flex justify-between items-center px-4 py-3">
        <h2 className="text-xl font-medium text-black dark:text-white">Products</h2>
        <button 
          onClick={onCreateProduct}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>New Product</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-2 flex flex-wrap gap-2 items-center bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-850 shrink-0">
        <select 
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-7 font-mono font-bold text-xs cursor-pointer w-40"
        >
          <option value="All Products">All Types</option>
          <option value="stock">Generic Stock</option>
          <option value="serialized">Serialized Device</option>
          <option value="service">Service Item</option>
        </select>
        
        <select 
          value={selectedManufacturer}
          onChange={(e) => { setSelectedManufacturer(e.target.value); setCurrentPage(1); }}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-7 font-mono text-xs cursor-pointer w-44"
        >
          <option value="All Manufacturers">All Manufacturers</option>
          {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        
        <select 
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-7 font-mono text-xs cursor-pointer w-44"
        >
          <option value="All Categories">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <div className="relative flex-1 max-w-md ml-auto">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search Products, SKU or Barcode..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-3 pr-10 py-0.5 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none text-xs outline-none focus:border-neutral-400 h-7 font-mono"
          />
          <button 
            onClick={() => { setSearchQuery(searchInput); setCurrentPage(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-500 dark:text-neutral-400"
          >
            <Search size={14} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-200 dark:border-neutral-850">
        <table className="w-full text-left border-collapse bg-white dark:bg-black text-[15px]">
          <thead>
            <tr className="bg-neutral-100 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-850 text-[15px] font-semibold text-black dark:text-white">
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-36">Manufacturer</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850">Product Name</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-36">SKU / Barcode</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-40">Category</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right w-28">Price</th>
              <th className="px-1.5 py-0.5 text-center w-24">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-neutral-500 italic font-mono text-sm">
                  Loading product records... Please wait
                </td>
              </tr>
            ) : fetchError ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-red-500 italic font-mono text-sm">
                  {fetchError}
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-neutral-500 italic font-mono text-sm">
                  No products found matching criteria.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr 
                  key={product.id} 
                  onClick={() => onSelectProduct(product.id)}
                  className="bg-white dark:bg-black hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-[15px]"
                >
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400 truncate">
                    {product.manufacturer_name || '-'}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-900 dark:text-neutral-100 font-normal">
                    {product.product_name}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 font-mono text-neutral-700 dark:text-neutral-300">
                    {product.sku_code || product.barcode || '-'}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400 truncate">
                    {product.category_name || '-'}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right text-neutral-900 dark:text-neutral-100 font-mono">
                    €{(Number(product.selling_price) || 0).toFixed(2)}
                  </td>
                  <td className="px-1.5 py-0.5 text-center font-mono font-bold">
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
      <div className="p-2 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-850 flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400 shrink-0">
        <div className="flex items-center gap-4">
          <select 
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none font-mono cursor-pointer"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="font-normal font-mono">
            {totalItems > 0 ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)}/${totalItems}` : '0/0'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs cursor-pointer"
          >
            «
          </button>
          {renderPageNumbers()}
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs cursor-pointer"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
