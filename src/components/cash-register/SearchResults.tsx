import React from 'react';
import { Product } from '../../types';

interface SearchResultsProps {
  results: Product[];
  searchQuery: string;
  onAddProduct: (product: Product) => void;
  onQuickAddClick?: (searchTerm: string) => void;
  activeIndex?: number;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchQuery,
  onAddProduct,
  onQuickAddClick,
  activeIndex = 0
}) => {
  const hasQuery = searchQuery.trim().length >= 2;

  if (results.length === 0) {
    if (!hasQuery || !onQuickAddClick) return null;

    return (
      <div className="absolute top-full left-0 right-0 z-[60] bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 p-4 mt-1 text-lg text-neutral-900 dark:text-neutral-100 font-sans rounded-none">
        <div className="text-center font-mono">
          <p className="mb-2 font-sans">No products found matching "{searchQuery}"</p>
          <button
            type="button"
            onClick={() => onQuickAddClick(searchQuery)}
            className="px-3 py-1 bg-amber-400 text-slate-900 hover:bg-amber-500 text-sm font-bold uppercase transition-colors border border-neutral-350 dark:border-neutral-800 rounded-none cursor-pointer"
          >
            Add "{searchQuery}"
          </button>
        </div>
      </div>
    );
  }

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    // Normalize spaces and hyphens to match interchangeably (e.g. "type c" matches "type-c")
    const escaped = highlight
      .trim()
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') // Escape regex chars
      .replace(/\s+/g, '[ -]?');                 // Match spaces, hyphens or nothing between words
      
    try {
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) => 
        regex.test(part) ? (
          <mark 
            key={i} 
            className="bg-amber-200 dark:bg-amber-900/50 text-black dark:text-white px-0.5 rounded-none"
          >
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch (e) {
      return text;
    }
  };

  return (
    <div className="absolute top-full left-0 right-0 z-[60] bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 mt-1 shadow-none text-lg text-neutral-900 dark:text-neutral-100 font-sans rounded-none">
      <div className="max-h-60 overflow-y-auto">
        {results.map((product, idx) => (
          <button
            key={`${product.id}-${idx}`}
            onClick={() => onAddProduct(product)}
            className={`w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors flex items-center justify-between gap-4 border-0 border-b border-neutral-200 dark:border-neutral-800 cursor-pointer font-normal ${
              idx === activeIndex ? 'bg-neutral-200 dark:bg-neutral-900 text-black dark:text-white' : 'bg-white dark:bg-black text-neutral-900 dark:text-neutral-100'
            }`}
          >
            <div className="flex-1 min-w-0 text-[17px] flex items-center gap-2">
              <span className="font-normal truncate">
                {highlightText(product.product_name, searchQuery)}
              </span>
              <span className="text-neutral-400">-</span>
              <span className="text-neutral-550 dark:text-neutral-400 font-mono whitespace-nowrap">
                SKU: {product.sku_code || 'N/A'}
              </span>
              {((product as any).imei || (product as any).serial) && (
                <>
                  <span className="text-neutral-400">-</span>
                  <span className="text-neutral-550 dark:text-neutral-400 font-mono whitespace-nowrap">
                    {(product as any).imei || (product as any).serial}
                  </span>
                </>
              )}
              <span className="text-neutral-400">-</span>
              <span className="text-neutral-550 dark:text-neutral-400 font-mono whitespace-nowrap">
                Qty: {product.product_type === 'serialized' ? '1' : product.total_stock || 0}
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="bg-neutral-100 dark:bg-neutral-950 px-4 py-1.5 border-t border-neutral-300 dark:border-neutral-800 text-sm text-neutral-500 font-mono">
        Press Enter to add first result or click an item
      </div>
    </div>
  );
};
