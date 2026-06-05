import React, { useState, useEffect } from 'react';
import { 
  X,
  RefreshCw,
  Download,
  Printer,
  List,
  Search
} from 'lucide-react';

interface DateRange {
  start: string;
  end: string;
}

const DateRangePicker = ({ value, onChange }: { value: DateRange; onChange: (val: DateRange) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [start, setStart] = useState(value.start);
  const [end, setEnd] = useState(value.end);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD -> DD-MM-YYYY
  };

  const handleApply = () => {
    onChange({ start, end });
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block w-full max-w-[280px] font-mono">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-4 py-2 text-[16px] text-neutral-855 dark:text-neutral-100 focus:outline-none hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
      >
        <span className="mr-2">📅</span>
        <span className="font-mono text-[16px]">{formatDate(value.start)} - {formatDate(value.end)}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-400 dark:border-neutral-700 shadow-2xl p-4 z-50 rounded-sm flex flex-col gap-3 min-w-[280px]">
          <div className="flex flex-col gap-1">
            <label className="text-[13px] uppercase font-bold text-neutral-500 font-mono">From Date</label>
            <input 
              type="date" 
              value={start} 
              onChange={(e) => setStart(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 p-2 text-[16px] text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:border-neutral-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[13px] uppercase font-bold text-neutral-500 font-mono">To Date</label>
            <input 
              type="date" 
              value={end} 
              onChange={(e) => setEnd(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 p-2 text-[16px] text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:border-neutral-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button 
              onClick={() => setIsOpen(false)}
              className="bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[14px] py-1.5 px-3 font-mono"
            >
              Cancel
            </button>
            <button 
              onClick={handleApply}
              className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black text-[14px] font-bold py-1.5 px-3 font-mono"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function SalesReports() {
  const today = new Date().toISOString().split('T')[0];
  const initialRange = { start: today, end: today };

  // Subview toggle state for "Sales by Date" detailed page
  const [isViewingSalesByDate, setIsViewingSalesByDate] = useState(false);
  const [salesByDateType, setSalesByDateType] = useState<'date-daily' | 'date-weekly' | 'date-monthly'>('date-daily');

  // Row states
  const [salesByDateRange, setSalesByDateRange] = useState<DateRange>(initialRange);

  const [salespersonRange, setSalespersonRange] = useState<DateRange>(initialRange);
  const [salespersonKeyword, setSalespersonKeyword] = useState('');

  const [customerRange, setCustomerRange] = useState<DateRange>(initialRange);
  const [customerKeyword, setCustomerKeyword] = useState('');

  const [paymentsRange, setPaymentsRange] = useState<DateRange>(initialRange);
  const [paymentsType, setPaymentsType] = useState('All Payment Types');

  const [productRange, setProductRange] = useState<DateRange>(initialRange);
  const [productKeyword, setProductKeyword] = useState('');

  const [categoryRange, setCategoryRange] = useState<DateRange>(initialRange);
  const [taxRange, setTaxRange] = useState<DateRange>(initialRange);
  const [unpaidRange, setUnpaidRange] = useState<DateRange>(initialRange);

  // Active report viewing state (general reports)
  const [activeReport, setActiveReport] = useState<{ id: string; start: string; end: string; keyword: string } | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportTitle, setReportTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch handler for general reports
  const fetchReport = async (reportId: string, start: string, end: string, keywordVal: string) => {
    setLoading(true);
    setError('');
    
    const titles: Record<string, string> = {
      'date-daily': 'Sales by Date (Daily)',
      'date-weekly': 'Sales by Date (Weekly)',
      'date-monthly': 'Sales by Date (Monthly)',
      'salesperson': 'Sales by Sales Person',
      'customer': 'Sales by Customer',
      'payment': 'Payments Received by Type',
      'product': 'Sales by Product',
      'category': 'Sales by Category',
      'tax': 'Sales by Tax / VAT',
      'unpaid': 'Unpaid Invoices'
    };

    setReportTitle(titles[reportId] || 'Report Data');
    setActiveReport({ id: reportId, start, end, keyword: keywordVal });

    try {
      const response = await fetch(
        `/api/reports/sales-report?type=${reportId}&startDate=${start}&endDate=${end}&q=${encodeURIComponent(keywordVal)}`
      );
      if (!response.ok) throw new Error('Failed to retrieve report data');
      const data = await response.json();
      setReportData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading the report');
    } finally {
      setLoading(false);
    }
  };

  // Trigger dedicated subpage view for Daily, Weekly, Monthly
  const handleOpenSalesByDate = (subType: 'date-daily' | 'date-weekly' | 'date-monthly') => {
    setSalesByDateType(subType);
    setIsViewingSalesByDate(true);
    fetchReport(subType, salesByDateRange.start, salesByDateRange.end, '');
  };

  const downloadCSV = () => {
    if (!reportData.length || !activeReport) {
      alert('No data to export.');
      return;
    }
    
    let csvContent = '';
    const headers = Object.keys(reportData[0]);
    csvContent += headers.map(h => `"${h.toUpperCase()}"`).join(',') + '\n';
    
    reportData.forEach(row => {
      const line = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'number') return val;
        return `"${val.toString().replace(/"/g, '""')}"`;
      });
      csvContent += line.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `report_${activeReport.id}_${activeReport.start}_to_${activeReport.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for Sales by Date detailed KPIs
  const totalTaxable = reportData.reduce((sum, row) => sum + (Number(row.taxable) || 0), 0);
  const totalTaxes = reportData.reduce((sum, row) => sum + (Number(row.taxes) || 0), 0);
  const totalNonTaxable = reportData.reduce((sum, row) => sum + (Number(row.non_taxable) || 0), 0);
  const totalGrandTotal = reportData.reduce((sum, row) => sum + (Number(row.grand_total) || 0), 0);
  const totalCost = reportData.reduce((sum, row) => sum + (Number(row.cost) || 0), 0);
  const totalProfit = totalGrandTotal - totalCost;
  const totalProfitPct = totalGrandTotal > 0 ? (totalProfit / totalGrandTotal) * 100 : 0;

  // Subpage view layout
  if (isViewingSalesByDate) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-neutral-955 text-neutral-900 dark:text-neutral-100 font-mono select-none sales-by-date-print-area" style={{ fontSize: '19px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden; }
            .sales-by-date-print-area, .sales-by-date-print-area * { visibility: visible; }
            .sales-by-date-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}} />

        {/* Header Bar */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center shrink-0">
          <h1 className="text-[28px] font-bold text-neutral-900 dark:text-white uppercase tracking-tight">Sales by Date</h1>
          
          <div className="flex gap-3 print:hidden">
            <button 
              onClick={() => {
                setIsViewingSalesByDate(false);
                setActiveReport(null);
                setReportData([]);
              }}
              className="flex items-center gap-2 px-4 py-2 border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black text-[16px] font-bold uppercase tracking-tight hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-100"
            >
              <List size={16} />
              <span>All Reports</span>
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-[rgb(0,180,216)] hover:bg-[rgb(0,150,199)] text-white text-[16px] font-bold uppercase tracking-tight"
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Filter Controller Row */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-4 bg-neutral-50 dark:bg-neutral-900 print:hidden">
          <div className="flex items-center border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black">
            <span className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 border-r border-neutral-300 dark:border-neutral-750 text-[14px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">View</span>
            <select className="bg-transparent border-0 px-3 py-1.5 text-[14px] text-neutral-850 dark:text-neutral-100 focus:outline-none bg-white dark:bg-black">
              <option>Summary</option>
            </select>
          </div>

          <DateRangePicker 
            value={salesByDateRange} 
            onChange={(val) => {
              setSalesByDateRange(val);
              fetchReport(salesByDateType, val.start, val.end, '');
            }} 
          />

          <div className="flex items-center border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black">
            <span className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 border-r border-neutral-300 dark:border-neutral-750 text-[14px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">Type</span>
            <select 
              value={salesByDateType}
              onChange={(e) => {
                const newType = e.target.value as any;
                setSalesByDateType(newType);
                fetchReport(newType, salesByDateRange.start, salesByDateRange.end, '');
              }}
              className="bg-transparent border-0 px-3 py-1.5 text-[14px] text-neutral-855 dark:text-neutral-100 focus:outline-none bg-white dark:bg-black"
            >
              <option value="date-daily">Daily</option>
              <option value="date-weekly">Weekly</option>
              <option value="date-monthly">Monthly</option>
            </select>
          </div>

          <button 
            onClick={() => fetchReport(salesByDateType, salesByDateRange.start, salesByDateRange.end, '')}
            className="p-2 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <Search size={14} />
          </button>
        </div>

        {/* KPI Badges Row */}
        <div className="px-6 py-4 flex flex-wrap gap-2.5 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="bg-[#9c1c46] text-white px-4 py-2 font-bold text-[16px] tracking-tight">
            Taxable : €{totalTaxable.toFixed(2)}
          </div>
          <div className="bg-[#9c1c46] text-white px-4 py-2 font-bold text-[16px] tracking-tight">
            Taxes : €{totalTaxes.toFixed(2)}
          </div>
          <div className="bg-[#9c1c46] text-white px-4 py-2 font-bold text-[16px] tracking-tight">
            Non Taxable : €{totalNonTaxable.toFixed(2)}
          </div>
          <div className="bg-[#9c1c46] text-white px-4 py-2 font-bold text-[16px] tracking-tight">
            Grand Total : €{totalGrandTotal.toFixed(2)}
          </div>
          <div className="bg-[#9c1c46] text-white px-4 py-2 font-bold text-[16px] tracking-tight">
            Cost : €{totalCost.toFixed(2)}
          </div>
          <div className="bg-[#9c1c46] text-white px-4 py-2 font-bold text-[16px] tracking-tight">
            Profit : €{totalProfit.toFixed(2)} ({totalProfitPct.toFixed(2)}%)
          </div>
        </div>

        {/* Report Output Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 text-center text-neutral-450 animate-pulse text-[16px] font-bold">
              *** GENERATING SYSTEM REPORT DATA... ***
            </div>
          ) : error ? (
            <div className="py-12 text-center text-red-500 text-[16px]">
              Error: {error}
            </div>
          ) : reportData.length === 0 ? (
            <div className="py-12 text-center text-neutral-450 italic text-[16px]">
              No records matched the selected filters.
            </div>
          ) : (
            <table className="w-full text-left border-collapse border border-neutral-300 dark:border-neutral-800">
              <thead>
                <tr className="bg-neutral-150 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-[16px] font-bold text-neutral-600 dark:text-neutral-300">
                  <th className="px-6 py-3 border-r border-neutral-300 dark:border-neutral-800 text-center w-[30%]">Sales Date</th>
                  <th className="px-6 py-3 border-r border-neutral-300 dark:border-neutral-800 text-right">Taxable</th>
                  <th className="px-6 py-3 border-r border-neutral-300 dark:border-neutral-800 text-right">Taxes</th>
                  <th className="px-6 py-3 border-r border-neutral-300 dark:border-neutral-800 text-right">Non Taxable</th>
                  <th className="px-6 py-3 border-r border-neutral-300 dark:border-neutral-800 text-right">Grand Total</th>
                  <th className="px-6 py-3 border-r border-neutral-300 dark:border-neutral-800 text-right">Cost</th>
                  <th className="px-6 py-3 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-[16px]">
                {reportData.map((row, idx) => {
                  const profit = (Number(row.grand_total) || 0) - (Number(row.cost) || 0);
                  const profitPct = (Number(row.grand_total) || 0) > 0 ? (profit / (Number(row.grand_total) || 0)) * 100 : 0;
                  
                  return (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                      <td className="px-6 py-3 border-r border-neutral-200 dark:border-neutral-800 text-center font-bold text-neutral-700 dark:text-neutral-300">{row.name}</td>
                      <td className="px-6 py-3 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono font-bold">€{(Number(row.taxable) || 0).toFixed(2)}</td>
                      <td className="px-6 py-3 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono font-bold">€{(Number(row.taxes) || 0).toFixed(2)}</td>
                      <td className="px-6 py-3 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono font-bold">€{(Number(row.non_taxable) || 0).toFixed(2)}</td>
                      <td className="px-6 py-3 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono font-bold">€{(Number(row.grand_total) || 0).toFixed(2)}</td>
                      <td className="px-6 py-3 border-r border-neutral-200 dark:border-neutral-800 text-right font-mono font-bold">€{(Number(row.cost) || 0).toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-mono font-bold">
                        €{profit.toFixed(2)} ({profitPct.toFixed(2)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // Otherwise, render main general page layout
  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-955 dark:text-neutral-100 font-mono select-none" style={{ fontSize: '20px' }}>
      
      {/* Title */}
      <div className="px-6 py-5 bg-white dark:bg-black border-b border-neutral-300 dark:border-neutral-800 shrink-0">
        <h1 className="text-[28px] font-bold text-neutral-900 dark:text-white font-mono uppercase tracking-tight">Sales Reports</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Table matching image configuration exactly */}
        <div className="bg-white dark:bg-black overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px] font-mono">
            <thead>
              <tr className="bg-neutral-150 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-855 text-[16px] font-bold text-neutral-600 dark:text-neutral-300">
                <th className="px-8 py-3 w-1/4 text-center">Report Type</th>
                <th className="px-8 py-3 w-1/4 text-center">From Date - To Date</th>
                <th className="px-8 py-3 w-1/4 text-center">Optional Keyword</th>
                <th className="px-8 py-3 w-1/4 text-center">Get Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-855 text-[16px]">
              
              {/* Row 1: Sales by Date */}
              <tr>
                <td className="px-8 py-4 font-bold text-neutral-855 dark:text-neutral-200 text-right pr-16">Sales by Date</td>
                <td className="px-8 py-4 text-center">
                  <div className="flex justify-center">
                    <DateRangePicker value={salesByDateRange} onChange={setSalesByDateRange} />
                  </div>
                </td>
                <td className="px-8 py-4"></td>
                <td className="px-8 py-4">
                  <div className="flex justify-center gap-3">
                    <button 
                      onClick={() => handleOpenSalesByDate('date-daily')}
                      className="px-6 py-2 border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-100 transition-colors uppercase font-bold text-[16px] bg-white dark:bg-black"
                    >
                      Daily
                    </button>
                    <button 
                      onClick={() => handleOpenSalesByDate('date-weekly')}
                      className="px-6 py-2 border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-100 transition-colors uppercase font-bold text-[16px] bg-white dark:bg-black"
                    >
                      Weekly
                    </button>
                    <button 
                      onClick={() => handleOpenSalesByDate('date-monthly')}
                      className="px-6 py-2 border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-100 transition-colors uppercase font-bold text-[16px] bg-white dark:bg-black"
                    >
                      Monthly
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 2: Sales by Sales Person */}
              <tr>
                <td className="px-8 py-4 font-bold text-neutral-855 dark:text-neutral-200 text-right pr-16">Sales by Sales Person</td>
                <td className="px-8 py-4 text-center">
                  <div className="flex justify-center">
                    <DateRangePicker value={salespersonRange} onChange={setSalespersonRange} />
                  </div>
                </td>
                <td className="px-8 py-4">
                  <input 
                    type="text" 
                    placeholder="Sales Person" 
                    value={salespersonKeyword}
                    onChange={(e) => setSalespersonKeyword(e.target.value)}
                    className="w-full max-w-[280px] mx-auto block bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-4 py-2 text-[16px] text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none"
                  />
                </td>
                <td className="px-8 py-4 text-center">
                  <button 
                    onClick={() => fetchReport('salesperson', salespersonRange.start, salespersonRange.end, salespersonKeyword)}
                    className="bg-transparent border-none p-0 text-neutral-800 dark:text-neutral-100 hover:underline cursor-pointer font-mono font-normal text-[16px] outline-none"
                  >
                    Generate Report
                  </button>
                </td>
              </tr>

              {/* Row 3: Sales by Customer */}
              <tr>
                <td className="px-8 py-4 font-bold text-neutral-855 dark:text-neutral-200 text-right pr-16">Sales by Customer</td>
                <td className="px-8 py-4 text-center">
                  <div className="flex justify-center">
                    <DateRangePicker value={customerRange} onChange={setCustomerRange} />
                  </div>
                </td>
                <td className="px-8 py-4">
                  <input 
                    type="text" 
                    placeholder="Customer Name" 
                    value={customerKeyword}
                    onChange={(e) => setCustomerKeyword(e.target.value)}
                    className="w-full max-w-[280px] mx-auto block bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-4 py-2 text-[16px] text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none"
                  />
                </td>
                <td className="px-8 py-4 text-center">
                  <button 
                    onClick={() => fetchReport('customer', customerRange.start, customerRange.end, customerKeyword)}
                    className="bg-transparent border-none p-0 text-neutral-800 dark:text-neutral-100 hover:underline cursor-pointer font-mono font-normal text-[16px] outline-none"
                  >
                    Generate Report
                  </button>
                </td>
              </tr>

              {/* Row 4: Payments Received by Type */}
              <tr>
                <td className="px-8 py-4 font-bold text-neutral-855 dark:text-neutral-200 text-right pr-16">Payments Received by Type</td>
                <td className="px-8 py-4 text-center">
                  <div className="flex justify-center">
                    <DateRangePicker value={paymentsRange} onChange={setPaymentsRange} />
                  </div>
                </td>
                <td className="px-8 py-4">
                  <select 
                    value={paymentsType}
                    onChange={(e) => setPaymentsType(e.target.value)}
                    className="w-full max-w-[280px] mx-auto block bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-3 py-2 text-[16px] text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none bg-transparent"
                  >
                    <option value="All Payment Types">All Payment Types</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </td>
                <td className="px-8 py-4 text-center">
                  <button 
                    onClick={() => fetchReport('payment', paymentsRange.start, paymentsRange.end, paymentsType)}
                    className="bg-transparent border-none p-0 text-neutral-800 dark:text-neutral-100 hover:underline cursor-pointer font-mono font-normal text-[16px] outline-none"
                  >
                    Generate Report
                  </button>
                </td>
              </tr>

              {/* Row 5: Sales by Product */}
              <tr>
                <td className="px-8 py-4 font-bold text-neutral-855 dark:text-neutral-200 text-right pr-16">Sales by Product</td>
                <td className="px-8 py-4 text-center">
                  <div className="flex justify-center">
                    <DateRangePicker value={productRange} onChange={setProductRange} />
                  </div>
                </td>
                <td className="px-8 py-4">
                  <input 
                    type="text" 
                    placeholder="Product Name/SKU" 
                    value={productKeyword}
                    onChange={(e) => setProductKeyword(e.target.value)}
                    className="w-full max-w-[280px] mx-auto block bg-white dark:bg-black border border-neutral-300 dark:border-neutral-850 px-4 py-2 text-[16px] text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none"
                  />
                </td>
                <td className="px-8 py-4 text-center">
                  <button 
                    onClick={() => fetchReport('product', productRange.start, productRange.end, productKeyword)}
                    className="bg-transparent border-none p-0 text-neutral-800 dark:text-neutral-100 hover:underline cursor-pointer font-mono font-normal text-[16px] outline-none"
                  >
                    Generate Report
                  </button>
                </td>
              </tr>

              {/* Row 6: Sales by Category */}
              <tr>
                <td className="px-8 py-4 font-bold text-neutral-855 dark:text-neutral-200 text-right pr-16">Sales by Category</td>
                <td className="px-8 py-4 text-center">
                  <div className="flex justify-center">
                    <DateRangePicker value={categoryRange} onChange={setCategoryRange} />
                  </div>
                </td>
                <td className="px-8 py-4"></td>
                <td className="px-8 py-4 text-center">
                  <button 
                    onClick={() => fetchReport('category', categoryRange.start, categoryRange.end, '')}
                    className="bg-transparent border-none p-0 text-neutral-800 dark:text-neutral-100 hover:underline cursor-pointer font-mono font-normal text-[16px] outline-none"
                  >
                    Generate Report
                  </button>
                </td>
              </tr>

              {/* Row 7: Sales by Tax */}
              <tr>
                <td className="px-8 py-4 font-bold text-neutral-855 dark:text-neutral-200 text-right pr-16">Sales by Tax</td>
                <td className="px-8 py-4 text-center">
                  <div className="flex justify-center">
                    <DateRangePicker value={taxRange} onChange={setTaxRange} />
                  </div>
                </td>
                <td className="px-8 py-4"></td>
                <td className="px-8 py-4 text-center">
                  <button 
                    onClick={() => fetchReport('tax', taxRange.start, taxRange.end, '')}
                    className="bg-transparent border-none p-0 text-neutral-800 dark:text-neutral-100 hover:underline cursor-pointer font-mono font-normal text-[16px] outline-none"
                  >
                    Generate Report
                  </button>
                </td>
              </tr>

              {/* Row 8: Unpaid Invoices */}
              <tr>
                <td className="px-8 py-4 font-bold text-neutral-855 dark:text-neutral-200 text-right pr-16">Unpaid Invoices</td>
                <td className="px-8 py-4 text-center">
                  <div className="flex justify-center">
                    <DateRangePicker value={unpaidRange} onChange={setUnpaidRange} />
                  </div>
                </td>
                <td className="px-8 py-4"></td>
                <td className="px-8 py-4 text-center">
                  <button 
                    onClick={() => fetchReport('unpaid', unpaidRange.start, unpaidRange.end, '')}
                    className="bg-transparent border-none p-0 text-neutral-800 dark:text-neutral-100 hover:underline cursor-pointer font-mono font-normal text-[16px] outline-none"
                  >
                    Generate Report
                  </button>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Selected Report Output View */}
        {activeReport && (
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-855 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-sm font-mono">
            <div className="bg-neutral-200 dark:bg-neutral-900 px-6 py-4 border-b border-neutral-300 dark:border-neutral-855 flex justify-between items-center">
              <div>
                <h3 className="text-[16px] font-bold text-black dark:text-white uppercase tracking-wider">
                  Report: {reportTitle}
                </h3>
                <p className="text-[13px] text-neutral-500 uppercase mt-1 font-bold">
                  Range: {activeReport.start} to {activeReport.end} {activeReport.keyword && `• Filter: "${activeReport.keyword}"`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={downloadCSV}
                  className="flex items-center gap-1.5 px-4 py-2 border border-neutral-350 dark:border-neutral-800 text-[14px] font-bold hover:bg-neutral-355 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-black font-mono"
                >
                  <Download size={14} />
                  <span>Download CSV</span>
                </button>
                <button 
                  onClick={() => fetchReport(activeReport.id, activeReport.start, activeReport.end, activeReport.keyword)}
                  className="p-2 border border-neutral-355 dark:border-neutral-800 hover:bg-neutral-355 dark:hover:bg-neutral-800 bg-white dark:bg-black text-neutral-700 dark:text-neutral-300"
                  title="Refresh Report"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => {
                    setActiveReport(null);
                    setReportData([]);
                  }} 
                  className="text-neutral-500 hover:text-red-500 px-3 py-1.5 text-[14px] font-bold"
                >
                  [CLOSE]
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-x-auto">
              {loading ? (
                <div className="py-12 text-center text-neutral-450 animate-pulse text-[16px] font-bold">
                  *** GENERATING SYSTEM REPORT DATA... ***
                </div>
              ) : error ? (
                <div className="py-12 text-center text-red-500 text-[16px]">
                  Error: {error}
                </div>
              ) : reportData.length === 0 ? (
                <div className="py-12 text-center text-neutral-450 italic text-[16px]">
                  No records matched the selected filters.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-855 text-[14px] font-bold text-black dark:text-white uppercase tracking-wider">
                      <th className="px-4 py-3">#</th>
                      {Object.keys(reportData[0]).map((header) => (
                        <th key={header} className={`px-4 py-3 ${['total', 'count', 'amount', 'tax_amount', 'net_sales'].includes(header.toLowerCase()) ? 'text-right' : ''}`}>
                          {header.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, idx) => (
                      <tr key={idx} className="border-b border-neutral-200 dark:border-neutral-800 text-[14px] font-normal hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                        <td className="px-4 py-3 text-neutral-500 font-bold">{idx + 1}</td>
                        {Object.keys(row).map((header) => {
                          const val = row[header];
                          const formattedVal = (header.toLowerCase().includes('total') || header.toLowerCase().includes('amount') || header.toLowerCase().includes('sales')) && typeof val === 'number'
                            ? `€${val.toFixed(2)}`
                            : val === null || val === undefined ? '-' : val.toString();
                          
                          return (
                            <td key={header} className={`px-4 py-3 ${['total', 'count', 'amount', 'tax_amount', 'net_sales'].includes(header.toLowerCase()) ? 'text-right font-mono font-bold' : ''}`}>
                              {header === 'created_at' ? new Date(val).toLocaleDateString() : formattedVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  {/* Summary Row */}
                  {reportData.length > 1 && !['tax', 'unpaid'].includes(activeReport.id) && (
                    <tfoot>
                      <tr className="bg-neutral-100 dark:bg-neutral-900 font-bold text-[14px] text-black dark:text-white border-t border-neutral-300 dark:border-neutral-855">
                        <td className="px-4 py-3 uppercase" colSpan={2}>Total Summary</td>
                        {Object.keys(reportData[0]).slice(1).map((header) => {
                          const isNumber = reportData.every(r => typeof r[header] === 'number');
                          if (isNumber) {
                            const sum = reportData.reduce((acc, r) => acc + (r[header] || 0), 0);
                            const formattedSum = (header.toLowerCase().includes('total') || header.toLowerCase().includes('amount') || header.toLowerCase().includes('sales'))
                              ? `€${sum.toFixed(2)}`
                              : sum.toString();
                            return (
                              <td key={header} className="px-4 py-3 text-right font-mono font-bold">
                                {formattedSum}
                              </td>
                            );
                          }
                          return <td key={header} className="px-4 py-3"></td>;
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
