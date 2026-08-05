// ---------------------------------------------------------
// utils.js — tiny shared helpers (no dependencies)
// ---------------------------------------------------------

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDate(value, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleDateString('en-US', opts);
}

export function timeAgo(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return '—';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function qsParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
}

// ---------- Toasts ----------
function ensureToastStack() {
  let stack = $('.toast-stack');
  if (!stack) {
    stack = el('div', { class: 'toast-stack' });
    document.body.appendChild(stack);
  }
  return stack;
}

export function toast(message, type = 'info', duration = 3200) {
  const stack = ensureToastStack();
  const node = el('div', { class: `toast toast-${type}` }, message);
  stack.appendChild(node);
  setTimeout(() => {
    node.style.transition = 'opacity .25s ease';
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 250);
  }, duration);
}

// ---------- Simple modal controller ----------
export function openModal(backdropEl) {
  backdropEl.classList.add('open');
  backdropEl.setAttribute('aria-hidden', 'false');
}
export function closeModal(backdropEl) {
  backdropEl.classList.remove('open');
  backdropEl.setAttribute('aria-hidden', 'true');
}

// ---------- WhatsApp ----------

/** Cleans a saved mobile number into the digits-only, country-coded format wa.me needs. */
export function formatWhatsAppNumber(mobile, defaultCountryCode) {
  let digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return '';
  // Strip a leading trunk "0" (common in local numbers, e.g. 0-987xxxxxxx).
  digits = digits.replace(/^0+/, '');
  // If it looks like a bare 10-digit local number, prefix the default country code.
  if (digits.length === 10 && defaultCountryCode) digits = defaultCountryCode + digits;
  return digits;
}

/** Builds a wa.me link that opens a chat with one specific number, prefilled with a message. */
export function whatsAppDirectLink(mobile, message, defaultCountryCode) {
  const number = formatWhatsAppNumber(mobile, defaultCountryCode);
  const base = number ? `https://wa.me/${number}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}

// ---------- ID / code generators (client-side fallback only; source of truth is the server) ----------
export function randomCode(prefix = '', len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return prefix ? `${prefix}-${out}` : out;
}

/** Compress/downscale image File to a lightweight data URL (max 300px, JPEG) to fit easily inside Google Sheets cell limit */
export function compressImageFile(file, maxDimension = 300, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          } else {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

