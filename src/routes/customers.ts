import { Router } from 'express';
import { pool, query, queryOne, execute, getBranchPrefix } from '../mysql.js';
import { z } from 'zod';
import { ACTIVITY_TYPES, diffFields, recordAudit } from '../utils/activityLogger.js';

const router = Router();

router.get('/', async (req: any, res, next) => {
  try {
    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const sql = (isDeveloper || !branchId) 
      ? 'SELECT * FROM customers WHERE business_id=? AND deleted_at IS NULL'
      : 'SELECT * FROM customers WHERE business_id=? AND branch_id=? AND deleted_at IS NULL';
    const params = (isDeveloper || !branchId) ? [req.user.business_id] : [req.user.business_id, branchId];
    res.json(await query(sql, params));

  } catch (e: any) { next(e); }
});

router.get('/:id', async (req: any, res, next) => {
  try {
    const isSuper = req.user.role === 'superadmin';
    const sql = isSuper 
      ? 'SELECT * FROM customers WHERE id=? AND business_id=?'
      : 'SELECT * FROM customers WHERE id=? AND business_id=? AND branch_id=?';
    const params = isSuper ? [req.params.id, req.user.business_id] : [req.params.id, req.user.business_id, req.user.branch_id];
    const c = await queryOne(sql, params);
    if (!c) return res.status(404).json({ error: 'Customer not found' });
    res.json(c);
  } catch (e: any) { next(e); }
});

const customerSchema = z.object({
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal('')).or(z.null()),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  secondary_phone: z.string().nullable().optional(),
  fax: z.string().nullable().optional(),
  offers_email: z.union([z.boolean(), z.number().transform(v => v === 1)]).nullable().optional(),
  company: z.string().nullable().optional(),
  customer_type: z.string().nullable().optional(),
  address_line1: z.string().nullable().optional(),
  address_line2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip_code: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  alert_message: z.string().nullable().optional()
});

