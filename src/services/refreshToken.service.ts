import prisma from '../config/database';

// Fallback in-memory store
const inMemory = new Map<string, { user_id: string; expiresAt: number }>();
const DEFAULT_REFRESH_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function storeRefreshToken(
  token: string,
  user_id: string,
  ttlMs = DEFAULT_REFRESH_TTL,
) {
  try {
    // attempt DB persistence (prisma model `RefreshToken` expected)
    // cast to any to allow schema to be added later without breaking types
    const expiresAt = new Date(Date.now() + ttlMs);
    await (prisma as any).refreshToken.create({
      data: {
        token,
        user_id: user_id,
        expires_at: expiresAt,
      },
    });
    return;
  } catch (e) {
    // fallback to in-memory
    const expiresAt = Date.now() + ttlMs;
    inMemory.set(token, { user_id, expiresAt });
  }
}

export async function revokeRefreshToken(token: string) {
  try {
    await (prisma as any).refreshToken.deleteMany({ where: { token } });
  } catch (e) {
    inMemory.delete(token);
  }
}

export async function isValidRefreshToken(token: string) {
  try {
    const row = await (prisma as any).refreshToken.findUnique({
      where: { token },
    });
    if (!row) return inMemory.has(token);
    const exp = new Date(row.expires_at).getTime();
    if (Date.now() > exp) {
      await (prisma as any).refreshToken.deleteMany({ where: { token } });
      return false;
    }
    return true;
  } catch (e) {
    const entry = inMemory.get(token);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      inMemory.delete(token);
      return false;
    }
    return true;
  }
}

export async function getuser_idForRefreshToken(token: string) {
  try {
    const row = await (prisma as any).refreshToken.findUnique({
      where: { token },
    });
    if (row) return row.user_id;
    const entry = inMemory.get(token);
    return entry ? entry.user_id : null;
  } catch (e) {
    const entry = inMemory.get(token);
    return entry ? entry.user_id : null;
  }
}
