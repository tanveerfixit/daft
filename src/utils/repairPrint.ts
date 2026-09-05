/**
 * Repair Printing Utilities
 * Supports:
 * 1. Dymo / Thermal Device Sticker Labels (to stick on customer phones/tablets/laptops)
 * 2. 80mm / 58mm Thermal Customer Receipts & Collection Tickets
 */

export interface RepairPrintData {
  id: number;
  customer_name?: string;
  customer_phone?: string;
  phone?: string;
  customer_email?: string;
  device_model: string;
  issue?: string;
  status?: string;
  total_quote?: number | string;
  deposit_paid?: number | string;
  remaining_balance?: number | string;
  notes?: string;
  created_at?: string;
  branch_name?: string;
}

/**
 * Print a compact Dymo / Thermal Sticker Label for the device.
 * Designed to stick directly onto customer devices (phones, tablets, laptops).
 */
export async function printRepairDeviceLabel(repair: RepairPrintData, customSettings?: any) {
  let printerSettings = customSettings;

  if (!printerSettings) {
    try {
      const pRes = await fetch('/api/printer-settings').then(r => r.ok ? r.json() : null).catch(() => null);
      printerSettings = pRes;
    } catch {
      // Fallback
    }
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print device labels.');
    return;
  }

  const {
    margin_top = 1,
    margin_left = 1,
    margin_bottom = 1,
    margin_right = 1,
    orientation = 'Landscape',
    font_family = 'Arial'
  } = printerSettings || {};

  const isLandscape = orientation === 'Landscape';
  const width = isLandscape ? '57mm' : '32mm';
  const height = isLandscape ? '32mm' : '57mm';

  const customerName = repair.customer_name || 'Walk-in Customer';
  const phone = repair.customer_phone || repair.phone || '';
  const quoteVal = Number(repair.total_quote || 0);
  const depositVal = Number(repair.deposit_paid || 0);
  const remainingVal = Number(repair.remaining_balance || (quoteVal - depositVal));
  const dateStr = repair.created_at 
    ? new Date(repair.created_at).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: '2-digit' }) 
    : new Date().toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: '2-digit' });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Repair Label #${repair.id} - ${repair.device_model}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${width} ${height};
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: ${width};
            height: ${height};
            overflow: hidden;
            background: #ffffff;
            color: #000000;
          }
          body {
            padding: ${margin_top}mm ${margin_right}mm ${margin_bottom}mm ${margin_left}mm;
            font-family: ${font_family}, Arial, sans-serif;
            font-size: 11px;
            box-sizing: border-box;
            line-height: 1.2;
          }
          * {
            -webkit-print-color-adjust: exact;
            box-sizing: border-box;
          }
          .sticker-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 2px;
          }
          .header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #000;
            padding-bottom: 2px;
            margin-bottom: 2px;
          }
          .job-badge {
            font-size: 13px;
            font-weight: 900;
            background: #000;
            color: #fff;
            padding: 1px 5px;
            border-radius: 2px;
            letter-spacing: 0.5px;
          }
          .date-badge {
            font-size: 10px;
            font-weight: 700;
          }
          .device-name {
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.25;
            color: #000;
          }
          .customer-row {
            font-size: 10px;
            font-weight: 700;
            display: flex;
            justify-content: space-between;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 1px 0;
          }
          .fault-box {
            font-size: 9.5px;
            font-weight: 600;
            line-height: 1.15;
            color: #111;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            background: #f4f4f4;
            padding: 2px 3px;
            border-radius: 2px;
            border: 1px solid #ccc;
          }
          .price-row {
            font-size: 10px;
            font-weight: 800;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px dashed #000;
            padding-top: 2px;
            margin-top: 1px;
          }
        </style>
      </head>
      <body>
        <div class="sticker-container">
          <div class="header-row">
            <span class="job-badge">JOB #${repair.id}</span>
            <span class="date-badge">${dateStr}</span>
          </div>
          
          <div class="device-name">${repair.device_model || 'DEVICE REPAIR'}</div>
          
          <div class="customer-row">
            <span>👤 ${customerName}</span>
            <span>📞 ${phone}</span>
          </div>

          <div class="fault-box">
            <b>Fault:</b> ${repair.issue || 'General Inspection / Repair'}
          </div>

          <div class="price-row">
            <span>${quoteVal > 0 ? `Quote: €${quoteVal.toFixed(2)}` : 'Quote: Pending'}</span>
            ${depositVal > 0 ? `<span>Dep: €${depositVal.toFixed(2)}</span>` : ''}
            <span>${remainingVal > 0 ? `Bal: €${remainingVal.toFixed(2)}` : (quoteVal > 0 ? `Bal: €${quoteVal.toFixed(2)}` : '')}</span>
          </div>
        </div>

        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.focus();
              window.print();
              setTimeout(() => window.close(), 1000);
            }, 250);
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Print a full 80mm / 58mm Thermal Customer Receipt Voucher
 */
