import Database from 'better-sqlite3';

const db = new Database('pos.db');

// Initialize schema
db.exec(`
  -- CORE MULTI-TENANT STRUCTURE
  CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'suspended'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    deleted_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
  );

  -- ROLE BASED ACCESS CONTROL
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER,
    permission_id INTEGER,
    PRIMARY KEY(role_id, permission_id),
    FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER,
    role_id INTEGER,
    PRIMARY KEY(user_id, role_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
  );

  -- PRODUCT CATALOG (VARIANT SYSTEM)
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    parent_id INTEGER NULL,
    name TEXT,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    name TEXT,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tax_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    name TEXT,
    rate REAL DEFAULT 0.00,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    category_id INTEGER NULL,
    manufacturer_id INTEGER NULL,
    tax_class_id INTEGER NULL,
    name TEXT NOT NULL,
    product_type TEXT DEFAULT 'stock', -- 'stock', 'serialized', 'service', 'bundle'
    description TEXT,
    allow_overselling INTEGER DEFAULT 1, -- 0 for false, 1 for true
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL,
    FOREIGN KEY (tax_class_id) REFERENCES tax_classes(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS variant_attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS variant_attribute_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attribute_id INTEGER NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY (attribute_id) REFERENCES variant_attributes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS product_skus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    sku_code TEXT UNIQUE,
    barcode TEXT,
    cost_price REAL,
    selling_price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sku_attribute_values (
    sku_id INTEGER,
    attribute_value_id INTEGER,
    PRIMARY KEY(sku_id, attribute_value_id),
    FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_value_id) REFERENCES variant_attribute_values(id) ON DELETE CASCADE
  );

  -- INVENTORY (SKU LEVEL)
  CREATE TABLE IF NOT EXISTS branch_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 0,
    UNIQUE(sku_id, branch_id),
    FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    sku_id INTEGER NOT NULL,
    imei TEXT UNIQUE,
    cost_price REAL,
    selling_price REAL,
    color TEXT,
    gb TEXT,
    condition TEXT,
    po_number TEXT,
    status TEXT DEFAULT 'in_stock', -- 'in_stock', 'sold', 'returned', 'transfer'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    sku_id INTEGER NULL,
    device_id INTEGER NULL,
    movement_type TEXT, -- 'purchase', 'sale', 'refund', 'adjustment', 'transfer_out', 'transfer_in', 'writeoff'
    quantity INTEGER,
    unit_cost REAL,
    reference_type TEXT,
    reference_id INTEGER,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  -- SALES
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    wallet_balance REAL DEFAULT 0,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    user_id INTEGER NULL,
    customer_id INTEGER NULL,
    invoice_number TEXT,
    type TEXT DEFAULT 'sale', -- 'sale', 'refund'
    subtotal REAL,
    tax_total REAL,
    discount_total REAL,
    grand_total REAL,
    paid_amount REAL DEFAULT 0,
    due_amount REAL DEFAULT 0,
    cost_total REAL,
    profit_total REAL,
    status TEXT DEFAULT 'paid', -- 'draft', 'paid', 'partial', 'void', 'credit', 'pending'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    sku_id INTEGER NOT NULL,
    device_id INTEGER NULL,
    quantity INTEGER NOT NULL,
    price REAL,
    cost REAL,
    discount REAL,
    total REAL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (sku_id) REFERENCES product_skus(id),
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    invoice_id INTEGER,
    type TEXT, -- 'deposit', 'sale_payment', 'wallet_use'
    method TEXT,
    amount REAL,
    paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS invoice_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    user_id INTEGER,
    activity TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS customer_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    user_id INTEGER,
    activity TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS product_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku_id INTEGER NOT NULL,
    user_id INTEGER,
    activity TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    currency TEXT DEFAULT '€, Euro',
    timezone TEXT DEFAULT 'UTC/GMT +00:00 - Europe/London',
    date_format TEXT DEFAULT 'DD-MM-YY',
    time_format TEXT DEFAULT '12 hour',
    language TEXT DEFAULT 'English',
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS printer_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    label_size TEXT DEFAULT '2.25" (57mm) x 1.25" (32mm) Dymo 30334',
    barcode_length INTEGER DEFAULT 20,
    margin_top INTEGER DEFAULT 5,
    margin_left INTEGER DEFAULT 3,
    margin_bottom INTEGER DEFAULT 3,
    margin_right INTEGER DEFAULT 3,
    orientation TEXT DEFAULT 'Landscape',
    font_size TEXT DEFAULT 'Regular',
    font_family TEXT DEFAULT 'Arial',
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS thermal_printer_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL UNIQUE,
    font_family TEXT DEFAULT 'monospace',
    font_size TEXT DEFAULT '14px',
    show_logo INTEGER DEFAULT 1,
    show_business_name INTEGER DEFAULT 1,
    show_business_address INTEGER DEFAULT 1,
    show_business_phone INTEGER DEFAULT 1,
    show_business_email INTEGER DEFAULT 1,
    show_customer_info INTEGER DEFAULT 1,
    show_invoice_number INTEGER DEFAULT 1,
    show_date INTEGER DEFAULT 1,
    show_items_table INTEGER DEFAULT 1,
    show_totals INTEGER DEFAULT 1,
    show_footer INTEGER DEFAULT 1,
    show_powered_by INTEGER DEFAULT 1,
    footer_text TEXT DEFAULT 'Thank you for your business!',
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  -- CASH DRAWER
  CREATE TABLE IF NOT EXISTS drawers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    opened_by INTEGER,
    opening_balance REAL,
    closing_balance REAL,
    status TEXT DEFAULT 'open', -- 'open', 'closed'
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );

  CREATE TABLE IF NOT EXISTS drawer_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drawer_id INTEGER NOT NULL,
    amount REAL,
    type TEXT, -- 'in', 'out'
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (drawer_id) REFERENCES drawers(id) ON DELETE CASCADE
  );

  -- PURCHASES
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    contact_person TEXT,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    supplier_id INTEGER,
    po_number TEXT,
    lot_ref_no TEXT,
    sales_tax REAL DEFAULT 0,
    shipping_cost REAL DEFAULT 0,
    total REAL DEFAULT 0,
    expected_at DATETIME,
    status TEXT DEFAULT 'draft', -- 'draft', 'received', 'cancelled', 'closed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_id INTEGER NOT NULL,
    product_id INTEGER,
    description TEXT,
    ordered_qty INTEGER DEFAULT 0,
    received_qty INTEGER DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    total REAL DEFAULT 0,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
  );

  -- REPAIRS MODULE
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER,
    branch_id INTEGER,
    customer_id INTEGER,
    device_model TEXT,
    issue TEXT,
    status TEXT, -- 'new', 'diagnosed', 'repairing', 'completed', 'collected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- DEVICE TRANSFERS (branch-to-branch)
  CREATE TABLE IF NOT EXISTS device_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    from_branch_id INTEGER NOT NULL,
    to_branch_id INTEGER NOT NULL,
    device_id INTEGER,
    sku_id INTEGER,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_transit', 'completed', 'cancelled'
    initiated_by INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (from_branch_id) REFERENCES branches(id),
    FOREIGN KEY (to_branch_id) REFERENCES branches(id),
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
    FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE SET NULL,
    FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE SET NULL
  );

  -- SMTP EMAIL SETTINGS
  CREATE TABLE IF NOT EXISTS smtp_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL UNIQUE,
    host TEXT DEFAULT 'smtp.hostinger.com',
    port INTEGER DEFAULT 465,
    secure INTEGER DEFAULT 1,
    user TEXT,
    pass TEXT,
    from_name TEXT DEFAULT 'EPOS System',
    from_email TEXT,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  -- SAAS SUBSCRIPTION
  CREATE TABLE IF NOT EXISTS subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL,
    max_branches INTEGER,
    max_users INTEGER
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER,
    plan_id INTEGER,
    starts_at DATE,
    ends_at DATE,
    status TEXT DEFAULT 'active' -- 'active', 'expired', 'cancelled'
  );

  CREATE TABLE IF NOT EXISTS closing_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    report_date DATE NOT NULL,
    starting_balance REAL DEFAULT 0,
    cash_counted REAL DEFAULT 0,
    calculated_cash REAL DEFAULT 0,
    difference REAL DEFAULT 0,
    total_sales REAL DEFAULT 0,
    total_deposits REAL DEFAULT 0,
    total_cash_in_drawer REAL DEFAULT 0,
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS closing_report_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    payment_type TEXT NOT NULL,
    calculated REAL DEFAULT 0,
    counted REAL DEFAULT 0,
    difference REAL DEFAULT 0,
    FOREIGN KEY (report_id) REFERENCES closing_reports(id) ON DELETE CASCADE
  );
`);

