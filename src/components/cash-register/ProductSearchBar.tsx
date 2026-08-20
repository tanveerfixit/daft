import React from 'react';
import { Search, X, Camera, Plus } from 'lucide-react';

interface ProductSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onClear: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onQuickAddClick?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const ProductSearchBar: React.FC<ProductSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onClear,
  onKeyDown,
  onQuickAddClick,
  inputRef
}) => {
  return (
    <div className="relative group font-sans">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-slate-400" />
      </div>
      <input
        ref={inputRef}
        type="text"
        className="block w-full pl-10 pr-32 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 transition-all text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 text-slate-900 dark:text-slate-100 font-sans shadow-2xs"
        placeholder="Scan barcode / IMEI or search product..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-2.5">
        {searchQuery && (
          <button
            onClick={onClear}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-r border-slate-200 dark:border-slate-700 pr-2.5 mr-1 bg-transparent border-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button className="text-blue-500 hover:text-blue-600 transition-colors bg-transparent border-0 cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Search by Lens">
          <Camera className="h-4 w-4" />
        </button>
        {onQuickAddClick && (
          <button 
            type="button"
            onClick={onQuickAddClick}
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors bg-transparent border-0 cursor-pointer p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            title="Quick Add Product"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
