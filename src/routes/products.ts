import { Router } from 'express';
import { pool, query, queryOne, execute, getBranchPrefix } from '../mysql.js';
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
             COALESCE(s.selling_price, p.base_unit_price, 0) as selling_price, s.cost_price, p.product_type,
             c.name as category_name, m.name as manufacturer_name,
             p.id as product_id,
             (SELECT SUM(quantity) FROM branch_stock WHERE sku_id = s.id) as total_stock
      FROM product_skus s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const products = await query(productsSql, [...params, limit, offset]);

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

// GET /api/products/stats
router.get('/stats', async (req: any, res, next) => {
  try {
    const businessId = req.user.business_id;
    const rows = await query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT s.id) as total_skus,
        COALESCE(SUM(bs.quantity), 0) as total_stock
      FROM products p
      JOIN product_skus s ON s.product_id = p.id
      LEFT JOIN branch_stock bs ON bs.sku_id = s.id AND bs.branch_id = ?
      WHERE p.business_id = ? AND p.deleted_at IS NULL AND p.product_type != 'serialized'
    `, [req.user.branch_id, businessId]);
    res.json(rows[0] || { total_products: 0, total_skus: 0, total_stock: 0 });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/products/sample-csv
router.get('/sample-csv', async (req: any, res) => {
  const sampleContent = `"Product Name","Product Type","Category","Brand / Manufacturer","SKU","Barcode","Cost Price","Selling Price","Quantity In Stock","Min Stock Level","Taxable"\n` +
    `"Privacy Tempered Glass / Screen Protector","Standard","Accessories","","GSP05","GSP05",2.50,15.00,25,5,"Yes"\n` +
    `"20W USB-C Power Adapter","Standard","Accessories","Apple","AP-20W-PWR","194252157007",12.00,25.00,10,3,"Yes"\n` +
    `"Silicone Case - Midnight","Standard","Cases","Apple","CASE-IP14-BLK","194253322114",8.00,29.99,15,2,"Yes"\n` +
    `"Screen Replacement Service","Labor/Services","Repairs","","SRV-SCRN","",0.00,65.00,0,0,"No"`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="standard_general_products.csv"');
  res.send(sampleContent);
});

// GET /api/products/export-csv
router.get('/export-csv', async (req: any, res, next) => {
  try {
    const businessId = req.user.business_id;
    const rows = await query(`
      SELECT 
        p.name as product_name,
        CASE 
          WHEN p.product_type = 'stock' THEN 'Standard'
          WHEN p.product_type = 'service' THEN 'Labor/Services'
          ELSE COALESCE(p.product_type, 'Standard')
        END as product_type,
        COALESCE(c.name, '') as category_name,
        COALESCE(m.name, '') as manufacturer_name,
        COALESCE(s.sku_code, '') as sku,
        COALESCE(s.barcode, '') as barcode,
        COALESCE(s.cost_price, 0) as cost_price,
        COALESCE(s.selling_price, 0) as selling_price,
        COALESCE((SELECT SUM(quantity) FROM branch_stock WHERE sku_id = s.id AND branch_id = ?), 0) as quantity,
        COALESCE(p.min_stock_level, 0) as min_stock_level,
        CASE WHEN p.is_taxable = 1 THEN 'Yes' ELSE 'No' END as is_taxable
      FROM product_skus s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE p.business_id = ? AND p.deleted_at IS NULL AND p.product_type != 'serialized'
      ORDER BY p.name ASC
    `, [req.user.branch_id, businessId]);

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).trim();
      return `"${s.replace(/"/g, '""')}"`;
    };

    let csvContent = `"Product Name","Product Type","Category","Brand / Manufacturer","SKU","Barcode","Cost Price","Selling Price","Quantity In Stock","Min Stock Level","Taxable"\n`;
    for (const row of rows) {
      const line = [
        escapeCsv(row.product_name),
        escapeCsv(row.product_type),
        escapeCsv(row.category_name),
        escapeCsv(row.manufacturer_name),
        escapeCsv(row.sku),
        escapeCsv(row.barcode),
        Number(row.cost_price || 0).toFixed(2),
        Number(row.selling_price || 0).toFixed(2),
        Number(row.quantity || 0),
        Number(row.min_stock_level || 0),
        escapeCsv(row.is_taxable)
      ].join(',');
      csvContent += line + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="general_products_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (e: any) {
    console.error('[ExportGeneralProducts] Error:', e.message);
    next(e);
  }
});

