import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import OnboardingTour from '../components/OnboardingTour';
import { API_URL } from '../config';
import { fetchWithAuth } from '../services/apiClient';
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Table,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Clock,
  BookOpen,
  GraduationCap,
  Lightbulb,
  RefreshCw,
  Wand2,
  Brain,
  PenTool,
  Search,
  Copy,
  Check,
  AlertCircle,
  Target,
  TrendingUp,
  FileDown,
  Sparkles,
  FileText,
  Paperclip,
  Lock,
  Rocket,
  Zap,
  Loader2,
  // Новые иконки для AI функций
  Layers,
  CheckCircle,
  BarChart,
  Microscope,
  MessageSquare,
  Menu,
  X,
} from 'lucide-react';
import { useSubscriptionStore, SUBSCRIPTION_PLANS, PLAN_LIMITS } from '../store/subscriptionStore';
import PlagiarismChecker from '../components/PlagiarismChecker';
import { useConfirm } from '../components/ConfirmModal';
import { lazy, Suspense } from 'react';
const AIDetectionChecker = lazy(() => import('../components/AIDetectionChecker'));
const AntiAIDetectionLazy = lazy(() => import('../components/AntiAIDetection').then(m => ({ default: m.AntiAIDetection })));

import { parseFile, formatFileForPrompt, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE, formatFileSize, type ParsedFile } from '../utils/fileParser';

// Extracted dissertation modules
import type { Chapter, DocumentType, DocumentTypeConfig, Dissertation, Citation, AIMessage, ThinkingStep } from './dissertation';
import { DOCUMENT_TYPES, SCIENCE_FIELDS, formatCitationGOST, checkUniqueness, generateBibliography, getHumanWritingSystemPrompt, exportToPDF } from './dissertation';

