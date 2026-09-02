var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/mysql.ts
var mysql_exports = {};
__export(mysql_exports, {
  CURRENT_SCHEMA_VERSION: () => CURRENT_SCHEMA_VERSION,
  ensureSuperAdmin: () => ensureSuperAdmin,
  execute: () => execute,
  initSchema: () => initSchema,
  logActivity: () => logActivity,
  pool: () => pool,
  query: () => query,
  queryOne: () => queryOne,
  seedData: () => seedData
});
import mysql from "mysql2/promise";
import dotenv from "dotenv";
async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}
async function execute(sql, params) {
  const [result] = await pool.execute(sql, params);
  return result;
}
async function ensureIndex(conn, tableName, indexName, columns) {
  try {
    const [rows] = await conn.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
      [tableName, indexName]
    );
    if (rows.length === 0) {
      await conn.query(`CREATE INDEX \`${indexName}\` ON \`${tableName}\` (${columns})`);
      console.log(`[MySQL] Index applied: ${tableName}.${indexName}`);
    }
  } catch (e) {
  }
}
async function initSchema() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS _schema_meta (
        key_name VARCHAR(100) PRIMARY KEY,
        value VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    const [metaRows] = await conn.query(`SELECT value FROM _schema_meta WHERE key_name = 'schema_version' LIMIT 1`);
    const currentVersion = metaRows[0]?.value;
    if (currentVersion === CURRENT_SCHEMA_VERSION) {
      console.log("[MySQL] Schema is cached and up-to-date. Skipping redundant DDL checks.");
      return;
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    await conn.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        email VARCHAR(255),
        phone VARCHAR(100),
        subdomain VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(50),
        country VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      )
    `);
    try {
      await conn.query("ALTER TABLE businesses ADD COLUMN slug VARCHAR(255) UNIQUE AFTER name");
      console.log("[MySQL] Migration: added slug to businesses");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    await conn.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL DEFAULT '',
        password_hash VARCHAR(255),
        role VARCHAR(50) DEFAULT 'staff',
        status VARCHAR(50) DEFAULT 'pending',
        last_login TIMESTAMP NULL,
        last_generated_password VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP NULL,
        otp_code VARCHAR(6),
        otp_expires TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT,
        permission_id INT,
        PRIMARY KEY(role_id, permission_id),
        FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INT,
        role_id INT,
        PRIMARY KEY(user_id, role_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT,
        parent_id INT NULL,
        name VARCHAR(255),
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS manufacturers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT,
        name VARCHAR(255),
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tax_classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT,
        name VARCHAR(255),
        rate DECIMAL(10,4) DEFAULT 0.0000,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        category_id INT NULL,
        manufacturer_id INT NULL,
        tax_class_id INT NULL,
        name VARCHAR(255) NOT NULL,
        product_type VARCHAR(50) DEFAULT 'stock',
        description TEXT,
        allow_overselling TINYINT(1) DEFAULT 1,
        min_stock_level INT DEFAULT 0,
        is_taxable TINYINT(1) DEFAULT 1,
        require_note TINYINT(1) DEFAULT 0,
        min_sales_price DECIMAL(10,2) DEFAULT 0,
        additional_description TEXT NULL,
        alert_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL,
        FOREIGN KEY (tax_class_id) REFERENCES tax_classes(id) ON DELETE SET NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS variant_attributes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS variant_attribute_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        attribute_id INT NOT NULL,
        value VARCHAR(255) NOT NULL,
        FOREIGN KEY (attribute_id) REFERENCES variant_attributes(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_skus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        sku_code VARCHAR(255) UNIQUE,
        barcode VARCHAR(255),
        cost_price DECIMAL(10,2),
        selling_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sku_attribute_values (
        sku_id INT,
        attribute_value_id INT,
        PRIMARY KEY(sku_id, attribute_value_id),
        FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE CASCADE,
        FOREIGN KEY (attribute_value_id) REFERENCES variant_attribute_values(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS branch_stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sku_id INT NOT NULL,
        branch_id INT NOT NULL,
        quantity INT DEFAULT 0,
        UNIQUE KEY unique_sku_branch (sku_id, branch_id),
        FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT NOT NULL,
        sku_id INT NOT NULL,
        imei VARCHAR(255) UNIQUE,
        cost_price DECIMAL(10,2),
        selling_price DECIMAL(10,2),
        color VARCHAR(100),
        gb VARCHAR(50),
        ram VARCHAR(50),
        \`condition\` VARCHAR(100),
        po_number VARCHAR(100),
        status VARCHAR(50) DEFAULT 'in_stock',
        unlocked VARCHAR(100) DEFAULT 'Unknown',
        imei_status VARCHAR(100) DEFAULT 'Clean',
        carrier VARCHAR(100) DEFAULT 'Unlocked',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT NOT NULL,
        sku_id INT NULL,
        device_id INT NULL,
        movement_type VARCHAR(100),
        quantity INT,
        unit_cost DECIMAL(10,2),
        reference_type VARCHAR(100),
        reference_id INT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT,
        name VARCHAR(255),
        phone VARCHAR(100),
        email VARCHAR(255),
        address TEXT,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        secondary_phone VARCHAR(100),
        fax VARCHAR(100),
        offers_email TINYINT(1) DEFAULT 0,
        company VARCHAR(255),
        customer_type VARCHAR(50),
        address_line1 TEXT,
        address_line2 TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(50),
        country VARCHAR(100),
        website VARCHAR(255),
        alert_message TEXT,
        wallet_balance DECIMAL(10,2) DEFAULT 0,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT NOT NULL,
        user_id INT NULL,
        customer_id INT NULL,
        invoice_number VARCHAR(100),
        type VARCHAR(50) DEFAULT 'sale',
        subtotal DECIMAL(10,2),
        tax_total DECIMAL(10,2),
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tax_type VARCHAR(20) DEFAULT 'excluded',
        discount_total DECIMAL(10,2),
        grand_total DECIMAL(10,2),
        paid_amount DECIMAL(10,2) DEFAULT 0,
        due_amount DECIMAL(10,2) DEFAULT 0,
        cost_total DECIMAL(10,2),
        profit_total DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'paid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id),
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        sku_id INT NOT NULL,
        device_id INT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2),
        cost DECIMAL(10,2),
        discount DECIMAL(10,2),
        total DECIMAL(10,2),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (sku_id) REFERENCES product_skus(id),
        FOREIGN KEY (device_id) REFERENCES devices(id)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        invoice_id INT,
        type VARCHAR(50),
        method VARCHAR(100),
        amount DECIMAL(10,2),
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS invoice_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        user_id INT,
        activity VARCHAR(255) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS customer_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        user_id INT,
        activity VARCHAR(255) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sku_id INT NOT NULL,
        user_id INT,
        activity VARCHAR(255) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS device_activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id INT NOT NULL,
        user_id INT,
        activity VARCHAR(255) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT,
        currency VARCHAR(100) DEFAULT '\u20AC, Euro',
        timezone VARCHAR(100) DEFAULT 'UTC/GMT +00:00 - Europe/London',
        date_format VARCHAR(50) DEFAULT 'DD-MM-YY',
        time_format VARCHAR(50) DEFAULT '12 hour',
        language VARCHAR(50) DEFAULT 'English',
        allow_signup TINYINT(1) DEFAULT 1,
        allow_signin TINYINT(1) DEFAULT 1,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT,
        name VARCHAR(100) NOT NULL,
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        is_default TINYINT(1) DEFAULT 0,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS printer_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT,
        label_size VARCHAR(255) DEFAULT '2.25\\" (57mm) x 1.25\\" (32mm) Dymo 30334',
        barcode_length INT DEFAULT 20,
        margin_top INT DEFAULT 5,
        margin_left INT DEFAULT 3,
        margin_bottom INT DEFAULT 3,
        margin_right INT DEFAULT 3,
        orientation VARCHAR(50) DEFAULT 'Landscape',
        font_size VARCHAR(50) DEFAULT 'Regular',
        font_family VARCHAR(100) DEFAULT 'Arial',
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS thermal_printer_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT NULL,
        font_family VARCHAR(100) DEFAULT 'monospace',
        font_size VARCHAR(50) DEFAULT '12px',
        show_logo TINYINT(1) DEFAULT 1,
        show_business_name TINYINT(1) DEFAULT 1,
        show_business_address TINYINT(1) DEFAULT 1,
        show_business_phone TINYINT(1) DEFAULT 1,
        show_business_email TINYINT(1) DEFAULT 1,
        show_customer_info TINYINT(1) DEFAULT 1,
        show_invoice_number TINYINT(1) DEFAULT 1,
        show_date TINYINT(1) DEFAULT 1,
        show_items_table TINYINT(1) DEFAULT 1,
        show_totals TINYINT(1) DEFAULT 1,
        show_footer TINYINT(1) DEFAULT 1,
        show_powered_by TINYINT(1) DEFAULT 1,
        eod_show_cash_summary TINYINT(1) DEFAULT 1,
        eod_show_payment_type TINYINT(1) DEFAULT 1,
        eod_show_total_cash TINYINT(1) DEFAULT 1,
        eod_show_total_card_sale TINYINT(1) DEFAULT 1,
        eod_show_total TINYINT(1) DEFAULT 1,
        eod_footer_type VARCHAR(50) DEFAULT 'branch',
        eod_footer_custom_text TEXT,
        footer_text TEXT,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        UNIQUE KEY idx_business_branch (business_id, branch_id)
      )
    `);
    try {
      await conn.query("ALTER TABLE thermal_printer_settings ADD COLUMN show_powered_by TINYINT(1) DEFAULT 1 AFTER show_footer");
      console.log("[MySQL] Migration: added show_powered_by to thermal_printer_settings");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE thermal_printer_settings ADD COLUMN eod_show_cash_summary TINYINT(1) DEFAULT 1 AFTER show_powered_by");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE thermal_printer_settings ADD COLUMN eod_show_payment_type TINYINT(1) DEFAULT 1 AFTER eod_show_cash_summary");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE thermal_printer_settings ADD COLUMN eod_show_total_cash TINYINT(1) DEFAULT 1 AFTER eod_show_payment_type");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE thermal_printer_settings ADD COLUMN eod_show_total_card_sale TINYINT(1) DEFAULT 1 AFTER eod_show_total_cash");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE thermal_printer_settings ADD COLUMN eod_show_total TINYINT(1) DEFAULT 1 AFTER eod_show_total_card_sale");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE thermal_printer_settings ADD COLUMN eod_footer_type VARCHAR(50) DEFAULT 'branch' AFTER eod_show_total");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE thermal_printer_settings ADD COLUMN eod_footer_custom_text TEXT AFTER eod_footer_type");
      console.log("[MySQL] Migration: added EOD customization columns to thermal_printer_settings");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    await conn.query(`
      CREATE TABLE IF NOT EXISTS drawers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL,
        opened_by INT,
        opening_balance DECIMAL(10,2),
        closing_balance DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'open',
        opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL,
        FOREIGN KEY (branch_id) REFERENCES branches(id)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS drawer_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        drawer_id INT NOT NULL,
        amount DECIMAL(10,2),
        type VARCHAR(50),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (drawer_id) REFERENCES drawers(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT,
        name VARCHAR(255),
        phone VARCHAR(100),
        email VARCHAR(255),
        contact_person VARCHAR(255),
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        branch_id INT NOT NULL,
        supplier_id INT,
        po_number VARCHAR(100),
        lot_ref_no VARCHAR(100),
        sales_tax DECIMAL(10,2) DEFAULT 0,
        shipping_cost DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0,
        expected_at TIMESTAMP NULL,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        po_id INT NOT NULL,
        product_id INT,
        description TEXT,
        ordered_qty INT DEFAULT 0,
        received_qty INT DEFAULT 0,
        unit_cost DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0,
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT,
        branch_id INT,
        customer_id INT,
        device_model VARCHAR(255),
        issue TEXT,
        status VARCHAR(50),
        total_quote DECIMAL(10,2) DEFAULT 0,
        deposit_paid DECIMAL(10,2) DEFAULT 0,
        remaining_balance DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS device_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        from_branch_id INT NOT NULL,
        to_branch_id INT NOT NULL,
        device_id INT,
        sku_id INT,
        quantity INT DEFAULT 1,
        status VARCHAR(50) DEFAULT 'pending',
        initiated_by INT,
        notes TEXT,
        product_name VARCHAR(255) NULL,
        sku_code VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (from_branch_id) REFERENCES branches(id),
        FOREIGN KEY (to_branch_id) REFERENCES branches(id),
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
        FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE SET NULL,
        FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS smtp_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL UNIQUE,
        host VARCHAR(255) DEFAULT 'smtp.hostinger.com',
        port INT DEFAULT 465,
        secure TINYINT(1) DEFAULT 1,
        \`user\` VARCHAR(255),
        pass VARCHAR(255),
        from_name VARCHAR(255) DEFAULT 'EPOS System',
        from_email VARCHAR(255),
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        price DECIMAL(10,2),
        max_branches INT,
        max_users INT
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT,
        plan_id INT,
        starts_at DATE,
        ends_at DATE,
        status VARCHAR(50) DEFAULT 'active'
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS closing_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL DEFAULT 0,
        branch_id INT NOT NULL,
        user_id INT NOT NULL,
        report_date DATE NOT NULL,
        starting_balance DECIMAL(10,2) DEFAULT 0,
        cash_counted DECIMAL(10,2) DEFAULT 0,
        calculated_cash DECIMAL(10,2) DEFAULT 0,
        difference DECIMAL(10,2) DEFAULT 0,
        total_sales DECIMAL(10,2) DEFAULT 0,
        total_deposits DECIMAL(10,2) DEFAULT 0,
        total_cash_in_drawer DECIMAL(10,2) DEFAULT 0,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    try {
      await conn.query("ALTER TABLE closing_reports ADD COLUMN business_id INT NOT NULL DEFAULT 0 AFTER id");
      console.log("[MySQL] Migration: added business_id to closing_reports");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    await conn.query(`
      CREATE TABLE IF NOT EXISTS closing_report_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL,
        payment_type VARCHAR(100) NOT NULL,
        calculated DECIMAL(10,2) DEFAULT 0,
        counted DECIMAL(10,2) DEFAULT 0,
        difference DECIMAL(10,2) DEFAULT 0,
        FOREIGN KEY (report_id) REFERENCES closing_reports(id) ON DELETE CASCADE
      )
    `);
    try {
      await conn.query("ALTER TABLE jobs ADD COLUMN total_quote DECIMAL(10,2) DEFAULT 0 AFTER status");
      await conn.query("ALTER TABLE jobs ADD COLUMN deposit_paid DECIMAL(10,2) DEFAULT 0 AFTER total_quote");
      await conn.query("ALTER TABLE jobs ADD COLUMN remaining_balance DECIMAL(10,2) DEFAULT 0 AFTER deposit_paid");
      await conn.query("ALTER TABLE jobs ADD COLUMN payment_method VARCHAR(100) AFTER remaining_balance");
      console.log("[MySQL] Migration: added financial columns to jobs");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE jobs ADD COLUMN notes TEXT NULL AFTER payment_method");
      console.log("[MySQL] Migration: added notes column to jobs");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    await conn.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT,
        device_id INT,
        activity_type VARCHAR(50) NOT NULL,
        description TEXT,
        reference_link VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
        INDEX idx_log_product (product_id),
        INDEX idx_log_device (device_id)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pos_sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_amount DECIMAL(10, 2)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pos_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT,
        device_id INT,
        final_price DECIMAL(10, 2),
        FOREIGN KEY (sale_id) REFERENCES pos_sales(id),
        FOREIGN KEY (device_id) REFERENCES devices(id)
      )
    `);
    const productAlterQueries = [
      "ALTER TABLE products ADD COLUMN sku_barcode VARCHAR(50) UNIQUE AFTER id",
      "ALTER TABLE products ADD COLUMN base_unit_price DECIMAL(10, 2) DEFAULT 0.00 AFTER name",
      "ALTER TABLE products ADD COLUMN cost_price DECIMAL(10, 2) DEFAULT 0.00 AFTER base_unit_price",
      "ALTER TABLE products ADD COLUMN category VARCHAR(100) AFTER cost_price",
      "ALTER TABLE products ADD COLUMN min_stock_level INT DEFAULT 0 AFTER allow_overselling",
      "ALTER TABLE products ADD COLUMN is_taxable TINYINT(1) DEFAULT 1 AFTER min_stock_level",
      "ALTER TABLE products ADD COLUMN require_note TINYINT(1) DEFAULT 0 AFTER is_taxable",
      "ALTER TABLE products ADD COLUMN min_sales_price DECIMAL(10,2) DEFAULT 0 AFTER require_note",
      "ALTER TABLE products ADD COLUMN additional_description TEXT NULL AFTER min_sales_price",
      "ALTER TABLE products ADD COLUMN alert_message TEXT NULL AFTER additional_description"
    ];
    for (const sql of productAlterQueries) {
      try {
        await conn.query(sql);
      } catch (e) {
        if (!e.message?.includes("Duplicate column") && !e.message?.includes("Duplicate key")) {
        }
      }
    }
    try {
      await conn.query("ALTER TABLE devices ADD COLUMN product_id INT AFTER id");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE devices ADD COLUMN imei_serial VARCHAR(50) UNIQUE AFTER product_id");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE devices ADD COLUMN date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER carrier");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE devices ADD CONSTRAINT fk_devices_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE invoice_items ADD COLUMN notes TEXT NULL AFTER total");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE invoice_items ADD COLUMN discount_type VARCHAR(20) DEFAULT 'percentage' AFTER discount");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE invoice_items ADD COLUMN refunded_quantity INT DEFAULT 0 AFTER quantity");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE device_transfers ADD COLUMN product_name VARCHAR(255) NULL AFTER notes");
      console.log("[MySQL] Migration: added product_name to device_transfers");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE device_transfers ADD COLUMN sku_code VARCHAR(255) NULL AFTER product_name");
      console.log("[MySQL] Migration: added sku_code to device_transfers");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE device_transfers ADD COLUMN completed_at TIMESTAMP NULL AFTER created_at");
      console.log("[MySQL] Migration: added completed_at to device_transfers");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE product_skus DROP INDEX sku_code");
      console.log("[MySQL] Migration: dropped global unique constraint on product_skus.sku_code");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE activity_logs ADD COLUMN business_id INT NULL AFTER id");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE activity_logs ADD COLUMN branch_id INT NULL AFTER business_id");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE activity_logs ADD COLUMN user_name VARCHAR(100) NULL AFTER user_id");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE activity_logs ADD COLUMN reference_type VARCHAR(50) NULL AFTER description");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE activity_logs ADD COLUMN reference_id INT NULL AFTER reference_type");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE activity_logs ADD COLUMN ip_address VARCHAR(50) NULL AFTER reference_link");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE invoices ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 0 AFTER tax_total");
    } catch (e) {
    }
    try {
      await conn.query("ALTER TABLE invoices ADD COLUMN tax_type VARCHAR(20) DEFAULT 'excluded' AFTER tax_rate");
    } catch (e) {
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    try {
      await conn.query(`
        UPDATE customers 
        SET name = TRIM(REPLACE(name, 'null', ''))
        WHERE name LIKE '%null%'
      `);
      await conn.query(`
        UPDATE customers 
        SET last_name = NULL 
        WHERE last_name = 'null'
      `);
      await conn.query(`
        UPDATE customers 
        SET first_name = NULL 
        WHERE first_name = 'null'
      `);
      await conn.query(`
        UPDATE customers 
        SET name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
        WHERE (name IS NULL OR name = '' OR name = ' ')
          AND (first_name IS NOT NULL OR last_name IS NOT NULL)
      `);
      console.log('[MySQL] Migration: cleaned up customer names containing "null"');
    } catch (e) {
      console.warn("[MySQL] Customer name cleanup migration warning:", e.message);
    }
    await ensureIndex(conn, "invoices", "idx_invoices_biz_branch_date", "business_id, branch_id, created_at");
    await ensureIndex(conn, "invoices", "idx_invoices_number", "invoice_number");
    await ensureIndex(conn, "invoices", "idx_invoices_biz_date", "business_id, created_at");
    await ensureIndex(conn, "jobs", "idx_jobs_biz_branch_status", "business_id, branch_id, status");
    await ensureIndex(conn, "jobs", "idx_jobs_biz_date", "business_id, created_at");
    await ensureIndex(conn, "jobs", "idx_jobs_customer", "customer_id");
    await ensureIndex(conn, "products", "idx_products_biz_del_date", "business_id, deleted_at, created_at");
    await ensureIndex(conn, "products", "idx_products_biz_name", "business_id, name");
    await ensureIndex(conn, "product_skus", "idx_skus_barcode", "barcode");
    await ensureIndex(conn, "product_skus", "idx_skus_prod_sku", "product_id, sku_code");
    await ensureIndex(conn, "devices", "idx_devices_biz_branch_status", "business_id, branch_id, status");
    await ensureIndex(conn, "devices", "idx_devices_sku_status", "sku_id, status, business_id");
    await ensureIndex(conn, "customers", "idx_customers_biz_branch_del", "business_id, branch_id, deleted_at");
    await ensureIndex(conn, "customers", "idx_customers_biz_phone", "business_id, phone");
    await ensureIndex(conn, "payments", "idx_payments_invoice_paid", "invoice_id, paid_at");
    await ensureIndex(conn, "payments", "idx_payments_customer_paid", "customer_id, paid_at");
    await ensureIndex(conn, "closing_reports", "idx_closing_biz_branch_date", "business_id, branch_id, report_date");
    await ensureIndex(conn, "inventory_movements", "idx_inv_mov_biz_branch_type_date", "business_id, branch_id, movement_type, created_at");
    await conn.query(
      `INSERT INTO _schema_meta (key_name, value) VALUES ('schema_version', ?) 
       ON DUPLICATE KEY UPDATE value = ?`,
      [CURRENT_SCHEMA_VERSION, CURRENT_SCHEMA_VERSION]
    );
    console.log("[MySQL] Schema initialised and cached successfully");
  } finally {
    conn.release();
  }
}
async function seedData() {
  const [existing] = await pool.execute("SELECT id FROM businesses LIMIT 1");
  if (existing.length > 0) return;
  const conn = await pool.getConnection();
  try {
    console.log("[MySQL] No businesses found. Seeding initial baseline data...");
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    const [bizResult] = await conn.execute(
      "INSERT INTO businesses (name, email, slug, status) VALUES (?, ?, ?, ?)",
      ["Phone Management System", "support@techinbox.ie", "phone-management-system", "active"]
    );
    const businessId = bizResult.insertId;
    const bcrypt2 = await import("bcryptjs");
    const adminHash = await bcrypt2.hash("Admin123", 10);
    const branchesData = [
      {
        name: "Phone Lab",
        email: "phone.lab.ennis@gmail.com",
        address: "32 O'Connell Street, Clonroad Beg, Ennis, Co. Clare, V95 EW74",
        phone: "(065) 672 4192"
      },
      {
        name: "FIXD GORT",
        email: "fixd.gort@gmail.com",
        address: "1 Bridge St, Ballyhugh, Gort, Co. Galway, H91 FRC8",
        phone: "(089) 981 5157"
      },
      {
        name: "Gadget Reapir & Vape shop",
        email: "istoreirl@gmail.com",
        address: "Apartment 1, Unit 1, Millennium house, Loughrea, Co. Galway, H62 H573",
        phone: "(089) 961 7473"
      },
      {
        name: "iPear Ennis",
        email: "ipear.ennis@gmail.com",
        address: "6 Parnell St, Clonroad Beg, Ennis, Co. Clare, V95 X073",
        phone: "(065) 682 2900"
      },
      {
        name: "iPear in Tesco",
        email: "ipear.clare@gmail.com",
        address: "Unit 20, Francis St, Clonroad Beg, Ennis, Co. Clare, V95 EP8K",
        phone: "(065) 672 4446"
      }
    ];
    let firstBranchId = null;
    for (const b of branchesData) {
      const [brResult] = await conn.execute(
        "INSERT INTO branches (business_id, name, address, phone, status) VALUES (?, ?, ?, ?, ?)",
        [businessId, b.name, b.address, b.phone, "active"]
      );
      const branchId = brResult.insertId;
      if (!firstBranchId) firstBranchId = branchId;
      await conn.execute(
        `INSERT INTO users (business_id, branch_id, name, email, password, password_hash, role, status)
         VALUES (?, ?, ?, ?, ?, ?, 'superadmin', 'approved')`,
        [businessId, branchId, b.name + " Admin", b.email, "Admin123", adminHash]
      );
    }
    const devHash = await bcrypt2.hash(process.env.DEV_PASS || "admin123", 10);
    await conn.execute(
      `INSERT INTO users (business_id, branch_id, name, email, password, password_hash, role, status)
       VALUES (?, ?, ?, ?, '', ?, 'developer', 'approved')`,
      [businessId, firstBranchId, "Developer Panel", "support@techinbox.ie", devHash]
    );
    await conn.execute("INSERT INTO settings (business_id) VALUES (?)", [businessId]);
    await conn.execute("INSERT INTO customers (business_id, name) VALUES (?, ?)", [businessId, "Walk-in Customer"]);
    const methods = ["Debit Card", "Cash", "Other"];
    for (let i = 0; i < methods.length; i++) {
      await conn.execute("INSERT INTO payment_methods (business_id, name, display_order) VALUES (?, ?, ?)", [businessId, methods[i], i + 1]);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    await conn.commit();
    console.log("[MySQL] Reset and Seeding completed.");
  } catch (e) {
    await conn.rollback();
    console.error("[MySQL] Seeding failed:", e.message);
  } finally {
    conn.release();
  }
}
async function ensureSuperAdmin() {
  const [rows] = await pool.execute("SELECT id FROM businesses WHERE name='Phone Management System' LIMIT 1");
  const businesses = rows;
  if (businesses.length === 0) return;
  const businessId = businesses[0].id;
  const [branches] = await pool.execute("SELECT id FROM branches WHERE business_id = ? LIMIT 1", [businessId]);
  const branchList = branches;
  if (branchList.length === 0) return;
  const branchId = branchList[0].id;
  const bcrypt2 = await import("bcryptjs");
  const hash = await bcrypt2.hash("Admin123", 10);
  await pool.execute(
    `INSERT INTO users (business_id, branch_id, name, email, password, password_hash, role, status)
     VALUES (?, ?, 'Super Admin', 'tanveerfixit@gmail.com', 'Admin123', ?, 'superadmin', 'approved')
     ON DUPLICATE KEY UPDATE role='superadmin', status='approved', password='Admin123', business_id=?, branch_id=?`,
    [businessId, branchId, hash, businessId, branchId]
  );
  await pool.execute(
    `UPDATE users SET role='developer', password=''
     WHERE (email='admin@icover.ie' OR email='support@techinbox.ie') AND role IN ('admin','developer')`,
    []
  );
  console.log("[MySQL] Superadmin and developer roles ensured.");
}
async function logActivity({
  business_id,
  branch_id,
  user_id,
  user_name,
  activity_type,
  description,
  reference_type,
  reference_id,
  reference_link,
  ip_address,
  user_agent
}) {
  try {
    await execute(
      `INSERT INTO activity_logs 
        (business_id, branch_id, user_id, user_name, activity_type, description, reference_type, reference_id, reference_link, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        business_id ?? null,
        branch_id ?? null,
        user_id ?? null,
        user_name ?? null,
        activity_type,
        description,
        reference_type ?? null,
        reference_id ?? null,
        reference_link ?? null,
        ip_address ?? null,
        user_agent ?? null
      ]
    );
  } catch (err) {
    console.error("[ActivityLog] Failed to record activity:", err.message);
  }
}
var pool, CURRENT_SCHEMA_VERSION;
var init_mysql = __esm({
  "src/mysql.ts"() {
    dotenv.config();
    if (process.env.DB_PASS === void 0) {
      throw new Error("[SECURITY FATAL] DB_PASS is not set in the .env file. Refusing to start with insecure credentials.");
    }
    pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 15,
      maxIdle: Number(process.env.DB_MAX_IDLE) || 10,
      idleTimeout: Number(process.env.DB_IDLE_TIMEOUT) || 6e4,
      queueLimit: Number(process.env.DB_QUEUE_LIMIT) || 0,
      connectTimeout: 2e4,
      decimalNumbers: true,
      timezone: "Z",
      enableKeepAlive: true,
      keepAliveInitialDelay: 1e4,
      charset: "utf8mb4_unicode_ci"
    });
    CURRENT_SCHEMA_VERSION = "2026_08_OPTIMIZATION_V4";
  }
});

// src/services/mailer.ts
import nodemailer from "nodemailer";
function invalidateMailTransporter() {
  cachedTransporter = null;
  cachedKey = "";
}
async function getTransporter() {
  const settings = await queryOne("SELECT * FROM smtp_settings WHERE business_id = 1");
  let user = process.env.SMTP_USER || "noreply@clarelab.com";
  let pass = process.env.SMTP_PASS || "Tani!!8877";
  let host = process.env.SMTP_HOST || "smtp.hostinger.com";
  let port = Number(process.env.SMTP_PORT) || 465;
  let secure = process.env.SMTP_SECURE !== "false";
  if (settings && settings.user && settings.pass) {
    user = settings.user;
    pass = settings.pass;
    host = settings.host || "smtp.hostinger.com";
    port = Number(settings.port) || 465;
    secure = settings.secure === 1;
  }
  const currentKey = `${host}:${port}:${user}:${secure}`;
  if (cachedTransporter && cachedKey === currentKey) {
    return cachedTransporter;
  }
  cachedKey = currentKey;
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 5e3,
    greetingTimeout: 5e3,
    socketTimeout: 1e4,
    auth: { user, pass }
  });
  return cachedTransporter;
}
async function getFromAddress() {
  const settings = await queryOne("SELECT * FROM smtp_settings WHERE business_id = 1");
  const name = settings?.from_name || process.env.SMTP_FROM_NAME || "PhoneLab EPOS";
  const email = settings?.from_email || settings?.user || process.env.SMTP_USER || "noreply@clarelab.com";
  return `"${name}" <${email}>`;
}
async function sendMail(to, subject, html) {
  const transporter = await getTransporter();
  const from = await getFromAddress();
  await transporter.sendMail({ from, to, subject, html });
}
async function sendAccountApproved(user) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#27ae60;">Hi ${user.name}, your account is approved! \u2713</h2>
    <p>An administrator has approved your account. You can now log in to the EPOS system.</p>
  </div>`;
  await sendMail(user.email, "Account Approved \u2713", html);
}
async function sendAccountRejected(user) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#e74c3c;">Hi ${user.name},</h2>
    <p>Unfortunately, your account registration has been <strong>rejected</strong> by an administrator.</p>
    <p>If you believe this is a mistake, please contact your administrator directly.</p>
  </div>`;
  await sendMail(user.email, "Account Registration Rejected", html);
}
async function sendAccountDeactivated(user) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#e67e22;">Hi ${user.name},</h2>
    <p>Your EPOS account has been <strong>deactivated</strong> by an administrator.</p>
    <p>Please contact your administrator if you have any questions.</p>
  </div>`;
  await sendMail(user.email, "Account Deactivated", html);
}
async function sendOtpCode(user, otp) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#2c3e50;">Password Reset OTP</h2>
    <p>Hi ${user.name},</p>
    <p>Use the following code to reset your password. It expires in <strong>10 minutes</strong>.</p>
    <div style="font-size:36px;font-weight:bold;letter-spacing:12px;text-align:center;padding:24px;background:#fff;border:2px solid #2980b9;border-radius:8px;margin:20px 0;color:#2980b9;">${otp}</div>
    <p style="color:#7f8c8d;font-size:13px;">If you did not request this, please ignore this email.</p>
  </div>`;
  await sendMail(user.email, "Your EPOS Password Reset Code", html);
}
async function sendGeneratedPassword(user, password) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#2c3e50;">Your EPOS Account Password</h2>
    <p>Hi ${user.name},</p>
    <p>An administrator has set a new password for your EPOS account:</p>
    <div style="font-size:22px;font-weight:bold;text-align:center;padding:16px;background:#fff;border:2px solid #27ae60;border-radius:8px;margin:20px 0;color:#27ae60;font-family:monospace;">${password}</div>
    <p>Please log in and change your password immediately.</p>
    <p style="color:#7f8c8d;font-size:13px;">If you did not expect this email, contact your administrator.</p>
  </div>`;
  await sendMail(user.email, "Your EPOS Account Password", html);
}
async function sendTestEmail(toEmail) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#2980b9;">\u2713 SMTP Test Successful</h2>
    <p>Your Hostinger SMTP email settings are configured correctly and working.</p>
    <p style="color:#7f8c8d;font-size:13px;">Sent from your EPOS Admin Portal.</p>
  </div>`;
  await sendMail(toEmail, "EPOS SMTP Test Email", html);
}
async function sendInvoiceEmail(to, subject, invoice, company, customNote, branch) {
  const branchName = branch?.name || invoice?.branch_name || "";
  const branchAddress = branch?.address || invoice?.branch_address || company?.address || "";
  const branchPhone = branch?.phone || invoice?.branch_phone || company?.phone || "";
  const isDevEmail = (emailStr) => {
    if (!emailStr) return true;
    const lower = emailStr.toLowerCase().trim();
    return lower === "support@techinbox.ie" || lower === "tanveerfixit@gmail.com";
  };
  let storeEmail = "";
  if (branch?.email && !isDevEmail(branch.email)) {
    storeEmail = branch.email.trim();
  } else if (invoice?.branch_email && !isDevEmail(invoice.branch_email)) {
    storeEmail = invoice.branch_email.trim();
  } else if (company?.email && !isDevEmail(company.email)) {
    storeEmail = company.email.trim();
  }
  const grandTotal = Number(invoice.grand_total) || 0;
  const subtotal = Number(invoice.subtotal) || 0;
  const taxTotal = Number(invoice.tax_total) || 0;
  const discountTotal = Number(invoice.discount_total) || 0;
  const paidAmount = Number(invoice.paid_amount) || (invoice.payments && invoice.payments.length > 0 ? invoice.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) : grandTotal);
  const dueAmount = Math.max(0, Number(invoice.due_amount) || grandTotal - paidAmount);
  const changeDue = Math.max(0, paidAmount - grandTotal);
  const isPaid = invoice.status === "paid" || dueAmount <= 5e-3;
  const itemsHtml = (invoice.items || []).map((item, idx) => `
    <tr style="border-bottom: 1px solid #f1f5f9; background: ${idx % 2 === 0 ? "#ffffff" : "#fafafa"};">
      <td style="padding: 12px 10px; font-size: 13px; color: #111827; vertical-align: top;">
        <div style="font-weight: 600; color: #111827; font-size: 13.5px;">${item.product_name || "Item"}</div>
        ${item.sku_code ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">SKU: ${item.sku_code}</div>` : ""}
        ${item.imei ? `<div style="font-size: 11px; color: #4b5563; font-weight: 500; margin-top: 2px;">IMEI: ${item.imei}</div>` : ""}
        ${item.notes ? `<div style="font-size: 11px; color: #6b7280; font-style: italic; margin-top: 2px;">\u21B3 ${item.notes}</div>` : ""}
      </td>
      <td style="padding: 12px 6px; font-size: 13px; text-align: center; color: #374151; vertical-align: top; white-space: nowrap;">${item.quantity}</td>
      <td style="padding: 12px 8px; font-size: 13px; text-align: right; color: #374151; vertical-align: top; white-space: nowrap;">\u20AC${(Number(item.price) || 0).toFixed(2)}</td>
      <td style="padding: 12px 10px; font-size: 13px; text-align: right; font-weight: 700; color: #111827; vertical-align: top; white-space: nowrap;">\u20AC${(Number(item.total) || 0).toFixed(2)}</td>
    </tr>
  `).join("");
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${subject}</title>
      <style>
        body, table, td, p, a, li, blockquote {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        table, td {
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        a {
          color: #374151 !important;
          text-decoration: none !important;
        }
        a[x-apple-data-detectors] {
          color: inherit !important;
          text-decoration: none !important;
          font-size: inherit !important;
          font-family: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
        }
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
          }
          .mobile-padding {
            padding: 16px 12px !important;
          }
          .mobile-stack {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
            text-align: left !important;
          }
          .mobile-right-align {
            text-align: left !important;
            margin-top: 12px !important;
          }
          .totals-table {
            width: 100% !important;
          }
          .hide-mobile {
            display: none !important;
          }
          .item-table th, .item-table td {
            padding: 10px 6px !important;
            font-size: 12px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 20px 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #111827;">
      <center style="width: 100%; table-layout: fixed; background-color: #f4f5f7;">
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); text-align: left;">
          
          <!-- 1. Header (Clean Light Store & Branch Presentation) -->
          <div style="background: #ffffff; padding: 26px 24px 20px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
            <div style="font-size: 22px; font-weight: 800; letter-spacing: 0.3px; color: #111827;">
              ${company?.name || "EPOS"}
            </div>
            ${branchName ? `
              <div style="font-size: 14px; font-weight: 600; color: #4b5563; margin-top: 4px;">
                ${branchName}
              </div>
            ` : ""}
            <div style="margin-top: 6px; font-size: 12.5px; color: #6b7280; line-height: 1.45;">
              ${branchAddress ? `<div>${branchAddress}</div>` : ""}
              <div style="margin-top: 3px;">
                ${branchPhone ? `<span style="color: #6b7280;">Tel: ${branchPhone}</span>` : ""}
                ${branchPhone && storeEmail ? ` <span style="color: #d1d5db;">\u2022</span> ` : ""}
                ${storeEmail ? `<span style="color: #4b5563; font-weight: 500;">${storeEmail}</span>` : ""}
              </div>
            </div>
          </div>

          <!-- 2. Invoice & Customer Meta Section (Clean Light Cards) -->
          <div class="mobile-padding" style="padding: 18px 24px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td class="mobile-stack" style="vertical-align: top; width: 55%;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">
                    Billed To
                  </div>
                  <div style="font-size: 15px; font-weight: 700; color: #111827;">
                    ${invoice.customer?.name || invoice.customer_name || "Walk-in Customer"}
                  </div>
                  ${invoice.customer?.phone || invoice.customer_phone ? `
                    <div style="font-size: 12.5px; color: #4b5563; margin-top: 2px;">
                      Tel: ${invoice.customer?.phone || invoice.customer_phone}
                    </div>
                  ` : ""}
                  ${invoice.customer?.email || invoice.customer_email ? `
                    <div style="font-size: 12.5px; color: #4b5563; margin-top: 1px;">
                      ${invoice.customer?.email || invoice.customer_email}
                    </div>
                  ` : ""}
                </td>
                <td class="mobile-stack mobile-right-align" style="vertical-align: top; width: 45%; text-align: right;">
                  <div style="font-size: 15px; font-weight: 800; color: #111827; letter-spacing: 0.2px;">
                    Invoice #${invoice.invoice_number}
                  </div>
                  <div style="font-size: 12.5px; color: #6b7280; margin-top: 2px;">
                    Date: ${new Date(invoice.created_at || Date.now()).toLocaleDateString("en-IE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </div>
                  <div style="margin-top: 6px;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; ${isPaid ? "background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;" : "background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;"}">
                      ${isPaid ? "PAID \u2713" : "BALANCE DUE"}
                    </span>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- 3. Optional Custom Message -->
          ${customNote ? `
            <div style="margin: 16px 24px 0 24px; padding: 12px 16px; background: #f8fafc; border-left: 3px solid #64748b; border-radius: 4px; font-size: 13px; color: #334155; line-height: 1.45;">
              ${customNote.replace(/\n/g, "<br/>")}
            </div>
          ` : ""}

          <!-- 4. Items Table (Clean Minimal Table) -->
          <div class="mobile-padding" style="padding: 20px 24px;">
            <table class="item-table" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
              <thead>
                <tr style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                  <th style="padding: 10px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Item</th>
                  <th style="padding: 10px 6px; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; width: 45px; letter-spacing: 0.5px;">Qty</th>
                  <th style="padding: 10px 8px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; width: 80px; letter-spacing: 0.5px;">Price</th>
                  <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; width: 85px; letter-spacing: 0.5px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- 5. Totals & Tax Summary Breakdown -->
            <div style="margin-top: 16px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="hide-mobile" style="width: 40%; vertical-align: top; padding-right: 12px;">
                    ${invoice.payments && invoice.payments.length > 0 ? `
                      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #6b7280; margin-bottom: 6px;">
                        Payment Summary
                      </div>
                      ${invoice.payments.map((p) => `
                        <div style="font-size: 12px; color: #4b5563; margin-bottom: 3px;">
                          \u2022 ${p.method ? p.method.charAt(0).toUpperCase() + p.method.slice(1) : "Payment"}: <strong>\u20AC${(Number(p.amount) || 0).toFixed(2)}</strong>
                        </div>
                      `).join("")}
                    ` : ""}
                  </td>
                  <td class="mobile-stack" style="width: 60%; vertical-align: top;">
                    <table class="totals-table" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280;">Subtotal:</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827;">\u20AC${subtotal.toFixed(2)}</td>
                      </tr>
                      ${discountTotal > 0 ? `
                        <tr>
                          <td style="padding: 4px 0; color: #16a34a;">Discount:</td>
                          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a;">-\u20AC${discountTotal.toFixed(2)}</td>
                        </tr>
                      ` : ""}
                      ${taxTotal > 0 ? `
                        <tr>
                          <td style="padding: 4px 0; color: #6b7280;">VAT Included:</td>
                          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827;">\u20AC${taxTotal.toFixed(2)}</td>
                        </tr>
                      ` : ""}
                      <tr style="border-top: 1.5px solid #111827; font-size: 15px; font-weight: 800;">
                        <td style="padding: 8px 0; color: #111827;">Grand Total:</td>
                        <td style="padding: 8px 0; text-align: right; color: #111827;">\u20AC${grandTotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280;">Amount Paid:</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a;">\u20AC${paidAmount.toFixed(2)}</td>
                      </tr>
                      ${changeDue > 5e-3 ? `
                        <tr>
                          <td style="padding: 4px 0; color: #6b7280;">Change Returned:</td>
                          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827;">\u20AC${changeDue.toFixed(2)}</td>
                        </tr>
                      ` : ""}
                      ${dueAmount > 5e-3 ? `
                        <tr style="border-top: 1px dashed #f87171;">
                          <td style="padding: 6px 0; color: #dc2626; font-weight: 700;">Balance Due:</td>
                          <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #dc2626;">\u20AC${dueAmount.toFixed(2)}</td>
                        </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <!-- 6. Footer (Clean Light Footer) -->
          <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 18px 24px; text-align: center; font-size: 12px; color: #6b7280; line-height: 1.5;">
            <div style="font-weight: 600; color: #111827; margin-bottom: 2px;">
              Thank you for your business!
            </div>
            ${branchName ? `<div>${company?.name || "EPOS"} \u2014 ${branchName}</div>` : ""}
            ${storeEmail ? `
              <div style="margin-top: 4px; color: #6b7280;">
                Questions? Contact us at <span style="color: #374151; font-weight: 500;">${storeEmail}</span>
              </div>
            ` : ""}
          </div>

        </div>
      </center>
    </body>
    </html>
  `;
  await sendMail(to, subject, html);
}
var cachedTransporter, cachedKey, baseStyle;
var init_mailer = __esm({
  "src/services/mailer.ts"() {
    init_mysql();
    cachedTransporter = null;
    cachedKey = "";
    baseStyle = `font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:8px;`;
  }
});

// src/routes/auth.ts
var auth_exports = {};
__export(auth_exports, {
  adminRouter: () => adminRouter,
  default: () => auth_default,
  invalidateUserAuthCache: () => invalidateUserAuthCache,
  requireAdminAsync: () => requireAdminAsync,
  requireAuth: () => requireAuth,
  requireAuthAsync: () => requireAuthAsync,
  revokedTokens: () => revokedTokens,
  userPasswordResets: () => userPasswordResets
});
import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
function verifyToken(token) {
  if (!token) return null;
  if (revokedTokens.has(token)) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const resetTime = userPasswordResets.get(decoded.userId);
    if (resetTime && decoded.iat < resetTime) return null;
    return decoded;
  } catch {
    return null;
  }
}
function invalidateUserAuthCache(userId) {
  if (userId) {
    authUserCache.delete(userId);
  } else {
    authUserCache.clear();
  }
}
function requireAuth(req, res, next) {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Unauthorized" });
  req._sessionToken = token;
  req.userId = decoded.userId;
  next();
}
async function requireAuthAsync(req, res, next) {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Unauthorized" });
  try {
    const cached = authUserCache.get(decoded.userId);
    let user;
    if (cached && Date.now() < cached.expiresAt) {
      user = cached.user;
    } else {
      user = await queryOne("SELECT * FROM users WHERE id=?", [decoded.userId]);
      if (!user) return res.status(401).json({ error: "User not found" });
      authUserCache.set(decoded.userId, { user, expiresAt: Date.now() + 45e3 });
    }
    req._sessionToken = token;
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (e) {
    console.error("[Auth] requireAuthAsync error:", e.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
async function requireAdminAsync(req, res, next) {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = req.user || await queryOne("SELECT * FROM users WHERE id=?", [decoded.userId]);
    if (!user || user.role === "staff" || !["tanveerfixit@gmail.com", "support@techinbox.ie"].includes(user.email)) {
      return res.status(403).json({ error: "Admin access required. Only Super Admin has access." });
    }
    req._sessionToken = token;
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}
function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-");
}
var JWT_SECRET, revokedTokens, userPasswordResets, _cleanup, authUserCache, router, signupSchema, loginSchema, resetPasswordSchema, adminRouter, auth_default;
var init_auth = __esm({
  "src/routes/auth.ts"() {
    init_mysql();
    init_mailer();
    JWT_SECRET = process.env.JWT_SECRET || "EPOS_SUPER_SECRET_FALLBACK_KEY_2026";
    revokedTokens = /* @__PURE__ */ new Set();
    userPasswordResets = /* @__PURE__ */ new Map();
    _cleanup = setInterval(() => {
      revokedTokens.clear();
    }, 60 * 60 * 1e3);
    if (typeof _cleanup.unref === "function") _cleanup.unref();
    authUserCache = /* @__PURE__ */ new Map();
    router = Router();
    signupSchema = z.object({
      name: z.string().min(2, "Business Name is required"),
      email: z.string().email("Invalid email address"),
      address: z.string().min(2, "Address is required"),
      contact: z.string().min(3, "Contact number is required"),
      password: z.string().min(6, "Password must be at least 6 characters")
    });
    router.post("/signup", async (req, res, next) => {
      try {
        const data = signupSchema.parse(req.body);
        const { name, email, address, contact, password } = data;
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          const existing = await queryOne("SELECT id FROM users WHERE email=?", [email]);
          if (existing) {
            conn.release();
            return res.status(409).json({ error: "An account with this email already exists" });
          }
          const password_hash = await bcrypt.hash(password, 10);
          let slug = slugify(name);
          const [existingSlug] = await conn.execute("SELECT id FROM businesses WHERE slug = ?", [slug]);
          if (existingSlug.length > 0) {
            slug = `${slug}-${Math.floor(1e3 + Math.random() * 9e3)}`;
          }
          const [biz] = await conn.execute(
            "INSERT INTO businesses (name, slug, email, phone, address, status) VALUES (?, ?, ?, ?, ?, ?)",
            [name, slug, email, contact, address, "active"]
          );
          const businessId = biz.insertId;
          const [br] = await conn.execute(
            "INSERT INTO branches (business_id, name, phone, address, status) VALUES (?, ?, ?, ?, ?)",
            [businessId, name, contact, address, "active"]
          );
          const branchId = br.insertId;
          const [userResult] = await conn.execute(
            "INSERT INTO users (business_id, branch_id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'staff', 'active')",
            [businessId, branchId, `${name} User`, email, password_hash]
          );
          const userId = userResult.insertId;
          await conn.execute("INSERT INTO settings (business_id) VALUES (?)", [businessId]);
          const methods = ["Cash", "Card", "Other"];
          for (let i = 0; i < methods.length; i++) {
            await conn.execute("INSERT INTO payment_methods (business_id, name, display_order) VALUES (?, ?, ?)", [businessId, methods[i], i + 1]);
          }
          await conn.commit();
          conn.release();
          const token = jwt.sign(
            { id: userId, email, role: "staff", business_id: businessId, branch_id: branchId },
            JWT_SECRET,
            { expiresIn: "7d" }
          );
          return res.json({
            success: true,
            message: "Business registered successfully!",
            token,
            user: {
              id: userId,
              name: `${name} User`,
              email,
              role: "staff",
              business_id: businessId,
              business_name: name,
              branch_id: branchId,
              branch_name: name,
              branch_slug: slug
            }
          });
        } catch (e) {
          await conn.rollback();
          conn.release();
          throw e;
        }
      } catch (e) {
        next(e);
      }
    });
    loginSchema = z.object({
      email: z.string().email("Invalid email address"),
      password: z.string().min(1, "Password is required")
    });
    router.post("/login", async (req, res, next) => {
      const data = loginSchema.parse(req.body);
      const { email, password } = data;
      try {
        const user = await queryOne("SELECT * FROM users WHERE email=? AND deleted_at IS NULL", [email]);
        if (!user) return res.status(401).json({ error: "Invalid email or password" });
        if (user.role !== "developer") {
          const business2 = await queryOne("SELECT status FROM businesses WHERE id=?", [user.business_id]);
          if (business2 && business2.status !== "active") {
            return res.status(403).json({ error: "Your business account is pending developer approval or has been deactivated." });
          }
          if (user.role !== "superadmin" && user.role !== "admin") {
            const settings = await queryOne("SELECT allow_signin FROM settings WHERE business_id=?", [user.business_id]);
            if (settings && settings.allow_signin === 0) {
              return res.status(403).json({ error: "Sign-in is currently disabled. Contact your administrator." });
            }
          }
        }
        if (user.status === "pending") return res.status(403).json({ error: "Your account is pending admin approval." });
        if (user.status === "rejected") return res.status(403).json({ error: "Your account registration was rejected." });
        if (user.status === "inactive") return res.status(403).json({ error: "Your account has been deactivated." });
        let valid = false;
        if (user.password_hash) {
          valid = await bcrypt.compare(password, user.password_hash);
        } else {
          valid = user.password === password;
          if (valid) {
            const hash = await bcrypt.hash(password, 10);
            await execute("UPDATE users SET password_hash=?, password='' WHERE id=?", [hash, user.id]);
          }
        }
        if (!valid) return res.status(401).json({ error: "Invalid email or password" });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "2h" });
        await execute("UPDATE users SET last_login=NOW() WHERE id=?", [user.id]);
        const branch = await queryOne("SELECT * FROM branches WHERE id=?", [user.branch_id]);
        const business = await queryOne("SELECT name FROM businesses WHERE id=?", [user.business_id]);
        try {
          const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
          const ipAddress = (typeof rawIp === "string" ? rawIp.split(",")[0].trim() : String(rawIp)).replace(/^::ffff:/, "");
          const userAgent = req.headers["user-agent"] || "";
          const parseDevice = (ua) => {
            let os = "Unknown OS";
            if (ua.includes("Windows")) os = "Windows";
            else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
            else if (ua.includes("iPhone")) os = "iOS";
            else if (ua.includes("iPad")) os = "iPadOS";
            else if (ua.includes("Android")) os = "Android";
            else if (ua.includes("Linux")) os = "Linux";
            let browser = "Browser";
            if (ua.includes("Edg/")) browser = "Edge";
            else if (ua.includes("Chrome")) browser = "Chrome";
            else if (ua.includes("Safari")) browser = "Safari";
            else if (ua.includes("Firefox")) browser = "Firefox";
            return `${browser} on ${os}`;
          };
          const deviceSummary = parseDevice(userAgent);
          const loginDescription = `Logged in from IP ${ipAddress || "127.0.0.1"} (${deviceSummary})`;
          await logActivity({
            business_id: user.business_id,
            branch_id: user.branch_id,
            user_id: user.id,
            user_name: user.name,
            activity_type: "User Login",
            description: loginDescription,
            ip_address: ipAddress || "127.0.0.1",
            user_agent: userAgent
          });
        } catch (logErr) {
          console.error("[Auth] Failed to log user login activity:", logErr.message);
        }
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            branch_id: user.branch_id,
            branch_name: branch?.name,
            business_id: user.business_id,
            business_name: business?.name
          }
        });
      } catch (e) {
        next(e);
      }
    });
    router.get("/branches-lookup", async (req, res, next) => {
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: "Business email required" });
      try {
        const business = await queryOne("SELECT id FROM businesses WHERE email=?", [email]);
        if (!business) return res.status(404).json({ error: "No business found with this email" });
        const branches = await query("SELECT id, name FROM branches WHERE business_id=? AND deleted_at IS NULL", [business.id]);
        res.json(branches);
      } catch (e) {
        next(e);
      }
    });
    router.post("/logout", (req, res, next) => {
      const token = req.headers["authorization"]?.replace("Bearer ", "");
      if (token) revokedTokens.add(token);
      res.json({ success: true });
    });
    router.get("/me", requireAuthAsync, async (req, res, next) => {
      try {
        const user = await queryOne(`
      SELECT u.*, b.name as branch_name, biz.name as business_name 
      FROM users u LEFT JOIN branches b ON u.branch_id=b.id 
      LEFT JOIN businesses biz ON u.business_id=biz.id WHERE u.id=?
    `, [req.userId]);
        if (!user) return res.status(404).json({ error: "User not found" });
        const { password, password_hash, reset_token, otp_code, ...safeUser } = user;
        res.json(safeUser);
      } catch (e) {
        next(e);
      }
    });
    router.post("/forgot-password", async (req, res, next) => {
      res.json({ success: true, message: "If this email exists, an OTP code has been sent." });
      try {
        const user = await queryOne("SELECT * FROM users WHERE email=?", [req.body.email]);
        if (!user) return;
        const otp = String(Math.floor(1e5 + Math.random() * 9e5));
        const expires = new Date(Date.now() + 2 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
        await execute("UPDATE users SET otp_code=?,otp_expires=? WHERE id=?", [otp, expires, user.id]);
        try {
          await sendOtpCode({ name: user.name, email: user.email }, otp);
        } catch {
        }
      } catch {
      }
    });
    router.post("/verify-otp", async (req, res, next) => {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });
      try {
        const user = await queryOne("SELECT * FROM users WHERE email=? AND otp_code=?", [email, String(otp)]);
        if (!user) return res.status(400).json({ error: "Invalid OTP code" });
        const expiry = new Date(user.otp_expires).getTime();
        if (isNaN(expiry) || expiry < Date.now()) {
          return res.status(400).json({ error: "OTP has expired. Please request a new one." });
        }
        const reset_token = crypto.randomUUID();
        const tokenExpires = new Date(Date.now() + 30 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
        await execute(
          "UPDATE users SET otp_code=NULL,otp_expires=NULL,reset_token=?,reset_token_expires=? WHERE id=?",
          [reset_token, tokenExpires, user.id]
        );
        res.json({ success: true, reset_token });
      } catch (e) {
        next(e);
      }
    });
    resetPasswordSchema = z.object({
      token: z.string().min(1, "Token is required"),
      password: z.string().min(8, "Password must be at least 8 characters")
    });
    router.post("/reset-password", async (req, res, next) => {
      const data = resetPasswordSchema.parse(req.body);
      const { token, password } = data;
      try {
        const user = await queryOne("SELECT * FROM users WHERE reset_token=?", [token]);
        if (!user) return res.status(400).json({ error: "Invalid or expired reset link" });
        if (new Date(user.reset_token_expires) < /* @__PURE__ */ new Date()) {
          return res.status(400).json({ error: "Reset link has expired. Please request a new one." });
        }
        const password_hash = await bcrypt.hash(password, 10);
        userPasswordResets.set(user.id, Date.now() / 1e3);
        await execute(
          "UPDATE users SET password_hash=?,password='',reset_token=NULL,reset_token_expires=NULL WHERE id=?",
          [password_hash, user.id]
        );
        res.json({ success: true, message: "Password updated. You can now log in." });
      } catch (e) {
        next(e);
      }
    });
    adminRouter = Router();
    adminRouter.get("/users", requireAdminAsync, async (req, res, next) => {
      try {
        const isMaster = ["developer", "superadmin"].includes(req.user.role);
        const sql = isMaster ? `SELECT u.id,u.name,u.email,u.role,u.status,u.last_login,u.created_at,u.business_id,b.name as branch_name,b.id as branch_id
         FROM users u LEFT JOIN branches b ON u.branch_id=b.id
         WHERE u.deleted_at IS NULL ORDER BY u.created_at DESC` : `SELECT u.id,u.name,u.email,u.role,u.status,u.last_login,u.created_at,u.business_id,b.name as branch_name,b.id as branch_id
         FROM users u LEFT JOIN branches b ON u.branch_id=b.id
         WHERE u.business_id=? AND u.deleted_at IS NULL ORDER BY u.created_at DESC`;
        const params = isMaster ? [] : [req.user.business_id];
        res.json(await query(sql, params));
      } catch (e) {
        next(e);
      }
    });
    adminRouter.put("/users/:id/status", requireAdminAsync, async (req, res, next) => {
      const { status } = req.body;
      if (!["approved", "rejected", "inactive", "pending"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      try {
        const isMaster = ["developer", "superadmin"].includes(req.user.role);
        const user = isMaster ? await queryOne("SELECT * FROM users WHERE id=? AND deleted_at IS NULL", [req.params.id]) : await queryOne("SELECT * FROM users WHERE id=? AND business_id=? AND deleted_at IS NULL", [req.params.id, req.user.business_id]);
        if (!user) return res.status(404).json({ error: "User not found or access denied" });
        if (["support@techinbox.ie", "tanveerfixit@gmail.com"].includes(user.email) && status !== "approved") {
          return res.status(400).json({ error: "Master admin accounts cannot be deactivated" });
        }
        await execute("UPDATE users SET status=? WHERE id=?", [status, req.params.id]);
        try {
          if (status === "approved") await sendAccountApproved({ name: user.name, email: user.email });
          else if (status === "rejected") await sendAccountRejected({ name: user.name, email: user.email });
          else if (status === "inactive") await sendAccountDeactivated({ name: user.name, email: user.email });
        } catch {
        }
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.put("/users/:id", requireAdminAsync, async (req, res, next) => {
      const { name, email, branch_id, role, password } = req.body;
      try {
        const isMaster = ["developer", "superadmin"].includes(req.user.role);
        const existing = isMaster ? await queryOne("SELECT id, email FROM users WHERE id=? AND deleted_at IS NULL", [req.params.id]) : await queryOne("SELECT id, email FROM users WHERE id=? AND business_id=? AND deleted_at IS NULL", [req.params.id, req.user.business_id]);
        if (!existing) return res.status(404).json({ error: "User not found or access denied" });
        if (email && email.trim() !== "" && email.trim() !== existing.email) {
          const emailCheck = await queryOne("SELECT id FROM users WHERE email=? AND id!=? AND deleted_at IS NULL", [email.trim(), req.params.id]);
          if (emailCheck) {
            return res.status(400).json({ error: "This email address is already in use by another account" });
          }
        }
        const updatedEmail = email && email.trim() !== "" ? email.trim() : existing.email;
        if (password && password.trim() !== "") {
          const password_hash = await bcrypt.hash(password.trim(), 10);
          await execute(
            "UPDATE users SET name=?,email=?,branch_id=?,role=?,password='',password_hash=? WHERE id=?",
            [name, updatedEmail, branch_id, role, password_hash, req.params.id]
          );
        } else {
          await execute(
            "UPDATE users SET name=?,email=?,branch_id=?,role=? WHERE id=?",
            [name, updatedEmail, branch_id, role, req.params.id]
          );
        }
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.delete("/users/:id", requireAdminAsync, async (req, res, next) => {
      try {
        const isMaster = ["developer", "superadmin"].includes(req.user.role);
        const sql = isMaster ? "UPDATE users SET deleted_at=NOW() WHERE id=?" : "UPDATE users SET deleted_at=NOW() WHERE id=? AND business_id=?";
        const params = isMaster ? [req.params.id] : [req.params.id, req.user.business_id];
        const r = await execute(sql, params);
        if (r.affectedRows === 0) return res.status(404).json({ error: "User not found or access denied" });
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.post("/users/:id/reset-password", requireAdminAsync, async (req, res, next) => {
      try {
        const user = await queryOne(
          "SELECT * FROM users WHERE id=? AND business_id=?",
          [req.params.id, req.user.business_id]
        );
        if (!user) return res.status(404).json({ error: "User not found or access denied" });
        const newPass = crypto.randomBytes(6).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) + "!";
        const hash = await bcrypt.hash(newPass, 10);
        await execute(
          "UPDATE users SET password='',password_hash=?,last_generated_password=? WHERE id=?",
          [hash, newPass, user.id]
        );
        try {
          await sendGeneratedPassword({ name: user.name, email: user.email }, newPass);
        } catch {
        }
        res.json({ success: true, message: `Password reset and emailed to ${user.email}` });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.post("/users/:id/resend-password", requireAdminAsync, async (req, res, next) => {
      try {
        const user = await queryOne(
          "SELECT * FROM users WHERE id=? AND business_id=?",
          [req.params.id, req.user.business_id]
        );
        if (!user) return res.status(404).json({ error: "User not found or access denied" });
        if (!user.last_generated_password) {
          return res.status(400).json({ error: "No generated password on record. Use Reset Password instead." });
        }
        try {
          await sendGeneratedPassword({ name: user.name, email: user.email }, user.last_generated_password);
        } catch {
        }
        res.json({ success: true, message: `Password resent to ${user.email}` });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.get("/branches", requireAdminAsync, async (req, res, next) => {
      try {
        if (["superadmin", "developer"].includes(req.user.role)) {
          res.json(await query(`
        SELECT b.*, biz.name as business_name 
        FROM branches b 
        JOIN businesses biz ON b.business_id = biz.id 
        WHERE b.deleted_at IS NULL
        ORDER BY biz.name, b.name
      `));
        } else {
          res.json(await query("SELECT * FROM branches WHERE business_id=? AND deleted_at IS NULL", [req.user.business_id]));
        }
      } catch (e) {
        next(e);
      }
    });
    adminRouter.post("/branches", requireAdminAsync, async (req, res, next) => {
      const { name, address, phone, business_id } = req.body;
      const targetBusinessId = business_id || req.user.business_id;
      try {
        const r = await execute(
          "INSERT INTO branches (business_id,name,address,phone,status) VALUES (?,?,?,?,?)",
          [targetBusinessId, name, address, phone, "active"]
        );
        res.json({ id: r.insertId, business_id: targetBusinessId, name, address, phone, status: "active" });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.put("/branches/:id", requireAdminAsync, async (req, res, next) => {
      const { name, address, phone, status, business_id } = req.body;
      try {
        if (business_id) {
          await execute(
            "UPDATE branches SET name=?, address=?, phone=?, status=?, business_id=? WHERE id=?",
            [name, address, phone, status || "active", business_id, req.params.id]
          );
        } else {
          await execute(
            "UPDATE branches SET name=?, address=?, phone=?, status=? WHERE id=?",
            [name, address, phone, status || "active", req.params.id]
          );
        }
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.delete("/branches/:id", requireAdminAsync, async (req, res, next) => {
      try {
        await execute('UPDATE branches SET deleted_at=CURRENT_TIMESTAMP, status="inactive" WHERE id=?', [req.params.id]);
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.get("/smtp", requireAdminAsync, async (req, res, next) => {
      try {
        const settings = await queryOne("SELECT * FROM smtp_settings WHERE business_id = 1");
        if (settings) {
          res.json({
            ...settings,
            pass: settings.pass ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""
          });
        } else {
          res.json({
            host: process.env.SMTP_HOST || "smtp.hostinger.com",
            port: Number(process.env.SMTP_PORT) || 465,
            secure: 1,
            user: process.env.SMTP_USER || "noreply@clarelab.com",
            pass: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
            from_name: process.env.SMTP_FROM_NAME || "PhoneLab EPOS",
            from_email: process.env.SMTP_USER || "noreply@clarelab.com"
          });
        }
      } catch (e) {
        next(e);
      }
    });
    adminRouter.put("/smtp", requireAdminAsync, async (req, res, next) => {
      const { host, port, secure, user, pass, from_name, from_email } = req.body;
      try {
        const existing = await queryOne("SELECT * FROM smtp_settings WHERE business_id = 1");
        const updatedPass = pass && pass !== "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" && pass !== "********" ? pass : existing?.pass || process.env.SMTP_PASS || "Tani!!8877";
        if (existing) {
          await execute(
            "UPDATE smtp_settings SET host=?, port=?, secure=?, user=?, pass=?, from_name=?, from_email=? WHERE business_id = 1",
            [host, port, secure ? 1 : 0, user, updatedPass, from_name, from_email]
          );
        } else {
          await execute(
            "INSERT INTO smtp_settings (business_id, host, port, secure, user, pass, from_name, from_email) VALUES (1, ?, ?, ?, ?, ?, ?, ?)",
            [host, port, secure ? 1 : 0, user, updatedPass, from_name, from_email]
          );
        }
        invalidateMailTransporter();
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.post("/smtp/test", requireAdminAsync, async (req, res, next) => {
      try {
        const userEmail = req.user?.email || "noreply@clarelab.com";
        await sendTestEmail(userEmail);
        res.json({ success: true, message: `Test email sent to ${userEmail}` });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    });
    adminRouter.get("/system/businesses", requireAdminAsync, async (req, res, next) => {
      try {
        res.json(await query("SELECT * FROM businesses WHERE deleted_at IS NULL ORDER BY name ASC"));
      } catch (e) {
        next(e);
      }
    });
    adminRouter.post("/system/businesses", requireAdminAsync, async (req, res, next) => {
      const { name, email, phone, address, city, state, zip_code, country } = req.body;
      try {
        if (!name || !name.trim()) {
          return res.status(400).json({ error: "Business name is required" });
        }
        let slug = slugify(name);
        const [existingSlug] = await pool.execute("SELECT id FROM businesses WHERE slug = ?", [slug]);
        if (existingSlug.length > 0) {
          slug = `${slug}-${Math.floor(1e3 + Math.random() * 9e3)}`;
        }
        const [bizResult] = await pool.execute(
          "INSERT INTO businesses (name, slug, email, phone, address, city, state, zip_code, country, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [name.trim(), slug, email || null, phone || null, address || null, city || null, state || null, zip_code || null, country || null, "active"]
        );
        const businessId = bizResult.insertId;
        const [brResult] = await pool.execute(
          "INSERT INTO branches (business_id, name, phone, address, status) VALUES (?, ?, ?, ?, ?)",
          [businessId, name.trim(), phone || null, address || null, "active"]
        );
        const branchId = brResult.insertId;
        await pool.execute("INSERT INTO settings (business_id) VALUES (?)", [businessId]);
        const methods = ["Cash", "Card", "Other"];
        for (let i = 0; i < methods.length; i++) {
          await pool.execute("INSERT INTO payment_methods (business_id, name, display_order) VALUES (?, ?, ?)", [businessId, methods[i], i + 1]);
        }
        res.json({ id: businessId, branch_id: branchId, name, slug, email, phone, address, status: "active" });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.put("/system/businesses/:id", requireAdminAsync, async (req, res, next) => {
      const { name, slug, email, phone, address, city, state, zip_code, country, status } = req.body;
      try {
        let finalSlug = slug;
        if (!finalSlug && name) {
          finalSlug = slugify(name);
          const [existingSlug] = await pool.execute("SELECT id FROM businesses WHERE slug = ? AND id != ?", [finalSlug, req.params.id]);
          if (existingSlug.length > 0) {
            finalSlug = `${finalSlug}-${Math.floor(1e3 + Math.random() * 9e3)}`;
          }
        }
        await execute(
          "UPDATE businesses SET name=?,slug=?,email=?,phone=?,address=?,city=?,state=?,zip_code=?,country=?,status=? WHERE id=?",
          [name, finalSlug, email, phone, address, city, state, zip_code, country, status || "active", req.params.id]
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.put("/system/businesses/:id/status", requireAdminAsync, async (req, res, next) => {
      const { status } = req.body;
      try {
        await execute("UPDATE businesses SET status=? WHERE id=?", [status, req.params.id]);
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    auth_default = router;
  }
});

// src/routes/public.ts
var public_exports = {};
__export(public_exports, {
  default: () => public_default
});
import { Router as Router2 } from "express";
var router2, public_default;
var init_public = __esm({
  "src/routes/public.ts"() {
    init_mysql();
    router2 = Router2();
    router2.get("/business/:slug", async (req, res, next) => {
      const { slug } = req.params;
      try {
        const business = await queryOne(`
      SELECT id, name, email, phone, address, city, state, zip_code, country, status
      FROM businesses 
      WHERE slug = ? AND status = 'active' AND deleted_at IS NULL
    `, [slug]);
        if (!business) {
          return res.status(404).json({ error: "Business not found" });
        }
        const branches = await queryOne("SELECT id, name, address, phone FROM branches WHERE business_id = ? AND deleted_at IS NULL", [business.id]);
        res.json({
          ...business,
          branches: Array.isArray(branches) ? branches : [branches].filter(Boolean)
        });
      } catch (e) {
        next(e);
      }
    });
    public_default = router2;
  }
});

// src/routes/products.ts
var products_exports = {};
__export(products_exports, {
  default: () => products_default
});
import { Router as Router3 } from "express";
import { z as z2 } from "zod";
var router3, createProductSchema, quickAddSchema, products_default;
var init_products = __esm({
  "src/routes/products.ts"() {
    init_mysql();
    router3 = Router3();
    router3.get("/", async (req, res, next) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { search, category_id, manufacturer_id, product_type } = req.query;
        let whereClause = "WHERE p.deleted_at IS NULL AND p.business_id = ?";
        const params = [req.user.business_id];
        if (search && String(search).trim() !== "") {
          whereClause += " AND (p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ?)";
          const term = `%${String(search).trim()}%`;
          params.push(term, term, term);
        }
        if (category_id && String(category_id).trim() !== "" && category_id !== "All Categories") {
          whereClause += " AND p.category_id = ?";
          params.push(parseInt(category_id));
        }
        if (manufacturer_id && String(manufacturer_id).trim() !== "" && manufacturer_id !== "All Manufacturers") {
          whereClause += " AND p.manufacturer_id = ?";
          params.push(parseInt(manufacturer_id));
        }
        if (product_type && String(product_type).trim() !== "" && product_type !== "All Types" && product_type !== "All Products") {
          whereClause += " AND p.product_type = ?";
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
        const mapped = products.map((p) => ({
          ...p,
          name: p.product_name + (p.sku_code ? ` (${p.sku_code})` : "")
        }));
        res.json({
          products: mapped,
          total,
          page,
          limit
        });
      } catch (e) {
        console.error("[GetProducts] Error:", e.message);
        next(e);
      }
    });
    router3.get("/stats", async (req, res, next) => {
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
      } catch (e) {
        next(e);
      }
    });
    router3.get("/sample-csv", async (req, res) => {
      const sampleContent = `"Product Name","Product Type","Category","Brand / Manufacturer","SKU","Barcode","Cost Price","Selling Price","Quantity In Stock","Min Stock Level","Taxable"
"Privacy Tempered Glass / Screen Protector","Standard","Accessories","","GSP05","GSP05",2.50,15.00,25,5,"Yes"
"20W USB-C Power Adapter","Standard","Accessories","Apple","AP-20W-PWR","194252157007",12.00,25.00,10,3,"Yes"
"Silicone Case - Midnight","Standard","Cases","Apple","CASE-IP14-BLK","194253322114",8.00,29.99,15,2,"Yes"
"Screen Replacement Service","Labor/Services","Repairs","","SRV-SCRN","",0.00,65.00,0,0,"No"`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="standard_general_products.csv"');
      res.send(sampleContent);
    });
    router3.get("/export-csv", async (req, res, next) => {
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
        const escapeCsv = (str) => {
          if (str === null || str === void 0) return '""';
          const s = String(str).trim();
          return `"${s.replace(/"/g, '""')}"`;
        };
        let csvContent = `"Product Name","Product Type","Category","Brand / Manufacturer","SKU","Barcode","Cost Price","Selling Price","Quantity In Stock","Min Stock Level","Taxable"
`;
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
          ].join(",");
          csvContent += line + "\n";
        }
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="general_products_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv"`);
        res.send(csvContent);
      } catch (e) {
        console.error("[ExportGeneralProducts] Error:", e.message);
        next(e);
      }
    });
    router3.post("/import-csv", async (req, res, next) => {
      const { products, duplicateHandling = "overwrite" } = req.body;
      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: "No product records provided" });
      }
      const businessId = req.user.business_id;
      const branchId = req.user.branch_id || 1;
      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const errors = [];
      const conn = await pool.getConnection();
      try {
        await conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
        await conn.query("SET collation_connection = 'utf8mb4_unicode_ci'");
        await conn.beginTransaction();
        for (let i = 0; i < products.length; i++) {
          const p = products[i];
          const prodName = String(p.product_name || p.product || p.name || "").trim();
          const catName = String(p.category_name || p.category || "").trim();
          const mfgName = String(p.manufacturer_name || p.manufacturer || p.brand || "").trim();
          const skuCode = String(p.sku || p.sku_code || "").trim();
          const barcode = String(p.barcode || "").trim();
          const rawType = String(p.product_type || p.type || "Standard").trim();
          const costPrice = parseFloat(p.cost_price || p.cost || 0) || 0;
          const sellingPrice = parseFloat(p.selling_price || p.price || 0) || 0;
          const qty = parseInt(p.quantity || p.qty || p.qty_sold || p.current_inventory || 0) || 0;
          const minStock = parseInt(p.min_stock_level || p.min_stock || 0) || 0;
          const isTaxableRaw = String(p.is_taxable || p.taxable || "Yes").trim().toLowerCase();
          const isTaxable = isTaxableRaw === "yes" || isTaxableRaw === "1" || isTaxableRaw === "true" ? 1 : 0;
          if (!prodName) {
            errors.push(`Row ${i + 1}: Skipped - Product Name is required`);
            skipped++;
            continue;
          }
          try {
            let categoryId = null;
            if (catName) {
              const [cr] = await conn.execute(
                "SELECT id FROM categories WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci LIMIT 1",
                [businessId, catName]
              );
              if (cr.length > 0) {
                categoryId = cr[0].id;
              } else {
                const [ins] = await conn.execute(
                  "INSERT INTO categories (business_id, name) VALUES (?, ?)",
                  [businessId, catName]
                );
                categoryId = ins.insertId;
              }
            }
            let manufacturerId = null;
            if (mfgName) {
              const [mr] = await conn.execute(
                "SELECT id FROM manufacturers WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci LIMIT 1",
                [businessId, mfgName]
              );
              if (mr.length > 0) {
                manufacturerId = mr[0].id;
              } else {
                const [ins] = await conn.execute(
                  "INSERT INTO manufacturers (business_id, name) VALUES (?, ?)",
                  [businessId, mfgName]
                );
                manufacturerId = ins.insertId;
              }
            }
            let mappedType = "stock";
            if (rawType.toLowerCase() === "labor/services" || rawType.toLowerCase() === "service") {
              mappedType = "service";
            } else if (rawType.toLowerCase() === "mobile devices" || rawType.toLowerCase() === "serialized") {
              mappedType = "serialized";
            }
            const [pr] = await conn.execute(
              "SELECT id FROM products WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci AND deleted_at IS NULL LIMIT 1",
              [businessId, prodName]
            );
            let productId;
            let isNewProduct = false;
            if (pr.length > 0) {
              productId = pr[0].id;
              if (duplicateHandling === "overwrite") {
                await conn.execute(
                  "UPDATE products SET category_id = COALESCE(?, category_id), manufacturer_id = COALESCE(?, manufacturer_id), product_type = ?, min_stock_level = ?, is_taxable = ? WHERE id = ?",
                  [categoryId, manufacturerId, mappedType, minStock, isTaxable, productId]
                );
              }
            } else {
              const [ins] = await conn.execute(
                "INSERT INTO products (business_id, category_id, manufacturer_id, name, product_type, min_stock_level, is_taxable, allow_overselling) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
                [businessId, categoryId, manufacturerId, prodName, mappedType, minStock, isTaxable]
              );
              productId = ins.insertId;
              isNewProduct = true;
            }
            const effectiveSku = skuCode || `SKU-${prodName.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
            const effectiveBarcode = barcode || effectiveSku;
            const [sr] = await conn.execute(
              'SELECT id FROM product_skus WHERE product_id = ? AND (sku_code COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci OR ? = "") LIMIT 1',
              [productId, effectiveSku, skuCode]
            );
            let skuId;
            if (sr.length > 0) {
              skuId = sr[0].id;
              if (duplicateHandling === "overwrite") {
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
                "INSERT INTO product_skus (product_id, sku_code, barcode, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)",
                [productId, effectiveSku, effectiveBarcode, costPrice, sellingPrice]
              );
              skuId = ins.insertId;
              if (!isNewProduct) updated++;
            }
            if (qty > 0 || isNewProduct) {
              await conn.execute(
                "INSERT INTO branch_stock (sku_id, branch_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)",
                [skuId, branchId, qty]
              );
            }
            if (isNewProduct) {
              imported++;
            }
          } catch (rowErr) {
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
      } catch (e) {
        await conn.rollback();
        console.error("[ImportGeneralProducts] Error:", e.message);
        res.status(500).json({ error: e.message || "Failed to import general products" });
      } finally {
        conn.release();
      }
    });
    router3.get("/special/get-deposit-product", async (req, res, next) => {
      const businessId = req.user?.business_id;
      if (!businessId) return res.status(401).json({ error: "Business context missing" });
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
        let skuInfo = await findProduct();
        if (skuInfo) return res.json(skuInfo);
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          const [check] = await conn.execute("SELECT id FROM product_skus WHERE sku_code = ?", [depositSkuCode]);
          if (check.length > 0) {
            await conn.rollback();
            skuInfo = await findProduct();
            return res.json(skuInfo);
          }
          const [pr] = await conn.execute(
            "INSERT INTO products (business_id,name,product_type,allow_overselling) VALUES (?,?,?,?)",
            [businessId, "Wallet Deposit", "service", 1]
          );
          const productId = pr.insertId;
          const [sr] = await conn.execute(
            "INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)",
            [productId, depositSkuCode, depositSkuCode, 0, 0]
          );
          const skuId = sr.insertId;
          await conn.commit();
          return res.json({
            sku_id: skuId,
            product_id: productId,
            product_name: "Wallet Deposit",
            sku_code: depositSkuCode,
            selling_price: 0
          });
        } catch (innerErr) {
          await conn.rollback().catch(() => {
          });
          if (innerErr.code === "ER_DUP_ENTRY") {
            skuInfo = await findProduct();
            if (skuInfo) return res.json(skuInfo);
          }
          throw innerErr;
        } finally {
          conn.release();
        }
      } catch (e) {
        console.error("[DepositProduct] Error:", e.message);
        res.status(500).json({ error: e.message || "Failed to initialize deposit product" });
      }
    });
    router3.get("/special/get-repair-product", async (req, res, next) => {
      const businessId = req.user?.business_id;
      if (!businessId) return res.status(401).json({ error: "Business context missing" });
      const repairSkuCode = `REPAIR-SERVICE-${businessId}`;
      const findProduct = async () => {
        return await queryOne(`
      SELECT s.id as sku_id, p.id as product_id, p.name as product_name, s.sku_code, s.selling_price
      FROM product_skus s
      JOIN products p ON s.product_id = p.id
      WHERE s.sku_code = ? AND p.business_id = ?
    `, [repairSkuCode, businessId]);
      };
      try {
        let skuInfo = await findProduct();
        if (skuInfo) return res.json(skuInfo);
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          const [check] = await conn.execute("SELECT id FROM product_skus WHERE sku_code = ?", [repairSkuCode]);
          if (check.length > 0) {
            await conn.rollback();
            skuInfo = await findProduct();
            return res.json(skuInfo);
          }
          const [pr] = await conn.execute(
            "INSERT INTO products (business_id,name,product_type,allow_overselling) VALUES (?,?,?,?)",
            [businessId, "Repair Service", "service", 1]
          );
          const productId = pr.insertId;
          const [sr] = await conn.execute(
            "INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)",
            [productId, repairSkuCode, repairSkuCode, 0, 0]
          );
          const skuId = sr.insertId;
          await conn.commit();
          return res.json({
            sku_id: skuId,
            product_id: productId,
            product_name: "Repair Service",
            sku_code: repairSkuCode,
            selling_price: 0
          });
        } catch (innerErr) {
          await conn.rollback().catch(() => {
          });
          if (innerErr.code === "ER_DUP_ENTRY") {
            skuInfo = await findProduct();
            if (skuInfo) return res.json(skuInfo);
          }
          throw innerErr;
        } finally {
          conn.release();
        }
      } catch (e) {
        console.error("[RepairProduct] Error:", e.message);
        res.status(500).json({ error: e.message || "Failed to initialize repair product" });
      }
    });
    router3.get("/:id", async (req, res, next) => {
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
        if (!product) return res.status(404).json({ error: "Product not found" });
        const stock = await query(`
      SELECT b.name as branch_name, b.id as branch_id, COALESCE(bs.quantity,0) as quantity
      FROM branches b
      LEFT JOIN branch_stock bs ON b.id = bs.branch_id AND bs.sku_id = ?
      WHERE b.business_id = ?
    `, [req.params.id, businessId]);
        res.json({ ...product, stock });
      } catch (e) {
        next(e);
      }
    });
    router3.put("/:id", async (req, res, next) => {
      const { product_name, category_id, manufacturer_id, sku_code, barcode, selling_price, cost_price, product_type } = req.body;
      const skuId = req.params.id;
      const businessId = req.user.business_id;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [skuRows] = await conn.execute("SELECT s.*, p.business_id FROM product_skus s JOIN products p ON s.product_id = p.id WHERE s.id = ? AND p.business_id = ?", [skuId, businessId]);
        const sku = skuRows[0];
        if (!sku) throw new Error("Product not found in your business catalog");
        await conn.execute(
          "UPDATE product_skus SET sku_code=?,barcode=?,selling_price=?,cost_price=? WHERE id=?",
          [sku_code, barcode, selling_price, cost_price, skuId]
        );
        await conn.execute(
          "UPDATE products SET name=?,category_id=?,manufacturer_id=?,product_type=? WHERE id=?",
          [product_name, category_id, manufacturer_id, product_type, sku.product_id]
        );
        const changes = [];
        if (product_name !== sku.product_name) changes.push(`Name: ${sku.product_name} -> ${product_name}`);
        if (selling_price != sku.selling_price) changes.push(`Price: ${sku.selling_price} -> ${selling_price}`);
        if (cost_price != sku.cost_price) changes.push(`Cost: ${sku.cost_price} -> ${cost_price}`);
        if (sku_code !== sku.sku_code) changes.push(`SKU: ${sku.sku_code} -> ${sku_code}`);
        const detailMsg = changes.length > 0 ? changes.join(", ") : "Details updated";
        await conn.execute(
          "INSERT INTO product_activity (sku_id,user_id,activity,details) VALUES (?,?,?,?)",
          [skuId, req.userId, "Product Updated", detailMsg]
        );
        await conn.execute(
          "INSERT INTO activity_logs (product_id,user_id,activity_type,description) VALUES (?,?,?,?)",
          [sku.product_id, req.userId, "Product Updated", detailMsg]
        );
        await conn.commit();
        res.json({ success: true });
      } catch (e) {
        await conn.rollback();
        next(e);
      } finally {
        conn.release();
      }
    });
    createProductSchema = z2.object({
      name: z2.string().min(1, "Product name is required"),
      category_id: z2.number().nullable().optional(),
      manufacturer_id: z2.number().nullable().optional(),
      selling_price: z2.number().or(z2.string().transform(Number)).optional(),
      cost_price: z2.number().or(z2.string().transform(Number)).optional(),
      product_type: z2.string().optional(),
      sku_code: z2.string().optional(),
      barcode: z2.string().optional(),
      allow_overselling: z2.boolean().optional(),
      min_stock_level: z2.number().or(z2.string().transform(Number)).optional(),
      is_taxable: z2.boolean().optional(),
      require_note: z2.boolean().optional(),
      min_sales_price: z2.number().or(z2.string().transform(Number)).optional(),
      additional_description: z2.string().optional(),
      alert_message: z2.string().optional()
    });
    router3.post("/", async (req, res, next) => {
      const data = createProductSchema.parse(req.body);
      const {
        name,
        category_id,
        manufacturer_id,
        selling_price,
        cost_price,
        product_type,
        sku_code,
        barcode,
        allow_overselling,
        min_stock_level,
        is_taxable,
        require_note,
        min_sales_price,
        additional_description,
        alert_message
      } = data;
      const businessId = req.user.business_id;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [existingByName] = await conn.execute(
          "SELECT id FROM products WHERE business_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND deleted_at IS NULL LIMIT 1",
          [businessId, name]
        );
        if (existingByName.length > 0) {
          await conn.rollback();
          return res.status(400).json({
            error: "You already have a product with the same name. Add to inventory instead of creating a new product."
          });
        }
        const [pr] = await conn.execute(
          "INSERT INTO products (business_id,name,category_id,manufacturer_id,product_type,allow_overselling,min_stock_level,is_taxable,require_note,min_sales_price,additional_description,alert_message) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            businessId,
            name,
            category_id,
            manufacturer_id,
            product_type,
            allow_overselling === false ? 0 : 1,
            min_stock_level ?? null,
            is_taxable ? 1 : 0,
            require_note ? 1 : 0,
            min_sales_price ?? null,
            additional_description ?? null,
            alert_message ?? null
          ]
        );
        const productId = pr.insertId;
        let finalSku = sku_code?.trim() || "SKU-" + Math.random().toString(36).substring(2, 9).toUpperCase();
        const [sr] = await conn.execute(
          "INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)",
          [productId, finalSku, barcode || finalSku, cost_price, selling_price]
        );
        const skuId = sr.insertId;
        await conn.execute(
          "INSERT INTO product_activity (sku_id,user_id,activity,details) VALUES (?,?,?,?)",
          [skuId, req.userId, "Product Created", `Product "${name}" created with SKU ${finalSku}`]
        );
        await conn.execute(
          "INSERT INTO activity_logs (product_id,user_id,activity_type,description) VALUES (?,?,?,?)",
          [productId, req.userId, "Product Created", `Product "${name}" created with SKU ${finalSku}`]
        );
        await conn.commit();
        res.json({ id: skuId });
      } catch (e) {
        await conn.rollback();
        if (e.code === "ER_DUP_ENTRY" || e.message?.includes("Duplicate entry")) {
          return res.status(400).json({ error: "A product with this SKU code already exists" });
        }
        next(e);
      } finally {
        conn.release();
      }
    });
    quickAddSchema = z2.object({
      name: z2.string().min(1, "Product name is required"),
      category_id: z2.number().nullable().optional(),
      manufacturer_id: z2.number().nullable().optional(),
      selling_price: z2.number().or(z2.string().transform(Number)).optional(),
      cost_price: z2.number().or(z2.string().transform(Number)).optional(),
      sku_code: z2.string().optional(),
      barcode: z2.string().optional(),
      branch_id: z2.number().optional(),
      quantity: z2.number().or(z2.string().transform(Number)).optional()
    });
    router3.post("/quick-add", async (req, res, next) => {
      const data = quickAddSchema.parse(req.body);
      const { name, category_id, manufacturer_id, selling_price, cost_price, sku_code, barcode, branch_id, quantity } = data;
      const businessId = req.user.business_id;
      const activeBranchId = branch_id || req.user.branch_id;
      const stockQty = parseInt(String(quantity)) || 0;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [existingByName] = await conn.execute(
          "SELECT id FROM products WHERE business_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND deleted_at IS NULL LIMIT 1",
          [businessId, name]
        );
        if (existingByName.length > 0) {
          await conn.rollback();
          return res.status(400).json({
            error: "You already have a product with the same name. Add to inventory instead of creating a new product."
          });
        }
        const [pr] = await conn.execute(
          "INSERT INTO products (business_id,name,category_id,manufacturer_id,product_type,allow_overselling) VALUES (?,?,?,?,?,?)",
          [businessId, name, category_id || null, manufacturer_id || null, "stock", 1]
        );
        const productId = pr.insertId;
        let finalSku = sku_code?.trim() || "SKU-" + Math.random().toString(36).substring(2, 9).toUpperCase();
        const [sr] = await conn.execute(
          "INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)",
          [productId, finalSku, barcode || finalSku, cost_price || 0, selling_price || 0]
        );
        const skuId = sr.insertId;
        await conn.execute(
          "INSERT INTO product_activity (sku_id,user_id,activity,details) VALUES (?,?,?,?)",
          [skuId, req.userId, "Product Created", `Product "${name}" quick-added with SKU ${finalSku}`]
        );
        await conn.execute(
          "INSERT INTO activity_logs (product_id,user_id,activity_type,description) VALUES (?,?,?,?)",
          [productId, req.userId, "Product Created", `Product "${name}" quick-added with SKU ${finalSku}`]
        );
        if (stockQty > 0) {
          await conn.execute(
            "INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)",
            [activeBranchId, skuId, stockQty]
          );
          await conn.execute(
            "INSERT INTO inventory_movements (business_id,branch_id,sku_id,movement_type,quantity,unit_cost,reference_type,reference_id) VALUES (?,?,?,?,?,?,?,?)",
            [businessId, activeBranchId, skuId, "adjustment", stockQty, cost_price || 0, "quick_add", skuId]
          );
        }
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
        const fullProduct = prodRows[0];
        res.json(fullProduct);
      } catch (e) {
        await conn.rollback();
        next(e);
      } finally {
        conn.release();
      }
    });
    router3.delete("/:id", async (req, res, next) => {
      try {
        const businessId = req.user.business_id;
        await execute("UPDATE products SET deleted_at=NOW() WHERE business_id=? AND id=(SELECT product_id FROM product_skus WHERE id=?)", [businessId, req.params.id]);
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    router3.get("/:id/activity", async (req, res, next) => {
      try {
        const acts = await query(`
      SELECT a.*, u.name as user_name FROM product_activity a
      LEFT JOIN users u ON a.user_id = u.id
      JOIN product_skus s ON a.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      WHERE a.sku_id = ? AND p.business_id = ? ORDER BY a.created_at DESC
    `, [req.params.id, req.user.business_id]);
        res.json(acts);
      } catch (e) {
        next(e);
      }
    });
    router3.get("/:skuId/devices", async (req, res, next) => {
      try {
        const devices = await query(`
      SELECT d.id, d.imei, d.color, d.gb, d.\`condition\`, d.status, d.created_at, inv.invoice_number
      FROM devices d
      LEFT JOIN invoice_items ii ON d.id = ii.device_id
      LEFT JOIN invoices inv ON ii.invoice_id = inv.id
      WHERE d.sku_id = ? AND d.business_id = ? ORDER BY d.created_at DESC
    `, [req.params.skuId, req.user.business_id]);
        res.json(devices);
      } catch (e) {
        next(e);
      }
    });
    router3.get("/:skuId/available-devices", async (req, res, next) => {
      try {
        const devices = await query(
          `SELECT id,imei,cost_price,status,created_at FROM devices WHERE sku_id=? AND status='in_stock' AND business_id=?`,
          [req.params.skuId, req.user.business_id]
        );
        res.json(devices);
      } catch (e) {
        next(e);
      }
    });
    router3.get("/categories/all", async (req, res, next) => {
      try {
        res.json(await query("SELECT * FROM categories WHERE business_id=?", [req.user.business_id]));
      } catch (e) {
        next(e);
      }
    });
    router3.get("/manufacturers/all", async (req, res, next) => {
      try {
        res.json(await query("SELECT * FROM manufacturers WHERE business_id=?", [req.user.business_id]));
      } catch (e) {
        next(e);
      }
    });
    products_default = router3;
  }
});

