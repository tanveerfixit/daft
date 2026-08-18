import { Router } from 'express';
import { pool, query, queryOne, execute } from '../mysql.js';
import { z } from 'zod';

const router = Router();

router.get('/dashboard-stats', async (req: any, res, next) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' });
  try {
    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const businessId = req.user.business_id;

    // 1. SALES KPI:
    // Total (count of sales in range), Total Sales (sum of grand_total in range)
    let salesSql = `
      SELECT COUNT(id) as count, COALESCE(SUM(grand_total), 0) as total 
      FROM invoices 
      WHERE business_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const salesParams = (!isDeveloper && branchId) ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
    const salesKpi = await queryOne(salesSql, salesParams) as any;

    // 2. REPAIRS KPI:
    // - Open: running total of non-collected repairs
    let openRepairsSql = `
      SELECT COUNT(id) as count FROM jobs 
      WHERE business_id=? AND status != 'collected'
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const openRepairsParams = (!isDeveloper && branchId) ? [businessId, branchId] : [businessId];
    const openRepairsKpi = await queryOne(openRepairsSql, openRepairsParams) as any;

    // - Added: repairs created inside the date range
    let addedRepairsSql = `
      SELECT COUNT(id) as count FROM jobs 
      WHERE business_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const addedRepairsParams = (!isDeveloper && branchId) ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
    const addedRepairsKpi = await queryOne(addedRepairsSql, addedRepairsParams) as any;

    // - Invoiced: repairs collected inside the date range
    let invoicedRepairsSql = `
      SELECT COUNT(id) as count FROM jobs 
      WHERE business_id=? AND status='collected' AND DATE(created_at)>=? AND DATE(created_at)<=?
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const invoicedRepairsParams = (!isDeveloper && branchId) ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
    const invoicedRepairsKpi = await queryOne(invoicedRepairsSql, invoicedRepairsParams) as any;

    // 3. CUSTOMERS KPI:
    // - Added: customers created in the date range
    let addedCustomersSql = `
      SELECT COUNT(id) as count FROM customers 
      WHERE business_id=? AND DATE(created_at)>=? AND DATE(created_at)<=? AND deleted_at IS NULL
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const addedCustomersParams = (!isDeveloper && branchId) ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
    const addedCustomersKpi = await queryOne(addedCustomersSql, addedCustomersParams) as any;

    // - Purchased: unique customers with invoices in range
    let purchasedCustomersSql = `
      SELECT COUNT(DISTINCT customer_id) as count FROM invoices
      WHERE business_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const purchasedCustomersParams = (!isDeveloper && branchId) ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
    const purchasedCustomersKpi = await queryOne(purchasedCustomersSql, purchasedCustomersParams) as any;

    // 4. Payments summaries (Payment Type and Total)
    let paymentsSql = `
      SELECT p.method as payment_type, COALESCE(SUM(p.amount), 0) as total 
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      WHERE i.business_id=? AND DATE(p.paid_at)>=? AND DATE(p.paid_at)<=?
      ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
      GROUP BY p.method
    `;
    const paymentsParams = (!isDeveloper && branchId) ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
    const paymentRows = await query(paymentsSql, paymentsParams) as any[];

    // 5. Category Reporting
    const categoryRows = await query(`SELECT id, name FROM categories WHERE business_id=?`, [businessId]) as any[];
    
    let purchasedSql = `
      SELECT p.category_id, COALESCE(SUM(m.quantity), 0) as qty, COALESCE(SUM(m.quantity * m.unit_cost), 0) as cost
      FROM inventory_movements m
      JOIN product_skus s ON m.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      WHERE m.business_id=? AND m.movement_type='purchase' AND DATE(m.created_at)>=? AND DATE(m.created_at)<=?
      ${(!isDeveloper && branchId) ? 'AND m.branch_id=?' : ''}
      GROUP BY p.category_id
    `;
    const purchasedParams = (!isDeveloper && branchId) ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
    const purchasedRows = await query(purchasedSql, purchasedParams) as any[];
    const purchasedMap = new Map(purchasedRows.map(r => [r.category_id, r]));

    let soldSql = `
      SELECT p.category_id, COALESCE(SUM(ii.quantity), 0) as qty, COALESCE(SUM(ii.quantity * ii.price), 0) as sales
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id=i.id
      JOIN product_skus s ON ii.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      WHERE i.business_id=? AND DATE(i.created_at)>=? AND DATE(i.created_at)<=?
      ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
      GROUP BY p.category_id
    `;
    const soldParams = (!isDeveloper && branchId) ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
    const soldRows = await query(soldSql, soldParams) as any[];
    const soldMap = new Map(soldRows.map(r => [r.category_id, r]));

    const categoriesReport = categoryRows.map(cat => {
      const p = purchasedMap.get(cat.id) || { qty: 0, cost: 0 };
      const s = soldMap.get(cat.id) || { qty: 0, sales: 0 };
      return {
        name: cat.name,
        qtyPurchased: p.qty,
        totalCost: p.cost,
        qtySold: s.qty,
        totalSales: s.sales
      };
    });

    res.json({
      sales: {
        total: salesKpi.total || 0,
        count: salesKpi.count || 0
      },
      repairs: {
        open: openRepairsKpi.count || 0,
        added: addedRepairsKpi.count || 0,
        invoiced: invoicedRepairsKpi.count || 0
      },
      customers: {
        added: addedCustomersKpi.count || 0,
        purchased: purchasedCustomersKpi.count || 0
      },
      payments: paymentRows,
      categories: categoriesReport
    });
  } catch (e: any) { next(e); }
});

