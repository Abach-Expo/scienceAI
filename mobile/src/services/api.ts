import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth state
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // You might want to navigate to login screen here
    }
    return Promise.reject(error);
  }
);

// Search service for scientific articles
export const searchService = {
  searchArxiv: async (query: string, maxResults = 10) => {
    const response = await api.get('/search/arxiv', {
      params: { q: query, maxResults },
    });
    return response.data.data;
  },

  searchSemanticScholar: async (query: string, limit = 10) => {
    const response = await api.get('/search/semantic-scholar', {
      params: { q: query, limit },
    });
    return response.data.data;
  },

  searchCombined: async (query: string, maxResults = 20) => {
    const response = await api.get('/search/combined', {
      params: { q: query, maxResults },
    });
    return response.data.data;
  },

  saveReference: async (projectId: string, reference: any) => {
    const response = await api.post('/search/save-reference', {
      projectId,
      reference,
    });
    return response.data.data;
  },

  getProjectReferences: async (projectId: string) => {
    const response = await api.get(`/search/project/${projectId}/references`);
    return response.data.data;
  },
};

// Export service for documents
export const exportService = {
  exportPDF: async (documentId: string, includeMetadata = true) => {
    const response = await api.post(
      '/export/pdf',
      { documentId, includeMetadata },
      { responseType: 'blob' }
    );
    return response.data;
  },

  exportDOCX: async (documentId: string, includeMetadata = true) => {
    const response = await api.post(
      '/export/docx',
      { documentId, includeMetadata },
      { responseType: 'blob' }
    );
    return response.data;
  },

  exportProject: async (projectId: string, format: 'pdf' | 'docx' = 'pdf') => {
    const response = await api.post(
      `/export/project/${projectId}`,
      { format },
      { responseType: 'blob' }
    );
    return response.data;
  },
};
