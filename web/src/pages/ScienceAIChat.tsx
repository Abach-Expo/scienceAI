import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useTranslation } from '../store/languageStore';
import { API_URL } from '../config';
import { fetchWithAuth } from '../services/apiClient';
import { parseFile, type ParsedFile } from '../utils/fileParser';
import {
  Send,
  Sparkles,
  BookOpen,
  PenTool,
  Quote,
  FileText,
  Wand2,
  Command,
  Search,
  Layers,
  MessageSquare,
  GraduationCap,
  Plus,
  Trash2,
  Menu,
  X,
  Brain,
  ChevronRight,
  Hash,
  Settings,
  Paperclip,
  File,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  ArrowDown,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Volume2,
  VolumeX,
  Square,
} from 'lucide-react';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
interface ChatItem {
  id: string;
  title: string;
  messages: ChatMessage[];
  starred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  taskType?: string;
  attachments?: AttachedFile[];
  feedback?: 'up' | 'down' | null;
}

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  preview?: string;
}

// ═══════════════════════════════════════════
// Constants (outside component — no re-creation)
// ═══════════════════════════════════════════
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_PREVIEW_SIZE = 5 * 1024 * 1024; // 5 MB — skip base64 preview for huge images
const ACCEPTED_FILES = 'image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.pptx,.ppt,.csv,.rtf,.odt,.md';

const QUICK_ACTIONS_KEYS = [
  { icon: BookOpen, labelKey: 'chat.cmdWriteIntro', prompt: 'Напиши введение для моей диссертации' },
  { icon: PenTool, labelKey: 'chat.cmdExpand', prompt: 'Расширь и углуби следующий текст' },
  { icon: Wand2, labelKey: 'chat.cmdHumanize', prompt: 'Перепиши текст более живым, человеческим научным стилем' },
  { icon: Quote, labelKey: 'chat.cmdAddCitations', prompt: 'Добавь релевантные научные цитаты и ссылки на источники' },
  { icon: FileText, labelKey: 'chat.cmdConclusion', prompt: 'Сгенерируй заключение для моей работы' },
] as const;

const COMMANDS_KEYS = [
  { icon: BookOpen, labelKey: 'chat.cmdIntro', descKey: 'chat.cmdIntroDesc', prompt: 'Напиши введение для научной работы на тему' },
  { icon: FileText, labelKey: 'chat.cmdConclusion', descKey: 'chat.cmdConclusionDesc', prompt: 'Напиши заключение для научной работы' },
  { icon: PenTool, labelKey: 'chat.cmdExpand', descKey: 'chat.cmdExpandDesc', prompt: 'Расширь следующий текст, добавив научную глубину:' },
  { icon: Wand2, labelKey: 'chat.cmdHumanize', descKey: 'chat.cmdHumanizeDesc', prompt: 'Перепиши текст более живым академическим стилем:' },
  { icon: Quote, labelKey: 'chat.cmdCitations', descKey: 'chat.cmdCitationsDesc', prompt: 'Добавь цитаты и ссылки на источники в текст:' },
  { icon: GraduationCap, labelKey: 'chat.cmdDissertation', descKey: 'chat.cmdDissertationDesc', prompt: '' },
  { icon: Layers, labelKey: 'chat.cmdPresentation', descKey: 'chat.cmdPresentationDesc', prompt: '' },
  { icon: Search, labelKey: 'chat.cmdFindSources', descKey: 'chat.cmdFindSourcesDesc', prompt: 'Найди научные статьи и источники по теме:' },
] as const;

// ═══════════════════════════════════════════
// Smart intent detection — redirect to workspace
// ═══════════════════════════════════════════
interface DetectedIntent {
  type: 'dissertation' | 'presentation' | 'academic';
  topic: string;
  pageCount?: number;
  slideCount?: number;
  academicType?: string; // coursework | diploma | article | report | essay
  documentType?: string; // for DissertationPage: dissertation | diploma | coursework etc.
}

/**
 * Analyzes user message to detect intent to create a dissertation, presentation, or academic work.
 * Returns null if the message is a regular chat question.
 */
