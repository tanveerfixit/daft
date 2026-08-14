import React, { useState, useEffect, useRef } from 'react';
import { Settings, Building2, Percent, CreditCard, Users, Package, Printer, Save, Plus, X, ArrowUp, Upload, RotateCcw, FileText } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { printDeviceLabelDirect } from '../utils/printLabel';

interface SettingsData {
  currency: string;
  timezone: string;
  date_format: string;
  time_format: string;
  language: string;
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
  const [settings, setSettings] = useState<SettingsData>({
    currency: '€, Euro',
    timezone: 'UTC/GMT +00:00 - Europe/London',
    date_format: 'DD-MM-YY',
    time_format: '12 hour',
    language: 'English'
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
    label_size: '2.25" (57mm) x 1.25" (32mm) Dymo 11354 Multi-Purpose (LabelWriter 450)',
    barcode_length: 20,
    margin_top: 6,
    margin_left: 3,
    margin_bottom: 2,
    margin_right: 3,
    orientation: 'Landscape',
    font_size: 'Regular',
    font_family: 'Arial'
  });
  const testSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (activeTab === 'manage-label-printer' && testSvgRef.current) {
      try {
        JsBarcode(testSvgRef.current, "350967681605412", {
          format: "CODE128",
          width: 1.8,
          height: 38,
          displayValue: false,
          margin: 0,
          background: "transparent",
          lineColor: "#000000"
        });
      } catch (e) {
        console.error("Test label barcode error", e);
      }
    }
  }, [printerSettings, activeTab]);

  const [thermalSettings, setThermalSettings] = useState<ThermalPrinterSettingsData>({
    font_family: 'Arial',
    font_size: '12px',
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
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleImportProducts = async () => {
    if (!csvText.trim()) {
      setMessage({ type: 'error', text: 'Please paste CSV data or upload a file first.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      // Simple CSV parser (handles basic quoting)
      const parseCSV = (text: string) => {
        const lines = text.split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const result = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const row: any = {};
          // Regex to handle quoted commas
          const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          
          // Fallback if regex fails for some reason
          const values = matches ? matches.map(v => v.trim().replace(/^"|"$/g, '')) : lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));

          const getVal = (names: string[]) => {
            for (const name of names) {
              const idx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
              if (idx !== -1) return values[idx];
            }
            return '';
          };

          row.branch_name = getVal(['Sub-Domain']) || 'Main Branch';
          
          // Product Type mapping
          const prodType = getVal(['Product Type']);
          const isSerialized = getVal(['SERIALIZED INVENTORY']);
          if (prodType) {
            row.product_type = prodType;
          } else if (isSerialized === 'Yes' || isSerialized === '1') {
            row.product_type = 'Mobile Devices';
          } else {
            row.product_type = 'Standard';
          }

          row.category_name = getVal(['Category name', 'CATEGORY NAME']);
          row.manufacturer_name = getVal(['Manufacturer name', 'MANUFACTURER NAME']);
          row.product_name = getVal(['Product name', 'PRODUCT NAME']);
          row.sku = getVal(['SKU', 'SKU/BARCODE']) || getVal(['Id']);
          row.cost_price = getVal(['Cost price', 'COST PRICE']);
          row.selling_price = getVal(['Selling Price', 'SELLING PRICE']);
          row.current_inventory = getVal(['Current inventory', 'CURRENT INVENTORY']);
          row.allow_overselling = getVal(['Allow Over Selling', 'ALLOW OVER SELLING']);

          result.push(row);
        }
        return result;
      };

      const products = parseCSV(csvText);

      const response = await fetch('/api/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to import products');
      }

      setMessage({ type: 'success', text: `Successfully imported ${products.length} products.` });
      setCsvText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      console.error('Import error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'account-setup') {
      fetch('/api/settings')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data) setSettings(data);
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
          if (data) setPrinterSettings(data);
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
        setMessage({ type: 'error', text: 'Failed to save printer settings.' });
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
      setThermalSettings({
        font_family: 'Arial',
        font_size: '12px',
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
    }
  };

  const handlePrintThermalReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Mock data for test print
    const mockInvoice = {
      invoice_number: 'INV-TEST-001',
      created_at: new Date().toISOString(),
      customer_name: 'John Doe',
      subtotal: 45.00,
      tax_total: 9.45,
      grand_total: 54.45,
      payment_method: 'Cash',
      items: [
        { product_name: 'iPhone Screen Repair', quantity: 1, price: 45.00, total: 45.00 }
      ]
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>Thermal Receipt Test</title>
          <style>
            body { margin: 0; padding: 0; background: #eee; }
            .receipt { 
              background: white; 
              width: 72mm; 
              margin: 20px auto; 
              padding: 10mm 5mm;
              font-family: ${thermalSettings.font_family};
              font-size: ${thermalSettings.font_size};
              line-height: 1.2;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .mt-4 { margin-top: 1rem; }
            .mb-4 { margin-bottom: 1rem; }
            .border-t { border-top: 1px dashed #ccc; }
            .flex { display: flex; justify-content: space-between; }
            @media print {
              body { background: white; margin: 0; }
              .receipt { margin: 0; box-shadow: none; border: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${thermalSettings.show_logo ? '<div class="text-center mb-4"><div style="display:inline-block;width:30px;height:30px;background:#ddd;border-radius:50%;line-height:30px;font-size:8px;">LOGO</div></div>' : ''}
            
            <div class="text-center mb-4">
              ${thermalSettings.show_business_name ? `<div class="font-bold uppercase">${company.name || 'Your Business Name'}</div>` : ''}
              ${thermalSettings.show_business_address ? `<div>${company.address || '123 Phone St, Tech City'}</div>` : ''}
              ${thermalSettings.show_business_phone ? `<div>Tel: ${company.phone || '01 234 5678'}</div>` : ''}
              ${thermalSettings.show_business_email ? `<div>${company.email || 'info@phonelab.ie'}</div>` : ''}
            </div>

            ${thermalSettings.show_customer_info ? `
              <div class="mb-4">
                <div>Customer: ${mockInvoice.customer_name}</div>
              </div>
            ` : ''}

            <div class="flex">
              ${thermalSettings.show_invoice_number ? `<div>Inv: ${mockInvoice.invoice_number}</div>` : '<div></div>'}
              ${thermalSettings.show_date ? `<div>Date: ${new Date().toLocaleDateString()}</div>` : ''}
            </div>

            <div class="border-t mt-4 mb-4"></div>

            ${thermalSettings.show_items_table ? `
              <table style="width:100%; font-size: 0.9em;">
                <tr><th align="left">Item</th><th align="right">Total</th></tr>
                ${mockInvoice.items.map(item => `
                  <tr><td>${item.quantity} x ${item.product_name}</td><td align="right">€${item.total.toFixed(2)}</td></tr>
                `).join('')}
              </table>
            ` : ''}

            <div class="border-t mt-4 mb-4"></div>

            ${thermalSettings.show_totals ? `
              <div class="flex font-bold"><div>Grand Total</div><div>€${mockInvoice.grand_total.toFixed(2)}</div></div>
              <div style="font-size: 0.8em; margin-top: 4px;">Paid via ${mockInvoice.payment_method}</div>
            ` : ''}

            ${thermalSettings.show_footer ? `
              <div class="text-center mt-4 pt-4 border-t" style="font-style: italic; font-size: 0.9em;">
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
    printDeviceLabelDirect({
      imei: '350967681605412',
      product_name: 'Apple iPhone 14 Pro Max',
      ram: '6GB',
      gb: '256GB',
      color: 'Space Black',
      condition: 'Grade A'
    }, printerSettings);
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
    { id: 'manage-thermal-printer', label: 'Manage Thermal Printer', icon: Printer },
    { id: 'manage-eod-report', label: 'End of Day Report', icon: FileText },
    { id: 'account-setup', label: 'Account Setup', icon: Settings },
    { id: 'company-info', label: 'Company Information', icon: Building2 },
    { id: 'manage-label-printer', label: 'Manage Label Printer', icon: Printer },
    { id: 'manage-taxes', label: 'Manage Taxes', icon: Percent },
    { id: 'payment-options', label: 'Payment Options', icon: CreditCard },
    { id: 'import-customers', label: 'Import Customers', icon: Users },
    { id: 'import-products', label: 'Import Products', icon: Package },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f7f9]">
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
          {activeTab === 'account-setup' ? (
            <div className="max-w-4xl">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Accounts Setup</h3>
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
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Company Information</h3>
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
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Payment Options</h3>
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
              <h3 className="text-2xl font-bold text-slate-800 mb-2">End of Day Report Customization</h3>
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
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Manage Thermal Printer</h3>
              <p className="text-sm text-slate-500 mb-8">
                Customize your thermal receipt layout. Choose which sections to display and adjust the typography for a professional look.
              </p>

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
                          <label className="text-xs font-bold text-slate-500 uppercase">Font Size</label>
                          <select 
                            value={thermalSettings.font_size}
                            onChange={(e) => setThermalSettings({ ...thermalSettings, font_size: e.target.value })}
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="10px">10px</option>
                            <option value="12px">12px</option>
                            <option value="14px">14px</option>
                            <option value="16px">16px</option>
                          </select>
                        </div>
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
                          { key: 'show_powered_by', label: 'Show Powered By Brand' },
                        ].map((section) => (
                          <label key={section.key} className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="checkbox"
                              checked={thermalSettings[section.key as keyof ThermalPrinterSettingsData] as boolean}
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

                    <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-4">
                      <button
                        onClick={handleResetThermalSettings}
                        className="text-slate-400 hover:text-red-500 font-bold py-2 px-3 rounded-md text-xs transition-all flex items-center gap-1.5 border border-transparent hover:border-red-100 hover:bg-red-50/50"
                      >
                        <RotateCcw size={14} />
                        Reset
                      </button>
                      <div className="flex gap-3">
                        <button
                          onClick={handlePrintThermalReceipt}
                          className="text-slate-500 hover:text-blue-600 font-bold py-2 px-4 rounded text-sm transition-all flex items-center gap-2 border border-slate-200 hover:border-blue-100 hover:bg-blue-50/50"
                        >
                          <Printer size={16} />
                          Test Receipt
                        </button>
                        <button
                          onClick={handleSaveThermalPrinterSettings}
                          disabled={isSaving}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          <Save size={16} />
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800">Live Preview</h4>
                  <div className="bg-slate-100 rounded-lg p-8 flex justify-center border border-slate-200 min-h-[500px]">
                    <div 
                      className="bg-white shadow-xl p-6 w-[300px] h-fit"
                      style={{ 
                        fontFamily: thermalSettings.font_family,
                        fontSize: thermalSettings.font_size,
                        lineHeight: '1.4'
                      }}
                    >
                      {thermalSettings.show_logo && (
                        <div className="flex justify-center mb-4">
                          <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                            LOGO
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center mb-4">
                        {thermalSettings.show_business_name && <div className="font-bold text-lg uppercase">{company.name || 'BUSINESS NAME'}</div>}
                        {thermalSettings.show_business_address && <div className="text-[0.9em]">{company.address || '123 Street Address'}, {company.city || 'City'}</div>}
                        {thermalSettings.show_business_phone && <div className="text-[0.9em]">Tel: {company.phone || '000-000-0000'}</div>}
                        {thermalSettings.show_business_email && <div className="text-[0.9em]">{company.email || 'info@business.com'}</div>}
                      </div>

                      <div className="border-t border-dashed border-slate-300 my-3"></div>

                      <div className="space-y-1 mb-4">
                        {thermalSettings.show_invoice_number && <div className="flex justify-between"><span>Invoice:</span><span className="font-bold">#INV-1001</span></div>}
                        {thermalSettings.show_date && <div className="flex justify-between"><span>Date:</span><span>22-03-2026 14:30</span></div>}
                        {thermalSettings.show_customer_info && <div className="flex justify-between"><span>Customer:</span><span>Walk-in Customer</span></div>}
                      </div>

                      {thermalSettings.show_items_table && (
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between font-bold border-b border-dashed border-slate-300 pb-1">
                            <span>Item</span>
                            <span>Total</span>
                          </div>
                          <div className="flex justify-between">
                            <div className="flex flex-col">
                              <span>iPhone 11 Screen Repair</span>
                              <span className="text-[0.8em]">1 x €85.00</span>
                            </div>
                            <span>€85.00</span>
                          </div>
                          <div className="flex justify-between">
                            <div className="flex flex-col">
                              <span>Tempered Glass</span>
                              <span className="text-[0.8em]">1 x €10.00</span>
                            </div>
                            <span>€10.00</span>
                          </div>
                        </div>
                      )}

                      {thermalSettings.show_totals && (
                        <div className="space-y-1 border-t border-dashed border-slate-300 pt-2 mb-4">
                          <div className="flex justify-between"><span>Subtotal:</span><span>€95.00</span></div>
                          <div className="flex justify-between"><span>Tax (0%):</span><span>€0.00</span></div>
                          <div className="flex justify-between font-bold text-lg pt-1"><span>TOTAL:</span><span>€95.00</span></div>
                        </div>
                      )}

                      {thermalSettings.show_footer && (
                        <div className="text-center mt-6 text-[0.9em] italic">
                          {thermalSettings.footer_text}
                        </div>
                      )}
                      

                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'manage-label-printer' ? (
            <div className="max-w-4xl">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Manage Label Printer</h3>
              <p className="text-sm text-slate-500 mb-8">
                Configure your label printer settings to print barcode labels, price tags, and product labels efficiently. Connect your printer and customize label formats to match your needs.
              </p>

              <div className="bg-white border border-slate-200 rounded p-6 space-y-8">
                <div className="bg-slate-50 border border-slate-200 rounded p-4 flex gap-4 text-xs text-slate-600 italic">
                  <div className="bg-slate-300 w-1 h-auto rounded-full"></div>
                  <p>
                    Our software uses your browser to print from so it does not require anything special. You should be able to print from any printer that your browser allows you to print to. We have found that many users like the Dymo Labelwriter 450 if you want a suggestion.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className="text-sm font-bold text-slate-700">Label Size & Model</label>
                  <div className="md:col-span-2 space-y-3">
                    {[
                      '2.25" (57mm) x 1.25" (32mm) Dymo 11354 Multi-Purpose (LabelWriter 450)',
                      '2.25" (57mm) x 1.25" (32mm) Dymo 30334',
                      '2.12" (54mm) x 1" (25mm) Dymo 30336',
                      '2.4" (62mm) x 1.1" (28mm) Brother DK1209',
                      'Custom'
                    ].map(size => (
                      <label key={size} className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="label_size" 
                          checked={printerSettings.label_size === size}
                          onChange={() => setPrinterSettings({ ...printerSettings, label_size: size })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors font-medium">{size}</span>
                      </label>
                    ))}

                    <div className="bg-blue-50 border border-blue-100 rounded p-4 mt-4 space-y-2">
                      <p className="text-xs font-bold text-blue-900">Dymo LabelWriter 450 (11354) Specifications:</p>
                      <ul className="text-[11px] text-blue-800 space-y-1 ml-4 list-disc">
                        <li>Standard label dimensions: <strong>57mm width × 32mm height</strong> (Landscape)</li>
                        <li>High-density Code-128 barcode optimized for thermal transfer printing</li>
                        <li>Evenly formatted 15-digit IMEI with monospace character spacing</li>
                      </ul>
                      <div className="flex items-center gap-4 pt-2">
                        <span className="text-xs font-bold text-blue-900 whitespace-nowrap">Barcode Density:</span>
                        <input 
                          type="range" 
                          min="5" 
                          max="50" 
                          value={printerSettings.barcode_length}
                          onChange={(e) => setPrinterSettings({ ...printerSettings, barcode_length: parseInt(e.target.value) })}
                          className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <span className="text-xs font-bold text-blue-900 w-12">{printerSettings.barcode_length} chars</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
                  <label className="text-sm font-bold text-slate-700">Margins (mm / px)</label>
                  <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['top', 'left', 'bottom', 'right'].map(side => (
                      <div key={side} className="flex items-center">
                        <span className="bg-slate-100 border border-slate-300 border-r-0 rounded-l px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase w-12 text-center">
                          {side}
                        </span>
                        <input 
                          type="number" 
                          value={printerSettings[`margin_${side}` as keyof PrinterSettingsData]}
                          onChange={(e) => setPrinterSettings({ ...printerSettings, [`margin_${side}`]: parseInt(e.target.value) || 0 })}
                          className="w-full border border-slate-300 rounded-r px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
                  <label className="text-sm font-bold text-slate-700">Orientation</label>
                  <div className="md:col-span-2">
                    <select 
                      value={printerSettings.orientation}
                      onChange={(e) => setPrinterSettings({ ...printerSettings, orientation: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Landscape">Landscape (Recommended for Dymo 11354)</option>
                      <option value="Portrait">Portrait</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
                  <label className="text-sm font-bold text-slate-700">Font Size</label>
                  <div className="md:col-span-2">
                    <select 
                      value={printerSettings.font_size}
                      onChange={(e) => setPrinterSettings({ ...printerSettings, font_size: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Small">Small (Compact)</option>
                      <option value="Regular">Regular (Standard)</option>
                      <option value="Large">Large (High Legibility)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
                  <label className="text-sm font-bold text-slate-700">Font Family</label>
                  <div className="md:col-span-2">
                    <select 
                      value={printerSettings.font_family}
                      onChange={(e) => setPrinterSettings({ ...printerSettings, font_family: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded p-4 flex gap-4 text-xs text-slate-600 italic">
                    <div className="bg-slate-300 w-1 h-auto rounded-full"></div>
                    <p>
                      Live preview accurately simulates Dymo 11354 label proportions on the Dymo LabelWriter 450. Use <strong>Print Test Label</strong> to test alignment.
                    </p>
                  </div>

                  <div className="bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded p-8 flex justify-center">
                    <div 
                      className="bg-white text-black border border-black shadow-md rounded-[2px] p-2 flex flex-col justify-between items-center text-center select-none"
                      style={{
                        width: printerSettings.orientation === 'Landscape' ? '228px' : '128px',
                        height: printerSettings.orientation === 'Landscape' ? '128px' : '228px',
                        paddingTop: `${printerSettings.margin_top ?? 6}px`,
                        paddingLeft: `${printerSettings.margin_left ?? 3}px`,
                        paddingBottom: `${printerSettings.margin_bottom ?? 2}px`,
                        paddingRight: `${printerSettings.margin_right ?? 3}px`,
                        fontFamily: `${printerSettings.font_family || 'Arial'}, sans-serif`
                      }}
                    >
                      <div className={`font-extrabold uppercase ${printerSettings.font_size === 'Small' ? 'text-[9.5px]' : printerSettings.font_size === 'Large' ? 'text-[12.5px]' : 'text-[11px]'} w-full truncate leading-tight`}>
                        Apple iPhone 14 Pro
                      </div>
                      <div className={`${printerSettings.font_size === 'Small' ? 'text-[7.5px]' : printerSettings.font_size === 'Large' ? 'text-[9.5px]' : 'text-[8.5px]'} text-neutral-800 w-full truncate leading-none`}>
                        Spec: 6/128GB • Space Gray
                      </div>
                      <div className={`font-black ${printerSettings.font_size === 'Small' ? 'text-[13px]' : printerSettings.font_size === 'Large' ? 'text-[16.5px]' : 'text-[14.5px]'} text-black w-full truncate leading-none mt-1 tracking-tight`}>
                        Price: €299.00
                      </div>
                      <div className="w-full flex-1 flex items-end justify-center overflow-hidden mb-0 mt-0.5">
                        <svg ref={testSvgRef} className="w-full max-h-[34px] block mb-0"></svg>
                      </div>
                      <div className="w-full font-mono font-bold text-[8.5px] flex justify-between tracking-wide leading-none px-0.5 mt-0">
                        {"350967681605412".split('').map((c, i) => (
                          <span key={i}>{c}</span>
                        ))}
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
            <div className="max-w-4xl">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Import Products</h3>
              <p className="text-sm text-slate-500 mb-8">
                Paste your CSV data below to import products, categories, and manufacturers. The system will automatically create any missing locations, categories, or manufacturers.
              </p>

              <div className="bg-white border border-slate-200 rounded p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Upload CSV File</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv"
                        className="hidden"
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-medium transition-colors border border-slate-300"
                      >
                        <Upload size={16} />
                        Choose File
                      </button>
                      {fileInputRef.current?.files?.[0] && (
                        <span className="text-sm text-slate-500">{fileInputRef.current.files[0].name}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Or Paste CSV Data</label>
                  <textarea 
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 h-64 resize-none"
                    placeholder="Sub-Domain,Id,Product Type,Category name,Manufacturer name,Product name,Color Name,Storage,Physical Condition,SKU,Cost price,Selling Price,Taxable,Current inventory,Count Inventory,Minimum stock,Require Reference,Allow Over Selling"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-4 flex gap-4 text-xs text-slate-600 italic">
                  <div className="bg-slate-300 w-1 h-auto rounded-full"></div>
                  <p>
                    Make sure your CSV data includes the header row. The system will map fields based on the header names.
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handleImportProducts}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {isSaving ? 'Importing...' : 'Save Products'}
                  </button>
                </div>

                {message && (
                  <div className={`mt-4 p-3 rounded text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                  </div>
                )}
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
    </div>
  );
};

export default GettingStarted;
