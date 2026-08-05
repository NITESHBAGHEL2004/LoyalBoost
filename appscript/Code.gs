/**
 * LoyalBoost — Apps Script backend
 * -------------------------------------------------------
 * Deploy this as a Web App (Execute as: Me, Access: Anyone)
 * bound to a Google Sheet. Run setupSheets() once from the
 * script editor before first use — it creates every tab,
 * headers, a default Admin user and default Settings.
 *
 * Every request is a POST with a JSON body:
 *   { action: "listCustomers", token: "...", ...params }
 * Every response is JSON:
 *   { ok: true, data: ... }  or  { ok:false, error:"..." }
 *
 * Action names and payload shapes match js/core/mock.js
 * exactly, so the frontend needs zero changes when you point
 * CONFIG.APPS_SCRIPT_URL at this deployment.
 * ------------------------------------------------------- */

const SHEET_CUSTOMERS = 'Customers';
const SHEET_SETTINGS = 'Settings';
const SHEET_COUPONS = 'Coupons';
const SHEET_ADMIN = 'Admin';

// One row per customer, always updated in place. VisitHistory holds every
// visit as a JSON array string in a single cell — e.g.
//   [{"date":"2026-08-01T10:00:00.000Z","service":"Hair Cut"}, ...]
// so nothing about a customer is ever spread across multiple rows/sheets.
const CUSTOMER_HEADERS = ['CustomerID','Name','Photo','Mobile','Email','DOB','Membership','Notes','VisitCount','RequiredVisits','RewardStatus','QRID','CreatedDate','LastVisit','RewardRedeemed','VisitHistory'];
const COUPON_HEADERS = ['Code','CustomerID','Status','CreatedDate','RedeemedDate','RewardText'];
const ADMIN_HEADERS = ['Username','Password'];
const SETTINGS_KEYS = ['businessName','logo','category','primaryColor','accentColor','rewardName','rewardDescription','requiredVisits','phone','address','website','social'];

// ============================================================
// Entry points
// ============================================================
function doPost(e) {
  return handle(e);
}
function doGet(e) {
  return handle(e); // convenience: also accept GET with ?action=... for quick testing
}

