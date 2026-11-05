import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Camera,
  X,
  Search,
  ChevronDown,
  Check
} from 'lucide-react';
import { invalidateCache } from '../../utils/cache';

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
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [newNote, setNewNote] = useState('');
  const [editForm, setEditForm] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDevice();
    fetchActivity();
    fetchPrinterSettings();
    fetchBusinessInfo();
    fetchAvailableProducts();
  }, [deviceId]);

  // Close product dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAvailableProducts = async (currentDev?: any) => {
    try {
      const res = await fetch('/api/products?product_type=serialized&limit=2000');
      if (res.ok) {
        const data = await res.json();
        const rawList: any[] = Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : []);
        const targetDev = currentDev || device;
        if (targetDev?.sku_id && !rawList.some(p => p.id === targetDev.sku_id)) {
          rawList.push({
            id: targetDev.sku_id,
            product_name: targetDev.product_name || 'Current Model',
            sku_code: targetDev.sku_code || ''
          });
        }
        // Sort models alphabetically (A-Z) with natural numeric ordering (e.g. iPhone 11 before iPhone 12)
        rawList.sort((a, b) => {
          const nameA = (a.product_name || a.name || '').trim();
          const nameB = (b.product_name || b.name || '').trim();
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setAvailableProducts(rawList);
      }
    } catch (err) {
      console.error('Error fetching serialized products:', err);
    }
  };

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
      'Small': '10px',
      'Medium': '12px',
      'Large': '14px',
      'Regular': '12px'
    };

    const isLandscape = orientation === 'Landscape';
    const width = isLandscape ? '57mm' : '32mm';
    const height = isLandscape ? '32mm' : '57mm';
    const baseFontSize = fontSizeMap[font_size] || '12px';

    const priceVal = device.selling_price || device.price;
    const specsCombined = [device.color, device.condition].filter(Boolean).join(' • ');
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
              justify-content: space-between;
              padding: 0;
              color: #000;
              overflow: hidden;
              box-sizing: border-box;
            }
            .device-name {
              font-weight: 800;
              font-size: 1.05em;
              text-transform: uppercase;
              line-height: 1.15;
              word-break: break-word;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              text-overflow: ellipsis;
              max-height: 2.3em;
              margin: 0;
              padding: 0;
              text-align: center;
              width: 100%;
            }
            .specs {
              font-size: 0.9em;
              line-height: 1.15;
              font-weight: 600;
              margin: 0;
              padding: 0;
            }
            .price {
              font-weight: 900;
              font-size: 1.18em;
              line-height: 1.15;
              margin: 0;
              padding: 0;
            }
            .barcode-wrapper {
              width: 94%;
              max-width: 185px;
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
              height: ${isLandscape ? '28px' : '36px'} !important;
              display: block !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .imei-serial {
              width: 100%;
              display: flex;
              justify-content: space-between;
              font-size: 8.5px;
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
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        invalidateCache('devices_');
        invalidateCache('products_');
        setShowEditModal(false);
        fetchDevice();
        fetchActivity();
      } else {
        const data = await res.json().catch(() => ({}));
        setUpdateError(data.error || 'Failed to update device. Please try again.');
      }
    } catch (err: any) {
      console.error('Error updating device:', err);
      setUpdateError(err?.message || 'Network error updating device.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditClick = () => {
    setUpdateError(null);
    setProductSearch('');
    setIsProductDropdownOpen(false);
    setEditForm({
      sku_id: device.sku_id ?? '',
      color: device.color ?? '',
      gb: device.gb ?? '',
      ram: device.ram ?? '',
      condition: device.condition ?? 'New',
      cost_price: device.cost_price ?? '',
      selling_price: device.selling_price ?? '',
      unlocked: device.unlocked ?? 'Unknown',
      imei_status: device.imei_status ?? 'Clean',
      carrier: device.carrier ?? 'Unlocked'
    });
    fetchAvailableProducts(device);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setDevice((prev: any) => ({ ...prev, image_url: base64 }));
        try {
          await fetch(`/api/devices/${deviceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...device, image_url: base64 })
          });
        } catch (err) {
          console.error('Failed to save device image:', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove this device from inventory?')) return;
    try {
      const res = await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' });
      if (res.ok) {
        invalidateCache('devices_');
        invalidateCache('products_');
        onBack();
      }
    } catch (err) {
      console.error('Error deleting device:', err);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest animate-pulse">*** LOADING DEVICE DETAILS... PLEASE WAIT ***</div>;
  if (!device) return <div className="p-8 text-center text-red-500 font-mono text-xs uppercase font-bold">*** DEVICE NOT FOUND ***</div>;

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-sm px-2 pb-2 pt-0 select-none w-full overflow-auto" style={{ fontSize: '15px' }}>
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b border-neutral-300 dark:border-neutral-800 shrink-0 flex justify-between items-center px-4 py-3 mb-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-medium text-black dark:text-white">Device Details</h2>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 font-mono">
            {device.imei}
          </span>
        </div>
        <button 
          onClick={onBack}
          className="bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <span>Back to Inventory</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded-none overflow-hidden flex flex-col flex-1">
        {/* Tabs Header */}
        <div className="flex bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 shrink-0">
          <button 
            onClick={() => setActiveTab('info')}
            className={`px-4 py-1 text-xs uppercase font-mono font-bold transition-all border-r border-neutral-300 dark:border-neutral-800 cursor-pointer ${activeTab === 'info' ? 'bg-white dark:bg-black text-black dark:text-white' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}
          >
            Device Information
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-1 text-xs uppercase font-mono font-bold transition-all border-r border-neutral-300 dark:border-neutral-800 cursor-pointer ${activeTab === 'activity' ? 'bg-white dark:bg-black text-black dark:text-white' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}
          >
            Activity Log
          </button>
        </div>

        {/* Card Body */}
        <div className="p-4 flex-1 overflow-auto">
          {activeTab === 'info' ? (
            <div className="flex flex-col md:flex-row gap-5 items-start">
              {/* Left Column: Device Photo / SVG Icon with Change Button */}
              <div className="w-52 shrink-0 flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg self-stretch min-h-[240px]">
                {device.image_url ? (
                  <img 
                    src={device.image_url} 
                    alt={device.product_name} 
                    className="w-36 h-44 object-contain rounded mb-2"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 py-4">
                    <Smartphone size={72} strokeWidth={1.2} className="text-neutral-600 dark:text-neutral-400" />
                    <span className="text-xs mt-2 text-neutral-500 dark:text-neutral-400 font-sans">Device Photo</span>
                  </div>
                )}

                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 py-1.5 px-3 rounded-md shadow-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Camera size={13} />
                  <span>{device.image_url ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
              </div>

              {/* Right Column: Clean Borderless Specification Table & Action Buttons */}
              <div className="flex-1 w-full flex flex-col gap-2">
                <div className="bg-white dark:bg-black rounded-lg overflow-hidden">
                  <table className="w-full text-[15px] font-mono border-collapse">
                    <tbody>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          IMEI / Serial
                        </td>
                        <td className="py-0.5 px-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {device.imei}
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          Model Name
                        </td>
                        <td className="py-0.5 px-2 font-bold text-black dark:text-white">
                          {device.product_name}
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          Specs (RAM / Storage)
                        </td>
                        <td className="py-0.5 px-2 text-neutral-900 dark:text-neutral-100">
                          {device.ram || '-'} RAM / {device.gb || '-'} Storage
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          Condition
                        </td>
                        <td className="py-0.5 px-2 text-neutral-900 dark:text-neutral-100">
                          {device.condition || 'New'}
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          Color
                        </td>
                        <td className="py-0.5 px-2 text-neutral-900 dark:text-neutral-100">
                          {device.color || '-'}
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          Network / Unlocked
                        </td>
                        <td className="py-0.5 px-2 text-neutral-900 dark:text-neutral-100">
                          {device.unlocked || '-'} ({device.carrier || 'Unlocked'})
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          Purchase Order #
                        </td>
                        <td className="py-0.5 px-2 font-mono text-neutral-900 dark:text-neutral-100">
                          {device.po_number || 'Internal'}
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          Cost Price
                        </td>
                        <td className="py-0.5 px-2 font-mono text-neutral-900 dark:text-neutral-100">
                          €{Number(device.cost_price || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          Selling Price
                        </td>
                        <td className="py-0.5 px-2 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                          €{Number(device.selling_price || device.price || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          Branch
                        </td>
                        <td className="py-0.5 px-2 text-neutral-900 dark:text-neutral-100">
                          {device.branch_name || 'Main Branch'}
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          Added By (Owner)
                        </td>
                        <td className="py-0.5 px-2 text-neutral-900 dark:text-neutral-100">
                          {device.user_name || 'System'}
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors">
                        <td className="w-1/3 py-0.5 px-2 font-semibold text-neutral-500 dark:text-neutral-400">
                          Date Added
                        </td>
                        <td className="py-0.5 px-2 font-mono text-neutral-600 dark:text-neutral-400">
                          {new Date(device.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(device.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Modern Action Buttons Under Details */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1.5 border-t border-neutral-100 dark:border-neutral-900">
                  <button 
                    onClick={handleEditClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-1.5 px-4 rounded-md shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer font-sans active:scale-[0.98]"
                  >
                    <Edit2 size={15} />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={handlePrintLabel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm py-1.5 px-4 rounded-md shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer font-sans active:scale-[0.98]"
                  >
                    <Printer size={15} />
                    <span>Barcode Label Print</span>
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-medium text-sm py-1.5 px-4 rounded-md shadow-xs transition-all flex items-center gap-2 cursor-pointer font-sans active:scale-[0.98]"
                  >
                    <Trash2 size={15} />
                    <span>Remove from Inventory</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-2 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 flex justify-between items-center shrink-0">
                <h3 className="text-sm font-semibold text-black dark:text-white">History Log</h3>
                <div className="flex gap-2 items-center">
                  <select className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-2 py-0.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none cursor-pointer">
                    <option>All Activities</option>
                  </select>
                  <button 
                    onClick={() => setShowNoteModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-0.5 px-3 text-xs rounded-md shadow-xs transition-all cursor-pointer font-sans active:scale-[0.98]"
                  >
                    + Add Note
                  </button>
                </div>
              </div>

              <div className="border border-neutral-300 dark:border-neutral-800 overflow-hidden">
                <table className="w-full text-left text-[15px] font-mono border-collapse">
                  <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
                      <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-28 text-center">Date</th>
                      <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-24 text-center">Time</th>
                      <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-36 text-center">User</th>
                      <th className="py-1.5 px-2 border-r border-neutral-300 dark:border-neutral-700 w-44 text-center">Activity</th>
                      <th className="py-1.5 px-2 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-900">
                    {activities.length > 0 ? (
                      activities.map((act) => (
                        <tr key={act.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-neutral-900 dark:text-neutral-100 text-[15px]">
                          <td className="py-0.5 px-1.5 border-r border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">{new Date(act.created_at).toLocaleDateString('en-GB')}</td>
                          <td className="py-0.5 px-1.5 border-r border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">{new Date(act.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-0.5 px-1.5 border-r border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">{act.user_name || 'System'}</td>
                          <td className="py-0.5 px-1.5 border-r border-neutral-300 dark:border-neutral-800 font-semibold">{act.activity || (act as any).activity_type || 'Activity'}</td>
                          <td className="py-0.5 px-1.5">{act.details}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-neutral-500 italic text-sm">No activities recorded yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[150] p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden font-sans">
            <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Add Device Note</h3>
              <button 
                onClick={() => setShowNoteModal(false)} 
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <textarea 
                autoFocus
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter device activity details or notes here..."
                className="w-full h-32 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-neutral-400 resize-none font-mono bg-white dark:bg-neutral-950 transition-all"
              />
            </div>
            <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2.5">
              <button 
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-1.5 rounded-lg font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm cursor-pointer shadow-xs transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-4 py-1.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 text-sm disabled:opacity-40 cursor-pointer shadow-xs hover:shadow transition-all active:scale-[0.98]"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[150] p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden font-sans">
            <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Edit Device Details</h3>
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">({device.imei})</span>
              </div>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {updateError && (
              <div className="mx-5 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{updateError}</span>
              </div>
            )}
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2 relative" ref={productDropdownRef}>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                    Product / Device Model Name <span className="text-blue-600 dark:text-blue-400 font-normal">(Reassign IMEI to another model)</span>
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    {availableProducts.length} models (A–Z)
                  </span>
                </div>

                {/* Dropdown Trigger Button */}
                <div 
                  onClick={() => {
                    const nextState = !isProductDropdownOpen;
                    setIsProductDropdownOpen(nextState);
                    if (nextState) {
                      setTimeout(() => searchInputRef.current?.focus(), 60);
                    }
                  }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm flex items-center justify-between cursor-pointer transition-all bg-white dark:bg-neutral-950 ${
                    isProductDropdownOpen 
                      ? 'border-blue-500 ring-2 ring-blue-500/20' 
                      : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {(() => {
                      const selected = availableProducts.find(p => p.id === editForm.sku_id) || (device?.sku_id === editForm.sku_id ? {
                        id: device.sku_id,
                        product_name: device.product_name,
                        sku_code: device.sku_code
                      } : null);

                      if (!selected) {
                        return <span className="text-neutral-400 font-normal">Select a device model...</span>;
                      }

                      return (
                        <>
                          <span className="font-semibold text-neutral-900 dark:text-white truncate">
                            {selected.product_name || selected.name}
                          </span>
                          {selected.sku_code && (
                            <span className="text-xs font-mono text-neutral-400 shrink-0">
                              ({selected.sku_code})
                            </span>
                          )}
                          {selected.id === device?.sku_id && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
                              Current
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown size={16} className={`text-neutral-400 transition-transform shrink-0 ml-2 ${isProductDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                </div>

                {/* Searchable Dropdown Menu */}
                {isProductDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-2xl overflow-hidden flex flex-col">
                    {/* Search Input Bar */}
                    <div className="p-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 sticky top-0 z-10 flex items-center gap-2">
                      <Search size={15} className="text-neutral-400 shrink-0 ml-1" />
                      <input 
                        ref={searchInputRef}
                        type="text"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Search model, brand or SKU..."
                        className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none h-7"
                        onClick={e => e.stopPropagation()}
                      />
                      {productSearch && (
                        <button 
                          type="button"
                          onClick={e => { e.stopPropagation(); setProductSearch(''); searchInputRef.current?.focus(); }}
                          className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Results List */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
                      {(() => {
                        const term = productSearch.toLowerCase().trim();
                        const filtered = availableProducts.filter(p => {
                          if (!term) return true;
                          const name = (p.product_name || p.name || '').toLowerCase();
                          const sku = (p.sku_code || '').toLowerCase();
                          const mfr = (p.manufacturer_name || '').toLowerCase();
                          return name.includes(term) || sku.includes(term) || mfr.includes(term);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="p-4 text-center text-sm text-neutral-400">
                              No models found matching "{productSearch}"
                            </div>
                          );
                        }

                        return filtered.map(p => {
                          const isSelected = p.id === editForm.sku_id;
                          const isCurrent = p.id === device?.sku_id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setEditForm({ ...editForm, sku_id: p.id });
                                setIsProductDropdownOpen(false);
                                setProductSearch('');
                              }}
                              className={`px-3 py-2 text-sm flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold' 
                                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="truncate">{p.product_name || p.name}</span>
                                {p.sku_code && (
                                  <span className="text-xs font-mono text-neutral-400 shrink-0">
                                    ({p.sku_code})
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0">
                                    Current
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <Check size={16} className="text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Footer counter */}
                    <div className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-400 flex justify-between items-center">
                      <span>Alphabetically sorted (A–Z)</span>
                      <span>{availableProducts.length} models</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">Color</label>
                <input 
                  type="text" 
                  value={editForm.color} 
                  onChange={e => setEditForm({...editForm, color: e.target.value})}
                  className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="e.g. Space Gray, Silver"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">Storage (GB)</label>
                <input 
                  type="text" 
                  value={editForm.gb} 
                  onChange={e => setEditForm({...editForm, gb: e.target.value})}
                  className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  placeholder="e.g. 128GB, 256GB"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">RAM</label>
                <input 
                  type="text" 
                  value={editForm.ram} 
                  onChange={e => setEditForm({...editForm, ram: e.target.value})}
                  className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  placeholder="e.g. 6GB, 8GB"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">Condition</label>
                <select 
                  value={editForm.condition} 
                  onChange={e => setEditForm({...editForm, condition: e.target.value})}
                  className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer h-9.5"
                >
                  <option value="New">New</option>
                  <option value="Grade A">Grade A</option>
                  <option value="Grade B">Grade B</option>
                  <option value="Grade C">Grade C</option>
                  <option value="Used">Used</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">Cost Price (€)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={editForm.cost_price} 
                  onChange={e => setEditForm({...editForm, cost_price: e.target.value})}
                  className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">Selling Price (€)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={editForm.selling_price} 
                  onChange={e => setEditForm({...editForm, selling_price: e.target.value})}
                  className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-blue-600 dark:text-blue-400"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">Network / Unlocked</label>
                <input 
                  type="text" 
                  value={editForm.unlocked} 
                  onChange={e => setEditForm({...editForm, unlocked: e.target.value})}
                  className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="e.g. Unlocked, Vodafone"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">IMEI Status</label>
                <input 
                  type="text" 
                  value={editForm.imei_status} 
                  onChange={e => setEditForm({...editForm, imei_status: e.target.value})}
                  className="w-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="e.g. Clean, Blacklisted"
                />
              </div>
            </div>
            
            <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2.5 font-sans">
              <button 
                type="button"
                onClick={() => setShowEditModal(false)}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm cursor-pointer shadow-xs transition-all active:scale-[0.98] disabled:opacity-40"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleUpdateDevice}
                disabled={isUpdating}
                className="px-5 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 text-sm cursor-pointer shadow-xs hover:shadow transition-all active:scale-[0.98] disabled:opacity-40 flex items-center gap-2"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
