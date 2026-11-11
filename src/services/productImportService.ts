import mysql from 'mysql2/promise';
import { withTransaction } from '../repositories/baseRepository.js';
import { ImportProductItem } from '../validators/schemas.js';

interface IdRow extends mysql.RowDataPacket {
  id: number;
}

/**
 * Imports an array of products, categories, manufacturers, SKUs, and branch stock
 * inside a single atomic ACID database transaction.
 */
export async function importProductsBatch(
  businessId: number,
  branchId: number | null | undefined,
  products: ImportProductItem[]
): Promise<void> {
  const effectiveBranchId = branchId || 1;

  await withTransaction(async (conn) => {
    for (const p of products) {
      let categoryId: number | null = null;
      if (p.category_name) {
        const [cr] = await conn.execute<IdRow[]>(
          'SELECT id FROM categories WHERE business_id=? AND name=?',
          [businessId, p.category_name]
        );
        if (cr.length > 0) {
          categoryId = cr[0].id;
        } else {
          const [ins] = await conn.execute<mysql.ResultSetHeader>(
            'INSERT INTO categories (business_id,name) VALUES (?,?)',
            [businessId, p.category_name]
          );
          categoryId = ins.insertId;
        }
      }

      let manufacturerId: number | null = null;
      if (p.manufacturer_name) {
        const [mr] = await conn.execute<IdRow[]>(
          'SELECT id FROM manufacturers WHERE business_id=? AND name=?',
          [businessId, p.manufacturer_name]
        );
        if (mr.length > 0) {
          manufacturerId = mr[0].id;
        } else {
          const [ins] = await conn.execute<mysql.ResultSetHeader>(
            'INSERT INTO manufacturers (business_id,name) VALUES (?,?)',
            [businessId, p.manufacturer_name]
          );
          manufacturerId = ins.insertId;
        }
      }

      let productType = 'stock';
      if (p.product_type === 'Mobile Devices') productType = 'serialized';
      else if (p.product_type === 'Labor/Services') productType = 'service';

      const allowOverselling =
        p.allow_overselling === 'Yes' || p.allow_overselling === true || p.allow_overselling === 1 ? 1 : 0;

      const [pr] = await conn.execute<IdRow[]>(
        'SELECT id FROM products WHERE business_id=? AND name=?',
        [businessId, p.product_name]
      );
      let productId: number;
      if (pr.length > 0) {
        productId = pr[0].id;
        await conn.execute(
          'UPDATE products SET category_id=?,manufacturer_id=?,product_type=?,allow_overselling=? WHERE id=?',
          [categoryId, manufacturerId, productType, allowOverselling, productId]
        );
      } else {
        const [ins] = await conn.execute<mysql.ResultSetHeader>(
          'INSERT INTO products (business_id,category_id,manufacturer_id,name,product_type,allow_overselling) VALUES (?,?,?,?,?,?)',
          [businessId, categoryId, manufacturerId, p.product_name, productType, allowOverselling]
        );
        productId = ins.insertId;
      }

      const costPrice = parseFloat(String(p.cost_price)) || 0;
      const sellingPrice = parseFloat(String(p.selling_price)) || 0;

      const [sr] = await conn.execute<IdRow[]>(
        'SELECT id FROM product_skus WHERE product_id=? AND sku_code=?',
        [productId, p.sku]
      );
      let skuId: number;
      if (sr.length > 0) {
        skuId = sr[0].id;
        await conn.execute(
          'UPDATE product_skus SET cost_price=?,selling_price=? WHERE id=?',
          [costPrice, sellingPrice, skuId]
        );
      } else {
        const [ins] = await conn.execute<mysql.ResultSetHeader>(
          'INSERT INTO product_skus (product_id,sku_code,cost_price,selling_price) VALUES (?,?,?,?)',
          [productId, p.sku, costPrice, sellingPrice]
        );
        skuId = ins.insertId;
      }

      const quantity = parseInt(String(p.current_inventory), 10) || 0;
      await conn.execute(
        'INSERT INTO branch_stock (sku_id,branch_id,quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)',
        [skuId, effectiveBranchId, quantity]
      );
    }
  });
}
