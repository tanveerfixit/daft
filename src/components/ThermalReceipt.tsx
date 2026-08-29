import React from 'react';
import { Invoice, InvoiceItem, Customer } from '../types';
import { ThermalPrinterSettings, CompanyInfo } from '../hooks/useThermalSettings';
import { getInvoiceTaxDetails } from '../utils/tax';

interface Props {
  invoice: Invoice & { items: InvoiceItem[], customer?: Customer };
  settings?: ThermalPrinterSettings | null;
  company?: CompanyInfo | null;
}

export default function ThermalReceipt({ invoice, settings, company }: Props) {
  const now = new Date();

  if (!settings || !company) {
    return (
      <div className="p-4 text-center text-slate-400 text-xs font-mono">
        Loading receipt settings...
      </div>
    );
  }

  // Split address if it's very long to maintain clean alignment
  const addressParts = company.address.split(',').map(s => s.trim());
  const addressLine1 = addressParts.slice(0, 3).join(', ');
  const addressLine2 = addressParts.slice(3).join(', ');

  const cashierName = invoice.payments?.[0]?.user_name || invoice.activities?.[0]?.user_name || 'STAFF';

  return (
    <div 
      className="thermal-receipt bg-white text-black mx-auto" 
      id="thermal-receipt"
      style={{ 
        width: '72mm',
        maxWidth: '72mm',
        lineHeight: '1.35',
        padding: '1mm 2mm',
        boxSizing: 'border-box',
        fontSize: '12px',
        fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0; size: 80mm auto; }
          body * { visibility: hidden; }
          #thermal-receipt, #thermal-receipt * { visibility: visible; }
          #thermal-receipt {
            position: absolute; left: 0; top: 0;
            width: 72mm; padding: 2mm;
            background: white !important;
            color: black !important;
          }
        }
        .receipt-separator { height: 12px; }
        .flex-between { display: flex; justify-content: space-between; }
        .text-bold { font-weight: bold; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
      `}} />
      
      {/* ======================================================== */}
      {/* [Merchant Header] (Centered block: Name, Address, Contact) */}
      {/* ======================================================== */}
      <div className="text-center mb-2">
        {settings.show_business_name && (
          <div className="text-bold" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
            {company.name}
          </div>
        )}
        {settings.show_business_address && (
          <div className="mt-0.5" style={{ fontSize: '12px' }}>
            <div>{addressLine1}{addressParts.length > 3 ? ',' : ''}</div>
            {addressLine2 && <div>{addressLine2}</div>}
          </div>
        )}
        {settings.show_business_phone && <div style={{ fontSize: '12px' }}>TEL: {company.phone}</div>}
        {settings.show_business_email && <div style={{ fontSize: '12px' }}>{company.email}</div>}
      </div>
      
      <div className="receipt-separator" />
      
      {/* ======================================================== */}
      {/* [Metadata Row] (Left/Right balanced text: ID, Date, User) */}
      {/* ======================================================== */}
      <div className="mb-2" style={{ fontSize: '12px', lineHeight: '1.4' }}>
        <div className="flex-between">
          <span>INV ID: <span>{invoice.invoice_number}</span></span> 
          <span>DATE: {new Date(invoice.created_at || now).toLocaleDateString()}</span>
        </div>
        <div className="flex-between">
          <span>CASHIER: {cashierName.toUpperCase()}</span> 
          <span>TIME: {new Date(invoice.created_at || now).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        {settings.show_customer_info && (
          <div className="flex-between" style={{ marginTop: '3px', paddingTop: '3px' }}>
            <span>CUSTOMER:</span>
            <span>{invoice.customer?.name?.toUpperCase() || 'WALK-IN'}</span>
          </div>
        )}
      </div>
      
      <div className="receipt-separator" />
      
      {/* ======================================================== */}
      {/* [Items Grid Container] (2-column details & summary layout) */}
      {/* ======================================================== */}
      <div className="mb-2">
        {/* Table Header - Bold Heading */}
        <div className="flex-between text-bold mb-2" style={{ fontSize: '12px', paddingBottom: '3px' }}>
          <span style={{ width: '70%' }}>DESCRIPTION</span>
          <span style={{ width: '30%', textAlign: 'right' }}>TOTAL</span>
        </div>

        {/* Dynamic Item Rows - Regular weight */}
        {(invoice.items || []).map((item, idx) => (
          <div key={idx} className="flex-between mb-3 animate-in fade-in" style={{ fontSize: '12px', alignItems: 'flex-start' }}>
            <span style={{ width: '70%', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', flexDirection: 'column' }}>
              <span>{item.product_name?.toUpperCase()}</span>
              {item.notes && (
                <span style={{ fontSize: '11px', color: '#111', fontStyle: 'italic', marginTop: '1px', wordBreak: 'break-word' }}>
                  Note: {item.notes}
                </span>
              )}
              <span style={{ fontSize: '12px', color: '#000', marginTop: '2px', fontFamily: 'monospace' }}>
                SKU: {item.sku_code || 'N/A'} {item.imei && ` • IMEI: ${item.imei}`}
              </span>
              <span style={{ fontSize: '12px', color: '#000', marginTop: '1px' }}>
                QTY: {item.quantity} x €{(Number(item.price) || 0).toFixed(2)}
              </span>
            </span>
            <span style={{ width: '30%', textAlign: 'right', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
              €{(Number(item.total) || 0).toFixed(2)}
            </span>
          </div>
        ))}

        <div style={{ marginTop: '10px', height: '10px' }} />

        {/* ======================================== */}
        {/* Summaries inside the Grid Table Container - Regular weight */}
        {/* ======================================== */}
        {(() => {
          const taxDetails = getInvoiceTaxDetails(invoice);
          return (
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Taxable / Net Total */}
              <div className="flex-between">
                <span style={{ paddingLeft: '20%' }}>
                  {taxDetails.taxType === 'included' ? 'NET (EXCL. VAT):' : 'TAXABLE TOTAL:'}
                </span>
                <span>€{taxDetails.netAmount.toFixed(2)}</span>
              </div>

              {/* Tax */}
              <div className="flex-between">
                <span style={{ paddingLeft: '20%' }}>{taxDetails.label.toUpperCase()}:</span>
                <span>€{taxDetails.taxAmount.toFixed(2)}</span>
              </div>

              {/* Grand Total - Bold heading */}
              <div className="flex-between text-bold" style={{ fontSize: '12px', padding: '3px 0' }}>
                <span style={{ paddingLeft: '20%' }}>GRAND TOTAL:</span>
                <span>€{taxDetails.grandTotal.toFixed(2)}</span>
              </div>

          {/* Payment Ledger Line - Regular weight */}
          {invoice.payments && invoice.payments.length > 0 ? (
            invoice.payments.map((p, idx) => (
              <div key={idx} className="flex-between" style={{ color: '#000' }}>
                <span style={{ paddingLeft: '20%' }}>{p.method?.toUpperCase()}:</span>
                <span>€{(Number(p.amount) || 0).toFixed(2)}</span>
              </div>
            ))
          ) : (
            <div className="flex-between" style={{ color: '#000' }}>
              <span style={{ paddingLeft: '20%' }}>{invoice.payment_method?.toUpperCase() || 'CASH'}:</span>
              <span>€{(Number(invoice.grand_total) || 0).toFixed(2)}</span>
            </div>
          )}

          {/* Remaining Due (if any) - Regular weight */}
          {(Number(invoice.due_amount) || 0) > 0 && (
            <div className="flex-between text-red-600" style={{ fontSize: '12px' }}>
              <span style={{ paddingLeft: '20%' }}>DUE:</span>
              <span>€{(Number(invoice.due_amount) || 0).toFixed(2)}</span>
            </div>
          )}

          {/* Change Due (if any) */}
          {(() => {
            const totalPaid = (invoice.payments && invoice.payments.length > 0)
              ? invoice.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
              : Number(invoice.grand_total) || 0;
            const changeDue = Math.max(0, totalPaid - (Number(invoice.grand_total) || 0));
            if (changeDue > 0.005) {
              return (
                <div className="flex-between text-bold" style={{ fontSize: '12px', color: '#000', padding: '2px 0' }}>
                  <span style={{ paddingLeft: '20%' }}>CHANGE DUE:</span>
                  <span>€{changeDue.toFixed(2)}</span>
                </div>
              );
            }
            return null;
          })()}
        </div>
      );
    })()}
      </div>
      
      <div className="receipt-separator" />
      
      {/* ======================================================== */}
      {/* [Footer Legal Block] (Justified policy paragraph block - Regular weight) */}
      {/* ======================================================== */}
      <div style={{ textAlign: 'justify', fontSize: '11px', marginTop: '12px', lineHeight: '1.35', color: '#111' }}>
        {settings.footer_text || (
          <>
            THANK YOU FOR YOUR PURCHASE! ALL MOBILE PHONE SALES ARE FINAL. 
            ACCESSORIES AND CORRESPONDING CHARGERS MAY BE EXCHANGED WITHIN 7 DAYS WITH A VALID 
            RECEIPT AND ORIGINAL PACKAGING. A 30-DAY IN-HOUSE WARRANTY APPLIES TO DIAGNOSED REPAIRS 
            FROM THE EXECUTED INVOICE DATE.
          </>
        )}
      </div>
    </div>
  );
}
