import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Smartphone, 
  History, 
  Info, 
  Edit2, 
  Trash2, 
  Printer, 
  Plus, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { printDeviceLabelDirect } from '../../utils/printLabel';

interface DeviceDetailsProps {
  deviceId: number;
  onBack: () => void;
  onOpenPrinterSettings: () => void;
}

export default function DeviceDetailView({ deviceId, onBack, onOpenPrinterSettings }: DeviceDetailsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'activity'>('info');
  const [device, setDevice] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [printerSettings, setPrinterSettings] = useState<any>(null);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [newNote, setNewNote] = useState('');
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    fetchDevice();
    fetchActivity();
    fetchPrinterSettings();
    fetchBusinessInfo();
  }, [deviceId]);

  const fetchDevice = async () => {
    try {
      const res = await fetch(`/api/devices/${deviceId}`);
      if (res.ok) setDevice(await res.json());
    } catch (err) {
      console.error('Error fetching device:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      const res = await fetch(`/api/devices/${deviceId}/activity`);
      if (res.ok) setActivities(await res.json());
    } catch (err) {
      console.error('Error fetching activity:', err);
    }
  };

  const fetchPrinterSettings = async () => {
    try {
      const res = await fetch('/api/printer-settings');
      if (res.ok) setPrinterSettings(await res.json());
    } catch (err) {
      console.error('Error fetching printer settings:', err);
    }
  };

  const fetchBusinessInfo = async () => {
    try {
      const res = await fetch('/api/company');
      if (res.ok) setBusinessInfo(await res.json());
    } catch (err) {
      console.error('Error fetching company info:', err);
    }
  };

  const handlePrintLabel = () => {
    printDeviceLabelDirect(device, printerSettings);
  };

  const handleUpdateDevice = async () => {
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchDevice();
        fetchActivity();
      }
    } catch (err) {
      console.error('Error updating device:', err);
    }
  };

  const handleEditClick = () => {
    setEditForm({
      color: device.color || '',
      gb: device.gb || '',
      ram: device.ram || '',
      condition: device.condition || 'Grade A',
      cost_price: device.cost_price ?? '',
      selling_price: device.selling_price ?? '',
      unlocked: device.unlocked || '',
      imei_status: device.imei_status || '',
      carrier: device.carrier || ''
    });
    setShowEditModal(true);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      const res = await fetch(`/api/devices/${deviceId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: 'Note Added', details: newNote })
      });
      if (res.ok) {
        setNewNote('');
        setShowNoteModal(false);
        fetchActivity();
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove this device from inventory?')) return;
    try {
      const res = await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' });
      if (res.ok) onBack();
    } catch (err) {
      console.error('Error deleting device:', err);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-[var(--text-muted)] uppercase tracking-widest animate-pulse">Loading Device Details...</div>;
  if (!device) return <div className="p-8 text-center text-[var(--brand-danger)] uppercase font-bold">Device not found</div>;

  return (
    <div className="flex flex-col h-full bg-[#f4f7f9] p-4 font-sans">
      {/* Top Header with Back Button */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-sm transition-all"
        >
          <span className="text-slate-400">☰</span>
          Devices Inventory
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden flex flex-col">
        {/* Tabs Header */}
        <div className="flex bg-[#f8f9fa] border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('info')}
            className={`px-6 py-2.5 text-xs font-bold transition-all border-r border-slate-200 ${activeTab === 'info' ? 'bg-white text-slate-800' : 'bg-[#f1f3f5] text-slate-500 hover:text-slate-700'}`}
          >
            Device Information
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            className={`px-6 py-2.5 text-xs font-bold transition-all border-r border-slate-200 ${activeTab === 'activity' ? 'bg-white text-slate-800' : 'bg-[#f1f3f5] text-slate-500 hover:text-slate-700'}`}
          >
            Activity Log
          </button>
        </div>

        {/* Card Body */}
        <div className="p-8">
          {activeTab === 'info' ? (
            <div className="flex flex-col md:flex-row gap-0 items-start">
              {/* Left Column: Icon */}
              <div className="w-48 shrink-0 flex justify-center">
                <div className="w-40 h-48 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-full h-full text-black" fill="currentColor">
                    <path d="M17,1H7A2,2 0 0,0 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3A2,2 0 0,0 17,1M17,19H7V5H17V19M16,13H8V11H16V13M16,17H8V15H16V17M16,9H8V7H16V9Z" />
                  </svg>
                </div>
              </div>

              {/* Middle Column: Details */}
              <div className="flex-1 px-12 space-y-5">
                <div className="mb-6">
                  <a href="#" className="text-[#3498db] text-xl font-normal hover:underline">
                    {device.imei} :
                  </a>
                </div>

                <div className="space-y-3 text-base">
                  <div className="flex gap-2">
                    <span className="font-normal text-slate-600 min-w-[140px]">Model :</span>
                    <span className="text-slate-900 font-normal">{device.product_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-normal text-slate-600 min-w-[140px]">Specs :</span>
                    <span className="text-slate-900 font-normal">{device.ram || '-'} RAM / {device.gb || '-'} Storage</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-normal text-slate-600 min-w-[140px]">SKU/Barcode :</span>
                    <span className="text-[#3498db] font-normal flex items-center gap-1">
                      {device.sku_code || 'N/A'}
                      <ExternalLink size={14} className="cursor-pointer" />
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-normal text-slate-600 min-w-[140px]">Date Added :</span>
                    <span className="text-slate-900 font-normal">
                      {new Date(device.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(device.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div className="flex gap-12 items-center">
                    <div className="flex gap-2 items-center">
                      <span className="font-normal text-slate-600 min-w-[40px]">PO :</span>
                      <span className="text-[#3498db] font-normal flex items-center gap-1">
                        {device.po_number || 'Internal'}
                        <ExternalLink size={14} className="cursor-pointer" />
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-normal text-slate-600">Cost :</span>
                      <span className="text-slate-900 font-normal">€{Number(device.cost_price).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-8">
                  <button 
                    onClick={handleEditClick}
                    className="px-6 py-2.5 bg-[#555] hover:bg-[#444] text-white rounded text-xs font-normal uppercase tracking-wider transition-all"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => alert('(contact Admin)')}
                    className="px-6 py-2.5 bg-slate-300 cursor-not-allowed text-slate-500 rounded text-xs font-normal uppercase tracking-wider transition-all"
                  >
                    Remove from inventory
                  </button>
                  <button 
                    onClick={handlePrintLabel}
                    className="px-6 py-2.5 bg-[#00c853] hover:bg-[#00a344] text-white rounded text-xs font-normal uppercase tracking-wider transition-all"
                  >
                    Barcode Label Print
                  </button>
                </div>
              </div>

              {/* Vertical Separator */}
              <div className="hidden md:block w-[1px] bg-slate-200 self-stretch my-2" />

              {/* Right Column: Status */}
              <div className="w-96 pl-12 space-y-0 text-base">
                <div className="py-3 border-b border-slate-100 flex flex-col">
                  <span className="font-normal text-slate-600">Device Unlocked:</span>
                  <span className="text-slate-900 font-normal mt-1">{device.unlocked || '-'}</span>
                </div>
                <div className="py-3 border-b border-slate-100 flex flex-col">
                  <span className="font-normal text-slate-600">IMEI Status:</span>
                  <span className="text-slate-900 font-normal mt-1">{device.imei_status || '-'}</span>
                </div>
                <div className="py-3 border-b border-slate-100 flex flex-col">
                  <span className="font-normal text-slate-600">Carrier:</span>
                  <span className="text-slate-900 font-normal mt-1">{device.carrier || '-'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-normal text-slate-600 uppercase tracking-widest">History Log</h3>
                <div className="flex gap-2">
                  <select className="bg-white border border-slate-300 px-4 py-2 rounded text-sm text-slate-600 focus:outline-none font-normal">
                    <option>All Activities</option>
                  </select>
                  <button 
                    onClick={() => setShowNoteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3498db] hover:bg-[#2980b9] text-white rounded text-sm font-normal transition-all shadow-sm"
                  >
                    <Plus size={16} />
                    Add New Note
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-slate-200 text-slate-500 font-normal uppercase tracking-widest">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Activity</th>
                      <th className="px-6 py-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activities.length > 0 ? (
                      activities.map((act) => (
                        <tr key={act.id} className="hover:bg-slate-50 transition-colors text-slate-800 font-normal">
                          <td className="px-6 py-4">{new Date(act.created_at).toLocaleDateString('en-GB')}</td>
                          <td className="px-6 py-4">{new Date(act.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-6 py-4 font-normal text-[#3498db]">{act.user_name || 'System'}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="px-3 py-1 bg-slate-100 rounded border border-slate-200 text-xs w-fit">{act.activity}</span>
                              {act.source === 'product' && (
                                <span className="text-[10px] text-orange-600 font-bold uppercase tracking-tighter">[Product Level]</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">{act.details}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400 italic">No activities recorded yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-between items-center text-xs font-normal text-slate-400 uppercase tracking-widest">
                <span>Showing 1 - {activities.length} / {activities.length}</span>
                <div className="flex gap-2">
                  <button disabled className="px-3 py-1.5 border border-slate-200 rounded bg-white transition-colors hover:bg-slate-50">«</button>
                  <button disabled className="px-3 py-1.5 border border-slate-200 rounded bg-white transition-colors hover:bg-slate-50">»</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#f8f9fa]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700">Add Device Note</h3>
              <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6">
              <textarea 
                autoFocus
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter device activity details or notes here..."
                className="w-full h-40 border border-slate-300 rounded p-4 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#3498db] placeholder:text-slate-400 resize-none transition-all bg-slate-50"
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-2">
              <button 
                onClick={() => setShowNoteModal(false)}
                className="flex-1 py-2 rounded font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all uppercase text-[10px] tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="flex-1 py-2 rounded font-bold text-white bg-[#3498db] hover:bg-[#2980b9] transition-all uppercase text-[10px] tracking-widest disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#f8f9fa]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700">Edit Device Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Color</label>
                <input 
                  type="text" 
                  value={editForm.color ?? ''} 
                  onChange={e => setEditForm({...editForm, color: e.target.value})}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#3498db] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Storage (GB)</label>
                <input 
                  type="text" 
                  value={editForm.gb ?? ''} 
                  onChange={e => setEditForm({...editForm, gb: e.target.value})}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#3498db] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">RAM</label>
                <input 
                  type="text" 
                  value={editForm.ram ?? ''} 
                  onChange={e => setEditForm({...editForm, ram: e.target.value})}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#3498db] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Condition</label>
                <select 
                  value={editForm.condition ?? 'Grade A'} 
                  onChange={e => setEditForm({...editForm, condition: e.target.value})}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#3498db] outline-none"
                >
                  <option value="New">New</option>
                  <option value="Grade A">Grade A</option>
                  <option value="Grade B">Grade B</option>
                  <option value="Grade C">Grade C</option>
                  <option value="Used">Used</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cost Price</label>
                <input 
                  type="number" 
                  value={editForm.cost_price ?? ''} 
                  onChange={e => setEditForm({...editForm, cost_price: e.target.value})}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#3498db] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Selling Price</label>
                <input 
                  type="number" 
                  value={editForm.selling_price ?? ''} 
                  onChange={e => setEditForm({...editForm, selling_price: e.target.value})}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#3498db] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Unlocked Status</label>
                <input 
                  type="text" 
                  value={editForm.unlocked ?? ''} 
                  onChange={e => setEditForm({...editForm, unlocked: e.target.value})}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#3498db] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">IMEI Status</label>
                <input 
                  type="text" 
                  value={editForm.imei_status ?? ''} 
                  onChange={e => setEditForm({...editForm, imei_status: e.target.value})}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#3498db] outline-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-[#f8f9fa] border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2 border border-slate-300 rounded text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateDevice}
                className="px-6 py-2 bg-[#3498db] hover:bg-[#2980b9] text-white rounded text-xs font-bold uppercase tracking-widest transition-all shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