const detectWorkspaceIntent = (text: string): DetectedIntent | null => {
  const lower = text.toLowerCase().trim();

  // Extract page/slide count patterns
  const pageMatch = lower.match(/(\d+)\s*(?:страниц|стр|листов|лист|pages?|pg)/);
  const slideMatch = lower.match(/(\d+)\s*(?:слайд|slide)/);
  const pageCount = pageMatch ? parseInt(pageMatch[1], 10) : undefined;
  const slideCount = slideMatch ? parseInt(slideMatch[1], 10) : undefined;

  // Helper: extract topic from text by removing command words
  const extractTopic = (input: string): string => {
    return input
      .replace(/^(напиши|создай|сгенерируй|сделай|подготовь|написать|генерация|генерировать|make|create|write|generate)\s*/i, '')
      .replace(/(диссертацию|диссертация|диссер|дисер|dissert\w*)/gi, '')
      .replace(/(през[еиэ]нтаци\S*|пр[еи]з[еи]нтаци\S*|презу|слайды|presentation|slides?)/gi, '')
      .replace(/(курсовую|курсовая|курсов\w*|coursework)/gi, '')
      .replace(/(дипломную|дипломная|диплом\w*|diploma)/gi, '')
      .replace(/(реферат\w*|доклад\w*|статью|статья|эссе|essay|article|report)/gi, '')
      .replace(/(академическ\w+\s*работ\w*)/gi, '')
      .replace(/(научн\w+\s*работ\w*|научн\w+\s*стать\w*)/gi, '')
      .replace(/на\s*тему\s*/gi, '')
      .replace(/по\s*теме\s*/gi, '')
      .replace(/про\s*/gi, '')
      .replace(/на\s*\d+\s*(страниц|стр|листов|pages?|слайд|slide)\w*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  // ── Presentation detection (includes common misspellings: презинтация, призентация, презнитация) ──
  if (/(през[еиэ]нтаци|пр[еи]з[еи]нтаци|презу|през[еи]нт|слайд|presentation|slides?\b)/i.test(lower)) {
    return {
      type: 'presentation',
      topic: extractTopic(text),
      slideCount: slideCount || pageCount,
    };
  }

  // ── Dissertation detection ──
  if (/(диссертаци|диссер\b|дисер\b|dissert)/i.test(lower)) {
    return {
      type: 'dissertation',
      topic: extractTopic(text),
      pageCount,
      documentType: 'dissertation',
    };
  }

  // ── Diploma ──
  if (/(дипломн|диплом\b|diploma)/i.test(lower)) {
    return {
      type: 'dissertation',
      topic: extractTopic(text),
      pageCount,
      documentType: 'diploma',
    };
  }

  // ── Coursework ──
  if (/(курсов\w+|coursework)/i.test(lower)) {
    return {
      type: 'dissertation',
      topic: extractTopic(text),
      pageCount,
      documentType: 'coursework',
    };
  }

  // ── Essay / referat / report / article ──
  if (/(реферат|доклад|статью|статья|эссе|essay\b|article\b|report\b)/i.test(lower)) {
    const docType = /реферат/i.test(lower) ? 'abstract'
      : /доклад/i.test(lower) ? 'report'
      : /стать/i.test(lower) || /article/i.test(lower) ? 'article'
      : /эссе|essay/i.test(lower) ? 'article'
      : 'report';
    return {
      type: 'dissertation',
      topic: extractTopic(text),
      pageCount,
      documentType: docType,
    };
  }

  // ── Generic academic work pattern: "напиши ... на тему ..." ──
  if (/(напиши|создай|сгенерируй|сделай|подготовь)\s+.*(работ|текст|документ)/i.test(lower) && /на\s*тему/i.test(lower)) {
    return {
      type: 'dissertation',
      topic: extractTopic(text),
      pageCount,
      documentType: 'coursework',
    };
  }

  return null;
};

const SYSTEM_PROMPT = `Ты — интеллектуальный научный ассистент Science AI.
Ты помогаешь студентам и учёным с написанием диссертаций, дипломных работ, курсовых и научных статей.

Твои возможности:
• Написание и редактирование научных текстов
• Анализ и структурирование материала
• Поиск и добавление цитат
• Объяснение сложных концепций
• Помощь с методологией исследования

Правила:
- Отвечай на русском языке (если иное не указано)
- Используй академический, но понятный стиль
- Структурируй ответы с заголовками и списками, используй Markdown
- Давай конкретные примеры
- Будь полезным и дружелюбным`;

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const isImageFile = (type: string): boolean => type.startsWith('image/');

const readFileAsDataURL = (file: globalThis.File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

const formatTime = (date: Date): string => {
  const d = new Date(date);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

// Throttle helper for mouse move
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const throttle = <T extends (...args: any[]) => void>(fn: T, ms: number): T => {
  let last = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  }) as T;
};

// ═══════════════════════════════════════════
// Markdown components for AI messages
// ═══════════════════════════════════════════
const mdComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-lg font-bold text-text-primary/90 mt-4 mb-2 first:mt-0" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-base font-semibold text-text-primary/90 mt-3 mb-1.5 first:mt-0" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-sm font-semibold text-text-primary/85 mt-2.5 mb-1 first:mt-0" {...props}>{children}</h3>
  ),
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-sm leading-relaxed text-text-primary/80 mb-2 last:mb-0" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside space-y-1 mb-2 text-sm text-text-primary/80" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside space-y-1 mb-2 text-sm text-text-primary/80" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="text-text-primary/75 leading-relaxed" {...props}>{children}</li>
  ),
  code: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <div className="relative my-3 rounded-xl overflow-hidden border border-text-primary/[0.06]">
          <div className="bg-bg-tertiary/30 px-4 py-1.5 text-[10px] text-text-secondary/50 uppercase tracking-wider border-b border-border-primary/30">
            {className?.replace('language-', '') || 'code'}
          </div>
          <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
            <code className="text-violet-400 dark:text-violet-300/90 font-mono" {...props}>{children}</code>
          </pre>
        </div>
      );
    }
    return <code className="px-1.5 py-0.5 rounded-md bg-text-primary/[0.06] text-violet-300/90 text-[13px] font-mono" {...props}>{children}</code>;
  },
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-2 border-violet-500/40 pl-4 my-2 text-text-secondary/70 italic" {...props}>{children}</blockquote>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-text-primary/90" {...props}>{children}</strong>
  ),
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-3 rounded-xl border border-text-primary/[0.06]">
      <table className="w-full text-sm" {...props}>{children}</table>
    </div>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="bg-bg-tertiary/20 px-3 py-2 text-left text-text-primary/70 font-medium border-b border-border-primary/30" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-3 py-2 text-text-primary/65 border-b border-border-primary/15" {...props}>{children}</td>
  ),
  a: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
  hr: () => <hr className="border-text-primary/[0.06] my-4" />,
};

// ═══════════════════════════════════════════
// Toast notification component
// ═══════════════════════════════════════════
const Toast = ({ message, type = 'error', onClose }: { message: string; type?: 'error' | 'warning' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    error: 'border-red-500/30 bg-red-500/10 text-red-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    info: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border text-sm backdrop-blur-xl ${colors[type]}`}
    >
      <AlertTriangle size={16} />
      {message}
    </motion.div>
  );
};

// ═══════════════════════════════════════════
// CopyButton for AI messages
// ═══════════════════════════════════════════
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.button
      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
      onClick={handleCopy}
      className="p-1.5 rounded-lg text-text-secondary/50 hover:text-text-primary/60 hover:bg-text-primary/5 transition-all"
      aria-label={t('chat.copy')}
      title={t('chat.copy')}
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </motion.button>
  );
};

