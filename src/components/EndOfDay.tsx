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
  Calendar
} from 'lucide-react';
import { Payment, ClosingReport, ClosingReportPayment } from '../types';
import { useThermalSettings } from '../hooks/useThermalSettings';

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
  const now = new Date();

  if (!settings || !company) return null;

  return (
    <div 
      className="thermal-receipt bg-white text-black mx-auto p-4 font-mono text-[12px] leading-tight" 
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
          margin-bottom: 2px;
        }
        .eod-header {
          text-align: center;
          margin-bottom: 10px;
        }
        .eod-title {
          font-weight: bold;
          font-size: 14px;
          text-transform: uppercase;
        }
      `}} />

      <div className="eod-header">
        <div className="eod-title">End of Day Report</div>
        <div>{company.name}</div>
        <div>Date: {reportDate}</div>
        <div>Printed: {now.toLocaleString()}</div>
      </div>

      <div className="eod-divider"></div>

      <div className="eod-row">
        <span>Starting Bal:</span>
        <span>€{startingBalance.toFixed(2)}</span>
      </div>
      <div className="eod-row">
        <span>Total Sales:</span>
        <span>€{totalSales.toFixed(2)}</span>
      </div>

      {settings.eod_show_cash_summary && (
        <>
          <div className="eod-divider"></div>
          <div className="eod-row font-bold">
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

      {settings.eod_show_payment_type && (
        <>
          <div className="eod-divider"></div>
          <div className="eod-row font-bold">
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

      {(settings.eod_show_total_cash || settings.eod_show_total_card_sale || settings.eod_show_total) && (
        <>
          <div className="eod-divider"></div>
          {settings.eod_show_total_cash && (
            <div className="eod-row font-bold">
              <span>Total Cash:</span>
              <span>€{allPayments.filter(p => p.method.toLowerCase().includes('cash')).reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
            </div>
          )}
          {settings.eod_show_total_card_sale && (
            <div className="eod-row font-bold">
              <span>Total Card Sale:</span>
              <span>€{allPayments.filter(p => p.method.toLowerCase().includes('card')).reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
            </div>
          )}
          {settings.eod_show_total && (
            <div className="eod-row font-bold text-[13px]">
              <span>Total:</span>
              <span>€{totalSales.toFixed(2)}</span>
            </div>
          )}
        </>
      )}

      {comments && (
        <>
          <div className="eod-divider"></div>
          <div className="font-bold">Comments:</div>
          <div className="italic">{comments}</div>
        </>
      )}

      <div className="eod-divider"></div>

      <div className="text-center text-[10px] italic mb-1 font-bold">
        {settings.eod_footer_type === 'custom' 
          ? settings.eod_footer_custom_text 
          : company.name}
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
  const now = new Date();

  if (!settings || !company) return null;

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
          <div className="company-name">{company.name}</div>
          <div className="company-details">
            {company.address}<br />
            {company.city}<br />
            Tel: {company.phone}
          </div>
        </div>
      </div>

      {(settings.eod_show_cash_summary || settings.eod_show_payment_type) && (
        <div className="summary-grid">
          {settings.eod_show_cash_summary && (
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

          {settings.eod_show_payment_type && (
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
              <th>Customer</th>
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
                  <td className="text-sm">{p.customer_name || '--'}</td>
                  <td>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-bold uppercase">{p.method}</span>
                  </td>
                  <td className="text-right font-bold text-gray-900 text-base">€{(Number(p.amount) || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            {settings.eod_show_total_cash && (
              <tr className="bg-gray-100 text-gray-900 font-bold border-t border-gray-300">
                <td colSpan={5} className="text-right py-2 uppercase text-xs tracking-widest">Total Cash</td>
                <td className="text-right py-2 text-base">€{allPayments.filter(p => p.method.toLowerCase().includes('cash')).reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}</td>
              </tr>
            )}
            {settings.eod_show_total_card_sale && (
              <tr className="bg-gray-100 text-gray-900 font-bold border-t border-gray-300">
                <td colSpan={5} className="text-right py-2 uppercase text-xs tracking-widest">Total Card Sale</td>
                <td className="text-right py-2 text-base">€{allPayments.filter(p => p.method.toLowerCase().includes('card')).reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}</td>
              </tr>
            )}
            {settings.eod_show_total && (
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
          <h3 className="text-[10px] font-bold mb-2 uppercase tracking-widest text-gray-400">Manager Notes</h3>
          <div className="p-4 bg-gray-50 border-l-4 border-gray-900 text-sm italic text-gray-700 leading-relaxed shadow-sm">
            "{comments}"
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
            {settings.eod_footer_type === 'custom' ? settings.eod_footer_custom_text : (company.name || 'iCover EPOS System')}
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
  initialTotal?: number;
}

const CashCounter: React.FC<CashCounterProps> = ({ onClose, onConfirm }) => {
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md flex flex-col max-h-[85vh] rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cash Drawer Calculator</h3>
              <p className="text-xs text-slate-500">Count denominations</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/50">
          {denominations.map((d) => (
            <div key={d.value} className="flex items-center justify-between pt-1.5 pb-0.5 first:pt-0">
              <span className="text-sm font-semibold w-16 text-slate-800 dark:text-slate-200">{d.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">×</span>
                <input 
                  type="number" 
                  min="0"
                  value={counts[d.value] || ''}
                  onChange={(e) => setCounts(prev => ({ ...prev, [d.value]: parseInt(e.target.value) || 0 }))}
                  className="w-20 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-right text-sm outline-none text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 font-mono font-medium"
                  placeholder="0"
                />
                <span className="text-sm font-mono font-bold w-24 text-right text-slate-900 dark:text-slate-100">
                  €{(counts[d.value] * d.value).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Total Counted</p>
            <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">€{total.toFixed(2)}</p>
          </div>
          <button 
            onClick={() => onConfirm(total)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-sm transition-all cursor-pointer"
          >
            Apply Total
          </button>
        </div>
      </div>
    </div>
  );
};

export default function EndOfDay() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const cashInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && cashInputRef.current) {
      cashInputRef.current.focus();
    }
  }, [loading]);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const d = new Date(reportDate);
    d.setDate(d.getDate() - 1);
    setReportDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(reportDate);
    d.setDate(d.getDate() + 1);
    setReportDate(d.toISOString().split('T')[0]);
  };

  const [invoicePayments, setInvoicePayments] = useState<Payment[]>([]);
  const [otherMovements, setOtherMovements] = useState<Payment[]>([]);
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [comments, setComments] = useState('');

  // Cash Counter Modal State
  const [showCashCounter, setShowCashCounter] = useState<'counted' | 'starting' | null>(null);

  // Counted values state
  const [countedValues, setCountedValues] = useState<Record<string, number>>({
    'Cash': 0,
    'Debit Card': 0,
    'Credit Card': 0,
    'Customer Deposit': 0,
    'Refunds': 0
  });

  const [printLayout, setPrintLayout] = useState<'thermal' | 'a4' | null>(null);
  const [showPrintOptions, setShowPrintOptions] = useState(false);

  useEffect(() => {
    if (printLayout) {
      const timer = setTimeout(() => {
        window.print();
        setPrintLayout(null);
      }, 500);
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
      }
      if (data.comments) {
        setComments(data.comments);
      }
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
      // Optional: fetch fresh data to be sure, but optimistic is enough for immediate feedback
      // fetchEodData();
    } catch (error) {
      console.error('Error updating payment method:', error);
      setInvoicePayments(originalPayments); // Rollback on error
    }
  };

  const isCashPayment = (method: string) => {
    const m = (method || '').toLowerCase();
    return m === 'cash' || m.includes('cash');
  };

  const isCardPayment = (method: string) => {
    const m = (method || '').toLowerCase();
    return m.includes('card') || m.includes('debit') || m.includes('credit');
  };

  const isWalletPayment = (method: string) => {
    const m = (method || '').toLowerCase();
    return m.includes('wallet');
  };

  const allPayments = [...invoicePayments, ...otherMovements];
  const totalSales = allPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalRefunds = allPayments
    .filter(p => (Number(p.amount) || 0) < 0)
    .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);
  
  const cashFromInvoices = invoicePayments
    .filter(p => isCashPayment(p.method))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
  const cashFromDeposits = otherMovements
    .filter(p => isCashPayment(p.method))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalCashSales = cashFromInvoices + cashFromDeposits;
  const calculatedCashTotal = totalCashSales + startingBalance;
  const cashCounted = countedValues['Cash'] || 0;
  const cashDifference = cashCounted - calculatedCashTotal;

  const getCalculatedAmount = (type: string) => {
    if (type === 'Cash') return totalCashSales;
    
    if (type === 'Card') {
      return allPayments
        .filter(p => isCardPayment(p.method))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    }
    
    if (type === 'Wallet') {
      return allPayments
        .filter(p => isWalletPayment(p.method))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    }
    
    if (type === 'Refunds') {
      return allPayments
        .filter(p => (Number(p.amount) || 0) < 0)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    }
    
    if (type === 'Other') {
      // Catch-all for any method that isn't Cash, Card, or Wallet
      return allPayments
        .filter(p => !isCashPayment(p.method) && !isCardPayment(p.method) && !isWalletPayment(p.method))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    }
    return 0;
  };

  const paymentTypes = ['Cash', 'Card', 'Wallet', 'Refunds', 'Other'];
  
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

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const payload = {
        report_date: reportDate,
        starting_balance: startingBalance,
        cash_counted: cashCounted,
        calculated_cash: totalCashSales,
        difference: cashDifference,
        total_sales: totalSales,
        total_deposits: cashFromDeposits, // This might need a broader 'total manual movements' if needed
        total_cash_in_drawer: cashCounted,
        comments: comments,
        payment_summaries: summaries.map(s => ({
          payment_type: s.payment_type,
          calculated: s.calculated,
          counted: s.counted || 0,
          difference: s.difference
        }))
      };

      const res = await fetch('/api/reports/eod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save');
      
      setMessage({ type: 'success', text: 'End of day report saved successfully!' });
    } catch (error) {
      console.error('Error saving EOD:', error);
      setMessage({ type: 'error', text: 'Failed to save report.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium tracking-wide">Loading End of Day Report...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-100/60 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm">
      {/* Header Bar */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 px-6 py-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title & Date Selector */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                End of Day Closing Report
              </h1>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button 
                onClick={handlePrevDay}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 transition-colors"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="relative px-3 py-1 flex items-center gap-2 cursor-pointer font-medium text-xs text-slate-700 dark:text-slate-200">
                <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
                <span>{reportDate.split('-').reverse().join('-')}</span>
                <input 
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              <button 
                onClick={handleNextDay}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 transition-colors"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          
          {/* Top Actions */}
          <div className="flex items-center gap-3">
            {isRefreshing && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium">
                <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-ping"></div>
                <span>Syncing</span>
              </div>
            )}

            {/* Print Options */}
            <div className="relative">
              <button 
                onClick={() => setShowPrintOptions(!showPrintOptions)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-medium text-xs rounded-lg shadow-xs transition-colors"
              >
                <Printer size={15} />
                <span>Print Report</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showPrintOptions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPrintOptions(false)} />
                  <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1.5">
                    <button 
                      onClick={() => { setPrintLayout('a4'); setShowPrintOptions(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors text-left"
                    >
                      <FileText size={14} />
                      <span>Full Page (A4 PDF)</span>
                    </button>
                    <button 
                      onClick={() => { setPrintLayout('thermal'); setShowPrintOptions(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors text-left"
                    >
                      <Printer size={14} />
                      <span>Thermal Slip (80mm)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Save Button */}
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-xs ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="font-medium text-sm">{message.text}</span>
              <button onClick={() => setMessage(null)} className="ml-auto text-xs underline font-semibold cursor-pointer">Dismiss</button>
            </div>
          )}

          {/* KPI Metrics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Sales */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Sales</p>
              <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">€{totalSales.toFixed(2)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{allPayments.length} recorded payments</p>
            </div>

            {/* Opening Balance */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Opening Balance</p>
              <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 mt-1">€{startingBalance.toFixed(2)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Starting drawer float</p>
            </div>

            {/* Expected Cash */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Expected Cash</p>
              <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 mt-1">€{calculatedCashTotal.toFixed(2)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Opening + Cash Sales</p>
            </div>

            {/* Cash Counted */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cash Counted</p>
              <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-1">€{cashCounted.toFixed(2)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Actual drawer total</p>
            </div>

            {/* Cash Difference */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cash Difference</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-2xl font-mono font-bold ${
                  Math.abs(cashDifference) < 0.01 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : cashDifference > 0 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {cashDifference >= 0 ? '+' : ''}€{cashDifference.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {Math.abs(cashDifference) < 0.01 ? '✓ Balanced' : cashDifference > 0 ? 'Surplus' : 'Shortage'}
              </p>
            </div>
          </div>

          {/* Cash Reconciliation Form & Payment Methods Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Drawer Cash Count Form */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Euro size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cash Drawer Entry</h2>
                  <p className="text-xs text-slate-500">Record cash counted and starting float</p>
                </div>
              </div>

              {/* Cash Drawer Counted */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Cash Drawer Counted
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">€</span>
                    <input 
                      ref={cashInputRef}
                      type="number" 
                      value={countedValues['Cash'] || ''}
                      onChange={(e) => setCountedValues(prev => ({ ...prev, 'Cash': parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold text-base outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                  <button 
                    onClick={() => setShowCashCounter('counted')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Open Denomination Calculator"
                  >
                    <Calculator size={15} />
                    <span>Count</span>
                  </button>
                </div>
              </div>

              {/* Starting Balance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Starting Balance (Opening Float)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">€</span>
                    <input 
                      type="number" 
                      value={startingBalance || ''}
                      onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold text-base outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                  <button 
                    onClick={() => setShowCashCounter('starting')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Open Denomination Calculator"
                  >
                    <Calculator size={15} />
                    <span>Count</span>
                  </button>
                </div>
              </div>

              {/* Manager Notes */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Closing Notes & Remarks
                </label>
                <textarea 
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full min-h-[80px] p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-colors"
                  placeholder="Add any discrepancies, drawer notes, or comments..."
                />
              </div>
            </div>

            {/* Right: Payment Breakdown Table */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Payment Method Summary</h2>
                    <p className="text-xs text-slate-500">Reconcile calculated system receipts with counted totals</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th className="py-1.5 px-3">Method</th>
                        <th className="py-1.5 px-3 text-right">System Calculated</th>
                        <th className="py-1.5 px-3 text-right">Counted / Confirmed</th>
                        <th className="py-1.5 px-3 text-right">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {/* Cash Row */}
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-1.5 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Cash Sales
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          €{totalCashSales.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          €{((cashCounted - startingBalance) > 0 ? (cashCounted - startingBalance) : 0).toFixed(2)}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            Math.abs(cashDifference) < 0.01 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' 
                              : cashDifference > 0 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' 
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                          }`}>
                            {cashDifference >= 0 ? '+' : ''}€{cashDifference.toFixed(2)}
                          </span>
                        </td>
                      </tr>

                      {/* Other Methods */}
                      {summaries.filter(s => s.payment_type !== 'Cash').map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-1.5 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              s.payment_type === 'Card' ? 'bg-blue-500' : s.payment_type === 'Wallet' ? 'bg-purple-500' : 'bg-amber-500'
                            }`}></span>
                            {s.payment_type}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                            €{s.calculated.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <div className="relative inline-block w-28">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">€</span>
                              <input 
                                type="number" 
                                value={s.counted || ''}
                                onChange={(e) => setCountedValues(prev => ({ ...prev, [s.payment_type]: parseFloat(e.target.value) || 0 }))}
                                className="w-full pl-5 pr-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-right font-mono font-semibold text-xs outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500"
                                placeholder="0.00"
                              />
                            </div>
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-semibold">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              Math.abs(s.difference) < 0.01 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' 
                                : s.difference > 0 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' 
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                            }`}>
                              {s.difference >= 0 ? '+' : ''}€{s.difference.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Revenue Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-600 dark:text-slate-300">Total System Revenue</span>
                <span className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">€{totalSales.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Detailed Transaction Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Transaction Breakdown</h2>
                <p className="text-sm text-slate-500">All registered invoice and deposit payments for this date</p>
              </div>
              <span className="text-sm font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300">
                {allPayments.length} Transactions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 px-4">Staff / Operator</th>
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Invoice / Ref</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Payment Method</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {allPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-base">
                        No transactions or payments registered for this date.
                      </td>
                    </tr>
                  ) : (
                    allPayments.map((payment, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {payment.user_name || 'Staff'}
                        </td>
                        <td className="py-2 px-4 text-sm font-mono text-slate-500">
                          {payment.paid_at ? new Date(payment.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                        </td>
                        <td className="py-2 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {payment.invoice_number || 'Deposit'}
                        </td>
                        <td className="py-2 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {payment.customer_name || 'Walk-in Customer'}
                        </td>
                        <td className="py-2 px-4">
                          <select 
                            value={payment.method}
                            onChange={(e) => updatePaymentMethod(payment.id, e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 outline-none text-sm font-medium cursor-pointer"
                          >
                            <option value="Cash">Cash</option>
                            <option value="Debit Card">Debit Card</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Wallet">Wallet</option>
                            <option value="Refund (Cash)">Refund (Cash)</option>
                            <option value="Refund (Debit Card)">Refund (Debit Card)</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-base text-slate-900 dark:text-white">
                          €{(Number(payment.amount) || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {allPayments.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-700 font-bold">
                      <td colSpan={5} className="py-3 px-4 text-right text-sm uppercase text-slate-600 dark:text-slate-300">
                        Total Registered Payments
                      </td>
                      <td className="py-3 px-4 text-right text-lg font-mono text-blue-600 dark:text-blue-400">
                        €{allPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}
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
      {/* Print Layouts (Hidden from screen, only visible in print mode) */}
      {printLayout === 'thermal' && (
        <div className="hidden print:block fixed inset-0 z-[9999] bg-white">
          <EndOfDayThermal 
            reportDate={reportDate}
            startingBalance={startingBalance}
            totalSales={totalSales}
            cashCounted={cashCounted}
            calculatedCash={calculatedCashTotal}
            difference={cashDifference}
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
            calculatedCash={calculatedCashTotal}
            difference={cashDifference}
            summaries={summaries}
            allPayments={allPayments}
            comments={comments}
          />
        </div>
      )}
    </div>
  );
}
