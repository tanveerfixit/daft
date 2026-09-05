import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Smartphone, 
  AlertTriangle, 
  Check, 
  Printer, 
  CheckCircle2, 
  RotateCcw, 
  Layers, 
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown,
  Copy,
  FileSpreadsheet,
  PlusCircle,
  X
} from 'lucide-react';
import { Branch, Supplier } from '../types';

interface SerializedProductOption {
  product_id: number;
  sku_id: number;
  product_name: string;
  sku_code: string;
  barcode?: string;
  cost_price: number;
  selling_price: number;
  category_name?: string;
  manufacturer_name?: string;
}

interface BatchDeviceRow {
  tempId: string;
  sku_id: number | null;
  product_name: string;
  sku_code?: string;
  imei: string;
  color: string;
  gb: string;
  condition: string;
  cost_price: string;
  selling_price: string;
  duplicateError?: string | null;
  isChecking?: boolean;
}

interface SavedDevice {
  id: number;
  sku_id: number;
  product_name: string;
  sku_code: string;
  barcode: string;
  imei: string;
  color?: string;
  gb?: string;
  condition?: string;
  selling_price: number;
  cost_price: number;
  selected?: boolean;
}

const STORAGE_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
const CONDITION_OPTIONS = ['New', 'Grade A', 'Grade B', 'Grade C', 'Refurbished', 'Pre-Owned'];
const POPULAR_COLORS = ['Black', 'Space Gray', 'White', 'Silver', 'Gold', 'Blue', 'Natural Titanium', 'Midnight', 'Purple', 'Green'];

