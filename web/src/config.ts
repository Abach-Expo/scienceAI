/**
 * Centralized application configuration
 * All env-dependent values in one place
 */

// Production backend URL
const PRODUCTION_API = 'https://science-ai-backend-l1aw.vercel.app/api';

const getApiUrl = (): string => {
  // Check Vite env var first (set at build time)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  
  // Runtime detection for production
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'science-ai.app' || host === 'www.science-ai.app' || host.includes('vercel.app')) {
      return PRODUCTION_API;
    }
  }
  
  return 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '706158118774-ukrop2ocg4iq23fu5npamstfquu549q2.apps.googleusercontent.com';
