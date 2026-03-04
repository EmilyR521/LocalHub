/**
 * JSON file store abstraction for plugins.
 * Path: data/{user-key}/{plugin}/{key}.json
 * Run migrate-plugin-store.js once to move from legacy data/plugins/{plugin}/{userkey}/... layout.
 */
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { isPluginIdAllowed } from '../config';

const PLUGIN_ID_REGEX = /^[a-z0-9-]+$/;
const KEY_REGEX = /^[a-zA-Z0-9_-]+$/;
const USER_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

function sanitizePluginId(pluginId: string): string | null {
  if (typeof pluginId !== 'string' || !PLUGIN_ID_REGEX.test(pluginId)) return null;
  if (!isPluginIdAllowed(pluginId)) return null;
  return pluginId;
}

function sanitizeKey(key: string): string | null {
  if (typeof key !== 'string' || !KEY_REGEX.test(key)) return null;
  return key;
}

function sanitizeUserId(userId: string | undefined): string | null {
  if (userId === undefined || userId === null || typeof userId !== 'string') return null;
  const trimmed = userId.trim();
  return trimmed && USER_ID_REGEX.test(trimmed) ? trimmed : null;
}

/** Directory for user-scoped plugin data: data/{userId}/{pluginId} */
function userPluginDir(userId: string, pluginId: string): string {
  return path.join(config.dataDir, userId, pluginId);
}

function filePath(pluginId: string, key: string, userId: string): string {
  return path.join(userPluginDir(userId, pluginId), `${key}.json`);
}

export function getStoreFilePath(pluginId: string, key: string, userId?: string): string | null {
  const pid = sanitizePluginId(pluginId);
  const k = sanitizeKey(key);
  const uid = sanitizeUserId(userId ?? undefined);
  if (!pid || !k || !uid) return null;
  return filePath(pid, k, uid);
}

export function read<T = unknown>(pluginId: string, key: string, userId?: string): T | null {
  const fp = getStoreFilePath(pluginId, key, userId);
  if (fp === null) return null;
  try {
    const raw = fs.readFileSync(fp, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function write(pluginId: string, key: string, value: unknown, userId?: string): boolean {
  const pid = sanitizePluginId(pluginId);
  const k = sanitizeKey(key);
  const uid = sanitizeUserId(userId ?? undefined);
  if (!pid || !k || !uid) return false;
  const dir = userPluginDir(uid, pid);
  const fp = filePath(pid, k, uid);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(value, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function isPluginIdValid(pluginId: string): boolean {
  return sanitizePluginId(pluginId) !== null;
}

export function listKeys(pluginId: string, userId?: string): string[] {
  const pid = sanitizePluginId(pluginId);
  const uid = sanitizeUserId(userId ?? undefined);
  if (!pid || !uid) return [];
  const dir = userPluginDir(uid, pid);
  try {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.json'))
      .map((e) => e.name.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}

/** List plugin IDs that have data for this user (subdirs of data/{userId} that are valid plugin dirs). */
export function listPluginIdsForUser(userId: string): string[] {
  const uid = sanitizeUserId(userId);
  if (!uid) return [];
  const userDir = path.join(config.dataDir, uid);
  try {
    if (!fs.existsSync(userDir) || !fs.statSync(userDir).isDirectory()) return [];
    return fs
      .readdirSync(userDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && sanitizePluginId(e.name) !== null)
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/** List user IDs that have data under this plugin (subdirs of data/ that contain this plugin and match userId pattern). */
export function listUserIds(pluginId: string): string[] {
  const pid = sanitizePluginId(pluginId);
  if (!pid) return [];
  const dataDir = config.dataDir;
  try {
    if (!fs.existsSync(dataDir)) return [];
    const entries = fs.readdirSync(dataDir, { withFileTypes: true });
    const userIds: string[] = [];
    for (const e of entries) {
      if (!e.isDirectory() || e.name.length === 0 || e.name === 'plugins' || sanitizeUserId(e.name) === null) continue;
      const pluginDirPath = path.join(dataDir, e.name, pid);
      if (fs.existsSync(pluginDirPath) && fs.statSync(pluginDirPath).isDirectory()) {
        userIds.push(e.name);
      }
    }
    return userIds;
  } catch {
    return [];
  }
}

const USER_MANAGEMENT_PLUGIN_ID = 'user-management';
const PROFILE_KEY = 'profile';

/** Update the user profile's connectedApps list (for external API authorisation). Call on connect/disconnect. */
export function updateUserConnectedApps(userId: string, appId: string, add: boolean): boolean {
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) return false;
  const profile = read<Record<string, unknown>>(USER_MANAGEMENT_PLUGIN_ID, PROFILE_KEY, userId) ?? {};
  let apps: string[] = Array.isArray(profile.connectedApps) ? (profile.connectedApps as string[]).filter((id) => typeof id === 'string') : [];
  if (add) {
    if (!apps.includes(appId)) apps.push(appId);
  } else {
    apps = apps.filter((a) => a !== appId);
  }
  profile.connectedApps = apps;
  return write(USER_MANAGEMENT_PLUGIN_ID, PROFILE_KEY, profile, userId);
}
