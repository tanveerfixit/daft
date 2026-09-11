import { Router } from 'express';
import { pool, query, queryOne, execute, syncBusinessTimezone, resolveTimezoneOffset } from '../mysql.js';
import { z } from 'zod';

const router = Router();

// ─── Settings ────────────────────────────────────────────────────────────────

router.get('/settings', async (req: any, res, next) => {
  try {
    let s = await queryOne('SELECT * FROM settings WHERE business_id=?', [req.user.business_id]);
    if (!s) {
      await execute('INSERT INTO settings (business_id) VALUES (?)', [req.user.business_id]);
      s = await queryOne('SELECT * FROM settings WHERE business_id=?', [req.user.business_id]);
    }

    const tzInfo = await syncBusinessTimezone(req.user.business_id, s?.timezone);
    const timeRows = await query('SELECT NOW() as mysql_now, @@session.time_zone as session_tz');
    const timeRow = timeRows?.[0] as any;

    res.json({
      ...(s || {}),
      active_offset: tzInfo.offset,
      active_iana: tzInfo.ianaTz,
      mysql_now: timeRow?.mysql_now,
      session_tz: timeRow?.session_tz
    });
  } catch (e: any) { next(e); }
});

const settingsSchema = z.object({
  currency: z.string().optional(),
  timezone: z.string().optional(),
  date_format: z.string().optional(),
  time_format: z.string().optional(),
  language: z.string().optional(),
  startup_cash_popup: z.boolean().optional(),
  low_stock_popup: z.boolean().optional(),
  announcements_popup: z.boolean().optional(),
  sound_notifications: z.boolean().optional(),
  daily_eod_popup: z.boolean().optional(),
});

router.post('/settings', async (req: any, res, next) => {
  const data = settingsSchema.parse(req.body);
  const { currency, timezone, date_format, time_format, language, startup_cash_popup, low_stock_popup, announcements_popup, sound_notifications, daily_eod_popup } = data;
  try {
    let s = await queryOne('SELECT id FROM settings WHERE business_id=?', [req.user.business_id]);
    if (!s) {
      await execute('INSERT INTO settings (business_id) VALUES (?)', [req.user.business_id]);
    }
    await execute(`
      UPDATE settings SET 
        currency = COALESCE(?, currency),
        timezone = COALESCE(?, timezone),
        date_format = COALESCE(?, date_format),
        time_format = COALESCE(?, time_format),
        language = COALESCE(?, language),
        startup_cash_popup = COALESCE(?, startup_cash_popup),
        low_stock_popup = COALESCE(?, low_stock_popup),
        announcements_popup = COALESCE(?, announcements_popup),
        sound_notifications = COALESCE(?, sound_notifications),
        daily_eod_popup = COALESCE(?, daily_eod_popup)
      WHERE business_id = ?
    `, [
      currency || '€, Euro', timezone, date_format, time_format, language,
      startup_cash_popup !== undefined ? (startup_cash_popup ? 1 : 0) : null,
      low_stock_popup !== undefined ? (low_stock_popup ? 1 : 0) : null,
      announcements_popup !== undefined ? (announcements_popup ? 1 : 0) : null,
      sound_notifications !== undefined ? (sound_notifications ? 1 : 0) : null,
      daily_eod_popup !== undefined ? (daily_eod_popup ? 1 : 0) : null,
      req.user.business_id
    ]);

    let tzInfo = { ianaTz: 'Europe/Dublin', offset: '+01:00' };
    if (timezone) {
      tzInfo = await syncBusinessTimezone(req.user.business_id, timezone);
    }

    res.json({ success: true, ...tzInfo });
  } catch (e: any) { next(e); }
});

const popupSettingsSchema = z.object({
  startup_cash_popup: z.boolean().optional(),
  low_stock_popup: z.boolean().optional(),
  announcements_popup: z.boolean().optional(),
  sound_notifications: z.boolean().optional(),
  daily_eod_popup: z.boolean().optional(),
});

