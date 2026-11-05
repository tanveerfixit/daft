import { Router } from 'express';
import { pool, query, queryOne, execute, getBranchPrefix } from '../mysql.js';
import { z } from 'zod';

const router = Router();

const addInventorySchema = z.object({
  sku_id: z.number().or(z.string().transform(Number)),
  branch_id: z.number().or(z.string().transform(Number)).optional(),
  quantity: z.number().or(z.string().transform(Number)).optional(),
  cost_price: z.number().or(z.string().transform(Number)).optional(),
  selling_price: z.number().or(z.string().transform(Number)).optional(),
  supplier_id: z.number().or(z.string().transform(Number)),
  po_number: z.string().optional(),
  items: z.array(z.object({
    imei: z.string().optional(),
    color: z.string().optional(),
    gb: z.string().optional(),
    condition: z.string().optional()
  })).optional()
});

// POST /api/inventory/add
router.post('/add', async (req: any, res, next) => {
  const data = addInventorySchema.parse(req.body);
  const { sku_id, branch_id, quantity, cost_price, selling_price, supplier_id, po_number, items } = data;
  if (!supplier_id) {
    return res.status(400).json({ error: 'Supplier is required when adding inventory.' });
  }
  const activeBranchId = branch_id || req.user.branch_id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [piRows] = await conn.execute(`
      SELECT p.id as product_id, p.name as product_name, p.product_type
      FROM product_skus s JOIN products p ON s.product_id=p.id WHERE s.id=? AND p.business_id=?
    `, [sku_id, req.user.business_id]);
    const productInfo = (piRows as any[])[0];
    if (!productInfo) throw new Error('Product not found or access denied');

    let finalPoNumber = po_number?.trim();
    if (!finalPoNumber) {
      const [lastPo] = await conn.execute('SELECT id FROM purchase_orders WHERE business_id=? ORDER BY id DESC LIMIT 1', [req.user.business_id]);
      const nextSerial = String(((lastPo as any[])[0]?.id || 0) + 1).padStart(2, '0');
      finalPoNumber = `PO${nextSerial}`;
    }
    const [existPo] = await conn.execute('SELECT id FROM purchase_orders WHERE po_number=? AND business_id=?', [finalPoNumber, req.user.business_id]);
    const validItems = (items || []).filter((it: any) => it.imei && it.imei.trim().length > 0);
    const actualQuantity = productInfo.product_type === 'serialized' ? validItems.length : (quantity || 0);
    const totalAmount = (cost_price || 0) * actualQuantity;
    let poId: number;
    if ((existPo as any[]).length === 0) {
      const [pr] = await conn.execute(
        "INSERT INTO purchase_orders (business_id,branch_id,supplier_id,po_number,status,total,expected_at) VALUES (?,?,?,?,'received',?,NOW())",
        [req.user.business_id, activeBranchId, supplier_id || null, finalPoNumber, totalAmount]
      );
      poId = (pr as any).insertId;
    } else {
      poId = (existPo as any[])[0].id;
      await conn.execute('UPDATE purchase_orders SET total=total+?, supplier_id=COALESCE(?, supplier_id) WHERE id=?', 
        [totalAmount, supplier_id || null, poId]);
    }
    await conn.execute(
      'INSERT INTO purchase_order_items (po_id,product_id,description,ordered_qty,received_qty,unit_cost,total) VALUES (?,?,?,?,?,?,?)',
      [poId, productInfo.product_id, productInfo.product_name,
       actualQuantity, actualQuantity, cost_price || 0, totalAmount]
    );

    const insertedDevices: Array<{ id: number; imei: string; color: string; gb: string; condition: string; cost_price: number; selling_price: number }> = [];

    if (productInfo.product_type === 'serialized') {
      // 1. Check in-batch duplicate IMEIs (double scan prevention)
      const imeiList = validItems.map((it: any) => it.imei.trim());
      const lowerImeis = imeiList.map(s => s.toLowerCase());
      const duplicateInBatch = lowerImeis.find((s, idx) => lowerImeis.indexOf(s) !== idx);
      if (duplicateInBatch) {
        await conn.rollback();
        return res.status(400).json({ error: `Double-scan detected: Duplicate IMEI "${duplicateInBatch}" in current batch.` });
      }

      // 2. Check existing database inventory for all IMEIs
      for (const item of validItems) {
        const cleanImei = item.imei.trim();
        const [existing] = await conn.execute(
          'SELECT id, imei, status FROM devices WHERE (imei = ? OR imei_serial = ?) AND business_id = ? LIMIT 1',
          [cleanImei, cleanImei, req.user.business_id]
        );
        if ((existing as any[]).length > 0) {
          const dev = (existing as any[])[0];
          await conn.rollback();
          return res.status(400).json({ error: `IMEI "${cleanImei}" already exists in inventory (Status: ${dev.status}).` });
        }
      }

      for (const item of validItems) {
        const cleanImei = item.imei.trim();
        // Auto-extract GB from product name if not explicitly provided
        let itemGb = item.gb || null;
        if (!itemGb && productInfo.product_name) {
          const gbMatch = productInfo.product_name.match(/\b(\d+\s*(?:GB|TB))\b/i);
          if (gbMatch) itemGb = gbMatch[1].replace(/\s+/g, '').toUpperCase();
        }
        const itemCondition = item.condition || 'New';
        const itemColor = item.color || null;

        await conn.execute(
          "INSERT INTO devices (business_id,branch_id,user_id,sku_id,imei,cost_price,selling_price,color,gb,`condition`,po_number,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'in_stock')",
          [req.user.business_id, activeBranchId, req.userId, sku_id, cleanImei, cost_price, selling_price, itemColor, itemGb, itemCondition, finalPoNumber]
        );
        const deviceIdRow = (await conn.execute('SELECT LAST_INSERT_ID() as id'))[0] as any;
        const insertedDevId = deviceIdRow[0]?.id || deviceIdRow?.insertId;

        insertedDevices.push({
          id: insertedDevId,
          imei: cleanImei,
          color: itemColor || '',
          gb: itemGb || '',
          condition: itemCondition,
          cost_price: Number(cost_price) || 0,
          selling_price: Number(selling_price) || 0
        });

        const imeiLogDesc = `IMEI: ${cleanImei}${itemGb ? ` (${itemGb})` : ''} added to inventory via PO: ${finalPoNumber}`;
        await conn.execute(
          'INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
          [insertedDevId, req.userId, 'Device Created', imeiLogDesc]
        );
        await conn.execute(
          'INSERT INTO product_activity (sku_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
          [sku_id, req.userId, 'Device Created', `Device with IMEI ${cleanImei} added to inventory`]
        );
        await conn.execute(
          'INSERT INTO activity_logs (business_id, branch_id, device_id, product_id, user_id, user_name, activity_type, description, reference_type, reference_id, reference_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [req.user.business_id, activeBranchId, insertedDevId, productInfo.product_id, req.userId, req.user?.name || 'System', 'Device Created', `IMEI: ${cleanImei} (${productInfo.product_name}) added to inventory`, 'device', insertedDevId, `/devices/${insertedDevId}`]
        );
        await conn.execute(
          'INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,1) ON DUPLICATE KEY UPDATE quantity=quantity+1',
          [activeBranchId, sku_id]
        );
      }
    } else {
      await conn.execute(
        'INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)',
        [activeBranchId, sku_id, quantity]
      );
    }
    await conn.execute(
      "INSERT INTO inventory_movements (business_id,branch_id,sku_id,movement_type,quantity,unit_cost,reference_type,reference_id) VALUES (?,?,?,?,?,?,?,?)",
      [req.user.business_id, activeBranchId, sku_id, 'purchase', quantity || items?.length || 0, cost_price || 0, 'purchase_order', poId]
    );
    await conn.commit();
    res.json({ success: true, devices: typeof insertedDevices !== 'undefined' ? insertedDevices : [] });
  } catch (e: any) { await conn.rollback(); console.error('[inventory/add] Error:', e.message, e.sql || ''); next(e); }
  finally { conn.release(); }
});

const batchAddDevicesSchema = z.object({
  branch_id: z.number().or(z.string().transform(Number)).optional(),
  supplier_id: z.number().or(z.string().transform(Number)),
  po_number: z.string().optional(),
  items: z.array(z.object({
    sku_id: z.number().or(z.string().transform(Number)),
    imei: z.string().min(1, 'IMEI/Serial is required'),
    cost_price: z.number().or(z.string().transform(Number)).optional(),
    selling_price: z.number().or(z.string().transform(Number)).optional(),
    color: z.string().optional(),
    gb: z.string().optional(),
    condition: z.string().optional()
  })).min(1, 'At least one device is required')
});