// src/routes/customers.ts
var customers_exports = {};
__export(customers_exports, {
  default: () => customers_default
});
import { Router as Router4 } from "express";
import { z as z3 } from "zod";
var router4, customerSchema, depositSchema, customers_default;
var init_customers = __esm({
  "src/routes/customers.ts"() {
    init_mysql();
    router4 = Router4();
    router4.get("/", async (req, res, next) => {
      try {
        const isDeveloper = req.user.role === "developer";
        const branchId = req.user.branch_id;
        const sql = isDeveloper || !branchId ? "SELECT * FROM customers WHERE business_id=? AND deleted_at IS NULL" : "SELECT * FROM customers WHERE business_id=? AND branch_id=? AND deleted_at IS NULL";
        const params = isDeveloper || !branchId ? [req.user.business_id] : [req.user.business_id, branchId];
        res.json(await query(sql, params));
      } catch (e) {
        next(e);
      }
    });
    router4.get("/:id", async (req, res, next) => {
      try {
        const isSuper = req.user.role === "superadmin";
        const sql = isSuper ? "SELECT * FROM customers WHERE id=? AND business_id=?" : "SELECT * FROM customers WHERE id=? AND business_id=? AND branch_id=?";
        const params = isSuper ? [req.params.id, req.user.business_id] : [req.params.id, req.user.business_id, req.user.branch_id];
        const c = await queryOne(sql, params);
        if (!c) return res.status(404).json({ error: "Customer not found" });
        res.json(c);
      } catch (e) {
        next(e);
      }
    });
    customerSchema = z3.object({
      name: z3.string().nullable().optional(),
      phone: z3.string().nullable().optional(),
      email: z3.string().email("Invalid email").optional().or(z3.literal("")).or(z3.null()),
      first_name: z3.string().nullable().optional(),
      last_name: z3.string().nullable().optional(),
      secondary_phone: z3.string().nullable().optional(),
      fax: z3.string().nullable().optional(),
      offers_email: z3.union([z3.boolean(), z3.number().transform((v) => v === 1)]).nullable().optional(),
      company: z3.string().nullable().optional(),
      customer_type: z3.string().nullable().optional(),
      address_line1: z3.string().nullable().optional(),
      address_line2: z3.string().nullable().optional(),
      city: z3.string().nullable().optional(),
      state: z3.string().nullable().optional(),
      zip_code: z3.string().nullable().optional(),
      country: z3.string().nullable().optional(),
      website: z3.string().nullable().optional(),
      alert_message: z3.string().nullable().optional(),
      wallet_balance: z3.number().or(z3.string().transform(Number)).nullable().optional()
    });
    router4.post("/", async (req, res, next) => {
      try {
        const b = customerSchema.parse(req.body);
        const stripNull = (v) => v === null || v === void 0 || v === "null" ? "" : String(v).replace(/\bnull\b/gi, "").trim();
        const derivedFirst = stripNull(b.first_name);
        const derivedLast = stripNull(b.last_name);
        const fullName = stripNull(b.name) || `${derivedFirst} ${derivedLast}`.trim() || "Unknown";
        const businessId = req.user?.business_id;
        const branchId = req.user?.branch_id ?? null;
        if (!businessId) return res.status(400).json({ error: "No business context found. Please log in again." });
        const n = (v) => v === void 0 ? null : v === "" ? null : v;
        const r = await execute(
          `
      INSERT INTO customers (business_id,branch_id,name,phone,email,first_name,last_name,secondary_phone,fax,offers_email,
        company,customer_type,address_line1,address_line2,city,state,zip_code,country,website,alert_message)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            businessId,
            branchId,
            fullName,
            n(b.phone),
            n(b.email),
            n(b.first_name),
            n(b.last_name),
            n(b.secondary_phone),
            n(b.fax),
            b.offers_email ? 1 : 0,
            n(b.company),
            n(b.customer_type),
            n(b.address_line1),
            n(b.address_line2),
            n(b.city),
            n(b.state),
            n(b.zip_code),
            n(b.country),
            n(b.website),
            n(b.alert_message)
          ]
        );
        const [newCustomer] = await pool.execute(
          "SELECT * FROM customers WHERE id = ?",
          [r.insertId]
        );
        res.json(newCustomer[0]);
      } catch (e) {
        console.error("[POST /api/customers] Error:", e.message);
        next(e);
      }
    });
    router4.put("/:id", async (req, res, next) => {
      const data = customerSchema.parse(req.body);
      const {
        phone,
        email,
        address,
        first_name,
        last_name,
        secondary_phone,
        fax,
        offers_email,
        company,
        customer_type,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        country,
        website,
        alert_message,
        wallet_balance
      } = data;
      const stripNull = (v) => v === null || v === void 0 || v === "null" ? "" : String(v).replace(/\bnull\b/gi, "").trim();
      const derivedFirst = stripNull(first_name);
      const derivedLast = stripNull(last_name);
      const name = stripNull(data.name) || `${derivedFirst} ${derivedLast}`.trim() || "Unknown";
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const isSuper = req.user.role === "superadmin";
        const checkSql = isSuper ? "SELECT * FROM customers WHERE id=? AND business_id=?" : "SELECT * FROM customers WHERE id=? AND business_id=? AND branch_id=?";
        const checkParams = isSuper ? [req.params.id, req.user.business_id] : [req.params.id, req.user.business_id, req.user.branch_id];
        const [oldRows] = await conn.execute(checkSql, checkParams);
        const old = oldRows[0];
        if (!old) throw new Error("Customer not found or access denied");
        await conn.execute(
          `
      UPDATE customers SET name=?,phone=?,email=?,address=?,first_name=?,last_name=?,secondary_phone=?,fax=?,offers_email=?,
        company=?,customer_type=?,address_line1=?,address_line2=?,city=?,state=?,zip_code=?,country=?,website=?,alert_message=?,wallet_balance=?
      WHERE id=?`,
          [
            name,
            phone,
            email,
            address,
            first_name,
            last_name,
            secondary_phone,
            fax,
            offers_email ? 1 : 0,
            company,
            customer_type,
            address_line1,
            address_line2,
            city,
            state,
            zip_code,
            country,
            website,
            alert_message,
            wallet_balance || 0,
            req.params.id
          ]
        );
        const changes = [];
        if (old.name !== name) changes.push(`Name: ${old.name} -> ${name}`);
        if (old.phone !== phone) changes.push(`Phone: ${old.phone} -> ${phone}`);
        if (old.wallet_balance !== wallet_balance) changes.push(`Wallet: ${old.wallet_balance} -> ${wallet_balance}`);
        if (changes.length) {
          await conn.execute(
            "INSERT INTO customer_activity (customer_id,user_id,activity,details) VALUES (?,?,?,?)",
            [req.params.id, req.userId, "Profile Updated", changes.join(", ")]
          );
        }
        await conn.commit();
        res.json({ success: true });
      } catch (e) {
        await conn.rollback();
        next(e);
      } finally {
        conn.release();
      }
    });
    router4.delete("/:id", async (req, res, next) => {
      try {
        const isSuper = req.user.role === "superadmin";
        const sql = isSuper ? "UPDATE customers SET deleted_at=NOW() WHERE id=? AND business_id=?" : "UPDATE customers SET deleted_at=NOW() WHERE id=? AND business_id=? AND branch_id=?";
        const params = isSuper ? [req.params.id, req.user.business_id] : [req.params.id, req.user.business_id, req.user.branch_id];
        const r = await execute(sql, params);
        if (r.affectedRows === 0) return res.status(404).json({ error: "Customer not found or access denied" });
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    router4.get("/:id/invoices", async (req, res, next) => {
      try {
        const sql = `
      SELECT i.* FROM invoices i
      JOIN customers c ON i.customer_id=c.id
      WHERE i.customer_id=? AND c.business_id=? ${req.user.role !== "superadmin" ? "AND c.branch_id=?" : ""}
      ORDER BY i.created_at DESC
    `;
        const params = req.user.role !== "superadmin" ? [req.params.id, req.user.business_id, req.user.branch_id] : [req.params.id, req.user.business_id];
        res.json(await query(sql, params));
      } catch (e) {
        next(e);
      }
    });
    router4.get("/:id/payments", async (req, res, next) => {
      try {
        res.json(await query(`
      SELECT p.*, i.invoice_number FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      JOIN customers c ON p.customer_id=c.id
      WHERE p.customer_id=? AND c.business_id=? ORDER BY p.paid_at DESC
    `, [req.params.id, req.user.business_id]));
      } catch (e) {
        next(e);
      }
    });
    router4.get("/:id/ledger", async (req, res, next) => {
      try {
        res.json(await query(`
      SELECT p.*, i.invoice_number FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      JOIN customers c ON p.customer_id=c.id
      WHERE p.customer_id=? AND c.business_id=? ORDER BY p.paid_at DESC
    `, [req.params.id, req.user.business_id]));
      } catch (e) {
        next(e);
      }
    });
    router4.get("/:id/activity", async (req, res, next) => {
      try {
        const sql = `
      SELECT a.*, u.name as user_name FROM customer_activity a
      LEFT JOIN users u ON a.user_id=u.id
      JOIN customers c ON a.customer_id=c.id
      WHERE a.customer_id=? AND c.business_id=? ${req.user.role !== "superadmin" ? "AND c.branch_id=?" : ""}
      ORDER BY a.created_at DESC
    `;
        const params = req.user.role !== "superadmin" ? [req.params.id, req.user.business_id, req.user.branch_id] : [req.params.id, req.user.business_id];
        res.json(await query(sql, params));
      } catch (e) {
        next(e);
      }
    });
    depositSchema = z3.object({
      amount: z3.number().or(z3.string().transform(Number)),
      method: z3.string().optional(),
      note: z3.string().optional()
    });
    router4.post("/:id/payments", async (req, res, next) => {
      const data = depositSchema.parse(req.body);
      const { amount, method, note } = data;
      const numAmount = Number(amount);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const isSuper = req.user.role === "superadmin";
        const checkSql = isSuper ? "SELECT id FROM customers WHERE id=? AND business_id=?" : "SELECT id FROM customers WHERE id=? AND business_id=? AND branch_id=?";
        const checkParams = isSuper ? [req.params.id, req.user.business_id] : [req.params.id, req.user.business_id, req.user.branch_id];
        const [cRows] = await conn.execute(checkSql, checkParams);
        if (cRows.length === 0) throw new Error("Customer not found or access denied");
        const [lastDE] = await conn.execute(
          "SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'DE-%' AND business_id=? ORDER BY id DESC LIMIT 1",
          [req.user.business_id]
        );
        let nextDENum = 1;
        if (lastDE.length > 0) {
          const lastNum = parseInt(lastDE[0].invoice_number.split("-")[1]);
          if (!isNaN(lastNum)) nextDENum = lastNum + 1;
        }
        const invoiceNumber = `DE-${String(nextDENum).padStart(3, "0")}`;
        const [invR] = await conn.execute(
          `INSERT INTO invoices (business_id, branch_id, user_id, customer_id, invoice_number, type, 
        subtotal, tax_total, discount_total, grand_total, paid_amount, due_amount, status)
       VALUES (?, ?, ?, ?, ?, 'wallet', ?, 0, 0, ?, ?, 0, 'paid')`,
          [req.user.business_id, req.user.branch_id, req.userId, req.params.id, invoiceNumber, numAmount, numAmount, numAmount]
        );
        const invoiceId = invR.insertId;
        await conn.execute(
          "INSERT INTO payments (customer_id, invoice_id, type, method, amount) VALUES (?,?,?,?,?)",
          [req.params.id, invoiceId, "wallet_deposit", method || "Cash", numAmount]
        );
        await conn.execute("UPDATE customers SET wallet_balance=COALESCE(wallet_balance,0)+? WHERE id=?", [numAmount, req.params.id]);
        await conn.execute(
          "INSERT INTO customer_activity (customer_id,user_id,activity,details) VALUES (?,?,?,?)",
          [req.params.id, req.userId, "Deposit Received", `Wallet deposit of \u20AC${numAmount.toFixed(2)} received via ${method}. Invoice: ${invoiceNumber}. ${note || ""}`]
        );
        await conn.commit();
        res.json({ success: true, invoice_number: invoiceNumber });
      } catch (e) {
        await conn.rollback();
        next(e);
      } finally {
        conn.release();
      }
    });
    customers_default = router4;
  }
});

// src/routes/invoices.ts
var invoices_exports = {};
__export(invoices_exports, {
  default: () => invoices_default
});
import { Router as Router5 } from "express";
import { z as z4 } from "zod";
var router5, createInvoiceSchema, invoices_default;
var init_invoices = __esm({
  "src/routes/invoices.ts"() {
    init_mysql();
    init_mailer();
    router5 = Router5();
    router5.get("/suggestions", async (req, res, next) => {
      try {
        const { q } = req.query;
        if (!q || q.trim().length < 1) return res.json([]);
        const isDeveloper = req.user.role === "developer";
        const branchId = req.user.branch_id;
        const searchTerm = q.trim();
        const match = searchTerm.match(/^([a-zA-Z]*)[^0-9]*(\d*)$/);
        let sql = "";
        let params = [];
        if (match && match[2]) {
          const prefix = match[1].toUpperCase();
          const num = parseInt(match[2], 10);
          sql = `
        SELECT i.id, i.invoice_number, c.name as customer_name, i.grand_total, i.created_at
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id=c.id
        WHERE i.business_id=?
        AND CAST(SUBSTRING_INDEX(i.invoice_number, '-', -1) AS UNSIGNED) LIKE ?
        ${prefix ? "AND i.invoice_number LIKE ?" : ""}
        ${!isDeveloper && branchId ? "AND i.branch_id=?" : ""}
        ORDER BY i.created_at DESC
        LIMIT 5
      `;
          params.push(req.user.business_id);
          params.push(`${num}%`);
          if (prefix) {
            params.push(`${prefix}-%`);
          }
          if (!isDeveloper && branchId) {
            params.push(branchId);
          }
        } else {
          sql = `
        SELECT i.id, i.invoice_number, c.name as customer_name, i.grand_total, i.created_at
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id=c.id
        WHERE i.business_id=?
        AND (i.invoice_number LIKE ? OR c.name LIKE ?)
        ${!isDeveloper && branchId ? "AND i.branch_id=?" : ""}
        ORDER BY i.created_at DESC
        LIMIT 5
      `;
          params.push(req.user.business_id);
          params.push(`%${searchTerm}%`);
          params.push(`%${searchTerm}%`);
          if (!isDeveloper && branchId) {
            params.push(branchId);
          }
        }
        const rows = await query(sql, params);
        res.json(rows);
      } catch (e) {
        next(e);
      }
    });
    router5.get("/by-number/:invoiceNumber", async (req, res, next) => {
      try {
        const isDeveloper = req.user.role === "developer";
        const branchId = req.user.branch_id;
        const searchTerm = req.params.invoiceNumber.trim();
        const match = searchTerm.match(/^([a-zA-Z]*)[^0-9]*(\d+)$/);
        let sql = "";
        let params = [];
        if (match) {
          const prefix = match[1].toUpperCase();
          const num = parseInt(match[2], 10);
          sql = `
        SELECT id FROM invoices 
        WHERE CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED) = ? 
        AND business_id=? 
        ${prefix ? "AND invoice_number LIKE ?" : ""}
        ${!isDeveloper && branchId ? "AND branch_id=?" : ""}
        ORDER BY id DESC
        LIMIT 1
      `;
          params.push(num);
          params.push(req.user.business_id);
          if (prefix) {
            params.push(`${prefix}-%`);
          }
          if (!isDeveloper && branchId) {
            params.push(branchId);
          }
        } else {
          sql = `
        SELECT id FROM invoices 
        WHERE invoice_number LIKE ? AND business_id=? 
        ${!isDeveloper && branchId ? "AND branch_id=?" : ""}
        ORDER BY id DESC
        LIMIT 1
      `;
          params = [`%${searchTerm}%`, req.user.business_id];
          if (!isDeveloper && branchId) {
            params.push(branchId);
          }
        }
        const inv = await queryOne(sql, params);
        res.json(inv || {});
      } catch (e) {
        next(e);
      }
    });
    router5.get("/export-count", async (req, res, next) => {
      try {
        const { startDate, endDate, branch_id } = req.query;
        const isDeveloper = req.user.role === "developer";
        const branchId = branch_id || req.user.branch_id;
        let whereSql = "WHERE i.business_id=?";
        const params = [req.user.business_id];
        if (!isDeveloper && branchId) {
          whereSql += " AND i.branch_id=?";
          params.push(branchId);
        } else if (branch_id) {
          whereSql += " AND i.branch_id=?";
          params.push(branch_id);
        }
        if (startDate) {
          whereSql += " AND DATE(i.created_at) >= DATE(?)";
          params.push(startDate);
        }
        if (endDate) {
          whereSql += " AND DATE(i.created_at) <= DATE(?)";
          params.push(endDate);
        }
        const rows = await query(`
      SELECT COUNT(*) as total_invoices, COALESCE(SUM(i.grand_total), 0) as total_amount
      FROM invoices i
      ${whereSql}
    `, params);
        const countRow = rows[0] || { total_invoices: 0, total_amount: 0 };
        res.json({
          total_invoices: Number(countRow.total_invoices) || 0,
          total_amount: Number(countRow.total_amount) || 0
        });
      } catch (e) {
        next(e);
      }
    });
    router5.get("/export", async (req, res, next) => {
      try {
        const { startDate, endDate, branch_id, format = "json" } = req.query;
        const isDeveloper = req.user.role === "developer";
        const branchId = branch_id || req.user.branch_id;
        let whereSql = "WHERE i.business_id=?";
        const params = [req.user.business_id];
        if (!isDeveloper && branchId) {
          whereSql += " AND i.branch_id=?";
          params.push(branchId);
        } else if (branch_id) {
          whereSql += " AND i.branch_id=?";
          params.push(branch_id);
        }
        if (startDate) {
          whereSql += " AND DATE(i.created_at) >= DATE(?)";
          params.push(startDate);
        }
        if (endDate) {
          whereSql += " AND DATE(i.created_at) <= DATE(?)";
          params.push(endDate);
        }
        const invoices = await query(`
      SELECT i.id, i.invoice_number, i.business_id, i.branch_id, b.name as branch_name,
             i.customer_id, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             i.subtotal, i.tax_total, i.discount_total, i.grand_total, i.paid_amount, i.due_amount,
             i.status, i.created_at, u.name as created_by_name
      FROM invoices i
      LEFT JOIN branches b ON i.branch_id=b.id
      LEFT JOIN customers c ON i.customer_id=c.id
      LEFT JOIN users u ON i.user_id=u.id
      ${whereSql}
      ORDER BY i.id ASC
    `, params);
        if (invoices.length === 0) {
          if (format === "csv") {
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="invoices_export_${startDate || "all"}.csv"`);
            return res.send("Invoice Number,Date,Customer Name,Customer Phone,Customer Email,Subtotal,Tax Total,Discount Total,Grand Total,Paid Amount,Due Amount,Status,Branch Name,Created By,Item Summary,Payment Summary\n");
          }
          return res.json({
            export_version: "1.0",
            business_id: req.user.business_id,
            generated_at: (/* @__PURE__ */ new Date()).toISOString(),
            filter: { startDate, endDate, branch_id },
            total_count: 0,
            invoices: []
          });
        }
        const invoiceIds = invoices.map((inv) => inv.id);
        const placeholders = invoiceIds.map(() => "?").join(",");
        const items = await query(`
      SELECT ii.invoice_id, ii.sku_id, s.sku_code, s.barcode, p.name as product_name,
             ii.device_id, d.imei, ii.quantity, ii.price, ii.cost, ii.discount, ii.total, ii.notes
      FROM invoice_items ii
      LEFT JOIN product_skus s ON ii.sku_id=s.id
      LEFT JOIN products p ON s.product_id=p.id
      LEFT JOIN devices d ON ii.device_id=d.id
      WHERE ii.invoice_id IN (${placeholders})
    `, invoiceIds);
        const payments = await query(`
      SELECT p.invoice_id, p.method, p.amount, p.type, p.paid_at, p.paid_at as created_at
      FROM payments p
      WHERE p.invoice_id IN (${placeholders})
    `, invoiceIds);
        const itemsMap = /* @__PURE__ */ new Map();
        for (const item of items) {
          if (!itemsMap.has(item.invoice_id)) itemsMap.set(item.invoice_id, []);
          itemsMap.get(item.invoice_id).push(item);
        }
        const paymentsMap = /* @__PURE__ */ new Map();
        for (const p of payments) {
          if (!paymentsMap.has(p.invoice_id)) paymentsMap.set(p.invoice_id, []);
          paymentsMap.get(p.invoice_id).push(p);
        }
        const fullInvoices = invoices.map((inv) => ({
          ...inv,
          items: itemsMap.get(inv.id) || [],
          payments: paymentsMap.get(inv.id) || []
        }));
        if (format === "csv") {
          const escapeCsv = (val) => {
            if (val === null || val === void 0) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          };
          const headers = [
            "Invoice Number",
            "Date",
            "Customer Name",
            "Customer Phone",
            "Customer Email",
            "Subtotal",
            "Tax Total",
            "Discount Total",
            "Grand Total",
            "Paid Amount",
            "Due Amount",
            "Status",
            "Branch Name",
            "Created By",
            "Item Summary",
            "Payment Summary"
          ];
          const rows = fullInvoices.map((inv) => {
            const itemSummary = (inv.items || []).map((it) => `${it.quantity}x ${it.product_name || "Item"} (SKU: ${it.sku_code || "N/A"}${it.imei ? `, IMEI: ${it.imei}` : ""}${it.notes ? `, Note: ${it.notes}` : ""}) @ \u20AC${(Number(it.price) || 0).toFixed(2)} = \u20AC${(Number(it.total) || 0).toFixed(2)}`).join(" | ");
            const paymentSummary = (inv.payments || []).map((p) => `${p.method}: \u20AC${(Number(p.amount) || 0).toFixed(2)}`).join(" | ");
            return [
              escapeCsv(inv.invoice_number),
              escapeCsv(new Date(inv.created_at).toISOString().split("T")[0]),
              escapeCsv(inv.customer_name || "Walk-in Customer"),
              escapeCsv(inv.customer_phone || ""),
              escapeCsv(inv.customer_email || ""),
              (Number(inv.subtotal) || 0).toFixed(2),
              (Number(inv.tax_total) || 0).toFixed(2),
              (Number(inv.discount_total) || 0).toFixed(2),
              (Number(inv.grand_total) || 0).toFixed(2),
              (Number(inv.paid_amount) || 0).toFixed(2),
              (Number(inv.due_amount) || 0).toFixed(2),
              escapeCsv(inv.status),
              escapeCsv(inv.branch_name || ""),
              escapeCsv(inv.created_by_name || ""),
              escapeCsv(itemSummary),
              escapeCsv(paymentSummary)
            ].join(",");
          });
          const csvContent = [headers.join(","), ...rows].join("\n");
          res.setHeader("Content-Type", "text/csv");
          res.setHeader("Content-Disposition", `attachment; filename="invoices_export_${startDate || "all"}_to_${endDate || "now"}.csv"`);
          return res.send(csvContent);
        }
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="invoices_backup_${startDate || "all"}_to_${endDate || "now"}.json"`);
        res.json({
          export_version: "1.0",
          business_id: req.user.business_id,
          generated_at: (/* @__PURE__ */ new Date()).toISOString(),
          filter: { startDate, endDate, branch_id },
          total_count: fullInvoices.length,
          invoices: fullInvoices
        });
      } catch (e) {
        next(e);
      }
    });
    router5.post("/import", async (req, res, next) => {
      const conn = await pool.getConnection();
      try {
        const { invoices, duplicateHandling = "skip" } = req.body;
        if (!Array.isArray(invoices) || invoices.length === 0) {
          return res.status(400).json({ error: "No valid invoices array found in payload" });
        }
        await conn.beginTransaction();
        let importedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const errors = [];
        const [wRows] = await conn.execute(
          "SELECT id FROM customers WHERE name='Walk-in Customer' AND business_id=? LIMIT 1",
          [req.user.business_id]
        );
        let defaultCustomerId = wRows[0]?.id || null;
        if (!defaultCustomerId) {
          const [newWalkin] = await conn.execute(
            "INSERT INTO customers (business_id, name, first_name, last_name) VALUES (?, 'Walk-in Customer', 'Walk-in', 'Customer')",
            [req.user.business_id]
          );
          defaultCustomerId = newWalkin.insertId;
        }
        const [existingInvRows] = await conn.query(
          "SELECT id, invoice_number FROM invoices WHERE business_id=?",
          [req.user.business_id]
        );
        const existingMap = new Map(existingInvRows.map((r) => [r.invoice_number, r.id]));
        for (const inv of invoices) {
          try {
            const invNum = inv.invoice_number || `IMP-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
            if (existingMap.has(invNum)) {
              if (duplicateHandling === "skip") {
                skippedCount++;
                continue;
              } else if (duplicateHandling === "overwrite") {
                const existingId = existingMap.get(invNum);
                await conn.execute("DELETE FROM payments WHERE invoice_id=?", [existingId]);
                await conn.execute("DELETE FROM invoice_items WHERE invoice_id=?", [existingId]);
                await conn.execute("DELETE FROM invoice_activity WHERE invoice_id=?", [existingId]);
                await conn.execute("DELETE FROM invoices WHERE id=?", [existingId]);
              }
            }
            let customerId = defaultCustomerId;
            if (inv.customer_name && inv.customer_name !== "Walk-in Customer") {
              const [custRows] = await conn.execute(
                "SELECT id FROM customers WHERE business_id=? AND (name=? OR (phone IS NOT NULL AND phone=? AND phone != '')) LIMIT 1",
                [req.user.business_id, inv.customer_name, inv.customer_phone || ""]
              );
              if (custRows.length > 0) {
                customerId = custRows[0].id;
              } else {
                const [newCust] = await conn.execute(
                  "INSERT INTO customers (business_id, name, phone, email) VALUES (?, ?, ?, ?)",
                  [req.user.business_id, inv.customer_name, inv.customer_phone || null, inv.customer_email || null]
                );
                customerId = newCust.insertId;
              }
            }
            const subtotal = Number(inv.subtotal) || 0;
            const taxTotal = Number(inv.tax_total) || 0;
            const discountTotal = Number(inv.discount_total) || 0;
            const grandTotal = Number(inv.grand_total) || 0;
            const paidAmount = Number(inv.paid_amount) || 0;
            const dueAmount = Number(inv.due_amount) || 0;
            const status = inv.status || (dueAmount > 0.01 ? paidAmount > 0 ? "partial" : "credit" : "paid");
            const createdAt = inv.created_at ? new Date(inv.created_at) : /* @__PURE__ */ new Date();
            const [invR] = await conn.execute(
              `INSERT INTO invoices 
           (business_id, branch_id, user_id, customer_id, invoice_number, subtotal, tax_total, discount_total, grand_total, paid_amount, due_amount, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                req.user.business_id,
                req.user.branch_id || null,
                req.userId,
                customerId,
                invNum,
                subtotal,
                taxTotal,
                discountTotal,
                grandTotal,
                paidAmount,
                dueAmount,
                status,
                createdAt
              ]
            );
            const invoiceId = invR.insertId;
            if (Array.isArray(inv.items)) {
              for (const item of inv.items) {
                let skuId = item.sku_id || null;
                if (!skuId && item.sku_code) {
                  const [skuRows] = await conn.execute(
                    "SELECT s.id FROM product_skus s JOIN products p ON s.product_id=p.id WHERE s.sku_code=? AND p.business_id=? LIMIT 1",
                    [item.sku_code, req.user.business_id]
                  );
                  skuId = skuRows[0]?.id || null;
                }
                await conn.execute(
                  `INSERT INTO invoice_items 
               (invoice_id, sku_id, device_id, quantity, price, cost, discount, total, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    invoiceId,
                    skuId,
                    item.device_id || null,
                    Number(item.quantity) || 1,
                    Number(item.price) || 0,
                    Number(item.cost) || 0,
                    Number(item.discount) || 0,
                    Number(item.total) || 0,
                    item.notes || null
                  ]
                );
              }
            }
            if (Array.isArray(inv.payments) && inv.payments.length > 0) {
              for (const p of inv.payments) {
                await conn.execute(
                  "INSERT INTO payments (customer_id, invoice_id, type, method, amount, paid_at) VALUES (?, ?, ?, ?, ?, ?)",
                  [
                    customerId,
                    invoiceId,
                    p.type || "sale_payment",
                    p.method || "Cash",
                    Number(p.amount) || 0,
                    p.paid_at ? new Date(p.paid_at) : p.created_at ? new Date(p.created_at) : createdAt
                  ]
                );
              }
            } else if (paidAmount > 0) {
              await conn.execute(
                "INSERT INTO payments (customer_id, invoice_id, type, method, amount, paid_at) VALUES (?, ?, ?, ?, ?, ?)",
                [
                  customerId,
                  invoiceId,
                  "sale_payment",
                  inv.payment_method || "Cash",
                  paidAmount,
                  createdAt
                ]
              );
            }
            await conn.execute(
              "INSERT INTO invoice_activity (invoice_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
              [invoiceId, req.userId, "Invoice Imported", `Imported via Backup/Restore for \u20AC${grandTotal.toFixed(2)}`]
            );
            existingMap.set(invNum, invoiceId);
            importedCount++;
          } catch (itemError) {
            errorCount++;
            errors.push(`Error on invoice ${inv.invoice_number || "Unknown"}: ${itemError.message}`);
          }
        }
        await conn.commit();
        res.json({
          success: true,
          total: invoices.length,
          imported: importedCount,
          skipped: skippedCount,
          errorsCount: errorCount,
          errors: errors.slice(0, 10)
        });
      } catch (e) {
        if (conn) await conn.rollback().catch(() => {
        });
        next(e);
      } finally {
        if (conn) conn.release();
      }
    });
    router5.get("/", async (req, res, next) => {
      try {
        const { startDate, endDate } = req.query;
        const isDeveloper = req.user.role === "developer";
        const branchId = req.user.branch_id;
        let sql = `
      SELECT i.*, 
             c.name as customer_name,
             b.name as branch_name,
             u.name as user_name,
             u.name as created_by_name,
             (
               SELECT GROUP_CONCAT(
                 CONCAT(
                   IF(ii.quantity > 1, CONCAT(ii.quantity, 'x '), ''),
                   COALESCE(p.name, ii.notes, 'Item'),
                   IF(d.imei IS NOT NULL AND d.imei != '', CONCAT(' (', d.imei, ')'), '')
                 ) SEPARATOR ', '
               )
               FROM invoice_items ii
               LEFT JOIN product_skus s ON ii.sku_id = s.id
               LEFT JOIN products p ON s.product_id = p.id
               LEFT JOIN devices d ON ii.device_id = d.id
               WHERE ii.invoice_id = i.id
             ) as products_summary
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id=c.id
      LEFT JOIN branches b ON i.branch_id=b.id
      LEFT JOIN users u ON i.user_id=u.id
      WHERE i.business_id=? ${!isDeveloper && branchId ? "AND i.branch_id=?" : ""}
    `;
        const params = !isDeveloper && branchId ? [req.user.business_id, branchId] : [req.user.business_id];
        if (startDate) {
          sql += " AND i.created_at >= ?";
          params.push(startDate + " 00:00:00");
        }
        if (endDate) {
          sql += " AND i.created_at <= ?";
          params.push(endDate + " 23:59:59");
        }
        sql += " ORDER BY i.created_at DESC";
        res.json(await query(sql, params));
      } catch (e) {
        next(e);
      }
    });
    router5.get("/:id", async (req, res, next) => {
      try {
        const isDeveloper = req.user.role === "developer";
        const branchId = req.user.branch_id;
        const sql = `
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             b.name as branch_name,
             u.name as user_name,
             u.name as created_by_name
      FROM invoices i 
      LEFT JOIN customers c ON i.customer_id=c.id 
      LEFT JOIN branches b ON i.branch_id=b.id
      LEFT JOIN users u ON i.user_id=u.id
      WHERE i.id=? AND i.business_id=? ${!isDeveloper && branchId ? "AND i.branch_id=?" : ""}
    `;
        const params = !isDeveloper && branchId ? [req.params.id, req.user.business_id, branchId] : [req.params.id, req.user.business_id];
        const invoice = await queryOne(sql, params);
        if (!invoice) return res.status(404).json({ error: "Invoice not found or access denied" });
        const items = await query(`
      SELECT ii.*, p.name as product_name, s.sku_code, d.imei
      FROM invoice_items ii
      JOIN product_skus s ON ii.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      LEFT JOIN devices d ON ii.device_id=d.id
      WHERE ii.invoice_id=?
    `, [req.params.id]);
        const payments = await query("SELECT * FROM payments WHERE invoice_id=?", [req.params.id]);
        const activities = await query(`
      SELECT a.*, u.name as user_name FROM invoice_activity a
      LEFT JOIN users u ON a.user_id=u.id
      WHERE a.invoice_id=? ORDER BY a.created_at DESC
    `, [req.params.id]);
        const paymentMethod = payments.length > 1 ? "Split" : payments[0]?.method || "Cash";
        res.json({
          ...invoice,
          items,
          payments,
          activities,
          payment_method: paymentMethod,
          customer: { name: invoice.customer_name, phone: invoice.customer_phone, email: invoice.customer_email }
        });
      } catch (e) {
        next(e);
      }
    });
    createInvoiceSchema = z4.object({
      customer_id: z4.number().nullable().optional(),
      subtotal: z4.number().or(z4.string().transform(Number)),
      tax_total: z4.number().or(z4.string().transform(Number)),
      tax_rate: z4.number().or(z4.string().transform(Number)).optional(),
      tax_type: z4.string().optional(),
      discount_total: z4.number().or(z4.string().transform(Number)),
      grand_total: z4.number().or(z4.string().transform(Number)),
      items: z4.array(z4.object({
        id: z4.number().optional(),
        sku_id: z4.number().optional(),
        device_id: z4.number().nullable().optional(),
        quantity: z4.number().or(z4.string().transform(Number)),
        price: z4.number().or(z4.string().transform(Number)),
        cost: z4.number().or(z4.string().transform(Number)).optional(),
        discount: z4.number().or(z4.string().transform(Number)).optional(),
        discount_type: z4.string().optional().nullable(),
        total: z4.number().or(z4.string().transform(Number)),
        is_deposit: z4.boolean().optional(),
        is_repair_payment: z4.boolean().optional(),
        repair_job_id: z4.number().or(z4.string().transform(Number)).nullable().optional(),
        notes: z4.string().optional().nullable()
      })).min(1, "Cart is empty"),
      payments: z4.array(z4.object({
        method: z4.string(),
        amount: z4.number().or(z4.string().transform(Number))
      })).optional(),
      activities: z4.array(z4.object({
        action: z4.string().optional(),
        activity: z4.string().optional(),
        details: z4.string().optional()
      })).optional()
    });
    router5.post("/", async (req, res, next) => {
      const data = createInvoiceSchema.parse(req.body);
      const { customer_id, items, subtotal, tax_total, tax_rate, tax_type, discount_total, grand_total, payments, activities } = data;
      if (!items || !items.length) return res.status(400).json({ error: "Cart is empty" });
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const skuIds = items.map((i) => i.id || i.sku_id).filter(Boolean);
        let productInfoMap = /* @__PURE__ */ new Map();
        if (skuIds.length > 0) {
          const [allProductInfo] = await conn.query(`
        SELECT s.id as sku_id, s.cost_price, p.product_type, p.allow_overselling
        FROM product_skus s JOIN products p ON s.product_id=p.id 
        WHERE s.id IN (?)
      `, [skuIds]);
          productInfoMap = new Map(allProductInfo.map((p) => [p.sku_id, p]));
        }
        let finalCustomerId = customer_id;
        if (!finalCustomerId) {
          const [wRows] = await conn.execute(
            "SELECT id FROM customers WHERE name='Walk-in Customer' AND business_id=? LIMIT 1",
            [req.user.business_id]
          );
          finalCustomerId = wRows[0]?.id || null;
        }
        const isDeposit = (items || []).some((item) => item.is_deposit);
        const isRepair = (items || []).some((item) => item.is_repair_payment);
        const invoiceType = isRepair ? "repair" : isDeposit ? "deposit" : "sale";
        const prefix = isRepair ? "RE" : isDeposit ? "DE" : "SA";
        const [lastInv] = await conn.execute(
          `SELECT invoice_number FROM invoices WHERE invoice_number LIKE '${prefix}-%' AND business_id=? ORDER BY id DESC LIMIT 1`,
          [req.user.business_id]
        );
        let nextNum = 1;
        if (lastInv.length > 0) {
          const lastNum = parseInt(lastInv[0].invoice_number.split("-")[1]);
          if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }
        const invoiceNumber = `${prefix}-${String(nextNum).padStart(3, "0")}`;
        const grandTotalNum = Number(grand_total) || 0;
        const rawTotalPaid = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const totalPaid = Math.min(grandTotalNum, rawTotalPaid);
        const dueAmount = Math.max(0, grandTotalNum - rawTotalPaid);
        let status = "paid";
        if (dueAmount > 0.01) {
          status = totalPaid > 0 ? "partial" : "credit";
          if (!isRepair) {
            const [cRows] = await conn.execute("SELECT id, name FROM customers WHERE id = ?", [finalCustomerId]);
            const cust = cRows[0];
            if (!cust || cust.name === "Walk-in Customer") {
              await conn.rollback();
              conn.release();
              return res.status(400).json({ error: "Walk-in customers cannot have an unpaid balance. Full payment is required." });
            }
          }
        }
        let invR;
        try {
          [invR] = await conn.execute(
            "INSERT INTO invoices (business_id,branch_id,user_id,customer_id,invoice_number,type,subtotal,tax_total,tax_rate,tax_type,discount_total,grand_total,paid_amount,due_amount,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [req.user.business_id, req.user.branch_id, req.userId, finalCustomerId, invoiceNumber, invoiceType, subtotal, tax_total, Number(tax_rate) || 0, tax_type || "excluded", discount_total, grand_total, totalPaid, dueAmount, status]
          );
        } catch (dbErr) {
          [invR] = await conn.execute(
            "INSERT INTO invoices (business_id,branch_id,user_id,customer_id,invoice_number,type,subtotal,tax_total,discount_total,grand_total,paid_amount,due_amount,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [req.user.business_id, req.user.branch_id, req.userId, finalCustomerId, invoiceNumber, invoiceType, subtotal, tax_total, discount_total, grand_total, totalPaid, dueAmount, status]
          );
        }
        const invoiceId = invR.insertId;
        for (const item of items) {
          let skuId = item.id || item.sku_id;
          if ((!skuId || skuId === 0) && item.is_repair_payment) {
            const repairSkuCode = `REPAIR-SERVICE-${req.user.business_id}`;
            const [existing] = await conn.execute("SELECT id FROM product_skus WHERE sku_code = ?", [repairSkuCode]);
            if (existing.length > 0) {
              skuId = existing[0].id;
            } else {
              const [pr] = await conn.execute(
                "INSERT INTO products (business_id,name,product_type,allow_overselling) VALUES (?,?,?,?)",
                [req.user.business_id, "Repair Service", "service", 1]
              );
              const productId = pr.insertId;
              const [sr] = await conn.execute(
                "INSERT INTO product_skus (product_id,sku_code,barcode,cost_price,selling_price) VALUES (?,?,?,?,?)",
                [productId, repairSkuCode, repairSkuCode, 0, 0]
              );
              skuId = sr.insertId;
            }
          }
          const productInfo = productInfoMap.get(skuId);
          const itemCost = productInfo?.cost_price || item.cost || 0;
          const itemNote = item.notes || (item.is_repair_payment && item.repair_job_id ? `Repair Job #${item.repair_job_id}` : null);
          await conn.execute(
            "INSERT INTO invoice_items (invoice_id,sku_id,device_id,quantity,price,cost,discount,total,notes) VALUES (?,?,?,?,?,?,?,?,?)",
            [invoiceId, skuId, item.device_id || null, item.quantity, item.price, itemCost, item.discount || 0, item.total, itemNote]
          );
          if (productInfo?.product_type === "stock") {
            await conn.execute(`
          INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,-?)
          ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)
        `, [req.user.branch_id, skuId, item.quantity]);
          } else if (item.device_id) {
            await conn.execute("UPDATE devices SET status='sold' WHERE id=? AND branch_id=?", [item.device_id, req.user.branch_id]);
            await conn.execute(
              "INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
              [item.device_id, req.userId, "Device Sold", `Sold on Invoice: ${invoiceNumber}`]
            );
            await conn.execute(
              "INSERT INTO activity_logs (device_id, user_id, activity_type, description, reference_link) VALUES (?, ?, ?, ?, ?)",
              [item.device_id, req.userId, "Device Sold", "Product delivered to customer", invoiceNumber]
            );
            await conn.execute(`
          INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,-1)
          ON DUPLICATE KEY UPDATE quantity=quantity-1
        `, [req.user.branch_id, skuId]);
          }
          if (item.is_deposit && finalCustomerId) {
            await conn.execute("UPDATE customers SET wallet_balance=COALESCE(wallet_balance,0)+? WHERE id=?", [item.total, finalCustomerId]);
          }
        }
        let excessChange = Math.max(0, rawTotalPaid - grandTotalNum);
        const settledPayments = (payments || []).map((p) => {
          let amt = Number(p.amount) || 0;
          const isCash = (p.method || "").toLowerCase().includes("cash");
          if (isCash && excessChange > 0) {
            const deduct = Math.min(amt, excessChange);
            amt -= deduct;
            excessChange -= deduct;
          }
          return { ...p, amount: amt };
        }).filter((p) => p.amount > 0);
        for (const p of settledPayments) {
          const type = p.method === "Store Credit" || p.method === "Wallet" ? "wallet_use" : isDeposit ? "deposit" : isRepair ? "repair_payment" : "sale_payment";
          await conn.execute(
            "INSERT INTO payments (customer_id,invoice_id,type,method,amount) VALUES (?,?,?,?,?)",
            [finalCustomerId, invoiceId, type, p.method, p.amount]
          );
          if (type === "wallet_use") {
            await conn.execute("UPDATE customers SET wallet_balance=COALESCE(wallet_balance,0)-? WHERE id=?", [p.amount, finalCustomerId]);
          }
        }
        const logDetails = `Invoice ${invoiceNumber} created for \u20AC${(Number(grand_total) || 0).toFixed(2)}`;
        if (finalCustomerId) {
          await conn.execute(
            "INSERT INTO customer_activity (customer_id,user_id,activity,details) VALUES (?,?,?,?)",
            [finalCustomerId, req.userId, "Invoice Created", logDetails]
          );
        }
        await conn.execute(
          "INSERT INTO invoice_activity (invoice_id,user_id,activity,details) VALUES (?,?,?,?)",
          [invoiceId, req.userId, "Invoice Created", logDetails]
        );
        for (const act of activities || []) {
          const activityLabel = act.action || act.activity || "Activity";
          const activityDetails = act.details || "No details provided";
          await conn.execute(
            "INSERT INTO invoice_activity (invoice_id,user_id,activity,details) VALUES (?,?,?,?)",
            [invoiceId, req.userId, activityLabel, activityDetails]
          );
        }
        const repairItems = (items || []).filter((item) => item.is_repair_payment && item.repair_job_id);
        for (const rItem of repairItems) {
          const repairAmount = Number(rItem.total) || 0;
          const jobId = Number(rItem.repair_job_id);
          if (repairAmount > 0 && jobId > 0) {
            await conn.execute(
              `UPDATE jobs SET 
             deposit_paid = COALESCE(deposit_paid,0) + ?, 
             remaining_balance = GREATEST(0, COALESCE(remaining_balance,0) - ?)
           WHERE id = ? AND business_id = ?`,
              [repairAmount, repairAmount, jobId, req.user.business_id]
            );
            const [jobRows] = await conn.execute("SELECT remaining_balance, status FROM jobs WHERE id=?", [jobId]);
            const updatedJob = jobRows[0];
            if (updatedJob && Number(updatedJob.remaining_balance) <= 0 && updatedJob.status !== "collected") {
              await conn.execute("UPDATE jobs SET status=? WHERE id=?", ["completed", jobId]);
            }
            if (finalCustomerId) {
              await conn.execute(
                "INSERT INTO customer_activity (customer_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
                [
                  finalCustomerId,
                  req.userId,
                  "Repair Payment Received",
                  `\u20AC${repairAmount.toFixed(2)} received for job #${jobId}. Invoice: ${invoiceNumber}`
                ]
              );
            }
          }
        }
        await conn.commit();
        const [fullInvoiceRows] = await conn.execute(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM invoices i LEFT JOIN customers c ON i.customer_id=c.id WHERE i.id=?
    `, [invoiceId]);
        const [fullItems] = await conn.execute(`
      SELECT ii.*, p.name as product_name, s.sku_code, d.imei
      FROM invoice_items ii
      JOIN product_skus s ON ii.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      LEFT JOIN devices d ON ii.device_id=d.id
      WHERE ii.invoice_id=?
    `, [invoiceId]);
        const [fullPayments] = await conn.execute("SELECT * FROM payments WHERE invoice_id=?", [invoiceId]);
        const [fullActivities] = await conn.execute(`
      SELECT a.*, u.name as user_name FROM invoice_activity a
      LEFT JOIN users u ON a.user_id=u.id
      WHERE a.invoice_id=? ORDER BY a.created_at DESC
    `, [invoiceId]);
        const invoiceObj = fullInvoiceRows[0];
        if (!invoiceObj) throw new Error("Failed to retrieve created invoice record");
        res.json({
          ...invoiceObj,
          items: fullItems,
          payments: fullPayments,
          activities: fullActivities,
          payment_method: fullPayments.length > 1 ? "Split" : fullPayments[0]?.method || "Cash",
          customer: { name: invoiceObj.customer_name, phone: invoiceObj.customer_phone, email: invoiceObj.customer_email }
        });
      } catch (e) {
        if (conn) await conn.rollback().catch(() => {
        });
        console.error("[POST /api/invoices] Error:", e.message);
        next(e);
      } finally {
        if (conn) conn.release();
      }
    });
    router5.post("/:id/refund", async (req, res, next) => {
      const { method = "Cash", restock = true, items, is_full_refund, notes } = req.body;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const isDeveloper = req.user.role === "developer";
        const branchId = req.user.branch_id;
        const checkSql = `SELECT * FROM invoices WHERE id=? AND business_id=? ${!isDeveloper && branchId ? "AND branch_id=?" : ""}`;
        const checkParams = !isDeveloper && branchId ? [req.params.id, req.user.business_id, branchId] : [req.params.id, req.user.business_id];
        const [invRows] = await conn.execute(checkSql, checkParams);
        const invoice = invRows[0];
        if (!invoice) throw new Error("Invoice not found or access denied");
        if (invoice.status === "void") throw new Error("This invoice has already been fully refunded");
        const [itemRows] = await conn.execute(`
      SELECT ii.*, p.name as product_name, d.imei
      FROM invoice_items ii
      JOIN product_skus s ON ii.sku_id = s.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN devices d ON ii.device_id = d.id
      WHERE ii.invoice_id = ?
    `, [req.params.id]);
        const currentItems = itemRows;
        if (currentItems.length === 0) throw new Error("No items found on this invoice");
        let totalRefundAmount = 0;
        const refundSummaries = [];
        const itemsToProcess = [];
        if (Array.isArray(items) && items.length > 0 && !is_full_refund) {
          for (const reqItem of items) {
            const item = currentItems.find((ci) => ci.id === reqItem.item_id);
            if (!item) continue;
            const returnableQty = item.quantity - (Number(item.refunded_quantity) || 0);
            const qtyToRefund = Math.min(returnableQty, Math.max(0, Number(reqItem.quantity) || 0));
            if (qtyToRefund <= 0) continue;
            const unitEffectivePrice = Number(item.total) / Number(item.quantity);
            const itemRefundTotal = unitEffectivePrice * qtyToRefund;
            totalRefundAmount += itemRefundTotal;
            itemsToProcess.push({
              id: item.id,
              sku_id: item.sku_id,
              device_id: item.device_id,
              qty: qtyToRefund,
              unitPrice: unitEffectivePrice,
              name: item.product_name || "Product"
            });
            refundSummaries.push(`${qtyToRefund}x ${item.product_name} (\u20AC${itemRefundTotal.toFixed(2)})`);
          }
        } else {
          for (const item of currentItems) {
            const returnableQty = item.quantity - (Number(item.refunded_quantity) || 0);
            if (returnableQty <= 0) continue;
            const unitEffectivePrice = Number(item.total) / Number(item.quantity);
            const itemRefundTotal = unitEffectivePrice * returnableQty;
            totalRefundAmount += itemRefundTotal;
            itemsToProcess.push({
              id: item.id,
              sku_id: item.sku_id,
              device_id: item.device_id,
              qty: returnableQty,
              unitPrice: unitEffectivePrice,
              name: item.product_name || "Product"
            });
            refundSummaries.push(`${returnableQty}x ${item.product_name} (\u20AC${itemRefundTotal.toFixed(2)})`);
          }
        }
        if (itemsToProcess.length === 0 || totalRefundAmount <= 0) {
          throw new Error("No returnable items selected for refund");
        }
        for (const pItem of itemsToProcess) {
          await conn.execute(
            "UPDATE invoice_items SET refunded_quantity = COALESCE(refunded_quantity, 0) + ? WHERE id = ?",
            [pItem.qty, pItem.id]
          );
          if (restock) {
            await conn.execute(`
          INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        `, [invoice.branch_id || 1, pItem.sku_id, pItem.qty]);
            if (pItem.device_id) {
              await conn.execute("UPDATE devices SET status='in_stock' WHERE id=?", [pItem.device_id]);
            }
          }
        }
        await conn.execute(
          "INSERT INTO payments (invoice_id, method, amount) VALUES (?, ?, ?)",
          [req.params.id, `Refund (${method})`, -totalRefundAmount]
        );
        const [updatedItems] = await conn.execute(
          "SELECT SUM(quantity) as total_qty, SUM(COALESCE(refunded_quantity, 0)) as total_refunded FROM invoice_items WHERE invoice_id=?",
          [req.params.id]
        );
        const totalQty = Number(updatedItems[0]?.total_qty || 0);
        const totalRefunded = Number(updatedItems[0]?.total_refunded || 0);
        const isFullyRefunded = totalRefunded >= totalQty;
        const newStatus = isFullyRefunded ? "void" : "partially_refunded";
        await conn.execute("UPDATE invoices SET status=? WHERE id=?", [newStatus, req.params.id]);
        const activityLabel = isFullyRefunded ? "Refund Created" : "Partial Refund";
        const detailMsg = `${activityLabel} issued via ${method} for \u20AC${totalRefundAmount.toFixed(2)} [${refundSummaries.join(", ")}]. ${restock ? "Restocked to inventory." : "No restock."}${notes ? ` Note: ${notes}` : ""}`;
        await conn.execute(
          "INSERT INTO invoice_activity (invoice_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
          [req.params.id, req.userId, activityLabel, detailMsg]
        );
        await conn.commit();
        res.json({
          success: true,
          status: newStatus,
          refundAmount: totalRefundAmount,
          refundedItems: itemsToProcess
        });
      } catch (e) {
        await conn.rollback();
        next(e);
      } finally {
        conn.release();
      }
    });
    router5.post("/:id/send-email", async (req, res, next) => {
      try {
        const { email, subject, message } = req.body;
        if (!email || !email.includes("@")) {
          return res.status(400).json({ error: "A valid email address is required" });
        }
        const isDeveloper = req.user.role === "developer";
        const branchId = req.user.branch_id;
        const invRows = await query(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             b.name as branch_name, b.address as branch_address, b.phone as branch_phone, b.email as branch_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id=c.id
      LEFT JOIN branches b ON i.branch_id=b.id
      WHERE i.id=? AND i.business_id=? ${!isDeveloper && branchId ? "AND i.branch_id=?" : ""}
      LIMIT 1
    `, !isDeveloper && branchId ? [req.params.id, req.user.business_id, branchId] : [req.params.id, req.user.business_id]);
        const invoice = invRows[0];
        if (!invoice) return res.status(404).json({ error: "Invoice not found or access denied" });
        const items = await query(`
      SELECT ii.*, s.sku_code, p.name as product_name, d.imei
      FROM invoice_items ii
      LEFT JOIN product_skus s ON ii.sku_id=s.id
      LEFT JOIN products p ON s.product_id=p.id
      LEFT JOIN devices d ON ii.device_id=d.id
      WHERE ii.invoice_id=?
    `, [req.params.id]);
        const payments = await query(`
      SELECT * FROM payments WHERE invoice_id=?
    `, [req.params.id]);
        const company = await queryOne("SELECT * FROM businesses WHERE id=? LIMIT 1", [req.user.business_id]);
        invoice.items = items;
        invoice.payments = payments;
        invoice.customer = {
          name: invoice.customer_name,
          phone: invoice.customer_phone,
          email: invoice.customer_email
        };
        const branch = {
          name: invoice.branch_name,
          address: invoice.branch_address,
          phone: invoice.branch_phone,
          email: invoice.branch_email
        };
        const emailSubject = subject || `Invoice ${invoice.invoice_number} from ${invoice.branch_name || company?.name || "PhoneLab"}`;
        sendInvoiceEmail(email.trim(), emailSubject, invoice, company, message, branch).then(async () => {
          await execute(
            "INSERT INTO invoice_activity (invoice_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
            [invoice.id, req.userId, "Invoice Emailed", `Invoice emailed to ${email.trim()}`]
          ).catch(() => {
          });
        }).catch((err) => {
          console.error("[send-email background] error:", err.message);
          execute(
            "INSERT INTO invoice_activity (invoice_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
            [invoice.id, req.userId, "Invoice Email Failed", `Failed sending email to ${email.trim()}: ${err.message}`]
          ).catch(() => {
          });
        });
        res.json({ success: true, message: `Invoice email successfully queued for ${email.trim()}` });
      } catch (e) {
        console.error("[send-email] error:", e.message);
        res.status(400).json({ error: `Email Delivery Failed: ${e.message}` });
      }
    });
    router5.post("/:id/activity", async (req, res, next) => {
      try {
        const { activity = "Note Added", details } = req.body;
        if (!details || !String(details).trim()) {
          return res.status(400).json({ error: "Note details are required" });
        }
        const isDeveloper = req.user.role === "developer";
        const branchId = req.user.branch_id;
        const inv = await queryOne(
          `SELECT id FROM invoices WHERE id=? AND business_id=? ${!isDeveloper && branchId ? "AND branch_id=?" : ""}`,
          !isDeveloper && branchId ? [req.params.id, req.user.business_id, branchId] : [req.params.id, req.user.business_id]
        );
        if (!inv) return res.status(404).json({ error: "Invoice not found or access denied" });
        await execute(
          "INSERT INTO invoice_activity (invoice_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
          [req.params.id, req.userId, activity, String(details).trim()]
        );
        const activities = await query(
          "SELECT a.*, u.name as user_name FROM invoice_activity a LEFT JOIN users u ON a.user_id=u.id WHERE a.invoice_id=? ORDER BY a.created_at DESC",
          [req.params.id]
        );
        res.json({ success: true, activities });
      } catch (e) {
        next(e);
      }
    });
    router5.put("/payments/:id", async (req, res, next) => {
      try {
        const { method } = req.body;
        if (!method) return res.status(400).json({ error: "Method is required" });
        const r = await execute(
          "UPDATE payments p LEFT JOIN invoices i ON p.invoice_id=i.id LEFT JOIN customers c ON p.customer_id=c.id SET p.method=? WHERE p.id=? AND (i.business_id=? OR c.business_id=?)",
          [method, req.params.id, req.user.business_id, req.user.business_id]
        );
        if (r.affectedRows === 0) return res.status(404).json({ error: "Payment not found or access denied" });
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    invoices_default = router5;
  }
});

