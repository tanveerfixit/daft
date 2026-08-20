import { Router } from 'express';
import { pool, query, queryOne, execute } from '../mysql.js';
import { z } from 'zod';

const router = Router();

const addInventorySchema = z.object({
  sku_id: z.number().or(z.string().transform(Number)),
  branch_id: z.number().or(z.string().transform(Number)).optional(),
  quantity: z.number().or(z.string().transform(Number)).optional(),
  cost_price: z.number().or(z.string().transform(Number)).optional(),
  selling_price: z.number().or(z.string().transform(Number)).optional(),
  supplier_id: z.number().or(z.string().transform(Number)).nullable().optional(),
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
    const totalAmount = (cost_price || 0) * (quantity || (items?.length || 0));
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
       quantity || items?.length || 0, quantity || items?.length || 0, cost_price || 0, totalAmount]
    );

    if (productInfo.product_type === 'serialized') {
      for (const item of items) {
        await conn.execute(
          "INSERT INTO devices (business_id,branch_id,sku_id,imei,cost_price,selling_price,color,gb,`condition`,po_number,status) VALUES (?,?,?,?,?,?,?,?,?,?,'in_stock')",
          [req.user.business_id, activeBranchId, sku_id, item.imei, cost_price, selling_price, item.color, item.gb, item.condition, finalPoNumber]
        );
        const deviceId = (await conn.execute('SELECT LAST_INSERT_ID() as id'))[0] as any;
        await conn.execute(
          'INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
          [deviceId[0].id, req.userId, 'Device Created', `Added to inventory via PO: ${finalPoNumber}`]
        );
        await conn.execute(
          'INSERT INTO activity_logs (device_id, user_id, activity_type, description, reference_link) VALUES (?, ?, ?, ?, ?)',
          [deviceId[0].id, req.userId, 'Device Created', 'Initial inventory entry', finalPoNumber]
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
    res.json({ success: true });
  } catch (e: any) { await conn.rollback(); console.error('[inventory/add] Error:', e.message, e.sql || ''); next(e); }
  finally { conn.release(); }
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
    const device = await queryOne(`
      SELECT d.id, d.imei, d.imei_serial, d.status, d.branch_id, d.condition, d.gb, d.color,
             p.name as product_name, s.sku_code, b.name as branch_name
      FROM devices d
      JOIN product_skus s ON d.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN branches b ON d.branch_id = b.id
      WHERE (d.imei = ? OR d.imei_serial = ?) AND d.business_id = ?
      LIMIT 1
    `, [cleanImei, cleanImei, req.user.business_id]);

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
    const isSuper = req.user.role === 'superadmin';
    const rows = await query(`
      SELECT 
        COUNT(*) as total_devices,
        SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as in_stock_devices
      FROM devices
      WHERE business_id = ? ${!isSuper ? 'AND branch_id = ?' : ''}
    `, !isSuper ? [businessId, req.user.branch_id] : [businessId]);
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
    const isSuper = req.user.role === 'superadmin';
    const status = req.query.status || 'all';

    let sql = `
      SELECT 
        COALESCE(d.imei_serial, d.imei, '') as serial_number,
        p.name as product_name,
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
        COALESCE(u.name, bz.name, 'Phone Lab') as created_by_user,
        DATE_FORMAT(COALESCE(d.created_at, d.date_added, NOW()), '%Y-%m-%d %H:%i:%s') as created_date
      FROM devices d
      LEFT JOIN product_skus s ON d.sku_id = s.id
      LEFT JOIN products p ON (d.product_id = p.id OR s.product_id = p.id)
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      JOIN businesses bz ON d.business_id = bz.id
      LEFT JOIN users u ON u.business_id = d.business_id AND u.role IN ('admin', 'manager', 'user')
      WHERE d.business_id = ? ${status !== 'all' ? 'AND d.status = ?' : ''} ${!isSuper ? 'AND d.branch_id = ?' : ''}
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `;

    const params: any[] = [businessId];
    if (status !== 'all') params.push(status);
    if (!isSuper) params.push(req.user.branch_id);

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
          const skuCode = `SKU-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;
          const [insSku] = await conn.execute(
            'INSERT INTO product_skus (product_id, sku_code, barcode, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)',
            [productId, skuCode, skuCode, costPrice, sellingPrice]
          );
          skuId = (insSku as any).insertId;
        }

        // 5. Check if device already exists
        const [existDevice] = await conn.execute(
          'SELECT id FROM devices WHERE business_id = ? AND (imei COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci OR imei_serial COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci) LIMIT 1',
          [businessId, serialNumber, serialNumber]
        );

        if ((existDevice as any[]).length > 0) {
          const existingId = (existDevice as any[])[0].id;
          if (duplicateHandling === 'overwrite') {
            await conn.execute(`
              UPDATE devices 
              SET product_id = ?, sku_id = ?, gb = ?, color = ?, \`condition\` = ?, cost_price = ?, selling_price = ?, status = ?, imei_status = ?, carrier = ?
              WHERE id = ?
            `, [productId, skuId, storage, color, condition, costPrice, sellingPrice, stockStatus, imeiStatus, carrier, existingId]);
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Insert new device
          const [insDev] = await conn.execute(`
            INSERT INTO devices 
              (business_id, branch_id, product_id, sku_id, imei, imei_serial, gb, color, \`condition\`, cost_price, selling_price, status, imei_status, carrier, created_at, date_added)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), COALESCE(?, NOW()))
          `, [businessId, branchId, productId, skuId, serialNumber, serialNumber, storage, color, condition, costPrice, sellingPrice, stockStatus, imeiStatus, carrier, createdDate, createdDate]);

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
  const { q, imei, branch_id } = req.query;
  const searchVal = q || imei;
  try {
    let sql = `
      SELECT d.*, p.name as product_name, s.sku_code, b.name as branch_name
      FROM devices d 
      JOIN product_skus s ON d.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      LEFT JOIN branches b ON d.branch_id=b.id 
      WHERE d.status='in_stock' AND d.business_id=?
    `;
    const params: any[] = [req.user.business_id];

    if (searchVal && String(searchVal).trim() !== '') {
      sql += ' AND (d.imei LIKE ? OR p.name LIKE ? OR s.sku_code LIKE ? OR d.imei_serial LIKE ?)';
      const term = `%${String(searchVal).trim()}%`;
      params.push(term, term, term, term);
    }
    
    const activeBranchId = branch_id ? parseInt(branch_id as string) : req.user.branch_id;
    if (activeBranchId && String(activeBranchId) !== 'undefined') { 
      sql += ' AND d.branch_id=?'; 
      params.push(activeBranchId); 
    }
    
    sql += ' LIMIT 20';
    res.json(await query(sql, params));
  } catch (e: any) { 
    console.error('[SearchDevices] Error:', e.message);
    next(e); 
  }
});

