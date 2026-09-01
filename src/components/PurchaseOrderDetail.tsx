import React, { useState, useEffect } from 'react';
import { Printer, List, ExternalLink, Users, Smartphone } from 'lucide-react';
import { PurchaseOrder } from '../types';

interface POItem {
  id: number;
  description: string;
  ordered_qty: number;
  received_qty: number;
  unit_cost: number;
  total: number;
}

interface PODetail extends PurchaseOrder {
  supplier_email?: string;
  items: POItem[];
}

interface Props {
  poId: number;
  onBack: () => void;
}

export default function PurchaseOrderDetail({ poId, onBack }: Props) {
  const [po, setPo] = useState<PODetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/purchase-orders/${poId}`)
      .then(res => res.json())
      .then(data => {
        setPo(data);
        setLoading(false);
      });
  }, [poId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono text-base p-8 text-lg">
        *** LOADING SYSTEM DATA ***
      </div>
    );
  }
  
  if (!po) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-black text-red-650 font-mono text-base p-8 text-lg">
        *** PURCHASE ORDER NOT FOUND ***
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-base px-2 pb-2 pt-0 select-none w-full overflow-auto" style={{ fontSize: '17px' }}>
      {/* Top Bar */}
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-4 py-1.5 flex justify-between items-center rounded-none shadow-none mb-2">
        <div className="flex gap-2">
          <button 
            onClick={onBack}
            className="bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-black dark:text-white px-3 py-1 font-bold rounded-none text-base transition-colors cursor-pointer"
          >
            PO {po.po_number}
          </button>
          <button className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-950 text-neutral-900 dark:text-neutral-100 px-3 py-1 rounded-none text-base transition-colors cursor-pointer">
            Activity Log
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-4 py-1.5 rounded-none text-base transition-colors flex items-center gap-2 border-0 cursor-pointer">
            <Printer size={16} />
            Print
          </button>
          <button 
            onClick={onBack}
            className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-955 text-neutral-900 dark:text-neutral-100 px-3 py-1 rounded-none text-base transition-colors flex items-center gap-2 cursor-pointer"
          >
            <List size={16} />
            List Purchase
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Status Badge */}
        <div className="flex justify-center mb-2">
          <span className="bg-emerald-600 text-white px-6 py-1 text-sm font-bold uppercase rounded-none">
            {po.status}
          </span>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Supplier Info */}
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
            <div className="bg-neutral-200 dark:bg-neutral-900 px-4 py-1.5 border-b border-neutral-300 dark:border-neutral-800">
              <span className="text-black dark:text-white font-bold uppercase tracking-wider text-[13px] flex items-center gap-2">
                <Users size={15} />
                Supplier Info
              </span>
            </div>
            <div className="p-4 space-y-2 text-base font-normal">
              <div className="flex border-b border-neutral-150 dark:border-neutral-850 pb-1">
                <span className="w-28 font-bold text-neutral-900 dark:text-neutral-100 font-mono">Company :</span>
                <span className="text-blue-605 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 font-sans">
                  {po.supplier_name}
                  <ExternalLink size={12} />
                </span>
              </div>
              <div className="flex border-b border-neutral-150 dark:border-neutral-850 pb-1">
                <span className="w-28 font-bold text-neutral-900 dark:text-neutral-100 font-mono">Supplier :</span>
                <span className="text-neutral-600 dark:text-neutral-400 font-sans">Faisal</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-neutral-900 dark:text-neutral-100 font-mono">Email :</span>
                <span className="text-neutral-600 dark:text-neutral-400 font-sans">{po.supplier_email || ''}</span>
              </div>
            </div>
          </div>

          {/* Purchase Order Info */}
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
            <div className="bg-neutral-200 dark:bg-neutral-900 px-4 py-1.5 border-b border-neutral-300 dark:border-neutral-800">
              <span className="text-black dark:text-white font-bold uppercase tracking-wider text-[13px] flex items-center gap-2">
                <Smartphone size={15} />
                Purchase Order Info
              </span>
            </div>
            <div className="p-0 bg-white dark:bg-black">
              <div className="bg-neutral-100 dark:bg-neutral-950 border-b border-neutral-300 dark:border-neutral-800">
                <button className="px-4 py-1.5 text-sm font-bold bg-white dark:bg-black border-r border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none uppercase">Basic Info</button>
              </div>
              <div className="p-4 space-y-2 text-base font-normal">
                <div className="flex border-b border-neutral-150 dark:border-neutral-850 pb-1">
                  <span className="w-36 font-bold text-neutral-900 dark:text-neutral-100 font-mono">Date Expected :</span>
                  <span className="text-neutral-600 dark:text-neutral-400 font-mono">{po.expected_at ? new Date(po.expected_at).toLocaleDateString('en-GB').replace(/\//g, '-') : ''}</span>
                </div>
                <div className="flex border-b border-neutral-150 dark:border-neutral-850 pb-1">
                  <span className="w-36 font-bold text-neutral-900 dark:text-neutral-100 font-mono">Shipping Cost :</span>
                  <span className="text-neutral-605 dark:text-neutral-400 font-mono">€{(Number(po.shipping_cost) || 0).toFixed(2)}</span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-neutral-900 dark:text-neutral-100 font-mono">Lot Ref. No. :</span>
                  <span className="text-neutral-600 dark:text-neutral-400 font-sans">{po.lot_ref_no || ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none shadow-none overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
                <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 w-12 text-center">#</th>
                <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">Description</th>
                <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">Need/Have/OnPO</th>
                <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">Ordered Qty</th>
                <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">Received Qty</th>
                <th className="px-2 py-1.5 border-r border-neutral-300 dark:border-neutral-700 text-center">Unit Cost</th>
                <th className="px-2 py-1.5 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="text-base font-normal">
              {po.items.map((item, idx) => (
                <tr key={item.id} className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
                  <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-center font-mono text-neutral-500 font-bold">#{idx + 1}</td>
                  <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 font-sans">
                    <div className="flex flex-col font-sans">
                      <span className="font-sans font-normal text-neutral-900 dark:text-neutral-100">{item.description}</span>
                      <span className="text-blue-600 dark:text-blue-400 text-xs hover:underline cursor-pointer flex items-center gap-1 mt-0.5 font-mono">
                        (1506012 <ExternalLink size={10} />)
                      </span>
                      <span className="text-blue-605 dark:text-blue-400 text-xs hover:underline cursor-pointer flex items-center gap-1 mt-0.5 font-mono">
                        <ExternalLink size={10} /> SHFLK46D6TD
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-center">
                    <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center justify-center gap-1 font-mono">
                      0 / 1 / 0
                      <ExternalLink size={11} />
                    </span>
                  </td>
                  <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-center font-mono">{item.ordered_qty}</td>
                  <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-center font-mono">{item.received_qty}</td>
                  <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono">€{(Number(item.unit_cost) || 0).toFixed(2)}</td>
                  <td className="px-2 py-1 text-right font-mono font-bold">€{(Number(item.total) || 0).toFixed(2)}</td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-neutral-100 dark:bg-neutral-950 font-bold text-neutral-900 dark:text-neutral-100">
                <td colSpan={3} className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800"></td>
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-center font-mono">{po.items.reduce((sum, item) => sum + item.ordered_qty, 0)}</td>
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-center font-mono">{po.items.reduce((sum, item) => sum + item.received_qty, 0)}</td>
                <td className="px-2 py-1 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono uppercase text-xs">Total :</td>
                <td className="px-2 py-1 text-right font-mono text-lg">€{(Number(po.total) || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-2">
          <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-6 py-1.5 rounded-none text-base border border-amber-500 hover:border-amber-600 transition-colors cursor-pointer">
            Re-Open PO
          </button>
        </div>
      </div>
    </div>
  );
}
