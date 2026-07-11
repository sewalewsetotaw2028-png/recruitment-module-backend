type RefreshEntry = { user_id: string; expiresAt: number };

const refreshTokens = new Map<string, RefreshEntry>();

const DEFAULT_REFRESH_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function storeRefreshToken(
  token: string,
  user_id: string,
  ttlMs = DEFAULT_REFRESH_TTL,
) {
  const expiresAt = Date.now() + ttlMs;
  refreshTokens.set(token, { user_id, expiresAt });
}

export function revokeRefreshToken(token: string) {
  refreshTokens.delete(token);
}

export function isValidRefreshToken(token: string) {
  const entry = refreshTokens.get(token);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    refreshTokens.delete(token);
    return false;
  }
  return true;
}

export function getuser_idForRefreshToken(token: string) {
  const entry = refreshTokens.get(token);
  return entry ? entry.user_id : null;
}

export function clearAllRefreshTokens() {
  refreshTokens.clear();
}
