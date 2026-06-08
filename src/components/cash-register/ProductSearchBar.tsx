import React from 'react';
import { Search, X, Camera, Plus } from 'lucide-react';

interface ProductSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onClear: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onQuickAddClick?: () => void;
  onScanClick?: () => void;
}

export const ProductSearchBar: React.FC<ProductSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onClear,
  onKeyDown,
  onQuickAddClick,
  onScanClick
}) => {
  return (
    <div className="relative group font-sans">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-neutral-500" />
      </div>
      <input
        id="product-search-input"
        type="text"
        className="block w-full pl-10 pr-32 py-2 border border-neutral-350 dark:border-neutral-800 rounded-none bg-white dark:bg-black transition-all text-base focus:outline-none placeholder:text-neutral-500 text-neutral-900 dark:text-neutral-100 font-sans shadow-none"
        placeholder="Search products by name, SKU or scan barcode..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus
      />
      <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-3">
        {searchQuery && (
          <button
            onClick={onClear}
            className="text-neutral-550 hover:text-neutral-800 border-r border-neutral-300 dark:border-neutral-800 pr-3 mr-1 bg-transparent border-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button 
          type="button"
          onClick={onScanClick}
          className="text-blue-500 hover:text-blue-650 transition-colors bg-transparent border-0 cursor-pointer" 
          title="Scan Barcode via Camera"
        >
          <Camera className="h-4 w-4" />
        </button>
        {onQuickAddClick && (
          <button 
            type="button"
            onClick={onQuickAddClick}
            className="text-emerald-500 hover:text-emerald-650 transition-colors bg-transparent border-0 cursor-pointer"
            title="Quick Add Product"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
