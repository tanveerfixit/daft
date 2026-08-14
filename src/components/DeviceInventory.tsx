import { useState, useEffect } from 'react';
import { Search, ExternalLink, Printer } from 'lucide-react';
import { printDeviceLabelDirect } from '../utils/printLabel';

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
  selling_price?: number;
  cost_price?: number;
}

interface Props {
  onSelectPO: (poNumber: string) => void;
  onSelectProduct: (skuId: number) => void;
  onSelectDevice: (id: number) => void;
  onOpenPrinterSettings?: () => void;
}

export default function DeviceInventory({ onSelectPO, onSelectProduct, onSelectDevice, onOpenPrinterSettings }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [statusFilter, setStatusFilter] = useState('in_stock');
  const [printerSettings, setPrinterSettings] = useState<any>(null);
  
  // Filtering & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    fetch(`/api/devices?status=${statusFilter}`)
      .then(res => res.json())
      .then(data => setDevices(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching devices:', err);
        setDevices([]);
      });

    fetch('/api/printer-settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setPrinterSettings(data); })
      .catch(() => {});
  }, [statusFilter]);

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
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-955 dark:text-neutral-100 font-mono text-base px-2 py-2 select-none w-full overflow-auto" style={{ fontSize: '17px' }}>
      {/* Header bar with Filters */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 shrink-0 mb-2 p-3 space-y-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-base font-bold tracking-wider uppercase text-[#0285b5] dark:text-[#0285b5]">Devices Inventory</h1>
        </div>
        
        {/* Flat Grid Filters Row */}
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none w-48 cursor-pointer"
          >
            <option value="in_stock">Devices in Inventory</option>
            <option value="sold">Sold Devices</option>
            <option value="repair">In Repair</option>
          </select>
          
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none w-48 cursor-pointer"
          >
            <option value="all">All Device Models</option>
            {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          
          <select 
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none w-40 cursor-pointer"
          >
            <option value="all">All Colors</option>
            {uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <select 
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none w-40 cursor-pointer"
          >
            <option value="all">All Conditions</option>
            {uniqueConditions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          {/* Flat Search Box */}
          <div className="relative flex-1 max-w-md ml-auto flex">
            <input
              type="text"
              placeholder="Search IMEI, Model, PO, Inv..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-12 py-1 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none text-sm focus:outline-none text-neutral-900 dark:text-neutral-100 font-mono"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer bg-transparent border-0"
                title="Clear Search"
              >
                Clear
              </button>
            )}
            <button className="px-3 bg-neutral-150 dark:bg-neutral-900 border border-l-0 border-neutral-300 dark:border-neutral-800 rounded-none hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer flex items-center justify-center">
              <Search size={14} className="text-neutral-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Flat monospaced list details */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none">
        <table className="w-full text-left border-collapse font-mono text-[14px]">
          <thead>
            <tr className="bg-neutral-100 dark:bg-neutral-955 border-b border-neutral-300 dark:border-neutral-800 text-[13px] font-bold text-black dark:text-white uppercase tracking-wider">
              <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 w-1/4">Model</th>
              <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 text-center w-24">Color</th>
              <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 text-center w-20">GB</th>
              <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 text-center w-20">Cond</th>
              <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 w-1/6">IMEI Number</th>
              <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 text-center w-24">PO #</th>
              <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 w-1/6">Date Entered</th>
              <th className="px-4 py-2 border-r border-neutral-300 dark:border-neutral-800 text-center w-1/6">Invoice #</th>
              <th className="px-3 py-2 text-center w-16">Label</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-850">
            {paginatedDevices.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-neutral-400 dark:text-neutral-500 italic text-sm">
                  No matching devices found in inventory.
                </td>
              </tr>
            ) : (
              paginatedDevices.map((device, idx) => (
                <tr key={device.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800">
                    <button 
                      onClick={() => onSelectDevice(device.id)}
                      className="text-[#0285b5] hover:underline text-left font-bold cursor-pointer bg-transparent border-0 p-0 text-sm"
                    >
                      {device.product_name}
                    </button>
                  </td>
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-600 dark:text-neutral-400">{device.color || ''}</td>
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-600 dark:text-neutral-400">{device.gb || ''}</td>
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-600 dark:text-neutral-400">{device.condition || ''}</td>
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800">
                    <button 
                      onClick={() => onSelectDevice(device.id)}
                      className="text-[#0285b5] hover:underline font-bold font-mono text-xs cursor-pointer bg-transparent border-0 p-0"
                    >
                      {device.imei}
                    </button>
                  </td>
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center">
                    {device.po_number && (
                      <button 
                        onClick={() => onSelectPO(device.po_number!)}
                        className="text-[#0285b5] hover:underline flex items-center justify-center gap-1 mx-auto font-bold cursor-pointer bg-transparent border-0 p-0 text-xs"
                      >
                        <span>{device.po_number}</span>
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-mono text-xs">
                    {new Date(device.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                  </td>
                  <td className="px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 text-center text-neutral-500 dark:text-neutral-400 font-mono text-xs">
                    {device.invoice_number || 'In Inventory'}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => printDeviceLabelDirect(device, printerSettings)}
                      className="p-1 text-[#0285b5] hover:bg-[#0285b5]/10 rounded transition-colors inline-flex items-center justify-center cursor-pointer bg-transparent border-0"
                      title="Print Barcode Label (Dymo 11354)"
                    >
                      <Printer size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Flat Pagination Footer */}
      <div className="p-3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 mt-2 flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-4">
          <span className="font-bold">Items per page:</span>
          <select 
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-0.5 focus:outline-none text-neutral-900 dark:text-neutral-100 cursor-pointer"
          >
            {pageSizes.map(size => (
              <option key={size} value={size} className="bg-white dark:bg-black text-black dark:text-white">{size}</option>
            ))}
          </select>
          <span className="font-bold text-neutral-900 dark:text-neutral-100">{startIdx}-{endIdx}/{totalFiltered}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="px-2 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
          >
            «
          </button>
          
          {getPageNumbers().map((p, i) => {
            if (p === '...') {
              return <span key={`dots-${i}`} className="px-2 text-neutral-400">..</span>;
            }
            return (
              <button 
                key={`page-${p}`}
                onClick={() => setCurrentPage(p as number)}
                className={`px-3 py-0.5 rounded-none transition-colors border cursor-pointer font-bold ${
                  currentPage === p 
                    ? 'bg-[#0285b5] text-white border-[#0285b5]' 
                    : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {p}
              </button>
            );
          })}
          
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="px-2 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-none cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
