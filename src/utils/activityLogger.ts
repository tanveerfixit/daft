import { logActivity, LogActivityParams } from '../mysql.js';

export const ACTIVITY_TYPES = {
  // Auth & Security
  USER_LOGIN: 'User Login',
  USER_LOGIN_FAILED: 'User Login Failed',
  USER_CREATED: 'User Created',
  USER_UPDATED: 'User Updated',

  // Invoices & Payments
  INVOICE_CREATED: 'Invoice Created',
  INVOICE_EMAILED: 'Invoice Emailed',
  INVOICE_EMAIL_FAILED: 'Invoice Email Failed',
  REFUND_CREATED: 'Refund Created',
  PARTIAL_REFUND: 'Partial Refund',
  CREDIT_NOTE_ISSUED: 'Credit Note Issued',
  CREDIT_NOTE_REDEEMED: 'Credit Note Redeemed',
  PAYMENT_METHOD_UPDATED: 'Payment Method Updated',

  // Customers & Wallet
  CUSTOMER_CREATED: 'Customer Created',
  CUSTOMER_UPDATED: 'Customer Updated',
  CUSTOMER_DELETED: 'Customer Deleted',
  DEPOSIT_RECEIVED: 'Deposit Received',
  DEPOSIT_REFUNDED: 'Deposit Refunded',
  WALLET_ADJUSTMENT: 'Wallet Adjustment',

  // Products & Stock
  PRODUCT_CREATED: 'Product Created',
  PRODUCT_UPDATED: 'Product Updated',
  PRODUCT_ARCHIVED: 'Product Archived',
  PRODUCT_IMPORTED: 'Product Imported',
  STOCK_ADDED: 'Stock Added',
  PRODUCT_SOLD: 'Product Sold',
  PRODUCT_RETURNED: 'Product Returned',

  // Devices / Serialized Inventory
  DEVICE_CREATED: 'Device Created',
  DEVICE_UPDATED: 'Device Updated',
  DEVICE_SOLD: 'Device Sold',
  DEVICE_DELETED: 'Device Deleted',
  TRANSFER_DISPATCHED: 'Transfer Dispatched',
  TRANSFER_RECEIVED: 'Transfer Received',
  TRANSFER_CANCELLED: 'Transfer Cancelled',
  NOTE_ADDED: 'Note Added',

  // Repairs & EOD Reports
  REPAIR_JOB_CREATED: 'Repair Job Created',
  EOD_REPORT_SAVED: 'EOD Report Saved',
  EOD_REPORT_UPDATED: 'EOD Report Updated'
} as const;

export const STANDARD_ACTIVITY_TYPES: string[] = Object.values(ACTIVITY_TYPES);

/**
 * Formats a value for human-readable audit logs.
 * Never returns literal "null" or "undefined".
 */
export function formatAuditValue(val: unknown, options?: { currency?: boolean; emptyLabel?: string }): string {
  const empty = options?.emptyLabel ?? 'none';
  if (val === null || val === undefined) return empty;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return empty;
    }
    if (options?.currency) {
      const num = Number(trimmed);
      return Number.isFinite(num) ? `€${num.toFixed(2)}` : trimmed;
    }
    return trimmed;
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return empty;
    return options?.currency ? `€${val.toFixed(2)}` : String(val);
  }
  return String(val);
}

export interface DiffFieldSpec {
  key: string;
  label: string;
  currency?: boolean;
  numeric?: boolean;
  emptyLabel?: string;
}

export interface DiffResult {
  changes: string[];
  diff: Record<string, { from: any; to: any }>;
  summary: string;
}

/**
 * Computes a clean, null-safe diff between `before` and `after` objects.
 * Only keys present (`!== undefined`) in `after` are compared.
 */
export function diffFields(
  before: Record<string, any>,
  after: Record<string, any>,
  specs: DiffFieldSpec[]
): DiffResult {
  const changes: string[] = [];
  const diff: Record<string, { from: any; to: any }> = {};

  for (const spec of specs) {
    const nextVal = after[spec.key];
    if (nextVal === undefined) continue;

    const prevVal = before ? before[spec.key] : undefined;

    if (spec.numeric || spec.currency) {
      const prevNum = prevVal === null || prevVal === undefined || prevVal === '' ? null : Number(prevVal);
      const nextNum = nextVal === null || nextVal === undefined || nextVal === '' ? null : Number(nextVal);
      if (prevNum === nextNum) continue;
      if (prevNum !== null && nextNum !== null && Math.abs(prevNum - nextNum) < 0.0001) continue;

      const fromStr = formatAuditValue(prevNum, { currency: spec.currency, emptyLabel: spec.emptyLabel });
      const toStr = formatAuditValue(nextNum, { currency: spec.currency, emptyLabel: spec.emptyLabel });
      changes.push(`${spec.label}: ${fromStr} -> ${toStr}`);
      diff[spec.key] = { from: prevNum, to: nextNum };
    } else {
      const prevStr = prevVal === null || prevVal === undefined ? '' : String(prevVal).trim();
      const nextStr = nextVal === null || nextVal === undefined ? '' : String(nextVal).trim();
      if (prevStr === nextStr) continue;

      const fromStr = formatAuditValue(prevVal, { emptyLabel: spec.emptyLabel });
      const toStr = formatAuditValue(nextVal, { emptyLabel: spec.emptyLabel });
      changes.push(`${spec.label}: ${fromStr} -> ${toStr}`);
      diff[spec.key] = { from: prevVal ?? null, to: nextVal ?? null };
    }
  }

  return {
    changes,
    diff,
    summary: changes.join(', ')
  };
}

export function getReqAuditContext(req: any): Pick<
  LogActivityParams,
  'business_id' | 'branch_id' | 'user_id' | 'user_name' | 'ip_address' | 'user_agent'
> {
  const forwarded = req?.headers?.['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    null;

  const rawName = req?.user?.name;
  const userName =
    rawName && String(rawName).trim() && String(rawName).trim().toLowerCase() !== 'null'
      ? String(rawName).trim()
      : null;

  return {
    business_id: req?.user?.business_id ?? null,
    branch_id: req?.user?.branch_id ?? null,
    user_id: req?.user?.id ?? req?.userId ?? null,
    user_name: userName,
    ip_address: ip,
    user_agent: req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 500) : null
  };
}

export async function recordAudit(req: any, params: Omit<LogActivityParams, 'ip_address' | 'user_agent'> & { ip_address?: string | null; user_agent?: string | null }) {
  const ctx = getReqAuditContext(req);
  await logActivity({
    ...ctx,
    ...params,
    business_id: params.business_id !== undefined ? params.business_id : ctx.business_id,
    branch_id: params.branch_id !== undefined ? params.branch_id : ctx.branch_id,
    user_id: params.user_id !== undefined ? params.user_id : ctx.user_id,
    user_name: params.user_name !== undefined ? params.user_name : ctx.user_name
  });
}
