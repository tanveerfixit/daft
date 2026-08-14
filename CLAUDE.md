# Project Guidelines & Critical Rules

## 1. Database Configuration & Remote Database Importance
- **Primary Database Engine:** MySQL / MariaDB (managed via `src/mysql.ts` and `mysql2`).
- **Production Hostinger Database:** `u583652021_clare`
- **Database User:** `u583652021_clare_user`
- **Host:** `srv2113.hstgr.io` (remote) / `127.0.0.1` (on server)
- **CRITICAL:** The remote database contains live, essential business data.
  - **NEVER** drop production databases or truncate tables.
  - **NEVER** overwrite production credentials or remove environment variable bindings.
  - Keep all schema modifications backwards-compatible using safe `IF NOT EXISTS` / `ALTER TABLE` migrations.

## 2. Multi-Tenant & Branch Scoping Integrity (`business_id` & `branch_id`)
- **Strict Isolation:** Every query dealing with business resources (users, products, inventory, invoices, settings, customers, branches, etc.) **MUST** include and respect `business_id` and/or `branch_id`.
- **CRITICAL:** 
  - **DO NOT** change, hardcode, or bypass `business_id` and `branch_id` validation.
  - **DO NOT** remove multi-tenant filters from SQL queries.
  - Ensure all newly created tables include `business_id` and appropriate foreign key relations.

## 3. GitHub Repository & Deployment
- **Repository URL:** `https://github.com/tanveerfixit/data-epos`
- **Source Files:** All core frontend logic in `src/` and backend server logic in `server.ts` & `src/routes/`.
- **Environment Files:** Never commit `.env` containing sensitive credentials to GitHub. Always use `.env.example` as the template.
