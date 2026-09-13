import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthModalTab } from '../types/auth';
import {
  localGetSessionUser,
  localLogin,
  localRegister,
  localLogout,
  localGoogleLogin,
  localChangePassword,
  localForgotPassword,
  localResetPassword,
} from '../utils/localAuth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: AuthModalTab;
  authModalPrompt: string | null;
  resetToken: string | null;
  openAuthModal: (tab?: AuthModalTab, prompt?: string | null) => void;
  closeAuthModal: () => void;
  setResetToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string; resetUrl?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'pdfcraft_auth_token';

interface SafeFetchResponse<T = any> {
  ok: boolean;
  status: number;
  isJson: boolean;
  data: T | null;
  rawText: string;
}

// Safely execute fetch and parse JSON without crashing on HTML 404/500/Vercel error pages
async function safeFetch<T = any>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<SafeFetchResponse<T>> {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const headers = new Headers(init.headers || {});
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(input, {
      ...init,
      headers,
      credentials: 'include',
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const rawText = await res.text();
    let isJson = false;
    let data: any = null;

    if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
      try {
        data = JSON.parse(rawText);
        isJson = true;
      } catch {
        isJson = false;
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      isJson,
      data,
      rawText,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      isJson: false,
      data: null,
      rawText: err?.message || 'Network error',
    };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab>('login');
  const [authModalPrompt, setAuthModalPrompt] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Fetch current user (Checks server first, falls back to local storage on Vercel/offline)
  const refreshUser = useCallback(async () => {
    try {
      const res = await safeFetch<{ user?: User | null }>('/api/auth/me');

      if (res.isJson) {
        if (res.ok && res.data?.user) {
          setUser(res.data.user);
          return;
        } else if (res.ok && res.data && !res.data.user) {
          // Explicit logged out on server
          setUser(null);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          return;
        }
      }

      // Server is either unavailable (Vercel 404 HTML, static hosting, offline) or network error
      const localUser = localGetSessionUser();
      if (localUser) {
        setUser(localUser);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Session verification fallback to local user:', err);
      const localUser = localGetSessionUser();
      setUser(localUser);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check on mount and look for URL query reset_token
  useEffect(() => {
    refreshUser();

    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('reset_token');
      if (token) {
        setResetToken(token);
        const url = new URL(window.location.href);
        url.searchParams.delete('reset_token');
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
      }
    } catch {}
  }, [refreshUser]);

  // Listen for postMessage from Google OAuth popup
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      const isAllowedOrigin = 
        origin === window.location.origin ||
        origin.includes('localhost') ||
        origin.endsWith('.run.app') ||
        origin.includes('vercel.app') ||
        origin.includes('shajedagroup.com');

      if (!isAllowedOrigin) return;

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, event.data.token);
        }
        if (event.data.user) {
          setUser(event.data.user);
        }
        setIsAuthModalOpen(false);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const openAuthModal = (tab: AuthModalTab = 'login', prompt: string | null = null) => {
    setAuthModalTab(tab);
    setAuthModalPrompt(prompt);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalPrompt(null);
  };

  const login = async (email: string, password: string) => {
    try {
      // 1. Try server endpoint
      const res = await safeFetch<{ user: User; token: string; error?: string }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // If the backend responded with valid JSON
      if (res.isJson) {
        if (!res.ok) {
          return { success: false, error: res.data?.error || 'Invalid email or password' };
        }
        if (res.data?.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
        }
        if (res.data?.user) {
          setUser(res.data.user);
        }
        setIsAuthModalOpen(false);
        return { success: true };
      }

      // 2. Fallback: Server is not running on this host (e.g. Vercel static deployment or offline)
      const localResult = await localLogin(email, password);
      if (localResult.success && localResult.user) {
        if (localResult.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, localResult.token);
        }
        setUser(localResult.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }

      return { 
        success: false, 
        error: localResult.error || 'Invalid email or password. You can also sign up with "Create Account".' 
      };
    } catch (err: any) {
      // Graceful local login even on network error
      const localResult = await localLogin(email, password);
      if (localResult.success && localResult.user) {
        if (localResult.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, localResult.token);
        }
        setUser(localResult.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      // 1. Try server endpoint
      const res = await safeFetch<{ user: User; token: string; error?: string }>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.isJson) {
        if (!res.ok) {
          return { success: false, error: res.data?.error || 'Registration failed' };
        }
        if (res.data?.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
        }
        if (res.data?.user) {
          setUser(res.data.user);
        }
        setIsAuthModalOpen(false);
        return { success: true };
      }

      // 2. Fallback: Server is not running on this host (e.g. Vercel static deployment)
      const localResult = await localRegister(name, email, password);
      if (localResult.success && localResult.user) {
        if (localResult.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, localResult.token);
        }
        setUser(localResult.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }

      return { success: false, error: localResult.error || 'Registration failed' };
    } catch (err: any) {
      const localResult = await localRegister(name, email, password);
      if (localResult.success && localResult.user) {
        if (localResult.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, localResult.token);
        }
        setUser(localResult.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await safeFetch<{ url?: string; error?: string }>(
        `/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`
      );

      if (res.isJson && res.ok && res.data?.url) {
        const width = 540;
        const height = 660;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          res.data.url,
          'google_oauth_popup',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          return { success: false, error: 'Popup blocked by browser. Please allow popups to sign in with Google.' };
        }

        return { success: true };
      }

      // Fallback for Vercel static hosting / no Google OAuth backend
      const localRes = await localGoogleLogin();
      if (localRes.success && localRes.user) {
        if (localRes.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, localRes.token);
        }
        setUser(localRes.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }

      return { success: false, error: 'Could not complete Google Sign-In' };
    } catch (err: any) {
      // Fallback to local Google session
      const localRes = await localGoogleLogin();
      if (localRes.success && localRes.user) {
        if (localRes.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, localRes.token);
        }
        setUser(localRes.user);
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: err.message || 'Failed to initiate Google sign in' };
    }
  };

  const logout = async () => {
    try {
      await safeFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      localLogout();
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setUser(null);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await safeFetch<{ success?: boolean; message?: string; error?: string; resetUrl?: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );

      if (res.isJson) {
        if (!res.ok) {
          return { success: false, error: res.data?.error || 'Failed to request password reset' };
        }
        return { 
          success: true, 
          message: res.data?.message,
          resetUrl: res.data?.resetUrl 
        };
      }

      // Fallback to local reset
      const localRes = localForgotPassword(email);
      return localRes;
    } catch (err: any) {
      const localRes = localForgotPassword(email);
      return localRes;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const res = await safeFetch<{ user: User; token: string; error?: string }>(
        '/api/auth/reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword }),
        }
      );

      if (res.isJson) {
        if (!res.ok) {
          return { success: false, error: res.data?.error || 'Failed to reset password' };
        }
        if (res.data?.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
        }
        if (res.data?.user) {
          setUser(res.data.user);
        }
        setResetToken(null);
        return { success: true };
      }

      // Fallback to local reset
      const localRes = await localResetPassword(token, newPassword);
      if (localRes.success && localRes.user) {
        if (localRes.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, localRes.token);
        }
        setUser(localRes.user);
        setResetToken(null);
        return { success: true };
      }

      return { success: false, error: localRes.error || 'Failed to reset password' };
    } catch (err: any) {
      const localRes = await localResetPassword(token, newPassword);
      if (localRes.success && localRes.user) {
        if (localRes.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, localRes.token);
        }
        setUser(localRes.user);
        setResetToken(null);
        return { success: true };
      }
      return { success: false, error: err.message || 'Failed to reset password' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await safeFetch<{ success?: boolean; error?: string }>(
        '/api/auth/change-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );

      if (res.isJson) {
        if (!res.ok) {
          return { success: false, error: res.data?.error || 'Failed to change password' };
        }
        return { success: true };
      }

      // Fallback to local change
      if (user) {
        return await localChangePassword(user.id, currentPassword, newPassword);
      }
      return { success: false, error: 'User session not found' };
    } catch (err: any) {
      if (user) {
        return await localChangePassword(user.id, currentPassword, newPassword);
      }
      return { success: false, error: err.message || 'Failed to change password' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        authModalTab,
        authModalPrompt,
        resetToken,
        openAuthModal,
        closeAuthModal,
        setResetToken,
        login,
        register,
        loginWithGoogle,
        logout,
        forgotPassword,
        resetPassword,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
