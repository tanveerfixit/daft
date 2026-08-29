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
  RotateCcw
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-[#f2f2f2] dark:bg-slate-900 w-full max-w-md flex flex-col max-h-[85vh] border border-[#cccccc] dark:border-slate-800 text-black dark:text-slate-100 shadow-md overflow-hidden rounded">
        <div className="px-4 py-2.5 border-b border-[#dfdfdf] dark:border-slate-800 flex justify-between items-center bg-[#f0f0f0] dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-black dark:text-slate-200" />
            <h3 className="text-base font-semibold text-black dark:text-white">Cash Drawer Calculator</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-[#91c9f7] hover:text-black text-[#707070] dark:hover:text-slate-200 rounded cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-white dark:bg-slate-900">
          {denominations.map((d) => (
            <div key={d.value} className="flex items-center justify-between py-1 px-2 border-b border-[#dfdfdf] dark:border-slate-800/50 hover:bg-[#91c9f7]/40 last:border-none">
              <span className="text-sm font-medium w-16 text-black dark:text-slate-300">{d.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#707070]">×</span>
                <input 
                  type="number" 
                  min="0"
                  value={counts[d.value] || ''}
                  onChange={(e) => setCounts(prev => ({ ...prev, [d.value]: parseInt(e.target.value) || 0 }))}
                  className="w-20 px-2 py-0.5 bg-white dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-right text-sm outline-none text-black dark:text-slate-100 font-mono focus:border-[#91c9f7] rounded"
                  placeholder="0"
                />
                <span className="text-sm font-mono font-semibold w-24 text-right text-black dark:text-slate-100">
                  €{(counts[d.value] * d.value).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-[#f0f0f0] dark:bg-slate-800/50 border-t border-[#dfdfdf] dark:border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-sm text-[#707070] mr-2">Total:</span>
            <span className="text-lg font-mono font-bold text-black dark:text-white">€{total.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => onConfirm(total)}
            className="px-4 py-1.5 bg-[#91c9f7] hover:bg-[#7dbff2] text-black font-semibold border border-[#70aee0] text-sm transition-colors rounded cursor-pointer"
          >
            Apply Total
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
      // Optional: fetch fresh data to be sure, but optimistic is enough for immediate feedback
      // fetchEodData();
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

  const calculatedCashTotal = totalCashSales + startingBalance;
  const cashCounted = countedValues['Cash'] || 0;
  const cashDifference = cashCounted - calculatedCashTotal;

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
        total_deposits: otherMovements.filter(p => isCashPayment(p.method)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
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
      {/* Header Bar */}
      <div className="sticky top-0 z-30 bg-[#f2f2f2] dark:bg-slate-900 border-b border-[#cccccc] dark:border-slate-800 shrink-0 px-6 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title & Date Selector */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-black dark:text-white flex items-center gap-2">
                <FileText size={22} className="text-black dark:text-blue-400" />
                End of Day Closing Report
              </h1>
            </div>

            {/* Clean Windows Date Navigator */}
            <div className="relative inline-flex items-center border border-[#cccccc] dark:border-slate-700 bg-white dark:bg-slate-900 rounded">
              <button 
                onClick={handlePrevDay}
                className="p-1.5 hover:bg-[#91c9f7] hover:text-black text-black dark:text-slate-400 rounded-l cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft size={18} />
              </button>
              
              <button
                type="button"
                onClick={() => setShowCalendar(prev => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 text-base text-black dark:text-slate-200 hover:bg-[#91c9f7] hover:text-black border-x border-[#cccccc] dark:border-slate-700 font-medium cursor-pointer"
              >
                <Calendar size={17} className="text-[#707070] dark:text-slate-400" />
                <span>{reportDate.split('-').reverse().join('-')}</span>
                <ChevronDown size={15} className="text-[#707070] dark:text-slate-400" />
              </button>

              <button 
                onClick={handleNextDay}
                className="p-1.5 hover:bg-[#91c9f7] hover:text-black text-black dark:text-slate-400 rounded-r cursor-pointer"
                title="Next Day"
              >
                <ChevronRight size={18} />
              </button>

              {/* Simple Calendar Popover */}
              {showCalendar && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowCalendar(false)} 
                  />
                  <div className="absolute left-0 top-full mt-1 z-50">
                    <CleanCalendarPicker 
                      selectedDate={reportDate}
                      onSelectDate={(newDate) => setReportDate(newDate)}
                      onClose={() => setShowCalendar(false)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Top Actions */}
          <div className="flex items-center gap-2">
            {isRefreshing && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-blue-900/30 text-black dark:text-blue-400 border border-[#cccccc] text-sm font-medium rounded">
                <div className="w-2 h-2 bg-[#91c9f7] dark:bg-blue-400 rounded-full animate-ping"></div>
                <span>Syncing</span>
              </div>
            )}

            {/* Print Options */}
            <div className="relative">
              <button 
                onClick={() => setShowPrintOptions(!showPrintOptions)}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-black dark:text-slate-200 hover:bg-[#91c9f7] hover:text-black font-medium text-sm transition-colors rounded cursor-pointer"
              >
                <Printer size={16} />
                <span>Print Report</span>
                <ChevronDown size={14} className="text-[#707070]" />
              </button>

              {showPrintOptions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPrintOptions(false)} />
                  <div className="absolute right-0 mt-1 w-52 bg-[#f2f2f2] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-800 shadow-md z-50 py-1 rounded">
                    <button 
                      onClick={() => { setPrintLayout('a4'); setShowPrintOptions(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-normal text-black dark:text-slate-200 hover:bg-[#91c9f7] hover:text-black transition-colors text-left rounded-none cursor-pointer"
                    >
                      <FileText size={16} />
                      <span>Full Page (A4 PDF)</span>
                    </button>
                    <button 
                      onClick={() => { setPrintLayout('thermal'); setShowPrintOptions(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-normal text-black dark:text-slate-200 hover:bg-[#91c9f7] hover:text-black transition-colors text-left rounded-none cursor-pointer"
                    >
                      <Printer size={16} />
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
              className="flex items-center gap-2 px-4 py-1.5 bg-[#91c9f7] hover:bg-[#7dbff2] text-black font-semibold border border-[#70aee0] text-sm transition-all disabled:opacity-50 rounded cursor-pointer"
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-5 space-y-5">
        <div className="max-w-7xl mx-auto space-y-5">
          {message && (
            <div className={`p-3.5 flex items-center gap-3 border rounded ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="font-medium text-sm">{message.text}</span>
              <button onClick={() => setMessage(null)} className="ml-auto text-sm underline font-medium cursor-pointer">Dismiss</button>
            </div>
          )}

          {/* KPI Metrics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Cash Sale */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#707070] dark:text-slate-400">Cash Sale</p>
              <p className="text-[26px] font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-1">€{totalCashSales.toFixed(2)}</p>
              <p className="text-xs text-[#707070] dark:text-slate-400 mt-0.5">{allPayments.filter(p => isCashPayment(p.method) && !isRefundPayment(p)).length} cash payments</p>
            </div>

            {/* 2. Card Sale */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#707070] dark:text-slate-400">Card Sale</p>
              <p className="text-[26px] font-mono font-bold text-blue-700 dark:text-blue-400 mt-1">€{totalCardSales.toFixed(2)}</p>
              <p className="text-xs text-[#707070] dark:text-slate-400 mt-0.5">{allPayments.filter(p => isCardPayment(p.method) && !isRefundPayment(p)).length} card payments</p>
            </div>

            {/* 3. Opening Balance */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#707070] dark:text-slate-400">Opening Balance</p>
              <p className="text-[26px] font-mono font-bold text-black dark:text-slate-100 mt-1">€{startingBalance.toFixed(2)}</p>
              <p className="text-xs text-[#707070] dark:text-slate-400 mt-0.5">Starting drawer float</p>
            </div>

            {/* 4. Total Sale */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#707070] dark:text-slate-400">Total Sale</p>
              <p className="text-[26px] font-mono font-bold text-black dark:text-indigo-400 mt-1">€{totalSales.toFixed(2)}</p>
              <p className="text-xs text-[#707070] dark:text-slate-400 mt-0.5">Net revenue ({allPayments.length} transactions)</p>
            </div>

            {/* 5. Cash Difference */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#707070] dark:text-slate-400">Cash Difference</p>
              {startingBalance > 0 ? (
                <>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[26px] font-mono font-bold ${
                      Math.abs(cashDifference) < 0.01 
                        ? 'text-emerald-700 dark:text-emerald-400' 
                        : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {cashDifference > 0 ? '+' : ''}€{cashDifference.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-[#707070] dark:text-slate-400 mt-0.5">
                    {Math.abs(cashDifference) < 0.01 ? '✓ Balanced (Zero discrepancy)' : cashDifference > 0 ? 'Surplus (+ discrepancy)' : 'Shortage (- discrepancy)'}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[26px] font-mono font-bold text-[#a0a0a0] dark:text-slate-500">
                      --
                    </span>
                  </div>
                  <p className="text-xs text-[#707070] dark:text-slate-400 mt-0.5">
                    Enter starting balance below
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Cash Reconciliation Form & Payment Methods Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Left: Drawer Cash Count Form */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-[#cccccc] dark:border-slate-800 p-4 space-y-4 rounded">
              <div className="pb-2 border-b border-[#dfdfdf] dark:border-slate-800">
                <h2 className="text-base font-semibold text-black dark:text-white">Cash Drawer Entry</h2>
              </div>

              {/* Cash Drawer Counted */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-black dark:text-slate-300">
                  Cash Drawer Counted
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707070] text-sm">€</span>
                    <input 
                      ref={cashInputRef}
                      type="number" 
                      value={countedValues['Cash'] || ''}
                      onChange={(e) => setCountedValues(prev => ({ ...prev, 'Cash': parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-black dark:text-slate-100 font-mono text-base outline-none focus:border-[#91c9f7] rounded"
                      placeholder="0.00"
                    />
                  </div>
                  <button 
                    onClick={() => setShowCashCounter('counted')}
                    className="px-3 py-1.5 bg-[#f2f2f2] hover:bg-[#91c9f7] hover:text-black text-black dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 text-sm font-medium flex items-center gap-1.5 rounded cursor-pointer"
                    title="Open Denomination Calculator"
                  >
                    <Calculator size={16} />
                    <span>Count</span>
                  </button>
                </div>
              </div>

              {/* Starting Balance */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-black dark:text-slate-300">
                  Starting Balance (Opening Float)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707070] text-sm">€</span>
                    <input 
                      type="number" 
                      value={startingBalance || ''}
                      onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-black dark:text-slate-100 font-mono text-base outline-none focus:border-[#91c9f7] rounded"
                      placeholder="0.00"
                    />
                  </div>
                  <button 
                    onClick={() => setShowCashCounter('starting')}
                    className="px-3 py-1.5 bg-[#f2f2f2] hover:bg-[#91c9f7] hover:text-black text-black dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 text-sm font-medium flex items-center gap-1.5 rounded cursor-pointer"
                    title="Open Denomination Calculator"
                  >
                    <Calculator size={16} />
                    <span>Count</span>
                  </button>
                </div>
              </div>

              {/* Manager Notes */}
              <div className="space-y-1.5 pt-1">
                <label className="text-sm font-medium text-black dark:text-slate-300">
                  Closing Notes & Remarks
                </label>
                <textarea 
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full min-h-[80px] p-2.5 bg-white dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-black dark:text-slate-100 text-sm outline-none focus:border-[#91c9f7] rounded"
                  placeholder="Add any discrepancies, drawer notes, or comments..."
                />
              </div>
            </div>

            {/* Right: Payment Breakdown Table */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 overflow-hidden flex flex-col justify-between rounded">
              <div>
                <div className="p-3 bg-white dark:bg-slate-900 border-b border-[#e5e5e5] dark:border-slate-800">
                  <h2 className="text-base font-semibold text-black dark:text-white">Payment Method Summary</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[14px] bg-white dark:bg-slate-900">
                    <thead>
                      <tr className="bg-white dark:bg-slate-900 text-[#707070] dark:text-slate-300 font-semibold border-b border-[#e5e5e5] dark:border-slate-800 text-[13px]">
                        <th className="py-3 px-6">Method</th>
                        <th className="py-3 px-6 text-right">Calculated</th>
                        <th className="py-3 px-6 text-right">Counted</th>
                        <th className="py-3 px-6 text-right">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ececec] dark:divide-slate-800/50 bg-white dark:bg-slate-900">
                      {/* Cash Row */}
                      <tr>
                        <td className="py-3 px-6 font-medium text-black dark:text-white">
                          Cash Sales
                        </td>
                        <td className="py-3 px-6 text-right font-mono text-black dark:text-slate-100 text-[15px]">
                          €{totalCashSales.toFixed(2)}
                        </td>
                        <td className="py-3 px-6 text-right font-mono text-black dark:text-slate-100 text-[15px]">
                          €{((cashCounted - startingBalance) > 0 ? (cashCounted - startingBalance) : 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-6 text-right font-mono font-medium text-[15px]">
                          {startingBalance > 0 ? (
                            <span className={Math.abs(cashDifference) < 0.01 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                              {cashDifference > 0 ? '+' : ''}€{cashDifference.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[#a0a0a0]">--</span>
                          )}
                        </td>
                      </tr>

                      {/* Other Methods & Refunds */}
                      {summaries.filter(s => s.payment_type !== 'Cash').map((s, idx) => {
                        const isRefundRow = s.payment_type === 'Refunds';

                        return (
                          <tr key={idx} className={isRefundRow ? 'bg-red-50/30 dark:bg-red-950/10' : ''}>
                            <td className="py-3 px-6 font-medium text-black dark:text-white">
                              {isRefundRow ? 'Total Refunds' : s.payment_type}
                            </td>
                            <td className={`py-3 px-6 text-right font-mono text-[15px] ${isRefundRow ? 'text-rose-700 font-semibold' : 'text-black dark:text-slate-100'}`}>
                              {isRefundRow ? '-' : ''}€{s.calculated.toFixed(2)}
                            </td>
                            <td className="py-3 px-6 text-right">
                              {isRefundRow ? (
                                <span className="font-mono text-rose-700 font-semibold text-[15px]">
                                  -€{s.calculated.toFixed(2)}
                                </span>
                              ) : (
                                <div className="relative inline-flex items-center justify-end w-36">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#707070] text-[13px]">€</span>
                                  <input 
                                    type="number" 
                                    value={s.counted || ''}
                                    onChange={(e) => setCountedValues(prev => ({ ...prev, [s.payment_type]: parseFloat(e.target.value) || 0 }))}
                                    className={`w-full pl-6 pr-2.5 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-slate-100 text-right font-mono text-[15px] outline-none focus:border-[#91c9f7] rounded ${
                                      s.payment_type === 'Card'
                                        ? 'border border-blue-500 dark:border-blue-600'
                                        : s.payment_type === 'Cash'
                                        ? 'border border-emerald-500 dark:border-emerald-600'
                                        : 'border border-amber-500 dark:border-amber-600'
                                    }`}
                                    placeholder="0.00"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-6 text-right font-mono font-medium text-[15px]">
                              {isRefundRow ? (
                                <span className="text-[#a0a0a0]">--</span>
                              ) : (
                                <span className={Math.abs(s.difference) < 0.01 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                                  {s.difference > 0 ? '+' : ''}€{s.difference.toFixed(2)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Revenue Footer */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-[#e5e5e5] dark:border-slate-800 flex items-center justify-between px-6">
                <span className="text-[15px] font-semibold text-black dark:text-slate-200 uppercase">Total Revenue</span>
                <span className="text-[19px] font-mono font-bold text-black dark:text-blue-400">€{totalSales.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Detailed Transaction Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 overflow-hidden rounded">
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-[#e5e5e5] dark:border-slate-800 flex items-center justify-between px-6">
              <div>
                <h2 className="text-base font-semibold text-black dark:text-white">Transaction Breakdown</h2>
                <p className="text-[13px] text-[#707070]">All registered payments for this date</p>
              </div>
              <span className="text-[13px] text-[#707070] font-medium">
                {allPayments.length} Transactions
              </span>
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
                  {allPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#a0a0a0] text-[14px]">
                        No transactions registered for this date.
                      </td>
                    </tr>
                  ) : (
                    allPayments.map((payment, idx) => {
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
                {allPayments.length > 0 && (
                  <tfoot>
                    <tr className="bg-white dark:bg-slate-900 border-t border-[#e5e5e5] dark:border-slate-800 font-semibold">
                      <td colSpan={5} className="py-3 px-6 text-right text-[15px] uppercase text-[#707070] dark:text-slate-300">
                        Total
                      </td>
                      <td className="py-3 px-6 text-right text-[17px] font-mono text-black dark:text-blue-400">
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
