import { Router } from 'express';
import { pool, query, queryOne, execute } from '../mysql.js';
import { z } from 'zod';

const router = Router();

// GET /api/products
router.get('/', async (req: any, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { search, category_id, manufacturer_id, product_type } = req.query;

    let whereClause = 'WHERE p.deleted_at IS NULL AND p.business_id = ?';
    const params: any[] = [req.user.business_id];

    if (search && String(search).trim() !== '') {
      whereClause += ' AND (p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ?)';
      const term = `%${String(search).trim()}%`;
      params.push(term, term, term);
    }

    if (category_id && String(category_id).trim() !== '' && category_id !== 'All Categories') {
      whereClause += ' AND p.category_id = ?';
      params.push(parseInt(category_id as string));
    }

    if (manufacturer_id && String(manufacturer_id).trim() !== '' && manufacturer_id !== 'All Manufacturers') {
      whereClause += ' AND p.manufacturer_id = ?';
      params.push(parseInt(manufacturer_id as string));
    }

    if (product_type && String(product_type).trim() !== '' && product_type !== 'All Types' && product_type !== 'All Products') {
      whereClause += ' AND p.product_type = ?';
      params.push(String(product_type).trim());
    }

    const countSql = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM product_skus s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      ${whereClause}
    `;
    const countRes = await query(countSql, params);
    const total = countRes[0]?.total || 0;

    const productsSql = `
      SELECT s.id, p.name as product_name, s.sku_code, s.barcode,
             s.selling_price, s.cost_price, p.product_type,
             c.name as category_name, m.name as manufacturer_name,
             p.id as product_id,
             (SELECT SUM(quantity) FROM branch_stock WHERE sku_id = s.id) as total_stock
      FROM product_skus s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const products = await query(productsSql, params);

    const mapped = products.map((p: any) => ({
      ...p,
      name: p.product_name + (p.sku_code ? ` (${p.sku_code})` : '')
    }));

    res.json({
      products: mapped,
      total,
      page,
      limit
    });
  } catch (e: any) { 
    console.error('[GetProducts] Error:', e.message);
    next(e); 
  }
});



