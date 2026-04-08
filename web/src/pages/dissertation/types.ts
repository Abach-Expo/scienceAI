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

export interface ThinkingStep {
  phase: 'planning' | 'generating' | 'assembling' | 'expanding' | 'continuing' | 'done';
  phaseLabel: string;
  currentChapter: number;
  totalChapters: number;
  chapterTitle: string;
  wordsGenerated: number;
  pagesGenerated: number;
  percentComplete: number;
  estimatedTimeRemaining: number;
  timestamp: Date;
  detail?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** When true, this message is a "thinking" block (collapsible progress) */
  isThinking?: boolean;
  /** Steps collected during full dissertation generation */
  thinkingSteps?: ThinkingStep[];
  /** Whether the thinking process is still active */
  thinkingActive?: boolean;
}
