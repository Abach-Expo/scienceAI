// ================== СЕРВИС ЦИТИРОВАНИЯ И ИСТОЧНИКОВ ==================
// Поиск реальных научных источников через backend proxy
// Поддержка: CrossRef, Semantic Scholar, OpenAlex

import { API_URL } from '../config';
import { getAuthorizationHeaders } from './apiClient';

export interface Source {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  citationCount?: number;
  type: 'article' | 'book' | 'conference' | 'thesis' | 'preprint' | 'other';
}

export interface Citation {
  source: Source;
  style: CitationStyle;
  formatted: string;
  inText: string;
}

export type CitationStyle = 'apa7' | 'mla9' | 'chicago' | 'harvard' | 'gost' | 'ieee' | 'vancouver';

// ================== ФОРМАТИРОВАНИЕ ЦИТАТ ==================

const formatAuthorsAPA = (authors: string[]): string => {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  if (authors.length <= 20) {
    const last = authors.pop();
    return `${authors.join(', ')}, & ${last}`;
  }
  return `${authors.slice(0, 19).join(', ')}, ... ${authors[authors.length - 1]}`;
};

const formatAuthorsMLA = (authors: string[]): string => {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
  return `${authors[0]}, et al.`;
};

const formatAuthorsGOST = (authors: string[]): string => {
  if (authors.length === 0) return '';
  if (authors.length <= 3) return authors.join(', ');
  return `${authors[0]} [и др.]`;
};

export const formatCitation = (source: Source, style: CitationStyle): Citation => {
  let formatted = '';
  let inText = '';
  
  const authors = source.authors.length > 0 ? source.authors : ['Unknown Author'];
  const firstAuthorLastName = authors[0].split(' ').pop() || authors[0];
  
  switch (style) {
    case 'apa7':
      // APA 7th Edition
      formatted = `${formatAuthorsAPA(authors)} (${source.year}). ${source.title}.`;
      if (source.journal) {
        formatted += ` *${source.journal}*`;
        if (source.volume) formatted += `, *${source.volume}*`;
        if (source.issue) formatted += `(${source.issue})`;
        if (source.pages) formatted += `, ${source.pages}`;
      }
      formatted += '.';
      if (source.doi) formatted += ` https://doi.org/${source.doi}`;
      
      inText = authors.length <= 2 
        ? `(${authors.map(a => a.split(' ').pop()).join(' & ')}, ${source.year})`
        : `(${firstAuthorLastName} et al., ${source.year})`;
      break;
      
    case 'mla9':
      // MLA 9th Edition
      formatted = `${formatAuthorsMLA(authors)}. "${source.title}."`;
      if (source.journal) {
        formatted += ` *${source.journal}*`;
        if (source.volume) formatted += `, vol. ${source.volume}`;
        if (source.issue) formatted += `, no. ${source.issue}`;
        formatted += `, ${source.year}`;
        if (source.pages) formatted += `, pp. ${source.pages}`;
      } else {
        formatted += ` ${source.year}`;
      }
      formatted += '.';
      if (source.doi) formatted += ` https://doi.org/${source.doi}`;
      
      inText = `(${firstAuthorLastName}${authors.length > 1 ? ' et al.' : ''})`;
      break;
      
    case 'chicago':
      // Chicago Style
      formatted = `${authors.join(', ')}. "${source.title}."`;
      if (source.journal) {
        formatted += ` *${source.journal}*`;
        if (source.volume) formatted += ` ${source.volume}`;
        if (source.issue) formatted += `, no. ${source.issue}`;
        formatted += ` (${source.year})`;
        if (source.pages) formatted += `: ${source.pages}`;
      } else {
        formatted += ` ${source.year}`;
      }
      formatted += '.';
      if (source.doi) formatted += ` https://doi.org/${source.doi}`;
      
      inText = `(${firstAuthorLastName} ${source.year})`;
      break;
      
    case 'harvard':
      // Harvard Style
      formatted = `${authors.join(', ')} (${source.year}) '${source.title}',`;
      if (source.journal) {
        formatted += ` *${source.journal}*`;
        if (source.volume) formatted += `, ${source.volume}`;
        if (source.issue) formatted += `(${source.issue})`;
        if (source.pages) formatted += `, pp. ${source.pages}`;
      }
      formatted += '.';
      if (source.doi) formatted += ` doi: ${source.doi}`;
      
      inText = `(${firstAuthorLastName}${authors.length > 2 ? ' et al.' : authors.length === 2 ? ` and ${authors[1].split(' ').pop()}` : ''}, ${source.year})`;
      break;
      
    case 'gost':
      // ГОСТ Р 7.0.5-2008 (Российский стандарт)
      formatted = `${formatAuthorsGOST(authors)} ${source.title}`;
      if (source.journal) {
        formatted += ` // ${source.journal}. – ${source.year}`;
        if (source.volume) formatted += `. – Т. ${source.volume}`;
        if (source.issue) formatted += `, № ${source.issue}`;
        if (source.pages) formatted += `. – С. ${source.pages}`;
      } else {
        formatted += `. – ${source.year}`;
      }
      formatted += '.';
      if (source.doi) formatted += ` – DOI: ${source.doi}`;
      
      inText = `[${firstAuthorLastName}, ${source.year}]`;
      break;
      
    case 'ieee':
      // IEEE Style
      const ieeeAuthors = authors.map((a, i) => {
        const parts = a.split(' ');
        const initials = parts.slice(0, -1).map(p => p[0] + '.').join(' ');
        return `${initials} ${parts[parts.length - 1]}`;
      });
      formatted = `${ieeeAuthors.join(', ')}, "${source.title},"`;
      if (source.journal) {
        formatted += ` *${source.journal}*`;
        if (source.volume) formatted += `, vol. ${source.volume}`;
        if (source.issue) formatted += `, no. ${source.issue}`;
        if (source.pages) formatted += `, pp. ${source.pages}`;
        formatted += `, ${source.year}`;
      } else {
        formatted += ` ${source.year}`;
      }
      formatted += '.';
      if (source.doi) formatted += ` doi: ${source.doi}`;
      
      inText = `[1]`; // IEEE uses numbered citations
      break;
      
    case 'vancouver':
      // Vancouver Style (Medicine)
      const vancAuthors = authors.slice(0, 6).map(a => {
        const parts = a.split(' ');
        const initials = parts.slice(0, -1).map(p => p[0]).join('');
        return `${parts[parts.length - 1]} ${initials}`;
      });
      if (authors.length > 6) vancAuthors.push('et al');
      formatted = `${vancAuthors.join(', ')}. ${source.title}.`;
      if (source.journal) {
        formatted += ` ${source.journal}. ${source.year}`;
        if (source.volume) formatted += `;${source.volume}`;
        if (source.issue) formatted += `(${source.issue})`;
        if (source.pages) formatted += `:${source.pages}`;
      } else {
        formatted += ` ${source.year}`;
      }
      formatted += '.';
      if (source.doi) formatted += ` doi:${source.doi}`;
      
      inText = `(1)`; // Vancouver uses numbered citations
      break;
  }
  
  return { source, style, formatted, inText };
};