// GET /api/reports/eod-data
router.get('/eod-data', async (req: any, res, next) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  try {
    const isSuper = req.user.role === 'superadmin' || req.user.role === 'developer';
    const branchId = req.user.branch_id;

    const invoicePayments = await query(`
      SELECT p.*, u.name as user_name, i.invoice_number, c.name as customer_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      LEFT JOIN users u ON i.user_id=u.id
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND i.business_id=? 
      ${(!isSuper && branchId) ? 'AND (i.branch_id=? OR i.branch_id IS NULL)' : ''}
    `, (!isSuper && branchId) ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);

    const otherMovements = await query(`
      SELECT p.*, 'System' as user_name, c.name as customer_name 
      FROM payments p
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND p.invoice_id IS NULL AND (c.business_id=? OR c.business_id IS NULL)
      ${(!isSuper && branchId) ? 'AND (c.branch_id=? OR c.branch_id IS NULL)' : ''}
    `, (!isSuper && branchId) ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);

    const summary = await query(`
      SELECT p.method, p.type, SUM(p.amount) as total 
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND (i.business_id=? OR c.business_id=?)
      ${(!isSuper && branchId) ? 'AND (i.branch_id=? OR i.branch_id IS NULL OR c.branch_id=?)' : ''}
      GROUP BY p.method, p.type
    `, (!isSuper && branchId) ? [date, req.user.business_id, req.user.business_id, branchId, branchId] : [date, req.user.business_id, req.user.business_id]);

    const existingReport = await queryOne(`
      SELECT starting_balance, comments, cash_counted, difference 
      FROM closing_reports 
      WHERE report_date=? AND business_id=? ${(!isSuper && branchId) ? 'AND (branch_id=? OR branch_id IS NULL)' : ''}
      ORDER BY id DESC LIMIT 1
    `, (!isSuper && branchId) ? [date, req.user.business_id, branchId] : [date, req.user.business_id]) as any;

    res.json({ 
      invoicePayments, 
      otherMovements, 
      summary, 
      date,
      startingBalance: existingReport ? Number(existingReport.starting_balance) : null,
      comments: existingReport?.comments || ''
    });
  } catch (e: any) { next(e); }
});

// GET /api/reports/starting-cash
router.get('/starting-cash', async (req: any, res, next) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const isSuper = req.user.role === 'superadmin' || req.user.role === 'developer';
    const branchId = req.user.branch_id;

    const report = await queryOne(`
      SELECT id, starting_balance, created_at 
      FROM closing_reports 
      WHERE report_date=? AND business_id=? ${(!isSuper && branchId) ? 'AND (branch_id=? OR branch_id IS NULL)' : ''}
      ORDER BY id DESC LIMIT 1
    `, (!isSuper && branchId) ? [date, req.user.business_id, branchId] : [date, req.user.business_id]) as any;

    const hasStartingCash = report !== null && report.starting_balance !== null && report.starting_balance !== undefined;
    res.json({
      hasStartingCash: !!hasStartingCash,
      startingBalance: hasStartingCash ? Number(report.starting_balance) : 0,
      reportId: report?.id || null
    });
  } catch (e: any) { next(e); }
});

