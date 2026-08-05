# LoyalBoost — Backend Setup (Google Apps Script + Sheets)

The whole backend is one file, `Code.gs`, deployed as a Web App. No server, no hosting bill.

## 1. Create the Google Sheet
1. Go to [sheets.new](https://sheets.new) and create a new spreadsheet.
2. Rename it, e.g. **LoyalBoost Database**.

## 2. Add the script
1. In the sheet: **Extensions → Apps Script**.
2. Delete the default `Code.gs` content and paste in this folder's `Code.gs`.
3. Save (Ctrl/Cmd+S).

## 3. Run one-time setup
1. In the Apps Script toolbar, select the function dropdown → choose **setupSheets**.
2. Click **Run**. Grant the permissions it asks for (it only touches this spreadsheet).
3. This creates the `Customers`, `Coupons`, `Admin`, and `Settings` tabs. Each customer is a single row — visit history is stored right inside that row (a `VisitHistory` column), so nothing is spread across a separate growing log table. A default login is created:
   - **Username:** `admin`
   - **Password:** `ChangeMe123`
   - Open the `Admin` tab and change this password right away.

## 4. Deploy as a Web App
1. Click **Deploy → New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Click **Deploy**, authorize again if prompted.
6. Copy the **Web app URL** (ends in `/exec`).

## 5. Connect the frontend
Open the app, go to **Admin → Business Settings → Data & Connection**, and paste:
- The **Web app URL** from step 4 into "Google Apps Script Web App URL"
- Your spreadsheet's URL (from the browser address bar) into "Google Sheet Link"

Click **Save Connection**. The page reloads and the status badge switches to "● Connected to Google Sheets" — every page (login, dashboard, customers, settings, the public card) now reads and writes the Google Sheet instead of the local demo data. The "Open Google Sheet ↗" button on that same panel jumps straight to your data anytime.

(Alternatively, you can hard-code the URL in `js/core/config.js` → `CONFIG.APPS_SCRIPT_URL` — useful for a fixed deployment. A value saved from the Settings panel always takes priority over it.)

## Notes & limits
- **Redeploy after edits.** Apps Script Web Apps only pick up code changes when you create a **new deployment version** (Deploy → Manage deployments → Edit → New version) or redeploy.
- **Auth is intentionally simple** — a username/password row checked against the `Admin` sheet, with a short-lived token cached server-side. Good for a single-admin small-business tool; if you need multiple staff logins or stronger security, that's the natural place to extend (e.g. hashed passwords, per-staff rows, rate limiting).
- **Quotas**: Apps Script Web Apps have Google's standard quotas (executions/day, ~6 min per execution). Perfectly fine for a single local business; if you outgrow it, this is designed to be swapped for Firebase/Supabase later — only `js/core/api.js` needs to change.
- **QR codes** are generated client-side (QRCode.js via CDN) and simply encode a link to `customer/card.html?qr=<QRID>` — nothing to host or generate server-side.
