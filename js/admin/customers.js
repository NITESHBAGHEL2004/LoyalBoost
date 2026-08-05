import { requireAuth } from '../core/auth.js';
import { api } from '../core/api.js';
import { mountShell } from './shell.js';
import { $, initials, formatDate, debounce, toast, openModal, closeModal, qsParam, whatsAppDirectLink } from '../core/utils.js';
import { renderWalletCard, renderCardQR, getPublicCardUrl } from '../customer/cardRender.js';
import { CONFIG } from '../core/config.js';

requireAuth('login.html');

let settings = {};
let state = { search: '', membership: '', page: 1, pageSize: 8 };

const custModal = $('#customer-modal-backdrop');
const cardModal = $('#card-modal-backdrop');

async function init() {
  settings = await mountShell('customers', 'Customers');

  $('#topbar-actions').innerHTML = `<button class="btn btn-primary" id="add-customer-btn">＋ Add Customer</button>`;
  $('#page-content').innerHTML = `
    <div class="glass section">
      <div class="toolbar">
        <input class="input" id="search-input" placeholder="Search name, mobile or customer ID…">
        <select class="select" id="membership-filter">
          <option value="">All memberships</option>
          <option>Bronze</option><option>Silver</option><option>Gold</option><option>Platinum</option><option>VIP</option>
        </select>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Customer</th><th>Mobile</th><th>Membership</th><th>Visits</th><th>Status</th><th>Joined</th><th></th>
            </tr>
          </thead>
          <tbody id="customer-rows"></tbody>
        </table>
      </div>
      <div id="empty-slot"></div>
      <div class="pagination" id="pagination"></div>
    </div>
  `;

  $('#add-customer-btn').addEventListener('click', () => openAddModal());
  $('#search-input').addEventListener('input', debounce((e) => { state.search = e.target.value; state.page = 1; loadList(); }, 300));
  $('#membership-filter').addEventListener('change', (e) => { state.membership = e.target.value; state.page = 1; loadList(); });
  $('#customer-modal-close').addEventListener('click', () => closeModal(custModal));
  $('#card-modal-close').addEventListener('click', () => closeModal(cardModal));
  $('#customer-form').addEventListener('submit', onSaveCustomer);

  if (qsParam('new') === '1') openAddModal();

  loadList();
}

async function loadList() {
  const tbody = $('#customer-rows');
  tbody.innerHTML = `<tr><td colspan="7"><div class="skeleton" style="height:20px;"></div></td></tr>`;
  try {
    const { customers, total, page, pageSize } = await api.listCustomers(state);
    renderRows(customers);
    renderPagination(total, page, pageSize);
  } catch (e) {
    toast(e.message || 'Could not load customers', 'error');
  }
}

