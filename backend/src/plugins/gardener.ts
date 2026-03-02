/**
 * Gardener plugin: proxy to Perenual Plant API for species lookup.
 * Set PERENUAL_API_KEY in .env to enable. API docs: https://perenual.com/docs/api
 */
import https from 'https';
import { Router, Request, Response } from 'express';
import { config } from '../config';

const PERENUAL_BASE = 'https://perenual.com/api';

const router = Router();

/** HTTPS agent that tolerates expired/invalid certs (workaround for Perenual's expired cert). */
const perenualAgent = new https.Agent({ rejectUnauthorized: false });

function perenualUrl(path: string, params: Record<string, string> = {}): string {
  const search = new URLSearchParams({ key: config.perenualApiKey, ...params });
  return `${PERENUAL_BASE}${path}?${search.toString()}`;
}

/** GET a Perenual URL and return status + body text (uses custom agent for expired cert). */
function perenualGet(url: string): Promise<{ statusCode: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { agent: perenualAgent, headers: { Accept: 'application/json', 'User-Agent': 'LocalHub-Gardener/1.0' } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, text: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
  });
}

/** GET /api/plugins/gardener/species?q=...&page=1 - search species list */
router.get('/species', async (req: Request, res: Response) => {
  if (!config.perenualApiKey) {
    return res.status(503).json({ error: 'Perenual API is not configured. Set PERENUAL_API_KEY.' });
  }
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const page = typeof req.query.page === 'string' ? req.query.page : '1';
  const params: Record<string, string> = { page };
  if (q) params['q'] = q;
  const url = perenualUrl('/v2/species-list', params);
  try {
    const { statusCode, text } = await perenualGet(url);
    if (statusCode < 200 || statusCode >= 300) {
      let errMsg = text || 'Perenual API error';
      try {
        const parsed = JSON.parse(text) as { error?: string };
        if (parsed?.error) errMsg = parsed.error;
      } catch {
        /* use raw text */
      }
      console.error('Gardener Perenual species-list upstream', statusCode, errMsg.slice(0, 200));
      return res.status(statusCode).json({ error: errMsg });
    }
    let data: unknown;
    try {
      data = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      console.error('Gardener Perenual species-list: invalid JSON', text.slice(0, 200));
      return res.status(502).json({ error: 'Perenual returned invalid response' });
    }
    return res.json(data ?? { data: [], total: 0 });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error('Gardener Perenual species-list error', e);
    return res.status(502).json({
      error: 'Failed to fetch species from Perenual',
      detail: errMsg,
    });
  }
});

/** GET /api/plugins/gardener/species/:id - species details (Perenual: /v2/species/details/:id) */
router.get('/species/:id', async (req: Request, res: Response) => {
  if (!config.perenualApiKey) {
    return res.status(503).json({ error: 'Perenual API is not configured. Set PERENUAL_API_KEY.' });
  }
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'Missing species id' });
  const url = perenualUrl(`/v2/species/details/${id}`);
  try {
    const { statusCode, text } = await perenualGet(url);
    if (statusCode < 200 || statusCode >= 300) {
      if (statusCode === 404) return res.status(404).json({ error: 'Species not found' });
      let errMsg = text || 'Perenual API error';
      try {
        const parsed = JSON.parse(text) as { error?: string };
        if (parsed?.error) errMsg = parsed.error;
      } catch {
        /* use raw text */
      }
      return res.status(statusCode).json({ error: errMsg });
    }
    let data: unknown;
    try {
      data = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      return res.status(502).json({ error: 'Perenual returned invalid response' });
    }
    return res.json(data ?? {});
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error('Gardener Perenual species details error', e);
    return res.status(502).json({
      error: 'Failed to fetch species details from Perenual',
      detail: errMsg,
    });
  }
});

export default router;
