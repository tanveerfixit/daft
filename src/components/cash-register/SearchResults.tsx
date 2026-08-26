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
      <div className="absolute top-full left-0 right-0 z-[60] bg-white border border-[#d8d8d8] p-4 mt-1 text-base text-[#333333] rounded shadow-lg" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <div className="text-center">
          <p className="mb-2 text-[#757575]">No products found matching "{searchQuery}"</p>
          <button
            type="button"
            onClick={() => onQuickAddClick(searchQuery)}
            className="px-3.5 py-1.5 bg-[#e5e7eb] hover:bg-[#d8d8d8] text-[#333333] text-sm font-semibold transition-colors rounded cursor-pointer border border-[#d8d8d8]"
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
            className="bg-yellow-200 text-[#333333] px-0.5 rounded font-semibold"
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
    <div className="absolute top-full left-0 right-0 z-[60] bg-white border border-[#d8d8d8] mt-1 shadow-lg text-base text-[#333333] rounded overflow-hidden" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div className="max-h-60 overflow-y-auto divide-y divide-[#d8d8d8]">
        {results.map((product, idx) => (
          <button
            key={`${product.id}-${idx}`}
            onClick={() => onAddProduct(product)}
            className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4 border-0 cursor-pointer font-normal ${
              idx === activeIndex ? 'bg-[#e5e7eb] text-[#333333]' : 'bg-white text-[#333333]'
            }`}
          >
            <div className="flex-1 min-w-0 text-base flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">
                {highlightText(product.product_name, searchQuery)}
              </span>
              <span className="text-[#d8d8d8]">•</span>
              <span className="text-[#757575] font-mono text-xs font-semibold whitespace-nowrap">
                SKU: {product.sku_code || 'N/A'}
              </span>
              {((product as any).imei || (product as any).serial) && (
                <>
                  <span className="text-[#d8d8d8]">•</span>
                  <span className="text-[#757575] font-mono text-xs whitespace-nowrap">
                    {(product as any).imei || (product as any).serial}
                  </span>
                </>
              )}
              <span className="text-[#d8d8d8]">•</span>
              <span className="text-[#757575] text-xs whitespace-nowrap font-medium">
                Qty: {product.product_type === 'serialized' ? '1' : product.total_stock || 0}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-bold font-mono text-base text-[#333333]">
                €{(Number(product.selling_price) || 0).toFixed(2)}
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="bg-[#f9fafb] px-4 py-2 border-t border-[#d8d8d8] text-xs text-[#757575] font-medium flex items-center justify-between">
        <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-[#d8d8d8] rounded text-xs font-mono font-bold">Enter</kbd> to select</span>
        <span>Use <kbd className="px-1.5 py-0.5 bg-white border border-[#d8d8d8] rounded text-xs font-mono font-bold">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-[#d8d8d8] rounded text-xs font-mono font-bold">↓</kbd> to navigate</span>
      </div>
    </div>
  );
};

