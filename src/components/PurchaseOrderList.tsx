import React, { useState, useEffect } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-base px-2 py-2 select-none w-full overflow-hidden" style={{ fontSize: '17px' }}>
      {/* Header */}
      <div className="flex justify-between items-center shrink-0 mb-2 px-1 py-1">
        <h2 className="text-xl font-bold text-black dark:text-white uppercase">Purchase Order</h2>
        <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-1.5 px-4 rounded-none text-base flex items-center gap-2 transition-all shadow-none border-0 cursor-pointer">
          <Plus size={16} />
          Create Purchase Order
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 flex flex-wrap gap-2 items-center bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none mb-2">
        <select className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none min-w-[150px] font-sans">
          <option>Date, PO</option>
          <option>Lot Ref. No.</option>
          <option>Supplier Inv. No.</option>
        </select>

        <select 
          className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none min-w-[150px] font-sans"
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
          className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none min-w-[150px] font-sans"
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
        >
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <div className="relative flex-1 max-w-md ml-auto">
          <input 
            type="text" 
            placeholder="PO / Lot Ref./Suppliers Inv. No." 
            className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none py-1.5 pl-3 pr-10 text-base focus:outline-none text-neutral-900 dark:text-neutral-100 font-sans"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="absolute right-0 top-0 h-full px-3 bg-neutral-100 dark:bg-neutral-900 border-l border-neutral-300 dark:border-neutral-800 rounded-none hover:bg-neutral-200 dark:hover:bg-neutral-950 transition-colors border-0 cursor-pointer flex items-center justify-center">
            <Search size={16} className="text-neutral-500" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black rounded-none shadow-none">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-[13px] font-bold text-black dark:text-white uppercase tracking-wider">
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800">Date</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800">PO</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800">Lot Ref. No.</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800">Supplier</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 text-right">Sales Tax</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 text-right">Shipping Cost</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800 text-right">Total</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800">Expected</th>
              <th className="px-2 py-1 border-r border-neutral-300 dark:border-neutral-800">Return</th>
              <th className="px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-base font-normal">
            {filteredPos.map((po) => (
              <tr key={po.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 font-mono">{new Date(po.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</td>
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 font-mono font-bold text-blue-600 dark:text-blue-400">
                  <button onClick={() => onSelectPO(po.id)} className="hover:underline font-mono font-bold text-left bg-transparent border-0 cursor-pointer">
                    {po.po_number}
                  </button>
                </td>
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 font-sans">{po.lot_ref_no || po.po_number}</td>
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 font-sans">{po.supplier_name}</td>
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono">€{po.sales_tax.toFixed(2)}</td>
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono">€{po.shipping_cost.toFixed(2)}</td>
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono font-bold">€{po.total.toFixed(2)}</td>
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 font-mono">{po.expected_at ? new Date(po.expected_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-') : ''}</td>
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800"></td>
                <td className="px-2 py-1">
                  <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold uppercase ${
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
                <td colSpan={10} className="px-2 py-12 text-center text-neutral-400 dark:text-neutral-500 bg-white dark:bg-black font-sans italic">
                  No purchase orders found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none mt-2 flex justify-between items-center text-sm text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-4">
          <select className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none px-2 py-1 focus:outline-none text-neutral-900 dark:text-neutral-100">
            <option>25</option>
            <option>50</option>
            <option>100</option>
          </select>
          <span className="font-bold">1-{filteredPos.length}/{filteredPos.length}</span>
        </div>

        <div className="flex items-center gap-1">
          <button className="px-2 py-1 border border-neutral-300 dark:border-neutral-800 rounded-none hover:bg-neutral-200 dark:hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-900 dark:text-neutral-100" disabled>«</button>
          <button className="px-2 py-1 border border-neutral-300 dark:border-neutral-800 rounded-none hover:bg-neutral-200 dark:hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-900 dark:text-neutral-100" disabled>‹</button>
          <button className="px-3 py-1 bg-neutral-300 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-800 rounded-none font-bold">1</button>
          <button className="px-2 py-1 border border-neutral-300 dark:border-neutral-800 rounded-none hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100">»</button>
        </div>
      </div>
    </div>
  );
}