// POST /api/products/import-csv
router.post('/import-csv', async (req: any, res, next) => {
  const { products, duplicateHandling = 'overwrite' } = req.body;
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'No product records provided' });
  }

  const businessId = req.user.business_id;
  const branchId = req.user.branch_id || 1;
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

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const prodName = String(p.product_name || p.product || p.name || '').trim();
      const catName = String(p.category_name || p.category || '').trim();
      const mfgName = String(p.manufacturer_name || p.manufacturer || p.brand || '').trim();
      const skuCode = String(p.sku || p.sku_code || '').trim();
      const barcode = String(p.barcode || '').trim();
      const rawType = String(p.product_type || p.type || 'Standard').trim();
      const costPrice = parseFloat(p.cost_price || p.cost || 0) || 0;
      const sellingPrice = parseFloat(p.selling_price || p.price || 0) || 0;
      const qty = parseInt(p.quantity || p.qty || p.qty_sold || p.current_inventory || 0) || 0;
      const minStock = parseInt(p.min_stock_level || p.min_stock || 0) || 0;
      const isTaxableRaw = String(p.is_taxable || p.taxable || 'Yes').trim().toLowerCase();
      const isTaxable = (isTaxableRaw === 'yes' || isTaxableRaw === '1' || isTaxableRaw === 'true') ? 1 : 0;

      if (!prodName) {
        errors.push(`Row ${i + 1}: Skipped - Product Name is required`);
        skipped++;
        continue;
      }

      try {
        // 1. Category
        let categoryId: number | null = null;
        if (catName) {
          const [cr] = await conn.execute(
            'SELECT id FROM categories WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci LIMIT 1',
            [businessId, catName]
          );
          if ((cr as any[]).length > 0) {
            categoryId = (cr as any[])[0].id;
          } else {
            const [ins] = await conn.execute(
              'INSERT INTO categories (business_id, name) VALUES (?, ?)',
              [businessId, catName]
            );
            categoryId = (ins as any).insertId;
          }
        }

        // 2. Manufacturer
        let manufacturerId: number | null = null;
        if (mfgName) {
          const [mr] = await conn.execute(
            'SELECT id FROM manufacturers WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci LIMIT 1',
            [businessId, mfgName]
          );
          if ((mr as any[]).length > 0) {
            manufacturerId = (mr as any[])[0].id;
          } else {
            const [ins] = await conn.execute(
              'INSERT INTO manufacturers (business_id, name) VALUES (?, ?)',
              [businessId, mfgName]
            );
            manufacturerId = (ins as any).insertId;
          }
        }

        // 3. Product Type mapping
        let mappedType = 'stock';
        if (rawType.toLowerCase() === 'labor/services' || rawType.toLowerCase() === 'service') {
          mappedType = 'service';
        } else if (rawType.toLowerCase() === 'mobile devices' || rawType.toLowerCase() === 'serialized') {
          mappedType = 'serialized';
        }

        // 4. Product Lookup / Creation
        const [pr] = await conn.execute(
          'SELECT id FROM products WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci AND deleted_at IS NULL LIMIT 1',
          [businessId, prodName]
        );

        let productId: number;
        let isNewProduct = false;
        if ((pr as any[]).length > 0) {
          productId = (pr as any[])[0].id;
          if (duplicateHandling === 'overwrite') {
            await conn.execute(
              'UPDATE products SET category_id = COALESCE(?, category_id), manufacturer_id = COALESCE(?, manufacturer_id), product_type = ?, min_stock_level = ?, is_taxable = ? WHERE id = ?',
              [categoryId, manufacturerId, mappedType, minStock, isTaxable, productId]
            );
          }
        } else {
          const [ins] = await conn.execute(
            'INSERT INTO products (business_id, category_id, manufacturer_id, name, product_type, min_stock_level, is_taxable, allow_overselling) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
            [businessId, categoryId, manufacturerId, prodName, mappedType, minStock, isTaxable]
          );
          productId = (ins as any).insertId;
          isNewProduct = true;
        }

        // 5. SKU Lookup / Creation
        const effectiveSku = skuCode || `${branchPrefix}-${String(productId).padStart(5, '0')}`;
        const effectiveBarcode = barcode || effectiveSku;

        const [sr] = await conn.execute(
          'SELECT id FROM product_skus WHERE product_id = ? AND (sku_code COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci OR ? = "") LIMIT 1',
          [productId, effectiveSku, skuCode]
        );

        let skuId: number;
        if ((sr as any[]).length > 0) {
          skuId = (sr as any[])[0].id;
          if (duplicateHandling === 'overwrite') {
            await conn.execute(
              'UPDATE product_skus SET sku_code = ?, barcode = COALESCE(NULLIF(?, ""), barcode), cost_price = ?, selling_price = ? WHERE id = ?',
              [effectiveSku, effectiveBarcode, costPrice, sellingPrice, skuId]
            );
            if (!isNewProduct) updated++;
          } else {
            if (!isNewProduct) skipped++;
          }
        } else {
          const [ins] = await conn.execute(
            'INSERT INTO product_skus (product_id, sku_code, barcode, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)',
            [productId, effectiveSku, effectiveBarcode, costPrice, sellingPrice]
          );
          skuId = (ins as any).insertId;
          if (!isNewProduct) updated++;
        }

        // 6. Branch Stock Quantity Update
        if (qty > 0 || isNewProduct) {
          await conn.execute(
            'INSERT INTO branch_stock (sku_id, branch_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)',
            [skuId, branchId, qty]
          );
        }

        if (isNewProduct) {
          imported++;
        }
      } catch (rowErr: any) {
        console.error(`General row ${i + 1} error:`, rowErr.message);
        errors.push(`Row ${i + 1} (${prodName}): ${rowErr.message}`);
      }
    }

    await conn.commit();
    res.json({
      success: true,
      total: products.length,
      imported,
      updated,
      skipped,
      errorsCount: errors.length,
      errors: errors.slice(0, 10)
    });
  } catch (e: any) {
    await conn.rollback();
    console.error('[ImportGeneralProducts] Error:', e.message);
    res.status(500).json({ error: e.message || 'Failed to import general products' });
  } finally {
    conn.release();
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

// GET /api/products/special/get-repair-product
router.get('/special/get-repair-product', async (req: any, res, next) => {
  const businessId = req.user?.business_id;
  const branchId = req.user?.branch_id;
  if (!businessId) return res.status(401).json({ error: 'Business context missing' });

  const findProduct = async () => {
    return await queryOne(`
      SELECT s.id as sku_id, p.id as product_id, p.name as product_name, s.sku_code, s.selling_price
      FROM product_skus s
      JOIN products p ON s.product_id = p.id
      WHERE p.business_id = ? AND p.product_type = 'service' AND p.name = 'Repair Service' AND p.deleted_at IS NULL
      ORDER BY s.id ASC LIMIT 1
    `, [businessId]);
  };

  try {
    let skuInfo = await findProduct();
    if (skuInfo) return res.json(skuInfo);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const [check] = await conn.execute(
        `SELECT s.id as sku_id, p.id as product_id, p.name as product_name, s.sku_code, s.selling_price
         FROM product_skus s
         JOIN products p ON s.product_id = p.id
         WHERE p.business_id = ? AND p.product_type = 'service' AND p.name = 'Repair Service' AND p.deleted_at IS NULL
         ORDER BY s.id ASC LIMIT 1`,
        [businessId]
      );
      if ((check as any[]).length > 0) {
        await conn.rollback();
        return res.json((check as any[])[0]);
      }

      const [pr] = await conn.execute(
        'INSERT INTO products (business_id,name,product_type,allow_overselling) VALUES (?,?,?,?)',
        [businessId, 'Repair Service', 'service', 1]
      );
      const productId = (pr as any).insertId;
      const branchPrefix = await getBranchPrefix(branchId);
      const finalSku = `${branchPrefix}-${String(productId).padStart(5, '0')}`;
      
      const [sr] = await conn.execute(
        'INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)',
        [productId, finalSku, finalSku, 0, 0]
      );
      const skuId = (sr as any).insertId;
      
      await conn.commit();
      
      return res.json({
        sku_id: skuId,
        product_id: productId,
        product_name: 'Repair Service',
        sku_code: finalSku,
        selling_price: 0
      });
    } catch (innerErr: any) {
      await conn.rollback().catch(() => {});
      if (innerErr.code === 'ER_DUP_ENTRY') {
        skuInfo = await findProduct();
        if (skuInfo) return res.json(skuInfo);
      }
      throw innerErr;
    } finally {
      conn.release();
    }
  } catch (e: any) {
    console.error('[RepairProduct] Error:', e.message);
    res.status(500).json({ error: e.message || 'Failed to initialize repair product' });
  }
});

