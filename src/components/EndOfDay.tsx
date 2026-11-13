import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Loader2,
  Banknote
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
  show_vat_number: true,
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

const isRefundPayment = (p: Payment | any) => {
  return (Number(p.amount) || 0) < 0 || String(p.method || '').toLowerCase().includes('refund');
};

const isDepositPayment = (p: Payment | any) => {
  const t = String(p.type || '').toLowerCase();
  const invType = String(p.invoice_type || '').toLowerCase();
  return t === 'deposit' || t === 'wallet_deposit' || invType === 'deposit' || invType === 'wallet';
};

const isWalletOrCreditNotePayment = (p: Payment | any) => {
  const t = String(p.type || '').toLowerCase();
  const m = String(p.method || '').toLowerCase();
  if (t === 'wallet_use' || t === 'credit_note_redeemed') return true;
  return m.includes('wallet') || m.includes('store credit') || m.includes('credit note');
};

const getBasePaymentMethod = (method: string, payment?: any) => {
  if (payment && isWalletOrCreditNotePayment(payment)) return 'Wallet';
  const m = (method || '').toLowerCase();
  if (m.includes('wallet') || m.includes('store credit') || m.includes('credit note')) return 'Wallet';
  if (m.includes('cash')) return 'Cash';
  if (m.includes('card') || m.includes('debit') || m.includes('credit')) return 'Card';
  return 'Other';
};

const isCashPayment = (method: string, payment?: any) => getBasePaymentMethod(method, payment) === 'Cash';
const isCardPayment = (method: string, payment?: any) => getBasePaymentMethod(method, payment) === 'Card';
const isWalletPayment = (method: string, payment?: any) => getBasePaymentMethod(method, payment) === 'Wallet';
const isOtherPayment = (method: string, payment?: any) => getBasePaymentMethod(method, payment) === 'Other';

