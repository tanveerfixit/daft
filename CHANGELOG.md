# POS System - Daily Updates & Changelog

This document tracks all features, architectural enhancements, bug fixes, and UX improvements made to the EPOS application.

## [2026-11-06] - End-to-End Credit Note (`CN-#`) & Store Credit System

### 🚀 Features & Architectural Enhancements
* **Database Schema & Automatic Migration (`src/mysql.ts`)**:
  * Bumped `CURRENT_SCHEMA_VERSION` to `'2026_11_CREDIT_NOTES_V1'`.
  * Added `parent_invoice_id INT NULL` to the `invoices` table (`CREATE TABLE` and automatic `ALTER TABLE` migration) to link Credit Note documents directly to their parent sales invoice.
  * Created the `credit_notes` table (`id`, `business_id`, `branch_id`, `credit_note_number`, `original_invoice_id`, `credit_note_invoice_id`, `customer_id`, `subtotal`, `tax_total`, `grand_total`, `remaining_amount`, `status`, `reason`, `created_by`, `created_at`) with composite indexes (`idx_cn_biz_number`, `idx_cn_orig_inv`, `idx_cn_customer`).
* **Sequential Credit Note Generation on Refund (`src/routes/invoices.ts`)**:
  * Upgraded `POST /api/invoices/:id/refund` so selecting **"Credit Note"** (or **"Customer Wallet"**) generates a sequential, branch-scoped Credit Note number (`CN-{BRANCH}-{YYMM}-{####}`, e.g., `CN-MAIN-2611-0001`).
  * Automatically creates a standalone Credit Note document in `invoices` (`type = 'credit_note'`, `parent_invoice_id = invoice.id`) with returned `invoice_items` (including IMEI/serial numbers) and proportional tax breakdown.
  * Records the Credit Note in `credit_notes` (`status = 'active'`, `remaining_amount = totalRefundAmount`) and automatically credits `customers.wallet_balance` when attached to a named customer (fixing the previous bug where Customer Wallet refunds did not update `wallet_balance`).
* **Credit Note Redemption & Wallet Synchronization (`src/routes/invoices.ts`, `src/routes/customers.ts`)**:
  * Added `GET /api/invoices/credit-note/:cnNumber` for instant lookup of active Credit Notes by code at the Cash Register.
  * Added `GET /api/customers/:id/credit-notes` to retrieve all Credit Notes for a customer profile.
  * Upgraded `POST /api/invoices` to support redeeming Credit Notes both by scanning/typing `CN-#` (Walk-in or named customer) and via Customer `Wallet` (FIFO-synchronizing `credit_notes.remaining_amount` and `customers.wallet_balance` to prevent double-spending).
* **Invoice Details & Refund Modal (`src/components/InvoiceDetails.tsx`, `src/components/ThermalReceipt.tsx`, `src/services/mailer.ts`)**:
  * Updated the Step 2 Refund Settlement Modal to default to **"Credit Note (Store Credit)"**, allow attaching a customer profile on the fly if the original invoice was for a Walk-in Customer, and accept an optional refund reason/note.
  * Added a **"Credit Notes Issued From This Invoice"** section on parent invoices with 1-click navigation and printing, and linked Credit Note documents back to their Original Invoice.
  * Updated Thermal (`80mm`) receipts, A4 print layouts, and HTML emails (`sendInvoiceEmail`) to display `CREDIT NOTE`, `Credit Note #CN-...`, `Orig. Invoice #`, `Credit Total`, and `Available Store Credit`.
* **Cash Register Payment Panel Streamlined (Option 1 - Clean Two-Tier UX) (`PaymentPanel.tsx`)**:
  * Cleaned up the saturated 4+ button grid into a clean, modern two-tier layout.
  * **Primary Row**: Two large, high-visibility buttons (**`[ Cash ]`** in emerald green and **`[ Card ]`** in blue) dedicated to 95% of daily transactions with 1-click execution.
  * **Secondary Row**: Compact split tenders with a purple **`[ 🎟 Store Credit / CN ]`** button (with live available balance badge) and an **`[ Other Methods ▾ ]`** flyout dropdown for alternative tenders (e.g. Bank Transfer, Cheque, Customer Wallet).
  * Collapsible slide-down panel for Credit Notes and Customer Wallet redemption keeps the main checkout interface 100% clean and uncluttered.