// POST /api/inventory/batch-add-devices
router.post('/batch-add-devices', async (req: any, res, next) => {
  const data = batchAddDevicesSchema.parse(req.body);
  const { branch_id, supplier_id, po_number, items } = data;
  if (!supplier_id) {
    return res.status(400).json({ error: 'Supplier is required when adding batch inventory.' });
  }
  const activeBranchId = branch_id || req.user.branch_id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Fetch products info for all sku_ids
    const skuIds = [...new Set(items.map(i => i.sku_id))];
    const [skuRows] = await conn.query(`
      SELECT s.id as sku_id, s.sku_code, s.barcode, p.id as product_id, p.name as product_name, p.product_type
      FROM product_skus s JOIN products p ON s.product_id=p.id 
      WHERE s.id IN (?) AND p.business_id=?
    `, [skuIds, req.user.business_id]);
    
    const skuMap = new Map((skuRows as any[]).map(r => [r.sku_id, r]));

    // 2. Validate in-batch duplicate IMEIs
    const imeiList = items.map(it => it.imei.trim());
    const lowerImeis = imeiList.map(s => s.toLowerCase());
    const duplicateInBatch = lowerImeis.find((s, idx) => lowerImeis.indexOf(s) !== idx);
    if (duplicateInBatch) {
      await conn.rollback();
      return res.status(400).json({ error: `Double-scan detected: Duplicate IMEI "${duplicateInBatch}" in current batch.` });
    }

    // 3. Validate database duplicate IMEIs
    for (const item of items) {
      const cleanImei = item.imei.trim();
      const [existing] = await conn.execute(
        'SELECT id, imei, status FROM devices WHERE (imei = ? OR imei_serial = ?) AND business_id = ? LIMIT 1',
        [cleanImei, cleanImei, req.user.business_id]
      );
      if ((existing as any[]).length > 0) {
        const dev = (existing as any[])[0];
        await conn.rollback();
        return res.status(400).json({ error: `IMEI "${cleanImei}" already exists in inventory (Status: ${dev.status}).` });
      }
    }

    // 4. Generate or find Purchase Order
    let finalPoNumber = po_number?.trim();
    if (!finalPoNumber) {
      const [lastPo] = await conn.execute('SELECT id FROM purchase_orders WHERE business_id=? ORDER BY id DESC LIMIT 1', [req.user.business_id]);
      const nextSerial = String(((lastPo as any[])[0]?.id || 0) + 1).padStart(2, '0');
      finalPoNumber = `PO${nextSerial}`;
    }

    const totalBatchCost = items.reduce((sum, it) => sum + (Number(it.cost_price) || 0), 0);

    const [existPo] = await conn.execute('SELECT id FROM purchase_orders WHERE po_number=? AND business_id=?', [finalPoNumber, req.user.business_id]);
    let poId: number;
    if ((existPo as any[]).length === 0) {
      const [pr] = await conn.execute(
        "INSERT INTO purchase_orders (business_id,branch_id,supplier_id,po_number,status,total,expected_at) VALUES (?,?,?,?,'received',?,NOW())",
        [req.user.business_id, activeBranchId, supplier_id || null, finalPoNumber, totalBatchCost]
      );
      poId = (pr as any).insertId;
    } else {
      poId = (existPo as any[])[0].id;
      await conn.execute('UPDATE purchase_orders SET total=total+?, supplier_id=COALESCE(?, supplier_id) WHERE id=?', 
        [totalBatchCost, supplier_id || null, poId]);
    }

    // 5. Group by product for PO items
    const productGroups = new Map<number, { count: number; cost: number; name: string }>();
    for (const item of items) {
      const skuInfo = skuMap.get(item.sku_id);
      if (!skuInfo) throw new Error(`SKU ID ${item.sku_id} not found`);
      const existingGrp = productGroups.get(skuInfo.product_id) || { count: 0, cost: 0, name: skuInfo.product_name };
      existingGrp.count += 1;
      existingGrp.cost += (Number(item.cost_price) || 0);
      productGroups.set(skuInfo.product_id, existingGrp);
    }

    for (const [prodId, grp] of productGroups.entries()) {
      const avgCost = grp.count > 0 ? grp.cost / grp.count : 0;
      await conn.execute(
        'INSERT INTO purchase_order_items (po_id,product_id,description,ordered_qty,received_qty,unit_cost,total) VALUES (?,?,?,?,?,?,?)',
        [poId, prodId, grp.name, grp.count, grp.count, avgCost, grp.cost]
      );
    }

    // 6. Insert devices
    const insertedDevices: any[] = [];
    for (const item of items) {
      const skuInfo = skuMap.get(item.sku_id)!;
      const cleanImei = item.imei.trim();
      const itemCost = Number(item.cost_price) || 0;
      const itemSelling = Number(item.selling_price) || 0;

      const [devResult] = await conn.execute(
        "INSERT INTO devices (business_id,branch_id,user_id,sku_id,imei,cost_price,selling_price,color,gb,`condition`,po_number,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'in_stock')",
        [req.user.business_id, activeBranchId, req.userId, item.sku_id, cleanImei, itemCost, itemSelling, item.color || null, item.gb || null, item.condition || 'New', finalPoNumber]
      );
      const insertedDevId = (devResult as any).insertId;

      insertedDevices.push({
        id: insertedDevId,
        sku_id: item.sku_id,
        product_name: skuInfo.product_name,
        sku_code: skuInfo.sku_code,
        barcode: skuInfo.barcode || skuInfo.sku_code,
        imei: cleanImei,
        color: item.color || '',
        gb: item.gb || '',
        condition: item.condition || 'New',
        cost_price: itemCost,
        selling_price: itemSelling
      });

      const imeiLogDesc = `IMEI: ${cleanImei} (${skuInfo.product_name} ${item.gb || ''} ${item.color || ''} ${item.condition || ''}) added via Batch PO: ${finalPoNumber}`;
      await conn.execute(
        'INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
        [insertedDevId, req.userId, 'Device Created', imeiLogDesc]
      );
      await conn.execute(
        'INSERT INTO product_activity (sku_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
        [item.sku_id, req.userId, 'Device Created', `Device with IMEI ${cleanImei} added to inventory`]
      );
      await conn.execute(
        'INSERT INTO activity_logs (business_id, branch_id, device_id, product_id, user_id, user_name, activity_type, description, reference_type, reference_id, reference_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.business_id, activeBranchId, insertedDevId, skuInfo.product_id, req.userId, req.user?.name || 'System', 'Device Created', `IMEI: ${cleanImei} (${skuInfo.product_name}) added to inventory`, 'device', insertedDevId, `/devices/${insertedDevId}`]
      );
      await conn.execute(
        'INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,1) ON DUPLICATE KEY UPDATE quantity=quantity+1',
        [activeBranchId, item.sku_id]
      );
      await conn.execute(
        "INSERT INTO inventory_movements (business_id,branch_id,sku_id,device_id,movement_type,quantity,unit_cost,reference_type,reference_id) VALUES (?,?,?,?,?,?,?,?,?)",
        [req.user.business_id, activeBranchId, item.sku_id, insertedDevId, 'purchase', 1, itemCost, 'purchase_order', poId]
      );
    }

    await conn.commit();
    res.json({ success: true, po_number: finalPoNumber, devices: insertedDevices });
  } catch (e: any) {
    await conn.rollback();
    console.error('[inventory/batch-add-devices] Error:', e.message);
    next(e);
  } finally {
    conn.release();
  }
});

// GET /api/purchase-orders
router.get('/purchase-orders', async (req: any, res, next) => {
  try {
    const isSuper = req.user.role === 'superadmin';
    const sql = `
      SELECT po.*, s.name as supplier_name FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id=s.id
      WHERE po.business_id=? ${!isSuper ? 'AND po.branch_id=?' : ''}
      ORDER BY po.created_at DESC
    `;
    const params = !isSuper ? [req.user.business_id, req.user.branch_id] : [req.user.business_id];
    res.json(await query(sql, params));
  } catch (e: any) { next(e); }
});

router.get('/purchase-orders/by-number/:number', async (req: any, res, next) => {
  try {
    const po = await queryOne('SELECT id FROM purchase_orders WHERE po_number=? AND business_id=?', [req.params.number, (req as any).user.business_id]);
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    res.json(po);
  } catch (e: any) { next(e); }
});

router.get('/purchase-orders/:id', async (req: any, res, next) => {
  try {
    const po = await queryOne(`
      SELECT po.*, s.name as supplier_name, s.email as supplier_email FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id=s.id
      WHERE po.id=? AND po.business_id=?
    `, [req.params.id, (req as any).user.business_id]);
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    const items = await query('SELECT * FROM purchase_order_items WHERE po_id=?', [req.params.id]);
    res.json({ ...po, items });
  } catch (e: any) { next(e); }
});

// GET /api/devices/check-imei (Check if IMEI already exists in database inventory)
router.get('/devices/check-imei', async (req: any, res, next) => {
  const { imei } = req.query;
  if (!imei || String(imei).trim() === '') {
    return res.json({ exists: false });
  }
  try {
    const cleanImei = String(imei).trim();
    const branchId = req.query.branch_id ? Number(req.query.branch_id) : req.user.branch_id;
    const params: any[] = [cleanImei, cleanImei, req.user.business_id];
    let branchClause = '';
    if (branchId) {
      branchClause = ' AND d.branch_id = ?';
      params.push(branchId);
    }

    const device = await queryOne(`
      SELECT d.id, d.imei, d.imei_serial, d.status, d.branch_id, d.user_id, d.condition, d.gb, d.color,
             COALESCE(p.name, 'Standard Mobile Device') as product_name, s.sku_code, b.name as branch_name, u.name as user_name
      FROM devices d
      LEFT JOIN product_skus s ON d.sku_id = s.id
      LEFT JOIN products p ON (d.product_id = p.id OR s.product_id = p.id)
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE (d.imei = ? OR d.imei_serial = ?) AND d.business_id = ?${branchClause}
      LIMIT 1
    `, params);

    if (device) {
      return res.json({ exists: true, device });
    }
    return res.json({ exists: false });
  } catch (e: any) {
    console.error('[CheckIMEI] Error:', e.message);
    next(e);
  }
});

