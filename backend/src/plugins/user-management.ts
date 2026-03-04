/**
 * User management plugin API: users list, backup, restore.
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import * as store from './store';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const userIdHeader = 'x-user-id';

/** List plugins that have data for the current user (for backup selection). */
router.get('/backup/plugins', (req: Request, res: Response) => {
  const userId = req.headers[userIdHeader] as string | undefined;
  if (!userId?.trim()) return res.status(401).json({ error: 'User ID required' });
  const pluginIds = store.listPluginIdsForUser(userId);
  res.json({ pluginIds });
});

/** Create backup zip: body { pluginIds?: string[] } (omit or ['all'] = all plugins). */
router.post('/backup', (req: Request, res: Response) => {
  const userId = (req.headers[userIdHeader] as string | undefined)?.trim();
  if (!userId) return res.status(401).json({ error: 'User ID required' });
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as { pluginIds?: string[] };
  const requested = Array.isArray(body.pluginIds) ? body.pluginIds : [];
  const allForUser = store.listPluginIdsForUser(userId);
  const toBackup =
    requested.length === 0 || requested.includes('all')
      ? allForUser
      : requested.filter((id) => typeof id === 'string' && store.isPluginIdValid(id) && allForUser.includes(id));
  const zip = new AdmZip();
  for (const pluginId of toBackup) {
    const keys = store.listKeys(pluginId, userId);
    for (const key of keys) {
      const value = store.read(pluginId, key, userId);
      if (value !== null) {
        const entryPath = `${userId}/${pluginId}/${key}.json`;
        zip.addFile(entryPath, Buffer.from(JSON.stringify(value, null, 2), 'utf-8'));
      }
    }
  }
  const date = new Date().toISOString().slice(0, 10);
  const filename = `localhub-backup-${date}.zip`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.contentType('application/zip');
  res.send(zip.toBuffer());
});

/** Restore from backup zip (multipart file field "file"). Only entries for current user are applied. */
router.post('/restore', upload.single('file'), (req: Request, res: Response) => {
  const userId = (req.headers[userIdHeader] as string | undefined)?.trim();
  if (!userId) return res.status(401).json({ error: 'User ID required' });
  const file = req.file as Express.Multer.File | undefined;
  if (!file?.buffer) return res.status(400).json({ error: 'No file uploaded' });
  let zip: AdmZip;
  try {
    zip = new AdmZip(file.buffer);
  } catch {
    return res.status(400).json({ error: 'Invalid zip file' });
  }
  const entries = zip.getEntries();
  const errors: string[] = [];
  let restored = 0;
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    let name = entry.entryName.replace(/\\/g, '/').replace(/^\/+/, '');
    const parts = name.split('/');
    if (parts.length !== 3 || !parts[2].endsWith('.json')) continue;
    const [entryUserId, pluginId, keyFile] = parts;
    if (entryUserId !== userId) continue;
    const key = keyFile.replace(/\.json$/, '');
    if (!store.isPluginIdValid(pluginId) || !key || !/^[a-zA-Z0-9_-]+$/.test(key)) {
      errors.push(`Skipped invalid path: ${name}`);
      continue;
    }
    try {
      const raw = entry.getData().toString('utf-8');
      const value = JSON.parse(raw);
      if (store.write(pluginId, key, value, userId)) restored++;
      else errors.push(`Write failed: ${name}`);
    } catch (e) {
      errors.push(`Invalid JSON or write failed: ${name} (${e instanceof Error ? e.message : String(e)})`);
    }
  }
  res.json({ restored, errors: errors.length > 0 ? errors : undefined });
});

/** List users: returns { users: { id, name, emoji }[] }. */
router.get('/users', (_req: Request, res: Response) => {
  const userIds = store.listUserIds('user-management');
  const users = userIds.map((id) => {
    const p = store.read<{ name?: string; emoji?: string }>('user-management', 'profile', id);
    return {
      id,
      name: typeof p?.name === 'string' ? p.name : '',
      emoji: typeof p?.emoji === 'string' ? p.emoji : '👤',
    };
  });
  res.json({ users });
});

export default router;
