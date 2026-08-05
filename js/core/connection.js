// ---------------------------------------------------------
// connection.js — the backend connection now comes ONLY from
// js/core/config.js (CONFIG.APPS_SCRIPT_URL / CONFIG.SHEET_URL).
//
// Earlier this was saved from the Settings UI into this browser's
// localStorage. That caused two problems:
//   1) It looked "not permanent" — a new browser/incognito/another
//      device (e.g. redeploying, or clearing site data) lost it,
//      so it seemed like you had to "demo login then reconnect"
//      every time.
//   2) It broke WhatsApp card sharing — the customer's phone never
//      had that localStorage value, so their browser silently fell
//      back to Demo Mode and couldn't find the real customer ->
//      "Card not found".
//
// Fix: hardcode the URL once in config.js. Every device (admin's
// browser AND the customer's phone) then reads the exact same
// value straight from the code, so it always works and never
// needs to be re-entered.
// ---------------------------------------------------------

import { CONFIG } from './config.js';

export function getConnection() {
  return {
    appsScriptUrl: CONFIG.APPS_SCRIPT_URL || '',
    sheetUrl: CONFIG.SHEET_URL || '',
  };
}

export function isConnected() {
  const { appsScriptUrl } = getConnection();
  return !!appsScriptUrl && !appsScriptUrl.includes('PASTE_YOUR_APPS_SCRIPT');
}
