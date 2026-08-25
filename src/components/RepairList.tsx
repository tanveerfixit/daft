import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { Repair } from '../types';
import RepairIntakeForm from './RepairIntakeForm';
import RepairUpdateModal from './RepairUpdateModal';

interface RepairListProps {
  preSelectedCustomerId?: number | null;
  isActive?: boolean;
}

export default function RepairList({ preSelectedCustomerId, isActive = true }: RepairListProps) {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<any | null>(null);
  const [printRepair, setPrintRepair] = useState<Repair | null>(null);

  const fetchRepairs = async () => {
    try {
      const res = await fetch('/api/repairs');
      const data = await res.json();
      setRepairs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch repairs:', err);
    }
  };

  useEffect(() => {
    fetchRepairs();
    if (preSelectedCustomerId) {
      setIsModalOpen(true);
    }
  }, [preSelectedCustomerId]);

  useEffect(() => {
    if (isActive) {
      fetchRepairs();
    }
  }, [isActive]);

  useEffect(() => {
    const handleFocus = () => {
      if (isActive) fetchRepairs();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isActive]);

  useEffect(() => {
    if (printRepair) {
      const timer = setTimeout(() => {
        window.print();
        setPrintRepair(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [printRepair]);

  const filtered = Array.isArray(repairs) ? repairs.filter(r =>
    String(r.id).includes(searchTerm) ||
    (r.device_model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':        return 'bg-[var(--bg-zebra)] text-[var(--text-main)] border-[var(--border-header)]';
      case 'diagnosed':  return 'bg-[var(--bg-hover)] text-[var(--brand-primary)] border-[var(--brand-primary)]';
      case 'repairing':  return 'bg-[var(--bg-hover)] text-purple-700 border-purple-300';
      case 'completed':  return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'collected':  return 'bg-[var(--bg-accent-subtle)] text-[var(--text-muted)] border-[var(--border-header)]';
      default:           return 'bg-[var(--bg-zebra)] text-[var(--text-muted-more)] border-[var(--border-header)]';
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-sm px-2 py-2 select-none w-full" style={{ fontSize: '15px' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black shrink-0 flex justify-between items-center px-4 py-3">
        <h2 className="text-xl font-medium text-black dark:text-white">Repair Jobs</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>New Repair Job</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-2 flex flex-wrap gap-2 items-center bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-850 shrink-0">
        <div className="relative flex-1 max-w-md ml-auto">
          <input
            type="text"
            placeholder="Search ID, model, customer..."
            className="w-full pl-3 pr-10 py-0.5 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none text-xs outline-none focus:border-neutral-400 h-7 font-mono"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-20">Job #</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850">Customer</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850">Device Model</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850">Issue Description</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right w-24">Total Quote</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right w-24">Deposit Paid</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right w-24">Remaining Balance</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-28">Payment Method</th>
              <th className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 w-28">Status</th>
              <th className="px-1.5 py-0.5 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {filtered.map(repair => (
              <tr key={repair.id} className="bg-white dark:bg-black hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-[15px]">
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 font-mono font-bold">
                  <button
                    type="button"
                    title="Print short repair ticket"
                    onClick={() => setPrintRepair(repair)}
                    className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 font-bold text-[15px]"
                  >
                    #{repair.id}
                  </button>
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-900 dark:text-neutral-100">
                  {repair.customer_name || '—'}
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-900 dark:text-neutral-100">{repair.device_model}</td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400 max-w-[200px] truncate">
                  {repair.issue}
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right text-neutral-900 dark:text-neutral-100 font-mono">
                  €{Number(repair.total_quote || 0).toFixed(2)}
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right text-neutral-600 dark:text-neutral-400 font-mono">
                  €{Number(repair.deposit_paid || 0).toFixed(2)}
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-right font-bold font-mono">
                  <span className={(repair.remaining_balance || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    €{Number(repair.remaining_balance || 0).toFixed(2)}
                  </span>
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400">
                  {repair.payment_method || '—'}
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border capitalize inline-block ${getStatusColor(repair.status)}`}>
                    {repair.status?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-1.5 py-0.5 text-center">
                  <button 
                    onClick={() => setSelectedRepair(repair)}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-xs cursor-pointer"
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-neutral-400 dark:text-neutral-500 bg-white dark:bg-black text-sm italic">
                  {searchTerm ? `No repair jobs found for "${searchTerm}"` : 'No repair jobs yet. Create your first job.'}
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
          <span className="font-normal">1-{filtered.length}/{repairs.length}</span>
        </div>

        <div className="flex items-center gap-1">
          <button className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200">«</button>
          <button className="px-3 py-0.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rounded-none font-normal">1</button>
          <button className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200">»</button>
        </div>
      </div>

      {isModalOpen && (
        <RepairIntakeForm
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchRepairs();
          }}
          initialCustomerId={preSelectedCustomerId}
        />
      )}

      {selectedRepair && (
        <RepairUpdateModal
          repair={selectedRepair}
          onClose={() => setSelectedRepair(null)}
          onSaved={() => {
            setSelectedRepair(null);
            fetchRepairs();
          }}
        />
      )}

      {/* Hidden Print Container for Short Repair Ticket */}
      {printRepair && (
        <div id="repair-thermal-receipt" className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 text-black font-mono w-[72mm] leading-tight">
          <style>{`
            @media print {
              @page {
                margin: 0;
                size: 80mm auto;
              }
              body * {
                visibility: hidden;
              }
              #repair-thermal-receipt, #repair-thermal-receipt * {
                visibility: visible;
              }
              #repair-thermal-receipt {
                position: absolute;
                left: 0;
                top: 0;
                width: 72mm;
                max-width: 72mm;
                padding: 4mm;
                box-sizing: border-box;
                background: white !important;
                color: black !important;
              }
            }
          `}</style>
          <div className="flex flex-col text-xs space-y-1">
            <div className="text-center font-black uppercase text-sm border-b border-dashed border-black pb-1.5 mb-1.5">
              Repair Job Ticket
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Job #:</span>
              <span>#{printRepair.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Date:</span>
              <span>{new Date(printRepair.created_at || '').toLocaleDateString()}</span>
            </div>
            <div className="border-b border-dashed border-black my-1" />
            
            <div className="flex justify-between gap-2">
              <span className="font-bold shrink-0">Device:</span>
              <span className="text-right font-medium truncate">{printRepair.device_model}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="font-bold shrink-0">Name:</span>
              <span className="text-right font-medium truncate">{printRepair.customer_name || 'Walk-in Customer'}</span>
            </div>
            {printRepair.phone && (
              <div className="flex justify-between gap-2">
                <span className="font-bold shrink-0">Mobile:</span>
                <span className="text-right font-medium">{printRepair.phone}</span>
              </div>
            )}
            
            <div className="border-b border-dashed border-black my-1" />
            <div className="flex flex-col">
              <span className="font-bold">Fault Description:</span>
              <span className="pl-1 mt-0.5 whitespace-pre-wrap">{printRepair.issue}</span>
            </div>
            
            <div className="border-b border-dashed border-black my-1" />
            <div className="flex justify-between font-bold text-sm mt-1">
              <span>Price:</span>
              <span>€{Number(printRepair.total_quote || 0).toFixed(2)}</span>
            </div>
            {Number(printRepair.deposit_paid || 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span>Deposit Paid:</span>
                <span>€{Number(printRepair.deposit_paid || 0).toFixed(2)}</span>
              </div>
            )}
            {Number(printRepair.remaining_balance || 0) > 0 && (
              <div className="flex justify-between text-xs font-bold">
                <span>Remaining:</span>
                <span>€{Number(printRepair.remaining_balance || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-dashed border-black pt-2 mt-4 text-center text-[10px] text-neutral-500">
              Thank you for choosing Mobigo!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
