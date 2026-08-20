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
      <div className="absolute top-full left-0 right-0 z-[60] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 mt-1 text-base text-slate-900 dark:text-slate-100 font-sans rounded-xl shadow-xl">
        <div className="text-center">
          <p className="mb-2 font-medium text-slate-600 dark:text-slate-300">No products found matching "{searchQuery}"</p>
          <button
            type="button"
            onClick={() => onQuickAddClick(searchQuery)}
            className="px-3.5 py-1.5 bg-amber-400 text-slate-900 hover:bg-amber-500 text-xs font-bold uppercase tracking-wider transition-colors rounded-md cursor-pointer border border-amber-500 shadow-2xs"
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
            className="bg-amber-200 dark:bg-amber-900/60 text-slate-900 dark:text-white px-0.5 rounded-xs font-semibold"
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
    <div className="absolute top-full left-0 right-0 z-[60] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mt-1 shadow-xl text-base text-slate-900 dark:text-slate-100 font-sans rounded-xl overflow-hidden">
      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {results.map((product, idx) => (
          <button
            key={`${product.id}-${idx}`}
            onClick={() => onAddProduct(product)}
            className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-4 border-0 cursor-pointer font-normal ${
              idx === activeIndex ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
            }`}
          >
            <div className="flex-1 min-w-0 text-base flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">
                {highlightText(product.product_name, searchQuery)}
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-xs font-semibold whitespace-nowrap">
                SKU: {product.sku_code || 'N/A'}
              </span>
              {((product as any).imei || (product as any).serial) && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-xs whitespace-nowrap">
                    {(product as any).imei || (product as any).serial}
                  </span>
                </>
              )}
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap font-medium">
                Qty: {product.product_type === 'serialized' ? '1' : product.total_stock || 0}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-bold font-mono text-base text-blue-600 dark:text-blue-400">
                €{(Number(product.selling_price) || 0).toFixed(2)}
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-medium flex items-center justify-between">
        <span>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold">Enter</kbd> to add highlighted item</span>
        <span>Use <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold">↓</kbd> to navigate</span>
      </div>
    </div>
  );
};
