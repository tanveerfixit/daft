import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search } from 'lucide-react';
import { Product, Category, Manufacturer } from '../types';

export default function ProductList({ 
  onCreateProduct,
  onSelectProduct
}: { 
  onCreateProduct: () => void;
  onSelectProduct: (id: number) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  
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
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setProducts([]);
        setTotalItems(0);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage, itemsPerPage, searchQuery, selectedCategory, selectedManufacturer, selectedType]);

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
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-base px-2 py-2 select-none w-full overflow-hidden" style={{ fontSize: '17px' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-2 px-1 py-1 gap-2">
        <h2 className="text-lg sm:text-xl font-bold text-black dark:text-white uppercase">Manage Products</h2>
        <button 
          onClick={onCreateProduct}
          className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-1.5 px-4 rounded-none text-sm sm:text-base flex items-center gap-2 transition-all shadow-none w-full sm:w-auto justify-center"
        >
          <Plus size={16} />
          Create Product
        </button>
      </div>

      <div className="p-4 flex flex-col md:flex-row flex-wrap gap-2 items-stretch md:items-center bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none mb-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
          <select 
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-sm sm:text-base text-neutral-900 dark:text-neutral-100 focus:outline-none w-full"
          >
            <option value="All Products">All Types</option>
            <option value="stock">Generic Stock</option>
            <option value="serialized">Serialized Device</option>
            <option value="service">Service Item</option>
          </select>
          <select 
            value={selectedManufacturer}
            onChange={(e) => { setSelectedManufacturer(e.target.value); setCurrentPage(1); }}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-sm sm:text-base text-neutral-900 dark:text-neutral-100 focus:outline-none w-full"
          >
            <option value="All Manufacturers">All Manufacturers</option>
            {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select 
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-sm sm:text-base text-neutral-900 dark:text-neutral-100 focus:outline-none w-full"
          >
            <option value="All Categories">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div className="relative w-full md:w-80 md:ml-auto">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search Products"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-3 pr-10 py-1.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm sm:text-base focus:outline-none text-neutral-900 dark:text-neutral-100"
          />
          <div 
            onClick={() => { setSearchQuery(searchInput); setCurrentPage(1); }}
            className="absolute right-0 top-0 h-full w-10 flex items-center justify-center bg-neutral-100 dark:bg-neutral-955 border-l border-neutral-300 dark:border-neutral-800 rounded-none cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-900"
          >
            <Search size={16} className="text-neutral-500" />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black rounded-none shadow-none">
        <table className="w-full min-w-[800px] text-left border-collapse">
          <thead>
            <tr className="bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-[13px] font-bold text-black dark:text-white uppercase tracking-wider">
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 whitespace-nowrap">Manufacturer Name</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 whitespace-nowrap w-2/5">Product Name</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 whitespace-nowrap">SKU/Barcode</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 whitespace-nowrap">Category Name</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 text-right whitespace-nowrap">Selling Price</th>
              <th className="px-2 py-1 text-center whitespace-nowrap">Stock (Total)</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-neutral-400 dark:text-neutral-500 bg-white dark:bg-black">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product, idx) => (
                <tr 
                  key={product.id} 
                  onClick={() => onSelectProduct(product.id)}
                  className={`border-b border-neutral-200 dark:border-neutral-800 text-base font-normal hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer transition-colors bg-white dark:bg-black text-neutral-900 dark:text-neutral-100`}
                >
                  <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-normal font-sans whitespace-nowrap">{product.manufacturer_name || ''}</td>
                  <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 font-normal font-sans text-neutral-900 dark:text-neutral-100 whitespace-nowrap">{product.product_name}</td>
                  <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-normal font-mono text-sm whitespace-nowrap">{product.sku_code || product.barcode || ''}</td>
                  <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 font-normal font-sans text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                    <div className="flex items-center justify-between gap-2">
                      <span>{product.category_name || ''}</span>
                      {product.category_name && (
                        <button className="p-1 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none hover:bg-neutral-300 dark:hover:bg-neutral-800 transition-colors">
                          <div className="flex gap-0.5">
                            <div className="w-0.5 h-0.5 bg-neutral-900 dark:bg-white rounded-none"></div>
                            <div className="w-0.5 h-0.5 bg-neutral-900 dark:bg-white rounded-none"></div>
                            <div className="w-0.5 h-0.5 bg-neutral-900 dark:bg-white rounded-none"></div>
                          </div>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-right font-normal text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                    €{product.selling_price.toFixed(2)}
                  </td>
                  <td className="px-2 py-1 text-center whitespace-nowrap">
                    <span className={`font-bold text-sm ${product.total_stock && product.total_stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
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
      <div className="p-4 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none mt-2 flex flex-col sm:flex-row gap-4 justify-between items-center text-sm text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-4">
          <select 
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1 focus:outline-none text-neutral-900 dark:text-neutral-100"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="font-bold">
            {totalItems > 0 ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)}/${totalItems}` : '0-0/0'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border border-neutral-300 dark:border-neutral-800 rounded-none hover:bg-neutral-200 dark:hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-900 dark:text-neutral-100"
          >
            «
          </button>
          {renderPageNumbers()}
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border border-neutral-300 dark:border-neutral-800 rounded-none hover:bg-neutral-200 dark:hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-900 dark:text-neutral-100"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
