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

  if (!settings || !company) {
    return (
      <div className="p-4 text-center text-slate-400 text-sm font-mono">
        Loading receipt settings...
      </div>
    );
  }

  const addressParts = company.address.split(',').map(s => s.trim());
  const addressLine1 = addressParts.slice(0, 3).join(', ');
  const addressLine2 = addressParts.slice(3).join(', ');

  const rawCashier = invoice.payments?.[0]?.user_name || invoice.activities?.[0]?.user_name || 'Staff';
  const cashierName = formatCapitalized(rawCashier);
  const customerName = invoice.customer?.name ? formatCapitalized(invoice.customer.name) : 'Walk-in';

  const taxDetails = getInvoiceTaxDetails(invoice);

  const totalPaid = (invoice.payments && invoice.payments.length > 0)
    ? invoice.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : Number(invoice.grand_total) || 0;
  const changeDue = Math.max(0, totalPaid - (Number(invoice.grand_total) || 0));
  const dueAmount = Number(invoice.due_amount) || 0;

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
        fontSize: '13.5px',
        fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
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
      <div className="text-center">
        {settings.show_business_name && (
          <div className="text-bold" style={{ fontSize: '18px', marginBottom: '2px' }}>
            {company.name}
          </div>
        )}
        
        {settings.show_business_address && (
          <div style={{ fontSize: '13px', color: '#111' }}>
            <div>{addressLine1}{addressParts.length > 3 ? ',' : ''}</div>
            {addressLine2 && <div>{addressLine2}</div>}
          </div>
        )}
        
        <div style={{ fontSize: '13px', color: '#111', marginTop: '2px' }}>
          {settings.show_business_phone && <span>Tel: {company.phone}</span>}
          {settings.show_business_phone && settings.show_business_email && <span> · </span>}
          {settings.show_business_email && <span>{company.email}</span>}
        </div>
      </div>
      
      {/* Minimal Divider 1: Under Merchant Info */}
      <div className="receipt-line" />
      
      {/* 2. Receipt Metadata */}
      <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
        <div className="flex-between">
          <span><span className="text-bold">Invoice:</span> {invoice.invoice_number}</span> 
          <span>{new Date(invoice.created_at || now).toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        </div>
        <div className="flex-between">
          <span><span className="text-bold">Cashier:</span> {cashierName}</span> 
          <span>{new Date(invoice.created_at || now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {settings.show_customer_info && (
          <div className="flex-between" style={{ marginTop: '1px' }}>
            <span><span className="text-bold">Customer:</span> {customerName}</span>
            {invoice.customer?.phone && <span>{invoice.customer.phone}</span>}
          </div>
        )}
      </div>
      
      {/* Minimal Divider 2: Over Items Table */}
      <div className="receipt-line" />
      
      {/* 3. Itemized Products Table */}
      <div>
        <div className="flex-between text-bold" style={{ fontSize: '13.5px', paddingBottom: '3px' }}>
          <span style={{ width: '65%' }}>Description</span>
          <span style={{ width: '15%', textAlign: 'center' }}>Qty</span>
          <span style={{ width: '20%', textAlign: 'right' }}>Total</span>
        </div>

        {/* Item Rows */}
        {(invoice.items || []).map((item, idx) => (
          <div key={idx} style={{ marginBottom: '6px', fontSize: '13px' }}>
            <div className="flex-between" style={{ alignItems: 'flex-start' }}>
              <span className="text-bold" style={{ width: '65%', wordBreak: 'break-word' }}>
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
            <div style={{ fontSize: '12px', color: '#333' }}>
              @ €{(Number(item.price) || 0).toFixed(2)} each
              {item.sku_code && ` · SKU: ${item.sku_code}`}
              {item.imei && ` · IMEI: ${item.imei}`}
            </div>
            
            {/* Notes if any */}
            {item.notes && (
              <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#444' }}>
                ↳ {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Minimal Divider 3: Over Totals */}
      <div className="receipt-line" />

      {/* 4. Financial Totals & Tax */}
      <div style={{ fontSize: '13.5px', lineHeight: '1.45' }}>
        
        {/* Net Subtotal */}
        <div className="flex-between" style={{ fontSize: '13px' }}>
          <span>{taxDetails.taxType === 'included' ? 'Net (Excl. VAT):' : 'Subtotal:'}</span>
          <span>€{taxDetails.netAmount.toFixed(2)}</span>
        </div>

        {/* Tax/VAT */}
        <div className="flex-between" style={{ fontSize: '13px' }}>
          <span>{taxDetails.label}:</span>
          <span>€{taxDetails.taxAmount.toFixed(2)}</span>
        </div>

        {/* Grand Total */}
        <div className="flex-between text-bold" style={{ fontSize: '16px', margin: '4px 0', borderTop: '1.5px solid #000', borderBottom: '1.5px solid #000', padding: '3px 0' }}>
          <span>Total:</span>
          <span>€{taxDetails.grandTotal.toFixed(2)}</span>
        </div>

        {/* Payments Breakdown */}
        <div style={{ marginTop: '3px' }}>
          {invoice.payments && invoice.payments.length > 0 ? (
            invoice.payments.map((p, idx) => (
              <div key={idx} className="flex-between" style={{ fontSize: '13px' }}>
                <span>Paid ({formatCapitalized(p.method || 'Cash')}):</span>
                <span>€{(Number(p.amount) || 0).toFixed(2)}</span>
              </div>
            ))
          ) : (
            <div className="flex-between" style={{ fontSize: '13px' }}>
              <span>Paid ({formatCapitalized(invoice.payment_method || 'Cash')}):</span>
              <span>€{(Number(invoice.grand_total) || 0).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Change Due */}
        {changeDue > 0.005 && (
          <div className="flex-between text-bold" style={{ fontSize: '13.5px', marginTop: '2px' }}>
            <span>Change:</span>
            <span>€{changeDue.toFixed(2)}</span>
          </div>
        )}

        {/* Due / Unpaid Balance */}
        {dueAmount > 0.005 && (
          <div className="flex-between text-bold" style={{ fontSize: '13.5px', marginTop: '2px' }}>
            <span>Balance Due:</span>
            <span>€{dueAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Minimal Divider 4: Before Footer */}
      <div className="receipt-line" />

      {/* 5. Footer & Terms */}
      <div className="text-center text-bold" style={{ fontSize: '13px', margin: '3px 0' }}>
        Thank You For Your Business!
      </div>

      <div style={{ textAlign: 'center', fontSize: '11.5px', marginTop: '3px', lineHeight: '1.3', color: '#222' }}>
        {settings.footer_text || (
          <>
            All mobile device sales are final. Accessories may be exchanged within 7 days with valid receipt & original packaging.
          </>
        )}
      </div>

      <div className="text-center" style={{ fontSize: '12px', marginTop: '5px' }}>
        #{invoice.invoice_number}
      </div>
    </div>
  );
}
