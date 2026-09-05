import { Router } from 'express';
import { pool, query, queryOne, execute, getBranchPrefix } from '../mysql.js';
import { z } from 'zod';
import { sendInvoiceEmail } from '../services/mailer.js';

const router = Router();

router.get('/suggestions', async (req: any, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);
    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const searchTerm = q.trim();
    
    // Parse digits if any
    const digitsOnly = searchTerm.replace(/\D/g, '');
    const num = digitsOnly ? parseInt(digitsOnly, 10) : null;
    
    let sql = `
      SELECT i.id, i.invoice_number, c.name as customer_name, i.grand_total, i.created_at
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id=c.id
      WHERE i.business_id=?
      AND (
        i.invoice_number LIKE ?
        OR c.name LIKE ?
        ${num !== null ? "OR CAST(SUBSTRING_INDEX(i.invoice_number, '-', -1) AS UNSIGNED) = ?" : ""}
      )
      ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
      ORDER BY i.created_at DESC
      LIMIT 5
    `;
    const params: any[] = [req.user.business_id, `%${searchTerm}%`, `%${searchTerm}%`];
    if (num !== null) {
      params.push(num);
    }
    if (!isDeveloper && branchId) {
      params.push(branchId);
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
    
    const digitsOnly = searchTerm.replace(/\D/g, '');
    const num = digitsOnly ? parseInt(digitsOnly, 10) : null;
    
    let sql = `
      SELECT id FROM invoices 
      WHERE (
        invoice_number = ? 
        OR invoice_number LIKE ?
        ${num !== null ? "OR CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED) = ?" : ""}
      )
      AND business_id=? 
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
      ORDER BY id DESC
      LIMIT 1
    `;
    const params: any[] = [searchTerm, `%${searchTerm}%`];
    if (num !== null) {
      params.push(num);
    }
    params.push(req.user.business_id);
    if (!isDeveloper && branchId) {
      params.push(branchId);
    }
    
    const inv = await queryOne(sql, params) as any;
    res.json(inv || {});
  } catch (e: any) { next(e); }
});

router.get('/export-count', async (req: any, res, next) => {
  try {
    const { startDate, endDate, branch_id } = req.query;
    const isDeveloper = req.user.role === 'developer';
    const branchId = branch_id || req.user.branch_id;
    let whereSql = 'WHERE i.business_id=?';
    const params: any[] = [req.user.business_id];

    if (!isDeveloper && branchId) {
      whereSql += ' AND i.branch_id=?';
      params.push(branchId);
    } else if (branch_id) {
      whereSql += ' AND i.branch_id=?';
      params.push(branch_id);
    }

    if (startDate) {
      whereSql += ' AND DATE(i.created_at) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereSql += ' AND DATE(i.created_at) <= DATE(?)';
      params.push(endDate);
    }

    const rows: any[] = await query(`
      SELECT COUNT(*) as total_invoices, COALESCE(SUM(i.grand_total), 0) as total_amount
      FROM invoices i
      ${whereSql}
    `, params);

    const countRow = rows[0] || { total_invoices: 0, total_amount: 0 };
    res.json({
      total_invoices: Number(countRow.total_invoices) || 0,
      total_amount: Number(countRow.total_amount) || 0
    });
  } catch (e: any) { next(e); }
});