function handle(e) {
  let body = {};
  try {
    if (e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    else body = e.parameter || {};
  } catch (err) {
    return respond({ ok: false, error: 'Invalid request body' });
  }

  const action = body.action;
  const PUBLIC_ACTIONS = ['login', 'getPublicCard'];

  try {
    if (!PUBLIC_ACTIONS.includes(action) && !verifyToken(body.token)) {
      throw new Error('Not authenticated. Please sign in again.');
    }
    const data = route(action, body);
    return respond({ ok: true, data: data });
  } catch (err) {
    return respond({ ok: false, error: err.message || String(err) });
  }
}

function route(action, body) {
  switch (action) {
    case 'login': return actionLogin(body.username, body.password);
    case 'getSettings': return actionGetSettings();
    case 'saveSettings': return actionSaveSettings(body.settings);
    case 'getDashboardStats': return actionDashboardStats();
    case 'listCustomers': return actionListCustomers(body);
    case 'getCustomer': return actionGetCustomer(body.customerId);
    case 'createCustomer': return actionCreateCustomer(body.customer);
    case 'updateCustomer': return actionUpdateCustomer(body.customerId, body.updates);
    case 'deleteCustomer': return actionDeleteCustomer(body.customerId);
    case 'addVisit': return actionAddVisit(body.customerId, body.service);
    case 'getVisitHistory': return actionVisitHistory(body.customerId);
    case 'redeemCoupon': return actionRedeemCoupon(body.couponCode);
    case 'scratchReward': return actionScratchReward();
    case 'getPublicCard': return actionGetPublicCard(body.qrId);
    default: throw new Error('Unknown action: ' + action);
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// Auth
// ============================================================
function actionLogin(username, password) {
  const rows = sheetToObjects(SHEET_ADMIN);
  const match = rows.find(r => r.Username === username && String(r.Password) === String(password));
  if (!match) throw new Error('Invalid username or password');
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('token_' + token, username, 6 * 60 * 60); // 6h session
  return { token: token };
}

function verifyToken(token) {
  if (!token) return false;
  return !!CacheService.getScriptCache().get('token_' + token);
}

// ============================================================
// Settings
// ============================================================
function actionGetSettings() {
  const sheet = getSheet(SHEET_SETTINGS);
  const rows = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < rows.length; i++) settings[rows[i][0]] = rows[i][1];
  settings.requiredVisits = Number(settings.requiredVisits) || 8;
  return settings;
}

function actionSaveSettings(settings) {
  const sheet = getSheet(SHEET_SETTINGS);
  const rows = sheet.getDataRange().getValues();
  const keyRow = {};
  for (let i = 1; i < rows.length; i++) keyRow[rows[i][0]] = i + 1;

  SETTINGS_KEYS.forEach(key => {
    if (!(key in settings)) return;
    const value = safeCellValue(settings[key]);
    if (keyRow[key]) sheet.getRange(keyRow[key], 2).setValue(value);
    else sheet.appendRow([key, value]);
  });
  return actionGetSettings();
}

// ============================================================
// Dashboard
// ============================================================
function actionDashboardStats() {
  const customers = sheetToObjects(SHEET_CUSTOMERS);
  const coupons = sheetToObjects(SHEET_COUPONS);
  const todayStr = new Date().toDateString();

  let todayVisits = 0;
  customers.forEach(c => {
    parseVisitHistory(c.VisitHistory).forEach(v => {
      if (new Date(v.date).toDateString() === todayStr) todayVisits++;
    });
  });

  const pending = customers.filter(c => c.RewardStatus === 'pending').length;
  const redeemed = coupons.filter(c => c.Status === 'Redeemed').length;
  const monthAgo = Date.now() - 30 * 86400000;
  const growth = customers.filter(c => new Date(c.CreatedDate).getTime() > monthAgo).length;

  const recent = customers
    .sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate))
    .slice(0, 5)
    .map(mapCustomerOut);

  return {
    totalCustomers: customers.length,
    todayVisits: todayVisits,
    pendingRewards: pending,
    rewardsRedeemed: redeemed,
    monthlyGrowth: growth,
    recentCustomers: recent,
  };
}

// ============================================================
// Customers
// ============================================================
function actionListCustomers(params) {
  let customers = sheetToObjects(SHEET_CUSTOMERS).map(mapCustomerOut);
  const search = (params.search || '').toLowerCase();
  if (search) {
    customers = customers.filter(c =>
      c.name.toLowerCase().includes(search) ||
      String(c.mobile).includes(search) ||
      c.customerId.toLowerCase().includes(search));
  }
  if (params.membership) customers = customers.filter(c => c.membership === params.membership);
  customers.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 8;
  const total = customers.length;
  const start = (page - 1) * pageSize;
  return { customers: customers.slice(start, start + pageSize), total: total, page: page, pageSize: pageSize };
}

function actionGetCustomer(customerId) {
  const row = findRow(SHEET_CUSTOMERS, 'CustomerID', customerId);
  if (!row) throw new Error('Customer not found');
  return mapCustomerOut(row.obj);
}

function actionCreateCustomer(customer) {
  const settings = actionGetSettings();
  const sheet = getSheet(SHEET_CUSTOMERS);
  const id = nextCustomerId();
  const now = new Date().toISOString();
  const qrId = 'QR-' + Utilities.getUuid().slice(0, 8).toUpperCase();

  const row = [
    id, customer.name || '', customer.photo || '', customer.mobile || '', customer.email || '',
    customer.dob || '', customer.membership || 'Bronze', customer.notes || '',
    0, settings.requiredVisits || 8, 'none', qrId, now, '', false, '[]',
  ].map(safeCellValue);
  sheet.appendRow(row);
  return actionGetCustomer(id);
}

function actionUpdateCustomer(customerId, updates) {
  const found = findRow(SHEET_CUSTOMERS, 'CustomerID', customerId);
  if (!found) throw new Error('Customer not found');
  const sheet = getSheet(SHEET_CUSTOMERS);
  const fieldMap = { name:'Name', photo:'Photo', mobile:'Mobile', email:'Email', dob:'DOB', membership:'Membership', notes:'Notes' };
  Object.keys(updates || {}).forEach(key => {
    const col = fieldMap[key];
    if (!col) return;
    const colIndex = CUSTOMER_HEADERS.indexOf(col) + 1;
    sheet.getRange(found.rowIndex, colIndex).setValue(safeCellValue(updates[key]));
  });
  return actionGetCustomer(customerId);
}

