import fs from 'fs';
import { pool } from '../src/mysql.js';

async function exportDatabase() {
  const [tablesResult]: any = await pool.execute('SHOW TABLES');
  const tables = tablesResult.map((t: any) => Object.values(t)[0]);

  let sql = `-- ========================================================\n`;
  sql += `-- EPOS Node Database Export: FIXD GORT\n`;
  sql += `-- Generated on ${new Date().toISOString()}\n`;
  sql += `-- Business: FIXD GORT (ID: 1)\n`;
  sql += `-- Branch: FIXD GORT (ID: 1)\n`;
  sql += `-- ========================================================\n\n`;
  sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  for (const table of tables) {
    const [createResult]: any = await pool.execute(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createResult[0]['Create Table'];
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Table structure for table \`${table}\`\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
    sql += `${createSql};\n\n`;

    const [rows]: any = await pool.execute(`SELECT * FROM \`${table}\``);
    if (rows.length > 0) {
      sql += `-- Dumping data for table \`${table}\`\n`;
      const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
      const valuesList = rows.map((r: any) => {
        const rowVals = Object.values(r).map((v: any) => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return v;
          if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
          return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
        }).join(', ');
        return `(${rowVals})`;
      });
      sql += `INSERT INTO \`${table}\` (${cols}) VALUES\n`;
      sql += valuesList.join(',\n') + `;\n\n`;
    }
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  fs.writeFileSync('database.sql', sql);
  console.log('Saved database.sql successfully! Total size:', sql.length, 'bytes');

  fs.writeFileSync('database.md', `# FIXD GORT Database Schema & Data\n\n\`\`\`sql\n${sql}\n\`\`\`\n`);
  console.log('Saved database.md successfully!');
}

exportDatabase().then(() => pool.end()).catch(err => {
  console.error(err);
  pool.end();
});