// ================== ПОИСК ИСТОЧНИКОВ ==================

interface CrossRefWork {
  DOI: string;
  title: string[];
  author?: { given: string; family: string }[];
  'container-title'?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  published?: { 'date-parts': number[][] };
  abstract?: string;
  type: string;
  'is-referenced-by-count'?: number;
}

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  authors: { name: string }[];
  year: number;
  venue?: string;
  abstract?: string;
  citationCount?: number;
  externalIds?: { DOI?: string };
  url?: string;
}

interface OpenAlexWork {
  id: string;
  title: string;
  authorships: { author: { display_name: string } }[];
  publication_year: number;
  primary_location?: { source?: { display_name: string } };
  doi?: string;
  abstract_inverted_index?: Record<string, number[]>;
  cited_by_count: number;
  type: string;
}

// Поиск через CrossRef API (через backend proxy)
export const searchCrossRef = async (query: string, limit = 10): Promise<Source[]> => {
  try {
    const response = await fetch(
      `${API_URL}/citations/crossref?q=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: getAuthorizationHeaders() }
    );
    
    if (!response.ok) throw new Error('CrossRef API error');
    
    const data = await response.json();
    const works: CrossRefWork[] = data.items || [];
    
    return works.map((work) => ({
      id: work.DOI,
      title: work.title?.[0] || 'Untitled',
      authors: work.author?.map(a => `${a.given || ''} ${a.family || ''}`.trim()) || [],
      year: work.published?.['date-parts']?.[0]?.[0] || 0,
      journal: work['container-title']?.[0],
      volume: work.volume,
      issue: work.issue,
      pages: work.page,
      doi: work.DOI,
      url: `https://doi.org/${work.DOI}`,
      abstract: work.abstract?.replace(/<[^>]*>/g, ''),
      citationCount: work['is-referenced-by-count'],
      type: mapCrossRefType(work.type),
    }));
  } catch (error) {
    return [];
  }
};

