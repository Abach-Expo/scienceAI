// Vercel Serverless Entry Point
import { Request, Response } from 'express';

let app: any;
let loadError: string | null = null;

try {
  app = require('../src/index').default || require('../src/index');
} catch (err: any) {
  loadError = err.message + '\n' + (err.stack || '');
  console.error('Failed to load app:', loadError);
}

export default function handler(req: Request, res: Response) {
  if (loadError) {
    return res.status(500).json({ 
      error: 'App failed to load',
      details: loadError
    });
  }
  return app(req, res);
}
