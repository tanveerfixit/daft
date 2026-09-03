import { useState, useEffect } from 'react';
import { Search, ExternalLink, X } from 'lucide-react';

interface Device {
  id: number;
  sku_id: number;
  product_name: string;
  color?: string;
  gb?: string;
  condition?: string;
  imei: string;
  po_number?: string;
  created_at: string;
  invoice_number?: string;
  status: string;
}

interface Props {
  onSelectPO: (poNumber: string) => void;
  onSelectProduct: (skuId: number) => void;
  onSelectDevice: (id: number) => void;
  isActive?: boolean;
}

export default function DeviceInventory({ onSelectPO, onSelectProduct, onSelectDevice, isActive = true }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [statusFilter, setStatusFilter] = useState('in_stock');
  
  // Filtering & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchDevices = () => {
    fetch(`/api/devices?status=${statusFilter}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDevices(data);
        }
      })
      .catch(err => {
        console.error('Error fetching devices:', err);
      });
  };

  useEffect(() => {
    fetchDevices();
  }, [statusFilter]);

  // Auto-refresh when tab becomes active / loaded
  useEffect(() => {
    if (isActive) {
      fetchDevices();
    }
  }, [isActive]);

  // Auto-refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (isActive) fetchDevices();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isActive, statusFilter]);

  // Derived unique lists for dropdown filtering options
  const uniqueModels = Array.from(new Set(devices.map(d => d.product_name).filter(Boolean))).sort();
  const uniqueColors = Array.from(new Set(devices.map(d => d.color).filter(Boolean))).sort();
  const uniqueConditions = Array.from(new Set(devices.map(d => d.condition).filter(Boolean))).sort();

  // Reset filters and page number when status changes
  useEffect(() => {
    setSelectedModel('all');
    setSelectedColor('all');
    setSelectedCondition('all');
    setSearchQuery('');
    setCurrentPage(1);
  }, [statusFilter]);

  // Reset page to 1 when filters or query change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedModel, selectedColor, selectedCondition]);

  // Perform filtering
  const filteredDevices = devices.filter(d => {
    if (selectedModel !== 'all' && d.product_name !== selectedModel) return false;
    if (selectedColor !== 'all' && d.color !== selectedColor) return false;
    if (selectedCondition !== 'all' && d.condition !== selectedCondition) return false;
    
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchImei = d.imei && d.imei.toLowerCase().includes(q);
      const matchName = d.product_name && d.product_name.toLowerCase().includes(q);
      const matchPo = d.po_number && d.po_number.toLowerCase().includes(q);
      const matchInv = d.invoice_number && d.invoice_number.toLowerCase().includes(q);
      if (!matchImei && !matchName && !matchPo && !matchInv) return false;
    }
    
    return true;
  });

  // Calculate Pagination Values
  const totalFiltered = filteredDevices.length;
  const pageSizes = [10, 25, 50, 100];
  const startIdx = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalFiltered);
  
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const paginatedDevices = filteredDevices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-sm px-2 pb-2 pt-0 select-none w-full" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '16px' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black shrink-0 flex justify-between items-center px-4 py-3">
        <h2 className="font-medium text-black dark:text-white" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '24px' }}>Devices Inventory</h2>
        <span className="text-xs font-medium px-2.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {totalFiltered} Serialized Units
        </span>
      </div>

      {/* Filters & Search */}
      <div className="p-2 flex flex-wrap gap-2 items-center bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-850 shrink-0">
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2.5 py-1 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-8 font-normal text-sm cursor-pointer w-48"
        >
          <option value="in_stock">Devices in Inventory</option>
          <option value="sold">Sold Devices</option>
          <option value="repair">In Repair</option>
        </select>
        
        <select 
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2.5 py-1 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-8 text-sm font-normal cursor-pointer w-48"
        >
          <option value="all">All Device Models</option>
          {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        
        <select 
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2.5 py-1 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-8 text-sm font-normal cursor-pointer w-36"
        >
          <option value="all">All Colors</option>
          {uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        <select 
          value={selectedCondition}
          onChange={(e) => setSelectedCondition(e.target.value)}
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2.5 py-1 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-8 text-sm font-normal cursor-pointer w-36"
        >
          <option value="all">All Conditions</option>
          {uniqueConditions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        {(statusFilter !== 'in_stock' || selectedModel !== 'all' || selectedColor !== 'all' || selectedCondition !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter('in_stock');
              setSelectedModel('all');
              setSelectedColor('all');
              setSelectedCondition('all');
              setSearchQuery('');
              setCurrentPage(1);
            }}
            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 border border-red-200 dark:border-red-900/60 px-2 py-1 rounded transition-colors cursor-pointer"
            title="Reset all filters to in-stock devices"
          >
            Reset Filters
          </button>
        )}
        
        <div className="relative flex-1 max-w-md ml-auto">
          <input
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search IMEI, Model, PO, Inv..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchQuery('');
                setCurrentPage(1);
              }
            }}
            className="w-full pl-3 pr-16 py-1 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none text-sm font-normal outline-none focus:border-neutral-400 h-8"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded cursor-pointer"
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
            <Search size={16} className="text-neutral-500 dark:text-neutral-400" />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-200 dark:border-neutral-850">
        <table className="w-full text-left border-collapse bg-white dark:bg-black text-[15px]">
          <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 text-center">Model</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 text-center w-24">Color</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 text-center w-20">Storage</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 text-center w-24">Condition</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-44 text-center">IMEI / Serial</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 text-center w-28">PO #</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-28 text-center">Date Entered</th>
              <th className="px-1.5 py-1 text-center w-28">Invoice #</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {paginatedDevices.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-neutral-400 dark:text-neutral-500 italic font-mono text-sm">
                  No matching devices found in inventory.
                </td>
              </tr>
            ) : (
              paginatedDevices.map((device) => (
                <tr 
                  key={device.id} 
                  className="bg-white dark:bg-black hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-[15px]"
                  onClick={() => onSelectDevice(device.id)}
                >
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-900 dark:text-neutral-100 font-normal">
                    {device.product_name}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-center text-neutral-600 dark:text-neutral-400">
                    {device.color || '-'}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-center text-neutral-600 dark:text-neutral-400">
                    {device.gb || '-'}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-center text-neutral-600 dark:text-neutral-400">
                    {device.condition || '-'}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 font-mono text-neutral-800 dark:text-neutral-200">
                    {device.imei}
                  </td>
                  <td 
                    className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-center"
                    onClick={(e) => {
                      if (device.po_number) {
                        e.stopPropagation();
                        onSelectPO(device.po_number);
                      }
                    }}
                  >
                    {device.po_number ? (
                      <span className="text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1 font-mono">
                        {device.po_number}
                        <ExternalLink size={12} />
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400 font-mono">
                    {new Date(device.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                  </td>
                  <td className="px-1.5 py-0.5 text-center text-neutral-600 dark:text-neutral-400 font-mono">
                    {device.invoice_number || 'In Inventory'}
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
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white text-neutral-900 border border-neutral-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none font-mono cursor-pointer"
          >
            {pageSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="font-normal font-mono">
            {totalFiltered > 0 ? `${startIdx}-${endIdx}/${totalFiltered}` : '0/0'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="px-2 py-0.5 border border-neutral-300 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs cursor-pointer"
          >
            «
          </button>
          
          {getPageNumbers().map((p, i) => {
            if (p === '...') {
              return <span key={`dots-${i}`} className="px-2 text-neutral-500 font-mono text-xs">..</span>;
            }
            return (
              <button 
                key={`page-${p}`}
                onClick={() => setCurrentPage(p as number)}
                className={`px-3 py-0.5 rounded-none font-normal transition-colors font-mono text-xs cursor-pointer ${
                  currentPage === p 
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black' 
                    : 'bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-850 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-850'
                }`}
              >
                {p}
              </button>
            );
          })}
          
          <button 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="px-2 py-0.5 border border-neutral-300 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs cursor-pointer"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