// src/routes/reports.ts
var reports_exports = {};
__export(reports_exports, {
  default: () => reports_default
});
import { Router as Router6 } from "express";
import { z as z5 } from "zod";
var router6, endOfDaySchema, reports_default;
var init_reports = __esm({
  "src/routes/reports.ts"() {
    init_mysql();
    router6 = Router6();
    router6.get("/dashboard-stats", async (req, res, next) => {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required" });
      try {
        const isDeveloper = req.user.role === "developer";
        const branchId = req.user.branch_id;
        const businessId = req.user.business_id;
        let salesSql = `
      SELECT COUNT(id) as count, COALESCE(SUM(grand_total), 0) as total 
      FROM invoices 
      WHERE business_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?
      ${!isDeveloper && branchId ? "AND branch_id=?" : ""}
    `;
        const salesParams = !isDeveloper && branchId ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
        const salesKpi = await queryOne(salesSql, salesParams);
        let openRepairsSql = `
      SELECT COUNT(id) as count FROM jobs 
      WHERE business_id=? AND status != 'collected'
      ${!isDeveloper && branchId ? "AND branch_id=?" : ""}
    `;
        const openRepairsParams = !isDeveloper && branchId ? [businessId, branchId] : [businessId];
        const openRepairsKpi = await queryOne(openRepairsSql, openRepairsParams);
        let addedRepairsSql = `
      SELECT COUNT(id) as count FROM jobs 
      WHERE business_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?
      ${!isDeveloper && branchId ? "AND branch_id=?" : ""}
    `;
        const addedRepairsParams = !isDeveloper && branchId ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
        const addedRepairsKpi = await queryOne(addedRepairsSql, addedRepairsParams);
        let invoicedRepairsSql = `
      SELECT COUNT(id) as count FROM jobs 
      WHERE business_id=? AND status='collected' AND DATE(created_at)>=? AND DATE(created_at)<=?
      ${!isDeveloper && branchId ? "AND branch_id=?" : ""}
    `;
        const invoicedRepairsParams = !isDeveloper && branchId ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
        const invoicedRepairsKpi = await queryOne(invoicedRepairsSql, invoicedRepairsParams);
        let addedCustomersSql = `
      SELECT COUNT(id) as count FROM customers 
      WHERE business_id=? AND DATE(created_at)>=? AND DATE(created_at)<=? AND deleted_at IS NULL
      ${!isDeveloper && branchId ? "AND branch_id=?" : ""}
    `;
        const addedCustomersParams = !isDeveloper && branchId ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
        const addedCustomersKpi = await queryOne(addedCustomersSql, addedCustomersParams);
        let purchasedCustomersSql = `
      SELECT COUNT(DISTINCT customer_id) as count FROM invoices
      WHERE business_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?
      ${!isDeveloper && branchId ? "AND branch_id=?" : ""}
    `;
        const purchasedCustomersParams = !isDeveloper && branchId ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
        const purchasedCustomersKpi = await queryOne(purchasedCustomersSql, purchasedCustomersParams);
        let paymentsSql = `
      SELECT p.method as payment_type, COALESCE(SUM(p.amount), 0) as total 
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      WHERE i.business_id=? AND DATE(p.paid_at)>=? AND DATE(p.paid_at)<=?
      ${!isDeveloper && branchId ? "AND i.branch_id=?" : ""}
      GROUP BY p.method
    `;
        const paymentsParams = !isDeveloper && branchId ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
        const paymentRows = await query(paymentsSql, paymentsParams);
        const categoryRows = await query(`SELECT id, name FROM categories WHERE business_id=?`, [businessId]);
        let purchasedSql = `
      SELECT p.category_id, COALESCE(SUM(m.quantity), 0) as qty, COALESCE(SUM(m.quantity * m.unit_cost), 0) as cost
      FROM inventory_movements m
      JOIN product_skus s ON m.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      WHERE m.business_id=? AND m.movement_type='purchase' AND DATE(m.created_at)>=? AND DATE(m.created_at)<=?
      ${!isDeveloper && branchId ? "AND m.branch_id=?" : ""}
      GROUP BY p.category_id
    `;
        const purchasedParams = !isDeveloper && branchId ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
        const purchasedRows = await query(purchasedSql, purchasedParams);
        const purchasedMap = new Map(purchasedRows.map((r) => [r.category_id, r]));
        let soldSql = `
      SELECT p.category_id, COALESCE(SUM(ii.quantity), 0) as qty, COALESCE(SUM(ii.quantity * ii.price), 0) as sales
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id=i.id
      JOIN product_skus s ON ii.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      WHERE i.business_id=? AND DATE(i.created_at)>=? AND DATE(i.created_at)<=?
      ${!isDeveloper && branchId ? "AND i.branch_id=?" : ""}
      GROUP BY p.category_id
    `;
        const soldParams = !isDeveloper && branchId ? [businessId, startDate, endDate, branchId] : [businessId, startDate, endDate];
        const soldRows = await query(soldSql, soldParams);
        const soldMap = new Map(soldRows.map((r) => [r.category_id, r]));
        const categoriesReport = categoryRows.map((cat) => {
          const p = purchasedMap.get(cat.id) || { qty: 0, cost: 0 };
          const s = soldMap.get(cat.id) || { qty: 0, sales: 0 };
          return {
            name: cat.name,
            qtyPurchased: p.qty,
            totalCost: p.cost,
            qtySold: s.qty,
            totalSales: s.sales
          };
        });
        res.json({
          sales: {
            total: salesKpi.total || 0,
            count: salesKpi.count || 0
          },
          repairs: {
            open: openRepairsKpi.count || 0,
            added: addedRepairsKpi.count || 0,
            invoiced: invoicedRepairsKpi.count || 0
          },
          customers: {
            added: addedCustomersKpi.count || 0,
            purchased: purchasedCustomersKpi.count || 0
          },
          payments: paymentRows,
          categories: categoriesReport
        });
      } catch (e) {
        next(e);
      }
    });
    router6.get("/eod-data", async (req, res, next) => {
      const date = req.query.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      try {
        const isSuper = req.user.role === "superadmin" || req.user.role === "developer";
        const branchId = req.user.branch_id;
        const invoicePayments = await query(`
      SELECT p.*, u.name as user_name, i.invoice_number, i.status as invoice_status, c.name as customer_name,
        (
          SELECT GROUP_CONCAT(
            CONCAT(
              IF(ii.quantity > 1, CONCAT(ii.quantity, 'x '), ''),
              COALESCE(pr.name, ii.notes, 'Item'),
              IF(d.imei IS NOT NULL AND d.imei != '', CONCAT(' (', d.imei, ')'), '')
            ) SEPARATOR ', '
          )
          FROM invoice_items ii
          LEFT JOIN product_skus s ON ii.sku_id = s.id
          LEFT JOIN products pr ON s.product_id = pr.id
          LEFT JOIN devices d ON ii.device_id = d.id
          WHERE ii.invoice_id = i.id
        ) as products_summary
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      LEFT JOIN users u ON i.user_id=u.id
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND i.business_id=? 
      ${!isSuper && branchId ? "AND (i.branch_id=? OR i.branch_id IS NULL)" : ""}
      ORDER BY p.id ASC
    `, !isSuper && branchId ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);
        const otherMovements = await query(`
      SELECT p.*, 'System' as user_name, c.name as customer_name,
        COALESCE(p.type, 'Customer Deposit') as products_summary
      FROM payments p
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND p.invoice_id IS NULL AND (c.business_id=? OR c.business_id IS NULL)
      ${!isSuper && branchId ? "AND (c.branch_id=? OR c.branch_id IS NULL)" : ""}
      ORDER BY p.id ASC
    `, !isSuper && branchId ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);
        const summary = await query(`
      SELECT p.method, p.type, SUM(p.amount) as total 
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND (i.business_id=? OR c.business_id=?)
      ${!isSuper && branchId ? "AND (i.branch_id=? OR i.branch_id IS NULL OR c.branch_id=?)" : ""}
      GROUP BY p.method, p.type
      ORDER BY p.method ASC
    `, !isSuper && branchId ? [date, req.user.business_id, req.user.business_id, branchId, branchId] : [date, req.user.business_id, req.user.business_id]);
        const existingReport = await queryOne(`
      SELECT starting_balance, comments, cash_counted, difference 
      FROM closing_reports 
      WHERE report_date=? AND business_id=? ${!isSuper && branchId ? "AND (branch_id=? OR branch_id IS NULL)" : ""}
      ORDER BY id DESC LIMIT 1
    `, !isSuper && branchId ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);
        res.json({
          invoicePayments,
          otherMovements,
          summary,
          date,
          startingBalance: existingReport ? Number(existingReport.starting_balance) : null,
          cashCounted: existingReport?.cash_counted != null ? Number(existingReport.cash_counted) : null,
          comments: existingReport?.comments || ""
        });
      } catch (e) {
        next(e);
      }
    });
    router6.get("/starting-cash", async (req, res, next) => {
      try {
        const date = req.query.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const isSuper = req.user.role === "superadmin" || req.user.role === "developer";
        const branchId = req.user.branch_id;
        const report = await queryOne(`
      SELECT id, starting_balance, created_at 
      FROM closing_reports 
      WHERE report_date=? AND business_id=? ${!isSuper && branchId ? "AND (branch_id=? OR branch_id IS NULL)" : ""}
      ORDER BY id DESC LIMIT 1
    `, !isSuper && branchId ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);
        const hasStartingCash = report !== null && report.starting_balance !== null && report.starting_balance !== void 0;
        res.json({
          hasStartingCash: !!hasStartingCash,
          startingBalance: hasStartingCash ? Number(report.starting_balance) : 0,
          reportId: report?.id || null
        });
      } catch (e) {
        next(e);
      }
    });
    router6.post("/starting-cash", async (req, res, next) => {
      try {
        const { starting_balance, report_date } = req.body;
        const date = report_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const amount = Number(starting_balance) || 0;
        const branchId = req.user.branch_id || 1;
        const existing = await queryOne(`
      SELECT id FROM closing_reports 
      WHERE report_date=? AND business_id=? AND branch_id=?
      ORDER BY id DESC LIMIT 1
    `, [date, req.user.business_id, branchId]);
        if (existing) {
          await execute(
            "UPDATE closing_reports SET starting_balance=? WHERE id=?",
            [amount, existing.id]
          );
          res.json({ success: true, message: "Starting cash updated", id: existing.id, starting_balance: amount });
        } else {
          const r = await execute(
            `INSERT INTO closing_reports 
         (business_id, branch_id, user_id, report_date, starting_balance, cash_counted, calculated_cash, difference, total_sales, total_deposits, total_cash_in_drawer, comments)
         VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, '')`,
            [req.user.business_id, branchId, req.userId, date, amount]
          );
          res.json({ success: true, message: "Starting cash recorded", id: r.insertId, starting_balance: amount });
        }
      } catch (e) {
        next(e);
      }
    });
    endOfDaySchema = z5.object({
      report_date: z5.string().optional(),
      starting_balance: z5.number().or(z5.string().transform(Number)).optional(),
      cash_counted: z5.number().or(z5.string().transform(Number)).optional(),
      calculated_cash: z5.number().or(z5.string().transform(Number)).optional(),
      difference: z5.number().or(z5.string().transform(Number)).optional(),
      total_sales: z5.number().or(z5.string().transform(Number)).optional(),
      total_deposits: z5.number().or(z5.string().transform(Number)).optional(),
      total_cash_in_drawer: z5.number().or(z5.string().transform(Number)).optional(),
      comments: z5.string().optional(),
      payment_summaries: z5.array(z5.object({
        payment_type: z5.string().optional(),
        calculated: z5.number().or(z5.string().transform(Number)).optional(),
        counted: z5.number().or(z5.string().transform(Number)).optional(),
        difference: z5.number().or(z5.string().transform(Number)).optional()
      })).default([])
    });
    router6.post("/eod", async (req, res, next) => {
      const data = endOfDaySchema.parse(req.body);
      const {
        report_date,
        starting_balance,
        cash_counted,
        calculated_cash,
        difference,
        total_sales,
        total_deposits,
        total_cash_in_drawer,
        comments,
        payment_summaries
      } = data;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [existingRows] = await conn.execute(
          "SELECT id FROM closing_reports WHERE business_id=? AND branch_id=? AND report_date=? ORDER BY id DESC LIMIT 1",
          [req.user.business_id, req.user.branch_id || 1, report_date]
        );
        let reportId;
        if (existingRows.length > 0) {
          reportId = existingRows[0].id;
          await conn.execute(`
        UPDATE closing_reports 
        SET user_id=?, starting_balance=?, cash_counted=?, calculated_cash=?, difference=?,
            total_sales=?, total_deposits=?, total_cash_in_drawer=?, comments=?
        WHERE id=?
      `, [
            req.userId,
            starting_balance,
            cash_counted,
            calculated_cash,
            difference,
            total_sales,
            total_deposits,
            total_cash_in_drawer,
            comments,
            reportId
          ]);
          await conn.execute("DELETE FROM closing_report_payments WHERE report_id=?", [reportId]);
        } else {
          const [r] = await conn.execute(
            `
        INSERT INTO closing_reports
          (business_id,branch_id,user_id,report_date,starting_balance,cash_counted,calculated_cash,difference,
           total_sales,total_deposits,total_cash_in_drawer,comments)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              req.user.business_id,
              req.user.branch_id || 1,
              req.userId,
              report_date,
              starting_balance,
              cash_counted,
              calculated_cash,
              difference,
              total_sales,
              total_deposits,
              total_cash_in_drawer,
              comments
            ]
          );
          reportId = r.insertId;
        }
        for (const s of payment_summaries) {
          await conn.execute(
            "INSERT INTO closing_report_payments (report_id,payment_type,calculated,counted,difference) VALUES (?,?,?,?,?)",
            [reportId, s.payment_type, s.calculated, s.counted, s.difference]
          );
        }
        await conn.commit();
        res.json({ success: true, id: reportId });
      } catch (e) {
        await conn.rollback();
        next(e);
      } finally {
        conn.release();
      }
    });
    router6.get("/eod-list", async (req, res, next) => {
      try {
        const isSuper = req.user.role === "superadmin";
        const sql = `
      SELECT r.*, u.name as user_name FROM closing_reports r
      JOIN users u ON r.user_id=u.id 
      WHERE r.business_id=? ${!isSuper ? "AND r.branch_id=?" : ""}
      ORDER BY r.report_date DESC
    `;
        const params = !isSuper ? [req.user.business_id, req.user.branch_id] : [req.user.business_id];
        res.json(await query(sql, params));
      } catch (e) {
        next(e);
      }
    });
    router6.get("/activity-logs", async (req, res, next) => {
      try {
        const businessId = req.user.business_id;
        const { activity_type, user_id, start_date, end_date, search, page = 1, limit = 50 } = req.query;
        const limitNum = Math.min(200, Math.max(1, Number(limit)));
        const pageNum = Math.max(1, Number(page));
        const offset = (pageNum - 1) * limitNum;
        const users = await query(
          "SELECT id, name FROM users WHERE business_id=? AND deleted_at IS NULL ORDER BY name ASC",
          [businessId]
        );
        const unifiedSql = `
      SELECT 
        CONCAT('al_', al.id) as log_id,
        COALESCE(al.business_id, 1) as business_id,
        al.user_id,
        COALESCE(al.user_name, u.name, 'System') as user_name,
        al.activity_type,
        al.description as details,
        al.reference_type,
        al.reference_id,
        al.reference_link,
        al.ip_address,
        al.created_at
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE COALESCE(al.business_id, 1) = ?

      UNION ALL

      SELECT 
        CONCAT('inv_', ia.id) as log_id,
        COALESCE(i.business_id, 1) as business_id,
        ia.user_id,
        COALESCE(u.name, 'System') as user_name,
        ia.activity as activity_type,
        ia.details,
        'invoice' as reference_type,
        ia.invoice_id as reference_id,
        CONCAT('/invoices/', ia.invoice_id) as reference_link,
        NULL as ip_address,
        ia.created_at
      FROM invoice_activity ia
      JOIN invoices i ON ia.invoice_id = i.id
      LEFT JOIN users u ON ia.user_id = u.id
      WHERE COALESCE(i.business_id, 1) = ?

      UNION ALL

      SELECT 
        CONCAT('cust_', ca.id) as log_id,
        COALESCE(c.business_id, 1) as business_id,
        ca.user_id,
        COALESCE(u.name, 'System') as user_name,
        ca.activity as activity_type,
        ca.details,
        'customer' as reference_type,
        ca.customer_id as reference_id,
        CONCAT('/customers/', ca.customer_id) as reference_link,
        NULL as ip_address,
        ca.created_at
      FROM customer_activity ca
      JOIN customers c ON ca.customer_id = c.id
      LEFT JOIN users u ON ca.user_id = u.id
      WHERE COALESCE(c.business_id, 1) = ?

      UNION ALL

      SELECT 
        CONCAT('prod_', pa.id) as log_id,
        COALESCE(p.business_id, 1) as business_id,
        pa.user_id,
        COALESCE(u.name, 'System') as user_name,
        pa.activity as activity_type,
        pa.details,
        'product' as reference_type,
        p.id as reference_id,
        CONCAT('/products/', p.id) as reference_link,
        NULL as ip_address,
        pa.created_at
      FROM product_activity pa
      LEFT JOIN product_skus ps ON pa.sku_id = ps.id
      LEFT JOIN products p ON ps.product_id = p.id
      LEFT JOIN users u ON pa.user_id = u.id
      WHERE COALESCE(p.business_id, 1) = ?

      UNION ALL

      SELECT 
        CONCAT('dev_', da.id) as log_id,
        COALESCE(p.business_id, 1) as business_id,
        da.user_id,
        COALESCE(u.name, 'System') as user_name,
        da.activity as activity_type,
        da.details,
        'device' as reference_type,
        d.id as reference_id,
        CONCAT('/devices/', d.id) as reference_link,
        NULL as ip_address,
        da.created_at
      FROM device_activity da
      JOIN devices d ON da.device_id = d.id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN users u ON da.user_id = u.id
      WHERE COALESCE(p.business_id, 1) = ?
    `;
        const subParams = [businessId, businessId, businessId, businessId, businessId];
        let filterClauses = [];
        let filterParams = [];
        if (activity_type && activity_type !== "all") {
          filterClauses.push("feed.activity_type = ?");
          filterParams.push(activity_type);
        }
        if (user_id && user_id !== "all") {
          filterClauses.push("feed.user_id = ?");
          filterParams.push(Number(user_id));
        }
        if (start_date) {
          filterClauses.push("DATE(feed.created_at) >= ?");
          filterParams.push(start_date);
        }
        if (end_date) {
          filterClauses.push("DATE(feed.created_at) <= ?");
          filterParams.push(end_date);
        }
        if (search) {
          filterClauses.push("(feed.details LIKE ? OR feed.activity_type LIKE ? OR feed.user_name LIKE ?)");
          filterParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        const whereSql = filterClauses.length > 0 ? `WHERE ${filterClauses.join(" AND ")}` : "";
        const countSql = `
      SELECT COUNT(*) as total FROM (${unifiedSql}) feed ${whereSql}
    `;
        const countResult = await queryOne(countSql, [...subParams, ...filterParams]);
        const total = countResult?.total || 0;
        const typesSql = `
      SELECT DISTINCT feed.activity_type FROM (${unifiedSql}) feed WHERE feed.activity_type IS NOT NULL AND feed.activity_type != '' ORDER BY feed.activity_type ASC
    `;
        const typesRows = await query(typesSql, subParams);
        const activityTypes = typesRows.map((r) => r.activity_type).filter(Boolean);
        const dataSql = `
      SELECT feed.* FROM (${unifiedSql}) feed 
      ${whereSql}
      ORDER BY feed.created_at DESC
      LIMIT ? OFFSET ?
    `;
        const logs = await query(dataSql, [...subParams, ...filterParams, limitNum, offset]);
        res.json({
          logs,
          total,
          page: pageNum,
          limit: limitNum,
          users,
          activityTypes
        });
      } catch (e) {
        next(e);
      }
    });
    reports_default = router6;
  }
});

// src/routes/settings.ts
var settings_exports = {};
__export(settings_exports, {
  default: () => settings_default
});
import { Router as Router7 } from "express";
import { z as z6 } from "zod";
var router7, settingsSchema, authSettingsSchema, companySchema, paymentMethodsSchema, printerSettingsSchema, thermalPrinterSettingsSchema, categoryManufacturerSchema, supplierSchema, settings_default;
var init_settings = __esm({
  "src/routes/settings.ts"() {
    init_mysql();
    router7 = Router7();
    router7.get("/settings", async (req, res, next) => {
      try {
        let s = await queryOne("SELECT * FROM settings WHERE business_id=?", [req.user.business_id]);
        if (!s) {
          await execute("INSERT INTO settings (business_id) VALUES (?)", [req.user.business_id]);
          s = await queryOne("SELECT * FROM settings WHERE business_id=?", [req.user.business_id]);
        }
        res.json(s || {});
      } catch (e) {
        next(e);
      }
    });
    settingsSchema = z6.object({
      currency: z6.string().optional(),
      timezone: z6.string().optional(),
      date_format: z6.string().optional(),
      time_format: z6.string().optional(),
      language: z6.string().optional()
    });
    router7.post("/settings", async (req, res, next) => {
      const data = settingsSchema.parse(req.body);
      const { currency, timezone, date_format, time_format, language } = data;
      try {
        await execute(
          "UPDATE settings SET currency=?,timezone=?,date_format=?,time_format=?,language=? WHERE business_id=?",
          [currency || "\u20AC, Euro", timezone, date_format, time_format, language, req.user.business_id]
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    authSettingsSchema = z6.object({
      allow_signup: z6.boolean().optional(),
      allow_signin: z6.boolean().optional()
    });
    router7.post("/settings/auth", async (req, res, next) => {
      const data = authSettingsSchema.parse(req.body);
      const { allow_signup, allow_signin } = data;
      try {
        await execute(
          "UPDATE settings SET allow_signup=?,allow_signin=? WHERE business_id=?",
          [allow_signup ? 1 : 0, allow_signin ? 1 : 0, req.user.business_id]
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    router7.get("/company", async (req, res, next) => {
      try {
        const branchId = req.user?.branch_id;
        if (branchId) {
          const branch = await queryOne("SELECT name, address, phone, email FROM branches WHERE id=? AND business_id=?", [branchId, req.user.business_id]);
          if (branch) {
            return res.json(branch);
          }
        }
        const c = await queryOne("SELECT * FROM businesses WHERE id=?", [req.user.business_id]);
        res.json(c || {});
      } catch (e) {
        next(e);
      }
    });
    companySchema = z6.object({
      name: z6.string().optional(),
      email: z6.string().optional(),
      phone: z6.string().optional(),
      subdomain: z6.string().optional(),
      address: z6.string().optional(),
      city: z6.string().optional(),
      state: z6.string().optional(),
      zip_code: z6.string().optional(),
      country: z6.string().optional()
    });
    router7.post("/company", async (req, res, next) => {
      const data = companySchema.parse(req.body);
      const { name, email, phone, subdomain, address, city, state, zip_code, country } = data;
      try {
        const branchId = req.user?.branch_id;
        if (branchId) {
          await execute(
            "UPDATE branches SET name=COALESCE(?, name), email=?, phone=?, address=? WHERE id=? AND business_id=?",
            [name, email, phone, address, branchId, req.user.business_id]
          );
        }
        await execute(
          "UPDATE businesses SET name=?,email=?,phone=?,subdomain=?,address=?,city=?,state=?,zip_code=?,country=? WHERE id=?",
          [name, email, phone, subdomain, address, city, state, zip_code, country, req.user.business_id]
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    router7.get("/payment-methods", async (req, res, next) => {
      try {
        res.json(await query("SELECT * FROM payment_methods WHERE business_id=? AND is_active=1 ORDER BY display_order ASC", [req.user.business_id]));
      } catch (e) {
        next(e);
      }
    });
    paymentMethodsSchema = z6.object({
      methods: z6.array(z6.object({
        id: z6.number().optional(),
        name: z6.string()
      })).default([])
    });
    router7.post("/payment-methods", async (req, res, next) => {
      const data = paymentMethodsSchema.parse(req.body);
      const { methods } = data;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute("UPDATE payment_methods SET is_active=0 WHERE business_id=?", [req.user.business_id]);
        for (let i = 0; i < methods.length; i++) {
          const m = methods[i];
          if (m.id) {
            await conn.execute(
              "UPDATE payment_methods SET name=?,display_order=?,is_active=1 WHERE id=? AND business_id=?",
              [m.name, i + 1, m.id, req.user.business_id]
            );
          } else {
            await conn.execute(
              "INSERT INTO payment_methods (business_id,name,display_order,is_active) VALUES (?,?,?,1)",
              [req.user.business_id, m.name, i + 1]
            );
          }
        }
        await conn.commit();
        res.json({ success: true });
      } catch (e) {
        await conn.rollback();
        next(e);
      } finally {
        conn.release();
      }
    });
    router7.get("/printer-settings", async (req, res, next) => {
      try {
        const branchId = req.user?.branch_id ?? null;
        let s = await queryOne(
          "SELECT * FROM printer_settings WHERE business_id=? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL))",
          [req.user.business_id, branchId, branchId]
        );
        if (!s && branchId !== null) {
          s = await queryOne("SELECT * FROM printer_settings WHERE business_id=? AND branch_id IS NULL", [req.user.business_id]);
        }
        if (!s) {
          await execute("INSERT INTO printer_settings (business_id, branch_id) VALUES (?, ?)", [req.user.business_id, branchId]);
          s = await queryOne(
            "SELECT * FROM printer_settings WHERE business_id=? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL))",
            [req.user.business_id, branchId, branchId]
          );
        }
        res.json(s || {});
      } catch (e) {
        next(e);
      }
    });
    printerSettingsSchema = z6.object({
      label_size: z6.string().optional(),
      barcode_length: z6.number().or(z6.string().transform(Number)).optional(),
      margin_top: z6.number().or(z6.string().transform(Number)).optional(),
      margin_left: z6.number().or(z6.string().transform(Number)).optional(),
      margin_bottom: z6.number().or(z6.string().transform(Number)).optional(),
      margin_right: z6.number().or(z6.string().transform(Number)).optional(),
      orientation: z6.string().optional(),
      font_size: z6.string().optional(),
      font_family: z6.string().optional()
    });
    router7.post("/printer-settings", async (req, res, next) => {
      const branchId = req.user?.branch_id ?? null;
      const data = printerSettingsSchema.parse(req.body);
      const {
        label_size = '2.25" (57mm) x 1.25" (32mm) Dymo 11354 / 30334',
        barcode_length = 20,
        margin_top = 2,
        margin_left = 2,
        margin_bottom = 2,
        margin_right = 2,
        orientation = "Landscape",
        font_size = "Medium",
        font_family = "Arial"
      } = data;
      try {
        const existing = await queryOne(
          "SELECT id FROM printer_settings WHERE business_id=? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL))",
          [req.user.business_id, branchId, branchId]
        );
        if (existing) {
          await execute(
            "UPDATE printer_settings SET label_size=?, barcode_length=?, margin_top=?, margin_left=?, margin_bottom=?, margin_right=?, orientation=?, font_size=?, font_family=? WHERE id=?",
            [label_size, barcode_length, margin_top, margin_left, margin_bottom, margin_right, orientation, font_size, font_family, existing.id]
          );
        } else {
          await execute(
            "INSERT INTO printer_settings (business_id, branch_id, label_size, barcode_length, margin_top, margin_left, margin_bottom, margin_right, orientation, font_size, font_family) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [req.user.business_id, branchId, label_size, barcode_length, margin_top, margin_left, margin_bottom, margin_right, orientation, font_size, font_family]
          );
        }
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    router7.get("/thermal-printer-settings", async (req, res, next) => {
      try {
        const branchId = req.user?.branch_id;
        let s = await queryOne("SELECT * FROM thermal_printer_settings WHERE business_id=? AND branch_id=?", [req.user.business_id, branchId]);
        if (!s) {
          await execute("INSERT INTO thermal_printer_settings (business_id,branch_id) VALUES (?,?)", [req.user.business_id, branchId]);
          s = await queryOne("SELECT * FROM thermal_printer_settings WHERE business_id=? AND branch_id=?", [req.user.business_id, branchId]);
        }
        res.json(s);
      } catch (e) {
        next(e);
      }
    });
    thermalPrinterSettingsSchema = z6.object({
      font_family: z6.string().optional(),
      font_size: z6.string().optional(),
      show_logo: z6.boolean().optional(),
      show_business_name: z6.boolean().optional(),
      show_business_address: z6.boolean().optional(),
      show_business_phone: z6.boolean().optional(),
      show_business_email: z6.boolean().optional(),
      show_customer_info: z6.boolean().optional(),
      show_invoice_number: z6.boolean().optional(),
      show_date: z6.boolean().optional(),
      show_items_table: z6.boolean().optional(),
      show_totals: z6.boolean().optional(),
      show_footer: z6.boolean().optional(),
      show_powered_by: z6.boolean().optional(),
      eod_show_cash_summary: z6.boolean().optional(),
      eod_show_payment_type: z6.boolean().optional(),
      eod_show_total_cash: z6.boolean().optional(),
      eod_show_total_card_sale: z6.boolean().optional(),
      eod_show_total: z6.boolean().optional(),
      eod_footer_type: z6.string().optional(),
      eod_footer_custom_text: z6.string().optional(),
      footer_text: z6.string().optional()
    });
    router7.post("/thermal-printer-settings", async (req, res, next) => {
      const branchId = req.user?.branch_id;
      const m = thermalPrinterSettingsSchema.parse(req.body);
      try {
        await execute(
          `
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
          [
            req.user.business_id,
            branchId,
            m.font_family || "Arial",
            m.font_size || "12px",
            m.show_logo ? 1 : 0,
            m.show_business_name ? 1 : 0,
            m.show_business_address ? 1 : 0,
            m.show_business_phone ? 1 : 0,
            m.show_business_email ? 1 : 0,
            m.show_customer_info ? 1 : 0,
            m.show_invoice_number ? 1 : 0,
            m.show_date ? 1 : 0,
            m.show_items_table ? 1 : 0,
            m.show_totals ? 1 : 0,
            m.show_footer ? 1 : 0,
            m.show_powered_by ? 1 : 0,
            m.eod_show_cash_summary ? 1 : 0,
            m.eod_show_payment_type ? 1 : 0,
            m.eod_show_total_cash ? 1 : 0,
            m.eod_show_total_card_sale ? 1 : 0,
            m.eod_show_total ? 1 : 0,
            m.eod_footer_type || "branch",
            m.eod_footer_custom_text || "",
            m.footer_text || "Thank you for your business!"
          ]
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    router7.get("/categories", async (req, res, next) => {
      try {
        res.json(await query("SELECT * FROM categories WHERE business_id=?", [req.user.business_id]));
      } catch (e) {
        next(e);
      }
    });
    categoryManufacturerSchema = z6.object({
      name: z6.string().min(1, "Name is required")
    });
    router7.post("/categories", async (req, res, next) => {
      const data = categoryManufacturerSchema.parse(req.body);
      const { name } = data;
      try {
        const r = await execute("INSERT INTO categories (business_id,name) VALUES (?,?)", [req.user.business_id, name]);
        res.json({ id: r.insertId, name });
      } catch (e) {
        next(e);
      }
    });
    router7.get("/manufacturers", async (req, res, next) => {
      try {
        res.json(await query("SELECT * FROM manufacturers WHERE business_id=?", [req.user.business_id]));
      } catch (e) {
        next(e);
      }
    });
    router7.post("/manufacturers", async (req, res, next) => {
      const data = categoryManufacturerSchema.parse(req.body);
      const { name } = data;
      try {
        const r = await execute("INSERT INTO manufacturers (business_id,name) VALUES (?,?)", [req.user.business_id, name]);
        res.json({ id: r.insertId, name });
      } catch (e) {
        next(e);
      }
    });
    router7.get("/suppliers", async (req, res, next) => {
      try {
        res.json(await query("SELECT * FROM suppliers WHERE business_id=?", [req.user.business_id]));
      } catch (e) {
        __require("fs").appendFileSync("debug.log", `GET /suppliers error: ${e.message}
${e.stack}
`);
        console.error("GET /suppliers error:", e);
        next(e);
      }
    });
    supplierSchema = z6.object({
      name: z6.string().min(1, "Name is required"),
      phone: z6.string().optional(),
      email: z6.string().optional(),
      contact_person: z6.string().optional()
    });
    router7.post("/suppliers", async (req, res, next) => {
      const data = supplierSchema.parse(req.body);
      const { name, phone, email, contact_person } = data;
      try {
        const r = await execute(
          "INSERT INTO suppliers (business_id,name,phone,email,contact_person) VALUES (?,?,?,?,?)",
          [req.user.business_id, name, phone, email, contact_person]
        );
        res.json({ id: r.insertId, name, phone, email, contact_person });
      } catch (e) {
        next(e);
      }
    });
    router7.delete("/suppliers/:id", async (req, res, next) => {
      try {
        await execute("DELETE FROM suppliers WHERE id=? AND business_id=?", [req.params.id, req.user.business_id]);
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    router7.get("/branches", async (req, res, next) => {
      try {
        res.json(await query("SELECT * FROM branches WHERE business_id=?", [req.user.business_id]));
      } catch (e) {
        next(e);
      }
    });
    settings_default = router7;
  }
});

// src/routes/inventory.ts
var inventory_exports = {};
__export(inventory_exports, {
  default: () => inventory_default
});
import { Router as Router8 } from "express";
import { z as z7 } from "zod";
var router8, addInventorySchema, updateDeviceSchema, deviceActivitySchema, transferSchema, createRepairSchema, updateRepairSchema, inventory_default;
var init_inventory = __esm({
  "src/routes/inventory.ts"() {
    init_mysql();
    router8 = Router8();
    addInventorySchema = z7.object({
      sku_id: z7.number().or(z7.string().transform(Number)),
      branch_id: z7.number().or(z7.string().transform(Number)).optional(),
      quantity: z7.number().or(z7.string().transform(Number)).optional(),
      cost_price: z7.number().or(z7.string().transform(Number)).optional(),
      selling_price: z7.number().or(z7.string().transform(Number)).optional(),
      supplier_id: z7.number().or(z7.string().transform(Number)).nullable().optional(),
      po_number: z7.string().optional(),
      items: z7.array(z7.object({
        imei: z7.string().optional(),
        color: z7.string().optional(),
        gb: z7.string().optional(),
        condition: z7.string().optional()
      })).optional()
    });
    router8.post("/add", async (req, res, next) => {
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
        const productInfo = piRows[0];
        if (!productInfo) throw new Error("Product not found or access denied");
        let finalPoNumber = po_number?.trim();
        if (!finalPoNumber) {
          const [lastPo] = await conn.execute("SELECT id FROM purchase_orders WHERE business_id=? ORDER BY id DESC LIMIT 1", [req.user.business_id]);
          const nextSerial = String((lastPo[0]?.id || 0) + 1).padStart(2, "0");
          finalPoNumber = `PO${nextSerial}`;
        }
        const [existPo] = await conn.execute("SELECT id FROM purchase_orders WHERE po_number=? AND business_id=?", [finalPoNumber, req.user.business_id]);
        const validItems = (items || []).filter((it) => it.imei && it.imei.trim().length > 0);
        const actualQuantity = productInfo.product_type === "serialized" ? validItems.length : quantity || 0;
        const totalAmount = (cost_price || 0) * actualQuantity;
        let poId;
        if (existPo.length === 0) {
          const [pr] = await conn.execute(
            "INSERT INTO purchase_orders (business_id,branch_id,supplier_id,po_number,status,total,expected_at) VALUES (?,?,?,?,'received',?,NOW())",
            [req.user.business_id, activeBranchId, supplier_id || null, finalPoNumber, totalAmount]
          );
          poId = pr.insertId;
        } else {
          poId = existPo[0].id;
          await conn.execute(
            "UPDATE purchase_orders SET total=total+?, supplier_id=COALESCE(?, supplier_id) WHERE id=?",
            [totalAmount, supplier_id || null, poId]
          );
        }
        await conn.execute(
          "INSERT INTO purchase_order_items (po_id,product_id,description,ordered_qty,received_qty,unit_cost,total) VALUES (?,?,?,?,?,?,?)",
          [
            poId,
            productInfo.product_id,
            productInfo.product_name,
            actualQuantity,
            actualQuantity,
            cost_price || 0,
            totalAmount
          ]
        );
        if (productInfo.product_type === "serialized") {
          const imeiList = validItems.map((it) => it.imei.trim());
          const lowerImeis = imeiList.map((s) => s.toLowerCase());
          const duplicateInBatch = lowerImeis.find((s, idx) => lowerImeis.indexOf(s) !== idx);
          if (duplicateInBatch) {
            await conn.rollback();
            return res.status(400).json({ error: `Double-scan detected: Duplicate IMEI "${duplicateInBatch}" in current batch.` });
          }
          for (const item of validItems) {
            const cleanImei = item.imei.trim();
            const [existing] = await conn.execute(
              "SELECT id, imei, status FROM devices WHERE (imei = ? OR imei_serial = ?) AND business_id = ? LIMIT 1",
              [cleanImei, cleanImei, req.user.business_id]
            );
            if (existing.length > 0) {
              const dev = existing[0];
              await conn.rollback();
              return res.status(400).json({ error: `IMEI "${cleanImei}" already exists in inventory (Status: ${dev.status}).` });
            }
          }
          for (const item of validItems) {
            await conn.execute(
              "INSERT INTO devices (business_id,branch_id,sku_id,imei,cost_price,selling_price,color,gb,`condition`,po_number,status) VALUES (?,?,?,?,?,?,?,?,?,?,'in_stock')",
              [req.user.business_id, activeBranchId, sku_id, item.imei.trim(), cost_price, selling_price, item.color, item.gb, item.condition, finalPoNumber]
            );
            const deviceId = (await conn.execute("SELECT LAST_INSERT_ID() as id"))[0];
            await conn.execute(
              "INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
              [deviceId[0].id, req.userId, "Device Created", `Added to inventory via PO: ${finalPoNumber}`]
            );
            await conn.execute(
              "INSERT INTO activity_logs (device_id, user_id, activity_type, description, reference_link) VALUES (?, ?, ?, ?, ?)",
              [deviceId[0].id, req.userId, "Device Created", "Initial inventory entry", finalPoNumber]
            );
            await conn.execute(
              "INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,1) ON DUPLICATE KEY UPDATE quantity=quantity+1",
              [activeBranchId, sku_id]
            );
          }
        } else {
          await conn.execute(
            "INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)",
            [activeBranchId, sku_id, quantity]
          );
        }
        await conn.execute(
          "INSERT INTO inventory_movements (business_id,branch_id,sku_id,movement_type,quantity,unit_cost,reference_type,reference_id) VALUES (?,?,?,?,?,?,?,?)",
          [req.user.business_id, activeBranchId, sku_id, "purchase", quantity || items?.length || 0, cost_price || 0, "purchase_order", poId]
        );
        await conn.commit();
        res.json({ success: true });
      } catch (e) {
        await conn.rollback();
        console.error("[inventory/add] Error:", e.message, e.sql || "");
        next(e);
      } finally {
        conn.release();
      }
    });
    router8.get("/purchase-orders", async (req, res, next) => {
      try {
        const isSuper = req.user.role === "superadmin";
        const sql = `
      SELECT po.*, s.name as supplier_name FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id=s.id
      WHERE po.business_id=? ${!isSuper ? "AND po.branch_id=?" : ""}
      ORDER BY po.created_at DESC
    `;
        const params = !isSuper ? [req.user.business_id, req.user.branch_id] : [req.user.business_id];
        res.json(await query(sql, params));
      } catch (e) {
        next(e);
      }
    });
    router8.get("/purchase-orders/by-number/:number", async (req, res, next) => {
      try {
        const po = await queryOne("SELECT id FROM purchase_orders WHERE po_number=? AND business_id=?", [req.params.number, req.user.business_id]);
        if (!po) return res.status(404).json({ error: "Purchase order not found" });
        res.json(po);
      } catch (e) {
        next(e);
      }
    });
    router8.get("/purchase-orders/:id", async (req, res, next) => {
      try {
        const po = await queryOne(`
      SELECT po.*, s.name as supplier_name, s.email as supplier_email FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id=s.id
      WHERE po.id=? AND po.business_id=?
    `, [req.params.id, req.user.business_id]);
        if (!po) return res.status(404).json({ error: "Purchase order not found" });
        const items = await query("SELECT * FROM purchase_order_items WHERE po_id=?", [req.params.id]);
        res.json({ ...po, items });
      } catch (e) {
        next(e);
      }
    });
    router8.get("/devices/check-imei", async (req, res, next) => {
      const { imei } = req.query;
      if (!imei || String(imei).trim() === "") {
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
      } catch (e) {
        console.error("[CheckIMEI] Error:", e.message);
        next(e);
      }
    });
    router8.get("/devices/stats", async (req, res, next) => {
      try {
        const businessId = req.user.business_id;
        const isSuper = req.user.role === "superadmin";
        const rows = await query(`
      SELECT 
        COUNT(*) as total_devices,
        SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as in_stock_devices
      FROM devices
      WHERE business_id = ? ${!isSuper ? "AND branch_id = ?" : ""}
    `, !isSuper ? [businessId, req.user.branch_id] : [businessId]);
        res.json(rows[0] || { total_devices: 0, in_stock_devices: 0 });
      } catch (e) {
        next(e);
      }
    });
    router8.get("/devices/sample-csv", async (req, res) => {
      const sampleContent = `"Serial Number / IMEI","Product Name","Category","Brand / Manufacturer","Storage","Color","Condition","Cost Price","Selling Price","Stock Status","IMEI Status","Carrier / Lock","Created Date"
"R5GL3253R8Y","Galaxy Tab A11+ X230 WI-FI","Tablets","Samsung","128GB","Silver","New",150.00,219.00,"in_stock","Clean","Unlocked","2026-08-07 10:11:45"
"R5GL3253Q8B","Galaxy Tab A11+ X230 WI-FI","Tablets","Samsung","128GB","Graphite","New",150.00,219.00,"in_stock","Clean","Unlocked","2026-08-07 10:13:18"
"353014119037244","iPhone 12 mini","Mobile Phones","Apple","128GB","Black","Grade A",160.00,245.00,"in_stock","Clean","Unlocked","2026-07-25 09:50:02"
"351500437920378","iPhone 13","Mobile Phones","Apple","128GB","Midnight","Grade A",220.00,330.00,"in_stock","Clean","Unlocked","2026-08-05 16:04:32"`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="standard_serial_products.csv"');
      res.send(sampleContent);
    });
    router8.get("/devices/export-csv", async (req, res, next) => {
      try {
        const businessId = req.user.business_id;
        const isSuper = req.user.role === "superadmin";
        const status = req.query.status || "all";
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
        DATE_FORMAT(COALESCE(d.created_at, d.date_added, NOW()), '%Y-%m-%d %H:%i:%s') as created_date
      FROM devices d
      LEFT JOIN product_skus s ON d.sku_id = s.id
      LEFT JOIN products p ON (d.product_id = p.id OR s.product_id = p.id)
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE d.business_id = ? ${status !== "all" ? "AND d.status = ?" : ""} ${!isSuper ? "AND d.branch_id = ?" : ""}
      ORDER BY d.created_at DESC
    `;
        const params = [businessId];
        if (status !== "all") params.push(status);
        if (!isSuper) params.push(req.user.branch_id);
        const rows = await query(sql, params);
        const escapeCsv = (str) => {
          if (str === null || str === void 0) return '""';
          const s = String(str).trim();
          return `"${s.replace(/"/g, '""')}"`;
        };
        let csvContent = `"Serial Number / IMEI","Product Name","Category","Brand / Manufacturer","Storage","Color","Condition","Cost Price","Selling Price","Stock Status","IMEI Status","Carrier / Lock","Created Date"
`;
        for (const row of rows) {
          const line = [
            escapeCsv(row.serial_number),
            escapeCsv(row.product_name || "Standard Mobile Device"),
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
          ].join(",");
          csvContent += line + "\n";
        }
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="serial_products_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv"`);
        res.send(csvContent);
      } catch (e) {
        console.error("[ExportSerialProducts] Error:", e.message);
        next(e);
      }
    });
    router8.post("/devices/import-csv", async (req, res, next) => {
      const { items, duplicateHandling = "overwrite" } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "No serial product items provided" });
      }
      const businessId = req.user.business_id;
      const branchId = req.user.branch_id || 1;
      const userId = req.user.id || req.userId || 1;
      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const errors = [];
      const conn = await pool.getConnection();
      try {
        await conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
        await conn.query("SET collation_connection = 'utf8mb4_unicode_ci'");
        await conn.beginTransaction();
        for (let i = 0; i < items.length; i++) {
          const row = items[i];
          const serialNumber = String(row.serial_number || row.serial || row.imei || "").trim();
          const productName = String(row.product_name || row.product || "Standard Mobile Device").trim();
          const categoryName = String(row.category_name || row.category || "").trim();
          const manufacturerName = String(row.manufacturer_name || row.manufacturer || row.brand || "").trim();
          const storage = String(row.storage || row.gb || "").trim();
          const color = String(row.color || "").trim();
          const condition = String(row.physical_condition || row.condition || "New").trim();
          const costPrice = parseFloat(row.cost_price || 0) || 0;
          const sellingPrice = parseFloat(row.selling_price || row.price || 0) || 0;
          const stockStatus = String(row.status || "in_stock").trim() || "in_stock";
          const imeiStatus = String(row.imei_status || "Clean").trim() || "Clean";
          const carrier = String(row.carrier || row.unlocked || "Unlocked").trim() || "Unlocked";
          const createdDate = row.created_date || row.created_at || null;
          if (!serialNumber) {
            errors.push(`Row ${i + 1}: Skipped - Serial number is missing`);
            skipped++;
            continue;
          }
          try {
            let categoryId = null;
            if (categoryName) {
              const [cr] = await conn.execute(
                "SELECT id FROM categories WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci LIMIT 1",
                [businessId, categoryName]
              );
              if (cr.length > 0) {
                categoryId = cr[0].id;
              } else {
                const [ins] = await conn.execute(
                  "INSERT INTO categories (business_id, name) VALUES (?, ?)",
                  [businessId, categoryName]
                );
                categoryId = ins.insertId;
              }
            }
            let manufacturerId = null;
            if (manufacturerName) {
              const [mr] = await conn.execute(
                "SELECT id FROM manufacturers WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci LIMIT 1",
                [businessId, manufacturerName]
              );
              if (mr.length > 0) {
                manufacturerId = mr[0].id;
              } else {
                const [ins] = await conn.execute(
                  "INSERT INTO manufacturers (business_id, name) VALUES (?, ?)",
                  [businessId, manufacturerName]
                );
                manufacturerId = ins.insertId;
              }
            }
            const [prodRows] = await conn.execute(
              "SELECT id FROM products WHERE business_id = ? AND name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci AND deleted_at IS NULL LIMIT 1",
              [businessId, productName]
            );
            let productId;
            if (prodRows.length > 0) {
              productId = prodRows[0].id;
              if (categoryId || manufacturerId) {
                await conn.execute(
                  "UPDATE products SET category_id = COALESCE(?, category_id), manufacturer_id = COALESCE(?, manufacturer_id) WHERE id = ?",
                  [categoryId, manufacturerId, productId]
                );
              }
            } else {
              const [insProd] = await conn.execute(
                "INSERT INTO products (business_id, category_id, manufacturer_id, name, product_type, allow_overselling) VALUES (?, ?, ?, ?, ?, ?)",
                [businessId, categoryId, manufacturerId, productName, "serialized", 1]
              );
              productId = insProd.insertId;
            }
            const [skuRows] = await conn.execute(
              "SELECT id FROM product_skus WHERE product_id = ? LIMIT 1",
              [productId]
            );
            let skuId;
            if (skuRows.length > 0) {
              skuId = skuRows[0].id;
              if (sellingPrice > 0 || costPrice > 0) {
                await conn.execute(
                  "UPDATE product_skus SET selling_price = COALESCE(NULLIF(?, 0), selling_price), cost_price = COALESCE(NULLIF(?, 0), cost_price) WHERE id = ?",
                  [sellingPrice, costPrice, skuId]
                );
              }
            } else {
              const skuCode = `SKU-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1e3)}`;
              const [insSku] = await conn.execute(
                "INSERT INTO product_skus (product_id, sku_code, barcode, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)",
                [productId, skuCode, skuCode, costPrice, sellingPrice]
              );
              skuId = insSku.insertId;
            }
            const [existDevice] = await conn.execute(
              "SELECT id FROM devices WHERE (imei COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci OR imei_serial COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci) LIMIT 1",
              [serialNumber, serialNumber]
            );
            if (existDevice.length > 0) {
              const existingId = existDevice[0].id;
              if (duplicateHandling === "overwrite") {
                await conn.execute(`
              UPDATE devices 
              SET business_id = ?, branch_id = ?, product_id = ?, sku_id = ?, gb = ?, color = ?, \`condition\` = ?, cost_price = ?, selling_price = ?, status = ?, imei_status = ?, carrier = ?
              WHERE id = ?
            `, [businessId, branchId, productId, skuId, storage, color, condition, costPrice, sellingPrice, stockStatus, imeiStatus, carrier, existingId]);
                updated++;
              } else {
                skipped++;
              }
            } else {
              const [insDev] = await conn.execute(`
            INSERT INTO devices 
              (business_id, branch_id, product_id, sku_id, imei, imei_serial, gb, color, \`condition\`, cost_price, selling_price, status, imei_status, carrier, created_at, date_added)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), COALESCE(?, NOW()))
          `, [businessId, branchId, productId, skuId, serialNumber, serialNumber, storage, color, condition, costPrice, sellingPrice, stockStatus, imeiStatus, carrier, createdDate, createdDate]);
              const deviceId = insDev.insertId;
              if (stockStatus === "in_stock") {
                await conn.execute(
                  "INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1",
                  [branchId, skuId]
                );
              }
              await conn.execute(
                "INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
                [deviceId, userId, "Device Created", "Imported via Standard CSV"]
              );
              imported++;
            }
          } catch (rowErr) {
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
      } catch (err) {
        await conn.rollback();
        console.error("[ImportSerialProducts] Error:", err.message);
        res.status(500).json({ error: err.message || "Failed to import serial products" });
      } finally {
        conn.release();
      }
    });
    router8.get("/devices/search", async (req, res, next) => {
      const { q, imei, branch_id, status } = req.query;
      const searchVal = q || imei;
      try {
        let sql = `
      SELECT 
        d.*, 
        p.name as product_name, 
        COALESCE(c.name, 'Mobile Devices') as category_name,
        COALESCE(m.name, '') as manufacturer_name,
        s.sku_code, 
        s.barcode,
        b.name as branch_name
      FROM devices d 
      LEFT JOIN product_skus s ON d.sku_id=s.id
      LEFT JOIN products p ON (d.product_id=p.id OR s.product_id=p.id)
      LEFT JOIN categories c ON p.category_id=c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id=m.id
      LEFT JOIN branches b ON d.branch_id=b.id 
      WHERE d.business_id=?
    `;
        const params = [req.user.business_id];
        if (status && status !== "all") {
          sql += " AND d.status=?";
          params.push(status);
        }
        if (searchVal && String(searchVal).trim() !== "") {
          sql += " AND (d.imei LIKE ? OR p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ? OR d.imei_serial LIKE ?)";
          const term = `%${String(searchVal).trim()}%`;
          params.push(term, term, term, term, term);
        }
        const activeBranchId = branch_id ? parseInt(branch_id) : null;
        if (activeBranchId && String(activeBranchId) !== "undefined") {
          sql += " AND d.branch_id=?";
          params.push(activeBranchId);
        }
        sql += " ORDER BY d.id DESC LIMIT 50";
        res.json(await query(sql, params));
      } catch (e) {
        console.error("[SearchDevices] Error:", e.message);
        next(e);
      }
    });
    router8.get("/devices/:id", async (req, res, next) => {
      try {
        const device = await queryOne(`
      SELECT d.*, p.name as product_name, s.sku_code, s.barcode
      FROM devices d
      JOIN product_skus s ON d.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      WHERE d.id=? AND d.business_id=?
    `, [req.params.id, req.user.business_id]);
        if (!device) return res.status(404).json({ error: "Device not found" });
        res.json(device);
      } catch (e) {
        next(e);
      }
    });
    updateDeviceSchema = z7.object({
      sku_id: z7.union([z7.number(), z7.string()]).nullable().optional().transform((v) => v === null || v === void 0 || v === "" ? void 0 : Number(v)),
      color: z7.string().nullable().optional(),
      gb: z7.union([z7.string(), z7.number()]).nullable().optional().transform((v) => v === null || v === void 0 ? v : String(v)),
      ram: z7.union([z7.string(), z7.number()]).nullable().optional().transform((v) => v === null || v === void 0 ? v : String(v)),
      condition: z7.string().nullable().optional(),
      cost_price: z7.union([z7.number(), z7.string()]).nullable().optional().transform((v) => v === null || v === void 0 || v === "" ? null : Number(v)),
      selling_price: z7.union([z7.number(), z7.string()]).nullable().optional().transform((v) => v === null || v === void 0 || v === "" ? null : Number(v)),
      unlocked: z7.union([z7.string(), z7.boolean(), z7.number()]).nullable().optional().transform((v) => v === null || v === void 0 ? v : String(v)),
      imei_status: z7.string().nullable().optional(),
      carrier: z7.string().nullable().optional()
    });
    router8.put("/devices/:id", async (req, res, next) => {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const data = updateDeviceSchema.parse(req.body);
        const { sku_id, color, gb, ram, condition, cost_price, selling_price, unlocked, imei_status, carrier } = data;
        const [oldRows] = await conn.execute(
          `SELECT d.*, p.name as product_name 
       FROM devices d 
       JOIN product_skus s ON d.sku_id=s.id 
       JOIN products p ON s.product_id=p.id 
       WHERE d.id=? AND d.business_id=?`,
          [req.params.id, req.user.business_id]
        );
        const old = oldRows[0];
        if (!old) {
          await conn.rollback();
          return res.status(404).json({ error: "Device not found" });
        }
        let targetSkuId = old.sku_id;
        let oldModelName = old.product_name || "";
        let newModelName = oldModelName;
        const changes = [];
        if (sku_id !== void 0 && Number(sku_id) !== Number(old.sku_id)) {
          const [targetSkuRows] = await conn.execute(
            `SELECT s.id, p.name as product_name, p.product_type 
         FROM product_skus s 
         JOIN products p ON s.product_id=p.id 
         WHERE s.id=? AND p.business_id=?`,
            [sku_id, req.user.business_id]
          );
          const targetSku = targetSkuRows[0];
          if (!targetSku) {
            await conn.rollback();
            return res.status(400).json({ error: "Target product model not found or unauthorized" });
          }
          targetSkuId = targetSku.id;
          newModelName = targetSku.product_name;
          changes.push(`Model: ${oldModelName} -> ${newModelName}`);
          const deviceBranchId = old.branch_id || req.user.branch_id || 1;
          if (old.status === "in_stock") {
            await conn.execute(
              `INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, -1)
           ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity - 1)`,
              [deviceBranchId, old.sku_id]
            );
            await conn.execute(
              `INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 1)
           ON DUPLICATE KEY UPDATE quantity = quantity + 1`,
              [deviceBranchId, targetSkuId]
            );
          }
        }
        const newColor = color !== void 0 ? color : old.color;
        const newGb = gb !== void 0 ? gb : old.gb;
        const newRam = ram !== void 0 ? ram : old.ram;
        const newCondition = condition !== void 0 ? condition : old.condition;
        const newCostPrice = cost_price !== void 0 ? cost_price : old.cost_price;
        const newSellingPrice = selling_price !== void 0 ? selling_price : old.selling_price;
        const newUnlocked = unlocked !== void 0 ? unlocked : old.unlocked;
        const newImeiStatus = imei_status !== void 0 ? imei_status : old.imei_status;
        const newCarrier = carrier !== void 0 ? carrier : old.carrier;
        await conn.execute(`
      UPDATE devices SET 
        sku_id=?, color=?, gb=?, ram=?, \`condition\`=?, cost_price=?, selling_price=?, 
        unlocked=?, imei_status=?, carrier=?
      WHERE id=? AND business_id=?
    `, [
          targetSkuId,
          newColor,
          newGb,
          newRam,
          newCondition,
          newCostPrice,
          newSellingPrice,
          newUnlocked,
          newImeiStatus,
          newCarrier,
          req.params.id,
          req.user.business_id
        ]);
        if (color !== void 0 && String(color ?? "") !== String(old.color ?? "")) changes.push(`Color: ${old.color || "none"} -> ${color}`);
        if (gb !== void 0 && String(gb ?? "") !== String(old.gb ?? "")) changes.push(`GB: ${old.gb || "none"} -> ${gb}`);
        if (ram !== void 0 && String(ram ?? "") !== String(old.ram ?? "")) changes.push(`RAM: ${old.ram || "none"} -> ${ram}`);
        if (condition !== void 0 && String(condition ?? "") !== String(old.condition ?? "")) changes.push(`Condition: ${old.condition || "none"} -> ${condition}`);
        if (cost_price !== void 0 && Number(cost_price || 0) !== Number(old.cost_price || 0)) changes.push(`Cost: ${old.cost_price} -> ${cost_price}`);
        if (selling_price !== void 0 && Number(selling_price || 0) !== Number(old.selling_price || 0)) changes.push(`Selling: ${old.selling_price} -> ${selling_price}`);
        if (unlocked !== void 0 && String(unlocked ?? "") !== String(old.unlocked ?? "")) changes.push(`Unlocked: ${old.unlocked || "none"} -> ${unlocked}`);
        if (imei_status !== void 0 && String(imei_status ?? "") !== String(old.imei_status ?? "")) changes.push(`IMEI Status: ${old.imei_status || "none"} -> ${imei_status}`);
        if (carrier !== void 0 && String(carrier ?? "") !== String(old.carrier ?? "")) changes.push(`Carrier: ${old.carrier || "none"} -> ${carrier}`);
        const userId = req.user?.id || req.userId || 1;
        if (changes.length > 0) {
          await conn.execute(
            "INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
            [req.params.id, userId, "Device Updated", changes.join(", ")]
          );
          await conn.execute(
            "INSERT INTO activity_logs (device_id, user_id, activity_type, description) VALUES (?, ?, ?, ?)",
            [req.params.id, userId, "Device Updated", changes.join(", ")]
          );
        }
        await conn.commit();
        res.json({ success: true, sku_id: targetSkuId, product_name: newModelName });
      } catch (e) {
        await conn.rollback();
        console.error("[UpdateDevice] Error:", e);
        next(e);
      } finally {
        conn.release();
      }
    });
    router8.get("/devices/:id/activity", async (req, res, next) => {
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
      } catch (e) {
        next(e);
      }
    });
    deviceActivitySchema = z7.object({
      activity: z7.string().optional(),
      details: z7.string().optional()
    });
    router8.post("/devices/:id/activity", async (req, res, next) => {
      const data = deviceActivitySchema.parse(req.body);
      const { activity, details } = data;
      try {
        const device = await queryOne("SELECT id FROM devices WHERE id=? AND business_id=?", [req.params.id, req.user.business_id]);
        if (!device) return res.status(404).json({ error: "Device not found" });
        await execute(
          "INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
          [req.params.id, req.userId, activity || "Note Added", details || ""]
        );
        await execute(
          "INSERT INTO activity_logs (device_id, user_id, activity_type, description) VALUES (?, ?, ?, ?)",
          [req.params.id, req.userId, activity || "Note Added", details || ""]
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    router8.delete("/devices/:id", async (req, res, next) => {
      try {
        const result = await execute("DELETE FROM devices WHERE id=? AND business_id=?", [req.params.id, req.user.business_id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "Device not found or access denied" });
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    router8.get("/devices", async (req, res, next) => {
      const status = req.query.status || "in_stock";
      try {
        const isSuper = req.user.role === "superadmin";
        const sql = `
      SELECT d.id, d.sku_id, d.imei, d.color, d.gb, d.\`condition\`, d.po_number, d.status, d.created_at,
             p.name as product_name, s.sku_code, inv.invoice_number
      FROM devices d
      JOIN product_skus s ON d.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      LEFT JOIN invoice_items ii ON d.id=ii.device_id
      LEFT JOIN invoices inv ON ii.invoice_id=inv.id
      WHERE d.business_id=? AND d.status=? ${!isSuper ? "AND d.branch_id=?" : ""}
      ORDER BY d.created_at DESC
    `;
        const params = !isSuper ? [req.user.business_id, status, req.user.branch_id] : [req.user.business_id, status];
        res.json(await query(sql, params));
      } catch (e) {
        next(e);
      }
    });
    router8.get("/transfers/destinations", async (req, res, next) => {
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
      } catch (e) {
        next(e);
      }
    });
    transferSchema = z7.object({
      to_branch_id: z7.number().or(z7.string().transform(Number)),
      device_id: z7.number().or(z7.string().transform(Number)).optional().nullable(),
      sku_id: z7.number().or(z7.string().transform(Number)).optional().nullable(),
      product_name: z7.string().optional().nullable(),
      sku_code: z7.string().optional().nullable(),
      imei: z7.string().optional().nullable(),
      serial_number: z7.string().optional().nullable(),
      quantity: z7.number().or(z7.string().transform(Number)).optional().default(1),
      cost_price: z7.number().or(z7.string().transform(Number)).optional().nullable(),
      selling_price: z7.number().or(z7.string().transform(Number)).optional().nullable(),
      color: z7.string().optional().nullable(),
      gb: z7.string().optional().nullable(),
      condition: z7.string().optional().nullable(),
      notes: z7.string().optional().nullable()
    });
    router8.post("/transfers", async (req, res, next) => {
      const data = transferSchema.parse(req.body);
      const {
        to_branch_id,
        device_id: rawDeviceId,
        sku_id: rawSkuId,
        product_name,
        sku_code,
        imei,
        serial_number,
        quantity: rawQty,
        cost_price,
        selling_price,
        color,
        gb,
        condition,
        notes
      } = data;
      const quantity = rawQty || 1;
      const sourceBranchId = req.user.branch_id;
      const sourceBusinessId = req.user.business_id;
      if (!to_branch_id) return res.status(400).json({ error: "Destination branch is required" });
      if (Number(to_branch_id) === Number(sourceBranchId)) {
        return res.status(400).json({ error: "Source and destination branches must be different" });
      }
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [destBranchRows] = await conn.execute(
          "SELECT b.id, b.business_id, b.name as branch_name, bz.name as business_name FROM branches b JOIN businesses bz ON b.business_id=bz.id WHERE b.id=?",
          [to_branch_id]
        );
        const destBranch = destBranchRows[0];
        if (!destBranch) throw new Error("Destination branch does not exist");
        let finalSkuId = rawSkuId;
        let finalDeviceId = rawDeviceId;
        let isSerialized = !!(imei?.trim() || serial_number?.trim() || rawDeviceId);
        let sourceProductId = null;
        const cleanProductName = product_name?.trim();
        const cleanSkuCode = sku_code?.trim() || (cleanProductName ? cleanProductName.replace(/[^a-zA-Z0-9]/g, "-").toUpperCase().substring(0, 30) : "SKU-ITEM");
        if (cleanProductName) {
          const [prodRows] = await conn.execute(
            "SELECT id, product_type FROM products WHERE business_id=? AND name=?",
            [sourceBusinessId, cleanProductName]
          );
          if (prodRows.length > 0) {
            sourceProductId = prodRows[0].id;
            if (prodRows[0].product_type === "serialized") isSerialized = true;
          } else {
            const [prodIns] = await conn.execute(
              "INSERT INTO products (business_id, name, product_type, allow_overselling) VALUES (?, ?, ?, 1)",
              [sourceBusinessId, cleanProductName, isSerialized ? "serialized" : "stock"]
            );
            sourceProductId = prodIns.insertId;
          }
          const [skuRows] = await conn.execute(
            "SELECT id FROM product_skus WHERE product_id=? AND (sku_code=? OR ? IS NULL)",
            [sourceProductId, cleanSkuCode, cleanSkuCode]
          );
          if (skuRows.length > 0) {
            finalSkuId = skuRows[0].id;
          } else {
            const [skuIns] = await conn.execute(
              "INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) VALUES (?, ?, ?, ?)",
              [sourceProductId, cleanSkuCode, cost_price || 0, selling_price || 0]
            );
            finalSkuId = skuIns.insertId;
          }
        }
        if (isSerialized) {
          const cleanImei = imei?.trim() || null;
          const cleanSerial = serial_number?.trim() || null;
          if (finalDeviceId) {
            const [dr] = await conn.execute(
              "SELECT * FROM devices WHERE id=? AND business_id=?",
              [finalDeviceId, sourceBusinessId]
            );
            const dev = dr[0];
            if (!dev) throw new Error("Selected device not found");
            if (dev.status !== "in_stock" && dev.status !== "available") {
              throw new Error(`Device (${dev.imei || dev.id}) is not available (current status: ${dev.status})`);
            }
            await conn.execute("UPDATE devices SET status='transfer' WHERE id=?", [finalDeviceId]);
          } else {
            if (cleanImei) {
              const [existDev] = await conn.execute(
                "SELECT * FROM devices WHERE imei=? AND business_id=?",
                [cleanImei, sourceBusinessId]
              );
              if (existDev.length > 0) {
                finalDeviceId = existDev[0].id;
                await conn.execute("UPDATE devices SET status='transfer' WHERE id=?", [finalDeviceId]);
              }
            }
            if (!finalDeviceId && finalSkuId) {
              const [newDev] = await conn.execute(
                "INSERT INTO devices (business_id, branch_id, sku_id, imei, imei_serial, color, gb, `condition`, cost_price, selling_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'transfer')",
                [
                  sourceBusinessId,
                  sourceBranchId,
                  finalSkuId,
                  cleanImei,
                  cleanSerial || cleanImei,
                  color || null,
                  gb || null,
                  condition || "Grade A",
                  cost_price || 0,
                  selling_price || 0
                ]
              );
              finalDeviceId = newDev.insertId;
            }
          }
          if (finalSkuId) {
            await conn.execute(
              "INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE quantity=GREATEST(0, quantity - 1)",
              [sourceBranchId, finalSkuId]
            );
          }
        } else {
          if (finalSkuId) {
            await conn.execute(
              "INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE quantity=GREATEST(0, quantity - ?)",
              [sourceBranchId, finalSkuId, quantity]
            );
          }
        }
        let tr;
        try {
          [tr] = await conn.execute(
            `INSERT INTO device_transfers 
         (business_id, from_branch_id, to_branch_id, device_id, sku_id, quantity, status, initiated_by, notes, product_name, sku_code) 
         VALUES (?, ?, ?, ?, ?, ?, 'in_transit', ?, ?, ?, ?)`,
            [
              sourceBusinessId,
              sourceBranchId,
              to_branch_id,
              finalDeviceId || null,
              finalSkuId || null,
              quantity,
              req.userId,
              notes || null,
              cleanProductName || product_name || null,
              cleanSkuCode || sku_code || null
            ]
          );
        } catch (insertErr) {
          if (insertErr.message?.includes("Unknown column")) {
            try {
              await conn.query("ALTER TABLE device_transfers ADD COLUMN product_name VARCHAR(255) NULL AFTER notes");
              await conn.query("ALTER TABLE device_transfers ADD COLUMN sku_code VARCHAR(255) NULL AFTER product_name");
            } catch (mErr) {
            }
            [tr] = await conn.execute(
              `INSERT INTO device_transfers 
           (business_id, from_branch_id, to_branch_id, device_id, sku_id, quantity, status, initiated_by, notes, product_name, sku_code) 
           VALUES (?, ?, ?, ?, ?, ?, 'in_transit', ?, ?, ?, ?)`,
              [
                sourceBusinessId,
                sourceBranchId,
                to_branch_id,
                finalDeviceId || null,
                finalSkuId || null,
                quantity,
                req.userId,
                notes || null,
                cleanProductName || product_name || null,
                cleanSkuCode || sku_code || null
              ]
            );
          } else {
            throw insertErr;
          }
        }
        if (finalSkuId) {
          await conn.execute(
            `INSERT INTO inventory_movements 
         (business_id, branch_id, sku_id, movement_type, quantity, unit_cost, reference_type, reference_id) 
         VALUES (?, ?, ?, 'transfer_out', ?, ?, 'device_transfers', ?)`,
            [sourceBusinessId, sourceBranchId, finalSkuId, quantity, cost_price || 0, tr.insertId]
          );
        }
        await conn.commit();
        res.json({ success: true, id: tr.insertId });
      } catch (e) {
        await conn.rollback();
        console.error("[POST /api/transfers] Error:", e.message);
        res.status(400).json({ error: e.message });
      } finally {
        conn.release();
      }
    });
    router8.get("/transfers", async (req, res, next) => {
      try {
        const isSuper = req.user.role === "superadmin" || req.user.role === "developer";
        const sql = `
      SELECT t.*,
             fb.name as from_branch_name, fb.business_id as from_business_id,
             fbz.name as from_business_name,
             tb.name as to_branch_name, tb.business_id as to_business_id,
             tbz.name as to_business_name,
             d.imei, d.imei_serial, d.color, d.gb, d.\`condition\`, d.cost_price, d.selling_price,
             COALESCE(t.product_name, p.name, 'Stock Item') as product_name,
             COALESCE(t.sku_code, s.sku_code, '') as sku_code,
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
        ${isSuper ? "1=1" : "(fb.business_id = ? OR tb.business_id = ?)"}
      )
      ORDER BY t.created_at DESC
    `;
        const params = isSuper ? [] : [req.user.business_id, req.user.business_id];
        res.json(await query(sql, params));
      } catch (e) {
        if (e.message?.includes("Unknown column")) {
          try {
            const isSuper = req.user.role === "superadmin" || req.user.role === "developer";
            const fallbackSql = `
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
            ${isSuper ? "1=1" : "(fb.business_id = ? OR tb.business_id = ?)"}
          )
          ORDER BY t.created_at DESC
        `;
            const params = isSuper ? [] : [req.user.business_id, req.user.business_id];
            return res.json(await query(fallbackSql, params));
          } catch (err) {
            return next(err);
          }
        }
        next(e);
      }
    });
    router8.put("/transfers/:id/complete", async (req, res, next) => {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [tr] = await conn.execute(
          `SELECT t.*, fb.business_id as from_business_id, tb.business_id as to_business_id,
              d.imei, d.imei_serial, d.color, d.gb, d.\`condition\`, d.cost_price, d.selling_price,
              p.name as joined_product_name, s.sku_code as joined_sku_code,
              p.category_id as source_category_id, p.manufacturer_id as source_manufacturer_id,
              p.product_type as source_product_type
       FROM device_transfers t
       JOIN branches fb ON t.from_branch_id=fb.id
       JOIN branches tb ON t.to_branch_id=tb.id
       LEFT JOIN devices d ON t.device_id=d.id
       LEFT JOIN product_skus s ON COALESCE(d.sku_id, t.sku_id)=s.id
       LEFT JOIN products p ON s.product_id=p.id
       WHERE t.id=?`,
          [req.params.id]
        );
        const transfer = tr[0];
        if (!transfer) throw new Error("Transfer not found");
        if (transfer.status === "completed") throw new Error("Transfer already completed");
        if (transfer.status === "cancelled") throw new Error("Cannot complete a cancelled transfer");
        const isSuper = req.user.role === "superadmin" || req.user.role === "developer";
        if (!isSuper && Number(transfer.to_business_id) !== Number(req.user.business_id)) {
          return res.status(403).json({ error: "Access denied: Only the destination business can receive this transfer." });
        }
        const destBusinessId = transfer.to_business_id;
        const destBranchId = transfer.to_branch_id;
        const isCrossBusiness = Number(transfer.from_business_id) !== Number(destBusinessId);
        const resolvedProductName = transfer.product_name || transfer.joined_product_name || (transfer.device_id ? `Transferred Device #${transfer.device_id}` : "Transferred Item");
        const resolvedSkuCode = transfer.sku_code || transfer.joined_sku_code || resolvedProductName.replace(/[^a-zA-Z0-9]/g, "-").toUpperCase().substring(0, 30);
        let destSkuId = transfer.sku_id;
        let destProductId = null;
        if (resolvedProductName) {
          const [destProdRows] = await conn.execute(
            "SELECT id, product_type FROM products WHERE business_id=? AND name=?",
            [destBusinessId, resolvedProductName]
          );
          if (destProdRows.length > 0) {
            destProductId = destProdRows[0].id;
          } else {
            let destCategoryId = null;
            let destManufacturerId = null;
            if (transfer.source_category_id) {
              const [srcCat] = await conn.execute("SELECT name FROM categories WHERE id=?", [transfer.source_category_id]);
              if (srcCat.length > 0) {
                const catName = srcCat[0].name;
                const [destCat] = await conn.execute(
                  "SELECT id FROM categories WHERE business_id=? AND name=?",
                  [destBusinessId, catName]
                );
                if (destCat.length > 0) {
                  destCategoryId = destCat[0].id;
                } else {
                  const [catIns] = await conn.execute(
                    "INSERT INTO categories (business_id, name) VALUES (?, ?)",
                    [destBusinessId, catName]
                  );
                  destCategoryId = catIns.insertId;
                }
              }
            }
            if (transfer.source_manufacturer_id) {
              const [srcMfg] = await conn.execute("SELECT name FROM manufacturers WHERE id=?", [transfer.source_manufacturer_id]);
              if (srcMfg.length > 0) {
                const mfgName = srcMfg[0].name;
                const [destMfg] = await conn.execute(
                  "SELECT id FROM manufacturers WHERE business_id=? AND name=?",
                  [destBusinessId, mfgName]
                );
                if (destMfg.length > 0) {
                  destManufacturerId = destMfg[0].id;
                } else {
                  const [mfgIns] = await conn.execute(
                    "INSERT INTO manufacturers (business_id, name) VALUES (?, ?)",
                    [destBusinessId, mfgName]
                  );
                  destManufacturerId = mfgIns.insertId;
                }
              }
            }
            const [pIns] = await conn.execute(
              "INSERT INTO products (business_id, name, product_type, category_id, manufacturer_id, allow_overselling) VALUES (?, ?, ?, ?, ?, 1)",
              [
                destBusinessId,
                resolvedProductName,
                transfer.source_product_type || (transfer.device_id ? "serialized" : "stock"),
                destCategoryId,
                destManufacturerId
              ]
            );
            destProductId = pIns.insertId;
          }
          const [destSkuRows] = await conn.execute(
            "SELECT id FROM product_skus WHERE product_id=? AND (sku_code=? OR ? IS NULL)",
            [destProductId, resolvedSkuCode, resolvedSkuCode]
          );
          if (destSkuRows.length > 0) {
            destSkuId = destSkuRows[0].id;
          } else {
            try {
              const [sIns] = await conn.execute(
                "INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) VALUES (?, ?, ?, ?)",
                [destProductId, resolvedSkuCode, transfer.cost_price || 0, transfer.selling_price || 0]
              );
              destSkuId = sIns.insertId;
            } catch (skuErr) {
              if (skuErr.message?.includes("Duplicate") || skuErr.code === "ER_DUP_ENTRY") {
                const uniqueSku = `${resolvedSkuCode}-${destBusinessId}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
                const [sIns] = await conn.execute(
                  "INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) VALUES (?, ?, ?, ?)",
                  [destProductId, uniqueSku, transfer.cost_price || 0, transfer.selling_price || 0]
                );
                destSkuId = sIns.insertId;
              } else {
                throw skuErr;
              }
            }
          }
        }
        if (transfer.device_id) {
          if (isCrossBusiness) {
            await conn.execute(
              "UPDATE devices SET business_id=?, branch_id=?, sku_id=?, status='in_stock' WHERE id=?",
              [destBusinessId, destBranchId, destSkuId || transfer.sku_id, transfer.device_id]
            );
          } else {
            await conn.execute(
              "UPDATE devices SET branch_id=?, status='in_stock' WHERE id=?",
              [destBranchId, transfer.device_id]
            );
          }
          if (destSkuId) {
            await conn.execute(
              "INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity=quantity+1",
              [destBranchId, destSkuId]
            );
          }
        } else if (destSkuId) {
          await conn.execute(
            "INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity=quantity+?",
            [destBranchId, destSkuId, transfer.quantity || 1, transfer.quantity || 1]
          );
        }
        if (destSkuId) {
          try {
            await conn.execute(
              `INSERT INTO inventory_movements 
           (business_id, branch_id, sku_id, movement_type, quantity, unit_cost, reference_type, reference_id) 
           VALUES (?, ?, ?, 'transfer_in', ?, ?, 'device_transfers', ?)`,
              [destBusinessId, destBranchId, destSkuId, transfer.quantity || 1, transfer.cost_price || 0, transfer.id]
            );
          } catch (imErr) {
            console.warn("[PUT /api/transfers/:id/complete] Inventory movement warning:", imErr.message);
          }
        }
        try {
          await conn.execute("UPDATE device_transfers SET status='completed', completed_at=NOW() WHERE id=?", [transfer.id]);
        } catch (uErr) {
          if (uErr.message?.includes("Unknown column")) {
            await conn.execute("UPDATE device_transfers SET status='completed' WHERE id=?", [transfer.id]);
          } else {
            throw uErr;
          }
        }
        await conn.commit();
        res.json({ success: true, message: "Transfer received and inventory synchronized" });
      } catch (e) {
        await conn.rollback();
        console.error("[PUT /api/transfers/:id/complete] Error:", e.message);
        res.status(400).json({ error: e.message });
      } finally {
        conn.release();
      }
    });
    router8.put("/transfers/:id/cancel", async (req, res, next) => {
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
        const transfer = tr[0];
        if (!transfer) throw new Error("Transfer not found");
        if (transfer.status === "completed") throw new Error("Cannot cancel a completed transfer");
        if (transfer.status === "cancelled") throw new Error("Transfer is already cancelled");
        const isSuper = req.user.role === "superadmin" || req.user.role === "developer";
        if (!isSuper && Number(transfer.from_business_id) !== Number(req.user.business_id)) {
          return res.status(403).json({ error: "Access denied: Only the dispatching business can cancel this transfer." });
        }
        await conn.execute("UPDATE device_transfers SET status='cancelled' WHERE id=?", [transfer.id]);
        if (transfer.device_id) {
          await conn.execute("UPDATE devices SET status='in_stock' WHERE id=?", [transfer.device_id]);
          if (transfer.sku_id) {
            await conn.execute(
              "INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity=quantity+1",
              [transfer.from_branch_id, transfer.sku_id]
            );
          }
        } else if (transfer.sku_id) {
          await conn.execute(
            "INSERT INTO branch_stock (branch_id, sku_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)",
            [transfer.from_branch_id, transfer.sku_id, transfer.quantity || 1]
          );
        }
        await conn.commit();
        res.json({ success: true, message: "Transfer cancelled and stock restored to origin branch" });
      } catch (e) {
        await conn.rollback();
        next(e);
      } finally {
        conn.release();
      }
    });
    router8.get("/transfers/device/:imei", async (req, res, next) => {
      try {
        const q = req.params.imei;
        const device = await queryOne(
          "SELECT * FROM devices WHERE (imei=? OR imei_serial=?) AND business_id=?",
          [q, q, req.user.business_id]
        );
        if (!device) return res.status(404).json({ error: "No device found with this IMEI or Serial" });
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
    `, [device.id]);
        const currentBranch = await queryOne("SELECT b.*, bz.name as business_name FROM branches b JOIN businesses bz ON b.business_id=bz.id WHERE b.id=?", [device.branch_id]);
        res.json({ device, currentBranch, transfers });
      } catch (e) {
        next(e);
      }
    });
    router8.get("/repairs", async (req, res, next) => {
      try {
        const isSuper = req.user.role === "superadmin";
        const sql = `
      SELECT j.*, c.name as customer_name, c.phone as customer_phone FROM jobs j
      LEFT JOIN customers c ON j.customer_id=c.id
      WHERE j.business_id=? ${!isSuper ? "AND j.branch_id=?" : ""}
      ORDER BY j.created_at DESC
    `;
        const params = !isSuper ? [req.user.business_id, req.user.branch_id] : [req.user.business_id];
        res.json(await query(sql, params));
      } catch (e) {
        next(e);
      }
    });
    router8.get("/repairs/:id", async (req, res, next) => {
      try {
        const [rows] = await pool.execute(
          `SELECT j.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
       FROM jobs j LEFT JOIN customers c ON j.customer_id=c.id
       WHERE j.id=? AND j.business_id=?`,
          [req.params.id, req.user.business_id]
        );
        const job = rows[0];
        if (!job) return res.status(404).json({ error: "Repair job not found" });
        const searchNote1 = `%#${job.id}%`;
        const searchNote2 = `%Job ${job.id}%`;
        const invoices = await query(
          `SELECT DISTINCT i.id, i.invoice_number, i.grand_total, i.paid_amount, i.status, i.created_at,
              (SELECT GROUP_CONCAT(CONCAT(p.method, ': \u20AC', FORMAT(p.amount,2)) SEPARATOR ', ') FROM payments p WHERE p.invoice_id=i.id) as payment_summary
       FROM invoices i
       JOIN invoice_items ii ON ii.invoice_id=i.id
       WHERE i.business_id=? 
         AND (ii.notes LIKE ? OR ii.notes LIKE ? ${job.customer_id ? "OR (i.type='repair' AND i.customer_id=?)" : ""})
         AND i.grand_total > 0
       ORDER BY i.created_at DESC`,
          job.customer_id ? [req.user.business_id, searchNote1, searchNote2, job.customer_id] : [req.user.business_id, searchNote1, searchNote2]
        );
        res.json({ ...job, invoices });
      } catch (e) {
        next(e);
      }
    });
    createRepairSchema = z7.object({
      customer_id: z7.number().nullable().optional(),
      customer_name: z7.string().optional(),
      first_name: z7.string().optional(),
      last_name: z7.string().optional(),
      phone: z7.string().optional(),
      device_model: z7.string().optional(),
      issue: z7.string().optional(),
      status: z7.string().optional(),
      total_quote: z7.number().or(z7.string().transform(Number)).optional(),
      deposit_paid: z7.number().or(z7.string().transform(Number)).optional(),
      remaining_balance: z7.number().or(z7.string().transform(Number)).optional(),
      payment_method: z7.string().optional()
    });
    router8.post("/repairs", async (req, res, next) => {
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
        if (!finalCustomerId && phone) {
          const [existing] = await conn.execute(
            "SELECT id FROM customers WHERE phone = ? AND business_id = ? AND deleted_at IS NULL LIMIT 1",
            [phone, req.user.business_id]
          );
          if (existing.length > 0) {
            finalCustomerId = existing[0].id;
          } else {
            const combinedName = `${first_name || ""} ${last_name || ""}`.trim() || `Customer (${phone})`;
            const [newCust] = await conn.execute(
              "INSERT INTO customers (business_id, branch_id, name, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?)",
              [req.user.business_id, req.user.branch_id, combinedName, first_name || "", last_name || "", phone]
            );
            finalCustomerId = newCust.insertId;
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
            status || "new",
            total_quote || 0,
            deposit_paid || 0,
            remaining_balance || 0,
            payment_method || null
          ]
        );
        const jobId = r.insertId;
        if (finalCustomerId) {
          await conn.execute(
            "INSERT INTO customer_activity (customer_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
            [finalCustomerId, req.userId, "Repair Job Created", `New repair job for ${device_model}: ${issue}`]
          );
        }
        await conn.commit();
        res.json({ id: jobId, customer_id: finalCustomerId });
      } catch (e) {
        await conn.rollback();
        console.error("[POST /api/repairs] Error:", e.message);
        next(e);
      } finally {
        conn.release();
      }
    });
    updateRepairSchema = z7.object({
      status: z7.string().optional(),
      issue: z7.string().optional(),
      notes: z7.string().optional()
    });
    router8.put("/repairs/:id", async (req, res, next) => {
      const data = updateRepairSchema.parse(req.body);
      const { status, issue, notes } = data;
      const jobId = req.params.id;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [rows] = await conn.execute(
          "SELECT * FROM jobs WHERE id = ? AND business_id = ?",
          [jobId, req.user.business_id]
        );
        const job = rows[0];
        if (!job) throw new Error("Repair job not found or access denied.");
        const updates = [];
        const values = [];
        if (status) {
          updates.push("status = ?");
          values.push(status);
        }
        if (issue !== void 0) {
          updates.push("issue = ?");
          values.push(issue.trim());
        }
        if (notes && notes.trim()) {
          const timestamp = (/* @__PURE__ */ new Date()).toLocaleString("en-IE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });
          const newNote = `[${timestamp}] ${notes.trim()}`;
          const existingNotes = job.notes ? job.notes + "\n" + newNote : newNote;
          updates.push("notes = ?");
          values.push(existingNotes);
        }
        if (updates.length) {
          values.push(jobId, req.user.business_id);
          await conn.execute(
            `UPDATE jobs SET ${updates.join(", ")} WHERE id = ? AND business_id = ?`,
            values
          );
        }
        await conn.commit();
        res.json({ success: true });
      } catch (e) {
        await conn.rollback();
        console.error("[PUT /api/repairs/:id] Error:", e.message);
        next(e);
      } finally {
        conn.release();
      }
    });
    router8.get("/search", async (req, res, next) => {
      const q = req.query.q;
      const type = req.query.type;
      if (!q || q.length < 2) return res.json([]);
      try {
        const isSuper = req.user.role === "superadmin";
        if (type === "customers") {
          const sql = `SELECT * FROM customers WHERE (name LIKE ? OR phone LIKE ? OR email LIKE ?)
                    AND business_id=? ${!isSuper ? "AND branch_id=?" : ""} AND deleted_at IS NULL LIMIT 15`;
          const params = !isSuper ? [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id, req.user.branch_id] : [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id];
          return res.json(await query(sql, params));
        }
        const products = await query(`
      SELECT s.id, p.name as product_name, s.sku_code, s.barcode, 
             COALESCE(s.selling_price, p.base_unit_price, 0) as selling_price,
             p.product_type, p.allow_overselling,
             (SELECT SUM(quantity) FROM branch_stock WHERE sku_id=s.id ${!isSuper ? "AND branch_id=?" : ""}) as total_stock
      FROM product_skus s JOIN products p ON s.product_id=p.id
      WHERE (p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ?) AND p.business_id=? AND p.deleted_at IS NULL LIMIT 15
    `, !isSuper ? [req.user.branch_id, `%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id] : [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id]);
        const devices = await query(`
      SELECT s.id, p.name as product_name, s.sku_code, s.barcode, 
             COALESCE(d.selling_price, s.selling_price, p.base_unit_price, 0) as selling_price,
             p.product_type, p.allow_overselling, d.imei, d.id as device_id, 1 as total_stock
      FROM devices d JOIN product_skus s ON d.sku_id=s.id
      JOIN products p ON s.product_id=p.id
      WHERE (d.imei LIKE ? OR p.name LIKE ? OR s.sku_code LIKE ?) 
      AND d.business_id=? ${!isSuper ? "AND d.branch_id=?" : ""} 
      AND d.status='in_stock' 
      AND d.imei IS NOT NULL AND d.imei != ''
      LIMIT 15
    `, !isSuper ? [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id, req.user.branch_id] : [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id]);
        const results = [...devices];
        for (const p of products) {
          const normalizedType = (p.product_type || "").toLowerCase().trim();
          if (normalizedType === "serialized") continue;
          if (!results.some((r) => r.id === p.id)) {
            results.push(p);
          }
        }
        res.json(results);
      } catch (e) {
        next(e);
      }
    });
    inventory_default = router8;
  }
});

// server.ts
init_mysql();
init_auth();
import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv2 from "dotenv";
import fs from "fs";
import { ZodError } from "zod";
dotenv2.config();
function logError(message, error) {
  const entry = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${message}: ${error?.message}
${error?.stack}

`;
  fs.appendFileSync("server_errors.log", entry);
}
async function startServer() {
  try {
    await initSchema();
    await seedData();
    await ensureSuperAdmin();
  } catch (err) {
    console.error("[MySQL] Failed to initialise:", err.message);
    logError("MySQL init failed", err);
    process.exit(1);
  }
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(express.json({ limit: "10mb" }));
  const { default: authRouter, adminRouter: adminRouter2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
  const { default: publicRouter } = await Promise.resolve().then(() => (init_public(), public_exports));
  const { default: productsRouter } = await Promise.resolve().then(() => (init_products(), products_exports));
  const { default: customersRouter } = await Promise.resolve().then(() => (init_customers(), customers_exports));
  const { default: invoicesRouter } = await Promise.resolve().then(() => (init_invoices(), invoices_exports));
  const { default: reportsRouter } = await Promise.resolve().then(() => (init_reports(), reports_exports));
  const { default: settingsRouter } = await Promise.resolve().then(() => (init_settings(), settings_exports));
  const { default: inventoryRouter } = await Promise.resolve().then(() => (init_inventory(), inventory_exports));
  app.use("/api/auth", authRouter);
  app.use("/api/public", publicRouter);
  app.use("/api", requireAuthAsync);
  app.use("/api/admin", adminRouter2);
  app.use("/api/products", productsRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api", settingsRouter);
  app.use("/api", inventoryRouter);
  app.post("/api/import-products", requireAuthAsync, async (req, res, next) => {
    const { products } = req.body;
    const businessId = req.user.business_id;
    const { pool: pool2 } = await Promise.resolve().then(() => (init_mysql(), mysql_exports));
    const conn = await pool2.getConnection();
    try {
      await conn.beginTransaction();
      for (const p of products) {
        let categoryId = null;
        if (p.category_name) {
          const [cr] = await conn.execute("SELECT id FROM categories WHERE business_id=? AND name=?", [businessId, p.category_name]);
          if (cr.length) {
            categoryId = cr[0].id;
          } else {
            const [ins] = await conn.execute("INSERT INTO categories (business_id,name) VALUES (?,?)", [businessId, p.category_name]);
            categoryId = ins.insertId;
          }
        }
        let manufacturerId = null;
        if (p.manufacturer_name) {
          const [mr] = await conn.execute("SELECT id FROM manufacturers WHERE business_id=? AND name=?", [businessId, p.manufacturer_name]);
          if (mr.length) {
            manufacturerId = mr[0].id;
          } else {
            const [ins] = await conn.execute("INSERT INTO manufacturers (business_id,name) VALUES (?,?)", [businessId, p.manufacturer_name]);
            manufacturerId = ins.insertId;
          }
        }
        let productType = "stock";
        if (p.product_type === "Mobile Devices") productType = "serialized";
        else if (p.product_type === "Labor/Services") productType = "service";
        const [pr] = await conn.execute("SELECT id FROM products WHERE business_id=? AND name=?", [businessId, p.product_name]);
        let productId;
        if (pr.length) {
          productId = pr[0].id;
          await conn.execute(
            "UPDATE products SET category_id=?,manufacturer_id=?,product_type=?,allow_overselling=? WHERE id=?",
            [categoryId, manufacturerId, productType, p.allow_overselling === "Yes" ? 1 : 0, productId]
          );
        } else {
          const [ins] = await conn.execute(
            "INSERT INTO products (business_id,category_id,manufacturer_id,name,product_type,allow_overselling) VALUES (?,?,?,?,?,?)",
            [businessId, categoryId, manufacturerId, p.product_name, productType, p.allow_overselling === "Yes" ? 1 : 0]
          );
          productId = ins.insertId;
        }
        const [sr] = await conn.execute("SELECT id FROM product_skus WHERE product_id=? AND sku_code=?", [productId, p.sku]);
        let skuId;
        if (sr.length) {
          skuId = sr[0].id;
          await conn.execute(
            "UPDATE product_skus SET cost_price=?,selling_price=? WHERE id=?",
            [parseFloat(p.cost_price) || 0, parseFloat(p.selling_price) || 0, skuId]
          );
        } else {
          const [ins] = await conn.execute(
            "INSERT INTO product_skus (product_id,sku_code,cost_price,selling_price) VALUES (?,?,?,?)",
            [productId, p.sku, parseFloat(p.cost_price) || 0, parseFloat(p.selling_price) || 0]
          );
          skuId = ins.insertId;
        }
        const quantity = parseInt(p.current_inventory) || 0;
        await conn.execute(
          "INSERT INTO branch_stock (sku_id,branch_id,quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)",
          [skuId, req.user.branch_id, quantity]
        );
      }
      await conn.commit();
      res.json({ success: true });
    } catch (e) {
      await conn.rollback();
      next(e);
    } finally {
      conn.release();
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
  app.use((err, req, res, next) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Validation Error", details: err.errors || err.issues });
    }
    logError("Unhandled API Error", err);
    console.error("[Global Error Handler]", err);
    res.status(500).json({ error: "Internal Server Error" });
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u2713 Server running on port ${PORT}`);
  });
}
startServer().catch((err) => {
  logError("Server startup failed", err);
  console.error("Fatal startup error:", err);
  process.exit(1);
});
