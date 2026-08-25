import { useState, useEffect, useRef } from 'react';
import { Search, List, X } from 'lucide-react';
import { Invoice } from '../types';

interface Props {
  onSelectInvoice: (id: number) => void;
  onSelectCustomer?: (id: number) => void;
  isActive?: boolean;
}

export default function InvoiceList({ onSelectInvoice, onSelectCustomer, isActive }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading]);

  useEffect(() => {
    if (isActive) {
      fetchInvoices();
    }
  }, [isActive]);
  
  // Filtering states
  const getLocalDateString = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'weekly' | 'monthly' | 'custom'>('today');
  const [customStart, setCustomStart] = useState(getLocalDateString());
  const [customEnd, setCustomEnd] = useState(getLocalDateString());
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let start = '';
      let end = '';
      const today = new Date();
      
      if (dateRange === 'today') {
        const str = getLocalDateString(today);
        start = str;
        end = str;
      } else if (dateRange === 'yesterday') {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const str = getLocalDateString(yest);
        start = str;
        end = str;
      } else if (dateRange === 'weekly') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        start = getLocalDateString(sevenDaysAgo);
        end = getLocalDateString(today);
      } else if (dateRange === 'monthly') {
        start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        end = getLocalDateString(today);
      } else if (dateRange === 'custom') {
        start = customStart;
        end = customEnd;
      }

      const res = await fetch(`/api/invoices?startDate=${start}&endDate=${end}`);
      const data = await res.json();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [dateRange, customStart, customEnd]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  };

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter(inv => {
    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(lowerSearch) ||
      (inv.products_summary || '').toLowerCase().includes(lowerSearch) ||
      (inv.customer_name || '').toLowerCase().includes(lowerSearch)
    );
  }) : [];

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-sm px-2 py-2 select-none w-full" style={{ fontSize: '15px' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black shrink-0 flex justify-between items-center px-4 py-3">
        <h2 className="text-xl font-medium text-black dark:text-white">Sales Invoices</h2>
        <button className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer">
          <span>Cash Register</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-2 flex flex-wrap gap-2 items-center bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-850 shrink-0">
        <div className="flex items-center gap-2">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-7 font-mono font-bold"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="weekly">Weekly (Last 7 Days)</option>
            <option value="monthly">Monthly (This Month)</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-7 font-mono"
              />
              <span className="text-neutral-500 dark:text-neutral-400 text-xs">to</span>
              <input 
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 h-7 font-mono"
              />
            </div>
          )}
        </div>

        <select className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none w-48 h-7 opacity-50 cursor-not-allowed font-mono">
          <option>All Types</option>
        </select>
        
        <div className="relative flex-1 max-w-md ml-auto">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search Products, Invoice# or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-0.5 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none text-xs outline-none focus:border-neutral-400 h-7 font-mono"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2">
            <Search size={14} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-200 dark:border-neutral-850">
        <table className="w-full text-left border-collapse bg-white dark:bg-black text-[15px]">
          <thead>
            <tr className="bg-neutral-100 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-850 text-[15px] font-semibold text-black dark:text-white">
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-24">Date</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-24">Time</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-32">Invoice #</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850">Products Sold</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-40">Sales Person</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right w-28">Taxable</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right w-28">Taxes</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right w-28">Non Taxable</th>
              <th className="px-1.5 py-0.5 text-right w-28">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-neutral-500 italic text-sm">
                  Loading invoice records... Please wait
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-neutral-500 italic text-sm">No sales invoices found for this period.</td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr 
                  key={invoice.id} 
                  className="bg-white dark:bg-black hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-[15px]"
                  onClick={() => onSelectInvoice(invoice.id)}
                >
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400">{formatDate(invoice.created_at)}</td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400">{formatTime(invoice.created_at)}</td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 font-mono text-neutral-700 dark:text-neutral-300">{invoice.invoice_number}</td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-900 dark:text-neutral-100 font-normal">
                    {invoice.products_summary ? (
                      <span className="line-clamp-2" title={invoice.products_summary}>
                        {invoice.products_summary}
                      </span>
                    ) : (
                      <span className="text-neutral-400 dark:text-neutral-500 italic text-xs">No items recorded</span>
                    )}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400">PHONE LAB</td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right text-neutral-900 dark:text-neutral-100 font-mono">€{(Number(invoice.subtotal) || 0).toFixed(2)}</td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right text-neutral-900 dark:text-neutral-100 font-mono">€{(Number(invoice.tax_total) || 0).toFixed(2)}</td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right text-neutral-900 dark:text-neutral-100 font-mono">€0.00</td>
                  <td className="px-1.5 py-0.5 text-right text-neutral-900 dark:text-neutral-100 font-mono">€{(Number(invoice.grand_total) || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      <div className="p-2 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-850 flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400 shrink-0">
        <div className="flex items-center gap-4">
          <select className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2 py-0.5 outline-none font-mono">
            <option>auto</option>
          </select>
          <span className="font-normal">1-{filteredInvoices.length}/{invoices.length}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200">«</button>
          <button className="px-3 py-0.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rounded-none font-normal">1</button>
          <button className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200">»</button>
        </div>
      </div>
    </div>
  );
}
