/**
 * Centralized application configuration
 * All env-dependent values in one place
 */

// API URL: use environment variable with production fallback
// Ensure URL always ends with /api
const rawApiUrl = import.meta.env.VITE_API_URL || 'https://api.science-ai.app/api';
export const API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

// Google Client ID from environment variable
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
