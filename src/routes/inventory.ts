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
      sql += ' AND (d.imei LIKE ? OR p.name LIKE ? OR s.sku_code LIKE ?)';
      const term = `%${String(searchVal).trim()}%`;
      params.push(term, term, term);
    }
    
    if (branch_id && String(branch_id).trim() !== '' && String(branch_id) !== 'undefined') { 
      sql += ' AND d.branch_id=?'; 
      params.push(parseInt(branch_id as string)); 
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
    const businessId = req.user.business_id;
    const isNumeric = /^\d+$/.test(req.params.id) && req.params.id.length < 10;
    const device = await queryOne(`
      SELECT d.*, p.name as product_name, s.sku_code, s.barcode
      FROM devices d
      JOIN product_skus s ON d.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      WHERE ${isNumeric ? 'd.id' : 'd.imei'}=? AND d.business_id=?
    `, [req.params.id, businessId]);
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
    const isNumeric = /^\d+$/.test(req.params.id) && req.params.id.length < 10;
    const old = await queryOne(`SELECT * FROM devices WHERE ${isNumeric ? 'id' : 'imei'}=? AND business_id=?`, [req.params.id, req.user.business_id]);
    if (!old) return res.status(404).json({ error: 'Device not found' });
    const realId = old.id;

    await execute(`
      UPDATE devices SET 
        color=?, gb=?, ram=?, \`condition\`=?, cost_price=?, selling_price=?, 
        unlocked=?, imei_status=?, carrier=?
      WHERE id=? AND business_id=?
    `, [
      color || old.color, gb || old.gb, ram || old.ram, condition || old.condition, 
      cost_price || old.cost_price, selling_price || old.selling_price,
      unlocked || old.unlocked, imei_status || old.imei_status, carrier || old.carrier,
      realId, req.user.business_id
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
        [realId, req.userId, 'Device Updated', changes.join(', ')]);
      await execute('INSERT INTO activity_logs (device_id, user_id, activity_type, description) VALUES (?, ?, ?, ?)',
        [realId, req.userId, 'Device Updated', changes.join(', ')]);
    }

    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// GET /api/devices/:id/activity
router.get('/devices/:id/activity', async (req: any, res, next) => {
  try {
    const isNumeric = /^\d+$/.test(req.params.id) && req.params.id.length < 10;
    const device = await queryOne(`SELECT id FROM devices WHERE ${isNumeric ? 'id' : 'imei'}=? AND business_id=?`, [req.params.id, req.user.business_id]);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const realId = device.id;

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
    `, [realId, realId, realId, realId]);
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
    const isNumeric = /^\d+$/.test(req.params.id) && req.params.id.length < 10;
    const device = await queryOne(`SELECT id FROM devices WHERE ${isNumeric ? 'id' : 'imei'}=? AND business_id=?`, [req.params.id, req.user.business_id]);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const realId = device.id;
    
    await execute('INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
      [realId, req.userId, activity || 'Note Added', details || '']);
    await execute('INSERT INTO activity_logs (device_id, user_id, activity_type, description) VALUES (?, ?, ?, ?)',
      [realId, req.userId, activity || 'Note Added', details || '']);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// DELETE /api/devices/:id
router.delete('/devices/:id', async (req: any, res, next) => {
  try {
    const isNumeric = /^\d+$/.test(req.params.id) && req.params.id.length < 10;
    const result = await execute(`DELETE FROM devices WHERE ${isNumeric ? 'id' : 'imei'}=? AND business_id=?`, [req.params.id, req.user.business_id]);
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

const transferSchema = z.object({
  device_id: z.number().optional(),
  sku_id: z.number().optional(),
  quantity: z.number().or(z.string().transform(Number)).optional(),
  to_branch_id: z.number().or(z.string().transform(Number)),
  notes: z.string().optional()
});

// POST /api/transfers
router.post('/transfers', async (req: any, res, next) => {
  const data = transferSchema.parse(req.body);
  const { device_id, sku_id, quantity, to_branch_id, notes } = data;
  if (!to_branch_id) return res.status(400).json({ error: 'Destination branch is required' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let from_branch_id: any;
    if (device_id) {
      const [dr] = await conn.execute('SELECT * FROM devices WHERE id=? AND business_id=?', [device_id, req.user.business_id]);
      const device = (dr as any[])[0];
      if (!device) throw new Error('Device not found or access denied');
      if (device.status !== 'in_stock') throw new Error('Device is not available for transfer');
      from_branch_id = device.branch_id;
      await conn.execute("UPDATE devices SET status='transfer' WHERE id=?", [device_id]);
    } else {
      const [sr] = await conn.execute('SELECT * FROM branch_stock WHERE sku_id=? AND quantity>=? AND branch_id=?', [sku_id, quantity||1, req.user.branch_id]);
      const stock = (sr as any[])[0];
      if (!stock) throw new Error('Insufficient stock for transfer in your branch');
      from_branch_id = stock.branch_id;
    }
    if (String(from_branch_id) === String(to_branch_id)) throw new Error('Source and destination branches must be different');
    const [tr] = await conn.execute(
      "INSERT INTO device_transfers (business_id,from_branch_id,to_branch_id,device_id,sku_id,quantity,status,initiated_by,notes) VALUES (?,?,?,?,?,?,'in_transit',?,?)",
      [req.user.business_id, from_branch_id, to_branch_id, device_id||null, sku_id||null, quantity||1, req.userId, notes||null]
    );
    await conn.commit();
    res.json({ success: true, id: (tr as any).insertId });
  } catch (e: any) { await conn.rollback(); res.status(400).json({ error: e.message }); }
  finally { conn.release(); }
});

// GET /api/transfers
router.get('/transfers', async (req: any, res, next) => {
  try {
    const isSuper = req.user.role === 'superadmin';
    const sql = `
      SELECT t.*, fb.name as from_branch_name, tb.name as to_branch_name,
             d.imei, d.color, d.gb, d.\`condition\`,
             p.name as product_name, s.sku_code, u.name as initiated_by_name
      FROM device_transfers t
      LEFT JOIN branches fb ON t.from_branch_id=fb.id
      LEFT JOIN branches tb ON t.to_branch_id=tb.id
      LEFT JOIN devices d ON t.device_id=d.id
      LEFT JOIN product_skus s ON COALESCE(d.sku_id, t.sku_id)=s.id
      LEFT JOIN products p ON s.product_id=p.id
      LEFT JOIN users u ON t.initiated_by=u.id
      WHERE t.business_id=? ${!isSuper ? 'AND (t.from_branch_id=? OR t.to_branch_id=?)' : ''}
      ORDER BY t.created_at DESC
    `;
    const params = !isSuper 
      ? [req.user.business_id, req.user.branch_id, req.user.branch_id] 
      : [req.user.business_id];
    res.json(await query(sql, params));
  } catch (e: any) { next(e); }
});

// PUT /api/transfers/:id/complete
router.put('/transfers/:id/complete', async (req: any, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [tr] = await conn.execute('SELECT * FROM device_transfers WHERE id=? AND business_id=?', [req.params.id, (req as any).user.business_id]);
    const transfer = (tr as any[])[0];
    if (!transfer) throw new Error('Transfer not found or access denied');
    if (transfer.status === 'completed') throw new Error('Transfer already completed');
    await conn.execute("UPDATE device_transfers SET status='completed',completed_at=NOW() WHERE id=?", [transfer.id]);
    if (transfer.device_id) {
      await conn.execute("UPDATE devices SET branch_id=?,status='in_stock' WHERE id=?", [transfer.to_branch_id, transfer.device_id]);
      const [dr] = await conn.execute('SELECT sku_id FROM devices WHERE id=?', [transfer.device_id]);
      const dsku = (dr as any[])[0]?.sku_id;
      await conn.execute('INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,-1) ON DUPLICATE KEY UPDATE quantity=quantity-1', [transfer.from_branch_id, dsku]);
      await conn.execute('INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,1) ON DUPLICATE KEY UPDATE quantity=quantity+1', [transfer.to_branch_id, dsku]);
    } else if (transfer.sku_id) {
      await conn.execute('INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,-?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)', [transfer.from_branch_id, transfer.sku_id, transfer.quantity]);
      await conn.execute('INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)', [transfer.to_branch_id, transfer.sku_id, transfer.quantity]);
    }
    await conn.commit();
    res.json({ success: true });
  } catch (e: any) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});

