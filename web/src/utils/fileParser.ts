/**
 * Client-side file parser for dissertation AI chat
 * Supports: PDF, DOCX, TXT, MD, CSV, JSON, code files
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  truncated: boolean;
}

// Max chars to send to AI (roughly ~30k tokens)
const MAX_CONTENT_LENGTH = 80_000;

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'csv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx',
  'py', 'java', 'c', 'cpp', 'h', 'rb', 'go', 'rs', 'swift', 'kt', 'sql', 'sh', 'bat',
  'yaml', 'yml', 'toml', 'ini', 'cfg', 'env', 'log', 'rtf', 'tex', 'bib',
]);

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function truncateContent(text: string): { content: string; truncated: boolean } {
  if (text.length <= MAX_CONTENT_LENGTH) {
    return { content: text, truncated: false };
  }
  return {
    content: text.slice(0, MAX_CONTENT_LENGTH) + '\n\n... [содержимое обрезано из-за ограничения размера]',
    truncated: true,
  };
}

async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ');
    if (pageText.trim()) {
      pages.push(pageText);
    }
  }

  return pages.join('\n\n');
}

async function parseDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function parseText(file: File): Promise<string> {
  return await file.text();
}

/**
 * Parse a file and extract its text content
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = getExtension(file.name);
  let rawContent = '';

  try {
    if (ext === 'pdf') {
      rawContent = await parsePDF(file);
    } else if (ext === 'docx') {
      rawContent = await parseDOCX(file);
    } else if (ext === 'doc') {
      // .doc (legacy Word) is very hard to parse client-side
      throw new Error('Формат .doc не поддерживается. Пожалуйста, сохраните файл как .docx');
    } else if (TEXT_EXTENSIONS.has(ext)) {
      rawContent = await parseText(file);
    } else {
      // Try reading as text anyway
      try {
        rawContent = await parseText(file);
        // If it looks like binary, reject
        if (/[\x00-\x08\x0E-\x1F]/.test(rawContent.slice(0, 1000))) {
          throw new Error('binary');
        }
      } catch {
        throw new Error(`Формат .${ext} не поддерживается. Используйте PDF, DOCX или текстовые файлы.`);
      }
    }
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Не удалось прочитать файл');
  }

  if (!rawContent.trim()) {
    throw new Error('Файл пуст или не содержит текст');
  }

  const { content, truncated } = truncateContent(rawContent.trim());

  return {
    name: file.name,
    type: ext,
    size: file.size,
    content,
    truncated,
  };
}

/**
 * Format parsed file content for AI prompt
 */
export function formatFileForPrompt(parsed: ParsedFile): string {
  const sizeKB = (parsed.size / 1024).toFixed(1);
  return `📎 Прикреплённый файл: "${parsed.name}" (${sizeKB} КБ, ${parsed.type.toUpperCase()})
${'─'.repeat(50)}
${parsed.content}
${'─'.repeat(50)}`;
}

/**
 * Accepted file types for the input element
 */
export const ACCEPTED_FILE_TYPES = '.pdf,.docx,.doc,.txt,.md,.csv,.json,.xml,.html,.tex,.bib,.py,.js,.ts,.jsx,.tsx,.java,.c,.cpp,.sql,.yaml,.yml,.rtf,.log';

/**
 * Max file size (20 MB)
 */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
