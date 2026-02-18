/**
 * Server config: port, data path, CORS, allowed plugin IDs.
 * API secrets (Google/Strava OAuth) are read from env only – use .env (gitignored) or system env.
 */
import path from 'path';

const dataDir = process.env.LOCALHUB_DATA ?? path.join(process.cwd(), 'data');
const port = parseInt(process.env.PORT ?? '3000', 10);
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:4200';
const baseUrl = process.env.LOCALHUB_BASE_URL ?? `http://localhost:${port}`;

/** Allowed plugin IDs for store access (empty = allow any). */
const allowedPluginIds = process.env.LOCALHUB_PLUGIN_IDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

/** Google OAuth for Calendar plugin (optional). Set in .env or environment. */
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

/** Strava OAuth for Runner / recent activities (optional). Set in .env or environment. */
const stravaClientId = process.env.STRAVA_CLIENT_ID ?? '';
const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET ?? '';

export const config = {
  port,
  dataDir,
  corsOrigin,
  baseUrl,
  allowedPluginIds,
  googleClientId,
  googleClientSecret,
  stravaClientId,
  stravaClientSecret,
} as const;

export function isPluginIdAllowed(pluginId: string): boolean {
  if (allowedPluginIds.length === 0) return true;
  return allowedPluginIds.includes(pluginId);
}