const DissertationPage = () => {
  useDocumentTitle('Диссертации');
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abstractTextareaRef = useRef<HTMLTextAreaElement>(null);
  const aiMessagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Подписка и лимиты
  const subscription = useSubscriptionStore();
  const canGenerate = subscription.canGenerateDissertationContent();
  
  // API ключ хранится ТОЛЬКО на сервере (безопасно, не виден в браузере)
  
  const [showMenu, setShowMenu] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedSubchapter, setSelectedSubchapter] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<ParsedFile[]>([]);
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());

  // Auto-scroll — только контейнер сообщений скроллится, экран стоит на месте
  useEffect(() => {
    const container = aiMessagesContainerRef.current;
    const endElement = messagesEndRef.current;

    if (!container || !endElement) return;

    // Во время стриминга — всегда следим за концом (внутри контейнера)
    if (isGenerating) {
      container.scrollTop = container.scrollHeight;
    } 
    // Когда генерация закончена — плавно, только если пользователь был внизу
    else {
      const isNearBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 150;

      if (isNearBottom) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [aiMessages, isGenerating]);

  // Авто-раскрытие thinking блоков пока они активны
  useEffect(() => {
    const activeThinking = aiMessages.find(m => m.isThinking && m.thinkingActive);
    if (activeThinking) {
      setExpandedThinking(prev => {
        if (prev.has(activeThinking.id)) return prev;
        const next = new Set(prev);
        next.add(activeThinking.id);
        return next;
      });
    }
  }, [aiMessages]);

  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [writingStyle, setWritingStyle] = useState<'academic' | 'readable' | 'mixed'>('mixed');
  const [writingLanguage, setWritingLanguage] = useState<'ru' | 'en' | 'uk' | 'kk' | 'uz' | 'de' | 'fr' | 'es' | 'zh' | 'ar'>('ru');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false); // Сворачиваемые быстрые действия
  const [showLargeActions, setShowLargeActions] = useState(false); // Сворачиваемые супер-функции
  const [showPlagiarismPanel, setShowPlagiarismPanel] = useState(false); // Панель антиплагиата
  const [showSidebarMobile, setShowSidebarMobile] = useState(false); // Мобильный сайдбар
  const [plagiarismPanelTab, setPlagiarismPanelTab] = useState<'check' | 'detect' | 'humanize'>('check');
  
  // Поддерживаемые языки
  const SUPPORTED_LANGUAGES = {
    ru: { name: 'Русский', flag: '🇷🇺', academicStyle: 'ГОСТ Р 7.0.5-2008' },
    en: { name: 'English', flag: '🇬🇧', academicStyle: 'APA 7th' },
    uk: { name: 'Українська', flag: '🇺🇦', academicStyle: 'ДСТУ 8302:2015' },
    kk: { name: 'Қазақша', flag: '🇰🇿', academicStyle: 'ГОСТ РК' },
    uz: { name: 'O\'zbek', flag: '🇺🇿', academicStyle: "O'zDSt" },
    de: { name: 'Deutsch', flag: '🇩🇪', academicStyle: 'DIN 1505' },
    fr: { name: 'Français', flag: '🇫🇷', academicStyle: 'NF Z44-005' },
    es: { name: 'Español', flag: '🇪🇸', academicStyle: 'ISO 690' },
    zh: { name: '中文', flag: '🇨🇳', academicStyle: 'GB/T 7714' },
    ar: { name: 'العربية', flag: '🇸🇦', academicStyle: 'APA Arabic' },
  } as const;
  
  // Новые состояния для расширенного функционала
  const [showDocTypeSelector, setShowDocTypeSelector] = useState(false);
  const [isCheckingUniqueness, setIsCheckingUniqueness] = useState(false);
  const [showCitationManager, setShowCitationManager] = useState(false);
  const [showAddCitation, setShowAddCitation] = useState(false);
  const [newCitation, setNewCitation] = useState<Citation>({
    id: '',
    type: 'book',
    authors: [],
    title: '',
    source: '',
    year: new Date().getFullYear(),
  });

  // Load or create dissertation
  const [dissertation, setDissertation] = useState<Dissertation>(() => {
    if (id) {
      try {
        const saved = localStorage.getItem('dissertations');
        if (saved) {
          const list = JSON.parse(saved);
          const found = list.find((d: Dissertation) => d.id === id);
          if (found) return { ...found, createdAt: new Date(found.createdAt), updatedAt: new Date(found.updatedAt) };
        }
      } catch (e) {
        console.error('Error loading dissertation:', e);
      }
    }
    return {
      id: id || `diss-${Date.now()}`,
      title: 'Новая диссертация',
      topic: '',
      abstract: '',
      chapters: [
        {
          id: 'ch-1',
          title: 'Введение',
          content: '',
          subchapters: [
            { id: 'sub-1-1', title: 'Актуальность исследования', content: '' },
            { id: 'sub-1-2', title: 'Цель и задачи', content: '' },
            { id: 'sub-1-3', title: 'Объект и предмет исследования', content: '' },
            { id: 'sub-1-4', title: 'Научная новизна', content: '' },
            { id: 'sub-1-5', title: 'Практическая значимость', content: '' },
          ]
        },
        {
          id: 'ch-2',
          title: 'Глава 1. Теоретические основы исследования',
          content: '',
          subchapters: [
            { id: 'sub-2-1', title: '1.1. Обзор литературы', content: '' },
            { id: 'sub-2-2', title: '1.2. Основные понятия и определения', content: '' },
            { id: 'sub-2-3', title: '1.3. Анализ существующих подходов', content: '' },
          ]
        },
        {
          id: 'ch-3',
          title: 'Глава 2. Методология исследования',
          content: '',
          subchapters: [
            { id: 'sub-3-1', title: '2.1. Методы исследования', content: '' },
            { id: 'sub-3-2', title: '2.2. Этапы исследования', content: '' },
            { id: 'sub-3-3', title: '2.3. База исследования', content: '' },
          ]
        },
        {
          id: 'ch-4',
          title: 'Глава 3. Результаты исследования',
          content: '',
          subchapters: [
            { id: 'sub-4-1', title: '3.1. Анализ полученных данных', content: '' },
            { id: 'sub-4-2', title: '3.2. Интерпретация результатов', content: '' },
            { id: 'sub-4-3', title: '3.3. Обсуждение', content: '' },
          ]
        },
        {
          id: 'ch-5',
          title: 'Заключение',
          content: '',
          subchapters: []
        },
        {
          id: 'ch-6',
          title: 'Список литературы',
          content: '',
          subchapters: []
        },
        {
          id: 'ch-7',
          title: 'Приложения',
          content: '',
          subchapters: []
        }
      ],
      starred: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount: 0,
      targetWordCount: 80000,
      scienceField: 'pedagogy',
      degreeType: 'master',
      documentType: 'dissertation' as DocumentType,
      citations: [],
      plagiarismScore: undefined,
      uniquenessScore: undefined,
    };
  });

  // Word count calculation using useMemo to avoid infinite loops
  const wordCount = useMemo(() => {
    let count = dissertation.abstract.split(/\s+/).filter(w => w).length;
    dissertation.chapters.forEach(ch => {
      count += ch.content.split(/\s+/).filter(w => w).length;
      ch.subchapters.forEach(sub => {
        count += sub.content.split(/\s+/).filter(w => w).length;
      });
    });
    return count;
  }, [dissertation.abstract, dissertation.chapters]);

  // Debounced auto-save using useRef
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const saveDissertation = useCallback((dissToSave: Dissertation) => {
    setSaveStatus('saving');
    try {
      const saved = localStorage.getItem('dissertations');
      let list: Dissertation[] = [];
      try {
        list = saved ? JSON.parse(saved) : [];
      } catch (e) {
        list = [];
      }
      const index = list.findIndex((d: Dissertation) => d.id === dissToSave.id);
      if (index >= 0) {
        list[index] = dissToSave;
      } else {
        list.push(dissToSave);
      }
      localStorage.setItem('dissertations', JSON.stringify(list));
      setTimeout(() => setSaveStatus('saved'), 300);
    } catch (e) {
      console.error('Error saving dissertation:', e);
      setSaveStatus('unsaved');
    }
  }, []);

  // Auto-save effect with proper debounce
  useEffect(() => {
    if (saveStatus === 'unsaved') {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Set new timeout for 1.5 seconds
      saveTimeoutRef.current = setTimeout(() => {
        saveDissertation(dissertation);
      }, 1500);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [dissertation, saveStatus, saveDissertation]);

  // ── Auto-task from ScienceAIChat redirect ──
  const autoTaskProcessedRef = useRef(false);
  const [pendingAutoGenerate, setPendingAutoGenerate] = useState(false);

  useEffect(() => {
    const autoTask = (location.state as { autoTask?: { topic?: string; pageCount?: number; documentType?: string } } | null)?.autoTask;
    if (!autoTask || autoTaskProcessedRef.current) return;
    autoTaskProcessedRef.current = true;

    // Clear navigation state so refresh won't re-trigger
    window.history.replaceState({}, document.title);

    // Populate dissertation fields from autoTask
    setDissertation(prev => ({
      ...prev,
      title: autoTask.topic || prev.title,
      topic: autoTask.topic || prev.topic,
      documentType: (autoTask.documentType || prev.documentType) as DocumentType,
      targetWordCount: autoTask.pageCount ? autoTask.pageCount * 280 : prev.targetWordCount,
    }));

    // Open AI panel and show notification
    setShowAIPanel(true);
    setAiMessages(prev => [...prev, {
      id: `auto-${Date.now()}`,
      role: 'assistant',
      content: `🚀 **Автоматическое создание**\n\n📌 Тема: «${autoTask.topic || 'не указана'}»\n📄 Тип: ${DOCUMENT_TYPES[(autoTask.documentType || 'dissertation') as DocumentType]?.nameRu || 'Диссертация'}${autoTask.pageCount ? `\n📑 Страниц: ~${autoTask.pageCount}` : ''}\n\n⏳ Генерация начнётся автоматически...`,
      timestamp: new Date(),
    }]);

    // Trigger full generation after state settles
    setTimeout(() => setPendingAutoGenerate(true), 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const handleSelectChapter = (chapterId: string, subchapterId?: string) => {
    setSelectedChapter(chapterId);
    setSelectedSubchapter(subchapterId || null);
  };

  const getSelectedContent = useCallback(() => {
    if (!selectedChapter) return { title: '', content: '' };
    if (selectedChapter === 'abstract') {
      return { title: 'Аннотация', content: dissertation.abstract };
    }
    const chapter = dissertation.chapters.find(c => c.id === selectedChapter);
    if (!chapter) return { title: '', content: '' };
    if (selectedSubchapter) {
      const sub = chapter.subchapters.find(s => s.id === selectedSubchapter);
      return sub || { title: '', content: '' };
    }
    return chapter;
  }, [selectedChapter, selectedSubchapter, dissertation.chapters, dissertation.abstract]);

  const updateContent = useCallback((content: string) => {
    if (selectedChapter === 'abstract') {
      setDissertation(prev => ({
        ...prev,
        abstract: content,
        updatedAt: new Date()
      }));
      setSaveStatus('unsaved');
      return;
    }
    setDissertation(prev => ({
      ...prev,
      updatedAt: new Date(),
      chapters: prev.chapters.map(ch => {
        if (ch.id === selectedChapter) {
          if (selectedSubchapter) {
            return {
              ...ch,
              subchapters: ch.subchapters.map(sub => 
                sub.id === selectedSubchapter ? { ...sub, content } : sub
              )
            };
          }
          return { ...ch, content };
        }
        return ch;
      })
    }));
    setSaveStatus('unsaved');
  }, [selectedChapter, selectedSubchapter]);

  const addChapter = useCallback(() => {
    // Найти позицию для вставки (перед последними служебными главами)
    const mainChapters = dissertation.chapters.filter(ch => 
      ch.title.match(/^Глава \d+/)
    );
    const lastMainChapterNum = mainChapters.length > 0 
      ? Math.max(...mainChapters.map(ch => parseInt(ch.title.match(/Глава (\d+)/)?.[1] || '0')))
      : 0;
    
    const newChapter: Chapter = {
      id: `ch-${Date.now()}`,
      title: `Глава ${lastMainChapterNum + 1}. Новая глава`,
      content: '',
      subchapters: []
    };
    
    // Найти индекс первой служебной главы (Заключение, Список литературы, Приложения)
    const serviceChapterIndex = dissertation.chapters.findIndex(ch => 
      ch.title.toLowerCase().includes('заключение') || 
      ch.title.toLowerCase().includes('список литературы') ||
      ch.title.toLowerCase().includes('приложения') ||
      ch.title.toLowerCase().includes('библиография')
    );
    
    setDissertation(prev => ({
      ...prev,
      chapters: serviceChapterIndex >= 0
        ? [...prev.chapters.slice(0, serviceChapterIndex), newChapter, ...prev.chapters.slice(serviceChapterIndex)]
        : [...prev.chapters, newChapter],
      updatedAt: new Date()
    }));
    setSaveStatus('unsaved');
  }, [dissertation.chapters]);

  const deleteChapter = useCallback((chapterId: string) => {
    setDissertation(prev => ({
      ...prev,
      chapters: prev.chapters.filter(ch => ch.id !== chapterId),
      updatedAt: new Date()
    }));
    if (selectedChapter === chapterId) {
      setSelectedChapter(null);
      setSelectedSubchapter(null);
    }
    setSaveStatus('unsaved');
  }, [selectedChapter]);

  const deleteSubchapter = useCallback((chapterId: string, subchapterId: string) => {
    setDissertation(prev => ({
      ...prev,
      chapters: prev.chapters.map(ch => 
        ch.id === chapterId 
          ? { ...ch, subchapters: ch.subchapters.filter(sub => sub.id !== subchapterId) }
          : ch
      ),
      updatedAt: new Date()
    }));
    if (selectedSubchapter === subchapterId) {
      setSelectedSubchapter(null);
    }
    setSaveStatus('unsaved');
  }, [selectedSubchapter]);

  const addSubchapter = useCallback((chapterId: string) => {
    setDissertation(prev => ({
      ...prev,
      chapters: prev.chapters.map(ch => {
        if (ch.id === chapterId) {
          const chapterNum = ch.title.match(/Глава (\d+)/)?.[1] || '';
          return {
            ...ch,
            subchapters: [...ch.subchapters, {
              id: `sub-${Date.now()}`,
              title: `${chapterNum}.${ch.subchapters.length + 1}. Новый подраздел`,
              content: ''
            }]
          };
        }
        return ch;
      }),
      updatedAt: new Date()
    }));
    setSaveStatus('unsaved');
  }, []);

  // ================== AI ФУНКЦИЯ ЧЕРЕЗ БЭКЕНД ==================
  const generateHumanText = async (prompt: string, context: string = '', options: { skipUserMessage?: boolean; retries?: number; onEditorChunk?: (text: string) => void } = {}) => {
    const { skipUserMessage = false, retries = 2, onEditorChunk } = options;
    
    // Проверка лимитов
    const limitCheck = subscription.canGenerateDissertationContent();
    if (!limitCheck.allowed) {
      setShowLimitModal(true);
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ ${limitCheck.reason}`,
        timestamp: new Date(),
      }]);
      return null;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    // Добавляем сообщение пользователя только если не пропускаем
    if (!skipUserMessage) {
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: prompt,
        timestamp: new Date(),
      }]);
    }

    // Реализация retry логики
    const attemptGeneration = async (attempt: number): Promise<string | null> => {
      // Симулируем прогресс
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + Math.random() * 15, 90));
      }, 500);

      try {

      const systemPrompt = getHumanWritingSystemPrompt(dissertation.scienceField, dissertation.degreeType);
      const scienceFieldName = SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || dissertation.scienceField;
      const sectionTitle = getSelectedContent().title;
      
      // Определяем тип раздела для специализированного промпта
      const getSectionSpecificInstructions = () => {
        const title = sectionTitle.toLowerCase();
        
        if (title.includes('введение')) {
          return `
СПЕЦИФИКА РАЗДЕЛА "ВВЕДЕНИЕ":
• Начни с обоснования актуальности темы (1-2 абзаца)
• Сформулируй противоречие/проблему исследования
• Чётко определи объект и предмет исследования
• Цель — ОДНА, задачи — 4-6 конкретных действий
• Гипотеза — проверяемое предположение
• Научная новизна — что НОВОЕ ты вносишь
• Теоретическая и практическая значимость
• Методы исследования (перечисли конкретно)
• Структура работы (краткое описание глав)`;
        }
        
        if (title.includes('теоретич') || title.includes('обзор') || title.includes('литератур')) {
          return `
СПЕЦИФИКА ТЕОРЕТИЧЕСКОГО РАЗДЕЛА:
• Начни с исторической ретроспективы проблемы
• Рассмотри классические работы (с критикой)
• Перейди к современным исследованиям (последние 5 лет)
• Сравни российские и зарубежные подходы
• Выяви противоречия между авторами
• Сформулируй собственную позицию
• Используй много ссылок: [Автор, год, с. X]
• Заверши раздел выводами и переходом к следующей главе`;
        }
        
        if (title.includes('методол') || title.includes('метод')) {
          return `
СПЕЦИФИКА РАЗДЕЛА "МЕТОДОЛОГИЯ":
• Обоснуй выбор методологического подхода
• Опиши общенаучные методы (анализ, синтез, сравнение)
• Опиши специальные методы области ${scienceFieldName}
• Укажи эмпирические методы (если есть)
• Опиши базу и этапы исследования
• Охарактеризуй выборку/материал исследования
• Объясни процедуру обработки данных`;
        }
        
        if (title.includes('практич') || title.includes('эмпирич') || title.includes('эксперимент')) {
          return `
СПЕЦИФИКА ПРАКТИЧЕСКОГО РАЗДЕЛА:
• Опиши организацию эксперимента/исследования
• Представь количественные данные (таблицы, цифры)
• Проведи статистический анализ результатов
• Интерпретируй полученные данные
• Сравни с результатами других исследователей
• Обсуди неожиданные результаты
• Признай ограничения исследования
• Сформулируй практические рекомендации`;
        }
        
        if (title.includes('заключ') || title.includes('вывод')) {
          return `
СПЕЦИФИКА РАЗДЕЛА "ЗАКЛЮЧЕНИЕ":
• НЕ повторяй введение дословно
• Резюмируй основные результаты по каждой задаче
• Подтверди/опровергни гипотезу
• Сформулируй вклад в науку и практику
• Укажи ограничения работы (честно)
• Наметь перспективы дальнейших исследований
• Заверши сильным финальным утверждением`;
        }
        
        return `
ОБЩИЕ ТРЕБОВАНИЯ К РАЗДЕЛУ:
• Начни с вводного абзаца (о чём раздел)
• Используй подзаголовки для структурирования
• Добавляй ссылки на источники
• Приводи конкретные примеры
• Делай промежуточные выводы
• Заверши переходом к следующему разделу`;
      };

      // Определяем требуемое количество слов из промпта для динамического maxTokens
      const wordCountMatch = prompt.match(/(\d{3,6})\s*(слов|word|words|символ|знак|character)/i);
      const requestedWords = wordCountMatch ? parseInt(wordCountMatch[1]) : 800;
      // ~2.5-3 токена на русское слово + запас
      const dynamicMaxTokens = Math.min(Math.max(Math.ceil(requestedWords * 3.5), 4000), 64000);

      const userPrompt = `ТЕМА ДИССЕРТАЦИИ: "${dissertation.title}"
НАУЧНАЯ ОБЛАСТЬ: ${scienceFieldName}
ТЕКУЩИЙ РАЗДЕЛ: ${sectionTitle}

${getSectionSpecificInstructions()}

${context ? `═══ СУЩЕСТВУЮЩИЙ КОНТЕКСТ ═══\n${context}\n═══════════════════════════\n\n` : ''}

📝 ЗАПРОС: ${prompt}

════════════════════════════════════════════════════════════════
КРИТИЧЕСКИ ВАЖНО ДЛЯ КАЧЕСТВА:
════════════════════════════════════════════════════════════════
1. Пиши на ${SUPPORTED_LANGUAGES[writingLanguage].name.toUpperCase()} языке, научным стилем по стандарту ${SUPPORTED_LANGUAGES[writingLanguage].academicStyle}
2. ${requestedWords > 800 ? `ОБЯЗАТЕЛЬНО напиши НЕ МЕНЕЕ ${Math.round(requestedWords * 1.05)} слов! Это критически важно. Считай слова. Если написал меньше — продолжай писать, пока не наберёшь нужный объём. Минимум: ${requestedWords} слов, желательно ${Math.round(requestedWords * 1.1)}.` : 'Минимум 800 слов для содержательного раздела'}
3. Каждый абзац — 4-6 развёрнутых предложений
4. Добавляй авторские ремарки: "На наш взгляд...", "Представляется важным..."
5. Используй ссылки: [Автор, год] — минимум 5-7 на раздел
6. Включай критический анализ, а не просто описание
7. Конкретные примеры и цифры где уместно
8. Варьируй длину предложений и начала абзацев
9. Избегай шаблонных фраз AI ("В современном мире...")
10. Добавь 1-2 риторических вопроса для живости текста`;

      // Вызываем AI через стриминг endpoint (SSE) — обходит Vercel 10s timeout
      // fetchWithAuth auto-refreshes expired JWT tokens
      const response = await fetchWithAuth(`${API_URL}/ai/generate-stream`, {
        method: 'POST',
        body: JSON.stringify({
          taskType: 'dissertation',
          systemPrompt,
          userPrompt,
          temperature: 0.85,
          maxTokens: dynamicMaxTokens,
        }),
      });

      if (!response.ok) {
        // Non-streaming error response (e.g. 401, 400)
        const errorText = await response.text();
        let errorMsg = `Ошибка сервера (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch { /* ignore parse error */ }
        throw new Error(errorMsg);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming не поддерживается');

      const decoder = new TextDecoder();
      let streamedText = '';
      let fullContent = '';
      let sseBuffer = '';

      // Add a streaming assistant message placeholder
      const streamMsgId = Date.now().toString();
      if (!onEditorChunk) {
        setAiMessages(prev => [...prev, {
          id: streamMsgId,
          role: 'assistant',
          content: '▍',
          timestamp: new Date(),
        }]);
      } else {
        setAiMessages(prev => [...prev, {
          id: streamMsgId,
          role: 'assistant',
          content: '📝 Пишу текст в редактор...',
          timestamp: new Date(),
        }]);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n\n');
        sseBuffer = lines.pop() || ''; // Keep incomplete chunk in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            if (data.content) {
              streamedText += data.content;
              // Stream to editor if callback provided, otherwise to chat
              if (onEditorChunk) {
                onEditorChunk(streamedText);
                // Update progress in chat message
                const wordCount = streamedText.split(/\s+/).length;
                setAiMessages(prev => prev.map(msg => 
                  msg.id === streamMsgId 
                    ? { ...msg, content: `📝 Пишу текст в редактор... (${wordCount} слов)` }
                    : msg
                ));
              } else {
                setAiMessages(prev => prev.map(msg => 
                  msg.id === streamMsgId 
                    ? { ...msg, content: streamedText + '▍' }
                    : msg
                ));
              }
              setGenerationProgress(prev => Math.min(prev + 0.5, 95));
            }
            
            if (data.done) {
              // Use fullContent from server (with postProcessHumanize applied) if available
              fullContent = data.fullContent || streamedText;
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }

      clearInterval(progressInterval);

      if (!fullContent && !streamedText) {
        throw new Error('Сервер вернул пустой ответ');
      }

      const generatedText = fullContent || streamedText;

      setGenerationProgress(100);

      // Increment usage counter
      subscription.incrementDissertationGenerations();

      // Update streaming message with final content
      if (onEditorChunk) {
        // Also push final content to editor
        onEditorChunk(generatedText);
        const wordCount = generatedText.split(/\s+/).length;
        setAiMessages(prev => prev.map(msg => 
          msg.id === streamMsgId 
            ? { ...msg, content: `✅ Текст записан в редактор.\n📊 Слов: ~${wordCount.toLocaleString()}` }
            : msg
        ));
      } else {
        setAiMessages(prev => prev.map(msg => 
          msg.id === streamMsgId 
            ? { ...msg, content: generatedText }
            : msg
        ));
      }

      setTimeout(() => setGenerationProgress(0), 500);
      return generatedText;

      } catch (error: unknown) {
        clearInterval(progressInterval);
        console.error(`AI Generation Error (attempt ${attempt}):`, error);
        
        // Retry логика
        if (attempt < retries) {
          setAiMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `⚠️ Ошибка генерации. Повторная попытка ${attempt + 1}/${retries}...`,
            timestamp: new Date(),
          }]);
          
          // Ждём перед повторной попыткой
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          return attemptGeneration(attempt + 1);
        }
        
        // Все попытки исчерпаны
        const errorMessage = error instanceof Error ? error.message : 'Попробуйте ещё раз или проверьте соединение с сервером.';
        setAiMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ Ошибка: ${errorMessage}
          
💡 **Возможные причины:**
• Сервер временно недоступен
• Проблемы с интернет-соединением  
• Превышен лимит API

Попробуйте обновить страницу или повторить позже.`,
          timestamp: new Date(),
        }]);
        return null;
      }
    };

    try {
      return await attemptGeneration(1);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // ================== ГЕНЕРАЦИЯ БОЛЬШОГО ОБЪЁМА (20-30 СТРАНИЦ) ==================
  const [largeGenerationProgress, setLargeGenerationProgress] = useState({ current: 0, total: 0, section: '' });
  
  const generateLargeContent = async (chapterId: string, targetPages: number = 25) => {
    // Проверка лимитов на генерацию глав
    const limitCheck = subscription.canGenerateLargeChapter();
    if (!limitCheck.allowed) {
      setShowLimitModal(true);
      return null;
    }

    setIsGenerating(true);
    const docType = DOCUMENT_TYPES[dissertation.documentType || 'dissertation'];
    const scienceFieldName = SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || dissertation.scienceField;
    
    // Находим главу
    const chapter = dissertation.chapters.find(ch => ch.id === chapterId);
    if (!chapter) return null;

    // Определяем подразделы для генерации
    const subchapters = chapter.subchapters?.length > 0 
      ? chapter.subchapters 
      : [
          { id: `${chapterId}-1`, title: 'Теоретические основы', content: '' },
          { id: `${chapterId}-2`, title: 'Анализ подходов', content: '' },
          { id: `${chapterId}-3`, title: 'Методология исследования', content: '' },
          { id: `${chapterId}-4`, title: 'Практические аспекты', content: '' },
          { id: `${chapterId}-5`, title: 'Выводы по главе', content: '' },
        ];

    const wordsPerPage = 350; // ~350 слов на страницу A4
    const totalWords = targetPages * wordsPerPage;
    const wordsPerSection = Math.floor(totalWords / subchapters.length);
    
    setLargeGenerationProgress({ current: 0, total: subchapters.length, section: 'Подготовка...' });

    let fullContent = `# ${chapter.title}\n\n`;

    try {
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🚀 **Начинаю генерацию главы "${chapter.title}"**\n\n📄 Целевой объём: ~${targetPages} страниц (${totalWords.toLocaleString()} слов)\n📑 Разделов: ${subchapters.length}\n⏱️ Примерное время: ${Math.ceil(subchapters.length * 1.5)} минут`,
        timestamp: new Date(),
      }]);

      for (let i = 0; i < subchapters.length; i++) {
        const sub = subchapters[i];
        setLargeGenerationProgress({ current: i + 1, total: subchapters.length, section: sub.title });

        const systemPrompt = `Ты — профессиональный научный автор с 20-летним стажем написания ${docType.nameRu.toLowerCase()}. 
        
ТВОЯ ЗАДАЧА: Написать ПОЛНЫЙ, РАЗВЁРНУТЫЙ раздел научной работы.

ЯЗЫК НАПИСАНИЯ: ${SUPPORTED_LANGUAGES[writingLanguage].name} (${SUPPORTED_LANGUAGES[writingLanguage].academicStyle})

КРИТИЧЕСКИ ВАЖНО:
1. Пиши на ${SUPPORTED_LANGUAGES[writingLanguage].name.toUpperCase()} языке
2. Пиши МИНИМУМ ${wordsPerSection} слов (это ~${Math.round(wordsPerSection / wordsPerPage)} страниц)
3. Каждый абзац — минимум 4-6 предложений
4. Используй научный стиль с элементами авторской речи
5. Добавляй цитаты в формате [Автор, год, с. X]
6. Включай примеры, кейсы, статистику
7. Структурируй текст с подзаголовками
8. Не используй воду — только содержательный текст
9. Завершай раздел выводами

НАУЧНАЯ ОБЛАСТЬ: ${scienceFieldName}
ТИП РАБОТЫ: ${docType.nameRu}
ТЕМА: ${dissertation.title}`;

        // Специализированные инструкции для разных типов разделов
        const getSectionTypeInstructions = (title: string, index: number, total: number) => {
          const lowerTitle = title.toLowerCase();
          
          if (lowerTitle.includes('теорет') || lowerTitle.includes('основ') || index === 0) {
            return `
ЭТОТ РАЗДЕЛ — ТЕОРЕТИЧЕСКАЯ БАЗА. Включи:
• Историю вопроса: когда и кем впервые исследовалась проблема
• Обзор классических работ с критическим анализом
• Современные исследования (последние 5-7 лет)
• Сравнение российских и зарубежных подходов
• Таблицу сравнения концепций разных авторов
• Выявление пробелов в существующих исследованиях
• 10-15 ссылок на источники`;
          }
          
          if (lowerTitle.includes('анализ') || lowerTitle.includes('подход')) {
            return `
ЭТОТ РАЗДЕЛ — АНАЛИЗ ПОДХОДОВ. Включи:
• Классификацию существующих подходов (2-3 основных)
• Критерии сравнения подходов
• Преимущества и недостатки каждого
• Условия применимости разных подходов
• Синтез: какой подход будет использоваться и почему
• Обоснование авторской позиции
• 8-12 ссылок на авторов`;
          }
          
          if (lowerTitle.includes('метод')) {
            return `
ЭТОТ РАЗДЕЛ — МЕТОДОЛОГИЯ. Включи:
• Философско-методологические основания исследования
• Общенаучные методы (анализ, синтез, обобщение)
• Специальные методы области ${scienceFieldName}
• Эмпирические методы (если применимо)
• Описание этапов исследования (I, II, III этап)
• Обоснование выбора методов
• Ограничения методологии`;
          }
          
          if (lowerTitle.includes('практич') || lowerTitle.includes('эмпирич') || lowerTitle.includes('результат')) {
            return `
ЭТОТ РАЗДЕЛ — ПРАКТИЧЕСКАЯ ЧАСТЬ. Включи:
• Описание базы исследования (где, когда, кто)
• Характеристику выборки с цифрами
• Описание процедуры исследования
• Результаты с конкретными данными (%, числа)
• Таблицы с результатами (в формате markdown)
• Интерпретацию и обсуждение результатов
• Сравнение с данными других исследователей`;
          }
          
          if (lowerTitle.includes('вывод') || index === total - 1) {
            return `
ЭТОТ РАЗДЕЛ — ВЫВОДЫ ПО ГЛАВЕ. Включи:
• Резюме основных положений главы (что установлено)
• Связь с задачами исследования
• Переход к следующей главе (если не последняя)
• Научную и практическую значимость выводов
• Формулировку в виде нумерованного списка: "1. Установлено, что..."`;
          }
          
          return `
ОБЩИЕ ТРЕБОВАНИЯ К РАЗДЕЛУ:
• Развёрнутый анализ с примерами
• Критический подход к источникам
• Авторская позиция с обоснованием
• Конкретные факты и цифры
• 5-8 ссылок на источники`;
        };

        const userPrompt = `Напиши раздел "${sub.title}" для главы "${chapter.title}".

═══════════════════════════════════════════════════════════════
ТРЕБОВАНИЯ К ОБЪЁМУ: минимум ${wordsPerSection} слов (~${Math.round(wordsPerSection / wordsPerPage)} страниц A4).
═══════════════════════════════════════════════════════════════

${getSectionTypeInstructions(sub.title, i, subchapters.length)}

ОБЯЗАТЕЛЬНАЯ СТРУКТУРА:
1. **Вступительный абзац** — постановка проблемы раздела, его место в общей логике
2. **Основная часть** (5-7 абзацев):
   - Теоретический анализ с цитатами [Автор, год]
   - Критический обзор: "Вместе с тем, данный подход имеет ограничения..."
   - Авторская позиция: "На наш взгляд...", "Представляется важным..."
   - Примеры, кейсы, статистика
3. **Промежуточные выводы** — что установлено в данном разделе

${i > 0 ? `
═══ КОНТЕКСТ ПРЕДЫДУЩИХ РАЗДЕЛОВ ═══
${fullContent.slice(-4000)}
═════════════════════════════════════

ВАЖНО: НЕ ПОВТОРЯЙ то, что уже написано! Развивай мысль дальше.` : `
Это ПЕРВЫЙ раздел главы. Начни с общего введения в проблематику.`}

════════════════════════════════════════════════════════════════
КАЧЕСТВО ТЕКСТА:
════════════════════════════════════════════════════════════════
✓ Каждый абзац — 5-7 развёрнутых предложений
✓ Чередуй длинные и короткие предложения
✓ Используй вводные слова: "безусловно", "вместе с тем", "следует отметить"
✓ Добавляй уточнения в скобках (что типично для научных работ)
✓ Варьируй начала абзацев (не начинай одинаково!)
✓ Риторические вопросы для вовлечения читателя
✓ Конкретика: цифры, даты, имена исследователей`;

        const response = await fetchWithAuth(`${API_URL}/ai/generate-stream`, {
          method: 'POST',
          body: JSON.stringify({
            taskType: 'dissertation',
            systemPrompt,
            userPrompt,
            temperature: 0.8,
            maxTokens: 64000, // Максимум для длинного контента → Claude поддерживает до 64K
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          try { const errData = JSON.parse(errText); console.error('Generation error:', errData); } catch {}
          continue;
        }

        // Read SSE stream and collect full content
        let sectionContent = '';
        const reader = response.body?.getReader();
        if (!reader) continue;

        const decoder = new TextDecoder();
        let sseBuffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n\n');
          sseBuffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) sectionContent += data.content;
              if (data.done && data.fullContent) sectionContent = data.fullContent;
            } catch { /* ignore parse errors */ }
          }
        }

        if (sectionContent) {
          fullContent += `\n## ${sub.title}\n\n${sectionContent}\n\n`;
        }

        // Пауза между запросами чтобы не перегрузить API
        await new Promise(r => setTimeout(r, 2000));
      }

      // Обновляем главу
      setDissertation(prev => ({
        ...prev,
        chapters: prev.chapters.map(ch => 
          ch.id === chapterId ? { ...ch, content: fullContent } : ch
        ),
        updatedAt: new Date()
      }));
      setSaveStatus('unsaved');

      // Увеличиваем счетчик генераций глав
      subscription.incrementLargeChapterGeneration();
      subscription.incrementDissertationGenerations();

      const wordCount = fullContent.split(/\s+/).length;
      const pageCount = Math.round(wordCount / wordsPerPage);

      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Глава "${chapter.title}" сгенерирована!**\n\n📊 Статистика:\n• Слов: ${wordCount.toLocaleString()}\n• Страниц: ~${pageCount}\n• Разделов: ${subchapters.length}\n\n💡 Контент добавлен в редактор. Проверьте и отредактируйте при необходимости.`,
        timestamp: new Date(),
      }]);

      return fullContent;

    } catch (error: unknown) {
      console.error('Large content generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Ошибка генерации: ${errorMessage}`,
        timestamp: new Date(),
      }]);
      return null;
    } finally {
      setIsGenerating(false);
      setLargeGenerationProgress({ current: 0, total: 0, section: '' });
    }
  };

  // Генерация всей диссертации автономно через бэкенд SSE
  const generateFullDissertation = async () => {
    // Проверяем право на генерацию полной диссертации (Pro)
    const limitCheck = subscription.canGenerateFullDissertation();
    if (!limitCheck.allowed) {
      setShowLimitModal(true);
      return;
    }

    if (!dissertation.title.trim() || dissertation.title === 'Новая диссертация') {
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Сначала укажите тему диссертации (заголовок).',
        timestamp: new Date(),
      }]);
      return;
    }

    // Маппинг frontend documentType → backend type
    const docTypeMapping: Record<string, string> = {
      dissertation: 'dissertation',
      diploma: 'diploma',
      coursework: 'coursework',
      article: 'essay',
      lecture: 'referat',
      abstract: 'referat',
      report: 'referat',
    };
    const backendType = docTypeMapping[dissertation.documentType] || 'dissertation';

    // Вычисляем целевые страницы из целевого объёма слов (280 слов/страница)
    const targetPages = Math.max(10, Math.round((dissertation.targetWordCount || 80000) / 280));

    setIsGenerating(true);

    // Создаём thinking-сообщение (как у Grok)
    const thinkingMsgId = `thinking-${Date.now()}`;
    setAiMessages(prev => [...prev, {
      id: thinkingMsgId,
      role: 'assistant',
      content: `Генерация: ${DOCUMENT_TYPES[dissertation.documentType || 'dissertation']?.nameRu || 'Диссертация'} · ~${targetPages} стр.`,
      timestamp: new Date(),
      isThinking: true,
      thinkingActive: true,
      thinkingSteps: [{
        phase: 'planning',
        phaseLabel: 'Планирование структуры',
        currentChapter: 0,
        totalChapters: 0,
        chapterTitle: 'Анализ темы',
        wordsGenerated: 0,
        pagesGenerated: 0,
        percentComplete: 0,
        estimatedTimeRemaining: targetPages * 18,
        timestamp: new Date(),
      }],
    }]);

    try {
      const abortController = new AbortController();
      
      const response = await fetchWithAuth(`${API_URL}/dissertation/generate`, {
        method: 'POST',
        signal: abortController.signal,
        body: JSON.stringify({
          topic: dissertation.title,
          type: backendType,
          targetPages,
          language: writingLanguage,
          additionalInstructions: dissertation.topic || undefined,
          style: writingStyle === 'academic' ? 'academic' : writingStyle === 'readable' ? 'popular' : 'academic',
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      // Читаем SSE поток
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Нет потока данных');

      const decoder = new TextDecoder();
      let buffer = '';

      const processSSELine = (line: string) => {
        if (!line.startsWith('data: ')) return;
        
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(line.slice(6));
        } catch {
          if (line.trim().length > 6) {
            console.warn('SSE JSON parse error, line:', line);
          }
          return;
        }

        // Обработка ошибки сервера — НЕ внутри catch
        if (data.type === 'error') {
          reader.cancel();
          throw new Error((data.message as string) || 'Ошибка генерации на сервере');
        }

        if (data.type === 'progress') {
          setLargeGenerationProgress({
            current: data.currentChapter as number,
            total: data.totalChapters as number,
            section: data.chapterTitle as string,
          });
          setGenerationProgress(data.percentComplete as number);

          // Обновляем thinking-шаги
          const phaseLabel = data.phase === 'planning' ? 'Планирование структуры' 
            : data.phase === 'generating' ? 'Написание текста' 
            : data.phase === 'assembling' ? 'Сборка документа' 
            : 'Готово!';

          const newStep: ThinkingStep = {
            phase: data.phase as ThinkingStep['phase'],
            phaseLabel,
            currentChapter: data.currentChapter as number,
            totalChapters: data.totalChapters as number,
            chapterTitle: data.chapterTitle as string,
            wordsGenerated: data.wordsGenerated as number,
            pagesGenerated: data.pagesGenerated as number,
            percentComplete: data.percentComplete as number,
            estimatedTimeRemaining: data.estimatedTimeRemaining as number,
            timestamp: new Date(),
          };

          setAiMessages(prev => prev.map(msg => 
            msg.id === thinkingMsgId 
              ? { 
                  ...msg, 
                  content: `Генерация: ${data.percentComplete}% · ${(data.wordsGenerated as number).toLocaleString()} слов · ~${data.pagesGenerated} стр.`,
                  thinkingSteps: [...(msg.thinkingSteps || []), newStep],
                }
              : msg
          ));
        }

        if (data.type === 'result') {
          const resultChapters = (data.chapters as Array<{ title: string; content: string; number: number }>) || [];
          
          // Пишем контент в РЕДАКТОР (в главы), а не в чат
          setDissertation(prev => {
            const newChapters = [...prev.chapters];
            
            for (const resultCh of resultChapters) {
              const matchIdx = newChapters.findIndex(ch => {
                const chLower = ch.title.toLowerCase();
                const resLower = resultCh.title.toLowerCase();
                return chLower.includes(resLower) || resLower.includes(chLower) ||
                  chLower.replace(/глава \d+\.?\s*/i, '') === resLower.replace(/глава \d+\.?\s*/i, '');
              });

              if (matchIdx >= 0) {
                newChapters[matchIdx] = {
                  ...newChapters[matchIdx],
                  content: resultCh.content,
                };
              } else if (resultCh.number > 0 && resultCh.number - 1 < newChapters.length) {
                newChapters[resultCh.number - 1] = {
                  ...newChapters[resultCh.number - 1],
                  content: resultCh.content,
                };
              }
            }

            return {
              ...prev,
              chapters: newChapters,
              updatedAt: new Date(),
            };
          });
          setSaveStatus('unsaved');

          subscription.incrementDissertationGenerations();
          subscription.incrementLargeChapterGeneration();

          const generationTimeSec = Math.round(((data.metadata as Record<string, number>)?.generationTime || 0) / 1000);

          // Завершаем thinking-блок
          setAiMessages(prev => prev.map(msg => 
            msg.id === thinkingMsgId 
              ? { 
                  ...msg, 
                  content: `Генерация завершена: ${(data.totalWords as number)?.toLocaleString() || '?'} слов · ~${data.totalPages || '?'} стр. · ${generationTimeSec} сек.`,
                  thinkingActive: false,
                  thinkingSteps: [...(msg.thinkingSteps || []), {
                    phase: 'done' as const,
                    phaseLabel: 'Готово!',
                    currentChapter: resultChapters.length,
                    totalChapters: resultChapters.length,
                    chapterTitle: 'Все главы записаны в редактор',
                    wordsGenerated: data.totalWords as number,
                    pagesGenerated: data.totalPages as number,
                    percentComplete: 100,
                    estimatedTimeRemaining: 0,
                    timestamp: new Date(),
                  }],
                }
              : msg
          ));

          // Сообщение о завершении — без упоминания моделей
          setAiMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ Текст записан в редактор.\n\n📄 Объём: **${(data.totalWords as number)?.toLocaleString() || '?'} слов** (~${data.totalPages || '?'} стр.)\n📑 Глав: ${resultChapters.length}\n⏱️ Время: ${generationTimeSec} сек.\n\nВыберите главу слева для просмотра и редактирования.`,
            timestamp: new Date(),
          }]);

          // Автоматически открываем первую главу с контентом
          const firstFilledChapter = resultChapters.find(ch => ch.content && ch.content.length > 0);
          if (firstFilledChapter) {
            const matchedChapter = dissertation.chapters.find(ch => {
              const chLower = ch.title.toLowerCase();
              const resLower = firstFilledChapter.title.toLowerCase();
              return chLower.includes(resLower) || resLower.includes(chLower);
            });
            if (matchedChapter) {
              setSelectedChapter(matchedChapter.id);
              setSelectedSubchapter(null);
            }
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          processSSELine(line);
        }
      }

      // Flush TextDecoder и обработка оставшегося буфера
      buffer += decoder.decode();
      if (buffer.trim()) {
        processSSELine(buffer);
      }

    } catch (error) {
      console.error('Full dissertation generation error:', error);
      // Закрываем thinking-блок с ошибкой
      setAiMessages(prev => prev.map(msg => 
        msg.id === thinkingMsgId ? { ...msg, thinkingActive: false } : msg
      ));
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ **Ошибка генерации:**\n\n${error instanceof Error ? error.message : 'Неизвестная ошибка'}\n\n💡 Попробуйте ещё раз или сгенерируйте главы по отдельности.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setLargeGenerationProgress({ current: 0, total: 0, section: '' });
    }
  };

  // ── Trigger auto-generate when redirected from chat ──
  useEffect(() => {
    if (pendingAutoGenerate) {
      setPendingAutoGenerate(false);
      generateFullDissertation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoGenerate]);

  // ================== УМНОЕ ОПРЕДЕЛЕНИЕ НАМЕРЕНИЯ (GPT) ==================
  
  // Типы намерений пользователя
  type UserIntent = 
    | 'greeting'        // Привет, здравствуйте
    | 'farewell'        // Пока, до свидания
    | 'thanks'          // Спасибо
    | 'help'            // Помощь, что умеешь
    | 'about'           // Кто ты, о себе
    | 'status'          // Как дела, статус работы
    | 'question'        // Вопрос требующий ответа (не генерации)
    | 'generate_section'    // Напиши раздел/главу
    | 'generate_expand'     // Расширь текст
    | 'generate_improve'    // Улучши/отредактируй
    | 'generate_specific'   // Конкретная задача (введение, выводы)
    | 'generate_full'       // Полная диссертация
    | 'unclear';            // Непонятно

  interface IntentAnalysis {
    intent: UserIntent;
    confidence: number;
    suggestedAction?: string;
    clarificationNeeded?: boolean;
    detectedTopic?: string;
  }

  // Быстрая проверка для очевидных случаев (экономит API вызовы)
  const quickIntentCheck = (message: string): IntentAnalysis | null => {
    const lower = message.toLowerCase().trim();
    
    // Очень короткие приветствия
    if (/^(привет|здравствуй(те)?|хай|хелло|hello|hi|hey|йоу|салам|шалом|ку|дратути)!?$/i.test(lower)) {
      return { intent: 'greeting', confidence: 1.0 };
    }
    
    // Прощания
    if (/^(пока|до свидания|bye|goodbye|бай|увидимся|всего доброго)!?$/i.test(lower)) {
      return { intent: 'farewell', confidence: 1.0 };
    }
    
    // Благодарность
    if (/^(спасибо|благодарю|thanks|thank you|спс|пасиб)!?$/i.test(lower)) {
      return { intent: 'thanks', confidence: 1.0 };
    }
    
    // Очень короткие непонятные сообщения
    if (lower.length <= 3 && !/^(да|нет|ок)$/.test(lower)) {
      return { intent: 'unclear', confidence: 0.8, clarificationNeeded: true };
    }
    
    return null; // Нужен более глубокий анализ
  };

  // Умный анализ намерения - оптимизированный (сначала локально, API только если нужно)
  const analyzeIntentWithAI = async (message: string): Promise<IntentAnalysis> => {
    // 1. Сначала проверяем очевидные случаи (бесплатно)
    const quickResult = quickIntentCheck(message);
    if (quickResult) return quickResult;
    
    // 2. Затем используем локальный fallback (бесплатно)
    const fallbackResult = fallbackIntentDetection(message);
    
    // Если fallback уверен (>0.85) — не тратим API
    if (fallbackResult.confidence >= 0.85) {
      return fallbackResult;
    }
    
    // 3. Только для неоднозначных случаев вызываем GPT
    // Но чтобы сэкономить — делаем это только для средних сообщений
    if (message.length < 10 || message.length > 200) {
      return fallbackResult; // Слишком короткие/длинные — используем fallback
    }
    
    try {
      const contextInfo = {
        dissertationTitle: dissertation.title,
        documentType: DOCUMENT_TYPES[dissertation.documentType || 'dissertation']?.nameRu || 'Диссертация',
        selectedSection: getSelectedContent().title || 'Не выбран',
        hasContent: getSelectedContent().content.length > 0,
        contentLength: getSelectedContent().content.length,
        chaptersCount: dissertation.chapters.length,
        scienceField: SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || 'Не указано'
      };

      const response = await fetchWithAuth(`${API_URL}/ai/generate`, {
        method: 'POST',
        body: JSON.stringify({
          taskType: 'analysis',
          prompt: message,
          systemPrompt: `Ты — анализатор намерений пользователя в редакторе научных работ.

КОНТЕКСТ РАБОТЫ:
- Тема: "${contextInfo.dissertationTitle}"
- Тип документа: ${contextInfo.documentType}
- Выбранный раздел: ${contextInfo.selectedSection}
- Есть текст в разделе: ${contextInfo.hasContent ? 'Да (' + contextInfo.contentLength + ' символов)' : 'Нет'}
- Всего глав: ${contextInfo.chaptersCount}
- Научная область: ${contextInfo.scienceField}

ЗАДАЧА: Проанализируй сообщение пользователя и определи его ИСТИННОЕ намерение.

ТИПЫ НАМЕРЕНИЙ:
1. greeting - приветствие, знакомство
2. farewell - прощание
3. thanks - благодарность
4. help - запрос помощи, инструкций
5. about - вопрос о боте, его возможностях
6. status - вопрос о статусе работы, прогрессе
7. question - информационный вопрос (не требует генерации текста для диссертации)
8. generate_section - запрос написать раздел/главу целиком
9. generate_expand - запрос расширить/дополнить существующий текст
10. generate_improve - запрос улучшить/отредактировать текст
11. generate_specific - запрос на конкретную часть (введение, выводы, литобзор, методология)
12. generate_full - запрос создать всю диссертацию целиком
13. unclear - неясное намерение, нужно уточнение

ВАЖНЫЕ ПРАВИЛА:
- Если пользователь спрашивает "что такое X" или "как работает Y" - это question, НЕ генерация
- Если пользователь просто написал тему/слово без глагола - это unclear
- "Расскажи о..." может быть вопросом или генерацией - смотри контекст
- Учитывай контекст выбранного раздела

Ответь ТОЛЬКО в формате JSON:
{
  "intent": "тип_намерения",
  "confidence": 0.0-1.0,
  "suggestedAction": "что рекомендуешь сделать",
  "clarificationNeeded": true/false,
  "detectedTopic": "выделенная тема если есть"
}`,
          maxTokens: 200
        })
      });

      if (!response.ok) {
        // Fallback при ошибке API
        return fallbackIntentDetection(message);
      }

      const data = await response.json();
      const jsonMatch = data.content?.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || 'unclear',
          confidence: parsed.confidence || 0.5,
          suggestedAction: parsed.suggestedAction,
          clarificationNeeded: parsed.clarificationNeeded,
          detectedTopic: parsed.detectedTopic
        };
      }
      
      return fallbackIntentDetection(message);
    } catch (error) {
      console.error('Intent analysis error:', error);
      return fallbackIntentDetection(message);
    }
  };

  // Fallback определение намерения без API
  const fallbackIntentDetection = (message: string): IntentAnalysis => {
    const lower = message.toLowerCase().trim();
    
    // Приветствия
    if (/прив|здрав|хай|хелло|hello|hi|hey|добр.*(день|утро|вечер)/i.test(lower)) {
      return { intent: 'greeting', confidence: 0.9 };
    }
    
    // Прощания
    if (/пока|до свидания|bye|goodbye|увидимся/i.test(lower)) {
      return { intent: 'farewell', confidence: 0.9 };
    }
    
    // Благодарность
    if (/спасибо|благодарю|thanks/i.test(lower)) {
      return { intent: 'thanks', confidence: 0.9 };
    }
    
    // Помощь
    if (/помо(щь|ги)|help|как\s*(пользоваться|работать)|что\s*(умеешь|можешь)/i.test(lower)) {
      return { intent: 'help', confidence: 0.85 };
    }
    
    // О боте
    if (/кто\s*ты|ты\s*кто|расскажи о себе|что ты такое/i.test(lower)) {
      return { intent: 'about', confidence: 0.9 };
    }
    
    // Статус
    if (/как\s*(дела|ты|поживаешь)|статус|прогресс/i.test(lower)) {
      return { intent: 'status', confidence: 0.85 };
    }
    
    // Вопросы (информационные)
    if (/^(что такое|как работает|почему|зачем|когда|где|сколько|какой|какая|какие)\s/i.test(lower)) {
      return { intent: 'question', confidence: 0.8 };
    }
    
    // Генерация - расширение
    if (/расширь|дополни|увеличь|добавь (больше|текст|информаци)/i.test(lower)) {
      return { intent: 'generate_expand', confidence: 0.9 };
    }
    
    // Генерация - улучшение
    if (/улучши|исправь|отредактируй|перепиши|переформулируй|сделай лучше/i.test(lower)) {
      return { intent: 'generate_improve', confidence: 0.9 };
    }
    
    // Генерация - специфические части
    if (/введени|заключени|вывод|литератур|методолог|теорети|актуальност|новизн/i.test(lower)) {
      if (/напиши|создай|сгенерируй|добавь|сделай/i.test(lower)) {
        return { intent: 'generate_specific', confidence: 0.9, detectedTopic: lower };
      }
    }
    
    // Генерация - полная диссертация
    if (/(вс[юея]|полн|целик)\s*(диссертаци|работ|глав)/i.test(lower)) {
      return { intent: 'generate_full', confidence: 0.85 };
    }
    
    // Генерация - раздел
    if (/напиши|создай|сгенерируй|generate|write|create/i.test(lower)) {
      return { intent: 'generate_section', confidence: 0.85 };
    }
    
    // Длинные сообщения скорее всего запрос на генерацию
    if (lower.length > 80) {
      return { intent: 'generate_section', confidence: 0.7 };
    }
    
    // Непонятно
    return { intent: 'unclear', confidence: 0.5, clarificationNeeded: true };
  };

  // Умный ответ на основе намерения
  const handleSmartResponse = async (message: string, intentAnalysis: IntentAnalysis) => {
    // Сообщение пользователя уже добавлено в handleAIGenerate — НЕ дублируем

    const { intent, confidence, clarificationNeeded, detectedTopic } = intentAnalysis;
    
    let response = '';
    
    switch (intent) {
      case 'greeting':
        response = `Привет! 👋 Рад помочь с вашей работой!

📚 **"${dissertation.title}"**
Тип: ${DOCUMENT_TYPES[dissertation.documentType || 'dissertation']?.nameRu || 'Диссертация'}

${selectedChapter 
  ? `📍 Сейчас открыт раздел: **${getSelectedContent().title}**\n${getSelectedContent().content.length > 0 ? `(${getSelectedContent().content.length} символов текста)` : '(пока пустой)'}`
  : '📍 Выберите раздел слева для начала работы'}

**Что могу сделать:**
• Написать текст для раздела
• Расширить существующий текст
• Улучшить стиль и добавить источники
• Ответить на вопросы

Просто опишите, что нужно! 💬`;
        break;
        
      case 'farewell':
        response = `До свидания! 👋 

Ваша работа автоматически сохранена. Возвращайтесь продолжить работу над "${dissertation.title}" в любое время!

Удачи с написанием! 🎓`;
        break;
        
      case 'thanks':
        response = `Всегда пожалуйста! 😊 

Если нужна ещё помощь — просто напишите. Я здесь, чтобы помочь с вашей диссертацией! 📝`;
        break;
        
      case 'help':
        response = `📖 **Как пользоваться редактором:**

**Структура работы (слева):**
• Нажмите на главу/раздел для выбора
• ➕ добавляет новые разделы
• 🗑️ удаляет ненужные

**Редактор (центр):**
• Пишите текст напрямую
• Или используйте AI для генерации

**AI-помощник (здесь):**
Просто опишите задачу своими словами:
• _"Напиши введение с актуальностью"_
• _"Расширь этот текст научным стилем"_
• _"Добавь обзор литературы"_
• _"Сделай выводы по главе"_

**Быстрые действия** ниже — для типовых задач одним кликом.

${!selectedChapter ? '⚠️ **Совет:** Сначала выберите раздел слева!' : ''}`;
        break;
        
      case 'about':
        response = `🤖 **Я — Science AI, ваш помощник по научным работам**

**Специализация:**
• Диссертации (кандидатские, докторские)
• Магистерские и дипломные работы
• Научные статьи и курсовые

**Мои способности:**
🧠 Понимаю контекст и намерения, а не только ключевые слова
📚 Пишу научным языком по ГОСТ/APA/DIN
🔗 Добавляю ссылки на реальные источники
✨ Адаптируюсь под вашу область: **${SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || 'любая наука'}**

Работаю вместе с вами — вы направляете, я помогаю! 💪`;
        break;
        
      case 'status':
        const chaptersWithContent = dissertation.chapters.filter(ch => 
          ch.content.length > 0 || ch.subchapters.some(s => s.content.length > 0)
        ).length;
        const totalWords = dissertation.chapters.reduce((sum, ch) => {
          const chapterWords = ch.content.split(/\s+/).filter(Boolean).length;
          const subchapterWords = ch.subchapters.reduce((s, sub) => s + sub.content.split(/\s+/).filter(Boolean).length, 0);
          return sum + chapterWords + subchapterWords;
        }, 0);
        
        response = `📊 **Статус вашей работы:**

📝 **"${dissertation.title}"**
Тип: ${DOCUMENT_TYPES[dissertation.documentType || 'dissertation']?.nameRu || 'Диссертация'}
Область: ${SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || 'Не указана'}

**Прогресс:**
• Глав: ${dissertation.chapters.length}
• С контентом: ${chaptersWithContent} из ${dissertation.chapters.length}
• Примерно слов: ~${totalWords.toLocaleString()}
• Примерно страниц: ~${Math.ceil(totalWords / 250)}

${selectedChapter 
  ? `📍 Открыт: **${getSelectedContent().title}**` 
  : '📍 Раздел не выбран'}

Чем помочь прямо сейчас? 🚀`;
        break;
        
      case 'question':
        // Информационный вопрос — отвечаем без генерации текста для диссертации
        setIsGenerating(true);
        try {
          const questionResponse = await fetchWithAuth(`${API_URL}/ai/generate`, {
            method: 'POST',
            body: JSON.stringify({
              taskType: 'chat',
              prompt: message,
              systemPrompt: `Ты — эксперт в области "${SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || 'науки'}". 
Пользователь работает над: "${dissertation.title}".
Ответь на вопрос кратко, по существу, научным но понятным языком.
Если вопрос связан с темой диссертации — учитывай это.
Отвечай на русском языке.`,
              maxTokens: 500
            })
          });
          
          if (questionResponse.ok) {
            const data = await questionResponse.json();
            response = data.content || 'Не удалось получить ответ. Попробуйте переформулировать вопрос.';
          } else {
            response = 'Произошла ошибка при обработке вопроса. Попробуйте ещё раз.';
          }
        } catch (e) {
          response = 'Ошибка соединения. Проверьте интернет и попробуйте снова.';
        }
        setIsGenerating(false);
        break;
        
      case 'unclear':
        if (confidence < 0.5) {
          response = `🤔 Не совсем понял, что нужно сделать.

**Вы имели в виду:**
• _Написать текст_ — "Напиши [что именно]"
• _Задать вопрос_ — "Что такое [термин]?"
• _Расширить текст_ — "Расширь этот раздел"

${selectedChapter 
  ? `Или выберите одно из **быстрых действий** для раздела "${getSelectedContent().title}"` 
  : '💡 Подсказка: сначала выберите раздел слева'}`;
        } else {
          response = `Я хочу помочь, но мне нужно уточнение. 

Что именно нужно сделать${selectedChapter ? ` с разделом "${getSelectedContent().title}"` : ''}?

**Примеры запросов:**
• "Напиши введение с обоснованием актуальности"
• "Расширь текст, добавь научные источники"
• "Что такое [термин]?"`;
        }
        break;
        
      default:
        // Это намерение генерации — не обрабатываем здесь
        return null;
    }

    setAiMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    }]);
    
    return true; // Обработано
  };

  // ================== AI ФУНКЦИИ ==================
  // File attachment handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsParsingFile(true);
    const newFiles: ParsedFile[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setAiMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `⚠️ Файл "${file.name}" слишком большой (${formatFileSize(file.size)}). Максимум: ${formatFileSize(MAX_FILE_SIZE)}`,
          timestamp: new Date(),
        }]);
        continue;
      }

      try {
        const parsed = await parseFile(file);
        newFiles.push(parsed);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Не удалось прочитать файл';
        setAiMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ ${file.name}: ${msg}`,
          timestamp: new Date(),
        }]);
      }
    }

    if (newFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }

    setIsParsingFile(false);
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAIGenerate = async () => {
    const hasFiles = attachedFiles.length > 0;
    if (!aiPrompt.trim() && !hasFiles) return;
    
    // Build prompt with file content
    const userText = aiPrompt.trim();
    let fullPrompt = userText;
    let fileContents = '';
    if (hasFiles) {
      fileContents = attachedFiles.map(f => formatFileForPrompt(f)).join('\n\n');
    }

    // User-visible message
    const displayMessage = userText 
      ? (hasFiles ? `${userText}\n\n📎 ${attachedFiles.map(f => f.name).join(', ')}` : userText)
      : `📎 ${attachedFiles.map(f => f.name).join(', ')}`;
    
    // Clear attachments and prompt immediately
    setAttachedFiles([]);
    setAiPrompt('');
    
    // Add user message to chat
    setAiMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: displayMessage,
      timestamp: new Date(),
    }]);

    // ═══════════════════════════════════════════
    // FILE ANALYSIS PATH — separate from text generation
    // ═══════════════════════════════════════════
    if (hasFiles) {
      // Проверка лимитов
      const limitCheck = subscription.canGenerateDissertationContent();
      if (!limitCheck.allowed) {
        setShowLimitModal(true);
        setAiMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `⚠️ ${limitCheck.reason}`,
          timestamp: new Date(),
        }]);
        return;
      }

      setIsGenerating(true);
      setGenerationProgress(0);
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + Math.random() * 12, 90));
      }, 500);

      try {
        const dissertationContext = `Тема диссертации: "${dissertation.title}"
Область: ${dissertation.scienceField}
Тип: ${dissertation.degreeType}
${selectedChapter ? `Текущий раздел: ${getSelectedContent().title}` : ''}`;

        const fileAnalysisSystemPrompt = `Ты — опытный научный консультант и эксперт по академическому письму. 
Пользователь работает над диссертацией и прикрепил файл(ы) для анализа.

КОНТЕКСТ РАБОТЫ:
${dissertationContext}

ТВОЯ ЗАДАЧА:
- Внимательно прочитай содержимое прикреплённых файлов
- Если пользователь дал конкретную инструкцию — выполни её
- Если инструкции нет — дай развёрнутый анализ:
  • Краткое содержание/суть документа
  • Сильные стороны
  • Слабые стороны и ошибки
  • Конкретные рекомендации по улучшению
  • Как материал соотносится с темой диссертации
- Отвечай структурированно с подзаголовками
- Используй конкретные цитаты из текста файла
- НЕ переписывай и НЕ копируй содержимое файла обратно
- Давай именно АНАЛИЗ и ОЦЕНКУ, а не пересказ

ЯЗЫК ОТВЕТА: русский (если файл не на другом языке)`;

        const userAnalysisPrompt = userText 
          ? `${userText}\n\n${fileContents}` 
          : `Проанализируй прикреплённый документ. Дай подробную оценку содержания, структуры, качества аргументации и рекомендации по улучшению.\n\n${fileContents}`;

        const response = await fetchWithAuth(`${API_URL}/ai/generate-stream`, {
          method: 'POST',
          body: JSON.stringify({
            taskType: 'analysis',
            systemPrompt: fileAnalysisSystemPrompt,
            userPrompt: userAnalysisPrompt,
            temperature: 0.7,
            maxTokens: 4000,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          let errMsg = `Ошибка сервера (${response.status})`;
          try { const errData = JSON.parse(errText); errMsg = errData.error || errData.message || errMsg; } catch {}
          throw new Error(errMsg);
        }

        clearInterval(progressInterval);
        setGenerationProgress(100);

        // Read SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Streaming не поддерживается');

        const decoder = new TextDecoder();
        let streamContent = '';
        let sseBuffer = '';

        // Add streaming placeholder message
        const fileMsgId = Date.now().toString();
        setAiMessages(prev => [...prev, {
          id: fileMsgId,
          role: 'assistant',
          content: '▍',
          timestamp: new Date(),
        }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n\n');
          sseBuffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);
              if (data.content) {
                streamContent += data.content;
                setAiMessages(prev => prev.map(msg => 
                  msg.id === fileMsgId ? { ...msg, content: streamContent + '▍' } : msg
                ));
              }
              if (data.done && data.fullContent) streamContent = data.fullContent;
            } catch (e) {
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
            }
          }
        }

        const aiContent = streamContent;
        
        // Track usage
        subscription.incrementDissertationGenerations();

        // Update streaming message with final content
        setAiMessages(prev => prev.map(msg => 
          msg.id === fileMsgId ? { ...msg, content: aiContent || '⚠️ AI не вернул ответ. Попробуйте ещё раз.' } : msg
        ));
      } catch (error) {
        clearInterval(progressInterval);
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        setAiMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ Ошибка при анализе файлов: ${errorMessage}`,
          timestamp: new Date(),
        }]);
      } finally {
        setIsGenerating(false);
        setGenerationProgress(0);
      }
      return;
    }

    // ═══════════════════════════════════════════
    // TEXT GENERATION PATH — original flow (no files)
    // ═══════════════════════════════════════════
    fullPrompt = userText;
    
    // Умный анализ намерения
    const intentAnalysis = await analyzeIntentWithAI(fullPrompt);
    
    // Если это не генерация — обрабатываем как разговор
    if (!intentAnalysis.intent.startsWith('generate_')) {
      const handled = await handleSmartResponse(fullPrompt, intentAnalysis);
      if (handled) {
        return;
      }
    }
    
    // Проверяем, нужно ли уточнение перед генерацией
    if (intentAnalysis.clarificationNeeded && intentAnalysis.confidence < 0.7) {
      setAiMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Уточните, пожалуйста:

${!selectedChapter 
  ? '⚠️ **Раздел не выбран.** Выберите главу или подраздел слева.\n\n' 
  : `📍 Текущий раздел: **${getSelectedContent().title}**\n\n`}

Что именно нужно сделать?
• Написать текст с нуля
• Расширить существующий
• Улучшить/отредактировать`,
        timestamp: new Date(),
      }]);
      return;
    }
    
    // Генерируем — если раздел выбран, стримим прямо в редактор
    if (selectedChapter) {
      const baseContent = getSelectedContent().content;
      const prefix = baseContent ? baseContent + '\n\n' : '';
      
      const result = await generateHumanText(fullPrompt, getSelectedContent().content, { 
        skipUserMessage: true,
        onEditorChunk: (streamedText) => {
          updateContent(prefix + streamedText);
        },
      });
      
      // Final content — overwrite with server-postprocessed version if different
      if (result) {
        updateContent(prefix + result);
      }
    } else {
      // Нет выбранного раздела — пишем в чат как раньше
      const result = await generateHumanText(fullPrompt, getSelectedContent().content, { skipUserMessage: true });
      
      if (result) {
        setAiMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: '💡 Выберите раздел слева, чтобы вставить текст в документ. Или нажмите ➕ на сообщении выше.',
          timestamp: new Date(),
        }]);
      }
    }
  };

  const generateSection = async () => {
    if (!selectedChapter) {
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Сначала выберите раздел для генерации.',
        timestamp: new Date(),
      }]);
      return;
    }

    const sectionTitle = getSelectedContent().title;
    const result = await generateHumanText(
      `Напиши полный текст для раздела "${sectionTitle}" диссертации на тему "${dissertation.title}".
      
Требования:
- Объём: 800-1200 слов
- Научный стиль с авторским голосом
- Ссылки на источники [Автор, год]
- Чёткая структура с подзаголовками
- Критический анализ, а не просто описание
- Собственные выводы автора`
    );

    if (result) {
      updateContent((getSelectedContent().content ? getSelectedContent().content + '\n\n' : '') + result);
    }
  };

  const expandText = async () => {
    const currentContent = getSelectedContent().content;
    if (!currentContent.trim()) {
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Раздел пуст. Сначала добавьте текст для расширения.',
        timestamp: new Date(),
      }]);
      return;
    }

    const docType = DOCUMENT_TYPES[dissertation.documentType || 'dissertation'];
    const scienceFieldName = SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || dissertation.scienceField;

    const result = await generateHumanText(
      `Расширь и углуби следующий текст для ${docType.nameRu.toLowerCase()} по ${scienceFieldName}.

ЗАДАЧИ РАСШИРЕНИЯ:

1. **ДЕТАЛИЗАЦИЯ** - раскрой каждое утверждение подробнее:
   - Добавь объяснения терминов
   - Приведи конкретные примеры
   - Уточни контекст и условия

2. **АРГУМЕНТАЦИЯ** - усиль каждый тезис:
   - Добавь ссылки на авторитетные источники [Автор, год]
   - Приведи статистические данные
   - Включи результаты исследований

3. **КРИТИЧЕСКИЙ АНАЛИЗ**:
   - Рассмотри альтернативные точки зрения
   - Сравни подходы разных авторов
   - Выдели преимущества и ограничения

4. **АВТОРСКАЯ ПОЗИЦИЯ**:
   - Добавь "На наш взгляд...", "Представляется важным..."
   - Включи собственные выводы и оценки
   - Сформулируй промежуточные итоги

5. **ПРАКТИКА**:
   - Добавь практические примеры
   - Покажи применение теории
   - Приведи кейсы из реальной практики

ТРЕБОВАНИЯ:
- Увеличь объём в 2-3 раза
- Сохрани стиль и логику оригинала
- Каждый новый абзац должен добавлять ценность
- Избегай воды и повторений`,
      currentContent
    );

    if (result) {
      updateContent(result);
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Текст расширен! Было: ${currentContent.split(/\s+/).length} слов → Стало: ${result.split(/\s+/).length} слов`,
        timestamp: new Date(),
      }]);
    }
  };

  const improveText = async () => {
    const currentContent = getSelectedContent().content;
    if (!currentContent.trim()) return;

    const result = await generateHumanText(
      `Улучши научный текст, сохранив авторский голос.

НАПРАВЛЕНИЯ УЛУЧШЕНИЯ:

1. **АКАДЕМИЧЕСКИЙ СТИЛЬ**:
   - Замени разговорные обороты на научные
   - Добавь терминологию области
   - Используй научные конструкции: "следует отметить", "необходимо подчеркнуть"
   - Но! Избегай канцелярита и тяжёлых конструкций

2. **СВЯЗНОСТЬ ТЕКСТА**:
   - Добавь логические связки между абзацами
   - Используй: "В связи с этим...", "Вместе с тем...", "Однако..."
   - Обеспечь плавные переходы между мыслями

3. **СТРУКТУРА АБЗАЦЕВ**:
   - Каждый абзац = одна мысль
   - Начало: тезис
   - Середина: аргументы
   - Конец: вывод или переход

4. **АВТОРСКИЕ РЕМАРКИ**:
   - Добавь: "На наш взгляд...", "Мы полагаем..."
   - Включи критическую оценку
   - Покажи исследовательскую позицию

5. **ШЛИФОВКА**:
   - Исправь стилистические ошибки
   - Устрани повторы слов
   - Варьируй длину предложений

ВАЖНО: Текст должен звучать естественно, как написанный опытным учёным.`,
      currentContent
    );

    if (result) {
      updateContent(result);
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✅ Текст улучшен! Проверьте результат и внесите правки по желанию.',
        timestamp: new Date(),
      }]);
    }
  };

  const paraphraseText = async () => {
    const currentContent = getSelectedContent().content;
    if (!currentContent.trim()) return;

    const result = await generateHumanText(
      `Полностью перефразируй текст для повышения уникальности.

ТЕХНИКИ ПЕРЕФРАЗИРОВАНИЯ:

1. **СТРУКТУРНАЯ ТРАНСФОРМАЦИЯ**:
   - Измени порядок частей текста
   - Объедини короткие предложения в сложные (и наоборот)
   - Поменяй активный залог на пассивный (выборочно)

2. **ЛЕКСИЧЕСКАЯ ЗАМЕНА**:
   - Используй синонимы для ключевых слов
   - Замени обороты на эквивалентные
   - Сохрани научную терминологию (термины не меняй!)

3. **СИНТАКСИЧЕСКАЯ ВАРИАЦИЯ**:
   - Измени порядок слов в предложениях
   - Используй разные грамматические конструкции
   - Варьируй способы выражения мысли

4. **АВТОРИЗАЦИЯ ТЕКСТА**:
   - Добавь личные формулировки
   - Включи авторские вводные слова
   - Перескажи мысль своими словами

5. **ЛОГИЧЕСКАЯ РЕСТРУКТУРИЗАЦИЯ**:
   - Поменяй последовательность аргументов
   - Измени способ подачи примеров
   - Переставь причину и следствие

ТРЕБОВАНИЯ:
- Полная смысловая эквивалентность
- Минимум 90% уникальности
- Научный стиль
- Естественное звучание`,
      currentContent
    );

    if (result) {
      updateContent(result);
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✅ Текст перефразирован! Уникальность повышена.',
        timestamp: new Date(),
      }]);
    }
  };

  const addCitations = async () => {
    const currentContent = getSelectedContent().content;
    const scienceFieldName = SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || dissertation.scienceField;
    const result = await generateHumanText(
      `Добавь научные ссылки и цитаты в текст по ${scienceFieldName}.

ЗАДАЧИ:

1. **АНАЛИЗ ТЕКСТА** - найди места для цитирования:
   - Определения и термины
   - Спорные утверждения
   - Статистика и факты
   - Теоретические положения

2. **ДОБАВЬ ССЫЛКИ** в формате [Автор, год]:
   - После каждого важного утверждения
   - При упоминании теорий и концепций
   - После цитат и парафраза

3. **ВИДЫ ЦИТИРОВАНИЯ**:
   - Прямые цитаты: "..." [Автор, год, с. X]
   - Косвенные: По мнению Автора (год)...
   - Обобщающие: Ряд исследователей [А, Б, В] отмечает...

4. **ИСТОЧНИКИ** (используй реальные):
   - Классические работы по теме
   - Современные исследования (2018-2024)
   - Отечественные и зарубежные авторы
   - Монографии, статьи, диссертации

5. **БИБЛИОГРАФИЯ** - в конце добавь список:
   - Формат ГОСТ Р 7.0.5-2008
   - Алфавитный порядок
   - Полные выходные данные

Количество: добавь 8-15 ссылок`,
      currentContent
    );

    if (result) {
      updateContent(result);
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✅ Добавлены научные ссылки и цитаты!',
        timestamp: new Date(),
      }]);
    }
  };

  const generateLiteratureReview = async () => {
    const scienceFieldName = SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || dissertation.scienceField;
    const docType = DOCUMENT_TYPES[dissertation.documentType || 'dissertation'];
    
    const result = await generateHumanText(
      `Напиши ОБЗОР ЛИТЕРАТУРЫ для ${docType.nameRu.toLowerCase()} на тему "${dissertation.title}" в области "${scienceFieldName}".

СТРУКТУРА ОБЗОРА:

1. **ИСТОРИЯ ВОПРОСА** (1-2 абзаца)
   - Когда впервые возникла проблема?
   - Кто были пионеры исследований?
   - Как развивались подходы?

2. **КЛАССИЧЕСКИЕ ТЕОРИИ** (2-3 абзаца)
   - Фундаментальные работы
   - Основные концепции и модели
   - Критика классических подходов

3. **СОВРЕМЕННЫЕ ИССЛЕДОВАНИЯ** (3-4 абзаца)
   - Работы последних 5-10 лет
   - Новые методы и подходы
   - Эмпирические исследования с результатами

4. **ОТЕЧЕСТВЕННАЯ ШКОЛА** (1-2 абзаца)
   - Ведущие российские учёные
   - Особенности отечественного подхода
   - Актуальные публикации

5. **ЗАРУБЕЖНЫЕ ИССЛЕДОВАНИЯ** (1-2 абзаца)
   - Международные тренды
   - Ключевые зарубежные публикации
   - Сравнение с отечественными

6. **КРИТИЧЕСКИЙ АНАЛИЗ** (2 абзаца)
   - Сильные стороны существующих работ
   - Пробелы и ограничения
   - Противоречия между авторами

7. **ВЫВОДЫ** (1 абзац)
   - Обоснование актуальности собственного исследования
   - Что не изучено или изучено недостаточно

ТРЕБОВАНИЯ:
- Объём: 2000-2500 слов
- Ссылки: 20-30 источников
- Формат ссылок: [Автор, год]
- Критический, а не описательный стиль
- Авторская позиция должна быть видна`
    );

    if (result) {
      updateContent((getSelectedContent().content ? getSelectedContent().content + '\n\n' : '') + result);
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✅ Обзор литературы сгенерирован!',
        timestamp: new Date(),
      }]);
    }
  };

  const generateConclusion = async () => {
    // Собираем весь контент для анализа
    let allContent = '';
    dissertation.chapters.forEach(ch => {
      allContent += ch.content + '\n';
      ch.subchapters.forEach(sub => {
        allContent += sub.content + '\n';
      });
    });

    const docType = DOCUMENT_TYPES[dissertation.documentType || 'dissertation'];

    const result = await generateHumanText(
      `На основе содержания ${docType.nameRu.toLowerCase()} на тему "${dissertation.title}" напиши ЗАКЛЮЧЕНИЕ.

СТРУКТУРА ЗАКЛЮЧЕНИЯ (по ГОСТ):

1. **РЕЗЮМЕ ИССЛЕДОВАНИЯ** (1-2 абзаца)
   - Краткое изложение проделанной работы
   - Напоминание о цели и задачах

2. **ОСНОВНЫЕ ВЫВОДЫ** (нумерованный список)
   - Вывод по каждой задаче исследования
   - Конкретные результаты с цифрами где возможно
   - Формулировка: "Установлено, что...", "Выявлено...", "Доказано..."

3. **ПОДТВЕРЖДЕНИЕ ГИПОТЕЗЫ**
   - Была ли подтверждена рабочая гипотеза?
   - Какие аспекты гипотезы получили подтверждение?
   - Какие потребовали корректировки?

4. **ТЕОРЕТИЧЕСКАЯ ЗНАЧИМОСТЬ**
   - Вклад в развитие теории
   - Новые положения, введённые в научный оборот

5. **ПРАКТИЧЕСКАЯ ЗНАЧИМОСТЬ**
   - Где и как могут применяться результаты?
   - Какой ожидается эффект?
   - Для кого предназначены рекомендации?

6. **АПРОБАЦИЯ И ВНЕДРЕНИЕ**
   - Где были представлены результаты?
   - Есть ли акты внедрения?

7. **ПЕРСПЕКТИВЫ ИССЛЕДОВАНИЯ**
   - Нерешённые проблемы
   - Направления дальнейшей работы
   - Новые исследовательские вопросы

ВАЖНО:
- Объём: 2-4 страницы (800-1500 слов)
- Не повторять дословно введение
- Не добавлять новый материал
- Стиль уверенный, но не самонадеянный
- Должна чувствоваться авторская позиция`,
      allContent.slice(0, 8000) // Ограничиваем контекст
    );

    if (result) {
      const conclusionChapter = dissertation.chapters.find(ch => ch.title.includes('Заключение'));
      if (conclusionChapter) {
        setDissertation(prev => ({
          ...prev,
          chapters: prev.chapters.map(ch => 
            ch.id === conclusionChapter.id ? { ...ch, content: result } : ch
          )
        }));
        setSaveStatus('unsaved');
        setAiMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: '✅ Заключение сгенерировано! Раздел обновлён.',
          timestamp: new Date(),
        }]);
      }
    }
  };

  const checkAntiPlagiarism = async () => {
    const currentContent = getSelectedContent().content;
    if (!currentContent.trim()) return;

    const result = await generateHumanText(
      `Проанализируй текст на признаки AI-генерации и предложи улучшения:

1. Найди "машинные" паттерны:
   - Слишком гладкие переходы
   - Повторяющиеся структуры
   - Отсутствие авторского голоса
   - Шаблонные фразы

2. Предложи конкретные изменения:
   - Где добавить личное мнение
   - Какие фразы перефразировать
   - Где добавить "шероховатости"
   - Как сделать текст живее

3. Выдели проблемные места цитатами

Формат ответа: Анализ с конкретными рекомендациями.`,
      currentContent
    );
  };

  // ================== НОВЫЕ МОЩНЫЕ ФУНКЦИИ AI ==================
  
  // Генерация методологии исследования
  const generateMethodology = async () => {
    const docType = DOCUMENT_TYPES[dissertation.documentType || 'dissertation'];
    const scienceFieldName = SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || dissertation.scienceField;
    
    const result = await generateHumanText(
      `Напиши раздел МЕТОДОЛОГИЯ ИССЛЕДОВАНИЯ для ${docType.nameRu.toLowerCase()} на тему "${dissertation.title}" в области "${scienceFieldName}".

СТРУКТУРА МЕТОДОЛОГИИ:
1. **Методологическая основа исследования**
   - Общенаучные подходы (системный, структурный, функциональный)
   - Специальные методологические принципы области ${scienceFieldName}

2. **Теоретические методы**
   - Анализ и синтез
   - Индукция и дедукция
   - Моделирование
   - Сравнительный анализ

3. **Эмпирические методы**
   - Наблюдение, эксперимент (если применимо)
   - Анкетирование, интервью
   - Статистические методы
   - Контент-анализ

4. **Этапы исследования**
   - I этап: поисково-теоретический
   - II этап: опытно-экспериментальный  
   - III этап: обобщающий

5. **База исследования**
   - Описание выборки / объектов
   - Критерии отбора

Объём: 1000-1500 слов. Научный стиль с обоснованием каждого метода.`
    );

    if (result) {
      updateContent((getSelectedContent().content ? getSelectedContent().content + '\n\n' : '') + result);
    }
  };

  // Генерация практических рекомендаций
  const generateRecommendations = async () => {
    const allContent = getAllContent();
    
    const result = await generateHumanText(
      `На основе результатов исследования напиши раздел ПРАКТИЧЕСКИЕ РЕКОМЕНДАЦИИ.

СТРУКТУРА:
1. **Рекомендации для теории**
   - Вклад в развитие научного знания
   - Уточнение/дополнение существующих концепций

2. **Рекомендации для практики**
   - Конкретные шаги внедрения результатов
   - Для каких организаций/специалистов применимо
   - Ожидаемый эффект от внедрения

3. **Рекомендации для образования**
   - Использование в учебном процессе
   - Разработка курсов/программ

4. **Перспективы дальнейших исследований**
   - Нерешённые проблемы
   - Направления развития темы

Формат: Нумерованный список с пояснениями (не менее 10 рекомендаций).`,
      allContent.slice(0, 6000)
    );

    if (result) {
      updateContent((getSelectedContent().content ? getSelectedContent().content + '\n\n' : '') + result);
    }
  };

  // Генерация таблиц и схем (описание)
  const generateTableDescription = async () => {
    const currentContent = getSelectedContent().content;
    
    const result = await generateHumanText(
      `На основе текста предложи структурированные таблицы и схемы.

ЗАДАЧА:
1. Проанализируй текст и выдели данные для табличного представления
2. Создай 2-3 таблицы в формате Markdown
3. Опиши схемы/диаграммы, которые можно создать
4. Добавь подписи под таблицами (Таблица 1, Таблица 2...)

ФОРМАТ ТАБЛИЦЫ:
| Параметр | Значение | Примечание |
|----------|----------|------------|
| ... | ... | ... |

После каждой таблицы добавь анализ данных (2-3 предложения).`,
      currentContent
    );

    if (result) {
      updateContent(currentContent + '\n\n' + result);
    }
  };

  // Усиление научности текста
  const makeMoreScientific = async () => {
    const currentContent = getSelectedContent().content;
    if (!currentContent.trim()) return;

    const result = await generateHumanText(
      `Сделай текст более НАУЧНЫМ и академичным:

1. Замени разговорные обороты на научные
2. Добавь терминологию области
3. Усиль аргументацию ссылками
4. Добавь количественные данные где уместно
5. Используй пассивный залог: "было установлено", "показано"
6. Добавь научные обороты: "Следует отметить...", "Представляется важным..."
7. Расширь теоретическое обоснование

ВАЖНО: Сохрани авторский голос, не делай текст "машинным".`,
      currentContent
    );

    if (result) {
      updateContent(result);
    }
  };

  // Добавление дискуссии
  const addDiscussion = async () => {
    const currentContent = getSelectedContent().content;
    const allContent = getAllContent();
    
    const result = await generateHumanText(
      `Добавь раздел ОБСУЖДЕНИЕ РЕЗУЛЬТАТОВ (Discussion) к исследованию.

СТРУКТУРА:
1. **Интерпретация результатов**
   - Что означают полученные данные?
   - Как они соотносятся с гипотезой?

2. **Сравнение с другими исследованиями**
   - Подтверждают ли результаты работы других авторов?
   - В чём расхождения и почему?
   - Ссылки: [Автор, год]

3. **Новизна и вклад**
   - Что нового получено?
   - Какой вклад в теорию/практику?

4. **Ограничения исследования**
   - Признание слабых мест
   - Влияние ограничений на выводы

5. **Импликации**
   - Теоретические следствия
   - Практические применения

Стиль: Критический, рефлексивный, с авторской позицией.`,
      allContent.slice(0, 6000)
    );

    if (result) {
      updateContent((currentContent ? currentContent + '\n\n' : '') + result);
    }
  };

  // Генерация аннотации на основе всего содержания
  const generateAbstract = async () => {
    const allContent = getAllContent();
    if (!allContent.trim()) {
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Сначала напишите содержание глав, чтобы сгенерировать аннотацию.',
        timestamp: new Date(),
      }]);
      return;
    }

    const docType = DOCUMENT_TYPES[dissertation.documentType || 'dissertation'];
    
    const result = await generateHumanText(
      `Напиши аннотацию для ${docType.nameRu.toLowerCase()} по теме "${dissertation.title}".

ТРЕБОВАНИЯ К АННОТАЦИИ по ${docType.gostRequirements}:
1. Объём: 150-250 слов (для диссертации до 300)
2. Структура:
   - Актуальность темы (1-2 предложения)
   - Цель исследования
   - Методы исследования
   - Основные результаты
   - Практическая значимость
   - Ключевые слова (5-7 слов)

3. Стиль:
   - Безличные конструкции ("исследовано", "показано", "выявлено")
   - Научный стиль, но доступный язык
   - Конкретные данные и результаты

В конце добавь:
КЛЮЧЕВЫЕ СЛОВА: [5-7 ключевых слов через запятую]`,
      allContent.slice(0, 6000)
    );

    if (result) {
      setDissertation(prev => ({
        ...prev,
        abstract: result,
        updatedAt: new Date()
      }));
      setSaveStatus('unsaved');
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✅ Аннотация сгенерирована! Проверьте и отредактируйте при необходимости.',
        timestamp: new Date(),
      }]);
    }
  };

  // Генерация введения
  const generateIntroduction = async () => {
    const docType = DOCUMENT_TYPES[dissertation.documentType || 'dissertation'];
    const introStructure = docType.structure.find(s => s.title.toLowerCase().includes('введение'));
    
    const result = await generateHumanText(
      `Напиши ВВЕДЕНИЕ для ${docType.nameRu.toLowerCase()} на тему "${dissertation.title}" в области "${SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || 'наука'}".

СТРУКТУРА ВВЕДЕНИЯ по ${docType.gostRequirements}:
${introStructure?.subchapters.map(s => `- ${s.title}`).join('\n') || `
- Актуальность темы исследования
- Степень разработанности проблемы
- Цель и задачи исследования
- Объект и предмет исследования
- Научная гипотеза
- Методы исследования
- Научная новизна
- Теоретическая и практическая значимость
- Апробация результатов
- Структура работы`}

ТРЕБОВАНИЯ:
1. Каждый пункт — отдельный абзац
2. Актуальность — почему эта тема важна СЕЙЧАС
3. Цель — ОДНА главная цель, задачи — 4-6 конкретных шагов
4. Объект шире предмета (предмет — часть объекта)
5. Гипотеза — проверяемое предположение
6. Научная новизна — что именно НОВОЕ в исследовании
7. В конце — краткое описание структуры работы

Объём: 3-5 страниц (около 2000-3000 слов для диссертации).`,
      dissertation.title
    );

    if (result) {
      const introChapter = dissertation.chapters.find(ch => 
        ch.title.toLowerCase().includes('введение') || ch.id === 'ch-intro'
      );
      if (introChapter) {
        setDissertation(prev => ({
          ...prev,
          chapters: prev.chapters.map(ch => 
            ch.id === introChapter.id ? { ...ch, content: result } : ch
          ),
          updatedAt: new Date()
        }));
        setSaveStatus('unsaved');
        setAiMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: '✅ Введение сгенерировано! Раздел "Введение" обновлён.',
          timestamp: new Date(),
        }]);
      }
    }
  };

  // 🆕 УМНАЯ ГЕНЕРАЦИЯ СТРУКТУРЫ НА ОСНОВЕ ТЕМЫ
  const generateSmartStructure = async () => {
    if (!dissertation.title.trim()) {
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Сначала введите тему диссертации!',
        timestamp: new Date(),
      }]);
      return;
    }

    setIsGenerating(true);
    const docType = DOCUMENT_TYPES[dissertation.documentType || 'dissertation'];
    const scienceFieldName = SCIENCE_FIELDS.find(f => f.id === dissertation.scienceField)?.name || dissertation.scienceField;

    try {
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🧠 Анализирую тему и генерирую оптимальную структуру ${docType.nameRu.toLowerCase()}...`,
        timestamp: new Date(),
      }]);

      const response = await fetchWithAuth(`${API_URL}/ai/generate`, {
        method: 'POST',
        body: JSON.stringify({
          taskType: 'outline',
          systemPrompt: `Ты — эксперт по написанию научных работ с 30-летним опытом научного руководства.
Твоя задача — создать ИДЕАЛЬНУЮ структуру ${docType.nameRu.toLowerCase()}.
ОБЯЗАТЕЛЬНО пиши на языке: ${SUPPORTED_LANGUAGES[writingLanguage].name}`,
          userPrompt: `Создай детальную структуру ${docType.nameRu.toLowerCase()} на тему:
"${dissertation.title}"

НАУЧНАЯ ОБЛАСТЬ: ${scienceFieldName}
ТРЕБОВАНИЯ: ${docType.gostRequirements}
ЯЗЫК: ${SUPPORTED_LANGUAGES[writingLanguage].name} (используй стандарт ${SUPPORTED_LANGUAGES[writingLanguage].academicStyle})

ВЕРНИ ОТВЕТ СТРОГО В ФОРМАТЕ JSON:
{
  "chapters": [
    {
      "title": "Название главы",
      "description": "Краткое описание содержания (1-2 предложения)",
      "subchapters": [
        { "title": "1.1. Название подраздела", "description": "О чём" },
        { "title": "1.2. Название подраздела", "description": "О чём" }
      ]
    }
  ],
  "researchQuestions": ["Вопрос 1", "Вопрос 2", "Вопрос 3"],
  "hypothesis": "Формулировка гипотезы исследования",
  "methods": ["Метод 1", "Метод 2", "Метод 3"],
  "expectedResults": "Ожидаемые результаты и научная новизна"
}

ТРЕБОВАНИЯ:
1. Введение и Заключение — обязательно
2. 2-3 основные главы (для ${docType.nameRu.toLowerCase()})
3. В каждой главе 3-5 подразделов
4. Названия должны быть конкретными, не абстрактными
5. Учитывай специфику области "${scienceFieldName}"`,
          temperature: 0.7,
          maxTokens: 2000,
        }),
      });

      const data = await response.json();
      const content = data.content || '';
      
      // Парсим JSON из ответа
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const structure = JSON.parse(jsonMatch[0]);
        
        // Преобразуем в формат приложения
        const newChapters = structure.chapters.map((ch: { title: string; subchapters?: { title: string }[] }, idx: number) => ({
          id: `ch-${idx + 1}-${Date.now()}`,
          title: ch.title,
          content: '',
          subchapters: (ch.subchapters || []).map((sub: { title: string }, subIdx: number) => ({
            id: `ch-${idx + 1}-${subIdx + 1}-${Date.now()}`,
            title: sub.title,
            content: ''
          }))
        }));

        setDissertation(prev => ({
          ...prev,
          chapters: newChapters,
          updatedAt: new Date()
        }));
        setSaveStatus('unsaved');

        setAiMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ **Структура сгенерирована!**

