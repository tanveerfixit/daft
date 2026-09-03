# Project Guidelines & Safety Rules

## ⚠️ CRITICAL DATABASE RULES

1. **NEVER DELETE THE DATABASE OR TABLES**:
   - Do NOT run `DROP DATABASE`, `DROP TABLE`, `TRUNCATE TABLE`, or any command that deletes existing tables or wipe out database records.
   - Preserving existing database data and schema is strictly required at all times.

2. **ALWAYS CONFIRM BEFORE CREATING OR MODIFYING TABLES**:
   - Before creating any new database tables or executing schema migrations/modifications, you MUST first confirm with the user.
   - State the table name, schema definition, and purpose, and obtain explicit confirmation before creating it.

---

## 🔄 AUTO-REFRESH & SMOOTH UI RULES

1. **ALL PAGES MUST AUTO-REFRESH DATA WHEN LOADED / ACTIVATED**:
   - Whenever any page, tab, or view is navigated to or activated, it MUST automatically refresh its data in the background from the API so users never have to refresh manually.

2. **DO NOT BLINK OR FLICKER THE PAGE**:
   - Data refreshing must be smooth and silent in the background.
   - Do NOT unmount components, wipe out existing data from view, or show jarring full-screen loading spinners during background refreshes.
   - Keep current data displayed while fresh data is retrieved and updated seamlessly in place.

---

## 🛠️ Tech Stack & Environment
- **Backend / API**: Express.js with TypeScript (`server.ts`) / Node.js
- **Database**: MySQL 8.x / MariaDB (`mysql2/promise`)
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Dev Server**: `npm run dev` (starts backend + Vite middleware on `http://localhost:3000`)

---

## 📝 CHANGELOG & VERSION MEMORY
- Maintain `CHANGELOG.md` in the project root.
- Document every major feature release, bug fix, and UI/UX optimization under the current date.

---

## 🔒 GIT COMMIT SAFETY
- Do NOT perform git commits or pushes until explicitly instructed by the user.