* **Cash Register Redemption, Invoice List Filter & Customer Ledger (`PaymentPanel.tsx`, `InvoiceList.tsx`, `CustomerDetails.tsx`)**:
  * Added a **Credit Note** payment option in `PaymentPanel.tsx` to scan/type any `CN-#` code or 1-click apply a selected customer's active Credit Notes.
  * Enabled the **All Types / Sales Invoices / Credit Notes (CN)** filter dropdown and `CN` badges in `InvoiceList.tsx`.
  * Added a **Credit Notes** table to the customer's **Wallet & Ledger** tab in `CustomerDetails.tsx` and excluded `credit_note` documents from inflating gross sales KPIs in `src/routes/reports.ts`.

---

## [2026-11-05] - Deployment Auth 500 Fix, DB Host Normalization & Production Health Diagnostics

### 🚀 Features & UX Improvements
* **End of Day Calendar Date Picker & Reports Modal (`EndOfDay.tsx`)**:
  * Upgraded the **"End of Day List"** button to open an interactive modal with a full **Calendar Date Picker** as the primary view.
  * Users can navigate months, click on any date (or use quick "Today" / "Yesterday" buttons), and click **"Load Day Details"** (or double-click the day) to instantly display sales, drawer cash, invoice payments, and transaction breakdowns for any chosen date.
  * Added visual indicators: green dots mark dates that have saved closing reports, and rings mark "Today" and the currently selected date.
  * Provided a **Saved Reports List** tab with real-time search filtering (by date or staff name) and 1-click "Load Day" actions.

### 🐛 Bug Fixes & Deployment Stability
* **Searchable & Alphabetically Sorted Model Reassignment Dropdown (`DeviceDetails.tsx`)**:
  * Upgraded the "Reassign IMEI to another model" selector in Edit Device Details modal from a static HTML `<select>` into a searchable, interactive combobox.
  * Added instant real-time search filtering by model name, manufacturer brand, and SKU code with quick-clear and automatic focus.
  * Sorted all available device models alphabetically (A–Z) using natural numeric sorting (e.g. iPhone 11 before iPhone 12).
  * Included active "Current" badges and checkmark indicators for the currently assigned model.
* **Streamlined Add Inventory Page (`AddInventory.tsx`, `inventory.ts`)**:
  * Simplified the Serialized Items intake table by removing redundant Storage, Color, and Condition input columns. Intake is now focused purely on fast barcode/IMEI scanning.
  * Preserved full barcode scanner navigation (scan IMEI -> press Enter to automatically create and focus the next line).
  * Upgraded `POST /api/inventory/add` in `src/routes/inventory.ts` to automatically inherit storage capacity (GB) from the product/SKU name if present (e.g. "128GB", "256GB") and default condition to `'New'`, ensuring complete database records with zero manual input overhead.
  * Simplified the batch success & label printing view with a clean 4-column layout (`#`, `IMEI`, `Price`, `Print`).
  * Moved `loginSchema.parse(req.body)` and `resetPasswordSchema.parse(req.body)` inside `try/catch` blocks. Previously, synchronous parse errors in async Express 4 route handlers returned uncaught rejected promises that triggered Node `unhandledRejection`, crashing the process under LiteSpeed / Passenger and returning 500/503.
  * Enhanced Zod error handling in the global error handler (`server.ts`) with dual validation (`err instanceof ZodError || err?.name === 'ZodError'`) to guarantee 400 Bad Request responses.
* **Hostinger MySQL Dual-Host Auto-Fallback (`src/mysql.ts`)**:
  * Implemented `ensureConnectedPool()` with dynamic proxy connection pool. If connecting to a remote host (e.g. `srv2113.hstgr.io`) fails with `ER_ACCESS_DENIED_ERROR` or network error on the live host, it automatically tests and falls back to local loopback `127.0.0.1` (and vice-versa).
  * Added `resolveDbHost()` to automatically map `localhost` to `127.0.0.1`. Under Linux on Hostinger, connecting to `localhost` forces `mysql2` to search for UNIX domain sockets (`/tmp/mysql.sock`), causing `connect ENOENT` failures. Resolving to `127.0.0.1` ensures reliable TCP port 3306 connections.
  * Added fallback `.env` file resolution using `process.cwd()` to ensure environment variables load reliably under Passenger / LiteSpeed.
