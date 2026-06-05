import { Router } from 'express';
import { pool, query, queryOne, execute } from '../mysql.js';
import { z } from 'zod';

const router = Router();

router.get('/suggestions', async (req: any, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);
    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const searchTerm = q.trim();
    
    // Parse prefix (letters) and number (digits)
    const match = searchTerm.match(/^([a-zA-Z]*)[^0-9]*(\d*)$/);
    let sql = '';
    let params: any[] = [];
    
    if (match && match[2]) {
      const prefix = match[1].toUpperCase();
      const num = parseInt(match[2], 10);
      sql = `
        SELECT i.id, i.invoice_number, c.name as customer_name, i.grand_total, i.created_at
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id=c.id
        WHERE i.business_id=?
        AND CAST(SUBSTRING_INDEX(i.invoice_number, '-', -1) AS UNSIGNED) LIKE ?
        ${prefix ? "AND i.invoice_number LIKE ?" : ""}
        ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
        ORDER BY i.created_at DESC
        LIMIT 5
      `;
      params.push(req.user.business_id);
      params.push(`${num}%`);
      if (prefix) {
        params.push(`${prefix}-%`);
      }
      if (!isDeveloper && branchId) {
        params.push(branchId);
      }
    } else {
      sql = `
        SELECT i.id, i.invoice_number, c.name as customer_name, i.grand_total, i.created_at
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id=c.id
        WHERE i.business_id=?
        AND (i.invoice_number LIKE ? OR c.name LIKE ?)
        ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
        ORDER BY i.created_at DESC
        LIMIT 5
      `;
      params.push(req.user.business_id);
      params.push(`%${searchTerm}%`);
      params.push(`%${searchTerm}%`);
      if (!isDeveloper && branchId) {
        params.push(branchId);
      }
    }
    
    const rows = await query(sql, params);
    res.json(rows);
  } catch (e: any) { next(e); }
});

router.get('/by-number/:invoiceNumber', async (req: any, res, next) => {
  try {
    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const searchTerm = req.params.invoiceNumber.trim();
    
    // Parse prefix (letters) and number (digits)
    const match = searchTerm.match(/^([a-zA-Z]*)[^0-9]*(\d+)$/);
    
    let sql = '';
    let params: any[] = [];
    
    if (match) {
      const prefix = match[1].toUpperCase();
      const num = parseInt(match[2], 10);
      
      sql = `
        SELECT id FROM invoices 
        WHERE CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED) = ? 
        AND business_id=? 
        ${prefix ? "AND invoice_number LIKE ?" : ""}
        ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
        ORDER BY id DESC
        LIMIT 1
      `;
      params.push(num);
      params.push(req.user.business_id);
      if (prefix) {
        params.push(`${prefix}-%`);
      }
      if (!isDeveloper && branchId) {
        params.push(branchId);
      }
    } else {
      sql = `
        SELECT id FROM invoices 
        WHERE invoice_number LIKE ? AND business_id=? 
        ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
        ORDER BY id DESC
        LIMIT 1
      `;
      params = [`%${searchTerm}%`, req.user.business_id];
      if (!isDeveloper && branchId) {
        params.push(branchId);
      }
    }
    
    const inv = await queryOne(sql, params) as any;
    res.json(inv || {});
  } catch (e: any) { next(e); }
});

router.get('/', async (req: any, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    
    let sql = `
      SELECT i.*, c.name as customer_name FROM invoices i
      LEFT JOIN customers c ON i.customer_id=c.id
      WHERE i.business_id=? ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
    `;
    const params: any[] = (!isDeveloper && branchId) ? [req.user.business_id, branchId] : [req.user.business_id];


    if (startDate) {
      sql += ' AND i.created_at >= ?';
      params.push(startDate + ' 00:00:00');
    }
    if (endDate) {
      sql += ' AND i.created_at <= ?';
      params.push(endDate + ' 23:59:59');
    }

    sql += ' ORDER BY i.created_at DESC';
    res.json(await query(sql, params));
  } catch (e: any) { next(e); }
});

