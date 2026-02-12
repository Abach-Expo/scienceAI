import { create } from 'zustand';
import { api } from '../services/api';

interface OutlineSection {
  title: string;
  description: string;
  subsections?: OutlineSection[];
  estimatedWords?: number;
}

interface Analytics {
  wordCount: number;
  sectionCount: number;
  referenceCount: number;
  completionPercent: number;
  date: string;
}

interface Project {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    documents: number;
    references: number;
    outlines: number;
  };
  analytics?: Analytics[];
}

interface Document {
  id: string;
  title: string;
  content: string;
  version: number;
  type: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  documents: Document[];
  currentDocument: Document | null;
  outline: OutlineSection[] | null;
  isLoading: boolean;
  error: string | null;

  // Project actions
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (title: string, type?: string, description?: string) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Document actions
  fetchDocuments: (projectId: string) => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  createDocument: (data: { title: string; content: string; projectId: string; type?: string }) => Promise<Document>;
  updateDocument: (id: string, data: Partial<Document>, createNewVersion?: boolean) => Promise<void>;

  // AI actions
  generateOutline: (topic: string, projectId: string, type?: string) => Promise<OutlineSection[]>;
  generateDraft: (projectId: string, section?: string) => Promise<Document>;
  analyzeDocument: (documentId: string, type: string) => Promise<any>;
  improveStyle: (documentId: string, instructions?: string) => Promise<Document>;

  // Setters
  setCurrentProject: (project: Project | null) => void;
  setCurrentDocument: (document: Document | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  documents: [],
  currentDocument: null,
  outline: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/projects');
      set({ projects: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/projects/${id}`);
      set({ currentProject: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createProject: async (title: string, type = 'THESIS', description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/projects', { title, type, description });
      const newProject = response.data.data;
      set((state) => ({
        projects: [newProject, ...state.projects],
        currentProject: newProject,
        isLoading: false,
      }));
      return newProject;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateProject: async (id: string, data: Partial<Project>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/projects/${id}`, data);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? response.data.data : p)),
        currentProject: state.currentProject?.id === id ? response.data.data : state.currentProject,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/projects/${id}`);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchDocuments: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/documents/project/${projectId}`);
      set({ documents: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchDocument: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/documents/${id}`);
      set({ currentDocument: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createDocument: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/documents', data);
      const newDoc = response.data.data;
      set((state) => ({
        documents: [newDoc, ...state.documents],
        currentDocument: newDoc,
        isLoading: false,
      }));
      return newDoc;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateDocument: async (id: string, data: Partial<Document>, createNewVersion = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/documents/${id}`, { ...data, createNewVersion });
      const updatedDoc = response.data.data;
      set((state) => ({
        documents: createNewVersion 
          ? [updatedDoc, ...state.documents]
          : state.documents.map((d) => (d.id === id ? updatedDoc : d)),
        currentDocument: updatedDoc,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  generateOutline: async (topic: string, projectId: string, type?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/ai/generate-outline', { topic, projectId, type });
      const outline = response.data.data.generatedContent;
      set({ outline, isLoading: false });
      return outline;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateDraft: async (projectId: string, section?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/ai/generate-draft', { projectId, section });
      const document = response.data.data.document;
      set((state) => ({
        documents: [document, ...state.documents],
        currentDocument: document,
        isLoading: false,
      }));
      return document;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  analyzeDocument: async (documentId: string, analysisType: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/ai/analyze', { documentId, analysisType });
      set({ isLoading: false });
      return response.data.data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  improveStyle: async (documentId: string, instructions?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/ai/improve-style', { 
        documentId, 
        instructions,
        preserveOriginal: true 
      });
      const document = response.data.data.document;
      set((state) => ({
        documents: [document, ...state.documents],
        currentDocument: document,
        isLoading: false,
      }));
      return document;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentDocument: (document) => set({ currentDocument: document }),
  clearError: () => set({ error: null }),
}));