function actionDeleteCustomer(customerId) {
  const found = findRow(SHEET_CUSTOMERS, 'CustomerID', customerId);
  if (!found) throw new Error('Customer not found');
  getSheet(SHEET_CUSTOMERS).deleteRow(found.rowIndex);
  return { deleted: true };
}

// ============================================================
// Visits & rewards
// ============================================================
function actionAddVisit(customerId, service) {
  const found = findRow(SHEET_CUSTOMERS, 'CustomerID', customerId);
  if (!found) throw new Error('Customer not found');
  const sheet = getSheet(SHEET_CUSTOMERS);
  const settings = actionGetSettings();
  const now = new Date().toISOString();

  let visitCount = Number(found.obj.VisitCount) + 1;
  const required = Number(found.obj.RequiredVisits) || settings.requiredVisits || 8;

  const history = parseVisitHistory(found.obj.VisitHistory);
  history.push({ date: now, service: service || settings.rewardName });

  let justCompleted = false;
  let coupon = null;
  let rewardStatus = found.obj.RewardStatus;

  if (visitCount >= required) {
    justCompleted = true;
    rewardStatus = 'pending';
    const code = (settings.category || 'REWARD').toUpperCase() + '-' + new Date().getFullYear() + '-' + Utilities.getUuid().slice(0, 4).toUpperCase();
    getSheet(SHEET_COUPONS).appendRow([code, customerId, 'Unused', now, '', settings.rewardName].map(safeCellValue));
    coupon = { code: code, customerId: customerId, status: 'Unused', createdDate: now, redeemedDate: '', rewardText: settings.rewardName };
    visitCount = 0; // reset stamp cycle
  }

  const colIndexOf = (name) => CUSTOMER_HEADERS.indexOf(name) + 1;
  sheet.getRange(found.rowIndex, colIndexOf('VisitCount')).setValue(visitCount);
  sheet.getRange(found.rowIndex, colIndexOf('LastVisit')).setValue(now);
  sheet.getRange(found.rowIndex, colIndexOf('RewardStatus')).setValue(rewardStatus);
  sheet.getRange(found.rowIndex, colIndexOf('VisitHistory')).setValue(safeCellValue(JSON.stringify(history)));

  return { customer: actionGetCustomer(customerId), justCompleted: justCompleted, coupon: coupon };
}

function actionVisitHistory(customerId) {
  const found = findRow(SHEET_CUSTOMERS, 'CustomerID', customerId);
  if (!found) return [];
  return parseVisitHistory(found.obj.VisitHistory).sort((a, b) => new Date(b.date) - new Date(a.date));
}

