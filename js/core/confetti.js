// ---------------------------------------------------------
// confetti.js — celebration effects for a completed stamp card.
// Pure DOM/CSS, no external library, so it works offline and
// inside file:// previews.
// ---------------------------------------------------------

const COLORS = ['#F6C453', '#F0A93E', '#6D5DFB', '#00C2D1', '#FF6FA5', '#34D399'];

export function fireConfetti(pieces = 90) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < pieces; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = 6 + Math.random() * 6;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const left = Math.random() * 100;
    const duration = 2200 + Math.random() * 1800;
    const delay = Math.random() * 400;
    const isCircle = Math.random() > 0.5;
    Object.assign(piece.style, {
      left: `${left}vw`,
      width: `${size}px`,
      height: `${size * (isCircle ? 1 : 1.6)}px`,
      background: color,
      borderRadius: isCircle ? '50%' : '2px',
      animationDuration: `${duration}ms`,
      animationDelay: `${delay}ms`,
    });
    frag.appendChild(piece);
    setTimeout(() => piece.remove(), duration + delay + 100);
  }
  document.body.appendChild(frag);
}

/** Small burst of sparkle particles around a given element (e.g. the final stamp). */
export function sparkleAt(targetEl, count = 10) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const rect = targetEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'sparkle-particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 28 + Math.random() * 22;
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.position = 'fixed';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 750);
  }
}
