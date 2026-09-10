export interface GoogleTokens {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface GoogleUserProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

export function getGoogleOAuthCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || '';
  return { clientId, clientSecret };
}

export function determineRedirectUri(requestedRedirectUri?: string): string {
  // If client provided a specific redirect_uri (e.g. window.location.origin + '/auth/callback')
  if (requestedRedirectUri) {
    try {
      const parsed = new URL(requestedRedirectUri);
      const allowedOrigins = [
        'pdf.shajedagroup.com',
        'localhost:3000',
        '127.0.0.1:3000',
      ];
      const isAllowed = 
        allowedOrigins.some(origin => parsed.host === origin) ||
        parsed.hostname.endsWith('.run.app');

      if (isAllowed) {
        return requestedRedirectUri.replace(/\/+$/, '');
      }
    } catch {
      // Fallback
    }
  }

  // Use APP_URL if present
  if (process.env.APP_URL) {
    const base = process.env.APP_URL.replace(/\/+$/, '');
    return `${base}/auth/callback`;
  }

  // Default fallback for development
  return 'https://ais-dev-ffqh3s3o3bpsvcsjmwvfkt-92868362030.asia-southeast1.run.app/auth/callback';
}

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = getGoogleOAuthCredentials();
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured in environment variables');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = getGoogleOAuthCredentials();
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials (CLIENT_ID / CLIENT_SECRET) are missing');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Google token exchange error:', data);
    throw new Error(data.error_description || data.error || 'Failed to exchange Google authorization code');
  }

  return data as GoogleTokens;
}

export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const profile = await response.json();
  if (!response.ok) {
    console.error('Google profile fetch error:', profile);
    throw new Error(profile.error_description || profile.error || 'Failed to fetch Google user profile');
  }

  return profile as GoogleUserProfile;
}
