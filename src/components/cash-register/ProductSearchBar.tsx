import React from 'react';
import { Search, X, Plus } from 'lucide-react';

interface ProductSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onClear: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onQuickAddClick?: () => void;
  onToggleSpeedGrid?: () => void;
  isSpeedGridOpen?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const ProductSearchBar: React.FC<ProductSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onClear,
  onKeyDown,
  onQuickAddClick,
  onToggleSpeedGrid,
  isSpeedGridOpen,
  inputRef
}) => {
  return (
    <div 
      className="flex items-stretch gap-3 bg-white border border-[#d8d8d8] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded p-3 transition-all" 
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <div className="flex items-center flex-1 w-full border-0 outline-none bg-transparent">
        <Search className="w-5 h-5 text-[#757575] shrink-0 mr-2.5" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Scan or Search Item..."
          className="w-full flex-1 py-1.5 text-[#333333] placeholder-[#757575] bg-transparent text-base !outline-none !border-none !ring-0 !shadow-none focus:!outline-none focus:!border-none focus:!ring-0 focus:!shadow-none"
          style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onClear}
            className="text-[#757575] hover:text-[#333333] p-1 bg-transparent border-0 cursor-pointer ml-1"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {onQuickAddClick && (
        <button
          type="button"
          onClick={onQuickAddClick}
          className="flex items-center justify-center w-11 h-11 border border-[#d8d8d8] rounded hover:bg-gray-50 text-[#333333] transition-colors cursor-pointer shrink-0"
          title="Quick Add Product"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}

      {/* Speed Grid Toggle Button with 4-Color Grid Icon */}
      <button
        type="button"
        onClick={onToggleSpeedGrid}
        className={`flex items-center justify-center w-11 h-11 border rounded transition-colors cursor-pointer shrink-0 ${
          isSpeedGridOpen
            ? 'border-blue-600 bg-blue-50/80'
            : 'border-[#d8d8d8] hover:bg-gray-50'
        }`}
        title={isSpeedGridOpen ? "Close Speed Grid" : "Open Speed Grid (Fast Keys)"}
      >
        <svg
          className="w-5 h-5 transition-transform hover:scale-105"
          viewBox="0 0 24 24"
        >
          {/* Top-Left: Red */}
          <rect x="2.3" y="2.3" width="8.8" height="8.8" rx="2.4" fill="#ef4444" />
          {/* Top-Right: Blue */}
          <rect x="12.9" y="2.3" width="8.8" height="8.8" rx="2.4" fill="#3b82f6" />
          {/* Bottom-Left: Green */}
          <rect x="2.3" y="12.9" width="8.8" height="8.8" rx="2.4" fill="#10b981" />
          {/* Bottom-Right: Yellow / Amber */}
          <rect x="12.9" y="12.9" width="8.8" height="8.8" rx="2.4" fill="#f59e0b" />
        </svg>
      </button>
    </div>
  );
};