router.get('/:id', async (req: any, res, next) => {
  try {
    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const sql = `
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM invoices i LEFT JOIN customers c ON i.customer_id=c.id 
      WHERE i.id=? AND i.business_id=? ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
    `;
    const params = (!isDeveloper && branchId) ? [req.params.id, req.user.business_id, branchId] : [req.params.id, req.user.business_id];
    const invoice = await queryOne(sql, params) as any;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found or access denied' });
    const items = await query(`
      SELECT ii.*, p.name as product_name, s.sku_code, d.imei
      FROM invoice_items ii
      JOIN product_skus s ON ii.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      LEFT JOIN devices d ON ii.device_id=d.id
      WHERE ii.invoice_id=?
    `, [req.params.id]);
    const payments = await query('SELECT * FROM payments WHERE invoice_id=?', [req.params.id]) as any[];
    const activities = await query(`
      SELECT a.*, u.name as user_name FROM invoice_activity a
      LEFT JOIN users u ON a.user_id=u.id
      WHERE a.invoice_id=? ORDER BY a.created_at DESC
    `, [req.params.id]);
    const paymentMethod = payments.length > 1 ? 'Split' : (payments[0]?.method || 'Cash');
    res.json({
      ...invoice, items, payments, activities, payment_method: paymentMethod,
      customer: { name: invoice.customer_name, phone: invoice.customer_phone, email: invoice.customer_email }
    });
  } catch (e: any) { next(e); }
});

const createInvoiceSchema = z.object({
  customer_id: z.number().nullable().optional(),
  subtotal: z.number().or(z.string().transform(Number)),
  tax_total: z.number().or(z.string().transform(Number)),
  discount_total: z.number().or(z.string().transform(Number)),
  grand_total: z.number().or(z.string().transform(Number)),
  items: z.array(z.object({
    id: z.number().optional(),
    sku_id: z.number().optional(),
    device_id: z.number().nullable().optional(),
    quantity: z.number().or(z.string().transform(Number)),
    price: z.number().or(z.string().transform(Number)),
    total: z.number().or(z.string().transform(Number)),
    is_deposit: z.boolean().optional(),
    notes: z.string().nullable().optional()
  })).min(1, "Cart is empty"),
  payments: z.array(z.object({
    method: z.string(),
    amount: z.number().or(z.string().transform(Number))
  })).optional(),
  activities: z.array(z.object({
    action: z.string().optional(),
    activity: z.string().optional(),
    details: z.string().optional()
  })).optional()
});

