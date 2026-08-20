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
    if (!printerSettings) {
      alert('Printer settings not loaded. Please configure them in Getting Started.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const { 
      label_size, margin_top, margin_left, margin_bottom, margin_right, 
      orientation, font_size, font_family 
    } = printerSettings;

    const fontSizeMap: Record<string, string> = {
      'Small': '9px',
      'Medium': '11px',
      'Large': '13px',
      'Regular': '11px'
    };

    const isLandscape = orientation === 'Landscape';
    const width = isLandscape ? '57mm' : '32mm';
    const height = isLandscape ? '32mm' : '57mm';
    const baseFontSize = fontSizeMap[font_size] || '11px';

    const priceVal = device.selling_price || device.price;
    const ramText = device.ram ? (device.ram.toLowerCase().includes('gb') ? device.ram : `${device.ram}GB`) : '';
    const gbText = device.gb ? (device.gb.toLowerCase().includes('gb') ? device.gb : `${device.gb}GB`) : '';
    const specsCombined = [ramText, gbText].filter(Boolean).join(' / ') || [device.color, device.condition].filter(Boolean).join(' • ') || 'Standard';
    const imeiOrSerial = device.imei || device.imei_serial || device.serial_number || 'N/A';

    printWindow.document.write(`
      <html>
        <head>
          <title>Device Label - ${imeiOrSerial}</title>
          <style>
            @page {
              size: ${width} ${height};
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: ${width};
              height: ${height};
              overflow: hidden;
              background: #fff;
            }
            body {
              padding: ${margin_top}px ${margin_right}px ${margin_bottom}px ${margin_left}px;
              font-family: ${font_family}, Arial, sans-serif;
              font-size: ${baseFontSize};
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              text-align: center;
              page-break-after: avoid;
              break-after: avoid;
            }
            * {
              -webkit-print-color-adjust: exact;
              box-sizing: border-box;
            }
            .label-content {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 0;
              color: #000;
              overflow: hidden;
              box-sizing: border-box;
            }
            .device-name {
              font-weight: 800;
              font-size: 1.05em;
              text-transform: uppercase;
              line-height: 1.1;
              word-break: break-word;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              text-overflow: ellipsis;
              max-height: 2.25em;
              margin: 0;
              padding: 0;
              text-align: center;
              width: 100%;
            }
            .specs {
              font-size: 0.9em;
              line-height: 1.1;
              font-weight: 500;
              margin: 0;
              padding: 0;
            }
            .price {
              font-weight: 900;
              font-size: 1.15em;
              line-height: 1.1;
              margin: 1px 0;
              padding: 0;
            }
            .barcode-wrapper {
              width: 92%;
              max-width: 175px;
              margin: 0 auto;
              display: flex;
              flex-direction: column;
              align-items: stretch;
            }
            .barcode-container {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 0;
              margin: 0;
              line-height: 0;
            }
            #barcode {
              width: 100% !important;
              max-width: 100% !important;
              height: 30px !important;
              display: block !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .imei-serial {
              width: 100%;
              display: flex;
              justify-content: space-between;
              font-size: 8px;
              font-family: monospace;
              font-weight: 700;
              line-height: 1;
              margin-top: 1px;
              padding-top: 1px;
              margin-bottom: 0;
              padding-bottom: 0;
              box-sizing: border-box;
              padding-left: 2px;
              padding-right: 2px;
            }
            .imei-serial span {
              display: inline-block;
              text-align: center;
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <div class="label-content">
            <div class="device-name">${device.product_name || 'DEVICE'}</div>
            <div class="specs">${specsCombined}</div>
            ${priceVal ? `<div class="price">€${Number(priceVal).toFixed(2)}</div>` : ''}
            <div class="barcode-wrapper">
              <div class="barcode-container">
                <svg id="barcode"></svg>
              </div>
              <div class="imei-serial">
                ${imeiOrSerial.split('').map((char: string) => `<span>${char}</span>`).join('')}
              </div>
            </div>
          </div>
          <script>
            try {
              JsBarcode("#barcode", "${imeiOrSerial}", {
                format: "CODE128",
                width: 1.6,
                height: 30,
                displayValue: false,
                margin: 0
              });
            } catch (e) {
              console.error("Barcode generation failed", e);
            }

            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 500);
              }, 500);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      color: device.color,
      gb: device.gb,
      ram: device.ram,
      condition: device.condition,
      cost_price: device.cost_price,
      selling_price: device.selling_price,
      unlocked: device.unlocked,
      imei_status: device.imei_status,
      carrier: device.carrier
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
    <div className="flex flex-col h-full bg-[#f4f7f9] dark:bg-slate-950 p-2 font-sans">
      {/* Top Header with Back Button */}
      <div className="flex justify-end mb-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold shadow-2xs transition-all cursor-pointer"
        >
          <span className="text-slate-400">☰</span>
          Devices Inventory
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {/* Tabs Header */}
        <div className="flex bg-[#f8f9fa] dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('info')}
            className={`px-5 py-2 text-sm font-bold transition-all border-r border-slate-200 dark:border-slate-800 cursor-pointer ${activeTab === 'info' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white' : 'bg-[#f1f3f5] dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Device Information
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            className={`px-5 py-2 text-sm font-bold transition-all border-r border-slate-200 dark:border-slate-800 cursor-pointer ${activeTab === 'activity' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white' : 'bg-[#f1f3f5] dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Activity Log
          </button>
        </div>

        {/* Card Body */}
        <div className="p-4">
          {activeTab === 'info' ? (
            <div className="flex flex-col md:flex-row gap-5 items-start">
              {/* Left Column: Icon */}
              <div className="w-32 shrink-0 flex justify-center pt-2">
                <div className="w-28 h-36 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-full h-full text-slate-800 dark:text-slate-200" fill="currentColor">
                    <path d="M17,1H7A2,2 0 0,0 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3A2,2 0 0,0 17,1M17,19H7V5H17V19M16,13H8V11H16V13M16,17H8V15H16V17M16,9H8V7H16V9Z" />
                  </svg>
                </div>
              </div>

              {/* Middle Column: Details */}
              <div className="flex-1 px-4 space-y-3">
                <div>
                  <a href="#" className="text-blue-600 dark:text-blue-400 text-xl font-bold hover:underline font-mono">
                    {device.imei}
                  </a>
                </div>

                <div className="space-y-2 text-base">
                  <div className="flex gap-2">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 min-w-[130px]">Model:</span>
                    <span className="text-slate-900 dark:text-white font-bold text-lg">{device.product_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 min-w-[130px]">Specs:</span>
                    <span className="text-slate-900 dark:text-white font-medium text-base">{device.ram || '-'} RAM / {device.gb || '-'} Storage</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 min-w-[130px]">SKU/Barcode:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono text-base font-bold flex items-center gap-1">
                      {device.sku_code || 'N/A'}
                      <ExternalLink size={14} className="cursor-pointer" />
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 min-w-[130px]">Date Added:</span>
                    <span className="text-slate-800 dark:text-slate-200 text-base">
                      {new Date(device.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(device.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div className="flex gap-8 items-center pt-1">
                    <div className="flex gap-2 items-center">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 min-w-[35px]">PO:</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold text-base flex items-center gap-1">
                        {device.po_number || 'Internal'}
                        <ExternalLink size={14} className="cursor-pointer" />
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Cost:</span>
                      <span className="text-slate-900 dark:text-white font-mono font-bold text-lg">€{Number(device.cost_price).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3">
                  <button 
                    onClick={handleEditClick}
                    className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-sm font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => alert('(contact Admin)')}
                    className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 cursor-not-allowed text-slate-400 rounded text-sm font-semibold uppercase tracking-wider transition-all"
                  >
                    Remove
                  </button>
                  <button 
                    onClick={handlePrintLabel}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Barcode Print
                  </button>
                </div>
              </div>

              {/* Vertical Separator */}
              <div className="hidden md:block w-[1px] bg-slate-200 dark:border-slate-800 self-stretch my-1" />

              {/* Right Column: Status */}
              <div className="w-80 pl-4 space-y-0 text-base">
                <div className="py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Device Unlocked:</span>
                  <span className="text-slate-900 dark:text-white font-bold text-base">{device.unlocked || '-'}</span>
                </div>
                <div className="py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">IMEI Status:</span>
                  <span className="text-slate-900 dark:text-white font-bold text-base">{device.imei_status || '-'}</span>
                </div>
                <div className="py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Carrier:</span>
                  <span className="text-slate-900 dark:text-white font-bold text-base">{device.carrier || '-'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">History Log</h3>
                <div className="flex gap-2 items-center">
                  <select className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2.5 py-1 rounded text-sm text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                    <option>All Activities</option>
                  </select>
                  <button 
                    onClick={() => setShowNoteModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-all shadow-2xs cursor-pointer"
                  >
                    <Plus size={15} />
                    Add Note
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                <table className="w-full text-left text-base border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-sm text-slate-700 dark:text-slate-300">
                      <th className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 w-32">Date</th>
                      <th className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 w-28">Time</th>
                      <th className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 w-40">User</th>
                      <th className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 w-48">Activity</th>
                      <th className="py-1.5 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {activities.length > 0 ? (
                      activities.map((act) => (
                        <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-slate-900 dark:text-slate-100 text-base">
                          <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800">{new Date(act.created_at).toLocaleDateString('en-GB')}</td>
                          <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800">{new Date(act.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800">{act.user_name || 'System'}</td>
                          <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800">{act.activity}</td>
                          <td className="py-1.5 px-3">{act.details}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400 italic text-base">No activities recorded yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 flex justify-between items-center text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Showing 1 - {activities.length} of {activities.length}</span>
                <div className="flex gap-1">
                  <button disabled className="px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-40 text-xs cursor-pointer">«</button>
                  <button disabled className="px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-40 text-xs cursor-pointer">»</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
              <h3 className="text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-white">Add Device Note</h3>
              <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold cursor-pointer">✕</button>
            </div>
            <div className="p-6">
              <textarea 
                autoFocus
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter device activity details or notes here..."
                className="w-full h-40 border border-slate-300 dark:border-slate-700 rounded-md p-3.5 text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-none transition-all bg-white dark:bg-slate-800"
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 bg-slate-50 dark:bg-slate-800/60">
              <button 
                onClick={() => setShowNoteModal(false)}
                className="flex-1 py-2.5 rounded-md font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all uppercase text-xs tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="flex-1 py-2.5 rounded-md font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all uppercase text-xs tracking-wider disabled:opacity-50 cursor-pointer shadow-xs"
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
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
              <h3 className="text-xl font-bold tracking-wider text-slate-900 dark:text-white">Edit Device Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold cursor-pointer">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Color</label>
                <input 
                  type="text" 
                  value={editForm.color} 
                  onChange={e => setEditForm({...editForm, color: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md px-3.5 py-2 text-base focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Storage (GB)</label>
                <input 
                  type="text" 
                  value={editForm.gb} 
                  onChange={e => setEditForm({...editForm, gb: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md px-3.5 py-2 text-base focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">RAM</label>
                <input 
                  type="text" 
                  value={editForm.ram} 
                  onChange={e => setEditForm({...editForm, ram: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md px-3.5 py-2 text-base focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Condition</label>
                <select 
                  value={editForm.condition} 
                  onChange={e => setEditForm({...editForm, condition: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md px-3.5 py-2 text-base focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="New">New</option>
                  <option value="Grade A">Grade A</option>
                  <option value="Grade B">Grade B</option>
                  <option value="Grade C">Grade C</option>
                  <option value="Used">Used</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cost Price (€)</label>
                <input 
                  type="number" 
                  value={editForm.cost_price} 
                  onChange={e => setEditForm({...editForm, cost_price: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md px-3.5 py-2 text-base font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Selling Price (€)</label>
                <input 
                  type="number" 
                  value={editForm.selling_price} 
                  onChange={e => setEditForm({...editForm, selling_price: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md px-3.5 py-2 text-base font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none text-blue-600 dark:text-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Unlocked Status</label>
                <input 
                  type="text" 
                  value={editForm.unlocked} 
                  onChange={e => setEditForm({...editForm, unlocked: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md px-3.5 py-2 text-base focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">IMEI Status</label>
                <input 
                  type="text" 
                  value={editForm.imei_status} 
                  onChange={e => setEditForm({...editForm, imei_status: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md px-3.5 py-2 text-base focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateDevice}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
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
