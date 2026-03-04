/**
 * Plugin loader & registry. Mounts store API routes, calendar Google OAuth, Strava OAuth, gardener, user-management.
 */
import { Router } from 'express';
import * as store from './store';
import calendarGoogleRouter from './calendar-google';
import stravaRouter from './strava';
import gardenerRouter from './gardener';
import userManagementRouter from './user-management';

const router = Router();
const userIdHeader = 'x-user-id';

router.use('/calendar', calendarGoogleRouter);
router.use('/strava', stravaRouter);
router.use('/gardener', gardenerRouter);
router.use('/user-management', userManagementRouter);

router.get('/:pluginId/store', (req, res) => {
  const { pluginId } = req.params;
  const userId = req.headers[userIdHeader] as string | undefined;
  if (!store.isPluginIdValid(pluginId)) {
    return res.status(400).json({ error: 'Invalid pluginId' });
  }
  res.json({ keys: store.listKeys(pluginId, userId) });
});

router.get('/:pluginId/store/:key', (req, res) => {
  const { pluginId, key } = req.params;
  const userId = req.headers[userIdHeader] as string | undefined;
  const value = store.read(pluginId, key, userId);
  if (value === null && store.getStoreFilePath(pluginId, key, userId) === null) {
    return res.status(400).json({ error: 'Invalid pluginId or key' });
  }
  if (value === null) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(value);
});

router.put('/:pluginId/store/:key', (req, res) => {
  const { pluginId, key } = req.params;
  const userId = req.headers[userIdHeader] as string | undefined;
  const value = req.body;
  if (store.getStoreFilePath(pluginId, key, userId) === null) {
    return res.status(400).json({ error: 'Invalid pluginId or key' });
  }
  if (!store.write(pluginId, key, value, userId)) {
    return res.status(500).json({ error: 'Write failed' });
  }
  res.json(value);
});

export default router;
