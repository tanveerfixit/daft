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

    const startDateTime = String(startDate).includes(' ') ? String(startDate) : `${startDate} 00:00:00`;
    const endDateTime = String(endDate).includes(' ') ? String(endDate) : `${endDate} 23:59:59`;

    // 1. SALES KPI:
    // Total (count of sales in range), Total Sales (sum of grand_total in range)
    let salesSql = `
      SELECT COUNT(id) as count, COALESCE(SUM(grand_total), 0) as total 
      FROM invoices 
      WHERE business_id=? AND created_at >= ? AND created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const salesParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const salesKpi = await queryOne(salesSql, salesParams) as any;

    // 2. REPAIRS KPI:
    // - Open: running total of non-collected repairs (excluding collected, cancelled, and returned unfixed)
    let openRepairsSql = `
      SELECT COUNT(id) as count FROM jobs 
      WHERE business_id=? AND status NOT IN ('collected', 'cancelled', 'collected_unfixed')
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const openRepairsParams = (!isDeveloper && branchId) ? [businessId, branchId] : [businessId];
    const openRepairsKpi = await queryOne(openRepairsSql, openRepairsParams) as any;

    // - Added: repairs created inside the date range
    let addedRepairsSql = `
      SELECT COUNT(id) as count FROM jobs 
      WHERE business_id=? AND created_at >= ? AND created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const addedRepairsParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const addedRepairsKpi = await queryOne(addedRepairsSql, addedRepairsParams) as any;

    // - Invoiced: repairs collected inside the date range
    let invoicedRepairsSql = `
      SELECT COUNT(id) as count FROM jobs 
      WHERE business_id=? AND status='collected' AND created_at >= ? AND created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const invoicedRepairsParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const invoicedRepairsKpi = await queryOne(invoicedRepairsSql, invoicedRepairsParams) as any;

    // 3. CUSTOMERS KPI:
    // - Added: customers created in the date range
    let addedCustomersSql = `
      SELECT COUNT(id) as count FROM customers 
      WHERE business_id=? AND created_at >= ? AND created_at <= ? AND deleted_at IS NULL
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const addedCustomersParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const addedCustomersKpi = await queryOne(addedCustomersSql, addedCustomersParams) as any;

    // - Purchased: unique customers with invoices in range
    let purchasedCustomersSql = `
      SELECT COUNT(DISTINCT customer_id) as count FROM invoices
      WHERE business_id=? AND created_at >= ? AND created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const purchasedCustomersParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const purchasedCustomersKpi = await queryOne(purchasedCustomersSql, purchasedCustomersParams) as any;

    // 4. Payments summaries (Payment Type and Total)
    let paymentsSql = `
      SELECT p.method as payment_type, COALESCE(SUM(p.amount), 0) as total 
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      WHERE i.business_id=? AND p.paid_at >= ? AND p.paid_at <= ?
      ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
      GROUP BY p.method
    `;
    const paymentsParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const paymentRows = await query(paymentsSql, paymentsParams) as any[];

    // 5. Category Reporting
    const categoryRows = await query(`SELECT id, name FROM categories WHERE business_id=?`, [businessId]) as any[];
    
    let purchasedSql = `
      SELECT p.category_id, COALESCE(SUM(m.quantity), 0) as qty, COALESCE(SUM(m.quantity * m.unit_cost), 0) as cost
      FROM inventory_movements m
      JOIN product_skus s ON m.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      WHERE m.business_id=? AND m.movement_type='purchase' AND m.created_at >= ? AND m.created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND m.branch_id=?' : ''}
      GROUP BY p.category_id
    `;
    const purchasedParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const purchasedRows = await query(purchasedSql, purchasedParams) as any[];
    const purchasedMap = new Map(purchasedRows.map(r => [r.category_id, r]));

    let soldSql = `
      SELECT p.category_id, COALESCE(SUM(ii.quantity), 0) as qty, COALESCE(SUM(ii.quantity * ii.price), 0) as sales
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id=i.id
      JOIN product_skus s ON ii.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      WHERE i.business_id=? AND i.created_at >= ? AND i.created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
      GROUP BY p.category_id
    `;
    const soldParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
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

    // 6. Daily Sales Trend
    let dailyTrendSql = `
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date,
             COUNT(id) as count,
             COALESCE(SUM(grand_total), 0) as total
      FROM invoices
      WHERE business_id=? AND created_at >= ? AND created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC
    `;
    const dailyTrendParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const dailyTrendRows = await query(dailyTrendSql, dailyTrendParams) as any[];

    // 7. Hourly Peak Trading Trend (0 to 23)
    let hourlyTrendSql = `
      SELECT HOUR(created_at) as hour,
             COUNT(id) as count,
             COALESCE(SUM(grand_total), 0) as total
      FROM invoices
      WHERE business_id=? AND created_at >= ? AND created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
      GROUP BY HOUR(created_at)
      ORDER BY hour ASC
    `;
    const hourlyTrendParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const hourlyTrendRows = await query(hourlyTrendSql, hourlyTrendParams) as any[];

    const hourlyMap = new Map(hourlyTrendRows.map(r => [Number(r.hour), r]));
    const hourlyTrend = Array.from({ length: 24 }, (_, h) => {
      const row = hourlyMap.get(h);
      const displayHour = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
      return {
        hour: h,
        label: displayHour,
        count: row ? Number(row.count || 0) : 0,
        total: row ? Number(row.total || 0) : 0
      };
    });

    // 8. Executive Financial Metrics (COGS, Net Profit, Margin %, Tax)
    let profitSql = `
      SELECT 
        COALESCE(SUM(i.grand_total), 0) as grand_total,
        COALESCE(SUM(i.tax_total), 0) as tax_total,
        COALESCE(SUM(i.discount_total), 0) as discount_total,
        COALESCE(SUM(ii.quantity * COALESCE(ii.cost, s.cost_price, 0)), 0) as cogs
      FROM invoices i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      LEFT JOIN product_skus s ON ii.sku_id = s.id
      WHERE i.business_id=? AND i.created_at >= ? AND i.created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
    `;
    const profitParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const profitRow = await queryOne(profitSql, profitParams) as any;

    const grossRevenue = Number(salesKpi.total || 0);
    const cogs = Number(profitRow?.cogs || 0);
    const grossProfit = Math.max(0, grossRevenue - cogs);
    const marginPercent = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
    const aov = salesKpi.count > 0 ? (grossRevenue / salesKpi.count) : 0;
    const taxTotal = Number(profitRow?.tax_total || 0);

    // 9. Top Profit Drivers ("Money Makers")
    let topProfitSql = `
      SELECT 
        COALESCE(p.name, 'Product') as name,
        p.id as product_id,
        SUM(ii.quantity) as qty_sold,
        COALESCE(SUM(ii.total), 0) as revenue,
        COALESCE(SUM(ii.quantity * COALESCE(ii.cost, s.cost_price, 0)), 0) as cost,
        COALESCE(SUM(ii.total - (ii.quantity * COALESCE(ii.cost, s.cost_price, 0))), 0) as profit,
        COALESCE(bs.quantity, 0) as current_stock
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      LEFT JOIN product_skus s ON ii.sku_id = s.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN branch_stock bs ON (bs.sku_id = s.id AND bs.branch_id = i.branch_id)
      WHERE i.business_id=? AND i.created_at >= ? AND i.created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
      GROUP BY p.name, p.id, bs.quantity
      ORDER BY profit DESC
      LIMIT 10
    `;
    const topProfitParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const topProfitRows = await query(topProfitSql, topProfitParams) as any[];

    const topProfitDrivers = topProfitRows.map(r => {
      const rev = Number(r.revenue || 0);
      const prof = Number(r.profit || 0);
      const margin = rev > 0 ? (prof / rev) * 100 : 0;
      return {
        name: r.name,
        qtySold: Number(r.qty_sold || 0),
        revenue: rev,
        profit: prof,
        marginPercent: margin,
        currentStock: Number(r.current_stock || 0)
      };
    });

    // 10. Growth & Upselling Levers (Attachment Rate, Revenue Split, Repeat Customers)
    let multiItemSql = `
      SELECT 
        COUNT(DISTINCT i.id) as total_invoices,
        COUNT(DISTINCT CASE WHEN item_counts.item_cnt > 1 THEN i.id END) as multi_item_invoices
      FROM invoices i
      JOIN (
        SELECT invoice_id, SUM(quantity) as item_cnt 
        FROM invoice_items 
        GROUP BY invoice_id
      ) item_counts ON item_counts.invoice_id = i.id
      WHERE i.business_id=? AND i.created_at >= ? AND i.created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
    `;
    const multiItemParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const multiItemRow = await queryOne(multiItemSql, multiItemParams) as any;

    const totalInv = Number(multiItemRow?.total_invoices || salesKpi.count || 0);
    const multiInv = Number(multiItemRow?.multi_item_invoices || 0);
    const attachmentRate = totalInv > 0 ? (multiInv / totalInv) * 100 : 0;

    let splitSql = `
      SELECT 
        COALESCE(SUM(CASE WHEN p.product_type = 'service' OR ii.device_id IS NOT NULL THEN ii.total ELSE 0 END), 0) as repair_revenue,
        COALESCE(SUM(CASE WHEN p.product_type != 'service' AND ii.device_id IS NULL THEN ii.total ELSE 0 END), 0) as retail_revenue
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      LEFT JOIN product_skus s ON ii.sku_id = s.id
      LEFT JOIN products p ON s.product_id = p.id
      WHERE i.business_id=? AND i.created_at >= ? AND i.created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
    `;
    const splitParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const splitRow = await queryOne(splitSql, splitParams) as any;
    const repairRev = Number(splitRow?.repair_revenue || 0);
    const retailRev = Number(splitRow?.retail_revenue || 0);
    const splitTotal = repairRev + retailRev || 1;
    const repairPercent = (repairRev / splitTotal) * 100;
    const retailPercent = (retailRev / splitTotal) * 100;

    let repeatCustSql = `
      SELECT 
        COUNT(DISTINCT i.customer_id) as total_customers,
        COUNT(DISTINCT CASE WHEN cust_orders.order_cnt > 1 THEN i.customer_id END) as repeat_customers
      FROM invoices i
      JOIN (
        SELECT customer_id, COUNT(id) as order_cnt 
        FROM invoices 
        WHERE business_id=?
        GROUP BY customer_id
      ) cust_orders ON cust_orders.customer_id = i.customer_id
      WHERE i.business_id=? AND i.customer_id IS NOT NULL AND i.created_at >= ? AND i.created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND i.branch_id=?' : ''}
    `;
    const repeatCustParams = (!isDeveloper && branchId) ? [businessId, businessId, startDateTime, endDateTime, branchId] : [businessId, businessId, startDateTime, endDateTime];
    const repeatCustRow = await queryOne(repeatCustSql, repeatCustParams) as any;
    const totalActiveCust = Number(repeatCustRow?.total_customers || 0);
    const repeatActiveCust = Number(repeatCustRow?.repeat_customers || 0);
    const repeatCustomerRate = totalActiveCust > 0 ? (repeatActiveCust / totalActiveCust) * 100 : 0;

    let lowStockSql = `
      SELECT p.name, COALESCE(bs.quantity, 0) as stock, s.cost_price, s.selling_price as retail_price
      FROM products p
      JOIN product_skus s ON s.product_id = p.id
      JOIN branch_stock bs ON bs.sku_id = s.id
      WHERE p.business_id=? AND bs.quantity <= 3 AND p.deleted_at IS NULL
      ${(!isDeveloper && branchId) ? 'AND bs.branch_id=?' : ''}
      ORDER BY bs.quantity ASC
      LIMIT 4
    `;
    const lowStockParams = (!isDeveloper && branchId) ? [businessId, branchId] : [businessId];
    const lowStockRows = await query(lowStockSql, lowStockParams) as any[];

    let fixRateSql = `
      SELECT 
        COUNT(CASE WHEN status IN ('completed', 'collected') THEN 1 END) as fixed_count,
        COUNT(CASE WHEN status IN ('unrepairable', 'cancelled') THEN 1 END) as unfixed_count,
        COUNT(id) as total_jobs
      FROM jobs
      WHERE business_id=? AND created_at >= ? AND created_at <= ?
      ${(!isDeveloper && branchId) ? 'AND branch_id=?' : ''}
    `;
    const fixRateParams = (!isDeveloper && branchId) ? [businessId, startDateTime, endDateTime, branchId] : [businessId, startDateTime, endDateTime];
    const fixRateRow = await queryOne(fixRateSql, fixRateParams) as any;
    const fixedCount = Number(fixRateRow?.fixed_count || 0);
    const unfixedCount = Number(fixRateRow?.unfixed_count || 0);
    const closedJobs = fixedCount + unfixedCount;
    const fixRate = closedJobs > 0 ? (fixedCount / closedJobs) * 100 : 100;

    res.json({
      sales: {
        total: salesKpi.total || 0,
        count: salesKpi.count || 0
      },
      repairs: {
        open: openRepairsKpi.count || 0,
        added: addedRepairsKpi.count || 0,
        invoiced: invoicedRepairsKpi.count || 0,
        fixRate
      },
      customers: {
        added: addedCustomersKpi.count || 0,
        purchased: purchasedCustomersKpi.count || 0
      },
      financials: {
        grossRevenue,
        cogs,
        grossProfit,
        marginPercent,
        aov,
        taxTotal
      },
      topProfitDrivers,
      growthLevers: {
        attachmentRate,
        repairRevenue: repairRev,
        retailRevenue: retailRev,
        repairPercent,
        retailPercent,
        repeatCustomerRate,
        reorderAlerts: lowStockRows.map(r => ({
          name: r.name,
          stock: Number(r.stock || 0),
          costPrice: Number(r.cost_price || 0),
          retailPrice: Number(r.retail_price || 0)
        }))
      },
      payments: paymentRows,
      categories: categoriesReport,
      dailyTrend: dailyTrendRows.map(r => ({
        date: r.date,
        count: Number(r.count || 0),
        total: Number(r.total || 0)
      })),
      hourlyTrend
    });
  } catch (e: any) { next(e); }
});

