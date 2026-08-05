import { requireAuth } from '../core/auth.js';
import { api } from '../core/api.js';
import { mountShell } from './shell.js';
import { $, $$, toast, compressImageFile } from '../core/utils.js';
import { CATEGORIES, CATEGORY_THEME } from '../core/icons.js';
import { applyTheme } from '../core/theme.js';
import { getConnection, isConnected } from '../core/connection.js';

requireAuth('login.html');

let selectedCategory = 'other';
let logoDataUrl = '';

const SWATCHES = ['#6D5DFB', '#00C2D1', '#FF6FA5', '#FF7847', '#3FBFA6', '#2ED47A', '#F6C453', '#3AA0FF'];

function initConnectionPanel() {
  const conn = getConnection();
  refreshConnectionStatus();
  updateOpenSheetLink(conn.sheetUrl);
}

function refreshConnectionStatus() {
  const badge = $('#connection-status');
  if (isConnected()) {
    badge.textContent = '● Connected to Google Sheets';
    badge.className = 'badge badge-success';
  } else {
    badge.textContent = '● Demo Mode (local data only)';
    badge.className = 'badge badge-warning';
  }
}

function updateOpenSheetLink(sheetUrl) {
  const link = $('#conn-open-sheet');
  if (sheetUrl) {
    link.href = sheetUrl;
    link.classList.remove('btn-disabled');
    link.removeAttribute('aria-disabled');
  } else {
    link.href = '#';
    link.setAttribute('aria-disabled', 'true');
  }
}

async function init() {
  const settings = await mountShell('settings', 'Business Settings');
  selectedCategory = settings.category || 'other';
  logoDataUrl = settings.logo || '';

  $('#topbar-actions').innerHTML = `<button class="btn btn-primary" id="save-btn">Save Changes</button>`;

  $('#page-content').innerHTML = `
    <div class="glass section" id="connection-section">
      <div class="section-head">
        <div>
          <h2>Data & Connection</h2>
          <p style="margin:-4px 0 0;">Where LoyalBoost saves your customers, visits, and rewards.</p>
        </div>
        <span class="badge" id="connection-status"></span>
      </div>

      <p style="margin: 0 0 var(--sp-4); font-size: var(--fs-sm);">
        The backend connection is now set permanently in code (<code>js/core/config.js</code> → <code>CONFIG.APPS_SCRIPT_URL</code>) instead of being saved per-browser here. This is what makes it work every time — for you and for every customer who opens a card link on their own phone.
      </p>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <a class="btn btn-ghost" id="conn-open-sheet" href="#" target="_blank" rel="noopener">Open Google Sheet ↗</a>
        <a class="btn btn-ghost" href="https://docs.google.com/spreadsheets/create" target="_blank" rel="noopener">Create New Sheet ↗</a>
      </div>
      <p style="margin: var(--sp-4) 0 0; font-size: var(--fs-xs);">
        First time? Create a Google Sheet, follow the 5-minute setup in <code>appscript/README.md</code> to deploy the backend script, then paste its Web App URL into <code>CONFIG.APPS_SCRIPT_URL</code> in <code>js/core/config.js</code> and (optionally) the sheet link into <code>CONFIG.SHEET_URL</code>. Re-upload/redeploy the file once and it's done for good — no more re-connecting.
      </p>
    </div>

    <div class="grid-2">
      <div>
        <div class="glass section">
          <h2>Business Category</h2>
          <p style="margin-top:-6px;">The whole app's theme and stamp icons follow this automatically.</p>
          <div class="category-grid" id="category-grid">
            ${CATEGORIES.map(c => `
              <div class="category-tile ${c.key === selectedCategory ? 'selected' : ''}" data-key="${c.key}">
                <span class="emoji">${c.emoji}</span>
                <span class="label">${c.label}</span>
              </div>`).join('')}
          </div>
        </div>

        <div class="glass section">
          <h2>Brand Identity</h2>
          <div class="field">
            <label for="s-name">Business Name</label>
            <input class="input" id="s-name" value="${escapeAttr(settings.businessName)}">
          </div>
          <div class="field">
            <label>Business Logo</label>
            <div class="logo-upload">
              <img class="logo-preview" id="logo-preview" src="${settings.logo || ''}" alt="">
              <input type="file" id="logo-input" accept="image/*">
            </div>
          </div>
          <div class="field">
            <label>Primary Color</label>
            <div class="color-swatch-row" id="primary-swatches"></div>
          </div>
          <div class="field">
            <label>Accent Color</label>
            <div class="color-swatch-row" id="accent-swatches"></div>
          </div>
        </div>

        <div class="glass section">
          <h2>Contact & Social</h2>
          <div class="field"><label for="s-phone">Business Phone</label><input class="input" id="s-phone" value="${escapeAttr(settings.phone)}"></div>
          <div class="field"><label for="s-address">Business Address</label><input class="input" id="s-address" value="${escapeAttr(settings.address)}"></div>
          <div class="field"><label for="s-website">Website</label><input class="input" id="s-website" value="${escapeAttr(settings.website)}"></div>
          <div class="field"><label for="s-social">Social Media</label><input class="input" id="s-social" value="${escapeAttr(settings.social)}"></div>
        </div>
      </div>

      <div>
        <div class="glass section">
          <h2>Reward Program</h2>
          <div class="field"><label for="s-reward-name">Reward Name</label><input class="input" id="s-reward-name" value="${escapeAttr(settings.rewardName)}" placeholder="e.g. Free Hair Spa"></div>
          <div class="field"><label for="s-reward-desc">Reward Description</label><textarea class="input" id="s-reward-desc" rows="3">${escapeAttr(settings.rewardDescription)}</textarea></div>
          <div class="field">
            <label for="s-required-visits">Required Visits (stamp circles)</label>
            <input class="input" id="s-required-visits" type="number" min="2" max="16" value="${settings.requiredVisits || 8}">
          </div>
        </div>

        <div class="glass section">
          <h2>Live Preview</h2>
          <p style="margin-top:-6px;">This is how the stamp icons will look for the selected category.</p>
          <div id="icon-preview" style="display:flex; gap:10px; flex-wrap:wrap; margin-top: var(--sp-3);"></div>
        </div>
      </div>
    </div>
  `;

  renderSwatches();
  renderIconPreview();
  applyTheme({ category: selectedCategory, primaryColor: currentPrimary(), accentColor: currentAccent() });
  initConnectionPanel();

  $$('.category-tile').forEach(tile => tile.addEventListener('click', () => {
    $$('.category-tile').forEach(t => t.classList.remove('selected'));
    tile.classList.add('selected');
    selectedCategory = tile.dataset.key;
    const theme = CATEGORY_THEME[selectedCategory];
    applyTheme({ category: selectedCategory, primaryColor: theme.c1, accentColor: theme.c2 });
    renderSwatches(theme.c1, theme.c2);
    renderIconPreview();
  }));

  $('#logo-input').addEventListener('change', onLogoChange);
  $('#save-btn').addEventListener('click', onSave);
}