* **Process Stability & Error Transparency (`server.ts`)**:
  * Added `process.on('unhandledRejection')` and `process.on('uncaughtException')` logging listeners to prevent unexpected worker crashes.
  * Added `/api/health` diagnostic endpoint testing live database connectivity.
  * Enhanced global API error responses to return informative error details (`Database Connection Error`, exact error message and code) instead of blank 500 errors.
* **Production Build (`server.js`, `dist`)**:
  * Recompiled production bundle with Vite and esbuild.

---

## [2026-11-04] - Bulk & Multi-Product B2B / Branch Transfers, Multi-Business Catalog Auto-Sync & Repeat Customer Repair Intake

### 🚀 New Features & Enhancements
* **1-Click Repeat Customer Repair Intake (`RepairList.tsx`, `RepairDetails.tsx`, `RepairIntakeForm.tsx`)**:
  * Preserved the original layout and design of `RepairList.tsx`, `RepairDetails.tsx`, and `RepairIntakeForm.tsx`.
  * Added a **`+ New Repair for Customer`** button in `RepairDetails.tsx` and a **`UserPlus`** action icon on each row of `RepairList.tsx` to open `RepairIntakeForm` pre-linked and pre-filled with that customer's ID, Name, Phone, and Email.
  * Added returning customer autocomplete suggestions in `RepairIntakeForm.tsx` when typing a customer's phone number or name.
* **Editable Customer Profile & Device Details in Repairs (`RepairDetails.tsx`, `RepairUpdateModal.tsx`, `inventory.ts`)**:
  * Unlocked the Customer & Device Profile card in `RepairDetails.tsx` with an **Edit Profile** button and inline edit icons so staff can edit **Customer Name**, **Phone Number**, **Email**, **Device Name (`device_model`)**, and **Fault (`issue`)** at any time.
  * Added a **👤 Profile & Device** tab in `RepairUpdateModal.tsx` so customer details, device model, and fault description can also be edited directly from the Repairs list update modal.
  * Extended `PUT /api/repairs/:id` in `src/routes/inventory.ts` to update `device_model`, `issue`, and the linked `customers` record (or automatically create and link a `customers` record if the repair was originally created without one).
* **Multi-Business Product Catalog Auto-Sync (`products.ts`, `inventory.ts`)**:
  * Implemented automatic catalog synchronization (`syncNewProductToOtherBusinesses`) in `POST /api/products` and `POST /api/products/quick-add` so any newly created product name is automatically added to all other active businesses with `quantity = 0`.
  * Added automatic product rename propagation in `PUT /api/products/:id` across all businesses when a product name typo is corrected.
  * Fixed cross-business SKU resolution in `PUT /api/transfers/:id/complete` and added normalized product name matching so incoming B2B transfers link directly to the destination business's existing product & SKU instead of creating duplicate product names.
  * Added `POST /api/products/sync-catalog` and synchronized all missing existing catalog products across all active businesses with `0` stock and zero changes to existing stock, prices, or invoices.
* **Multi-Product & Multi-IMEI Transfer Queue (`BranchTransfer.tsx`, `inventory.ts`)**:
  * Upgraded B2B & Branch Transfers from single-item selection to a full **Transfer Queue (Cart)** supporting multiple serialized IMEI devices and standard stock products in a single dispatch.
  * Added unified search endpoint (`GET /api/transfers/search-items`) querying both in-stock serialized devices (`devices`) and standard stock SKUs (`products` + `product_skus` with `branch_stock` quantities).
  * Added **Keyboard & Barcode Scanner Flow**: Up/Down arrow navigation and `Enter` key instant queue addition for continuous barcode/IMEI scanning, plus an **"Add All"** button in search results.
  * Added **Bulk Paste IMEIs / SKUs** panel (`POST /api/transfers/resolve-bulk`) to paste or scan multiple IMEIs, serial numbers, or SKU codes at once and resolve them into the transfer queue.
  * Added interactive quantity steppers (`-` / `+` / numeric input) for standard stock SKUs while locking serialized IMEI devices to `Qty: 1` with duplicate prevention.
  * Upgraded `POST /api/transfers` to process both single items and bulk `items: [...]` arrays inside a single MySQL ACID transaction with zero schema changes and 100% backward compatibility.
  * Added **Multi-Select Bulk Actions** in Transfer History (`Select All`, `Receive & Accept Selected`, `Cancel Selected`, and `Print Combined Slip`) and multi-row printable **B2B Goods Transfer Manifest** with total unit counts.

