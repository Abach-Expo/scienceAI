import { API_URL } from '../../config';
import { getAuthorizationHeaders } from '../../services/apiClient';

// Fallback photos when image APIs are unavailable
export const FALLBACK_PHOTOS: Record<string, string[]> = {
  'business': [
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1553484771-371a605b060b?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&h=900&fit=crop',
  ],
  'office': [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&h=900&fit=crop',
  ],
  'science': [
    'https://images.unsplash.com/photo-1532094349-3ce87c238782?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1600&h=900&fit=crop',
  ],
  'technology': [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=900&fit=crop',
  ],
  'nature': [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&h=900&fit=crop',
  ],
  'education': [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&h=900&fit=crop',
  ],
  'default': [
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=1600&h=900&fit=crop',
  ],
};

// Search photos via backend proxy (Pexels + Unsplash)
export const searchImageViaProxy = async (query: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `${API_URL}/images/search?q=${encodeURIComponent(query)}`,
      { headers: getAuthorizationHeaders() }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.url || null;
  } catch {
    return null;
  }
};

// Main photo search — backend proxy first, then fallback
export const searchUnsplashPhoto = async (query: string): Promise<string> => {
  const proxyPhoto = await searchImageViaProxy(query);
  if (proxyPhoto) return proxyPhoto;
  
  const words = query.toLowerCase().split(/[\s,]+/);
  for (const word of words) {
    for (const [category, photos] of Object.entries(FALLBACK_PHOTOS)) {
      if (word.includes(category) || category.includes(word)) {
        return photos[Math.floor(Math.random() * photos.length)];
      }
    }
  }
  
  const defaultPhotos = FALLBACK_PHOTOS['default'];
  return defaultPhotos[Math.floor(Math.random() * defaultPhotos.length)];
};

// AI image generation (uses Unsplash as proxy)
export const generateDALLE3Image = async (prompt: string): Promise<string | null> => {
  try {
    return await searchUnsplashPhoto(prompt);
  } catch {
    return null;
  }
};

// Get realistic photos by topic and subject
export const getRealisticPhoto = async (topic: string, subject: string): Promise<string> => {
  const subjectKeywords: Record<string, string[]> = {
    'science': ['laboratory', 'research', 'scientist', 'microscope', 'experiment'],
    'math': ['mathematics', 'equations', 'classroom', 'calculator', 'geometry'],
    'physics': ['physics', 'laboratory', 'experiment', 'energy', 'mechanics'],
    'chemistry': ['chemistry', 'laboratory', 'molecules', 'test tubes', 'chemicals'],
    'biology': ['biology', 'nature', 'cells', 'plants', 'wildlife'],
    'history': ['history', 'museum', 'ancient', 'historical', 'archive'],
    'geography': ['landscape', 'map', 'earth', 'travel', 'nature'],
    'literature': ['books', 'library', 'reading', 'writing', 'literature'],
    'informatics': ['computer', 'programming', 'technology', 'code', 'laptop'],
    'economics': ['business', 'finance', 'money', 'charts', 'economy'],
    'business': ['business', 'office', 'meeting', 'corporate', 'teamwork'],
    'medicine': ['medicine', 'hospital', 'doctor', 'healthcare', 'medical'],
    'psychology': ['psychology', 'mind', 'brain', 'therapy', 'mental health'],
    'art': ['art', 'painting', 'gallery', 'creative', 'artist'],
    'music': ['music', 'concert', 'instruments', 'musician', 'performance'],
    'marketing': ['marketing', 'advertising', 'brand', 'social media', 'campaign'],
    'startup': ['startup', 'innovation', 'entrepreneurship', 'team', 'workspace'],
    'technology': ['technology', 'gadgets', 'innovation', 'digital', 'future'],
    'education': ['education', 'school', 'students', 'learning', 'classroom'],
  };
  
  const keywords = subjectKeywords[subject] || ['professional', 'modern'];
  const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  const searchQuery = `${topic} ${randomKeyword}`;
  
  return searchUnsplashPhoto(searchQuery);
};
