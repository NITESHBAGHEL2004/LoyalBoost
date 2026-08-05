// ---------------------------------------------------------
// shell.js — renders the sidebar/topbar chrome shared by every
// admin page, wires up logout + mobile menu toggle, and applies
// the saved business theme so the whole shell reflects the brand.
// ---------------------------------------------------------

import { $, initials } from '../core/utils.js';
import { logout } from '../core/auth.js';
import { applyTheme } from '../core/theme.js';
import { api } from '../core/api.js';

const NAV_ITEMS = [
  { key: 'dashboard', href: 'dashboard.html', icon: '▦', label: 'Dashboard' },
  { key: 'customers', href: 'customers.html', icon: '☺', label: 'Customers' },
  { key: 'settings',  href: 'settings.html',  icon: '⚙', label: 'Business Settings' },
];

export async function mountShell(activeKey, pageTitle) {
  const shell = document.querySelector('#app-shell');
  shell.innerHTML = `
    <aside class="sidebar glass" id="sidebar">
      <div class="brand">
        <div class="mark">LB</div>
        <div>
          <div class="name">LoyalBoost</div>
          <div class="biz" id="biz-name">Loading…</div>
        </div>
      </div>
      <nav class="nav-group">
        ${NAV_ITEMS.map(i => `
          <a class="nav-link ${i.key === activeKey ? 'active' : ''}" href="${i.href}">
            <span class="ic">${i.icon}</span> ${i.label}
          </a>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <button class="btn btn-ghost" id="logout-btn" style="width:100%;">⎋ Logout</button>
      </div>
    </aside>
    <main class="main">
      <div class="topbar">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-icon btn-ghost menu-toggle" id="menu-toggle" aria-label="Toggle menu">☰</button>
          <h1>${pageTitle}</h1>
        </div>
        <div class="actions" id="topbar-actions"></div>
      </div>
      <div id="page-content"></div>
    </main>
  `;

  $('#logout-btn').addEventListener('click', () => logout());
  $('#menu-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  try {
    const settings = await api.getSettings();
    applyTheme(settings);
    $('#biz-name').textContent = settings.businessName || 'Your Business';
    return settings;
  } catch (e) {
    $('#biz-name').textContent = 'Your Business';
    return {};
  }
}