// Migrations / Column Checks
const addColumnIfNotExists = (table: string, column: string, type: string) => {
  try {
    db.prepare(`SELECT ${column} FROM ${table} LIMIT 1`).get();
  } catch (e) {
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
      console.log(`Added column ${column} to ${table}`);
    } catch (err) {
      console.error(`Could not add ${column} to ${table}`, err);
    }
  }
};

addColumnIfNotExists("purchase_orders", "po_number", "TEXT");
addColumnIfNotExists("purchase_orders", "expected_at", "DATETIME");
addColumnIfNotExists("purchase_orders", "lot_ref_no", "TEXT");
addColumnIfNotExists("purchase_orders", "sales_tax", "REAL DEFAULT 0");
addColumnIfNotExists("purchase_orders", "shipping_cost", "REAL DEFAULT 0");
addColumnIfNotExists("purchase_orders", "total", "REAL DEFAULT 0");
addColumnIfNotExists("purchase_orders", "status", "TEXT DEFAULT 'draft'");

addColumnIfNotExists("suppliers", "contact_person", "TEXT");

addColumnIfNotExists("devices", "po_number", "TEXT");
addColumnIfNotExists("devices", "cost_price", "REAL");
addColumnIfNotExists("devices", "selling_price", "REAL");
addColumnIfNotExists("devices", "color", "TEXT");
addColumnIfNotExists("devices", "gb", "TEXT");
addColumnIfNotExists("devices", "condition", "TEXT");

