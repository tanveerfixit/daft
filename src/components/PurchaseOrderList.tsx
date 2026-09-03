import React, { useState, useEffect } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PurchaseOrder, Supplier } from '../types';

export default function PurchaseOrderList({ 
  onSelectPO,
  isActive = true
}: { 
  onSelectPO: (id: number) => void;
  isActive?: boolean;
}) {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPOData = (silent = true) => {
    if (!silent && pos.length === 0) setLoading(true);
    Promise.all([
      fetch('/api/purchase-orders').then(res => res.json()),
      fetch('/api/suppliers').then(res => res.json())
    ]).then(([poData, supplierData]) => {
      setPos(Array.isArray(poData) ? poData : []);
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
    }).catch(err => {
      console.error('Error fetching PO data:', err);
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchPOData(false);
  }, []);

  useEffect(() => {
    if (isActive) {
      fetchPOData(true);
    }
  }, [isActive]);

  useEffect(() => {
    const handleFocus = () => {
      if (isActive) fetchPOData(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isActive]);

  const filteredPos = Array.isArray(pos) ? pos.filter(po => {
    const matchesSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (po.lot_ref_no || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSupplier = supplierFilter === '' || po.supplier_id === Number(supplierFilter);
    const matchesStatus = statusFilter === '' || po.status === statusFilter;
    return matchesSearch && matchesSupplier && matchesStatus;
  }) : [];

  if (loading && pos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono text-base p-8 text-lg">
        *** LOADING SYSTEM DATA ***
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-sm px-2 pb-2 pt-0 select-none w-full" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '16px' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black shrink-0 flex justify-between items-center px-4 py-3">
        <h2 className="font-medium text-black dark:text-white" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '24px' }}>Purchase Orders</h2>
        <button className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer">
          <Plus size={16} />
          <span>Create Purchase Order</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-2 flex flex-wrap gap-2 items-center bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-850 shrink-0">
        <select 
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2.5 py-1 outline-none focus:border-neutral-400 h-8 font-normal text-sm cursor-pointer"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="received">Received</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select 
          className="bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 rounded-none px-2.5 py-1 outline-none focus:border-neutral-400 h-8 font-normal text-sm min-w-[150px] cursor-pointer"
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
        >
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {(statusFilter || supplierFilter || searchTerm) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('');
              setSupplierFilter('');
              setSearchTerm('');
            }}
            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 border border-red-200 dark:border-red-900/60 px-2 py-1 rounded transition-colors cursor-pointer"
            title="Reset all PO filters and search"
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
            placeholder="Search PO#, Lot Ref or Supplier..." 
            className="w-full pl-3 pr-16 py-1 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none text-sm font-normal outline-none focus:border-neutral-400 h-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchTerm('');
              }
            }}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
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
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-24 text-center">Date</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-32 text-center">PO #</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 text-center">Lot Ref. No.</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-44 text-center">Supplier</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-24 text-center">Tax</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-28 text-center">Shipping</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-28 text-center">Total</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-28 text-center">Expected</th>
              <th className="px-1.5 py-1 text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {filteredPos.map((po) => (
              <tr 
                key={po.id} 
                className="bg-white dark:bg-black hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-[15px]"
                onClick={() => onSelectPO(po.id)}
              >
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400 font-mono">{new Date(po.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 font-mono font-bold text-blue-600 dark:text-blue-400">
                  <button onClick={(e) => { e.stopPropagation(); onSelectPO(po.id); }} className="hover:underline font-mono font-bold text-left bg-transparent border-0 cursor-pointer text-blue-600 dark:text-blue-400">
                    {po.po_number}
                  </button>
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-900 dark:text-neutral-100">{po.lot_ref_no || po.po_number}</td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400">{po.supplier_name}</td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right font-mono text-neutral-900 dark:text-neutral-100">€{(Number(po.sales_tax) || 0).toFixed(2)}</td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right font-mono text-neutral-900 dark:text-neutral-100">€{(Number(po.shipping_cost) || 0).toFixed(2)}</td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">€{(Number(po.total) || 0).toFixed(2)}</td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 font-mono text-neutral-600 dark:text-neutral-400">{po.expected_at ? new Date(po.expected_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-') : '—'}</td>
                <td className="px-1.5 py-0.5 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    po.status === 'closed' ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400' : 
                    po.status === 'received' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  }`}>
                    {po.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredPos.length === 0 && (
              <tr>
                <td colSpan={9} className="px-2 py-12 text-center text-neutral-400 dark:text-neutral-500 bg-white dark:bg-black italic text-sm">
                  No purchase orders found matching your filters.
                </td>
              </tr>
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
          <span className="font-normal">1-{filteredPos.length}/{pos.length}</span>
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