---

## [2026-09-09] - Mobile Responsiveness, Collapsible Panels & Clean Typography

### 📱 Mobile & Responsive UI Enhancements
* **Mobile Responsive & Edge-to-Edge Layout (`Dashboard.tsx` and all `dashboard/*` components)**:
  * Cards and container blocks adapt flush to screen edges on mobile devices (`rounded-none sm:rounded-lg`).
  * Optimized mobile paddings (`p-0 sm:p-4`, `px-3.5 py-2.5 sm:px-4 sm:py-3`) and touch targets.
  * Header controls, date range inputs, and timeframe selectors wrap cleanly on mobile screens (`flex-wrap sm:flex-nowrap`, `w-full sm:w-auto`, `flex-1 sm:flex-none`).
  * Horizontal scrolling wrappers (`overflow-x-auto` / `overflow-auto`) added for tabular sections (Payments and Categories) to prevent mobile viewport clipping.
  * Preserved 100% of desktop styling, grids, and paddings (`sm:`, `md:`, `lg:`).

### 🎯 Cash Register Search & Navigation Enhancements
* **Synchronized Mouse Hover & Keyboard Arrow Navigation (`SearchResults.tsx`, `CashRegister.tsx`, `CustomerSelector.tsx`)**:
  * Added instant mouse-hover synchronization with active selection (`onMouseEnter` updates active index) so mouse and keyboard navigation never conflict.
  * Auto-scrolling on keyboard navigation: active row now automatically scrolls smoothly into view (`scrollIntoView({ block: 'nearest' })`) when cycling up/down through long search lists.
  * High-visibility active/hover state: distinct blue accent bar (`border-l-4 border-l-blue-600`), soft active background (`bg-blue-50/95 dark:bg-blue-950/50`), bold title, and inline `Press Enter ↵` action shortcut badge on desktop.
  * Enhanced Customer search dropdown with consistent active border highlight.
* **Mobile Edge-to-Edge Layout & Touch Targets (`CashRegister.tsx`, `CartTable.tsx`, `CustomerSelector.tsx`, `PaymentPanel.tsx`, `TotalsPanel.tsx`, `SpeedGrid.tsx`)**:
  * Edge-to-edge flush cards on small mobile screens (`rounded-none sm:rounded border-y sm:border`) across Search Bar, Cart, Customer Selector, Totals, Tender Widget, and Speed Grid.
  * Expanded mobile touch target sizes on cart items: delete buttons (`38px × 38px`), quantity steppers (`36px × 36px`), and edit buttons (`36px × 36px`).
  * Adaptive Tender Method grid: adjusted to `grid-cols-2 sm:grid-cols-4` to prevent button squeezing or label truncation on narrow mobile screens.
  * Preserved 100% of desktop layout, calculations, multi-user session storage, and checkout logic.

### 🎨 UI / UX Enhancements
* **Collapsible Panels with Default-Collapsed State (`ProfitDriversTable.tsx`, `GrowthLeversCard.tsx`, `Dashboard.tsx`)**:
  * Made **Top 10 Profit Drivers ("Money Makers")** and **Growth & Marketing Levers** collapsible sections, defaulting to collapsed on load.
  * Added smooth clickable header toggle with chevron rotation indicator.
  * Applied independent column alignment (`items-start`) on Section 4 responsive grid.
* **Clean Text & Active Blue Typography (`Dashboard.tsx`, `ExecutiveKpiStrip.tsx`, `SalesTrendChart.tsx`, `PeakTradingHoursChart.tsx`)**:
  * Removed borders from the top-right filter controls, timeframe dropdown, date inputs, and refresh button for a clean, borderless header presentation.
  * Removed filled background color boxes, chips, and badge pill wrappers behind text and icons.
  * Replaced background button switchers on charts with clean, minimalist typography using blue text (`text-blue-600 dark:text-blue-400 font-bold`) for active filter state.
  * Unified **Payments** and **Categories** with white header surfaces and subtle tabular layout.

---

## [2026-09-05] - Batch Device Intake, Continuous Scanner Flow & Serialized Model Fixes

### 🚀 New Features & Enhancements
* **Batch Device Intake Page (`BatchDeviceIntake.tsx`)**:
  * Multi-device serialized intake form with bulk storage, color, condition, cost/retail price, and supplier selection.
  * Continuous barcode scanner workflow: pressing Enter on IMEI inputs automatically triggers next row creation with active model inheritance.
  * Direct batch label printing and bulk IMEI paste support.
  * Filtered serialized model selector with instant inline quick-creation of new models.

