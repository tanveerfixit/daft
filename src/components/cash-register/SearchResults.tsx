import React, { useEffect, useRef } from 'react';
import { Product } from '../../types';

interface SearchResultsProps {
  results: Product[];
  searchQuery: string;
  onAddProduct: (product: Product) => void;
  onQuickAddClick?: (searchTerm: string) => void;
  activeIndex?: number;
  onSetActiveIndex?: (index: number) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchQuery,
  onAddProduct,
  onQuickAddClick,
  activeIndex = 0,
  onSetActiveIndex
}) => {
  const hasQuery = searchQuery.trim().length >= 2;
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll active item into view during keyboard navigation
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  if (results.length === 0) {
    if (!hasQuery || !onQuickAddClick) return null;

    return (
      <div className="absolute top-full left-0 right-0 z-[60] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 p-4 mt-1 text-base text-neutral-800 dark:text-neutral-200 rounded shadow-xl" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div className="text-center">
          <p className="mb-2 text-neutral-500 dark:text-neutral-400">No products found matching "{searchQuery}"</p>
          <button
            type="button"
            onClick={() => onQuickAddClick(searchQuery)}
            className="px-3.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm font-semibold transition-colors rounded cursor-pointer border border-blue-200 dark:border-blue-800"
          >
            + Add "{searchQuery}"
          </button>
        </div>
      </div>
    );
  }

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const escaped = highlight
      .trim()
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      .replace(/\s+/g, '[ -]?');
      
    try {
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) => 
        regex.test(part) ? (
          <mark 
            key={i} 
            className="bg-yellow-200 dark:bg-yellow-400 text-neutral-900 px-0.5 rounded font-bold"
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
    <div className="absolute top-full left-0 right-0 z-[60] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 mt-1 text-base text-neutral-800 dark:text-neutral-200 rounded shadow-2xl overflow-hidden" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div className="max-h-72 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
        {results.map((product, idx) => {
          const isActive = idx === activeIndex;

          return (
            <button
              key={`${product.id}-${idx}`}
              ref={isActive ? activeItemRef : undefined}
              type="button"
              onClick={() => onAddProduct(product)}
              onMouseEnter={() => onSetActiveIndex?.(idx)}
              className={`w-full text-left py-2.5 transition-colors flex items-center justify-between gap-4 border-0 cursor-pointer font-normal ${
                isActive
                  ? 'bg-blue-50/95 dark:bg-blue-950/50 text-neutral-900 dark:text-white border-l-4 border-l-blue-600 pl-3 pr-4 shadow-inner'
                  : 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border-l-4 border-l-transparent pl-3 pr-4 hover:bg-neutral-50 dark:hover:bg-neutral-850'
              }`}
            >
              <div className="flex-1 min-w-0 text-base flex items-center gap-2 flex-wrap">
                <span className={`truncate ${isActive ? 'font-bold text-blue-900 dark:text-blue-200' : 'font-semibold text-neutral-900 dark:text-neutral-100'}`}>
                  {highlightText(product.product_name, searchQuery)}
                </span>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <span className="text-neutral-500 dark:text-neutral-400 font-mono text-xs font-semibold whitespace-nowrap">
                  SKU: {product.sku_code || 'N/A'}
                </span>
                {((product as any).imei || (product as any).serial) && (
                  <>
                    <span className="text-neutral-300 dark:text-neutral-700">•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono text-xs font-medium whitespace-nowrap">
                      IMEI: {(product as any).imei || (product as any).serial}
                    </span>
                  </>
                )}
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <span className="text-neutral-500 dark:text-neutral-400 text-xs whitespace-nowrap font-medium">
                  Qty: {product.product_type === 'serialized' ? '1' : product.total_stock || 0}
                </span>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                {isActive && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    <span>Press</span>
                    <kbd className="font-mono text-[10px] font-bold bg-white dark:bg-neutral-800 px-1 py-0.2 rounded border border-blue-300 dark:border-blue-700">Enter ↵</kbd>
                  </span>
                )}
                <span className="font-bold font-mono text-base text-neutral-900 dark:text-white">
                  €{(Number(product.selling_price) || 0).toFixed(2)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden sm:flex bg-neutral-50 dark:bg-neutral-850 px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 font-medium items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300">Enter ↵</kbd>
          <span>to add to cart</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span>Navigate with</span>
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300">↑</kbd>
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300">↓</kbd>
          <span>or hover mouse</span>
        </span>
      </div>
    </div>
  );
};


