const REFRESH_TOKEN_HINT_KEY = 'ml_refresh_token_present';
const TWO_FACTOR_PENDING_KEY = 'ml_2fa_pending';
const LOGOUT_IN_PROGRESS_KEY = 'ml_logout_in_progress';

const TWO_FACTOR_PATH_PREFIXES = ['/2fa-login', '/2fa-setup'];

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function markRefreshTokenAvailable(): void {
  if (!isBrowser()) return;
  localStorage.setItem(REFRESH_TOKEN_HINT_KEY, '1');
}

export function clearRefreshTokenAvailable(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(REFRESH_TOKEN_HINT_KEY);
}

export function hasRefreshToken(): boolean {
  if (!isBrowser()) return false;

  // Backend stores refresh token in an httpOnly cookie, so JS cannot inspect it directly.
  // This client-side hint is set on successful auth and cleared on logout/unauthorized.
  return localStorage.getItem(REFRESH_TOKEN_HINT_KEY) === '1';
}

export function markTwoFactorPending(): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(TWO_FACTOR_PENDING_KEY, '1');
}

export function clearTwoFactorPending(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(TWO_FACTOR_PENDING_KEY);
}

export function isTwoFactorFlowActive(): boolean {
  if (!isBrowser()) return false;

  if (sessionStorage.getItem(TWO_FACTOR_PENDING_KEY) === '1') {
    return true;
  }

  const currentPath = window.location.pathname;
  return TWO_FACTOR_PATH_PREFIXES.some((prefix) => currentPath.startsWith(prefix));
}

export function markLogoutInProgress(): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(LOGOUT_IN_PROGRESS_KEY, '1');
}

export function clearLogoutInProgress(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
}

export function isLogoutInProgress(): boolean {
  if (!isBrowser()) return false;
  return sessionStorage.getItem(LOGOUT_IN_PROGRESS_KEY) === '1';
}
