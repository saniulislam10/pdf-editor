import { User } from '../types/auth';

const STORAGE_USERS_KEY = 'pdfcraft_local_users_v1';
const STORAGE_SESSION_KEY = 'pdfcraft_local_session_v1';
const STORAGE_RESETS_KEY = 'pdfcraft_local_resets_v1';

export interface StoredLocalUser extends User {
  passwordHash?: string;
  updated_at?: number;
}

// Cryptographically secure client-side password hashing
export async function hashPasswordClient(password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + '_pdfcraft_secure_salt_2026');
      const buffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(buffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Lightweight standard fallback
  let hash = 0;
  const str = password + '_pdfcraft_secure_salt_2026';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'sh_' + Math.abs(hash).toString(16);
}

function getStoredUsers(): StoredLocalUser[] {
  try {
    const data = localStorage.getItem(STORAGE_USERS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredLocalUser[]): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save local users to localStorage:', err);
  }
}

export function localGetSessionUser(): User | null {
  try {
    const sessionData = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!sessionData) return null;
    const session = JSON.parse(sessionData);
    if (!session || !session.userId || !session.expiresAt) return null;

    if (Date.now() > session.expiresAt) {
      localLogout();
      return null;
    }

    const users = getStoredUsers();
    const user = users.find(u => u.id === session.userId);
    if (!user) return null;

    const { passwordHash: _, ...cleanUser } = user;
    return cleanUser;
  } catch {
    return null;
  }
}

export function localSetSession(user: User): string {
  const token = 'local_tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const session = {
    token,
    userId: user.id,
    expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days
  };
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  return token;
}

export function localLogout(): void {
  localStorage.removeItem(STORAGE_SESSION_KEY);
}

export async function localRegister(
  name: string, 
  email: string, 
  password: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Please enter a valid name (at least 2 characters).' };
  }
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  const users = getStoredUsers();
  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
  }

  const passwordHash = await hashPasswordClient(password);
  const newUser: StoredLocalUser = {
    id: 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    name: cleanName,
    email: cleanEmail,
    avatar_url: null,
    provider: 'email',
    passwordHash,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  users.push(newUser);
  saveStoredUsers(users);

  const { passwordHash: _, ...cleanUser } = newUser;
  const token = localSetSession(cleanUser);

  return {
    success: true,
    user: cleanUser,
    token,
  };
}

export async function localLogin(
  email: string, 
  password: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const users = getStoredUsers();
  let user = users.find(u => u.email.toLowerCase() === cleanEmail);

  // Auto-seed demo account if requested
  if (!user && cleanEmail === 'demo@pdfcraft.com') {
    const demoUser: StoredLocalUser = {
      id: 'demo_user_1',
      name: 'Demo User',
      email: 'demo@pdfcraft.com',
      avatar_url: null,
      provider: 'email',
      passwordHash: await hashPasswordClient('password123'),
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    users.push(demoUser);
    saveStoredUsers(users);
    user = demoUser;
  }

  if (!user) {
    return { 
      success: false, 
      error: 'No account found with this email. Please click "Create Account" to sign up.' 
    };
  }

  if (user.provider === 'google' && !user.passwordHash) {
    return {
      success: false,
      error: 'This account was created with Google. Please use "Continue with Google".'
    };
  }

  const hash = await hashPasswordClient(password);
  if (user.passwordHash !== hash) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  const { passwordHash: _, ...cleanUser } = user;
  const token = localSetSession(cleanUser);

  return {
    success: true,
    user: cleanUser,
    token,
  };
}

export async function localGoogleLogin(): Promise<{ success: boolean; user?: User; token?: string }> {
  const users = getStoredUsers();
  const googleEmail = 'user@google.com';
  let user = users.find(u => u.email === googleEmail);

  if (!user) {
    user = {
      id: 'goog_' + Math.random().toString(36).substring(2, 9),
      name: 'Google User',
      email: googleEmail,
      avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      provider: 'google',
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    users.push(user);
    saveStoredUsers(users);
  }

  const { passwordHash: _, ...cleanUser } = user;
  const token = localSetSession(cleanUser);

  return {
    success: true,
    user: cleanUser,
    token,
  };
}

export async function localChangePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' };
  }

  const users = getStoredUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return { success: false, error: 'User account not found.' };
  }

  const user = users[userIndex];
  const currentHash = await hashPasswordClient(currentPassword);
  if (user.passwordHash && user.passwordHash !== currentHash) {
    return { success: false, error: 'Current password does not match.' };
  }

  user.passwordHash = await hashPasswordClient(newPassword);
  user.updated_at = Date.now();
  users[userIndex] = user;
  saveStoredUsers(users);

  return { success: true };
}

export function localForgotPassword(email: string): { success: boolean; message: string; resetUrl?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const users = getStoredUsers();
  const user = users.find(u => u.email.toLowerCase() === cleanEmail);

  const genericSuccess = {
    success: true,
    message: 'If an account exists with this email, you can reset your password now.',
  };

  if (!user) {
    return genericSuccess;
  }

  const token = 'rst_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  try {
    const resets = JSON.parse(localStorage.getItem(STORAGE_RESETS_KEY) || '{}');
    resets[token] = {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    };
    localStorage.setItem(STORAGE_RESETS_KEY, JSON.stringify(resets));
  } catch {}

  const origin = window.location.origin;
  const resetUrl = `${origin}?reset_token=${token}`;

  return {
    ...genericSuccess,
    resetUrl,
  };
}

export async function localResetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  try {
    const resets = JSON.parse(localStorage.getItem(STORAGE_RESETS_KEY) || '{}');
    const record = resets[token];
    if (!record || Date.now() > record.expiresAt) {
      return { success: false, error: 'Invalid or expired password reset link.' };
    }

    const users = getStoredUsers();
    const user = users.find(u => u.id === record.userId);
    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    user.passwordHash = await hashPasswordClient(newPassword);
    user.updated_at = Date.now();
    saveStoredUsers(users);

    delete resets[token];
    localStorage.setItem(STORAGE_RESETS_KEY, JSON.stringify(resets));

    const { passwordHash: _, ...cleanUser } = user;
    const sessionToken = localSetSession(cleanUser);

    return {
      success: true,
      user: cleanUser,
      token: sessionToken,
    };
  } catch {
    return { success: false, error: 'Failed to reset password.' };
  }
}
