/**
 * Strava OAuth and API for recent activities.
 * Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to enable.
 *
 * Dev only: set LOCALHUB_DEV_INSECURE_TLS=1 to skip TLS verification for Strava
 * requests (e.g. when a proxy or corporate TLS inspection uses an expired cert).
 */
import https from 'https';
import { Router, Request, Response } from 'express';
import { config } from '../config';
import * as store from './store';
import { updateUserConnectedApps } from './store';

const PLUGIN_ID = 'strava';

/** When set (e.g. "1"), use an HTTPS agent that skips cert verification for Strava requests (dev only). */
const devInsecureTls = process.env.LOCALHUB_DEV_INSECURE_TLS === '1';
if (devInsecureTls) {
  console.warn('Strava: LOCALHUB_DEV_INSECURE_TLS=1 — TLS verification disabled for Strava API (dev only).');
}

function stravaFetch(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown> }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const agent = devInsecureTls ? new https.Agent({ rejectUnauthorized: false }) : undefined;
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: options.method ?? 'GET',
        headers: options.headers,
        agent,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode ?? 0,
            text: () => Promise.resolve(body),
            json: () => Promise.resolve(JSON.parse(body)),
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
const CONNECTION_STORE_KEY = 'strava-connection';
const TOKENS_STORE_KEY = 'strava-tokens';
const userIdHeader = 'x-user-id';

interface StoredTokens {
  refresh_token: string;
  access_token?: string;
  expires_at?: number;
}

const SCOPE = 'activity:read_all';

const router = Router();

router.post('/disconnect', (req: Request, res: Response) => {
  const userId = req.headers[userIdHeader] as string | undefined;
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return res.status(400).json({ error: 'Missing or invalid X-User-Id header' });
  }
  store.write(PLUGIN_ID, CONNECTION_STORE_KEY, { connected: false }, userId);
  store.write(PLUGIN_ID, TOKENS_STORE_KEY, {}, userId);
  updateUserConnectedApps(userId, 'strava', false);
  res.json({ ok: true });
});

