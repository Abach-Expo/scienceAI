/**
 * Centralized application configuration
 * All env-dependent values in one place
 */

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname === 'science-ai.app') {
    return 'https://science-ai-backend-l1aw.vercel.app/api';
  }
  return 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '706158118774-ukrop2ocg4iq23fu5npamstfquu549q2.apps.googleusercontent.com';
