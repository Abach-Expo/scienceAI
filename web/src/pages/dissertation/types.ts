export interface Chapter {
  id: string;
  title: string;
  content: string;
  subchapters: {
    id: string;
    title: string;
    content: string;
  }[];
}

// ================== ТИПЫ НАУЧНЫХ РАБОТ ==================
export type DocumentType = 'dissertation' | 'diploma' | 'coursework' | 'article' | 'lecture' | 'abstract' | 'report';

export interface DocumentTypeConfig {
  id: DocumentType;
  name: string;
  nameRu: string;
  nameEn: string;
  description: string;
  icon: string;
  targetWords: number;
  structure: { id: string; title: string; subchapters: { id: string; title: string; content: string }[] }[];
  gostRequirements: string;
  citationStyle: 'gost' | 'apa' | 'mla' | 'chicago';
}

export interface Dissertation {
  id: string;
  title: string;
  topic: string;
  abstract: string;
  chapters: Chapter[];
  starred: boolean;
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
  targetWordCount: number;
  scienceField: string;
  degreeType: 'bachelor' | 'master' | 'phd';
  documentType: DocumentType;
  citations: Citation[];
  plagiarismScore?: number;
  uniquenessScore?: number;
}

export interface Citation {
  id: string;
  authors: string[];
  title: string;
  source: string;
  year: number;
  pages?: string;
  doi?: string;
  url?: string;
  type: 'book' | 'article' | 'website' | 'dissertation' | 'conference';
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