---

## [2026-09-04] - Strict User & Branch Device Inventory Isolation (Zero Data Loss)

### 🚀 Security & Multi-Tenant Isolation
* **Strict User & Branch Device Inventory Isolation (`mysql.ts`, `inventory.ts`, `products.ts`, `invoices.ts`)**:
  * Added `user_id INT NULL` to `devices` table with non-destructive migration and foreign key to `users(id)`.
  * **Zero Data Loss Guarantee**: Safely backfilled historical devices from audit trails (`device_activity`) and active branch users so that 100% of existing inventory is preserved and accessible.
  * Dropped global unique constraint on `imei` to allow clean isolation per entity and added composite performance indexes (`business_id, branch_id, user_id` and `sku_id, user_id, status`).
  * Enforced strict user ownership (`user_id = req.userId` & `branch_id = req.user.branch_id`) across:
    * Device Inventory page (`GET /api/devices`)
    * Device search & IMEI lookup (`GET /api/devices/search`)
    * Device detail & notes (`GET /api/devices/:id`)
    * Serial products device breakdown (`GET /api/products/:skuId/devices`)
    * Cash register available device selector (`GET /api/products/:skuId/available-devices`)
    * Stats & CSV export (`GET /api/devices/stats`, `GET /api/devices/export-csv`)
* **UI Transparency & Ownership Verification (`DeviceInventory.tsx`, `SkuDeviceDetails.tsx`, `DeviceDetails.tsx`)**:
  * Added dedicated **Branch** and **Added By (Owner)** columns to Device Inventory and Serial Products tables.
  * Added Branch and Owner metadata to single Device Details view for clear auditability.

---

## [2026-09-03] - Batch Label Printing, Filter Standardization, Activity Logs & Announcements

### 🚀 New Features
* **Batch Barcode Label Printing for Inventory (`AddInventory.tsx`)**:
  * Added post-save **Success Summary & Batch Label Printing** hub after adding multiple serialized devices.
  * Single-click **"🖨️ Print All Labels"** action that renders all device labels formatted to printer settings (thermal/sheet) in one window.
  * Support for selective checkbox printing and inline single-label print actions.
* **Developer Announcements & Header Notification Bell (`NotificationBell.tsx`, `AdminPortal.tsx`)**:
  * Header notification bell with unread badge counter and category filter chips (`All`, `Features`, `Settings`).
  * "What's New" announcement popup banner attached under the product search bar with dismiss tracking.
  * Admin Portal `📢 Announcements` management tab for creating, editing, and broadcasting system announcements.
* **Popups & Notifications Management Tab (`GettingStarted.tsx`, `settings.ts`, `mysql.ts`, `App.tsx`)**:
  * Created a dedicated **Popups & Notifications** tab in the Getting Started settings page.
  * **Disabled by Default**: Startup cash balance prompt is now **disabled by default** so the system loads cleanly with zero popups or delay; users can explicitly opt-in to enable it.
  * Dual-layer persistence: immediate local zero-latency check (`localStorage`) plus database storage (`settings.startup_cash_popup`).
  * Styled strictly adhering to brand guidelines: exact **4px / 0.25rem** border radius (`rounded`), `#f8f9fa` header bars, white cards, and slate/emerald badges.
  * Added interactive **"Test / Open Starting Cash Modal"** preview button directly inside the tab.
  * Added toggle controls for **What's New feature popups**, **Daily End-of-Day register closing reminders**, **Low stock inventory alerts**, and **Barcode scan audio chimes**.
* **Enhanced IMEI / Serial Lifecycle Audit Trail (`inventory.ts`, `products.ts`, `reports.ts`)**:
  * Full audit trail for IMEI additions (including specs, PO number, branch), updates/spec changes, replacements, and deletions.
  * Consolidated single-product **Activity Log** tab uniting product modifications and individual IMEI histories.

