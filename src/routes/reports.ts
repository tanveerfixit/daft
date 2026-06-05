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
    const isSuper = req.user.role === 'superadmin';
    const branchId = req.user.branch_id;

    const invoicePayments = await query(`
      SELECT p.*, u.name as user_name, i.invoice_number, c.name as customer_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      LEFT JOIN users u ON i.user_id=u.id
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND i.business_id=? 
      ${!isSuper ? 'AND i.branch_id=?' : ''}
    `, !isSuper ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);

    const otherMovements = await query(`
      SELECT p.*, 'System' as user_name, c.name as customer_name 
      FROM payments p
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND p.invoice_id IS NULL AND c.business_id=?
      ${!isSuper ? 'AND c.branch_id=?' : ''}
    `, !isSuper ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);

    const summary = await query(`
      SELECT method, type, SUM(amount) as total FROM payments p
      JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND c.business_id=? ${!isSuper ? 'AND c.branch_id=?' : ''}
      GROUP BY method, type
    `, !isSuper ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);

    res.json({ invoicePayments, otherMovements, summary, date });
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
    const [r] = await conn.execute(`
      INSERT INTO closing_reports
        (business_id,branch_id,user_id,report_date,starting_balance,cash_counted,calculated_cash,difference,
         total_sales,total_deposits,total_cash_in_drawer,comments)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.user.business_id, req.user.branch_id, req.userId, report_date, starting_balance, cash_counted, calculated_cash, difference,
       total_sales, total_deposits, total_cash_in_drawer, comments]);
    const reportId = (r as any).insertId;
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

// GET /api/reports/sales-report
router.get('/sales-report', async (req: any, res, next) => {
  const { type, startDate, endDate, q } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' });
  
  try {
    const isDeveloper = req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const businessId = req.user.business_id;

    let sql = '';
    const params: any[] = [];

    // Helper to add common filters (business, date, branch, search keyword)
    const addCommonFilters = (useItemJoin = false) => {
      let cond = ` WHERE i.business_id = ? AND DATE(i.created_at) >= ? AND DATE(i.created_at) <= ?`;
      params.push(businessId, startDate, endDate);
      
      if (!isDeveloper && branchId) {
        cond += ` AND i.branch_id = ?`;
        params.push(branchId);
      }
      
      if (q && q.trim()) {
        if (useItemJoin) {
          cond += ` AND (i.invoice_number LIKE ? OR c.name LIKE ? OR p.name LIKE ? OR s.sku_code LIKE ?)`;
          params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
        } else {
          cond += ` AND (i.invoice_number LIKE ? OR c.name LIKE ? OR u.name LIKE ?)`;
          params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
      }
      return cond;
    };

    if (type === 'date-daily') {
      sql = `
        SELECT 
          DATE_FORMAT(i.created_at, '%d-%m-%Y') as name,
          COALESCE(SUM(CASE WHEN i.tax_total > 0 THEN i.subtotal ELSE 0 END), 0) as taxable,
          COALESCE(SUM(i.tax_total), 0) as taxes,
          COALESCE(SUM(CASE WHEN i.tax_total = 0 OR i.tax_total IS NULL THEN i.grand_total ELSE 0 END), 0) as non_taxable,
          COALESCE(SUM(i.grand_total), 0) as grand_total,
          COALESCE(SUM(ic.cost), 0) as cost
        FROM invoices i
        LEFT JOIN (
          SELECT invoice_id, SUM(quantity * cost) as cost 
          FROM invoice_items 
          GROUP BY invoice_id
        ) ic ON i.id = ic.invoice_id
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.user_id = u.id
      `;
      sql += addCommonFilters();
      sql += ` GROUP BY DATE(i.created_at) ORDER BY DATE(i.created_at) ASC`;
    }
    else if (type === 'date-weekly') {
      sql = `
        SELECT 
          CONCAT(DATE_FORMAT(STR_TO_DATE(CONCAT(YEARWEEK(i.created_at, 1), ' Monday'), '%x%v %W'), '%d-%m-%Y'), ' - ', DATE_FORMAT(DATE_ADD(STR_TO_DATE(CONCAT(YEARWEEK(i.created_at, 1), ' Monday'), '%x%v %W'), INTERVAL 6 DAY), '%d-%m-%Y')) as name,
          COALESCE(SUM(CASE WHEN i.tax_total > 0 THEN i.subtotal ELSE 0 END), 0) as taxable,
          COALESCE(SUM(i.tax_total), 0) as taxes,
          COALESCE(SUM(CASE WHEN i.tax_total = 0 OR i.tax_total IS NULL THEN i.grand_total ELSE 0 END), 0) as non_taxable,
          COALESCE(SUM(i.grand_total), 0) as grand_total,
          COALESCE(SUM(ic.cost), 0) as cost
        FROM invoices i
        LEFT JOIN (
          SELECT invoice_id, SUM(quantity * cost) as cost 
          FROM invoice_items 
          GROUP BY invoice_id
        ) ic ON i.id = ic.invoice_id
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.user_id = u.id
      `;
      sql += addCommonFilters();
      sql += ` GROUP BY YEARWEEK(i.created_at, 1) ORDER BY YEARWEEK(i.created_at, 1) ASC`;
    }
    else if (type === 'date-monthly') {
      sql = `
        SELECT 
          DATE_FORMAT(i.created_at, '%M %Y') as name,
          COALESCE(SUM(CASE WHEN i.tax_total > 0 THEN i.subtotal ELSE 0 END), 0) as taxable,
          COALESCE(SUM(i.tax_total), 0) as taxes,
          COALESCE(SUM(CASE WHEN i.tax_total = 0 OR i.tax_total IS NULL THEN i.grand_total ELSE 0 END), 0) as non_taxable,
          COALESCE(SUM(i.grand_total), 0) as grand_total,
          COALESCE(SUM(ic.cost), 0) as cost
        FROM invoices i
        LEFT JOIN (
          SELECT invoice_id, SUM(quantity * cost) as cost 
          FROM invoice_items 
          GROUP BY invoice_id
        ) ic ON i.id = ic.invoice_id
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.user_id = u.id
      `;
      sql += addCommonFilters();
      sql += ` GROUP BY DATE_FORMAT(i.created_at, '%Y-%m') ORDER BY DATE_FORMAT(i.created_at, '%Y-%m') ASC`;
    }
    else if (type === 'salesperson') {
      sql = `
        SELECT COALESCE(u.name, 'Unknown') as name, COUNT(i.id) as count, COALESCE(SUM(i.grand_total), 0) as total
        FROM invoices i
        LEFT JOIN users u ON i.user_id = u.id
        LEFT JOIN customers c ON i.customer_id = c.id
      `;
      sql += addCommonFilters();
      sql += ` GROUP BY i.user_id ORDER BY total DESC`;
    } 
    else if (type === 'customer') {
      sql = `
        SELECT COALESCE(c.name, 'Walk-in Customer') as name, COUNT(i.id) as count, COALESCE(SUM(i.grand_total), 0) as total
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.user_id = u.id
      `;
      sql += addCommonFilters();
      sql += ` GROUP BY i.customer_id ORDER BY total DESC`;
    }
    else if (type === 'product') {
      sql = `
        SELECT p.name as name, s.sku_code, SUM(ii.quantity) as count, SUM(ii.total) as total
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        JOIN product_skus s ON ii.sku_id = s.id
        JOIN products p ON s.product_id = p.id
        LEFT JOIN customers c ON i.customer_id = c.id
      `;
      sql += addCommonFilters(true);
      sql += ` GROUP BY ii.sku_id ORDER BY total DESC`;
    }
    else if (type === 'category') {
      sql = `
        SELECT COALESCE(cat.name, 'Uncategorized') as name, SUM(ii.quantity) as count, SUM(ii.total) as total
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        JOIN product_skus s ON ii.sku_id = s.id
        JOIN products p ON s.product_id = p.id
        LEFT JOIN categories cat ON p.category_id = cat.id
        LEFT JOIN customers c ON i.customer_id = c.id
      `;
      sql += addCommonFilters(true);
      sql += ` GROUP BY p.category_id ORDER BY total DESC`;
    }
    else if (type === 'payment') {
      sql = `
        SELECT p.method as name, COUNT(p.id) as count, COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.user_id = u.id
      `;
      // Instead of standard search filters, we check if they selected a payment method specifically or left it as "All"
      let cond = ` WHERE i.business_id = ? AND DATE(i.created_at) >= ? AND DATE(i.created_at) <= ?`;
      params.push(businessId, startDate, endDate);
      if (!isDeveloper && branchId) {
        cond += ` AND i.branch_id = ?`;
        params.push(branchId);
      }
      if (q && q.trim() && q !== 'All Payment Types') {
        cond += ` AND p.method = ?`;
        params.push(q);
      }
      sql += cond;
      sql += ` GROUP BY p.method ORDER BY total DESC`;
    }
    else if (type === 'tax') {
      sql = `
        SELECT 'Tax Report' as name, 
               COALESCE(SUM(i.subtotal - i.tax_total), 0) as net_sales, 
               COALESCE(SUM(i.tax_total), 0) as tax_amount, 
               COALESCE(SUM(i.grand_total), 0) as total
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.user_id = u.id
      `;
      sql += addCommonFilters();
    }
    else if (type === 'unpaid') {
      sql = `
        SELECT i.invoice_number as name, COALESCE(c.name, 'Walk-in Customer') as customer_name, i.due_amount as total, i.grand_total as amount, i.created_at
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.user_id = u.id
      `;
      sql += addCommonFilters();
      sql += ` AND i.due_amount > 0.01 AND i.status != 'void' ORDER BY i.due_amount DESC`;
    }
    else {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    const rows = await query(sql, params);
    res.json(rows);
  } catch (e: any) { next(e); }
});

export default router;
