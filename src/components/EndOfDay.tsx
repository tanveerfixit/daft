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
        <h3 className="text-[12px] font-extrabold mb-4 uppercase tracking-[0.2em] text-gray-400">Transaction Breakdown</h3>
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
                  <td className="font-medium">{p.user_name || 'Staff'}</td>
                  <td className="text-gray-500">{p.paid_at ? new Date(p.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}</td>
                  <td className="font-mono text-[10px]">{p.invoice_number || 'DEPOSIT'}</td>
                  <td>{p.customer_name || '--'}</td>
                  <td>
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold uppercase">{p.method}</span>
                  </td>
                  <td className="text-right font-bold text-gray-900">€{p.amount.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            {settings.eod_show_total_cash && (
              <tr className="bg-gray-100 text-gray-900 font-bold border-t border-gray-300">
                <td colSpan={5} className="text-right py-2 uppercase text-[10px] tracking-widest">Total Cash</td>
                <td className="text-right py-2 text-md">€{allPayments.filter(p => p.method.toLowerCase().includes('cash')).reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</td>
              </tr>
            )}
            {settings.eod_show_total_card_sale && (
              <tr className="bg-gray-100 text-gray-900 font-bold border-t border-gray-300">
                <td colSpan={5} className="text-right py-2 uppercase text-[10px] tracking-widest">Total Card Sale</td>
                <td className="text-right py-2 text-md">€{allPayments.filter(p => p.method.toLowerCase().includes('card')).reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</td>
              </tr>
            )}
            {settings.eod_show_total && (
              <tr className="bg-gray-900 text-white font-bold">
                <td colSpan={5} className="text-right py-3 uppercase text-[10px] tracking-widest">Total Sales for Period</td>
                <td className="text-right py-3 text-lg">€{totalSales.toFixed(2)}</td>
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 font-mono">
      <div className="bg-white dark:bg-neutral-950 w-full max-w-sm flex flex-col max-h-[90vh] border border-neutral-400 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-none shadow-none">
        <div className="p-2 border-b border-neutral-400 dark:border-neutral-700 flex justify-between items-center bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
          <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Calculator size={14} />
            CASH DRAWER COUNTER
          </h3>
          <button onClick={onClose} className="text-neutral-600 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 px-2 py-0.5">
            [X]
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {denominations.map((d) => (
            <div key={d.value} className="flex items-center justify-between py-0.5 px-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-900">
              <span className="text-xs font-bold w-16">{d.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] opacity-70">x</span>
                <input 
                  type="number" 
                  min="0"
                  value={counts[d.value] || ''}
                  onChange={(e) => setCounts(prev => ({ ...prev, [d.value]: parseInt(e.target.value) || 0 }))}
                  className="w-16 px-1 py-0.5 bg-white border border-neutral-300 dark:bg-neutral-900 dark:border-neutral-800 rounded-none text-right text-xs outline-none text-neutral-900 dark:text-neutral-100 focus:bg-neutral-50 dark:focus:bg-neutral-800 focus:border-neutral-500"
                />
                <span className="text-xs font-bold w-20 text-right">
                  €{(counts[d.value] * d.value).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-2 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-400 dark:border-neutral-700 flex justify-between items-center">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-neutral-500">TOTAL COUNTED</p>
            <p className="text-lg font-black">€{total.toFixed(2)}</p>
          </div>
          <button 
            onClick={() => onConfirm(total)}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-black font-bold rounded-none text-xs uppercase"
          >
            [APPLY TOTAL]
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

  const allPayments = [...invoicePayments, ...otherMovements];
  const totalSales = allPayments.reduce((sum, p) => sum + p.amount, 0);
  
  const cashFromInvoices = invoicePayments
    .filter(p => p.method.toLowerCase() === 'cash')
    .reduce((sum, p) => sum + p.amount, 0);
    
  const cashFromDeposits = otherMovements
    .filter(p => p.method.toLowerCase() === 'cash')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalCashSales = cashFromInvoices + cashFromDeposits;
  const calculatedCashTotal = totalCashSales + startingBalance;
  const cashCounted = countedValues['Cash'] || 0;
  const cashDifference = cashCounted - calculatedCashTotal;

  const getCalculatedAmount = (type: string) => {
    if (type === 'Cash') return totalCashSales;
    
    if (type === 'Card') {
      return allPayments
        .filter(p => p.method.toLowerCase().includes('card'))
        .reduce((sum, p) => sum + p.amount, 0);
    }
    
    if (type === 'Wallet') {
      return allPayments
        .filter(p => p.method.toLowerCase() === 'wallet')
        .reduce((sum, p) => sum + p.amount, 0);
    }
    
    if (type === 'Refunds') {
      return allPayments
        .filter(p => p.amount < 0)
        .reduce((sum, p) => sum + p.amount, 0);
    }
    
    if (type === 'Other') {
      // Catch-all for any method that isn't Cash, Card, or Wallet
      return allPayments
        .filter(p => {
          const m = p.method.toLowerCase();
          return !m.includes('cash') && !m.includes('card') && m !== 'wallet';
        })
        .reduce((sum, p) => sum + p.amount, 0);
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
      <div className="h-full flex items-center justify-center bg-white dark:bg-black text-neutral-900 dark:text-green-500 font-mono">
        <div className="border border-neutral-400 dark:border-green-500 p-6 text-center">
          <div className="text-sm font-normal uppercase tracking-widest animate-pulse">*** LOADING SYSTEM DATA ***</div>
          <div className="text-[10px] mt-2 text-neutral-500 dark:text-green-600">PLEASE WAIT...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-sm select-none" style={{ fontSize: '15px' }}>
      {/* Header bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b border-neutral-300 dark:border-neutral-800 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <h1 className="text-base md:text-lg font-bold tracking-wider uppercase text-black dark:text-white">END OF DAY REPORT</h1>
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 w-fit">
              <button 
                onClick={handlePrevDay}
                className="px-2.5 py-1 hover:bg-neutral-200 dark:hover:bg-neutral-850 font-bold border-r border-neutral-300 dark:border-neutral-800 transition-colors"
                title="Previous Day"
              >
                &lt;
              </button>
              
              <div className="relative px-3 py-1 flex items-center gap-1 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-850 transition-colors">
                <span className="font-bold tracking-tight text-xs md:text-sm">
                  {reportDate.split('-').reverse().join('-')}
                </span>
                <Calendar size={12} className="opacity-80 text-neutral-600 dark:text-neutral-400" />
                <input 
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              <button 
                onClick={handleNextDay}
                className="px-2.5 py-1 hover:bg-neutral-200 dark:hover:bg-neutral-850 font-bold border-l border-neutral-300 dark:border-neutral-800 transition-colors"
                title="Next Day"
              >
                &gt;
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start sm:justify-end">
            {isRefreshing && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800">
                <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 animate-ping"></div>
                <span className="text-[10px] font-bold text-neutral-600 dark:text-blue-400 uppercase tracking-widest">SYNCING</span>
              </div>
            )}
            <button className="flex items-center gap-1 px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm">
              <List size={12} />
              <span>[LIST]</span>
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowPrintOptions(!showPrintOptions)}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
              >
                <Printer size={12} />
                <span>[PRINT]</span>
                <ChevronDown size={12} />
              </button>

              {showPrintOptions && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowPrintOptions(false)}
                  />
                  <div 
                    className="absolute right-0 mt-1 w-48 bg-white dark:bg-black border border-neutral-400 dark:border-neutral-700 z-50 py-0.5"
                  >
                    <div className="px-2 py-1 text-[9px] font-normal text-neutral-500 dark:text-green-600 uppercase border-b border-neutral-200 dark:border-neutral-800 mb-0.5">
                      SELECT FORMAT
                    </div>
                    <button 
                      onClick={() => {
                        setPrintLayout('a4');
                        setShowPrintOptions(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-green-400 text-left font-normal"
                    >
                      <FileText size={12} />
                      <span>FULL PAGE (A4)</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        setPrintLayout('thermal');
                        setShowPrintOptions(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-green-400 text-left font-normal"
                    >
                      <Printer size={12} />
                      <span>THERMAL (80MM)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="w-full px-2 py-2 space-y-3">
          {message && (
            <div className={`p-2 flex items-center gap-2 border ${
              message.type === 'success' ? 'bg-green-100/50 text-green-800 border-green-300 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800' : 'bg-red-100/50 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              <span className="font-normal text-xs uppercase">{message.text}</span>
              <button onClick={() => setMessage(null)} className="ml-auto underline text-[10px] hover:text-neutral-900 dark:hover:text-white">[DISMISS]</button>
            </div>
          )}

          {/* Reconciliation Table */}
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800">
            <div className="divide-y divide-neutral-350 dark:divide-neutral-800">
              {/* Cash Counted Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center py-1 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div className="md:col-span-4 px-3 md:text-right font-normal text-neutral-600 dark:text-green-400">CASH DRAWER COUNTED :</div>
                <div className="md:col-span-3 px-3"></div>
                <div className="md:col-span-5 px-3 py-1 flex gap-2 justify-start md:justify-end items-center">
                  <div className="relative w-full md:w-36">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-green-600 text-sm">€</span>
                    <input 
                      ref={cashInputRef}
                      type="number" 
                      value={countedValues['Cash']}
                      onChange={(e) => setCountedValues(prev => ({ ...prev, 'Cash': parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-5 pr-2 py-0.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-normal text-right outline-none focus:border-neutral-500 dark:focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 rounded-none"
                      placeholder="0.00"
                    />
                  </div>
                  <button 
                    onClick={() => setShowCashCounter('counted')}
                    className="px-2 py-1 bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-normal uppercase tracking-wider flex items-center gap-1 rounded-none text-neutral-800 dark:text-neutral-300"
                  >
                    <Calculator size={12} />
                    [COUNTER]
                  </button>
                </div>
              </div>

              {/* Starting Balance Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center py-1 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div className="md:col-span-4 px-3 md:text-right font-normal text-neutral-600 dark:text-green-400">STARTING BAL (OPENING) :</div>
                <div className="md:col-span-3 px-3"></div>
                <div className="md:col-span-5 px-3 py-1 flex gap-2 justify-start md:justify-end items-center">
                  <div className="relative w-full md:w-36">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-green-600 text-xs">€</span>
                    <input 
                      type="number" 
                      value={startingBalance}
                      onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
                      className="w-full pl-5 pr-2 py-0.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-normal text-right outline-none focus:border-neutral-500 dark:focus:border-neutral-400 focus:bg-neutral-50 dark:focus:bg-neutral-900 rounded-none"
                      placeholder="0.00"
                    />
                  </div>
                  <button 
                    onClick={() => setShowCashCounter('starting')}
                    className="px-2 py-1 bg-neutral-200 dark:bg-neutral-900 hover:bg-neutral-300 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-normal uppercase tracking-wider flex items-center gap-1 rounded-none text-neutral-800 dark:text-neutral-300"
                  >
                    <Calculator size={12} />
                    [COUNTER]
                  </button>
                </div>
              </div>

              {/* Calculated Cash Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-stretch md:items-center py-1 bg-neutral-200/50 dark:bg-neutral-900 gap-1 md:gap-0">
                <div className="md:col-span-4 px-3 py-1 md:py-0 md:text-right font-bold md:font-normal text-neutral-600 dark:text-green-400">CALCULATED CASH EXPECTED :</div>
                <div className="md:col-span-3 px-3 md:text-right font-normal text-blue-600 dark:text-blue-400 flex items-center justify-between md:justify-end py-1 md:py-0 border-b md:border-b-0 border-neutral-350 dark:border-neutral-800">
                  <span className="md:hidden text-neutral-500 text-xs">Expected:</span>
                  <span>€{calculatedCashTotal.toFixed(2)}</span>
                </div>
                <div className="md:col-span-3 px-3 md:text-right font-normal text-neutral-800 dark:text-neutral-200 flex items-center justify-between md:justify-end py-1 md:py-0 border-b md:border-b-0 border-neutral-350 dark:border-neutral-800">
                  <span className="md:hidden text-neutral-500 text-xs">Counted:</span>
                  <span>€{cashCounted.toFixed(2)}</span>
                </div>
                <div className="md:col-span-2 py-1 px-3 bg-neutral-300/30 dark:bg-neutral-950 md:text-right font-normal text-neutral-850 dark:text-neutral-200 md:border-l border-neutral-350 dark:border-neutral-800 flex justify-between md:justify-end items-center">
                  <span className="md:hidden text-neutral-500 text-xs">Difference:</span>
                  <span>DIFF: {cashDifference >= 0 ? '+' : '' }€{cashDifference.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Summaries Sub-Header */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-sm font-bold text-black dark:text-white uppercase tracking-wider">
                    <th className="py-1.5 px-3 text-left w-1/3">PAYMENT TYPE</th>
                    <th className="py-1.5 px-3 text-right w-1/6 text-blue-600 dark:text-blue-400">CALCULATED</th>
                    <th className="py-1.5 px-3 text-right w-1/6 text-neutral-700 dark:text-neutral-300">COUNTED</th>
                    <th className="py-1.5 px-3 text-right w-1/6">DIFFERENCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-900">
                  {summaries.filter(s => s.payment_type !== 'Cash').map((s, idx) => (
                    <tr key={idx} className="bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <td className="py-1 px-3 font-normal">{s.payment_type.toUpperCase()}</td>
                      <td className="py-1 px-3 text-right font-normal text-blue-600 dark:text-blue-400">
                        €{s.calculated.toFixed(2)}
                      </td>
                      <td className="py-1 px-3 text-right">
                        <div className="relative inline-block w-36">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-green-600 text-[10px]">€</span>
                          <input 
                            type="number" 
                            value={s.counted || ''}
                            onChange={(e) => setCountedValues(prev => ({ ...prev, [s.payment_type]: parseFloat(e.target.value) || 0 }))}
                            className="w-full pl-5 pr-2 py-0.5 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-750 text-neutral-900 dark:text-neutral-100 text-right outline-none focus:border-neutral-500 dark:focus:border-neutral-450 focus:bg-neutral-50 dark:focus:bg-neutral-900 rounded-none font-normal"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="py-1 px-3 w-48 bg-neutral-200/20 dark:bg-neutral-950 text-right font-normal text-neutral-800 dark:text-neutral-200 border-l border-neutral-300 dark:border-neutral-800">
                        {s.difference >= 0 ? '+' : '' }€{s.difference.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-neutral-200 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border-t border-neutral-300 dark:border-neutral-800 font-bold text-[18px]">
                    <td className="py-2 px-3 text-right uppercase tracking-wider font-bold text-[18px]">TOTAL SYSTEM REVENUE :</td>
                    <td className="py-2 px-3 text-right font-bold text-[18px]">
                      €{totalSales.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-[18px]">
                      €{( (cashCounted - startingBalance) + summaries.filter(s => s.payment_type !== 'Cash').reduce((sum, s) => sum + s.counted, 0) ).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 w-48 bg-neutral-300/20 dark:bg-neutral-950 text-right font-bold text-[18px] border-l border-neutral-300 dark:border-neutral-800 text-neutral-850 dark:text-neutral-200">
                      {(( (cashCounted - startingBalance) + summaries.filter(s => s.payment_type !== 'Cash').reduce((sum, s) => sum + s.counted, 0) ) - totalSales) >= 0 ? '+' : ''}
                      €{(( (cashCounted - startingBalance) + summaries.filter(s => s.payment_type !== 'Cash').reduce((sum, s) => sum + s.counted, 0) ) - totalSales).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Comments Section */}
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-2 md:gap-4">
            <label className="font-normal text-neutral-600 dark:text-neutral-400 pt-1 shrink-0 uppercase">MANAGER NOTES :</label>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="flex-1 min-h-[48px] p-2 bg-white border border-neutral-300 text-neutral-900 dark:bg-black dark:border-neutral-800 dark:text-neutral-100 outline-none focus:border-neutral-500 focus:bg-neutral-50 dark:focus:bg-neutral-900 rounded-none font-mono font-normal"
              placeholder="ENTER CLOSING MEMO..."
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-center">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-650 font-bold py-2.5 px-16 border border-blue-700 dark:border-blue-800 rounded-none uppercase tracking-widest text-xs transition-colors duration-200 shadow-md disabled:opacity-50"
            >
              {saving ? 'SAVING DATA...' : '[ COMMIT REPORT & SAVE ]'}
            </button>
          </div>

          {/* Payment Information Table */}
          <div className="space-y-1.5">
            <h2 className="text-base font-bold uppercase text-black dark:text-white tracking-wider">// TRANSACTION BREAKDOWN</h2>
            <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-800 text-sm font-bold text-black dark:text-white uppercase tracking-wider">
                    <th className="py-1 px-2 border-r border-neutral-300 dark:border-neutral-800">OPERATOR</th>
                    <th className="py-1 px-2 border-r border-neutral-300 dark:border-neutral-800">TIME</th>
                    <th className="py-1 px-2 border-r border-neutral-300 dark:border-neutral-800">REF/INVOICE</th>
                    <th className="py-1 px-2 border-r border-neutral-300 dark:border-neutral-800">CUSTOMER</th>
                    <th className="py-1 px-2 border-r border-neutral-300 dark:border-neutral-800">METHOD</th>
                    <th className="py-1 px-3 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-900">
                  {allPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-neutral-500 italic">NO REVENUE RECORDS REGISTERED FOR THIS PERIOD.</td>
                    </tr>
                  ) : (
                    <>
                      {allPayments.map((payment, idx) => (
                        <tr 
                          key={idx} 
                          className="bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        >
                          <td className="py-1 px-2 border-r border-neutral-300 dark:border-neutral-800 font-normal">{payment.user_name || 'STAFF'}</td>
                          <td className="py-1 px-2 border-r border-neutral-300 dark:border-neutral-800">
                            {payment.paid_at ? new Date(payment.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                          </td>
                          <td className="py-1 px-2 border-r border-neutral-300 dark:border-neutral-800">
                            <span className="text-neutral-800 dark:text-green-400 font-normal hover:underline cursor-pointer">
                              {payment.invoice_number || 'DEPOSIT'}
                            </span>
                          </td>
                          <td className="py-1 px-2 border-r border-neutral-300 dark:border-neutral-800">
                            {payment.customer_name ? payment.customer_name.toUpperCase() : 'N/A'}
                          </td>
                          <td className="py-0.5 px-2 border-r border-neutral-300 dark:border-neutral-800">
                            <select 
                              value={payment.method}
                              onChange={(e) => updatePaymentMethod(payment.id, e.target.value)}
                              className="bg-white text-neutral-900 border border-neutral-300 dark:bg-black dark:text-neutral-100 dark:border-neutral-800 rounded-none px-1 py-0.5 outline-none cursor-pointer w-full text-xs font-mono font-normal"
                            >
                              <option value="Cash">Cash</option>
                              <option value="Debit Card">Debit Card</option>
                              <option value="Credit Card">Credit Card</option>
                              <option value="Wallet">Wallet</option>
                              <option value="Other">Other</option>
                            </select>
                          </td>
                          <td className="py-1 px-3 text-right font-normal text-neutral-955 dark:text-neutral-100">
                            €{payment.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {/* Total Footer for Payment Information */}
                      <tr className="bg-neutral-200 dark:bg-neutral-900 border-t border-neutral-300 dark:border-neutral-800 font-bold text-neutral-855 dark:text-neutral-200 text-[18px]">
                        <td colSpan={5} className="py-2 px-3 text-right text-[16px] uppercase tracking-widest border-r border-neutral-300 dark:border-neutral-800 font-bold">
                          TOTAL REGISTERED PAYMENTS :
                        </td>
                        <td className="py-2 px-3 text-right text-blue-600 dark:text-blue-400 font-bold text-[18px]">
                          €{allPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
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
