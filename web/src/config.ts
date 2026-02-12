/**
 * Centralized application configuration
 * All env-dependent values in one place
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