/** Safely parses the VisitHistory JSON cell; tolerates blank/malformed cells. */
function parseVisitHistory(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function actionRedeemCoupon(code) {
  const found = findRow(SHEET_COUPONS, 'Code', code);
  if (!found) throw new Error('Coupon not found');
  if (found.obj.Status === 'Redeemed') throw new Error('Coupon already redeemed');
  const sheet = getSheet(SHEET_COUPONS);
  const now = new Date().toISOString();
  sheet.getRange(found.rowIndex, COUPON_HEADERS.indexOf('Status') + 1).setValue('Redeemed');
  sheet.getRange(found.rowIndex, COUPON_HEADERS.indexOf('RedeemedDate') + 1).setValue(now);

  const custFound = findRow(SHEET_CUSTOMERS, 'CustomerID', found.obj.CustomerID);
  if (custFound) {
    const custSheet = getSheet(SHEET_CUSTOMERS);
    custSheet.getRange(custFound.rowIndex, CUSTOMER_HEADERS.indexOf('RewardStatus') + 1).setValue('none');
    custSheet.getRange(custFound.rowIndex, CUSTOMER_HEADERS.indexOf('RewardRedeemed') + 1).setValue(true);
  }
  return { code: code, status: 'Redeemed', redeemedDate: now };
}

function actionScratchReward() {
  const prizes = ['10% OFF', '20% OFF', 'Free Add-on', 'Free Beverage', 'Better Luck Next Time'];
  return { prize: prizes[Math.floor(Math.random() * prizes.length)] };
}

// ============================================================
// Public card (QR scan — no auth)
// ============================================================
function actionGetPublicCard(qrId) {
  const rows = sheetToObjects(SHEET_CUSTOMERS);
  const match = rows.find(c => c.QRID === qrId || c.CustomerID === qrId);
  if (!match) throw new Error('Card not found');
  const customer = mapCustomerOut(match);
  const settings = actionGetSettings();
  const coupons = sheetToObjects(SHEET_COUPONS).filter(c => c.CustomerID === customer.customerId);
  const openCoupon = coupons.find(c => c.Status === 'Unused');
  const history = parseVisitHistory(match.VisitHistory).sort((a, b) => new Date(b.date) - new Date(a.date));
  return {
    customer: customer,
    settings: settings,
    coupon: openCoupon ? { code: openCoupon.Code, customerId: openCoupon.CustomerID, status: openCoupon.Status, createdDate: openCoupon.CreatedDate, redeemedDate: openCoupon.RedeemedDate, rewardText: openCoupon.RewardText } : null,
    history: history,
  };
}

// ============================================================
// Helpers
// ============================================================
function mapCustomerOut(row) {
  return {
    customerId: row.CustomerID,
    name: row.Name,
    photo: row.Photo,
    mobile: row.Mobile,
    email: row.Email,
    dob: row.DOB,
    membership: row.Membership,
    notes: row.Notes,
    visitCount: Number(row.VisitCount) || 0,
    requiredVisits: Number(row.RequiredVisits) || 8,
    rewardStatus: row.RewardStatus,
    qrId: row.QRID,
    createdDate: row.CreatedDate,
    lastVisit: row.LastVisit,
    rewardRedeemed: row.RewardRedeemed,
  };
}

function nextCustomerId() {
  const props = PropertiesService.getScriptProperties();
  let seq = Number(props.getProperty('customerSeq') || '0') + 1;
  props.setProperty('customerSeq', String(seq));
  return 'LB' + String(seq).padStart(5, '0');
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" is missing. Run setupSheets() first.');
  return sheet;
}

function sheetToObjects(name) {
  const sheet = getSheet(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(r => r[0] !== '').map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

function findRow(sheetName, key, value) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colIndex = headers.indexOf(key);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][colIndex]) === String(value)) {
      const obj = {};
      headers.forEach((h, j) => obj[h] = values[i][j]);
      return { rowIndex: i + 1, obj: obj };
    }
  }
  return null;
}

/** Safe cell string truncation to prevent Google Sheets 50,000 char cell limit error */
function safeCellValue(val) {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (str.length > 49000) {
    return str.slice(0, 49000);
  }
  return val;
}

// ============================================================
// One-time setup — run this manually from the script editor
// ============================================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheetWithHeaders(ss, SHEET_CUSTOMERS, CUSTOMER_HEADERS);
  ensureSheetWithHeaders(ss, SHEET_COUPONS, COUPON_HEADERS);
  ensureSheetWithHeaders(ss, SHEET_ADMIN, ADMIN_HEADERS);

  const adminSheet = ss.getSheetByName(SHEET_ADMIN);
  if (adminSheet.getLastRow() < 2) {
    adminSheet.appendRow(['admin', 'ChangeMe123']); // ⚠️ change this password after first login
  }

  let settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_SETTINGS);
    settingsSheet.appendRow(['Key', 'Value']);
    const defaults = {
      businessName: 'My Business', logo: '', category: 'salon',
      primaryColor: '#6D5DFB', accentColor: '#00C2D1',
      rewardName: 'Free Reward', rewardDescription: 'Complete your card to unlock this reward.',
      requiredVisits: 8, phone: '', address: '', website: '', social: '',
    };
    Object.keys(defaults).forEach(k => settingsSheet.appendRow([k, defaults[k]]));
  }

  SpreadsheetApp.flush();
  Logger.log('Setup complete. Default admin login: admin / ChangeMe123 — change this immediately.');
}

function ensureSheetWithHeaders(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}
