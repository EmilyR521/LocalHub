/**
 * Health check route (GET /api/health).
 */
import { Request, Response } from 'express';

export function health(_req: Request, res: Response): void {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}
