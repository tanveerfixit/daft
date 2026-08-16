import { Router } from 'express';
import { pool, query, queryOne, execute } from '../mysql.js';
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
    res.json(s || {});
  } catch (e: any) { next(e); }
});

const settingsSchema = z.object({
  timezone: z.string().optional(),
  date_format: z.string().optional(),
  time_format: z.string().optional(),
  language: z.string().optional()
});

router.post('/settings', async (req: any, res, next) => {
  const data = settingsSchema.parse(req.body);
  const { timezone, date_format, time_format, language } = data;
  try {
    await execute('UPDATE settings SET timezone=?,date_format=?,time_format=?,language=? WHERE business_id=?',
      [timezone, date_format, time_format, language, req.user.business_id]);
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
      const branch = await queryOne('SELECT name, address, phone, email FROM branches WHERE id=? AND business_id=?', [branchId, req.user.business_id]);
      if (branch) {
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
  country: z.string().optional()
});

router.post('/company', async (req: any, res, next) => {
  const data = companySchema.parse(req.body);
  const { name, email, phone, subdomain, address, city, state, zip_code, country } = data;
  try {
    await execute('UPDATE businesses SET name=?,email=?,phone=?,subdomain=?,address=?,city=?,state=?,zip_code=?,country=? WHERE id=?',
      [name, email, phone, subdomain, address, city, state, zip_code, country, req.user.business_id]);
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
    const branchId = req.user?.branch_id;
    let s = await queryOne('SELECT * FROM printer_settings WHERE business_id=? AND branch_id=?', [req.user.business_id, branchId]);
    if (!s) {
      await execute('INSERT INTO printer_settings (business_id,branch_id) VALUES (?,?)', [req.user.business_id, branchId]);
      s = await queryOne('SELECT * FROM printer_settings WHERE business_id=? AND branch_id=?', [req.user.business_id, branchId]);
    }
    res.json(s);
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
  font_size: z.number().or(z.string().transform(Number)).optional(),
  font_family: z.string().optional()
});

router.post('/printer-settings', async (req: any, res, next) => {
  const branchId = req.user?.branch_id;
  const data = printerSettingsSchema.parse(req.body);
  const { label_size, barcode_length, margin_top, margin_left, margin_bottom, margin_right, orientation, font_size, font_family } = data;
  try {
    await execute('UPDATE printer_settings SET label_size=?,barcode_length=?,margin_top=?,margin_left=?,margin_bottom=?,margin_right=?,orientation=?,font_size=?,font_family=? WHERE business_id=? AND branch_id=?',
      [label_size, barcode_length, margin_top, margin_left, margin_bottom, margin_right, orientation, font_size, font_family, req.user.business_id, branchId]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// ─── Thermal Printer Settings ─────────────────────────────────────────────────

router.get('/thermal-printer-settings', async (req: any, res, next) => {
  try {
    const branchId = req.user?.branch_id;
    let s = await queryOne('SELECT * FROM thermal_printer_settings WHERE business_id=? AND branch_id=?', [req.user.business_id, branchId]);
    if (!s) {
      await execute('INSERT INTO thermal_printer_settings (business_id,branch_id) VALUES (?,?)', [req.user.business_id, branchId]);
      s = await queryOne('SELECT * FROM thermal_printer_settings WHERE business_id=? AND branch_id=?', [req.user.business_id, branchId]);
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
  const branchId = req.user?.branch_id;
  const m = thermalPrinterSettingsSchema.parse(req.body);
  try {
    // Atomic upsert — no data loss if server crashes mid-write (FINDING-019)
    await execute(`
      INSERT INTO thermal_printer_settings
        (business_id,branch_id,font_family,font_size,show_logo,show_business_name,show_business_address,
         show_business_phone,show_business_email,show_customer_info,show_invoice_number,show_date,
         show_items_table,show_totals,show_footer,show_powered_by,
         eod_show_cash_summary,eod_show_payment_type,eod_show_total_cash,eod_show_total_card_sale,eod_show_total,
         eod_footer_type,eod_footer_custom_text,
         footer_text)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        branch_id=VALUES(branch_id),font_family=VALUES(font_family),font_size=VALUES(font_size),
        show_logo=VALUES(show_logo),show_business_name=VALUES(show_business_name),
        show_business_address=VALUES(show_business_address),show_business_phone=VALUES(show_business_phone),
        show_business_email=VALUES(show_business_email),show_customer_info=VALUES(show_customer_info),
        show_invoice_number=VALUES(show_invoice_number),show_date=VALUES(show_date),
        show_items_table=VALUES(show_items_table),show_totals=VALUES(show_totals),
        show_footer=VALUES(show_footer),show_powered_by=VALUES(show_powered_by),
        eod_show_cash_summary=VALUES(eod_show_cash_summary),eod_show_payment_type=VALUES(eod_show_payment_type),
        eod_show_total_cash=VALUES(eod_show_total_cash),eod_show_total_card_sale=VALUES(eod_show_total_card_sale),
        eod_show_total=VALUES(eod_show_total),
        eod_footer_type=VALUES(eod_footer_type),eod_footer_custom_text=VALUES(eod_footer_custom_text),
        footer_text=VALUES(footer_text)`,
      [req.user.business_id, branchId, m.font_family||'Arial', m.font_size||'12px', m.show_logo?1:0,
       m.show_business_name?1:0, m.show_business_address?1:0, m.show_business_phone?1:0,
       m.show_business_email?1:0, m.show_customer_info?1:0, m.show_invoice_number?1:0,
       m.show_date?1:0, m.show_items_table?1:0, m.show_totals?1:0, m.show_footer?1:0,
       m.show_powered_by?1:0,
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

export default router;