// GET /api/products/special/get-deposit-product
// SENIOR: Implementation using a robust 'Find-or-Create' pattern to handle race conditions
router.get('/special/get-deposit-product', async (req: any, res, next) => {
  const businessId = req.user?.business_id;
  if (!businessId) return res.status(401).json({ error: 'Business context missing' });

  const depositSkuCode = `DEPOSIT-WALLET-${businessId}`;
  
  const findProduct = async () => {
    return await queryOne(`
      SELECT s.id as sku_id, p.id as product_id, p.name as product_name, s.sku_code, s.selling_price
      FROM product_skus s
      JOIN products p ON s.product_id = p.id
      WHERE s.sku_code = ? AND p.business_id = ?
    `, [depositSkuCode, businessId]);
  };

  try {
    // 1. Initial attempt to find existing
    let skuInfo = await findProduct();
    if (skuInfo) return res.json(skuInfo);

    // 2. Not found, attempt creation with atomic transaction
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // Re-verify inside transaction to be safe against race conditions
      const [check] = await conn.execute('SELECT id FROM product_skus WHERE sku_code = ?', [depositSkuCode]);
      if ((check as any[]).length > 0) {
        await conn.rollback();
        skuInfo = await findProduct();
        return res.json(skuInfo);
      }

      const [pr] = await conn.execute(
        'INSERT INTO products (business_id,name,product_type,allow_overselling) VALUES (?,?,?,?)',
        [businessId, 'Wallet Deposit', 'service', 1]
      );
      const productId = (pr as any).insertId;
      
      const [sr] = await conn.execute(
        'INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)',
        [productId, depositSkuCode, depositSkuCode, 0, 0]
      );
      const skuId = (sr as any).insertId;
      
      await conn.commit();
      
      return res.json({
        sku_id: skuId,
        product_id: productId,
        product_name: 'Wallet Deposit',
        sku_code: depositSkuCode,
        selling_price: 0
      });
    } catch (innerErr: any) {
      await conn.rollback().catch(() => {});
      // If insertion failed due to duplicate (someone else created it just now)
      if (innerErr.code === 'ER_DUP_ENTRY') {
        skuInfo = await findProduct();
        if (skuInfo) return res.json(skuInfo);
      }
      throw innerErr;
    } finally {
      conn.release();
    }
  } catch (e: any) {
    console.error('[DepositProduct] Error:', e.message);
    res.status(500).json({ error: e.message || 'Failed to initialize deposit product' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req: any, res, next) => {
  try {
    const businessId = req.user.business_id;
    const product = await queryOne(`
      SELECT s.id, p.name as product_name, s.sku_code, s.barcode,
             s.selling_price, s.cost_price, p.product_type, p.allow_overselling,
             c.name as category_name, m.name as manufacturer_name,
             p.id as product_id, p.category_id, p.manufacturer_id
      FROM product_skus s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE s.id = ? AND p.business_id = ?
    `, [req.params.id, businessId]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const stock = await query(`
      SELECT b.name as branch_name, b.id as branch_id, COALESCE(bs.quantity,0) as quantity
      FROM branches b
      LEFT JOIN branch_stock bs ON b.id = bs.branch_id AND bs.sku_id = ?
      WHERE b.business_id = ?
    `, [req.params.id, businessId]);
    res.json({ ...product, stock });
  } catch (e: any) { next(e); }
});

// PUT /api/products/:id
router.put('/:id', async (req: any, res, next) => {
  const { product_name, category_id, manufacturer_id, sku_code, barcode, selling_price, cost_price, product_type } = req.body;
  const skuId = req.params.id;
  const businessId = req.user.business_id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [skuRows] = await conn.execute('SELECT s.*, p.business_id FROM product_skus s JOIN products p ON s.product_id = p.id WHERE s.id = ? AND p.business_id = ?', [skuId, businessId]);
    const sku = (skuRows as any[])[0];
    if (!sku) throw new Error('Product not found in your business catalog');
    await conn.execute('UPDATE product_skus SET sku_code=?,barcode=?,selling_price=?,cost_price=? WHERE id=?',
      [sku_code, barcode, selling_price, cost_price, skuId]);
    await conn.execute('UPDATE products SET name=?,category_id=?,manufacturer_id=?,product_type=? WHERE id=?',
      [product_name, category_id, manufacturer_id, product_type, sku.product_id]);
    
    const changes: string[] = [];
    if (product_name !== sku.product_name) changes.push(`Name: ${sku.product_name} -> ${product_name}`);
    if (selling_price != sku.selling_price) changes.push(`Price: ${sku.selling_price} -> ${selling_price}`);
    if (cost_price != sku.cost_price) changes.push(`Cost: ${sku.cost_price} -> ${cost_price}`);
    if (sku_code !== sku.sku_code) changes.push(`SKU: ${sku.sku_code} -> ${sku_code}`);

    const detailMsg = changes.length > 0 ? changes.join(', ') : 'Details updated';

    await conn.execute('INSERT INTO product_activity (sku_id,user_id,activity,details) VALUES (?,?,?,?)',
      [skuId, req.userId, 'Product Updated', detailMsg]);
    
    await conn.execute('INSERT INTO activity_logs (product_id,user_id,activity_type,description) VALUES (?,?,?,?)',
      [skuId, req.userId, 'Product Updated', detailMsg]);

    await conn.commit();
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    next(e);
  } finally { conn.release(); }
});

const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category_id: z.number().nullable().optional(),
  manufacturer_id: z.number().nullable().optional(),
  selling_price: z.number().or(z.string().transform(Number)).optional(),
  cost_price: z.number().or(z.string().transform(Number)).optional(),
  product_type: z.string().optional(),
  sku_code: z.string().optional(),
  barcode: z.string().optional(),
  allow_overselling: z.boolean().optional()
});

// POST /api/products
router.post('/', async (req: any, res, next) => {
  const data = createProductSchema.parse(req.body);
  const { name, category_id, manufacturer_id, selling_price, cost_price, product_type, sku_code, barcode, allow_overselling } = data;
  const businessId = req.user.business_id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [pr] = await conn.execute(
      'INSERT INTO products (business_id,name,category_id,manufacturer_id,product_type,allow_overselling) VALUES (?,?,?,?,?,?)',
      [businessId, name, category_id, manufacturer_id, product_type, allow_overselling === false ? 0 : 1]
    );
    const productId = (pr as any).insertId;
    let finalSku = sku_code?.trim() || ('SKU-' + Math.random().toString(36).substring(2, 9).toUpperCase());
    const [sr] = await conn.execute(
      'INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)',
      [productId, finalSku, barcode || finalSku, cost_price, selling_price]
    );
    const skuId = (sr as any).insertId;
    await conn.execute('INSERT INTO product_activity (sku_id,user_id,activity,details) VALUES (?,?,?,?)',
      [skuId, req.userId, 'Product Created', `Product "${name}" created with SKU ${finalSku}`]);
    await conn.execute('INSERT INTO activity_logs (product_id,user_id,activity_type,description) VALUES (?,?,?,?)',
      [skuId, req.userId, 'Product Created', `Product "${name}" created with SKU ${finalSku}`]);
    await conn.commit();
    res.json({ id: skuId });
  } catch (e: any) {
    await conn.rollback();
    next(e);
  } finally { conn.release(); }
});

const quickAddSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category_id: z.number().nullable().optional(),
  manufacturer_id: z.number().nullable().optional(),
  selling_price: z.number().or(z.string().transform(Number)).optional(),
  cost_price: z.number().or(z.string().transform(Number)).optional(),
  sku_code: z.string().optional(),
  barcode: z.string().optional(),
  branch_id: z.number().optional(),
  quantity: z.number().or(z.string().transform(Number)).optional()
});

