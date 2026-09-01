import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Phone, Mail, Wrench, Pencil, Save, Loader2, CreditCard } from 'lucide-react';

interface RepairDetailsProps {
  repairId: number;
  onBack: () => void;
  onPayAtRegister: (job: { jobId: number; customerId: number; amount: number; deviceModel: string; label: string }) => void;
  onViewInvoice?: (invoiceId: number) => void;
}

const STEPS = [
  { value: 'new', label: 'New', index: 0 },
  { value: 'diagnosed', label: 'Diagnosed', index: 1 },
  { value: 'repairing', label: 'Under Process', index: 2 },
  { value: 'completed', label: 'Completed', index: 3 },
  { value: 'collected', label: 'Collected', index: 4 },
];

export default function RepairDetails({ repairId, onBack, onPayAtRegister, onViewInvoice }: RepairDetailsProps) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('new');
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isEditingFault, setIsEditingFault] = useState(false);
  const [faultText, setFaultText] = useState('');
  const [savingFault, setSavingFault] = useState(false);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/repairs/${repairId}`);
      const data = await res.json();
      setJob(data);
      setStatus(data.status || 'new');
      setFaultText(data.issue || '');
    } catch (err) {
      console.error('Failed to fetch repair:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [repairId]);

  const currentStepIndex = STEPS.findIndex(s => s.value === status) !== -1 
    ? STEPS.findIndex(s => s.value === status) 
    : 0;

  const handleSaveFault = async () => {
    setSavingFault(true);
    try {
      const res = await fetch(`/api/repairs/${repairId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue: faultText.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update problem description');
      setJob((prev: any) => ({ ...prev, issue: faultText.trim() }));
      setIsEditingFault(false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSavingFault(false);
    }
  };

  const handleSaveUpdate = async () => {
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/repairs/${repairId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: newNote.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Failed to save update');
      setSaveMsg('Saved successfully');
      setNewNote('');
      await fetchJob();
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err: any) {
      setSaveMsg('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <p className="text-gray-500">Repair job not found.</p>
        <button onClick={onBack} className="text-blue-600 hover:underline text-sm cursor-pointer">
          ← Back to Repairs
        </button>
      </div>
    );
  }

  const totalQuote = Number(job.total_quote || 0);
  const depositPaid = Number(job.deposit_paid || 0);
  const remaining = Number(job.remaining_balance || 0);
  const customerName = job.customer_name || 'Walk-in Customer';
  const initial = customerName.charAt(0).toUpperCase() || 'C';

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatTime = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="text-gray-800 antialiased min-h-screen flex flex-col bg-[#f2f2f2] font-sans pb-10">
      
      {/* Top Navigation */}
      <div className="bg-white border-b border-[#e5e7eb] shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-gray-900" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>
              Repair Job #{job.id} — {job.device_model}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white border border-[#e5e7eb] hover:bg-gray-50 text-gray-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Print Repair Ticket"
            >
              <Printer size={14} />
              <span>Print Ticket</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Customer Profile Card */}
            <div className="bg-white border border-[#e5e7eb] rounded shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#e5e7eb] bg-white text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 text-2xl font-bold">
                  {initial}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{customerName}</h2>
                {job.customer_phone ? (
                  <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                    <Phone size={14} />
                    <span>{job.customer_phone}</span>
                  </p>
                ) : (
                  <p className="text-gray-400 text-xs mt-1">No phone number</p>
                )}
                {job.customer_email && (
                  <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                    <Mail size={12} />
                    <span>{job.customer_email}</span>
                  </p>
                )}
              </div>
              <div className="p-0">
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-[#e5e7eb]">
                    <tr className="bg-[#f8f9fa]">
                      <td className="py-3 px-4 font-medium text-gray-500 w-1/3">Device</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{job.device_model}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-3 px-4 font-medium text-gray-500 align-top">Fault</td>
                      <td className="py-3 px-4 text-gray-700">
                        {isEditingFault ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              rows={2}
                              value={faultText}
                              onChange={(e) => setFaultText(e.target.value)}
                              placeholder="Enter problem description..."
                              className="w-full border border-gray-300 rounded p-2 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={savingFault}
                                onClick={handleSaveFault}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                {savingFault ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                disabled={savingFault}
                                onClick={() => { setIsEditingFault(false); setFaultText(job.issue || ''); }}
                                className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <span className="whitespace-pre-wrap">{job.issue || 'General Inspection / Repair'}</span>
                            <button
                              type="button"
                              onClick={() => setIsEditingFault(true)}
                              className="text-gray-400 hover:text-blue-600 transition-colors p-0.5 cursor-pointer shrink-0"
                              title="Edit Problem Description"
                            >
                              <Pencil size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr className="bg-[#f8f9fa]">
                      <td className="py-3 px-4 font-medium text-gray-500">Intake</td>
                      <td className="py-3 px-4 text-gray-700 text-xs">
                        {formatDate(job.created_at)} {formatTime(job.created_at)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Card */}
            <div className="bg-white border border-[#e5e7eb] rounded shadow-sm overflow-hidden">
              <div className="bg-[#f8f9fa] px-4 py-3 border-b border-[#e5e7eb] font-semibold text-gray-800 flex justify-between items-center">
                <span>Finances</span>
                {remaining <= 0 ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                    Fully Paid
                  </span>
                ) : depositPaid > 0 ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                    Deposit Paid
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                    Unpaid
                  </span>
                )}
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Total Quote</span>
                  <span className="font-bold text-gray-900">€{totalQuote.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Total Paid</span>
                  <span className="font-bold text-emerald-600">€{depositPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#e5e7eb]">
                  <span className="font-bold text-gray-800">Remaining</span>
                  <span className={`font-bold text-lg ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    €{remaining.toFixed(2)}
                  </span>
                </div>
                {remaining > 0 ? (
                  <button
                    onClick={() => onPayAtRegister({
                      jobId: job.id,
                      customerId: job.customer_id,
                      amount: remaining,
                      deviceModel: job.device_model,
                      label: `Repair Job #${job.id} — ${job.device_model}`
                    })}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <CreditCard size={16} />
                    <span>Collect Payment (€{remaining.toFixed(2)})</span>
                  </button>
                ) : (
                  <div className="mt-4 w-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold py-2 px-4 rounded text-center text-xs">
                    ✓ Job is Fully Settled
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Update Status Card */}
            <div className="bg-white border border-[#e5e7eb] rounded shadow-sm overflow-hidden">
              <div className="bg-[#f8f9fa] px-5 py-4 border-b border-[#e5e7eb] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-gray-800 text-lg">Status:</h2>
                  <select
                    id="status-dropdown"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-white border border-gray-300 rounded py-1.5 px-3 text-sm font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {STEPS.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                {saveMsg && (
                  <span className={`text-xs font-bold px-3 py-1 rounded ${saveMsg.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
              <div className="p-5">
                
                {/* Stepper Design */}
                <div className="flex items-center justify-between mb-6 relative" id="stepper-container">
                  <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200 -z-10 -translate-y-1/2"></div>
                  
                  {STEPS.map((step, idx) => {
                    const isActive = idx === currentStepIndex;
                    const isCompleted = idx < currentStepIndex;

                    let circleClass = 'w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold border-4 border-white transition-colors cursor-pointer';
                    let textClass = 'text-xs font-medium text-gray-500 cursor-pointer';

                    if (isActive) {
                      circleClass = 'w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold border-4 border-white shadow-sm ring-1 ring-blue-600 cursor-pointer';
                      textClass = 'text-xs font-bold text-blue-600 cursor-pointer';
                    } else if (isCompleted) {
                      circleClass = 'w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold border-4 border-white cursor-pointer';
                      textClass = 'text-xs font-medium text-blue-600 cursor-pointer';
                    }

                    return (
                      <div 
                        key={step.value} 
                        onClick={() => setStatus(step.value)} 
                        className="stepper-item flex flex-col items-center gap-2 bg-white px-2 cursor-pointer"
                        title={`Set status to ${step.label}`}
                      >
                        <div className={circleClass}>
                          {idx + 1}
                        </div>
                        <span className={textClass}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full border border-[#e5e7eb] rounded p-4 text-sm text-gray-700 bg-[#f8f9fa] focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  rows={3}
                  placeholder="Write a status update or internal note here..."
                />
                
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleSaveUpdate}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>Save Update</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Payment History & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Payment History */}
              <div className="bg-white border border-[#e5e7eb] rounded shadow-sm overflow-hidden flex flex-col">
                <div className="bg-[#f8f9fa] px-4 py-3 border-b border-[#e5e7eb] font-semibold text-gray-800">
                  Payment History
                </div>
                <div className="p-0 flex-1">
                  {job.invoices && job.invoices.length > 0 ? (
                    <ul className="divide-y divide-[#e5e7eb]">
                      {job.invoices.map((inv: any) => (
                        <li key={inv.id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <button
                              onClick={() => onViewInvoice?.(inv.id)}
                              className="font-semibold text-blue-600 hover:underline text-sm font-mono cursor-pointer"
                            >
                              {inv.invoice_number}
                            </button>
                            <span className="font-bold text-emerald-600 text-sm">
                              €{Number(inv.grand_total || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>{formatDate(inv.created_at)}</span>
                            <span>{inv.payment_summary || 'Paid'}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-6 text-center text-gray-400 italic text-sm h-full flex items-center justify-center min-h-[120px]">
                      No payment receipts recorded yet.
                    </div>
                  )}
                </div>
              </div>
              
              {/* Tech Notes */}
              <div className="bg-white border border-[#e5e7eb] rounded shadow-sm overflow-hidden flex flex-col">
                <div className="bg-[#f8f9fa] px-4 py-3 border-b border-[#e5e7eb] font-semibold text-gray-800">
                  Tech Notes
                </div>
                <div className="p-4 flex-1 overflow-y-auto max-h-[220px]">
                  {job.notes && job.notes.trim() ? (
                    <div className="space-y-2 text-xs">
                      {job.notes.split('\n').filter(Boolean).map((n: string, idx: number) => (
                        <div key={idx} className="p-2.5 bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono">
                          {n}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-400 italic text-sm h-full flex items-center justify-center min-h-[120px]">
                      No notes recorded yet.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>

      {/* Hidden Print Container for Short Repair Ticket */}
      <div id="repair-thermal-receipt" className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 text-black font-mono w-[72mm] leading-tight">
        <div className="text-center font-bold text-sm mb-1">REPAIR TICKET</div>
        <div className="text-center text-xs mb-2 border-b border-black pb-1">Job #{job.id}</div>
        
        <div className="text-xs space-y-1 mb-2">
          <div><span className="font-bold">Customer:</span> {customerName}</div>
          {job.customer_phone && <div><span className="font-bold">Phone:</span> {job.customer_phone}</div>}
          <div><span className="font-bold">Device:</span> {job.device_model}</div>
          <div><span className="font-bold">Fault:</span> {job.issue || '—'}</div>
          <div><span className="font-bold">Date:</span> {formatDate(job.created_at)}</div>
        </div>

        <div className="border-t border-b border-black py-1 text-xs space-y-0.5 mb-2">
          <div className="flex justify-between">
            <span>Quote:</span>
            <span>€{totalQuote.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Deposit Paid:</span>
            <span>€{depositPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Remaining Due:</span>
            <span>€{remaining.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-[10px] text-center italic mt-3">
          Please retain this ticket for collecting your device.
        </div>
      </div>

    </div>
  );
}
