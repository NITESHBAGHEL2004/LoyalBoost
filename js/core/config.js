// ---------------------------------------------------------
// config.js — the ONE place you need to edit after deploying
// the Apps Script backend (see /appscript/README.md).
//
// Both values below are permanent and code-level: they work the
// same way on every device (admin's laptop, admin's phone, AND
// every customer's phone that opens a WhatsApp card link) because
// they ship inside the code itself instead of being saved into
// one browser's localStorage.
// ---------------------------------------------------------

export const CONFIG = {
  // Paste the "Web app" URL you get after deploying appscript/Code.gs
  // (Deploy → New deployment → Web app → copy the URL ending in /exec).
  // Example: "https://script.google.com/macros/s/AKfycb.../exec"
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx2eZLkUwg9Gw2tGhwd7VdDf1YRSR7Ncy6-zZ9zNzfjZHhxKbCChwQ7IYpO9d1BtNlMDA/exec',

  // Optional: your Google Sheet's own URL, only used for the
  // "Open Google Sheet ↗" convenience link in Settings.
  // Example: "https://docs.google.com/spreadsheets/d/XXXXXXXX/edit"
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/1KZ7wbMiDVMW8O_ivQnFv0tFlC3rV_OA_X5IDFAsmQYk/edit?usp=sharing',

  // Shown while APPS_SCRIPT_URL is still the placeholder above —
  // lets you preview the UI locally before deploying the backend.
  // Once APPS_SCRIPT_URL is set, this has no effect: the app always
  // talks to your real Google Sheet.
  DEMO_MODE_FALLBACK: true,

  APP_NAME: 'LoyalBoost',

  // Used to auto-prefix customer mobile numbers that were saved without a
  // country code, so "Send via WhatsApp" always opens the right chat.
  // Change to your country's code, e.g. '1' for US/Canada, '44' for UK.
  DEFAULT_COUNTRY_CODE: '91',
};
