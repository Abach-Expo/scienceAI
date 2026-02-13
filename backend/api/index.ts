import { Request, Response } from 'express';

// Minimal test handler for Vercel
export default function handler(req: Request, res: Response) {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Vercel serverless is working',
    path: req.url,
    timestamp: new Date().toISOString()
  });
}