addColumnIfNotExists("purchase_order_items", "description", "TEXT");
addColumnIfNotExists("purchase_order_items", "ordered_qty", "INTEGER DEFAULT 0");
addColumnIfNotExists("purchase_order_items", "received_qty", "INTEGER DEFAULT 0");
addColumnIfNotExists("purchase_order_items", "unit_cost", "REAL DEFAULT 0");
addColumnIfNotExists("purchase_order_items", "total", "REAL DEFAULT 0");

addColumnIfNotExists("products", "allow_overselling", "INTEGER DEFAULT 1");

addColumnIfNotExists("customers", "first_name", "TEXT");
addColumnIfNotExists("customers", "last_name", "TEXT");
addColumnIfNotExists("customers", "secondary_phone", "TEXT");
addColumnIfNotExists("customers", "fax", "TEXT");
addColumnIfNotExists("customers", "offers_email", "INTEGER DEFAULT 0");
addColumnIfNotExists("customers", "company", "TEXT");
addColumnIfNotExists("customers", "customer_type", "TEXT");
addColumnIfNotExists("customers", "address_line1", "TEXT");
addColumnIfNotExists("customers", "address_line2", "TEXT");
addColumnIfNotExists("customers", "city", "TEXT");
addColumnIfNotExists("customers", "state", "TEXT");
addColumnIfNotExists("customers", "zip_code", "TEXT");
addColumnIfNotExists("customers", "country", "TEXT");
addColumnIfNotExists("customers", "website", "TEXT");
addColumnIfNotExists("customers", "alert_message", "TEXT");
addColumnIfNotExists("customers", "wallet_balance", "REAL DEFAULT 0");

addColumnIfNotExists("invoices", "paid_amount", "REAL DEFAULT 0");
addColumnIfNotExists("invoices", "due_amount", "REAL DEFAULT 0");

addColumnIfNotExists("payments", "customer_id", "INTEGER");
addColumnIfNotExists("payments", "type", "TEXT");

addColumnIfNotExists("businesses", "subdomain", "TEXT");
addColumnIfNotExists("businesses", "address", "TEXT");
addColumnIfNotExists("businesses", "city", "TEXT");
addColumnIfNotExists("businesses", "state", "TEXT");
addColumnIfNotExists("businesses", "zip_code", "TEXT");
addColumnIfNotExists("businesses", "country", "TEXT");

