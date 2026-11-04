import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import { ZodError } from 'zod';
import { initSchema, seedData, ensureSuperAdmin } from './src/mysql.js';
import { requireAuthAsync } from './src/routes/auth.js';

dotenv.config();

function logError(message: string, error: any) {
  const entry = `[${new Date().toISOString()}] ${message}: ${error?.message}\n${error?.stack}\n\n`;
  fs.appendFileSync('server_errors.log', entry);
}

async function startServer() {
  // ─── Init MySQL ───────────────────────────────────────────────────────────
  try {
    await initSchema();
    await seedData();
    await ensureSuperAdmin();
  } catch (err: any) {
    console.error('[MySQL] Failed to initialise on startup:', err.message);
    logError('MySQL init failed on startup', err);
    // Keep server running so LiteSpeed / Hostinger does not drop with a 503 error
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json({ limit: '10mb' }));

  // ─── Import Route Modules ─────────────────────────────────────────────────
  const { default: authRouter, adminRouter } = await import('./src/routes/auth.js');
  const { default: publicRouter } = await import('./src/routes/public.js');
  const { default: productsRouter } = await import('./src/routes/products.js');
  const { default: customersRouter } = await import('./src/routes/customers.js');
  const { default: invoicesRouter } = await import('./src/routes/invoices.js');
  const { default: reportsRouter } = await import('./src/routes/reports.js');
  const { default: settingsRouter } = await import('./src/routes/settings.js');
  const { default: inventoryRouter } = await import('./src/routes/inventory.js');

  // ─── Public Auth Routes (no auth required) ────────────────────────────────
  app.use('/api/auth', authRouter);
  app.use('/api/public', publicRouter);

  // ─── Protected API Routes (auth required for everything below) ───────────
  app.use('/api', requireAuthAsync);

  // ─── Admin Routes (have requireAdminAsync inside each handler) ────────────
  app.use('/api/admin', adminRouter);

  // ─── Resource Routes ──────────────────────────────────────────────────────
  app.use('/api/products', productsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/invoices', invoicesRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/inventory', inventoryRouter);

  // Settings-style routes (flat /api/settings, /api/company, etc.)
  app.use('/api', settingsRouter);

  // Top-level inventory routes
  app.use('/api', inventoryRouter);

  // ─── Import Products ──────────────────────────────────────────────────────
  app.post('/api/import-products', requireAuthAsync, async (req: any, res, next) => {
    const { products } = req.body;
    const businessId = req.user.business_id;
    const { pool } = await import('./src/mysql.js');
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const p of products) {
        let categoryId: any = null;
        if (p.category_name) {
          const [cr] = await conn.execute('SELECT id FROM categories WHERE business_id=? AND name=?', [businessId, p.category_name]);
          if ((cr as any[]).length) { categoryId = (cr as any[])[0].id; }
          else { const [ins] = await conn.execute('INSERT INTO categories (business_id,name) VALUES (?,?)', [businessId, p.category_name]); categoryId = (ins as any).insertId; }
        }
        let manufacturerId: any = null;
        if (p.manufacturer_name) {
          const [mr] = await conn.execute('SELECT id FROM manufacturers WHERE business_id=? AND name=?', [businessId, p.manufacturer_name]);
          if ((mr as any[]).length) { manufacturerId = (mr as any[])[0].id; }
          else { const [ins] = await conn.execute('INSERT INTO manufacturers (business_id,name) VALUES (?,?)', [businessId, p.manufacturer_name]); manufacturerId = (ins as any).insertId; }
        }
        let productType = 'stock';
        if (p.product_type === 'Mobile Devices') productType = 'serialized';
        else if (p.product_type === 'Labor/Services') productType = 'service';

        const [pr] = await conn.execute('SELECT id FROM products WHERE business_id=? AND name=?', [businessId, p.product_name]);
        let productId: any;
        if ((pr as any[]).length) {
          productId = (pr as any[])[0].id;
          await conn.execute('UPDATE products SET category_id=?,manufacturer_id=?,product_type=?,allow_overselling=? WHERE id=?',
            [categoryId, manufacturerId, productType, p.allow_overselling === 'Yes' ? 1 : 0, productId]);
        } else {
          const [ins] = await conn.execute(
            'INSERT INTO products (business_id,category_id,manufacturer_id,name,product_type,allow_overselling) VALUES (?,?,?,?,?,?)',
            [businessId, categoryId, manufacturerId, p.product_name, productType, p.allow_overselling === 'Yes' ? 1 : 0]
          );
          productId = (ins as any).insertId;
        }
        const [sr] = await conn.execute('SELECT id FROM product_skus WHERE product_id=? AND sku_code=?', [productId, p.sku]);
        let skuId: any;
        if ((sr as any[]).length) {
          skuId = (sr as any[])[0].id;
          await conn.execute('UPDATE product_skus SET cost_price=?,selling_price=? WHERE id=?',
            [parseFloat(p.cost_price) || 0, parseFloat(p.selling_price) || 0, skuId]);
        } else {
          const [ins] = await conn.execute(
            'INSERT INTO product_skus (product_id,sku_code,cost_price,selling_price) VALUES (?,?,?,?)',
            [productId, p.sku, parseFloat(p.cost_price) || 0, parseFloat(p.selling_price) || 0]
          );
          skuId = (ins as any).insertId;
        }
        const quantity = parseInt(p.current_inventory) || 0;
        await conn.execute(
          'INSERT INTO branch_stock (sku_id,branch_id,quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)',
          [skuId, req.user.branch_id, quantity]
        );
      }
      await conn.commit();
      res.json({ success: true });
    } catch (e: any) {
      await conn.rollback();
      next(e);
    } finally { conn.release(); }
  });

  // ─── Production Static Files / Vite Dev Middleware ────────────────────────
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.join(__dirname, 'dist');
  const distIndex = path.join(distDir, 'index.html');

  if (fs.existsSync(distIndex) || process.env.NODE_ENV === 'production') {
    // Serve pre-built static assets from 'dist' (always used on Hostinger)
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      res.sendFile(distIndex);
    });
  } else {
    // Development mode fallback with Vite
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr: any) {
      console.warn('[Vite] Dev middleware not available, falling back to static files:', viteErr?.message);
      app.use(express.static(distDir));
      app.get('*', (req, res) => {
        res.sendFile(distIndex);
      });
    }
  }

  // ─── Global Error Handler ─────────────────────────────────────────────────
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: (err as any).errors || (err as any).issues });
    }
    
    logError('Unhandled API Error', err);
    console.error('[Global Error Handler]', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  logError('Server startup failed', err);
  console.error('Fatal startup error:', err);
  
  // Emergency fallback server to avoid LiteSpeed 503
  try {
    const fallbackApp = express();
    const fallbackPort = Number(process.env.PORT) || 3000;
    fallbackApp.get('*', (_req, res) => {
      res.status(503).json({
        error: 'Application starting or database unavailable',
        details: err?.message || String(err)
      });
    });
    fallbackApp.listen(fallbackPort, '0.0.0.0', () => {
      console.log(`Fallback server active on port ${fallbackPort}`);
    });
  } catch {}
});
