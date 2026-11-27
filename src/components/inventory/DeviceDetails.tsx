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
  Check,
  Copy
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
  const [activityFilter, setActivityFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [copiedImei, setCopiedImei] = useState(false);
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

  const activityTypeOptions = Array.from(
    new Set(activities.map(a => a.activity || a.activity_type || 'Activity').filter(Boolean))
  ).sort();

  const filteredActivities = activities.filter(act => {
    const label = act.activity || act.activity_type || 'Activity';
    if (activityFilter !== 'all' && label !== activityFilter) return false;
    if (activitySearch.trim()) {
      const q = activitySearch.trim().toLowerCase();
      const hay = `${label} ${act.details || ''} ${act.user_name || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const handleCopyImei = () => {
    if (!device?.imei) return;
    navigator.clipboard?.writeText(String(device.imei)).then(() => {
      setCopiedImei(true);
      setTimeout(() => setCopiedImei(false), 1500);
    }).catch(() => {});
  };

  const formatStatusLabel = (status: string) => {
    const s = String(status || 'in_stock').toLowerCase();
    if (s === 'in_stock' || s === 'available') return 'In Stock';
    if (s === 'sold') return 'Sold';
    if (s === 'in_transfer') return 'In Transfer';
    return status;
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-sm p-3 md:p-5 select-none w-full overflow-auto font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />

      {/* ─── Top Device Summary Card ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        {/* Left: Compact Photo + Model Title + IMEI + Status */}
        <div className="flex items-start sm:items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-16 h-16 md:w-20 md:h-20 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center justify-center shrink-0 cursor-pointer group overflow-hidden"
            title={device.image_url ? 'Change Photo' : 'Upload Photo'}
          >
            {device.image_url ? (
              <img
                src={device.image_url}
                alt={device.product_name}
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <Smartphone size={32} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.6} />
            )}
            <div className="absolute bottom-1 right-1 p-1 bg-white dark:bg-neutral-900 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors">
              <Camera size={11} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white leading-tight">
              {device.product_name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleCopyImei}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-mono hover:border-neutral-400 transition-colors cursor-pointer"
                title="Copy IMEI / Serial"
              >
                <span>{device.imei}</span>
                {copiedImei ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-neutral-400" />}
              </button>

              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {formatStatusLabel(device.status)}
              </span>

              {device.branch_name && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700">•</span>
                  <span className="text-neutral-600 dark:text-neutral-400">{device.branch_name}</span>
                </>
              )}
            </div>

            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              PO: <span className="font-mono text-neutral-700 dark:text-neutral-300">{device.po_number || 'Internal'}</span>
              {device.sku_code && (
                <>
                  <span className="mx-2 text-neutral-300 dark:text-neutral-700">•</span>
                  SKU: <span className="font-mono text-neutral-700 dark:text-neutral-300">{device.sku_code}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Selling Price & Action Buttons */}
        <div className="flex flex-col items-start md:items-end justify-between self-stretch md:self-auto gap-3">
          <div className="text-left md:text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] dark:text-blue-400">
              SELLING PRICE
            </div>
            <div className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white leading-none mt-1 tabular-nums">
              €{Number(device.selling_price || device.price || 0).toFixed(2)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-auto md:mt-1">
            <button
              onClick={handleEditClick}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-3.5 rounded text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Edit2 size={14} />
              <span>Edit</span>
            </button>
            <button
              onClick={handlePrintLabel}
              className="bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-600 font-medium py-1.5 px-3.5 rounded text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Printer size={14} />
              <span>Print Label</span>
            </button>
            <button
              onClick={onBack}
              className="bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-600 font-medium py-1.5 px-3.5 rounded text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
            >
              <ChevronLeft size={14} />
              <span>Inventory</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-neutral-300 dark:border-neutral-800 shrink-0">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-md border-t border-x transition-colors cursor-pointer ${
            activeTab === 'info'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-neutral-300 dark:border-neutral-800 -mb-px'
              : 'bg-neutral-200/60 dark:bg-neutral-900/40 text-neutral-600 dark:text-neutral-400 border-transparent hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          Device Information
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-md border-t border-x transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-neutral-300 dark:border-neutral-800 -mb-px'
              : 'bg-neutral-200/60 dark:bg-neutral-900/40 text-neutral-600 dark:text-neutral-400 border-transparent hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          Activity Log ({activities.length})
        </button>
      </div>

      {/* ─── Main Tab Content Area ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border-x border-b border-neutral-300 dark:border-neutral-800 rounded-b-md p-6 flex-1 overflow-auto">
        {activeTab === 'info' ? (
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Hardware & Identity */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 pb-2 mb-3 border-b border-neutral-200 dark:border-neutral-800">
                  Hardware &amp; Identity
                </h3>
                <dl className="divide-y divide-neutral-100 dark:divide-neutral-800/70 text-[15px]">
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">IMEI / Serial</dt>
                    <dd className="font-mono font-semibold text-neutral-900 dark:text-white">{device.imei}</dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Storage / RAM</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                      {device.gb || '-'} {device.ram ? `/ ${device.ram}` : ''}
                    </dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Condition</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">{device.condition || 'New'}</dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Color</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">{device.color || '-'}</dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Network / Carrier</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                      {device.carrier || device.unlocked || 'Unlocked'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Right Column: Pricing & Inventory */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 pb-2 mb-3 border-b border-neutral-200 dark:border-neutral-800">
                  Pricing &amp; Inventory
                </h3>
                <dl className="divide-y divide-neutral-100 dark:divide-neutral-800/70 text-[15px]">
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Cost Price</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                      €{Number(device.cost_price || 0).toFixed(2)}
                    </dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Selling Price</dt>
                    <dd className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      €{Number(device.selling_price || device.price || 0).toFixed(2)}
                    </dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Branch</dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">{device.branch_name || 'Main Branch'}</dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Purchase Order</dt>
                    <dd className="font-mono font-medium text-neutral-900 dark:text-neutral-100">{device.po_number || 'Internal'}</dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Added By / Date</dt>
                    <dd className="font-medium text-neutral-700 dark:text-neutral-300 tabular-nums text-right">
                      {device.user_name || 'System'} • {new Date(device.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Danger / Remove Action */}
            <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Need to remove this unit from active stock?
              </span>
              <button
                onClick={handleDelete}
                className="bg-white dark:bg-neutral-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-medium py-1.5 px-4 rounded text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
              >
                <Trash2 size={14} />
                <span>Remove from Inventory</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col font-sans border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            {/* Activity Log Header */}
            <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap justify-between items-center gap-3 shrink-0">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Activity Log</h3>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    placeholder="Search logs..."
                    className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 pl-8 pr-3 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500 w-44 sm:w-52"
                  />
                </div>
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer"
                >
                  <option value="all">All Activities</option>
                  {activityTypeOptions.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNoteModal(true)}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-3.5 text-sm transition-colors cursor-pointer active:scale-[0.98]"
                >
                  + Add Note
                </button>
              </div>
            </div>

            {/* Activity Log Table */}
            <div className="overflow-auto max-h-[460px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-50/80 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-24">Date</th>
                    <th className="py-2.5 px-3 w-24">Time</th>
                    <th className="py-2.5 px-3 w-36">User</th>
                    <th className="py-2.5 px-3 w-44">Activity</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-400 text-sm">
                        No activities recorded for this device
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((act, idx) => (
                      <tr
                        key={`${(act as any).source || 'act'}_${act.id}_${idx}`}
                        className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap tabular-nums">
                          {new Date(act.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap tabular-nums">
                          {new Date(act.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                          {act.user_name && act.user_name.toLowerCase() !== 'null' ? act.user_name : 'System'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                          {act.activity || (act as any).activity_type || 'Activity'}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          {act.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Activity Log Footer */}
            <div className="px-4 py-2 bg-neutral-50/50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
              <span>
                {filteredActivities.length > 0 ? `1-${filteredActivities.length} of ${filteredActivities.length}` : '0 of 0'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[150] p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl w-full max-w-lg overflow-hidden font-sans">
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
                className="px-4 py-1.5 rounded-lg font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm cursor-pointer transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-4 py-1.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 text-sm disabled:opacity-40 cursor-pointer transition-all active:scale-[0.98]"
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
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl w-full max-w-2xl overflow-hidden font-sans">
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
                  <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg overflow-hidden flex flex-col">
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
                className="px-4 py-2 rounded-lg font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm cursor-pointer transition-all active:scale-[0.98] disabled:opacity-40"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleUpdateDevice}
                disabled={isUpdating}
                className="px-5 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 text-sm cursor-pointer transition-all active:scale-[0.98] disabled:opacity-40 flex items-center gap-2"
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
