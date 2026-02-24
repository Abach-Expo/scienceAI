import { Citation } from './types';
import { API_URL } from '../../config';
import { getAuthorizationHeaders } from '../../services/apiClient';

// ================== ФОРМАТИРОВАНИЕ ЦИТАТ ПО ГОСТ ==================
export const formatCitationGOST = (citation: Citation): string => {
  const authorsStr = citation.authors.join(', ');
  switch (citation.type) {
    case 'book':
      return `${authorsStr}. ${citation.title}. — ${citation.source}, ${citation.year}. — ${citation.pages || ''} с.`;
    case 'article':
      return `${authorsStr}. ${citation.title} // ${citation.source}. — ${citation.year}. — ${citation.pages ? `С. ${citation.pages}` : ''}`;
    case 'dissertation':
      return `${authorsStr}. ${citation.title}: дис. ... канд. наук. — ${citation.source}, ${citation.year}. — ${citation.pages || ''} с.`;
    case 'conference':
      return `${authorsStr}. ${citation.title} // ${citation.source}: материалы конф. — ${citation.year}. — ${citation.pages ? `С. ${citation.pages}` : ''}`;
    case 'website':
      return `${citation.title} [Электронный ресурс]. — URL: ${citation.url} (дата обращения: ${new Date().toLocaleDateString('ru-RU')})`;
    default:
      return `${authorsStr}. ${citation.title}. — ${citation.year}.`;
  }
};

// ================== ПРОВЕРКА УНИКАЛЬНОСТИ ЧЕРЕЗ РЕАЛЬНЫЙ СЕРВИС ==================
export const checkUniqueness = async (text: string): Promise<{ uniqueness: number; matches: { text: string; source: string; similarity: number }[] }> => {
  
  try {
    const response = await fetch(`${API_URL}/ai/check-plagiarism`, {
      method: 'POST',
      headers: getAuthorizationHeaders(),
      body: JSON.stringify({
        text: text.slice(0, 10000),
        language: 'ru',
      }),
    });
    
    const data = await response.json();
    
    if (data.success && data.result) {
      return {
        uniqueness: data.result.uniquenessScore || 85,
        matches: (data.result.sources || []).map((s: { title?: string; matchedText?: string; source?: string; url?: string; similarity?: number }) => ({
          text: s.title || s.matchedText || '',
          source: s.source || s.url || 'Найденный источник',
          similarity: s.similarity || 15
        }))
      };
    }
    
    // Fallback если API вернул ошибку
    return { uniqueness: 0, matches: [{ text: 'Не удалось проверить уникальность', source: 'Ошибка сервиса', similarity: 0 }] };
  } catch (error) {
    console.error('Uniqueness check error:', error);
    return { uniqueness: 0, matches: [{ text: 'Сервис проверки временно недоступен', source: 'Ошибка соединения', similarity: 0 }] };
  }
};

// ================== ГЕНЕРАЦИЯ СПИСКА ЛИТЕРАТУРЫ ==================
export const generateBibliography = (citations: Citation[]): string => {
  if (citations.length === 0) return '';
  
  const sortedCitations = [...citations].sort((a, b) => {
    // Сначала русскоязычные, потом иностранные
    const aAuthorsStr = a.authors.join(', ');
    const bAuthorsStr = b.authors.join(', ');
    const aIsRussian = /[а-яА-Я]/.test(aAuthorsStr);
    const bIsRussian = /[а-яА-Я]/.test(bAuthorsStr);
    if (aIsRussian && !bIsRussian) return -1;
    if (!aIsRussian && bIsRussian) return 1;
    return aAuthorsStr.localeCompare(bAuthorsStr);
  });
  
  return sortedCitations.map((c, i) => `${i + 1}. ${formatCitationGOST(c)}`).join('\n');
};
