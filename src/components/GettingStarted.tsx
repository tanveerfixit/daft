import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Building2, Percent, CreditCard, Users, Package, Printer, Save, 
  Plus, X, ArrowUp, Upload, RotateCcw, FileText, Download, FileSpreadsheet, 
  Calendar, CheckCircle2, AlertCircle, RefreshCw, FileJson, ArrowDownToLine, 
  ArrowUpFromLine, Check, ShieldCheck, Database, ScanBarcode, Search, Trash2, 
  Smartphone, ListPlus, CheckCheck, Bell, BellRing, Volume2, Coins, Calculator,
  Sparkles
} from 'lucide-react';
import ThermalReceipt from './ThermalReceipt';
import { StartingCashModal } from './StartingCashModal';

interface SettingsData {
  currency: string;
  timezone: string;
  date_format: string;
  time_format: string;
  language: string;
  startup_cash_popup?: boolean;
  low_stock_popup?: boolean;
  announcements_popup?: boolean;
  sound_notifications?: boolean;
  daily_eod_popup?: boolean;
}

interface CompanyData {
  name: string;
  email: string;
  phone: string;
  subdomain: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

interface PaymentMethod {
  id?: number;
  name: string;
}

interface PrinterSettingsData {
  label_size: string;
  barcode_length: number;
  margin_top: number;
  margin_left: number;
  margin_bottom: number;
  margin_right: number;
  orientation: string;
  font_size: string;
  font_family: string;
}

interface ThermalPrinterSettingsData {
  font_family: string;
  font_size: string;
  show_logo: boolean;
  show_business_name: boolean;
  show_business_address: boolean;
  show_business_phone: boolean;
  show_business_email: boolean;
  show_customer_info: boolean;
  show_invoice_number: boolean;
  show_date: boolean;
  show_items_table: boolean;
  show_totals: boolean;
  show_footer: boolean;
  show_powered_by: boolean;
  eod_show_cash_summary: boolean;
  eod_show_payment_type: boolean;
  eod_show_total_cash: boolean;
  eod_show_total_card_sale: boolean;
  eod_show_total: boolean;
  eod_footer_type: string;
  eod_footer_custom_text: string;
  footer_text: string;
}

interface GettingStartedProps {
  initialTab?: string;
}

const GettingStarted: React.FC<GettingStartedProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'manage-thermal-printer');
  const [showTestCashModal, setShowTestCashModal] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    currency: '€, Euro',
    timezone: 'UTC/GMT +00:00 - Europe/London',
    date_format: 'DD-MM-YY',
    time_format: '12 hour',
    language: 'English',
    startup_cash_popup: false,
    low_stock_popup: true,
    announcements_popup: true,
    sound_notifications: true,
    daily_eod_popup: true,
  });
  const [company, setCompany] = useState<CompanyData>({
    name: '',
    email: '',
    phone: '',
    subdomain: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'Ireland'
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettingsData>({
    label_size: '2.25" (57mm) x 1.25" (32mm) Dymo 11354 / 30334',
    barcode_length: 20,
    margin_top: 2,
    margin_left: 2,
    margin_bottom: 2,
    margin_right: 2,
    orientation: 'Landscape',
    font_size: 'Medium',
    font_family: 'Arial'
  });
  const [thermalSettings, setThermalSettings] = useState<ThermalPrinterSettingsData>({
    font_family: 'Arial',
    font_size: '14px',
    show_logo: true,
    show_business_name: true,
    show_business_address: true,
    show_business_phone: true,
    show_business_email: true,
    show_customer_info: true,
    show_invoice_number: true,
    show_date: true,
    show_items_table: true,
    show_totals: true,
    show_footer: true,
    show_powered_by: true,
    eod_show_cash_summary: true,
    eod_show_payment_type: true,
    eod_show_total_cash: true,
    eod_show_total_card_sale: true,
    eod_show_total: true,
    eod_footer_type: 'branch',
    eod_footer_custom_text: '',
    footer_text: 'Thank you for your business!'
  });
  const [latestInvoice, setLatestInvoice] = useState<any>(null);
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // ─── Products Import & Export State ─────────────────────────────────────────
  const [productSubMode, setProductSubMode] = useState<'serial' | 'general'>('serial');

  // Serial Products
  const [serialCsvText, setSerialCsvText] = useState('');
  const [serialFile, setSerialFile] = useState<File | null>(null);
  const [serialDuplicateMode, setSerialDuplicateMode] = useState<'overwrite' | 'skip'>('overwrite');
  const [isSerialImporting, setIsSerialImporting] = useState(false);
  const [isSerialExporting, setIsSerialExporting] = useState(false);
  const [serialStats, setSerialStats] = useState<{ total_devices: number; in_stock_devices: number }>({ total_devices: 0, in_stock_devices: 0 });
  const [serialImportResult, setSerialImportResult] = useState<{
    success: boolean;
    total: number;
    imported: number;
    updated: number;
    skipped: number;
    errorsCount: number;
    errors?: string[];
  } | null>(null);
  const serialFileInputRef = useRef<HTMLInputElement>(null);

  // Scanned / Searched Serial Devices Export State
  const [serialExportMode, setSerialExportMode] = useState<'all' | 'scanned'>('all');
  const [scannedExportDevices, setScannedExportDevices] = useState<any[]>([]);
  const [scanInputText, setScanInputText] = useState('');
  const [isScanningDevice, setIsScanningDevice] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // General Products
  const [generalCsvText, setGeneralCsvText] = useState('');
  const [generalFile, setGeneralFile] = useState<File | null>(null);
  const [generalDuplicateMode, setGeneralDuplicateMode] = useState<'overwrite' | 'skip'>('overwrite');
  const [isGeneralImporting, setIsGeneralImporting] = useState(false);
  const [isGeneralExporting, setIsGeneralExporting] = useState(false);
  const [generalStats, setGeneralStats] = useState<{ total_products: number; total_skus: number; total_stock: number }>({ total_products: 0, total_skus: 0, total_stock: 0 });
  const [generalImportResult, setGeneralImportResult] = useState<{
    success: boolean;
    total: number;
    imported: number;
    updated: number;
    skipped: number;
    errorsCount: number;
    errors?: string[];
  } | null>(null);
  const generalFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Invoice Export & Import State ──────────────────────────────────────────
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const [exportPreset, setExportPreset] = useState<'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'custom'>('today');
  const [exportStartDate, setExportStartDate] = useState<string>(getTodayISO());
  const [exportEndDate, setExportEndDate] = useState<string>(getTodayISO());
  const [exportStats, setExportStats] = useState<{ total_invoices: number; total_amount: number }>({ total_invoices: 0, total_amount: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRawText, setImportRawText] = useState<string>('');
  const [importDuplicateMode, setImportDuplicateMode] = useState<'skip' | 'overwrite'>('skip');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    total: number;
    imported: number;
    skipped: number;
    errorsCount: number;
    errors?: string[];
  } | null>(null);
  const invoiceFileInputRef = useRef<HTMLInputElement>(null);

  const handleApplyPreset = (preset: 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'custom') => {
    setExportPreset(preset);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setExportStartDate(today);
      setExportEndDate(today);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setExportStartDate(yStr);
      setExportEndDate(yStr);
    } else if (preset === 'last7') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setExportStartDate(d.toISOString().split('T')[0]);
      setExportEndDate(today);
    } else if (preset === 'last30') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      setExportStartDate(d.toISOString().split('T')[0]);
      setExportEndDate(today);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setExportStartDate(firstDay);
      setExportEndDate(today);
    }
  };

  const fetchInvoiceExportStats = async () => {
    setIsLoadingStats(true);
    try {
      const params = new URLSearchParams();
      if (exportStartDate) params.append('startDate', exportStartDate);
      if (exportEndDate) params.append('endDate', exportEndDate);
      const res = await fetch(`/api/invoices/export-count?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExportStats({
          total_invoices: Number(data.total_invoices) || 0,
          total_amount: Number(data.total_amount) || 0
        });
      }
    } catch (err) {
      console.error('Error fetching export stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'manage-invoices') {
      fetchInvoiceExportStats();
    }
  }, [activeTab, exportStartDate, exportEndDate]);

  const handleDownloadInvoiceExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportStartDate) params.append('startDate', exportStartDate);
      if (exportEndDate) params.append('endDate', exportEndDate);
      params.append('format', format);

      const res = await fetch(`/api/invoices/export?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: 'Export failed with status ' + res.status }));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_export_${exportStartDate}_to_${exportEndDate}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download export error:', err);
      alert(`Export Download Failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleInvoiceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportRawText(text);
    };
    reader.readAsText(file);
  };

  const handleImportInvoicesSubmit = async () => {
    const textToProcess = importRawText.trim();
    if (!textToProcess) {
      alert('Please upload an export file (.json or .csv) or paste invoice backup data.');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      let invoicesToImport: any[] = [];

      // Check if JSON
      if (textToProcess.startsWith('{') || textToProcess.startsWith('[')) {
        try {
          const parsed = JSON.parse(textToProcess);
          if (Array.isArray(parsed)) {
            invoicesToImport = parsed;
          } else if (parsed && Array.isArray(parsed.invoices)) {
            invoicesToImport = parsed.invoices;
          } else {
            throw new Error('JSON backup must contain an "invoices" array.');
          }
        } catch (jsonErr: any) {
          throw new Error(`Invalid JSON format: ${jsonErr.message}`);
        }
      } else {
        // Parse CSV format
        const lines = textToProcess.split('\n');
        if (lines.length < 2) throw new Error('CSV file is empty or missing headers.');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          const values = matches ? matches.map(v => v.trim().replace(/^"|"$/g, '')) : lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));

          const getVal = (name: string) => {
            const idx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
            return idx !== -1 ? values[idx] : '';
          };

          const invNum = getVal('Invoice Number');
          if (!invNum) continue;

          invoicesToImport.push({
            invoice_number: invNum,
            created_at: getVal('Date'),
            customer_name: getVal('Customer Name'),
            customer_phone: getVal('Customer Phone'),
            customer_email: getVal('Customer Email'),
            subtotal: parseFloat(getVal('Subtotal')) || 0,
            tax_total: parseFloat(getVal('Tax Total')) || 0,
            discount_total: parseFloat(getVal('Discount Total')) || 0,
            grand_total: parseFloat(getVal('Grand Total')) || 0,
            paid_amount: parseFloat(getVal('Paid Amount')) || 0,
            due_amount: parseFloat(getVal('Due Amount')) || 0,
            status: getVal('Status') || 'paid',
            items: [],
            payments: []
          });
        }
      }

      if (invoicesToImport.length === 0) {
        throw new Error('No valid invoice records could be parsed from the provided data.');
      }

      const response = await fetch('/api/invoices/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoices: invoicesToImport,
          duplicateHandling: importDuplicateMode
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to import invoices');
      }

      setImportResult(resData);
      setImportRawText('');
      setImportFile(null);
      if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = '';
      fetchInvoiceExportStats();
    } catch (err: any) {
      console.error('Invoice import error:', err);
      setImportResult({
        success: false,
        total: 0,
        imported: 0,
        skipped: 0,
        errorsCount: 1,
        errors: [err.message]
      });
    } finally {
      setIsImporting(false);
    }
  };

  // ─── Products Import / Export Functions ─────────────────────────────────────
  const parseCSVRows = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let entry = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') {
          entry += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push(entry.trim());
        entry = '';
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        row.push(entry.trim());
        if (row.some(val => val.length > 0)) {
          rows.push(row);
        }
        row = [];
        entry = '';
      } else {
        entry += c;
      }
    }
    if (entry.length > 0 || row.length > 0) {
      row.push(entry.trim());
      if (row.some(val => val.length > 0)) {
        rows.push(row);
      }
    }
    return rows;
  };

  const fetchProductsStats = async () => {
    try {
      const [resSerial, resGen] = await Promise.all([
        fetch('/api/devices/stats').catch(() => null),
        fetch('/api/products/stats').catch(() => null)
      ]);
      if (resSerial && resSerial.ok) {
        const sData = await resSerial.json();
        setSerialStats({
          total_devices: Number(sData.total_devices) || 0,
          in_stock_devices: Number(sData.in_stock_devices) || 0
        });
      }
      if (resGen && resGen.ok) {
        const gData = await resGen.json();
        setGeneralStats({
          total_products: Number(gData.total_products) || 0,
          total_skus: Number(gData.total_skus) || 0,
          total_stock: Number(gData.total_stock) || 0
        });
      }
    } catch (err) {
      console.error('Error fetching product stats:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'import-products') {
      fetchProductsStats();
    }
  }, [activeTab]);

  // Serial Products Handlers
  const handleDownloadSerialExport = async () => {
    setIsSerialExporting(true);
    try {
      const res = await fetch('/api/devices/export-csv');
      if (!res.ok) throw new Error('Failed to export serial products');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `serial_products_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Serial Export Error: ${err.message}`);
    } finally {
      setIsSerialExporting(false);
    }
  };

  const handleDownloadSerialSample = async () => {
    try {
      const res = await fetch('/api/devices/sample-csv');
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sample_serial_products.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Download Error: ${err.message}`);
    }
  };

  const handleScanOrSearchDevice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryText = scanInputText.trim();
    if (!queryText) return;

    setIsScanningDevice(true);
    setScanFeedback(null);

    try {
      const res = await fetch(`/api/devices/search?q=${encodeURIComponent(queryText)}`);
      if (!res.ok) throw new Error('Failed to search device');
      const list = await res.json();

      if (!list || list.length === 0) {
        setScanFeedback({ type: 'error', message: `No device found matching "${queryText}" in current inventory.` });
        return;
      }

      // Find exact or first match
      const exactMatch = list.find((d: any) => 
        (d.imei && d.imei.toLowerCase() === queryText.toLowerCase()) ||
        (d.imei_serial && d.imei_serial.toLowerCase() === queryText.toLowerCase()) ||
        (d.barcode && d.barcode.toLowerCase() === queryText.toLowerCase()) ||
        (d.sku_code && d.sku_code.toLowerCase() === queryText.toLowerCase())
      ) || list[0];

      // Check if already in scanned list
      const alreadyAdded = scannedExportDevices.some((d: any) => d.id === exactMatch.id || (d.imei && exactMatch.imei && d.imei === exactMatch.imei));
      if (alreadyAdded) {
        setScanFeedback({ type: 'error', message: `Device "${exactMatch.imei || exactMatch.product_name}" is already in the export list.` });
      } else {
        setScannedExportDevices(prev => [exactMatch, ...prev]);
        setScanFeedback({ 
          type: 'success', 
          message: `✓ Added: ${exactMatch.product_name} (${exactMatch.imei || exactMatch.imei_serial || exactMatch.sku_code || 'Device'})` 
        });
        setScanInputText('');
      }
    } catch (err: any) {
      setScanFeedback({ type: 'error', message: err.message || 'Error searching device' });
    } finally {
      setIsScanningDevice(false);
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 50);
    }
  };

  const handleRemoveScannedDevice = (deviceId: number) => {
    setScannedExportDevices(prev => prev.filter(d => d.id !== deviceId));
  };

  const handleClearScannedDevices = () => {
    setScannedExportDevices([]);
    setScanFeedback(null);
  };

  const handleDownloadScannedSerialExport = () => {
    if (scannedExportDevices.length === 0) {
      alert('Please scan or search at least one device to export.');
      return;
    }

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).trim();
      return `"${s.replace(/"/g, '""')}"`;
    };

    let csvContent = `"Serial Number / IMEI","Product Name","Category","Brand / Manufacturer","Storage","Color","Condition","Cost Price","Selling Price","Stock Status","IMEI Status","Carrier / Lock","Created Date"\n`;
    for (const d of scannedExportDevices) {
      const serial = d.imei_serial || d.imei || d.sku_code || '';
      const line = [
        escapeCsv(serial),
        escapeCsv(d.product_name || 'Standard Mobile Device'),
        escapeCsv(d.category_name || 'Mobile Devices'),
        escapeCsv(d.manufacturer_name || ''),
        escapeCsv(d.gb || d.storage || ''),
        escapeCsv(d.color || ''),
        escapeCsv(d.condition || d.physical_condition || 'New'),
        Number(d.cost_price || 0).toFixed(2),
        Number(d.selling_price || 0).toFixed(2),
        escapeCsv(d.status || 'in_stock'),
        escapeCsv(d.imei_status || 'Clean'),
        escapeCsv(d.carrier || 'Unlocked'),
        escapeCsv(d.created_at ? new Date(d.created_at).toISOString().replace('T', ' ').slice(0, 19) : new Date().toISOString().replace('T', ' ').slice(0, 19))
      ].join(',');
      csvContent += line + '\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scanned_serial_products_${scannedExportDevices.length}_devices_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleSerialFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSerialFile(file);
    setSerialImportResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSerialCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImportSerialSubmit = async () => {
    const textToProcess = serialCsvText.trim();
    if (!textToProcess) {
      alert('Please select a CSV file or paste serial product CSV data.');
      return;
    }
    setIsSerialImporting(true);
    setSerialImportResult(null);

    try {
      const rows = parseCSVRows(textToProcess);
      if (rows.length < 2) {
        throw new Error('CSV is empty or missing data rows.');
      }
      const headers = rows[0].map(h => h.toLowerCase().replace(/^"|"$/g, '').trim());

      const getColVal = (row: string[], candidateHeaders: string[]) => {
        for (const cand of candidateHeaders) {
          const idx = headers.findIndex(h => h === cand.toLowerCase());
          if (idx !== -1 && row[idx] !== undefined) return row[idx].replace(/^"|"$/g, '').trim();
        }
        return '';
      };

      const items = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const serialNum = getColVal(r, ['Serial Number / IMEI', 'Serial Number', 'Serial number', 'IMEI', 'Serial', 'IMEI/Serial', 'Serial No', 'serial_number', 'imei', 'serial']);
        if (!serialNum) continue;

        items.push({
          serial_number: serialNum,
          product_name: getColVal(r, ['Product Name', 'Product name', 'Product', 'Name', 'Device Name', 'Description']),
          category_name: getColVal(r, ['Category', 'Category name', 'Category Name', 'category']),
          manufacturer_name: getColVal(r, ['Brand / Manufacturer', 'Brand', 'Manufacturer', 'Manufacturer name', 'Make', 'manufacturer']),
          storage: getColVal(r, ['Storage', 'GB', 'Capacity', 'Memory', 'RAM', 'gb', 'storage']),
          color: getColVal(r, ['Color', 'Colour', 'color', 'colour']),
          physical_condition: getColVal(r, ['Condition', 'Physical Condition', 'Grade', 'physical_condition', 'condition']),
          cost_price: parseFloat(getColVal(r, ['Cost Price', 'Cost price', 'Cost', 'Unit Cost', 'Buy Price', 'cost_price'])) || 0,
          selling_price: parseFloat(getColVal(r, ['Selling Price', 'Selling price', 'Price', 'Retail Price', 'Unit Price', 'selling_price', 'price'])) || 0,
          status: getColVal(r, ['Stock Status', 'Status', 'Device Status', 'status']) || 'in_stock',
          imei_status: getColVal(r, ['IMEI Status', 'Network Status', 'Blacklist Status', 'imei_status']) || 'Clean',
          carrier: getColVal(r, ['Carrier / Lock', 'Carrier', 'Network', 'Lock Status', 'Unlocked', 'carrier', 'unlocked']) || 'Unlocked',
          created_date: getColVal(r, ['Created Date', 'Created on Date', 'Created At', 'Date', 'Date Added', 'created_at', 'date'])
        });
      }

      if (items.length === 0) {
        throw new Error('No valid serial product rows with serial numbers could be parsed.');
      }

      const res = await fetch('/api/devices/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          duplicateHandling: serialDuplicateMode
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to import serial products');

      setSerialImportResult(resData);
      setSerialCsvText('');
      setSerialFile(null);
      if (serialFileInputRef.current) serialFileInputRef.current.value = '';
      fetchProductsStats();
    } catch (err: any) {
      setSerialImportResult({
        success: false,
        total: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        errorsCount: 1,
        errors: [err.message]
      });
    } finally {
      setIsSerialImporting(false);
    }
  };

  // General Products Handlers
  const handleDownloadGeneralExport = async () => {
    setIsGeneralExporting(true);
    try {
      const res = await fetch('/api/products/export-csv');
      if (!res.ok) throw new Error('Failed to export general products');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `general_products_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`General Export Error: ${err.message}`);
    } finally {
      setIsGeneralExporting(false);
    }
  };

  const handleDownloadGeneralSample = async () => {
    try {
      const res = await fetch('/api/products/sample-csv');
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'standard_general_products.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Download Error: ${err.message}`);
    }
  };

  const handleGeneralFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGeneralFile(file);
    setGeneralImportResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setGeneralCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImportGeneralSubmit = async () => {
    const textToProcess = generalCsvText.trim();
    if (!textToProcess) {
      alert('Please select a CSV file or paste general product CSV data.');
      return;
    }
    setIsGeneralImporting(true);
    setGeneralImportResult(null);

    try {
      const rows = parseCSVRows(textToProcess);
      if (rows.length < 2) {
        throw new Error('CSV is empty or missing data rows.');
      }
      const headers = rows[0].map(h => h.toLowerCase().replace(/^"|"$/g, '').trim());

      const getColVal = (row: string[], candidateHeaders: string[]) => {
        for (const cand of candidateHeaders) {
          const idx = headers.findIndex(h => h === cand.toLowerCase());
          if (idx !== -1 && row[idx] !== undefined) return row[idx].replace(/^"|"$/g, '').trim();
        }
        return '';
      };

      const products = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const prodName = getColVal(r, ['Product Name', 'Product name', 'Product', 'Name', 'Description', 'Item Name']);
        if (!prodName) continue;

        products.push({
          product_name: prodName,
          product_type: getColVal(r, ['Product Type', 'Product type', 'Type', 'product_type', 'type']) || 'Standard',
          category_name: getColVal(r, ['Category', 'Category name', 'Category Name', 'category', 'category_name']),
          manufacturer_name: getColVal(r, ['Brand / Manufacturer', 'Brand', 'Manufacturer', 'Manufacturer name', 'Make', 'manufacturer', 'manufacturer_name']),
          sku: getColVal(r, ['SKU', 'SKU / Barcode', 'SKU Code', 'Item Code', 'Code', 'sku', 'sku_code', 'id']),
          barcode: getColVal(r, ['Barcode', 'UPC', 'EAN', 'Barcode Number', 'barcode']),
          cost_price: parseFloat(getColVal(r, ['Cost Price', 'Cost price', 'Cost', 'Buy Price', 'cost_price', 'unit cost'])) || 0,
          selling_price: parseFloat(getColVal(r, ['Selling Price', 'Selling price', 'Price', 'Retail Price', 'Unit Price', 'selling_price', 'price'])) || 0,
          quantity: parseInt(getColVal(r, ['Quantity In Stock', 'Quantity', 'Qty', 'Qty Sold', 'Current Inventory', 'Stock', 'quantity', 'stock'])) || 0,
          min_stock_level: parseInt(getColVal(r, ['Min Stock Level', 'Min Stock', 'Minimum Stock', 'Reorder Level', 'min_stock_level'])) || 0,
          is_taxable: getColVal(r, ['Taxable', 'Is Taxable', 'Tax', 'taxable', 'is_taxable']) || 'Yes'
        });
      }

      if (products.length === 0) {
        throw new Error('No valid product rows with product names could be parsed.');
      }

      const res = await fetch('/api/products/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          duplicateHandling: generalDuplicateMode
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to import general products');

      setGeneralImportResult(resData);
      setGeneralCsvText('');
      setGeneralFile(null);
      if (generalFileInputRef.current) generalFileInputRef.current.value = '';
      fetchProductsStats();
    } catch (err: any) {
      setGeneralImportResult({
        success: false,
        total: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        errorsCount: 1,
        errors: [err.message]
      });
    } finally {
      setIsGeneralImporting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'account-setup' || activeTab === 'popups-notifications') {
      fetch('/api/settings')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data) {
            setSettings(prev => ({
              ...prev,
              ...data,
              startup_cash_popup: data.startup_cash_popup !== undefined ? Boolean(Number(data.startup_cash_popup) === 1) : false,
              low_stock_popup: data.low_stock_popup !== undefined ? Boolean(data.low_stock_popup) : true,
              announcements_popup: data.announcements_popup !== undefined ? Boolean(data.announcements_popup) : true,
              sound_notifications: data.sound_notifications !== undefined ? Boolean(data.sound_notifications) : true,
              daily_eod_popup: data.daily_eod_popup !== undefined ? Boolean(data.daily_eod_popup) : true,
            }));
            if (Number(data.startup_cash_popup) === 1) {
              localStorage.setItem('epos_enable_starting_cash_popup', 'true');
            } else {
              localStorage.removeItem('epos_enable_starting_cash_popup');
            }
          }
        })
        .catch(err => console.error('Error fetching settings:', err));
    } else if (activeTab === 'company-info') {
      fetch('/api/company')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data) setCompany({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            subdomain: data.subdomain || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zip_code: data.zip_code || '',
            country: data.country || 'Ireland'
          });
        })
        .catch(err => console.error('Error fetching company:', err));
    } else if (activeTab === 'payment-options') {
      fetch('/api/payment-methods')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data) setPaymentMethods(data);
        })
        .catch(err => console.error('Error fetching payment methods:', err));
    } else if (activeTab === 'manage-label-printer') {
      fetch('/api/printer-settings')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            setPrinterSettings(prev => ({
              label_size: data.label_size || prev.label_size,
              barcode_length: data.barcode_length !== undefined ? Number(data.barcode_length) : prev.barcode_length,
              margin_top: data.margin_top !== undefined ? Number(data.margin_top) : prev.margin_top,
              margin_left: data.margin_left !== undefined ? Number(data.margin_left) : prev.margin_left,
              margin_bottom: data.margin_bottom !== undefined ? Number(data.margin_bottom) : prev.margin_bottom,
              margin_right: data.margin_right !== undefined ? Number(data.margin_right) : prev.margin_right,
              orientation: data.orientation || prev.orientation,
              font_size: data.font_size || prev.font_size,
              font_family: data.font_family || prev.font_family
            }));
          }
        })
        .catch(err => console.error('Error fetching printer settings:', err));
    } else if (activeTab === 'manage-thermal-printer' || activeTab === 'manage-eod-report') {
      fetch('/api/thermal-printer-settings')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data) {
            setThermalSettings({
              ...data,
              show_logo: !!data.show_logo,
              show_business_name: !!data.show_business_name,
              show_business_address: !!data.show_business_address,
              show_business_phone: !!data.show_business_phone,
              show_business_email: !!data.show_business_email,
              show_customer_info: !!data.show_customer_info,
              show_invoice_number: !!data.show_invoice_number,
              show_date: !!data.show_date,
              show_items_table: !!data.show_items_table,
              show_totals: !!data.show_totals,
              show_footer: !!data.show_footer,
              show_powered_by: !!data.show_powered_by,
              eod_show_cash_summary: data.eod_show_cash_summary !== undefined ? !!data.eod_show_cash_summary : true,
              eod_show_payment_type: data.eod_show_payment_type !== undefined ? !!data.eod_show_payment_type : true,
              eod_show_total_cash: data.eod_show_total_cash !== undefined ? !!data.eod_show_total_cash : true,
              eod_show_total_card_sale: data.eod_show_total_card_sale !== undefined ? !!data.eod_show_total_card_sale : true,
              eod_show_total: data.eod_show_total !== undefined ? !!data.eod_show_total : true,
              eod_footer_type: data.eod_footer_type || 'branch',
              eod_footer_custom_text: data.eod_footer_custom_text || '',
            });
          }
        })
        .catch(err => console.error('Error fetching thermal printer/EOD settings:', err));

      if (activeTab === 'manage-thermal-printer') {
        fetch('/api/company')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              setCompany({
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                subdomain: data.subdomain || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                zip_code: data.zip_code || '',
                country: data.country || 'Ireland'
              });
            }
          })
          .catch(err => console.error('Error fetching company info for thermal preview:', err));

        fetch('/api/invoices')
          .then(res => res.ok ? res.json() : [])
          .then(invoices => {
            if (Array.isArray(invoices) && invoices.length > 0) {
              const firstId = invoices[0].id;
              fetch(`/api/invoices/${firstId}`)
                .then(r => r.ok ? r.json() : null)
                .then(fullInv => {
                  if (fullInv && fullInv.id) {
                    setLatestInvoice(fullInv);
                  }
                })
                .catch(err => console.error('Error fetching full latest invoice:', err));
            }
          })
          .catch(err => console.error('Error fetching invoices list for thermal preview:', err));
      }
    }
  }, [activeTab]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        if (settings.startup_cash_popup === true) {
          localStorage.setItem('epos_enable_starting_cash_popup', 'true');
        } else {
          localStorage.removeItem('epos_enable_starting_cash_popup');
        }
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Company information saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save company information.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePaymentMethods = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methods: paymentMethods.filter(m => m.name.trim() !== '') })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Payment options saved successfully!' });
        // Refresh to get IDs for new methods
        fetch('/api/payment-methods')
          .then(res => res.json())
          .then(data => {
            if (data) setPaymentMethods(data);
          });
      } else {
        setMessage({ type: 'error', text: 'Failed to save payment options.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrinterSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/printer-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(printerSettings)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Printer settings saved successfully!' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: errorData.error || errorData.message || 'Failed to save printer settings.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveThermalPrinterSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      console.log('Saving thermal settings:', thermalSettings);
      const response = await fetch('/api/thermal-printer-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thermalSettings)
      });
      if (response.ok) {
        // Broadcast real-time update to all active components (including CashRegister) and other tabs
        window.dispatchEvent(new CustomEvent('thermal-settings-updated', { detail: thermalSettings }));
        localStorage.setItem('epos_thermal_settings_updated', Date.now().toString());

        setMessage({ type: 'success', text: 'Thermal printer settings saved successfully!' });
        alert('Settings saved successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: `Failed to save: ${errorData.error || 'Check server logs'}` });
        alert(`Error: ${errorData.error || 'Failed to save settings'}`);
      }
    } catch (err) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: 'Network error occurred while saving.' });
      alert('Network error. Is the server running?');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetThermalSettings = () => {
    if (window.confirm('Are you sure you want to reset settings to default?')) {
      const defaultSettings = {
        font_family: 'Arial',
        font_size: '14px',
        show_logo: true,
        show_business_name: true,
        show_business_address: true,
        show_business_phone: true,
        show_business_email: true,
        show_customer_info: true,
        show_invoice_number: true,
        show_date: true,
        show_items_table: true,
        show_totals: true,
        show_footer: true,
        show_powered_by: true,
        eod_show_cash_summary: true,
        eod_show_payment_type: true,
        eod_show_total_cash: true,
        eod_show_total_card_sale: true,
        eod_show_total: true,
        eod_footer_type: 'branch',
        eod_footer_custom_text: '',
        footer_text: 'Thank you for your business!'
      };
      setThermalSettings(defaultSettings);
    }
  };

  const handlePrintThermalReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Use real latest invoice if available, else fallback mock
    const invoiceToPrint = latestInvoice || {
      invoice_number: 'INV-1001',
      created_at: new Date().toISOString(),
      customer_name: 'Walk-in Customer',
      subtotal: 85.00,
      tax_total: 0.00,
      grand_total: 85.00,
      payment_method: 'Cash',
      items: [
        { product_name: 'iPhone 11 Screen Repair', quantity: 1, price: 85.00, total: 85.00 }
      ]
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>Thermal Receipt - ${invoiceToPrint.invoice_number}</title>
          <style>
            body { margin: 0; padding: 0; background: #eee; font-family: ${thermalSettings.font_family ? `${thermalSettings.font_family}, 'Segoe UI', Arial, sans-serif` : "'Segoe UI', Arial, sans-serif"}; font-size: ${thermalSettings.font_size || '14px'}; }
            .receipt { 
              background: white; 
              width: 72mm; 
              margin: 20px auto; 
              padding: 4mm 3mm;
              font-family: inherit;
              font-size: inherit;
              line-height: 1.35;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
              color: #000;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .mt-2 { margin-top: 0.5rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .border-t { border-top: 1px dashed #000; }
            .flex { display: flex; justify-content: space-between; align-items: flex-start; }
            @media print {
              body { background: white; margin: 0; }
              .receipt { margin: 0; box-shadow: none; border: none; width: 72mm; padding: 2mm; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${thermalSettings.show_logo ? '<div class="text-center mb-2"><div style="display:inline-block;width:30px;height:30px;background:#ddd;border-radius:50%;line-height:30px;font-size:8px;">LOGO</div></div>' : ''}
            
            <div class="text-center mb-2">
              ${thermalSettings.show_business_name ? `<div class="font-bold uppercase" style="font-size: 1.2em;">${company.name || 'Your Business Name'}</div>` : ''}
              ${thermalSettings.show_business_address ? `<div style="font-size: 0.92em;">${company.address || '32 O\'Connell Street, Ennis'}</div>` : ''}
              <div style="font-size: 0.92em;">
                ${thermalSettings.show_business_phone ? `<span>Tel: ${company.phone || '065 672 4192'}</span>` : ''}
                ${thermalSettings.show_business_phone && thermalSettings.show_business_email && company.email ? ' · ' : ''}
                ${thermalSettings.show_business_email && company.email ? `<span>${company.email}</span>` : ''}
              </div>
            </div>

            <div class="border-t my-2"></div>

            <div style="font-size: 0.95em;">
              <div class="flex">
                ${thermalSettings.show_invoice_number ? `<div><span class="font-bold">Invoice:</span> ${invoiceToPrint.invoice_number}</div>` : '<div></div>'}
                ${thermalSettings.show_date ? `<div>${new Date(invoiceToPrint.created_at).toLocaleDateString('en-IE')}</div>` : ''}
              </div>
              ${thermalSettings.show_customer_info ? `
                <div class="flex" style="margin-top: 2px;">
                  <div><span class="font-bold">Customer:</span> ${invoiceToPrint.customer?.name || invoiceToPrint.customer_name || 'Walk-in'}</div>
                  ${invoiceToPrint.customer?.phone ? `<div>${invoiceToPrint.customer.phone}</div>` : ''}
                </div>
              ` : ''}
            </div>

            <div class="border-t my-2"></div>

            ${thermalSettings.show_items_table ? `
              <div style="font-size: 0.95em;">
                <div class="flex font-bold" style="padding-bottom: 2px;">
                  <span style="width: 65%;">Description</span>
                  <span style="width: 15%; text-align: center;">Qty</span>
                  <span style="width: 20%; text-align: right;">Total</span>
                </div>
                ${(invoiceToPrint.items || []).map((item: any) => `
                  <div style="margin-bottom: 4px;">
                    <div class="flex">
                      <span style="width: 65%; word-break: break-word; font-weight: normal;">${item.product_name}</span>
                      <span style="width: 15%; text-align: center;">${item.quantity}</span>
                      <span class="font-bold" style="width: 20%; text-align: right;">€${(Number(item.total) || 0).toFixed(2)}</span>
                    </div>
                    <div style="font-size: 0.85em; color: #333;">
                      @ €${(Number(item.price) || 0).toFixed(2)} each
                      ${item.imei ? ` · IMEI: ${item.imei}` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <div class="border-t my-2"></div>

            ${thermalSettings.show_totals ? `
              <div style="font-size: 0.95em;">
                <div class="flex"><div>Subtotal:</div><div>€${(Number(invoiceToPrint.subtotal) || Number(invoiceToPrint.grand_total) || 0).toFixed(2)}</div></div>
                ${Number(invoiceToPrint.tax_total) > 0 ? `<div class="flex"><div>VAT:</div><div>€${Number(invoiceToPrint.tax_total).toFixed(2)}</div></div>` : ''}
                <div class="flex font-bold" style="font-size: 1.1em; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 2px 0; margin: 3px 0;">
                  <div>Total:</div><div>€${(Number(invoiceToPrint.grand_total) || 0).toFixed(2)}</div>
                </div>
                <div class="flex"><div>Paid:</div><div>€${(Number(invoiceToPrint.paid_amount) || Number(invoiceToPrint.grand_total) || 0).toFixed(2)}</div></div>
              </div>
            ` : ''}

            ${thermalSettings.show_footer && thermalSettings.footer_text ? `
              <div class="border-t my-2"></div>
              <div class="text-center" style="font-size: 0.88em; color: #222;">
                ${thermalSettings.footer_text}
              </div>
            ` : ''}

          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintTestLabel = () => {
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
    const currSymbol = (settings.currency || '€').split(',')[0].trim() || '€';
    const baseFontSize = fontSizeMap[font_size] || '12px';

    printWindow.document.write(`
      <html>
        <head>
          <title>Test Label - Barcode Printer</title>
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
            <div class="device-name">Apple iPhone 14 Pro</div>
            <div class="specs">6GB / 128GB</div>
            <div class="price">${currSymbol}499.00</div>
            <div class="barcode-wrapper">
              <div class="barcode-container">
                <svg id="barcode"></svg>
              </div>
              <div class="imei-serial">
                <span>3</span><span>5</span><span>0</span><span>9</span><span>6</span><span>7</span><span>6</span><span>8</span><span>1</span><span>6</span><span>0</span><span>5</span><span>4</span><span>1</span><span>2</span>
              </div>
            </div>
          </div>
          <script>
            try {
              JsBarcode("#barcode", "350967681605412", {
                format: "CODE128",
                width: 1.6,
                height: 30,
                displayValue: false,
                margin: 0
              });
            } catch (e) {
              console.error(e);
            }

            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const addPaymentMethod = () => {
    setPaymentMethods([...paymentMethods, { name: '' }]);
  };

  const removePaymentMethod = (index: number) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
  };

  const updatePaymentMethod = (index: number, name: string) => {
    const newMethods = [...paymentMethods];
    newMethods[index].name = name;
    setPaymentMethods(newMethods);
  };

  const movePaymentMethod = (index: number) => {
    if (index === 0) return;
    const newMethods = [...paymentMethods];
    const temp = newMethods[index];
    newMethods[index] = newMethods[index - 1];
    newMethods[index - 1] = temp;
    setPaymentMethods(newMethods);
  };

  const tabs = [
    { id: 'manage-invoices', label: 'Import / Export Invoices', icon: FileSpreadsheet },
    { id: 'manage-thermal-printer', label: 'Manage Thermal Printer', icon: Printer },
    { id: 'manage-eod-report', label: 'End of Day Report', icon: FileText },
    { id: 'account-setup', label: 'Account Setup', icon: Settings },
    { id: 'company-info', label: 'Company Information', icon: Building2 },
    { id: 'manage-label-printer', label: 'Manage Label Printer', icon: Printer },
    { id: 'popups-notifications', label: 'Popups & Notifications', icon: Bell },
    { id: 'manage-taxes', label: 'Manage Taxes', icon: Percent },
    { id: 'payment-options', label: 'Payment Options', icon: CreditCard },
    { id: 'import-customers', label: 'Import Customers', icon: Users },
    { id: 'import-products', label: 'Import / Export Products', icon: Package },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f2f2f2]">
      <div className="p-4 bg-white border-b border-slate-200">
        <h2 className="text-xl font-medium text-slate-700">Getting Started</h2>
      </div>

      <div className="flex flex-1 overflow-hidden p-6 gap-6">
        {/* Sidebar */}
        <div className="w-64 bg-white border border-slate-200 rounded shadow-sm overflow-hidden flex flex-col">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4 ${
                activeTab === tab.id
                  ? 'bg-slate-100 border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-slate-200 rounded shadow-sm p-8 overflow-auto">
          {activeTab === 'manage-invoices' ? (
            <div className="max-w-5xl space-y-8">
              <div>
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2.5" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>
                  <Database className="text-blue-600" size={24} />
                  Import & Export Invoices
                </h3>
                <p className="text-sm text-slate-500">
                  Export local invoice records and backups for today or any specific date range, and easily upload/restore them back to your business anytime.
                </p>
              </div>

              {/* Grid with 2 columns: Export on left, Import on right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. EXPORT INVOICES CARD */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                          <ArrowDownToLine size={20} />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-800">Export Invoices</h4>
                          <p className="text-xs text-slate-500">Download local offline records & backups</p>
                        </div>
                      </div>
                      <button 
                        onClick={fetchInvoiceExportStats}
                        disabled={isLoadingStats}
                        title="Refresh Count"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                      >
                        <RefreshCw size={16} className={isLoadingStats ? 'animate-spin' : ''} />
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                          Quick Date Presets
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'today', label: 'Today' },
                            { id: 'yesterday', label: 'Yesterday' },
                            { id: 'last7', label: 'Last 7 Days' },
                            { id: 'last30', label: 'Last 30 Days' },
                            { id: 'this_month', label: 'This Month' },
                            { id: 'custom', label: 'Custom Range' },
                          ].map((btn) => (
                            <button
                              key={btn.id}
                              onClick={() => handleApplyPreset(btn.id as any)}
                              className={`py-1.5 px-2 text-xs font-semibold rounded border transition-colors ${
                                exportPreset === btn.id
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Date Inputs */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Start Date
                          </label>
                          <div className="relative">
                            <input 
                              type="date"
                              value={exportStartDate}
                              onChange={(e) => {
                                setExportPreset('custom');
                                setExportStartDate(e.target.value);
                              }}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            End Date
                          </label>
                          <div className="relative">
                            <input 
                              type="date"
                              value={exportEndDate}
                              onChange={(e) => {
                                setExportPreset('custom');
                                setExportEndDate(e.target.value);
                              }}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Live Invoices Summary Badge */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Invoices in Range</span>
                          <span className="text-xl font-bold font-mono text-slate-900">
                            {isLoadingStats ? '...' : exportStats.total_invoices} Invoices
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Total Volume</span>
                          <span className="text-xl font-bold font-mono text-emerald-600">
                            €{isLoadingStats ? '0.00' : exportStats.total_amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Download Action Buttons */}
                  <div className="pt-5 border-t border-slate-100 mt-6 space-y-2.5">
                    <button
                      onClick={() => handleDownloadInvoiceExport('json')}
                      disabled={isExporting || exportStats.total_invoices === 0}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <FileJson size={16} />
                      Download JSON (Full Data Backup)
                    </button>
                    <button
                      onClick={() => handleDownloadInvoiceExport('csv')}
                      disabled={isExporting || exportStats.total_invoices === 0}
                      className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 disabled:opacity-50 text-slate-700 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <FileSpreadsheet size={16} />
                      Download CSV (Spreadsheet)
                    </button>
                  </div>
                </div>

                {/* 2. IMPORT INVOICES CARD */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-5">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
                        <ArrowUpFromLine size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-800">Import & Restore</h4>
                        <p className="text-xs text-slate-500">Upload JSON or CSV invoice backup</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* File Upload Box */}
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                          Select Backup File (.json / .csv)
                        </label>
                        <input 
                          type="file" 
                          ref={invoiceFileInputRef}
                          onChange={handleInvoiceFileUpload}
                          accept=".json,.csv,application/json,text/csv"
                          className="hidden"
                        />
                        <div 
                          onClick={() => invoiceFileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30 rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
                        >
                          <Upload size={24} className="text-slate-400 mb-2" />
                          <p className="text-sm font-semibold text-slate-700">
                            {importFile ? importFile.name : 'Click to browse or drop file here'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Supports exported JSON backup or CSV files'}
                          </p>
                        </div>
                      </div>

                      {/* Duplicate Conflict Handling */}
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                          Duplicate Invoice Numbers
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setImportDuplicateMode('skip')}
                            className={`py-2 px-3 text-xs font-semibold rounded border text-left transition-colors ${
                              importDuplicateMode === 'skip'
                                ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {importDuplicateMode === 'skip' && <Check size={14} className="text-blue-600" />}
                              <span>Skip Existing</span>
                            </div>
                            <p className="text-[11px] font-normal opacity-80">Keep current invoices unchanged</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setImportDuplicateMode('overwrite')}
                            className={`py-2 px-3 text-xs font-semibold rounded border text-left transition-colors ${
                              importDuplicateMode === 'overwrite'
                                ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {importDuplicateMode === 'overwrite' && <Check size={14} className="text-amber-600" />}
                              <span>Overwrite</span>
                            </div>
                            <p className="text-[11px] font-normal opacity-80">Replace duplicate invoice records</p>
                          </button>
                        </div>
                      </div>

                      {/* Or Raw Paste Area */}
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                          Or Paste Raw Content
                        </label>
                        <textarea
                          value={importRawText}
                          onChange={(e) => {
                            setImportRawText(e.target.value);
                            setImportResult(null);
                          }}
                          placeholder='Paste JSON or CSV invoice backup text here...'
                          className="w-full border border-slate-300 rounded px-3 py-2 text-xs font-mono h-20 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Import Button & Result Feedback */}
                  <div className="pt-4 border-t border-slate-100 mt-5 space-y-3">
                    <button
                      onClick={handleImportInvoicesSubmit}
                      disabled={isImporting || !importRawText.trim()}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Save size={16} />
                      {isImporting ? 'Restoring Invoices...' : 'Import & Restore Invoices'}
                    </button>

                    {importResult && (
                      <div className={`p-3.5 rounded-md text-xs border ${
                        importResult.success && importResult.errorsCount === 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold text-sm mb-1">
                          {importResult.success && importResult.errorsCount === 0 ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : (
                            <AlertCircle size={16} className="text-amber-600" />
                          )}
                          <span>Import Summary</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 font-mono text-center">
                          <div className="bg-white/80 p-1.5 rounded border border-slate-200">
                            <span className="text-[10px] uppercase font-sans text-slate-500 block">Total</span>
                            <span className="font-bold text-slate-900">{importResult.total}</span>
                          </div>
                          <div className="bg-white/80 p-1.5 rounded border border-slate-200">
                            <span className="text-[10px] uppercase font-sans text-emerald-600 block">Imported</span>
                            <span className="font-bold text-emerald-700">{importResult.imported}</span>
                          </div>
                          <div className="bg-white/80 p-1.5 rounded border border-slate-200">
                            <span className="text-[10px] uppercase font-sans text-amber-600 block">Skipped</span>
                            <span className="font-bold text-amber-700">{importResult.skipped}</span>
                          </div>
                        </div>
                        {importResult.errors && importResult.errors.length > 0 && (
                          <div className="mt-2 text-red-600 space-y-0.5">
                            {importResult.errors.map((err, i) => (
                              <p key={i}>• {err}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : activeTab === 'account-setup' ? (
            <div className="max-w-4xl">
              <h3 className="font-bold text-slate-800 mb-2" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>Accounts Setup</h3>
              <p className="text-sm text-slate-500 mb-8">
                This is where you'll configure your basic account settings and preferences to get your system up and running. Complete these essential steps to personalize your experience.
              </p>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Currency<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={settings.currency}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 text-sm text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Time Zone<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="UTC/GMT +00:00 - Europe/London">UTC/GMT +00:00 - Europe/London</option>
                      <option value="UTC/GMT +01:00 - Europe/Dublin">UTC/GMT +01:00 - Europe/Dublin</option>
                      <option value="UTC/GMT +01:00 - Europe/Paris">UTC/GMT +01:00 - Europe/Paris</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Date Format<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <select
                      value={settings.date_format}
                      onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="DD-MM-YY">DD-MM-YY</option>
                      <option value="MM-DD-YY">MM-DD-YY</option>
                      <option value="YY-MM-DD">YY-MM-DD</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Time Format<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <select
                      value={settings.time_format}
                      onChange={(e) => setSettings({ ...settings, time_format: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="12 hour">12 hour</option>
                      <option value="24 hour">24 hour</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Language<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <select
                      value={settings.language}
                      onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>

                {message && (
                  <div className={`mt-4 p-3 rounded text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'company-info' ? (
            <div className="max-w-4xl">
              <h3 className="font-bold text-slate-800 mb-2" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>Company Information</h3>
              <p className="text-sm text-slate-500 mb-8">
                Enter your business details here to ensure accurate invoicing, receipts, and customer communications. This information will appear on all your official documents.
              </p>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Sub-Domain</label>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={company.subdomain}
                      onChange={(e) => setCompany({ ...company, subdomain: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 text-sm text-slate-600"
                      placeholder="e.g. phonelab"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Company Name<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Phone Lab"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Company Phone No.<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={company.phone}
                      onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. 065 6724192"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Customer Service Email<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <input
                      type="email"
                      value={company.email}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Phone.Lab.Ennis@gmail.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Street Address<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={company.address}
                      onChange={(e) => setCompany({ ...company, address: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. 32 O'Connell Street"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">City<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={company.city}
                      onChange={(e) => setCompany({ ...company, city: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Ennis"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">State / Province<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={company.state}
                      onChange={(e) => setCompany({ ...company, state: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Co. Clare"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Zip/Postal Code<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={company.zip_code}
                      onChange={(e) => setCompany({ ...company, zip_code: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. V95 EW74"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <label className="text-sm font-bold text-slate-700">Country<span className="text-red-500">*</span></label>
                  <div className="md:col-span-2">
                    <select
                      value={company.country}
                      onChange={(e) => setCompany({ ...company, country: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Ireland">Ireland</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United States">United States</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveCompany}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>

                {message && (
                  <div className={`mt-4 p-3 rounded text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'payment-options' ? (
            <div className="max-w-4xl">
              <h3 className="font-bold text-slate-800 mb-2" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>Payment Options</h3>
              <p className="text-sm text-slate-500 mb-8">
                Set up how you want to accept payments from your customers. Configure multiple payment methods to provide flexibility and streamline your checkout process.
              </p>

              <div className="bg-white border border-slate-200 rounded p-6 space-y-4">
                {paymentMethods.map((method, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-400 w-6">{index + 1}</span>
                    <button 
                      onClick={() => movePaymentMethod(index)}
                      disabled={index === 0}
                      className={`p-1 rounded transition-colors ${index === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-blue-500 hover:bg-blue-50'}`}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={method.name}
                        onChange={(e) => updatePaymentMethod(index, e.target.value)}
                        className={`w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${method.name === 'Cash' ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : ''}`}
                        placeholder={`Enter new payment option ${index + 1}`}
                        readOnly={method.name === 'Cash'}
                      />
                    </div>
                    {method.name !== 'Cash' && (
                      <button 
                        onClick={() => removePaymentMethod(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                    {method.name === 'Cash' && <div className="w-10"></div>}
                  </div>
                ))}

                <button
                  onClick={addPaymentMethod}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all text-sm font-bold"
                >
                  <Plus size={18} />
                  Add Payment Option
                </button>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handleSavePaymentMethods}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>

                {message && (
                  <div className={`mt-4 p-3 rounded text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'manage-eod-report' ? (
            <div className="max-w-4xl">
              <h3 className="font-bold text-slate-800 mb-2" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>End of Day Report Customization</h3>
              <p className="text-sm text-slate-500 mb-8">
                Customize your End of Day (EOD) Report layout. Toggle major sections like the Cash Summary and Payment Types breakdowns, or customize the bottom totals to include specific metrics.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded p-6 space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Visible Report Sections</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={thermalSettings.eod_show_cash_summary}
                            onChange={(e) => setThermalSettings({ ...thermalSettings, eod_show_cash_summary: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors">Show Cash Summary</span>
                        </label>
                        <p className="text-xs text-slate-400 pl-7 -mt-2">Shows the calculated vs counted cash reconciliation in drawer.</p>

                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={thermalSettings.eod_show_payment_type}
                            onChange={(e) => setThermalSettings({ ...thermalSettings, eod_show_payment_type: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors">Show Payment Types</span>
                        </label>
                        <p className="text-xs text-slate-400 pl-7 -mt-2">Shows a breakdown of calculated sales per payment method.</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Customized Bottom Totals</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={thermalSettings.eod_show_total_cash}
                            onChange={(e) => setThermalSettings({ ...thermalSettings, eod_show_total_cash: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors">Total Cash Row</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={thermalSettings.eod_show_total_card_sale}
                            onChange={(e) => setThermalSettings({ ...thermalSettings, eod_show_total_card_sale: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors">Total Card Sale Row</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={thermalSettings.eod_show_total}
                            onChange={(e) => setThermalSettings({ ...thermalSettings, eod_show_total: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors">Grand Total Row</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Footer Customization</h4>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Footer Content</label>
                          <select 
                            value={thermalSettings.eod_footer_type}
                            onChange={(e) => setThermalSettings({ ...thermalSettings, eod_footer_type: e.target.value })}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="branch">Branch Name (Default)</option>
                            <option value="custom">Custom Text</option>
                          </select>
                        </div>

                        {thermalSettings.eod_footer_type === 'custom' && (
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Custom Footer Text</label>
                            <textarea 
                              value={thermalSettings.eod_footer_custom_text}
                              onChange={(e) => setThermalSettings({ ...thermalSettings, eod_footer_custom_text: e.target.value })}
                              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 h-20 resize-none font-mono text-xs"
                              placeholder="Enter customized footer text here..."
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-4">
                      <button
                        onClick={handleResetThermalSettings}
                        className="text-slate-400 hover:text-red-500 font-bold py-2 px-3 rounded-md text-xs transition-all flex items-center gap-1.5 border border-transparent hover:border-red-100 hover:bg-red-50/50"
                      >
                        <RotateCcw size={14} />
                        Reset Defaults
                      </button>
                      <button
                        onClick={handleSaveThermalPrinterSettings}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800">Report Live Preview</h4>
                  <div className="bg-slate-100 rounded-lg p-6 flex justify-center border border-slate-200 min-h-[450px]">
                    <div 
                      className="bg-white shadow-xl p-4 w-[280px] h-fit font-mono text-[11px] leading-tight text-neutral-900 border border-neutral-200"
                    >
                      <div className="text-center mb-3">
                        <div className="font-bold text-xs uppercase tracking-wider">End of Day Report</div>
                        <div className="text-[10px] text-slate-500">{company.name || 'Your Business Name'}</div>
                        <div className="text-[9px] text-slate-400">Date: {new Date().toLocaleDateString()}</div>
                      </div>

                      <div className="border-t border-dashed border-slate-400 my-2"></div>

                      <div className="flex justify-between mb-1">
                        <span>Starting Bal:</span>
                        <span>€150.00</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Total Sales:</span>
                        <span>€385.00</span>
                      </div>

                      {thermalSettings.eod_show_cash_summary && (
                        <>
                          <div className="border-t border-dashed border-slate-400 my-2"></div>
                          <div className="font-bold mb-1">CASH SUMMARY</div>
                          <div className="flex justify-between text-slate-600">
                            <span>Calculated:</span>
                            <span>€250.00</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Counted:</span>
                            <span>€250.00</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Difference:</span>
                            <span>€0.00</span>
                          </div>
                        </>
                      )}

                      {thermalSettings.eod_show_payment_type && (
                        <>
                          <div className="border-t border-dashed border-slate-400 my-2"></div>
                          <div className="font-bold mb-1">PAYMENT TYPES</div>
                          <div className="flex justify-between text-slate-600">
                            <span>Cash:</span>
                            <span>€100.00</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Card:</span>
                            <span>€285.00</span>
                          </div>
                        </>
                      )}

                      {(thermalSettings.eod_show_total_cash || thermalSettings.eod_show_total_card_sale || thermalSettings.eod_show_total) && (
                        <>
                          <div className="border-t border-dashed border-slate-400 my-2"></div>
                          <div className="space-y-0.5">
                            {thermalSettings.eod_show_total_cash && (
                              <div className="flex justify-between font-bold">
                                <span>Total Cash:</span>
                                <span>€100.00</span>
                              </div>
                            )}
                            {thermalSettings.eod_show_total_card_sale && (
                              <div className="flex justify-between font-bold">
                                <span>Total Card Sale:</span>
                                <span>€285.00</span>
                              </div>
                            )}
                            {thermalSettings.eod_show_total && (
                              <div className="flex justify-between font-extrabold text-blue-600">
                                <span>Total:</span>
                                <span>€385.00</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      <div className="border-t border-dashed border-slate-400 my-2"></div>
                      <div className="text-center text-[10px] italic mb-1 font-bold">
                        {thermalSettings.eod_footer_type === 'custom' 
                          ? (thermalSettings.eod_footer_custom_text || 'Custom Footer Text') 
                          : (company.name || 'Branch Name')}
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'manage-thermal-printer' ? (
            <div className="max-w-4xl">
              <h3 className="font-bold text-slate-800 mb-2" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>Manage Thermal Printer</h3>
              <p className="text-sm text-slate-500 mb-6">
                Customize your thermal receipt layout. Choose which sections to display and adjust the typography for a professional look.
              </p>

              {message && (
                <div className={`p-4 rounded mb-6 text-sm flex items-center justify-between shadow-sm animate-fade-in ${
                  message.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2 font-medium">
                    {message.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-red-600" />}
                    <span>{message.text}</span>
                  </div>
                  <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded p-6 space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Typography</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Font Family</label>
                          <select 
                            value={thermalSettings.font_family}
                            onChange={(e) => setThermalSettings({ ...thermalSettings, font_family: e.target.value })}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Arial">Arial</option>
                            <option value="monospace">Monospace</option>
                            <option value="sans-serif">Sans-Serif</option>
                            <option value="serif">Serif</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 uppercase">Font Size</label>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              {thermalSettings.font_size || '14px'}
                            </span>
                          </div>
                          <select 
                            value={thermalSettings.font_size}
                            onChange={(e) => setThermalSettings({ ...thermalSettings, font_size: e.target.value })}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="9px">9px (Extra Small)</option>
                            <option value="10px">10px (Very Small)</option>
                            <option value="11px">11px (Small - 11px)</option>
                            <option value="12px">12px (Small - 12px)</option>
                            <option value="13px">13px (Medium - 13px)</option>
                            <option value="14px">14px (Standard / Default - 14px)</option>
                            <option value="15px">15px (Large - 15px)</option>
                            <option value="16px">16px (Large - 16px)</option>
                            <option value="18px">18px (Extra Large - 18px)</option>
                            <option value="20px">20px (Huge - 20px)</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Quick Font Size Adjustment Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs font-medium text-slate-500">Quick Adjust:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(thermalSettings.font_size) || 14;
                            const next = Math.max(8, cur - 2);
                            setThermalSettings({ ...thermalSettings, font_size: `${next}px` });
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-200 transition-colors"
                          title="Decrease font size by 2px"
                        >
                          -2px
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(thermalSettings.font_size) || 14;
                            const next = Math.min(24, cur + 2);
                            setThermalSettings({ ...thermalSettings, font_size: `${next}px` });
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-200 transition-colors"
                          title="Increase font size by 2px"
                        >
                          +2px
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(thermalSettings.font_size) || 14;
                            const next = Math.min(24, cur + 4);
                            setThermalSettings({ ...thermalSettings, font_size: `${next}px` });
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded border border-blue-200 transition-colors"
                          title="Increase font size by 4px"
                        >
                          +4px
                        </button>
                        <button
                          type="button"
                          onClick={() => setThermalSettings({ ...thermalSettings, font_size: '14px' })}
                          className="px-2 py-1 text-slate-400 hover:text-slate-600 text-xs transition-colors ml-auto"
                          title="Reset font to 14px"
                        >
                          Reset (14px)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Sections to Print</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: 'show_logo', label: 'Show Logo' },
                          { key: 'show_business_name', label: 'Business Name' },
                          { key: 'show_business_address', label: 'Business Address' },
                          { key: 'show_business_phone', label: 'Business Phone' },
                          { key: 'show_business_email', label: 'Business Email' },
                          { key: 'show_customer_info', label: 'Customer Info' },
                          { key: 'show_invoice_number', label: 'Invoice Number' },
                          { key: 'show_date', label: 'Date & Time' },
                          { key: 'show_items_table', label: 'Items Table' },
                          { key: 'show_totals', label: 'Totals Section' },
                          { key: 'show_footer', label: 'Footer Section' },
                        ].map((section) => (
                          <label key={section.key} className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="checkbox"
                              checked={!!thermalSettings[section.key as keyof ThermalPrinterSettingsData]}
                              onChange={(e) => setThermalSettings({ ...thermalSettings, [section.key]: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors">{section.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Footer Text</label>
                      <textarea 
                        value={thermalSettings.footer_text}
                        onChange={(e) => setThermalSettings({ ...thermalSettings, footer_text: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 h-20 resize-none"
                        placeholder="e.g. Thank you for your business!"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-5 border-t border-slate-100 mt-4">
                      <button
                        type="button"
                        onClick={handleResetThermalSettings}
                        className="text-slate-500 hover:text-red-600 font-semibold py-2 px-3 rounded text-xs transition-all flex items-center gap-1.5 border border-slate-200 hover:border-red-200 hover:bg-red-50/50"
                        title="Reset settings to default"
                      >
                        <RotateCcw size={14} />
                        Reset
                      </button>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={handlePrintThermalReceipt}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded text-xs transition-all flex items-center gap-1.5 border border-slate-200"
                        >
                          <Printer size={14} />
                          Print Test
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveThermalPrinterSettings}
                          disabled={isSaving}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save size={14} />
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-800">Live Preview</h4>
                    {latestInvoice ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <Check size={12} /> Real Last Invoice (#{latestInvoice.invoice_number})
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Sample Preview
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-100 rounded-lg p-6 flex justify-center border border-slate-200 min-h-[500px] overflow-auto">
                    <div className="bg-white shadow-xl p-3 h-fit border border-slate-200 rounded">
                      <ThermalReceipt 
                        invoice={latestInvoice || {
                          id: 1,
                          invoice_number: 'INV-1001',
                          created_at: new Date().toISOString(),
                          customer_name: 'Walk-in Customer',
                          customer: { name: 'Walk-in Customer', phone: '085 123 4567' },
                          subtotal: 85.00,
                          tax_total: 0.00,
                          grand_total: 85.00,
                          paid_amount: 85.00,
                          due_amount: 0.00,
                          payment_method: 'Cash',
                          payments: [{ method: 'Cash', amount: 85.00, user_name: 'Staff' }],
                          items: [
                            { product_name: 'iPhone 11 Screen Repair', quantity: 1, price: 85.00, total: 85.00 }
                          ]
                        }} 
                        settings={thermalSettings} 
                        company={company} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'manage-label-printer' ? (
            <div className="max-w-4xl">
              <h3 className="font-bold text-slate-800 mb-2" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>Manage Label Printer</h3>
              <p className="text-sm text-slate-500 mb-8">
                Configure your label printer settings to print barcode labels, price tags, and product labels efficiently. Connect your printer and customize label formats to match your needs.
              </p>

              <div className="bg-white border border-slate-200 rounded p-6 space-y-8">
                <div className="bg-slate-50 border border-slate-200 rounded p-4 flex gap-4 text-xs text-slate-600 italic items-center">
                  <div className="bg-slate-300 w-1 self-stretch rounded-full shrink-0"></div>
                  <p className="leading-relaxed">
                    Our software uses your browser to print from so it does not require anything special. You should be able to print from any printer that your browser allows you to print to. We have found that many users like the Dymo Labelwriter 450 if you want a suggestion.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block">Label Size</label>
                    <span className="text-[11px] text-slate-500">Standard adhesive label format</span>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <div className="space-y-2.5">
                      {[
                        '2.25" (57mm) x 1.25" (32mm) Dymo 11354 / 30334',
                        '2.12" (54mm) x 1" (25mm) Dymo 30336',
                        '2.4" (62mm) x 1.1" (28mm) Brother DK1209',
                        'Custom'
                      ].map(size => (
                        <label key={size} className="flex items-center gap-3 cursor-pointer group select-none">
                          <input 
                            type="radio" 
                            name="label_size" 
                            checked={printerSettings.label_size === size}
                            onChange={() => setPrinterSettings({ ...printerSettings, label_size: size })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">{size}</span>
                        </label>
                      ))}
                    </div>

                    <div className="bg-red-50 border border-red-100 rounded p-4 mt-3 space-y-3">
                      <p className="text-xs font-bold text-red-800">The label-size you chose:</p>
                      <ul className="text-[11px] text-red-700 space-y-1 ml-4 list-disc">
                        <li>might produce tiny barcode, so please consider checking Preview with your Scanner</li>
                        <li>might contain 6 lines of information including Barcode</li>
                        <li>might contain 34 characters in each line</li>
                      </ul>
                      <div className="flex items-center gap-3 pt-2 border-t border-red-200/60">
                        <span className="text-xs font-bold text-red-800 whitespace-nowrap">Regular Barcode Length:</span>
                        <input 
                          type="range" 
                          min="5" 
                          max="50" 
                          value={printerSettings.barcode_length}
                          onChange={(e) => setPrinterSettings({ ...printerSettings, barcode_length: parseInt(e.target.value) || 20 })}
                          className="flex-1 h-2 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                        />
                        <span className="text-xs font-bold font-mono text-red-800 whitespace-nowrap min-w-[70px] text-right">{printerSettings.barcode_length} chars</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block">Margins (Padding)</label>
                    <span className="text-[11px] text-slate-500 block mb-2.5">Tight margins recommended</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Tight (2px)', val: 2 },
                        { label: 'Normal (3px)', val: 3 },
                        { label: 'Wide (5px)', val: 5 },
                      ].map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setPrinterSettings({
                            ...printerSettings,
                            margin_top: preset.val,
                            margin_left: preset.val,
                            margin_bottom: preset.val,
                            margin_right: preset.val
                          })}
                          className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded border border-slate-300 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['top', 'left', 'bottom', 'right'].map(side => (
                      <div key={side} className="flex items-stretch rounded border border-slate-300 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 overflow-hidden bg-white">
                        <span className="bg-slate-100 border-r border-slate-300 px-2.5 py-2 text-[11px] font-bold text-slate-500 uppercase flex items-center justify-center min-w-[52px] select-none">
                          {side}
                        </span>
                        <input 
                          type="number" 
                          min="0"
                          max="20"
                          value={printerSettings[`margin_${side}` as keyof PrinterSettingsData]}
                          onChange={(e) => setPrinterSettings({ ...printerSettings, [`margin_${side}`]: parseInt(e.target.value) || 0 })}
                          className="w-full px-2.5 py-2 text-sm focus:outline-none font-mono text-slate-800 text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block">Orientation</label>
                    <span className="text-[11px] text-slate-500">Page orientation for printing</span>
                  </div>
                  <div className="md:col-span-2">
                    <select 
                      value={printerSettings.orientation}
                      onChange={(e) => setPrinterSettings({ ...printerSettings, orientation: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium text-slate-800"
                    >
                      <option value="Landscape">Landscape</option>
                      <option value="Portrait">Portrait</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block">Font Size</label>
                    <span className="text-[11px] text-slate-500">Small (10px), Medium (12px), Large (14px)</span>
                  </div>
                  <div className="md:col-span-2">
                    <select 
                      value={printerSettings.font_size}
                      onChange={(e) => setPrinterSettings({ ...printerSettings, font_size: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium text-slate-800"
                    >
                      <option value="Small">Small (10px)</option>
                      <option value="Medium">Medium (12px)</option>
                      <option value="Large">Large (14px)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block">Font Family</label>
                    <span className="text-[11px] text-slate-500">Typography style for labels</span>
                  </div>
                  <div className="md:col-span-2">
                    <select 
                      value={printerSettings.font_family}
                      onChange={(e) => setPrinterSettings({ ...printerSettings, font_family: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium text-slate-800"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="bg-slate-50 border border-slate-200 rounded p-4 flex gap-4 text-xs text-slate-600 italic items-center">
                    <div className="bg-slate-300 w-1 self-stretch rounded-full shrink-0"></div>
                    <p className="leading-relaxed">
                      Live Label Preview (matches 57mm x 32mm Dymo/Zebra standard). Layout: Device Name, RAM/Storage, Price (Bold), Barcode, IMEI/Serial with tight padding.
                    </p>
                  </div>

                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Live Label Preview ({printerSettings.font_size === 'Small' ? '10px' : printerSettings.font_size === 'Large' ? '14px' : '12px'})</span>
                    <div 
                      className="bg-white border-2 border-dashed border-slate-400 rounded p-1 flex flex-col items-center justify-between text-center shadow-md select-none overflow-hidden"
                      style={{
                        width: printerSettings.orientation === 'Landscape' ? '210px' : '130px',
                        height: printerSettings.orientation === 'Landscape' ? '125px' : '210px',
                        paddingTop: `${printerSettings.margin_top}px`,
                        paddingLeft: `${printerSettings.margin_left}px`,
                        paddingBottom: `${printerSettings.margin_bottom}px`,
                        paddingRight: `${printerSettings.margin_right}px`,
                        fontFamily: printerSettings.font_family,
                        fontSize: printerSettings.font_size === 'Small' ? '10px' : printerSettings.font_size === 'Large' ? '14px' : '12px'
                      }}
                    >
                      {/* 1. Device Name (Wraps to 2 lines if long) */}
                      <div className="font-extrabold uppercase tracking-tight text-slate-900 leading-tight px-0.5 w-full line-clamp-2 break-words text-center" style={{ fontSize: '1.05em', maxHeight: '2.3em' }}>
                        Apple iPhone 14 Pro Max
                      </div>

                      {/* 2. Ram / Storage */}
                      <div className="text-slate-700 font-semibold leading-none truncate px-0.5 w-full" style={{ fontSize: '0.9em' }}>
                        6GB / 128GB
                      </div>

                      {/* 3. Price (Bold) */}
                      <div className="font-black text-black leading-tight tracking-tight my-0 w-full" style={{ fontSize: '1.18em' }}>
                        {(settings.currency || '€').split(',')[0].trim()}499.00
                      </div>

                      {/* 4. Barcode + Equal Width Spaced IMEI */}
                      <div className="w-[94%] max-w-[185px] mx-auto flex flex-col items-stretch p-0 m-0">
                        <div className="w-full flex items-center justify-center p-0 m-0 overflow-hidden leading-none">
                          <svg className="w-full h-7 text-black p-0 m-0 block" viewBox="0 0 160 30" preserveAspectRatio="none">
                            <rect x="0" y="0" width="160" height="30" fill="white" />
                            <g fill="black">
                              <rect x="4" y="0" width="2" height="30"/>
                              <rect x="8" y="0" width="4" height="30"/>
                              <rect x="14" y="0" width="2" height="30"/>
                              <rect x="18" y="0" width="1" height="30"/>
                              <rect x="22" y="0" width="3" height="30"/>
                              <rect x="28" y="0" width="2" height="30"/>
                              <rect x="33" y="0" width="4" height="30"/>
                              <rect x="40" y="0" width="1" height="30"/>
                              <rect x="44" y="0" width="3" height="30"/>
                              <rect x="50" y="0" width="2" height="30"/>
                              <rect x="55" y="0" width="4" height="30"/>
                              <rect x="62" y="0" width="2" height="30"/>
                              <rect x="67" y="0" width="1" height="30"/>
                              <rect x="71" y="0" width="3" height="30"/>
                              <rect x="77" y="0" width="2" height="30"/>
                              <rect x="82" y="0" width="4" height="30"/>
                              <rect x="89" y="0" width="1" height="30"/>
                              <rect x="93" y="0" width="3" height="30"/>
                              <rect x="99" y="0" width="2" height="30"/>
                              <rect x="104" y="0" width="4" height="30"/>
                              <rect x="111" y="0" width="2" height="30"/>
                              <rect x="116" y="0" width="1" height="30"/>
                              <rect x="120" y="0" width="3" height="30"/>
                              <rect x="126" y="0" width="2" height="30"/>
                              <rect x="131" y="0" width="4" height="30"/>
                              <rect x="138" y="0" width="1" height="30"/>
                              <rect x="142" y="0" width="3" height="30"/>
                              <rect x="148" y="0" width="2" height="30"/>
                              <rect x="153" y="0" width="3" height="30"/>
                            </g>
                          </svg>
                        </div>

                        {/* 5. IMEI / Serial with space between digits matching barcode width */}
                        <div className="w-full flex justify-between text-[8.5px] font-mono font-bold text-black leading-none mt-[1px] pt-[1px] px-[2px] select-none">
                          {'350967681605412'.split('').map((ch, idx) => (
                            <span key={idx} className="inline-block text-center">{ch}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleSavePrinterSettings}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handlePrintTestLabel}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2 px-6 rounded text-sm shadow-sm transition-all"
                  >
                    Print Test Label
                  </button>
                </div>

                {message && (
                  <div className={`mt-4 p-3 rounded text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'import-products' ? (
            <div className="max-w-5xl space-y-6">
              {/* Header */}
              <div>
                <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>
                  <Package className="text-blue-600" size={24} />
                  Import & Export Products
                </h3>
                <p className="text-sm text-slate-500">
                  Download live inventory CSV records or upload new product catalog files.
                </p>
              </div>

              {/* Mode Switcher Buttons */}
              <div className="flex border-b border-slate-200 gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => setProductSubMode('serial')}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                    productSubMode === 'serial'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Serial Products
                </button>
                <button
                  type="button"
                  onClick={() => setProductSubMode('general')}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                    productSubMode === 'general'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  General Products
                </button>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SUB-SECTION 1: SERIAL PRODUCTS */}
              {/* ───────────────────────────────────────────────────────────── */}
              {productSubMode === 'serial' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Export Serial Products */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2">
                          <ArrowDownToLine size={18} className="text-blue-600" />
                          <h4 className="font-bold text-slate-800 text-base">Export Serial Products</h4>
                        </div>
                        <button
                          onClick={fetchProductsStats}
                          title="Refresh Stats"
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        >
                          <RefreshCw size={15} />
                        </button>
                      </div>

                      {/* Export Sub-Tabs: All vs Scan */}
                      <div className="flex bg-slate-100 p-1 rounded-md mb-3 text-xs">
                        <button
                          type="button"
                          onClick={() => setSerialExportMode('all')}
                          className={`flex-1 py-1.5 px-2 rounded font-medium transition-colors flex items-center justify-center gap-1.5 ${
                            serialExportMode === 'all'
                              ? 'bg-white text-blue-700 shadow-xs font-semibold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Database size={13} />
                          Download All Inventory
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSerialExportMode('scanned');
                            setTimeout(() => scanInputRef.current?.focus(), 50);
                          }}
                          className={`flex-1 py-1.5 px-2 rounded font-medium transition-colors flex items-center justify-center gap-1.5 ${
                            serialExportMode === 'scanned'
                              ? 'bg-white text-blue-700 shadow-xs font-semibold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <ScanBarcode size={13} />
                          Scan Barcode / Search IMEI {scannedExportDevices.length > 0 ? `(${scannedExportDevices.length})` : ''}
                        </button>
                      </div>

                      {serialExportMode === 'all' ? (
                        <>
                          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                            Download all serialized inventory (Phones, Tablets, Laptops) into standard CSV format:
                          </p>

                          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 mb-4 text-[11px] font-mono text-slate-700 space-y-1 overflow-x-auto">
                            <div>"Serial Number / IMEI", "Product Name", "Category", "Brand / Manufacturer", "Storage", "Color", "Condition", "Cost Price", "Selling Price", "Stock Status", "IMEI Status", "Carrier / Lock", "Created Date"</div>
                          </div>

                          <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-800 mb-4">
                            <span className="font-semibold">In-Stock Devices:</span> {serialStats.in_stock_devices} &nbsp;|&nbsp; <span className="font-semibold">Total Recorded:</span> {serialStats.total_devices}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Scan device barcodes or enter IMEIs one by one to compile a specific list to export:
                          </p>

                          {/* Scanner Input */}
                          <form onSubmit={handleScanOrSearchDevice} className="flex gap-2">
                            <div className="relative flex-1">
                              <ScanBarcode size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                ref={scanInputRef}
                                type="text"
                                value={scanInputText}
                                onChange={(e) => setScanInputText(e.target.value)}
                                placeholder="Scan barcode or type IMEI & press Enter..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={isScanningDevice || !scanInputText.trim()}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shrink-0"
                            >
                              <Plus size={14} />
                              {isScanningDevice ? 'Searching...' : 'Add'}
                            </button>
                          </form>

                          {/* Scan Feedback Banner */}
                          {scanFeedback && (
                            <div className={`p-2 rounded text-xs flex items-center justify-between ${
                              scanFeedback.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                              <span>{scanFeedback.message}</span>
                              <button onClick={() => setScanFeedback(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={13} />
                              </button>
                            </div>
                          )}

                          {/* Scanned List */}
                          <div className="border border-slate-200 rounded overflow-hidden">
                            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <Smartphone size={13} className="text-blue-600" />
                                Scanned Devices ({scannedExportDevices.length})
                              </span>
                              {scannedExportDevices.length > 0 && (
                                <button
                                  type="button"
                                  onClick={handleClearScannedDevices}
                                  className="text-[11px] text-red-600 hover:text-red-800 font-normal underline"
                                >
                                  Clear All
                                </button>
                              )}
                            </div>

                            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                              {scannedExportDevices.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400">
                                  No devices scanned yet. Scan a barcode or type an IMEI above.
                                </div>
                              ) : (
                                scannedExportDevices.map((dev, idx) => (
                                  <div key={dev.id || idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                                    <div className="min-w-0 pr-2">
                                      <div className="font-semibold text-slate-800 truncate">{dev.product_name || 'Mobile Device'}</div>
                                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                                        <span>IMEI: {dev.imei || dev.imei_serial || dev.sku_code}</span>
                                        {(dev.gb || dev.color || dev.condition) && (
                                          <span>• {[dev.gb, dev.color, dev.condition].filter(Boolean).join(' / ')}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-semibold text-slate-700">${Number(dev.selling_price || 0).toFixed(2)}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveScannedDevice(dev.id)}
                                        title="Remove from export"
                                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {serialExportMode === 'all' ? (
                        <>
                          <button
                            type="button"
                            onClick={handleDownloadSerialExport}
                            disabled={isSerialExporting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Download size={16} />
                            {isSerialExporting ? 'Exporting...' : 'Download Serial Products (.csv)'}
                          </button>

                          <button
                            type="button"
                            onClick={handleDownloadSerialSample}
                            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-1.5 px-3 rounded text-xs border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <FileText size={14} />
                            Download Sample Template (.csv)
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleDownloadScannedSerialExport}
                            disabled={scannedExportDevices.length === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Download size={16} />
                            Download Scanned CSV ({scannedExportDevices.length} {scannedExportDevices.length === 1 ? 'device' : 'devices'})
                          </button>
                          <p className="text-[11px] text-slate-500 text-center">
                            💡 Import this CSV into another shop with "Update Existing Details" to transfer ownership.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Import Serial Products */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                        <ArrowUpFromLine size={18} className="text-emerald-600" />
                        <h4 className="font-bold text-slate-800 text-base">Import Serial Products</h4>
                      </div>

                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        Upload or paste standard or custom CSV files to add or update serial devices in your inventory and catalog.
                      </p>

                      {/* File upload */}
                      <div className="mb-3">
                        <input
                          type="file"
                          ref={serialFileInputRef}
                          onChange={handleSerialFileUpload}
                          accept=".csv"
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => serialFileInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-300"
                          >
                            <Upload size={14} />
                            Choose .csv File
                          </button>
                          {serialFile && (
                            <span className="text-xs text-slate-600 truncate max-w-[200px]">{serialFile.name}</span>
                          )}
                        </div>
                      </div>

                      {/* Textarea */}
                      <div className="mb-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Or Paste Serial CSV Data:
                        </label>
                        <textarea
                          rows={6}
                          value={serialCsvText}
                          onChange={(e) => setSerialCsvText(e.target.value)}
                          placeholder={`"Serial Number / IMEI","Product Name","Category","Brand / Manufacturer","Storage","Color","Condition","Cost Price","Selling Price","Stock Status","IMEI Status","Carrier / Lock","Created Date"\n"R5GL3253R8Y","Galaxy Tab A11+ X230 WI-FI","Tablets","Samsung","128GB","Silver","New",150.00,219.00,"in_stock","Clean","Unlocked","2026-08-07 10:11:45"\n"353014119037244","iPhone 12 mini","Mobile Phones","Apple","128GB","Black","Grade A",160.00,245.00,"in_stock","Clean","Unlocked","2026-07-25 09:50:02"`}
                          className="w-full border border-slate-300 rounded p-2 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none resize-y"
                        />
                      </div>

                      {/* Duplicate handling */}
                      <div className="mb-3 bg-slate-50 border border-slate-200 rounded p-2 text-xs">
                        <span className="font-semibold text-slate-700 block mb-1">Duplicate Serial Handling:</span>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="serialDuplicateMode"
                              checked={serialDuplicateMode === 'overwrite'}
                              onChange={() => setSerialDuplicateMode('overwrite')}
                            />
                            <span>Update Existing Details</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="serialDuplicateMode"
                              checked={serialDuplicateMode === 'skip'}
                              onChange={() => setSerialDuplicateMode('skip')}
                            />
                            <span>Skip Duplicates</span>
                          </label>
                        </div>
                      </div>

                      {/* Result alert */}
                      {serialImportResult && (
                        <div className={`p-3 rounded text-xs mb-3 ${
                          serialImportResult.success
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          <div className="font-semibold mb-1">
                            {serialImportResult.success ? 'Import Completed' : 'Import Error'}
                          </div>
                          <div>Total Rows: {serialImportResult.total} | Added: {serialImportResult.imported} | Updated: {serialImportResult.updated} | Skipped: {serialImportResult.skipped}</div>
                          {serialImportResult.errors && serialImportResult.errors.length > 0 && (
                            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-red-700">
                              {serialImportResult.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleImportSerialSubmit}
                        disabled={isSerialImporting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Save size={16} />
                        {isSerialImporting ? 'Importing...' : 'Import Serial Products'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SUB-SECTION 2: GENERAL PRODUCTS */}
              {/* ───────────────────────────────────────────────────────────── */}
              {productSubMode === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Export General Products */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <div className="flex items-center gap-2">
                          <ArrowDownToLine size={18} className="text-blue-600" />
                          <h4 className="font-bold text-slate-800 text-base">Export General Products</h4>
                        </div>
                        <button
                          onClick={fetchProductsStats}
                          title="Refresh Stats"
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        >
                          <RefreshCw size={15} />
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        Download standard catalog items, accessories, and stock into standard CSV format:
                      </p>

                      <div className="bg-slate-50 border border-slate-200 rounded p-2.5 mb-4 text-[11px] font-mono text-slate-700 space-y-1 overflow-x-auto">
                        <div>"Product Name", "Product Type", "Category", "Brand / Manufacturer", "SKU", "Barcode", "Cost Price", "Selling Price", "Quantity In Stock", "Min Stock Level", "Taxable"</div>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-800 mb-4">
                        <span className="font-semibold">Catalog Products:</span> {generalStats.total_products} &nbsp;|&nbsp; <span className="font-semibold">SKUs:</span> {generalStats.total_skus} &nbsp;|&nbsp; <span className="font-semibold">Stock:</span> {generalStats.total_stock}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleDownloadGeneralExport}
                        disabled={isGeneralExporting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Download size={16} />
                        {isGeneralExporting ? 'Exporting...' : 'Download General Products (.csv)'}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadGeneralSample}
                        className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-1.5 px-3 rounded text-xs border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <FileText size={14} />
                        Download Sample Template (.csv)
                      </button>
                    </div>
                  </div>

                  {/* Right: Import General Products */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                        <ArrowUpFromLine size={18} className="text-emerald-600" />
                        <h4 className="font-bold text-slate-800 text-base">Import General Products</h4>
                      </div>

                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        Upload or paste standard or custom CSV files to add or update general items, accessories, prices, and stock.
                      </p>

                      {/* File upload */}
                      <div className="mb-3">
                        <input
                          type="file"
                          ref={generalFileInputRef}
                          onChange={handleGeneralFileUpload}
                          accept=".csv"
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => generalFileInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-300"
                          >
                            <Upload size={14} />
                            Choose .csv File
                          </button>
                          {generalFile && (
                            <span className="text-xs text-slate-600 truncate max-w-[200px]">{generalFile.name}</span>
                          )}
                        </div>
                      </div>

                      {/* Textarea */}
                      <div className="mb-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Or Paste General CSV Data:
                        </label>
                        <textarea
                          rows={6}
                          value={generalCsvText}
                          onChange={(e) => setGeneralCsvText(e.target.value)}
                          placeholder={`"Product Name","Product Type","Category","Brand / Manufacturer","SKU","Barcode","Cost Price","Selling Price","Quantity In Stock","Min Stock Level","Taxable"\n"Privacy Tempered Glass / Screen Protector","Standard","Accessories","","GSP05","GSP05",2.50,15.00,25,5,"Yes"\n"20W USB-C Power Adapter","Standard","Accessories","Apple","AP-20W-PWR","194252157007",12.00,25.00,10,3,"Yes"`}
                          className="w-full border border-slate-300 rounded p-2 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none resize-y"
                        />
                      </div>

                      {/* Duplicate handling */}
                      <div className="mb-3 bg-slate-50 border border-slate-200 rounded p-2 text-xs">
                        <span className="font-semibold text-slate-700 block mb-1">Duplicate Product / SKU Handling:</span>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="generalDuplicateMode"
                              checked={generalDuplicateMode === 'overwrite'}
                              onChange={() => setGeneralDuplicateMode('overwrite')}
                            />
                            <span>Update Existing Price & Stock</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="generalDuplicateMode"
                              checked={generalDuplicateMode === 'skip'}
                              onChange={() => setGeneralDuplicateMode('skip')}
                            />
                            <span>Skip Duplicates</span>
                          </label>
                        </div>
                      </div>

                      {/* Result alert */}
                      {generalImportResult && (
                        <div className={`p-3 rounded text-xs mb-3 ${
                          generalImportResult.success
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          <div className="font-semibold mb-1">
                            {generalImportResult.success ? 'Import Completed' : 'Import Error'}
                          </div>
                          <div>Total Rows: {generalImportResult.total} | Added: {generalImportResult.imported} | Updated: {generalImportResult.updated} | Skipped: {generalImportResult.skipped}</div>
                          {generalImportResult.errors && generalImportResult.errors.length > 0 && (
                            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-red-700">
                              {generalImportResult.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleImportGeneralSubmit}
                        disabled={isGeneralImporting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Save size={16} />
                        {isGeneralImporting ? 'Importing...' : 'Import General Products'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'popups-notifications' ? (
            <div className="max-w-4xl space-y-6">
              {/* Header & Save Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2.5 text-xl">
                    <Bell className="text-blue-600" size={22} />
                    <span>Popups & Notifications</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage start-of-day prompts, operational alert badges, and system modal popups.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-5 rounded text-sm transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Save size={16} />
                  <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
                </button>
              </div>

              {/* Alert Message Banner */}
              {message && (
                <div className={`p-3 rounded text-sm flex items-center gap-2 ${
                  message.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Section 1: Start-of-Day & Register Opening Prompts */}
              <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="bg-[#f8f9fa] px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins size={17} className="text-amber-600" />
                    <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                      Start-of-Day & Balance Prompts
                    </h4>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${
                    settings.startup_cash_popup
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    {settings.startup_cash_popup ? '● Enabled on Startup' : '○ Disabled by Default'}
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  {/* The Startup Cash Modal Switch */}
                  <div className="flex items-start justify-between gap-4 p-4 rounded border border-slate-200 bg-slate-50/60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          Prompt for Starting Cash Balance on Startup
                        </span>
                        {!settings.startup_cash_popup ? (
                          <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-300">
                            Disabled (Default)
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                            Enabled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        By default, this startup popup is <strong>disabled</strong> so the system loads cleanly without modal interruptions on login. Turn this ON only if you wish to require cashiers to enter the morning float every day.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.startup_cash_popup)}
                        onChange={(e) => setSettings({ ...settings, startup_cash_popup: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Operational Details & Test Button */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100">
                    <p className="leading-relaxed">
                      💡 Even when turned off permanently on login, cashiers can record or update starting cash anytime from the End of Day reports or cash drawer closeout.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowTestCashModal(true)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300 rounded shadow-2xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calculator size={14} className="text-blue-600" />
                      <span>Test / Open Starting Cash Modal</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: System Popups & Modal Announcements */}
              <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="bg-[#f8f9fa] px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <Sparkles size={17} className="text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                    System & Feature Popups
                  </h4>
                </div>

                <div className="p-5 space-y-4">
                  {/* Announcements Popup */}
                  <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm block">
                        What's New & System Announcements Popup
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Displays the release notes and new feature announcements modal when updates are deployed.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.announcements_popup !== false}
                        onChange={(e) => setSettings({ ...settings, announcements_popup: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Daily End of Day Reminder */}
                  <div className="flex items-start justify-between gap-4 py-2">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm block">
                        Daily End-of-Day Register Closing Reminder
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Prompts the cashier before sign-out if the register closing report hasn't been finalized.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.daily_eod_popup !== false}
                        onChange={(e) => setSettings({ ...settings, daily_eod_popup: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 3: Operational Notifications & Audio */}
              <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
                <div className="bg-[#f8f9fa] px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <Volume2 size={17} className="text-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                    Operational Alerts & Sound Chimes
                  </h4>
                </div>

                <div className="p-5 space-y-4">
                  {/* Low Stock Alerts */}
                  <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm block">
                        Low Stock Warning Banners & Badges
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Shows inventory warning pills on products and device stock that reach or fall below minimum reorder level.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.low_stock_popup !== false}
                        onChange={(e) => setSettings({ ...settings, low_stock_popup: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Audio Feedback */}
                  <div className="flex items-start justify-between gap-4 py-2">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm block">
                        Barcode Scanner & Checkout Sound Chimes
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Emits a gentle audio chime when items are scanned or payments successfully complete at the Cash Register.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.sound_notifications !== false}
                        onChange={(e) => setSettings({ ...settings, sound_notifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p className="text-lg font-medium">Coming Soon</p>
              <p className="text-sm">This section is currently under development.</p>
            </div>
          )}
        </div>
      </div>

      {/* Test / Manual Starting Cash Modal */}
      {showTestCashModal && (
        <StartingCashModal
          isOpen={showTestCashModal}
          onClose={() => setShowTestCashModal(false)}
          onSaved={() => {
            setShowTestCashModal(false);
            setMessage({ type: 'success', text: 'Starting cash recorded successfully.' });
          }}
        />
      )}
    </div>
  );
};

export default GettingStarted;
