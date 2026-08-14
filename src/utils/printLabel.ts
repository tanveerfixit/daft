import JsBarcode from 'jsbarcode';

export interface DevicePrintData {
  imei: string;
  product_name: string;
  color?: string;
  gb?: string;
  ram?: string;
  condition?: string;
  selling_price?: number;
  po_number?: string;
}

export function printDeviceLabelDirect(device: DevicePrintData, printerSettings?: any) {
  if (!device || !device.imei) return;

  const settings = printerSettings || {
    label_size: '2.25" (57mm) x 1.25" (32mm) Dymo 11354 Multi-Purpose (LabelWriter 450)',
    margin_top: 2,
    margin_left: 3,
    margin_bottom: 2,
    margin_right: 3,
    orientation: 'Landscape',
    font_size: 'Regular',
    font_family: 'Arial'
  };

  const isLandscape = settings.orientation !== 'Portrait';
  const width = isLandscape ? '57mm' : '32mm';
  const height = isLandscape ? '32mm' : '57mm';

  // Generate SVG barcode directly in JS (no CDN dependency, instant render)
  const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svgNode, device.imei.trim(), {
      format: 'CODE128',
      width: 2,
      height: 34,
      displayValue: false,
      margin: 0,
      marginTop: 0,
      marginBottom: 0,
      lineColor: '#000000',
      background: 'transparent'
    });
  } catch (err) {
    console.error('Barcode generation error:', err);
  }

  const svgHtml = svgNode.outerHTML;

  // Build specs string with Spec: format (e.g. Spec: 6/256GB)
  const cleanRam = device.ram ? device.ram.replace(/ram/i, '').replace(/gb/i, '').trim() : '';
  const cleanGb = device.gb ? (device.gb.toUpperCase().includes('GB') ? device.gb.trim() : `${device.gb.trim()}GB`) : '';
  const ramStorage = cleanRam && cleanGb ? `${cleanRam}/${cleanGb}` : (cleanGb || cleanRam);
  
  const specsParts = [
    ramStorage ? `Spec: ${ramStorage}` : null,
    device.color || null
  ].filter(Boolean);
  const specs = specsParts.join(' • ');

  const formattedPrice = (device.selling_price !== undefined && device.selling_price !== null && !isNaN(Number(device.selling_price)))
    ? Number(device.selling_price).toFixed(2)
    : null;

  const titleFontSize = settings.font_size === 'Small' ? '8.5pt' : settings.font_size === 'Large' ? '11.5pt' : '10pt';
  const specsFontSize = settings.font_size === 'Small' ? '5.5pt' : settings.font_size === 'Large' ? '7.5pt' : '6.5pt';
  const priceFontSize = settings.font_size === 'Small' ? '12pt' : settings.font_size === 'Large' ? '15.5pt' : '13.5pt';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open the print preview.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Print Label - ${escapeHtml(device.imei)}</title>
        <style>
          @page {
            size: ${width} ${height};
            margin: 0;
          }
          *, *:before, *:after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: ${width};
            height: ${height};
            overflow: hidden;
            background: #fff;
            color: #000;
            font-family: ${settings.font_family || 'Arial'}, sans-serif;
          }
          body {
            padding: ${Math.max(settings.margin_top || 6, 6)}px ${settings.margin_right || 3}px ${Math.max(settings.margin_bottom || 2, 2)}px ${settings.margin_left || 3}px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            text-align: center;
          }
          .label-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
          }
          .label-title {
            font-size: ${titleFontSize};
            font-weight: 800;
            line-height: 1.15;
            text-transform: uppercase;
            width: 100%;
            /* Allow wrapping to 2nd line if text does not fit */
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
            letter-spacing: -0.2px;
            padding-top: 0px;
            margin-bottom: 1px;
          }
          .label-specs {
            font-size: ${specsFontSize};
            line-height: 1.1;
            color: #111;
            width: 100%;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
            margin-top: 1px;
            margin-bottom: 1px;
          }
          .label-price {
            font-size: ${priceFontSize};
            font-weight: 900;
            color: #000;
            width: 100%;
            line-height: 1.1;
            margin-top: 3px;
            margin-bottom: 3px;
            letter-spacing: -0.3px;
          }
          .barcode-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-end;
            margin-top: 1px;
            margin-bottom: 0px;
            padding: 0;
            overflow: hidden;
          }
          .barcode-wrapper svg {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: 35px !important;
            display: block;
            margin: 0 !important;
            padding: 0 !important;
          }
          .imei-row {
            width: 100%;
            font-family: 'Courier New', monospace;
            font-size: 7.5pt;
            font-weight: 700;
            display: flex;
            justify-content: space-between;
            padding: 0 1px;
            margin-top: 2px;
            line-height: 1;
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="label-title">${escapeHtml(device.product_name || 'DEVICE')}</div>
          ${specs ? `<div class="label-specs">${escapeHtml(specs)}</div>` : ''}
          ${formattedPrice !== null ? `<div class="label-price"><strong>Price: €${escapeHtml(formattedPrice)}</strong></div>` : ''}
          <div class="barcode-wrapper">
            ${svgHtml}
          </div>
          <div class="imei-row">
            ${device.imei.split('').map(c => `<span>${escapeHtml(c)}</span>`).join('')}
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