// PUT /api/transfers/:id/cancel
router.put('/transfers/:id/cancel', async (req: any, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [tr] = await conn.execute('SELECT * FROM device_transfers WHERE id=? AND business_id=?', [req.params.id, (req as any).user.business_id]);
    const transfer = (tr as any[])[0];
    if (!transfer) throw new Error('Transfer not found or access denied');
    if (transfer.status === 'completed') throw new Error('Cannot cancel a completed transfer');
    await conn.execute("UPDATE device_transfers SET status='cancelled' WHERE id=?", [transfer.id]);
    if (transfer.device_id) await conn.execute("UPDATE devices SET status='in_stock' WHERE id=?", [transfer.device_id]);
    await conn.commit();
    res.json({ success: true });
  } catch (e: any) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});

// GET /api/transfers/device/:imei
router.get('/transfers/device/:imei', async (req: any, res, next) => {
  try {
    const device = await queryOne('SELECT * FROM devices WHERE imei=? AND business_id=?', [req.params.imei, (req as any).user.business_id]);
    if (!device) return res.status(404).json({ error: 'No device found with this IMEI' });
    const transfers = await query(`
      SELECT t.*, fb.name as from_branch_name, tb.name as to_branch_name, u.name as initiated_by_name
      FROM device_transfers t
      LEFT JOIN branches fb ON t.from_branch_id=fb.id
      LEFT JOIN branches tb ON t.to_branch_id=tb.id
      LEFT JOIN users u ON t.initiated_by=u.id
      WHERE t.device_id=? ORDER BY t.created_at DESC
    `, [(device as any).id]);
    const currentBranch = await queryOne('SELECT * FROM branches WHERE id=?', [(device as any).branch_id]);
    res.json({ device, currentBranch, transfers });
  } catch (e: any) { next(e); }
});

