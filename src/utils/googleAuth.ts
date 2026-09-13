import { User } from '../types/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (notification?: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: any; error_description?: string }) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: any) => void;
          };
        };
      };
    };
  }
}

const STORAGE_CLIENT_ID_KEY = 'pdfcraft_google_client_id';

export function getGoogleClientId(): string {
  // Check Vite client env, process.env, and localStorage
  const envVite = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  if (envVite && typeof envVite === 'string' && envVite.trim()) {
    return envVite.trim();
  }

  try {
    const processId = process.env.GOOGLE_CLIENT_ID;
    if (processId && typeof processId === 'string' && processId.trim()) {
      return processId.trim();
    }
  } catch {}

  try {
    const stored = localStorage.getItem(STORAGE_CLIENT_ID_KEY);
    if (stored && typeof stored === 'string' && stored.trim()) {
      return stored.trim();
    }
  } catch {}

  return '';
}

export function setGoogleClientId(clientId: string): void {
  try {
    localStorage.setItem(STORAGE_CLIENT_ID_KEY, clientId.trim());
  } catch {}
}

export function parseGoogleJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to parse Google JWT:', err);
    return null;
  }
}

// Wait up to 3 seconds for Google Identity Services script to load
async function waitForGoogleSdk(timeoutMs = 3000): Promise<boolean> {
  if (typeof window !== 'undefined' && window.google?.accounts) {
    return true;
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (typeof window !== 'undefined' && window.google?.accounts) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return Boolean(typeof window !== 'undefined' && window.google?.accounts);
}

/**
 * Performs real Google Sign-In using Google Identity Services (OAuth 2.0 Token Client)
 * Connects directly to accounts.google.com and googleapis.com from the browser.
 * Works seamlessly in any environment (Vercel, Cloud Run, custom domain, localhost).
 */
export async function triggerRealGoogleSignIn(): Promise<{
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}> {
  const clientId = getGoogleClientId();

  if (!clientId) {
    return {
      success: false,
      error: 'Google Client ID is missing. Please configure GOOGLE_CLIENT_ID in your environment variables or deployment settings.',
    };
  }

  const sdkReady = await waitForGoogleSdk();

  if (!sdkReady || !window.google?.accounts?.oauth2) {
    // If the official Google SDK is blocked (e.g. ad-blocker), fallback to direct OAuth popup
    return signInViaDirectGooglePopup(clientId);
  }

  return new Promise((resolve) => {
    let resolved = false;

    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
          if (resolved) return;
          resolved = true;

          if (tokenResponse.error) {
            console.error('Google OAuth error:', tokenResponse);
            return resolve({
              success: false,
              error: tokenResponse.error_description || tokenResponse.error || 'Google sign in was cancelled or failed.',
            });
          }

          if (!tokenResponse.access_token) {
            return resolve({
              success: false,
              error: 'Failed to obtain access token from Google.',
            });
          }

          try {
            // Fetch real user profile from Google's official userinfo API
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error_description || 'Failed to fetch user profile from Google');
            }

            const profile = await res.json();

            if (!profile.email) {
              throw new Error('Google account did not return a verified email address.');
            }

            const user: User = {
              id: 'goog_' + (profile.sub || Math.random().toString(36).substring(2, 9)),
              name: profile.name || profile.email.split('@')[0],
              email: profile.email.toLowerCase(),
              avatar_url: profile.picture || null,
              provider: 'google',
              created_at: Date.now(),
            };

            return resolve({
              success: true,
              user,
              token: tokenResponse.access_token,
            });
          } catch (err: any) {
            console.error('Error fetching Google profile:', err);
            return resolve({
              success: false,
              error: err.message || 'Failed to retrieve Google profile information.',
            });
          }
        },
        error_callback: (err: any) => {
          if (resolved) return;
          resolved = true;
          console.error('Google token client error callback:', err);
          return resolve({
            success: false,
            error: err?.message || 'Google sign-in popup was closed or blocked.',
          });
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      console.error('Failed to initialize Google token client:', err);
      // Fallback to direct OAuth popup
      return signInViaDirectGooglePopup(clientId).then(resolve);
    }
  });
}

/**
 * Fallback direct OAuth popup for cases where GSI script might be blocked or hindered.
 */
function signInViaDirectGooglePopup(clientId: string): Promise<{
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    try {
      const redirectUri = window.location.origin;
      const state = 'g_oauth_' + Math.random().toString(36).substring(2);

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: 'openid email profile',
        state: state,
        prompt: 'select_account',
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      const width = 520;
      const height = 640;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        return resolve({
          success: false,
          error: 'Popup was blocked by your browser. Please allow popups for this site.',
        });
      }

      // Check popup location for returned access_token in hash fragment
      const timer = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(timer);
            return resolve({
              success: false,
              error: 'Google Sign In window was closed before completion.',
            });
          }

          let currentUrl = '';
          try {
            currentUrl = popup.location.href;
          } catch {
            // Cross-origin access denied while on accounts.google.com - wait
            return;
          }

          if (currentUrl.includes(redirectUri) && currentUrl.includes('access_token')) {
            clearInterval(timer);
            const hash = popup.location.hash.substring(1);
            popup.close();

            const hashParams = new URLSearchParams(hash);
            const accessToken = hashParams.get('access_token');

            if (!accessToken) {
              return resolve({ success: false, error: 'Access token not found in Google response.' });
            }

            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const profile = await res.json();

            const user: User = {
              id: 'goog_' + (profile.sub || Math.random().toString(36).substring(2, 9)),
              name: profile.name || profile.email.split('@')[0],
              email: profile.email.toLowerCase(),
              avatar_url: profile.picture || null,
              provider: 'google',
              created_at: Date.now(),
            };

            return resolve({ success: true, user, token: accessToken });
          }
        } catch {
          // ignore until popup finishes
        }
      }, 500);

      // Timeout after 3 minutes
      setTimeout(() => {
        clearInterval(timer);
      }, 180000);
    } catch (err: any) {
      return resolve({
        success: false,
        error: err.message || 'Failed to open Google Sign-In popup.',
      });
    }
  });
}
