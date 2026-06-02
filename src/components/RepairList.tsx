import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { Repair } from '../types';
import RepairIntakeForm from './RepairIntakeForm';
import RepairUpdateModal from './RepairUpdateModal';

interface RepairListProps {
  preSelectedCustomerId?: number | null;
}

export default function RepairList({ preSelectedCustomerId }: RepairListProps) {
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
    <div className="h-full flex flex-col bg-[var(--bg-app)] overflow-hidden transition-colors duration-300">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border-base)] shrink-0 gap-3 sm:gap-2">
        <h2 className="text-lg sm:text-xl font-medium text-[var(--text-main)]">Repair Jobs</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-more)]" size={16} />
            <input
              type="text"
              placeholder="Search ID, model, customer..."
              className="w-full pl-10 pr-4 py-1.5 bg-[var(--bg-card)] border border-[var(--border-base)] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] text-[var(--text-main)]"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all justify-center w-full sm:w-auto"
          >
            <Plus size={16} />
            New Repair Job
          </button>
        </div>
      </div>

      {/* Table — full width, no container box */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-base)] text-[11px] font-bold text-[var(--text-main)] uppercase tracking-wider">
              <th className="px-4 py-2 border-r border-[var(--border-base)]">Job #</th>
              <th className="px-4 py-2 border-r border-[var(--border-base)]">Customer</th>
              <th className="px-4 py-2 border-r border-[var(--border-base)]">Device Model</th>
              <th className="px-4 py-2 border-r border-[var(--border-base)]">Issue</th>
              <th className="px-4 py-2 border-r border-[var(--border-base)] text-right">Quote</th>
              <th className="px-4 py-2 border-r border-[var(--border-base)] text-right">Deposit</th>
              <th className="px-4 py-2 border-r border-[var(--border-base)] text-right">Balance</th>
              <th className="px-4 py-2 border-r border-[var(--border-base)]">Method</th>
              <th className="px-4 py-2 border-r border-[var(--border-base)]">Status</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(repair => (
              <tr key={repair.id} className="border-b border-[var(--border-base)] hover:bg-[var(--bg-hover)] transition-colors text-sm bg-[var(--bg-card)]">
                <td className="px-4 py-2 border-r border-[var(--border-base)] font-mono text-xs font-bold">
                  <button
                    type="button"
                    title="Print short repair ticket"
                    onClick={() => setPrintRepair(repair)}
                    className="text-[var(--brand-primary)] hover:underline cursor-pointer flex items-center gap-1 font-bold"
                  >
                    #{repair.id}
                  </button>
                </td>
                <td className="px-4 py-2 border-r border-[var(--border-base)] font-bold text-[var(--text-main)]">
                  {repair.customer_name || '—'}
                </td>
                <td className="px-4 py-2 border-r border-[var(--border-base)] text-[var(--text-main)]">{repair.device_model}</td>
                <td className="px-4 py-2 border-r border-[var(--border-base)] text-[var(--text-muted)] max-w-[200px] truncate">
                  {repair.issue}
                </td>
                <td className="px-4 py-2 border-r border-[var(--border-base)] text-right text-[var(--text-main)] font-mono">
                  €{Number(repair.total_quote || 0).toFixed(2)}
                </td>
                <td className="px-4 py-2 border-r border-[var(--border-base)] text-right text-[var(--text-muted)] font-mono">
                  €{Number(repair.deposit_paid || 0).toFixed(2)}
                </td>
                <td className="px-4 py-2 border-r border-[var(--border-base)] text-right font-bold font-mono">
                  <span className={(repair.remaining_balance || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    €{Number(repair.remaining_balance || 0).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2 border-r border-[var(--border-base)] text-[var(--text-muted-more)] text-xs">
                  {repair.payment_method || '—'}
                </td>
                <td className="px-4 py-2 border-r border-[var(--border-base)]">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${getStatusColor(repair.status)}`}>
                    {repair.status?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button 
                    onClick={() => setSelectedRepair(repair)}
                    className="text-[var(--brand-primary)] hover:underline font-medium text-xs"
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center text-[var(--text-muted-more)] bg-[var(--bg-card)]">
                  {searchTerm ? `No repair jobs found for "${searchTerm}"` : 'No repair jobs yet. Create your first job.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                <span>€{Number(printRepair.deposit_paid).toFixed(2)}</span>
              </div>
            )}
            {Number(printRepair.remaining_balance || 0) > 0 && (
              <div className="flex justify-between text-xs font-bold">
                <span>Remaining:</span>
                <span>€{Number(printRepair.remaining_balance).toFixed(2)}</span>
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