// POST /api/products/quick-add
router.post('/quick-add', async (req: any, res, next) => {
  const data = quickAddSchema.parse(req.body);
  const { name, category_id, manufacturer_id, selling_price, cost_price, sku_code, barcode, branch_id, quantity } = data;
  const businessId = req.user.business_id;
  const activeBranchId = branch_id || req.user.branch_id;
  const stockQty = parseInt(quantity) || 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Create Product
    const [pr] = await conn.execute(
      'INSERT INTO products (business_id,name,category_id,manufacturer_id,product_type,allow_overselling) VALUES (?,?,?,?,?,?)',
      [businessId, name, category_id || null, manufacturer_id || null, 'stock', 1]
    );
    const productId = (pr as any).insertId;

    // 2. Create SKU
    let finalSku = sku_code?.trim() || ('SKU-' + Math.random().toString(36).substring(2, 9).toUpperCase());
    const [sr] = await conn.execute(
      'INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)',
      [productId, finalSku, barcode || finalSku, cost_price || 0, selling_price || 0]
    );
    const skuId = (sr as any).insertId;

    await conn.execute('INSERT INTO product_activity (sku_id,user_id,activity,details) VALUES (?,?,?,?)',
      [skuId, req.userId, 'Product Created', `Product "${name}" quick-added with SKU ${finalSku}`]);
    await conn.execute('INSERT INTO activity_logs (product_id,user_id,activity_type,description) VALUES (?,?,?,?)',
      [skuId, req.userId, 'Product Created', `Product "${name}" quick-added with SKU ${finalSku}`]);

    // 3. Add Stock if quantity > 0
    if (stockQty > 0) {
      await conn.execute(
        'INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)',
        [activeBranchId, skuId, stockQty]
      );
      await conn.execute(
        "INSERT INTO inventory_movements (business_id,branch_id,sku_id,movement_type,quantity,unit_cost,reference_type,reference_id) VALUES (?,?,?,?,?,?,?,?)",
        [businessId, activeBranchId, skuId, 'adjustment', stockQty, cost_price || 0, 'quick_add', skuId]
      );
    }

    // 4. Fetch the full product to return to the cart
    const [prodRows] = await conn.execute(`
      SELECT s.id, p.name as product_name, s.sku_code, s.barcode,
             s.selling_price, s.cost_price, p.product_type, p.allow_overselling,
             c.name as category_name, m.name as manufacturer_name,
             p.id as product_id, p.category_id, p.manufacturer_id,
             (SELECT SUM(quantity) FROM branch_stock WHERE sku_id = s.id) as total_stock
      FROM product_skus s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE s.id = ? AND p.business_id = ?
    `, [skuId, businessId]);

    await conn.commit();

    const fullProduct = (prodRows as any[])[0];
    res.json(fullProduct);
  } catch (e: any) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req: any, res, next) => {
  try {
    const businessId = req.user.business_id;
    await execute('UPDATE products SET deleted_at=NOW() WHERE business_id=? AND id=(SELECT product_id FROM product_skus WHERE id=?)', [businessId, req.params.id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// GET /api/products/:id/activity
router.get('/:id/activity', async (req: any, res, next) => {
  try {
    const acts = await query(`
      SELECT a.*, u.name as user_name FROM product_activity a
      LEFT JOIN users u ON a.user_id = u.id
      JOIN product_skus s ON a.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      WHERE a.sku_id = ? AND p.business_id = ? ORDER BY a.created_at DESC
    `, [req.params.id, req.user.business_id]);
    res.json(acts);
  } catch (e: any) { next(e); }
});

// GET /api/products/:skuId/devices
router.get('/:skuId/devices', async (req: any, res, next) => {
  try {
    const devices = await query(`
      SELECT d.id, d.imei, d.color, d.gb, d.\`condition\`, d.status, d.created_at, inv.invoice_number
      FROM devices d
      LEFT JOIN invoice_items ii ON d.id = ii.device_id
      LEFT JOIN invoices inv ON ii.invoice_id = inv.id
      WHERE d.sku_id = ? AND d.business_id = ? ORDER BY d.created_at DESC
    `, [req.params.skuId, req.user.business_id]);
    res.json(devices);
  } catch (e: any) { next(e); }
});

// GET /api/products/:skuId/available-devices
router.get('/:skuId/available-devices', async (req: any, res, next) => {
  try {
    const devices = await query(
      `SELECT id,imei,cost_price,status,created_at FROM devices WHERE sku_id=? AND status='in_stock' AND business_id=?`,
      [req.params.skuId, req.user.business_id]
    );
    res.json(devices);
  } catch (e: any) { next(e); }
});

// GET /api/categories
router.get('/categories/all', async (req: any, res, next) => {
  try { res.json(await query('SELECT * FROM categories WHERE business_id=?', [req.user.business_id])); }
  catch (e: any) { next(e); }
});

// GET /api/manufacturers
router.get('/manufacturers/all', async (req: any, res, next) => {
  try { res.json(await query('SELECT * FROM manufacturers WHERE business_id=?', [req.user.business_id])); }
  catch (e: any) { next(e); }
});

export default router;
