// ---------------------------------------------------------
// icons.js — every business category, its theme colors, its
// emoji, and the rotating set of "premium stamp" icons used
// to fill the loyalty card's stamp circles.
//
// NOTE: icons ship as a curated emoji set today so the product
// works with zero asset pipeline. Swap STAMP_ICONS[category]
// for an SVG sprite sheet later without touching any other file.
// ---------------------------------------------------------

export const CATEGORIES = [
  { key: 'salon',      label: 'Salon',       emoji: '💇' },
  { key: 'spa',         label: 'Spa',         emoji: '🧖' },
  { key: 'cafe',        label: 'Cafe',        emoji: '☕' },
  { key: 'restaurant',  label: 'Restaurant',  emoji: '🍽️' },
  { key: 'gym',         label: 'Gym',         emoji: '🏋️' },
  { key: 'dental',      label: 'Dental',      emoji: '🦷' },
  { key: 'medical',     label: 'Medical',     emoji: '⚕️' },
  { key: 'carwash',     label: 'Car Wash',    emoji: '🚗' },
  { key: 'laundry',     label: 'Laundry',     emoji: '👕' },
  { key: 'bakery',      label: 'Bakery',      emoji: '🥐' },
  { key: 'petshop',     label: 'Pet Shop',    emoji: '🐾' },
  { key: 'other',       label: 'Other',       emoji: '🏪' },
];

export const CATEGORY_THEME = {
  salon:      { c1: '#FF6FA5', c2: '#FF9AC1' },
  spa:        { c1: '#3FBFA6', c2: '#8FE3D0' },
  cafe:       { c1: '#B07A45', c2: '#E0AE72' },
  restaurant: { c1: '#FF7847', c2: '#FFAE6E' },
  gym:        { c1: '#FF4757', c2: '#FF8A5B' },
  dental:     { c1: '#33C7FF', c2: '#7FE0FF' },
  medical:    { c1: '#2ED47A', c2: '#7CF0AE' },
  carwash:    { c1: '#3AA0FF', c2: '#7FC8FF' },
  laundry:    { c1: '#7C83FD', c2: '#A6ABFF' },
  bakery:     { c1: '#E0A458', c2: '#F0C98A' },
  petshop:    { c1: '#FFB84C', c2: '#FFD27F' },
  other:      { c1: '#6D5DFB', c2: '#00C2D1' },
};

export const STAMP_ICONS = {
  salon:      ['✂️', '💇', '🪞', '💈', '✨', '⭐', '💄', '🪥'],
  spa:        ['🪷', '🍃', '🪨', '💧', '🌸', '🕯️', '🧘', '🌿'],
  cafe:       ['☕', '🫘', '🥛', '🥐', '💨', '🍮', '🍪', '🧋'],
  restaurant: ['👨‍🍳', '🍴', '🍕', '🍔', '🥄', '🍝', '🥗', '🍷'],
  gym:        ['🏋️', '⚡', '🔥', '💪', '❤️‍🔥', '🥇', '⏱️', '🧃'],
  dental:     ['🦷', '😁', '🪥', '✨', '💧', '🩺', '⭐', '🧼'],
  medical:    ['❤️', '➕', '💊', '🩺', '🧬', '🩹', '⭐', '🧪'],
  carwash:    ['🚗', '💧', '🫧', '✨', '🧽', '🛞', '🌟', '💦'],
  laundry:    ['👕', '🫧', '🧺', '♨️', '✨', '👖', '🧴', '🌟'],
  bakery:     ['🍞', '🎂', '🥐', '🧁', '🍪', '🥖', '🍰', '⭐'],
  petshop:    ['🐾', '🦴', '🥣', '🐶', '🐱', '🎾', '🛁', '⭐'],
  other:      ['⭐', '✨', '🎯', '🏆', '💎', '🔥', '🎁', '👑'],
};

export function getStampIcon(category, index) {
  const set = STAMP_ICONS[category] || STAMP_ICONS.other;
  return set[index % set.length];
}

export function getCategoryMeta(key) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}