// GET /api/devices/stats (Summary count of serialized devices)
router.get('/devices/stats', async (req: any, res, next) => {
  try {
    const businessId = req.user.business_id;
    const branchId = req.query.branch_id ? Number(req.query.branch_id) : req.user.branch_id;
    const params: any[] = [businessId];
    let branchClause = '';
    if (branchId) {
      branchClause = ' AND branch_id = ?';
      params.push(branchId);
    }
    const rows = await query(`
      SELECT 
        COUNT(*) as total_devices,
        SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as in_stock_devices
      FROM devices
      WHERE business_id = ?${branchClause}
    `, params);
    res.json(rows[0] || { total_devices: 0, in_stock_devices: 0 });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/devices/sample-csv (Download Standard Serial CSV Template)
router.get('/devices/sample-csv', async (req: any, res) => {
  const sampleContent = `"Serial Number / IMEI","Product Name","Category","Brand / Manufacturer","Storage","Color","Condition","Cost Price","Selling Price","Stock Status","IMEI Status","Carrier / Lock","Created Date"\n` +
    `"R5GL3253R8Y","Galaxy Tab A11+ X230 WI-FI","Tablets","Samsung","128GB","Silver","New",150.00,219.00,"in_stock","Clean","Unlocked","2026-08-07 10:11:45"\n` +
    `"R5GL3253Q8B","Galaxy Tab A11+ X230 WI-FI","Tablets","Samsung","128GB","Graphite","New",150.00,219.00,"in_stock","Clean","Unlocked","2026-08-07 10:13:18"\n` +
    `"353014119037244","iPhone 12 mini","Mobile Phones","Apple","128GB","Black","Grade A",160.00,245.00,"in_stock","Clean","Unlocked","2026-07-25 09:50:02"\n` +
    `"351500437920378","iPhone 13","Mobile Phones","Apple","128GB","Midnight","Grade A",220.00,330.00,"in_stock","Clean","Unlocked","2026-08-05 16:04:32"`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="standard_serial_products.csv"');
  res.send(sampleContent);
});

// GET /api/devices/export-csv (Export Live Standard Serial Products CSV)
router.get('/devices/export-csv', async (req: any, res, next) => {
  try {
    const businessId = req.user.business_id;
    const branchId = req.query.branch_id ? Number(req.query.branch_id) : req.user.branch_id;
    const status = req.query.status || 'all';

    let sql = `
      SELECT 
        COALESCE(d.imei_serial, d.imei, '') as serial_number,
        COALESCE(p.name, 'Standard Mobile Device') as product_name,
        COALESCE(c.name, 'Mobile Devices') as category_name,
        COALESCE(m.name, '') as manufacturer_name,
        COALESCE(d.gb, '') as storage,
        COALESCE(d.color, '') as color,
        COALESCE(d.\`condition\`, 'New') as physical_condition,
        COALESCE(d.cost_price, 0) as cost_price,
        COALESCE(d.selling_price, s.selling_price, 0) as selling_price,
        COALESCE(d.status, 'in_stock') as status,
        COALESCE(d.imei_status, 'Clean') as imei_status,
        COALESCE(d.carrier, 'Unlocked') as carrier,
        DATE_FORMAT(COALESCE(d.created_at, d.date_added, NOW()), '%Y-%m-%d %H:%i:%s') as created_date
      FROM devices d
      LEFT JOIN product_skus s ON d.sku_id = s.id
      LEFT JOIN products p ON (d.product_id = p.id OR s.product_id = p.id)
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE d.business_id = ?
    `;

    const params: any[] = [businessId];
    if (branchId) {
      sql += ' AND d.branch_id = ?';
      params.push(branchId);
    }
    if (status !== 'all') {
      sql += ' AND d.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY d.created_at DESC';

    const rows = await query(sql, params);

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).trim();
      return `"${s.replace(/"/g, '""')}"`;
    };

    let csvContent = `"Serial Number / IMEI","Product Name","Category","Brand / Manufacturer","Storage","Color","Condition","Cost Price","Selling Price","Stock Status","IMEI Status","Carrier / Lock","Created Date"\n`;
    for (const row of rows) {
      const line = [
        escapeCsv(row.serial_number),
        escapeCsv(row.product_name || 'Standard Mobile Device'),
        escapeCsv(row.category_name),
        escapeCsv(row.manufacturer_name),
        escapeCsv(row.storage),
        escapeCsv(row.color),
        escapeCsv(row.physical_condition),
        Number(row.cost_price || 0).toFixed(2),
        Number(row.selling_price || 0).toFixed(2),
        escapeCsv(row.status),
        escapeCsv(row.imei_status),
        escapeCsv(row.carrier),
        escapeCsv(row.created_date)
      ].join(',');
      csvContent += line + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="serial_products_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (e: any) {
    console.error('[ExportSerialProducts] Error:', e.message);
    next(e);
  }
});

// POST /api/devices/import-csv (Import Standard Serial Products CSV)
router.post('/devices/import-csv', async (req: any, res, next) => {
  const { items, duplicateHandling = 'overwrite' } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No serial product items provided' });
  }

  const businessId = req.user.business_id;
  const branchId = req.user.branch_id || 1;
  const userId = req.user.id || req.userId || 1;
  const branchPrefix = await getBranchPrefix(branchId);

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  const conn = await pool.getConnection();
  try {
    await conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    await conn.query("SET collation_connection = 'utf8mb4_unicode_ci'");
    await conn.beginTransaction();

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const serialNumber = String(row.serial_number || row.serial || row.imei || '').trim();
      const productName = String(row.product_name || row.product || 'Standard Mobile Device').trim();
      const categoryName = String(row.category_name || row.category || '').trim();
      const manufacturerName = String(row.manufacturer_name || row.manufacturer || row.brand || '').trim();
      const storage = String(row.storage || row.gb || '').trim();
      const color = String(row.color || '').trim();
      const condition = String(row.physical_condition || row.condition || 'New').trim();
      const costPrice = parseFloat(row.cost_price || 0) || 0;
      const sellingPrice = parseFloat(row.selling_price || row.price || 0) || 0;
      const stockStatus = String(row.status || 'in_stock').trim() || 'in_stock';
      const imeiStatus = String(row.imei_status || 'Clean').trim() || 'Clean';
      const carrier = String(row.carrier || row.unlocked || 'Unlocked').trim() || 'Unlocked';
      const createdDate = row.created_date || row.created_at || null;

      if (!serialNumber) {
        errors.push(`Row ${i + 1}: Skipped - Serial number is missing`);
        skipped++;
        continue;
      }

      try {
        // 1. Category Lookup / Creation
        let categoryId: number | null = null;
        if (categoryName) {
          const [cr] = await conn.execute(
            'SELECT id FROM categories WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci LIMIT 1',
            [businessId, categoryName]
          );
          if ((cr as any[]).length > 0) {
            categoryId = (cr as any[])[0].id;
          } else {
            const [ins] = await conn.execute(
              'INSERT INTO categories (business_id, name) VALUES (?, ?)',
              [businessId, categoryName]
            );
            categoryId = (ins as any).insertId;
          }
        }

        // 2. Manufacturer Lookup / Creation
        let manufacturerId: number | null = null;
        if (manufacturerName) {
          const [mr] = await conn.execute(
            'SELECT id FROM manufacturers WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci LIMIT 1',
            [businessId, manufacturerName]
          );
          if ((mr as any[]).length > 0) {
            manufacturerId = (mr as any[])[0].id;
          } else {
            const [ins] = await conn.execute(
              'INSERT INTO manufacturers (business_id, name) VALUES (?, ?)',
              [businessId, manufacturerName]
            );
            manufacturerId = (ins as any).insertId;
          }
        }

        // 3. Find or create Product
        const [prodRows] = await conn.execute(
          'SELECT id FROM products WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci AND deleted_at IS NULL LIMIT 1',
          [businessId, productName]
        );
        let productId: number;
        if ((prodRows as any[]).length > 0) {
          productId = (prodRows as any[])[0].id;
          if (categoryId || manufacturerId) {
            await conn.execute(
              'UPDATE products SET category_id = COALESCE(?, category_id), manufacturer_id = COALESCE(?, manufacturer_id) WHERE id = ?',
              [categoryId, manufacturerId, productId]
            );
          }
        } else {
          const [insProd] = await conn.execute(
            'INSERT INTO products (business_id, category_id, manufacturer_id, name, product_type, allow_overselling) VALUES (?, ?, ?, ?, ?, ?)',
            [businessId, categoryId, manufacturerId, productName, 'serialized', 1]
          );
          productId = (insProd as any).insertId;
        }

        // 4. Find or create default SKU
        const [skuRows] = await conn.execute(
          'SELECT id FROM product_skus WHERE product_id = ? LIMIT 1',
          [productId]
        );
        let skuId: number;
        if ((skuRows as any[]).length > 0) {
          skuId = (skuRows as any[])[0].id;
          if (sellingPrice > 0 || costPrice > 0) {
            await conn.execute(
              'UPDATE product_skus SET selling_price = COALESCE(NULLIF(?, 0), selling_price), cost_price = COALESCE(NULLIF(?, 0), cost_price) WHERE id = ?',
              [sellingPrice, costPrice, skuId]
            );
          }
        } else {
          const skuCode = `${branchPrefix}-${String(productId).padStart(5, '0')}`;
          const [insSku] = await conn.execute(
            'INSERT INTO product_skus (product_id, sku_code, barcode, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)',
            [productId, skuCode, skuCode, costPrice, sellingPrice]
          );
          skuId = (insSku as any).insertId;
        }

        // 5. Check if device already exists in this business
        const [existDevice] = await conn.execute(
          'SELECT id FROM devices WHERE (imei COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci OR imei_serial COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci) AND business_id = ? LIMIT 1',
          [serialNumber, serialNumber, businessId]
        );

        if ((existDevice as any[]).length > 0) {
          const existingId = (existDevice as any[])[0].id;
          if (duplicateHandling === 'overwrite') {
            await conn.execute(`
              UPDATE devices 
              SET business_id = ?, branch_id = ?, user_id = COALESCE(user_id, ?), product_id = ?, sku_id = ?, gb = ?, color = ?, \`condition\` = ?, cost_price = ?, selling_price = ?, status = ?, imei_status = ?, carrier = ?
              WHERE id = ? AND business_id = ?
            `, [businessId, branchId, userId, productId, skuId, storage, color, condition, costPrice, sellingPrice, stockStatus, imeiStatus, carrier, existingId, businessId]);
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Insert new device
          const [insDev] = await conn.execute(`
            INSERT INTO devices 
              (business_id, branch_id, user_id, product_id, sku_id, imei, imei_serial, gb, color, \`condition\`, cost_price, selling_price, status, imei_status, carrier, created_at, date_added)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), COALESCE(?, NOW()))
          `, [businessId, branchId, userId, productId, skuId, serialNumber, serialNumber, storage, color, condition, costPrice, sellingPrice, stockStatus, imeiStatus, carrier, createdDate, createdDate]);

          const deviceId = (insDev as any).insertId;

          // Update branch stock if in_stock
          if (stockStatus === 'in_stock') {
            await conn.execute(
              'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1',
              [branchId, skuId]
            );
          }

          // Add activity log
          await conn.execute(
            'INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
            [deviceId, userId, 'Device Created', 'Imported via Standard CSV']
          );

          imported++;
        }
      } catch (rowErr: any) {
        console.error(`Row ${i + 1} error:`, rowErr.message);
        errors.push(`Row ${i + 1} (${serialNumber}): ${rowErr.message}`);
      }
    }

    await conn.commit();
    res.json({
      success: true,
      total: items.length,
      imported,
      updated,
      skipped,
      errorsCount: errors.length,
      errors: errors.slice(0, 10)
    });
  } catch (err: any) {
    await conn.rollback();
    console.error('[ImportSerialProducts] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to import serial products' });
  } finally {
    conn.release();
  }
});

// GET /api/devices/search  (must be BEFORE /devices/:id to avoid wildcard clash)
router.get('/devices/search', async (req: any, res, next) => {
  const { q, imei, branch_id, status } = req.query;
  const searchVal = q || imei;
  try {
    const branchId = branch_id ? Number(branch_id) : req.user.branch_id;
    let sql = `
      SELECT 
        d.*, 
        COALESCE(p.name, 'Standard Mobile Device') as product_name, 
        COALESCE(c.name, 'Mobile Devices') as category_name,
        COALESCE(m.name, '') as manufacturer_name,
        s.sku_code, 
        s.barcode,
        b.name as branch_name,
        u.name as user_name
      FROM devices d 
      LEFT JOIN product_skus s ON d.sku_id=s.id
      LEFT JOIN products p ON (d.product_id=p.id OR s.product_id=p.id)
      LEFT JOIN categories c ON p.category_id=c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id=m.id
      LEFT JOIN branches b ON d.branch_id=b.id 
      LEFT JOIN users u ON d.user_id=u.id
      WHERE d.business_id=?
    `;
    const params: any[] = [req.user.business_id];

    if (branchId) {
      sql += ' AND d.branch_id=?';
      params.push(branchId);
    }

    if (status && status !== 'all') {
      sql += ' AND d.status=?';
      params.push(status);
    }

    if (searchVal && String(searchVal).trim() !== '') {
      sql += ' AND (d.imei LIKE ? OR p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ? OR d.imei_serial LIKE ?)';
      const term = `%${String(searchVal).trim()}%`;
      params.push(term, term, term, term, term);
    }
    
    sql += ' ORDER BY d.id DESC LIMIT 50';
    res.json(await query(sql, params));
  } catch (e: any) { 
    console.error('[SearchDevices] Error:', e.message);
    next(e); 
  }
});

// GET /api/devices/:id
router.get('/devices/:id', async (req: any, res, next) => {
  try {
    const branchId = req.user.branch_id;
    const params: any[] = [req.params.id, req.user.business_id];
    let branchClause = '';
    if (branchId) {
      branchClause = ' AND d.branch_id=?';
      params.push(branchId);
    }
    const device = await queryOne(`
      SELECT d.*, COALESCE(p.name, 'Standard Mobile Device') as product_name, s.sku_code, s.barcode,
             b.name as branch_name, bz.name as business_name,
             u.name as user_name, u.email as user_email
      FROM devices d
      LEFT JOIN product_skus s ON d.sku_id=s.id
      LEFT JOIN products p ON (d.product_id=p.id OR s.product_id=p.id)
      LEFT JOIN branches b ON d.branch_id=b.id
      LEFT JOIN businesses bz ON d.business_id=bz.id
      LEFT JOIN users u ON d.user_id=u.id
      WHERE d.id=? AND d.business_id=?${branchClause}
    `, params);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (e: any) { next(e); }
});

const updateDeviceSchema = z.object({
  sku_id: z.union([z.number(), z.string()]).nullable().optional().transform(v => (v === null || v === undefined || v === '') ? undefined : Number(v)),
  color: z.string().nullable().optional(),
  gb: z.union([z.string(), z.number()]).nullable().optional().transform(v => (v === null || v === undefined ? v : String(v))),
  ram: z.union([z.string(), z.number()]).nullable().optional().transform(v => (v === null || v === undefined ? v : String(v))),
  condition: z.string().nullable().optional(),
  cost_price: z.union([z.number(), z.string()]).nullable().optional().transform(v => (v === null || v === undefined || v === '') ? null : Number(v)),
  selling_price: z.union([z.number(), z.string()]).nullable().optional().transform(v => (v === null || v === undefined || v === '') ? null : Number(v)),
  unlocked: z.union([z.string(), z.boolean(), z.number()]).nullable().optional().transform(v => (v === null || v === undefined ? v : String(v))),
  imei_status: z.string().nullable().optional(),
  carrier: z.string().nullable().optional()
});

// PUT /api/devices/:id
router.put('/devices/:id', async (req: any, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const data = updateDeviceSchema.parse(req.body);
    const { sku_id, color, gb, ram, condition, cost_price, selling_price, unlocked, imei_status, carrier } = data;

    const branchId = req.user.branch_id;
    const oldParams: any[] = [req.params.id, req.user.business_id];
    let oldBranchClause = '';
    if (branchId) {
      oldBranchClause = ' AND d.branch_id=?';
      oldParams.push(branchId);
    }

    const [oldRows] = await conn.execute(
      `SELECT d.*, COALESCE(p.name, 'Standard Mobile Device') as product_name 
       FROM devices d 
       LEFT JOIN product_skus s ON d.sku_id=s.id 
       LEFT JOIN products p ON (d.product_id=p.id OR s.product_id=p.id) 
       WHERE d.id=? AND d.business_id=?${oldBranchClause}`,
      oldParams
    );
    const old = (oldRows as any[])[0];
    if (!old) {
      await conn.rollback();
      return res.status(404).json({ error: 'Device not found or access denied' });
    }

    let targetSkuId = old.sku_id;
    let oldModelName = old.product_name || '';
    let newModelName = oldModelName;

    const changes: string[] = [];

    // If sku_id is changing to another product model
    if (sku_id !== undefined && Number(sku_id) !== Number(old.sku_id)) {
      const [targetSkuRows] = await conn.execute(
        `SELECT s.id, p.name as product_name, p.product_type 
         FROM product_skus s 
         JOIN products p ON s.product_id=p.id 
         WHERE s.id=? AND p.business_id=?`,
        [sku_id, req.user.business_id]
      );
      const targetSku = (targetSkuRows as any[])[0];
      if (!targetSku) {
        await conn.rollback();
        return res.status(400).json({ error: 'Selected product variant was not found.' });
      }

      targetSkuId = targetSku.id;
      newModelName = targetSku.product_name;

      if (Number(old.sku_id) !== Number(targetSkuId)) {
        changes.push(`Model Changed: ${oldModelName} -> ${newModelName}`);
        if (old.status === 'in_stock') {
          await conn.execute(
            'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, -1) ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity - 1)',
            [old.branch_id || req.user.branch_id || 1, old.sku_id]
          );
          await conn.execute(
            'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1',
            [old.branch_id || req.user.branch_id || 1, targetSkuId]
          );
        }
      }
    }

    const newColor = color !== undefined ? color : old.color;
    const newGb = gb !== undefined ? gb : old.gb;
    const newRam = ram !== undefined ? ram : old.ram;
    const newCondition = condition !== undefined ? condition : old.condition;
    const newCostPrice = cost_price !== undefined ? cost_price : old.cost_price;
    const newSellingPrice = selling_price !== undefined ? selling_price : old.selling_price;
    const newUnlocked = unlocked !== undefined ? unlocked : old.unlocked;
    const newImeiStatus = imei_status !== undefined ? imei_status : old.imei_status;
    const newCarrier = carrier !== undefined ? carrier : old.carrier;

    const updateParams: any[] = [
      targetSkuId,
      newColor, newGb, newRam, newCondition, 
      newCostPrice, newSellingPrice,
      newUnlocked, newImeiStatus, newCarrier,
      req.params.id, req.user.business_id
    ];
    let updateBranchClause = '';
    if (branchId) {
      updateBranchClause = ' AND branch_id=?';
      updateParams.push(branchId);
    }

    await conn.execute(`
      UPDATE devices SET 
        sku_id=?, color=?, gb=?, ram=?, \`condition\`=?, cost_price=?, selling_price=?, 
        unlocked=?, imei_status=?, carrier=?
      WHERE id=? AND business_id=?${updateBranchClause}
    `, updateParams);

    // Log attribute changes
    if (color !== undefined && String(color ?? '') !== String(old.color ?? '')) changes.push(`Color: ${old.color || 'none'} -> ${color}`);
    if (gb !== undefined && String(gb ?? '') !== String(old.gb ?? '')) changes.push(`GB: ${old.gb || 'none'} -> ${gb}`);
    if (ram !== undefined && String(ram ?? '') !== String(old.ram ?? '')) changes.push(`RAM: ${old.ram || 'none'} -> ${ram}`);
    if (condition !== undefined && String(condition ?? '') !== String(old.condition ?? '')) changes.push(`Condition: ${old.condition || 'none'} -> ${condition}`);
    if (cost_price !== undefined && Number(cost_price || 0) !== Number(old.cost_price || 0)) changes.push(`Cost: ${old.cost_price} -> ${cost_price}`);
    if (selling_price !== undefined && Number(selling_price || 0) !== Number(old.selling_price || 0)) changes.push(`Selling: ${old.selling_price} -> ${selling_price}`);
    if (unlocked !== undefined && String(unlocked ?? '') !== String(old.unlocked ?? '')) changes.push(`Unlocked: ${old.unlocked || 'none'} -> ${unlocked}`);
    if (imei_status !== undefined && String(imei_status ?? '') !== String(old.imei_status ?? '')) changes.push(`IMEI Status: ${old.imei_status || 'none'} -> ${imei_status}`);
    if (carrier !== undefined && String(carrier ?? '') !== String(old.carrier ?? '')) changes.push(`Carrier: ${old.carrier || 'none'} -> ${carrier}`);

    const userId = req.user?.id || req.userId || 1;

    if (changes.length > 0) {
      const imeiTag = old.imei || old.imei_serial || 'N/A';
      const changeDesc = `[IMEI: ${imeiTag}] ${changes.join(', ')}`;
      await conn.execute('INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
        [req.params.id, userId, 'Device Updated', changeDesc]);
      await conn.execute('INSERT INTO product_activity (sku_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
        [targetSkuId, userId, 'Device Updated', changeDesc]);
      await conn.execute('INSERT INTO activity_logs (business_id, branch_id, device_id, product_id, user_id, user_name, activity_type, description, reference_type, reference_id, reference_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.business_id, old.branch_id || req.user.branch_id, req.params.id, old.product_id, userId, req.user?.name || 'System', 'Device Updated', changeDesc, 'device', req.params.id, `/devices/${req.params.id}`]);
    }

    await conn.commit();
    res.json({ success: true, sku_id: targetSkuId, product_name: newModelName });
  } catch (e: any) { 
    await conn.rollback();
    console.error('[UpdateDevice] Error:', e);
    next(e); 
  } finally {
    conn.release();
  }
});

// GET /api/devices/:id/activity
router.get('/devices/:id/activity', async (req: any, res, next) => {
  try {
    const branchId = req.user.branch_id;
    const checkParams = [req.params.id, req.user.business_id];
    let branchClause = '';
    if (branchId) {
      branchClause = ' AND branch_id=?';
      checkParams.push(branchId);
    }
    const dev = await queryOne(`SELECT id FROM devices WHERE id=? AND business_id=?${branchClause}`, checkParams);
    if (!dev) return res.status(404).json({ error: 'Device not found or access denied' });

    const activities = await query(`
      SELECT 'device' as source, a.id, a.user_id, a.activity, a.details, a.created_at, COALESCE(u.name, 'System') as user_name 
      FROM device_activity a
      LEFT JOIN users u ON a.user_id=u.id
      WHERE a.device_id=?
      UNION ALL
      SELECT 'product' as source, pa.id, pa.user_id, pa.activity, pa.details, pa.created_at, COALESCE(u.name, 'System') as user_name
      FROM product_activity pa
      LEFT JOIN users u ON pa.user_id=u.id
      WHERE pa.sku_id = (SELECT sku_id FROM devices WHERE id=?)
      UNION ALL
      SELECT 'log' as source, al.id, al.user_id, al.activity_type as activity, al.description as details, al.created_at, COALESCE(al.user_name, u.name, 'System') as user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id=u.id
      WHERE al.device_id=? OR al.product_id = (SELECT sku_id FROM devices WHERE id=?)
      ORDER BY created_at DESC
    `, [req.params.id, req.params.id, req.params.id, req.params.id]);
    res.json(activities);
  } catch (e: any) { next(e); }
});

const deviceActivitySchema = z.object({
  activity: z.string().optional(),
  details: z.string().optional()
});

// POST /api/devices/:id/activity (Add Note)
router.post('/devices/:id/activity', async (req: any, res, next) => {
  const data = deviceActivitySchema.parse(req.body);
  const { activity, details } = data;
  try {
    const branchId = req.user.branch_id;
    const checkParams = [req.params.id, req.user.business_id];
    let branchClause = '';
    if (branchId) {
      branchClause = ' AND branch_id=?';
      checkParams.push(branchId);
    }
    const device = await queryOne(`SELECT id, branch_id, sku_id FROM devices WHERE id=? AND business_id=?${branchClause}`, checkParams) as any;
    if (!device) return res.status(404).json({ error: 'Device not found or access denied' });
    
    await execute('INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
      [req.params.id, req.userId, activity || 'Note Added', details || '']);
    await execute('INSERT INTO activity_logs (business_id, branch_id, device_id, user_id, user_name, activity_type, description, reference_type, reference_id, reference_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.business_id, device.branch_id || req.user.branch_id, req.params.id, req.userId, req.user?.name || 'System', activity || 'Note Added', details || '', 'device', req.params.id, `/devices/${req.params.id}`]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// DELETE /api/devices/:id
router.delete('/devices/:id', async (req: any, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const branchId = req.user.branch_id;
    const delParams = [req.params.id, req.user.business_id];
    let delBranchClause = '';
    if (branchId) {
      delBranchClause = ' AND d.branch_id=?';
      delParams.push(branchId);
    }

    const [oldRows] = await conn.execute(
      `SELECT d.*, COALESCE(p.name, 'Standard Mobile Device') as product_name, p.id as product_id, s.id as sku_id 
       FROM devices d 
       LEFT JOIN product_skus s ON d.sku_id=s.id 
       LEFT JOIN products p ON (d.product_id=p.id OR s.product_id=p.id) 
       WHERE d.id=? AND d.business_id=?${delBranchClause}`,
      delParams
    );
    const dev = (oldRows as any[])[0];
    if (!dev) {
      await conn.rollback();
      return res.status(404).json({ error: 'Device not found or access denied' });
    }

    const cleanImei = dev.imei || dev.imei_serial || 'N/A';
    const deleteMsg = `Device with IMEI/Serial "${cleanImei}" (${dev.product_name}) deleted from inventory (Status was: ${dev.status})`;

    // Log to product_activity
    await conn.execute(
      'INSERT INTO product_activity (sku_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
      [dev.sku_id, req.userId, 'Device Deleted', deleteMsg]
    );

    // Log to activity_logs
    await conn.execute(
      'INSERT INTO activity_logs (business_id, branch_id, device_id, product_id, user_id, user_name, activity_type, description, reference_type, reference_id, reference_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.business_id, dev.branch_id || req.user.branch_id, dev.id, dev.product_id, req.userId, req.user?.name || 'System', 'Device Deleted', deleteMsg, 'product', dev.product_id, `/products/${dev.product_id}`]
    );

    // Decrement stock if in_stock
    if (dev.status === 'in_stock') {
      await conn.execute(
        'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, -1) ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity - 1)',
        [dev.branch_id || req.user.branch_id || 1, dev.sku_id]
      );
    }

    const finalDelParams = [req.params.id, req.user.business_id];
    let finalDelClause = '';
    if (branchId) {
      finalDelClause = ' AND branch_id=?';
      finalDelParams.push(branchId);
    }

    await conn.execute(`DELETE FROM devices WHERE id=? AND business_id=?${finalDelClause}`, finalDelParams);
    await conn.commit();
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// GET /api/devices
router.get('/devices', async (req: any, res, next) => {
  const status = req.query.status || 'all';
  const branchId = req.query.branch_id ? Number(req.query.branch_id) : req.user.branch_id;
  try {
    let filterClause = '';
    const params: any[] = [req.user.business_id];
    
    let statusClause = '';
    if (status && status !== 'all') {
      statusClause = 'AND d.status=?';
      params.push(status);
    }

    if (branchId) {
      filterClause = 'AND d.branch_id=?';
      params.push(branchId);
    }

    const sql = `
      SELECT d.id, d.business_id, d.branch_id, d.user_id, d.sku_id, d.imei, d.imei_serial, d.color, d.gb, d.ram,
             d.\`condition\`, d.po_number, d.status, d.cost_price, d.selling_price, d.created_at,
             COALESCE(p.name, 'Standard Mobile Device') as product_name, s.sku_code, inv.invoice_number,
             b.name as branch_name, u.name as user_name
      FROM devices d
      LEFT JOIN product_skus s ON d.sku_id=s.id
      LEFT JOIN products p ON (d.product_id=p.id OR s.product_id=p.id)
      LEFT JOIN branches b ON d.branch_id=b.id
      LEFT JOIN users u ON d.user_id=u.id
      LEFT JOIN invoice_items ii ON d.id=ii.device_id
      LEFT JOIN invoices inv ON ii.invoice_id=inv.id
      WHERE d.business_id=? ${statusClause} ${filterClause}
      ORDER BY d.created_at DESC
    `;
    res.json(await query(sql, params));
  } catch (e: any) { next(e); }
});

// ─── B2B Destinations ────────────────────────────────────────────────────────
router.get('/transfers/destinations', async (req: any, res, next) => {
  try {
    const sql = `
      SELECT b.id as branch_id, b.name as branch_name, b.business_id,
             bz.name as business_name, bz.city as business_city
      FROM branches b
      JOIN businesses bz ON b.business_id = bz.id
      WHERE b.deleted_at IS NULL AND bz.deleted_at IS NULL
        AND TRIM(COALESCE(b.name, bz.name, '')) != ''
      ORDER BY COALESCE(NULLIF(TRIM(b.name), ''), TRIM(bz.name)) ASC
    `;
    const rows = await query(sql);
    res.json(rows);
  } catch (e: any) { next(e); }
});

const transferItemSchema = z.object({
  device_id: z.number().or(z.string().transform(Number)).optional().nullable(),
  sku_id: z.number().or(z.string().transform(Number)).optional().nullable(),
  product_name: z.string().optional().nullable(),
  sku_code: z.string().optional().nullable(),
  imei: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  quantity: z.number().or(z.string().transform(Number)).optional().default(1),
  cost_price: z.number().or(z.string().transform(Number)).optional().nullable(),
  selling_price: z.number().or(z.string().transform(Number)).optional().nullable(),
  color: z.string().optional().nullable(),
  gb: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

const transferSchema = transferItemSchema.extend({
  to_branch_id: z.number().or(z.string().transform(Number)),
  items: z.array(transferItemSchema).optional()
});

// GET /api/transfers/search-items — Unified search for in-stock IMEI devices AND standard stock SKUs
router.get('/transfers/search-items', async (req: any, res, next) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 1) return res.json([]);

  try {
    const businessId = req.user.business_id;
    const branchId = req.user.branch_id;
    const term = `%${q}%`;

    // 1. Search available serialized IMEI devices in current branch
    const deviceParams: any[] = [businessId];
    let branchFilter = '';
    if (branchId) {
      branchFilter = ' AND d.branch_id = ?';
      deviceParams.push(branchId);
    }
    deviceParams.push(term, term, term, term, term);

    const devicesSql = `
      SELECT 
        d.id,
        d.id as device_id,
        d.sku_id,
        d.imei,
        d.imei_serial,
        d.color,
        d.gb,
        d.\`condition\`,
        d.status,
        COALESCE(d.cost_price, s.cost_price, 0) as cost_price,
        COALESCE(d.selling_price, s.selling_price, 0) as selling_price,
        COALESCE(p.name, 'Standard Mobile Device') as product_name,
        s.sku_code,
        s.barcode,
        'device' as item_type,
        1 as stock_quantity
      FROM devices d
      LEFT JOIN product_skus s ON d.sku_id = s.id
      LEFT JOIN products p ON (d.product_id = p.id OR s.product_id = p.id)
      WHERE d.business_id = ?
        AND d.status IN ('in_stock', 'available')
        ${branchFilter}
        AND (d.imei LIKE ? OR d.imei_serial LIKE ? OR p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ?)
      ORDER BY d.id DESC
      LIMIT 35
    `;

    // 2. Search non-serialized stock products/SKUs in current business with current branch stock
    const stockParams: any[] = [branchId || 0, businessId, term, term, term];
    const stockSql = `
      SELECT 
        NULL as id,
        NULL as device_id,
        s.id as sku_id,
        p.id as product_id,
        NULL as imei,
        NULL as imei_serial,
        NULL as color,
        NULL as gb,
        NULL as \`condition\`,
        'in_stock' as status,
        COALESCE(s.cost_price, 0) as cost_price,
        COALESCE(s.selling_price, p.base_unit_price, 0) as selling_price,
        p.name as product_name,
        s.sku_code,
        s.barcode,
        p.product_type,
        'stock' as item_type,
        COALESCE(bs.quantity, 0) as stock_quantity
      FROM product_skus s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN branch_stock bs ON (bs.sku_id = s.id AND bs.branch_id = ?)
      WHERE p.business_id = ?
        AND p.deleted_at IS NULL
        AND COALESCE(p.product_type, 'stock') != 'serialized'
        AND (p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ?)
      ORDER BY COALESCE(bs.quantity, 0) DESC, p.name ASC
      LIMIT 25
    `;

    const [deviceRows, stockRows] = await Promise.all([
      query(devicesSql, deviceParams),
      query(stockSql, stockParams)
    ]);

    res.json([...deviceRows, ...stockRows]);
  } catch (e: any) {
    console.error('[GET /api/transfers/search-items] Error:', e.message);
    next(e);
  }
});

// POST /api/transfers/resolve-bulk — Resolve bulk pasted IMEIs, Serials, or SKU codes
router.post('/transfers/resolve-bulk', async (req: any, res, next) => {
  try {
    const rawCodes: string[] = Array.isArray(req.body?.codes) ? req.body.codes : [];
    const codes = Array.from(new Set(rawCodes.map(c => String(c || '').trim()).filter(Boolean)));
    if (codes.length === 0) {
      return res.json({ matched: [], notFound: [] });
    }

    const businessId = req.user.business_id;
    const branchId = req.user.branch_id;
    const matched: any[] = [];
    const notFound: string[] = [];

    for (const code of codes) {
      // 1. Check serialized device by exact IMEI or Serial in current branch
      const devParams: any[] = [businessId, code, code];
      let branchClause = '';
      if (branchId) {
        branchClause = ' AND d.branch_id = ?';
        devParams.push(branchId);
      }
      const dev = await queryOne(
        `SELECT d.id, d.id as device_id, d.sku_id, d.imei, d.imei_serial, d.color, d.gb, d.\`condition\`, d.status,
                COALESCE(d.cost_price, s.cost_price, 0) as cost_price,
                COALESCE(d.selling_price, s.selling_price, 0) as selling_price,
                COALESCE(p.name, 'Standard Mobile Device') as product_name,
                s.sku_code, s.barcode
         FROM devices d
         LEFT JOIN product_skus s ON d.sku_id = s.id
         LEFT JOIN products p ON (d.product_id = p.id OR s.product_id = p.id)
         WHERE d.business_id = ? AND (d.imei = ? OR d.imei_serial = ?)${branchClause}
         ORDER BY FIELD(d.status, 'in_stock', 'available') DESC, d.id DESC
         LIMIT 1`,
        devParams
      );

      if (dev) {
        if (dev.status === 'in_stock' || dev.status === 'available') {
          matched.push({ ...dev, item_type: 'device', stock_quantity: 1, quantity: 1 });
        } else {
          notFound.push(`${code} (Status: ${dev.status})`);
        }
        continue;
      }

      // 2. Check non-serialized stock SKU by exact sku_code or barcode
      const sku = await queryOne(
        `SELECT NULL as id, NULL as device_id, s.id as sku_id, p.id as product_id,
                COALESCE(s.cost_price, 0) as cost_price,
                COALESCE(s.selling_price, p.base_unit_price, 0) as selling_price,
                p.name as product_name, s.sku_code, s.barcode, p.product_type,
                COALESCE(bs.quantity, 0) as stock_quantity
         FROM product_skus s
         JOIN products p ON s.product_id = p.id
         LEFT JOIN branch_stock bs ON (bs.sku_id = s.id AND bs.branch_id = ?)
         WHERE p.business_id = ? AND p.deleted_at IS NULL
           AND COALESCE(p.product_type, 'stock') != 'serialized'
           AND (s.sku_code = ? OR s.barcode = ?)
         LIMIT 1`,
        [branchId || 0, businessId, code, code]
      );

      if (sku) {
        matched.push({ ...sku, item_type: 'stock', quantity: 1 });
      } else {
        notFound.push(code);
      }
    }

    res.json({ matched, notFound });
  } catch (e: any) {
    next(e);
  }
});

async function dispatchSingleTransferItem(
  conn: any,
  item: z.infer<typeof transferItemSchema>,
  sourceBusinessId: number,
  sourceBranchId: number,
  toBranchId: number,
  userId: number,
  defaultNotes?: string | null
): Promise<number> {
  const {
    device_id: rawDeviceId,
    sku_id: rawSkuId,
    product_name,
    sku_code,
    imei,
    serial_number,
    quantity: rawQty,
    cost_price,
    selling_price,
    color,
    gb,
    condition,
    notes: itemNotes
  } = item;

  const quantity = Math.max(1, Number(rawQty) || 1);
  const effectiveNotes = itemNotes?.trim() || defaultNotes?.trim() || null;

  let finalSkuId = rawSkuId;
  let finalDeviceId = rawDeviceId;
  let isSerialized = !!(imei?.trim() || serial_number?.trim() || rawDeviceId);
  const cleanImei = imei?.trim() || null;
  const cleanSerial = serial_number?.trim() || null;
  let cleanProductName = product_name?.trim();
  let cleanSkuCode = sku_code?.trim();

  // 1. If device ID is provided, verify and reuse its existing SKU & product directly
  if (finalDeviceId) {
    const [dr] = await conn.execute(
      `SELECT d.*, s.sku_code, p.name as product_name, p.id as product_id 
       FROM devices d 
       JOIN product_skus s ON d.sku_id=s.id 
       JOIN products p ON s.product_id=p.id 
       WHERE d.id=? AND d.business_id=?`,
      [finalDeviceId, sourceBusinessId]
    );
    const dev = (dr as any[])[0];
    if (!dev) throw new Error(`Selected device (#${finalDeviceId}) not found`);
    if (dev.status !== 'in_stock' && dev.status !== 'available') {
      throw new Error(`Device (${dev.imei || dev.id}) is not available (current status: ${dev.status})`);
    }
    finalSkuId = dev.sku_id;
    cleanProductName = cleanProductName || dev.product_name;
    cleanSkuCode = cleanSkuCode || dev.sku_code;
    isSerialized = true;
    await conn.execute("UPDATE devices SET status='transfer' WHERE id=?", [finalDeviceId]);
  } else if (cleanImei) {
    // Check if device with this IMEI already exists in source business
    const [existDev] = await conn.execute(
      `SELECT d.*, s.sku_code, p.name as product_name, p.id as product_id 
       FROM devices d 
       JOIN product_skus s ON d.sku_id=s.id 
       JOIN products p ON s.product_id=p.id 
       WHERE (d.imei=? OR d.imei_serial=?) AND d.business_id=?`,
      [cleanImei, cleanImei, sourceBusinessId]
    );
    if ((existDev as any[]).length > 0) {
      const dev = (existDev as any[])[0];
      if (dev.status !== 'in_stock' && dev.status !== 'available') {
        throw new Error(`Device (${dev.imei}) is not available (current status: ${dev.status})`);
      }
      finalDeviceId = dev.id;
      finalSkuId = dev.sku_id;
      cleanProductName = cleanProductName || dev.product_name;
      cleanSkuCode = cleanSkuCode || dev.sku_code;
      isSerialized = true;
      await conn.execute("UPDATE devices SET status='transfer' WHERE id=?", [finalDeviceId]);
    }
  }

  // 2. If NOT an existing device, ensure product & sku exist in source business
  if (!finalDeviceId && cleanProductName) {
    if (!cleanSkuCode) {
      cleanSkuCode = cleanProductName.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().substring(0, 30);
    }

    let sourceProductId: number | null = null;
    const [prodRows] = await conn.execute(
      'SELECT id, product_type FROM products WHERE business_id=? AND LOWER(TRIM(name))=LOWER(TRIM(?))',
      [sourceBusinessId, cleanProductName]
    );
    if ((prodRows as any[]).length > 0) {
      sourceProductId = (prodRows as any[])[0].id;
      if ((prodRows as any[])[0].product_type === 'serialized' && (cleanImei || cleanSerial)) {
        isSerialized = true;
      }
    } else {
      const [prodIns] = await conn.execute(
        'INSERT INTO products (business_id, name, product_type, allow_overselling) VALUES (?, ?, ?, 1)',
        [sourceBusinessId, cleanProductName, isSerialized ? 'serialized' : 'stock']
      );
      sourceProductId = (prodIns as any).insertId;
    }

    if (!finalSkuId) {
      const [skuRows] = await conn.execute(
        'SELECT id FROM product_skus WHERE product_id=? AND (sku_code=? OR ? IS NULL)',
        [sourceProductId, cleanSkuCode, cleanSkuCode]
      );
      if ((skuRows as any[]).length > 0) {
        finalSkuId = (skuRows as any[])[0].id;
      } else {
        const [skuIns] = await conn.execute(
          'INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) VALUES (?, ?, ?, ?)',
          [sourceProductId, cleanSkuCode, cost_price || 0, selling_price || 0]
        );
        finalSkuId = (skuIns as any).insertId;
      }
    }
  }

  // 3. Handle newly created serialized device if device_id didn't exist
  if (isSerialized) {
    if (!finalDeviceId && finalSkuId) {
      const [newDev] = await conn.execute(
        "INSERT INTO devices (business_id, branch_id, sku_id, imei, imei_serial, color, gb, `condition`, cost_price, selling_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'transfer')",
        [
          sourceBusinessId, sourceBranchId, finalSkuId,
          cleanImei, cleanSerial || cleanImei,
          color || null, gb || null, condition || 'Grade A',
          cost_price || 0, selling_price || 0
        ]
      );
      finalDeviceId = (newDev as any).insertId;
    }

    if (finalSkuId) {
      await conn.execute(
        'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE quantity=GREATEST(0, quantity - 1)',
        [sourceBranchId, finalSkuId]
      );
    }
  } else {
    // Non-serialized item
    if (finalSkuId) {
      await conn.execute(
        'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE quantity=GREATEST(0, quantity - ?)',
        [sourceBranchId, finalSkuId, quantity]
      );
    }
  }

  // 4. Insert into device_transfers (store product_name & sku_code snapshot for reliable completion)
  const [tr] = await conn.execute(
    `INSERT INTO device_transfers 
     (business_id, from_branch_id, to_branch_id, device_id, sku_id, quantity, status, initiated_by, notes, product_name, sku_code) 
     VALUES (?, ?, ?, ?, ?, ?, 'in_transit', ?, ?, ?, ?)`,
    [
      sourceBusinessId,
      sourceBranchId,
      toBranchId,
      finalDeviceId || null,
      finalSkuId || null,
      isSerialized ? 1 : quantity,
      userId,
      effectiveNotes,
      cleanProductName || product_name || null,
      cleanSkuCode || sku_code || null
    ]
  );

  const transferId = (tr as any).insertId;

  // 5. Record inventory movement
  if (finalSkuId) {
    await conn.execute(
      `INSERT INTO inventory_movements 
       (business_id, branch_id, sku_id, movement_type, quantity, unit_cost, reference_type, reference_id) 
       VALUES (?, ?, ?, 'transfer_out', ?, ?, 'device_transfers', ?)`,
      [sourceBusinessId, sourceBranchId, finalSkuId, isSerialized ? 1 : quantity, cost_price || 0, transferId]
    );
  }

  return transferId;
}

// POST /api/transfers (Supports both single item AND bulk items array in one ACID transaction)
router.post('/transfers', async (req: any, res, next) => {
  const data = transferSchema.parse(req.body);
  const { to_branch_id, notes, items } = data;

  const sourceBranchId = req.user.branch_id;
  const sourceBusinessId = req.user.business_id;

  if (!to_branch_id) return res.status(400).json({ error: 'Destination branch is required' });
  if (Number(to_branch_id) === Number(sourceBranchId)) {
    return res.status(400).json({ error: 'Source and destination branches must be different' });
  }

  const transferItems = Array.isArray(items) && items.length > 0 ? items : [data];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verify destination branch exists
    const [destBranchRows] = await conn.execute(
      'SELECT b.id, b.business_id, b.name as branch_name, bz.name as business_name FROM branches b JOIN businesses bz ON b.business_id=bz.id WHERE b.id=?',
      [to_branch_id]
    );
    const destBranch = (destBranchRows as any[])[0];
    if (!destBranch) throw new Error('Destination branch does not exist');

    const createdIds: number[] = [];
    for (const item of transferItems) {
      const id = await dispatchSingleTransferItem(
        conn,
        item,
        sourceBusinessId,
        sourceBranchId,
        Number(to_branch_id),
        req.userId,
        notes
      );
      createdIds.push(id);
    }

    await conn.commit();
    res.json({
      success: true,
      id: createdIds[0],
      ids: createdIds,
      count: createdIds.length
    });
  } catch (e: any) {
    await conn.rollback();
    console.error('[POST /api/transfers] Error:', e.message);
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// GET /api/transfers
router.get('/transfers', async (req: any, res, next) => {
  try {
    const isSuper = req.user.role === 'superadmin' || req.user.role === 'developer';
    const sql = `
      SELECT t.*,
             fb.name as from_branch_name, fb.business_id as from_business_id,
             fbz.name as from_business_name,
             tb.name as to_branch_name, tb.business_id as to_business_id,
             tbz.name as to_business_name,
             d.imei, d.imei_serial, d.color, d.gb, d.\`condition\`, COALESCE(d.cost_price, s.cost_price, 0) as cost_price, COALESCE(d.selling_price, s.selling_price, 0) as selling_price,
             COALESCE(t.product_name, p.name, 'Stock Item') as product_name,
             COALESCE(t.sku_code, s.sku_code, '') as sku_code,
             u.name as initiated_by_name
      FROM device_transfers t
      LEFT JOIN branches fb ON t.from_branch_id=fb.id
      LEFT JOIN businesses fbz ON fb.business_id=fbz.id
      LEFT JOIN branches tb ON t.to_branch_id=tb.id
      LEFT JOIN businesses tbz ON tb.business_id=tbz.id
      LEFT JOIN devices d ON t.device_id=d.id
      LEFT JOIN product_skus s ON COALESCE(d.sku_id, t.sku_id)=s.id
      LEFT JOIN products p ON s.product_id=p.id
      LEFT JOIN users u ON t.initiated_by=u.id
      WHERE (
        ${isSuper ? '1=1' : '(fb.business_id = ? OR tb.business_id = ?)'}
      )
      ORDER BY t.created_at DESC
    `;
    const params = isSuper ? [] : [req.user.business_id, req.user.business_id];
    res.json(await query(sql, params));
  } catch (e: any) {
    if (e.message?.includes('Unknown column')) {
      try {
        const isSuper = req.user.role === 'superadmin' || req.user.role === 'developer';
        const fallbackSql = `
          SELECT t.*,
                 fb.name as from_branch_name, fb.business_id as from_business_id,
                 fbz.name as from_business_name,
                 tb.name as to_branch_name, tb.business_id as to_business_id,
                 tbz.name as to_business_name,
                 d.imei, d.imei_serial, d.color, d.gb, d.\`condition\`, COALESCE(d.cost_price, s.cost_price, 0) as cost_price, COALESCE(d.selling_price, s.selling_price, 0) as selling_price,
                 COALESCE(p.name, 'Stock Item') as product_name,
                 COALESCE(s.sku_code, '') as sku_code,
                 u.name as initiated_by_name
          FROM device_transfers t
          LEFT JOIN branches fb ON t.from_branch_id=fb.id
          LEFT JOIN businesses fbz ON fb.business_id=fbz.id
          LEFT JOIN branches tb ON t.to_branch_id=tb.id
          LEFT JOIN businesses tbz ON tb.business_id=tbz.id
          LEFT JOIN devices d ON t.device_id=d.id
          LEFT JOIN product_skus s ON COALESCE(d.sku_id, t.sku_id)=s.id
          LEFT JOIN products p ON s.product_id=p.id
          LEFT JOIN users u ON t.initiated_by=u.id
          WHERE (
            ${isSuper ? '1=1' : '(fb.business_id = ? OR tb.business_id = ?)'}
          )
          ORDER BY t.created_at DESC
        `;
        const params = isSuper ? [] : [req.user.business_id, req.user.business_id];
        return res.json(await query(fallbackSql, params));
      } catch (err: any) {
        return next(err);
      }
    }
    next(e);
  }
});

// PUT /api/transfers/:id/complete
router.put('/transfers/:id/complete', async (req: any, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [tr] = await conn.execute(
      `SELECT t.*, fb.business_id as from_business_id, tb.business_id as to_business_id,
              d.imei, d.imei_serial, d.color, d.gb, d.\`condition\`, COALESCE(d.cost_price, s.cost_price, 0) as cost_price, COALESCE(d.selling_price, s.selling_price, 0) as selling_price,
              p.name as joined_product_name, s.sku_code as joined_sku_code,
              p.category_id as source_category_id, p.manufacturer_id as source_manufacturer_id,
              p.product_type as source_product_type
       FROM device_transfers t
       JOIN branches fb ON t.from_branch_id=fb.id
       JOIN branches tb ON t.to_branch_id=tb.id
       LEFT JOIN devices d ON t.device_id=d.id
       LEFT JOIN product_skus s ON COALESCE(d.sku_id, t.sku_id)=s.id
       LEFT JOIN products p ON s.product_id=p.id
       WHERE t.id=?`,
      [req.params.id]
    );
    const transfer = (tr as any[])[0];
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status === 'completed') throw new Error('Transfer already completed');
    if (transfer.status === 'cancelled') throw new Error('Cannot complete a cancelled transfer');

    const isSuper = req.user.role === 'superadmin' || req.user.role === 'developer';
    // STRICT ISOLATION: Only the destination receiving business can accept this transfer
    if (!isSuper && Number(transfer.to_business_id) !== Number(req.user.business_id)) {
      return res.status(403).json({ error: 'Access denied: Only the destination business can receive this transfer.' });
    }

    const destBusinessId = transfer.to_business_id;
    const destBranchId = transfer.to_branch_id;
    const isCrossBusiness = Number(transfer.from_business_id) !== Number(destBusinessId);

    // Resolve product name: prefer stored snapshot (t.product_name) > JOIN-resolved > fallback
    const resolvedProductName = transfer.product_name || transfer.joined_product_name || 
      (transfer.device_id ? `Transferred Device #${transfer.device_id}` : 'Transferred Item');
    const resolvedSkuCode = transfer.sku_code || transfer.joined_sku_code ||
      resolvedProductName.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().substring(0, 30);

    let destSkuId = isCrossBusiness ? null : transfer.sku_id;
    let destProductId = null;

    if (isCrossBusiness) {
      // 1. Try to find existing SKU / barcode in destination business
      const [existingSkuRows] = await conn.execute(
        `SELECT s.id as sku_id, s.product_id, p.name as product_name 
         FROM product_skus s 
         JOIN products p ON s.product_id = p.id 
         WHERE p.business_id = ? AND p.deleted_at IS NULL 
           AND (s.sku_code = ? OR s.barcode = ? OR s.sku_code = ? OR s.barcode = ?)
         LIMIT 1`,
        [destBusinessId, resolvedSkuCode, resolvedSkuCode, transfer.sku_code || '', transfer.sku_code || '']
      );
      if ((existingSkuRows as any[]).length > 0) {
        destSkuId = (existingSkuRows as any[])[0].sku_id;
        destProductId = (existingSkuRows as any[])[0].product_id;
      }

      // 2. If not matched by SKU, check if destination business has a product with matching name (case-insensitive & normalized)
      if (!destProductId && resolvedProductName) {
        const cleanTargetName = resolvedProductName.trim().replace(/\s+/g, ' ');
        const [destProdRows] = await conn.execute(
          'SELECT id, product_type FROM products WHERE business_id=? AND deleted_at IS NULL AND LOWER(TRIM(name))=LOWER(TRIM(?)) LIMIT 1',
          [destBusinessId, cleanTargetName]
        );
        if ((destProdRows as any[]).length > 0) {
          destProductId = (destProdRows as any[])[0].id;
        } else {
          // Normalized fallback (ignores extra spaces, hyphens, or leading "apple " / "samsung " prefix differences)
          const normalizeProdName = (str: string) =>
            str
              .toLowerCase()
              .replace(/^(apple|samsung)\s+/i, '')
              .replace(/[^a-z0-9]/g, '');
          const targetNorm = normalizeProdName(cleanTargetName);
          if (targetNorm.length >= 3) {
            const [allDestProds] = await conn.execute(
              'SELECT id, name FROM products WHERE business_id=? AND deleted_at IS NULL',
              [destBusinessId]
            );
            const fuzzyMatch = (allDestProds as any[]).find(
              p => normalizeProdName(String(p.name || '')) === targetNorm
            );
            if (fuzzyMatch) {
              destProductId = fuzzyMatch.id;
            }
          }
        }
      }

      // 3. If product exists in destination business, reuse its existing SKU (or create one if none exists)
      if (destProductId && !destSkuId) {
        const [prodSkus] = await conn.execute(
          'SELECT id, sku_code FROM product_skus WHERE product_id=? AND (sku_code=? OR ? IS NULL) LIMIT 1',
          [destProductId, resolvedSkuCode, resolvedSkuCode]
        );
        if ((prodSkus as any[]).length > 0) {
          destSkuId = (prodSkus as any[])[0].id;
        } else {
          const [allProdSkus] = await conn.execute(
            'SELECT id, sku_code FROM product_skus WHERE product_id=? ORDER BY id ASC',
            [destProductId]
          );
          if ((allProdSkus as any[]).length > 0) {
            destSkuId = (allProdSkus as any[])[0].id;
          } else {
            // Create SKU under this existing product only if it has 0 SKUs
            try {
              const [sIns] = await conn.execute(
                'INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) VALUES (?, ?, ?, ?)',
                [destProductId, resolvedSkuCode, transfer.cost_price || 0, transfer.selling_price || 0]
              );
              destSkuId = (sIns as any).insertId;
            } catch (skuErr: any) {
              const uniqueSku = `${resolvedSkuCode}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
              const [sIns] = await conn.execute(
                'INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) VALUES (?, ?, ?, ?)',
                [destProductId, uniqueSku, transfer.cost_price || 0, transfer.selling_price || 0]
              );
              destSkuId = (sIns as any).insertId;
            }
          }
        }
      }

      // 4. Only if no matching product exists at all in destination business, create product & SKU
      if (!destProductId && resolvedProductName) {
        let destCategoryId = null;
        let destManufacturerId = null;

        if (transfer.source_category_id) {
          const [srcCat] = await conn.execute('SELECT name FROM categories WHERE id=?', [transfer.source_category_id]);
          if ((srcCat as any[]).length > 0) {
            const catName = (srcCat as any[])[0].name;
            const [destCat] = await conn.execute(
              'SELECT id FROM categories WHERE business_id=? AND LOWER(TRIM(name))=LOWER(TRIM(?))', 
              [destBusinessId, catName]
            );
            if ((destCat as any[]).length > 0) {
              destCategoryId = (destCat as any[])[0].id;
            } else {
              const [catIns] = await conn.execute(
                'INSERT INTO categories (business_id, name) VALUES (?, ?)', [destBusinessId, catName]
              );
              destCategoryId = (catIns as any).insertId;
            }
          }
        }

        if (transfer.source_manufacturer_id) {
          const [srcMfg] = await conn.execute('SELECT name FROM manufacturers WHERE id=?', [transfer.source_manufacturer_id]);
          if ((srcMfg as any[]).length > 0) {
            const mfgName = (srcMfg as any[])[0].name;
            const [destMfg] = await conn.execute(
              'SELECT id FROM manufacturers WHERE business_id=? AND LOWER(TRIM(name))=LOWER(TRIM(?))', 
              [destBusinessId, mfgName]
            );
            if ((destMfg as any[]).length > 0) {
              destManufacturerId = (destMfg as any[])[0].id;
            } else {
              const [mfgIns] = await conn.execute(
                'INSERT INTO manufacturers (business_id, name) VALUES (?, ?)', [destBusinessId, mfgName]
              );
              destManufacturerId = (mfgIns as any).insertId;
            }
          }
        }

        const [pIns] = await conn.execute(
          'INSERT INTO products (business_id, name, product_type, category_id, manufacturer_id, allow_overselling) VALUES (?, ?, ?, ?, ?, 1)',
          [destBusinessId, resolvedProductName, 
           transfer.source_product_type || (transfer.device_id ? 'serialized' : 'stock'),
           destCategoryId, destManufacturerId]
        );
        destProductId = (pIns as any).insertId;

        try {
          const [sIns] = await conn.execute(
            'INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) VALUES (?, ?, ?, ?)',
            [destProductId, resolvedSkuCode, transfer.cost_price || 0, transfer.selling_price || 0]
          );
          destSkuId = (sIns as any).insertId;
        } catch (skuErr: any) {
          const uniqueSku = `${resolvedSkuCode}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
          const [sIns] = await conn.execute(
            'INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) VALUES (?, ?, ?, ?)',
            [destProductId, uniqueSku, transfer.cost_price || 0, transfer.selling_price || 0]
          );
          destSkuId = (sIns as any).insertId;
        }
      }
    }

    // Process serialized device
    if (transfer.device_id) {
      if (isCrossBusiness) {
        // Transfer ownership of the device to destination business & branch
        await conn.execute(
          'UPDATE devices SET business_id=?, branch_id=?, user_id=?, sku_id=?, status=\'in_stock\' WHERE id=?',
          [destBusinessId, destBranchId, req.userId, destSkuId || transfer.sku_id, transfer.device_id]
        );
      } else {
        // Same business transfer
        await conn.execute(
          'UPDATE devices SET branch_id=?, user_id=?, status=\'in_stock\' WHERE id=? AND business_id=?',
          [destBranchId, req.userId, transfer.device_id, destBusinessId]
        );
      }
      
      // Update destination branch stock (+1)
      if (destSkuId) {
        await conn.execute(
          'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity=quantity+1',
          [destBranchId, destSkuId]
        );
      }
    } else if (destSkuId) {
      // Non-serialized item
      await conn.execute(
        'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity=quantity+?',
        [destBranchId, destSkuId, transfer.quantity || 1, transfer.quantity || 1]
      );
    }

    // Record inventory movement in destination
    if (destSkuId) {
      try {
        await conn.execute(
          `INSERT INTO inventory_movements 
           (business_id, branch_id, sku_id, movement_type, quantity, unit_cost, reference_type, reference_id) 
           VALUES (?, ?, ?, 'transfer_in', ?, ?, 'device_transfers', ?)`,
          [destBusinessId, destBranchId, destSkuId, transfer.quantity || 1, transfer.cost_price || 0, transfer.id]
        );
      } catch (imErr) {
        console.warn('[PUT /api/transfers/:id/complete] Inventory movement warning:', (imErr as any).message);
      }
    }

    // Mark transfer completed (with fallback for legacy schemas without completed_at)
    try {
      await conn.execute("UPDATE device_transfers SET status='completed', completed_at=NOW() WHERE id=?", [transfer.id]);
    } catch (uErr: any) {
      if (uErr.message?.includes('Unknown column')) {
        await conn.execute("UPDATE device_transfers SET status='completed' WHERE id=?", [transfer.id]);
      } else {
        throw uErr;
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Transfer received and inventory synchronized' });
  } catch (e: any) {
    await conn.rollback();
    console.error('[PUT /api/transfers/:id/complete] Error:', e.message);
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// PUT /api/transfers/:id/cancel
router.put('/transfers/:id/cancel', async (req: any, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [tr] = await conn.execute(
      `SELECT t.*, fb.business_id as from_business_id, tb.business_id as to_business_id
       FROM device_transfers t
       JOIN branches fb ON t.from_branch_id=fb.id
       JOIN branches tb ON t.to_branch_id=tb.id
       WHERE t.id=?`,
      [req.params.id]
    );
    const transfer = (tr as any[])[0];
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status === 'completed') throw new Error('Cannot cancel a completed transfer');
    if (transfer.status === 'cancelled') throw new Error('Transfer is already cancelled');

    const isSuper = req.user.role === 'superadmin' || req.user.role === 'developer';
    // STRICT ISOLATION: Only the dispatching origin business can cancel the transfer
    if (!isSuper && Number(transfer.from_business_id) !== Number(req.user.business_id)) {
      return res.status(403).json({ error: 'Access denied: Only the dispatching business can cancel this transfer.' });
    }

    await conn.execute("UPDATE device_transfers SET status='cancelled' WHERE id=?", [transfer.id]);
    
    if (transfer.device_id) {
      await conn.execute("UPDATE devices SET status='in_stock' WHERE id=? AND business_id=?", [transfer.device_id, transfer.from_business_id]);
      if (transfer.sku_id) {
        await conn.execute(
          'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity=quantity+1',
          [transfer.from_branch_id, transfer.sku_id]
        );
      }
    } else if (transfer.sku_id) {
      await conn.execute(
        'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)',
        [transfer.from_branch_id, transfer.sku_id, transfer.quantity || 1]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Transfer cancelled and stock restored to origin branch' });
  } catch (e: any) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// GET /api/transfers/device/:imei
router.get('/transfers/device/:imei', async (req: any, res, next) => {
  try {
    const q = req.params.imei;
    const device = await queryOne(
      'SELECT * FROM devices WHERE (imei=? OR imei_serial=?) AND business_id=?',
      [q, q, (req as any).user.business_id]
    );
    if (!device) return res.status(404).json({ error: 'No device found with this IMEI or Serial' });
    const transfers = await query(`
      SELECT t.*,
             fb.name as from_branch_name, fbz.name as from_business_name,
             tb.name as to_branch_name, tbz.name as to_business_name,
             u.name as initiated_by_name
      FROM device_transfers t
      LEFT JOIN branches fb ON t.from_branch_id=fb.id
      LEFT JOIN businesses fbz ON fb.business_id=fbz.id
      LEFT JOIN branches tb ON t.to_branch_id=tb.id
      LEFT JOIN businesses tbz ON tb.business_id=tbz.id
      LEFT JOIN users u ON t.initiated_by=u.id
      WHERE t.device_id=? ORDER BY t.created_at DESC
    `, [(device as any).id]);
    const currentBranch = await queryOne('SELECT b.*, bz.name as business_name FROM branches b JOIN businesses bz ON b.business_id=bz.id WHERE b.id=?', [(device as any).branch_id]);
    res.json({ device, currentBranch, transfers });
  } catch (e: any) { next(e); }
});

// GET /api/repairs
router.get('/repairs', async (req: any, res, next) => {
  try {
    const isSuper = req.user.role === 'superadmin';
    const sql = `
      SELECT j.*, c.name as customer_name, c.phone as customer_phone FROM jobs j
      LEFT JOIN customers c ON j.customer_id=c.id
      WHERE j.business_id=? ${!isSuper ? 'AND j.branch_id=?' : ''}
      ORDER BY j.created_at DESC
    `;
    const params = !isSuper ? [req.user.business_id, req.user.branch_id] : [req.user.business_id];
    res.json(await query(sql, params));
  } catch (e: any) { next(e); }
});

// GET /api/repairs/:id — single repair with full details
router.get('/repairs/:id', async (req: any, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT j.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
       FROM jobs j LEFT JOIN customers c ON j.customer_id=c.id
       WHERE j.id=? AND j.business_id=?`,
      [req.params.id, req.user.business_id]
    );
    const job = (rows as any[])[0];
    if (!job) return res.status(404).json({ error: 'Repair job not found' });

    // Fetch linked repair invoices for this specific job
    const searchNote1 = `%#${job.id}%`;
    const searchNote2 = `%Job ${job.id}%`;
    const invoices = await query(
      `SELECT DISTINCT i.id, i.invoice_number, i.grand_total, i.paid_amount, i.status, i.created_at,
              (SELECT GROUP_CONCAT(CONCAT(p.method, ': €', FORMAT(p.amount,2)) SEPARATOR ', ') FROM payments p WHERE p.invoice_id=i.id) as payment_summary
       FROM invoices i
       JOIN invoice_items ii ON ii.invoice_id=i.id
       WHERE i.business_id=? 
         AND (ii.notes LIKE ? OR ii.notes LIKE ? ${job.customer_id ? "OR (i.type='repair' AND i.customer_id=?)" : ''})
         AND i.grand_total > 0
       ORDER BY i.created_at DESC`,
      job.customer_id 
        ? [req.user.business_id, searchNote1, searchNote2, job.customer_id]
        : [req.user.business_id, searchNote1, searchNote2]
    );

    res.json({ ...job, invoices });
  } catch (e: any) { next(e); }
});

const createRepairSchema = z.object({
  customer_id: z.number().nullable().optional(),
  customer_name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional().nullable(),
  device_model: z.string().optional(),
  issue: z.string().optional(),
  status: z.string().optional(),
  total_quote: z.number().or(z.string().transform(Number)).optional(),
  deposit_paid: z.number().or(z.string().transform(Number)).optional(),
  remaining_balance: z.number().or(z.string().transform(Number)).optional(),
  payment_method: z.string().optional()
});

// POST /api/repairs
router.post('/repairs', async (req: any, res, next) => {
  const conn = await pool.getConnection();
  try {
    const data = createRepairSchema.parse(req.body);
    const { 
      customer_id, 
      customer_name, 
      phone, 
      email,
      device_model, 
      issue, 
      status,
      total_quote,
      deposit_paid,
      remaining_balance,
      payment_method,
      first_name,
      last_name
    } = data;
    
    await conn.beginTransaction();
    
    let finalCustomerId = customer_id;
    
    // If no customer_id but phone or name is provided, handle customer lookup/creation
    if (!finalCustomerId && (phone || customer_name || first_name)) {
      const existingRows = phone
        ? (await conn.execute(
            'SELECT id, email FROM customers WHERE phone = ? AND business_id = ? AND deleted_at IS NULL LIMIT 1',
            [phone, req.user.business_id]
          ))[0] as any[]
        : [];
      
      if (existingRows.length > 0) {
        finalCustomerId = existingRows[0].id;
        if (email && !existingRows[0].email) {
          await conn.execute('UPDATE customers SET email = ? WHERE id = ?', [email, finalCustomerId]);
        }
      } else {
        // Create new customer
        const combinedName = customer_name?.trim() || `${first_name || ''} ${last_name || ''}`.trim() || (phone ? `Customer (${phone})` : 'Walk-in Customer');

        const [newCust] = await conn.execute(
          'INSERT INTO customers (business_id, branch_id, name, first_name, last_name, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.user.business_id, req.user.branch_id, combinedName, first_name || combinedName, last_name || '', phone || '', email || null]
        );
        finalCustomerId = (newCust as any).insertId;
      }
    }

    const [r] = await conn.execute(
      `INSERT INTO jobs (
        business_id, branch_id, customer_id, device_model, issue, status, 
        total_quote, deposit_paid, remaining_balance, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.business_id, 
        req.user.branch_id, 
        finalCustomerId || null, 
        device_model, 
        issue, 
        status || 'new',
        total_quote || 0,
        deposit_paid || 0,
        remaining_balance || 0,
        payment_method || null
      ]
    );
    
    const jobId = (r as any).insertId;
    
    if (finalCustomerId) {
      await conn.execute('INSERT INTO customer_activity (customer_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
        [finalCustomerId, req.userId, 'Repair Job Created', `New repair job for ${device_model}: ${issue}`]);
    }
    
    await conn.commit();
    res.json({ id: jobId, customer_id: finalCustomerId });
  } catch (e: any) { 
    await conn.rollback(); 
    console.error('[POST /api/repairs] Error:', e.message);
    next(e); 
  }
  finally { conn.release(); }
});

const updateRepairSchema = z.object({
  status: z.string().optional(),
  device_model: z.string().optional(),
  issue: z.string().optional(),
  notes: z.string().optional(),
  total_quote: z.number().or(z.string().transform(Number)).optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional().nullable(),
  customer_email: z.string().optional().nullable()
});

// PUT /api/repairs/:id — update status, device_model, issue, customer profile, total_quote, and notes (payments go through Cash Register)
router.put('/repairs/:id', async (req: any, res, next) => {
  const data = updateRepairSchema.parse(req.body);
  const { status, device_model, issue, notes, total_quote, customer_name, customer_phone, customer_email } = data;
  const jobId = req.params.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Fetch current job record
    const [rows] = await conn.execute(
      'SELECT * FROM jobs WHERE id = ? AND business_id = ?',
      [jobId, req.user.business_id]
    );
    const job = (rows as any[])[0];
    if (!job) throw new Error('Repair job not found or access denied.');

    // Build update fields dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (device_model !== undefined && device_model.trim()) {
      updates.push('device_model = ?');
      values.push(device_model.trim());
    }

    if (issue !== undefined) {
      updates.push('issue = ?');
      values.push(issue.trim());
    }

    // Handle customer profile edits (name, phone, email)
    if (customer_name !== undefined || customer_phone !== undefined || customer_email !== undefined) {
      if (job.customer_id) {
        const custUpdates: string[] = [];
        const custValues: any[] = [];

        if (customer_name !== undefined) {
          const trimmedName = customer_name.trim() || 'Walk-in Customer';
          const parts = trimmedName.split(/\s+/);
          const firstName = parts[0] || trimmedName;
          const lastName = parts.slice(1).join(' ');
          custUpdates.push('name = ?', 'first_name = ?', 'last_name = ?');
          custValues.push(trimmedName, firstName, lastName);
        }

        if (customer_phone !== undefined) {
          custUpdates.push('phone = ?');
          custValues.push((customer_phone || '').trim());
        }

        if (customer_email !== undefined) {
          custUpdates.push('email = ?');
          custValues.push((customer_email || '').trim() || null);
        }

        if (custUpdates.length > 0) {
          custValues.push(job.customer_id, req.user.business_id);
          await conn.execute(
            `UPDATE customers SET ${custUpdates.join(', ')} WHERE id = ? AND business_id = ?`,
            custValues
          );
        }
      } else {
        // Job had no linked customer record yet — create one and link it
        const trimmedName = (customer_name || '').trim() || 'Walk-in Customer';
        const parts = trimmedName.split(/\s+/);
        const firstName = parts[0] || trimmedName;
        const lastName = parts.slice(1).join(' ');
        const phoneVal = (customer_phone || '').trim();
        const emailVal = (customer_email || '').trim() || null;

        const [newCust] = await conn.execute(
          'INSERT INTO customers (business_id, branch_id, name, first_name, last_name, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.user.business_id, job.branch_id || req.user.branch_id, trimmedName, firstName, lastName, phoneVal, emailVal]
        );
        const newCustomerId = (newCust as any).insertId;
        updates.push('customer_id = ?');
        values.push(newCustomerId);
      }
    }

    if (total_quote !== undefined) {
      const newQuote = Math.max(0, Number(total_quote) || 0);
      const currentDeposit = Number(job.deposit_paid || 0);
      const newRemaining = Math.max(0, newQuote - currentDeposit);
      updates.push('total_quote = ?', 'remaining_balance = ?');
      values.push(newQuote, newRemaining);
    }

    // Append notes with timestamp
    if (notes && notes.trim()) {
      const timestamp = new Date().toLocaleString('en-IE', { 
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit' 
      });
      const newNote = `[${timestamp}] ${notes.trim()}`;
      const existingNotes = job.notes ? job.notes + '\n' + newNote : newNote;
      updates.push('notes = ?');
      values.push(existingNotes);
    }

    // Apply updates to the job
    if (updates.length) {
      values.push(jobId, req.user.business_id);
      await conn.execute(
        `UPDATE jobs SET ${updates.join(', ')} WHERE id = ? AND business_id = ?`,
        values
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    console.error('[PUT /api/repairs/:id] Error:', e.message);
    next(e);
  } finally {
    conn.release();
  }
});

// GET /api/search
router.get('/search', async (req: any, res, next) => {
  const q = req.query.q as string;
  const type = req.query.type as string;
  if (!q || q.length < 2) return res.json([]);
  try {
    const isSuper = req.user.role === 'superadmin';
    if (type === 'customers') {
      const sql = `SELECT * FROM customers WHERE (name LIKE ? OR phone LIKE ? OR email LIKE ?)
                    AND business_id=? ${!isSuper ? 'AND branch_id=?' : ''} AND deleted_at IS NULL LIMIT 15`;
      const params = !isSuper 
        ? [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id, req.user.branch_id]
        : [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id];
      return res.json(await query(sql, params));
    }
    const products = await query(`
      SELECT s.id, p.name as product_name, s.sku_code, s.barcode, 
             COALESCE(s.selling_price, p.base_unit_price, 0) as selling_price,
             p.product_type, p.allow_overselling,
             (SELECT SUM(quantity) FROM branch_stock WHERE sku_id=s.id ${!isSuper ? 'AND branch_id=?' : ''}) as total_stock
      FROM product_skus s JOIN products p ON s.product_id=p.id
      WHERE (p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ?) AND p.business_id=? AND p.deleted_at IS NULL LIMIT 15
    `, !isSuper 
        ? [req.user.branch_id, `%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id]
        : [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id]);

    const devices = await query(`
      SELECT s.id, p.name as product_name, s.sku_code, s.barcode, 
             COALESCE(d.selling_price, s.selling_price, p.base_unit_price, 0) as selling_price,
             p.product_type, p.allow_overselling, d.imei, d.id as device_id, 1 as total_stock
      FROM devices d JOIN product_skus s ON d.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      WHERE (d.imei LIKE ? OR p.name LIKE ? OR s.sku_code LIKE ?) 
      AND d.business_id=? ${!isSuper ? 'AND d.branch_id=?' : ''} 
      AND d.status='in_stock' 
      AND d.imei IS NOT NULL AND d.imei != ''
      LIMIT 15
    `, !isSuper
        ? [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id, req.user.branch_id]
        : [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id]);

    const results: any[] = [...devices];
    for (const p of products) {
      // Robust check: normalize the type to catch 'Serialized', 'serialized ', etc.
      const normalizedType = (p.product_type || '').toLowerCase().trim();

      // Requirement: Do not show generic/template entries for serialized products.
      // We only want specific units with IMEIs (which are already in the 'results' array).
      if (normalizedType === 'serialized') continue;

      if (!results.some((r: any) => r.id === p.id)) {
        results.push(p);
      }
    }
    res.json(results);
  } catch (e: any) { next(e); }
});

// Payment method update is handled in invoices.ts with business isolation (FINDING-005)

export default router;