// GET /api/devices/:id
router.get('/devices/:id', async (req: any, res, next) => {
  try {
    const device = await queryOne(`
      SELECT d.*, p.name as product_name, s.sku_code, s.barcode
      FROM devices d
      JOIN product_skus s ON d.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      WHERE d.id=? AND d.business_id=?
    `, [req.params.id, req.user.business_id]);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (e: any) { next(e); }
});

const updateDeviceSchema = z.object({
  color: z.string().optional(),
  gb: z.string().optional(),
  ram: z.string().optional(),
  condition: z.string().optional(),
  cost_price: z.number().or(z.string().transform(Number)).optional(),
  selling_price: z.number().or(z.string().transform(Number)).optional(),
  unlocked: z.boolean().or(z.number().transform(Boolean)).optional(),
  imei_status: z.string().optional(),
  carrier: z.string().optional()
});

// PUT /api/devices/:id
router.put('/devices/:id', async (req: any, res, next) => {
  const data = updateDeviceSchema.parse(req.body);
  const { color, gb, ram, condition, cost_price, selling_price, unlocked, imei_status, carrier } = data;
  try {
    const old = await queryOne('SELECT * FROM devices WHERE id=? AND business_id=?', [req.params.id, req.user.business_id]);
    if (!old) return res.status(404).json({ error: 'Device not found' });

    await execute(`
      UPDATE devices SET 
        color=?, gb=?, ram=?, \`condition\`=?, cost_price=?, selling_price=?, 
        unlocked=?, imei_status=?, carrier=?
      WHERE id=? AND business_id=?
    `, [
      color || old.color, gb || old.gb, ram || old.ram, condition || old.condition, 
      cost_price || old.cost_price, selling_price || old.selling_price,
      unlocked || old.unlocked, imei_status || old.imei_status, carrier || old.carrier,
      req.params.id, req.user.business_id
    ]);

    // Log what changed
    const changes: string[] = [];
    if (color && color !== old.color) changes.push(`Color: ${old.color} -> ${color}`);
    if (gb && gb !== old.gb) changes.push(`GB: ${old.gb} -> ${gb}`);
    if (ram && ram !== old.ram) changes.push(`RAM: ${old.ram} -> ${ram}`);
    if (condition && condition !== old.condition) changes.push(`Condition: ${old.condition} -> ${condition}`);
    if (cost_price && cost_price != old.cost_price) changes.push(`Cost: ${old.cost_price} -> ${cost_price}`);
    if (selling_price && selling_price != old.selling_price) changes.push(`Selling: ${old.selling_price} -> ${selling_price}`);

    if (changes.length > 0) {
      await execute('INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
        [req.params.id, req.userId, 'Device Updated', changes.join(', ')]);
      await execute('INSERT INTO activity_logs (device_id, user_id, activity_type, description) VALUES (?, ?, ?, ?)',
        [req.params.id, req.userId, 'Device Updated', changes.join(', ')]);
    }

    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// GET /api/devices/:id/activity
router.get('/devices/:id/activity', async (req: any, res, next) => {
  try {
    const activities = await query(`
      SELECT 'device' as source, a.id, a.user_id, a.activity, a.details, a.created_at, u.name as user_name 
      FROM device_activity a
      LEFT JOIN users u ON a.user_id=u.id
      WHERE a.device_id=?
      UNION ALL
      SELECT 'product' as source, pa.id, pa.user_id, pa.activity, pa.details, pa.created_at, u.name as user_name
      FROM product_activity pa
      LEFT JOIN users u ON pa.user_id=u.id
      WHERE pa.sku_id = (SELECT sku_id FROM devices WHERE id=?)
      UNION ALL
      SELECT 'log' as source, al.id, al.user_id, al.activity_type as activity, al.description as details, al.created_at, u.name as user_name
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
    const device = await queryOne('SELECT id FROM devices WHERE id=? AND business_id=?', [req.params.id, req.user.business_id]);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    
    await execute('INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
      [req.params.id, req.userId, activity || 'Note Added', details || '']);
    await execute('INSERT INTO activity_logs (device_id, user_id, activity_type, description) VALUES (?, ?, ?, ?)',
      [req.params.id, req.userId, activity || 'Note Added', details || '']);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// DELETE /api/devices/:id
router.delete('/devices/:id', async (req: any, res, next) => {
  try {
    const result = await execute('DELETE FROM devices WHERE id=? AND business_id=?', [req.params.id, req.user.business_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Device not found or access denied' });
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// GET /api/devices
router.get('/devices', async (req: any, res, next) => {
  const status = req.query.status || 'in_stock';
  try {
    const isSuper = req.user.role === 'superadmin';
    const sql = `
      SELECT d.id, d.sku_id, d.imei, d.color, d.gb, d.\`condition\`, d.po_number, d.status, d.created_at,
             p.name as product_name, s.sku_code, inv.invoice_number
      FROM devices d
      JOIN product_skus s ON d.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      LEFT JOIN invoice_items ii ON d.id=ii.device_id
      LEFT JOIN invoices inv ON ii.invoice_id=inv.id
      WHERE d.business_id=? AND d.status=? ${!isSuper ? 'AND d.branch_id=?' : ''}
      ORDER BY d.created_at DESC
    `;
    const params = !isSuper 
      ? [req.user.business_id, status, req.user.branch_id] 
      : [req.user.business_id, status];
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
      ORDER BY bz.name ASC, b.name ASC
    `;
    const rows = await query(sql);
    res.json(rows);
  } catch (e: any) { next(e); }
});

const transferSchema = z.object({
  to_branch_id: z.number().or(z.string().transform(Number)),
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

// POST /api/transfers
router.post('/transfers', async (req: any, res, next) => {
  const data = transferSchema.parse(req.body);
  const {
    to_branch_id, device_id: rawDeviceId, sku_id: rawSkuId,
    product_name, sku_code, imei, serial_number,
    quantity: rawQty, cost_price, selling_price, color, gb, condition, notes
  } = data;

  const quantity = rawQty || 1;
  const sourceBranchId = req.user.branch_id;
  const sourceBusinessId = req.user.business_id;

  if (!to_branch_id) return res.status(400).json({ error: 'Destination branch is required' });
  if (Number(to_branch_id) === Number(sourceBranchId)) {
    return res.status(400).json({ error: 'Source and destination branches must be different' });
  }

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

    let finalSkuId = rawSkuId;
    let finalDeviceId = rawDeviceId;
    let isSerialized = !!(imei?.trim() || serial_number?.trim() || rawDeviceId);

    // If product_name is provided, ensure product & sku exist in source business
    let sourceProductId: number | null = null;
    const cleanProductName = product_name?.trim();
    const cleanSkuCode = sku_code?.trim() || (cleanProductName ? cleanProductName.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().substring(0, 30) : 'SKU-ITEM');

    if (cleanProductName) {
      const [prodRows] = await conn.execute(
        'SELECT id, product_type FROM products WHERE business_id=? AND name=?',
        [sourceBusinessId, cleanProductName]
      );
      if ((prodRows as any[]).length > 0) {
        sourceProductId = (prodRows as any[])[0].id;
        if ((prodRows as any[])[0].product_type === 'serialized') isSerialized = true;
      } else {
        // Auto-create product in source business if not exists
        const [prodIns] = await conn.execute(
          'INSERT INTO products (business_id, name, product_type, allow_overselling) VALUES (?, ?, ?, 1)',
          [sourceBusinessId, cleanProductName, isSerialized ? 'serialized' : 'stock']
        );
        sourceProductId = (prodIns as any).insertId;
      }

      // Ensure SKU exists in source business
      const [skuRows] = await conn.execute(
        'SELECT id FROM product_skus WHERE product_id=? AND (sku_code=? OR ? IS NULL)',
        [sourceProductId, cleanSkuCode, cleanSkuCode]
      );
      if ((skuRows as any[]).length > 0) {
        finalSkuId = (skuRows as any[])[0].id;
      } else {
        const [globalSkuRows] = await conn.execute(
          'SELECT id FROM product_skus WHERE sku_code=?',
          [cleanSkuCode]
        );
        if ((globalSkuRows as any[]).length > 0) {
          finalSkuId = (globalSkuRows as any[])[0].id;
        } else {
          const [skuIns] = await conn.execute(
            'INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) VALUES (?, ?, ?, ?)',
            [sourceProductId, cleanSkuCode, cost_price || 0, selling_price || 0]
          );
          finalSkuId = (skuIns as any).insertId;
        }
      }
    }

    // Handle serialized device
    if (isSerialized) {
      const cleanImei = imei?.trim() || null;
      const cleanSerial = serial_number?.trim() || null;

      if (finalDeviceId) {
        const [dr] = await conn.execute(
          'SELECT * FROM devices WHERE id=? AND business_id=?',
          [finalDeviceId, sourceBusinessId]
        );
        const dev = (dr as any[])[0];
        if (!dev) throw new Error('Selected device not found');
        if (dev.status !== 'in_stock' && dev.status !== 'available') {
          throw new Error(`Device (${dev.imei || dev.id}) is not available (current status: ${dev.status})`);
        }
        await conn.execute("UPDATE devices SET status='transfer' WHERE id=?", [finalDeviceId]);
      } else {
        // Check if device with this IMEI already exists in source business
        if (cleanImei) {
          const [existDev] = await conn.execute(
            'SELECT * FROM devices WHERE imei=? AND business_id=?',
            [cleanImei, sourceBusinessId]
          );
          if ((existDev as any[]).length > 0) {
            finalDeviceId = (existDev as any[])[0].id;
            await conn.execute("UPDATE devices SET status='transfer' WHERE id=?", [finalDeviceId]);
          }
        }
        
        // If device still doesn't exist, create it in source branch/business with 'transfer' status
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
      }

      // Deduct from source branch stock if SKU is present
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

    // Insert into device_transfers
    const [tr] = await conn.execute(
      `INSERT INTO device_transfers 
       (business_id, from_branch_id, to_branch_id, device_id, sku_id, quantity, status, initiated_by, notes) 
       VALUES (?, ?, ?, ?, ?, ?, 'in_transit', ?, ?)`,
      [
        sourceBusinessId,
        sourceBranchId,
        to_branch_id,
        finalDeviceId || null,
        finalSkuId || null,
        quantity,
        req.userId,
        notes || null
      ]
    );

    // Record inventory movement
    if (finalSkuId) {
      await conn.execute(
        `INSERT INTO inventory_movements 
         (business_id, branch_id, sku_id, movement_type, quantity, unit_cost, reference_type, reference_id) 
         VALUES (?, ?, ?, 'transfer_out', ?, ?, 'device_transfers', ?)`,
        [sourceBusinessId, sourceBranchId, finalSkuId, quantity, cost_price || 0, (tr as any).insertId]
      );
    }

    await conn.commit();
    res.json({ success: true, id: (tr as any).insertId });
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
             d.imei, d.imei_serial, d.color, d.gb, d.\`condition\`, d.cost_price, d.selling_price,
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
    res.json(await query(sql, params));
  } catch (e: any) { next(e); }
});

// PUT /api/transfers/:id/complete
router.put('/transfers/:id/complete', async (req: any, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [tr] = await conn.execute(
      `SELECT t.*, fb.business_id as from_business_id, tb.business_id as to_business_id,
              d.imei, d.imei_serial, d.color, d.gb, d.\`condition\`, d.cost_price, d.selling_price,
              p.name as product_name, s.sku_code
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

    // Auto-create product & SKU in destination business if not existing
    let destSkuId = transfer.sku_id;
    let destProductId = null;

    if (transfer.product_name) {
      const [destProdRows] = await conn.execute(
        'SELECT id, product_type FROM products WHERE business_id=? AND name=?',
        [destBusinessId, transfer.product_name]
      );
      if ((destProdRows as any[]).length > 0) {
        destProductId = (destProdRows as any[])[0].id;
      } else {
        const [pIns] = await conn.execute(
          'INSERT INTO products (business_id, name, product_type, allow_overselling) VALUES (?, ?, ?, 1)',
          [destBusinessId, transfer.product_name, transfer.device_id ? 'serialized' : 'stock']
        );
        destProductId = (pIns as any).insertId;
      }

      const cleanSku = transfer.sku_code || transfer.product_name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().substring(0, 30);
      const [destSkuRows] = await conn.execute(
        'SELECT id FROM product_skus WHERE product_id=? AND (sku_code=? OR ? IS NULL)',
        [destProductId, cleanSku, cleanSku]
      );
      if ((destSkuRows as any[]).length > 0) {
        destSkuId = (destSkuRows as any[])[0].id;
      } else {
        const [globalSkuRows] = await conn.execute(
          'SELECT id FROM product_skus WHERE sku_code=?',
          [cleanSku]
        );
        if ((globalSkuRows as any[]).length > 0) {
          destSkuId = (globalSkuRows as any[])[0].id;
        } else {
          const [sIns] = await conn.execute(
            'INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) VALUES (?, ?, ?, ?)',
            [destProductId, cleanSku, transfer.cost_price || 0, transfer.selling_price || 0]
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
          'UPDATE devices SET business_id=?, branch_id=?, sku_id=?, status=\'in_stock\' WHERE id=?',
          [destBusinessId, destBranchId, destSkuId || transfer.sku_id, transfer.device_id]
        );
      } else {
        // Same business transfer
        await conn.execute(
          'UPDATE devices SET branch_id=?, status=\'in_stock\' WHERE id=?',
          [destBranchId, transfer.device_id]
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
        'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)',
        [destBranchId, destSkuId, transfer.quantity || 1]
      );
    }

    // Record inventory movement in destination
    if (destSkuId) {
      await conn.execute(
        `INSERT INTO inventory_movements 
         (business_id, branch_id, sku_id, movement_type, quantity, unit_cost, reference_type, reference_id) 
         VALUES (?, ?, ?, 'transfer_in', ?, ?, 'device_transfers', ?)`,
        [destBusinessId, destBranchId, destSkuId, transfer.quantity || 1, transfer.cost_price || 0, transfer.id]
      );
    }

    // Mark transfer completed
    await conn.execute("UPDATE device_transfers SET status='completed', completed_at=NOW() WHERE id=?", [transfer.id]);

    await conn.commit();
    res.json({ success: true, message: 'Transfer received and inventory synchronized' });
  } catch (e: any) {
    await conn.rollback();
    console.error('[PUT /api/transfers/:id/complete] Error:', e.message);
    next(e);
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
      await conn.execute("UPDATE devices SET status='in_stock' WHERE id=?", [transfer.device_id]);
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
      SELECT j.*, c.name as customer_name FROM jobs j
      LEFT JOIN customers c ON j.customer_id=c.id
      WHERE j.business_id=? ${!isSuper ? 'AND j.branch_id=?' : ''}
      ORDER BY j.created_at DESC
    `;
    const params = !isSuper ? [req.user.business_id, req.user.branch_id] : [req.user.business_id];
    res.json(await query(sql, params));
  } catch (e: any) { next(e); }
});

const createRepairSchema = z.object({
  customer_id: z.number().nullable().optional(),
  customer_name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
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
    
    // If no customer_id but phone is provided, handle customer lookup/creation
    if (!finalCustomerId && phone) {
      const [existing] = await conn.execute(
        'SELECT id FROM customers WHERE phone = ? AND business_id = ? AND deleted_at IS NULL LIMIT 1',
        [phone, req.user.business_id]
      );
      
      if ((existing as any[]).length > 0) {
        finalCustomerId = (existing as any[])[0].id;
      } else {
        // Create new customer
        const combinedName = `${first_name || ''} ${last_name || ''}`.trim();
        
        if (!combinedName) {
          throw new Error('Customer first name is required for new repair jobs.');
        }

        const [newCust] = await conn.execute(
          'INSERT INTO customers (business_id, branch_id, name, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
          [req.user.business_id, req.user.branch_id, combinedName, first_name || '', last_name || '', phone]
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
      
      // If there's a deposit, record it as a customer invoice and payment
      if (Number(deposit_paid) > 0) {
        const [lastRE] = await conn.execute(
          "SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'RE-%' AND business_id=? ORDER BY id DESC LIMIT 1",
          [req.user.business_id]
        );
        let nextRENum = 1;
        if ((lastRE as any[]).length > 0) {
          const lastNum = parseInt((lastRE as any[])[0].invoice_number.split('-')[1]);
          if (!isNaN(lastNum)) nextRENum = lastNum + 1;
        }
        const invoiceNumber = `RE-${String(nextRENum).padStart(3, '0')}`;
        
        const [invResult] = await conn.execute(
          `INSERT INTO invoices 
            (business_id, branch_id, user_id, customer_id, invoice_number, type, 
             subtotal, tax_total, discount_total, grand_total, paid_amount, due_amount, status)
           VALUES (?, ?, ?, ?, ?, 'repair', ?, 0, 0, ?, ?, 0, 'paid')`,
          [
            req.user.business_id, req.user.branch_id, req.userId,
            finalCustomerId || null, invoiceNumber,
            deposit_paid, deposit_paid, deposit_paid
          ]
        );
        const invoiceId = (invResult as any).insertId;

        await conn.execute(
          'INSERT INTO payments (customer_id, invoice_id, type, method, amount) VALUES (?, ?, ?, ?, ?)',
          [finalCustomerId, invoiceId, 'deposit', payment_method || 'Cash', deposit_paid]
        );
        
        await conn.execute(
          'INSERT INTO customer_activity (customer_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
          [finalCustomerId, req.userId, 'Repair Deposit Received', 
           `Deposit of €${Number(deposit_paid).toFixed(2)} received for job #${jobId}. Invoice: ${invoiceNumber}`]
        );
      }
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
  notes: z.string().optional(),
  collected_amount: z.number().or(z.string().transform(Number)).optional(),
  collected_method: z.string().optional()
});

// PUT /api/repairs/:id — update status, notes, collect remaining payment
router.put('/repairs/:id', async (req: any, res, next) => {
  const data = updateRepairSchema.parse(req.body);
  const { status, notes, collected_amount, collected_method } = data;
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

    const collected = parseFloat(String(collected_amount)) || 0;
    let invoiceNumber: string | null = null;

    if (collected > 0) {
      const newRemaining = Math.max(0, (job.remaining_balance || 0) - collected);
      const newDeposit = (job.deposit_paid || 0) + collected;

      updates.push('remaining_balance = ?', 'deposit_paid = ?');
      values.push(newRemaining, newDeposit);

      // Auto-create invoice
      const [lastRE] = await conn.execute(
        "SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'RE-%' AND business_id=? ORDER BY id DESC LIMIT 1",
        [req.user.business_id]
      );
      let nextRENum = 1;
      if ((lastRE as any[]).length > 0) {
        const lastNum = parseInt((lastRE as any[])[0].invoice_number.split('-')[1]);
        if (!isNaN(lastNum)) nextRENum = lastNum + 1;
      }
      invoiceNumber = `RE-${String(nextRENum).padStart(3, '0')}`;

      const [invResult] = await conn.execute(
        `INSERT INTO invoices 
          (business_id, branch_id, user_id, customer_id, invoice_number, type, 
           subtotal, tax_total, discount_total, grand_total, paid_amount, due_amount, status)
         VALUES (?, ?, ?, ?, ?, 'repair', ?, 0, 0, ?, ?, 0, 'paid')`,
        [
          req.user.business_id, req.user.branch_id, req.userId,
          job.customer_id || null, invoiceNumber,
          collected, collected, collected
        ]
      );
      const invoiceId = (invResult as any).insertId;

      // Record payment against customer
      if (job.customer_id) {
        await conn.execute(
          'INSERT INTO payments (customer_id, invoice_id, type, method, amount) VALUES (?, ?, ?, ?, ?)',
          [job.customer_id, invoiceId, 'repair_payment', collected_method || 'Cash', collected]
        );
        await conn.execute(
          'INSERT INTO customer_activity (customer_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
          [job.customer_id, req.userId, 'Repair Payment Received', 
           `€${collected.toFixed(2)} received for job #${jobId} (${job.device_model}). Invoice: ${invoiceNumber}`]
        );
      }
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
    res.json({ success: true, invoice_number: invoiceNumber });
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