router.post('/settings/popups', async (req: any, res, next) => {
  const data = popupSettingsSchema.parse(req.body);
  try {
    let s = await queryOne('SELECT id FROM settings WHERE business_id=?', [req.user.business_id]);
    if (!s) {
      await execute('INSERT INTO settings (business_id) VALUES (?)', [req.user.business_id]);
    }
    await execute(`
      UPDATE settings SET 
        startup_cash_popup = COALESCE(?, startup_cash_popup),
        low_stock_popup = COALESCE(?, low_stock_popup),
        announcements_popup = COALESCE(?, announcements_popup),
        sound_notifications = COALESCE(?, sound_notifications),
        daily_eod_popup = COALESCE(?, daily_eod_popup)
      WHERE business_id = ?
    `, [
      data.startup_cash_popup !== undefined ? (data.startup_cash_popup ? 1 : 0) : null,
      data.low_stock_popup !== undefined ? (data.low_stock_popup ? 1 : 0) : null,
      data.announcements_popup !== undefined ? (data.announcements_popup ? 1 : 0) : null,
      data.sound_notifications !== undefined ? (data.sound_notifications ? 1 : 0) : null,
      data.daily_eod_popup !== undefined ? (data.daily_eod_popup ? 1 : 0) : null,
      req.user.business_id
    ]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// ─── Auth Settings (admin) ────────────────────────────────────────────────────

const authSettingsSchema = z.object({
  allow_signup: z.boolean().optional(),
  allow_signin: z.boolean().optional()
});

router.post('/settings/auth', async (req: any, res, next) => {
  const data = authSettingsSchema.parse(req.body);
  const { allow_signup, allow_signin } = data;
  try {
    await execute('UPDATE settings SET allow_signup=?,allow_signin=? WHERE business_id=?',
      [allow_signup ? 1 : 0, allow_signin ? 1 : 0, req.user.business_id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// ─── Company ─────────────────────────────────────────────────────────────────

router.get('/company', async (req: any, res, next) => {
  try {
    const branchId = req.user?.branch_id;
    if (branchId) {
      const branch: any = await queryOne('SELECT name, address, phone, email, vat_number FROM branches WHERE id=? AND business_id=?', [branchId, req.user.business_id]);
      if (branch) {
        if (!branch.vat_number) {
          const bus: any = await queryOne('SELECT vat_number FROM businesses WHERE id=?', [req.user.business_id]);
          if (bus?.vat_number) branch.vat_number = bus.vat_number;
        }
        return res.json(branch);
      }
    }
    const c = await queryOne('SELECT * FROM businesses WHERE id=?', [req.user.business_id]);
    res.json(c || {});
  } catch (e: any) { next(e); }
});


const companySchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  subdomain: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  vat_number: z.string().optional()
});

router.post('/company', async (req: any, res, next) => {
  const data = companySchema.parse(req.body);
  const { name, email, phone, subdomain, address, city, state, zip_code, country, vat_number } = data;
  try {
    const branchId = req.user?.branch_id;
    if (branchId) {
      await execute('UPDATE branches SET name=COALESCE(?, name), email=?, phone=?, address=?, vat_number=? WHERE id=? AND business_id=?',
        [name, email, phone, address, vat_number, branchId, req.user.business_id]);
    }
    await execute('UPDATE businesses SET name=?,email=?,phone=?,subdomain=?,address=?,city=?,state=?,zip_code=?,country=?,vat_number=? WHERE id=?',
      [name, email, phone, subdomain, address, city, state, zip_code, country, vat_number, req.user.business_id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// ─── Payment Methods ──────────────────────────────────────────────────────────

router.get('/payment-methods', async (req: any, res, next) => {
  try {
    res.json(await query('SELECT * FROM payment_methods WHERE business_id=? AND is_active=1 ORDER BY display_order ASC', [req.user.business_id]));
  } catch (e: any) { next(e); }
});

const paymentMethodsSchema = z.object({
  methods: z.array(z.object({
    id: z.number().optional(),
    name: z.string()
  })).default([])
});

router.post('/payment-methods', async (req: any, res, next) => {
  const data = paymentMethodsSchema.parse(req.body);
  const { methods } = data;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('UPDATE payment_methods SET is_active=0 WHERE business_id=?', [req.user.business_id]);
    for (let i = 0; i < methods.length; i++) {
      const m = methods[i];
      if (m.id) {
        await conn.execute('UPDATE payment_methods SET name=?,display_order=?,is_active=1 WHERE id=? AND business_id=?',
          [m.name, i+1, m.id, req.user.business_id]);
      } else {
        await conn.execute('INSERT INTO payment_methods (business_id,name,display_order,is_active) VALUES (?,?,?,1)',
          [req.user.business_id, m.name, i+1]);
      }
    }
    await conn.commit();
    res.json({ success: true });
  } catch (e: any) { await conn.rollback(); next(e); }
  finally { conn.release(); }
});

// ─── Printer Settings ─────────────────────────────────────────────────────────

router.get('/printer-settings', async (req: any, res, next) => {
  try {
    const branchId = req.user?.branch_id ?? null;
    let s = await queryOne(
      'SELECT * FROM printer_settings WHERE business_id=? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL))',
      [req.user.business_id, branchId, branchId]
    );
    if (!s && branchId !== null) {
      s = await queryOne('SELECT * FROM printer_settings WHERE business_id=? AND branch_id IS NULL', [req.user.business_id]);
    }
    if (!s) {
      await execute('INSERT INTO printer_settings (business_id, branch_id) VALUES (?, ?)', [req.user.business_id, branchId]);
      s = await queryOne(
        'SELECT * FROM printer_settings WHERE business_id=? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL))',
        [req.user.business_id, branchId, branchId]
      );
    }
    res.json(s || {});
  } catch (e: any) { next(e); }
});

const printerSettingsSchema = z.object({
  label_size: z.string().optional(),
  barcode_length: z.number().or(z.string().transform(Number)).optional(),
  margin_top: z.number().or(z.string().transform(Number)).optional(),
  margin_left: z.number().or(z.string().transform(Number)).optional(),
  margin_bottom: z.number().or(z.string().transform(Number)).optional(),
  margin_right: z.number().or(z.string().transform(Number)).optional(),
  orientation: z.string().optional(),
  font_size: z.string().optional(),
  font_family: z.string().optional()
});

router.post('/printer-settings', async (req: any, res, next) => {
  const branchId = req.user?.branch_id ?? null;
  const data = printerSettingsSchema.parse(req.body);
  const { 
    label_size = '2.25" (57mm) x 1.25" (32mm) Dymo 11354 / 30334', 
    barcode_length = 20, 
    margin_top = 2, 
    margin_left = 2, 
    margin_bottom = 2, 
    margin_right = 2, 
    orientation = 'Landscape', 
    font_size = 'Medium', 
    font_family = 'Arial' 
  } = data;

  try {
    const existing = await queryOne(
      'SELECT id FROM printer_settings WHERE business_id=? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL))',
      [req.user.business_id, branchId, branchId]
    );

    if (existing) {
      await execute(
        'UPDATE printer_settings SET label_size=?, barcode_length=?, margin_top=?, margin_left=?, margin_bottom=?, margin_right=?, orientation=?, font_size=?, font_family=? WHERE id=?',
        [label_size, barcode_length, margin_top, margin_left, margin_bottom, margin_right, orientation, font_size, font_family, existing.id]
      );
    } else {
      await execute(
        'INSERT INTO printer_settings (business_id, branch_id, label_size, barcode_length, margin_top, margin_left, margin_bottom, margin_right, orientation, font_size, font_family) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.business_id, branchId, label_size, barcode_length, margin_top, margin_left, margin_bottom, margin_right, orientation, font_size, font_family]
      );
    }
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// ─── Thermal Printer Settings ─────────────────────────────────────────────────

router.get('/thermal-printer-settings', async (req: any, res, next) => {
  try {
    const branchId = req.user?.branch_id ?? null;
    let s;
    if (branchId) {
      s = await queryOne('SELECT * FROM thermal_printer_settings WHERE business_id=? AND branch_id=?', [req.user.business_id, branchId]);
      if (!s) {
        s = await queryOne('SELECT * FROM thermal_printer_settings WHERE business_id=? AND (branch_id IS NULL OR branch_id=0)', [req.user.business_id]);
      }
    } else {
      s = await queryOne('SELECT * FROM thermal_printer_settings WHERE business_id=? AND (branch_id IS NULL OR branch_id=0)', [req.user.business_id]);
    }

    if (!s) {
      await execute('INSERT INTO thermal_printer_settings (business_id,branch_id,font_family,font_size) VALUES (?,?,?,?)', [req.user.business_id, branchId, 'Arial', '14px']);
      s = await queryOne('SELECT * FROM thermal_printer_settings WHERE business_id=? ORDER BY id DESC LIMIT 1', [req.user.business_id]);
    }
    res.json(s);
  } catch (e: any) { next(e); }
});

const thermalPrinterSettingsSchema = z.object({
  font_family: z.string().optional(),
  font_size: z.string().optional(),
  show_logo: z.boolean().optional(),
  show_business_name: z.boolean().optional(),
  show_business_address: z.boolean().optional(),
  show_business_phone: z.boolean().optional(),
  show_business_email: z.boolean().optional(),
  show_customer_info: z.boolean().optional(),
  show_invoice_number: z.boolean().optional(),
  show_date: z.boolean().optional(),
  show_items_table: z.boolean().optional(),
  show_totals: z.boolean().optional(),
  show_footer: z.boolean().optional(),
  show_powered_by: z.boolean().optional(),
  show_vat_number: z.boolean().optional(),
  eod_show_cash_summary: z.boolean().optional(),
  eod_show_payment_type: z.boolean().optional(),
  eod_show_total_cash: z.boolean().optional(),
  eod_show_total_card_sale: z.boolean().optional(),
  eod_show_total: z.boolean().optional(),
  eod_footer_type: z.string().optional(),
  eod_footer_custom_text: z.string().optional(),
  footer_text: z.string().optional()
});

router.post('/thermal-printer-settings', async (req: any, res, next) => {
  const branchId = req.user?.branch_id ?? null;
  const m = thermalPrinterSettingsSchema.parse(req.body);
  try {
    // Atomic upsert — no data loss if server crashes mid-write (FINDING-019)
    await execute(`
      INSERT INTO thermal_printer_settings
        (business_id,branch_id,font_family,font_size,show_logo,show_business_name,show_business_address,
         show_business_phone,show_business_email,show_customer_info,show_invoice_number,show_date,
         show_items_table,show_totals,show_footer,show_powered_by,show_vat_number,
         eod_show_cash_summary,eod_show_payment_type,eod_show_total_cash,eod_show_total_card_sale,eod_show_total,
         eod_footer_type,eod_footer_custom_text,
         footer_text)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        branch_id=VALUES(branch_id),font_family=VALUES(font_family),font_size=VALUES(font_size),
        show_logo=VALUES(show_logo),show_business_name=VALUES(show_business_name),
        show_business_address=VALUES(show_business_address),show_business_phone=VALUES(show_business_phone),
        show_business_email=VALUES(show_business_email),show_customer_info=VALUES(show_customer_info),
        show_invoice_number=VALUES(show_invoice_number),show_date=VALUES(show_date),
        show_items_table=VALUES(show_items_table),show_totals=VALUES(show_totals),
        show_footer=VALUES(show_footer),show_powered_by=VALUES(show_powered_by),show_vat_number=VALUES(show_vat_number),
        eod_show_cash_summary=VALUES(eod_show_cash_summary),eod_show_payment_type=VALUES(eod_show_payment_type),
        eod_show_total_cash=VALUES(eod_show_total_cash),eod_show_total_card_sale=VALUES(eod_show_total_card_sale),
        eod_show_total=VALUES(eod_show_total),
        eod_footer_type=VALUES(eod_footer_type),eod_footer_custom_text=VALUES(eod_footer_custom_text),
        footer_text=VALUES(footer_text)`,
      [req.user.business_id, branchId, m.font_family||'Arial', m.font_size||'14px', m.show_logo?1:0,
       m.show_business_name?1:0, m.show_business_address?1:0, m.show_business_phone?1:0,
       m.show_business_email?1:0, m.show_customer_info?1:0, m.show_invoice_number?1:0,
       m.show_date?1:0, m.show_items_table?1:0, m.show_totals?1:0, m.show_footer?1:0,
       m.show_powered_by?1:0, m.show_vat_number !== false ? 1 : 0,
       m.eod_show_cash_summary?1:0, m.eod_show_payment_type?1:0, m.eod_show_total_cash?1:0,
       m.eod_show_total_card_sale?1:0, m.eod_show_total?1:0,
       m.eod_footer_type||'branch', m.eod_footer_custom_text||'',
       m.footer_text||'Thank you for your business!']
    );
    res.json({ success: true });
  } catch (e: any) { next(e); }
});


// ─── Categories / Manufacturers ───────────────────────────────────────────────

router.get('/categories', async (req: any, res, next) => {
  try { res.json(await query('SELECT * FROM categories WHERE business_id=?', [req.user.business_id])); }
  catch (e: any) { next(e); }
});

const categoryManufacturerSchema = z.object({
  name: z.string().min(1, "Name is required")
});

router.post('/categories', async (req: any, res, next) => {
  const data = categoryManufacturerSchema.parse(req.body);
  const { name } = data;
  try {
    const r = await execute('INSERT INTO categories (business_id,name) VALUES (?,?)', [req.user.business_id, name]);
    res.json({ id: r.insertId, name });
  } catch (e: any) { next(e); }
});

router.get('/manufacturers', async (req: any, res, next) => {
  try { res.json(await query('SELECT * FROM manufacturers WHERE business_id=?', [req.user.business_id])); }
  catch (e: any) { next(e); }
});

router.post('/manufacturers', async (req: any, res, next) => {
  const data = categoryManufacturerSchema.parse(req.body);
  const { name } = data;
  try {
    const r = await execute('INSERT INTO manufacturers (business_id,name) VALUES (?,?)', [req.user.business_id, name]);
    res.json({ id: r.insertId, name });
  } catch (e: any) { next(e); }
});

// ─── Suppliers ────────────────────────────────────────────────────────────────

router.get('/suppliers', async (req: any, res, next) => {
  try { res.json(await query('SELECT * FROM suppliers WHERE business_id=?', [req.user.business_id])); }
  catch (e: any) { 
    require('fs').appendFileSync('debug.log', `GET /suppliers error: ${e.message}\n${e.stack}\n`);
    console.error('GET /suppliers error:', e);
    next(e); 
  }
});

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().optional(),
  contact_person: z.string().optional()
});

router.post('/suppliers', async (req: any, res, next) => {
  const data = supplierSchema.parse(req.body);
  const { name, phone, email, contact_person } = data;
  try {
    const r = await execute('INSERT INTO suppliers (business_id,name,phone,email,contact_person) VALUES (?,?,?,?,?)',
      [req.user.business_id, name, phone, email, contact_person]);
    res.json({ id: r.insertId, name, phone, email, contact_person });
  } catch (e: any) { next(e); }
});

router.delete('/suppliers/:id', async (req: any, res, next) => {
  try {
    await execute('DELETE FROM suppliers WHERE id=? AND business_id=?', [req.params.id, req.user.business_id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// ─── Branches ─────────────────────────────────────────────────────────────────

router.get('/branches', async (req: any, res, next) => {
  try { res.json(await query('SELECT * FROM branches WHERE business_id=?', [req.user.business_id])); }
  catch (e: any) { next(e); }
});

// ─── Speed Grid ──────────────────────────────────────────────────────────────

const DEFAULT_SPEED_GRID_CATEGORIES = [
  'Accessories',
  'Device',
  'Vape',
  'Screen Protectors',
  'Cables & Chargers',
  'Cases & Covers',
  'Repairs & Services',
  'Trending'
];

async function ensureDefaultSpeedGridCategories(businessId: number) {
  const existing = await query<any>('SELECT id FROM speed_grid_categories WHERE business_id=? ORDER BY sort_order ASC', [businessId]);
  if (existing.length === 0) {
    for (let i = 0; i < DEFAULT_SPEED_GRID_CATEGORIES.length; i++) {
      await execute('INSERT INTO speed_grid_categories (business_id, name, sort_order) VALUES (?, ?, ?)', [
        businessId,
        DEFAULT_SPEED_GRID_CATEGORIES[i],
        i + 1
      ]);
    }
  }
}

router.get('/speed-grid', async (req: any, res, next) => {
  const businessId = req.user.business_id;
  const branchId = req.user.branch_id || 0;

  try {
    await ensureDefaultSpeedGridCategories(businessId);

    const categories = await query<any>(
      'SELECT id, name, sort_order FROM speed_grid_categories WHERE business_id=? ORDER BY sort_order ASC LIMIT 8',
      [businessId]
    );

    if (categories.length === 0) {
      return res.json({ categories: [] });
    }

    const categoryIds = categories.map(c => c.id);
    const placeholders = categoryIds.map(() => '?').join(',');

    const items = await query<any>(`
      SELECT 
        sgi.id,
        sgi.category_id,
        sgi.product_id,
        sgi.sku_id,
        sgi.custom_label,
        sgi.sort_order,
        p.name AS product_name,
        p.product_type,
        p.allow_overselling,
        p.alert_message,
        ps.sku_code,
        ps.selling_price,
        ps.cost_price,
        COALESCE(bs.quantity, 0) AS stock_quantity
      FROM speed_grid_items sgi
      JOIN products p ON sgi.product_id = p.id
      JOIN product_skus ps ON sgi.sku_id = ps.id
      LEFT JOIN branch_stock bs ON ps.id = bs.sku_id AND bs.branch_id = ?
      WHERE sgi.business_id = ? AND sgi.category_id IN (${placeholders})
        AND p.deleted_at IS NULL
      ORDER BY sgi.sort_order ASC
    `, [branchId, businessId, ...categoryIds]);

    const result = categories.map(cat => ({
      ...cat,
      items: items.filter(item => item.category_id === cat.id)
    }));

    res.json({ categories: result });
  } catch (e: any) { next(e); }
});

router.post('/speed-grid/save-all', async (req: any, res, next) => {
  const businessId = req.user.business_id;
  const { categories } = req.body;

  if (!Array.isArray(categories)) {
    return res.status(400).json({ error: 'Categories array is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (let i = 0; i < Math.min(categories.length, 8); i++) {
      const cat = categories[i];
      let catId = cat.id;

      if (catId) {
        await conn.execute(
          'UPDATE speed_grid_categories SET name=?, sort_order=? WHERE id=? AND business_id=?',
          [cat.name || `Category ${i + 1}`, i + 1, catId, businessId]
        );
      } else {
        const [res] = await conn.execute(
          'INSERT INTO speed_grid_categories (business_id, name, sort_order) VALUES (?, ?, ?)',
          [businessId, cat.name || `Category ${i + 1}`, i + 1]
        );
        catId = (res as any).insertId;
      }

      // Clear existing items for this category to ensure clean replacement
      await conn.execute(
        'DELETE FROM speed_grid_items WHERE category_id=? AND business_id=?',
        [catId, businessId]
      );

      if (Array.isArray(cat.items)) {
        for (let j = 0; j < Math.min(cat.items.length, 20); j++) {
          const item = cat.items[j];
          if (item && item.product_id && item.sku_id) {
            await conn.execute(
              'INSERT INTO speed_grid_items (business_id, category_id, product_id, sku_id, custom_label, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
              [
                businessId,
                catId,
                item.product_id,
                item.sku_id,
                item.custom_label ? item.custom_label.trim() : null,
                j + 1
              ]
            );
          }
        }
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.get('/speed-grid/top-sellers', async (req: any, res, next) => {
  const businessId = req.user.business_id;
  const branchId = req.user.branch_id || 0;
  const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
  const categoryId = req.query.category_id ? parseInt(req.query.category_id as string) : null;

  try {
    let sql = `
      SELECT 
        p.id AS product_id,
        ps.id AS sku_id,
        p.name AS product_name,
        p.product_type,
        p.category_id,
        c.name AS category_name,
        ps.sku_code,
        ps.selling_price,
        ps.cost_price,
        COALESCE(bs.quantity, 0) AS stock_quantity,
        SUM(ii.quantity) AS units_sold
      FROM invoice_items ii
      JOIN invoices inv ON ii.invoice_id = inv.id
      JOIN product_skus ps ON ii.sku_id = ps.id
      JOIN products p ON ps.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN branch_stock bs ON ps.id = bs.sku_id AND bs.branch_id = ?
      WHERE inv.business_id = ?
        AND inv.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND p.product_type != 'serialized'
        AND ii.device_id IS NULL
        AND p.deleted_at IS NULL
    `;

    const params: any[] = [branchId, businessId, days];

    if (categoryId) {
      sql += ' AND p.category_id = ?';
      params.push(categoryId);
    }

    sql += `
      GROUP BY p.id, ps.id, p.name, p.product_type, p.category_id, c.name, ps.sku_code, ps.selling_price, ps.cost_price, bs.quantity
      ORDER BY units_sold DESC
      LIMIT 20
    `;

    const rows = await query<any>(sql, params);
    res.json(rows);
  } catch (e: any) { next(e); }
});

router.get('/speed-grid/search-products', async (req: any, res, next) => {
  const businessId = req.user.business_id;
  const branchId = req.user.branch_id || 0;
  const q = (req.query.q as string || '').trim();

  try {
    let sql = `
      SELECT 
        p.id AS product_id,
        ps.id AS sku_id,
        p.name AS product_name,
        p.product_type,
        p.allow_overselling,
        p.alert_message,
        c.name AS category_name,
        ps.sku_code,
        ps.selling_price,
        ps.cost_price,
        COALESCE(bs.quantity, 0) AS stock_quantity
      FROM products p
      JOIN product_skus ps ON p.id = ps.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN branch_stock bs ON ps.id = bs.sku_id AND bs.branch_id = ?
      WHERE p.business_id = ?
        AND p.deleted_at IS NULL
    `;
    const params: any[] = [branchId, businessId];

    if (q) {
      sql += ' AND (p.name LIKE ? OR ps.sku_code LIKE ? OR ps.barcode LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY p.name ASC LIMIT 30';

    const rows = await query<any>(sql, params);
    res.json(rows);
  } catch (e: any) { next(e); }
});

export default router;