router.post('/', async (req: any, res, next) => {
  try {
    const b = customerSchema.parse(req.body);
    // Helper to strip literal "null" strings
    const stripNull = (v: any) => (v === null || v === undefined || v === 'null') ? '' : String(v).replace(/\bnull\b/gi, '').trim();
    // Derive a combined name if not explicitly provided
    const derivedFirst = stripNull(b.first_name);
    const derivedLast = stripNull(b.last_name);
    const fullName = stripNull(b.name) || `${derivedFirst} ${derivedLast}`.trim() || 'Unknown';
    const businessId = req.user?.business_id;
    const branchId = req.user?.branch_id ?? null;

    if (!businessId) return res.status(400).json({ error: 'No business context found. Please log in again.' });

    // Helper: convert undefined → null so mysql2 doesn't throw
    const n = (v: any) => (v === undefined ? null : v === '' ? null : v);

    const r = await execute(`
      INSERT INTO customers (business_id,branch_id,name,phone,email,first_name,last_name,secondary_phone,fax,offers_email,
        company,customer_type,address_line1,address_line2,city,state,zip_code,country,website,alert_message)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [businessId, branchId, fullName,
       n(b.phone), n(b.email), n(b.first_name), n(b.last_name),
       n(b.secondary_phone), n(b.fax), b.offers_email ? 1 : 0,
       n(b.company), n(b.customer_type), n(b.address_line1), n(b.address_line2),
       n(b.city), n(b.state), n(b.zip_code), n(b.country), n(b.website), n(b.alert_message)
      ]);
    const [newCustomer] = await pool.execute(
      'SELECT * FROM customers WHERE id = ?',
      [r.insertId]
    );
    const created = (newCustomer as any[])[0];
    await recordAudit(req, {
      branch_id: branchId,
      activity_type: ACTIVITY_TYPES.CUSTOMER_CREATED,
      description: `Customer "${fullName}" created${b.phone ? ` (${b.phone})` : ''}`,
      reference_type: 'customer',
      reference_id: r.insertId,
      reference_link: `/customers/${r.insertId}`
    });
    res.json(created);
  } catch (e: any) {
    console.error('[POST /api/customers] Error:', e.message);
    next(e);
  }
});

router.put('/:id', async (req: any, res, next) => {
  let data: z.infer<typeof customerSchema>;
  try { data = customerSchema.parse(req.body); } catch (e) { return next(e); }
  const { phone, email, address, first_name, last_name, secondary_phone, fax, offers_email,
    company, customer_type, address_line1, address_line2, city, state, zip_code, country, website, alert_message } = data as any;
  // Helper to strip literal "null" strings
  const stripNull = (v: any) => (v === null || v === undefined || v === 'null') ? '' : String(v).replace(/\bnull\b/gi, '').trim();
  // Always rebuild name from first_name + last_name to keep it clean
  const derivedFirst = stripNull(first_name);
  const derivedLast = stripNull(last_name);
  const name = stripNull(data.name) || `${derivedFirst} ${derivedLast}`.trim() || 'Unknown';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const isSuper = req.user.role === 'superadmin' || req.user.role === 'developer';
    const checkSql = isSuper 
      ? 'SELECT * FROM customers WHERE id=? AND business_id=?'
      : 'SELECT * FROM customers WHERE id=? AND business_id=? AND branch_id=?';
    const checkParams = isSuper ? [req.params.id, req.user.business_id] : [req.params.id, req.user.business_id, req.user.branch_id];
    
    const [oldRows] = await conn.execute(checkSql, checkParams);
    const old = (oldRows as any[])[0];
    if (!old) throw Object.assign(new Error('Customer not found or access denied'), { status: 404 });

    // Wallet balance is NEVER modified via profile edit; it may only change via
    // verified deposits, wallet spend, refunds, or admin wallet-adjustment.
    await conn.execute(`
      UPDATE customers SET name=?,phone=?,email=?,address=?,first_name=?,last_name=?,secondary_phone=?,fax=?,offers_email=?,
        company=?,customer_type=?,address_line1=?,address_line2=?,city=?,state=?,zip_code=?,country=?,website=?,alert_message=?
      WHERE id=? AND business_id=?`,
      [name, phone, email, address, first_name, last_name, secondary_phone, fax, offers_email ? 1 : 0,
       company, customer_type, address_line1, address_line2, city, state, zip_code, country, website, alert_message, req.params.id, req.user.business_id]);
    
    const custDiff = diffFields(
      old,
      { name, phone, email },
      [
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' }
      ]
    );

    if (custDiff.changes.length) {
      await conn.execute('INSERT INTO customer_activity (customer_id,user_id,activity,details) VALUES (?,?,?,?)',
        [req.params.id, req.userId, ACTIVITY_TYPES.CUSTOMER_UPDATED, custDiff.summary]);
      await recordAudit(req, {
        conn,
        branch_id: old.branch_id ?? req.user.branch_id,
        activity_type: ACTIVITY_TYPES.CUSTOMER_UPDATED,
        description: `Customer "${old.name || name}" updated: ${custDiff.summary}`,
        reference_type: 'customer',
        reference_id: Number(req.params.id),
        reference_link: `/customers/${req.params.id}`,
        metadata: { diff: custDiff.diff }
      });
    }
    await conn.commit();
    res.json({ success: true });
  } catch (e: any) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});

router.delete('/:id', async (req: any, res, next) => {
  try {
    const isSuper = req.user.role === 'superadmin';
    const sql = isSuper 
      ? 'UPDATE customers SET deleted_at=NOW() WHERE id=? AND business_id=?'
      : 'UPDATE customers SET deleted_at=NOW() WHERE id=? AND business_id=? AND branch_id=?';
    const params = isSuper ? [req.params.id, req.user.business_id] : [req.params.id, req.user.business_id, req.user.branch_id];
    const r = await execute(sql, params);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Customer not found or access denied' });
    await recordAudit(req, {
      activity_type: ACTIVITY_TYPES.CUSTOMER_DELETED,
      description: `Customer #${req.params.id} deleted`,
      reference_type: 'customer',
      reference_id: Number(req.params.id)
    });
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

router.get('/:id/invoices', async (req: any, res, next) => {
  try {
    const sql = `
      SELECT i.* FROM invoices i
      JOIN customers c ON i.customer_id=c.id
      WHERE i.customer_id=? AND c.business_id=? ${req.user.role !== 'superadmin' ? 'AND c.branch_id=?' : ''}
      ORDER BY i.created_at DESC
    `;
    const params = req.user.role !== 'superadmin' ? [req.params.id, req.user.business_id, req.user.branch_id] : [req.params.id, req.user.business_id];
    res.json(await query(sql, params));
  } catch (e: any) { next(e); }
});

router.get('/:id/credit-notes', async (req: any, res, next) => {
  try {
    res.json(await query(`
      SELECT cn.*, orig.invoice_number as original_invoice_number
      FROM credit_notes cn
      LEFT JOIN invoices orig ON cn.original_invoice_id = orig.id
      WHERE cn.customer_id = ? AND cn.business_id = ?
      ORDER BY cn.created_at DESC
    `, [req.params.id, req.user.business_id]));
  } catch (e: any) { next(e); }
});

router.get('/:id/payments', async (req: any, res, next) => {
  try {
    res.json(await query(`
      SELECT p.*, i.invoice_number FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      JOIN customers c ON p.customer_id=c.id
      WHERE p.customer_id=? AND c.business_id=? ORDER BY p.paid_at DESC
    `, [req.params.id, req.user.business_id]));
  } catch (e: any) { next(e); }
});

router.get('/:id/ledger', async (req: any, res, next) => {
  try {
    res.json(await query(`
      SELECT p.*, i.invoice_number FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      JOIN customers c ON p.customer_id=c.id
      WHERE p.customer_id=? AND c.business_id=? ORDER BY p.paid_at DESC
    `, [req.params.id, req.user.business_id]));
  } catch (e: any) { next(e); }
});

router.get('/:id/activity', async (req: any, res, next) => {
  try {
    const sql = `
      SELECT a.*, u.name as user_name FROM customer_activity a
      LEFT JOIN users u ON a.user_id=u.id
      JOIN customers c ON a.customer_id=c.id
      WHERE a.customer_id=? AND c.business_id=? ${req.user.role !== 'superadmin' ? 'AND c.branch_id=?' : ''}
      ORDER BY a.created_at DESC
    `;
    const params = req.user.role !== 'superadmin' ? [req.params.id, req.user.business_id, req.user.branch_id] : [req.params.id, req.user.business_id];
    res.json(await query(sql, params));
  } catch (e: any) { next(e); }
});

const depositSchema = z.object({
  amount: z.coerce.number().finite().positive('Deposit amount must be greater than zero').max(100000, 'Deposit amount exceeds limit'),
  method: z.string().trim().min(1).max(50).optional(),
  note: z.string().max(500).optional()
});

const walletAdjustmentSchema = z.object({
  amount: z.coerce.number().finite().refine(v => Math.abs(v) >= 0.01, 'Adjustment amount must be non-zero'),
  reason: z.string().trim().min(3, 'A reason is required for wallet adjustments').max(500)
});

router.post('/:id/payments', async (req: any, res, next) => {
  let data: z.infer<typeof depositSchema>;
  try { data = depositSchema.parse(req.body); } catch (e) { return next(e); }
  const { amount, method, note } = data;
  const numAmount = Math.round(Number(amount) * 100) / 100;
  const effectiveMethod = (method || 'Cash').trim();
  const methodLower = effectiveMethod.toLowerCase();
  if (methodLower.includes('wallet') || methodLower.includes('store credit') || methodLower.includes('credit note')) {
    return res.status(400).json({ error: 'Wallet deposits must be paid by Cash, Card, or another real payment method.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Validate ownership and reject Walk-in Customer
    const isSuper = req.user.role === 'superadmin' || req.user.role === 'developer';
    const checkSql = isSuper 
      ? 'SELECT id, name FROM customers WHERE id=? AND business_id=? AND deleted_at IS NULL FOR UPDATE'
      : 'SELECT id, name FROM customers WHERE id=? AND business_id=? AND branch_id=? AND deleted_at IS NULL FOR UPDATE';
    const checkParams = isSuper ? [req.params.id, req.user.business_id] : [req.params.id, req.user.business_id, req.user.branch_id];
    const [cRows] = await conn.execute(checkSql, checkParams);
    const cust = (cRows as any[])[0];
    if (!cust) throw Object.assign(new Error('Customer not found or access denied'), { status: 404 });
    if (cust.name === 'Walk-in Customer') {
      throw Object.assign(new Error('Walk-in Customer cannot hold a wallet balance. Please select a named customer.'), { status: 400 });
    }

    // Generate branch-YYMM-#### invoice for wallet deposit
    const branchPrefix = await getBranchPrefix(req.user.branch_id);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yymm = `${yy}${mm}`;
    const invoicePrefix = `${branchPrefix}-${yymm}`;

    const [lastDE] = await conn.execute(
      'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? AND business_id=? ORDER BY id DESC LIMIT 1 FOR UPDATE',
      [`${invoicePrefix}-%`, req.user.business_id]
    );
    let nextDENum = 1;
    if ((lastDE as any[]).length > 0) {
      const parts = String((lastDE as any[])[0].invoice_number).split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) nextDENum = lastNum + 1;
    }
    const invoiceNumber = `${invoicePrefix}-${String(nextDENum).padStart(4, '0')}`;

    const [invR] = await conn.execute(
      `INSERT INTO invoices (business_id, branch_id, user_id, customer_id, invoice_number, type, 
        subtotal, tax_total, discount_total, grand_total, paid_amount, due_amount, status)
       VALUES (?, ?, ?, ?, ?, 'deposit', ?, 0, 0, ?, ?, 0, 'paid')`,
      [req.user.business_id, req.user.branch_id, req.userId, req.params.id, invoiceNumber, numAmount, numAmount, numAmount]
    );
    const invoiceId = (invR as any).insertId;

    await conn.execute("INSERT INTO payments (customer_id, invoice_id, type, method, amount) VALUES (?,?,?,?,?)",
      [req.params.id, invoiceId, 'deposit', effectiveMethod, numAmount]);
    
    await conn.execute("UPDATE customers SET wallet_balance=COALESCE(wallet_balance,0)+? WHERE id=? AND business_id=?", [numAmount, req.params.id, req.user.business_id]);
    
    await conn.execute("INSERT INTO customer_activity (customer_id,user_id,activity,details) VALUES (?,?,?,?)",
      [req.params.id, req.userId, 'Deposit Received', `Wallet deposit of €${numAmount.toFixed(2)} received via ${effectiveMethod}. Invoice: ${invoiceNumber}.${note ? ` ${note}` : ''}`]);
    
    await conn.commit();
    res.json({ success: true, invoice_number: invoiceNumber });
  } catch (e: any) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});

// Admin-only audited wallet balance correction (no physical cash/card till movement)
router.post('/:id/wallet-adjustment', async (req: any, res, next) => {
  const allowedRoles = ['admin', 'superadmin', 'developer'];
  if (!allowedRoles.includes(String(req.user?.role || '').toLowerCase())) {
    return res.status(403).json({ error: 'Only admins can perform manual wallet adjustments.' });
  }
  let data: z.infer<typeof walletAdjustmentSchema>;
  try { data = walletAdjustmentSchema.parse(req.body); } catch (e) { return next(e); }
  const delta = Math.round(Number(data.amount) * 100) / 100;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const isSuper = req.user.role === 'superadmin' || req.user.role === 'developer';
    const checkSql = isSuper
      ? 'SELECT id, name, wallet_balance FROM customers WHERE id=? AND business_id=? AND deleted_at IS NULL FOR UPDATE'
      : 'SELECT id, name, wallet_balance FROM customers WHERE id=? AND business_id=? AND branch_id=? AND deleted_at IS NULL FOR UPDATE';
    const checkParams = isSuper ? [req.params.id, req.user.business_id] : [req.params.id, req.user.business_id, req.user.branch_id];
    const [rows] = await conn.execute(checkSql, checkParams);
    const cust = (rows as any[])[0];
    if (!cust) throw Object.assign(new Error('Customer not found or access denied'), { status: 404 });
    if (cust.name === 'Walk-in Customer') {
      throw Object.assign(new Error('Cannot adjust wallet balance for Walk-in Customer.'), { status: 400 });
    }

    const oldBalance = Math.round((Number(cust.wallet_balance) || 0) * 100) / 100;
    const newBalance = Math.round((oldBalance + delta) * 100) / 100;
    if (newBalance < 0) {
      throw Object.assign(
        new Error(`Adjustment would result in a negative wallet balance (Current: €${oldBalance.toFixed(2)}, Adjustment: €${delta.toFixed(2)}).`),
        { status: 400 }
      );
    }

    await conn.execute(
      'UPDATE customers SET wallet_balance = ? WHERE id = ? AND business_id = ?',
      [newBalance, req.params.id, req.user.business_id]
    );

    const sign = delta >= 0 ? '+' : '-';
    const details = `Wallet adjusted ${sign}€${Math.abs(delta).toFixed(2)} (€${oldBalance.toFixed(2)} -> €${newBalance.toFixed(2)}). Reason: ${data.reason}`;
    await conn.execute(
      'INSERT INTO customer_activity (customer_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
      [req.params.id, req.userId, ACTIVITY_TYPES.WALLET_ADJUSTMENT, details]
    );
    await recordAudit(req, {
      conn,
      activity_type: ACTIVITY_TYPES.WALLET_ADJUSTMENT,
      description: details,
      reference_type: 'customer',
      reference_id: Number(req.params.id),
      reference_link: `/customers/${req.params.id}`,
      metadata: { old_balance: oldBalance, new_balance: newBalance, delta, reason: data.reason },
      strict: true
    });

    await conn.commit();
    res.json({ success: true, old_balance: oldBalance, new_balance: newBalance, delta });
  } catch (e: any) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});

export default router;