// GET /api/reports/eod-data
router.get('/eod-data', async (req: any, res, next) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  try {
    const isSuper = req.user.role === 'superadmin' || req.user.role === 'developer';
    const branchId = req.user.branch_id;
    const startDateTime = `${date} 00:00:00`;
    const endDateTime = `${date} 23:59:59`;

    const invoicePayments = await query(`
      SELECT p.*, u.name as user_name, i.invoice_number, i.status as invoice_status, c.name as customer_name,
        (
          SELECT GROUP_CONCAT(
            CONCAT(
              IF(ii.quantity > 1, CONCAT(ii.quantity, 'x '), ''),
              COALESCE(pr.name, ii.notes, 'Item'),
              IF(d.imei IS NOT NULL AND d.imei != '', CONCAT(' (', d.imei, ')'), '')
            ) SEPARATOR ', '
          )
          FROM invoice_items ii
          LEFT JOIN product_skus s ON ii.sku_id = s.id
          LEFT JOIN products pr ON s.product_id = pr.id
          LEFT JOIN devices d ON ii.device_id = d.id
          WHERE ii.invoice_id = i.id
        ) as products_summary
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      LEFT JOIN users u ON i.user_id=u.id
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE p.paid_at >= ? AND p.paid_at <= ? AND i.business_id=? 
      ${(!isSuper && branchId) ? 'AND (i.branch_id=? OR i.branch_id IS NULL)' : ''}
      ORDER BY p.id ASC
    `, (!isSuper && branchId) ? [startDateTime, endDateTime, req.user.business_id, branchId] : [startDateTime, endDateTime, req.user.business_id]);

    const otherMovements = await query(`
      SELECT p.*, 'System' as user_name, c.name as customer_name,
        COALESCE(p.type, 'Customer Deposit') as products_summary
      FROM payments p
      JOIN customers c ON p.customer_id=c.id
      WHERE p.paid_at >= ? AND p.paid_at <= ? AND p.invoice_id IS NULL AND c.business_id=?
      ${(!isSuper && branchId) ? 'AND (c.branch_id=? OR c.branch_id IS NULL)' : ''}
      ORDER BY p.id ASC
    `, (!isSuper && branchId) ? [startDateTime, endDateTime, req.user.business_id, branchId] : [startDateTime, endDateTime, req.user.business_id]);

    const summary = await query(`
      SELECT p.method, p.type, SUM(p.amount) as total 
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE p.paid_at >= ? AND p.paid_at <= ? 
        AND ((p.invoice_id IS NOT NULL AND i.business_id=?) OR (p.invoice_id IS NULL AND c.business_id=?))
      ${(!isSuper && branchId) ? 'AND ((p.invoice_id IS NOT NULL AND (i.branch_id=? OR i.branch_id IS NULL)) OR (p.invoice_id IS NULL AND (c.branch_id=? OR c.branch_id IS NULL)))' : ''}
      GROUP BY p.method, p.type
      ORDER BY p.method ASC
    `, (!isSuper && branchId) ? [startDateTime, endDateTime, req.user.business_id, req.user.business_id, branchId, branchId] : [startDateTime, endDateTime, req.user.business_id, req.user.business_id]);

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
      cashCounted: existingReport?.cash_counted != null ? Number(existingReport.cash_counted) : null,
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

// GET /api/reports/activity-logs
router.get('/activity-logs', async (req: any, res, next) => {
  try {
    const businessId = req.user.business_id;
    const { activity_type, user_id, start_date, end_date, search, page = 1, limit = 50 } = req.query;

    const limitNum = Math.min(200, Math.max(1, Number(limit)));
    const pageNum = Math.max(1, Number(page));
    const offset = (pageNum - 1) * limitNum;

    // Fetch team users for filter dropdown
    const users = await query(
      'SELECT id, name FROM users WHERE business_id=? AND deleted_at IS NULL ORDER BY name ASC',
      [businessId]
    );

    // Fast distinct activity types from activity_logs + core categories
    const typeRows = await query(
      `SELECT DISTINCT activity_type FROM activity_logs WHERE business_id=? AND activity_type IS NOT NULL AND activity_type != '' ORDER BY activity_type ASC`,
      [businessId]
    ) as any[];
    const standardTypes = ['Invoice Created', 'Invoice Updated', 'Payment Added', 'Customer Created', 'Customer Updated', 'Product Created', 'Stock Adjusted', 'Device Checked In', 'Status Changed'];
    const customTypes = typeRows.map(r => r.activity_type).filter(Boolean);
    const activityTypes = Array.from(new Set([...customTypes, ...standardTypes])).sort();

    // Push date / user / search filters into each subquery
    const dateStart = start_date ? (String(start_date).includes(' ') ? String(start_date) : `${start_date} 00:00:00`) : null;
    const dateEnd = end_date ? (String(end_date).includes(' ') ? String(end_date) : `${end_date} 23:59:59`) : null;

    // Helper to build parameterized subqueries
    const buildSubquery = (
      table: 'al' | 'ia' | 'ca' | 'pa' | 'da'
    ): { sql: string; params: any[] } => {
      const p: any[] = [];
      let sql = '';
      if (table === 'al') {
        let where = '(al.business_id = ? OR (al.business_id IS NULL AND u.business_id = ?))';
        p.push(businessId, businessId);
        if (dateStart) { where += ' AND al.created_at >= ?'; p.push(dateStart); }
        if (dateEnd) { where += ' AND al.created_at <= ?'; p.push(dateEnd); }
        if (user_id && user_id !== 'all') { where += ' AND al.user_id = ?'; p.push(Number(user_id)); }
        sql = `
          SELECT 
            CONCAT('al_', al.id) as log_id,
            COALESCE(al.business_id, u.business_id) as business_id,
            al.user_id,
            COALESCE(al.user_name, u.name, 'System') as user_name,
            COALESCE(al.activity_type, 'General Activity') as activity_type,
            COALESCE(al.description, '') as details,
            COALESCE(al.reference_type, IF(al.device_id IS NOT NULL, 'device', IF(al.product_id IS NOT NULL, 'product', NULL))) as reference_type,
            COALESCE(al.reference_id, al.device_id, al.product_id) as reference_id,
            COALESCE(al.reference_link, IF(al.device_id IS NOT NULL, CONCAT('/devices/', al.device_id), IF(al.product_id IS NOT NULL, CONCAT('/products/', al.product_id), NULL))) as reference_link,
            al.ip_address,
            al.created_at
          FROM activity_logs al
          LEFT JOIN users u ON al.user_id = u.id
          WHERE ${where}
        `;
      } else if (table === 'ia') {
        let where = 'i.business_id = ?';
        p.push(businessId);
        if (dateStart) { where += ' AND ia.created_at >= ?'; p.push(dateStart); }
        if (dateEnd) { where += ' AND ia.created_at <= ?'; p.push(dateEnd); }
        if (user_id && user_id !== 'all') { where += ' AND ia.user_id = ?'; p.push(Number(user_id)); }
        sql = `
          SELECT 
            CONCAT('inv_', ia.id) as log_id,
            i.business_id as business_id,
            ia.user_id,
            COALESCE(u.name, 'System') as user_name,
            ia.activity as activity_type,
            ia.details,
            'invoice' as reference_type,
            ia.invoice_id as reference_id,
            CONCAT('/invoices/', ia.invoice_id) as reference_link,
            NULL as ip_address,
            ia.created_at
          FROM invoice_activity ia
          JOIN invoices i ON ia.invoice_id = i.id
          LEFT JOIN users u ON ia.user_id = u.id
          WHERE ${where}
        `;
      } else if (table === 'ca') {
        let where = 'c.business_id = ?';
        p.push(businessId);
        if (dateStart) { where += ' AND ca.created_at >= ?'; p.push(dateStart); }
        if (dateEnd) { where += ' AND ca.created_at <= ?'; p.push(dateEnd); }
        if (user_id && user_id !== 'all') { where += ' AND ca.user_id = ?'; p.push(Number(user_id)); }
        sql = `
          SELECT 
            CONCAT('cust_', ca.id) as log_id,
            c.business_id as business_id,
            ca.user_id,
            COALESCE(u.name, 'System') as user_name,
            ca.activity as activity_type,
            ca.details,
            'customer' as reference_type,
            ca.customer_id as reference_id,
            CONCAT('/customers/', ca.customer_id) as reference_link,
            NULL as ip_address,
            ca.created_at
          FROM customer_activity ca
          JOIN customers c ON ca.customer_id = c.id
          LEFT JOIN users u ON ca.user_id = u.id
          WHERE ${where}
        `;
      } else if (table === 'pa') {
        let where = '(p.business_id = ? OR (p.business_id IS NULL AND u.business_id = ?))';
        p.push(businessId, businessId);
        if (dateStart) { where += ' AND pa.created_at >= ?'; p.push(dateStart); }
        if (dateEnd) { where += ' AND pa.created_at <= ?'; p.push(dateEnd); }
        if (user_id && user_id !== 'all') { where += ' AND pa.user_id = ?'; p.push(Number(user_id)); }
        sql = `
          SELECT 
            CONCAT('prod_', pa.id) as log_id,
            COALESCE(p.business_id, u.business_id) as business_id,
            pa.user_id,
            COALESCE(u.name, 'System') as user_name,
            pa.activity as activity_type,
            pa.details,
            'product' as reference_type,
            COALESCE(p.id, pa.sku_id) as reference_id,
            CONCAT('/products/', COALESCE(p.id, pa.sku_id)) as reference_link,
            NULL as ip_address,
            pa.created_at
          FROM product_activity pa
          LEFT JOIN product_skus ps ON pa.sku_id = ps.id
          LEFT JOIN products p ON ps.product_id = p.id
          LEFT JOIN users u ON pa.user_id = u.id
          WHERE ${where}
        `;
      } else if (table === 'da') {
        let where = 'd.business_id = ?';
        p.push(businessId);
        if (dateStart) { where += ' AND da.created_at >= ?'; p.push(dateStart); }
        if (dateEnd) { where += ' AND da.created_at <= ?'; p.push(dateEnd); }
        if (user_id && user_id !== 'all') { where += ' AND da.user_id = ?'; p.push(Number(user_id)); }
        sql = `
          SELECT 
            CONCAT('dev_', da.id) as log_id,
            d.business_id as business_id,
            da.user_id,
            COALESCE(u.name, 'System') as user_name,
            da.activity as activity_type,
            da.details,
            'device' as reference_type,
            d.id as reference_id,
            CONCAT('/devices/', d.id) as reference_link,
            NULL as ip_address,
            da.created_at
          FROM device_activity da
          JOIN devices d ON da.device_id = d.id
          LEFT JOIN users u ON da.user_id = u.id
          WHERE ${where}
        `;
      }
      return { sql, params: p };
    };

    const qAL = buildSubquery('al');
    const qIA = buildSubquery('ia');
    const qCA = buildSubquery('ca');
    const qPA = buildSubquery('pa');
    const qDA = buildSubquery('da');

    const unifiedSql = `
      ${qAL.sql}
      UNION ALL
      ${qIA.sql}
      UNION ALL
      ${qCA.sql}
      UNION ALL
      ${qPA.sql}
      UNION ALL
      ${qDA.sql}
    `;
    const subParams = [...qAL.params, ...qIA.params, ...qCA.params, ...qPA.params, ...qDA.params];

    let filterClauses: string[] = [];
    let filterParams: any[] = [];

    if (activity_type && activity_type !== 'all') {
      filterClauses.push('feed.activity_type = ?');
      filterParams.push(activity_type);
    }

    if (search) {
      filterClauses.push('(feed.details LIKE ? OR feed.activity_type LIKE ? OR feed.user_name LIKE ?)');
      filterParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

    // Total Count
    const countSql = `
      SELECT COUNT(*) as total FROM (${unifiedSql}) feed ${whereSql}
    `;
    const countResult = await queryOne(countSql, [...subParams, ...filterParams]) as any;
    const total = countResult?.total || 0;

    // Paginated Rows
    const dataSql = `
      SELECT feed.* FROM (${unifiedSql}) feed 
      ${whereSql}
      ORDER BY feed.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const logs = await query(dataSql, [...subParams, ...filterParams, limitNum, offset]);

    res.json({
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      users,
      activityTypes
    });
  } catch (e: any) {
    next(e);
  }
});

export default router;