interface PrintProps {
  reportDate: string;
  startingBalance: number;
  totalSales: number;
  totalDeposits: number;
  totalWalletRedeemed: number;
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
  totalDeposits,
  totalWalletRedeemed,
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
        <span>Net Sales:</span>
        <span className="font-semibold">€{totalSales.toFixed(2)}</span>
      </div>
      {totalDeposits > 0 && (
        <div className="eod-row">
          <span>Wallet Deposits:</span>
          <span className="font-semibold">€{totalDeposits.toFixed(2)}</span>
        </div>
      )}
      {totalWalletRedeemed > 0 && (
        <div className="eod-row">
          <span>Wallet Redeemed:</span>
          <span className="font-semibold">€{totalWalletRedeemed.toFixed(2)}</span>
        </div>
      )}

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
              <span>€{allPayments.filter(p => isCashPayment(p.method, p)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}</span>
            </div>
          )}
          {activeSettings.eod_show_total_card_sale && (
            <div className="eod-row font-bold">
              <span>Total Card:</span>
              <span>€{allPayments.filter(p => isCardPayment(p.method, p)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}</span>
            </div>
          )}
          {activeSettings.eod_show_total && (
            <div className="eod-row font-bold text-[16px] pt-1">
              <span>Net Sales Total:</span>
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
  totalDeposits,
  totalWalletRedeemed,
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
                <span>Net Earned Sales</span>
                <span className="font-semibold text-blue-600">€{totalSales.toFixed(2)}</span>
              </div>
              {totalDeposits > 0 && (
                <div className="stat-row">
                  <span>Wallet Deposits Received</span>
                  <span className="font-semibold text-indigo-600">€{totalDeposits.toFixed(2)}</span>
                </div>
              )}
              {totalWalletRedeemed > 0 && (
                <div className="stat-row">
                  <span>Wallet / Credit Note Redeemed</span>
                  <span className="font-semibold text-purple-600">€{totalWalletRedeemed.toFixed(2)}</span>
                </div>
              )}
              <div className="stat-row">
                <span>Calculated Cash in Drawer</span>
                <span className="font-semibold text-blue-600">€{calculatedCash.toFixed(2)}</span>
              </div>
              <div className="stat-row">
                <span>Actual Cash Counted</span>
                <span className="font-semibold text-amber-600">€{cashCounted.toFixed(2)}</span>
              </div>
              <div className={`stat-row total ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>Cash Difference</span>
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
                <td className="text-right py-2 text-base">€{allPayments.filter(p => isCashPayment(p.method, p)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}</td>
              </tr>
            )}
            {activeSettings.eod_show_total_card_sale && (
              <tr className="bg-gray-100 text-gray-900 font-bold border-t border-gray-300">
                <td colSpan={5} className="text-right py-2 uppercase text-xs tracking-widest">Total Card</td>
                <td className="text-right py-2 text-base">€{allPayments.filter(p => isCardPayment(p.method, p)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}</td>
              </tr>
            )}
            {totalDeposits > 0 && (
              <tr className="bg-gray-100 text-gray-900 font-bold border-t border-gray-300">
                <td colSpan={5} className="text-right py-2 uppercase text-xs tracking-widest">Wallet Deposits Received</td>
                <td className="text-right py-2 text-base">€{(Number(totalDeposits) || 0).toFixed(2)}</td>
              </tr>
            )}
            {activeSettings.eod_show_total && (
              <tr className="bg-gray-900 text-white font-bold">
                <td colSpan={5} className="text-right py-3 uppercase text-xs tracking-widest">Net Earned Sales for Period</td>
                <td className="text-right py-3 text-xl">€{(Number(totalSales) || 0).toFixed(2)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {comments && (
        <div className="mt-8">
          <h3 className="text-[11px] font-bold mb-2 uppercase tracking-widest text-gray-500">Manager Notes</h3>
          <div className="p-4 bg-gray-50 border-l-4 border-gray-900 text-sm font-bold text-gray-900 leading-relaxed whitespace-pre-wrap">
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
    <div className="no-print fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700 max-w-md w-full p-4 sm:p-5 space-y-4 text-slate-800 dark:text-slate-100 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-slate-700 dark:text-slate-300" />
            <h3 className="font-bold text-slate-800 dark:text-white text-base">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 text-[14px] flex-1 overflow-y-auto pr-1">
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

        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between shrink-0">
          <div className="text-[13px] sm:text-[14px] text-slate-600 dark:text-slate-400">
            Counted: <span className="font-mono font-bold text-slate-900 dark:text-white text-sm sm:text-base">€{total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 sm:px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[13px] sm:text-[14px] font-medium rounded cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={() => onConfirm(total)} 
              className="px-3.5 sm:px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-[13px] sm:text-[14px] font-semibold rounded cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EndOfDayListModalProps {
  currentDate?: string;
  onClose: () => void;
  onSelectReport: (dateStr: string) => void;
}

const EndOfDayListModal: React.FC<EndOfDayListModalProps> = ({ currentDate, onClose, onSelectReport }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'reports'>('calendar');
  const [searchTerm, setSearchTerm] = useState('');

  const initialDateStr = currentDate || getTodayString();
  const initialDateObj = parseDateString(initialDateStr);
  const [viewYear, setViewYear] = useState(initialDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDateObj.getMonth());
  const [selectedDayStr, setSelectedDayStr] = useState(initialDateStr);

  useEffect(() => {
    fetch('/api/reports/eod-list')
      .then(res => res.json())
      .then(data => {
        setReports(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Failed to fetch EOD list:', err))
      .finally(() => setLoading(false));
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const todayStr = getTodayString();
  const yesterdayStr = getYesterdayString();

  // Create a map of dates that have saved reports
  const reportDatesMap = new Map<string, any>();
  reports.forEach(r => {
    const dStr = String(r.report_date || '').substring(0, 10);
    if (dStr) reportDatesMap.set(dStr, r);
  });

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

  const handleGoToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDayStr(todayStr);
  };

  const handleGoYesterday = () => {
    const yDate = parseDateString(yesterdayStr);
    setViewYear(yDate.getFullYear());
    setViewMonth(yDate.getMonth());
    setSelectedDayStr(yesterdayStr);
  };

  const handleSelectAndLoad = (dateStr: string) => {
    onSelectReport(dateStr);
    onClose();
  };

  // Calendar Days Calculation
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
    hasReport: boolean;
    report?: any;
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
      isSelected: dateStr === selectedDayStr,
      hasReport: reportDatesMap.has(dateStr),
      report: reportDatesMap.get(dateStr),
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
      isSelected: dateStr === selectedDayStr,
      hasReport: reportDatesMap.has(dateStr),
      report: reportDatesMap.get(dateStr),
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
      isSelected: dateStr === selectedDayStr,
      hasReport: reportDatesMap.has(dateStr),
      report: reportDatesMap.get(dateStr),
    });
  }

  const filteredReports = reports.filter(r => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const dStr = String(r.report_date || '').toLowerCase();
    const uName = String(r.user_name || '').toLowerCase();
    return dStr.includes(term) || uName.includes(term);
  });

  const selectedReport = reportDatesMap.get(selectedDayStr);

  return (
    <div className="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-4 sm:p-6 space-y-4 text-slate-800 dark:text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                End of Day Calendar & History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select any date to inspect transactions, cash drawer, and sales
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Calendar size={14} />
              <span>Select Date (Calendar)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List size={14} />
              <span>Saved Reports List ({reports.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Closed Day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border border-sky-500 bg-sky-100 dark:bg-sky-950"></span> Today
            </span>
          </div>
        </div>

        {/* Tab Body */}
        {activeTab === 'calendar' ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2 sm:p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  {monthNames[viewMonth]} {viewYear}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleGoToday}
                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs font-semibold rounded bg-white dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-600 transition cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleGoYesterday}
                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs font-semibold rounded bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 transition cursor-pointer"
                  >
                    Yesterday
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 text-center text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider py-1 border-b border-slate-100 dark:border-slate-800">
              {weekDays.map((w, idx) => (
                <div key={idx} className="py-1">{w}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((d, idx) => {
                const isSel = d.isSelected;
                const isTod = d.isToday;
                const inMonth = d.isCurrentMonth;
                const hasRep = d.hasReport;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDayStr(d.dateStr)}
                    onDoubleClick={() => handleSelectAndLoad(d.dateStr)}
                    className={`h-11 sm:h-12 rounded-lg flex flex-col items-center justify-center relative transition cursor-pointer select-none text-xs sm:text-sm ${
                      isSel 
                        ? 'bg-sky-600 text-white font-bold shadow-md ring-2 ring-sky-300 dark:ring-sky-500' 
                        : isTod
                        ? 'border-2 border-sky-500 font-bold text-slate-900 dark:text-white bg-sky-50/50 dark:bg-sky-950/30 hover:bg-sky-100/60'
                        : !inMonth
                        ? 'text-slate-400 dark:text-slate-600 bg-slate-50/40 dark:bg-slate-800/20 hover:bg-slate-100/60'
                        : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-slate-700/60 border border-slate-100 dark:border-slate-800'
                    }`}
                    title={hasRep ? `${d.dateStr}: Closing report saved` : d.dateStr}
                  >
                    <span>{d.dayNumber}</span>
                    {hasRep && (
                      <span 
                        className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSel ? 'bg-white' : 'bg-emerald-500'}`} 
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Summary & Load Action */}
            <div className="mt-4 p-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left w-full sm:w-auto">
                <span className="text-xs text-sky-700 dark:text-sky-300 font-medium">Selected Date:</span>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono">
                  {formatDisplayDate(selectedDayStr)} ({selectedDayStr})
                </p>
                {selectedReport ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                    <CheckCircle2 size={13} />
                    Report closed by {selectedReport.user_name || 'Staff'} • Sales: €{(Number(selectedReport.total_sales) || 0).toFixed(2)}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click "Load Day Details" to view all invoices, payments, & cash for this date
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSelectAndLoad(selectedDayStr)}
                className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm rounded-lg shadow flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
              >
                <span>Load Day Details</span>
                <ArrowRightLeft size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Reports History Tab */
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by date (YYYY-MM-DD) or staff name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              {loading ? (
                <div className="py-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin text-sky-500" />
                  <span>Loading reports history...</span>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm italic">
                  {reports.length === 0 
                    ? 'No saved End of Day closing reports found yet. Use the Calendar Picker tab to select any date.' 
                    : 'No reports matched your search.'}
                </div>
              ) : (
                <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[540px]">
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
                    {filteredReports.map((r, idx) => {
                      const dFormatted = String(r.report_date || '').substring(0, 10);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-2.5 px-3 font-semibold font-mono text-slate-900 dark:text-white">
                            {dFormatted}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{r.user_name || 'Staff'}</td>
                          <td className="py-2.5 px-3 text-right font-mono">€{(Number(r.total_sales) || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">€{(Number(r.cash_counted) || 0).toFixed(2)}</td>
                          <td className={`py-2.5 px-3 text-right font-mono font-semibold ${Number(r.difference) < 0 ? 'text-red-600' : Number(r.difference) > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {Number(r.difference) >= 0 ? '+' : ''}€{(Number(r.difference) || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button 
                              type="button"
                              onClick={() => handleSelectAndLoad(dFormatted)}
                              className="px-3 py-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-semibold rounded cursor-pointer transition"
                            >
                              Load Day
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400">
            Tip: Double-click any day on the calendar to load it immediately
          </p>
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition"
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
    <div className="w-72 p-3 bg-[#f2f2f2] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 z-50 text-sm select-none rounded">
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
  const navigate = useNavigate();
  const { branchSlug } = useParams<{ branchSlug?: string }>();
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
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'All' | 'Cash' | 'Card' | 'Wallet' | 'Other' | 'Refunds'>('All');

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

      const nextCounted: Record<string, number> = {
        'Cash': data.cashCounted !== null && data.cashCounted !== undefined ? Number(data.cashCounted) : 0,
        'Debit Card': 0,
        'Card': 0,
        'Credit Card': 0,
        'Customer Deposit': 0,
        'Other': 0,
        'Refunds': 0
      };
      if (Array.isArray(data.savedPayments)) {
        for (const sp of data.savedPayments) {
          const pt = String(sp.payment_type || '');
          const cVal = Number(sp.counted) || 0;
          if (pt === 'Card' || pt === 'Debit Card') {
            nextCounted['Card'] = cVal;
            nextCounted['Debit Card'] = cVal;
          } else if (pt === 'Other') {
            nextCounted['Other'] = cVal;
          }
        }
      }
      setCountedValues(nextCounted);
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

  const allPayments = [...invoicePayments, ...otherMovements];
  
  const filteredPayments = allPayments.filter(payment => {
    if (paymentTypeFilter === 'All') return true;
    if (paymentTypeFilter === 'Refunds') return isRefundPayment(payment);
    if (isRefundPayment(payment)) return false;
    return getBasePaymentMethod(payment.method, payment) === paymentTypeFilter;
  });
  
  // Earned Net Sales (Revenue from product/repair sales, including Wallet redemptions, EXCLUDING unearned Wallet Deposits)
  const totalSales = allPayments
    .filter(p => !isDepositPayment(p))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Unearned Customer Wallet Deposits collected today (Liability inflow, not earned sales revenue)
  const totalDeposits = allPayments
    .filter(p => isDepositPayment(p))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Internal Ledger Redemptions (Customer Wallet / Store Credit / Credit Notes applied to sales)
  const totalWalletRedeemed = allPayments
    .filter(p => isWalletPayment(p.method, p))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  // Physical Cash Inflow in Drawer (Sales + Repairs + Wallet Deposits paid in Cash, net of Cash Refunds)
  const totalCashSales = allPayments
    .filter(p => isCashPayment(p.method, p))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Card Terminal Inflow (Sales + Repairs + Wallet Deposits paid by Card, net of Card Refunds)
  const totalCardSales = allPayments
    .filter(p => isCardPayment(p.method, p))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Countable Other External Payments (excluding virtual Wallet / Credit Note redemptions)
  const totalOtherSales = allPayments
    .filter(p => isOtherPayment(p.method, p))
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

  // Countable Drawer + Terminal Total (excludes internal virtual Wallet redemptions so cashiers never get false discrepancies)
  const calculatedTotal = totalCashSales + totalCardSales + totalOtherSales;
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
    if (type === 'Wallet') return totalWalletRedeemed;
    if (type === 'Other') return totalOtherSales;
    if (type === 'Refunds') return totalRefunds;
    return 0;
  };

  const paymentTypes = [
    'Cash',
    'Card',
    ...(totalWalletRedeemed > 0 ? ['Wallet'] : []),
    ...(totalOtherSales > 0 || otherCounted > 0 ? ['Other'] : []),
    'Refunds'
  ];
  
  const summaries = paymentTypes.map(type => {
    const calculated = getCalculatedAmount(type);
    const counted = type === 'Wallet' ? calculated : (countedValues[type] || 0);
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
        total_deposits: totalDeposits,
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
          ...(totalWalletRedeemed > 0 ? [{
            payment_type: 'Wallet',
            calculated: totalWalletRedeemed,
            counted: totalWalletRedeemed,
            difference: 0
          }] : []),
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
      <div className={`flex-1 overflow-auto p-2.5 sm:p-6 space-y-4 sm:space-y-6 transition-opacity duration-150 ${isRefreshing ? 'opacity-80' : 'opacity-100'}`}>
        <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">

          {/* Section 1: End of Day Report Top Summary Card */}
          <div className="w-full bg-white dark:bg-slate-900 border border-[#d8d8d8] dark:border-slate-800 rounded p-3 sm:p-6 flex flex-col gap-4">
            
            {/* Top Navigation Header inside Card */}
            <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-2 border-b border-transparent">
              {/* Title */}
              <h1 className="font-normal text-slate-800 dark:text-white tracking-tight flex items-center gap-2 shrink-0 justify-between md:justify-start" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>
                <div className="flex items-center gap-2">
                  <FileText size={24} className="text-[#00c9db] dark:text-sky-400" />
                  <span>End of Day Report</span>
                </div>
                {isRefreshing && (
                  <div className="md:hidden flex items-center gap-1.5 px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-medium rounded-full">
                    <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-ping"></div>
                    <span>Syncing</span>
                  </div>
                )}
              </h1>

              {/* Date Badge with Clean Navigation */}
              <div className="relative inline-flex items-center justify-center shrink-0 w-full md:w-auto">
                <div className="bg-[#e75325] text-white px-3 sm:px-4 py-1.5 text-[15px] sm:text-[16px] font-semibold rounded flex items-center justify-between sm:justify-center gap-2 w-full sm:w-auto min-w-0 sm:min-w-[220px]">
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
              <div className="no-print flex items-center justify-end gap-2 relative w-full md:w-auto">
                {isRefreshing && (
                  <div className="hidden md:flex absolute -top-1 -left-2 -translate-y-full items-center gap-1.5 px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-medium rounded-full">
                    <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-ping"></div>
                    <span>Syncing</span>
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={() => setShowEodListModal(true)}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[13px] sm:text-[14px] font-medium border border-slate-300 dark:border-slate-600 rounded transition cursor-pointer shadow-sm"
                  title="Select any date from calendar or view saved End of Day reports"
                >
                  <Calendar size={16} className="text-sky-600 dark:text-sky-400" />
                  <span>End of Day List</span>
                </button>

                <div className="relative inline-block flex-1 md:flex-initial">
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPrintOptions(prev => !prev);
                    }} 
                    className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-[#00c9db] hover:bg-[#00b2c2] text-slate-900 text-[13px] sm:text-[14px] font-semibold rounded transition cursor-pointer"
                  >
                    <Printer size={16} />
                    <span>Print</span>
                    <ChevronDown size={14} className={`ml-0.5 transition-transform ${showPrintOptions ? 'rotate-180' : ''}`} />
                  </button>

                  {showPrintOptions && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowPrintOptions(false)} />
                      <div 
                        className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 z-50 py-1.5 rounded"
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

            {/* Section 1: Mobile Native Card View (hidden on md and up) */}
            <div className="md:hidden space-y-3">
              {/* Cash Reconciliation Card */}
              <div className="bg-white dark:bg-slate-800/40 border border-[#dcdcdc] dark:border-slate-700 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                    <Banknote size={16} className="text-emerald-600" />
                    Cash Reconciliation
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowCashCounter('counted')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator size={13} className="text-slate-500" />
                    <span>Drawer Counter</span>
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  {/* Cash Counted Input */}
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="mobileCashCounted" className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                      Cash Counted:
                    </label>
                    <div className="w-36">
                      <input 
                        type="number" 
                        step="0.01" 
                        id="mobileCashCounted"
                        value={cashCounted || ''} 
                        onChange={(e) => setCountedValues(prev => ({ ...prev, Cash: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                        className="w-full text-right px-2.5 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Starting Balance Input */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <label htmlFor="mobileStartingBalance" className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                        Starting Balance:
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCashCounter('starting')}
                        className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        title="Count Starting Balance"
                      >
                        (Count)
                      </button>
                    </div>
                    <div className="w-36">
                      <input 
                        type="number" 
                        step="0.01" 
                        id="mobileStartingBalance"
                        value={startingBalance || ''} 
                        onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full text-right px-2.5 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Calculated Cash Summary */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="bg-[#f8f9fa] dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Calculated</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white text-[13px] mt-0.5">{formatMoney(totalCashSales)}</div>
                    </div>
                    <div className="bg-[#f8f9fa] dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Net Counted</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white text-[13px] mt-0.5">{formatMoney(countedCashNet)}</div>
                    </div>
                    <div className="bg-[#f8f9fa] dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Difference</div>
                      <div className={`font-mono font-bold text-[13px] mt-0.5 ${diffCash === 0 ? 'text-emerald-600' : diffCash > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatMoney(diffCash, true)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card / Electronic Payments Card */}
              <div className="bg-white dark:bg-slate-800/40 border border-[#dcdcdc] dark:border-slate-700 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    Debit Card & Other Methods
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  {/* Debit Card */}
                  <div className="bg-[#f8f9fa] dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">Debit Card</span>
                      <div className="text-xs text-slate-500">
                        System: <span className="font-mono font-bold text-slate-900 dark:text-white">{formatMoney(totalCardSales)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="mobileCardCounted" className="text-slate-500 text-xs">Counted:</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        id="mobileCardCounted"
                        value={cardCounted || ''} 
                        onChange={(e) => setCountedValues(prev => ({ ...prev, Card: parseFloat(e.target.value) || 0, 'Debit Card': parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                        className="w-32 text-right px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Difference:</span>
                      <span className={`font-mono font-semibold ${diffCard === 0 ? 'text-slate-600 dark:text-slate-300' : diffCard > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatMoney(diffCard, true)}
                      </span>
                    </div>
                  </div>

                  {/* Wallet / Store Credit Redeemed (Auto-reconciled internal ledger) */}
                  {totalWalletRedeemed > 0 && (
                    <div className="bg-purple-50/60 dark:bg-purple-950/20 p-2.5 border border-purple-200 dark:border-purple-800/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-purple-900 dark:text-purple-200 text-xs">Wallet / Store Credit Redeemed</span>
                        <span className="font-mono font-bold text-purple-900 dark:text-purple-200 text-xs">{formatMoney(totalWalletRedeemed)}</span>
                      </div>
                      <div className="text-[11px] text-purple-700 dark:text-purple-300">
                        Internal customer ledger settlement (non-drawer tender)
                      </div>
                    </div>
                  )}

                  {/* Other Payments if present */}
                  {(totalOtherSales > 0 || otherCounted > 0) && (
                    <div className="bg-[#f8f9fa] dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">Other Payments</span>
                        <div className="text-xs text-slate-500">
                          System: <span className="font-mono font-bold text-slate-900 dark:text-white">{formatMoney(totalOtherSales)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 text-xs">Counted:</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={otherCounted || ''} 
                          onChange={(e) => setCountedValues(prev => ({ ...prev, Other: parseFloat(e.target.value) || 0 }))}
                          placeholder="0.00"
                          className="w-32 text-right px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Difference:</span>
                        <span className={`font-mono font-semibold ${diffOther === 0 ? 'text-slate-600 dark:text-slate-300' : diffOther > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatMoney(diffOther, true)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Overall Total Reconciliation Summary Card (Mobile) */}
              <div className="bg-[#f8f9fa] dark:bg-slate-800/80 border border-[#dcdcdc] dark:border-slate-700 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Total Drawer / Terminal Diff</div>
                    <div className={`text-xl font-mono font-bold mt-0.5 ${diffTotal === 0 ? 'text-emerald-700 dark:text-emerald-400' : diffTotal > 0 ? 'text-blue-700 dark:text-sky-400' : 'text-red-700 dark:text-red-400'}`}>
                      {formatMoney(diffTotal, true)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">Calculated / Counted</div>
                    <div className="font-mono text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      <span>{formatMoney(calculatedTotal)}</span>
                      <span className="text-slate-400 mx-1.5 font-normal">/</span>
                      <span>{formatMoney(countedTotal)}</span>
                    </div>
                  </div>
                </div>
                {(totalDeposits > 0 || totalWalletRedeemed > 0) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 dark:text-slate-300">
                      Net Earned Sales: <strong className="font-mono text-slate-900 dark:text-white">{formatMoney(totalSales)}</strong>
                    </span>
                    {totalDeposits > 0 && (
                      <span className="text-indigo-700 dark:text-indigo-300">
                        Wallet Deposits: <strong className="font-mono">{formatMoney(totalDeposits)}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 1 Desktop Reconciliation Table (100% Identical Original on md and up) */}
            <div className="hidden md:block overflow-x-auto w-full">
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
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[14px] border border-slate-300 dark:border-slate-600 rounded whitespace-nowrap cursor-pointer transition flex items-center justify-center gap-1.5 w-full sm:w-auto"
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
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[14px] border border-slate-300 dark:border-slate-600 rounded whitespace-nowrap cursor-pointer transition flex items-center justify-center gap-1.5 w-full sm:w-auto"
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

                  {/* Row: Wallet / Store Credit Redeemed (Internal Ledger - Non-Countable) */}
                  {totalWalletRedeemed > 0 && (
                    <tr className="bg-purple-50/40 dark:bg-purple-950/20">
                      <td className="border border-[#dcdcdc] dark:border-slate-700 text-purple-900 dark:text-purple-200 font-medium py-2 px-3.5">
                        Customer Wallet / Store Credit
                        <span className="ml-2 text-xs font-normal text-purple-600 dark:text-purple-400">(Internal Ledger)</span>
                      </td>
                      <td className="border border-[#dcdcdc] dark:border-slate-700 text-right font-mono text-purple-900 dark:text-purple-200 py-2 px-3.5">
                        {formatMoney(totalWalletRedeemed)}
                      </td>
                      <td className="border border-[#dcdcdc] dark:border-slate-700 text-right font-mono text-purple-700 dark:text-purple-300 py-2 px-3.5 text-sm">
                        {formatMoney(totalWalletRedeemed)} <span className="text-xs opacity-75">(Auto)</span>
                      </td>
                      <td className="border border-[#dcdcdc] dark:border-slate-700 p-1.5">
                        <div className={getDiffBoxClass(0)}>
                          {formatMoney(0, true)}
                        </div>
                      </td>
                    </tr>
                  )}

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

                  {/* Row: Total (Countable Drawer & Terminal Inflow) */}
                  <tr className="bg-[#f8f9fa] dark:bg-slate-800/80 font-semibold text-slate-800 dark:text-slate-100">
                    <td className="border border-[#dcdcdc] dark:border-slate-700 text-right pr-4 py-2.5 px-3.5">
                      Total (Drawer & Terminal) :
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

                  {/* Financial Revenue vs Wallet Deposit Breakdown Row */}
                  {(totalDeposits > 0 || totalWalletRedeemed > 0) && (
                    <tr className="bg-white dark:bg-slate-900 text-sm">
                      <td colSpan={4} className="border border-[#dcdcdc] dark:border-slate-700 py-2.5 px-4">
                        <div className="flex flex-wrap items-center justify-end gap-6">
                          <span className="text-slate-600 dark:text-slate-300">
                            Net Earned Sales Revenue: <strong className="font-mono text-slate-900 dark:text-white text-[15px]">{formatMoney(totalSales)}</strong>
                          </span>
                          {totalDeposits > 0 && (
                            <span className="text-indigo-700 dark:text-indigo-300">
                              Wallet Deposits Collected (Liability): <strong className="font-mono text-[15px]">{formatMoney(totalDeposits)}</strong>
                            </span>
                          )}
                          {totalWalletRedeemed > 0 && (
                            <span className="text-purple-700 dark:text-purple-300">
                              Paid via Wallet / Store Credit: <strong className="font-mono text-[15px]">{formatMoney(totalWalletRedeemed)}</strong>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Comments / Discrepancies Textarea & Saving Button */}
            <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4 pt-2">
              <label htmlFor="comments" className="text-left sm:text-right font-medium text-slate-700 dark:text-slate-300 text-sm sm:text-[16px] pt-1 sm:pt-2 shrink-0 sm:w-28">
                Comments :
              </label>
              <div className="w-full flex flex-col items-stretch sm:items-end gap-3">
                <textarea 
                  id="comments" 
                  rows={2} 
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Enter reconciliation notes or register discrepancies..." 
                  className="w-full border border-slate-300 dark:border-slate-700 rounded p-2.5 text-sm sm:text-[16px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-slate-800 transition"
                ></textarea>

                {/* Save End of Day Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  {saveSuccess && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs sm:text-sm flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 size={16} /> Saved Successfully
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveEndOfDay}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save End of Day</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Detailed Transaction Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 overflow-hidden rounded">
            <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-[#e5e5e5] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6">
              <h2 className="text-base font-semibold text-black dark:text-white">Transaction Breakdown</h2>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
                  className="w-full sm:w-auto px-3 py-1.5 bg-white dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-black dark:text-slate-200 text-sm font-medium outline-none focus:border-[#91c9f7] rounded cursor-pointer"
                >
                  <option value="All">All Payments ({allPayments.length})</option>
                  <option value="Cash">Cash ({allPayments.filter(p => isCashPayment(p.method, p) && !isRefundPayment(p)).length})</option>
                  <option value="Card">Card ({allPayments.filter(p => isCardPayment(p.method, p) && !isRefundPayment(p)).length})</option>
                  <option value="Wallet">Wallet / Store Credit ({allPayments.filter(p => isWalletPayment(p.method, p) && !isRefundPayment(p)).length})</option>
                  <option value="Other">Other ({allPayments.filter(p => isOtherPayment(p.method, p) && !isRefundPayment(p)).length})</option>
                  <option value="Refunds">Refunds ({allPayments.filter(p => isRefundPayment(p)).length})</option>
                </select>
              </div>
            </div>

            {/* Mobile Native Transaction Breakdown List (hidden on md and up) */}
            <div className="md:hidden divide-y divide-[#ececec] dark:divide-slate-800/60">
              {filteredPayments.length === 0 ? (
                <div className="py-8 text-center text-[#a0a0a0] text-sm italic">
                  No transactions found for this selection.
                </div>
              ) : (
                filteredPayments.map((payment, idx) => {
                  const isRefund = isRefundPayment(payment);
                  const isDeposit = isDepositPayment(payment);
                  const baseMethod = getBasePaymentMethod(payment.method, payment);

                  return (
                    <div 
                      key={idx} 
                      className={`p-3.5 space-y-2 ${isRefund ? 'bg-rose-50/40 dark:bg-rose-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'} transition-colors`}
                    >
                      {/* Top Row: Invoice link + Time + Amount */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {payment.invoice_id ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/${branchSlug || 'default'}/invoices/${payment.invoice_id}`)}
                              className={`inline-flex items-center gap-1 font-mono font-bold text-sm hover:underline cursor-pointer ${
                                isRefund ? 'text-rose-700' : 'text-blue-700 dark:text-blue-400'
                              }`}
                              title={`Open Invoice ${payment.invoice_number || `#${payment.invoice_id}`}`}
                            >
                              <span>{payment.invoice_number || `#${payment.invoice_id}`}</span>
                              <ExternalLink size={12} className="opacity-70" />
                            </button>
                          ) : (
                            <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {payment.invoice_number || 'Deposit'}
                            </span>
                          )}
                          {isDeposit && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 rounded">
                              Wallet Deposit
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-slate-400">
                            {payment.paid_at ? new Date(payment.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                          </span>
                        </div>

                        {/* Amount */}
                        <div className={`font-mono font-bold text-base ${isRefund ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                          {isRefund ? '-' : ''}€{Math.abs(Number(payment.amount) || 0).toFixed(2)}
                        </div>
                      </div>

                      {/* Middle: Products summary / Customer */}
                      <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {payment.products_summary || payment.customer_name || 'Walk-in Customer'}
                      </div>

                      {/* Bottom: Staff name + Payment Method selector */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Staff: <span className="font-medium text-slate-700 dark:text-slate-200">{payment.user_name || 'Staff'}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isRefund && (
                            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold uppercase">
                              Refund
                            </span>
                          )}
                          {baseMethod === 'Wallet' ? (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded border border-purple-400 bg-purple-50 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700">
                              {payment.method || 'Wallet'}
                            </span>
                          ) : (
                            <select 
                              value={baseMethod}
                              onChange={(e) => {
                                const newBase = e.target.value;
                                const targetMethod = isRefund ? `Refund (${newBase})` : newBase;
                                updatePaymentMethod(payment.id, targetMethod);
                              }}
                              className={`px-2 py-0.5 text-xs bg-white dark:bg-slate-800 outline-none cursor-pointer rounded transition-colors ${
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
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Mobile Total Bar */}
              {filteredPayments.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-[#e5e5e5] dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                    {paymentTypeFilter === 'All' ? 'Total Transactions' : `Total (${paymentTypeFilter})`}
                  </span>
                  <span className="text-base font-mono font-bold text-slate-900 dark:text-blue-400">
                    €{filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Transaction Breakdown Table (hidden on mobile, visible md and up) */}
            <div className="hidden md:block overflow-x-auto w-full">
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
                      const isDeposit = isDepositPayment(payment);
                      const baseMethod = getBasePaymentMethod(payment.method, payment);

                      return (
                        <tr key={idx} className={isRefund ? 'bg-red-50/30 dark:bg-red-950/10' : ''}>
                          <td className="py-3 px-6 text-black dark:text-slate-300 font-medium">
                            {payment.user_name || 'Staff'}
                          </td>
                          <td className="py-3 px-6 font-mono text-[#707070]">
                            {payment.paid_at ? new Date(payment.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                          </td>
                          <td className="py-3 px-6 font-mono font-medium">
                            <div className="flex items-center gap-2">
                              {payment.invoice_id ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/${branchSlug || 'default'}/invoices/${payment.invoice_id}`)}
                                  className={`inline-flex items-center gap-1 hover:underline cursor-pointer group text-left ${
                                    isRefund ? 'text-rose-700 font-semibold' : 'text-blue-700 dark:text-blue-400 font-bold'
                                  }`}
                                  title={`Open Invoice ${payment.invoice_number || `#${payment.invoice_id}`}`}
                                >
                                  <span>{payment.invoice_number || `#${payment.invoice_id}`}</span>
                                  <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                </button>
                              ) : (
                                <span className={isRefund ? 'text-rose-700 font-semibold' : 'text-[#707070] dark:text-slate-400'}>
                                  {payment.invoice_number || 'Deposit'}
                                </span>
                              )}
                              {isDeposit && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 rounded">
                                  Wallet Deposit
                                </span>
                              )}
                            </div>
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
                              {baseMethod === 'Wallet' ? (
                                <span className="px-2.5 py-1 text-[13px] font-medium rounded border border-purple-400 bg-purple-50 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700">
                                  {payment.method || 'Wallet'}
                                </span>
                              ) : (
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
                              )}
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
                        {paymentTypeFilter === 'All' ? 'Total Transactions' : `Total (${paymentTypeFilter})`}
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
          currentDate={reportDate}
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
            totalDeposits={totalDeposits}
            totalWalletRedeemed={totalWalletRedeemed}
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
            totalDeposits={totalDeposits}
            totalWalletRedeemed={totalWalletRedeemed}
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
