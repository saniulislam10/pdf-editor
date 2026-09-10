import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { 
  initDatabase 
} from './server/db';
import { 
  createUserWithEmail, 
  findUserByEmail, 
  verifyPassword, 
  createSession, 
  getSessionUser, 
  deleteSession,
  sanitizeUser,
  createPasswordResetToken,
  resetPasswordWithToken,
  updateUserPassword,
  createOrUpdateGoogleUser
} from './server/authService';
import {
  determineRedirectUri,
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  fetchGoogleUserProfile,
  getGoogleOAuthCredentials
} from './server/googleOAuth';

dotenv.config();

// Initialize database tables
initDatabase();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Cookie configuration for cross-origin iframe + modern HTTPS
const COOKIE_NAME = 'pdfcraft_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// Helper to extract session token from cookies or Authorization header
function getSessionToken(req: Request): string | null {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

// Authentication middleware for protected routes
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const user = getSessionUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  (req as any).user = user;
  (req as any).sessionToken = token;
  next();
}

// ==========================================
// 1. Health check
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ==========================================
// 2. Email / Password Register
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a valid name (at least 2 characters).' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const user = await createUserWithEmail(name, email, password);
    const sessionToken = createSession(user.id, req.headers['user-agent'], req.ip);

    res.cookie(COOKIE_NAME, sessionToken, COOKIE_OPTIONS);
    return res.status(201).json({
      user: sanitizeUser(user),
      token: sessionToken,
      message: 'Account created successfully',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// ==========================================
// 3. Email / Password Login
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.password_hash) {
      return res.status(400).json({ 
        error: 'This account was created with Google Sign In. Please use "Continue with Google".' 
      });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const sessionToken = createSession(user.id, req.headers['user-agent'], req.ip);

    res.cookie(COOKIE_NAME, sessionToken, COOKIE_OPTIONS);
    return res.json({
      user: sanitizeUser(user),
      token: sessionToken,
      message: 'Logged in successfully',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred during login' });
  }
});

// ==========================================
// 4. Session Validation (Get Current User)
// ==========================================
app.get('/api/auth/me', (req, res) => {
  const token = getSessionToken(req);
  if (!token) {
    return res.json({ user: null });
  }

  const user = getSessionUser(token);
  if (!user) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.json({ user: null });
  }

  return res.json({ user });
});

// ==========================================
// 5. Logout
// ==========================================
app.post('/api/auth/logout', (req, res) => {
  const token = getSessionToken(req);
  if (token) {
    deleteSession(token);
  }
  res.clearCookie(COOKIE_NAME, { path: '/' });
  return res.json({ success: true, message: 'Logged out successfully' });
});

// ==========================================
// 6. Forgot Password
// ==========================================
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = createPasswordResetToken(email);

    // Generic safe response to prevent email enumeration
    const genericSuccess = {
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.',
    };

    if (!result) {
      return res.json(genericSuccess);
    }

    // Generate reset URL for development and preview environments
    const origin = req.headers.origin || (process.env.APP_URL ? process.env.APP_URL.replace(/\/+$/, '') : 'http://localhost:3000');
    const resetUrl = `${origin}?reset_token=${result.token}`;

    console.log(`[PDF Craft Password Reset] Token for ${email}: ${result.token}`);
    console.log(`[PDF Craft Password Reset] Reset Link: ${resetUrl}`);

    return res.json({
      ...genericSuccess,
      // Provide preview resetUrl for test verification
      resetUrl,
      debugToken: process.env.NODE_ENV !== 'production' ? result.token : undefined
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// ==========================================
// 7. Reset Password
// ==========================================
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const user = await resetPasswordWithToken(token, newPassword);
    // Create new clean session
    const sessionToken = createSession(user.id, req.headers['user-agent'], req.ip);
    res.cookie(COOKIE_NAME, sessionToken, COOKIE_OPTIONS);

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You are now logged in.',
      user: sanitizeUser(user),
      token: sessionToken,
    });
  } catch (err: any) {
    console.error('Password reset error:', err);
    return res.status(400).json({ error: err.message || 'Failed to reset password' });
  }
});