router.post('/', async (req: any, res, next) => {
  const data = createInvoiceSchema.parse(req.body);
  const { customer_id, items, subtotal, tax_total, discount_total, grand_total, payments, activities } = data;
  
  if (!items || !items.length) return res.status(400).json({ error: 'Cart is empty' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // 1. Batch fetch product info
    const skuIds = items.map((i: any) => i.id || i.sku_id).filter(Boolean);
    let productInfoMap = new Map();
    if (skuIds.length > 0) {
      const [allProductInfo] = await conn.query(`
        SELECT s.id as sku_id, p.product_type, p.allow_overselling
        FROM product_skus s JOIN products p ON s.product_id=p.id 
        WHERE s.id IN (?)
      `, [skuIds]);
      productInfoMap = new Map((allProductInfo as any[]).map(p => [p.sku_id, p]));
    }

    let finalCustomerId = customer_id;
    if (!finalCustomerId) {
      const [wRows] = await conn.execute(
        "SELECT id FROM customers WHERE name='Walk-in Customer' AND business_id=? LIMIT 1",
        [req.user.business_id]
      );
      finalCustomerId = (wRows as any[])[0]?.id || null;
    }

    const isDeposit = (items || []).some((item: any) => item.is_deposit);
    const prefix = isDeposit ? 'DE' : 'SA';

    const [lastInv] = await conn.execute(
      `SELECT invoice_number FROM invoices WHERE invoice_number LIKE '${prefix}-%' AND business_id=? ORDER BY id DESC LIMIT 1`,
      [req.user.business_id]
    );
    let nextNum = 1;
    if ((lastInv as any[]).length > 0) {
      const lastNum = parseInt((lastInv as any[])[0].invoice_number.split('-')[1]);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const invoiceNumber = `${prefix}-${String(nextNum).padStart(3, '0')}`;
    const totalPaid = (payments || []).reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
    const dueAmount = Math.max(0, (parseFloat(grand_total) || 0) - totalPaid);
    let status = 'paid';
    if (dueAmount > 0.01) status = totalPaid > 0 ? 'partial' : 'credit';
    
    const [invR] = await conn.execute(
      'INSERT INTO invoices (business_id,branch_id,user_id,customer_id,invoice_number,subtotal,tax_total,discount_total,grand_total,paid_amount,due_amount,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [req.user.business_id, req.user.branch_id, req.userId, finalCustomerId, invoiceNumber, subtotal, tax_total, discount_total, grand_total, totalPaid, dueAmount, status]
    );
    const invoiceId = (invR as any).insertId;

    for (const item of items) {
      const skuId = item.id || item.sku_id;
      const productInfo = productInfoMap.get(skuId);
      
      await conn.execute('INSERT INTO invoice_items (invoice_id,sku_id,device_id,quantity,price,total,notes) VALUES (?,?,?,?,?,?,?)',
        [invoiceId, skuId, item.device_id || null, item.quantity, item.price, item.total, item.notes || null]);
      
      if (productInfo?.product_type === 'stock') {
        await conn.execute(`
          INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,-?)
          ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)
        `, [req.user.branch_id, skuId, item.quantity]);
      } else if (item.device_id) {
        await conn.execute("UPDATE devices SET status='sold' WHERE id=? AND branch_id=?", [item.device_id, req.user.branch_id]);
        await conn.execute(
          'INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
          [item.device_id, req.userId, 'Device Sold', `Sold on Invoice: ${invoiceNumber}`]
        );
        await conn.execute(
          'INSERT INTO activity_logs (device_id, user_id, activity_type, description, reference_link) VALUES (?, ?, ?, ?, ?)',
          [item.device_id, req.userId, 'Device Sold', 'Product delivered to customer', invoiceNumber]
        );
        await conn.execute(`
          INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,-1)
          ON DUPLICATE KEY UPDATE quantity=quantity-1
        `, [req.user.branch_id, skuId]);
      }
      
      if (item.is_deposit && finalCustomerId) {
        await conn.execute('UPDATE customers SET wallet_balance=wallet_balance+? WHERE id=?', [item.total, finalCustomerId]);
        await conn.execute('INSERT INTO payments (customer_id,invoice_id,type,method,amount) VALUES (?,?,?,?,?)',
          [finalCustomerId, invoiceId, 'deposit', 'Store Deposit', item.total]);
      }
    }

    for (const p of (payments || [])) {
      const type = (p.method==='Store Credit'||p.method==='Wallet') ? 'wallet_use' : 'sale_payment';
      await conn.execute('INSERT INTO payments (customer_id,invoice_id,type,method,amount) VALUES (?,?,?,?,?)',
        [finalCustomerId, invoiceId, type, p.method, p.amount]);
      if (type==='wallet_use') {
        await conn.execute('UPDATE customers SET wallet_balance=wallet_balance-? WHERE id=?', [p.amount, finalCustomerId]);
      }
    }

    const logDetails = `Invoice ${invoiceNumber} created for €${(parseFloat(grand_total) || 0).toFixed(2)}`;
    if (finalCustomerId) {
      await conn.execute('INSERT INTO customer_activity (customer_id,user_id,activity,details) VALUES (?,?,?,?)',
        [finalCustomerId, req.userId, 'Invoice Created', logDetails]);
    }
    
    await conn.execute('INSERT INTO invoice_activity (invoice_id,user_id,activity,details) VALUES (?,?,?,?)',
      [invoiceId, req.userId, 'Invoice Created', logDetails]);
    
    for (const act of (activities || [])) {
      const activityLabel = act.action || act.activity || 'Activity';
      const activityDetails = act.details || 'No details provided';
      await conn.execute('INSERT INTO invoice_activity (invoice_id,user_id,activity,details) VALUES (?,?,?,?)',
        [invoiceId, req.userId, activityLabel, activityDetails]);
    }

    await conn.commit();

    // Fetch full details for response
    const [fullInvoiceRows] = await conn.execute(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM invoices i LEFT JOIN customers c ON i.customer_id=c.id WHERE i.id=?
    `, [invoiceId]);
    const [fullItems] = await conn.execute(`
      SELECT ii.*, p.name as product_name, s.sku_code, d.imei
      FROM invoice_items ii
      JOIN product_skus s ON ii.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      LEFT JOIN devices d ON ii.device_id=d.id
      WHERE ii.invoice_id=?
    `, [invoiceId]);
    const [fullPayments] = await conn.execute('SELECT * FROM payments WHERE invoice_id=?', [invoiceId]);
    const [fullActivities] = await conn.execute(`
      SELECT a.*, u.name as user_name FROM invoice_activity a
      LEFT JOIN users u ON a.user_id=u.id
      WHERE a.invoice_id=? ORDER BY a.created_at DESC
    `, [invoiceId]);

    const invoiceObj = (fullInvoiceRows as any[])[0];
    if (!invoiceObj) throw new Error('Failed to retrieve created invoice record');

    res.json({
      ...invoiceObj,
      items: fullItems,
      payments: fullPayments,
      activities: fullActivities,
      payment_method: (fullPayments as any[]).length > 1 ? 'Split' : ((fullPayments as any[])[0]?.method || 'Cash'),
      customer: { name: invoiceObj.customer_name, phone: invoiceObj.customer_phone, email: invoiceObj.customer_email }
    });

  } catch (e: any) { 
    if (conn) await conn.rollback().catch(() => {});
    console.error('[POST /api/invoices] Error:', e.message);
    next(e); 
  } finally { 
    if (conn) conn.release(); 
  }
});

router.post('/:id/refund', async (req: any, res, next) => {
  const { method } = req.body;
  const conn = await pool.getConnection();
  try {
    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const checkSql = `SELECT * FROM invoices WHERE id=? AND business_id=? ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}`;
    const checkParams = (!isDeveloper && branchId) ? [req.params.id, req.user.business_id, branchId] : [req.params.id, req.user.business_id];
    const [invRows] = await conn.execute(checkSql, checkParams);

    const invoice = (invRows as any[])[0];
    if (!invoice) throw new Error('Invoice not found or access denied');
    if (invoice.status==='void') throw new Error('Invoice already refunded');
    await conn.execute("UPDATE invoices SET status='void' WHERE id=?", [req.params.id]);
    await conn.execute('INSERT INTO payments (invoice_id,method,amount) VALUES (?,?,?)',
      [req.params.id, `Refund (${method})`, -invoice.grand_total]);
    const [itemRows] = await conn.execute('SELECT * FROM invoice_items WHERE invoice_id=?', [req.params.id]);
    for (const item of itemRows as any[]) {
      await conn.execute(`
        INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,?)
        ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)
      `, [invoice.branch_id, item.sku_id, item.quantity]);
      if (item.device_id) await conn.execute("UPDATE devices SET status='in_stock' WHERE id=?", [item.device_id]);
    }
    await conn.execute('INSERT INTO invoice_activity (invoice_id,user_id,activity,details) VALUES (?,?,?,?)',
      [req.params.id, req.userId, 'Refund Created', `Refund issued via ${method} for €${invoice.grand_total.toFixed(2)}`]);
    await conn.commit();
    res.json({ success: true });
  } catch (e: any) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});

router.put('/payments/:id', async (req: any, res, next) => {
  try {
    const r = await execute(
      'UPDATE payments p JOIN invoices i ON p.invoice_id=i.id SET p.method=? WHERE p.id=? AND i.business_id=?',
      [req.body.method, req.params.id, req.user.business_id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Payment not found or access denied' });
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

export default router;
