// ---------------------------------------------------------
// api.js — single gateway to the backend.
//
// Real mode:  every call is a POST to the deployed Apps Script
//             Web App, which reads/writes the Google Sheet.
// Demo mode:  if CONFIG.APPS_SCRIPT_URL hasn't been set yet,
//             calls are transparently routed to mock.js so the
//             whole product (login, customers, stamps, rewards)
//             can be explored/demoed with zero setup.
// ---------------------------------------------------------

import { CONFIG } from './config.js';
import { mockApi } from './mock.js';
import { getToken } from './auth.js';
import { getConnection, isConnected } from './connection.js';

const isDemo = () => !isConnected();

async function callBackend(action, payload = {}) {
  const { appsScriptUrl } = getConnection();
  const body = { action, token: getToken(), ...payload };
  const res = await fetch(appsScriptUrl, {
    method: 'POST',
    // text/plain avoids a CORS preflight against Apps Script, which only
    // handles simple requests well.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Network error (${res.status})`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Request failed');
  return json.data;
}

async function call(action, payload = {}) {
  if (isDemo()) return mockApi(action, payload);
  return callBackend(action, payload);
}

export const api = {
  isDemo,

  login: (username, password) => call('login', { username, password }),

  getSettings: () => call('getSettings'),
  saveSettings: (settings) => call('saveSettings', { settings }),

  getDashboardStats: () => call('getDashboardStats'),

  listCustomers: (params = {}) => call('listCustomers', params),
  getCustomer: (customerId) => call('getCustomer', { customerId }),
  createCustomer: (customer) => call('createCustomer', { customer }),
  updateCustomer: (customerId, updates) => call('updateCustomer', { customerId, updates }),
  deleteCustomer: (customerId) => call('deleteCustomer', { customerId }),

  addVisit: (customerId, service) => call('addVisit', { customerId, service }),
  getVisitHistory: (customerId) => call('getVisitHistory', { customerId }),

  redeemCoupon: (couponCode) => call('redeemCoupon', { couponCode }),
  scratchReward: (customerId) => call('scratchReward', { customerId }),

  // Public — no auth required, used by the customer card page (QR scan)
  getPublicCard: (qrId) => call('getPublicCard', { qrId }),
};
