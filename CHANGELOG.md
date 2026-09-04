# POS System - Daily Updates & Changelog

This document tracks all features, architectural enhancements, bug fixes, and UX improvements made to the EPOS application.

---

## [2026-09-04] - Stable Release Alignment & Production Bundle (Commit 9aa20416)

### 🚀 Production Deployment
* **Restore Exact Release State (`9aa20416`)**:
  * Reverted multi-tenant device inventory changes to restore the exact verified state of commit `9aa20416`.
  * Verified full source code integrity across all components, routes, and database schemas.
  * Re-compiled production bundle (`vite build` + `esbuild`) to package `dist/` and `server.js` for immediate deployment to Hostinger without runtime build overhead.

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