// POST /api/reports/starting-cash
router.post('/starting-cash', async (req: any, res, next) => {
  try {
    const { starting_balance, report_date } = req.body;
    const date = report_date || new Date().toISOString().split('T')[0];
    const amount = Number(starting_balance) || 0;
    const branchId = req.user.branch_id || 1;

    const existing = await queryOne(`
      SELECT id FROM closing_reports 
      WHERE report_date=? AND business_id=? AND branch_id=?
      ORDER BY id DESC LIMIT 1
    `, [date, req.user.business_id, branchId]) as any;

    if (existing) {
      await execute(
        'UPDATE closing_reports SET starting_balance=? WHERE id=?',
        [amount, existing.id]
      );
      res.json({ success: true, message: 'Starting cash updated', id: existing.id, starting_balance: amount });
    } else {
      const r = await execute(
        `INSERT INTO closing_reports 
         (business_id, branch_id, user_id, report_date, starting_balance, cash_counted, calculated_cash, difference, total_sales, total_deposits, total_cash_in_drawer, comments)
         VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, '')`,
        [req.user.business_id, branchId, req.userId, date, amount]
      );
      res.json({ success: true, message: 'Starting cash recorded', id: r.insertId, starting_balance: amount });
    }
  } catch (e: any) { next(e); }
});

const endOfDaySchema = z.object({
  report_date: z.string().optional(),
  starting_balance: z.number().or(z.string().transform(Number)).optional(),
  cash_counted: z.number().or(z.string().transform(Number)).optional(),
  calculated_cash: z.number().or(z.string().transform(Number)).optional(),
  difference: z.number().or(z.string().transform(Number)).optional(),
  total_sales: z.number().or(z.string().transform(Number)).optional(),
  total_deposits: z.number().or(z.string().transform(Number)).optional(),
  total_cash_in_drawer: z.number().or(z.string().transform(Number)).optional(),
  comments: z.string().optional(),
  payment_summaries: z.array(z.object({
    payment_type: z.string().optional(),
    calculated: z.number().or(z.string().transform(Number)).optional(),
    counted: z.number().or(z.string().transform(Number)).optional(),
    difference: z.number().or(z.string().transform(Number)).optional()
  })).default([])
});

// POST /api/reports/eod
router.post('/eod', async (req: any, res, next) => {
  const data = endOfDaySchema.parse(req.body);
  const { report_date, starting_balance, cash_counted, calculated_cash, difference,
    total_sales, total_deposits, total_cash_in_drawer, comments, payment_summaries } = data;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.execute(
      'SELECT id FROM closing_reports WHERE business_id=? AND branch_id=? AND report_date=? ORDER BY id DESC LIMIT 1',
      [req.user.business_id, req.user.branch_id || 1, report_date]
    );
    let reportId: number;
    if ((existingRows as any[]).length > 0) {
      reportId = (existingRows as any[])[0].id;
      await conn.execute(`
        UPDATE closing_reports 
        SET user_id=?, starting_balance=?, cash_counted=?, calculated_cash=?, difference=?,
            total_sales=?, total_deposits=?, total_cash_in_drawer=?, comments=?
        WHERE id=?
      `, [req.userId, starting_balance, cash_counted, calculated_cash, difference,
          total_sales, total_deposits, total_cash_in_drawer, comments, reportId]);

      await conn.execute('DELETE FROM closing_report_payments WHERE report_id=?', [reportId]);
    } else {
      const [r] = await conn.execute(`
        INSERT INTO closing_reports
          (business_id,branch_id,user_id,report_date,starting_balance,cash_counted,calculated_cash,difference,
           total_sales,total_deposits,total_cash_in_drawer,comments)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [req.user.business_id, req.user.branch_id || 1, req.userId, report_date, starting_balance, cash_counted, calculated_cash, difference,
         total_sales, total_deposits, total_cash_in_drawer, comments]);
      reportId = (r as any).insertId;
    }

    for (const s of payment_summaries) {
      await conn.execute(
        'INSERT INTO closing_report_payments (report_id,payment_type,calculated,counted,difference) VALUES (?,?,?,?,?)',
        [reportId, s.payment_type, s.calculated, s.counted, s.difference]
      );
    }
    await conn.commit();
    res.json({ success: true, id: reportId });
  } catch (e: any) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});

// GET /api/reports/eod-list
router.get('/eod-list', async (req: any, res, next) => {
  try {
    const isSuper = req.user.role === 'superadmin';
    const sql = `
      SELECT r.*, u.name as user_name FROM closing_reports r
      JOIN users u ON r.user_id=u.id 
      WHERE r.business_id=? ${!isSuper ? 'AND r.branch_id=?' : ''}
      ORDER BY r.report_date DESC
    `;
    const params = !isSuper ? [req.user.business_id, req.user.branch_id] : [req.user.business_id];
    res.json(await query(sql, params));
  } catch (e: any) { next(e); }
});

export default router;
