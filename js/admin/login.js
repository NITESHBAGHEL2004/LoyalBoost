import { api } from '../core/api.js';
import { setToken, isAuthed } from '../core/auth.js';
import { $ } from '../core/utils.js';

if (isAuthed()) window.location.href = 'dashboard.html';

const form = $('#login-form');
const errorBox = $('#auth-error');
const btn = $('#login-btn');
const btnLabel = $('#login-btn-label');

// Demo mode has been removed from the UI — the app now always expects a
// real Apps Script backend configured in js/core/config.js. If that value
// is still the placeholder, login will simply fail with a clear error
// telling the admin to finish backend setup, instead of silently offering
// a demo login.
if (api.isDemo()) {
  errorBox.textContent = 'Backend not configured yet. Ask your developer to set CONFIG.APPS_SCRIPT_URL in js/core/config.js.';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.textContent = '';
  const username = $('#username').value.trim();
  const password = $('#password').value;
  const remember = $('#remember').checked;

  btn.disabled = true;
  btnLabel.innerHTML = '<span class="spinner"></span>';

  try {
    const { token } = await api.login(username, password);
    setToken(token, remember);
    window.location.href = 'dashboard.html';
  } catch (err) {
    errorBox.textContent = err.message || 'Unable to sign in. Please try again.';
    btn.disabled = false;
    btnLabel.textContent = 'Sign in';
  }
});