const mapCrossRefType = (type: string): Source['type'] => {
  const typeMap: Record<string, Source['type']> = {
    'journal-article': 'article',
    'book': 'book',
    'book-chapter': 'book',
    'proceedings-article': 'conference',
    'dissertation': 'thesis',
    'posted-content': 'preprint',
  };
  return typeMap[type] || 'other';
};

// Поиск через Semantic Scholar API (через backend proxy)
export const searchSemanticScholar = async (query: string, limit = 10): Promise<Source[]> => {
  try {
    const response = await fetch(
      `${API_URL}/citations/semantic-scholar?q=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: getAuthorizationHeaders() }
    );
    
    if (!response.ok) throw new Error('Semantic Scholar API error');
    
    const data = await response.json();
    const papers: SemanticScholarPaper[] = data.data || [];
    
    return papers.map((paper) => ({
      id: paper.paperId,
      title: paper.title,
      authors: paper.authors.map(a => a.name),
      year: paper.year || 0,
      journal: paper.venue,
      doi: paper.externalIds?.DOI,
      url: paper.url || (paper.externalIds?.DOI ? `https://doi.org/${paper.externalIds.DOI}` : undefined),
      abstract: paper.abstract,
      citationCount: paper.citationCount,
      type: 'article',
    }));
  } catch (error) {
    return [];
  }
};

