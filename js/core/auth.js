// ---------------------------------------------------------
// auth.js — lightweight session handling.
// Token is issued by the backend on login and simply carried
// on every subsequent API call; the backend is the source of
// truth for whether it's still valid.
// ---------------------------------------------------------

const TOKEN_KEY = 'loyalboost_token';
const REMEMBER_KEY = 'loyalboost_remember';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token, remember = true) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, '1');
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isAuthed() {
  return !!getToken();
}

/** Call at the top of every protected admin page. */
export function requireAuth(loginPath = '../admin/login.html') {
  if (!isAuthed()) {
    window.location.href = loginPath;
  }
}

export function logout(loginPath = 'login.html') {
  clearToken();
  window.location.href = loginPath;
}