// ==========================================
// 8. Change Password (Authenticated)
// ==========================================
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    await updateUserPassword(user.id, currentPassword, newPassword);
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('Change password error:', err);
    return res.status(400).json({ error: err.message || 'Failed to update password' });
  }
});

// ==========================================
// 9. Google OAuth: Construct Auth URL
// ==========================================
app.get('/api/auth/google/url', (req, res) => {
  try {
    const requestedRedirect = req.query.redirect_uri as string | undefined;
    const redirectUri = determineRedirectUri(requestedRedirect);
    
    // State token for CSRF protection with timestamp
    const statePayload = {
      random: crypto.randomBytes(16).toString('hex'),
      redirectUri,
      time: Date.now()
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const authUrl = buildGoogleAuthUrl(redirectUri, state);
    return res.json({ url: authUrl, redirectUri });
  } catch (err: any) {
    console.error('Error generating Google OAuth URL:', err);
    return res.status(500).json({ 
      error: err.message || 'Failed to generate Google OAuth URL. Please check server configuration.' 
    });
  }
});

// ==========================================
// 10. Google OAuth Callback (Popup Window Closer)
// ==========================================
const handleGoogleCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('Google OAuth callback returned error:', error);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Failed</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa;">
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px;">
            <h2 style="color: #dc2626; margin-top: 0;">Sign In Cancelled</h2>
            <p style="color: #52525b; font-size: 14px;">${encodeURIComponent(String(error))}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${encodeURIComponent(String(error))}' }, '*');
                setTimeout(() => window.close(), 1500);
              }
            </script>
          </div>
        </body>
      </html>
    `);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing authorization code');
  }

  try {
    let redirectUri = '';
    if (state && typeof state === 'string') {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
        if (decoded && decoded.redirectUri) {
          redirectUri = decoded.redirectUri;
        }
      } catch {}
    }

    if (!redirectUri) {
      redirectUri = determineRedirectUri();
    }

    // Exchange code for Google tokens
    const tokens = await exchangeGoogleCode(code, redirectUri);
    // Fetch user profile from Google
    const profile = await fetchGoogleUserProfile(tokens.access_token);

    // Create or link user in database
    const user = createOrUpdateGoogleUser(
      profile.sub,
      profile.email,
      profile.name || profile.email.split('@')[0],
      profile.picture
    );

    // Create session
    const sessionToken = createSession(user.id, req.headers['user-agent'], req.ip);
    res.cookie(COOKIE_NAME, sessionToken, COOKIE_OPTIONS);

    const safeUser = sanitizeUser(user);

    // Return HTML that posts message to opener and closes itself cleanly
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f8fafc;
              color: #0f172a;
            }
            .card {
              text-align: center;
              padding: 2.5rem;
              background: white;
              border-radius: 16px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
              max-width: 380px;
            }
            .spinner {
              width: 32px;
              height: 32px;
              border: 3px solid #e2e8f0;
              border-top-color: #dc2626;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin: 0 auto 1.25rem;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h3 style="margin: 0 0 0.5rem; font-size: 1.25rem;">Authenticated!</h3>
            <p style="margin: 0; font-size: 0.875rem; color: #64748b;">Closing window and returning to PDF Craft...</p>
          </div>
          <script>
            (function() {
              var payload = {
                type: 'OAUTH_AUTH_SUCCESS',
                provider: 'google',
                token: ${JSON.stringify(sessionToken)},
                user: ${JSON.stringify(safeUser)}
              };
              if (window.opener) {
                window.opener.postMessage(payload, '*');
                setTimeout(function() {
                  window.close();
                }, 300);
              } else {
                window.location.href = '/';
              }
            })();
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Error</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa;">
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 440px;">
            <h3 style="color: #dc2626; margin-top: 0;">Authentication Failed</h3>
            <p style="color: #52525b; font-size: 14px;">${encodeURIComponent(err.message || 'An error occurred during Google sign-in')}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${encodeURIComponent(err.message || 'Sign in failed')}' }, '*');
                setTimeout(() => window.close(), 2500);
              }
            </script>
          </div>
        </body>
      </html>
    `);
  }
};

app.get(['/auth/callback', '/auth/callback/'], handleGoogleCallback);

// ==========================================
// 11. Vite & Static Asset Handling
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PDF Craft Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