// Add branch_id to tables for strict isolation
const isolatedTables = [
  "categories", "manufacturers", "tax_classes", "products", "variant_attributes",
  "customers", "settings", "payment_methods", "printer_settings", "thermal_printer_settings", "suppliers"
];
isolatedTables.forEach(table => {
  addColumnIfNotExists(table, "branch_id", "INTEGER");
  try {
    // Backfill existing records with branch 1
    db.prepare(`UPDATE ${table} SET branch_id = 1 WHERE branch_id IS NULL`).run();
  } catch (err) {
    console.error(`Failed to backfill branch_id in ${table}`, err);
  }
});

// Auth columns on users
addColumnIfNotExists("thermal_printer_settings", "show_powered_by", "INTEGER DEFAULT 1");
addColumnIfNotExists("users", "role", "TEXT DEFAULT 'staff'");
addColumnIfNotExists("users", "status", "TEXT DEFAULT 'approved'");
addColumnIfNotExists("users", "password_hash", "TEXT");
addColumnIfNotExists("users", "reset_token", "TEXT");
addColumnIfNotExists("users", "reset_token_expires", "DATETIME");

// Ensure the primary admin account always has admin role + approved status
// Also update to new requested support@techinbox.ie / admin123
db.prepare(`
  UPDATE users SET 
    email = 'support@techinbox.ie', 
    role = 'admin', 
    status = 'approved',
    password = 'admin123',
    password_hash = NULL
  WHERE email = 'admin@icover.com' OR email = 'admin@icover.ie' OR email = 'support@techinbox.ie'
`).run();


// Seed / sync SMTP settings from environment variables (set in .env)
if (process.env.SMTP_USER) {
  db.prepare(`
    INSERT INTO smtp_settings (business_id, host, port, secure, user, pass, from_name, from_email)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(business_id) DO UPDATE SET
      host = excluded.host,
      port = excluded.port,
      secure = excluded.secure,
      user = excluded.user,
      pass = excluded.pass,
      from_name = excluded.from_name,
      from_email = excluded.from_email
  `).run(
    process.env.SMTP_HOST || 'smtp.hostinger.com',
    Number(process.env.SMTP_PORT) || 465,
    process.env.SMTP_SECURE === 'false' ? 0 : 1,
    process.env.SMTP_USER,
    process.env.SMTP_PASS || '',
    process.env.SMTP_FROM_NAME || 'iCover EPOS',
    process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
  );
}


