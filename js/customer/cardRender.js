// ---------------------------------------------------------
// cardRender.js — builds the Apple/Google-Wallet-style digital
// stamp card markup from a customer + settings object. Shared
// between the admin "view card" modal and the public QR page
// so the design only lives in one place.
// ---------------------------------------------------------

import { escapeHtml, initials } from '../core/utils.js';
import { getStampIcon } from '../core/icons.js';

export function renderWalletCard(customer, settings) {
  const required = customer.requiredVisits || settings.requiredVisits || 8;
  const filled = customer.visitCount || 0;
  const stamps = Array.from({ length: required }, (_, i) => {
    const isFilled = i < filled;
    const isFinal = i === required - 1;
    const icon = isFilled ? getStampIcon(settings.category, i) : '';
    return `<div class="stamp ${isFilled ? 'filled' : ''} ${isFilled && isFinal ? 'is-final' : ''}" data-index="${i}">
      ${isFilled ? icon : '<span class="empty-dot"></span>'}
    </div>`;
  }).join('');

  const logo = settings.logo
    ? `<img src="${settings.logo}" alt="">`
    : (settings.businessName || 'B')[0].toUpperCase();

  const photo = customer.photo
    ? `<img class="wc-photo" src="${customer.photo}" alt="">`
    : `<div class="wc-photo">${initials(customer.name)}</div>`;

  const badgeClass = `badge-${(customer.membership || 'bronze').toLowerCase()}`;

  return `
    <div class="wallet-card card-rise" id="wallet-card">
      <div class="card-sheen"></div>
      <span class="badge ${badgeClass} wc-membership">${escapeHtml(customer.membership || 'Bronze')}</span>
      <div class="wc-top">
        <div class="wc-brand">
          <div class="wc-logo">${logo}</div>
          <div>
            <div class="wc-biz-name">${escapeHtml(settings.businessName || 'Your Business')}</div>
            <div class="wc-biz-cat">${escapeHtml(settings.category || '')}</div>
          </div>
        </div>
      </div>
      <div class="wc-person">
        ${photo}
        <div>
          <div class="name">${escapeHtml(customer.name)}</div>
          <div class="id">${escapeHtml(customer.customerId)}</div>
        </div>
      </div>
      <div class="wc-reward">
        <div class="reward-name">🎁 ${escapeHtml(settings.rewardName || 'Reward')}</div>
        <p class="reward-desc">${escapeHtml(settings.rewardDescription || '')}</p>
      </div>
      <div class="stamp-grid">${stamps}</div>
      <div class="wc-progress-label">${filled} of ${required} visits completed${filled >= required ? ' — reward unlocked!' : ''}</div>
      <div class="wc-bottom">
        <div class="wc-qr" id="wc-qr"></div>
        <div class="wc-actions">
          <span style="font-size:11px; opacity:.7;">Scan to view card</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * The permanent, shareable link to a customer's card. Same link is used
 * for the QR code, the WhatsApp share message, and "Send Card" actions —
 * one function so it's never generated two different ways.
 */
export function getPublicCardUrl(qrId) {
  const inAdmin = window.location.pathname.includes('/admin/');
  const relative = inAdmin ? '../customer/card.html' : 'card.html';
  return new URL(`${relative}?qr=${encodeURIComponent(qrId)}`, window.location.href).href;
}

/** Renders the QR code into #wc-qr using the QRCode.js library (loaded via CDN). */
export function renderCardQR(container, qrId) {
  if (!window.QRCode) return;
  container.innerHTML = '';
  new window.QRCode(container, {
    text: getPublicCardUrl(qrId),
    width: 74,
    height: 74,
    colorDark: '#0A0B10',
    colorLight: '#ffffff',
  });
}