// ═══════════════════════════════════════════
// ScienceAIChat Component
// ═══════════════════════════════════════════
const ScienceAIChat = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const subscription = useSubscriptionStore();
  useDocumentTitle(`Science AI — ${t('chat.title')}`);

  // ── State ──
  const [input, setInput] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [allChats, setAllChats] = useState<ChatItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [textareaHeight, setTextareaHeight] = useState(56);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'info' } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [commandIndex, setCommandIndex] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawFilesRef = useRef<globalThis.File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const COMMANDS = useMemo(() => COMMANDS_KEYS.map(cmd => ({
    ...cmd, label: t(cmd.labelKey), description: t(cmd.descKey),
  })), [t]);

  const QUICK_ACTIONS = useMemo(() => QUICK_ACTIONS_KEYS.map(a => ({
    ...a, label: t(a.labelKey),
  })), [t]);

  const filteredCommands = useMemo(() =>
    COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(commandFilter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(commandFilter.toLowerCase())
    ), [commandFilter, COMMANDS]);

  // ── Load chats from localStorage ──
  useEffect(() => {
    const saved = localStorage.getItem('chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((c: Record<string, unknown>) => ({
          ...c,
          createdAt: new Date(c.createdAt as string),
          updatedAt: new Date(c.updatedAt as string),
        }));
        setAllChats(parsed);
      } catch { /* skip */ }
    }
  }, []);

  // ── Mouse tracking — THROTTLED to 60fps ──
  const handleMouseMove = useMemo(
    () => throttle((e: React.MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    }, 16),
    []
  );

  // ── Framer-powered auto-resize textarea ──
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = '0px';
      const sh = inputRef.current.scrollHeight;
      const newH = Math.min(Math.max(sh, 56), 200);
      inputRef.current.style.height = newH + 'px';
      setTextareaHeight(newH);
    }
  }, [input]);

  // ── Handle "/" command detection ──
  useEffect(() => {
    if (input.startsWith('/')) {
      setShowCommandPalette(true);
      setCommandFilter(input.slice(1));
      setCommandIndex(0);
    } else {
      setShowCommandPalette(false);
      setCommandFilter('');
    }
  }, [input]);

  // ── Auto-scroll ──
  useEffect(() => {
    const endEl = messagesEndRef.current;
    const container = messagesContainerRef.current;
    if (!endEl || !container) return;
    if (isLoading) {
      endEl.scrollIntoView({ behavior: 'auto', block: 'end' });
    } else {
      const isNear = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNear) endEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  // ── Scroll detection ──
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const far = container.scrollHeight - container.scrollTop - container.clientHeight > 300;
    setShowScrollBtn(far);
  }, []);

  // ── File handling with validation ──
  const processFiles = useCallback(async (fileList: globalThis.File[]) => {
    const newFiles: AttachedFile[] = [];
    const errors: string[] = [];

    for (const file of fileList) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} превышает 25 MB`);
        continue;
      }
      const attached: AttachedFile = { name: file.name, size: file.size, type: file.type };
      if (isImageFile(file.type) && file.size <= MAX_PREVIEW_SIZE) {
        attached.preview = await readFileAsDataURL(file);
      }
      newFiles.push(attached);
    }

    if (errors.length > 0) {
      setToast({ message: errors.join('. '), type: 'warning' });
    }

    if (newFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }

    // Keep raw File objects for potential workspace redirect
    rawFilesRef.current = [...rawFilesRef.current, ...fileList.filter(f => f.size <= MAX_FILE_SIZE)];
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await processFiles(Array.from(files));
    e.target.value = '';
  }, [processFiles]);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    rawFilesRef.current = rawFilesRef.current.filter((_, i) => i !== index);
  }, []);

  // ── Drag & Drop ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await processFiles(files);
  }, [processFiles]);

  // ── Save chat helper ──
  const saveChat = useCallback((chatId: string, chatMessages: ChatMessage[], title?: string) => {
    const saved = localStorage.getItem('chats');
    let chats: ChatItem[] = [];
    try { chats = saved ? JSON.parse(saved) : []; } catch { chats = []; }
    const idx = chats.findIndex(c => c.id === chatId);
    // Strip base64 previews before saving to localStorage to avoid bloat
    const cleanMessages = chatMessages.map(m => ({
      ...m,
      attachments: m.attachments?.map(a => ({ ...a, preview: undefined })),
    }));
    const chatData: ChatItem = {
      id: chatId,
      title: title || (chatMessages[0]?.content.slice(0, 40) + '...' || t('chat.newChat')),
      messages: cleanMessages,
      starred: idx >= 0 ? chats[idx].starred : false,
      createdAt: idx >= 0 ? new Date(chats[idx].createdAt) : new Date(),
      updatedAt: new Date(),
    };
    if (idx >= 0) chats[idx] = chatData;
    else chats.unshift(chatData);
    localStorage.setItem('chats', JSON.stringify(chats));
    setAllChats(chats.map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) })));
  }, [t]);

  // ── Generate AI response ──
  const generateResponse = useCallback(async (
    userMessage: string,
    previousMessages: ChatMessage[],
    onChunk: (text: string) => void
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const contextMessages = previousMessages.slice(-6).map(m =>
      `${m.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${m.content}`
    ).join('\n');

    const userPrompt = contextMessages
      ? `КОНТЕКСТ ПРЕДЫДУЩЕГО РАЗГОВОРА:\n${contextMessages}\n\nНовое сообщение: ${userMessage}`
      : userMessage;

    const response = await fetchWithAuth(`${API_URL}/llm/stream`, {
      method: 'POST',
      body: JSON.stringify({ taskType: 'chat', systemPrompt: SYSTEM_PROMPT, userPrompt, temperature: 0.75, maxTokens: 3000 }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `${t('chat.serverError')} (${response.status})`;
      try { const e = JSON.parse(errText); errMsg = e.error || e.message || errMsg; } catch {}
      if (response.status === 401) errMsg = t('chat.sessionExpired');
      if (response.status === 429) errMsg = t('chat.rateLimitReached');;
      throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error(t('chat.streamingNotSupported'));

    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) throw new Error(data.error);
          if (data.content) { content += data.content; onChunk(content); }
          if (data.done && data.fullContent) content = data.fullContent;
        } catch (e) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
        }
      }
    }
    return content;
  }, [t]);

  // ── Handle send ──
  const handleSend = useCallback(async (messageText?: string) => {
    const text = (messageText || input).trim();
    if ((!text && attachedFiles.length === 0) || isLoading) return;

    // ── Smart intent detection: redirect to workspace ──
    const intent = text ? detectWorkspaceIntent(text) : null;
    if (intent) {
      if (intent.type === 'presentation') {
        // Parse attached files if any, then redirect with file content
        let fileContent: string | undefined;
        if (rawFilesRef.current.length > 0) {
          try {
            const parsed: ParsedFile[] = [];
            for (const f of rawFilesRef.current) {
              parsed.push(await parseFile(f));
            }
            fileContent = parsed.map(p => `--- ${p.name} ---\n${p.content}`).join('\n\n');
          } catch { /* file parse failed — redirect without content */ }
        }
        rawFilesRef.current = [];
        setAttachedFiles([]);
        navigate('/presentations', { state: { autoTask: { topic: intent.topic, slideCount: intent.slideCount, fileContent } } });
        return;
      }
      if (intent.type === 'dissertation') {
        let fileContent: string | undefined;
        if (rawFilesRef.current.length > 0) {
          try {
            const parsed: ParsedFile[] = [];
            for (const f of rawFilesRef.current) {
              parsed.push(await parseFile(f));
            }
            fileContent = parsed.map(p => `--- ${p.name} ---\n${p.content}`).join('\n\n');
          } catch { /* ignore */ }
        }
        rawFilesRef.current = [];
        setAttachedFiles([]);
        const newId = `diss-${Date.now()}`;
        navigate(`/dissertation/${newId}`, { state: { autoTask: { topic: intent.topic, pageCount: intent.pageCount, documentType: intent.documentType, fileContent } } });
        return;
      }
    }

    const remaining = subscription.getRemainingLimits();
    if (remaining.chatMessages <= 0) {
      setToast({ message: t('chat.messageLimitReached'), type: 'warning' });
      return;
    }

    const chatId = currentChatId || `chat-${Date.now()}`;
    if (!currentChatId) setCurrentChatId(chatId);

    const fileNames = attachedFiles.map(f => f.name);
    const displayContent = text
      ? (fileNames.length > 0 ? `${text}\n\n📎 ${fileNames.join(', ')}` : text)
      : `📎 ${fileNames.join(', ')}`;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: displayContent,
      timestamp: new Date(),
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    };

    const streamId = `msg-${Date.now() + 1}`;
    const newMessages = [...messages, userMsg];

    setMessages([...newMessages, { id: streamId, role: 'assistant', content: '', timestamp: new Date() }]);
    setInput('');
    setAttachedFiles([]);
    rawFilesRef.current = [];
    setIsLoading(true);
    subscription.incrementChatMessages();

    try {
      const aiResponse = await generateResponse(text || `Проанализируй файлы: ${fileNames.join(', ')}`, messages, (chunk) => {
        setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: chunk } : m));
      });

      const finalMsg: ChatMessage = { id: streamId, role: 'assistant', content: aiResponse, timestamp: new Date() };
      const finalMessages = [...newMessages, finalMsg];
      setMessages(finalMessages);
      saveChat(chatId, finalMessages, (text || fileNames[0] || t('chat.newChat')).slice(0, 40) + '...');
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === streamId ? { ...m, content: m.content || t('chat.generationCancelled') } : m
        ));
      } else {
        setMessages(prev => prev.filter(m => m.id !== streamId));
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `❌ ${(error as Error).message}`,
          timestamp: new Date(),
        }]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, messages, currentChatId, subscription, generateResponse, saveChat, attachedFiles, navigate]);

  // ── Retry last message ──
  const handleRetry = useCallback(() => {
    // Find last user message and remove the error after it
    const lastUserIdx = messages.map(m => m.role).lastIndexOf('user');
    if (lastUserIdx === -1) return;
    const lastUserMsg = messages[lastUserIdx];
    const cleanText = lastUserMsg.content.replace(/\n\n📎.*$/, '').trim();
    // Remove error message(s) after the last user message
    setMessages(prev => prev.slice(0, lastUserIdx + 1));
    setTimeout(() => handleSend(cleanText), 100);
  }, [messages, handleSend]);

  // ── Regenerate specific AI message ──
  const handleRegenerateMessage = useCallback((aiMsgId: string) => {
    const aiIdx = messages.findIndex(m => m.id === aiMsgId);
    if (aiIdx <= 0) return;
    // Find the user message right before this AI message
    let userIdx = aiIdx - 1;
    while (userIdx >= 0 && messages[userIdx].role !== 'user') userIdx--;
    if (userIdx < 0) return;
    const userMsg = messages[userIdx];
    const cleanText = userMsg.content.replace(/\n\n📎.*$/, '').trim();
    // Remove the AI message and everything after it
    setMessages(prev => prev.slice(0, aiIdx));
    setTimeout(() => handleSend(cleanText), 100);
  }, [messages, handleSend]);

  // ── Feedback (like/dislike) ──
  const handleFeedback = useCallback((msgId: string, type: 'up' | 'down') => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      return { ...m, feedback: m.feedback === type ? null : type };
    }));
    // Persist to localStorage
    if (currentChatId) {
      const saved = localStorage.getItem('chats');
      if (saved) {
        try {
          const chats = JSON.parse(saved);
          const chatIdx = chats.findIndex((c: ChatItem) => c.id === currentChatId);
          if (chatIdx >= 0) {
            const msgIdx = chats[chatIdx].messages.findIndex((m: ChatMessage) => m.id === msgId);
            if (msgIdx >= 0) {
              const current = chats[chatIdx].messages[msgIdx].feedback;
              chats[chatIdx].messages[msgIdx].feedback = current === type ? null : type;
              localStorage.setItem('chats', JSON.stringify(chats));
            }
          }
        } catch { /* skip */ }
      }
    }
  }, [currentChatId]);

  // ── Edit user message ──
  const handleStartEdit = useCallback((msg: ChatMessage) => {
    const cleanText = msg.content.replace(/\n\n📎.*$/, '').trim();
    setEditingMessageId(msg.id);
    setEditText(cleanText);
  }, []);

  const handleSaveEdit = useCallback((msgId: string) => {
    const text = editText.trim();
    if (!text) return;
    const msgIdx = messages.findIndex(m => m.id === msgId);
    if (msgIdx < 0) return;
    // Remove all messages from this one onwards and resend
    setMessages(prev => prev.slice(0, msgIdx));
    setEditingMessageId(null);
    setEditText('');
    setTimeout(() => handleSend(text), 100);
  }, [editText, messages, handleSend]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditText('');
  }, []);

  // ── Text-to-Speech ──
  const handleSpeak = useCallback((msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    window.speechSynthesis.cancel();
    // Strip markdown formatting for cleaner speech
    const cleanText = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/[>|_~]/g, '')
      .trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ru-RU';
    utterance.rate = 1;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  }, [speakingMsgId]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const handleStop = () => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    setIsLoading(false);
  };

  const handleQuickAction = (prompt: string) => { setInput(prompt); inputRef.current?.focus(); };

  const handleCommandSelect = (cmd: typeof COMMANDS[number]) => {
    setShowCommandPalette(false);
    if (cmd.labelKey === 'chat.cmdDissertation') { navigate('/dissertation'); return; }
    if (cmd.labelKey === 'chat.cmdPresentation') { navigate('/presentations'); return; }
    setInput(cmd.prompt + ' ');
    inputRef.current?.focus();
  };

  // ── Keyboard navigation in command palette ──
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showCommandPalette) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCommandIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCommandIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && filteredCommands[commandIndex]) {
        e.preventDefault();
        handleCommandSelect(filteredCommands[commandIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setInput('');
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [showCommandPalette, filteredCommands, commandIndex, handleSend, handleCommandSelect]);

  const openChat = (chatItem: ChatItem) => {
    setCurrentChatId(chatItem.id);
    setMessages(chatItem.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    setShowSidebar(false);
  };

  const newChat = () => { setCurrentChatId(null); setMessages([]); setInput(''); setAttachedFiles([]); rawFilesRef.current = []; setShowSidebar(false); };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const saved = localStorage.getItem('chats');
    let chats: ChatItem[] = [];
    try { chats = saved ? JSON.parse(saved) : []; } catch { chats = []; }
    chats = chats.filter(c => c.id !== chatId);
    localStorage.setItem('chats', JSON.stringify(chats));
    setAllChats(chats.map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) })));
    if (currentChatId === chatId) newChat();
  };

  const filteredChats = allChats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const hasMessages = messages.length > 0;
  const hasAttachments = attachedFiles.length > 0;
  const userName = user?.name || user?.email?.split('@')[0] || t('chat.user');

  // ═══════════════════════════════════════════
  // SHARED INPUT AREA (render function — avoids remount)
  // ═══════════════════════════════════════════
  const renderInputArea = (isWelcome = false) => (
    <div className={isWelcome ? 'relative' : 'relative z-20 border-t border-border-primary/20 p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(1rem+env(safe-area-inset-bottom))]'}
      style={isWelcome ? undefined : { background: 'rgb(var(--bg-primary) / 0.92)', backdropFilter: 'blur(32px)' }}>
      <div className={isWelcome ? '' : 'max-w-3xl mx-auto'}>

        {/* Attached files */}
        <AnimatePresence mode="popLayout">
          {hasAttachments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, i) => (
                  <motion.div
                    key={file.name + '-' + file.size + '-' + i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout
                    className="relative group"
                  >
                    {file.preview ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-text-primary/10 relative">
                        <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeFile(i)}
                          aria-label={`Удалить ${file.name}`}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg-primary/80 border border-text-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} className="text-text-primary/70" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-text-primary/[0.08] bg-text-primary/[0.03]">
                        <File size={14} className="text-violet-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-text-primary/70 truncate max-w-[120px]">{file.name}</p>
                          <p className="text-[10px] text-text-secondary/50">{formatFileSize(file.size)}</p>
                        </div>
                        <button onClick={() => removeFile(i)} aria-label={`Удалить ${file.name}`}
                          className="p-0.5 rounded-full hover:bg-text-primary/10 text-text-secondary/50 hover:text-text-primary/60 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input container */}
        <motion.div
          animate={{ height: textareaHeight + 24 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.5 }}
          className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
            isDragOver
              ? 'shadow-[0_0_50px_rgba(139,92,246,0.2)]'
              : isFocused
                ? 'shadow-[0_0_40px_rgba(139,92,246,0.08)]'
                : ''
          }`}
          style={{
            background: 'rgb(var(--text-primary) / 0.025)',
            backdropFilter: 'blur(40px)',
            border: isDragOver
              ? '1px solid rgba(139,92,246,0.4)'
              : isFocused
                ? '1px solid rgba(139,92,246,0.2)'
                : '1px solid rgb(var(--border-primary) / 0.3)',
            boxShadow: isFocused ? '0 0 0 1px rgba(139,92,246,0.05), inset 0 1px 0 rgb(var(--text-primary) / 0.03)' : 'inset 0 1px 0 rgb(var(--text-primary) / 0.02)',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILES}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Drag overlay */}
          <AnimatePresence>
            {isDragOver && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-violet-500/5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 text-violet-400 text-sm font-medium">
                  <Paperclip size={18} />
                  Отпустите для прикрепления
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={handleInputKeyDown}
            placeholder={t('chat.inputPlaceholderFull')}
            rows={1}
            disabled={isLoading}
            aria-label={t('chat.inputAriaLabel')}
            className="w-full bg-transparent text-text-primary/90 placeholder-text-secondary/50 text-[15px] pl-14 pr-14 py-4 resize-none focus:outline-none"
            style={{ height: textareaHeight, lineHeight: '1.6', maxHeight: 200 }}
          />

          {/* Paperclip */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="absolute left-3.5 bottom-3.5 p-1.5 rounded-lg text-text-secondary/50 hover:text-text-primary/60 hover:bg-text-primary/5 transition-all disabled:opacity-30"
            aria-label={t('chat.attachFile')}
            title={t('chat.attachFile')}
          >
            <Paperclip size={18} />
          </motion.button>

          {/* Send / Stop */}
          <div className="absolute right-3 bottom-3">
            {isLoading ? (
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleStop}
                aria-label={t('chat.stopGeneration')}
                className="p-2.5 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all border border-red-500/20">
                <X size={16} />
              </motion.button>
            ) : (
              <motion.button whileHover={{ scale: 1.08, boxShadow: '0 0 24px rgba(139,92,246,0.4)' }} whileTap={{ scale: 0.92 }} onClick={() => handleSend()}
                disabled={!input.trim() && !hasAttachments}
                aria-label={t('chat.send')}
                className="p-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white disabled:opacity-10 disabled:cursor-not-allowed transition-all"
                style={{ boxShadow: (input.trim() || hasAttachments) ? '0 0 20px rgba(139,92,246,0.3)' : 'none' }}>
                <Send size={16} />
              </motion.button>
            )}
          </div>
        </motion.div>

        {isWelcome && (
          <div className="hidden sm:flex items-center justify-center gap-5 mt-3 text-text-secondary/50 text-xs">
            <span className="flex items-center gap-1"><Command size={10} />{t('chat.enterToSendShort')}</span>
            <span className="flex items-center gap-1"><Paperclip size={10} />{t('chat.files')}</span>
            <span className="flex items-center gap-1"><Hash size={10} />{t('chat.slashCommands')}</span>
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div
      className="h-[100dvh] w-screen flex overflow-hidden bg-bg-primary"
      onMouseMove={handleMouseMove}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ═══ SIDEBAR ═══ */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
            <motion.aside
              initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed z-50 w-72 h-full flex flex-col border-r border-border-primary/30"
              style={{ background: 'rgb(var(--bg-primary) / 0.97)', backdropFilter: 'blur(40px)', boxShadow: '4px 0 40px rgba(0,0,0,0.3)' }}
              role="navigation"
              aria-label={t('chat.toggleSidebar')}
            >
              <div className="p-4 flex items-center justify-between border-b border-border-primary/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <Brain size={17} className="text-white" />
                  </div>
                  <div>
                    <span className="font-semibold text-text-primary text-sm tracking-tight">Science AI</span>
                    <p className="text-[10px] text-text-secondary/50 -mt-0.5">{t('chat.aiSubtitle')}</p>
                  </div>
                </div>
                <button onClick={() => setShowSidebar(false)} aria-label={t('common.close')}
                  className="p-1.5 rounded-lg hover:bg-text-primary/5 text-text-secondary/60 hover:text-text-primary/70 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={newChat}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 text-text-primary/90 text-sm font-medium hover:from-violet-500/30 hover:to-fuchsia-500/30 transition-all">
                  <Plus size={16} />{t('chat.newChat')}
                </motion.button>
              </div>

              <div className="px-3 mb-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('chat.searchChats')}
                    aria-label={t('chat.searchChats')}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-text-primary/5 border border-border-primary/30 rounded-lg text-text-primary/80 placeholder-text-secondary/50 focus:outline-none focus:border-violet-500/30" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-text-primary/10" role="list" aria-label={t('chat.history')}>
                {filteredChats.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary/50 text-xs">{t('chat.noChats')}</div>
                ) : filteredChats.map(chat => (
                  <motion.button key={chat.id} whileHover={{ backgroundColor: 'rgba(var(--text-primary), 0.05)' }} onClick={() => openChat(chat)}
                    role="listitem"
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left group transition-colors ${currentChatId === chat.id ? 'bg-text-primary/10' : ''}`}>
                    <MessageSquare size={14} className="text-text-secondary/50 shrink-0" />
                    <span className="flex-1 text-sm text-text-primary/70 truncate">{chat.title}</span>
                    <button onClick={(e) => deleteChat(chat.id, e)} aria-label={`${t('chat.deleteThisChat')} ${chat.title}`}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-text-primary/10 text-text-secondary/50 hover:text-red-400 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </motion.button>
                ))}
              </div>

              <div className="border-t border-border-primary/30 p-3 space-y-0.5">
                <button onClick={() => navigate('/dissertation')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary/70 hover:text-text-primary/90 hover:bg-text-primary/[0.04] transition-all group">
                  <GraduationCap size={15} className="group-hover:text-violet-400 transition-colors" />{t('nav.dissertations')}
                </button>
                <button onClick={() => navigate('/presentations')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary/70 hover:text-text-primary/90 hover:bg-text-primary/[0.04] transition-all group">
                  <Layers size={15} className="group-hover:text-fuchsia-400 transition-colors" />{t('nav.presentations')}
                </button>
                <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary/70 hover:text-text-primary/90 hover:bg-text-primary/[0.04] transition-all group">
                  <Layers size={15} className="group-hover:text-indigo-400 transition-colors" />{t('common.settings')}
                </button>
              </div>

              <div className="border-t border-border-primary/30 p-3">
                <div className="flex items-center gap-2.5 px-2 py-1">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/80 to-fuchsia-500/80 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-violet-500/10">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary/85 truncate font-medium">{userName}</p>
                    <p className="text-[11px] text-text-secondary/50 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ═══ MAIN AREA ═══ */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Premium background — matching landing page style */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Purple orb — top-left */}
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-purple-500/[0.15] rounded-full blur-[120px]"
          />
          {/* Pink orb — bottom-right */}
          <motion.div
            animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute bottom-[15%] right-[10%] w-[450px] h-[450px] bg-pink-500/[0.12] rounded-full blur-[100px]"
          />
          {/* Blue orb — center, pulsing */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-500/[0.08] rounded-full blur-[140px]"
          />
          {/* Grid pattern with radial fade — like landing page */}
          <div className="absolute inset-0 bg-[linear-gradient(rgb(var(--text-primary)/0.03)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--text-primary)/0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
        </div>

        {/* Interactive mouse glow */}
        <motion.div className="fixed pointer-events-none z-[5]"
          animate={{ x: mousePos.x - 250, y: mousePos.y - 250 }}
          transition={{ type: 'spring', damping: 40, stiffness: 150, mass: 0.5 }}
          style={{ width: 500, height: 500, borderRadius: '50%', opacity: isFocused ? 0.8 : 0.25,
            background: 'radial-gradient(circle, rgba(139,92,246,0.08), rgba(217,70,239,0.04) 40%, transparent 70%)',
            transition: 'opacity 0.5s ease' }} />

        {/* Top bar — premium glassmorphism */}
        <div className="relative z-10 flex items-center justify-between px-3 sm:px-5 py-3"
          style={{ background: 'rgb(var(--bg-primary) / 0.6)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgb(var(--border-primary) / 0.3)' }}>
          <div className="flex items-center gap-1.5">
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => setShowSidebar(true)} aria-label={t('chat.openMenu')}
              className="p-2.5 rounded-xl hover:bg-text-primary/[0.06] text-text-secondary/60 hover:text-text-primary/80 transition-all duration-200">
              <Menu size={20} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={newChat}
              aria-label={t('chat.newChat')}
              className="p-2.5 rounded-xl hover:bg-text-primary/[0.06] text-text-secondary/60 hover:text-text-primary/80 transition-all duration-200">
              <Plus size={20} />
            </motion.button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles size={10} className="text-white" />
            </div>
            <span className="text-text-secondary/70 text-sm font-medium tracking-wide select-none">Science AI</span>
          </div>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => navigate('/settings')} aria-label={t('common.settings')}
            className="p-2.5 rounded-xl hover:bg-text-primary/[0.06] text-text-secondary/60 hover:text-text-primary/80 transition-all duration-200">
            <Settings size={18} />
          </motion.button>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className="flex-1 flex flex-col min-h-0 relative z-10">

          {!hasMessages ? (
            /* ═══ WELCOME — Premium 2026 Design ═══ */
            <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-center max-w-2xl w-full">

                {/* Animated logo with glow */}
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', damping: 12, stiffness: 200 }}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 sm:mb-8">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 opacity-20 blur-xl animate-pulse" />
                  <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-text-primary/[0.08] flex items-center justify-center"
                    style={{ boxShadow: '0 0 40px rgba(139,92,246,0.15), inset 0 1px 0 rgb(var(--text-primary) / 0.05)' }}>
                    <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
                      <Sparkles size={32} className="text-violet-400/90" />
                    </motion.div>
                  </div>
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-3 tracking-tight">
                  Чем помочь сегодня?
                </motion.h1>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                  className="text-text-secondary/60 text-sm sm:text-base mb-8 sm:mb-10 font-light px-2 sm:px-0">
                  Напишите запрос или используйте <span className="font-mono text-violet-400/70 px-1.5 py-0.5 rounded-md bg-text-primary/[0.03] border border-text-primary/[0.05]">/команду</span>
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="mb-10">
                  {renderInputArea(true)}
                </motion.div>

                {/* Quick actions — glassmorphism pills */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mb-8 sm:mb-12 px-2 sm:px-0">
                  {QUICK_ACTIONS.map((action, i) => (
                    <motion.button key={i}
                      whileHover={{ scale: 1.06, y: -3, boxShadow: '0 8px 30px rgba(139,92,246,0.12)' }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 + i * 0.05, type: 'spring', damping: 20 }}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="group flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm text-text-secondary/70 hover:text-text-primary/90 transition-all duration-300"
                      style={{ background: 'rgb(var(--text-primary) / 0.025)', border: '1px solid rgb(var(--border-primary) / 0.3)', backdropFilter: 'blur(12px)' }}>
                      <action.icon size={14} className="text-violet-400/60 group-hover:text-violet-400 transition-colors" />
                      {action.label}
                    </motion.button>
                  ))}
                </motion.div>

                {/* ═══ Capabilities — Premium glassmorphism cards ═══ */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                  className="max-w-xl mx-auto">
                  <p className="text-text-secondary/40 text-[11px] uppercase tracking-[0.2em] mb-5 font-medium">{t('chat.describeTask')}</p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { icon: GraduationCap, title: t('nav.dissertations'), desc: t('chat.capDissertations'), color: 'violet', gradient: 'from-violet-500/20 to-violet-600/5', path: '/dissertation', iconCls: 'bg-violet-500/10 border-violet-500/10', iconText: 'text-violet-400/80' },
                      { icon: Layers, title: t('nav.presentations'), desc: t('chat.capPresentations'), color: 'fuchsia', gradient: 'from-fuchsia-500/20 to-fuchsia-600/5', path: '/presentations', iconCls: 'bg-fuchsia-500/10 border-fuchsia-500/10', iconText: 'text-fuchsia-400/80' },
                      { icon: MessageSquare, title: t('chat.questions'), desc: t('chat.capQuestions'), color: 'indigo', gradient: 'from-indigo-500/20 to-indigo-600/5', path: '', iconCls: 'bg-indigo-500/10 border-indigo-500/10', iconText: 'text-indigo-400/80' },
                    ].map((cap, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.75 + i * 0.08 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        onClick={() => cap.path && navigate(cap.path)}
                        className={`group relative p-3 sm:p-5 rounded-2xl overflow-hidden ${cap.path ? 'cursor-pointer' : 'cursor-default'}`}
                        style={{ background: 'rgb(var(--text-primary) / 0.02)', border: '1px solid rgb(var(--border-primary) / 0.2)', backdropFilter: 'blur(16px)' }}>
                        {/* Card glow on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${cap.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-xl ${cap.iconCls} flex items-center justify-center mb-3 border`}
                            style={{ boxShadow: `0 0 20px rgba(var(--accent-primary), 0.05)` }}>
                            <cap.icon size={18} className={cap.iconText} />
                          </div>
                          <p className="text-text-primary/70 text-sm font-semibold mb-1">{cap.title}</p>
                          <p className="text-text-secondary/50 text-xs">{cap.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-text-secondary/30 text-[11px] mt-5">{t('chat.aiAutoDetect')}</p>
                </motion.div>
              </motion.div>
            </div>
          ) : (
            /* ═══ CHAT ═══ */
            <>
              <div ref={messagesContainerRef} onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-2.5 sm:px-4 py-4 sm:py-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                role="log" aria-label={t('chat.title')}>
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.map((msg, msgIdx) => {
                    const isError = msg.role === 'assistant' && msg.content.startsWith('❌');
                    const isStreaming = isLoading && msg.id.startsWith('msg-') && msgIdx === messages.length - 1 && msg.role === 'assistant';

                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {/* AI avatar — premium glow */}
                        {msg.role === 'assistant' && (
                          <div className="relative w-8 h-8 shrink-0 mt-1">
                            {isStreaming && <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-md animate-pulse" />}
                            <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-text-primary/[0.06] flex items-center justify-center"
                              style={{ boxShadow: isStreaming ? '0 0 16px rgba(139,92,246,0.2)' : 'none' }}>
                              <Sparkles size={14} className={`text-violet-400/80 ${isStreaming ? 'animate-pulse' : ''}`} />
                            </div>
                          </div>
                        )}

                        <div className={`max-w-[85%] sm:max-w-[80%] ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                          {/* Image attachments */}
                          {msg.attachments && msg.attachments.some(a => a.preview) && (
                            <div className="flex flex-wrap gap-2 mb-2 justify-end">
                              {msg.attachments.filter(a => a.preview).map((a, i) => (
                                <div key={i} className="w-28 h-28 rounded-xl overflow-hidden border border-text-primary/10">
                                  <img src={a.preview} alt={a.name} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* User message editing */}
                          {msg.role === 'user' && editingMessageId === msg.id ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="w-full max-w-md"
                            >
                              <div className="rounded-2xl overflow-hidden"
                                style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
                                <textarea
                                  value={editText}
                                  onChange={e => setEditText(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(msg.id); } if (e.key === 'Escape') handleCancelEdit(); }}
                                  className="w-full bg-transparent px-4 py-3 text-sm text-text-primary/90 resize-none focus:outline-none"
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex items-center gap-2 px-3 py-2 border-t border-violet-500/15">
                                  <span className="text-[10px] text-text-secondary/30 flex-1">{t('chat.enterToSend')}</span>
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCancelEdit}
                                    className="px-3 py-1.5 text-xs text-text-secondary/50 hover:text-text-primary/80 rounded-lg hover:bg-text-primary/5 transition-all">
                                    {t('chat.cancel')}
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSaveEdit(msg.id)}
                                    className="px-3.5 py-1.5 text-xs text-white font-medium bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-lg shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all">
                                    {t('chat.submit')}
                                  </motion.button>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                          <>
                          {/* Message bubble — premium glassmorphism */}
                          <div className="group/msg relative">
                          <div className={`rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user'
                              ? 'px-4 py-3 text-white rounded-br-md'
                              : isError
                                ? 'px-4 py-3 text-red-300 rounded-bl-md'
                                : 'px-4 py-3 text-text-primary/80 rounded-bl-md'
                          }`}
                          style={
                            msg.role === 'user'
                              ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(168,85,247,0.85))', boxShadow: '0 4px 20px rgba(139,92,246,0.25)' }
                              : isError
                                ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }
                                : { background: 'rgb(var(--text-primary) / 0.025)', border: '1px solid rgb(var(--text-primary) / 0.05)', backdropFilter: 'blur(12px)' }
                          }>
                            {msg.role === 'assistant' && !isError ? (
                              <div className="prose-chat">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                  {msg.content}
                                </ReactMarkdown>
                                {isStreaming && (
                                  <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse align-text-bottom" />
                                )}
                              </div>
                            ) : (
                              <span className="whitespace-pre-wrap">{msg.content}</span>
                            )}
                          </div>

                          {/* ── Stop button during streaming ── */}
                          {isStreaming && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex justify-start mt-2"
                            >
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={handleStop}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-text-primary/70 hover:text-text-primary transition-all"
                                style={{
                                  background: 'rgba(239,68,68,0.08)',
                                  border: '1px solid rgba(239,68,68,0.2)',
                                  backdropFilter: 'blur(12px)',
                                }}
                              >
                                <Square size={12} className="fill-current" />
                                Остановить генерацию
                              </motion.button>
                            </motion.div>
                          )}

                          {/* ── Action toolbar for AI messages ── */}
                          {msg.role === 'assistant' && !isStreaming && msg.content && !isError && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={`flex items-center gap-0.5 mt-1.5 transition-opacity duration-200 ${msg.feedback ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100'}`}
                            >
                              <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-xl"
                                style={{ background: 'rgb(var(--text-primary) / 0.02)', border: '1px solid rgb(var(--text-primary) / 0.04)' }}>
                                <CopyButton text={msg.content} />
                                <motion.button
                                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                                  onClick={() => handleRegenerateMessage(msg.id)}
                                  className="p-1.5 rounded-lg text-text-secondary/50 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                                  title={t('chat.regenerate')}
                                >
                                  <RotateCcw size={14} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                                  onClick={() => handleSpeak(msg.id, msg.content)}
                                  className={`p-1.5 rounded-lg transition-all ${speakingMsgId === msg.id ? 'text-violet-400 bg-violet-500/10' : 'text-text-secondary/50 hover:text-violet-400 hover:bg-violet-500/10'}`}
                                  title={speakingMsgId === msg.id ? t('chat.stopSpeaking') : t('chat.speak')}
                                >
                                  {speakingMsgId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </motion.button>

                                <div className="w-px h-4 bg-text-primary/[0.06] mx-1" />

                                <motion.button
                                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                                  onClick={() => handleFeedback(msg.id, 'up')}
                                  className={`p-1.5 rounded-lg transition-all ${msg.feedback === 'up' ? 'text-green-400 bg-green-500/10' : 'text-text-secondary/50 hover:text-green-400 hover:bg-green-500/10'}`}
                                  title={t('chat.helpfulResponse')}
                                >
                                  <ThumbsUp size={14} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                                  onClick={() => handleFeedback(msg.id, 'down')}
                                  className={`p-1.5 rounded-lg transition-all ${msg.feedback === 'down' ? 'text-red-400 bg-red-500/10' : 'text-text-secondary/50 hover:text-red-400 hover:bg-red-500/10'}`}
                                  title={t('chat.unhelpfulResponse')}
                                >
                                  <ThumbsDown size={14} />
                                </motion.button>
                              </div>
                              <span className="text-[10px] text-text-secondary/30 ml-2">{formatTime(msg.timestamp)}</span>
                            </motion.div>
                          )}

                          {/* ── Retry button for errors ── */}
                          {msg.role === 'assistant' && isError && (
                            <div className="flex items-center gap-2 mt-2">
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={handleRetry}
                                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium text-amber-400/80 hover:text-amber-300 transition-all"
                                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
                              >
                                <RotateCcw size={13} />
                                {t('chat.retry')}
                              </motion.button>
                              <span className="text-[10px] text-text-secondary/30">{formatTime(msg.timestamp)}</span>
                            </div>
                          )}

                          {/* ── User message actions ── */}
                          {msg.role === 'user' && (
                            <div className="flex items-center gap-1 mt-1 justify-end opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200">
                              <span className="text-[10px] text-text-secondary/30 mr-1">{formatTime(msg.timestamp)}</span>
                              {!isLoading && (
                                <motion.button
                                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                                  onClick={() => handleStartEdit(msg)}
                                  className="p-1.5 rounded-lg text-text-secondary/50 hover:text-violet-400 hover:bg-text-primary/5 transition-all"
                                  title={t('common.edit')}
                                >
                                  <Edit3 size={13} />
                                </motion.button>
                              )}
                            </div>
                          )}
                          </div>
                          </>
                          )}
                        </div>

                        {/* User avatar — premium style */}
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-xl bg-text-primary/[0.06] border border-text-primary/[0.04] flex items-center justify-center shrink-0 mt-1 text-text-secondary text-xs font-semibold">
                            {userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Typing indicator — premium */}
                  {isLoading && messages.length > 0 && messages[messages.length - 1]?.content === '' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                      <div className="relative w-8 h-8 shrink-0">
                        <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-md animate-pulse" />
                        <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-text-primary/[0.06] flex items-center justify-center">
                          <Sparkles size={14} className="text-violet-400 animate-pulse" />
                        </div>
                      </div>
                      <div className="px-4 py-3.5 rounded-2xl rounded-bl-md"
                        style={{ background: 'rgb(var(--text-primary) / 0.025)', border: '1px solid rgb(var(--text-primary) / 0.05)', backdropFilter: 'blur(12px)' }}>
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map(i => (
                            <motion.div key={i} animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.3, 0.9, 0.3] }}
                              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                              className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} className="h-1" style={{ overflowAnchor: 'auto' }} />
                </div>
              </div>

              {/* Scroll FAB — premium */}
              <AnimatePresence>
                {showScrollBtn && (
                  <motion.button initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    aria-label={t('chat.scrollDown')}
                    className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 p-2.5 rounded-full text-text-secondary/70 hover:text-text-primary/80 transition-all"
                    style={{ background: 'rgb(var(--bg-primary) / 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgb(var(--border-primary) / 0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    <ArrowDown size={16} />
                  </motion.button>
                )}
              </AnimatePresence>

              {renderInputArea()}
            </>
          )}
        </div>

        {/* ═══ COMMAND PALETTE ═══ */}
        <AnimatePresence>
          {showCommandPalette && (
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-lg rounded-2xl overflow-hidden"
              style={{ background: 'rgb(var(--bg-primary) / 0.95)', backdropFilter: 'blur(40px)', border: '1px solid rgb(var(--border-primary) / 0.3)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
              role="listbox" aria-label={t('chat.commandPalette')}>
              <div className="px-4 py-3 border-b border-text-primary/[0.06] flex items-center gap-2">
                <Command size={14} className="text-violet-400" />
                <span className="text-sm text-text-secondary/60">{t('chat.commands')}</span>
                <span className="text-[10px] text-text-secondary/30 ml-auto">{t('chat.navigationHint')}</span>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <div className="text-center py-6 text-text-secondary/40 text-sm">{t('chat.commandNotFound')}</div>
                ) : filteredCommands.map((cmd, i) => (
                  <motion.button
                    key={i}
                    onClick={() => handleCommandSelect(cmd)}
                    role="option"
                    aria-selected={i === commandIndex}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      i === commandIndex ? 'bg-violet-500/10 border border-violet-500/15' : 'border border-transparent hover:bg-text-primary/[0.04]'
                    }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      i === commandIndex ? 'bg-violet-500/15' : 'bg-text-primary/[0.04]'
                    }`}>
                      <cmd.icon size={14} className={i === commandIndex ? 'text-violet-400' : 'text-violet-400/70'} />
                    </div>
                    <div>
                      <p className={`text-sm ${i === commandIndex ? 'text-text-primary/90' : 'text-text-primary/70'}`}>{cmd.label}</p>
                      <p className="text-xs text-text-secondary/40">{cmd.description}</p>
                    </div>
                    <ChevronRight size={12} className={`ml-auto ${i === commandIndex ? 'text-violet-400/50' : 'text-text-secondary/20'}`} />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ScienceAIChat;
