import { pool } from '../src/mysql.js';

async function copyCatalog() {
  const conn = await pool.getConnection();
  try {
    const SOURCE_BIZ_ID = 3; // Gadget Repair & Vape shop

    console.log(`1. Reading catalog from Source Business (ID: ${SOURCE_BIZ_ID})...`);
    
    // Fetch source categories
    const [srcCats]: any = await conn.execute(
      'SELECT id, name FROM categories WHERE business_id = ?',
      [SOURCE_BIZ_ID]
    );

    // Fetch source products and skus
    const [srcProds]: any = await conn.execute(
      'SELECT * FROM products WHERE business_id = ? AND deleted_at IS NULL',
      [SOURCE_BIZ_ID]
    );

    const [srcSkus]: any = await conn.execute(`
      SELECT s.*, p.id as prod_id 
      FROM product_skus s 
      JOIN products p ON s.product_id = p.id 
      WHERE p.business_id = ? AND p.deleted_at IS NULL
    `, [SOURCE_BIZ_ID]);

    console.log(`Source Catalog: ${srcCats.length} Categories, ${srcProds.length} Products, ${srcSkus.length} SKUs.`);

    // Group SKUs by product id
    const skusByProduct = new Map<number, any[]>();
    for (const sku of srcSkus) {
      if (!skusByProduct.has(sku.product_id)) {
        skusByProduct.set(sku.product_id, []);
      }
      skusByProduct.get(sku.product_id)!.push(sku);
    }

    // Get all target businesses
    const [targetBusinesses]: any = await conn.execute(
      'SELECT id, name FROM businesses WHERE id != ? AND deleted_at IS NULL',
      [SOURCE_BIZ_ID]
    );

    console.log(`\n2. Copying to ${targetBusinesses.length} Target Businesses...`);

    for (const targetBiz of targetBusinesses) {
      const targetBizId = targetBiz.id;
      console.log(`\n--- Processing [${targetBiz.name}] (ID: ${targetBizId}) ---`);
      
      await conn.beginTransaction();

      // Get target branches
      const [targetBranches]: any = await conn.execute(
        'SELECT id FROM branches WHERE business_id = ? AND deleted_at IS NULL',
        [targetBizId]
      );
      const branchIds = targetBranches.map((b: any) => b.id);
      const defaultBranchId = branchIds[0] || null;

      // 1. Sync Categories
      const categoryMap = new Map<number, number>(); // sourceCatId -> targetCatId
      const [existingTargetCats]: any = await conn.execute(
        'SELECT id, name FROM categories WHERE business_id = ?',
        [targetBizId]
      );
      const targetCatNameMap = new Map<string, number>();
      for (const tc of existingTargetCats) {
        targetCatNameMap.set(tc.name.toLowerCase().trim(), tc.id);
      }

      for (const sc of srcCats) {
        const scNameClean = sc.name.toLowerCase().trim();
        if (targetCatNameMap.has(scNameClean)) {
          categoryMap.set(sc.id, targetCatNameMap.get(scNameClean)!);
        } else {
          const [ins]: any = await conn.execute(
            'INSERT INTO categories (business_id, branch_id, name) VALUES (?, ?, ?)',
            [targetBizId, defaultBranchId, sc.name]
          );
          categoryMap.set(sc.id, ins.insertId);
          targetCatNameMap.set(scNameClean, ins.insertId);
        }
      }

      // 2. Sync Products and SKUs
      const [existingTargetProds]: any = await conn.execute(
        'SELECT id, name FROM products WHERE business_id = ? AND deleted_at IS NULL',
        [targetBizId]
      );
      const targetProdNameMap = new Map<string, number>();
      for (const tp of existingTargetProds) {
        targetProdNameMap.set(tp.name.toLowerCase().trim(), tp.id);
      }

      let copiedProdCount = 0;
      let copiedSkuCount = 0;

      for (const sp of srcProds) {
        const spNameClean = sp.name.toLowerCase().trim();
        let targetProdId: number;

        if (targetProdNameMap.has(spNameClean)) {
          targetProdId = targetProdNameMap.get(spNameClean)!;
        } else {
          const targetCatId = sp.category_id ? (categoryMap.get(sp.category_id) || null) : null;
          const [insProd]: any = await conn.execute(
            `INSERT INTO products (business_id, category_id, manufacturer_id, name, product_type, allow_overselling, sku_barcode, base_unit_price, cost_price, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              targetBizId,
              targetCatId,
              null,
              sp.name,
              sp.product_type || 'stock',
              sp.allow_overselling ? 1 : 0,
              sp.sku_barcode || null,
              sp.base_unit_price || 0,
              sp.cost_price || 0,
              sp.description || null
            ]
          );
          targetProdId = insProd.insertId;
          targetProdNameMap.set(spNameClean, targetProdId);
          copiedProdCount++;
        }

        // Process SKUs for this product
        const skus = skusByProduct.get(sp.id) || [];
        for (const sku of skus) {
          const [existingSku]: any = await conn.execute(
            'SELECT id FROM product_skus WHERE product_id = ?',
            [targetProdId]
          );

          let targetSkuId: number;
          if (existingSku.length > 0) {
            targetSkuId = existingSku[0].id;
          } else {
            let finalSkuCode = sku.sku_code || null;
            if (finalSkuCode) {
              const [codeCheck]: any = await conn.execute('SELECT id FROM product_skus WHERE sku_code = ?', [finalSkuCode]);
              if (codeCheck.length > 0) {
                finalSkuCode = `${finalSkuCode}-B${targetBizId}`;
                const [codeCheck2]: any = await conn.execute('SELECT id FROM product_skus WHERE sku_code = ?', [finalSkuCode]);
                if (codeCheck2.length > 0) {
                  finalSkuCode = `${finalSkuCode}-${Math.floor(100 + Math.random() * 900)}`;
                }
              }
            }

            const [insSku]: any = await conn.execute(
              `INSERT INTO product_skus (product_id, sku_code, barcode, cost_price, selling_price)
               VALUES (?, ?, ?, ?, ?)`,
              [
                targetProdId,
                finalSkuCode,
                sku.barcode || null,
                sku.cost_price || 0,
                sku.selling_price || 0
              ]
            );
            targetSkuId = insSku.insertId;
            copiedSkuCount++;
          }

          // Ensure branch_stock exists with quantity = 0 for each branch
          for (const bId of branchIds) {
            await conn.execute(
              `INSERT IGNORE INTO branch_stock (sku_id, branch_id, quantity) VALUES (?, ?, 0)`,
              [targetSkuId, bId]
            );
          }
        }
      }

      await conn.commit();
      console.log(`✓ [${targetBiz.name}]: Synced ${copiedProdCount} new products and ${copiedSkuCount} new SKUs with 0 stock quantity.`);
    }

    console.log('\n========================================');
    console.log('Product catalog successfully replicated to all businesses with quantity = 0!');
    console.log('Zero impact on existing invoices, sales, customers, or devices.');
    console.log('========================================\n');
  } catch (err: any) {
    await conn.rollback();
    console.error('Migration error:', err);
  } finally {
    conn.release();
    await pool.end();
  }
}

copyCatalog();