function renderRows(customers) {
  const tbody = $('#customer-rows');
  const emptySlot = $('#empty-slot');
  if (!customers.length) {
    tbody.innerHTML = '';
    emptySlot.innerHTML = `<div class="empty-state"><div class="empty-icon">🗂️</div><p>No customers found. Try a different search, or add your first customer.</p></div>`;
    return;
  }
  emptySlot.innerHTML = '';
  tbody.innerHTML = customers.map(c => `
    <tr>
      <td>
        <div class="customer-cell">
          <div class="avatar">${initials(c.name)}</div>
          <div>
            <div class="name">${c.name}</div>
            <div class="sub">${c.customerId}</div>
          </div>
        </div>
      </td>
      <td>${c.mobile || '—'}</td>
      <td><span class="badge badge-${(c.membership || 'bronze').toLowerCase()}">${c.membership || 'Bronze'}</span></td>
      <td>${c.visitCount}/${c.requiredVisits}</td>
      <td>${statusBadge(c)}</td>
      <td>${formatDate(c.createdDate)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-icon btn-ghost" title="Add Visit" data-action="visit" data-id="${c.customerId}">＋</button>
          <button class="btn btn-icon btn-ghost" title="View Card" data-action="view" data-id="${c.customerId}">🪪</button>
          <button class="btn btn-icon btn-ghost" title="Send Card via WhatsApp" data-action="whatsapp" data-id="${c.customerId}">📤</button>
          <button class="btn btn-icon btn-ghost" title="Edit" data-action="edit" data-id="${c.customerId}">✎</button>
          <button class="btn btn-icon btn-danger" title="Delete" data-action="delete" data-id="${c.customerId}">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleRowAction(btn.dataset.action, btn.dataset.id));
  });
}

function statusBadge(c) {
  if (c.rewardStatus === 'pending') return `<span class="badge badge-warning">Reward Ready 🎉</span>`;
  if (c.visitCount >= c.requiredVisits - 1) return `<span class="badge badge-success">Almost there</span>`;
  return `<span class="badge" style="background:var(--surface-glass); color:var(--text-secondary);">Active</span>`;
}

function renderPagination(total, page, pageSize) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const wrap = $('#pagination');
  wrap.innerHTML = `
    <button class="btn btn-ghost btn-sm" id="prev-page" ${page <= 1 ? 'disabled' : ''}>← Prev</button>
    <span>Page ${page} of ${pages} · ${total} customers</span>
    <button class="btn btn-ghost btn-sm" id="next-page" ${page >= pages ? 'disabled' : ''}>Next →</button>
  `;
  $('#prev-page')?.addEventListener('click', () => { state.page--; loadList(); });
  $('#next-page')?.addEventListener('click', () => { state.page++; loadList(); });
}

async function handleRowAction(action, id) {
  if (action === 'edit') return openEditModal(id);
  if (action === 'view') return openCardModal(id);
  if (action === 'delete') return onDelete(id);
  if (action === 'visit') return onAddVisit(id);
  if (action === 'whatsapp') return sendCardViaWhatsApp(id);
}

function openAddModal() {
  $('#customer-modal-title').textContent = 'Add Customer';
  $('#customer-form').reset();
  $('#c-id').value = '';
  openModal(custModal);
}

async function openEditModal(id) {
  try {
    const c = await api.getCustomer(id);
    $('#customer-modal-title').textContent = 'Edit Customer';
    $('#c-id').value = c.customerId;
    $('#c-name').value = c.name;
    $('#c-mobile').value = c.mobile;
    $('#c-email').value = c.email || '';
    $('#c-dob').value = c.dob || '';
    $('#c-membership').value = c.membership || 'Bronze';
    $('#c-notes').value = c.notes || '';
    openModal(custModal);
  } catch (e) { toast(e.message, 'error'); }
}

async function onSaveCustomer(e) {
  e.preventDefault();
  const id = $('#c-id').value;
  const payload = {
    name: $('#c-name').value.trim(),
    mobile: $('#c-mobile').value.trim(),
    email: $('#c-email').value.trim(),
    dob: $('#c-dob').value,
    membership: $('#c-membership').value,
    notes: $('#c-notes').value.trim(),
  };
  try {
    if (id) {
      await api.updateCustomer(id, payload);
      toast('Customer updated', 'success');
      closeModal(custModal);
      loadList();
    } else {
      const created = await api.createCustomer(payload);
      toast('Customer added', 'success');
      closeModal(custModal);
      loadList();
      if (created.mobile) await openCardModal(created.customerId); // straight into "view card" so the card/QR + Send via WhatsApp button are one click away
    }
  } catch (e) { toast(e.message, 'error'); }
}

async function onDelete(id) {
  if (!confirm('Delete this customer? This cannot be undone.')) return;
  try {
    await api.deleteCustomer(id);
    toast('Customer deleted', 'success');
    loadList();
  } catch (e) { toast(e.message, 'error'); }
}

async function onAddVisit(id) {
  try {
    const res = await api.addVisit(id, settings.rewardName);
    toast(res.justCompleted ? '🎉 Reward unlocked for this customer!' : 'Visit added', 'success');
    loadList();
  } catch (e) { toast(e.message, 'error'); }
}

function buildCardMessage(customer) {
  const link = getPublicCardUrl(customer.qrId);
  const wave = '\u{1F44B}'; // 👋
  return `Hi ${customer.name}! ${wave} Here's your ${settings.businessName || 'loyalty'} card — you're at ${customer.visitCount}/${customer.requiredVisits} visits toward ${settings.rewardName}.\n\nView your card anytime here: ${link}`;
}

async function sendCardViaWhatsApp(id) {
  try {
    const c = await api.getCustomer(id);
    if (!c.mobile) {
      toast('This customer has no mobile number saved yet.', 'error');
      return;
    }
    const link = whatsAppDirectLink(c.mobile, buildCardMessage(c), CONFIG.DEFAULT_COUNTRY_CODE);
    window.open(link, '_blank');
  } catch (e) { toast(e.message, 'error'); }
}

async function openCardModal(id) {
  try {
    const c = await api.getCustomer(id);
    $('#card-modal-body').innerHTML = renderWalletCard(c, settings) + `
      <div style="display:flex; gap:10px; margin-top: var(--sp-5);">
        <a class="btn btn-ghost" style="flex:1;" href="../customer/card.html?qr=${encodeURIComponent(c.qrId)}" target="_blank">Open Public Card ↗</a>
        <button class="btn btn-primary" style="flex:1;" id="modal-send-whatsapp">📤 Send via WhatsApp</button>
      </div>`;
    openModal(cardModal);
    renderCardQR($('#wc-qr'), c.qrId);
    $('#modal-send-whatsapp').addEventListener('click', () => sendCardViaWhatsApp(c.customerId));
  } catch (e) { toast(e.message, 'error'); }
}

init();
