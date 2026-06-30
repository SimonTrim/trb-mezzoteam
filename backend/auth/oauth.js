import crypto from 'crypto';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export function buildAuthorizationUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TRIMBLE_CLIENT_ID,
    redirect_uri: process.env.TRIMBLE_REDIRECT_URI,
    scope: process.env.TRIMBLE_SCOPE ?? 'openid',
    state,
  });

  return `${process.env.TRIMBLE_AUTH_URL}?${params.toString()}`;
}

export function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

export async function exchangeCodeForTokens(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.TRIMBLE_REDIRECT_URI,
    client_id: process.env.TRIMBLE_CLIENT_ID,
    client_secret: process.env.TRIMBLE_CLIENT_SECRET,
  });

  const response = await fetch(process.env.TRIMBLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Échec échange token OAuth2: ${errorBody}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.TRIMBLE_CLIENT_ID,
    client_secret: process.env.TRIMBLE_CLIENT_SECRET,
  });

  const response = await fetch(process.env.TRIMBLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Échec refresh token OAuth2: ${errorBody}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

export function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS;
}

export async function getValidAccessToken(session) {
  if (!session?.tokens) return null;

  if (!isTokenExpired(session.tokens.expiresAt)) {
    return session.tokens.accessToken;
  }

  if (!session.tokens.refreshToken) return null;

  const refreshed = await refreshAccessToken(session.tokens.refreshToken);
  session.tokens = refreshed;
  return refreshed.accessToken;
}