router.get('/auth-url', (req: Request, res: Response) => {
  if (!config.stravaClientId || !config.stravaClientSecret) {
    return res.json({
      error: 'Strava is not configured. Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET.',
    });
  }
  const userId = req.headers[userIdHeader] as string | undefined;
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return res.status(400).json({ error: 'Missing or invalid X-User-Id header' });
  }
  const redirectUri = `${config.baseUrl}/api/plugins/strava/callback`;
  const state = encodeURIComponent(userId);
  const url =
    'https://www.strava.com/oauth/authorize?' +
    `client_id=${encodeURIComponent(config.stravaClientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    '&approval_prompt=force' +
    `&state=${state}`;
  res.json({ url });
});

router.get('/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const userId = typeof state === 'string' ? decodeURIComponent(state) : undefined;
  if (!code || typeof code !== 'string' || !userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return res.redirect(`${config.corsOrigin}/plugins/runner/recent?strava=error&message=invalid_callback`);
  }
  if (!config.stravaClientId || !config.stravaClientSecret) {
    return res.redirect(`${config.corsOrigin}/plugins/runner/recent?strava=error&message=not_configured`);
  }
  const redirectUri = `${config.baseUrl}/api/plugins/strava/callback`;
  const body = new URLSearchParams({
    client_id: config.stravaClientId,
    client_secret: config.stravaClientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  let tokens: { access_token?: string; refresh_token?: string; expires_at?: number };
  let connection!: { connected: boolean; athlete?: { username?: string; firstname?: string; lastname?: string; profile?: string } };
  try {
    const tokenRes = await stravaFetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Strava token exchange failed', tokenRes.status, err);
      return res.redirect(`${config.corsOrigin}/plugins/runner/recent?strava=error&message=token_failed`);
    }
    const data = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
      athlete?: {
        username?: string;
        firstname?: string;
        lastname?: string;
        profile?: string;
        profile_medium?: string;
      };
    };
    tokens = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
    const athlete = data.athlete
      ? {
          username: data.athlete.username,
          firstname: data.athlete.firstname,
          lastname: data.athlete.lastname,
          profile: data.athlete.profile ?? data.athlete.profile_medium,
        }
      : undefined;
    connection = { connected: true, athlete };
  } catch (e) {
    console.error('Strava token exchange error', e);
    return res.redirect(`${config.corsOrigin}/plugins/runner/recent?strava=error&message=token_failed`);
  }
  const tokensPayload: StoredTokens = {
    refresh_token: tokens.refresh_token ?? '',
    access_token: tokens.access_token,
    expires_at: tokens.expires_at,
  };
  if (!store.write(PLUGIN_ID, CONNECTION_STORE_KEY, connection, userId)) {
    return res.redirect(`${config.corsOrigin}/plugins/runner/recent?strava=error&message=save_failed`);
  }
  if (!store.write(PLUGIN_ID, TOKENS_STORE_KEY, tokensPayload, userId)) {
    return res.redirect(`${config.corsOrigin}/plugins/runner/recent?strava=error&message=save_failed`);
  }
  updateUserConnectedApps(userId, 'strava', true);
  res.redirect(`${config.corsOrigin}/plugins/runner/recent?strava=connected`);
});

async function getAccessToken(userId: string): Promise<string | null> {
  const tokens = store.read<StoredTokens>(PLUGIN_ID, TOKENS_STORE_KEY, userId);
  if (!tokens?.refresh_token) return null;
  const now = Math.floor(Date.now() / 1000);
  if (tokens.access_token && tokens.expires_at && tokens.expires_at > now + 60) {
    return tokens.access_token;
  }
  const body = new URLSearchParams({
    client_id: config.stravaClientId,
    client_secret: config.stravaClientSecret,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await stravaFetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };
  const access_token = data.access_token ?? null;
  if (access_token) {
    const newTokens: StoredTokens = {
      refresh_token: data.refresh_token ?? tokens.refresh_token,
      access_token,
      expires_at: data.expires_at,
    };
    store.write(PLUGIN_ID, TOKENS_STORE_KEY, newTokens, userId);
  }
  return access_token;
}

/** GET /activities?page=1&per_page=30 — returns recent activities (requires auth). */
router.get('/activities', async (req: Request, res: Response) => {
  const userId = req.headers[userIdHeader] as string | undefined;
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return res.status(400).json({ error: 'Missing or invalid X-User-Id header' });
  }
  const accessToken = await getAccessToken(userId);
  if (!accessToken) {
    return res.status(403).json({
      error: 'Not connected to Strava',
      code: 'strava_not_connected',
    });
  }
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(String(req.query.per_page), 10) || 30));
  const url = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`;
  try {
    const activitiesRes = await stravaFetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!activitiesRes.ok) {
      if (activitiesRes.status === 401) {
        return res.status(403).json({
          error: 'Strava session expired. Please reconnect.',
          code: 'strava_not_connected',
        });
      }
      const err = await activitiesRes.text();
      console.error('Strava activities API error', activitiesRes.status, err);
      return res.status(502).json({ error: 'Failed to fetch Strava activities' });
    }
    const data = (await activitiesRes.json()) as Array<{
      id: number;
      name?: string;
      type?: string;
      sport_type?: string;
      start_date?: string;
      start_date_local?: string;
      distance?: number;
      moving_time?: number;
      elapsed_time?: number;
      total_elevation_gain?: number;
    }>;
    const activities = data.map((a) => ({
      id: a.id,
      name: a.name ?? 'Activity',
      type: a.type,
      sport_type: a.sport_type,
      start_date: a.start_date,
      start_date_local: a.start_date_local,
      distance: a.distance,
      moving_time: a.moving_time,
      elapsed_time: a.elapsed_time,
      total_elevation_gain: a.total_elevation_gain,
    }));
    res.json({ activities });
  } catch (e) {
    console.error('Strava activities fetch error', e);
    res.status(502).json({ error: 'Failed to fetch Strava activities' });
  }
});

/** GET /connection — whether user has connected Strava and athlete summary (no token needed). */
router.get('/connection', (req: Request, res: Response) => {
  const userId = req.headers[userIdHeader] as string | undefined;
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return res.status(400).json({ error: 'Missing or invalid X-User-Id header' });
  }
  const conn = store.read<{ connected?: boolean; athlete?: { username?: string; firstname?: string; lastname?: string; profile?: string } }>(PLUGIN_ID, CONNECTION_STORE_KEY, userId);
  res.json({ connected: !!conn?.connected, athlete: conn?.athlete });
});

export default router;