router.get('/export', async (req: any, res, next) => {
  try {
    const { startDate, endDate, branch_id, format = 'json' } = req.query;
    const isDeveloper = req.user.role === 'developer';
    const branchId = branch_id || req.user.branch_id;
    let whereSql = 'WHERE i.business_id=?';
    const params: any[] = [req.user.business_id];

    if (!isDeveloper && branchId) {
      whereSql += ' AND i.branch_id=?';
      params.push(branchId);
    } else if (branch_id) {
      whereSql += ' AND i.branch_id=?';
      params.push(branch_id);
    }

    if (startDate) {
      whereSql += ' AND DATE(i.created_at) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereSql += ' AND DATE(i.created_at) <= DATE(?)';
      params.push(endDate);
    }

    // 1. Fetch invoices
    const invoices: any[] = await query(`
      SELECT i.id, i.invoice_number, i.business_id, i.branch_id, b.name as branch_name,
             i.customer_id, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             i.subtotal, i.tax_total, i.discount_total, i.grand_total, i.paid_amount, i.due_amount,
             i.status, i.created_at, u.name as created_by_name
      FROM invoices i
      LEFT JOIN branches b ON i.branch_id=b.id
      LEFT JOIN customers c ON i.customer_id=c.id
      LEFT JOIN users u ON i.user_id=u.id
      ${whereSql}
      ORDER BY i.id ASC
    `, params);

    if (invoices.length === 0) {
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="invoices_export_${startDate || 'all'}.csv"`);
        return res.send('Invoice Number,Date,Customer Name,Customer Phone,Customer Email,Subtotal,Tax Total,Discount Total,Grand Total,Paid Amount,Due Amount,Status,Branch Name,Created By,Item Summary,Payment Summary\n');
      }
      return res.json({
        export_version: '1.0',
        business_id: req.user.business_id,
        generated_at: new Date().toISOString(),
        filter: { startDate, endDate, branch_id },
        total_count: 0,
        invoices: []
      });
    }

    const invoiceIds = invoices.map((inv: any) => inv.id);
    const placeholders = invoiceIds.map(() => '?').join(',');

    // 2. Fetch invoice items
    const items: any[] = await query(`
      SELECT ii.invoice_id, ii.sku_id, s.sku_code, s.barcode, p.name as product_name,
             ii.device_id, d.imei, ii.quantity, ii.price, ii.cost, ii.discount, ii.total, ii.notes
      FROM invoice_items ii
      LEFT JOIN product_skus s ON ii.sku_id=s.id
      LEFT JOIN products p ON s.product_id=p.id
      LEFT JOIN devices d ON ii.device_id=d.id
      WHERE ii.invoice_id IN (${placeholders})
    `, invoiceIds);

    // 3. Fetch payments
    const payments: any[] = await query(`
      SELECT p.invoice_id, p.method, p.amount, p.type, p.paid_at, p.paid_at as created_at
      FROM payments p
      WHERE p.invoice_id IN (${placeholders})
    `, invoiceIds);

    // Group items and payments by invoice_id
    const itemsMap = new Map<number, any[]>();
    for (const item of items) {
      if (!itemsMap.has(item.invoice_id)) itemsMap.set(item.invoice_id, []);
      itemsMap.get(item.invoice_id)!.push(item);
    }

    const paymentsMap = new Map<number, any[]>();
    for (const p of payments) {
      if (!paymentsMap.has(p.invoice_id)) paymentsMap.set(p.invoice_id, []);
      paymentsMap.get(p.invoice_id)!.push(p);
    }

    const fullInvoices = invoices.map((inv: any) => ({
      ...inv,
      items: itemsMap.get(inv.id) || [],
      payments: paymentsMap.get(inv.id) || []
    }));

    if (format === 'csv') {
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const headers = [
        'Invoice Number',
        'Date',
        'Customer Name',
        'Customer Phone',
        'Customer Email',
        'Subtotal',
        'Tax Total',
        'Discount Total',
        'Grand Total',
        'Paid Amount',
        'Due Amount',
        'Status',
        'Branch Name',
        'Created By',
        'Item Summary',
        'Payment Summary'
      ];

      const rows = fullInvoices.map((inv: any) => {
        const itemSummary = (inv.items || []).map((it: any) => `${it.quantity}x ${it.product_name || 'Item'} (SKU: ${it.sku_code || 'N/A'}${it.imei ? `, IMEI: ${it.imei}` : ''}${it.notes ? `, Note: ${it.notes}` : ''}) @ €${(Number(it.price) || 0).toFixed(2)} = €${(Number(it.total) || 0).toFixed(2)}`).join(' | ');
        const paymentSummary = (inv.payments || []).map((p: any) => `${p.method}: €${(Number(p.amount) || 0).toFixed(2)}`).join(' | ');

        return [
          escapeCsv(inv.invoice_number),
          escapeCsv(new Date(inv.created_at).toISOString().split('T')[0]),
          escapeCsv(inv.customer_name || 'Walk-in Customer'),
          escapeCsv(inv.customer_phone || ''),
          escapeCsv(inv.customer_email || ''),
          (Number(inv.subtotal) || 0).toFixed(2),
          (Number(inv.tax_total) || 0).toFixed(2),
          (Number(inv.discount_total) || 0).toFixed(2),
          (Number(inv.grand_total) || 0).toFixed(2),
          (Number(inv.paid_amount) || 0).toFixed(2),
          (Number(inv.due_amount) || 0).toFixed(2),
          escapeCsv(inv.status),
          escapeCsv(inv.branch_name || ''),
          escapeCsv(inv.created_by_name || ''),
          escapeCsv(itemSummary),
          escapeCsv(paymentSummary)
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="invoices_export_${startDate || 'all'}_to_${endDate || 'now'}.csv"`);
      return res.send(csvContent);
    }

    // Default: JSON backup
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="invoices_backup_${startDate || 'all'}_to_${endDate || 'now'}.json"`);
    res.json({
      export_version: '1.0',
      business_id: req.user.business_id,
      generated_at: new Date().toISOString(),
      filter: { startDate, endDate, branch_id },
      total_count: fullInvoices.length,
      invoices: fullInvoices
    });
  } catch (e: any) { next(e); }
});

router.post('/import', async (req: any, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { invoices, duplicateHandling = 'skip' } = req.body;
    if (!Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({ error: 'No valid invoices array found in payload' });
    }

    await conn.beginTransaction();

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Cache walk-in customer id
    const [wRows] = await conn.execute(
      "SELECT id FROM customers WHERE name='Walk-in Customer' AND business_id=? LIMIT 1",
      [req.user.business_id]
    );
    let defaultCustomerId = (wRows as any[])[0]?.id || null;
    if (!defaultCustomerId) {
      const [newWalkin] = await conn.execute(
        "INSERT INTO customers (business_id, name, first_name, last_name) VALUES (?, 'Walk-in Customer', 'Walk-in', 'Customer')",
        [req.user.business_id]
      );
      defaultCustomerId = (newWalkin as any).insertId;
    }

    // Fetch existing invoice numbers for this business
    const [existingInvRows] = await conn.query(
      "SELECT id, invoice_number FROM invoices WHERE business_id=?",
      [req.user.business_id]
    );
    const existingMap = new Map<string, number>((existingInvRows as any[]).map((r: any) => [r.invoice_number, r.id]));

    for (const inv of invoices) {
      try {
        const invNum = inv.invoice_number || `IMP-${Date.now()}-${Math.floor(Math.random()*1000)}`;

        if (existingMap.has(invNum)) {
          if (duplicateHandling === 'skip') {
            skippedCount++;
            continue;
          } else if (duplicateHandling === 'overwrite') {
            const existingId = existingMap.get(invNum);
            await conn.execute("DELETE FROM payments WHERE invoice_id=?", [existingId]);
            await conn.execute("DELETE FROM invoice_items WHERE invoice_id=?", [existingId]);
            await conn.execute("DELETE FROM invoice_activity WHERE invoice_id=?", [existingId]);
            await conn.execute("DELETE FROM invoices WHERE id=?", [existingId]);
          }
        }

        // Match or resolve customer
        let customerId = defaultCustomerId;
        if (inv.customer_name && inv.customer_name !== 'Walk-in Customer') {
          const [custRows] = await conn.execute(
            "SELECT id FROM customers WHERE business_id=? AND (name=? OR (phone IS NOT NULL AND phone=? AND phone != '')) LIMIT 1",
            [req.user.business_id, inv.customer_name, inv.customer_phone || '']
          );
          if ((custRows as any[]).length > 0) {
            customerId = (custRows as any[])[0].id;
          } else {
            const [newCust] = await conn.execute(
              "INSERT INTO customers (business_id, name, phone, email) VALUES (?, ?, ?, ?)",
              [req.user.business_id, inv.customer_name, inv.customer_phone || null, inv.customer_email || null]
            );
            customerId = (newCust as any).insertId;
          }
        }

        const subtotal = Number(inv.subtotal) || 0;
        const taxTotal = Number(inv.tax_total) || 0;
        const discountTotal = Number(inv.discount_total) || 0;
        const grandTotal = Number(inv.grand_total) || 0;
        const paidAmount = Number(inv.paid_amount) || 0;
        const dueAmount = Number(inv.due_amount) || 0;
        const status = inv.status || (dueAmount > 0.01 ? (paidAmount > 0 ? 'partial' : 'credit') : 'paid');
        const createdAt = inv.created_at ? new Date(inv.created_at) : new Date();

        const [invR] = await conn.execute(
          `INSERT INTO invoices 
           (business_id, branch_id, user_id, customer_id, invoice_number, subtotal, tax_total, discount_total, grand_total, paid_amount, due_amount, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.business_id,
            req.user.branch_id || null,
            req.userId,
            customerId,
            invNum,
            subtotal,
            taxTotal,
            discountTotal,
            grandTotal,
            paidAmount,
            dueAmount,
            status,
            createdAt
          ]
        );
        const invoiceId = (invR as any).insertId;

        // Insert items
        if (Array.isArray(inv.items)) {
          for (const item of inv.items) {
            let skuId = item.sku_id || null;
            if (!skuId && item.sku_code) {
              const [skuRows] = await conn.execute(
                "SELECT s.id FROM product_skus s JOIN products p ON s.product_id=p.id WHERE s.sku_code=? AND p.business_id=? LIMIT 1",
                [item.sku_code, req.user.business_id]
              );
              skuId = (skuRows as any[])[0]?.id || null;
            }

            await conn.execute(
              `INSERT INTO invoice_items 
               (invoice_id, sku_id, device_id, quantity, price, cost, discount, total, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                invoiceId,
                skuId,
                item.device_id || null,
                Number(item.quantity) || 1,
                Number(item.price) || 0,
                Number(item.cost) || 0,
                Number(item.discount) || 0,
                Number(item.total) || 0,
                item.notes || null
              ]
            );
          }
        }

        // Insert payments
        if (Array.isArray(inv.payments) && inv.payments.length > 0) {
          for (const p of inv.payments) {
            await conn.execute(
              "INSERT INTO payments (customer_id, invoice_id, type, method, amount, paid_at) VALUES (?, ?, ?, ?, ?, ?)",
              [
                customerId,
                invoiceId,
                p.type || 'sale_payment',
                p.method || 'Cash',
                Number(p.amount) || 0,
                p.paid_at ? new Date(p.paid_at) : (p.created_at ? new Date(p.created_at) : createdAt)
              ]
            );
          }
        } else if (paidAmount > 0) {
          await conn.execute(
            "INSERT INTO payments (customer_id, invoice_id, type, method, amount, paid_at) VALUES (?, ?, ?, ?, ?, ?)",
            [
              customerId,
              invoiceId,
              'sale_payment',
              inv.payment_method || 'Cash',
              paidAmount,
              createdAt
            ]
          );
        }

        // Invoice activity
        await conn.execute(
          "INSERT INTO invoice_activity (invoice_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
          [invoiceId, req.userId, 'Invoice Imported', `Imported via Backup/Restore for €${grandTotal.toFixed(2)}`]
        );

        existingMap.set(invNum, invoiceId);
        importedCount++;
      } catch (itemError: any) {
        errorCount++;
        errors.push(`Error on invoice ${inv.invoice_number || 'Unknown'}: ${itemError.message}`);
      }
    }

    await conn.commit();

    res.json({
      success: true,
      total: invoices.length,
      imported: importedCount,
      skipped: skippedCount,
      errorsCount: errorCount,
      errors: errors.slice(0, 10)
    });
  } catch (e: any) {
    if (conn) await conn.rollback().catch(() => {});
    next(e);
  } finally {
    if (conn) conn.release();
  }
});

router.get('/', async (req: any, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    
    let sql = `
      SELECT i.*, 
             c.name as customer_name,
             b.name as branch_name,
             u.name as user_name,
             u.name as created_by_name,
             (
               SELECT GROUP_CONCAT(
                 CONCAT(
                   IF(ii.quantity > 1, CONCAT(ii.quantity, 'x '), ''),
                   COALESCE(p.name, ii.notes, 'Item'),
                   IF(d.imei IS NOT NULL AND d.imei != '', CONCAT(' (', d.imei, ')'), '')
                 ) SEPARATOR ', '
               )
               FROM invoice_items ii
               LEFT JOIN product_skus s ON ii.sku_id = s.id
               LEFT JOIN products p ON s.product_id = p.id
               LEFT JOIN devices d ON ii.device_id = d.id
               WHERE ii.invoice_id = i.id
             ) as products_summary
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id=c.id
      LEFT JOIN branches b ON i.branch_id=b.id
      LEFT JOIN users u ON i.user_id=u.id
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
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             b.name as branch_name,
             u.name as user_name,
             u.name as created_by_name
      FROM invoices i 
      LEFT JOIN customers c ON i.customer_id=c.id 
      LEFT JOIN branches b ON i.branch_id=b.id
      LEFT JOIN users u ON i.user_id=u.id
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
  tax_rate: z.number().or(z.string().transform(Number)).optional(),
  tax_type: z.string().optional(),
  discount_total: z.number().or(z.string().transform(Number)),
  grand_total: z.number().or(z.string().transform(Number)),
  items: z.array(z.object({
    id: z.number().optional(),
    sku_id: z.number().optional(),
    device_id: z.number().nullable().optional(),
    quantity: z.number().or(z.string().transform(Number)),
    price: z.number().or(z.string().transform(Number)),
    cost: z.number().or(z.string().transform(Number)).optional(),
    discount: z.number().or(z.string().transform(Number)).optional(),
    discount_type: z.string().optional().nullable(),
    total: z.number().or(z.string().transform(Number)),
    is_deposit: z.boolean().optional(),
    is_repair_payment: z.boolean().optional(),
    repair_job_id: z.number().or(z.string().transform(Number)).nullable().optional(),
    notes: z.string().optional().nullable()
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
  const { customer_id, items, subtotal, tax_total, tax_rate, tax_type, discount_total, grand_total, payments, activities } = data;
  
  if (!items || !items.length) return res.status(400).json({ error: 'Cart is empty' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // 1. Batch fetch product info
    const skuIds = items.map((i: any) => i.id || i.sku_id).filter(Boolean);
    let productInfoMap = new Map();
    if (skuIds.length > 0) {
      const [allProductInfo] = await conn.query(`
        SELECT s.id as sku_id, s.cost_price, p.product_type, p.allow_overselling
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
    const isRepair = (items || []).some((item: any) => item.is_repair_payment);
    const invoiceType = isRepair ? 'repair' : (isDeposit ? 'deposit' : 'sale');

    const branchPrefix = await getBranchPrefix(req.user.branch_id);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yymm = `${yy}${mm}`;
    const invoicePrefix = `${branchPrefix}-${yymm}`;

    const [lastInv] = await conn.execute(
      'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? AND business_id=? ORDER BY id DESC LIMIT 1',
      [`${invoicePrefix}-%`, req.user.business_id]
    );
    let nextNum = 1;
    if ((lastInv as any[]).length > 0) {
      const parts = String((lastInv as any[])[0].invoice_number).split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const invoiceNumber = `${invoicePrefix}-${String(nextNum).padStart(4, '0')}`;
    const grandTotalNum = Number(grand_total) || 0;
    const rawTotalPaid = (payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const totalPaid = Math.min(grandTotalNum, rawTotalPaid);
    const dueAmount = Math.max(0, grandTotalNum - rawTotalPaid);
    let status = 'paid';
    if (dueAmount > 0.01) {
      status = totalPaid > 0 ? 'partial' : 'credit';
      if (!isRepair) {
        const [cRows] = await conn.execute('SELECT id, name FROM customers WHERE id = ? AND business_id = ?', [finalCustomerId, req.user.business_id]);
        const cust = (cRows as any[])[0];
        if (!cust || cust.name === 'Walk-in Customer') {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ error: 'Walk-in customers cannot have an unpaid balance. Full payment is required.' });
        }
      }
    }
    
    let invR: any;
    try {
      [invR] = await conn.execute(
        'INSERT INTO invoices (business_id,branch_id,user_id,customer_id,invoice_number,type,subtotal,tax_total,tax_rate,tax_type,discount_total,grand_total,paid_amount,due_amount,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [req.user.business_id, req.user.branch_id, req.userId, finalCustomerId, invoiceNumber, invoiceType, subtotal, tax_total, Number(tax_rate) || 0, tax_type || 'excluded', discount_total, grand_total, totalPaid, dueAmount, status]
      );
    } catch (dbErr: any) {
      [invR] = await conn.execute(
        'INSERT INTO invoices (business_id,branch_id,user_id,customer_id,invoice_number,type,subtotal,tax_total,discount_total,grand_total,paid_amount,due_amount,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [req.user.business_id, req.user.branch_id, req.userId, finalCustomerId, invoiceNumber, invoiceType, subtotal, tax_total, discount_total, grand_total, totalPaid, dueAmount, status]
      );
    }
    const invoiceId = (invR as any).insertId;

    for (const item of items) {
      let skuId = item.id || item.sku_id;
      if ((!skuId || skuId === 0) && item.is_repair_payment) {
        const [existing] = await conn.execute(
          `SELECT s.id FROM product_skus s 
           JOIN products p ON s.product_id=p.id 
           WHERE p.business_id = ? AND p.product_type = 'service' AND p.name = 'Repair Service' AND p.deleted_at IS NULL
           ORDER BY s.id ASC LIMIT 1`,
          [req.user.business_id]
        );
        if ((existing as any[]).length > 0) {
          skuId = (existing as any[])[0].id;
        } else {
          const [pr] = await conn.execute(
            'INSERT INTO products (business_id,name,product_type,allow_overselling) VALUES (?,?,?,?)',
            [req.user.business_id, 'Repair Service', 'service', 1]
          );
          const productId = (pr as any).insertId;
          const branchPrefix = await getBranchPrefix(req.user.branch_id);
          const finalSku = `${branchPrefix}-${String(productId).padStart(5, '0')}`;
          const [sr] = await conn.execute(
            'INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)',
            [productId, finalSku, finalSku, 0, 0]
          );
          skuId = (sr as any).insertId;
        }
      }

      const productInfo = productInfoMap.get(skuId);
      const itemCost = productInfo?.cost_price || item.cost || 0;
      const itemNote = item.notes || (item.is_repair_payment && item.repair_job_id ? `Repair Job #${item.repair_job_id}` : null);
      await conn.execute(
        'INSERT INTO invoice_items (invoice_id,sku_id,device_id,quantity,price,cost,discount,total,notes) VALUES (?,?,?,?,?,?,?,?,?)',
        [invoiceId, skuId, item.device_id || null, item.quantity, item.price, itemCost, item.discount || 0, item.total, itemNote]
      );
      
      if (productInfo?.product_type === 'stock') {
        await conn.execute(`
          INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,-?)
          ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)
        `, [req.user.branch_id, skuId, item.quantity]);
      } else if (item.device_id) {
        const isSuper = req.user.role === 'superadmin';
        await conn.execute(
          `UPDATE devices SET status='sold' WHERE id=? AND business_id=? AND branch_id=? ${!isSuper ? 'AND user_id=?' : ''}`,
          !isSuper ? [item.device_id, req.user.business_id, req.user.branch_id, req.userId] : [item.device_id, req.user.business_id, req.user.branch_id]
        );
        await conn.execute(
          'INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
          [item.device_id, req.userId, 'Device Sold', `Sold on Invoice: ${invoiceNumber}`]
        );
        await conn.execute(
          'INSERT INTO activity_logs (business_id, branch_id, device_id, user_id, user_name, activity_type, description, reference_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [req.user.business_id, req.user.branch_id, item.device_id, req.userId, req.user?.name || null, 'Device Sold', 'Product delivered to customer', invoiceNumber]
        );
        await conn.execute(`
          INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,-1)
          ON DUPLICATE KEY UPDATE quantity=quantity-1
        `, [req.user.branch_id, skuId]);
      }
      
      if (item.is_deposit && finalCustomerId) {
        await conn.execute('UPDATE customers SET wallet_balance=COALESCE(wallet_balance,0)+? WHERE id=?', [item.total, finalCustomerId]);
      }
    }

    // Standard POS settlement: adjust excess cash tender for change given
    let excessChange = Math.max(0, rawTotalPaid - grandTotalNum);
    const settledPayments = (payments || []).map((p: any) => {
      let amt = Number(p.amount) || 0;
      const isCash = (p.method || '').toLowerCase().includes('cash');
      if (isCash && excessChange > 0) {
        const deduct = Math.min(amt, excessChange);
        amt -= deduct;
        excessChange -= deduct;
      }
      return { ...p, amount: amt };
    }).filter((p: any) => p.amount > 0);

    for (const p of settledPayments) {
      const type = (p.method==='Store Credit'||p.method==='Wallet') 
        ? 'wallet_use' 
        : (isDeposit ? 'deposit' : (isRepair ? 'repair_payment' : 'sale_payment'));
      await conn.execute('INSERT INTO payments (customer_id,invoice_id,type,method,amount) VALUES (?,?,?,?,?)',
        [finalCustomerId, invoiceId, type, p.method, p.amount]);
      if (type==='wallet_use') {
        await conn.execute('UPDATE customers SET wallet_balance=COALESCE(wallet_balance,0)-? WHERE id=?', [p.amount, finalCustomerId]);
      }
    }

    const logDetails = `Invoice ${invoiceNumber} created for €${(Number(grand_total) || 0).toFixed(2)}`;
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
    // Handle repair payment items — update jobs table
    const repairItems = (items || []).filter((item: any) => item.is_repair_payment && item.repair_job_id);
    for (const rItem of repairItems) {
      const repairAmount = Number(rItem.total) || 0;
      const jobId = Number(rItem.repair_job_id);
      if (repairAmount > 0 && jobId > 0) {
        await conn.execute(
          `UPDATE jobs SET 
             deposit_paid = COALESCE(deposit_paid,0) + ?, 
             remaining_balance = GREATEST(0, COALESCE(remaining_balance,0) - ?)
           WHERE id = ? AND business_id = ?`,
          [repairAmount, repairAmount, jobId, req.user.business_id]
        );

        // Check if fully paid → auto-set status to 'completed' ONLY if quote is set (> 0)
        const [jobRows] = await conn.execute('SELECT total_quote, remaining_balance, status FROM jobs WHERE id=? AND business_id=?', [jobId, req.user.business_id]);
        const updatedJob = (jobRows as any[])[0];
        if (updatedJob && Number(updatedJob.total_quote) > 0 && Number(updatedJob.remaining_balance) <= 0 && updatedJob.status !== 'completed' && updatedJob.status !== 'collected') {
          await conn.execute('UPDATE jobs SET status=? WHERE id=? AND business_id=?', ['completed', jobId, req.user.business_id]);
        }

        if (finalCustomerId) {
          await conn.execute(
            'INSERT INTO customer_activity (customer_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
            [finalCustomerId, req.userId, 'Repair Payment Received',
             `€${repairAmount.toFixed(2)} received for job #${jobId}. Invoice: ${invoiceNumber}`]
          );
        }
      }
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
  const { method = 'Cash', restock = true, items, is_full_refund, notes } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const checkSql = `SELECT * FROM invoices WHERE id=? AND business_id=? ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}`;
    const checkParams = (!isDeveloper && branchId) ? [req.params.id, req.user.business_id, branchId] : [req.params.id, req.user.business_id];
    const [invRows] = await conn.execute(checkSql, checkParams);

    const invoice = (invRows as any[])[0];
    if (!invoice) throw new Error('Invoice not found or access denied');
    if (invoice.status === 'void') throw new Error('This invoice has already been fully refunded');

    const [itemRows] = await conn.execute(`
      SELECT ii.*, p.name as product_name, d.imei
      FROM invoice_items ii
      JOIN product_skus s ON ii.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN devices d ON ii.device_id = d.id
      WHERE ii.invoice_id = ?
    `, [req.params.id]);

    const currentItems = itemRows as any[];
    if (currentItems.length === 0) throw new Error('No items found on this invoice');

    let totalRefundAmount = 0;
    const refundSummaries: string[] = [];
    const itemsToProcess: Array<{ id: number; sku_id: number; device_id: number | null; qty: number; unitPrice: number; name: string }> = [];

    if (Array.isArray(items) && items.length > 0 && !is_full_refund) {
      // Partial item refund based on selection
      for (const reqItem of items) {
        const item = currentItems.find(ci => ci.id === reqItem.item_id);
        if (!item) continue;

        const returnableQty = item.quantity - (Number(item.refunded_quantity) || 0);
        const qtyToRefund = Math.min(returnableQty, Math.max(0, Number(reqItem.quantity) || 0));
        if (qtyToRefund <= 0) continue;

        const unitEffectivePrice = Number(item.total) / Number(item.quantity);
        const itemRefundTotal = unitEffectivePrice * qtyToRefund;
        totalRefundAmount += itemRefundTotal;

        itemsToProcess.push({
          id: item.id,
          sku_id: item.sku_id,
          device_id: item.device_id,
          qty: qtyToRefund,
          unitPrice: unitEffectivePrice,
          name: item.product_name || 'Product'
        });

        refundSummaries.push(`${qtyToRefund}x ${item.product_name} (€${itemRefundTotal.toFixed(2)})`);
      }
    } else {
      // Full refund of all remaining unrefunded items
      for (const item of currentItems) {
        const returnableQty = item.quantity - (Number(item.refunded_quantity) || 0);
        if (returnableQty <= 0) continue;

        const unitEffectivePrice = Number(item.total) / Number(item.quantity);
        const itemRefundTotal = unitEffectivePrice * returnableQty;
        totalRefundAmount += itemRefundTotal;

        itemsToProcess.push({
          id: item.id,
          sku_id: item.sku_id,
          device_id: item.device_id,
          qty: returnableQty,
          unitPrice: unitEffectivePrice,
          name: item.product_name || 'Product'
        });

        refundSummaries.push(`${returnableQty}x ${item.product_name} (€${itemRefundTotal.toFixed(2)})`);
      }
    }

    if (itemsToProcess.length === 0 || totalRefundAmount <= 0) {
      throw new Error('No returnable items selected for refund');
    }

    // Process item updates & restocking
    for (const pItem of itemsToProcess) {
      await conn.execute(
        'UPDATE invoice_items SET refunded_quantity = COALESCE(refunded_quantity, 0) + ? WHERE id = ?',
        [pItem.qty, pItem.id]
      );

      if (restock) {
        await conn.execute(`
          INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        `, [invoice.branch_id || 1, pItem.sku_id, pItem.qty]);

        if (pItem.device_id) {
          await conn.execute("UPDATE devices SET status='in_stock' WHERE id=? AND business_id=?", [pItem.device_id, invoice.business_id || req.user.business_id]);
        }
      }
    }

    // Insert negative payment transaction for End of Day balance & accounting
    await conn.execute(
      'INSERT INTO payments (invoice_id, method, amount) VALUES (?, ?, ?)',
      [req.params.id, `Refund (${method})`, -totalRefundAmount]
    );

    // Evaluate new invoice status
    const [updatedItems] = await conn.execute(
      'SELECT SUM(quantity) as total_qty, SUM(COALESCE(refunded_quantity, 0)) as total_refunded FROM invoice_items WHERE invoice_id=?',
      [req.params.id]
    );
    const totalQty = Number((updatedItems as any[])[0]?.total_qty || 0);
    const totalRefunded = Number((updatedItems as any[])[0]?.total_refunded || 0);

    const isFullyRefunded = totalRefunded >= totalQty;
    const newStatus = isFullyRefunded ? 'void' : 'partially_refunded';
    await conn.execute('UPDATE invoices SET status=? WHERE id=?', [newStatus, req.params.id]);

    // Record activity audit trail
    const activityLabel = isFullyRefunded ? 'Refund Created' : 'Partial Refund';
    const detailMsg = `${activityLabel} issued via ${method} for €${totalRefundAmount.toFixed(2)} [${refundSummaries.join(', ')}]. ${restock ? 'Restocked to inventory.' : 'No restock.'}${notes ? ` Note: ${notes}` : ''}`;

    await conn.execute(
      'INSERT INTO invoice_activity (invoice_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
      [req.params.id, req.userId, activityLabel, detailMsg]
    );

    await conn.commit();
    res.json({ 
      success: true, 
      status: newStatus,
      refundAmount: totalRefundAmount,
      refundedItems: itemsToProcess
    });
  } catch (e: any) { 
    await conn.rollback(); 
    next(e); 
  } finally { 
    conn.release(); 
  }
});

router.post('/:id/send-email', async (req: any, res, next) => {
  try {
    const { email, subject, message } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const invRows = await query(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             b.name as branch_name, b.address as branch_address, b.phone as branch_phone, b.email as branch_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id=c.id
      LEFT JOIN branches b ON i.branch_id=b.id
      WHERE i.id=? AND i.business_id=? ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
      LIMIT 1
    `, (!isDeveloper && branchId) ? [req.params.id, req.user.business_id, branchId] : [req.params.id, req.user.business_id]) as any[];

    const invoice = invRows[0];
    if (!invoice) return res.status(404).json({ error: 'Invoice not found or access denied' });

    // Fetch items
    const items = await query(`
      SELECT ii.*, s.sku_code, p.name as product_name, d.imei
      FROM invoice_items ii
      LEFT JOIN product_skus s ON ii.sku_id=s.id
      LEFT JOIN products p ON s.product_id=p.id
      LEFT JOIN devices d ON ii.device_id=d.id
      WHERE ii.invoice_id=?
    `, [req.params.id]);

    // Fetch payments
    const payments = await query(`
      SELECT * FROM payments WHERE invoice_id=?
    `, [req.params.id]);

    // Fetch company / business info
    const company = await queryOne('SELECT * FROM businesses WHERE id=? LIMIT 1', [req.user.business_id]) as any;

    invoice.items = items;
    invoice.payments = payments;
    invoice.customer = {
      name: invoice.customer_name,
      phone: invoice.customer_phone,
      email: invoice.customer_email
    };

    const branch = {
      name: invoice.branch_name,
      address: invoice.branch_address,
      phone: invoice.branch_phone,
      email: invoice.branch_email
    };

    const emailSubject = subject || `Invoice ${invoice.invoice_number} from ${invoice.branch_name || company?.name || 'PhoneLab'}`;

    // Dispatch email asynchronously so UI modal returns instantly
    sendInvoiceEmail(email.trim(), emailSubject, invoice, company, message, branch)
      .then(async () => {
        await execute(
          'INSERT INTO invoice_activity (invoice_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
          [invoice.id, req.userId, 'Invoice Emailed', `Invoice emailed to ${email.trim()}`]
        ).catch(() => {});
      })
      .catch((err) => {
        console.error('[send-email background] error:', err.message);
        execute(
          'INSERT INTO invoice_activity (invoice_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
          [invoice.id, req.userId, 'Invoice Email Failed', `Failed sending email to ${email.trim()}: ${err.message}`]
        ).catch(() => {});
      });

    res.json({ success: true, message: `Invoice email successfully queued for ${email.trim()}` });
  } catch (e: any) { 
    console.error('[send-email] error:', e.message);
    res.status(400).json({ error: `Email Delivery Failed: ${e.message}` });
  }
});

router.post('/:id/activity', async (req: any, res, next) => {
  try {
    const { activity = 'Note Added', details } = req.body;
    if (!details || !String(details).trim()) {
      return res.status(400).json({ error: 'Note details are required' });
    }
    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const inv = await queryOne(
      `SELECT id FROM invoices WHERE id=? AND business_id=? ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}`,
      (!isDeveloper && branchId) ? [req.params.id, req.user.business_id, branchId] : [req.params.id, req.user.business_id]
    );
    if (!inv) return res.status(404).json({ error: 'Invoice not found or access denied' });

    await execute(
      'INSERT INTO invoice_activity (invoice_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
      [req.params.id, req.userId, activity, String(details).trim()]
    );

    const activities = await query(
      'SELECT a.*, u.name as user_name FROM invoice_activity a LEFT JOIN users u ON a.user_id=u.id WHERE a.invoice_id=? ORDER BY a.created_at DESC',
      [req.params.id]
    );

    res.json({ success: true, activities });
  } catch (e: any) { next(e); }
});

router.put('/payments/:id', async (req: any, res, next) => {
  try {
    const { method } = req.body;
    if (!method) return res.status(400).json({ error: 'Method is required' });
    const r = await execute(
      'UPDATE payments p LEFT JOIN invoices i ON p.invoice_id=i.id LEFT JOIN customers c ON p.customer_id=c.id SET p.method=? WHERE p.id=? AND (i.business_id=? OR c.business_id=?)',
      [method, req.params.id, req.user.business_id, req.user.business_id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Payment not found or access denied' });
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

export default router;