📚 **Главы:** ${newChapters.length}
📑 **Подразделы:** ${newChapters.reduce((acc: number, ch: { subchapters?: unknown[] }) => acc + (ch.subchapters?.length || 0), 0)}

${structure.hypothesis ? `\n🎯 **Гипотеза:**\n${structure.hypothesis}` : ''}

${structure.methods ? `\n🔬 **Методы:**\n${structure.methods.map((m: string) => `• ${m}`).join('\n')}` : ''}

${structure.researchQuestions ? `\n❓ **Исследовательские вопросы:**\n${structure.researchQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}` : ''}

💡 Теперь вы можете генерировать содержание для каждой главы!`,
          timestamp: new Date(),
        }]);
      } else {
        throw new Error('Не удалось распарсить структуру');
      }

    } catch (error: unknown) {
      console.error('Structure generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Ошибка генерации структуры: ${errorMessage}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // ================== НОВЫЕ ФУНКЦИИ ==================
  
  // Проверка уникальности текста
  const handleCheckUniqueness = async () => {
    const allContent = getAllContent();
    if (!allContent.trim()) {
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Нет текста для проверки уникальности.',
        timestamp: new Date(),
      }]);
      return;
    }
    
    setIsCheckingUniqueness(true);
    try {
      const result = await checkUniqueness(allContent);
      
      setDissertation(prev => ({
        ...prev,
        uniquenessScore: result.uniqueness,
        updatedAt: new Date()
      }));
      
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Проверка уникальности завершена!

📊 **Уникальность текста: ${result.uniqueness.toFixed(1)}%**

${result.uniqueness >= 85 ? '🟢 Отличный результат! Текст соответствует требованиям.' : 
  result.uniqueness >= 70 ? '🟡 Хороший результат. Рекомендуется перефразировать некоторые участки.' :
  '🔴 Требуется доработка. Используйте функцию "Перефразировать" для повышения уникальности.'}

${result.matches.length > 0 ? '\n**Найденные совпадения:**\n' + result.matches.map(m => `• ${m.source}: ${m.similarity.toFixed(1)}%`).join('\n') : ''}`,
        timestamp: new Date(),
      }]);
      
      setSaveStatus('unsaved');
    } catch (error) {
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Ошибка при проверке уникальности.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsCheckingUniqueness(false);
    }
  };
  
  // Получить весь контент
  const getAllContent = useCallback(() => {
    let content = dissertation.abstract + '\n\n';
    dissertation.chapters.forEach(ch => {
      content += ch.title + '\n' + ch.content + '\n\n';
      ch.subchapters.forEach(sub => {
        content += sub.title + '\n' + sub.content + '\n\n';
      });
    });
    return content;
  }, [dissertation]);
  
  // Сменить тип документа
  const changeDocumentType = (newType: DocumentType) => {
    const config = DOCUMENT_TYPES[newType];
    if (!config) return;
    
    const newChapters = config.structure.map((item, idx) => ({
      id: `ch-${Date.now()}-${idx}`,
      title: item.title,
      content: '',
      subchapters: item.subchapters.map((sub, subIdx) => ({
        id: `sub-${Date.now()}-${idx}-${subIdx}`,
        title: sub.title,
        content: sub.content || ''
      }))
    }));
    
    setDissertation(prev => ({
      ...prev,
      documentType: newType,
      targetWordCount: config.targetWords,
      chapters: newChapters,
      updatedAt: new Date()
    }));
    
    setShowDocTypeSelector(false);
    setSaveStatus('unsaved');
    setSelectedChapter(null);
    setSelectedSubchapter(null);
  };
  
  // Добавить источник
  const addCitationToList = () => {
    if (newCitation.authors.length === 0 || !newCitation.title) return;
    
    const citation: Citation = {
      id: `cit-${Date.now()}`,
      authors: newCitation.authors,
      title: newCitation.title,
      source: newCitation.source,
      year: newCitation.year || new Date().getFullYear(),
      pages: newCitation.pages,
      doi: newCitation.doi,
      url: newCitation.url,
      type: newCitation.type || 'book',
    };
    
    setDissertation(prev => ({
      ...prev,
      citations: [...(prev.citations || []), citation],
      updatedAt: new Date()
    }));
    
    setNewCitation({
      id: '',
      type: 'book',
      authors: [],
      title: '',
      source: '',
      year: new Date().getFullYear(),
    });
    setShowAddCitation(false);
    setSaveStatus('unsaved');
  };
  
  // Удалить источник
  const removeCitation = (citationId: string) => {
    setDissertation(prev => ({
      ...prev,
      citations: (prev.citations || []).filter(c => c.id !== citationId),
      updatedAt: new Date()
    }));
    setSaveStatus('unsaved');
  };
  
  // Сгенерировать список литературы
  const generateBibliographySection = () => {
    const citations = dissertation.citations || [];
    if (citations.length === 0) {
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Список источников пуст. Добавьте источники через менеджер цитат.',
        timestamp: new Date(),
      }]);
      return;
    }
    
    const bibliography = generateBibliography(citations);
    
    // Найти главу "Список литературы"
    const bibChapter = dissertation.chapters.find(ch => 
      ch.title.toLowerCase().includes('литератур') || 
      ch.title.toLowerCase().includes('источник')
    );
    
    if (bibChapter) {
      setDissertation(prev => ({
        ...prev,
        chapters: prev.chapters.map(ch => 
          ch.id === bibChapter.id ? { ...ch, content: bibliography } : ch
        ),
        updatedAt: new Date()
      }));
      setSaveStatus('unsaved');
      
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Список литературы сформирован по ГОСТ!\n\nДобавлено ${citations.length} источников.`,
        timestamp: new Date(),
      }]);
    }
  };  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const insertToContent = (text: string) => {
    updateContent((getSelectedContent().content ? getSelectedContent().content + '\n\n' : '') + text);
    setAiMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: '✅ Текст добавлен в текущий раздел.',
      timestamp: new Date(),
    }]);
  };

  // Экспорт в DOCX/PDF по ГОСТ

  // Экспорт в PDF по ГОСТ (extracted to dissertation/exportPDF.ts)
  const handleExportToPDF = async () => {
    await exportToPDF(dissertation);
  };

  const aiSuggestions = [
    { icon: Wand2, text: 'Написать раздел', action: generateSection, color: 'from-purple-500 to-pink-500' },
    { icon: FileText, text: 'Аннотация', action: generateAbstract, color: 'from-violet-500 to-purple-500' },
    { icon: Lightbulb, text: 'Введение', action: generateIntroduction, color: 'from-amber-500 to-yellow-500' },
    { icon: TrendingUp, text: 'Расширить текст', action: expandText, color: 'from-blue-500 to-cyan-500' },
    { icon: PenTool, text: 'Улучшить стиль', action: improveText, color: 'from-green-500 to-emerald-500' },
    { icon: RefreshCw, text: 'Перефразировать', action: paraphraseText, color: 'from-orange-500 to-amber-500' },
    { icon: BookOpen, text: 'Добавить цитаты', action: addCitations, color: 'from-red-500 to-rose-500' },
    { icon: Search, text: 'Обзор литературы', action: generateLiteratureReview, color: 'from-indigo-500 to-violet-500' },
    { icon: Target, text: 'Заключение', action: generateConclusion, color: 'from-teal-500 to-cyan-500' },
    { icon: AlertCircle, text: 'Проверка на AI', action: checkAntiPlagiarism, color: 'from-yellow-500 to-orange-500' },
    // ✨ НОВЫЕ ФУНКЦИИ
    { icon: Layers, text: 'Методология', action: generateMethodology, color: 'from-sky-500 to-blue-500' },
    { icon: CheckCircle, text: 'Рекомендации', action: generateRecommendations, color: 'from-lime-500 to-green-500' },
    { icon: BarChart, text: 'Создать таблицы', action: generateTableDescription, color: 'from-slate-500 to-gray-600' },
    { icon: Microscope, text: 'Научность +', action: makeMoreScientific, color: 'from-rose-500 to-pink-500' },
    { icon: MessageSquare, text: 'Обсуждение', action: addDiscussion, color: 'from-cyan-500 to-teal-500' },
  ];

  // 🚀 СУПЕР ФУНКЦИИ для генерации большого объёма
  const remainingLimits = subscription.getRemainingLimits();
  const canDoLargeChapter = subscription.canGenerateLargeChapter();
  const canDoFullDiss = subscription.canGenerateFullDissertation();
  
  const largeSuggestions = [
    { 
      icon: Brain, 
      text: '🧠 Сгенерировать структуру', 
      action: generateSmartStructure,
      color: 'from-violet-600 to-indigo-600',
      description: 'AI создаст оптимальную структуру по теме',
      disabled: !dissertation.title.trim() || isGenerating
    },
    { 
      icon: Rocket, 
      text: `📚 Генерация главы (~25 стр) ${remainingLimits.largeChapters !== Infinity ? `[${remainingLimits.largeChapters}]` : ''}`, 
      action: () => selectedChapter && generateLargeContent(selectedChapter, 25),
      color: 'from-fuchsia-600 to-pink-600',
      description: canDoLargeChapter.allowed 
        ? 'Сгенерировать полную главу с подразделами' 
        : canDoLargeChapter.reason || 'Недоступно',
      disabled: !canDoLargeChapter.allowed || !selectedChapter
    },
    { 
      icon: Sparkles, 
      text: '🎓 Полная работа (авто)', 
      action: generateFullDissertation,
      color: 'from-violet-600 to-purple-600',
      description: canDoFullDiss.allowed 
        ? `ИИ сам напишет всю работу (~${Math.round((dissertation.targetWordCount || 80000) / 280)} стр.)` 
        : canDoFullDiss.reason || 'Только для Pro',
      disabled: !canDoFullDiss.allowed,
      proOnly: !canDoFullDiss.allowed
    },
  ];

  // Функции форматирования текста (markdown-style)
  const getActiveTextarea = (): HTMLTextAreaElement | null => {
    if (selectedChapter === 'abstract') return abstractTextareaRef.current;
    return textareaRef.current;
  };

  const insertTextAtCursor = (before: string, after: string = '') => {
    const textarea = getActiveTextarea();
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    updateContent(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(
        selectedText ? newCursorPos : start + before.length,
        selectedText ? newCursorPos : start + before.length
      );
    }, 0);
  };

  const insertAtLineStart = (prefix: string) => {
    const textarea = getActiveTextarea();
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const text = textarea.value;
    
    // Find the start of the current line
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    updateContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const formatBold = () => insertTextAtCursor('**', '**');
  const formatItalic = () => insertTextAtCursor('*', '*');
  const formatUnderline = () => insertTextAtCursor('<u>', '</u>');
  const formatHeading1 = () => insertAtLineStart('# ');
  const formatHeading2 = () => insertAtLineStart('## ');
  const formatHeading3 = () => insertAtLineStart('### ');
  const formatBulletList = () => insertAtLineStart('• ');
  const formatNumberedList = () => insertAtLineStart('1. ');
  const formatQuote = () => insertAtLineStart('> ');
  
  const insertLink = () => {
    const url = prompt('Введите URL ссылки:');
    if (url) {
      const linkText = prompt('Введите текст ссылки:') || url;
      insertTextAtCursor(`[${linkText}](${url})`);
    }
  };

  const insertImage = () => {
    const url = prompt('Введите URL изображения:');
    if (url) {
      const alt = prompt('Введите описание изображения:') || 'Изображение';
      insertTextAtCursor(`\n![${alt}](${url})\n`);
    }
  };

  const insertTable = () => {
    const rows = parseInt(prompt('Количество строк:') || '3');
    const cols = parseInt(prompt('Количество столбцов:') || '3');
    if (rows && cols) {
      let table = '\n';
      // Header
      table += '| ' + Array(cols).fill('Заголовок').join(' | ') + ' |\n';
      table += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
      // Rows
      for (let i = 0; i < rows - 1; i++) {
        table += '| ' + Array(cols).fill('Ячейка').join(' | ') + ' |\n';
      }
      table += '\n';
      insertTextAtCursor(table);
    }
  };

  const toolbarButtons: Array<{ icon?: React.ComponentType<{ size?: number | string; className?: string }>; action?: () => void; title?: string; divider?: boolean }> = [
    { icon: Bold, action: formatBold, title: 'Жирный (**текст**)' },
    { icon: Italic, action: formatItalic, title: 'Курсив (*текст*)' },
    { icon: Underline, action: formatUnderline, title: 'Подчёркнутый' },
    { divider: true },
    { icon: Heading1, action: formatHeading1, title: 'Заголовок 1' },
    { icon: Heading2, action: formatHeading2, title: 'Заголовок 2' },
    { icon: Heading3, action: formatHeading3, title: 'Заголовок 3' },
    { divider: true },
    { icon: List, action: formatBulletList, title: 'Маркированный список' },
    { icon: ListOrdered, action: formatNumberedList, title: 'Нумерованный список' },
    { divider: true },
    { icon: Quote, action: formatQuote, title: 'Цитата' },
    { icon: Link2, action: insertLink, title: 'Вставить ссылку' },
    { icon: ImageIcon, action: insertImage, title: 'Вставить изображение' },
    { icon: Table, action: insertTable, title: 'Вставить таблицу' },
  ];

  const progressPercentage = Math.round((wordCount / dissertation.targetWordCount) * 100);

  return (
    <div className="h-screen bg-bg-primary flex overflow-hidden">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setShowSidebarMobile(prev => !prev)}
        className="md:hidden fixed top-3 left-3 z-40 p-2.5 rounded-xl bg-bg-secondary border border-border-primary shadow-lg text-text-primary hover:bg-bg-tertiary transition-all"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {showSidebarMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSidebarMobile(false)}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Table of Contents */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw]
        md:static md:w-80 md:max-w-none md:z-auto
        border-r border-border-primary flex flex-col bg-bg-secondary
        transform transition-transform duration-300 ease-in-out
        ${showSidebarMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={18} />
              Назад
            </button>
            <button
              onClick={() => setShowSidebarMobile(false)}
              className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
            >
              <X size={20} />
            </button>
          </div>
          
          <input
            type="text"
            value={dissertation.title}
            onChange={(e) => setDissertation(prev => ({ ...prev, title: e.target.value, updatedAt: new Date() }))}
            className="w-full text-lg font-bold bg-transparent border-none focus:outline-none text-text-primary mb-2"
            placeholder="Название диссертации"
          />
          
          {/* Прогресс */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>{wordCount.toLocaleString()} слов</span>
              <span>Цель: {dissertation.targetWordCount.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
                className={`h-full rounded-full ${
                  progressPercentage >= 100 ? 'bg-green-500' : 
                  progressPercentage >= 75 ? 'bg-blue-500' : 
                  progressPercentage >= 50 ? 'bg-yellow-500' : 'bg-purple-500'
                }`}
              />
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>{progressPercentage}% выполнено</span>
              {dissertation.uniquenessScore && (
                <span className={`flex items-center gap-1 ${
                  dissertation.uniquenessScore >= 90 ? 'text-green-400' :
                  dissertation.uniquenessScore >= 80 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  ✓ {dissertation.uniquenessScore.toFixed(0)}% уникальность
                </span>
              )}
            </div>
            
            {/* Индикатор лимитов AI - универсальный для всех планов */}
            {(() => {
              const limits = subscription.getLimits();
              const remaining = subscription.getRemainingLimits();
              const planColors: Record<string, { bg: string; text: string; light: string }> = {
                starter: { bg: 'blue-500', text: 'blue-400', light: 'blue-300' },
                pro: { bg: 'violet-500', text: 'violet-400', light: 'violet-300' },
                premium: { bg: 'amber-500', text: 'amber-400', light: 'amber-300' },
              };
              const colors = planColors[subscription.currentPlan] || planColors.starter;
              
              return (
                <div className={`mt-2 px-2 py-1.5 rounded-lg bg-${colors.bg}/10 border border-${colors.bg}/30`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`text-${colors.text}`}>{(SUBSCRIPTION_PLANS[subscription.currentPlan] || SUBSCRIPTION_PLANS.starter).name}</span>
                  </div>
                  
                  {/* AI генерации */}
                  <div className="flex items-center justify-between text-[10px] mt-1">
                    <span className="text-text-muted">AI генерации:</span>
                    <span className={`font-medium ${
                      remaining.dissertationGenerations <= 0 ? 'text-red-400' : `text-${colors.light}`
                    }`}>
                      {remaining.dissertationGenerations}/{limits.dissertationGenerations}
                    </span>
                  </div>
                  
                  {/* Большие главы */}
                  <div className="flex items-center justify-between text-[10px] mt-0.5">
                    <span className="text-text-muted">Главы (25+ стр):</span>
                    <span className={`font-medium ${
                      remaining.largeChapters <= 0 ? 'text-red-400' : `text-${colors.light}`
                    }`}>
                      {remaining.largeChapters}/{limits.largeChapterGenerations}
                    </span>
                  </div>
                  
                  {remaining.dissertationGenerations <= 0 && (
                    <button 
                      onClick={() => navigate('/settings')}
                      className={`w-full mt-1 text-[10px] text-${colors.text} hover:text-${colors.light} underline`}
                    >
                      Оформить Pro для больше лимитов →
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {saveStatus === 'saved' ? 'Сохранено' : saveStatus === 'saving' ? 'Сохранение...' : 'Не сохранено'}
            </span>
            <select
              value={dissertation.degreeType}
              onChange={(e) => setDissertation(prev => ({ ...prev, degreeType: e.target.value as 'bachelor' | 'master' | 'phd' }))}
              className="bg-bg-tertiary border-none rounded px-2 py-1 text-xs"
            >
              <option value="bachelor">Бакалавр</option>
              <option value="master">Магистр</option>
              <option value="phd">Кандидат</option>
            </select>
          </div>
          
          {/* Тип документа и быстрые действия */}
          <div className="mt-3 space-y-2">
            <button
              onClick={() => setShowDocTypeSelector(true)}
              className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 text-sm font-medium hover:from-purple-500/30 hover:to-pink-500/30 transition-all flex items-center justify-between"
            >
              <span>{DOCUMENT_TYPES[dissertation.documentType || 'dissertation']?.icon} {DOCUMENT_TYPES[dissertation.documentType || 'dissertation']?.nameRu}</span>
              <ChevronRight size={14} />
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowCitationManager(true)}
                className="px-2 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-border-primary text-text-secondary text-xs flex items-center gap-1 transition-all"
              >
                <BookOpen size={12} />
                Источники ({(dissertation.citations || []).length})
              </button>
              <button
                onClick={handleCheckUniqueness}
                disabled={isCheckingUniqueness}
                className="px-2 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-border-primary text-text-secondary text-xs flex items-center gap-1 transition-all disabled:opacity-50"
              >
                {isCheckingUniqueness ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                {dissertation.uniquenessScore ? `${dissertation.uniquenessScore.toFixed(0)}%` : 'Проверка'}
              </button>
            </div>
          </div>
        </div>

        {/* Chapters list */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-3">
            <button
              onClick={() => handleSelectChapter('abstract')}
              className={`w-full px-3 py-2 rounded-lg text-left transition-colors ${
                selectedChapter === 'abstract' 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'hover:bg-bg-tertiary text-text-secondary'
              }`}
            >
              📝 Аннотация
            </button>
          </div>

          {dissertation.chapters.map((chapter) => (
            <div key={chapter.id} className="mb-1 group">
              <div className="flex items-center gap-1">
                {chapter.subchapters.length > 0 && (
                  <button
                    onClick={() => toggleChapter(chapter.id)}
                    className="p-1 hover:bg-bg-tertiary rounded transition-colors"
                    aria-label={expandedChapters.includes(chapter.id) ? 'Свернуть' : 'Развернуть'}
                    aria-expanded={expandedChapters.includes(chapter.id)}
                  >
                    {expandedChapters.includes(chapter.id) ? (
                      <ChevronDown size={14} className="text-text-muted" />
                    ) : (
                      <ChevronRight size={14} className="text-text-muted" />
                    )}
                  </button>
                )}
                {chapter.subchapters.length === 0 && <div className="w-6" />}
                <button
                  onClick={() => handleSelectChapter(chapter.id)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-left text-sm transition-colors truncate ${
                    selectedChapter === chapter.id && !selectedSubchapter
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'hover:bg-bg-tertiary text-text-secondary'
                  }`}
                  aria-label={`Select chapter: ${chapter.title}`}
                >
                  {chapter.title}
                </button>
                <button
                  onClick={() => addSubchapter(chapter.id)}
                  className="p-1 hover:bg-bg-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Добавить подраздел"
                  aria-label="Add subsection"
                >
                  <Plus size={12} className="text-text-muted" />
                </button>
                <button
                  onClick={async () => {
                    const yes = await confirm({ title: 'Удаление главы', message: `Удалить "${chapter.title}"?`, type: 'danger', confirmText: 'Удалить', cancelText: 'Отмена' });
                    if (yes) deleteChapter(chapter.id);
                  }}
                  className="p-1 hover:bg-red-500/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Удалить главу"
                  aria-label="Delete chapter"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
              
              <AnimatePresence>
                {expandedChapters.includes(chapter.id) && chapter.subchapters.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-6 mt-1 space-y-0.5 overflow-hidden"
                  >
                    {chapter.subchapters.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-1 group/sub">
                        <button
                          onClick={() => handleSelectChapter(chapter.id, sub.id)}
                          className={`flex-1 px-2 py-1 rounded-lg text-left text-xs transition-colors truncate ${
                          selectedSubchapter === sub.id
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'hover:bg-bg-tertiary text-text-muted'
                        }`}
                        aria-label={`Select subsection: ${sub.title}`}
                      >
                        {sub.title}
                      </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const yes = await confirm({ title: 'Удаление подраздела', message: `Удалить "${sub.title}"?`, type: 'danger', confirmText: 'Удалить', cancelText: 'Отмена' });
                            if (yes) deleteSubchapter(chapter.id, sub.id);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors opacity-0 group-hover/sub:opacity-100"
                          title="Удалить подраздел"
                          aria-label="Delete subsection"
                        >
                          <Trash2 size={10} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          <button
            onClick={addChapter}
            className="w-full mt-4 px-3 py-2 rounded-lg border border-dashed border-border-primary hover:border-purple-500 text-text-muted hover:text-purple-400 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={14} />
            Добавить главу
          </button>
        </div>
        
        {/* Quick settings */}
        <div className="p-3 border-t border-border-primary space-y-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Научная область</label>
            <select
              value={dissertation.scienceField}
              onChange={(e) => setDissertation(prev => ({ ...prev, scienceField: e.target.value }))}
              className="w-full px-2 py-1.5 bg-bg-tertiary border border-border-primary rounded-lg text-sm"
            >
              {SCIENCE_FIELDS.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.icon} {field.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Язык написания */}
          <div data-tour="language-select">
            <label className="text-xs text-text-muted block mb-1">🌍 Язык написания</label>
            <select
              value={writingLanguage}
              onChange={(e) => setWritingLanguage(e.target.value as typeof writingLanguage)}
              className="w-full px-2 py-1.5 bg-bg-tertiary border border-border-primary rounded-lg text-sm"
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                <option key={code} value={code}>
                  {lang.flag} {lang.name} ({lang.academicStyle})
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-primary bg-bg-secondary/50 flex items-center gap-2 md:gap-4 pl-14 md:pl-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center hidden md:flex">
              <GraduationCap className="text-white" size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-lg font-bold text-text-primary truncate">AI Редактор диссертации</h1>
              <p className="text-xs text-text-muted truncate">
                {saveStatus === 'saved' ? '✓ Сохранено' : saveStatus === 'saving' ? '⏳ Сохранение...' : '• Не сохранено'}
                {' • '}{wordCount.toLocaleString()} слов
              </p>
            </div>
          </div>
          
          <div className="flex-1" />
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPlagiarismPanel(!showPlagiarismPanel)}
            className={`px-3 md:px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm ${
              showPlagiarismPanel 
                ? 'bg-cyan-500 text-white' 
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
            }`}
          >
            <Search size={18} />
            <span className="hidden sm:inline">Антиплагиат</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`px-3 md:px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm ${
              showAIPanel 
                ? 'bg-purple-500 text-white' 
                : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
            }`}
          >
            <Brain size={18} />
            <span className="hidden sm:inline">AI Помощник</span>
          </motion.button>
          
          <button 
            onClick={handleExportToPDF}
            className="p-2 hover:bg-bg-tertiary rounded-xl transition-colors text-text-muted hover:text-text-primary"
            title="Экспорт в PDF"
          >
            <FileDown size={18} />
          </button>
        </div>
        
        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-border-primary bg-bg-primary/50 flex items-center gap-1 flex-wrap">
          {toolbarButtons.map((btn, index) => 
            btn.divider ? (
              <div key={index} className="w-px h-6 bg-border-primary mx-1" />
            ) : btn.icon ? (
              <button
                key={index}
                onClick={btn.action}
                title={btn.title}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-muted hover:text-text-primary"
              >
                <btn.icon size={16} />
              </button>
            ) : null
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {selectedChapter === 'abstract' ? (
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-text-primary mb-4">Аннотация</h2>
                <textarea
                  ref={abstractTextareaRef}
                  value={dissertation.abstract}
                  onChange={(e) => {
                    setDissertation(prev => ({ ...prev, abstract: e.target.value, updatedAt: new Date() }));
                    setSaveStatus('unsaved');
                  }}
                  placeholder="Введите аннотацию диссертации (обычно 150-300 слов)...

Аннотация должна содержать:
• Актуальность темы
• Цель исследования
• Основные методы
• Ключевые результаты
• Практическая значимость"
                  className="w-full min-h-[400px] bg-bg-tertiary border border-border-primary rounded-xl p-4 focus:outline-none focus:border-purple-500 text-text-primary resize-none leading-relaxed"
                />
              </div>
            ) : selectedChapter ? (
              <div className="max-w-3xl mx-auto">
                <input
                  type="text"
                  value={getSelectedContent().title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setDissertation(prev => ({
                      ...prev,
                      chapters: prev.chapters.map(ch => {
                        if (ch.id === selectedChapter) {
                          if (selectedSubchapter) {
                            return {
                              ...ch,
                              subchapters: ch.subchapters.map(sub =>
                                sub.id === selectedSubchapter ? { ...sub, title: newTitle } : sub
                              )
                            };
                          }
                          return { ...ch, title: newTitle };
                        }
                        return ch;
                      }),
                      updatedAt: new Date()
                    }));
                  }}
                  className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none text-text-primary mb-6"
                />
                <textarea
                  ref={textareaRef}
                  value={getSelectedContent().content}
                  onChange={(e) => updateContent(e.target.value)}
                  placeholder="Начните писать или используйте AI Помощник для генерации текста...

Советы для научного текста:
• Используйте научный стиль изложения
• Добавляйте ссылки на источники [Автор, год]
• Структурируйте текст на абзацы
• Формулируйте чёткие тезисы

Горячие клавиши форматирования:
• **жирный** — выделите текст и нажмите B в toolbar
• *курсив* — выделите текст и нажмите I в toolbar  
• # Заголовок — для заголовков разных уровней
• > Цитата — для блочных цитат"
                  className="w-full min-h-[600px] bg-bg-tertiary border border-border-primary rounded-xl p-6 focus:outline-none focus:border-purple-500 text-text-primary resize-none leading-relaxed text-base font-mono"
                />
                <div className="mt-2 text-xs text-text-muted text-right">
                  {getSelectedContent().content.split(/\s+/).filter(w => w).length} слов в этом разделе
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <GraduationCap size={64} className="mx-auto mb-4 text-purple-400/50" />
                  <h2 className="text-xl font-semibold text-text-primary mb-2">Выберите раздел</h2>
                  <p className="text-text-muted mb-4">Выберите главу или подраздел в боковой панели для редактирования</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAIPanel(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl text-white font-medium"
                  >
                    Открыть AI Помощник
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Plagiarism & Anti-AI Detection Panel */}
          <AnimatePresence>
            {showPlagiarismPanel && (
              <>
              {/* Mobile backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPlagiarismPanel(false)}
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
              />
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 420, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="fixed inset-y-0 right-0 z-50 w-[90vw] max-w-[420px] md:relative md:z-auto md:w-auto md:max-w-none border-l border-border-primary bg-bg-secondary/95 md:bg-bg-secondary/50 overflow-hidden flex flex-col"
              >
                <div className="w-full md:w-[420px] flex flex-col h-full">
                  {/* Header */}
                  <div className="p-4 border-b border-border-primary">
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                      <Search size={20} className="text-cyan-400" />
                      Антиплагиат & AI-детекция
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      Проверка уникальности и обход AI-детекторов
                    </p>
                    
                    {/* Tabs */}
                    <div className="flex gap-1 mt-3">
                      {[
                        { id: 'check' as const, label: '🔍 Плагиат', title: 'Проверка уникальности' },
                        { id: 'detect' as const, label: '🤖 AI-детекция', title: 'Проверка на AI' },
                        { id: 'humanize' as const, label: '✍️ Гуманизация', title: 'Обход детекторов' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setPlagiarismPanelTab(tab.id)}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            plagiarismPanelTab === tab.id
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-bg-tertiary text-text-muted hover:text-text-primary border border-transparent'
                          }`}
                          title={tab.title}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Panel Content */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {plagiarismPanelTab === 'check' && (
                      <PlagiarismChecker 
                        text={getAllContent()} 
                        onApplySuggestion={(original, suggestion) => {
                          // Применяем исправление в текущем контенте
                          const currentContent = getSelectedContent().content;
                          const updatedContent = currentContent.replace(original, suggestion);
                          if (updatedContent !== currentContent) {
                            setDissertation(prev => ({
                              ...prev,
                              chapters: prev.chapters.map(ch => {
                                if (ch.id === selectedChapter) {
                                  if (selectedSubchapter) {
                                    return {
                                      ...ch,
                                      subchapters: ch.subchapters.map(sub =>
                                        sub.id === selectedSubchapter ? { ...sub, content: updatedContent } : sub
                                      )
                                    };
                                  }
                                  return { ...ch, content: updatedContent };
                                }
                                return ch;
                              }),
                              updatedAt: new Date()
                            }));
                            setSaveStatus('unsaved');
                          }
                        }}
                      />
                    )}
                    
                    {plagiarismPanelTab === 'detect' && (
                      <Suspense fallback={<div className="text-center py-8 text-text-muted"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Загрузка...</div>}>
                        <AIDetectionChecker text={getAllContent()} />
                      </Suspense>
                    )}
                    
                    {plagiarismPanelTab === 'humanize' && (
                      <Suspense fallback={<div className="text-center py-8 text-text-muted"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Загрузка...</div>}>
                        <AntiAIDetectionLazy 
                          initialText={getSelectedContent().content}
                          onTextChange={(newText: string) => {
                            setDissertation(prev => ({
                              ...prev,
                              chapters: prev.chapters.map(ch => {
                                if (ch.id === selectedChapter) {
                                  if (selectedSubchapter) {
                                    return {
                                      ...ch,
                                      subchapters: ch.subchapters.map(sub =>
                                        sub.id === selectedSubchapter ? { ...sub, content: newText } : sub
                                      )
                                    };
                                  }
                                  return { ...ch, content: newText };
                                }
                                return ch;
                              }),
                              updatedAt: new Date()
                            }));
                            setSaveStatus('unsaved');
                          }}
                        />
                      </Suspense>
                    )
                    }
                  </div>
                </div>
              </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* AI Panel */}
          <AnimatePresence>
            {showAIPanel && (
              <>
              {/* Mobile backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAIPanel(false)}
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
              />
              <motion.aside
                data-tour="ai-panel"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 400, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="fixed inset-y-0 right-0 z-50 w-[90vw] max-w-[400px] md:relative md:z-auto md:w-auto md:max-w-none border-l border-border-primary bg-bg-secondary/95 md:bg-bg-secondary/50 overflow-hidden flex flex-col"
              >
                <div className="w-full md:w-[400px] flex flex-col h-full overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-border-primary flex-shrink-0">
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                      <Brain size={20} className="text-purple-400" />
                      AI Помощник для диссертации
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      Пишет максимально человеческим стилем
                    </p>
                  </div>
                  
                  {/* Quick Actions - сворачиваемые */}
                  <div data-tour="quick-actions" className="border-b border-border-primary flex-shrink-0">
                    <button
                      onClick={() => setShowQuickActions(!showQuickActions)}
                      className="w-full p-4 flex items-center justify-between hover:bg-bg-tertiary/50 transition-colors"
                    >
                      <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={14} className="text-purple-400" />
                        Быстрые действия
                      </h4>
                      <ChevronDown 
                        size={16} 
                        className={`text-text-muted transition-transform duration-200 ${showQuickActions ? 'rotate-180' : ''}`} 
                      />
                    </button>
                    <AnimatePresence>
                      {showQuickActions && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                            {aiSuggestions.map((suggestion, index) => (
                              <motion.button
                                key={index}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={suggestion.action}
                                disabled={isGenerating}
                                className={`p-3 rounded-xl bg-gradient-to-r ${suggestion.color} text-white text-xs font-medium flex items-center gap-2 disabled:opacity-50`}
                              >
                                <suggestion.icon size={14} />
                                {suggestion.text}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* 🚀 СУПЕР ФУНКЦИИ - Большой объём - сворачиваемые */}
                  <div className="border-b border-border-primary bg-gradient-to-r from-fuchsia-500/5 to-violet-500/5 flex-shrink-0">
                    <button
                      onClick={() => setShowLargeActions(!showLargeActions)}
                      className="w-full p-4 flex items-center justify-between hover:bg-fuchsia-500/10 transition-colors"
                    >
                      <h4 className="text-xs font-medium text-fuchsia-400 uppercase tracking-wider flex items-center gap-2">
                        <Rocket size={14} />
                        Генерация большого объёма
                        {remainingLimits.largeChapters < Infinity && (
                          <span className="text-[10px] bg-fuchsia-500/20 px-2 py-0.5 rounded-full">
                            {remainingLimits.largeChapters} глав
                          </span>
                        )}
                      </h4>
                      <ChevronDown 
                        size={16} 
                        className={`text-fuchsia-400 transition-transform duration-200 ${showLargeActions ? 'rotate-180' : ''}`} 
                      />
                    </button>
                    <AnimatePresence>
                      {showLargeActions && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {largeSuggestions.map((suggestion, index) => (
                              <motion.button
                                key={index}
                                whileHover={{ scale: suggestion.disabled ? 1 : 1.01 }}
                                whileTap={{ scale: suggestion.disabled ? 1 : 0.99 }}
                                onClick={suggestion.action}
                                disabled={isGenerating || suggestion.disabled}
                                className={`w-full p-4 rounded-xl bg-gradient-to-r ${suggestion.color} text-white text-sm font-medium flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-fuchsia-500/20 relative overflow-hidden`}
                              >
                                {suggestion.proOnly && (
                                  <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    PRO
                                  </div>
                                )}
                                <suggestion.icon size={20} />
                                <div className="text-left flex-1">
                                  <div className="font-bold">{suggestion.text}</div>
                                  <div className="text-xs opacity-80 mt-0.5">{suggestion.description}</div>
                                </div>
                                {isGenerating && largeGenerationProgress.total > 0 && (
                                  <div className="text-right">
                                    <div className="text-xs">{largeGenerationProgress.current}/{largeGenerationProgress.total}</div>
                                    <div className="text-[10px] opacity-70">{largeGenerationProgress.section}</div>
                                  </div>
                                )}
                              </motion.button>
                            ))}
                            {!selectedChapter && (
                              <p className="text-xs text-text-muted text-center">
                                💡 Выберите главу в структуре слева
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Progress */}
                  {isGenerating && (
                    <div className="px-4 py-3 bg-purple-500/10 border-b border-border-primary flex-shrink-0">
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw size={14} className="animate-spin text-purple-400" />
                        <span className="text-sm text-purple-400">Генерация текста...</span>
                      </div>
                      <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${generationProgress}%` }}
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Messages */}
                  <div 
                    ref={aiMessagesContainerRef} 
                    className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-border-primary scrollbar-track-transparent"
                  >
                    {aiMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mb-4">
                          <Brain size={32} className="text-purple-400" />
                        </div>
                        <p className="text-text-muted">AI готов помочь с диссертацией</p>
                        <p className="text-xs text-text-muted mt-1">Просто напишите запрос или используйте быстрые действия</p>
                      </div>
                    ) : (
                      aiMessages.map((msg, index) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.01 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* Thinking block (Grok-style) */}
                          {msg.isThinking ? (
                            <div className="max-w-[90%] w-full">
                              <button
                                onClick={() => setExpandedThinking(prev => {
                                  const next = new Set(prev);
                                  if (next.has(msg.id)) next.delete(msg.id);
                                  else next.add(msg.id);
                                  return next;
                                })}
                                className="w-full flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
                              >
                                {msg.thinkingActive ? (
                                  <Loader2 size={16} className="text-purple-400 animate-spin shrink-0" />
                                ) : (
                                  <CheckCircle size={16} className="text-green-400 shrink-0" />
                                )}
                                <span className="text-xs text-text-secondary flex-1 text-left truncate">
                                  {msg.thinkingActive ? 'Думаю...' : 'Процесс завершён'}
                                  {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                                    <span className="text-text-muted ml-2">
                                      {(() => {
                                        const lastStep = msg.thinkingSteps[msg.thinkingSteps.length - 1];
                                        return `${lastStep.percentComplete}% · ${lastStep.wordsGenerated.toLocaleString()} слов`;
                                      })()}
                                    </span>
                                  )}
                                </span>
                                <ChevronDown 
                                  size={14} 
                                  className={`text-text-muted transition-transform duration-200 shrink-0 ${expandedThinking.has(msg.id) ? 'rotate-180' : ''}`} 
                                />
                              </button>
                              <AnimatePresence>
                                {expandedThinking.has(msg.id) && msg.thinkingSteps && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-2 ml-2 pl-4 border-l-2 border-purple-500/20 space-y-2 py-2">
                                      {msg.thinkingSteps.map((step, stepIdx) => (
                                        <div key={stepIdx} className="flex items-start gap-2">
                                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                            step.phase === 'done' ? 'bg-green-400' 
                                            : step.phase === 'planning' ? 'bg-blue-400'
                                            : step.phase === 'assembling' ? 'bg-yellow-400'
                                            : 'bg-purple-400'
                                          }`} />
                                          <div className="text-xs text-text-muted leading-relaxed">
                                            <span className="text-text-secondary font-medium">{step.phaseLabel}</span>
                                            {step.chapterTitle && (
                                              <span className="ml-1">— {step.chapterTitle}</span>
                                            )}
                                            {step.wordsGenerated > 0 && (
                                              <span className="ml-1 text-purple-400">
                                                ({step.wordsGenerated.toLocaleString()} слов, ~{step.pagesGenerated} стр.)
                                              </span>
                                            )}
                                            {step.percentComplete > 0 && step.phase !== 'done' && (
                                              <div className="mt-1 h-1 bg-bg-tertiary rounded-full overflow-hidden w-32">
                                                <div 
                                                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300" 
                                                  style={{ width: `${step.percentComplete}%` }} 
                                                />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      {msg.thinkingActive && (
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
                                          <span className="text-xs text-purple-400 animate-pulse">Обработка...</span>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ) : (
                          <div
                            className={`max-w-[85%] p-4 rounded-2xl ${
                              msg.role === 'user'
                                ? 'bg-purple-600 text-white rounded-br-none'
                                : 'bg-bg-tertiary border border-border-primary rounded-bl-none'
                            }`}
                          >
                            {msg.role === 'assistant' && !msg.content.startsWith('❌') && !msg.content.startsWith('⚠️') && !msg.content.startsWith('✅') && (
                              <div className="flex justify-end gap-1 mb-2">
                                <button
                                  onClick={() => copyToClipboard(msg.content, msg.id)}
                                  className="p-1 hover:bg-bg-primary rounded transition-colors"
                                  title="Копировать"
                                >
                                  {copiedId === msg.id ? (
                                    <Check size={12} className="text-green-400" />
                                  ) : (
                                    <Copy size={12} className="text-text-muted" />
                                  )}
                                </button>
                                <button
                                  onClick={() => insertToContent(msg.content)}
                                  className="p-1 hover:bg-bg-primary rounded transition-colors"
                                  title="Вставить в документ"
                                >
                                  <Plus size={12} className="text-text-muted" />
                                </button>
                              </div>
                            )}
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                              {msg.content}
                            </div>
                          </div>
                          )}
                        </motion.div>
                      ))
                    )}

                    {/* Dummy элемент для точного скролла */}
                    <div ref={messagesEndRef} className="h-1" />
                  </div>
                  
                  {/* Input — всегда внизу, как в настоящих чатах */}
                  <div className="p-4 border-t border-border-primary bg-bg-secondary/95 backdrop-blur-xl flex-shrink-0">
                    {/* Attached files preview */}
                    {attachedFiles.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {attachedFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs"
                          >
                            <FileText size={14} className="text-purple-400 shrink-0" />
                            <span className="text-text-primary truncate flex-1">{file.name}</span>
                            <span className="text-text-muted shrink-0">{formatFileSize(file.size)}</span>
                            {file.truncated && (
                              <span className="text-yellow-400 shrink-0" title="Файл обрезан из-за размера">⚠️</span>
                            )}
                            <button
                              onClick={() => removeAttachedFile(index)}
                              className="p-0.5 hover:bg-red-500/20 rounded transition-colors shrink-0"
                            >
                              <X size={12} className="text-red-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPTED_FILE_TYPES}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <div className="relative">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAIGenerate();
                          }
                        }}
                        placeholder={attachedFiles.length > 0 ? "Комментарий к файлам..." : "Напишите запрос..."}
                        rows={1}
                        disabled={isGenerating}
                        className="w-full resize-y min-h-[52px] max-h-[160px] p-4 pl-12 pr-14 bg-bg-tertiary border border-border-primary rounded-2xl focus:outline-none focus:border-purple-500 text-sm leading-relaxed"
                      />
                      {/* Paperclip button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isGenerating || isParsingFile}
                        className="absolute bottom-3 left-3 p-2 rounded-lg hover:bg-bg-primary text-text-muted hover:text-purple-400 transition-colors disabled:opacity-50"
                        title="Прикрепить файл (PDF, DOCX, TXT и др.)"
                      >
                        {isParsingFile ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Paperclip size={16} />
                        )}
                      </button>
                      {/* Send button */}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleAIGenerate}
                        disabled={(!aiPrompt.trim() && attachedFiles.length === 0) || isGenerating}
                        className="absolute bottom-3 right-3 p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Sparkles size={16} />
                        )}
                      </motion.button>
                    </div>
                    <p className="text-xs text-text-muted mt-2 text-center">
                      📎 PDF, DOCX, TXT и др. · 💡 AI пишет в академическом стиле
                    </p>
                  </div>
                </div>
              </motion.aside>
              </>
            )}
          </AnimatePresence>
        </div>
        
        {/* Модальное окно выбора типа документа */}
        <AnimatePresence>
          {showDocTypeSelector && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowDocTypeSelector(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-bg-secondary rounded-2xl border border-border-primary p-6 w-full max-w-2xl max-h-[80vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                  <FileText size={24} />
                  Выберите тип научной работы
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Object.keys(DOCUMENT_TYPES) as DocumentType[]).map((docType) => {
                    const doc = DOCUMENT_TYPES[docType];
                    return (
                      <motion.button
                        key={docType}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => changeDocumentType(docType)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          dissertation.documentType === docType
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'bg-bg-tertiary border-border-primary hover:border-purple-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{doc.icon}</span>
                          <div>
                            <h3 className="font-semibold text-text-primary">{doc.nameRu}</h3>
                            <p className="text-xs text-text-muted">{doc.nameEn}</p>
                          </div>
                        </div>
                        <p className="text-xs text-text-secondary">{doc.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {doc.structure.slice(0, 4).map((s: { id: string; title: string }, i: number) => (
                            <span key={i} className="text-[10px] bg-bg-primary px-2 py-0.5 rounded">
                              {s.title}
                            </span>
                          ))}
                          {doc.structure.length > 4 && (
                            <span className="text-[10px] bg-bg-primary px-2 py-0.5 rounded">
                              +{doc.structure.length - 4}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Модальное окно менеджера источников */}
        <AnimatePresence>
          {showCitationManager && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCitationManager(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-bg-secondary rounded-2xl border border-border-primary p-6 w-full max-w-3xl max-h-[80vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <BookOpen size={24} />
                    Управление источниками
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddCitation(true)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Добавить
                    </button>
                    <button
                      onClick={generateBibliographySection}
                      className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 text-sm flex items-center gap-1"
                    >
                      <FileText size={14} />
                      Создать список
                    </button>
                  </div>
                </div>
                
                {dissertation.citations && dissertation.citations.length > 0 ? (
                  <div className="space-y-2">
                    {dissertation.citations.map((citation, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-bg-tertiary border border-border-primary flex items-start gap-3"
                      >
                        <span className="text-text-muted text-sm font-mono">[{index + 1}]</span>
                        <div className="flex-1">
                          <p className="text-sm text-text-primary">{formatCitationGOST(citation)}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                              {citation.type === 'book' ? '📚 Книга' : 
                               citation.type === 'article' ? '📄 Статья' : 
                               citation.type === 'conference' ? '🎤 Конференция' :
                               citation.type === 'dissertation' ? '🎓 Диссертация' : '🌐 Веб-сайт'}
                            </span>
                            {citation.doi && (
                              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                DOI: {citation.doi}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeCitation(citation.id)}
                          className="p-1 hover:bg-red-500/20 rounded text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <BookOpen size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Источники не добавлены</p>
                    <p className="text-xs">Нажмите "Добавить" для добавления нового источника</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Модальное окно добавления источника */}
        <AnimatePresence>
          {showAddCitation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowAddCitation(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-bg-secondary rounded-2xl border border-border-primary p-6 w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                  <Plus size={20} />
                  Добавить источник
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Тип источника</label>
                    <select
                      value={newCitation.type}
                      onChange={(e) => setNewCitation(prev => ({ ...prev, type: e.target.value as 'book' | 'article' | 'website' | 'dissertation' | 'conference' }))}
                      className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm"
                    >
                      <option value="book">📚 Книга</option>
                      <option value="article">📄 Статья</option>
                      <option value="conference">🎤 Материалы конференции</option>
                      <option value="thesis">🎓 Диссертация</option>
                      <option value="website">🌐 Веб-сайт</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Авторы (через запятую)</label>
                    <input
                      type="text"
                      value={newCitation.authors.join(', ')}
                      onChange={(e) => setNewCitation(prev => ({ ...prev, authors: e.target.value.split(',').map(a => a.trim()) }))}
                      placeholder="Иванов И.И., Петров П.П."
                      className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Название</label>
                    <input
                      type="text"
                      value={newCitation.title}
                      onChange={(e) => setNewCitation(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Название работы"
                      className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Издание/Журнал</label>
                      <input
                        type="text"
                        value={newCitation.source}
                        onChange={(e) => setNewCitation(prev => ({ ...prev, source: e.target.value }))}
                        placeholder="Название издания"
                        className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Год</label>
                      <input
                        type="number"
                        value={newCitation.year}
                        onChange={(e) => setNewCitation(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                        placeholder="2024"
                        className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Страницы</label>
                      <input
                        type="text"
                        value={newCitation.pages || ''}
                        onChange={(e) => setNewCitation(prev => ({ ...prev, pages: e.target.value }))}
                        placeholder="12-24"
                        className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">DOI (опционально)</label>
                      <input
                        type="text"
                        value={newCitation.doi || ''}
                        onChange={(e) => setNewCitation(prev => ({ ...prev, doi: e.target.value }))}
                        placeholder="10.1000/xyz123"
                        className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">URL (опционально)</label>
                    <input
                      type="text"
                      value={newCitation.url || ''}
                      onChange={(e) => setNewCitation(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full p-2 rounded-lg bg-bg-tertiary border border-border-primary text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowAddCitation(false)}
                    className="flex-1 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-secondary text-sm"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={addCitationToList}
                    disabled={!newCitation.title || newCitation.authors.length === 0}
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm disabled:opacity-50"
                  >
                    Добавить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Модальное окно лимитов */}
        <AnimatePresence>
          {showLimitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowLimitModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-bg-secondary rounded-2xl border border-border-primary p-6 w-full max-w-md text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
                  <Lock size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-text-primary mb-2">Лимит исчерпан</h2>
                <p className="text-text-muted mb-4">
                  {(() => {
                    const limits = PLAN_LIMITS[subscription.currentPlan] || PLAN_LIMITS.starter;
                    const remaining = subscription.getRemainingLimits();
                    
                    if (remaining.largeChapters <= 0) {
                      return `Вы использовали все ${limits.largeChapterGenerations} генераций глав. Оформите Pro для большего лимита.`;
                    }
                    if (!limits.fullDissertationGeneration) {
                      return 'Генерация полной диссертации доступна только в Pro подписке.';
                    }
                    if (remaining.dissertationGenerations <= 0) {
                      return `Вы использовали все ${limits.dissertationGenerations} AI-генераций. Оформите подписку для продолжения.`;
                    }
                    return 'Ресурсы текущего плана исчерпаны.';
                  })()}
                </p>
                <div className="bg-bg-tertiary rounded-xl p-4 mb-4">
                  <h3 className="font-semibold text-text-primary mb-2">🎓 План Pro</h3>
                  <ul className="text-sm text-text-secondary text-left space-y-1">
                    <li>✓ 90 эссе + 35 рефератов + 15 курсовых/мес</li>
                    <li>✓ 20 генераций глав (25+ стр)</li>
                    <li>✓ Генерация полной диссертации</li>
                    <li>✓ Все типы документов</li>
                    <li>✓ Экспорт в DOCX/PDF</li>
                  </ul>
                  <p className="text-lg font-bold text-purple-400 mt-3">$12.99/мес</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLimitModal(false)}
                    className="flex-1 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-secondary"
                  >
                    Позже
                  </button>
                  <button
                    onClick={() => navigate('/settings')}
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium"
                  >
                    Оформить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Онбординг тур для новых пользователей */}
      <OnboardingTour 
        tourId="dissertation-editor"
        onComplete={() => {}}
      />
      <ConfirmDialog />
    </div>
  );
};

export default DissertationPage;