// GET /api/products/serialized-models
router.get('/serialized-models', async (req: any, res, next) => {
  try {
    const businessId = req.user.business_id;
    const { search } = req.query;
    
    let whereClause = 'WHERE p.business_id = ? AND p.deleted_at IS NULL';
    const params: any[] = [businessId];

    const rawSearch = search ? String(search).trim() : '';
    if (rawSearch !== '') {
      const tokens = rawSearch.split(/\s+/).filter(t => t.length > 0);
      if (tokens.length > 0) {
        // AND match for all tokens across name, sku_code, barcode, brand, category
        const tokenConditions = tokens.map(() => 
          '(p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ? OR COALESCE(m.name, \'\') LIKE ? OR COALESCE(c.name, \'\') LIKE ?)'
        ).join(' AND ');
        whereClause += ` AND (${tokenConditions})`;
        tokens.forEach(t => {
          const pattern = `%${t}%`;
          params.push(pattern, pattern, pattern, pattern, pattern);
        });
      }
    } else {
      // On initial load (no search term), return only serialized products or products already having device records
      whereClause += ` AND (LOWER(COALESCE(p.product_type, '')) IN ('serialized', 'serial') OR s.id IN (SELECT DISTINCT sku_id FROM devices WHERE business_id = ?))`;
      params.push(businessId);
    }

    const sql = `
      SELECT DISTINCT s.id as sku_id, p.id as product_id, p.name as product_name, s.sku_code, s.barcode,
             COALESCE(s.selling_price, p.base_unit_price, 0) as selling_price, s.cost_price,
             c.name as category_name, m.name as manufacturer_name,
             p.product_type
      FROM products p
      JOIN product_skus s ON s.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN LOWER(COALESCE(p.product_type, '')) = 'serialized' THEN 1
          WHEN LOWER(COALESCE(p.product_type, '')) = 'serial' THEN 2
          WHEN s.id IN (SELECT DISTINCT sku_id FROM devices WHERE business_id = ${businessId}) THEN 3
          WHEN LOWER(COALESCE(c.name, '')) LIKE '%phone%' OR LOWER(COALESCE(c.name, '')) LIKE '%device%' THEN 4
          ELSE 5
        END,
        p.name ASC
      LIMIT 200
    `;
    
    let models = await query(sql, params);

    // Fallback: if AND tokens yielded no results but there were multiple tokens, try partial OR match
    if ((!models || models.length === 0) && rawSearch !== '') {
      const tokens = rawSearch.split(/\s+/).filter(t => t.length > 0);
      if (tokens.length > 1) {
        let orWhere = 'WHERE p.business_id = ? AND p.deleted_at IS NULL AND (';
        const orConditions = tokens.map(() => 
          '(p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ? OR COALESCE(m.name, \'\') LIKE ? OR COALESCE(c.name, \'\') LIKE ?)'
        ).join(' OR ');
        orWhere += `${orConditions})`;
        const orParams: any[] = [businessId];
        tokens.forEach(t => {
          const pattern = `%${t}%`;
          orParams.push(pattern, pattern, pattern, pattern, pattern);
        });
        const orSql = `
          SELECT DISTINCT s.id as sku_id, p.id as product_id, p.name as product_name, s.sku_code, s.barcode,
                 COALESCE(s.selling_price, p.base_unit_price, 0) as selling_price, s.cost_price,
                 c.name as category_name, m.name as manufacturer_name,
                 p.product_type
          FROM products p
          JOIN product_skus s ON s.product_id = p.id
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
          ${orWhere}
          ORDER BY 
            CASE 
              WHEN LOWER(COALESCE(p.product_type, '')) = 'serialized' THEN 1
              WHEN LOWER(COALESCE(p.product_type, '')) = 'serial' THEN 2
              WHEN s.id IN (SELECT DISTINCT sku_id FROM devices WHERE business_id = ${businessId}) THEN 3
              ELSE 4
            END,
            p.name ASC
          LIMIT 100
        `;
        models = await query(orSql, orParams);
      }
    }

    res.json(models || []);
  } catch (e: any) {
    console.error('[serialized-models] Error:', e.message);
    next(e);
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
    
    await conn.execute('INSERT INTO activity_logs (business_id, branch_id, product_id, user_id, user_name, activity_type, description) VALUES (?,?,?,?,?,?,?)',
      [req.user.business_id, req.user.branch_id, sku.product_id, req.userId, req.user?.name || null, 'Product Updated', detailMsg]);

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
  allow_overselling: z.boolean().optional(),
  min_stock_level: z.number().or(z.string().transform(Number)).optional(),
  is_taxable: z.boolean().optional(),
  require_note: z.boolean().optional(),
  min_sales_price: z.number().or(z.string().transform(Number)).optional(),
  additional_description: z.string().optional(),
  alert_message: z.string().optional()
});

// POST /api/products
router.post('/', async (req: any, res, next) => {
  const data = createProductSchema.parse(req.body);
  const { 
    name, category_id, manufacturer_id, selling_price, cost_price, product_type, sku_code, barcode, allow_overselling,
    min_stock_level, is_taxable, require_note, min_sales_price, additional_description, alert_message 
  } = data;
  const businessId = req.user.business_id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if product with same name already exists
    const [existingByName] = await conn.execute(
      'SELECT id FROM products WHERE business_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND deleted_at IS NULL LIMIT 1',
      [businessId, name]
    );
    if ((existingByName as any[]).length > 0) {
      await conn.rollback();
      return res.status(400).json({ 
        error: 'You already have a product with the same name. Add to inventory instead of creating a new product.' 
      });
    }

    const [pr] = await conn.execute(
      'INSERT INTO products (business_id,name,category_id,manufacturer_id,product_type,allow_overselling,min_stock_level,is_taxable,require_note,min_sales_price,additional_description,alert_message) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        businessId, name, category_id, manufacturer_id, product_type, allow_overselling === false ? 0 : 1,
        min_stock_level ?? null, is_taxable ? 1 : 0, require_note ? 1 : 0, min_sales_price ?? null, additional_description ?? null, alert_message ?? null
      ]
    );
    const productId = (pr as any).insertId;
    const branchPrefix = await getBranchPrefix(req.user.branch_id);
    let finalSku = sku_code?.trim() || `${branchPrefix}-${String(productId).padStart(5, '0')}`;
    const [sr] = await conn.execute(
      'INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)',
      [productId, finalSku, barcode || finalSku, cost_price, selling_price]
    );
    const skuId = (sr as any).insertId;
    await conn.execute('INSERT INTO product_activity (sku_id,user_id,activity,details) VALUES (?,?,?,?)',
      [skuId, req.userId, 'Product Created', `Product "${name}" created with SKU ${finalSku}`]);
    await conn.execute('INSERT INTO activity_logs (business_id, branch_id, product_id, user_id, user_name, activity_type, description) VALUES (?,?,?,?,?,?,?)',
      [businessId, req.user.branch_id, productId, req.userId, req.user?.name || null, 'Product Created', `Product "${name}" created with SKU ${finalSku}`]);
    await conn.commit();
    res.json({ id: skuId });
  } catch (e: any) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY' || e.message?.includes('Duplicate entry')) {
      return res.status(400).json({ error: 'A product with this SKU code already exists' });
    }
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
  const stockQty = parseInt(String(quantity)) || 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if product with same name already exists
    const [existingByName] = await conn.execute(
      'SELECT id FROM products WHERE business_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND deleted_at IS NULL LIMIT 1',
      [businessId, name]
    );
    if ((existingByName as any[]).length > 0) {
      await conn.rollback();
      return res.status(400).json({ 
        error: 'You already have a product with the same name. Add to inventory instead of creating a new product.' 
      });
    }

    // 1. Create Product
    const [pr] = await conn.execute(
      'INSERT INTO products (business_id,name,category_id,manufacturer_id,product_type,allow_overselling) VALUES (?,?,?,?,?,?)',
      [businessId, name, category_id || null, manufacturer_id || null, 'stock', 1]
    );
    const productId = (pr as any).insertId;

    // 2. Create SKU
    const branchPrefix = await getBranchPrefix(activeBranchId);
    let finalSku = sku_code?.trim() || `${branchPrefix}-${String(productId).padStart(5, '0')}`;
    const [sr] = await conn.execute(
      'INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)',
      [productId, finalSku, barcode || finalSku, cost_price || 0, selling_price || 0]
    );
    const skuId = (sr as any).insertId;

    await conn.execute('INSERT INTO product_activity (sku_id,user_id,activity,details) VALUES (?,?,?,?)',
      [skuId, req.userId, 'Product Created', `Product "${name}" quick-added with SKU ${finalSku}`]);
    await conn.execute('INSERT INTO activity_logs (business_id, branch_id, product_id, user_id, user_name, activity_type, description) VALUES (?,?,?,?,?,?,?)',
      [businessId, activeBranchId, productId, req.userId, req.user?.name || null, 'Product Created', `Product "${name}" quick-added with SKU ${finalSku}`]);

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
      SELECT 'product' as source, a.id, a.user_id, a.activity, a.details, a.created_at, COALESCE(u.name, 'System') as user_name 
      FROM product_activity a
      LEFT JOIN users u ON a.user_id = u.id
      JOIN product_skus s ON a.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      WHERE (a.sku_id = ? OR s.product_id = ?) AND p.business_id = ?
      
      UNION ALL

      SELECT 'device' as source, da.id, da.user_id, da.activity, da.details, da.created_at, COALESCE(u.name, 'System') as user_name
      FROM device_activity da
      JOIN devices d ON da.device_id = d.id
      JOIN product_skus s ON d.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN users u ON da.user_id = u.id
      WHERE (s.id = ? OR p.id = ?) AND p.business_id = ?

      UNION ALL

      SELECT 'log' as source, al.id, al.user_id, al.activity_type as activity, al.description as details, al.created_at, COALESCE(al.user_name, u.name, 'System') as user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE (al.product_id = ? OR al.product_id = (SELECT product_id FROM product_skus WHERE id=?))
        AND COALESCE(al.business_id, u.business_id) = ?

      ORDER BY created_at DESC
    `, [
      req.params.id, req.params.id, req.user.business_id,
      req.params.id, req.params.id, req.user.business_id,
      req.params.id, req.params.id, req.user.business_id
    ]);
    res.json(acts);
  } catch (e: any) { next(e); }
});

// GET /api/products/:skuId/devices
router.get('/:skuId/devices', async (req: any, res, next) => {
  try {
    const isSuper = req.user.role === 'superadmin';
    const branchId = req.query.branch_id;
    let filterClause = '';
    const params: any[] = [req.params.skuId, req.params.skuId, req.params.skuId, req.user.business_id];

    if (!isSuper) {
      filterClause = 'AND d.branch_id = ? AND d.user_id = ?';
      params.push(req.user.branch_id, req.userId);
    } else if (branchId && branchId !== 'all') {
      filterClause = 'AND d.branch_id = ?';
      params.push(Number(branchId));
    }

    const devices = await query(`
      SELECT d.id, d.business_id, d.branch_id, d.user_id, d.imei, d.imei_serial, d.color, d.gb, d.ram,
             d.\`condition\`, d.status, d.cost_price, d.selling_price, d.created_at, inv.invoice_number,
             b.name as branch_name, u.name as user_name, p.name as product_name, s.sku_code
      FROM devices d
      LEFT JOIN product_skus s ON d.sku_id = s.id
      LEFT JOIN products p ON (d.product_id = p.id OR s.product_id = p.id)
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN invoice_items ii ON d.id = ii.device_id
      LEFT JOIN invoices inv ON ii.invoice_id = inv.id
      WHERE (d.sku_id = ? OR d.product_id = ? OR s.product_id = ?)
        AND d.business_id = ?
        ${filterClause}
      ORDER BY d.created_at DESC
    `, params);
    res.json(devices);
  } catch (e: any) { next(e); }
});

// GET /api/products/:skuId/available-devices
router.get('/:skuId/available-devices', async (req: any, res, next) => {
  try {
    const isSuper = req.user.role === 'superadmin';
    const branchId = req.query.branch_id;
    let filterClause = '';
    const params: any[] = [req.params.skuId, req.params.skuId, req.params.skuId, req.user.business_id];

    if (!isSuper) {
      filterClause = 'AND d.branch_id = ? AND d.user_id = ?';
      params.push(req.user.branch_id, req.userId);
    } else if (branchId && branchId !== 'all') {
      filterClause = 'AND d.branch_id = ?';
      params.push(Number(branchId));
    }

    const devices = await query(`
      SELECT d.id, d.business_id, d.branch_id, d.user_id, d.imei, d.imei_serial, d.cost_price, d.selling_price, d.status, d.created_at,
             b.name as branch_name, u.name as user_name
      FROM devices d
      LEFT JOIN product_skus s ON d.sku_id = s.id
      LEFT JOIN branches b ON d.branch_id = b.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE (d.sku_id = ? OR d.product_id = ? OR s.product_id = ?)
        AND d.status = 'in_stock'
        AND d.business_id = ?
        ${filterClause}
      ORDER BY d.created_at DESC
    `, params);
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
