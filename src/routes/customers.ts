import { Router } from 'express';
import { pool, query, queryOne, execute, getBranchPrefix } from '../mysql.js';
import { z } from 'zod';

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
  alert_message: z.string().nullable().optional(),
  wallet_balance: z.number().or(z.string().transform(Number)).nullable().optional()
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
    res.json((newCustomer as any[])[0]);
  } catch (e: any) {
    console.error('[POST /api/customers] Error:', e.message);
    next(e);
  }
});

router.put('/:id', async (req: any, res, next) => {
  const data = customerSchema.parse(req.body);
  const { phone, email, address, first_name, last_name, secondary_phone, fax, offers_email,
    company, customer_type, address_line1, address_line2, city, state, zip_code, country, website, alert_message, wallet_balance } = data as any;
  // Helper to strip literal "null" strings
  const stripNull = (v: any) => (v === null || v === undefined || v === 'null') ? '' : String(v).replace(/\bnull\b/gi, '').trim();
  // Always rebuild name from first_name + last_name to keep it clean
  const derivedFirst = stripNull(first_name);
  const derivedLast = stripNull(last_name);
  const name = stripNull(data.name) || `${derivedFirst} ${derivedLast}`.trim() || 'Unknown';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const isSuper = req.user.role === 'superadmin';
    const checkSql = isSuper 
      ? 'SELECT * FROM customers WHERE id=? AND business_id=?'
      : 'SELECT * FROM customers WHERE id=? AND business_id=? AND branch_id=?';
    const checkParams = isSuper ? [req.params.id, req.user.business_id] : [req.params.id, req.user.business_id, req.user.branch_id];
    
    const [oldRows] = await conn.execute(checkSql, checkParams);
    const old = (oldRows as any[])[0];
    if (!old) throw new Error('Customer not found or access denied');

    await conn.execute(`
      UPDATE customers SET name=?,phone=?,email=?,address=?,first_name=?,last_name=?,secondary_phone=?,fax=?,offers_email=?,
        company=?,customer_type=?,address_line1=?,address_line2=?,city=?,state=?,zip_code=?,country=?,website=?,alert_message=?,wallet_balance=?
      WHERE id=?`,
      [name, phone, email, address, first_name, last_name, secondary_phone, fax, offers_email ? 1 : 0,
       company, customer_type, address_line1, address_line2, city, state, zip_code, country, website, alert_message, wallet_balance || 0, req.params.id]);
    
    const changes: string[] = [];
    if (old.name !== name) changes.push(`Name: ${old.name} -> ${name}`);
    if (old.phone !== phone) changes.push(`Phone: ${old.phone} -> ${phone}`);
    if (old.wallet_balance !== wallet_balance) changes.push(`Wallet: ${old.wallet_balance} -> ${wallet_balance}`);
    
    if (changes.length) {
      await conn.execute('INSERT INTO customer_activity (customer_id,user_id,activity,details) VALUES (?,?,?,?)',
        [req.params.id, req.userId, 'Profile Updated', changes.join(', ')]);
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
  amount: z.number().or(z.string().transform(Number)),
  method: z.string().optional(),
  note: z.string().optional()
});

router.post('/:id/payments', async (req: any, res, next) => {
  const data = depositSchema.parse(req.body);
  const { amount, method, note } = data;
  const numAmount = Number(amount);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Validate ownership
    const isSuper = req.user.role === 'superadmin';
    const checkSql = isSuper 
      ? 'SELECT id FROM customers WHERE id=? AND business_id=?'
      : 'SELECT id FROM customers WHERE id=? AND business_id=? AND branch_id=?';
    const checkParams = isSuper ? [req.params.id, req.user.business_id] : [req.params.id, req.user.business_id, req.user.branch_id];
    const [cRows] = await conn.execute(checkSql, checkParams);
    if ((cRows as any[]).length === 0) throw new Error('Customer not found or access denied');

    // Generate branch-YYMM-#### invoice for wallet deposit
    const branchPrefix = await getBranchPrefix(req.user.branch_id);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yymm = `${yy}${mm}`;
    const invoicePrefix = `${branchPrefix}-${yymm}`;

    const [lastDE] = await conn.execute(
      'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? AND business_id=? ORDER BY id DESC LIMIT 1',
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
       VALUES (?, ?, ?, ?, ?, 'wallet', ?, 0, 0, ?, ?, 0, 'paid')`,
      [req.user.business_id, req.user.branch_id, req.userId, req.params.id, invoiceNumber, numAmount, numAmount, numAmount]
    );
    const invoiceId = (invR as any).insertId;

    await conn.execute("INSERT INTO payments (customer_id, invoice_id, type, method, amount) VALUES (?,?,?,?,?)",
      [req.params.id, invoiceId, 'wallet_deposit', method || 'Cash', numAmount]);
    
    await conn.execute("UPDATE customers SET wallet_balance=COALESCE(wallet_balance,0)+? WHERE id=?", [numAmount, req.params.id]);
    
    await conn.execute("INSERT INTO customer_activity (customer_id,user_id,activity,details) VALUES (?,?,?,?)",
      [req.params.id, req.userId, 'Deposit Received', `Wallet deposit of €${numAmount.toFixed(2)} received via ${method}. Invoice: ${invoiceNumber}. ${note || ''}`]);
    
    await conn.commit();
    res.json({ success: true, invoice_number: invoiceNumber });
  } catch (e: any) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});

export default router;