// Поиск через OpenAlex API (через backend proxy)
export const searchOpenAlex = async (query: string, limit = 10): Promise<Source[]> => {
  try {
    const response = await fetch(
      `${API_URL}/citations/openalex?q=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: getAuthorizationHeaders() }
    );
    
    if (!response.ok) throw new Error('OpenAlex API error');
    
    const data = await response.json();
    const works: OpenAlexWork[] = data.results || [];
    
    return works.map((work) => ({
      id: work.id,
      title: work.title,
      authors: work.authorships.map(a => a.author.display_name),
      year: work.publication_year,
      journal: work.primary_location?.source?.display_name,
      doi: work.doi?.replace('https://doi.org/', ''),
      url: work.doi,
      abstract: work.abstract_inverted_index 
        ? reconstructAbstract(work.abstract_inverted_index)
        : undefined,
      citationCount: work.cited_by_count,
      type: mapOpenAlexType(work.type),
    }));
  } catch (error) {
    return [];
  }
};

// Восстановление абстракта из inverted index OpenAlex
const reconstructAbstract = (invertedIndex: Record<string, number[]>): string => {
  const words: string[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  return words.join(' ');
};

const mapOpenAlexType = (type: string): Source['type'] => {
  const typeMap: Record<string, Source['type']> = {
    'journal-article': 'article',
    'book': 'book',
    'book-chapter': 'book',
    'proceedings-article': 'conference',
    'dissertation': 'thesis',
    'preprint': 'preprint',
    'article': 'article',
  };
  return typeMap[type] || 'other';
};

// ================== КОМБИНИРОВАННЫЙ ПОИСК ==================

export const searchSources = async (
  query: string, 
  options: {
    limit?: number;
    sources?: ('crossref' | 'semanticscholar' | 'openalex')[];
    yearFrom?: number;
    yearTo?: number;
    type?: Source['type'];
  } = {}
): Promise<Source[]> => {
  const {
    limit = 15,
    sources = ['crossref', 'openalex'],
    yearFrom,
    yearTo,
  } = options;
  
  const searchPromises: Promise<Source[]>[] = [];
  
  if (sources.includes('crossref')) {
    searchPromises.push(searchCrossRef(query, limit));
  }
  if (sources.includes('semanticscholar')) {
    searchPromises.push(searchSemanticScholar(query, limit));
  }
  if (sources.includes('openalex')) {
    searchPromises.push(searchOpenAlex(query, limit));
  }
  
  const results = await Promise.all(searchPromises);
  let allSources = results.flat();
  
  // Удаляем дубликаты по DOI
  const seen = new Set<string>();
  allSources = allSources.filter(source => {
    if (source.doi && seen.has(source.doi)) return false;
    if (source.doi) seen.add(source.doi);
    return true;
  });
  
  // Фильтруем по году
  if (yearFrom) {
    allSources = allSources.filter(s => s.year >= yearFrom);
  }
  if (yearTo) {
    allSources = allSources.filter(s => s.year <= yearTo);
  }
  
  // Сортируем по цитированию
  allSources.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
  
  return allSources.slice(0, limit);
};

// ================== ГЕНЕРАЦИЯ БИБЛИОГРАФИИ ==================

export const generateBibliography = (
  sources: Source[],
  style: CitationStyle,
  title: string = 'Список литературы'
): string => {
  const citations = sources.map((source, index) => {
    const citation = formatCitation(source, style);
    if (style === 'ieee' || style === 'vancouver') {
      return `[${index + 1}] ${citation.formatted}`;
    }
    return citation.formatted;
  });
  
  return `${title}\n\n${citations.join('\n\n')}`;
};

// ================== АВТО-ЦИТИРОВАНИЕ В ТЕКСТЕ ==================

export interface TextWithCitations {
  text: string;
  citations: Citation[];
}

export const insertCitation = (
  text: string,
  position: number,
  citation: Citation
): string => {
  return text.slice(0, position) + ' ' + citation.inText + text.slice(position);
};

// Поиск подходящих источников для абзаца текста
export const findRelevantSources = async (
  paragraph: string,
  existingSources: Source[] = [],
  limit = 3
): Promise<Source[]> => {
  // Извлекаем ключевые слова (простой подход)
  const words = paragraph
    .toLowerCase()
    .replace(/[^\w\sа-яё]/gi, '')
    .split(/\s+/)
    .filter(w => w.length > 4);
  
  // Берём уникальные слова
  const uniqueWords = [...new Set(words)].slice(0, 5);
  const query = uniqueWords.join(' ');
  
  if (!query) return [];
  
  const sources = await searchSources(query, { limit });
  
  // Исключаем уже добавленные
  const existingDOIs = new Set(existingSources.map(s => s.doi).filter(Boolean));
  return sources.filter(s => !s.doi || !existingDOIs.has(s.doi));
};

// ================== СТИЛИ ЦИТИРОВАНИЯ ==================

export const CITATION_STYLES: { id: CitationStyle; name: string; description: string; example: string }[] = [
  {
    id: 'apa7',
    name: 'APA 7th Edition',
    description: 'American Psychological Association — психология, социальные науки',
    example: 'Author, A. A. (Year). Title. Journal, Volume(Issue), pages. https://doi.org/xxx',
  },
  {
    id: 'mla9',
    name: 'MLA 9th Edition',
    description: 'Modern Language Association — гуманитарные науки, литература',
    example: 'Author. "Title." Journal, vol. X, no. X, Year, pp. X-X.',
  },
  {
    id: 'chicago',
    name: 'Chicago Style',
    description: 'Универсальный стиль — история, искусство',
    example: 'Author. "Title." Journal Volume, no. Issue (Year): pages.',
  },
  {
    id: 'harvard',
    name: 'Harvard Style',
    description: 'Популярен в Великобритании и Австралии',
    example: "Author (Year) 'Title', Journal, Volume(Issue), pp. X-X.",
  },
  {
    id: 'gost',
    name: 'ГОСТ Р 7.0.5-2008',
    description: 'Российский государственный стандарт',
    example: 'Автор. Название // Журнал. – Год. – Т. X, № X. – С. X-X.',
  },
  {
    id: 'ieee',
    name: 'IEEE',
    description: 'Institute of Electrical and Electronics Engineers — технические науки',
    example: '[1] A. Author, "Title," Journal, vol. X, no. X, pp. X-X, Year.',
  },
  {
    id: 'vancouver',
    name: 'Vancouver',
    description: 'Медицина и биология',
    example: 'Author AB, Author CD. Title. Journal. Year;Volume(Issue):pages.',
  },
];

// ================== ЭКСПОРТ БИБЛИОГРАФИИ ==================

export const exportBibliographyAsBibTeX = (sources: Source[]): string => {
  return sources.map((source, index) => {
    const key = `${source.authors[0]?.split(' ').pop() || 'unknown'}${source.year}`;
    const authors = source.authors.join(' and ');
    
    return `@article{${key},
  author = {${authors}},
  title = {${source.title}},
  journal = {${source.journal || ''}},
  year = {${source.year}},
  volume = {${source.volume || ''}},
  number = {${source.issue || ''}},
  pages = {${source.pages || ''}},
  doi = {${source.doi || ''}}
}`;
  }).join('\n\n');
};

export const exportBibliographyAsRIS = (sources: Source[]): string => {
  return sources.map(source => {
    const lines = [
      'TY  - JOUR',
      ...source.authors.map(a => `AU  - ${a}`),
      `TI  - ${source.title}`,
      `JO  - ${source.journal || ''}`,
      `PY  - ${source.year}`,
      `VL  - ${source.volume || ''}`,
      `IS  - ${source.issue || ''}`,
      `SP  - ${source.pages?.split('-')[0] || ''}`,
      `EP  - ${source.pages?.split('-')[1] || ''}`,
      `DO  - ${source.doi || ''}`,
      'ER  - ',
    ];
    return lines.join('\n');
  }).join('\n\n');
};