function currentPrimary() { return document.documentElement.style.getPropertyValue('--accent-1') || CATEGORY_THEME.other.c1; }
function currentAccent() { return document.documentElement.style.getPropertyValue('--accent-2') || CATEGORY_THEME.other.c2; }

function renderSwatches(selectedPrimary, selectedAccent) {
  const p = selectedPrimary || currentPrimary();
  const a = selectedAccent || currentAccent();
  $('#primary-swatches').innerHTML = SWATCHES.map(c => swatch(c, c === p, 'primary')).join('');
  $('#accent-swatches').innerHTML = SWATCHES.map(c => swatch(c, c === a, 'accent')).join('');

  $$('#primary-swatches .color-swatch').forEach(sw => sw.addEventListener('click', () => {
    $$('#primary-swatches .color-swatch').forEach(s => s.classList.remove('selected'));
    sw.classList.add('selected');
    document.documentElement.style.setProperty('--accent-1', sw.dataset.color);
  }));
  $$('#accent-swatches .color-swatch').forEach(sw => sw.addEventListener('click', () => {
    $$('#accent-swatches .color-swatch').forEach(s => s.classList.remove('selected'));
    sw.classList.add('selected');
    document.documentElement.style.setProperty('--accent-2', sw.dataset.color);
  }));
}

function swatch(color, selected) {
  return `<div class="color-swatch ${selected ? 'selected' : ''}" data-color="${color}" style="background:${color};"></div>`;
}

function renderIconPreview() {
  import('../core/icons.js').then(({ getStampIcon }) => {
    const icons = Array.from({ length: 8 }, (_, i) => getStampIcon(selectedCategory, i));
    $('#icon-preview').innerHTML = icons.map(ic => `
      <div class="stamp filled" style="position:static; background:var(--surface-glass-strong); border-color:var(--border-hairline);">${ic}</div>
    `).join('');
  });
}

async function onLogoChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    logoDataUrl = await compressImageFile(file, 300, 0.85);
    $('#logo-preview').src = logoDataUrl;
  } catch (err) {
    toast('Could not process image file', 'error');
  }
}

async function onSave() {
  const payload = {
    businessName: $('#s-name').value.trim(),
    logo: logoDataUrl,
    category: selectedCategory,
    primaryColor: currentPrimary(),
    accentColor: currentAccent(),
    rewardName: $('#s-reward-name').value.trim(),
    rewardDescription: $('#s-reward-desc').value.trim(),
    requiredVisits: Number($('#s-required-visits').value) || 8,
    phone: $('#s-phone').value.trim(),
    address: $('#s-address').value.trim(),
    website: $('#s-website').value.trim(),
    social: $('#s-social').value.trim(),
  };
  try {
    await api.saveSettings(payload);
    toast('Business settings saved', 'success');
  } catch (e) {
    toast(e.message || 'Could not save settings', 'error');
  }
}

function escapeAttr(v) { return (v || '').toString().replace(/"/g, '&quot;'); }

init();