export async function printRepairCustomerReceipt(repair: RepairPrintData, customCompany?: any) {
  let company = customCompany;
  if (!company) {
    try {
      const res = await fetch('/api/company');
      if (res.ok) company = await res.json();
    } catch {
      // Fallback
    }
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print repair receipts.');
    return;
  }

  const customerName = repair.customer_name || 'Walk-in Customer';
  const phone = repair.customer_phone || repair.phone || '';
  const quoteVal = Number(repair.total_quote || 0);
  const depositVal = Number(repair.deposit_paid || 0);
  const remainingVal = Number(repair.remaining_balance || (quoteVal - depositVal));
  const dateStr = repair.created_at ? new Date(repair.created_at).toLocaleString('en-IE') : new Date().toLocaleString('en-IE');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Repair Receipt #${repair.id}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: Arial, monospace, sans-serif;
            font-size: 12px;
            line-height: 1.25;
            color: #000;
            width: 72mm;
            max-width: 72mm;
            margin: 0 auto;
            padding: 4mm 2mm;
            box-sizing: border-box;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .border-b { border-bottom: 1px dashed #000; }
          .border-t { border-top: 1px dashed #000; }
          .my-1 { margin-top: 4px; margin-bottom: 4px; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .row { display: flex; justify-content: space-between; }
          #barcode { width: 90% !important; height: 28px !important; margin: 4px auto; display: block; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div style="font-size: 15px; font-weight: 900; text-transform: uppercase;">${company?.name || 'EPOS REPAIRS'}</div>
          ${company?.address ? `<div style="font-size: 10px;">${company.address}</div>` : ''}
          ${company?.phone ? `<div style="font-size: 10px;">Tel: ${company.phone}</div>` : ''}
          <div class="border-b my-1"></div>
          <div style="font-size: 13px; font-weight: 900; letter-spacing: 0.5px;">REPAIR TICKET</div>
          <div style="font-size: 14px; font-weight: 900; margin: 2px 0;">JOB #${repair.id}</div>
          <div style="font-size: 10px;">${dateStr}</div>
        </div>

        <div class="border-b my-1"></div>

        <div class="row"><span class="font-bold">Customer:</span> <span>${customerName}</span></div>
        ${phone ? `<div class="row"><span class="font-bold">Phone:</span> <span>${phone}</span></div>` : ''}
        <div class="row"><span class="font-bold">Device:</span> <span class="font-bold">${repair.device_model}</span></div>
        
        <div class="my-1">
          <div class="font-bold">Reported Fault:</div>
          <div style="padding-left: 4px; font-size: 11px;">${repair.issue || 'Inspection & Diagnosis'}</div>
        </div>

        <div class="border-t border-b py-1.5 my-1.5">
          <div class="row">
            <span>Estimated Quote:</span>
            <span class="font-bold">${quoteVal > 0 ? `€${quoteVal.toFixed(2)}` : 'Pending'}</span>
          </div>
          ${depositVal > 0 ? `
            <div class="row">
              <span>Deposit Paid:</span>
              <span>€${depositVal.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="row" style="font-size: 13px; font-weight: 900; margin-top: 3px;">
            <span>Balance Due:</span>
            <span>€${remainingVal > 0 ? remainingVal.toFixed(2) : (quoteVal > 0 ? quoteVal.toFixed(2) : '0.00')}</span>
          </div>
        </div>

        <div class="border-t my-2"></div>
        <div class="text-center" style="font-size: 10px; color: #333;">
          <div>Please retain this ticket to collect your device.</div>
          <div style="margin-top: 2px;">Thank you for your custom!</div>
        </div>

        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.focus();
              window.print();
              setTimeout(() => window.close(), 1000);
            }, 250);
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
