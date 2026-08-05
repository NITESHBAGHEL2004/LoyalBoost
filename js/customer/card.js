import { api } from '../core/api.js';
import { applyTheme } from '../core/theme.js';
import { $, $$, el, formatDate, qsParam, toast, openModal, closeModal, escapeHtml } from '../core/utils.js';
import { renderWalletCard, renderCardQR, getPublicCardUrl } from './cardRender.js';
import { fireConfetti, sparkleAt } from '../core/confetti.js';
import { initScratchCard } from './scratch.js';

const root = $('#card-root');
const rewardBackdrop = $('#reward-modal-backdrop');

async function init() {
  const qrId = qsParam('qr');
  if (!qrId) {
    root.innerHTML = emptyState('🔍', 'No card reference found. Please scan your card\'s QR code again.');
    return;
  }

  try {
    const { customer, settings, coupon, history } = await api.getPublicCard(qrId);
    applyTheme(settings);
    renderCard(customer, settings, coupon, history);
    maybeShowRewardPopup(customer, settings, coupon);
  } catch (e) {
    root.innerHTML = emptyState('⚠️', e.message || 'We couldn\'t find this card.');
  }
}

function emptyState(icon, msg) {
  return `<div class="glass empty-state"><div class="empty-icon">${icon}</div><p>${escapeHtml(msg)}</p></div>`;
}

function renderCard(customer, settings, coupon, history) {
  root.innerHTML = `
    ${renderWalletCard(customer, settings)}
    ${coupon ? renderCoupon(coupon) : ''}
    ${coupon ? renderScratchSection() : ''}
    <div class="glass section" style="padding: var(--sp-6); margin-top: var(--sp-5);">
      <h3>Visit History</h3>
      <div class="timeline">
        ${history.length ? history.map(h => {
          const isReward = h.type === 'reward' || (h.service && h.service.includes('🎁'));
          return `
          <div class="timeline-item ${isReward ? 'is-reward' : ''}">
            <div class="timeline-dot"></div>
            <div>
              <div class="timeline-date">${formatDate(h.date)}</div>
              <div class="timeline-title">${escapeHtml(h.service || 'Visit')}</div>
            </div>
          </div>
        `;}).join('') : '<p>No visits recorded yet.</p>'}
      </div>
    </div>
    <div class="share-bar">
      <button class="btn btn-primary" id="share-whatsapp">📤 Share on WhatsApp</button>
    </div>
  `;

  renderCardQR($('#wc-qr'), customer.qrId);

  $('#share-whatsapp').addEventListener('click', () => {
    const link = getPublicCardUrl(customer.qrId);
    const bizName = settings.businessName || 'LoyalBoost';
    const reward = settings.rewardName || 'Free Reward';
    const visits = customer.visitCount || 0;
    const required = customer.requiredVisits || settings.requiredVisits || 8;
    const visitsKeycap = String(visits).split('').map(d => (d >= '0' && d <= '9' ? d + '\uFE0F\u20E3' : d)).join('');
    const requiredKeycap = String(required).split('').map(d => (d >= '0' && d <= '9' ? d + '\uFE0F\u20E3' : d)).join('');

    const text = `✨ *Welcome to ${bizName}!*\n\nHi *${customer.name}*, thank you for becoming a valued customer! ❤️\n\n🪪 *Your Digital Loyalty Card is now active.*\n\n📍 *Current Progress:* *${visitsKeycap} / ${requiredKeycap}* Visits\n🎁 *Unlock Reward:* *${reward}*\n\nEvery eligible visit earns you a stamp. Complete all *${required} visits* to claim your reward!\n\n*Access your loyalty card anytime:*\n👇\n${link}\n\nThank you for your support. We can't wait to welcome you back! 🌟`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  });

  const redeemBtn = $('#redeem-coupon-btn');
  if (redeemBtn) {
    redeemBtn.addEventListener('click', async () => {
      redeemBtn.disabled = true;
      try {
        await api.redeemCoupon(coupon.code);
        toast('Coupon redeemed — enjoy your reward!', 'success');
        init(); // refresh
      } catch (e) {
        toast(e.message, 'error');
        redeemBtn.disabled = false;
      }
    });
  }

  const scratchCanvas = $('.scratch-canvas');
  if (scratchCanvas) {
    initScratchCard(scratchCanvas, {
      onRevealed: async () => {
        try {
          const { prize } = await api.scratchReward(customer.customerId);
          $('#scratch-prize').textContent = prize;
          fireConfetti(60);
        } catch (e) { /* silent */ }
      },
    });
  }

  // Celebrate the final stamp visually if the cycle is complete.
  const finalStamp = $('.stamp.is-final');
  if (finalStamp) sparkleAt(finalStamp, 8);
}

function renderCoupon(coupon) {
  const statusClass = coupon.status === 'Redeemed' ? 'badge-success' : coupon.status === 'Expired' ? 'badge-danger' : 'badge-warning';
  return `
    <div class="coupon card-rise" style="margin-top: var(--sp-5);">
      <div class="coupon-strip"></div>
      <div class="coupon-body">
        <div class="eyebrow">Reward Coupon</div>
        <div class="coupon-code">${escapeHtml(coupon.code)}</div>
        <p style="margin: 4px 0 0;">${escapeHtml(coupon.rewardText)}</p>
        <span class="badge ${statusClass} coupon-status">${coupon.status}</span>
        ${coupon.status === 'Unused' ? `<div style="margin-top: var(--sp-4);"><button class="btn btn-primary btn-sm" id="redeem-coupon-btn">Redeem Now</button></div>` : ''}
      </div>
    </div>
  `;
}

function renderScratchSection() {
  return `
    <div class="glass section" style="padding: var(--sp-6); margin-top: var(--sp-5); text-align:center;">
      <h3>Bonus Scratch Card</h3>
      <p>Scratch below for a chance at an extra surprise.</p>
      <div class="scratch-wrap">
        <div class="scratch-result">
          <span>You won</span>
          <span class="prize" id="scratch-prize">…</span>
        </div>
        <canvas class="scratch-canvas"></canvas>
      </div>
    </div>
  `;
}

function maybeShowRewardPopup(customer, settings, coupon) {
  if (!coupon || coupon.status !== 'Unused') return;
  const seenKey = `lb_seen_reward_${coupon.code}`;
  if (localStorage.getItem(seenKey)) return;
  localStorage.setItem(seenKey, '1');

  $('#reward-modal-body').innerHTML = `
    <div class="burst">🎉</div>
    <h2>Congratulations!</h2>
    <p>You've completed your loyalty card.</p>
    <div class="unlocked">${escapeHtml(settings.rewardName)}</div>
    <div class="popup-actions">
      <button class="btn btn-ghost" id="popup-close">Close</button>
      <button class="btn btn-primary" id="popup-redeem">Redeem</button>
    </div>
  `;
  openModal(rewardBackdrop);
  fireConfetti(120);

  $('#popup-close').addEventListener('click', () => closeModal(rewardBackdrop));
  $('#popup-redeem').addEventListener('click', () => {
    closeModal(rewardBackdrop);
    $('#redeem-coupon-btn')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

init();
