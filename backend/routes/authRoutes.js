import { config } from '../config.js';
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  generateState,
  getValidAccessToken,
} from '../auth/oauth.js';

export function createAuthRoutes(router) {
  router.get('/login', (req, res) => {
    const state = generateState();
    req.session.oauthState = state;
    const authUrl = buildAuthorizationUrl(state);
    res.redirect(authUrl);
  });

  router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

    if (error) {
      return res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(String(error))}`);
    }

    if (!code || state !== req.session.oauthState) {
      return res.status(400).json({ error: 'État OAuth2 invalide ou code manquant' });
    }

    try {
      const tokens = await exchangeCodeForTokens(String(code));
      req.session.tokens = tokens;
      delete req.session.oauthState;
      res.redirect(frontendUrl);
    } catch (err) {
      console.error('[auth/callback]', err);
      res.redirect(`${frontendUrl}?auth_error=token_exchange_failed`);
    }
  });

  router.get('/status', async (req, res) => {
    if (config.useMockMezzoteam) {
      return res.json({ authenticated: true, mock: true });
    }

    try {
      const accessToken = await getValidAccessToken(req.session);
      res.json({
        authenticated: Boolean(accessToken),
        expiresAt: req.session.tokens?.expiresAt ?? null,
      });
    } catch {
      req.session.tokens = null;
      res.json({ authenticated: false });
    }
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('mezzoteam.sid');
      res.json({ success: true });
    });
  });
}
