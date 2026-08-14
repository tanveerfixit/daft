var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/mysql.ts
var mysql_exports = {};
__export(mysql_exports, {
  ensureSuperAdmin: () => ensureSuperAdmin,
  execute: () => execute,
  initSchema: () => initSchema,
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
async function initSchema() {
  const conn = await pool.getConnection();
  try {
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
    try {
      await conn.query("ALTER TABLE branches ADD COLUMN email VARCHAR(255) NULL AFTER name");
      console.log("[MySQL] Migration: added email to branches");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
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
    try {
      await conn.query("ALTER TABLE products ADD COLUMN sku_barcode VARCHAR(50) UNIQUE AFTER id");
      await conn.query("ALTER TABLE products ADD COLUMN base_unit_price DECIMAL(10, 2) DEFAULT 0.00 AFTER name");
      await conn.query("ALTER TABLE products ADD COLUMN cost_price DECIMAL(10, 2) DEFAULT 0.00 AFTER base_unit_price");
      await conn.query("ALTER TABLE products ADD COLUMN category VARCHAR(100) AFTER cost_price");
      console.log("[MySQL] Migration: added sku_barcode, price fields to products");
    } catch (e) {
      if (!e.message?.includes("Duplicate column")) throw e;
    }
    try {
      await conn.query("ALTER TABLE devices ADD COLUMN product_id INT AFTER id");
      await conn.query("ALTER TABLE devices ADD COLUMN imei_serial VARCHAR(50) UNIQUE AFTER product_id");
      await conn.query("ALTER TABLE devices ADD COLUMN date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER carrier");
      await conn.query("ALTER TABLE devices ADD CONSTRAINT fk_devices_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE");
      console.log("[MySQL] Migration: added product_id, imei_serial, date_added to devices");
    } catch (e) {
      if (!e.message?.includes("Duplicate column") && !e.message?.includes("Duplicate key")) throw e;
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
    console.log("[MySQL] Schema initialised successfully");
  } finally {
    conn.release();
  }
}
async function seedData() {
  const [existing] = await pool.execute("SELECT COUNT(*) as count FROM businesses");
  if (existing[0]?.count > 0) return;
  const conn = await pool.getConnection();
  try {
    console.log("[MySQL] Resetting database and seeding initial data...");
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    const tables = [
      "businesses",
      "branches",
      "users",
      "customers",
      "suppliers",
      "settings",
      "payment_methods",
      "smtp_settings",
      "invoices",
      "invoice_items",
      "products",
      "product_skus",
      "branch_stock",
      "devices",
      "inventory_movements",
      "jobs",
      "device_transfers"
    ];
    for (const table of tables) {
      try {
        await conn.query(`TRUNCATE TABLE ${table}`);
      } catch (e) {
      }
    }
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
        email: "technomore.irl@gmail.com",
        address: "6 Parnell St, Clonroad Beg, Ennis, Co. Clare, V95 X073",
        phone: "(065) 682 2900"
      },
      {
        name: "iPear in Tesco",
        email: "ipear.ennis@gmail.com",
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
var pool;
var init_mysql = __esm({
  "src/mysql.ts"() {
    dotenv.config();
    if (!process.env.DB_PASS) {
      throw new Error("[SECURITY FATAL] DB_PASS is not set in the .env file. Refusing to start with insecure credentials.");
    }
    pool = mysql.createPool({
      host: process.env.DB_HOST || "srv2113.hstgr.io",
      port: Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME || "u583652021_clare",
      user: process.env.DB_USER || "u583652021_clare_user",
      password: process.env.DB_PASS,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 2e4,
      decimalNumbers: true,
      timezone: "Z",
      enableKeepAlive: true,
      keepAliveInitialDelay: 1e4
    });
  }
});

// src/services/mailer.ts
import nodemailer from "nodemailer";
async function getTransporter() {
  const settings = await queryOne("SELECT * FROM smtp_settings WHERE business_id = 1");
  if (!settings || !settings.user || !settings.pass) {
    if (!process.env.SMTP_USER) throw new Error("SMTP not configured. Please set up email settings in Admin Portal.");
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== "false",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return nodemailer.createTransport({
    host: settings.host || "smtp.hostinger.com",
    port: settings.port || 465,
    secure: settings.secure === 1,
    auth: { user: settings.user, pass: settings.pass }
  });
}
async function getFromAddress() {
  const settings = await queryOne("SELECT * FROM smtp_settings WHERE business_id = 1");
  const name = settings?.from_name || process.env.SMTP_FROM_NAME || "iCover EPOS";
  const email = settings?.from_email || settings?.user || process.env.SMTP_USER || "noreply@example.com";
  return `"${name}" <${email}>`;
}
async function sendMail(to, subject, html) {
  const transporter = await getTransporter();
  const from = await getFromAddress();
  await transporter.sendMail({ from, to, subject, html });
}
async function sendAccountPending(user) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#2c3e50;">Hi ${user.name},</h2>
    <p>Your account has been created and is currently <strong>pending approval</strong> by an administrator.</p>
    <p>You will receive an email once your account has been reviewed.</p>
    <p style="color:#7f8c8d;font-size:13px;">If you did not request this account, please ignore this email.</p>
  </div>`;
  await sendMail(user.email, "Account Pending Approval", html);
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
var baseStyle;
var init_mailer = __esm({
  "src/services/mailer.ts"() {
    init_mysql();
    baseStyle = `font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:8px;`;
  }
});

// src/routes/auth.ts
var auth_exports = {};
__export(auth_exports, {
  adminRouter: () => adminRouter,
  default: () => auth_default,
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
    const user = await queryOne("SELECT * FROM users WHERE id=?", [decoded.userId]);
    if (!user) return res.status(401).json({ error: "User not found" });
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
    const user = await queryOne("SELECT * FROM users WHERE id=?", [decoded.userId]);
    if (!user || !["superadmin", "developer"].includes(user.role)) {
      return res.status(403).json({ error: "Admin access required" });
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
var JWT_SECRET, revokedTokens, userPasswordResets, _cleanup, router, signupSchema, loginSchema, resetPasswordSchema, adminRouter, auth_default;
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
    router = Router();
    signupSchema = z.object({
      mode: z.enum(["business_register", "staff_register"]).optional(),
      name: z.string().min(2, "Name must be at least 2 characters"),
      email: z.string().email("Invalid email address"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      business_name: z.string().optional(),
      branch_name: z.string().optional(),
      branch_id: z.number().optional()
    });
    router.post("/signup", async (req, res, next) => {
      const data = signupSchema.parse(req.body);
      const { mode, name, email, password, business_name, branch_name, branch_id } = data;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const existing = await queryOne("SELECT id FROM users WHERE email=?", [email]);
        if (existing) return res.status(409).json({ error: "An account with this email already exists" });
        const password_hash = await bcrypt.hash(password, 10);
        if (mode === "business_register") {
          if (!business_name || !branch_name) {
            return res.status(400).json({ error: "Business name and initial branch name are required" });
          }
          let slug = slugify(business_name);
          const [existingSlug] = await conn.execute("SELECT id FROM businesses WHERE slug = ?", [slug]);
          if (existingSlug.length > 0) {
            slug = `${slug}-${Math.floor(Math.random() * 1e3)}`;
          }
          const [biz] = await conn.execute("INSERT INTO businesses (name, slug, email, status) VALUES (?, ?, ?, ?)", [business_name, slug, email, "inactive"]);
          const businessId = biz.insertId;
          const [br] = await conn.execute("INSERT INTO branches (business_id, name) VALUES (?, ?)", [businessId, branch_name]);
          const branchId = br.insertId;
          await conn.execute(
            "INSERT INTO users (business_id, branch_id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'superadmin', 'approved')",
            [businessId, branchId, name, email, password_hash]
          );
          await conn.execute("INSERT INTO settings (business_id) VALUES (?)", [businessId]);
          const methods = ["Cash", "Card", "Other"];
          for (let i = 0; i < methods.length; i++) {
            await conn.execute("INSERT INTO payment_methods (business_id, name, display_order) VALUES (?, ?, ?)", [businessId, methods[i], i + 1]);
          }
          await conn.commit();
          return res.json({ success: true, message: "Business registered successfully! You can now log in." });
        } else {
          if (!branch_id) return res.status(400).json({ error: "Branch selection is required" });
          const branch = await queryOne("SELECT business_id FROM branches WHERE id=?", [branch_id]);
          if (!branch) return res.status(404).json({ error: "Selected branch not found" });
          const settings = await queryOne("SELECT allow_signup FROM settings WHERE business_id=?", [branch.business_id]);
          if (settings && settings.allow_signup === 0) {
            return res.status(403).json({ error: "Sign-up is currently disabled for this business." });
          }
          await conn.execute(
            "INSERT INTO users (business_id, branch_id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'staff', 'pending')",
            [branch.business_id, branch_id, name, email, password_hash]
          );
          await conn.commit();
          try {
            await sendAccountPending({ name, email });
          } catch {
          }
          res.json({ success: true, message: "Account created. Awaiting admin approval." });
        }
      } catch (e) {
        await conn.rollback();
        next(e);
      } finally {
        conn.release();
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
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
        await execute("UPDATE users SET last_login=NOW() WHERE id=?", [user.id]);
        const branch = await queryOne("SELECT * FROM branches WHERE id=?", [user.branch_id]);
        const business = await queryOne("SELECT name FROM businesses WHERE id=?", [user.business_id]);
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
        res.json(await query(`
      SELECT u.id,u.name,u.email,u.role,u.status,u.last_login,u.created_at,b.name as branch_name,b.id as branch_id
      FROM users u LEFT JOIN branches b ON u.branch_id=b.id
      WHERE u.business_id=? AND u.deleted_at IS NULL ORDER BY u.created_at DESC
    `, [req.user.business_id]));
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
        const user = await queryOne(
          "SELECT * FROM users WHERE id=? AND business_id=?",
          [req.params.id, req.user.business_id]
        );
        if (!user) return res.status(404).json({ error: "User not found or access denied" });
        if (user.email === "support@techinbox.ie" && status !== "approved") {
          return res.status(400).json({ error: "This developer account cannot be deactivated" });
        }
        await execute(
          "UPDATE users SET status=? WHERE id=? AND business_id=?",
          [status, req.params.id, req.user.business_id]
        );
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
      const { name, branch_id, role, password } = req.body;
      try {
        const existing = await queryOne(
          "SELECT id FROM users WHERE id=? AND business_id=?",
          [req.params.id, req.user.business_id]
        );
        if (!existing) return res.status(404).json({ error: "User not found or access denied" });
        if (password) {
          const password_hash = await bcrypt.hash(password, 10);
          await execute(
            "UPDATE users SET name=?,branch_id=?,role=?,password='',password_hash=? WHERE id=? AND business_id=?",
            [name, branch_id, role, password_hash, req.params.id, req.user.business_id]
          );
        } else {
          await execute(
            "UPDATE users SET name=?,branch_id=?,role=? WHERE id=? AND business_id=?",
            [name, branch_id, role, req.params.id, req.user.business_id]
          );
        }
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.delete("/users/:id", requireAdminAsync, async (req, res, next) => {
      try {
        const r = await execute(
          "UPDATE users SET deleted_at=NOW() WHERE id=? AND business_id=?",
          [req.params.id, req.user.business_id]
        );
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
        if (req.user.role === "developer") {
          res.json(await query(`
        SELECT b.*, biz.name as business_name 
        FROM branches b 
        JOIN businesses biz ON b.business_id = biz.id 
        WHERE b.deleted_at IS NULL
      `));
        } else {
          res.json(await query("SELECT * FROM branches WHERE business_id=? AND deleted_at IS NULL", [req.user.business_id]));
        }
      } catch (e) {
        next(e);
      }
    });
    adminRouter.post("/branches", requireAdminAsync, async (req, res, next) => {
      const { name, address, phone } = req.body;
      try {
        const r = await execute(
          "INSERT INTO branches (business_id,name,address,phone) VALUES (?,?,?,?)",
          [req.user.business_id, name, address, phone]
        );
        res.json({ id: r.insertId, name, address, phone });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.get("/smtp", requireAdminAsync, async (req, res, next) => {
      try {
        const s = await queryOne("SELECT * FROM smtp_settings WHERE business_id=?", [req.user.business_id]);
        if (s) {
          const { pass, ...safe } = s;
          res.json({ ...safe, pass: pass ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "" });
        } else {
          res.json({ host: "smtp.hostinger.com", port: 465, secure: 1, user: "", pass: "", from_name: "EPOS System", from_email: "" });
        }
      } catch (e) {
        next(e);
      }
    });
    adminRouter.put("/smtp", requireAdminAsync, async (req, res, next) => {
      const { host, port, secure, user, pass, from_name, from_email } = req.body;
      const businessId = req.user.business_id;
      try {
        const existing = await queryOne("SELECT id FROM smtp_settings WHERE business_id=?", [businessId]);
        if (existing) {
          if (pass && pass !== "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
            await execute(
              "UPDATE smtp_settings SET host=?,port=?,secure=?,`user`=?,pass=?,from_name=?,from_email=? WHERE business_id=?",
              [host, port, secure ? 1 : 0, user, pass, from_name, from_email, businessId]
            );
          } else {
            await execute(
              "UPDATE smtp_settings SET host=?,port=?,secure=?,`user`=?,from_name=?,from_email=? WHERE business_id=?",
              [host, port, secure ? 1 : 0, user, from_name, from_email, businessId]
            );
          }
        } else {
          await execute(
            "INSERT INTO smtp_settings (business_id,host,port,secure,`user`,pass,from_name,from_email) VALUES (?,?,?,?,?,?,?,?)",
            [businessId, host, port, secure ? 1 : 0, user, pass, from_name, from_email]
          );
        }
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.post("/smtp/test", requireAdminAsync, async (req, res, next) => {
      try {
        const admin = await queryOne("SELECT email FROM users WHERE id=?", [req.userId]);
        await sendTestEmail(admin.email);
        res.json({ success: true, message: `Test email sent to ${admin.email}` });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.get("/system/businesses", requireAuthAsync, async (req, res, next) => {
      if (req.user.role !== "developer") {
        return res.status(403).json({ error: "Developer access required" });
      }
      try {
        res.json(await query("SELECT * FROM businesses WHERE deleted_at IS NULL ORDER BY created_at DESC"));
      } catch (e) {
        next(e);
      }
    });
    adminRouter.put("/system/businesses/:id", requireAuthAsync, async (req, res, next) => {
      if (req.user.role !== "developer") {
        return res.status(403).json({ error: "Developer access required" });
      }
      const { name, slug, email, phone, address, city, state, zip_code, country } = req.body;
      try {
        let finalSlug = slug;
        if (!finalSlug) {
          finalSlug = slugify(name);
          const [existingSlug] = await pool.execute("SELECT id FROM businesses WHERE slug = ? AND id != ?", [finalSlug, req.params.id]);
          if (existingSlug.length > 0) {
            finalSlug = `${finalSlug}-${Math.floor(Math.random() * 1e3)}`;
          }
        }
        await execute(
          "UPDATE businesses SET name=?,slug=?,email=?,phone=?,address=?,city=?,state=?,zip_code=?,country=? WHERE id=?",
          [name, finalSlug, email, phone, address, city, state, zip_code, country, req.params.id]
        );
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    });
    adminRouter.put("/system/businesses/:id/status", requireAuthAsync, async (req, res, next) => {
      if (req.user.role !== "developer") {
        return res.status(403).json({ error: "Developer access required" });
      }
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
      WHERE (s.id = ? OR p.id = ?) AND p.business_id = ?
    `, [req.params.id, req.params.id, businessId]);
        if (!product) return res.status(404).json({ error: "Product not found" });
        const stock = await query(`
      SELECT b.name as branch_name, b.id as branch_id, COALESCE(bs.quantity,0) as quantity
      FROM branches b
      LEFT JOIN branch_stock bs ON b.id = bs.branch_id AND bs.sku_id = ?
      WHERE b.business_id = ?
    `, [product.id, businessId]);
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
        const [skuRows] = await conn.execute("SELECT s.*, p.business_id FROM product_skus s JOIN products p ON s.product_id = p.id WHERE (s.id = ? OR p.id = ?) AND p.business_id = ?", [skuId, skuId, businessId]);
        const sku = skuRows[0];
        if (!sku) throw new Error("Product not found in your business catalog");
        await conn.execute(
          "UPDATE product_skus SET sku_code=?,barcode=?,selling_price=?,cost_price=? WHERE id=?",
          [sku_code, barcode, selling_price, cost_price, sku.id]
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
          [sku.id, req.userId, "Product Updated", detailMsg]
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
      allow_overselling: z2.boolean().optional()
    });
    router3.post("/", async (req, res, next) => {
      const data = createProductSchema.parse(req.body);
      const { name, category_id, manufacturer_id, selling_price, cost_price, product_type, sku_code, barcode, allow_overselling } = data;
      const businessId = req.user.business_id;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [pr] = await conn.execute(
          "INSERT INTO products (business_id,name,category_id,manufacturer_id,product_type,allow_overselling) VALUES (?,?,?,?,?,?)",
          [businessId, name, category_id, manufacturer_id, product_type, allow_overselling === false ? 0 : 1]
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
          [skuId, req.userId, "Product Created", `Product "${name}" created with SKU ${finalSku}`]
        );
        await conn.commit();
        res.json({ id: skuId });
      } catch (e) {
        await conn.rollback();
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
      const stockQty = parseInt(quantity) || 0;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
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
    router5.get("/", async (req, res, next) => {
      try {
        const { startDate, endDate } = req.query;
        const isDeveloper = req.user.role === "developer";
        const branchId = req.user.branch_id;
        let sql = `
      SELECT i.*, c.name as customer_name FROM invoices i
      LEFT JOIN customers c ON i.customer_id=c.id
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
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM invoices i LEFT JOIN customers c ON i.customer_id=c.id 
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
      discount_total: z4.number().or(z4.string().transform(Number)),
      grand_total: z4.number().or(z4.string().transform(Number)),
      items: z4.array(z4.object({
        id: z4.number().optional(),
        sku_id: z4.number().optional(),
        device_id: z4.number().nullable().optional(),
        quantity: z4.number().or(z4.string().transform(Number)),
        price: z4.number().or(z4.string().transform(Number)),
        total: z4.number().or(z4.string().transform(Number)),
        is_deposit: z4.boolean().optional()
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
      const { customer_id, items, subtotal, tax_total, discount_total, grand_total, payments, activities } = data;
      if (!items || !items.length) return res.status(400).json({ error: "Cart is empty" });
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const skuIds = items.map((i) => i.id || i.sku_id).filter(Boolean);
        let productInfoMap = /* @__PURE__ */ new Map();
        if (skuIds.length > 0) {
          const [allProductInfo] = await conn.query(`
        SELECT s.id as sku_id, p.product_type, p.allow_overselling
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
        const prefix = isDeposit ? "DE" : "SA";
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
        const totalPaid = (payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const dueAmount = Math.max(0, (parseFloat(grand_total) || 0) - totalPaid);
        let status = "paid";
        if (dueAmount > 0.01) status = totalPaid > 0 ? "partial" : "credit";
        const [invR] = await conn.execute(
          "INSERT INTO invoices (business_id,branch_id,user_id,customer_id,invoice_number,subtotal,tax_total,discount_total,grand_total,paid_amount,due_amount,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          [req.user.business_id, req.user.branch_id, req.userId, finalCustomerId, invoiceNumber, subtotal, tax_total, discount_total, grand_total, totalPaid, dueAmount, status]
        );
        const invoiceId = invR.insertId;
        for (const item of items) {
          const skuId = item.id || item.sku_id;
          const productInfo = productInfoMap.get(skuId);
          await conn.execute(
            "INSERT INTO invoice_items (invoice_id,sku_id,device_id,quantity,price,total) VALUES (?,?,?,?,?,?)",
            [invoiceId, skuId, item.device_id || null, item.quantity, item.price, item.total]
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
            await conn.execute("UPDATE customers SET wallet_balance=wallet_balance+? WHERE id=?", [item.total, finalCustomerId]);
            await conn.execute(
              "INSERT INTO payments (customer_id,invoice_id,type,method,amount) VALUES (?,?,?,?,?)",
              [finalCustomerId, invoiceId, "deposit", "Store Deposit", item.total]
            );
          }
        }
        for (const p of payments || []) {
          const type = p.method === "Store Credit" || p.method === "Wallet" ? "wallet_use" : "sale_payment";
          await conn.execute(
            "INSERT INTO payments (customer_id,invoice_id,type,method,amount) VALUES (?,?,?,?,?)",
            [finalCustomerId, invoiceId, type, p.method, p.amount]
          );
          if (type === "wallet_use") {
            await conn.execute("UPDATE customers SET wallet_balance=wallet_balance-? WHERE id=?", [p.amount, finalCustomerId]);
          }
        }
        const logDetails = `Invoice ${invoiceNumber} created for \u20AC${(parseFloat(grand_total) || 0).toFixed(2)}`;
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
      const { method } = req.body;
      const conn = await pool.getConnection();
      try {
        const isDeveloper = req.user.role === "developer";
        const branchId = req.user.branch_id;
        const checkSql = `SELECT * FROM invoices WHERE id=? AND business_id=? ${!isDeveloper && branchId ? "AND branch_id=?" : ""}`;
        const checkParams = !isDeveloper && branchId ? [req.params.id, req.user.business_id, branchId] : [req.params.id, req.user.business_id];
        const [invRows] = await conn.execute(checkSql, checkParams);
        const invoice = invRows[0];
        if (!invoice) throw new Error("Invoice not found or access denied");
        if (invoice.status === "void") throw new Error("Invoice already refunded");
        await conn.execute("UPDATE invoices SET status='void' WHERE id=?", [req.params.id]);
        await conn.execute(
          "INSERT INTO payments (invoice_id,method,amount) VALUES (?,?,?)",
          [req.params.id, `Refund (${method})`, -invoice.grand_total]
        );
        const [itemRows] = await conn.execute("SELECT * FROM invoice_items WHERE invoice_id=?", [req.params.id]);
        for (const item of itemRows) {
          await conn.execute(`
        INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,?)
        ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)
      `, [invoice.branch_id, item.sku_id, item.quantity]);
          if (item.device_id) await conn.execute("UPDATE devices SET status='in_stock' WHERE id=?", [item.device_id]);
        }
        await conn.execute(
          "INSERT INTO invoice_activity (invoice_id,user_id,activity,details) VALUES (?,?,?,?)",
          [req.params.id, req.userId, "Refund Created", `Refund issued via ${method} for \u20AC${invoice.grand_total.toFixed(2)}`]
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
    router5.put("/payments/:id", async (req, res, next) => {
      try {
        const r = await execute(
          "UPDATE payments p JOIN invoices i ON p.invoice_id=i.id SET p.method=? WHERE p.id=? AND i.business_id=?",
          [req.body.method, req.params.id, req.user.business_id]
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
        const isSuper = req.user.role === "superadmin";
        const branchId = req.user.branch_id;
        const invoicePayments = await query(`
      SELECT p.*, u.name as user_name, i.invoice_number, c.name as customer_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id=i.id
      LEFT JOIN users u ON i.user_id=u.id
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND i.business_id=? 
      ${!isSuper ? "AND i.branch_id=?" : ""}
    `, !isSuper ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);
        const otherMovements = await query(`
      SELECT p.*, 'System' as user_name, c.name as customer_name 
      FROM payments p
      LEFT JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND p.invoice_id IS NULL AND c.business_id=?
      ${!isSuper ? "AND c.branch_id=?" : ""}
    `, !isSuper ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);
        const summary = await query(`
      SELECT method, type, SUM(amount) as total FROM payments p
      JOIN customers c ON p.customer_id=c.id
      WHERE DATE(p.paid_at)=? AND c.business_id=? ${!isSuper ? "AND c.branch_id=?" : ""}
      GROUP BY method, type
    `, !isSuper ? [date, req.user.business_id, branchId] : [date, req.user.business_id]);
        res.json({ invoicePayments, otherMovements, summary, date });
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
        const [r] = await conn.execute(
          `
      INSERT INTO closing_reports
        (business_id,branch_id,user_id,report_date,starting_balance,cash_counted,calculated_cash,difference,
         total_sales,total_deposits,total_cash_in_drawer,comments)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            req.user.business_id,
            req.user.branch_id,
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
        const reportId = r.insertId;
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
      timezone: z6.string().optional(),
      date_format: z6.string().optional(),
      time_format: z6.string().optional(),
      language: z6.string().optional()
    });
    router7.post("/settings", async (req, res, next) => {
      const data = settingsSchema.parse(req.body);
      const { timezone, date_format, time_format, language } = data;
      try {
        await execute(
          "UPDATE settings SET timezone=?,date_format=?,time_format=?,language=? WHERE business_id=?",
          [timezone, date_format, time_format, language, req.user.business_id]
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
        const branchId = req.user?.branch_id;
        let s = await queryOne("SELECT * FROM printer_settings WHERE business_id=? AND branch_id=?", [req.user.business_id, branchId]);
        if (!s) {
          await execute("INSERT INTO printer_settings (business_id,branch_id) VALUES (?,?)", [req.user.business_id, branchId]);
          s = await queryOne("SELECT * FROM printer_settings WHERE business_id=? AND branch_id=?", [req.user.business_id, branchId]);
        }
        res.json(s);
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
      font_size: z6.string().or(z6.number().transform(String)).optional(),
      font_family: z6.string().optional()
    });
    router7.post("/printer-settings", async (req, res, next) => {
      const branchId = req.user?.branch_id;
      const data = printerSettingsSchema.parse(req.body);
      const { label_size, barcode_length, margin_top, margin_left, margin_bottom, margin_right, orientation, font_size, font_family } = data;
      try {
        const existing = await queryOne("SELECT id FROM printer_settings WHERE business_id=? AND branch_id=?", [req.user.business_id, branchId]);
        if (existing) {
          await execute(
            "UPDATE printer_settings SET label_size=?,barcode_length=?,margin_top=?,margin_left=?,margin_bottom=?,margin_right=?,orientation=?,font_size=?,font_family=? WHERE business_id=? AND branch_id=?",
            [label_size, barcode_length, margin_top, margin_left, margin_bottom, margin_right, orientation, font_size, font_family, req.user.business_id, branchId]
          );
        } else {
          await execute(
            "INSERT INTO printer_settings (business_id,branch_id,label_size,barcode_length,margin_top,margin_left,margin_bottom,margin_right,orientation,font_size,font_family) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
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
        const totalAmount = (cost_price || 0) * (quantity || (items?.length || 0));
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
            quantity || items?.length || 0,
            quantity || items?.length || 0,
            cost_price || 0,
            totalAmount
          ]
        );
        if (productInfo.product_type === "serialized") {
          for (const item of items) {
            await conn.execute(
              "INSERT INTO devices (business_id,branch_id,sku_id,imei,cost_price,selling_price,color,gb,`condition`,po_number,status) VALUES (?,?,?,?,?,?,?,?,?,?,'in_stock')",
              [req.user.business_id, activeBranchId, sku_id, item.imei, cost_price, selling_price, item.color, item.gb, item.condition, finalPoNumber]
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
    router8.get("/devices/search", async (req, res, next) => {
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
        const params = [req.user.business_id];
        if (searchVal && String(searchVal).trim() !== "") {
          sql += " AND (d.imei LIKE ? OR p.name LIKE ? OR s.sku_code LIKE ?)";
          const term = `%${String(searchVal).trim()}%`;
          params.push(term, term, term);
        }
        if (branch_id && String(branch_id).trim() !== "" && String(branch_id) !== "undefined") {
          sql += " AND d.branch_id=?";
          params.push(parseInt(branch_id));
        }
        sql += " LIMIT 20";
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
      color: z7.string().optional(),
      gb: z7.string().optional(),
      ram: z7.string().optional(),
      condition: z7.string().optional(),
      cost_price: z7.number().or(z7.string().transform(Number)).optional(),
      selling_price: z7.number().or(z7.string().transform(Number)).optional(),
      unlocked: z7.string().or(z7.boolean().transform((b) => b ? "Yes" : "No")).or(z7.number().transform((n) => n ? "Yes" : "No")).optional(),
      imei_status: z7.string().optional(),
      carrier: z7.string().optional()
    });
    router8.put("/devices/:id", async (req, res, next) => {
      try {
        const data = updateDeviceSchema.parse(req.body);
        const { color, gb, ram, condition, cost_price, selling_price, unlocked, imei_status, carrier } = data;
        const old = await queryOne("SELECT * FROM devices WHERE id=? AND business_id=?", [req.params.id, req.user.business_id]);
        if (!old) return res.status(404).json({ error: "Device not found" });
        await execute(`
      UPDATE devices SET 
        color=?, gb=?, ram=?, \`condition\`=?, cost_price=?, selling_price=?, 
        unlocked=?, imei_status=?, carrier=?
      WHERE id=? AND business_id=?
    `, [
          color || old.color,
          gb || old.gb,
          ram || old.ram,
          condition || old.condition,
          cost_price || old.cost_price,
          selling_price || old.selling_price,
          unlocked || old.unlocked,
          imei_status || old.imei_status,
          carrier || old.carrier,
          req.params.id,
          req.user.business_id
        ]);
        const changes = [];
        if (color && color !== old.color) changes.push(`Color: ${old.color} -> ${color}`);
        if (gb && gb !== old.gb) changes.push(`GB: ${old.gb} -> ${gb}`);
        if (ram && ram !== old.ram) changes.push(`RAM: ${old.ram} -> ${ram}`);
        if (condition && condition !== old.condition) changes.push(`Condition: ${old.condition} -> ${condition}`);
        if (cost_price && cost_price != old.cost_price) changes.push(`Cost: ${old.cost_price} -> ${cost_price}`);
        if (selling_price && selling_price != old.selling_price) changes.push(`Selling: ${old.selling_price} -> ${selling_price}`);
        if (changes.length > 0) {
          await execute(
            "INSERT INTO device_activity (device_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
            [req.params.id, req.userId, "Device Updated", changes.join(", ")]
          );
          await execute(
            "INSERT INTO activity_logs (device_id, user_id, activity_type, description) VALUES (?, ?, ?, ?)",
            [req.params.id, req.userId, "Device Updated", changes.join(", ")]
          );
        }
        res.json({ success: true });
      } catch (e) {
        next(e);
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
      SELECT d.id, d.sku_id, d.imei, d.color, d.gb, d.ram, d.selling_price, d.cost_price, d.\`condition\`, d.po_number, d.status, d.created_at,
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
    transferSchema = z7.object({
      device_id: z7.number().optional(),
      sku_id: z7.number().optional(),
      quantity: z7.number().or(z7.string().transform(Number)).optional(),
      to_branch_id: z7.number().or(z7.string().transform(Number)),
      notes: z7.string().optional()
    });
    router8.post("/transfers", async (req, res, next) => {
      const data = transferSchema.parse(req.body);
      const { device_id, sku_id, quantity, to_branch_id, notes } = data;
      if (!to_branch_id) return res.status(400).json({ error: "Destination branch is required" });
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        let from_branch_id;
        if (device_id) {
          const [dr] = await conn.execute("SELECT * FROM devices WHERE id=? AND business_id=?", [device_id, req.user.business_id]);
          const device = dr[0];
          if (!device) throw new Error("Device not found or access denied");
          if (device.status !== "in_stock") throw new Error("Device is not available for transfer");
          from_branch_id = device.branch_id;
          await conn.execute("UPDATE devices SET status='transfer' WHERE id=?", [device_id]);
        } else {
          const [sr] = await conn.execute("SELECT * FROM branch_stock WHERE sku_id=? AND quantity>=? AND branch_id=?", [sku_id, quantity || 1, req.user.branch_id]);
          const stock = sr[0];
          if (!stock) throw new Error("Insufficient stock for transfer in your branch");
          from_branch_id = stock.branch_id;
        }
        if (String(from_branch_id) === String(to_branch_id)) throw new Error("Source and destination branches must be different");
        const [tr] = await conn.execute(
          "INSERT INTO device_transfers (business_id,from_branch_id,to_branch_id,device_id,sku_id,quantity,status,initiated_by,notes) VALUES (?,?,?,?,?,?,'in_transit',?,?)",
          [req.user.business_id, from_branch_id, to_branch_id, device_id || null, sku_id || null, quantity || 1, req.userId, notes || null]
        );
        await conn.commit();
        res.json({ success: true, id: tr.insertId });
      } catch (e) {
        await conn.rollback();
        res.status(400).json({ error: e.message });
      } finally {
        conn.release();
      }
    });
    router8.get("/transfers", async (req, res, next) => {
      try {
        const isSuper = req.user.role === "superadmin";
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
      WHERE t.business_id=? ${!isSuper ? "AND (t.from_branch_id=? OR t.to_branch_id=?)" : ""}
      ORDER BY t.created_at DESC
    `;
        const params = !isSuper ? [req.user.business_id, req.user.branch_id, req.user.branch_id] : [req.user.business_id];
        res.json(await query(sql, params));
      } catch (e) {
        next(e);
      }
    });
    router8.put("/transfers/:id/complete", async (req, res, next) => {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [tr] = await conn.execute("SELECT * FROM device_transfers WHERE id=? AND business_id=?", [req.params.id, req.user.business_id]);
        const transfer = tr[0];
        if (!transfer) throw new Error("Transfer not found or access denied");
        if (transfer.status === "completed") throw new Error("Transfer already completed");
        await conn.execute("UPDATE device_transfers SET status='completed',completed_at=NOW() WHERE id=?", [transfer.id]);
        if (transfer.device_id) {
          await conn.execute("UPDATE devices SET branch_id=?,status='in_stock' WHERE id=?", [transfer.to_branch_id, transfer.device_id]);
          const [dr] = await conn.execute("SELECT sku_id FROM devices WHERE id=?", [transfer.device_id]);
          const dsku = dr[0]?.sku_id;
          await conn.execute("INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,-1) ON DUPLICATE KEY UPDATE quantity=quantity-1", [transfer.from_branch_id, dsku]);
          await conn.execute("INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,1) ON DUPLICATE KEY UPDATE quantity=quantity+1", [transfer.to_branch_id, dsku]);
        } else if (transfer.sku_id) {
          await conn.execute("INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,-?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)", [transfer.from_branch_id, transfer.sku_id, transfer.quantity]);
          await conn.execute("INSERT INTO branch_stock (branch_id,sku_id,quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)", [transfer.to_branch_id, transfer.sku_id, transfer.quantity]);
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
    router8.put("/transfers/:id/cancel", async (req, res, next) => {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [tr] = await conn.execute("SELECT * FROM device_transfers WHERE id=? AND business_id=?", [req.params.id, req.user.business_id]);
        const transfer = tr[0];
        if (!transfer) throw new Error("Transfer not found or access denied");
        if (transfer.status === "completed") throw new Error("Cannot cancel a completed transfer");
        await conn.execute("UPDATE device_transfers SET status='cancelled' WHERE id=?", [transfer.id]);
        if (transfer.device_id) await conn.execute("UPDATE devices SET status='in_stock' WHERE id=?", [transfer.device_id]);
        await conn.commit();
        res.json({ success: true });
      } catch (e) {
        await conn.rollback();
        next(e);
      } finally {
        conn.release();
      }
    });
    router8.get("/transfers/device/:imei", async (req, res, next) => {
      try {
        const device = await queryOne("SELECT * FROM devices WHERE imei=? AND business_id=?", [req.params.imei, req.user.business_id]);
        if (!device) return res.status(404).json({ error: "No device found with this IMEI" });
        const transfers = await query(`
      SELECT t.*, fb.name as from_branch_name, tb.name as to_branch_name, u.name as initiated_by_name
      FROM device_transfers t
      LEFT JOIN branches fb ON t.from_branch_id=fb.id
      LEFT JOIN branches tb ON t.to_branch_id=tb.id
      LEFT JOIN users u ON t.initiated_by=u.id
      WHERE t.device_id=? ORDER BY t.created_at DESC
    `, [device.id]);
        const currentBranch = await queryOne("SELECT * FROM branches WHERE id=?", [device.branch_id]);
        res.json({ device, currentBranch, transfers });
      } catch (e) {
        next(e);
      }
    });
    router8.get("/repairs", async (req, res, next) => {
      try {
        const isSuper = req.user.role === "superadmin";
        const sql = `
      SELECT j.*, c.name as customer_name FROM jobs j
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
            const combinedName = `${first_name || ""} ${last_name || ""}`.trim();
            if (!combinedName) {
              throw new Error("Customer first name is required for new repair jobs.");
            }
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
          if (Number(deposit_paid) > 0) {
            const [lastRE] = await conn.execute(
              "SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'RE-%' AND business_id=? ORDER BY id DESC LIMIT 1",
              [req.user.business_id]
            );
            let nextRENum = 1;
            if (lastRE.length > 0) {
              const lastNum = parseInt(lastRE[0].invoice_number.split("-")[1]);
              if (!isNaN(lastNum)) nextRENum = lastNum + 1;
            }
            const invoiceNumber = `RE-${String(nextRENum).padStart(3, "0")}`;
            const [invResult] = await conn.execute(
              `INSERT INTO invoices 
            (business_id, branch_id, user_id, customer_id, invoice_number, type, 
             subtotal, tax_total, discount_total, grand_total, paid_amount, due_amount, status)
           VALUES (?, ?, ?, ?, ?, 'repair', ?, 0, 0, ?, ?, 0, 'paid')`,
              [
                req.user.business_id,
                req.user.branch_id,
                req.userId,
                finalCustomerId || null,
                invoiceNumber,
                deposit_paid,
                deposit_paid,
                deposit_paid
              ]
            );
            const invoiceId = invResult.insertId;
            await conn.execute(
              "INSERT INTO payments (customer_id, invoice_id, type, method, amount) VALUES (?, ?, ?, ?, ?)",
              [finalCustomerId, invoiceId, "deposit", payment_method || "Cash", deposit_paid]
            );
            await conn.execute(
              "INSERT INTO customer_activity (customer_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
              [
                finalCustomerId,
                req.userId,
                "Repair Deposit Received",
                `Deposit of \u20AC${Number(deposit_paid).toFixed(2)} received for job #${jobId}. Invoice: ${invoiceNumber}`
              ]
            );
          }
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
      notes: z7.string().optional(),
      collected_amount: z7.number().or(z7.string().transform(Number)).optional(),
      collected_method: z7.string().optional()
    });
    router8.put("/repairs/:id", async (req, res, next) => {
      const data = updateRepairSchema.parse(req.body);
      const { status, notes, collected_amount, collected_method } = data;
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
        const collected = parseFloat(collected_amount) || 0;
        let invoiceNumber = null;
        if (collected > 0) {
          const newRemaining = Math.max(0, (job.remaining_balance || 0) - collected);
          const newDeposit = (job.deposit_paid || 0) + collected;
          updates.push("remaining_balance = ?", "deposit_paid = ?");
          values.push(newRemaining, newDeposit);
          const [lastRE] = await conn.execute(
            "SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'RE-%' AND business_id=? ORDER BY id DESC LIMIT 1",
            [req.user.business_id]
          );
          let nextRENum = 1;
          if (lastRE.length > 0) {
            const lastNum = parseInt(lastRE[0].invoice_number.split("-")[1]);
            if (!isNaN(lastNum)) nextRENum = lastNum + 1;
          }
          invoiceNumber = `RE-${String(nextRENum).padStart(3, "0")}`;
          const [invResult] = await conn.execute(
            `INSERT INTO invoices 
          (business_id, branch_id, user_id, customer_id, invoice_number, type, 
           subtotal, tax_total, discount_total, grand_total, paid_amount, due_amount, status)
         VALUES (?, ?, ?, ?, ?, 'repair', ?, 0, 0, ?, ?, 0, 'paid')`,
            [
              req.user.business_id,
              req.user.branch_id,
              req.userId,
              job.customer_id || null,
              invoiceNumber,
              collected,
              collected,
              collected
            ]
          );
          const invoiceId = invResult.insertId;
          if (job.customer_id) {
            await conn.execute(
              "INSERT INTO payments (customer_id, invoice_id, type, method, amount) VALUES (?, ?, ?, ?, ?)",
              [job.customer_id, invoiceId, "repair_payment", collected_method || "Cash", collected]
            );
            await conn.execute(
              "INSERT INTO customer_activity (customer_id, user_id, activity, details) VALUES (?, ?, ?, ?)",
              [
                job.customer_id,
                req.userId,
                "Repair Payment Received",
                `\u20AC${collected.toFixed(2)} received for job #${jobId} (${job.device_model}). Invoice: ${invoiceNumber}`
              ]
            );
          }
        }
        if (updates.length) {
          values.push(jobId, req.user.business_id);
          await conn.execute(
            `UPDATE jobs SET ${updates.join(", ")} WHERE id = ? AND business_id = ?`,
            values
          );
        }
        await conn.commit();
        res.json({ success: true, invoice_number: invoiceNumber });
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
      SELECT s.id, p.name as product_name, s.sku_code, s.barcode, s.selling_price,
             p.product_type, p.allow_overselling,
             (SELECT SUM(quantity) FROM branch_stock WHERE sku_id=s.id ${!isSuper ? "AND branch_id=?" : ""}) as total_stock
      FROM product_skus s JOIN products p ON s.product_id=p.id
      WHERE (p.name LIKE ? OR s.sku_code LIKE ? OR s.barcode LIKE ?) AND p.business_id=? AND p.deleted_at IS NULL LIMIT 15
    `, !isSuper ? [req.user.branch_id, `%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id] : [`%${q}%`, `%${q}%`, `%${q}%`, req.user.business_id]);
        const devices = await query(`
      SELECT s.id, p.name as product_name, s.sku_code, s.barcode, s.selling_price,
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
  const PORT = process.env.PORT || 3e3;
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
      return res.status(400).json({ error: "Validation Error", details: err.errors });
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
