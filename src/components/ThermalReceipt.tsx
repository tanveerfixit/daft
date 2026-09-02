import React from 'react';
import { Invoice, InvoiceItem, Customer } from '../types';
import { ThermalPrinterSettings, CompanyInfo } from '../hooks/useThermalSettings';
import { getInvoiceTaxDetails } from '../utils/tax';

interface Props {
  invoice: Invoice & { items: InvoiceItem[], customer?: Customer };
  settings?: ThermalPrinterSettings | null;
  company?: CompanyInfo | null;
}

function formatCapitalized(str: string) {
  if (!str) return '';
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export default function ThermalReceipt({ invoice, settings, company }: Props) {
  const now = new Date();

  if (!settings) {
    return (
      <div className="p-4 text-center text-slate-400 text-sm font-mono">
        Loading receipt settings...
      </div>
    );
  }

  const invAny = invoice as any;
  const businessName = company?.name || invAny?.branch_name || 'Phone Lab';
  const businessAddress = company?.address || invAny?.branch_address || "32 O'Connell Street, Clonroad Beg, Ennis";
  const businessPhone = company?.phone || invAny?.branch_phone || '(065) 672 4192';
  const businessEmail = company?.email || invAny?.branch_email || '';

  const addressParts = (businessAddress || '').split(',').map(s => s.trim());
  const addressLine1 = addressParts.slice(0, 3).join(', ');
  const addressLine2 = addressParts.slice(3).join(', ');

  const rawCashier = invoice.payments?.[0]?.user_name || invoice.activities?.[0]?.user_name || 'Staff';
  const cashierName = formatCapitalized(rawCashier);
  const customerName = invoice.customer?.name ? formatCapitalized(invoice.customer.name) : (invoice.customer_name ? formatCapitalized(invoice.customer_name) : 'Walk-in');

  const taxDetails = getInvoiceTaxDetails(invoice);

  const totalPaid = (invoice.payments && invoice.payments.length > 0)
    ? invoice.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : Number(invoice.grand_total) || 0;
  const changeDue = Math.max(0, totalPaid - (Number(invoice.grand_total) || 0));
  const dueAmount = Number(invoice.due_amount) || 0;

  const showHeaderInfo = settings.show_logo || settings.show_business_name || settings.show_business_address || settings.show_business_phone || settings.show_business_email;
  const showMetaInfo = settings.show_invoice_number !== false || settings.show_date !== false || settings.show_customer_info;

  return (
    <div 
      className="thermal-receipt bg-white text-black mx-auto" 
      id="thermal-receipt"
      style={{ 
        width: '72mm',
        maxWidth: '72mm',
        lineHeight: '1.35',
        padding: '2mm 2mm',
        boxSizing: 'border-box',
        fontSize: settings.font_size || '14px',
        fontFamily: settings.font_family ? `${settings.font_family}, 'Segoe UI', Arial, sans-serif` : "'Segoe UI', Arial, Helvetica, sans-serif",
        color: '#000000',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0; size: 80mm auto; }
          body * { visibility: hidden; }
          #thermal-receipt, #thermal-receipt * { visibility: visible; }
          #thermal-receipt {
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 72mm; 
            padding: 2mm 2mm;
            background: white !important;
            color: black !important;
            font-size: ${settings.font_size || '14px'};
            font-family: ${settings.font_family ? `${settings.font_family}, 'Segoe UI', Arial, sans-serif` : "'Segoe UI', Arial, Helvetica, sans-serif"};
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        .receipt-line { border-top: 1px dashed #000; margin: 6px 0; }
        .receipt-solid { border-top: 1.5px solid #000; margin: 6px 0; }
        .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
        .text-bold { font-weight: bold; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
      `}} />
      
      {/* 1. Header / Merchant Info */}
      {showHeaderInfo && (
        <div className="text-center">
          {settings.show_logo && (
            <div style={{ display: 'inline-block', width: '32px', height: '32px', background: '#e5e7eb', borderRadius: '50%', lineHeight: '32px', fontSize: '9px', fontWeight: 'bold', marginBottom: '4px', color: '#4b5563' }}>
              LOGO
            </div>
          )}

          {settings.show_business_name && (
            <div className="text-bold" style={{ fontSize: '1.25em', marginBottom: '2px' }}>
              {businessName}
            </div>
          )}
          
          {settings.show_business_address && businessAddress && (
            <div style={{ fontSize: '0.95em', color: '#111' }}>
              <div>{addressLine1}{addressParts.length > 3 ? ',' : ''}</div>
              {addressLine2 && <div>{addressLine2}</div>}
            </div>
          )}
          
          {((settings.show_business_phone && businessPhone) || (settings.show_business_email && businessEmail)) && (
            <div style={{ fontSize: '0.95em', color: '#111', marginTop: '2px' }}>
              {settings.show_business_phone && businessPhone && <span>Tel: {businessPhone}</span>}
              {settings.show_business_phone && businessPhone && settings.show_business_email && businessEmail && <span> · </span>}
              {settings.show_business_email && businessEmail && <span>{businessEmail}</span>}
            </div>
          )}
        </div>
      )}
      
      {/* Divider under header */}
      {showHeaderInfo && showMetaInfo && <div className="receipt-line" />}
      
      {/* 2. Receipt Metadata */}
      {showMetaInfo && (
        <div style={{ fontSize: '0.95em', lineHeight: '1.4' }}>
          {(settings.show_invoice_number !== false || settings.show_date !== false) && (
            <div className="flex-between">
              {settings.show_invoice_number !== false ? (
                <span><span className="text-bold">Invoice:</span> {invoice.invoice_number}</span>
              ) : <span />}
              {settings.show_date !== false && (
                <span>{new Date(invoice.created_at || now).toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              )}
            </div>
          )}
          
          {settings.show_date !== false && (
            <div className="flex-between">
              <span><span className="text-bold">Cashier:</span> {cashierName}</span> 
              <span>{new Date(invoice.created_at || now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          {settings.show_customer_info && (
            <div className="flex-between" style={{ marginTop: '1px' }}>
              <span><span className="text-bold">Customer:</span> {customerName}</span>
              {invoice.customer?.phone && <span>{invoice.customer.phone}</span>}
            </div>
          )}
        </div>
      )}
      
      {/* 3. Itemized Products Table */}
      {settings.show_items_table !== false && (
        <div>
          <div className="receipt-line" />
          <div className="flex-between text-bold" style={{ fontSize: '0.98em', paddingBottom: '3px' }}>
            <span style={{ width: '65%' }}>Description</span>
            <span style={{ width: '15%', textAlign: 'center' }}>Qty</span>
            <span style={{ width: '20%', textAlign: 'right' }}>Total</span>
          </div>

          {/* Item Rows */}
          {(invoice.items || []).map((item, idx) => (
            <div key={idx} style={{ marginBottom: '6px', fontSize: '0.95em' }}>
              <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                <span style={{ width: '65%', wordBreak: 'break-word', fontWeight: 'normal', color: '#000000' }}>
                  {item.product_name}
                </span>
                <span style={{ width: '15%', textAlign: 'center' }}>
                  {item.quantity}
                </span>
                <span className="text-bold" style={{ width: '20%', textAlign: 'right' }}>
                  €{(Number(item.total) || 0).toFixed(2)}
                </span>
              </div>
              
              {/* Price unit line */}
              <div style={{ fontSize: '0.88em', color: '#333333' }}>
                @ €{(Number(item.price) || 0).toFixed(2)} each
                {item.imei && ` · IMEI: ${item.imei}`}
              </div>
              
              {/* Notes if any */}
              {item.notes && (
                <div style={{ fontSize: '0.88em', fontStyle: 'italic', color: '#444444' }}>
                  ↳ {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 4. Financial Totals & Tax */}
      {settings.show_totals !== false && (
        <div>
          <div className="receipt-line" />
          <div style={{ fontSize: '0.98em', lineHeight: '1.45' }}>
            {/* Net Subtotal */}
            <div className="flex-between" style={{ fontSize: '0.95em' }}>
              <span>{taxDetails.taxType === 'included' ? 'Net (Excl. VAT):' : 'Subtotal:'}</span>
              <span>€{taxDetails.netAmount.toFixed(2)}</span>
            </div>

            {/* Tax/VAT */}
            <div className="flex-between" style={{ fontSize: '0.95em' }}>
              <span>{taxDetails.label}:</span>
              <span>€{taxDetails.taxAmount.toFixed(2)}</span>
            </div>

            {/* Grand Total */}
            <div className="flex-between text-bold" style={{ fontSize: '1.2em', margin: '4px 0', borderTop: '1.5px solid #000', borderBottom: '1.5px solid #000', padding: '3px 0' }}>
              <span>Total:</span>
              <span>€{taxDetails.grandTotal.toFixed(2)}</span>
            </div>

            {/* Payments Breakdown */}
            <div style={{ marginTop: '3px' }}>
              {invoice.payments && invoice.payments.length > 0 ? (
                invoice.payments.map((p, idx) => (
                  <div key={idx} className="flex-between" style={{ fontSize: '0.95em' }}>
                    <span>Paid ({formatCapitalized(p.method || 'Cash')}):</span>
                    <span>€{(Number(p.amount) || 0).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="flex-between" style={{ fontSize: '0.95em' }}>
                  <span>Paid ({formatCapitalized(invoice.payment_method || 'Cash')}):</span>
                  <span>€{(Number(invoice.grand_total) || 0).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Change Due */}
            {changeDue > 0.005 && (
              <div className="flex-between text-bold" style={{ fontSize: '1em', marginTop: '2px' }}>
                <span>Change:</span>
                <span>€{changeDue.toFixed(2)}</span>
              </div>
            )}

            {/* Due / Unpaid Balance */}
            {dueAmount > 0.005 && (
              <div className="flex-between text-bold" style={{ fontSize: '1em', marginTop: '2px' }}>
                <span>Balance Due:</span>
                <span>€{dueAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Footer & Terms */}
      {settings.show_footer !== false && settings.footer_text && (
        <div>
          <div className="receipt-line" />
          <div style={{ textAlign: 'center', fontSize: '0.88em', marginTop: '3px', lineHeight: '1.3', color: '#222' }}>
            {settings.footer_text}
          </div>
        </div>
      )}
    </div>
  );
}
