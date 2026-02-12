import { logger } from '../utils/logger';

/**
 * Image search proxy: Pexels, Unsplash, fallback photos
 * Pexels/Unsplash API keys stored in environment variables
 */

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

// Pexels search
async function searchPexels(query: string): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;
  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!response.ok) return null;
    const data = await response.json() as { photos?: Array<{ src: { large2x?: string; large: string } }> };
    if (data.photos?.length) {
      const idx = Math.floor(Math.random() * data.photos.length);
      return data.photos[idx].src.large2x || data.photos[idx].src.large;
    }
  } catch (e) {
    logger.error('[Images] Pexels error:', e);
  }
  return null;
}

// Unsplash search
async function searchUnsplash(query: string): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY) return null;
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
    );
    if (!response.ok) return null;
    const data = await response.json() as { results?: Array<{ urls: { regular: string } }> };
    if (data.results?.length) {
      const idx = Math.floor(Math.random() * data.results.length);
      return data.results[idx].urls.regular;
    }
  } catch (e) {
    logger.error('[Images] Unsplash error:', e);
  }
  return null;
}

// Fallback photos
const FALLBACK_PHOTOS: Record<string, string[]> = {
  business: [
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1553484771-371a605b060b?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&h=900&fit=crop',
  ],
  office: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&h=900&fit=crop',
  ],
  science: [
    'https://images.unsplash.com/photo-1532094349-3ce87c238782?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1600&h=900&fit=crop',
  ],
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=900&fit=crop',
  ],
  nature: [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&h=900&fit=crop',
  ],
  education: [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&h=900&fit=crop',
  ],
  default: [
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=1600&h=900&fit=crop',
  ],
};

// Main photo search: API first, then fallback
export async function searchPhoto(query: string): Promise<string> {
  const pexels = await searchPexels(query);
  if (pexels) return pexels;

  const unsplash = await searchUnsplash(query);
  if (unsplash) return unsplash;

  // Category-based fallback
  const words = query.toLowerCase().split(/[\s,]+/);
  for (const word of words) {
    for (const [category, photos] of Object.entries(FALLBACK_PHOTOS)) {
      if (word.includes(category) || category.includes(word)) {
        return photos[Math.floor(Math.random() * photos.length)];
      }
    }
  }

  const defaults = FALLBACK_PHOTOS.default;
  return defaults[Math.floor(Math.random() * defaults.length)];
}