// GET /api/repairs
router.get('/repairs', async (req: any, res, next) => {
  try {
    const isSuper = req.user.role === 'superadmin';
    const sql = `
      SELECT j.*, c.name as customer_name, c.phone FROM jobs j
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

    const collected = parseFloat(collected_amount) || 0;
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
      SELECT s.id, p.name as product_name, s.sku_code, s.barcode, s.selling_price,
             p.product_type, p.allow_overselling,
             (SELECT SUM(quantity) FROM branch_stock WHERE sku_id=s.id ${!isSuper ? 'AND branch_id=?' : ''}) as total_stock
      FROM product_skus s JOIN products p ON s.product_id=p.id
      WHERE (p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ?) AND p.business_id=? AND p.deleted_at IS NULL LIMIT 15
    `, !isSuper 
        ? [req.user.branch_id, `%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id]
        : [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id]);

    const devices = await query(`
      SELECT s.id, p.name as product_name, s.sku_code, s.barcode, s.selling_price,
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

// GET /api/inventory/b2b-businesses
router.get('/b2b-businesses', async (req: any, res, next) => {
  try {
    const list = await query(
      "SELECT id, name, slug FROM businesses WHERE id != ? AND status = 'active'",
      [req.user.business_id]
    );
    res.json(list);
  } catch (e: any) { next(e); }
});

// GET /api/inventory/b2b-transfers
router.get('/b2b-transfers', async (req: any, res, next) => {
  try {
    const businessId = req.user.business_id;
    const outgoing = await query(`
      SELECT t.*, tb.name as to_business_name, d.imei, d.color, d.gb, d.\`condition\`,
             p.name as product_name, s.sku_code, u.name as initiated_by_name
      FROM b2b_device_transfers t
      LEFT JOIN businesses tb ON t.to_business_id = tb.id
      LEFT JOIN devices d ON t.device_id = d.id
      LEFT JOIN product_skus s ON t.sender_sku_id = s.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN users u ON t.initiated_by = u.id
      WHERE t.from_business_id = ?
      ORDER BY t.created_at DESC
    `, [businessId]);

    const incoming = await query(`
      SELECT t.*, fb.name as from_business_name, d.imei, d.color, d.gb, d.\`condition\`,
             p.name as product_name, s.sku_code, u.name as initiated_by_name
      FROM b2b_device_transfers t
      LEFT JOIN businesses fb ON t.from_business_id = fb.id
      LEFT JOIN devices d ON t.device_id = d.id
      LEFT JOIN product_skus s ON t.sender_sku_id = s.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN users u ON t.initiated_by = u.id
      WHERE t.to_business_id = ?
      ORDER BY t.created_at DESC
    `, [businessId]);

    res.json({ outgoing, incoming });
  } catch (e: any) { next(e); }
});

// POST /api/inventory/b2b-transfers/initiate
const initiateB2bTransferSchema = z.object({
  device_id: z.number(),
  to_business_id: z.number(),
  notes: z.string().optional()
});

router.post('/b2b-transfers/initiate', async (req: any, res, next) => {
  const data = initiateB2bTransferSchema.parse(req.body);
  const { device_id, to_business_id, notes } = data;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Verify device belongs to user's business and is in stock
    const [dr] = await conn.execute(
      "SELECT * FROM devices WHERE id = ? AND business_id = ? AND status = 'in_stock'",
      [device_id, req.user.business_id]
    );
    const device = (dr as any[])[0];
    if (!device) throw new Error('Device not found or not available for transfer');

    // Verify target business exists
    const [br] = await conn.execute(
      "SELECT id FROM businesses WHERE id = ? AND status = 'active'",
      [to_business_id]
    );
    if ((br as any[]).length === 0) throw new Error('Target business not found or inactive');

    // Update device status
    await conn.execute("UPDATE devices SET status = 'transferring_b2b' WHERE id = ?", [device_id]);

    // Insert B2B transfer record
    await conn.execute(
      `INSERT INTO b2b_device_transfers 
        (from_business_id, from_branch_id, to_business_id, device_id, sender_sku_id, cost_price, status, initiated_by, notes) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [req.user.business_id, req.user.branch_id, to_business_id, device_id, device.sku_id, device.cost_price || 0, req.userId, notes || null]
    );

    // Log device activity
    await conn.execute(
      'INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
      [device_id, req.userId, 'B2B Transfer Initiated', `B2B Transfer initiated to business ID ${to_business_id}`]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// POST /api/inventory/b2b-transfers/:id/cancel
router.post('/b2b-transfers/:id/cancel', async (req: any, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [tr] = await conn.execute(
      "SELECT * FROM b2b_device_transfers WHERE id = ? AND from_business_id = ? AND status = 'pending'",
      [req.params.id, req.user.business_id]
    );
    const transfer = (tr as any[])[0];
    if (!transfer) throw new Error('Pending transfer not found');

    // Restore device status to in_stock
    await conn.execute("UPDATE devices SET status = 'in_stock' WHERE id = ?", [transfer.device_id]);

    // Update transfer status
    await conn.execute(
      "UPDATE b2b_device_transfers SET status = 'cancelled', completed_at = NOW() WHERE id = ?",
      [transfer.id]
    );

    await conn.execute(
      'INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
      [transfer.device_id, req.userId, 'B2B Transfer Cancelled', 'B2B transfer cancelled by sender']
    );

    await conn.commit();
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// POST /api/inventory/b2b-transfers/:id/respond
const respondB2bTransferSchema = z.object({
  action: z.enum(['accept', 'reject']),
  to_branch_id: z.number().optional(),
  receiver_sku_id: z.number().optional(),
  auto_create: z.object({
    product_name: z.string(),
    sku_code: z.string(),
    selling_price: z.number()
  }).optional()
});

router.post('/b2b-transfers/:id/respond', async (req: any, res, next) => {
  const data = respondB2bTransferSchema.parse(req.body);
  const { action, to_branch_id, receiver_sku_id, auto_create } = data;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [tr] = await conn.execute(
      "SELECT * FROM b2b_device_transfers WHERE id = ? AND to_business_id = ? AND status = 'pending'",
      [req.params.id, req.user.business_id]
    );
    const transfer = (tr as any[])[0];
    if (!transfer) throw new Error('Pending transfer not found');

    if (action === 'reject') {
      // Revert device back to in_stock for the sender
      await conn.execute("UPDATE devices SET status = 'in_stock' WHERE id = ?", [transfer.device_id]);
      await conn.execute(
        "UPDATE b2b_device_transfers SET status = 'rejected', completed_at = NOW(), accepted_by = ? WHERE id = ?",
        [req.userId, transfer.id]
      );
      await conn.execute(
        'INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
        [transfer.device_id, req.userId, 'B2B Transfer Rejected', `Rejected by target business ${req.user.business_id}`]
      );
    } else {
      // Action is 'accept'
      if (!to_branch_id) throw new Error('Target branch is required to accept transfer');

      let finalSkuId = receiver_sku_id;

      if (!finalSkuId) {
        if (!auto_create) throw new Error('Receiver SKU ID or auto-create details are required');
        
        // Auto-create product and SKU
        // 1. Create product under receiver's business_id
        const [prodResult] = await conn.execute(
          `INSERT INTO products (business_id, name, product_type, allow_overselling) 
           VALUES (?, ?, 'serialized', 1)`,
          [req.user.business_id, auto_create.product_name]
        );
        const newProductId = (prodResult as any).insertId;

        // 2. Create product SKU under receiver's business_id
        const [skuResult] = await conn.execute(
          `INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) 
           VALUES (?, ?, ?, ?)`,
          [newProductId, auto_create.sku_code, transfer.cost_price, auto_create.selling_price]
        );
        finalSkuId = (skuResult as any).insertId;
      }

      // Update the device itself: change ownership
      await conn.execute(
        `UPDATE devices SET 
          business_id = ?, 
          branch_id = ?, 
          sku_id = ?, 
          status = 'in_stock' 
         WHERE id = ?`,
        [req.user.business_id, to_branch_id, finalSkuId, transfer.device_id]
      );

      // Decrement sender branch stock (since device was physically moved out)
      await conn.execute(
        'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, -1) ON DUPLICATE KEY UPDATE quantity = quantity - 1',
        [transfer.from_branch_id, transfer.sender_sku_id]
      );

      // Increment receiver branch stock
      await conn.execute(
        'INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1',
        [to_branch_id, finalSkuId]
      );

      // Log inventory movements for both businesses
      // 1. Outgoing movement for Sender Business
      await conn.execute(
        `INSERT INTO inventory_movements (business_id, branch_id, sku_id, device_id, movement_type, quantity, unit_cost, reference_type, reference_id) 
         VALUES (?, ?, ?, ?, 'b2b_transfer_out', -1, ?, 'b2b_device_transfers', ?)`,
        [transfer.from_business_id, transfer.from_branch_id, transfer.sender_sku_id, transfer.device_id, transfer.cost_price, transfer.id]
      );

      // 2. Incoming movement for Receiver Business
      await conn.execute(
        `INSERT INTO inventory_movements (business_id, branch_id, sku_id, device_id, movement_type, quantity, unit_cost, reference_type, reference_id) 
         VALUES (?, ?, ?, ?, 'b2b_transfer_in', 1, ?, 'b2b_device_transfers', ?)`,
        [req.user.business_id, to_branch_id, finalSkuId, transfer.device_id, transfer.cost_price, transfer.id]
      );

      // Update transfer record
      await conn.execute(
        `UPDATE b2b_device_transfers SET 
          status = 'accepted', 
          to_branch_id = ?, 
          receiver_sku_id = ?, 
          accepted_by = ?, 
          completed_at = NOW() 
         WHERE id = ?`,
        [to_branch_id, finalSkuId, req.userId, transfer.id]
      );

      // Log device activity
      await conn.execute(
        'INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)',
        [transfer.device_id, req.userId, 'B2B Transfer Accepted', `Device accepted by business ID ${req.user.business_id}, branch ID ${to_branch_id}`]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// Payment method update is handled in invoices.ts with business isolation (FINDING-005)

export default router;