export default function BatchDeviceIntake({ 
  onBack, 
  onSuccess 
}: { 
  onBack: () => void; 
  onSuccess?: () => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productOptions, setProductOptions] = useState<SerializedProductOption[]>([]);
  const [defaultProductOptions, setDefaultProductOptions] = useState<SerializedProductOption[]>([]);
  const [printerSettings, setPrinterSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Header State
  const [branchId, setBranchId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [poNumber, setPoNumber] = useState('');

  // Rows State
  const [rows, setRows] = useState<BatchDeviceRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow()
  ]);

  // Quick Add Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', email: '' });
  const [supplierStatus, setSupplierStatus] = useState<string | null>(null);

  // Quick Create Serialized Product Modal
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCost, setNewProdCost] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [createProdLoading, setCreateProdLoading] = useState(false);
  const [targetRowIndexForNewProduct, setTargetRowIndexForNewProduct] = useState<number | null>(null);

  // Bulk Paste IMEIs Modal
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [bulkTargetSkuId, setBulkTargetSkuId] = useState<number | null>(null);
  const [bulkStorage, setBulkStorage] = useState('128GB');
  const [bulkColor, setBulkColor] = useState('Black');
  const [bulkCondition, setBulkCondition] = useState('New');

  // Success & Label Printing State
  const [savedBatch, setSavedBatch] = useState<{ po_number: string; devices: SavedDevice[] } | null>(null);

  // Active product selector dropdown index
  const [activeProductDropdown, setActiveProductDropdown] = useState<number | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [lastSelectedProduct, setLastSelectedProduct] = useState<SerializedProductOption | null>(null);

  // Refs for keyboard navigation & click outside
  const imeiInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dropdownContainerRefs = useRef<(HTMLDivElement | null)[]>([]);

  function createEmptyRow(defaultSku?: SerializedProductOption | null, templateRow?: BatchDeviceRow): BatchDeviceRow {
    return {
      tempId: Math.random().toString(36).substring(2, 9),
      sku_id: defaultSku ? defaultSku.sku_id : (templateRow?.sku_id || null),
      product_name: defaultSku ? defaultSku.product_name : (templateRow?.product_name || ''),
      sku_code: defaultSku ? defaultSku.sku_code : (templateRow?.sku_code || ''),
      imei: '',
      color: templateRow?.color || 'Black',
      gb: templateRow?.gb || '128GB',
      condition: templateRow?.condition || 'New',
      cost_price: templateRow ? templateRow.cost_price : (defaultSku ? String(defaultSku.cost_price || 0) : ''),
      selling_price: templateRow ? templateRow.selling_price : (defaultSku ? String(defaultSku.selling_price || 0) : '')
    };
  }

  const loadSerializedModels = async (searchTerm?: string) => {
    try {
      setSearchingProducts(true);
      const url = searchTerm && searchTerm.trim()
        ? `/api/products/serialized-models?search=${encodeURIComponent(searchTerm.trim())}&all=true`
        : '/api/products/serialized-models';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (!searchTerm || !searchTerm.trim()) {
          setDefaultProductOptions(list);
          setProductOptions(list);
        }
        return list;
      }
    } catch (e) {
      console.error('Failed to load serialized models:', e);
    } finally {
      setSearchingProducts(false);
    }
    return [];
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeProductDropdown !== null) {
        const currentRef = dropdownContainerRefs.current[activeProductDropdown];
        if (currentRef && !currentRef.contains(e.target as Node)) {
          setActiveProductDropdown(null);
          setProductSearchTerm('');
          if (defaultProductOptions.length > 0) {
            setProductOptions(defaultProductOptions);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeProductDropdown, defaultProductOptions]);

  // Live search when typing in product search box
  useEffect(() => {
    if (activeProductDropdown === null) return;
    if (productSearchTerm.trim().length === 0) {
      if (defaultProductOptions.length > 0) {
        setProductOptions(defaultProductOptions);
      }
      return;
    }

    const timer = setTimeout(async () => {
      const searchResults = await loadSerializedModels(productSearchTerm);
      if (searchResults && searchResults.length > 0) {
        setProductOptions(searchResults);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [productSearchTerm, activeProductDropdown, defaultProductOptions]);

  useEffect(() => {
    Promise.all([
      fetch('/api/branches').then(r => r.json()),
      fetch('/api/suppliers').then(r => r.json()),
      loadSerializedModels(),
      fetch('/api/printer-settings').then(r => r.ok ? r.json() : null).catch(() => null)
    ]).then(([branchData, supplierData, _serializedList, printerData]) => {
      setBranches(Array.isArray(branchData) ? branchData : []);
      if (Array.isArray(branchData) && branchData.length > 0) {
        setBranchId(branchData[0].id.toString());
      }
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
      if (printerData) setPrinterSettings(printerData);

      setRows([
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow()
      ]);
      setLoading(false);
    }).catch(err => {
      console.error('Error initializing batch intake:', err);
      setLoading(false);
    });
  }, []);

  // Real-time duplicate checking
  const checkDuplicateImei = async (imei: string, index: number) => {
    const clean = imei.trim();
    if (!clean) {
      setRows(prev => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], duplicateError: null, isChecking: false };
        return next;
      });
      return;
    }

    // 1. In-batch duplicate check
    const inBatchCount = rows.filter((r, i) => i !== index && r.imei.trim().toLowerCase() === clean.toLowerCase()).length;
    if (inBatchCount > 0) {
      setRows(prev => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], duplicateError: 'Duplicate in current batch', isChecking: false };
        return next;
      });
      return;
    }

    // 2. Database check
    try {
      const res = await fetch(`/api/devices/check-imei?imei=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        setRows(prev => {
          const next = [...prev];
          if (next[index]) {
            next[index] = {
              ...next[index],
              duplicateError: data.exists ? `Already in inventory (${data.status || 'in stock'})` : null,
              isChecking: false
            };
          }
          return next;
        });
      }
    } catch {
      // Non-fatal
    }
  };

  const handleRowChange = (index: number, field: keyof BatchDeviceRow, value: any) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

    if (field === 'imei') {
      checkDuplicateImei(value, index);
    }
  };

  // User manually selects a model for a specific row
  const handleSelectProduct = (index: number, product: SerializedProductOption) => {
    setLastSelectedProduct(product);
    setRows(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        sku_id: product.sku_id,
        product_name: product.product_name,
        sku_code: product.sku_code,
        cost_price: String(product.cost_price || 0),
        selling_price: String(product.selling_price || 0)
      };
      return next;
    });
    setActiveProductDropdown(null);
    setProductSearchTerm('');
    if (defaultProductOptions.length > 0) {
      setProductOptions(defaultProductOptions);
    }
    // Auto focus IMEI input of that row
    setTimeout(() => {
      imeiInputRefs.current[index]?.focus();
    }, 50);
  };

  const handleAddRow = (sourceRowIndex?: number) => {
    const template = sourceRowIndex !== undefined ? rows[sourceRowIndex] : (rows[rows.length - 1] || null);
    const activeProd = template?.sku_id 
      ? {
          sku_id: template.sku_id,
          product_name: template.product_name,
          sku_code: template.sku_code || '',
          product_id: 0,
          cost_price: parseFloat(template.cost_price) || 0,
          selling_price: parseFloat(template.selling_price) || 0
        } as SerializedProductOption
      : (lastSelectedProduct || null);

    const newRow = createEmptyRow(activeProd, template || undefined);
    setRows(prev => [...prev, newRow]);
    setTimeout(() => {
      imeiInputRefs.current[rows.length]?.focus();
    }, 50);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      setRows([createEmptyRow(lastSelectedProduct || null)]);
      return;
    }
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  // Continuous Barcode Scanner Workflow:
  // When scanner inputs IMEI and fires Enter, auto-populate next line with the same model & focus next IMEI
  const handleImeiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentRow = rows[index];
      
      // Update last selected product if current row has one
      if (currentRow?.sku_id) {
        setLastSelectedProduct({
          sku_id: currentRow.sku_id,
          product_name: currentRow.product_name,
          sku_code: currentRow.sku_code || '',
          product_id: 0,
          cost_price: parseFloat(currentRow.cost_price) || 0,
          selling_price: parseFloat(currentRow.selling_price) || 0
        });
      }

      if (index === rows.length - 1) {
        // Last row -> auto create new line copying the current row's exact model, specs, and prices
        const newRow: BatchDeviceRow = {
          tempId: Math.random().toString(36).substring(2, 9),
          sku_id: currentRow.sku_id || (lastSelectedProduct ? lastSelectedProduct.sku_id : null),
          product_name: currentRow.product_name || (lastSelectedProduct ? lastSelectedProduct.product_name : ''),
          sku_code: currentRow.sku_code || (lastSelectedProduct ? lastSelectedProduct.sku_code : ''),
          imei: '',
          color: currentRow.color || 'Black',
          gb: currentRow.gb || '128GB',
          condition: currentRow.condition || 'New',
          cost_price: currentRow.cost_price,
          selling_price: currentRow.selling_price
        };
        setRows(prev => [...prev, newRow]);
        setTimeout(() => {
          imeiInputRefs.current[index + 1]?.focus();
        }, 40);
      } else {
        // Next row already exists in table
        setRows(prev => {
          const next = [...prev];
          const nextRow = next[index + 1];
          if (nextRow && (!nextRow.sku_id || !nextRow.imei.trim()) && currentRow.sku_id) {
            // Keep same model selected until manually changed
            next[index + 1] = {
              ...nextRow,
              sku_id: nextRow.sku_id || currentRow.sku_id,
              product_name: nextRow.product_name || currentRow.product_name,
              sku_code: nextRow.sku_code || currentRow.sku_code,
              color: nextRow.color || currentRow.color,
              gb: nextRow.gb || currentRow.gb,
              condition: nextRow.condition || currentRow.condition,
              cost_price: nextRow.cost_price || currentRow.cost_price,
              selling_price: nextRow.selling_price || currentRow.selling_price
            };
          }
          return next;
        });
        setTimeout(() => {
          imeiInputRefs.current[index + 1]?.focus();
        }, 40);
      }
    }
  };

  // Quick fill-down features
  const applyFillDown = (field: 'gb' | 'color' | 'condition', value: string) => {
    setRows(prev => prev.map(r => ({ ...r, [field]: value })));
  };

  // Bulk Paste IMEIs parser
  const handleApplyBulkPaste = () => {
    if (!bulkPasteText.trim() || !bulkTargetSkuId) return;
    const targetProduct = productOptions.find(p => p.sku_id === bulkTargetSkuId);
    if (!targetProduct) return;

    const rawLines = bulkPasteText.split(/[\r\n,;\t]+/).map(s => s.trim()).filter(s => s.length > 0);
    if (rawLines.length === 0) return;

    const newRows: BatchDeviceRow[] = rawLines.map(imei => ({
      tempId: Math.random().toString(36).substring(2, 9),
      sku_id: targetProduct.sku_id,
      product_name: targetProduct.product_name,
      sku_code: targetProduct.sku_code,
      imei: imei,
      color: bulkColor,
      gb: bulkStorage,
      condition: bulkCondition,
      cost_price: String(targetProduct.cost_price || 0),
      selling_price: String(targetProduct.selling_price || 0)
    }));

    // If initial rows are empty, replace them; otherwise append
    const hasExistingData = rows.some(r => r.imei.trim().length > 0);
    if (!hasExistingData) {
      setRows(newRows);
    } else {
      setRows(prev => [...prev.filter(r => r.imei.trim().length > 0), ...newRows]);
    }

    setShowBulkPasteModal(false);
    setBulkPasteText('');
  };

  // Inline Quick Create Serialized Product (Instant 1-Click / Enter)
  const handleInlineQuickCreate = async (name: string, index: number) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setSearchingProducts(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          product_type: 'serialized',
          cost_price: 0,
          selling_price: 0
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to quick-create model');
      }

      const created = await res.json();
      const updatedList = await loadSerializedModels();
      const createdItem = updatedList.find(p => p.product_name.toLowerCase() === cleanName.toLowerCase()) || {
        sku_id: created.sku_id || created.id,
        product_id: created.id,
        product_name: cleanName,
        sku_code: created.sku_code || '',
        cost_price: 0,
        selling_price: 0
      };

      setProductOptions(prev => [createdItem, ...prev.filter(p => p.sku_id !== createdItem.sku_id)]);
      handleSelectProduct(index, createdItem);
    } catch (e: any) {
      console.error('Quick create error:', e);
      setTargetRowIndexForNewProduct(index);
      setNewProdName(cleanName);
      setShowCreateProductModal(true);
      setActiveProductDropdown(null);
    } finally {
      setSearchingProducts(false);
    }
  };

  // Quick Create Serialized Product Modal Submit
  const handleCreateNewProduct = async () => {
    if (!newProdName.trim()) return;
    setCreateProdLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName.trim(),
          product_type: 'serialized',
          cost_price: parseFloat(newProdCost) || 0,
          selling_price: parseFloat(newProdPrice) || 0
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create product');
      }

      const updatedList = await loadSerializedModels();
      const createdItem = updatedList.find(p => p.product_name.toLowerCase() === newProdName.trim().toLowerCase());
      
      if (createdItem && targetRowIndexForNewProduct !== null) {
        handleSelectProduct(targetRowIndexForNewProduct, createdItem);
      }

      setNewProdName('');
      setNewProdCost('');
      setNewProdPrice('');
      setShowCreateProductModal(false);
      setTargetRowIndexForNewProduct(null);
    } catch (e: any) {
      alert(e.message || 'Error creating serialized product');
    } finally {
      setCreateProdLoading(false);
    }
  };

  const handleSaveBatch = async () => {
    const validRows = rows.filter(r => r.sku_id && r.imei.trim().length > 0);
    if (validRows.length === 0) {
      alert('Please enter at least one device with an IMEI/Serial number.');
      return;
    }

    // Check for errors
    const hasErrors = validRows.some(r => !!r.duplicateError);
    if (hasErrors) {
      alert('Please resolve duplicate IMEI errors before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        branch_id: branchId ? parseInt(branchId) : undefined,
        supplier_id: supplierId ? parseInt(supplierId) : null,
        po_number: poNumber.trim() || undefined,
        items: validRows.map(r => ({
          sku_id: r.sku_id!,
          imei: r.imei.trim(),
          cost_price: parseFloat(r.cost_price) || 0,
          selling_price: parseFloat(r.selling_price) || 0,
          color: r.color,
          gb: r.gb,
          condition: r.condition
        }))
      };

      const res = await fetch('/api/inventory/batch-add-devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save batch devices');
      }

      const result = await res.json();
      const devicesWithSelected: SavedDevice[] = (result.devices || []).map((d: any) => ({
        ...d,
        selected: true
      }));

      setSavedBatch({
        po_number: result.po_number,
        devices: devicesWithSelected
      });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error saving batch:', error);
      alert(error.message || 'Failed to save devices');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick add supplier
  const handleQuickAddSupplier = async () => {
    if (!newSupplier.name.trim()) return;
    setSupplierStatus(null);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSupplier, contact_person: newSupplier.name })
      });
      if (res.ok) {
        const created = await res.json();
        setSuppliers(prev => [...prev, created]);
        setSupplierId(created.id.toString());
        setNewSupplier({ name: '', phone: '', email: '' });
        setShowSupplierModal(false);
      } else {
        const err = await res.json();
        setSupplierStatus(err.error || 'Failed to create supplier');
      }
    } catch {
      setSupplierStatus('Network error');
    }
  };

  // Metrics calculations
  const totalCount = rows.filter(r => r.imei.trim().length > 0).length;
  const totalCost = rows.reduce((sum, r) => sum + ((parseFloat(r.cost_price) || 0) * (r.imei.trim() ? 1 : 0)), 0);
  const totalRetail = rows.reduce((sum, r) => sum + ((parseFloat(r.selling_price) || 0) * (r.imei.trim() ? 1 : 0)), 0);
  const estMargin = totalRetail > 0 ? (((totalRetail - totalCost) / totalRetail) * 100).toFixed(1) : '0.0';

  // Direct Label Print Trigger
  const triggerBatchPrint = (devicesToPrint: SavedDevice[]) => {
    const selected = devicesToPrint.filter(d => d.selected !== false);
    if (selected.length === 0) {
      alert('Please select at least one device label to print.');
      return;
    }

    const printWin = window.open('', '_blank', 'width=600,height=600');
    if (!printWin) {
      alert('Please allow popups to print barcode labels.');
      return;
    }

    const labelSize = printerSettings?.label_size || '2.25" (57mm) x 1.25" (32mm) Dymo 11354 / 30334';
    const isSmallDymo = labelSize.includes('11354') || labelSize.includes('30334') || labelSize.includes('57mm');

    const labelsHtml = selected.map((dev, idx) => `
      <div class="label-page">
        <div class="label-header">
          <div class="prod-title">${dev.product_name}</div>
          <div class="prod-specs">${[dev.gb, dev.color, dev.condition].filter(Boolean).join(' • ')}</div>
        </div>
        <div class="barcode-box">
          <svg id="barcode-${idx}"></svg>
        </div>
        <div class="label-footer">
          <span class="imei-num">${dev.imei}</span>
          <span class="price-tag">€${(Number(dev.selling_price) || 0).toFixed(2)}</span>
        </div>
      </div>
    `).join('');

    const scripts = selected.map((dev, idx) => `
      JsBarcode("#barcode-${idx}", "${dev.imei}", {
        format: "CODE128",
        width: 1.3,
        height: 32,
        displayValue: false,
        margin: 0
      });
    `).join('\n');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Batch Device Labels</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page {
              size: ${isSmallDymo ? '57mm 32mm' : 'auto'};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
              background: #fff;
              color: #000;
            }
            .label-page {
              width: ${isSmallDymo ? '57mm' : '70mm'};
              height: ${isSmallDymo ? '32mm' : '40mm'};
              box-sizing: border-box;
              padding: 1.5mm 2.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-after: always;
              overflow: hidden;
            }
            .label-header {
              text-align: center;
              line-height: 1.1;
            }
            .prod-title {
              font-size: 11px;
              font-weight: 800;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .prod-specs {
              font-size: 9px;
              color: #333;
              font-weight: 600;
              margin-top: 1px;
            }
            .barcode-box {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 1px 0;
            }
            .barcode-box svg {
              max-width: 100%;
              height: 28px;
            }
            .label-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              font-weight: 700;
              border-top: 0.5px dashed #aaa;
              padding-top: 1px;
            }
            .imei-num {
              font-family: monospace;
              letter-spacing: 0.5px;
            }
            .price-tag {
              font-size: 11px;
              font-weight: 800;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() {
              ${scripts}
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-base font-semibold text-slate-600 dark:text-slate-300">Loading Serialized Products & Batch Workspace...</p>
        </div>
      </div>
    );
  }

  // Success Screen
  if (savedBatch) {
    return (
      <div className="w-full min-h-screen px-4 sm:px-8 py-6 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Batch Saved Successfully!</h2>
                <p className="text-sm text-slate-500 mt-0.5">PO Number: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{savedBatch.po_number}</span> • <span className="font-semibold text-emerald-600 dark:text-emerald-400">{savedBatch.devices.length} Serialized Units</span> added to inventory</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => triggerBatchPrint(savedBatch.devices)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-sm flex items-center gap-2 shadow cursor-pointer transition-all"
              >
                <Printer size={18} />
                Print All Labels ({savedBatch.devices.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSavedBatch(null);
                  setLastSelectedProduct(null);
                  setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded text-sm cursor-pointer"
              >
                + New Batch
              </button>
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded text-sm cursor-pointer"
              >
                Back to Inventory
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Saved Devices in this Batch:</h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">IMEI / Serial</th>
                    <th className="py-3 px-4">Specs</th>
                    <th className="py-3 px-4 text-right">Cost</th>
                    <th className="py-3 px-4 text-right">Retail</th>
                    <th className="py-3 px-4 text-center">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {savedBatch.devices.map((dev, idx) => (
                    <tr key={dev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono font-semibold">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{dev.product_name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wide">{dev.imei}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">{[dev.gb, dev.color, dev.condition].filter(Boolean).join(' / ')}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">€{(dev.cost_price || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">€{(dev.selling_price || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => triggerBatchPrint([{ ...dev, selected: true }])}
                          className="px-3 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded cursor-pointer transition-colors"
                          title="Print single label"
                        >
                          <Printer size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-4 sm:px-8 py-5 space-y-5 bg-neutral-50 dark:bg-neutral-950">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 border border-slate-200 dark:border-slate-800 rounded shadow-sm">
        <div className="flex items-center gap-3.5">
          <button 
            type="button" 
            onClick={onBack}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Layers size={22} className="text-blue-600" />
              Multi-Product Batch Device Intake
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Scan & add multiple serialized device models in a single spreadsheet batch</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowBulkPasteModal(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FileSpreadsheet size={16} />
            Bulk Paste IMEIs
          </button>
          <button
            type="button"
            onClick={handleSaveBatch}
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving Batch...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Batch ({totalCount})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Batch Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 border border-slate-200 dark:border-slate-800 rounded">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Destination Branch</label>
          <select 
            value={branchId} 
            onChange={e => setBranchId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Supplier (Optional)</label>
            <button 
              type="button" 
              onClick={() => setShowSupplierModal(true)}
              className="text-blue-600 hover:underline text-xs font-bold cursor-pointer"
            >
              + Add Supplier
            </button>
          </div>
          <select 
            value={supplierId} 
            onChange={e => setSupplierId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">-- Direct Intake / No Supplier --</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">PO / Batch Reference</label>
          <input 
            type="text" 
            placeholder="Auto-generated (e.g. PO15)" 
            value={poNumber} 
            onChange={e => setPoNumber(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm font-mono font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 text-center">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Devices</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">{totalCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 text-center">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Cost</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-700 dark:text-slate-300 mt-1">€{totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 text-center">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Retail Value</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-1">€{totalRetail.toFixed(2)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 text-center">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Est. Margin</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{estMargin}%</div>
        </div>
      </div>

      {/* Quick Fill Utility Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-xs uppercase text-slate-500">Quick Fill All:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400">Storage:</span>
            {['64GB', '128GB', '256GB', '512GB'].map(gb => (
              <button 
                key={gb} 
                type="button"
                onClick={() => applyFillDown('gb', gb)}
                className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-semibold cursor-pointer"
              >
                {gb}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs font-medium text-slate-400">Condition:</span>
            {['New', 'Grade A', 'Grade B'].map(cond => (
              <button 
                key={cond} 
                type="button"
                onClick={() => applyFillDown('condition', cond)}
                className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold cursor-pointer"
              >
                {cond}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddRow}
          className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold rounded text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Plus size={16} /> Add Device Line
        </button>
      </div>

      {/* Main Multi-Product Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm overflow-visible">
        <div className="overflow-x-auto min-h-[460px] pb-40">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center text-xs">#</th>
                <th className="py-3 px-3.5 min-w-[260px]">Product / Model (Serialized) *</th>
                <th className="py-3 px-3.5 min-w-[220px]">IMEI / Serial Number *</th>
                <th className="py-3 px-3.5 w-32">Storage</th>
                <th className="py-3 px-3.5 w-32">Color</th>
                <th className="py-3 px-3.5 w-36">Condition</th>
                <th className="py-3 px-3.5 w-28 text-right">Cost (€)</th>
                <th className="py-3 px-3.5 w-28 text-right">Retail (€)</th>
                <th className="py-3 px-2 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row, idx) => {
                const isFilteredDropdownOpen = activeProductDropdown === idx;
                const searchTokens = productSearchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
                const filteredProducts = productOptions.filter(p => {
                  if (searchTokens.length === 0) return true;
                  const fullStr = `${p.product_name} ${p.sku_code} ${p.barcode || ''} ${p.manufacturer_name || ''} ${p.category_name || ''}`.toLowerCase();
                  return searchTokens.every(t => fullStr.includes(t));
                });

                return (
                  <tr key={row.tempId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono font-bold text-xs">{idx + 1}</td>
                    
                    {/* Product Selector Column */}
                    <td className="py-2.5 px-3.5 relative">
                      <div className="relative" ref={el => dropdownContainerRefs.current[idx] = el}>
                        <button
                          type="button"
                          onClick={() => {
                            if (isFilteredDropdownOpen) {
                              setActiveProductDropdown(null);
                              setProductSearchTerm('');
                              if (defaultProductOptions.length > 0) setProductOptions(defaultProductOptions);
                            } else {
                              setActiveProductDropdown(idx);
                              setProductSearchTerm('');
                              if (defaultProductOptions.length > 0) setProductOptions(defaultProductOptions);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded border text-sm font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                            row.sku_id 
                              ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white' 
                              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          <span className="truncate">{row.product_name || 'Select Serialized Model...'}</span>
                          <ChevronDown size={16} className="opacity-60 flex-shrink-0 ml-1.5" />
                        </button>

                        {/* Dropdown overlay */}
                        {isFilteredDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-84 sm:w-96 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xl z-50 p-2.5 space-y-2">
                            <div className="relative">
                              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                              <input 
                                type="text"
                                placeholder="Type model (e.g. iPhone 15, Galaxy A17)..."
                                value={productSearchTerm}
                                onChange={e => setProductSearchTerm(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Escape') {
                                    setActiveProductDropdown(null);
                                    setProductSearchTerm('');
                                    if (defaultProductOptions.length > 0) setProductOptions(defaultProductOptions);
                                  } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (filteredProducts.length > 0) {
                                      handleSelectProduct(idx, filteredProducts[0]);
                                    } else if (productSearchTerm.trim().length > 0) {
                                      handleInlineQuickCreate(productSearchTerm, idx);
                                    }
                                  }
                                }}
                                autoFocus
                                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
                              />
                              {searchingProducts && (
                                <div className="absolute right-2.5 top-2.5 w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              )}
                            </div>
                            
                            <div className="max-h-60 overflow-y-auto space-y-1">
                              {filteredProducts.length === 0 ? (
                                <div className="p-3 text-center space-y-2.5 bg-slate-50 dark:bg-slate-800/50 rounded border border-dashed border-slate-200 dark:border-slate-700">
                                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                                    {searchingProducts ? 'Searching catalog...' : productSearchTerm.trim() ? `No existing model named "${productSearchTerm}"` : 'Type a model name to search'}
                                  </p>
                                  {productSearchTerm.trim().length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleInlineQuickCreate(productSearchTerm, idx)}
                                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow transition-all"
                                    >
                                      <PlusCircle size={15} />
                                      <span>+ Create & Select "{productSearchTerm}"</span>
                                      <kbd className="bg-blue-800 text-[10px] px-1.5 py-0.5 rounded font-mono">↵ Enter</kbd>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                filteredProducts.map(p => (
                                  <button
                                    key={p.sku_id}
                                    type="button"
                                    onClick={() => handleSelectProduct(idx, p)}
                                    className="w-full text-left px-2.5 py-2 hover:bg-blue-50 dark:hover:bg-slate-800 rounded text-xs sm:text-sm flex justify-between items-center cursor-pointer transition-colors group"
                                  >
                                    <div>
                                      <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{p.product_name}</div>
                                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                        {p.sku_code} {p.manufacturer_name ? `• ${p.manufacturer_name}` : ''}
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                      <div className="font-mono text-slate-900 dark:text-white font-bold text-xs">€{Number(p.selling_price).toFixed(2)}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">Cost: €{Number(p.cost_price).toFixed(2)}</div>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>

                            {/* Create New Model Footer */}
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                              {productSearchTerm.trim() && filteredProducts.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleInlineQuickCreate(productSearchTerm, idx)}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  + Create "{productSearchTerm}"
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetRowIndexForNewProduct(idx);
                                  setNewProdName(productSearchTerm);
                                  setShowCreateProductModal(true);
                                  setActiveProductDropdown(null);
                                }}
                                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium ml-auto cursor-pointer"
                              >
                                Advanced Model Setup
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* IMEI / Serial Column */}
                    <td className="py-2.5 px-3.5">
                      <div className="relative">
                        <input 
                          ref={el => imeiInputRefs.current[idx] = el}
                          type="text"
                          placeholder="Scan or type IMEI / Serial..."
                          value={row.imei}
                          onChange={e => handleRowChange(idx, 'imei', e.target.value)}
                          onKeyDown={e => handleImeiKeyDown(e, idx)}
                          className={`w-full px-3 py-2 rounded border text-sm font-mono font-bold tracking-wide outline-none transition-colors ${
                            row.duplicateError 
                              ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-400 focus:ring-2 focus:ring-red-500' 
                              : row.imei.trim().length >= 10 
                              ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500' 
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500'
                          }`}
                        />
                        {row.duplicateError && (
                          <div className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1 flex items-center gap-1">
                            <AlertTriangle size={12} /> {row.duplicateError}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Storage */}
                    <td className="py-2.5 px-3.5">
                      <select 
                        value={row.gb} 
                        onChange={e => handleRowChange(idx, 'gb', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-2 text-sm font-mono font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                      >
                        {STORAGE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>

                    {/* Color */}
                    <td className="py-2.5 px-3.5">
                      <input 
                        type="text"
                        list="popular-colors"
                        value={row.color}
                        onChange={e => handleRowChange(idx, 'color', e.target.value)}
                        placeholder="Color"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none"
                      />
                      <datalist id="popular-colors">
                        {POPULAR_COLORS.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </td>

                    {/* Condition */}
                    <td className="py-2.5 px-3.5">
                      <select 
                        value={row.condition} 
                        onChange={e => handleRowChange(idx, 'condition', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none cursor-pointer font-semibold"
                      >
                        {CONDITION_OPTIONS.map(cond => (
                          <option key={cond} value={cond}>{cond}</option>
                        ))}
                      </select>
                    </td>

                    {/* Cost */}
                    <td className="py-2.5 px-3.5">
                      <input 
                        type="number"
                        step="0.01"
                        value={row.cost_price}
                        onChange={e => handleRowChange(idx, 'cost_price', e.target.value)}
                        placeholder="0.00"
                        className="w-full text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </td>

                    {/* Retail */}
                    <td className="py-2.5 px-3.5">
                      <input 
                        type="number"
                        step="0.01"
                        value={row.selling_price}
                        onChange={e => handleRowChange(idx, 'selling_price', e.target.value)}
                        placeholder="0.00"
                        className="w-full text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white outline-none"
                      />
                    </td>

                    {/* Remove */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded cursor-pointer transition-colors"
                        title="Delete Row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Row Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-sm font-bold rounded flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus size={16} /> Add Another Device Line
          </button>
          <span className="text-xs sm:text-sm text-slate-500 italic">Scanner Flow: Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono font-semibold text-slate-800 dark:text-slate-200">Enter</kbd> inside the IMEI field to jump to the next row automatically</span>
        </div>
      </div>

      {/* Quick Create Serialized Product Modal */}
      {showCreateProductModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone size={18} className="text-blue-600" />
                Create New Serialized Model
              </h3>
              <button onClick={() => setShowCreateProductModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Model / Product Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. iPhone 15 Pro Max, Galaxy S24 Ultra"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Default Cost (€)</label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newProdCost}
                    onChange={e => setNewProdCost(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Default Retail (€)</label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newProdPrice}
                    onChange={e => setNewProdPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateProductModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewProduct}
                disabled={!newProdName.trim() || createProdLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {createProdLoading ? 'Creating...' : 'Create & Select'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Paste Modal */}
      {showBulkPasteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700 shadow-2xl max-w-lg w-full p-5 space-y-4 text-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-blue-600" />
              Bulk Paste IMEI / Serial Numbers
            </h3>
            <p className="text-slate-500 text-xs">Paste multiple IMEIs (one per line or comma-separated) to add them all at once:</p>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Target Phone Model</label>
              <select 
                value={bulkTargetSkuId || ''} 
                onChange={e => setBulkTargetSkuId(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                {productOptions.map(p => (
                  <option key={p.sku_id} value={p.sku_id}>{p.product_name} ({p.sku_code})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Storage</label>
                <select value={bulkStorage} onChange={e => setBulkStorage(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border rounded px-2.5 py-1.5 text-xs font-mono">
                  {STORAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color</label>
                <input type="text" value={bulkColor} onChange={e => setBulkColor(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border rounded px-2.5 py-1.5 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Condition</label>
                <select value={bulkCondition} onChange={e => setBulkCondition(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border rounded px-2.5 py-1.5 text-xs">
                  {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Paste IMEIs / Serials:</label>
              <textarea 
                rows={6}
                value={bulkPasteText}
                onChange={e => setBulkPasteText(e.target.value)}
                placeholder="356789123456789&#10;356789123456790&#10;356789123456791"
                className="w-full font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkPasteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold text-xs sm:text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkPaste}
                disabled={!bulkPasteText.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs sm:text-sm disabled:opacity-50 cursor-pointer"
              >
                Apply to Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700 shadow-2xl max-w-sm w-full p-5 space-y-3.5 text-sm">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Add Supplier</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            {supplierStatus && (
              <div className="p-2.5 bg-red-50 text-red-600 rounded text-xs">{supplierStatus}</div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Supplier Name *</label>
              <input 
                type="text" 
                value={newSupplier.name} 
                onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                placeholder="e.g. Apex Wholesale" 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Phone</label>
              <input 
                type="text" 
                value={newSupplier.phone} 
                onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                placeholder="Optional contact phone" 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold text-xs sm:text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAddSupplier}
                disabled={!newSupplier.name.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs sm:text-sm disabled:opacity-50 cursor-pointer"
              >
                Save Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