### 🛠️ Bug Fixes & UX Enhancements
* **Responsive Book SVG & Full-Round Login Screen (`LoginPage.tsx`)**:
  * Implemented fully responsive viewport scaling across mobile (320px+), tablet, and desktop displays.
  * Added adaptive card padding (`p-5 sm:p-8 md:p-10`), fluid typography (`text-2xl sm:text-3xl`), and flexible math captcha badge.
  * Preserved 16px (`text-base`) input font size to prevent mobile browser auto-zoom on focus.
  * Added vertical scroll protection (`overflow-y-auto`, `py-6 sm:py-10`, `my-auto`) for mobile landscape and on-screen virtual keyboards.
  * Replaced top icon with custom open-book vector graphic with gradient cover and pill-shaped inputs (`rounded-full`).
* **Dependency Security Vulnerability Patch (`package.json`)**:
  * Resolved 3 nested vulnerabilities reported in `qs` / `body-parser` / `express` (array-limit bypass & DoS advisories).
  * Added clean dependency override targeting patched `qs@^6.16.0`.
  * Ran audit verification: **found 0 vulnerabilities**.
* **Repair Job Unquoted Payment & Quote Price Management (`inventory.ts`, `invoices.ts`, `RepairDetails.tsx`, `RepairUpdateModal.tsx`, `RepairList.tsx`)**:
  * Fixed bug where repair tickets created with no quote price (`€0.00`) were mistakenly displayed as "Fully Paid".
  * Fixed backend flaw where paying a deposit on an unquoted repair automatically auto-set the job status to `'completed'` (`invoices.ts` now strictly requires `total_quote > 0`).
  * Added ability for technicians to set/update the **Quote Price** post-diagnosis in `RepairDetails.tsx` (inline edit) and `RepairUpdateModal.tsx` (`💶 Quote Price` tab).
  * Automatically recalculates `remaining_balance = Math.max(0, total_quote - deposit_paid)` and dynamically reveals the **"Collect Payment"** button once a quote is entered.
  * Added **"Quote Pending"** and **"Deposit Paid (Quote Pending)"** status badges.
* **Activity Log `undefined` Value Fix**:
  * Normalized SQL queries with `COALESCE` fallbacks for `activity_type` and auto-generated `reference_link` (`/devices/:id` or `/products/:id`).
  * Added safety fallbacks in `ActivityReport.tsx`, `ProductDetails.tsx`, and `DeviceDetails.tsx`.
* **Senior Filter & Search Input Standardization**:
  * Added `autoComplete="off"`, `autoCorrect="off"`, and `spellCheck={false}` across all search inputs to eliminate ghost browser cache on refresh (`F5`).
  * Added single-click clear (`✕`) buttons on search inputs across all main views.
  * Added `Escape` key quick-reset handlers.
  * Added **"Reset Filters"** pill buttons on all list pages (`Products`, `Invoices`, `Customers`, `Device Inventory`, `Activity Report`, `Repairs`, `Purchase Orders`).
  * Eliminated background focus-stealing on data re-fetching in `InvoiceList` and `CustomerList`.
* **Stacking Context & Dropdown Layering**:
  * Elevated `<header>` to `z-[100]` and `NotificationBell` popup to `z-[99999]`.
  * Adjusted Cash Register search dropdown `z-index` so header menus always stay on top.
* **Product Details Header Right Sizing**:
  * Enlarged and branded selling price display (`text-3xl md:text-4xl font-extrabold`).
  * Enlarged `Manage` dropdown and `Products List` action buttons.

---

## [2026-09-02] - Activity Reporting & Multi-Branch Inventory Refinements

### 🚀 New Features & Enhancements
* **Unified Activity Report (`ActivityReport.tsx`, `reports.ts`)**:
  * Combined `activity_logs`, `invoice_activity`, `customer_activity`, `product_activity`, and `device_activity` into a single searchable report.
  * Filter by Date Range (`Today`, `Yesterday`, `Weekly`, `Monthly`, `Custom`), Activity Type, and User.
  * Export activity logs to CSV.
* **Barcode Scanner Navigation in Add Inventory (`AddInventory.tsx`)**:
  * Auto-advance on barcode scanner `Enter` key to next row or create a new row dynamically.
  * In-batch duplicate IMEI detection and database conflict prevention.

---

## [2026-09-01] - Printer Settings & Label Formatting

### 🚀 New Features & Enhancements
* **Custom Thermal Label Printer Settings (`GettingStarted.tsx`, `DeviceDetails.tsx`)**:
  * Configurable label dimensions (`57x32mm`, `32x57mm`, Custom), margins, typography, orientation (`Landscape`/`Portrait`), and barcode size.
  * High-density Code 128 barcode rendering with JsBarcode.
