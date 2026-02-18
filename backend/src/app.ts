/**
 * Express application entry. Mounts API routes and plugin store.
 * Load .env from cwd or backend dir so API secrets are not in code (use .env.example as template).
 */
import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import pluginsRouter from './plugins';
import { health } from './routes/health';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
// Allow larger payloads for plugin store (e.g. reader books/collections import)
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', health);
app.use('/api/plugins', pluginsRouter);

// Optional: serve frontend static files (e.g. when running in Docker with PUBLIC_DIR set)
const publicDir = process.env.PUBLIC_DIR;
if (publicDir) {
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.listen(config.port, () => {
  console.log(`LocalHub API listening on http://localhost:${config.port}`);
});
