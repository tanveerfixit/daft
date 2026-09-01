import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  List, 
  Save, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  FileText, 
  Euro,
  Calculator,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  X,
  ExternalLink,
  Calendar,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { Payment, ClosingReport, ClosingReportPayment } from '../types';
import { useThermalSettings, ThermalPrinterSettings, CompanyInfo } from '../hooks/useThermalSettings';

const defaultThermalSettings: ThermalPrinterSettings = {
  font_family: 'monospace',
  font_size: '14px',
  show_logo: false,
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
  footer_text: ''
};

const defaultCompanyInfo: CompanyInfo = {
  name: 'EPOS Store',
  address: '',
  city: '',
  phone: '',
  email: ''
};

interface PrintProps {
  reportDate: string;
  startingBalance: number;
  totalSales: number;
  cashCounted: number;
  calculatedCash: number;
  difference: number;
  summaries: any[];
  allPayments: any[];
  comments: string;
}

const EndOfDayThermal: React.FC<PrintProps> = ({
  reportDate,
  startingBalance,
  totalSales,
  cashCounted,
  calculatedCash,
  difference,
  summaries,
  allPayments,
  comments
}) => {
  const { settings, company } = useThermalSettings();
  const activeSettings = settings || defaultThermalSettings;
  const activeCompany = company || defaultCompanyInfo;
  const now = new Date();

  return (
    <div 
      className="thermal-receipt bg-white text-black mx-auto p-4 font-mono text-[14px] leading-tight" 
      id="eod-thermal-receipt"
      style={{ 
        width: '72mm',
        maxWidth: '72mm',
        boxSizing: 'border-box',
        padding: '2mm'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body * {
            visibility: hidden;
          }
          #eod-thermal-receipt, #eod-thermal-receipt * {
            visibility: visible;
          }
          #eod-thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 72mm;
            max-width: 72mm;
            padding: 2mm;
            box-sizing: border-box;
            background: white !important;
            color: black !important;
          }
        }
        .eod-divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .eod-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          font-size: 14px;
        }
        .eod-header {
          text-align: center;
          margin-bottom: 10px;
          font-size: 13px;
        }
        .eod-title {
          font-weight: bold;
          font-size: 16px;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
      `}} />

      <div className="eod-header">
        <div className="eod-title">End of Day Report</div>
        <div className="font-semibold">{activeCompany.name}</div>
        <div>Date: {reportDate}</div>
        <div>Printed: {now.toLocaleString()}</div>
      </div>

      <div className="eod-divider"></div>

      <div className="eod-row">
        <span>Starting Bal:</span>
        <span className="font-semibold">€{startingBalance.toFixed(2)}</span>
      </div>
      <div className="eod-row">
        <span>Total Sales:</span>
        <span className="font-semibold">€{totalSales.toFixed(2)}</span>
      </div>

      {activeSettings.eod_show_cash_summary && (
        <>
          <div className="eod-divider"></div>
          <div className="eod-row font-bold text-[14px]">
            <span>CASH SUMMARY</span>
          </div>
          <div className="eod-row">
            <span>Calculated:</span>
            <span>€{calculatedCash.toFixed(2)}</span>
          </div>
          <div className="eod-row">
            <span>Counted:</span>
            <span>€{cashCounted.toFixed(2)}</span>
          </div>
          <div className="eod-row font-bold">
            <span>Difference:</span>
            <span>€{difference.toFixed(2)}</span>
          </div>
        </>
      )}

      {activeSettings.eod_show_payment_type && (
        <>
          <div className="eod-divider"></div>
          <div className="eod-row font-bold text-[14px]">
            <span>PAYMENT TYPES</span>
          </div>
          {summaries.map((s, idx) => (
            <div key={idx} className="eod-row">
              <span>{s.payment_type}:</span>
              <span>€{s.calculated.toFixed(2)}</span>
            </div>
          ))}
        </>
      )}

      {(activeSettings.eod_show_total_cash || activeSettings.eod_show_total_card_sale || activeSettings.eod_show_total) && (
        <>
          <div className="eod-divider"></div>
          {activeSettings.eod_show_total_cash && (
            <div className="eod-row font-bold">
              <span>Total Cash:</span>
              <span>€{allPayments.filter(p => p.method.toLowerCase().includes('cash')).reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
            </div>
          )}
          {activeSettings.eod_show_total_card_sale && (
            <div className="eod-row font-bold">
              <span>Total Card Sale:</span>
              <span>€{allPayments.filter(p => p.method.toLowerCase().includes('card')).reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
            </div>
          )}
          {activeSettings.eod_show_total && (
            <div className="eod-row font-bold text-[16px] pt-1">
              <span>Total:</span>
              <span>€{totalSales.toFixed(2)}</span>
            </div>
          )}
        </>
      )}

      {comments && (
        <>
          <div className="eod-divider"></div>
          <div className="font-bold text-[14px]">Comments:</div>
          <div className="font-bold text-[14px] whitespace-pre-wrap mt-0.5">{comments}</div>
        </>
      )}

      <div className="eod-divider"></div>

      <div className="text-center text-[12px] mb-1 font-bold">
        {activeSettings.eod_footer_type === 'custom' 
          ? activeSettings.eod_footer_custom_text 
          : activeCompany.name}
      </div>

    </div>
  );
};

const EndOfDayA4: React.FC<PrintProps> = ({
  reportDate,
  startingBalance,
  totalSales,
  cashCounted,
  calculatedCash,
  difference,
  summaries,
  allPayments,
  comments
}) => {
  const { settings, company } = useThermalSettings();
  const activeSettings = settings || defaultThermalSettings;
  const activeCompany = company || defaultCompanyInfo;
  const now = new Date();

  return (
    <div 
      className="bg-white text-black p-8 font-sans" 
      id="eod-a4-report"
      style={{ 
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
          }
          #eod-a4-report, #eod-a4-report * {
            visibility: visible;
          }
          #eod-a4-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            background: white !important;
            color: black !important;
          }
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          border-radius: 4px;
          overflow: hidden;
        }
        .report-table th {
          background-color: #1a1a1a;
          color: white;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.05em;
          padding: 12px 10px;
          border: none;
        }
        .report-table td {
          border-bottom: 1px solid #eee;
          padding: 10px;
          font-size: 13px;
          color: #333;
        }
        .report-table tr:nth-child(even) {
          background-color: #fafafa;
        }
        .text-right {
          text-align: right !important;
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #1a1a1a;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .title-section h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #1a1a1a;
          letter-spacing: -0.02em;
        }
        .company-info {
          text-align: right;
        }
        .company-info .company-name {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 4px;
        }
        .company-info .company-details {
          font-size: 13px;
          color: #666;
          line-height: 1.4;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 30px;
          margin-bottom: 30px;
        }
        .summary-box {
          background: #fff;
          border: 1px solid #e5e7eb;
          padding: 20px;
          border-radius: 8px;
        }
        .summary-box h3 {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          color: #999;
          letter-spacing: 0.1em;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 10px;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f9fafb;
          font-size: 15px;
        }
        .stat-row.total {
          margin-top: 10px;
          padding-top: 15px;
          border-top: 2px solid #1a1a1a;
          font-weight: 800;
          font-size: 18px;
        }
      `}} />

      <div className="header-section">
        <div className="title-section">
          <h1>End of Day Report</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-bold rounded uppercase tracking-wider">Date</span>
            <span className="text-sm font-medium">{reportDate}</span>
          </div>
        </div>
        <div className="company-info">
          <div className="company-name">{activeCompany.name}</div>
          <div className="company-details">
            {activeCompany.address && <>{activeCompany.address}<br /></>}
            {activeCompany.city && <>{activeCompany.city}<br /></>}
            {activeCompany.phone && <>Tel: {activeCompany.phone}</>}
          </div>
        </div>
      </div>

      {(activeSettings.eod_show_cash_summary || activeSettings.eod_show_payment_type) && (
        <div className="summary-grid">
          {activeSettings.eod_show_cash_summary && (
            <div className="summary-box">
              <h3>Reconciliation</h3>
              <div className="stat-row">
                <span>Starting Balance</span>
                <span className="font-semibold text-gray-500">€{startingBalance.toFixed(2)}</span>
              </div>
              <div className="stat-row">
                <span>Calculated Sales</span>
                <span className="font-semibold text-blue-600">€{totalSales.toFixed(2)}</span>
              </div>
              <div className="stat-row">
                <span>Calculated Cash in Drawer</span>
                <span className="font-semibold text-blue-600">€{calculatedCash.toFixed(2)}</span>
              </div>
              <div className="stat-row">
                <span>Actual Cash Counted</span>
                <span className="font-semibold text-amber-600">€{cashCounted.toFixed(2)}</span>
              </div>
              <div className={`stat-row total ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>Difference</span>
                <span>€{difference.toFixed(2)}</span>
              </div>
            </div>
          )}

          {activeSettings.eod_show_payment_type && (
            <div className="summary-box">
              <h3>Payments by Type</h3>
              <div className="space-y-1">
                {summaries.map((s, idx) => (
                  <div key={idx} className="stat-row">
                    <span className="font-medium text-gray-700">{s.payment_type}</span>
                    <span className="font-bold">€{s.calculated.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-extrabold mb-4 uppercase tracking-[0.2em] text-gray-400">Transaction Breakdown</h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Time</th>
              <th>Reference</th>
              <th>Products / Items</th>
              <th>Method</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {allPayments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 italic text-gray-400 bg-white">No transactions recorded for this period.</td>
              </tr>
            ) : (
              allPayments.map((p, idx) => (
                <tr key={idx}>
                  <td className="font-medium text-sm">{p.user_name || 'Staff'}</td>
                  <td className="text-gray-500 text-sm">{p.paid_at ? new Date(p.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}</td>
                  <td className="font-mono text-xs">{p.invoice_number || 'DEPOSIT'}</td>
                  <td className="text-sm max-w-[260px] truncate" title={p.products_summary || p.customer_name || '--'}>
                    {p.products_summary || p.customer_name || '--'}
                  </td>
                  <td>
                    {Number(p.amount) < 0 || String(p.method).toLowerCase().includes('refund') ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold uppercase">REFUND</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-bold uppercase">{p.method}</span>
                    )}
                  </td>
                  <td className={`text-right font-bold text-base ${Number(p.amount) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {Number(p.amount) < 0 ? '-' : ''}€{Math.abs(Number(p.amount) || 0).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            {activeSettings.eod_show_total_cash && (
              <tr className="bg-gray-100 text-gray-900 font-bold border-t border-gray-300">
                <td colSpan={5} className="text-right py-2 uppercase text-xs tracking-widest">Total Cash</td>
                <td className="text-right py-2 text-base">€{allPayments.filter(p => p.method.toLowerCase().includes('cash')).reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}</td>
              </tr>
            )}
            {activeSettings.eod_show_total_card_sale && (
              <tr className="bg-gray-100 text-gray-900 font-bold border-t border-gray-300">
                <td colSpan={5} className="text-right py-2 uppercase text-xs tracking-widest">Total Card Sale</td>
                <td className="text-right py-2 text-base">€{allPayments.filter(p => p.method.toLowerCase().includes('card')).reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}</td>
              </tr>
            )}
            {activeSettings.eod_show_total && (
              <tr className="bg-gray-900 text-white font-bold">
                <td colSpan={5} className="text-right py-3 uppercase text-xs tracking-widest">Total Sales for Period</td>
                <td className="text-right py-3 text-xl">€{(Number(totalSales) || 0).toFixed(2)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {comments && (
        <div className="mt-8">
          <h3 className="text-[11px] font-bold mb-2 uppercase tracking-widest text-gray-500">Manager Notes</h3>
          <div className="p-4 bg-gray-50 border-l-4 border-gray-900 text-sm font-bold text-gray-900 leading-relaxed shadow-sm whitespace-pre-wrap">
            {comments}
          </div>
        </div>
      )}

      <div className="mt-24 pt-8 border-t border-gray-100 flex justify-between items-end">
        <div>
          <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Authorization</div>
          <div className="w-48 h-px bg-gray-300 mb-2"></div>
          <div className="text-[9px] text-gray-400 italic">Signature / Timestamp</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-gray-900 mb-1 tracking-tighter uppercase italic">
            {activeSettings.eod_footer_type === 'custom' ? activeSettings.eod_footer_custom_text : (activeCompany.name || 'iCover EPOS System')}
          </div>
          <div className="text-[9px] text-gray-400 tracking-widest uppercase">Certified Report • {now.toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
};

interface CashCounterProps {
  onClose: () => void;
  onConfirm: (total: number) => void;
  title?: string;
  initialTotal?: number;
}

const CashCounter: React.FC<CashCounterProps> = ({ onClose, onConfirm, title = 'Cash Drawer Counter' }) => {
  const denominations = [
    { label: '€500', value: 500 },
    { label: '€200', value: 200 },
    { label: '€100', value: 100 },
    { label: '€50', value: 50 },
    { label: '€20', value: 20 },
    { label: '€10', value: 10 },
    { label: '€5', value: 5 },
    { label: '€2', value: 2 },
    { label: '€1', value: 1 },
    { label: '€0.50', value: 0.5 },
    { label: '€0.20', value: 0.2 },
    { label: '€0.10', value: 0.1 },
    { label: '€0.05', value: 0.05 },
    { label: '€0.02', value: 0.02 },
    { label: '€0.01', value: 0.01 },
  ];

  const [counts, setCounts] = useState<Record<number, number>>(
    denominations.reduce((acc, d) => ({ ...acc, [d.value]: 0 }), {})
  );

  const total = Object.entries(counts).reduce((sum, [val, count]) => sum + (Number(val) * count), 0);

  return (
    <div className="no-print fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700 shadow-xl max-w-md w-full p-5 space-y-4 text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-slate-700 dark:text-slate-300" />
            <h3 className="font-bold text-slate-800 dark:text-white text-base">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 text-[14px] max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 font-semibold text-slate-600 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">
            <span>Denomination</span>
            <span className="text-center">Quantity</span>
            <span className="text-right">Total (€)</span>
          </div>

          <div className="space-y-1.5">
            {denominations.map((d) => (
              <div key={d.value} className="grid grid-cols-3 items-center py-1 border-b border-slate-50 dark:border-slate-800/60 last:border-none">
                <span className="font-mono text-slate-700 dark:text-slate-300">{d.label}</span>
                <input 
                  type="number" 
                  min="0"
                  value={counts[d.value] || ''} 
                  onChange={(e) => setCounts(prev => ({ ...prev, [d.value]: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="w-16 mx-auto text-center border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[14px] font-mono bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500"
                />
                <span className="text-right font-mono text-slate-800 dark:text-slate-100 font-medium">
                  €{(counts[d.value] * d.value).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between">
          <div className="text-[14px] text-slate-600 dark:text-slate-400">
            Counted Total: <span className="font-mono font-bold text-slate-900 dark:text-white text-base">€{total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[14px] font-medium rounded cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={() => onConfirm(total)} 
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-[14px] font-semibold rounded cursor-pointer"
            >
              Apply Count
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EndOfDayListModalProps {
  onClose: () => void;
  onSelectReport: (dateStr: string) => void;
}

const EndOfDayListModal: React.FC<EndOfDayListModalProps> = ({ onClose, onSelectReport }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports/eod-list')
      .then(res => res.json())
      .then(data => {
        setReports(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Failed to fetch EOD list:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="no-print fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700 shadow-xl max-w-2xl w-full p-5 space-y-4 text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <List size={18} className="text-slate-700 dark:text-slate-300" />
            <h3 className="font-bold text-slate-800 dark:text-white text-base">End of Day Reports History</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading reports history...</div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm italic">No saved End of Day reports found.</div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Staff</th>
                  <th className="py-2.5 px-3 text-right">Total Sales</th>
                  <th className="py-2.5 px-3 text-right">Cash Counted</th>
                  <th className="py-2.5 px-3 text-right">Difference</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reports.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-semibold font-mono text-slate-900 dark:text-white">{r.report_date}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{r.user_name || 'Staff'}</td>
                    <td className="py-2.5 px-3 text-right font-mono">€{(Number(r.total_sales) || 0).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">€{(Number(r.cash_counted) || 0).toFixed(2)}</td>
                    <td className={`py-2.5 px-3 text-right font-mono font-semibold ${Number(r.difference) < 0 ? 'text-red-600' : Number(r.difference) > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {Number(r.difference) >= 0 ? '+' : ''}€{(Number(r.difference) || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button 
                        type="button"
                        onClick={() => {
                          onSelectReport(r.report_date);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-semibold rounded cursor-pointer"
                      >
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-end">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Date Utility Functions
const padZero = (n: number) => String(n).padStart(2, '0');

const parseDateString = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
};

const formatDateString = (d: Date) => {
  const y = d.getFullYear();
  const m = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  return `${y}-${m}-${day}`;
};

const getTodayString = () => formatDateString(new Date());

const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateString(d);
};

const formatDisplayDate = (dateStr: string) => {
  const d = parseDateString(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

interface CalendarPickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

const CleanCalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  const selectedDateObj = parseDateString(selectedDate);
  const todayStr = getTodayString();

  const [viewYear, setViewYear] = useState(selectedDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDateObj.getMonth());

  useEffect(() => {
    const d = parseDateString(selectedDate);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [selectedDate]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const startDayOffset = (firstDay + 6) % 7;

  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: Array<{
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }> = [];

  for (let i = startDayOffset - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthDate = new Date(viewYear, viewMonth - 1, dayNum);
    const dateStr = formatDateString(prevMonthDate);
    calendarDays.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
    const curDate = new Date(viewYear, viewMonth, dayNum);
    const dateStr = formatDateString(curDate);
    calendarDays.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const nextMonthDate = new Date(viewYear, viewMonth + 1, dayNum);
    const dateStr = formatDateString(nextMonthDate);
    calendarDays.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  return (
    <div className="w-72 p-3 bg-[#f2f2f2] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 shadow-md z-50 text-sm select-none rounded">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#dfdfdf] dark:border-slate-800">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 text-black dark:text-slate-400 hover:bg-[#91c9f7] hover:text-black rounded cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-black dark:text-slate-100 text-sm">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 text-black dark:text-slate-400 hover:bg-[#91c9f7] hover:text-black rounded cursor-pointer"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 text-center text-[#707070] dark:text-slate-400 mb-1 text-xs font-semibold">
        {weekDays.map((day, idx) => (
          <div key={idx} className="h-6 flex items-center justify-center">
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {calendarDays.map((d, idx) => {
          let btnClass = 'w-8 h-8 mx-auto flex items-center justify-center text-sm rounded cursor-pointer ';
          if (d.isSelected) {
            btnClass += 'bg-[#91c9f7] text-black font-semibold border border-[#70aee0]';
          } else if (d.isToday) {
            btnClass += 'text-black font-semibold border border-[#91c9f7] hover:bg-[#91c9f7]';
          } else if (!d.isCurrentMonth) {
            btnClass += 'text-[#a0a0a0] dark:text-slate-600 hover:bg-[#91c9f7]/50 hover:text-black';
          } else {
            btnClass += 'text-black dark:text-slate-200 hover:bg-[#91c9f7] hover:text-black';
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelectDate(d.dateStr);
                onClose();
              }}
              className={btnClass}
            >
              {d.dayNumber}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-[#dfdfdf] dark:border-slate-800 flex justify-between items-center text-[#707070] dark:text-slate-400 text-sm">
        <button
          type="button"
          onClick={() => {
            onSelectDate(todayStr);
            onClose();
          }}
          className="px-2 py-0.5 text-black hover:bg-[#91c9f7] font-semibold rounded cursor-pointer"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-0.5 hover:bg-[#91c9f7] hover:text-black rounded cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default function EndOfDay() {
  const [reportDate, setReportDate] = useState(getTodayString());
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const cashInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && cashInputRef.current) {
      cashInputRef.current.focus();
    }
  }, [loading]);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const d = parseDateString(reportDate);
    d.setDate(d.getDate() - 1);
    setReportDate(formatDateString(d));
  };

  const handleNextDay = () => {
    const d = parseDateString(reportDate);
    d.setDate(d.getDate() + 1);
    setReportDate(formatDateString(d));
  };

  const [invoicePayments, setInvoicePayments] = useState<Payment[]>([]);
  const [otherMovements, setOtherMovements] = useState<Payment[]>([]);
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [comments, setComments] = useState('');

  // Cash Counter Modal State
  const [showCashCounter, setShowCashCounter] = useState<'counted' | 'starting' | null>(null);
  const [showEodListModal, setShowEodListModal] = useState(false);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'All' | 'Cash' | 'Card' | 'Other' | 'Refunds'>('All');

  // Counted values state
  const [countedValues, setCountedValues] = useState<Record<string, number>>({
    'Cash': 0,
    'Debit Card': 0,
    'Card': 0,
    'Credit Card': 0,
    'Customer Deposit': 0,
    'Other': 0,
    'Refunds': 0
  });

  const [printLayout, setPrintLayout] = useState<'thermal' | 'a4' | null>(null);
  const [showPrintOptions, setShowPrintOptions] = useState(false);

  useEffect(() => {
    if (printLayout) {
      const timer = setTimeout(() => {
        window.print();
        setTimeout(() => {
          setPrintLayout(null);
        }, 500);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [printLayout]);

  useEffect(() => {
    fetchEodData();
  }, [reportDate]);

  const fetchEodData = async () => {
    // Only show full loading if it's the very first time
    const isInitial = invoicePayments.length === 0 && otherMovements.length === 0;
    if (isInitial) setLoading(true);
    setIsRefreshing(true);
    
    try {
      const response = await fetch(`/api/reports/eod-data?date=${reportDate}`);
      const data = await response.json();
      setInvoicePayments(data.invoicePayments || []);
      setOtherMovements(data.otherMovements || []);
      if (data.startingBalance !== null && data.startingBalance !== undefined) {
        setStartingBalance(Number(data.startingBalance));
      } else {
        setStartingBalance(0);
      }
      if (data.cashCounted !== null && data.cashCounted !== undefined) {
        setCountedValues(prev => ({ ...prev, 'Cash': Number(data.cashCounted) }));
      } else {
        setCountedValues(prev => ({ ...prev, 'Cash': 0 }));
      }
      setComments(data.comments || '');
    } catch (error) {
      console.error('Error fetching EOD data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const updatePaymentMethod = async (paymentId: number, newMethod: string) => {
    // Optimistic Update
    const originalPayments = [...invoicePayments];
    setInvoicePayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, method: newMethod } : p
    ));

    try {
      const res = await fetch(`/api/invoices/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: newMethod })
      });
      if (!res.ok) {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error updating payment method:', error);
      setInvoicePayments(originalPayments); // Rollback on error
    }
  };

  const isRefundPayment = (p: Payment | any) => {
    return (Number(p.amount) || 0) < 0 || String(p.method || '').toLowerCase().includes('refund');
  };

  const getBasePaymentMethod = (method: string) => {
    const m = (method || '').toLowerCase();
    if (m.includes('cash')) return 'Cash';
    if (m.includes('card') || m.includes('debit') || m.includes('credit')) return 'Card';
    return 'Other';
  };

  const isCashPayment = (method: string) => {
    return getBasePaymentMethod(method) === 'Cash';
  };

  const isCardPayment = (method: string) => {
    return getBasePaymentMethod(method) === 'Card';
  };

  const isOtherPayment = (method: string) => {
    return getBasePaymentMethod(method) === 'Other';
  };

  const allPayments = [...invoicePayments, ...otherMovements];
  
  const filteredPayments = allPayments.filter(payment => {
    if (paymentTypeFilter === 'All') return true;
    if (paymentTypeFilter === 'Refunds') return isRefundPayment(payment);
    if (isRefundPayment(payment)) return false;
    return getBasePaymentMethod(payment.method) === paymentTypeFilter;
  });
  
  // Total Net Sales
  const totalSales = allPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  // Cash Sales (Net cash sales, including any cash refund reductions)
  const totalCashSales = allPayments
    .filter(p => isCashPayment(p.method))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Card Sales (Net card sales, including any card refund reductions)
  const totalCardSales = allPayments
    .filter(p => isCardPayment(p.method))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Other Sales
  const totalOtherSales = allPayments
    .filter(p => isOtherPayment(p.method))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalRefunds = allPayments
    .filter(p => isRefundPayment(p))
    .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);

  const cashCounted = countedValues['Cash'] || 0;
  const countedCashNet = cashCounted - startingBalance;
  const diffCash = countedCashNet - totalCashSales;

  const cardCounted = countedValues['Card'] || countedValues['Debit Card'] || 0;
  const diffCard = cardCounted - totalCardSales;

  const otherCounted = countedValues['Other'] || 0;
  const diffOther = otherCounted - totalOtherSales;

  const calculatedTotal = totalSales;
  const countedTotal = countedCashNet + cardCounted + otherCounted;
  const diffTotal = countedTotal - calculatedTotal;

  const formatMoney = (amount: number, showSign: boolean = false) => {
    const formatted = Math.abs(amount).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (showSign) {
      if (amount < -0.005) return `-€${formatted}`;
      if (amount > 0.005) return `+€${formatted}`;
      return `€${formatted}`;
    }
    return `€${formatted}`;
  };

  const getDiffBoxClass = (diff: number, isBold: boolean = false) => {
    let base = "diff-box font-mono text-right rounded px-2.5 py-1 text-[14px] sm:text-[16px] border transition-colors inline-block w-full ";
    if (isBold) base += "font-bold ";
    else base += "font-medium ";

    if (diff < -0.005) {
      return base + "bg-[#e2e8f0] dark:bg-slate-800 text-[#b91c1c] dark:text-red-400 border-[#cbd5e1] dark:border-slate-700";
    }
    if (diff > 0.005) {
      return base + "bg-[#e2e8f0] dark:bg-slate-800 text-[#15803d] dark:text-emerald-400 border-[#cbd5e1] dark:border-slate-700";
    }
    return base + "bg-[#e2e8f0] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[#cbd5e1] dark:border-slate-700";
  };

  const getCalculatedAmount = (type: string) => {
    if (type === 'Cash') return totalCashSales;
    if (type === 'Card') return totalCardSales;
    if (type === 'Other') return totalOtherSales;
    if (type === 'Refunds') return totalRefunds;
    return 0;
  };

  const paymentTypes = ['Cash', 'Card', 'Other', 'Refunds'];
  
  const summaries = paymentTypes.map(type => {
    const calculated = getCalculatedAmount(type);
    const counted = countedValues[type] || 0;
    return {
      payment_type: type,
      calculated,
      counted,
      difference: counted - calculated
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveEndOfDay = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const payload = {
        report_date: reportDate,
        starting_balance: startingBalance,
        cash_counted: cashCounted,
        calculated_cash: totalCashSales,
        difference: diffCash,
        total_sales: totalSales,
        total_deposits: 0,
        total_cash_in_drawer: cashCounted,
        comments: comments,
        payment_summaries: [
          {
            payment_type: 'Cash',
            calculated: totalCashSales,
            counted: countedCashNet,
            difference: diffCash
          },
          {
            payment_type: 'Card',
            calculated: totalCardSales,
            counted: cardCounted,
            difference: diffCard
          },
          ...(totalOtherSales > 0 || otherCounted > 0 ? [{
            payment_type: 'Other',
            calculated: totalOtherSales,
            counted: otherCounted,
            difference: diffOther
          }] : [])
        ]
      };

      const res = await fetch('/api/reports/eod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert('Failed to save End of Day report: ' + (err.error || 'Server error'));
      }
    } catch (e: any) {
      console.error('Error saving EOD:', e);
      alert('Error saving End of Day report: ' + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f2f2f2] dark:bg-slate-950 text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium tracking-wide">Loading End of Day Report...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f2f2f2] dark:bg-slate-950 text-black dark:text-slate-200 text-base font-sans">
      {/* Main Content Area */}
      <div className={`flex-1 overflow-auto p-3 sm:p-6 space-y-6 transition-opacity duration-150 ${isRefreshing ? 'opacity-80' : 'opacity-100'}`}>
        <div className="max-w-[1400px] mx-auto space-y-6">

          {/* Section 1: End of Day Report Top Summary Card */}
          <div className="w-full bg-white dark:bg-slate-900 border border-[#d8d8d8] dark:border-slate-800 rounded p-4 sm:p-6 shadow-sm flex flex-col gap-4">
            
            {/* Top Navigation Header inside Card */}
            <header className="flex items-center justify-between gap-3 pb-2 border-b border-transparent">
              {/* Title */}
              <h1 className="font-normal text-slate-800 dark:text-white tracking-tight flex items-center gap-2 shrink-0" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>
                <FileText size={24} className="text-[#00c9db] dark:text-sky-400" />
                <span>End of Day Report</span>
              </h1>

              {/* Date Badge with Clean Navigation */}
              <div className="relative inline-flex items-center shrink-0">
                <div className="bg-[#e75325] text-white px-4 py-1.5 text-[16px] font-semibold rounded shadow-sm flex items-center gap-2 min-w-[220px] justify-center">
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); handlePrevDay(); setShowCalendar(false); }}
                    className="hover:text-amber-200 transition cursor-pointer p-0.5" 
                    title="Previous Day"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); setShowCalendar(prev => !prev); }}
                    className="flex items-center gap-1.5 font-mono cursor-pointer hover:underline"
                    title="Choose Date"
                  >
                    <Calendar size={16} />
                    <span id="headerDate">{reportDate}</span>
                    <ChevronDown size={16} className={`opacity-80 transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
                  </button>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); handleNextDay(); setShowCalendar(false); }}
                    className="hover:text-amber-200 transition cursor-pointer p-0.5" 
                    title="Next Day"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {showCalendar && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50" onClick={(e) => e.stopPropagation()}>
                      <CleanCalendarPicker 
                        selectedDate={reportDate}
                        onSelectDate={(newDate) => { setReportDate(newDate); setShowCalendar(false); }}
                        onClose={() => setShowCalendar(false)}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="no-print flex items-center gap-2 relative">
                {isRefreshing && (
                  <div className="absolute -top-1 -left-2 -translate-y-full flex items-center gap-1.5 px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-medium rounded-full shadow-sm">
                    <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-ping"></div>
                    <span>Syncing</span>
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={() => setShowEodListModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[14px] font-medium border border-slate-300 dark:border-slate-600 rounded shadow-sm transition cursor-pointer"
                >
                  <List size={16} className="text-slate-500 dark:text-slate-400" />
                  <span>End of Day List</span>
                </button>

                <div className="relative inline-block">
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPrintOptions(prev => !prev);
                    }} 
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#00c9db] hover:bg-[#00b2c2] text-slate-900 text-[14px] font-semibold rounded shadow-sm transition cursor-pointer"
                  >
                    <Printer size={16} />
                    <span>Print</span>
                    <ChevronDown size={14} className={`ml-0.5 transition-transform ${showPrintOptions ? 'rotate-180' : ''}`} />
                  </button>

                  {showPrintOptions && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowPrintOptions(false)} />
                      <div 
                        className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1.5 rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button 
                          type="button"
                          onClick={() => {
                            setShowPrintOptions(false);
                            setPrintLayout('a4');
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[14px] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer font-medium transition-colors"
                        >
                          <FileText size={16} className="text-slate-500" />
                          <span>Full Page (A4 PDF)</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setShowPrintOptions(false);
                            setPrintLayout('thermal');
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[14px] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer font-medium transition-colors"
                        >
                          <Printer size={16} className="text-slate-500" />
                          <span>Thermal Slip (80mm)</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

            {/* Reconciliation Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse border border-[#dcdcdc] dark:border-slate-800 text-[15px]">
                <colgroup>
                  <col className="w-[35%] sm:w-[40%]" />
                  <col className="w-[20%] sm:w-[20%]" />
                  <col className="w-[20%] sm:w-[20%]" />
                  <col className="w-[25%] sm:w-[20%]" />
                </colgroup>

                <tbody>
                  {/* Row 1: Cash Counted */}
                  <tr className="bg-[#e9ecef] dark:bg-slate-800">
                    <td className="border border-[#dcdcdc] dark:border-slate-700 text-right font-medium text-slate-700 dark:text-slate-300 pr-4 py-2 px-3.5">
                      Cash Counted :
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 bg-[#f8f9fa] dark:bg-slate-800/40 py-2 px-3.5"></td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 p-1.5">
                      <input 
                        ref={cashInputRef}
                        type="number" 
                        step="0.01" 
                        id="inputCashCounted"
                        value={cashCounted || ''} 
                        onChange={(e) => setCountedValues(prev => ({ ...prev, Cash: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                        className="w-full text-right px-3 py-1.5 text-[16px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono text-slate-900 dark:text-white"
                      />
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 p-1.5">
                      <button 
                        type="button" 
                        onClick={() => setShowCashCounter('counted')}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[14px] border border-slate-300 dark:border-slate-600 rounded shadow-sm whitespace-nowrap cursor-pointer transition flex items-center justify-center gap-1.5 w-full sm:w-auto"
                      >
                        <Calculator size={15} className="text-slate-500" />
                        <span>Cash Drawer Counter</span>
                      </button>
                    </td>
                  </tr>

                  {/* Row 2: Starting Balance */}
                  <tr className="bg-white dark:bg-slate-900">
                    <td className="border border-[#dcdcdc] dark:border-slate-700 text-right font-medium text-slate-700 dark:text-slate-300 pr-4 py-2 px-3.5">
                      Starting Balance :
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 py-2 px-3.5"></td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 p-1.5">
                      <input 
                        type="number" 
                        step="0.01" 
                        id="inputStartingBalance"
                        value={startingBalance || ''} 
                        onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full text-right px-3 py-1.5 text-[16px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono text-slate-900 dark:text-white"
                      />
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 p-1.5">
                      <button 
                        type="button" 
                        onClick={() => setShowCashCounter('starting')}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[14px] border border-slate-300 dark:border-slate-600 rounded shadow-sm whitespace-nowrap cursor-pointer transition flex items-center justify-center gap-1.5 w-full sm:w-auto"
                      >
                        <Calculator size={15} className="text-slate-500" />
                        <span>Cash Drawer Counter</span>
                      </button>
                    </td>
                  </tr>

                  {/* Row 3: Calculated Cash Summary */}
                  <tr className="bg-[#f8f9fa] dark:bg-slate-800/60 font-semibold text-slate-900 dark:text-slate-100">
                    <td className="border border-[#dcdcdc] dark:border-slate-700 text-right font-bold text-slate-900 dark:text-slate-100 pr-4 py-2 px-3.5">
                      Calculated Cash :
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 text-right font-mono font-bold text-slate-900 dark:text-white py-2 px-3.5 text-[16px]" id="dispCalculatedCash">
                      {formatMoney(totalCashSales)}
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 text-right font-mono font-bold text-slate-900 dark:text-white py-2 px-3.5 text-[16px]" id="dispCountedCashNet">
                      {formatMoney(countedCashNet)}
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 p-1.5">
                      <div className={getDiffBoxClass(diffCash, true)} id="dispDiffCash">
                        {formatMoney(diffCash, true)}
                      </div>
                    </td>
                  </tr>

                  {/* Section Header: Payment Type */}
                  <tr className="bg-[#e9ecef] dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 text-[14px] uppercase tracking-wider">
                    <th className="border border-[#dcdcdc] dark:border-slate-700 text-left font-semibold py-2.5 px-3.5">Payment Type</th>
                    <th className="border border-[#dcdcdc] dark:border-slate-700 text-right font-semibold py-2.5 px-3.5">Calculated</th>
                    <th className="border border-[#dcdcdc] dark:border-slate-700 text-right font-semibold py-2.5 px-3.5">Counted</th>
                    <th className="border border-[#dcdcdc] dark:border-slate-700 text-right font-semibold py-2.5 px-3.5">Difference</th>
                  </tr>

                  {/* Row: Debit Card */}
                  <tr className="bg-white dark:bg-slate-900">
                    <td className="border border-[#dcdcdc] dark:border-slate-700 text-slate-800 dark:text-slate-200 font-normal py-2 px-3.5">
                      Debit Card
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 text-right font-mono text-slate-800 dark:text-slate-200 py-2 px-3.5" id="dispCalculatedCard">
                      {formatMoney(totalCardSales)}
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 p-1.5">
                      <input 
                        type="number" 
                        step="0.01" 
                        id="inputCardCounted"
                        value={cardCounted || ''} 
                        onChange={(e) => setCountedValues(prev => ({ ...prev, Card: parseFloat(e.target.value) || 0, 'Debit Card': parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                        className="w-full text-right px-3 py-1.5 text-[16px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono text-slate-900 dark:text-white"
                      />
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 p-1.5">
                      <div className={getDiffBoxClass(diffCard)} id="dispDiffCard">
                        {formatMoney(diffCard, true)}
                      </div>
                    </td>
                  </tr>

                  {/* Row: Other Payments if any other sales exist or are counted */}
                  {(totalOtherSales > 0 || otherCounted > 0) && (
                    <tr className="bg-[#f8f9fa] dark:bg-slate-800/40">
                      <td className="border border-[#dcdcdc] dark:border-slate-700 text-slate-800 dark:text-slate-200 font-normal py-2 px-3.5">
                        Other Payments
                      </td>
                      <td className="border border-[#dcdcdc] dark:border-slate-700 text-right font-mono text-slate-800 dark:text-slate-200 py-2 px-3.5">
                        {formatMoney(totalOtherSales)}
                      </td>
                      <td className="border border-[#dcdcdc] dark:border-slate-700 p-1.5">
                        <input 
                          type="number" 
                          step="0.01" 
                          value={otherCounted || ''} 
                          onChange={(e) => setCountedValues(prev => ({ ...prev, Other: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                          className="w-full text-right px-3 py-1.5 text-[16px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="border border-[#dcdcdc] dark:border-slate-700 p-1.5">
                        <div className={getDiffBoxClass(diffOther)}>
                          {formatMoney(diffOther, true)}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Row: Total */}
                  <tr className="bg-[#f8f9fa] dark:bg-slate-800/80 font-semibold text-slate-800 dark:text-slate-100">
                    <td className="border border-[#dcdcdc] dark:border-slate-700 text-right pr-4 py-2.5 px-3.5">
                      Total :
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 text-right font-mono font-bold text-[17px] py-2.5 px-3.5" id="dispCalculatedTotal">
                      {formatMoney(calculatedTotal)}
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 text-right font-mono font-bold text-[17px] py-2.5 px-3.5" id="dispCountedTotal">
                      {formatMoney(countedTotal)}
                    </td>
                    <td className="border border-[#dcdcdc] dark:border-slate-700 p-1.5">
                      <div className={getDiffBoxClass(diffTotal, true)} id="dispDiffTotal">
                        {formatMoney(diffTotal, true)}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Comments / Discrepancies Textarea & Saving Button */}
            <div className="flex flex-col sm:flex-row items-start gap-4 pt-2">
              <label htmlFor="comments" className="w-28 text-left sm:text-right font-medium text-slate-700 dark:text-slate-300 text-[16px] pt-2 shrink-0">
                Comments :
              </label>
              <div className="w-full flex flex-col items-end gap-3">
                <textarea 
                  id="comments" 
                  rows={2} 
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Enter reconciliation notes or register discrepancies..." 
                  className="w-full border border-slate-300 dark:border-slate-700 rounded p-2.5 text-[16px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-slate-800 transition shadow-inner"
                ></textarea>

                {/* Save End of Day Button in Bottom Right */}
                <div className="flex items-center gap-3">
                  {saveSuccess && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 size={16} /> Saved Successfully
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveEndOfDay}
                    disabled={isSaving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded shadow transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Detailed Transaction Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 overflow-hidden rounded">
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-[#e5e5e5] dark:border-slate-800 flex items-center justify-between px-6">
              <h2 className="text-base font-semibold text-black dark:text-white">Transaction Breakdown</h2>
              <div className="flex items-center gap-2">
                <select 
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-black dark:text-slate-200 text-sm font-medium outline-none focus:border-[#91c9f7] rounded cursor-pointer"
                >
                  <option value="All">All Payments ({allPayments.length})</option>
                  <option value="Cash">Cash ({allPayments.filter(p => isCashPayment(p.method) && !isRefundPayment(p)).length})</option>
                  <option value="Card">Card ({allPayments.filter(p => isCardPayment(p.method) && !isRefundPayment(p)).length})</option>
                  <option value="Other">Other ({allPayments.filter(p => isOtherPayment(p.method) && !isRefundPayment(p)).length})</option>
                  <option value="Refunds">Refunds ({allPayments.filter(p => isRefundPayment(p)).length})</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px] bg-white dark:bg-slate-900">
                <thead>
                  <tr className="bg-white dark:bg-slate-900 text-[#707070] dark:text-slate-300 font-semibold border-b border-[#e5e5e5] dark:border-slate-800 text-[13px]">
                    <th className="py-3 px-6">Staff</th>
                    <th className="py-3 px-6">Time</th>
                    <th className="py-3 px-6">Invoice / Ref</th>
                    <th className="py-3 px-6">Products / Items</th>
                    <th className="py-3 px-6">Payment Method</th>
                    <th className="py-3 px-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ececec] dark:divide-slate-800/50 bg-white dark:bg-slate-900">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#a0a0a0] text-[14px]">
                        No transactions found for this selection.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment, idx) => {
                      const isRefund = isRefundPayment(payment);
                      const baseMethod = getBasePaymentMethod(payment.method);

                      return (
                        <tr key={idx} className={isRefund ? 'bg-red-50/30 dark:bg-red-950/10' : ''}>
                          <td className="py-3 px-6 text-black dark:text-slate-300 font-medium">
                            {payment.user_name || 'Staff'}
                          </td>
                          <td className="py-3 px-6 font-mono text-[#707070]">
                            {payment.paid_at ? new Date(payment.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                          </td>
                          <td className="py-3 px-6 font-mono font-medium">
                            <span className={isRefund ? 'text-rose-700 font-semibold' : 'text-blue-700 dark:text-blue-400'}>
                              {payment.invoice_number || 'Deposit'}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-black dark:text-slate-300 max-w-[280px] truncate" title={payment.products_summary || payment.customer_name || '--'}>
                            {payment.products_summary || payment.customer_name || 'Walk-in Customer'}
                          </td>
                          <td className="py-2.5 px-6">
                            <div className="flex items-center gap-1.5">
                              {isRefund && (
                                <span className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold uppercase">
                                  Refund
                                </span>
                              )}
                              <select 
                                value={baseMethod}
                                onChange={(e) => {
                                  const newBase = e.target.value;
                                  const targetMethod = isRefund ? `Refund (${newBase})` : newBase;
                                  updatePaymentMethod(payment.id, targetMethod);
                                }}
                                className={`px-2.5 py-1 text-[13px] bg-white dark:bg-slate-800 outline-none cursor-pointer rounded transition-colors ${
                                  isRefund 
                                    ? 'border border-rose-400 text-rose-700 dark:text-rose-400 dark:border-rose-700' 
                                    : baseMethod === 'Cash'
                                    ? 'border border-emerald-500 text-black dark:text-emerald-300 dark:border-emerald-700'
                                    : baseMethod === 'Card'
                                    ? 'border border-blue-500 text-black dark:text-blue-300 dark:border-blue-700'
                                    : 'border border-amber-500 text-black dark:text-amber-300 dark:border-amber-700'
                                }`}
                              >
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </td>
                          <td className={`py-3 px-6 text-right font-mono font-medium text-[15px] ${isRefund ? 'text-rose-700 font-semibold' : 'text-black dark:text-white'}`}>
                            {isRefund ? '-' : ''}€{Math.abs(Number(payment.amount) || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredPayments.length > 0 && (
                  <tfoot>
                    <tr className="bg-white dark:bg-slate-900 border-t border-[#e5e5e5] dark:border-slate-800 font-semibold">
                      <td colSpan={5} className="py-3 px-6 text-right text-[15px] uppercase text-[#707070] dark:text-slate-300">
                        {paymentTypeFilter === 'All' ? 'Total' : `Total (${paymentTypeFilter})`}
                      </td>
                      <td className="py-3 px-6 text-right text-[17px] font-mono text-black dark:text-blue-400">
                        €{filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Counter Modal */}
      {showCashCounter && (
        <CashCounter 
          title={showCashCounter === 'starting' ? 'Starting Balance Counter' : 'Cash Drawer Physical Counter'}
          onClose={() => setShowCashCounter(null)}
          onConfirm={(total) => {
            if (showCashCounter === 'counted') {
              setCountedValues(prev => ({ ...prev, 'Cash': total }));
            } else {
              setStartingBalance(total);
            }
            setShowCashCounter(null);
          }}
        />
      )}

      {/* End of Day Reports History Modal */}
      {showEodListModal && (
        <EndOfDayListModal 
          onClose={() => setShowEodListModal(false)}
          onSelectReport={(dateStr) => {
            setReportDate(dateStr);
          }}
        />
      )}

      {/* Print Layouts (Hidden from screen, only visible in print mode) */}
      {printLayout === 'thermal' && (
        <div className="hidden print:block fixed inset-0 z-[9999] bg-white">
          <EndOfDayThermal 
            reportDate={reportDate}
            startingBalance={startingBalance}
            totalSales={totalSales}
            cashCounted={cashCounted}
            calculatedCash={totalCashSales + startingBalance}
            difference={diffCash}
            summaries={summaries}
            allPayments={allPayments}
            comments={comments}
          />
        </div>
      )}

      {printLayout === 'a4' && (
        <div className="hidden print:block fixed inset-0 z-[9999] bg-white">
          <EndOfDayA4 
            reportDate={reportDate}
            startingBalance={startingBalance}
            totalSales={totalSales}
            cashCounted={cashCounted}
            calculatedCash={totalCashSales + startingBalance}
            difference={diffCash}
            summaries={summaries}
            allPayments={allPayments}
            comments={comments}
          />
        </div>
      )}
    </div>
  );
}
