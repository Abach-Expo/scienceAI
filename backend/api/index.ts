// Vercel Serverless Entry Point
// @vercel/node will compile this TypeScript file and all its imports

// Set VERCEL env before any imports
process.env.VERCEL = '1';

import app from '../src/index';

export default app;
