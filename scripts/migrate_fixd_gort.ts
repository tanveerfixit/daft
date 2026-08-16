import fs from 'fs';
import { pool, initSchema } from '../src/mysql.js';

async function executeMigration() {
  console.log('1. Re-initializing schema...');
  await initSchema();

  console.log('2. Inserting Business: FIXD GORT...');
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  
  // Clear any old businesses/branches
  await pool.query('TRUNCATE TABLE businesses');
  await pool.query('TRUNCATE TABLE branches');
  
  // Insert FIXD GORT
  await pool.query(`
    INSERT INTO businesses (id, name, slug, email, phone, address, city, state, zip_code, country, status)
    VALUES (1, 'FIXD GORT', 'fixd-gort', 'fixd.gort@gmail.com', '(089) 981 5157', '1 Bridge St, Ballyhugh, Gort', 'Gort', 'Co. Galway', 'H91 FRC8', 'Ireland', 'active')
  `);

  await pool.query(`
    INSERT INTO branches (id, business_id, name, phone, address, status)
    VALUES (1, 1, 'FIXD GORT', '(089) 981 5157', '1 Bridge St, Ballyhugh, Gort, Co. Galway, H91 FRC8', 'active')
  `);

  // Insert Users
  await pool.query('TRUNCATE TABLE users');
  await pool.query(`
    INSERT INTO users (id, business_id, branch_id, name, email, password_hash, role, status)
    VALUES 
    (1, 1, 1, 'FIXD GORT Admin', 'fixd.gort@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'superadmin', 'active'),
    (2, 1, 1, 'Super Admin', 'tanveerfixit@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'superadmin', 'active'),
    (3, 1, 1, 'Developer Panel', 'support@techinbox.ie', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'developer', 'active')
  `);

  // Parse scratch_dump.sql to extract and remap data for other tables
  const dump = fs.readFileSync('scratch_dump.sql', 'utf8');

  // Helper to extract INSERT INTO statements
  function extractInserts(tableName: string) {
    const regex = new RegExp(`INSERT INTO \`?` + tableName + `\`?\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?);\\s*(--|CREATE|INSERT|$)`, 'i');
    const match = dump.match(regex);
    if (!match) return null;
    return {
      columns: match[1],
      values: match[2].trim()
    };
  }

  // Categories
  console.log('3. Migrating Categories...');
  await pool.query('TRUNCATE TABLE categories');
  const categoriesList = [
    'iPhone', 'Apple', 'Samsung Phones', 'Phone', 'Uncategorized', 'New',
    'Refurbished Mobile Sales (Used)', 'Mobile Trade-In Stock (Used)', 'Phones',
    'Vape', 'Laptop Repair', 'Repair', 'Tablets', 'Redmi', 'Amazon',
    'Accessories', 'TCL', 'Phone Repair', 'Refurbished Computer.', 'mobile',
    'Parts', 'Mi', 'Huawei', 'Doro', 'Mobile Sale (Used)', 'dorro', 'LCD',
    'Watches', 'Mobile Covers', 'Nokia', 'Ring light stand', 'General Labour',
    'Computer Accessories', 'ChargingPort Clean', 'Hoco', 'Laptop Sale (Used)',
    'Laptop bag', 'IT Support', 'Samsung Earphones', 'Lyca', 'Desktop Computer',
    'Earbuds', 'Baseus', 'Service', 'Universal TV Remote', 'Cable', 'Mouse pad',
    'Cuba', 'Dumpling', 'Alcatel Tablet', 'Modio Tablet', 'Nintendo', 'Balance'
  ];
  for (let i = 0; i < categoriesList.length; i++) {
    await pool.query(`INSERT INTO categories (id, business_id, branch_id, name) VALUES (?, 1, 1, ?)`, [i + 1, categoriesList[i]]);
  }

  // Customers
  console.log('4. Migrating Customers...');
  await pool.query('TRUNCATE TABLE customers');
  const custDump = extractInserts('customers');
  if (custDump) {
    let values = custDump.values.replace(/\((\d+),\s*\d+,\s*(?:\d+|NULL),/g, '($1, 1, 1,');
    await pool.query(`INSERT INTO customers (${custDump.columns}) VALUES ${values}`);
  }

  // Devices
  console.log('5. Migrating Devices...');
  await pool.query('TRUNCATE TABLE devices');
  const devDump = extractInserts('devices');
  if (devDump) {
    let values = devDump.values.replace(/\((\d+),\s*(?:NULL|'[^']*'|\d+),\s*(?:NULL|'[^']*'|\d+),\s*\d+,\s*\d+,/g, '($1, NULL, NULL, 1, 1,');
    await pool.query(`INSERT INTO devices (${devDump.columns}) VALUES ${values}`);
  }

  // Invoices
  console.log('6. Migrating Invoices...');
  await pool.query('TRUNCATE TABLE invoices');
  const invDump = extractInserts('invoices');
  if (invDump) {
    let values = invDump.values.replace(/\((\d+),\s*\d+,\s*\d+,/g, '($1, 1, 1,');
    await pool.query(`INSERT INTO invoices (${invDump.columns}) VALUES ${values}`);
  }

  // Activity Logs
  console.log('7. Migrating Activity Logs...');
  await pool.query('TRUNCATE TABLE activity_logs');
  const actDump = extractInserts('activity_logs');
  if (actDump) {
    await pool.query(`INSERT INTO activity_logs (${actDump.columns}) VALUES ${actDump.values}`);
  }

  // Customer Activity
  console.log('8. Migrating Customer Activity...');
  await pool.query('TRUNCATE TABLE customer_activity');
  const caDump = extractInserts('customer_activity');
  if (caDump) {
    await pool.query(`INSERT INTO customer_activity (${caDump.columns}) VALUES ${caDump.values}`);
  }

  // Device Activity
  console.log('9. Migrating Device Activity...');
  await pool.query('TRUNCATE TABLE device_activity');
  const daDump = extractInserts('device_activity');
  if (daDump) {
    await pool.query(`INSERT INTO device_activity (${daDump.columns}) VALUES ${daDump.values}`);
  }

  // Closing Reports
  console.log('10. Migrating Closing Reports...');
  await pool.query('TRUNCATE TABLE closing_reports');
  const crDump = extractInserts('closing_reports');
  if (crDump) {
    let values = crDump.values.replace(/\((\d+),\s*\d+,\s*\d+,/g, '($1, 1, 1,');
    await pool.query(`INSERT INTO closing_reports (${crDump.columns}) VALUES ${values}`);
  }

  // Closing Report Payments
  console.log('11. Migrating Closing Report Payments...');
  await pool.query('TRUNCATE TABLE closing_report_payments');
  const crpDump = extractInserts('closing_report_payments');
  if (crpDump) {
    await pool.query(`INSERT INTO closing_report_payments (${crpDump.columns}) VALUES ${crpDump.values}`);
  }

  // Branch Stock
  console.log('12. Migrating Branch Stock...');
  await pool.query('TRUNCATE TABLE branch_stock');
  const bsDump = extractInserts('branch_stock');
  if (bsDump) {
    let values = bsDump.values.replace(/\((\d+),\s*(\d+),\s*\d+,\s*(-?\d+)\)/g, '($1, $2, 1, $3)');
    await pool.query(`INSERT IGNORE INTO branch_stock (${bsDump.columns}) VALUES ${values}`);
  }

  // Inventory Movements
  console.log('13. Migrating Inventory Movements...');
  await pool.query('TRUNCATE TABLE inventory_movements');
  const imDump = extractInserts('inventory_movements');
  if (imDump) {
    let values = imDump.values.replace(/\((\d+),\s*\d+,\s*\d+,/g, '($1, 1, 1,');
    await pool.query(`INSERT INTO inventory_movements (${imDump.columns}) VALUES ${values}`);
  }

  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Migration successfully completed!');
}

executeMigration().then(() => pool.end()).catch(err => {
  console.error('Migration failed:', err);
  pool.end();
});
