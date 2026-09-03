import React, { useState, useEffect } from 'react';
import { Plus, Search, Printer, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Repair } from '../types';
import { useAuth } from '../context/AuthContext';
import RepairIntakeForm from './RepairIntakeForm';

const slugify = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

interface RepairListProps {
  preSelectedCustomerId?: number | null;
  isActive?: boolean;
}

export default function RepairList({ preSelectedCustomerId, isActive = true }: RepairListProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const branchSlug = slugify(currentUser?.branch_name || 'branch');
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('new');
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
      window.history.replaceState({}, document.title);
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

  const filtered = Array.isArray(repairs) ? repairs.filter(r => {
    const matchesSearch = !searchTerm || 
      String(r.id).includes(searchTerm) ||
      (r.device_model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((r as any).customer_phone || '').includes(searchTerm) ||
      (r.status || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  const statusCounts = {
    all: repairs.length,
    new: repairs.filter(r => r.status === 'new').length,
    diagnosed: repairs.filter(r => r.status === 'diagnosed').length,
    repairing: repairs.filter(r => r.status === 'repairing').length,
    completed: repairs.filter(r => r.status === 'completed').length,
    collected: repairs.filter(r => r.status === 'collected').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':        return 'text-neutral-700 dark:text-neutral-300';
      case 'diagnosed':  return 'text-blue-600 dark:text-blue-400';
      case 'repairing':  return 'text-purple-600 dark:text-purple-400';
      case 'completed':  return 'text-emerald-600 dark:text-emerald-400 font-bold';
      case 'collected':  return 'text-neutral-500 dark:text-neutral-400';
      default:           return 'text-neutral-600 dark:text-neutral-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-base px-2 pb-2 pt-0 select-none w-full" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '16px' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black shrink-0 flex justify-between items-center px-4 py-3">
        <h2 className="font-medium text-black dark:text-white" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '24px' }}>Repair Jobs</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>New Repair Job</span>
        </button>
      </div>

      {/* Status Filter Dropdown & Search */}
      <div className="p-2 flex flex-wrap gap-3 items-center bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-850 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-normal text-neutral-700 dark:text-neutral-300">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-none px-2.5 py-1 text-sm font-normal outline-none focus:border-blue-500 cursor-pointer shadow-sm h-8"
          >
            <option value="new">New / Booked ({statusCounts.new || 0})</option>
            <option value="all">All Statuses ({statusCounts.all || 0})</option>
            <option value="diagnosed">Diagnosed ({statusCounts.diagnosed || 0})</option>
            <option value="repairing">In Progress ({statusCounts.repairing || 0})</option>
            <option value="completed">Completed ({statusCounts.completed || 0})</option>
            <option value="collected">Collected ({statusCounts.collected || 0})</option>
          </select>
        </div>

        {(statusFilter !== 'new' || searchTerm) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('new');
              setSearchTerm('');
            }}
            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 border border-red-200 dark:border-red-900/60 px-2 py-1 rounded transition-colors cursor-pointer"
            title="Reset to new/booked repair tickets"
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
            placeholder="Search ID, customer, phone, device..."
            className="w-full pl-3 pr-16 py-1 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-none text-sm font-normal outline-none focus:border-neutral-400 h-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
        <table className="w-full text-left border-collapse bg-white dark:bg-black text-[17px]">
          <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-20 text-center">Job #</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 text-center">Customer</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 text-center">Device & Fault</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-36 text-center">Phone</th>
              <th className="px-1.5 py-1 border-r border-neutral-300 dark:border-neutral-700 w-32 text-center">Status</th>
              <th className="px-1.5 py-1 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {filtered.map(repair => (
              <tr 
                key={repair.id} 
                onClick={() => navigate(`/${branchSlug}/repairs/${repair.id}`)}
                className="bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer text-[16px]"
              >
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 font-mono font-bold text-blue-600 dark:text-blue-400">
                  #{repair.id}
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 font-medium text-neutral-900 dark:text-neutral-100">
                  {repair.customer_name || 'Walk-in Customer'}
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-900 dark:text-neutral-100">
                  <span className="font-semibold">{repair.device_model}</span>
                  {repair.issue && (
                    <span className="text-neutral-500 dark:text-neutral-400 text-[14px] ml-2 font-normal">
                      — {repair.issue}
                    </span>
                  )}
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850 text-neutral-600 dark:text-neutral-400 font-mono text-[15px]">
                  {(repair as any).customer_phone || (repair as any).phone || '—'}
                </td>
                <td className="px-1.5 py-0.5 border-r border-neutral-200 dark:border-neutral-850">
                  <span className={`text-[15px] font-semibold capitalize ${getStatusColor(repair.status)}`}>
                    {repair.status?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-1.5 py-0.5 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      title="Print ticket"
                      onClick={() => setPrintRepair(repair)}
                      className="p-1 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer inline-flex items-center justify-center"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-400 dark:text-neutral-500 bg-white dark:bg-black text-sm italic">
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
          <button className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-850 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200">«</button>
          <button className="px-3 py-0.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rounded-none font-normal">1</button>
          <button className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200">»</button>
        </div>
      </div>

      {isModalOpen && (
        <RepairIntakeForm
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newJobId, takeDepositAmount, jobDetails) => {
            setIsModalOpen(false);
            fetchRepairs();
            if (takeDepositAmount && takeDepositAmount > 0 && jobDetails) {
              navigate(`/${branchSlug}/register`, {
                state: {
                  repairJob: {
                    jobId: newJobId,
                    customerId: jobDetails.customer_id,
                    amount: takeDepositAmount,
                    deviceModel: jobDetails.device_model,
                    label: `Repair Deposit #${newJobId} — ${jobDetails.device_model}`
                  },
                  customerId: jobDetails.customer_id
                }
              });
            } else {
              navigate(`/${branchSlug}/repairs/${newJobId}`);
            }
          }}
          initialCustomerId={preSelectedCustomerId}
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
              <span>{Number(printRepair.total_quote || 0) > 0 ? `€${Number(printRepair.total_quote || 0).toFixed(2)}` : 'Estimate Pending'}</span>
            </div>
            {Number(printRepair.deposit_paid || 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span>Deposit Paid:</span>
                <span>€{Number(printRepair.deposit_paid || 0).toFixed(2)}</span>
              </div>
            )}
            {Number(printRepair.total_quote || 0) > 0 && Number(printRepair.remaining_balance || 0) > 0 && (
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
