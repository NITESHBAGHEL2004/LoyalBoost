// ---------------------------------------------------------
// theme.js — rewrites the --accent-1 / --accent-2 CSS custom
// properties so the entire UI (buttons, glows, wallet card)
// re-themes itself based on the business's category and/or
// custom brand colors chosen in Business Settings.
// ---------------------------------------------------------

import { CATEGORY_THEME } from './icons.js';

export function applyTheme(settings = {}) {
  const root = document.documentElement;
  const fallback = CATEGORY_THEME[settings.category] || CATEGORY_THEME.other;
  const c1 = settings.primaryColor || fallback.c1;
  const c2 = settings.accentColor || fallback.c2;
  root.style.setProperty('--accent-1', c1);
  root.style.setProperty('--accent-2', c2);
  root.style.setProperty('--accent-soft', hexToRgba(c1, 0.16));
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const num = parseInt(full, 16);
  if (isNaN(num)) return `rgba(109,93,251,${alpha})`;
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
