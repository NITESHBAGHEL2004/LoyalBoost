import { requireAuth } from '../core/auth.js';
import { api } from '../core/api.js';
import { mountShell } from './shell.js';
import { $, el, formatDate, initials, toast } from '../core/utils.js';

requireAuth('login.html');

const content = () => $('#page-content');
const actionsBar = () => $('#topbar-actions');

async function init() {
  await mountShell('dashboard', 'Dashboard');

  actionsBar().innerHTML = `<a class="btn btn-primary" href="customers.html?new=1">＋ Add Customer</a>`;

  content().innerHTML = `
    <div class="grid-stats" id="stats-grid">
      ${['Total Customers','Today\'s Visits','Pending Rewards','Rewards Redeemed'].map(label => `
        <div class="glass stat-card">
          <div class="stat-label">${label}</div>
          <div class="stat-value skeleton" style="width:60px;height:28px;">&nbsp;</div>
        </div>`).join('')}
    </div>

    <div class="grid-2">
      <div class="glass section">
        <div class="section-head">
          <h2>Recent Customers</h2>
          <a href="customers.html" class="btn btn-ghost btn-sm">View all</a>
        </div>
        <div id="recent-list"></div>
      </div>

      <div class="glass section">
        <h2>Quick Actions</h2>
        <div style="display:flex; flex-direction:column; gap: 10px; margin-top: var(--sp-3);">
          <a class="btn btn-ghost" href="customers.html?new=1">＋ Add Customer</a>
          <a class="btn btn-ghost" href="customers.html">☺ Customer List</a>
          <a class="btn btn-ghost" href="settings.html">⚙ Business Settings</a>
          <a class="btn btn-ghost" href="customers.html">🎁 Reward Management</a>
        </div>
      </div>
    </div>
  `;

  try {
    const stats = await api.getDashboardStats();
    renderStats(stats);
    renderRecent(stats.recentCustomers || []);
  } catch (e) {
    toast(e.message || 'Could not load dashboard stats', 'error');
  }
}

function renderStats(stats) {
  const cards = [
    { label: 'Total Customers', value: stats.totalCustomers, delta: `+${stats.monthlyGrowth} this month`, up: true },
    { label: "Today's Visits", value: stats.todayVisits },
    { label: 'Pending Rewards', value: stats.pendingRewards },
    { label: 'Rewards Redeemed', value: stats.rewardsRedeemed },
  ];
  $('#stats-grid').innerHTML = cards.map(c => `
    <div class="glass stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${c.value ?? 0}</div>
      ${c.delta ? `<div class="stat-delta ${c.up ? 'up' : ''}">${c.delta}</div>` : ''}
    </div>
  `).join('');
}

function renderRecent(customers) {
  const wrap = $('#recent-list');
  if (!customers.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">🗂️</div><p>No customers yet — add your first one to see them here.</p></div>`;
    return;
  }
  wrap.innerHTML = customers.map(c => `
    <div class="customer-cell" style="padding: 10px 0; border-bottom: 1px solid var(--border-hairline);">
      <div class="avatar">${initials(c.name)}</div>
      <div>
        <div class="name">${c.name}</div>
        <div class="sub">${c.customerId} · Joined ${formatDate(c.createdDate)}</div>
      </div>
    </div>
  `).join('');
}

init();
