/**
 * JSON file store abstraction for plugins.
 * Path: data/plugins/{pluginId}/{key}.json
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

function pluginDir(pluginId: string): string {
  return path.join(config.dataDir, 'plugins', pluginId);
}

function filePath(pluginId: string, key: string, userId?: string): string {
  const dir = userId ? path.join(pluginDir(pluginId), userId) : pluginDir(pluginId);
  return path.join(dir, `${key}.json`);
}

export function getStoreFilePath(pluginId: string, key: string, userId?: string): string | null {
  const pid = sanitizePluginId(pluginId);
  const k = sanitizeKey(key);
  if (!pid || !k) return null;
  if (userId !== undefined && userId !== null && userId !== '') {
    const uid = sanitizeUserId(userId);
    if (!uid) return null;
    return filePath(pid, k, uid);
  }
  return filePath(pid, k);
}

export function read<T = unknown>(pluginId: string, key: string, userId?: string): T | null {
  const fp = getStoreFilePath(pluginId, key, userId);
  if (!fp) return null;
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
  if (!pid || !k) return false;
  const dir = userId && sanitizeUserId(userId)
    ? path.join(pluginDir(pid), sanitizeUserId(userId)!)
    : pluginDir(pid);
  const fp = filePath(pid, k, userId || undefined);
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
  if (!pid) return [];
  const dir = userId && sanitizeUserId(userId)
    ? path.join(pluginDir(pid), sanitizeUserId(userId)!)
    : pluginDir(pid);
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

/** List user IDs that have data under this plugin (subdirs of plugin dir that match userId pattern). */
export function listUserIds(pluginId: string): string[] {
  const pid = sanitizePluginId(pluginId);
  if (!pid) return [];
  const dir = pluginDir(pid);
  try {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.length > 0 && sanitizeUserId(e.name) !== null)
      .map((e) => e.name);
  } catch {
    return [];
  }
}

const USER_MANAGEMENT_PLUGIN_ID = 'user-management';
const PROFILE_KEY = 'profile';

/** Update the user profile's connectedApps list (for external API authorisation). Call on connect/disconnect. */
export function updateUserConnectedApps(userId: string, appId: string, add: boolean): boolean {
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) return false;
  const withUserId = read<Record<string, unknown>>(USER_MANAGEMENT_PLUGIN_ID, PROFILE_KEY, userId);
  const withoutUserId = read<Record<string, unknown>>(USER_MANAGEMENT_PLUGIN_ID, PROFILE_KEY);
  const profile: Record<string, unknown> = { ...(withUserId ?? withoutUserId ?? {}) };
  let apps: string[] = Array.isArray(profile.connectedApps) ? (profile.connectedApps as string[]).filter((id) => typeof id === 'string') : [];
  if (add) {
    if (!apps.includes(appId)) apps.push(appId);
  } else {
    apps = apps.filter((a) => a !== appId);
  }
  profile.connectedApps = apps;
  return write(USER_MANAGEMENT_PLUGIN_ID, PROFILE_KEY, profile, userId);
}
