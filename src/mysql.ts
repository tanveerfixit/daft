import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// SECURITY: Credentials must come from environment variables (FINDING-001)
if (!process.env.DB_PASS) {
  throw new Error('[SECURITY FATAL] DB_PASS is not set in the .env file. Refusing to start with insecure credentials.');
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'srv2113.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'u583652021_clare',
  user: process.env.DB_USER || 'u583652021_clare_user',
  password: process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000,
  decimalNumbers: true,
  timezone: 'Z',
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});


// Convenience wrapper
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

// ─── Schema Initialisation ───────────────────────────────────────────────────

export async function initSchema() {
  const conn = await pool.getConnection();
  try {
    // Disable FK checks during setup
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

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

    // Migration: add slug to businesses if missing
    try {
      await conn.query('ALTER TABLE businesses ADD COLUMN slug VARCHAR(255) UNIQUE AFTER name');
      console.log('[MySQL] Migration: added slug to businesses');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
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
        currency VARCHAR(100) DEFAULT '€, Euro',
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

    // Migration: add show_powered_by to thermal_printer_settings if missing
    try {
      await conn.query('ALTER TABLE thermal_printer_settings ADD COLUMN show_powered_by TINYINT(1) DEFAULT 1 AFTER show_footer');
      console.log('[MySQL] Migration: added show_powered_by to thermal_printer_settings');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
    }

    // Migration: add EOD customization columns to thermal_printer_settings if missing
    try {
      await conn.query('ALTER TABLE thermal_printer_settings ADD COLUMN eod_show_cash_summary TINYINT(1) DEFAULT 1 AFTER show_powered_by');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
    }
    try {
      await conn.query('ALTER TABLE thermal_printer_settings ADD COLUMN eod_show_payment_type TINYINT(1) DEFAULT 1 AFTER eod_show_cash_summary');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
    }
    try {
      await conn.query('ALTER TABLE thermal_printer_settings ADD COLUMN eod_show_total_cash TINYINT(1) DEFAULT 1 AFTER eod_show_payment_type');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
    }
    try {
      await conn.query('ALTER TABLE thermal_printer_settings ADD COLUMN eod_show_total_card_sale TINYINT(1) DEFAULT 1 AFTER eod_show_total_cash');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
    }
    try {
      await conn.query('ALTER TABLE thermal_printer_settings ADD COLUMN eod_show_total TINYINT(1) DEFAULT 1 AFTER eod_show_total_card_sale');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
    }
    try {
      await conn.query('ALTER TABLE thermal_printer_settings ADD COLUMN eod_footer_type VARCHAR(50) DEFAULT \'branch\' AFTER eod_show_total');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
    }
    try {
      await conn.query('ALTER TABLE thermal_printer_settings ADD COLUMN eod_footer_custom_text TEXT AFTER eod_footer_type');
      console.log('[MySQL] Migration: added EOD customization columns to thermal_printer_settings');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
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

    // Migration: add business_id to closing_reports if missing (FINDING-016)
    try {
      await conn.query('ALTER TABLE closing_reports ADD COLUMN business_id INT NOT NULL DEFAULT 0 AFTER id');
      console.log('[MySQL] Migration: added business_id to closing_reports');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
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

    // Migration: add financial fields to jobs if missing
    try {
      await conn.query('ALTER TABLE jobs ADD COLUMN total_quote DECIMAL(10,2) DEFAULT 0 AFTER status');
      await conn.query('ALTER TABLE jobs ADD COLUMN deposit_paid DECIMAL(10,2) DEFAULT 0 AFTER total_quote');
      await conn.query('ALTER TABLE jobs ADD COLUMN remaining_balance DECIMAL(10,2) DEFAULT 0 AFTER deposit_paid');
      await conn.query('ALTER TABLE jobs ADD COLUMN payment_method VARCHAR(100) AFTER remaining_balance');
      console.log('[MySQL] Migration: added financial columns to jobs');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
    }

    // Migration: add notes column to jobs if missing
    try {
      await conn.query('ALTER TABLE jobs ADD COLUMN notes TEXT NULL AFTER payment_method');
      console.log('[MySQL] Migration: added notes column to jobs');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
    }

    // 1. Ensure requested tables exist
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

    // 2. Ensure existing products table has requested fields
    try {
      await conn.query('ALTER TABLE products ADD COLUMN sku_barcode VARCHAR(50) UNIQUE AFTER id');
      await conn.query('ALTER TABLE products ADD COLUMN base_unit_price DECIMAL(10, 2) DEFAULT 0.00 AFTER name');
      await conn.query('ALTER TABLE products ADD COLUMN cost_price DECIMAL(10, 2) DEFAULT 0.00 AFTER base_unit_price');
      await conn.query('ALTER TABLE products ADD COLUMN category VARCHAR(100) AFTER cost_price');
      console.log('[MySQL] Migration: added sku_barcode, price fields to products');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) throw e;
    }

    // 3. Ensure existing devices table has requested fields
    try {
      await conn.query('ALTER TABLE devices ADD COLUMN product_id INT AFTER id');
      await conn.query('ALTER TABLE devices ADD COLUMN imei_serial VARCHAR(50) UNIQUE AFTER product_id');
      await conn.query('ALTER TABLE devices ADD COLUMN date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER carrier');
      await conn.query('ALTER TABLE devices ADD CONSTRAINT fk_devices_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE');
      console.log('[MySQL] Migration: added product_id, imei_serial, date_added to devices');
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column') && !e.message?.includes('Duplicate key')) throw e;
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // Migration: Clean up customer names containing literal "null" string
    try {
      // 1. Fix names that end with " null" (e.g. "Khan null" → "Khan")
      await conn.query(`
        UPDATE customers 
        SET name = TRIM(REPLACE(name, 'null', ''))
        WHERE name LIKE '%null%'
      `);
      // 2. Fix last_name fields that are literally "null"
      await conn.query(`
        UPDATE customers 
        SET last_name = NULL 
        WHERE last_name = 'null'
      `);
      // 3. Fix first_name fields that are literally "null"
      await conn.query(`
        UPDATE customers 
        SET first_name = NULL 
        WHERE first_name = 'null'
      `);
      // 4. Rebuild name from first_name + last_name where name is now empty
      await conn.query(`
        UPDATE customers 
        SET name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
        WHERE (name IS NULL OR name = '' OR name = ' ')
          AND (first_name IS NOT NULL OR last_name IS NOT NULL)
      `);
      console.log('[MySQL] Migration: cleaned up customer names containing "null"');
    } catch (e: any) {
      console.warn('[MySQL] Customer name cleanup migration warning:', e.message);
    }

    console.log('[MySQL] Schema initialised successfully');
  } finally {
    conn.release();
  }
}

// ─── Seed Initial Data ────────────────────────────────────────────────────────

export async function seedData() {
  const [existing] = await pool.execute("SELECT id FROM businesses WHERE name='Phone Management System'");
  if ((existing as any[]).length > 0) return;

  const conn = await pool.getConnection();
  try {
    console.log('[MySQL] Resetting database and seeding initial data...');
    
    // Disable FK checks to allow truncation
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const tables = [
      'businesses', 'branches', 'users', 'customers', 'suppliers', 
      'settings', 'payment_methods', 'smtp_settings', 'invoices', 
      'invoice_items', 'products', 'product_skus', 'branch_stock', 
      'devices', 'inventory_movements', 'jobs', 'device_transfers'
    ];
    
    for (const table of tables) {
      try {
        await conn.query(`TRUNCATE TABLE ${table}`);
      } catch (e) {}
    }

    // Insert Main Business
    const [bizResult] = await conn.execute(
      'INSERT INTO businesses (name, email, slug, status) VALUES (?, ?, ?, ?)',
      ['Phone Management System', 'support@techinbox.ie', 'phone-management-system', 'active']
    );
    const businessId = (bizResult as mysql.ResultSetHeader).insertId;

    const bcrypt = await import('bcryptjs');
    const adminHash = await bcrypt.hash('Admin123', 10);

    const branchesData = [
      {
        name: 'Phone Lab',
        email: 'phone.lab.ennis@gmail.com',
        address: "32 O'Connell Street, Clonroad Beg, Ennis, Co. Clare, V95 EW74",
        phone: '(065) 672 4192'
      },
      {
        name: 'FIXD GORT',
        email: 'fixd.gort@gmail.com',
        address: '1 Bridge St, Ballyhugh, Gort, Co. Galway, H91 FRC8',
        phone: '(089) 981 5157'
      },
      {
        name: 'Gadget Reapir & Vape shop',
        email: 'istoreirl@gmail.com',
        address: 'Apartment 1, Unit 1, Millennium house, Loughrea, Co. Galway, H62 H573',
        phone: '(089) 961 7473'
      },
      {
        name: 'iPear Ennis',
        email: 'technomore.irl@gmail.com',
        address: '6 Parnell St, Clonroad Beg, Ennis, Co. Clare, V95 X073',
        phone: '(065) 682 2900'
      },
      {
        name: 'iPear in Tesco',
        email: 'ipear.ennis@gmail.com',
        address: 'Unit 20, Francis St, Clonroad Beg, Ennis, Co. Clare, V95 EP8K',
        phone: '(065) 672 4446'
      }
    ];

    let firstBranchId: number | null = null;

    for (const b of branchesData) {
      const [brResult] = await conn.execute(
        'INSERT INTO branches (business_id, name, address, phone, status) VALUES (?, ?, ?, ?, ?)',
        [businessId, b.name, b.address, b.phone, 'active']
      );
      const branchId = (brResult as mysql.ResultSetHeader).insertId;
      if (!firstBranchId) firstBranchId = branchId;

      // Create Admin for each branch
      await conn.execute(
        `INSERT INTO users (business_id, branch_id, name, email, password, password_hash, role, status)
         VALUES (?, ?, ?, ?, ?, ?, 'superadmin', 'approved')`,
        [businessId, branchId, b.name + ' Admin', b.email, 'Admin123', adminHash]
      );
    }

    // Developer Panel user
    const devHash = await bcrypt.hash(process.env.DEV_PASS || 'admin123', 10);
    await conn.execute(
      `INSERT INTO users (business_id, branch_id, name, email, password, password_hash, role, status)
       VALUES (?, ?, ?, ?, '', ?, 'developer', 'approved')`,
      [businessId, firstBranchId, 'Developer Panel', 'support@techinbox.ie', devHash]
    );

    // Global settings & defaults
    await conn.execute('INSERT INTO settings (business_id) VALUES (?)', [businessId]);
    await conn.execute('INSERT INTO customers (business_id, name) VALUES (?, ?)', [businessId, 'Walk-in Customer']);

    const methods = ['Debit Card', 'Cash', 'Other'];
    for (let i = 0; i < methods.length; i++) {
      await conn.execute('INSERT INTO payment_methods (business_id, name, display_order) VALUES (?, ?, ?)', [businessId, methods[i], i + 1]);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();
    console.log('[MySQL] Reset and Seeding completed.');
  } catch (e: any) {
    await conn.rollback();
    console.error('[MySQL] Seeding failed:', e.message);
  } finally {
    conn.release();
  }
}

// ─── Ensure Superadmin Exists ─────────────────────────────────────────────────

export async function ensureSuperAdmin() {
  const [rows] = await pool.execute("SELECT id FROM businesses WHERE name='Phone Management System' LIMIT 1");
  const businesses = rows as any[];
  if (businesses.length === 0) return;
  const businessId = businesses[0].id;

  const [branches] = await pool.execute('SELECT id FROM branches WHERE business_id = ? LIMIT 1', [businessId]);
  const branchList = branches as any[];
  if (branchList.length === 0) return;
  const branchId = branchList[0].id;

  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash('Admin123', 10);

  await pool.execute(
    `INSERT INTO users (business_id, branch_id, name, email, password, password_hash, role, status)
     VALUES (?, ?, 'Super Admin', 'tanveerfixit@gmail.com', 'Admin123', ?, 'superadmin', 'approved')
     ON DUPLICATE KEY UPDATE role='superadmin', status='approved', password='Admin123', business_id=?, branch_id=?`,
    [businessId, branchId, hash, businessId, branchId]
  );

  // ─── Migrate Developer Panel user to role='developer' (FINDING-002) ──────
  await pool.execute(
    `UPDATE users SET role='developer', password=''
     WHERE (email='admin@icover.ie' OR email='support@techinbox.ie') AND role IN ('admin','developer')`,
    []
  );

  console.log('[MySQL] Superadmin and developer roles ensured.');
}

