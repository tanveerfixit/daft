import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import { ZodError } from 'zod';
import { env } from './src/config/env.js';
import { initSchema, seedData, ensureSuperAdmin } from './src/mysql.js';
import { requireAuthAsync } from './src/routes/auth.js';
import { securityHeadersMiddleware } from './src/middleware/security.js';
import { handleImportProducts } from './src/controllers/productImportController.js';

dotenv.config();

function logError(message: string, error: unknown): void {
  const errObj = error instanceof Error ? error : new Error(String(error));
  const entry = `[${new Date().toISOString()}] ${message}: ${errObj.message}\n${errObj.stack || ''}\n\n`;
  try {
    fs.appendFileSync('server_errors.log', entry);
  } catch {
    // Ignore file logging errors on read-only filesystems
  }
}

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Unhandled Rejection]', reason);
  logError('Unhandled Promise Rejection', reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[Uncaught Exception]', err);
  logError('Uncaught Exception', err);
});

async function startServer(): Promise<void> {
  // ─── Init MySQL ───────────────────────────────────────────────────────────
  try {
    await initSchema();
    await seedData();
    await ensureSuperAdmin();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[MySQL] Failed to initialise on startup:', msg);
    logError('MySQL init failed on startup', err);
    // Keep server running so LiteSpeed / Hostinger does not drop with a 503 error
  }

  const app = express();
  const PORT = env.PORT;

  app.use(securityHeadersMiddleware);
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

  // ─── Health Check & Diagnostics ───────────────────────────────────────────
  app.get('/api/health', async (_req, res) => {
    try {
      const { pool, ensureConnectedPool } = await import('./src/mysql.js');
      await ensureConnectedPool();
      await pool.query('SELECT 1 as ok');
      res.json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (err: unknown) {
      const errObj = err as { message?: string; code?: string };
      res.status(500).json({
        status: 'error',
        database: 'disconnected',
        error: env.NODE_ENV === 'production' ? 'Database unavailable' : errObj?.message,
        code: errObj?.code,
        timestamp: new Date().toISOString()
      });
    }
  });

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

  // Top-level inventory routes (/api/devices, /api/repairs, /api/transfers, /api/purchase-orders)
  app.use('/api', inventoryRouter);

  // ─── Import Products (Clean Architecture Controller -> Service) ───────────
  app.post('/api/import-products', requireAuthAsync, handleImportProducts);

  // ─── Production Static Files / Vite Dev Middleware ────────────────────────
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.join(__dirname, 'dist');
  const distIndex = path.join(distDir, 'index.html');

  if (fs.existsSync(distIndex) || env.NODE_ENV === 'production') {
    // Serve pre-built static assets from 'dist' (always used on Hostinger)
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
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
    } catch (viteErr: unknown) {
      const msg = viteErr instanceof Error ? viteErr.message : String(viteErr);
      console.warn('[Vite] Dev middleware not available, falling back to static files:', msg);
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(distIndex);
      });
    }
  }

  // ─── Global Error Handler ─────────────────────────────────────────────────
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError || err?.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: err.errors || err.issues
      });
    }

    logError('Unhandled API Error', err);
    console.error('[Global Error Handler]', err);

    const isDbError = Boolean(
      err?.code &&
      typeof err.code === 'string' &&
      (err.code.startsWith('ER_') ||
        ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(err.code))
    );

    const safeMessage = isDbError
      ? 'Database operation failed'
      : (err?.message || 'Internal Server Error');

    res.status(500).json({
      error: safeMessage,
      ...(env.NODE_ENV !== 'production' ? { details: err?.message, code: err?.code } : {})
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server running on port ${PORT}`);
  });
}

startServer().catch((err: unknown) => {
  logError('Server startup failed', err);
  console.error('Fatal startup error:', err);

  // Emergency fallback server to avoid LiteSpeed 503
  try {
    const fallbackApp = express();
    const fallbackPort = Number(process.env.PORT) || 3000;
    fallbackApp.get('*', (_req, res) => {
      res.status(503).json({
        error: 'Application starting or database unavailable',
        details: err instanceof Error ? err.message : String(err)
      });
    });
    fallbackApp.listen(fallbackPort, '0.0.0.0', () => {
      console.log(`Fallback server active on port ${fallbackPort}`);
    });
  } catch {
    // Ignore fallback port binding error
  }
});
