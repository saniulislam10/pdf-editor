import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db, UserRow, SessionRow } from './db';

// 7 days session duration
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
// 1 hour password reset duration
const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;

export interface SanitizedUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  provider: 'email' | 'google';
  created_at: number;
}

export function sanitizeUser(user: UserRow): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    provider: user.provider,
    created_at: user.created_at,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function findUserByEmail(email: string): UserRow | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
  return stmt.get(email.trim()) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
  return stmt.get(id) as UserRow | undefined;
}

export function findUserByGoogleId(googleId: string): UserRow | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE google_id = ? LIMIT 1');
  return stmt.get(googleId) as UserRow | undefined;
}

export async function createUserWithEmail(
  name: string,
  email: string,
  passwordPlain: string
): Promise<UserRow> {
  const existing = findUserByEmail(email);
  if (existing) {
    if (existing.provider === 'google') {
      throw new Error('An account with this email already exists via Google Sign In. Please sign in with Google.');
    }
    throw new Error('An account with this email already exists. Please log in instead.');
  }

  const userId = 'usr_' + crypto.randomBytes(16).toString('hex');
  const passwordHash = await hashPassword(passwordPlain);
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO users (id, email, name, password_hash, avatar_url, provider, google_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, NULL, 'email', NULL, ?, ?)
  `);

  stmt.run(userId, email.trim().toLowerCase(), name.trim(), passwordHash, now, now);

  const newUser = findUserById(userId);
  if (!newUser) throw new Error('Failed to create user record');
  return newUser;
}

export function createOrUpdateGoogleUser(
  googleId: string,
  email: string,
  name: string,
  avatarUrl?: string | null
): UserRow {
  const now = Date.now();
  // 1. Check if user with this google_id already exists
  let user = findUserByGoogleId(googleId);
  if (user) {
    // Update name or avatar if changed
    const updateStmt = db.prepare(`
      UPDATE users SET name = ?, avatar_url = COALESCE(?, avatar_url), updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(name, avatarUrl || null, now, user.id);
    return findUserById(user.id)!;
  }

  // 2. Check if user with this email exists
  user = findUserByEmail(email);
  if (user) {
    // Link Google account to this user
    const linkStmt = db.prepare(`
      UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?), updated_at = ?
      WHERE id = ?
    `);
    linkStmt.run(googleId, avatarUrl || null, now, user.id);
    return findUserById(user.id)!;
  }

  // 3. Create new user with Google provider
  const userId = 'usr_' + crypto.randomBytes(16).toString('hex');
  const insertStmt = db.prepare(`
    INSERT INTO users (id, email, name, password_hash, avatar_url, provider, google_id, created_at, updated_at)
    VALUES (?, ?, ?, NULL, ?, 'google', ?, ?, ?)
  `);
  insertStmt.run(userId, email.trim().toLowerCase(), name.trim(), avatarUrl || null, googleId, now, now);

  return findUserById(userId)!;
}

export function createSession(userId: string, userAgent?: string, ip?: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, created_at, user_agent, ip)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(token, userId, expiresAt, now, userAgent || null, ip || null);

  return token;
}

export function getSessionUser(token: string): SanitizedUser | null {
  if (!token) return null;

  const now = Date.now();
  const stmt = db.prepare(`
    SELECT users.* FROM sessions
    JOIN users ON sessions.user_id = users.id
    WHERE sessions.id = ? AND sessions.expires_at > ?
    LIMIT 1
  `);

  const user = stmt.get(token, now) as UserRow | undefined;
  if (!user) return null;

  return sanitizeUser(user);
}

export function deleteSession(token: string): void {
  if (!token) return;
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  stmt.run(token);
}

export function deleteAllUserSessions(userId: string): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
  stmt.run(userId);
}

export function createPasswordResetToken(email: string): { token: string; user: UserRow } | null {
  const user = findUserByEmail(email);
  if (!user) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + RESET_TOKEN_DURATION_MS;

  // Invalidate any existing unused reset tokens for this user
  db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ?').run(user.id);

  const stmt = db.prepare(`
    INSERT INTO password_resets (id, user_id, expires_at, created_at, used)
    VALUES (?, ?, ?, ?, 0)
  `);
  stmt.run(token, user.id, expiresAt, now);

  return { token, user };
}

export async function resetPasswordWithToken(token: string, newPasswordPlain: string): Promise<UserRow> {
  const now = Date.now();
  const stmt = db.prepare(`
    SELECT * FROM password_resets
    WHERE id = ? AND used = 0 AND expires_at > ?
    LIMIT 1
  `);
  const record = stmt.get(token, now) as { id: string; user_id: string } | undefined;
  if (!record) {
    throw new Error('Invalid or expired password reset link. Please request a new one.');
  }

  const newHash = await hashPassword(newPasswordPlain);
  const userStmt = db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = ?
    WHERE id = ?
  `);
  userStmt.run(newHash, now, record.user_id);

  // Mark token as used
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(token);

  // Invalidate all existing sessions for security
  deleteAllUserSessions(record.user_id);

  const updatedUser = findUserById(record.user_id);
  if (!updatedUser) throw new Error('User not found');
  return updatedUser;
}

export async function updateUserPassword(userId: string, currentPlain: string, newPlain: string): Promise<void> {
  const user = findUserById(userId);
  if (!user) throw new Error('User not found');
  if (!user.password_hash) {
    throw new Error('This account was created with Google Sign In and does not have a current password.');
  }

  const isValid = await verifyPassword(currentPlain, user.password_hash);
  if (!isValid) {
    throw new Error('Current password is incorrect.');
  }

  const newHash = await hashPassword(newPlain);
  const now = Date.now();
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, userId);
}