// Seed initial data if empty
const businessCount = (db.prepare('SELECT count(*) as count FROM businesses').get() as any).count;
if (businessCount === 0) {
  const businessId = db.prepare('INSERT INTO businesses (name, email) VALUES (?, ?)').run('iCover EPOS', 'contact@icover.com').lastInsertRowid;
  
  // Branches
  const branchId = db.prepare('INSERT INTO branches (business_id, name, address) VALUES (?, ?, ?)').run(businessId, 'Main Branch', '123 Tech St, Dublin').lastInsertRowid;
  db.prepare('INSERT INTO branches (business_id, name, address) VALUES (?, ?, ?)').run(businessId, 'ennis', 'Ennis Branch');
  db.prepare('INSERT INTO branches (business_id, name, address) VALUES (?, ?, ?)').run(businessId, 'gort1', 'Gort Branch');
  db.prepare('INSERT INTO branches (business_id, name, address) VALUES (?, ?, ?)').run(businessId, 'ipear', 'iPear Branch');
  db.prepare('INSERT INTO branches (business_id, name, address) VALUES (?, ?, ?)').run(businessId, 'istore', 'iStore Branch');
  db.prepare('INSERT INTO branches (business_id, name, address) VALUES (?, ?, ?)').run(businessId, 'phoneshop', 'Phone Shop Branch');
  db.prepare('INSERT INTO branches (business_id, name, address) VALUES (?, ?, ?)').run(businessId, 'tesco', 'Tesco Branch');

  // Admin user with password admin123 (auto-hashed on first login)
  db.prepare('INSERT INTO users (business_id, branch_id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(businessId, branchId, 'Developer Panel', 'support@techinbox.ie', 'admin123', 'admin', 'approved');
  
  // Suppliers
  db.prepare('INSERT INTO suppliers (business_id, name) VALUES (?, ?)').run(businessId, 'Apple Ireland');
  db.prepare('INSERT INTO suppliers (business_id, name) VALUES (?, ?)').run(businessId, 'Tech Distribution Ltd');
  db.prepare('INSERT INTO suppliers (business_id, name) VALUES (?, ?)').run(businessId, 'Mobile Wholesale');

  // Customers
  db.prepare('INSERT INTO customers (business_id, name) VALUES (?, ?)').run(businessId, 'Walk-in Customer');

  const catId = db.prepare('INSERT INTO categories (business_id, name) VALUES (?, ?)').run(businessId, 'Smartphones').lastInsertRowid;
  const mfrId = db.prepare('INSERT INTO manufacturers (business_id, name) VALUES (?, ?)').run(businessId, 'Apple').lastInsertRowid;
  
  const prodId = db.prepare('INSERT INTO products (business_id, category_id, manufacturer_id, name, product_type) VALUES (?, ?, ?, ?, ?)').run(businessId, catId, mfrId, 'iPhone 15 Pro', 'serialized').lastInsertRowid;
  const skuId = db.prepare('INSERT INTO product_skus (product_id, sku_code, cost_price, selling_price) VALUES (?, ?, ?, ?)').run(prodId, 'IP15P-BLK-128', 800.00, 999.99).lastInsertRowid;
  
  db.prepare(`
    INSERT INTO devices (business_id, branch_id, sku_id, imei, color, gb, condition, po_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(businessId, branchId, skuId, '355843700519881', 'Black', '128GB', 'A', '564');

  db.prepare(`
    INSERT INTO devices (business_id, branch_id, sku_id, imei, color, gb, condition, po_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(businessId, branchId, skuId, '356494106190023', 'White', '256GB', 'New', '333');

  // Purchase Orders
  db.prepare(`
    INSERT INTO purchase_orders (business_id, branch_id, supplier_id, po_number, lot_ref_no, sales_tax, shipping_cost, total, expected_at, status, created_at)
    VALUES 
    (?, ?, 1, 'p671', '', 0, 0, 0, '2026-03-07', 'closed', '2026-03-07'),
    (?, ?, 1, 'p670', '', 0, 0, 0, '2026-03-06', 'closed', '2026-03-06'),
    (?, ?, 1, 'p669', '', 0, 0, 0, '2026-03-06', 'closed', '2026-03-06'),
    (?, ?, 1, 'p668', '', 0, 0, 0, '2026-03-06', 'closed', '2026-03-06'),
    (?, ?, 2, 'p667', '', 0, 0, 179.00, '2026-03-05', 'closed', '2026-03-05'),
    (?, ?, 1, 'p665', '', 0, 0, 0, '2026-02-28', 'closed', '2026-02-28'),
    (?, ?, 1, 'p664', '', 0, 0, 0, '2026-02-27', 'closed', '2026-02-27'),
    (?, ?, 1, 'p663', '', 0, 0, 0, '2026-02-27', 'closed', '2026-02-27'),
    (?, ?, 3, 'p658', '', 0, 0, 399.00, '2026-02-25', 'closed', '2026-02-25')
  `).run(
    businessId, branchId,
    businessId, branchId,
    businessId, branchId,
    businessId, branchId,
    businessId, branchId,
    businessId, branchId,
    businessId, branchId,
    businessId, branchId,
    businessId, branchId
  );

  // Purchase Order Items
  db.prepare(`
    INSERT INTO purchase_order_items (po_id, product_id, description, ordered_qty, received_qty, unit_cost, total)
    VALUES 
    (1, 1, 'Apple Watch SE 2nd Generation (GPS) 44mm', 1, 1, 0, 0),
    (4, 1, 'Kika Tech Item', 1, 1, 179.00, 179.00),
    (5, 1, 'Un-Known Item', 1, 1, 399.00, 399.00)
  `).run();

  // Settings
  db.prepare(`
    INSERT INTO settings (business_id) VALUES (?)
  `).run(businessId);

  // Payment Methods
  const methods = ['Debit Card', 'Cash', 'Other'];
  methods.forEach((name, index) => {
    db.prepare(`
      INSERT INTO payment_methods (business_id, name, display_order)
      VALUES (?, ?, ?)
    `).run(businessId, name, index + 1);
  });
}

export default db;

