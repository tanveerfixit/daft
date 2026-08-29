export interface InvoiceTaxDetails {
  taxRate: number;
  taxType: 'included' | 'excluded' | 'zero';
  netAmount: number;
  taxAmount: number;
  grandTotal: number;
  label: string;
}

export function getInvoiceTaxDetails(invoice: {
  subtotal?: number | string;
  tax_total?: number | string;
  grand_total?: number | string;
  tax_rate?: number | string | null;
  tax_type?: string | null;
}): InvoiceTaxDetails {
  const grandTotal = Number(invoice?.grand_total) || 0;
  const taxAmount = Number(invoice?.tax_total) || 0;
  const rawSubtotal = Number(invoice?.subtotal) || 0;

  if (taxAmount <= 0.001) {
    return {
      taxRate: 0,
      taxType: 'zero',
      netAmount: rawSubtotal || grandTotal,
      taxAmount: 0,
      grandTotal,
      label: 'VAT (0%)'
    };
  }

  // Has non-zero tax
  const explicitType = invoice?.tax_type as 'included' | 'excluded' | 'zero' | undefined;
  const rawRate = invoice?.tax_rate !== undefined && invoice?.tax_rate !== null ? Number(invoice.tax_rate) : undefined;

  let taxType: 'included' | 'excluded' | 'zero' = (explicitType === 'included' || explicitType === 'excluded') 
    ? explicitType 
    : 'excluded';
  
  let taxRate = (rawRate !== undefined && !isNaN(rawRate)) ? rawRate : 23;

  if (!explicitType) {
    // If tax_type was not stored (e.g. legacy invoice), deduce from figures
    if (Math.abs(rawSubtotal + taxAmount - grandTotal) < 0.05) {
      taxType = 'excluded';
      taxRate = rawSubtotal > 0 ? Math.round((taxAmount / rawSubtotal) * 100) : 23;
    } else {
      taxType = 'included';
      const net = Math.max(0, grandTotal - taxAmount);
      taxRate = net > 0 ? Math.round((taxAmount / net) * 100) : 23;
    }
  }

  let netAmount = rawSubtotal;
  if (taxType === 'included') {
    netAmount = Math.max(0, grandTotal - taxAmount);
  } else if (taxType === 'excluded') {
    netAmount = rawSubtotal > 0 ? rawSubtotal : Math.max(0, grandTotal - taxAmount);
  }

  const label = taxType === 'included'
    ? `VAT Incl. (${taxRate}%)`
    : `VAT (${taxRate}%)`;

  return {
    taxRate,
    taxType,
    netAmount,
    taxAmount,
    grandTotal,
    label
  };
}
