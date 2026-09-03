import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Smartphone, AlertTriangle, Check, Printer, CheckCircle2, RotateCcw, CheckSquare, Square, PackageCheck, Layers } from 'lucide-react';
import { Product, Branch, Supplier } from '../types';

interface SerializedItem {
  imei: string;
  color: string;
  gb: string;
  condition: string;
  duplicateError?: string | null;
  isChecking?: boolean;
}

interface SavedDevice {
  id: number;
  imei: string;
  color?: string;
  gb?: string;
  condition?: string;
  selling_price?: number;
  cost_price?: number;
  selected?: boolean;
}

export default function AddInventory({ 
  productId, 
  onBack, 
  onSuccess 
}: { 
  productId: number; 
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [printerSettings, setPrinterSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Success screen state after saving
  const [savedBatch, setSavedBatch] = useState<SavedDevice[] | null>(null);

  // Form State
  const [branchId, setBranchId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [poNumber, setPoNumber] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  
  // Quick Add Supplier State
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({ name: '', phone: '', email: '' });
  const [supplierStatus, setSupplierStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Serialized Items State
  const [items, setItems] = useState<SerializedItem[]>([
    { imei: '', color: '', gb: '128', condition: 'New' }
  ]);

  // Input refs for barcode scanner navigation
  const imeiInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleQuickAddSupplier = async () => {
    if (!newSupplierData.name.trim()) return;
    setSupplierStatus(null);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSupplierData,
          contact_person: newSupplierData.name // Default to name
        })
      });
      if (res.ok) {
        const newSup = await res.json();
        setSuppliers(prev => [...prev, newSup]);
        setSupplierId(newSup.id.toString());
        setNewSupplierData({ name: '', phone: '', email: '' });
        setSupplierStatus({ type: 'success', msg: 'Supplier added successfully!' });
        setTimeout(() => {
          setShowNewSupplierModal(false);
          setSupplierStatus(null);
        }, 1500);
      } else {
        const err = await res.json();
        setSupplierStatus({ type: 'error', msg: err.error || 'Failed to add supplier' });
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
      setSupplierStatus({ type: 'error', msg: 'Connection error' });
    }
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${productId}`).then(res => res.json()),
      fetch('/api/branches').then(res => res.json()),
      fetch('/api/suppliers').then(res => res.json()),
      fetch('/api/printer-settings').then(res => res.ok ? res.json() : null).catch(() => null)
    ]).then(([prodData, branchData, supplierData, printerData]) => {
      setProduct(prodData);
      setBranches(branchData);
      if (branchData.length > 0) {
        setBranchId(branchData[0].id.toString());
      }
      setSuppliers(supplierData);
      if (printerData) setPrinterSettings(printerData);
      setCostPrice(prodData.cost_price?.toString() || '');
      setSellingPrice(prodData.selling_price?.toString() || '');
      setLoading(false);
    });
  }, [productId]);

  // Auto focus first IMEI input when serialized product is loaded
  useEffect(() => {
    if (!loading && product?.product_type === 'serialized') {
      setTimeout(() => {
        imeiInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [loading, product]);

  const checkImeiDuplicate = async (imei: string, index: number, currentItems: SerializedItem[]) => {
    const cleanImei = imei.trim();
    if (!cleanImei) {
      setItems(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], duplicateError: null, isChecking: false };
        }
        return updated;
      });
      return;
    }

    // 1. Check in-batch duplicate
    const isBatchDuplicate = currentItems.some((it, i) => i !== index && it.imei.trim().toLowerCase() === cleanImei.toLowerCase());
    if (isBatchDuplicate) {
      setItems(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            duplicateError: 'Duplicate IMEI in current list',
            isChecking: false
          };
        }
        return updated;
      });
      return;
    }

    // 2. Check Database inventory duplicate
    try {
      setItems(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], isChecking: true };
        }
        return updated;
      });

      const res = await fetch(`/api/devices/check-imei?imei=${encodeURIComponent(cleanImei)}`);
      const data = await res.json();

      setItems(prev => {
        const updated = [...prev];
        if (updated[index]) {
          if (data.exists && data.device) {
            const dev = data.device;
            updated[index] = {
              ...updated[index],
              duplicateError: `Already in inventory: ${dev.product_name || 'Device'} (${dev.status || 'in_stock'}${dev.branch_name ? ' @ ' + dev.branch_name : ''})`,
              isChecking: false
            };
          } else {
            updated[index] = {
              ...updated[index],
              duplicateError: null,
              isChecking: false
            };
          }
        }
        return updated;
      });
    } catch (err) {
      console.error('Error checking IMEI:', err);
      setItems(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], isChecking: false };
        }
        return updated;
      });
    }
  };

  const handleAddItem = (defaultValues?: Partial<SerializedItem>) => {
    const newItem: SerializedItem = {
      imei: defaultValues?.imei || '',
      color: defaultValues?.color || '',
      gb: defaultValues?.gb || '128',
      condition: defaultValues?.condition || 'New',
      duplicateError: null
    };

    setItems(prev => {
      const nextList = [...prev, newItem];
      const nextIndex = nextList.length - 1;
      setTimeout(() => {
        imeiInputRefs.current[nextIndex]?.focus();
      }, 50);
      return nextList;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => {
      const remaining = prev.filter((_, i) => i !== index);
      // Re-validate remaining items for duplicates
      setTimeout(() => {
        remaining.forEach((it, idx) => {
          if (it.imei.trim()) {
            checkImeiDuplicate(it.imei, idx, remaining);
          }
        });
      }, 50);
      return remaining;
    });
  };

  const handleItemChange = (index: number, field: keyof SerializedItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'imei') {
        // Trigger duplicate check
        checkImeiDuplicate(value, index, updated);
      }
      return updated;
    });
  };

  // Barcode scan handler: on Enter key, advance to next row or create a new row immediately
  const handleImeiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      
      const currentItem = items[idx];
      const currentImei = currentItem?.imei?.trim();
      
      if (!currentImei) {
        return;
      }

      // Check if this exact IMEI was already entered in another row (double scan check)
      const isDoubleScan = items.some((it, i) => i !== idx && it.imei.trim().toLowerCase() === currentImei.toLowerCase());
      if (isDoubleScan) {
        setItems(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            updated[idx] = {
              ...updated[idx],
              duplicateError: '⚠️ Double-Scan: This IMEI is already in the list'
            };
          }
          return updated;
        });
        imeiInputRefs.current[idx]?.select();
        return;
      }

      // Validate current IMEI against database
      checkImeiDuplicate(currentImei, idx, items);

      if (idx === items.length - 1) {
        // We are on the last line: auto create next line and copy GB & Condition from current row
        handleAddItem({
          gb: currentItem?.gb || '128',
          condition: currentItem?.condition || 'New',
          color: currentItem?.color || ''
        });
      } else {
        // Focus the existing next line's IMEI field
        imeiInputRefs.current[idx + 1]?.focus();
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!branchId) return alert('Please select a branch');

    let validSerializedItems: typeof items = [];
    if (product?.product_type === 'serialized') {
      // Filter out any blank or empty rows
      validSerializedItems = items.filter(it => it.imei && it.imei.trim().length > 0);
      
      if (validSerializedItems.length === 0) {
        return alert('Please enter at least one device with an IMEI / Serial number.');
      }

      // 1. Strict batch uniqueness check
      const imeiList = validSerializedItems.map(it => it.imei.trim().toLowerCase());
      const dupImei = imeiList.find((imei, i) => imeiList.indexOf(imei) !== i);
      if (dupImei) {
        return alert(`Cannot save: Double-scan detected! Duplicate IMEI "${dupImei}" is entered multiple times in this batch.`);
      }

      // 2. Check duplicate errors
      const duplicateErrors = validSerializedItems.filter(it => it.duplicateError);
      if (duplicateErrors.length > 0) {
        return alert(`Cannot save: ${duplicateErrors.length} item(s) have duplicate/invalid IMEIs. Please resolve errors before saving.`);
      }
    }

    const payload = {
      sku_id: productId,
      branch_id: parseInt(branchId),
      quantity: product?.product_type === 'serialized' ? validSerializedItems.length : parseInt(quantity),
      cost_price: parseFloat(costPrice) || 0,
      selling_price: parseFloat(sellingPrice) || 0,
      supplier_id: supplierId ? parseInt(supplierId) : null,
      po_number: poNumber,
      items: product?.product_type === 'serialized' ? validSerializedItems.map(it => ({
        imei: it.imei.trim(),
        color: it.color,
        gb: it.gb,
        condition: it.condition
      })) : []
    };

    try {
      setIsSaving(true);
      const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (product?.product_type === 'serialized' && data.devices && data.devices.length > 0) {
          setSavedBatch(data.devices.map((d: any) => ({ ...d, selected: true })));
        } else {
          onSuccess();
        }
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to add inventory');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMore = () => {
    setSavedBatch(null);
    setItems([{ imei: '', color: '', gb: '128', condition: 'New' }]);
    setPoNumber('');
    setTimeout(() => {
      imeiInputRefs.current[0]?.focus();
    }, 100);
  };

  const handleBatchPrintLabels = (devicesToPrint: SavedDevice[]) => {
    if (!devicesToPrint || devicesToPrint.length === 0) {
      alert('Please select at least one device to print.');
      return;
    }

    if (!printerSettings) {
      alert('Printer settings not loaded. Please configure label printer in Settings.');
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

    const fallbackPrice = sellingPrice || product?.selling_price;

    const labelsHtml = devicesToPrint.map((dev, idx) => {
      const ramText = '';
      const gbText = dev.gb ? (dev.gb.toLowerCase().includes('gb') ? dev.gb : `${dev.gb}GB`) : '';
      const specsCombined = [ramText, gbText].filter(Boolean).join(' / ') || [dev.color, dev.condition].filter(Boolean).join(' • ') || 'Standard';
      const imeiOrSerial = dev.imei || 'N/A';
      const pVal = dev.selling_price || fallbackPrice;

      return `
        <div class="label-page">
          <div class="label-content">
            <div class="device-name">${product?.manufacturer_name ? `${product.manufacturer_name} ` : ''}${product?.product_name || 'DEVICE'}</div>
            <div class="specs">${specsCombined}</div>
            ${pVal ? `<div class="price">€${Number(pVal).toFixed(2)}</div>` : ''}
            <div class="barcode-wrapper">
              <div class="barcode-container">
                <svg id="barcode-${idx}" class="barcode-svg"></svg>
              </div>
              <div class="imei-serial">
                ${imeiOrSerial.split('').map((char: string) => `<span>${char}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Batch Device Labels (${devicesToPrint.length} Items)</title>
          <style>
            @page {
              size: ${width} ${height};
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
            }
            * {
              -webkit-print-color-adjust: exact;
              box-sizing: border-box;
            }
            .label-page {
              width: ${width};
              height: ${height};
              page-break-after: always;
              break-after: page;
              padding: ${margin_top || 2}px ${margin_right || 2}px ${margin_bottom || 2}px ${margin_left || 2}px;
              font-family: ${font_family || 'Arial'}, Arial, sans-serif;
              font-size: ${baseFontSize};
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              text-align: center;
              overflow: hidden;
              background: #fff;
            }
            .label-page:last-child {
              page-break-after: avoid;
              break-after: avoid;
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
            .barcode-svg {
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
          ${labelsHtml}
          <script>
            const barcodeList = ${JSON.stringify(devicesToPrint.map((d, idx) => ({ id: `barcode-${idx}`, imei: d.imei })))};
            barcodeList.forEach(item => {
              try {
                JsBarcode("#" + item.id, item.imei, {
                  format: "CODE128",
                  width: 1.6,
                  height: 30,
                  displayValue: false,
                  margin: 0
                });
              } catch (e) {
                console.error("Barcode error for", item.imei, e);
              }
            });

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

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 p-8 text-base" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="border border-neutral-300 dark:border-neutral-800 p-6 text-center bg-white dark:bg-black w-64">
        <div className="text-sm font-bold uppercase tracking-widest animate-pulse">Loading...</div>
        <div className="text-[10px] mt-2 text-neutral-500">Retrieving system data</div>
      </div>
    </div>
  );
  
  if (!product) return (
    <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-950 text-red-500 p-8 text-base" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="border border-red-500 p-6 text-center bg-white dark:bg-black">
        <div className="text-sm font-bold uppercase tracking-widest">Product Not Found</div>
        <div className="text-[10px] mt-2 text-red-400">The requested product does not exist</div>
      </div>
    </div>
  );

  if (savedBatch) {
    const selectedDevices = savedBatch.filter(d => d.selected !== false);
    const allSelected = selectedDevices.length === savedBatch.length && savedBatch.length > 0;

    const toggleSelectAll = () => {
      setSavedBatch(prev => prev ? prev.map(d => ({ ...d, selected: !allSelected })) : null);
    };

    const toggleSelectDevice = (index: number) => {
      setSavedBatch(prev => {
        if (!prev) return null;
        const updated = [...prev];
        updated[index] = { ...updated[index], selected: !updated[index].selected };
        return updated;
      });
    };

    return (
      <div className="flex flex-col h-full bg-[#f2f2f2] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-sm px-2 pb-2 pt-0 select-none w-full overflow-auto" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '16px' }}>
        {/* Header bar */}
        <div className="sticky top-0 z-40 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded shrink-0 flex justify-between items-center px-4 py-3 mb-2">
          <div className="flex items-center gap-3">
            <h1 className="font-medium text-black dark:text-white flex items-center gap-2" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '24px' }}>
              <PackageCheck className="text-emerald-600 dark:text-emerald-400" size={26} />
              Inventory Added
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {savedBatch.length} {savedBatch.length === 1 ? 'Unit' : 'Units'} Added
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => handleBatchPrintLabels(selectedDevices)}
              disabled={selectedDevices.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              title="Print barcode labels for all selected devices"
            >
              <Printer size={16} />
              <span>Print {selectedDevices.length === savedBatch.length ? 'All Labels' : `Selected (${selectedDevices.length})`}</span>
            </button>
            <button 
              type="button"
              onClick={handleAddMore}
              className="bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Add More Stock</span>
            </button>
            <button 
              type="button"
              onClick={onSuccess}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <span>View Product Details</span>
              <ArrowLeft className="rotate-180" size={15} />
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded p-4 space-y-4">
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-base">
                  {savedBatch.length} Serialized Units Added to Inventory
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  Product: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{product.manufacturer_name ? `${product.manufacturer_name} ` : ''}{product.product_name}</span> {poNumber ? `• PO Ref: ${poNumber}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={() => handleBatchPrintLabels(savedBatch)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded text-sm flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Printer size={16} />
                <span>Print All {savedBatch.length} Labels</span>
              </button>
            </div>
          </div>

          {/* Table of added serialized devices */}
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded overflow-hidden shadow-xs">
            <div className="p-2.5 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  {allSelected ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                  <span>{allSelected ? 'Deselect All' : 'Select All'} ({selectedDevices.length}/{savedBatch.length})</span>
                </button>
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Ready for barcode label printing
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[15px]">
                <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
                    <th className="py-1 px-1.5 w-10 text-center border-r border-neutral-300 dark:border-neutral-700">
                      <input 
                        type="checkbox" 
                        checked={allSelected} 
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="py-1 px-1.5 w-12 text-center border-r border-neutral-300 dark:border-neutral-700">#</th>
                    <th className="py-1 px-1.5 min-w-[240px] text-center border-r border-neutral-300 dark:border-neutral-700">IMEI / Serial Number</th>
                    <th className="py-1 px-1.5 w-36 text-center border-r border-neutral-300 dark:border-neutral-700">Storage (GB)</th>
                    <th className="py-1 px-1.5 w-36 text-center border-r border-neutral-300 dark:border-neutral-700">Color</th>
                    <th className="py-1 px-1.5 w-32 text-center border-r border-neutral-300 dark:border-neutral-700">Condition</th>
                    <th className="py-1 px-1.5 w-32 text-center border-r border-neutral-300 dark:border-neutral-700">Price</th>
                    <th className="py-1 px-1.5 w-28 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {savedBatch.map((dev, idx) => {
                    const isSelected = dev.selected !== false;
                    const isEvenRow = idx % 2 === 1;
                    return (
                      <tr 
                        key={dev.id || idx}
                        className={`text-[15px] transition-colors ${
                          isSelected
                            ? isEvenRow 
                              ? 'bg-[#f8f9fa] dark:bg-neutral-900/40 hover:bg-neutral-100 dark:hover:bg-neutral-800/60' 
                              : 'bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900'
                            : 'opacity-50 bg-neutral-100 dark:bg-neutral-950'
                        }`}
                      >
                        <td className="py-1 px-1.5 text-center align-middle border-r border-neutral-300 dark:border-neutral-800">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectDevice(idx)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-1 px-1.5 text-center text-neutral-500 text-[15px] font-medium align-middle border-r border-neutral-300 dark:border-neutral-800">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-2.5 align-middle border-r border-neutral-300 dark:border-neutral-800 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                          {dev.imei}
                        </td>
                        <td className="py-1 px-2 text-center align-middle border-r border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {dev.gb ? `${dev.gb.replace(/gb/i, '')}GB` : '-'}
                        </td>
                        <td className="py-1 px-2 text-center align-middle border-r border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {dev.color || '-'}
                        </td>
                        <td className="py-1 px-2 text-center align-middle border-r border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {dev.condition || 'New'}
                        </td>
                        <td className="py-1 px-2 text-center align-middle border-r border-neutral-300 dark:border-neutral-800 font-semibold text-neutral-900 dark:text-neutral-100">
                          €{Number(dev.selling_price || sellingPrice || product.selling_price || 0).toFixed(2)}
                        </td>
                        <td className="py-1 px-2 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleBatchPrintLabels([dev])}
                            className="text-xs font-semibold px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-700 dark:text-neutral-200 hover:text-emerald-600 rounded border border-neutral-300 dark:border-neutral-700 flex items-center justify-center gap-1 mx-auto cursor-pointer transition-colors"
                            title="Print single label for this device"
                          >
                            <Printer size={13} />
                            <span>Print</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f2f2f2] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 text-sm px-2 pb-2 pt-0 select-none w-full overflow-auto" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '16px' }}>
      {/* Reusable Datalist for Storage options */}
      <datalist id="storage-presets">
        <option value="128" />
        <option value="256" />
        <option value="64" />
        <option value="512" />
        <option value="1TB" />
        <option value="128GB" />
        <option value="256GB" />
        <option value="64GB" />
        <option value="512GB" />
      </datalist>

      {/* Header bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded shrink-0 flex justify-between items-center px-4 py-3 mb-2">
        <div className="flex items-center gap-3">
          <h1 className="font-medium text-black dark:text-white" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '24px' }}>Add Inventory</h1>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 uppercase bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
            {product.product_type}
          </span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400 hidden lg:inline">
            {product.manufacturer_name && <span className="font-semibold text-neutral-700 dark:text-neutral-300">{product.manufacturer_name} • </span>}
            {product.product_name} 
            {product.sku_code && <span className="text-xs ml-1 text-neutral-400">({product.sku_code})</span>}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            type="button"
            disabled={isSaving}
            onClick={() => handleSubmit()}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Save size={15} className={isSaving ? 'animate-spin' : ''} />
            <span>{isSaving ? 'Saving...' : 'Save Inventory'}</span>
          </button>
          <button 
            type="button"
            onClick={onBack}
            className="bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-medium py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Specification Style Configuration Table */}
          <div className="bg-white dark:bg-black overflow-hidden rounded border border-neutral-200 dark:border-neutral-800">
            <table className="w-full border-none text-[15px]">
              <tbody>
                {/* Product Info Description */}
                <tr className="bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                  <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                    Product To Increase
                  </td>
                  <td className="py-2 px-3 font-semibold text-black dark:text-white uppercase">
                    {product.manufacturer_name && `${product.manufacturer_name} - `}{product.product_name} {product.sku_code && `(${product.sku_code})`}
                  </td>
                </tr>

                {/* Branch Selection */}
                <tr className="bg-[#f8f9fa] dark:bg-neutral-900/40 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors">
                  <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                    Select Branch *
                  </td>
                  <td className="py-2 px-3">
                    <select 
                      required
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2.5 py-1 text-sm font-normal text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 cursor-pointer h-8"
                    >
                      <option value="">Choose Branch</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </td>
                </tr>

                {/* Supplier */}
                <tr className="bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                  <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                    Supplier
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-3">
                      <select 
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2.5 py-1 text-sm font-normal text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 cursor-pointer h-8"
                      >
                        <option value="">Choose Supplier</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <button 
                        type="button"
                        onClick={() => setShowNewSupplierModal(true)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer whitespace-nowrap"
                      >
                        <Plus size={14} /> Quick Add
                      </button>
                    </div>
                  </td>
                </tr>

                {/* PO Reference */}
                <tr className="bg-[#f8f9fa] dark:bg-neutral-900/40 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors">
                  <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                    PO Reference
                  </td>
                  <td className="py-2 px-3">
                    <input 
                      type="text"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="e.g. PO-12345"
                      className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2.5 py-1 text-sm font-normal text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 h-8"
                    />
                  </td>
                </tr>

                {/* Cost Price */}
                <tr className="bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                  <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                    Cost Price (€)
                  </td>
                  <td className="py-2 px-3">
                    <input 
                      type="number"
                      step="0.01"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full max-w-[160px] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2.5 py-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 h-8"
                    />
                  </td>
                </tr>

                {/* Selling Price */}
                <tr className="bg-[#f8f9fa] dark:bg-neutral-900/40 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors">
                  <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                    Selling Price (€)
                  </td>
                  <td className="py-2 px-3">
                    <input 
                      type="number"
                      step="0.01"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full max-w-[160px] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2.5 py-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 h-8"
                    />
                  </td>
                </tr>

                {/* Non-Serialized Quantity */}
                {product.product_type !== 'serialized' && (
                  <tr className="bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                    <td className="w-1/3 py-2 px-3 text-neutral-500 dark:text-neutral-400 font-medium">
                      Quantity to Add
                    </td>
                    <td className="py-2 px-3">
                      <input 
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full max-w-[160px] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2.5 py-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 h-8"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Serialized Items Table */}
          {product.product_type === 'serialized' && (
            <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded overflow-hidden shadow-xs mt-4">
              <div className="p-2.5 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-black dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Smartphone size={16} className="text-[var(--brand-primary)]" />
                    Serialized Items
                  </h3>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-black px-2.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 font-normal">
                    Scan barcode & press Enter to auto-advance
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleAddItem()}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1 px-3 rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <Plus size={13} />
                  <span>Add Row</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[15px]">
                  <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
                      <th className="py-1 px-1.5 w-12 text-center border-r border-neutral-300 dark:border-neutral-700">#</th>
                      <th className="py-1 px-1.5 min-w-[280px] text-center border-r border-neutral-300 dark:border-neutral-700">IMEI / Serial Number</th>
                      <th className="py-1 px-1.5 w-48 text-center border-r border-neutral-300 dark:border-neutral-700">Storage (GB)</th>
                      <th className="py-1 px-1.5 w-44 text-center border-r border-neutral-300 dark:border-neutral-700">Color</th>
                      <th className="py-1 px-1.5 w-40 text-center border-r border-neutral-300 dark:border-neutral-700">Condition</th>
                      <th className="py-1 px-1.5 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {items.map((item, idx) => {
                      const hasError = !!item.duplicateError;
                      const isEvenRow = idx % 2 === 1;
                      return (
                        <tr 
                          key={idx} 
                          className={`text-[15px] transition-colors ${
                            hasError 
                              ? 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200' 
                              : isEvenRow 
                                ? 'bg-[#f8f9fa] dark:bg-neutral-900/40 hover:bg-neutral-100 dark:hover:bg-neutral-800/60' 
                                : 'bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900'
                          }`}
                        >
                          <td className="py-1 px-1.5 text-center text-neutral-500 text-[15px] font-medium align-top pt-2">
                            {idx + 1}
                          </td>
                          <td className="py-1 px-1.5 align-top">
                            <div className="relative">
                              <input 
                                ref={el => { imeiInputRefs.current[idx] = el; }}
                                type="text"
                                required
                                value={item.imei}
                                onChange={(e) => handleItemChange(idx, 'imei', e.target.value)}
                                onKeyDown={(e) => handleImeiKeyDown(e, idx)}
                                onBlur={() => checkImeiDuplicate(item.imei, idx, items)}
                                placeholder="Scan or type IMEI (Press Enter for next line)..."
                                className={`w-full px-2.5 py-1 text-sm border rounded focus:outline-none transition-colors h-8 ${
                                  hasError 
                                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold focus:ring-1 focus:ring-rose-500' 
                                    : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 focus:border-blue-500'
                                }`}
                              />
                              {item.isChecking && (
                                <span className="absolute right-2 top-1.5 text-xs text-neutral-400 animate-pulse">
                                  checking...
                                </span>
                              )}
                            </div>
                            {item.duplicateError && (
                              <div className="flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1 bg-rose-100/60 dark:bg-rose-950/80 p-1.5 rounded border border-rose-300 dark:border-rose-800">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                                <span>{item.duplicateError}</span>
                              </div>
                            )}
                          </td>

                          {/* Storage with 128, 256 dropdown & manual entry */}
                          <td className="py-1 px-1.5 align-top">
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="text"
                                list="storage-presets"
                                value={item.gb}
                                onChange={(e) => handleItemChange(idx, 'gb', e.target.value)}
                                placeholder="128, 256..."
                                className="w-full px-2.5 py-1 text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 rounded focus:outline-none focus:border-blue-500 font-normal h-8"
                              />
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleItemChange(idx, 'gb', '128')}
                                  className={`px-2 py-0.5 text-xs font-normal border rounded transition-colors cursor-pointer h-8 ${
                                    item.gb === '128' || item.gb === '128GB'
                                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black border-neutral-900 dark:border-neutral-100'
                                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200'
                                  }`}
                                  title="Quick select 128"
                                >
                                  128
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleItemChange(idx, 'gb', '256')}
                                  className={`px-2 py-0.5 text-xs font-normal border rounded transition-colors cursor-pointer h-8 ${
                                    item.gb === '256' || item.gb === '256GB'
                                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black border-neutral-900 dark:border-neutral-100'
                                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200'
                                  }`}
                                  title="Quick select 256"
                                >
                                  256
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Color */}
                          <td className="py-1 px-1.5 align-top">
                            <input 
                              type="text"
                              value={item.color}
                              onChange={(e) => handleItemChange(idx, 'color', e.target.value)}
                              placeholder="e.g. Black, Blue"
                              className="w-full px-2.5 py-1 text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 rounded focus:outline-none focus:border-blue-500 h-8 font-normal"
                            />
                          </td>

                          {/* Condition */}
                          <td className="py-1 px-1.5 align-top">
                            <select 
                              value={item.condition}
                              onChange={(e) => handleItemChange(idx, 'condition', e.target.value)}
                              className="w-full px-2.5 py-1 text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 rounded focus:outline-none focus:border-blue-500 cursor-pointer font-normal h-8"
                            >
                              <option value="New">New</option>
                              <option value="A">Grade A</option>
                              <option value="B">Grade B</option>
                              <option value="C">Grade C</option>
                              <option value="Faulty">Faulty</option>
                            </select>
                          </td>

                          {/* Remove button */}
                          <td className="py-1 px-1.5 text-center align-top pt-2">
                            {items.length > 1 && (
                              <button 
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer bg-transparent border-none p-0"
                                title="Remove row"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-2.5 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-300 dark:border-neutral-800 flex justify-between items-center text-sm">
                <div>
                  {items.some(i => i.duplicateError) ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                      <AlertTriangle size={15} />
                      Duplicate / existing IMEI detected in table
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                      <Check size={15} /> Ready to save
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-medium text-neutral-500 uppercase mr-2 text-xs">Total Items:</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{items.length}</span>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Quick Add Supplier Modal */}
      {showNewSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 w-full max-w-md overflow-hidden flex flex-col rounded shadow-xl">
            <div className="bg-neutral-100 dark:bg-neutral-800 px-5 py-3.5 border-b border-neutral-300 dark:border-neutral-800">
              <h3 className="font-medium text-black dark:text-white text-base">Add New Supplier</h3>
            </div>
            
            <div className="p-5 space-y-4">
              {supplierStatus && (
                <div className={`p-3 border text-sm font-semibold rounded ${
                  supplierStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
                }`}>
                  {supplierStatus.msg}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Supplier Name *</label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 h-8 font-normal"
                  placeholder="e.g. Apple Wholesale"
                  value={newSupplierData.name}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 h-8 font-normal"
                    placeholder="Phone number"
                    value={newSupplierData.phone}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 h-8 font-normal"
                    placeholder="Email address"
                    value={newSupplierData.email}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-neutral-100 dark:bg-neutral-800 px-5 py-3 border-t border-neutral-300 dark:border-neutral-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowNewSupplierModal(false);
                  setNewSupplierData({ name: '', phone: '', email: '' });
                }}
                className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium py-1.5 px-4 rounded text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAddSupplier}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-1.5 px-4 rounded text-sm cursor-pointer transition-colors shadow-xs active:scale-[0.98]"
              >
                Add Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
