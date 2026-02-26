/**
 * Google OAuth for Calendar plugin: auth URL and callback.
 * Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable.
 */
import { Router, Request, Response } from 'express';
import { config } from '../config';
import * as store from './store';
import { updateUserConnectedApps } from './store';

const PLUGIN_ID = 'calendar';
const STORE_KEY = 'google-calendar';
const TOKENS_STORE_KEY = 'google-calendar-tokens';
const userIdHeader = 'x-user-id';

interface StoredTokens {
  refresh_token: string;
  access_token?: string;
  expires_at?: number;
}

const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const router = Router();

router.post('/google/disconnect', (req: Request, res: Response) => {
  const userId = req.headers[userIdHeader] as string | undefined;
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return res.status(400).json({ error: 'Missing or invalid X-User-Id header' });
  }
  store.write(PLUGIN_ID, STORE_KEY, { connected: false }, userId);
  store.write(PLUGIN_ID, TOKENS_STORE_KEY, {}, userId);
  updateUserConnectedApps(userId, 'calendar', false);
  res.json({ ok: true });
});

router.get('/google/auth-url', (req: Request, res: Response) => {
  if (!config.googleClientId) {
    return res.json({ error: 'Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
  }
  const userId = req.headers[userIdHeader] as string | undefined;
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return res.status(400).json({ error: 'Missing or invalid X-User-Id header' });
  }
  const redirectUri = `${config.baseUrl}/api/plugins/calendar/google/callback`;
  const state = encodeURIComponent(userId);
  const url =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${encodeURIComponent(config.googleClientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${state}` +
    '&access_type=offline&prompt=consent';
  res.json({ url });
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const userId = typeof state === 'string' ? decodeURIComponent(state) : undefined;
  if (!code || typeof code !== 'string' || !userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return res.redirect(`${config.corsOrigin}/plugins/calendar?error=invalid_callback`);
  }
  if (!config.googleClientId || !config.googleClientSecret) {
    return res.redirect(`${config.corsOrigin}/plugins/calendar?error=not_configured`);
  }
  const redirectUri = `${config.baseUrl}/api/plugins/calendar/google/callback`;
  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  let tokens: { access_token?: string; refresh_token?: string };
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Google token exchange failed', tokenRes.status, err);
      return res.redirect(`${config.corsOrigin}/plugins/calendar?error=token_failed`);
    }
    tokens = (await tokenRes.json()) as { access_token?: string; refresh_token?: string };
  } catch (e) {
    console.error('Google token exchange error', e);
    return res.redirect(`${config.corsOrigin}/plugins/calendar?error=token_failed`);
  }
  let email: string | undefined;
  if (tokens.access_token) {
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (userRes.ok) {
        const user = (await userRes.json()) as { email?: string };
        email = user.email;
      }
    } catch {
      // ignore
    }
  }
  const connection = { connected: true, email: email ?? undefined };
  const tokensPayload: StoredTokens = {
    refresh_token: tokens.refresh_token ?? '',
    access_token: tokens.access_token,
    expires_at: tokens.access_token ? Math.floor(Date.now() / 1000) + 3500 : undefined,
  };
  if (!store.write(PLUGIN_ID, STORE_KEY, connection, userId)) {
    return res.redirect(`${config.corsOrigin}/plugins/calendar?error=save_failed`);
  }
  if (!store.write(PLUGIN_ID, TOKENS_STORE_KEY, tokensPayload, userId)) {
    return res.redirect(`${config.corsOrigin}/plugins/calendar?error=save_failed`);
  }
  updateUserConnectedApps(userId, 'calendar', true);
  res.redirect(`${config.corsOrigin}/plugins/calendar?connected=1`);
});

async function getAccessToken(userId: string): Promise<string | null> {
  const tokens = store.read<StoredTokens>(PLUGIN_ID, TOKENS_STORE_KEY, userId);
  if (!tokens?.refresh_token) return null;
  const now = Math.floor(Date.now() / 1000);
  if (tokens.access_token && tokens.expires_at && tokens.expires_at > now + 60) {
    return tokens.access_token;
  }
  const body = new URLSearchParams({
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  const access_token = data.access_token ?? null;
  if (access_token && data.expires_in) {
    const newTokens: StoredTokens = {
      ...tokens,
      access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    };
    store.write(PLUGIN_ID, TOKENS_STORE_KEY, newTokens, userId);
  }
  return access_token;
}

router.get('/google/events', async (req: Request, res: Response) => {
  const userId = req.headers[userIdHeader] as string | undefined;
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return res.status(400).json({ error: 'Missing or invalid X-User-Id header' });
  }
  const year = parseInt(String(req.query.year), 10);
  const month = parseInt(String(req.query.month), 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Invalid year or month' });
  }
  const timeMin = new Date(Date.UTC(year, month - 1, 1));
  const timeMax = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const accessToken = await getAccessToken(userId);
  if (!accessToken) {
    // 403 = no valid tokens for this user (reconnect in Calendar settings)
    return res.status(403).json({
      error: 'Not connected to Google Calendar',
      code: 'calendar_not_connected',
    });
  }
  const timeMinStr = timeMin.toISOString();
  const timeMaxStr = timeMax.toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${encodeURIComponent(timeMinStr)}&timeMax=${encodeURIComponent(timeMaxStr)}` +
    '&singleEvents=true&orderBy=startTime';
  try {
    const eventsRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!eventsRes.ok) {
      const err = await eventsRes.text();
      console.error('Google Calendar API error', eventsRes.status, err);
      return res.status(502).json({ error: 'Failed to fetch calendar events' });
    }
    const data = (await eventsRes.json()) as {
      items?: Array<{
        id?: string;
        summary?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        htmlLink?: string;
        colorId?: string;
      }>;
    };
    const items = data.items ?? [];
    const events = items.map((e) => ({
      id: e.id,
      summary: e.summary ?? '(No title)',
      start: e.start?.dateTime ?? e.start?.date,
      end: e.end?.dateTime ?? e.end?.date,
      htmlLink: e.htmlLink,
      colorId: e.colorId,
    }));
    res.json({ events });
  } catch (e) {
    console.error('Calendar events fetch error', e);
    res.status(502).json({ error: 'Failed to fetch calendar events' });
  }
});

/** Next day in YYYY-MM-DD (for all-day event end; Google API end date is exclusive). */
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Body: { events: [{ date, title?, description? }], colorId?: string } — colorId 1–11 for event colour */
router.post('/google/events', async (req: Request, res: Response) => {
  const userId = req.headers[userIdHeader] as string | undefined;
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return res.status(400).json({ error: 'Missing or invalid X-User-Id header' });
  }
  const body = req.body as { events?: Array<{ date?: string; title?: string; description?: string }>; colorId?: string };
  const events = Array.isArray(body?.events) ? body.events : [];
  if (events.length === 0) {
    return res.status(400).json({ error: 'No events provided' });
  }
  const colorId = typeof body.colorId === 'string' && /^([1-9]|1[01])$/.test(body.colorId) ? body.colorId : undefined;
  const accessToken = await getAccessToken(userId);
  if (!accessToken) {
    return res.status(403).json({
      error: 'Not connected to Google Calendar',
      code: 'calendar_not_connected',
    });
  }
  const created: string[] = [];
  const errors: string[] = [];
  for (const e of events) {
    const date = typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : null;
    const title = typeof e.title === 'string' && e.title.trim() ? e.title.trim() : 'Run';
    if (!date) {
      errors.push(`Invalid date: ${e.date}`);
      continue;
    }
    const payload: Record<string, unknown> = {
      summary: title,
      description: typeof e.description === 'string' ? e.description : undefined,
      start: { date },
      end: { date: nextDay(date) },
    };
    if (colorId) payload.colorId = colorId;
    try {
      const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload as object),
      });
      if (createRes.ok) {
        const data = (await createRes.json()) as { id?: string };
        if (data.id) created.push(data.id);
      } else {
        const errText = await createRes.text();
        errors.push(`${date}: ${errText.slice(0, 80)}`);
      }
    } catch (err) {
      errors.push(`${date}: ${String(err)}`);
    }
  }
  res.json({
    created: created.length,
    createdIds: created,
    failed: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});

/** Body: { eventIds: string[] } — delete events created by Runner (404 treated as already deleted) */
router.post('/google/events/delete', async (req: Request, res: Response) => {
  const userId = req.headers[userIdHeader] as string | undefined;
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return res.status(400).json({ error: 'Missing or invalid X-User-Id header' });
  }
  const body = req.body as { eventIds?: string[] };
  const eventIds = Array.isArray(body?.eventIds) ? body.eventIds.filter((id) => typeof id === 'string' && id.length > 0) : [];
  if (eventIds.length === 0) {
    return res.json({ deleted: 0 });
  }
  const accessToken = await getAccessToken(userId);
  if (!accessToken) {
    return res.status(403).json({
      error: 'Not connected to Google Calendar',
      code: 'calendar_not_connected',
    });
  }
  let deleted = 0;
  for (const eventId of eventIds) {
    try {
      const delRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (delRes.ok || delRes.status === 404) {
        deleted += 1;
      } else {
        const errText = await delRes.text();
        console.error('Google Calendar delete event failed', delRes.status, eventId, errText.slice(0, 100));
      }
    } catch (err) {
      console.error('Google Calendar delete event error', eventId, err);
    }
  }
  res.json({ deleted });
});

export default router;
