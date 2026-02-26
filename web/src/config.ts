/**
 * Centralized application configuration
 * All env-dependent values in one place
 */

// API URL: use environment variable with production fallback
export const API_URL = import.meta.env.VITE_API_URL || 'https://api.science-ai.app/api';

// Google Client ID from environment variable
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
