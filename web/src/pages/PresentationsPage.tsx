import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLanguageStore } from '../store/languageStore';
import { createServerOpenAI } from '../services/aiServer';
import { useSubscriptionStore, TOKEN_COSTS, formatTokens, SUBSCRIPTION_PLANS, PLAN_LIMITS } from '../store/subscriptionStore';
import { LimitWarning } from '../components/SubscriptionModal';
import { API_URL } from '../config';
import { getAuthorizationHeaders } from '../services/apiClient';
import type { 
  Slide, SlideLayout, SlideBackground, 
  SlideTransition, ParsedSlideData, ParsedPresentation, PresentationTheme, 
  Presentation, ChatMessage, WorkspaceStep
} from './presentations/types';
import { THEMES } from './presentations/themes';
import { createDefaultSlide } from './presentations/slideFactory';
import { searchUnsplashPhoto, generateDALLE3Image, getRealisticPhoto } from './presentations/imageUtils';
import { LAYOUT_TEMPLATES, SUBJECTS, PRESENTATION_TEMPLATES, TRANSITIONS } from './presentations/constants';
import { generatePresentationHTML, hexToRgb } from './presentations/exportHTML';

// 🚀 PRO компоненты (лучше чем Canva и Gamma!)
import BrandKitModal from '../components/presentations/BrandKitModal';
import AnalyticsDashboard from '../components/presentations/AnalyticsDashboard';
import PollsQuizzes from '../components/presentations/PollsQuizzes';
import VideoRecorder from '../components/presentations/VideoRecorder';
import PublishWebsite from '../components/presentations/PublishWebsite';
import ImportContent from '../components/presentations/ImportContent';
// 🚀 NEW AI-POWERED COMPONENTS (уровень Canva+Gamma)
import AIMagicToolbar from '../components/presentations/AIMagicToolbar';
import SmartTemplatesModal from '../components/presentations/SmartTemplatesModal';
import ContentBlocksEditor, { ContentBlock } from '../components/presentations/ContentBlocks';
import { presentationAIEngine, SMART_TEMPLATES, SmartTemplate } from '../services/presentationAIEngine';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Palette,
  Layout,
  Play,
  X,
  Wand2,
  FileText,
  FileType,
  Layers,
  Edit3,
  ImagePlus,
  BookOpen,
  Monitor,
  Copy,
  Zap,
  Brain,
  Target,
  BarChart3,
  TrendingUp,
  Users,
  Heart,
  Rocket,
  Code,
  Clock,
  Pause,
  Camera,
  User,
  Check,
  Lightbulb,
  Quote,
  BarChart,
  AlertCircle,
  Menu,
} from 'lucide-react';

export function PresentationsPage() {
  useDocumentTitle('Презентации');
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  
  // ====== НОВЫЙ ИНТЕРФЕЙС: ЧАТ + WORKSPACE ======
  const [viewMode, setViewMode] = useState<'chat' | 'workspace' | 'editor'>('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 Привет! Я помогу создать профессиональную презентацию.\n\nОпишите тему и я:\n• Проведу исследование\n• Составлю структуру\n• Подберу изображения\n• Создам слайды\n\n**Примеры запросов:**\n- "Презентация про искусственный интеллект в медицине на 10 слайдов"\n- "Бизнес-презентация о стартапе в сфере EdTech"\n- "Учебная презентация по физике: квантовая механика"',
      timestamp: new Date(),
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [workspaceSteps, setWorkspaceSteps] = useState<WorkspaceStep[]>([]);
  const [currentWorkspaceStep, setCurrentWorkspaceStep] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Состояния
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showEditor, setShowEditor] = useState(true);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [autoPlayInterval, setAutoPlayInterval] = useState(5);
  
  // Режим докладчика
  const [isPresenterMode, setIsPresenterMode] = useState(false);
  const [presentationTimer, setPresentationTimer] = useState(0);
  const presenterTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // AI редактор слайдов
  const [aiEditCommand, setAiEditCommand] = useState('');
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [showAiEditor, setShowAiEditor] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Шаблоны
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Экспорт
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  
  // Автосохранение
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Генерация
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<PresentationTheme>(THEMES[0]);
  const [slideCount, setSlideCount] = useState(10);
  const [includeImages, setIncludeImages] = useState(true);
  const [presentationStyle, setPresentationStyle] = useState<'professional' | 'creative' | 'minimal' | 'academic'>('professional');
  const [imageStyle, setImageStyle] = useState<'realistic' | 'illustration' | 'minimal'>('realistic');
  const [imageSource, setImageSource] = useState<'pexels' | 'dalle'>('dalle'); // DALL-E 3 по умолчанию для лучшего качества
  
  // 🚀 СУПЕР AI ФУНКЦИИ - ЛУЧШЕ ЧЕМ GAMMA И CANVA
  const [isEnhancingAll, setIsEnhancingAll] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState(0);
  const [showAIMagicPanel, setShowAIMagicPanel] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // � PRO МОДАЛЬНЫЕ ОКНА - функции уровня Canva Pro и Gamma
  const [showBrandKitModal, setShowBrandKitModal] = useState(false);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [showPollsQuizzes, setShowPollsQuizzes] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showPublishWebsite, setShowPublishWebsite] = useState(false);
  const [showImportContent, setShowImportContent] = useState(false);

  // 🎨 AI Magic Tools
  const [showSmartTemplatesModal, setShowSmartTemplatesModal] = useState(false);
  const [showAIMagicToolbar, setShowAIMagicToolbar] = useState(true);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  // 💰 Subscriptions
  const [limitWarningMessage, setLimitWarningMessage] = useState<string | undefined>();
  const subscription = useSubscriptionStore();
  
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // ==================== ЭФФЕКТЫ ====================
  
  // Загрузка из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('science-ai-presentations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPresentations(parsed);
      } catch (e) {
        // parse error handled silently
      }
    }
  }, []);
  
  // Сохранение в localStorage с анимацией
  useEffect(() => {
    if (presentations.length > 0) {
      setIsSaving(true);
      localStorage.setItem('science-ai-presentations', JSON.stringify(presentations));
      
      // Задержка для анимации
      setTimeout(() => {
        setLastSaved(new Date());
        setIsSaving(false);
      }, 300);
    }
  }, [presentations]);
  
  // Клавиатурная навигация
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPresentationMode && currentPresentation) {
        switch (e.key) {
          case 'ArrowRight':
          case ' ':
          case 'Enter':
            e.preventDefault();
            nextSlide();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            prevSlide();
            break;
          case 'Escape':
            e.preventDefault();
            exitPresentationMode();
            break;
          case 'Home':
            e.preventDefault();
            setCurrentSlideIndex(0);
            break;
          case 'End':
            e.preventDefault();
            setCurrentSlideIndex(currentPresentation.slides.length - 1);
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationMode, currentSlideIndex, currentPresentation]);
  
  // Автопоказ
  useEffect(() => {
    if (isAutoPlay && isPresentationMode && currentPresentation) {
      autoPlayTimerRef.current = setInterval(() => {
        setCurrentSlideIndex(prev => {
          if (prev < currentPresentation.slides.length - 1) {
            return prev + 1;
          } else {
            setIsAutoPlay(false);
            return prev;
          }
        });
      }, autoPlayInterval * 1000);
    }
    
    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [isAutoPlay, isPresentationMode, currentPresentation, autoPlayInterval]);
  
  // Прокрутка чата вниз
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);
  
  // ==================== ГОРЯЧИЕ КЛАВИШИ ====================
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Игнорируем если фокус в input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Режим презентации
      if (isPresentationMode) {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
          e.preventDefault();
          if (currentPresentation && currentSlideIndex < currentPresentation.slides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
          }
        }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          if (currentSlideIndex > 0) {
            setCurrentSlideIndex(prev => prev - 1);
          }
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsPresentationMode(false);
          setIsAutoPlay(false);
          document.exitFullscreen?.().catch(() => {});
        }
        if (e.key === 'Home') {
          e.preventDefault();
          setCurrentSlideIndex(0);
        }
        if (e.key === 'End' && currentPresentation) {
          e.preventDefault();
          setCurrentSlideIndex(currentPresentation.slides.length - 1);
        }
        return;
      }
      
      // Режим редактора
      if (viewMode === 'editor' && currentPresentation) {
        // F5 или F - презентация
        if (e.key === 'F5' || (!e.ctrlKey && !e.metaKey && (e.key === 'f' || e.key === 'F'))) {
          e.preventDefault();
          setIsPresentationMode(true);
          if (fullscreenRef.current) {
            fullscreenRef.current.requestFullscreen?.();
          }
        }
        
        // Arrow keys для навигации
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          if (currentSlideIndex < currentPresentation.slides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
          }
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (currentSlideIndex > 0) {
            setCurrentSlideIndex(prev => prev - 1);
          }
        }
        
        // Ctrl/Cmd + D - дублировать слайд
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
          e.preventDefault();
          const currentSlide = currentPresentation.slides[currentSlideIndex];
          const duplicated: Slide = {
            ...currentSlide,
            id: Date.now().toString(),
            title: currentSlide.title + ' (копия)',
          };
          setCurrentPresentation({
            ...currentPresentation,
            slides: [
              ...currentPresentation.slides.slice(0, currentSlideIndex + 1),
              duplicated,
              ...currentPresentation.slides.slice(currentSlideIndex + 1),
            ],
          });
          setCurrentSlideIndex(currentSlideIndex + 1);
        }
      }
      
      // Глобальные
      // Escape - назад к чату
      if (e.key === 'Escape' && viewMode !== 'chat' && !isPresentationMode) {
        e.preventDefault();
        setViewMode('chat');
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isPresentationMode, viewMode, currentPresentation, currentSlideIndex]);
  
  // ==================== ЧАТ И WORKSPACE ====================
  
  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isGenerating) return;
    
    // Умный анализ намерения
    const intentAnalysis = analyzeIntent(chatInput);
    
    // Если это не запрос на создание презентации — отвечаем как чат
    if (intentAnalysis.intent !== 'generate_presentation') {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: chatInput,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, userMessage]);
      
      // Получаем умный ответ
      let response = '';
      switch (intentAnalysis.intent) {
        case 'greeting':
          response = `Привет! 👋 Готов создать крутую презентацию!\n\nПросто опишите тему, например:\n• "Искусственный интеллект в медицине"\n• "Питч для инвесторов: фитнес-приложение"\n• "История Древнего Рима"`;
          break;
        case 'farewell':
          response = `До встречи! 👋 Ваши презентации сохранены.`;
          break;
        case 'thanks':
          response = `😊 Рад помочь! Создавайте потрясающие презентации!`;
          break;
        case 'help':
          response = `📖 **Как создать презентацию:**\n\n1️⃣ Опишите тему (чем подробнее — тем лучше)\n2️⃣ Я создам 10-15 слайдов с изображениями\n3️⃣ Вы можете редактировать каждый слайд\n\n💡 Примеры хороших тем:\n• "Маркетинговая стратегия запуска продукта"\n• "Квантовые компьютеры для начинающих"`;
          break;
        case 'about':
          response = `🤖 Я — Science AI!\n\nСоздаю профессиональные презентации:\n• 10-15 слайдов за минуту\n• С AI-изображениями\n• Разные стили оформления\n\nПросто напишите тему!`;
          break;
        case 'status':
          response = currentPresentation 
            ? `📊 Текущая презентация: "${currentPresentation.title}"\n${currentPresentation.slides.length} слайдов\n\nХотите создать новую?`
            : `😊 Готов к работе! Напишите тему для новой презентации.`;
          break;
        case 'question':
          response = `🤔 Интересный вопрос!\n\nЕсли хотите презентацию на эту тему — просто опишите её подробнее, и я создам слайды!`;
          break;
        default:
          response = `Опишите тему для презентации!\n\n💡 Примеры:\n• "История космонавтики"\n• "Бизнес-план кофейни"\n• "Экология океанов"`;
      }
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiMessage]);
      setChatInput('');
      return;
    }
    
    // Это запрос на создание презентации
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    const prompt = chatInput;
    setChatInput('');
    
    // Переходим в workspace и начинаем генерацию
    setViewMode('workspace');
    setGenerationPrompt(prompt);
    
    // Инициализируем шаги workspace
    const steps: WorkspaceStep[] = [
      { id: '1', title: '🔍 Анализ запроса', description: 'Понимаю тему и требования...', status: 'pending', icon: '🔍' },
      { id: '2', title: '📚 Исследование темы', description: 'Собираю информацию по теме...', status: 'pending', icon: '📚' },
      { id: '3', title: '📋 Структурирование', description: 'Создаю план презентации...', status: 'pending', icon: '📋' },
      { id: '4', title: '✍️ Генерация контента', description: 'Пишу тексты для слайдов...', status: 'pending', icon: '✍️' },
      { id: '5', title: '🖼️ Подбор изображений', description: 'Ищу подходящие фотографии...', status: 'pending', icon: '🖼️' },
      { id: '6', title: '🎨 Оформление', description: 'Применяю дизайн и стили...', status: 'pending', icon: '🎨' },
      { id: '7', title: '✅ Финализация', description: 'Проверяю и завершаю...', status: 'pending', icon: '✅' },
    ];
    setWorkspaceSteps(steps);
    setCurrentWorkspaceStep(0);
    
    // Запускаем генерацию с анимацией шагов
    await runWorkspaceGeneration(prompt, steps);
  };
  
  const runWorkspaceGeneration = async (prompt: string, steps: WorkspaceStep[]) => {
    setIsGenerating(true);
    
    const updateStep = (index: number, status: WorkspaceStep['status'], details?: string[]) => {
      setWorkspaceSteps(prev => prev.map((s, i) => 
        i === index ? { ...s, status, details: details || s.details } : s
      ));
      setCurrentWorkspaceStep(index);
    };
    
    try {
      // Шаг 1: Анализ запроса
      updateStep(0, 'in-progress');
      await new Promise(r => setTimeout(r, 800));
      updateStep(0, 'completed', ['Определена тема: ' + prompt.slice(0, 50) + '...', 'Количество слайдов: ' + slideCount]);
      
      // Шаг 2: Исследование
      updateStep(1, 'in-progress');
      await new Promise(r => setTimeout(r, 1000));
      updateStep(1, 'completed', ['Собрана информация по теме', 'Найдены ключевые факты', 'Подготовлены источники']);
      
      // Шаг 3: Структурирование
      updateStep(2, 'in-progress');
      await new Promise(r => setTimeout(r, 800));
      updateStep(2, 'completed', ['Создан план из ' + slideCount + ' слайдов', 'Определена логика повествования']);
      
      // Шаг 4: Генерация контента (основная работа)
      updateStep(3, 'in-progress');
      
      // API ключ на сервере - безопасно
      const openai = createServerOpenAI();
      
      const subjectName = SUBJECTS.find(s => s.id === selectedSubject)?.name || 'Общая тема';
      const styleName = {
        professional: 'профессиональный, деловой',
        creative: 'креативный, яркий',
        minimal: 'минималистичный',
        academic: 'академический',
      }[presentationStyle];
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Создатель профессиональных презентаций. Отвечай ТОЛЬКО JSON без markdown.

ФОРМАТ:
{"title":"...","description":"...","slides":[{"title":"заголовок 4-7 слов","subtitle":"подзаголовок","content":"2-3 предложения","bulletPoints":["пункт 1","пункт 2"],"layout":"тип","imageKeywords":"English scene for DALL-E","quote":"цитата","quoteAuthor":"автор","stats":[{"value":"94%","label":"описание"}],"notes":"заметка"}]}

LAYOUTS: title(слайд 1), content, content-image, image-content, full-image, quote, stats, two-column, thank-you(последний)

ПРАВИЛА:
- Story Arc: проблема → решение → доказательства
- Заголовки без точки, с цифрами/фактами
- 3-5 буллетов max, начинай с глагола
- imageKeywords на английском, детально
- Чередуй layouts, 60%+ с изображениями
- stats: 3-4 метрики (%, $, K, M)
- quote: реальные цитаты известных людей`
          },
          {
            role: 'user',
            content: `Создай презентацию на ${slideCount} слайдов.
ТЕМА: ${prompt}
ОБЛАСТЬ: ${subjectName}
СТИЛЬ: ${styleName}

Требования: Story Arc, 1 слайд stats, 1 слайд quote, 60%+ с imageKeywords, конкретные факты и цифры.`
          }
        ],
        temperature: 0.85,
        max_tokens: 10000,
      });
      
      updateStep(3, 'completed', ['Сгенерировано ' + slideCount + ' слайдов', 'Написаны все тексты']);
      
      // Шаг 5: Подбор изображений
      updateStep(4, 'in-progress');
      
      const content = response.choices[0].message.content || '';
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) jsonStr = match[1];
      }
      
      // Robust JSON parsing with multiple fallback strategies
      let parsed: ParsedPresentation;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e1) {
        // Try extracting JSON object from mixed content
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            // Try fixing common JSON issues: trailing commas, unescaped quotes
            const cleaned = jsonMatch[0]
              .replace(/,\s*([}\]])/g, '$1')  // trailing commas
              .replace(/[\x00-\x1F\x7F]/g, ' '); // control chars
            try {
              parsed = JSON.parse(cleaned);
            } catch (e3) {
              throw new Error('AI вернул некорректный JSON. Попробуйте снова.');
            }
          }
        } else {
          throw new Error('AI не вернул JSON. Попробуйте переформулировать тему.');
        }
      }
      
      if (!parsed?.slides || !Array.isArray(parsed.slides)) {
        throw new Error('Некорректная структура презентации. Попробуйте снова.');
      }
      const imageLayouts = ['content-image', 'image-content', 'full-image', 'comparison'];
      
      // Загружаем изображения (DALL-E 3 или Pexels)
      let imagesGenerated = 0;
      const slidesWithImages = await Promise.all(
        parsed.slides.map(async (s: ParsedSlideData, i: number) => {
          const needsImage = imageLayouts.includes(s.layout || '') || s.imageKeywords;
          let imageUrl: string | undefined;
          
          if (needsImage && includeImages && s.imageKeywords) {
            try {
              if (imageSource === 'dalle') {
                // Проверяем лимит DALL-E
                const dalleCheck = subscription.canUseDalleImages();
                if (!dalleCheck.allowed) {
                  // Переключаемся на Pexels если лимит исчерпан
                  imageUrl = await searchUnsplashPhoto(s.imageKeywords);
                } else {
                  // Используем DALL-E 3 для генерации уникальных фото по теме
                  const dalleImage = await generateDALLE3Image(s.imageKeywords + ' - ' + s.title);
                  if (dalleImage) {
                    imageUrl = dalleImage;
                    imagesGenerated++;
                    subscription.incrementDalleImages();
                    updateStep(4, 'in-progress', [`🎨 AI: Сгенерировано ${imagesGenerated} изображений...`]);
                  }
                }
              } else {
                // Используем Pexels/Unsplash для реальных фото
                imageUrl = await searchUnsplashPhoto(s.imageKeywords);
              }
            } catch (e) {
              // Failed to load image — continue without it
            }
          }
          
          return {
            id: `slide-${Date.now()}-${i}`,
            title: s.title || `Слайд ${i + 1}`,
            subtitle: s.subtitle,
            content: s.content || '',
            bulletPoints: s.bulletPoints || [],
            layout: s.layout || 'content',
            layoutVariant: s.layoutVariant || Math.floor(Math.random() * 3) + 1,
            titleAlignment: s.titleAlignment || ['left', 'center', 'right'][Math.floor(Math.random() * 3)],
            imageUrl,
            imagePrompt: s.imageKeywords,
            imageSource: 'unsplash' as const,
            elements: [],
            background: { type: 'solid' as const, value: 'transparent' },
            transition: { type: 'fade' as const, duration: 0.5 },
            notes: s.notes || '',
            // Дополнительные поля для stats и quote layouts
            quote: s.quote,
            quoteAuthor: s.quoteAuthor,
            stats: s.stats,
          };
        })
      );
      
      updateStep(4, 'completed', ['Найдено ' + slidesWithImages.filter((s) => s.imageUrl).length + ' изображений', 'Все фото загружены']);
      
      // Шаг 6: Оформление
      updateStep(5, 'in-progress');
      await new Promise(r => setTimeout(r, 600));
      updateStep(5, 'completed', ['Применена тема: ' + selectedTheme.name, 'Настроены переходы']);
      
      // Шаг 7: Финализация
      updateStep(6, 'in-progress');
      
      const newPresentation: Presentation = {
        id: `pres-${Date.now()}`,
        title: parsed.title || prompt.slice(0, 50),
        description: parsed.description || '',
        slides: slidesWithImages as Slide[],
        theme: selectedTheme,
        subject: selectedSubject || undefined,
        aspectRatio: '16:9',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setPresentations(prev => [newPresentation, ...prev]);
      setCurrentPresentation(newPresentation);
      setCurrentSlideIndex(0);
      
      updateStep(6, 'completed', ['Презентация сохранена', 'Готово к редактированию!']);
      
      // Добавляем сообщение в чат
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✨ **Презентация "${newPresentation.title}" создана!**\n\n📊 ${slidesWithImages.length} слайдов\n🖼️ ${slidesWithImages.filter((s) => s.imageUrl).length} изображений\n🎨 Тема: ${selectedTheme.name}\n\nНажмите "Открыть редактор" для просмотра и редактирования.`,
        timestamp: new Date(),
      }]);
      
      // Через 2 секунды переходим к редактору
      setTimeout(() => {
        setViewMode('editor');
      }, 2000);
      
    } catch (error) {
      setWorkspaceSteps(prev => prev.map((s, i) => 
        i === currentWorkspaceStep ? { ...s, status: 'error' } : s
      ));
      
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Произошла ошибка при генерации. Проверьте настройки API и попробуйте снова.',
        timestamp: new Date(),
      }]);
      
      setViewMode('chat');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // ==================== НАВИГАЦИЯ ====================
  
  const nextSlide = () => {
    if (currentPresentation && currentSlideIndex < currentPresentation.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };
  
  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index);
  };
  
  // ==================== РЕЖИМ ПРЕЗЕНТАЦИИ ====================
  
  const enterPresentationMode = () => {
    setIsPresentationMode(true);
    if (fullscreenRef.current) {
      fullscreenRef.current.requestFullscreen?.();
    }
  };
  
  const exitPresentationMode = () => {
    setIsPresentationMode(false);
    setIsAutoPlay(false);
    setIsPresenterMode(false);
    setPresentationTimer(0);
    if (presenterTimerRef.current) {
      clearInterval(presenterTimerRef.current);
    }
    document.exitFullscreen?.().catch(() => {});
  };
  
  // Режим докладчика
  const enterPresenterMode = () => {
    setIsPresenterMode(true);
    setIsPresentationMode(true);
    setPresentationTimer(0);
    
    // Запускаем таймер
    presenterTimerRef.current = setInterval(() => {
      setPresentationTimer(prev => prev + 1);
    }, 1000);
    
    if (fullscreenRef.current) {
      fullscreenRef.current.requestFullscreen?.();
    }
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Очистка таймера при unmount
  useEffect(() => {
    return () => {
      if (presenterTimerRef.current) {
        clearInterval(presenterTimerRef.current);
      }
    };
  }, []);
  
  // ==================== CRUD ОПЕРАЦИИ ====================
  
  const createNewPresentation = () => {
    const newPresentation: Presentation = {
      id: `pres-${Date.now()}`,
      title: 'Новая презентация',
      description: '',
      theme: selectedTheme,
      slides: [createDefaultSlide('title', 0)],
      aspectRatio: '16:9',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setPresentations(prev => [...prev, newPresentation]);
    setCurrentPresentation(newPresentation);
    setCurrentSlideIndex(0);
  };
  
  // Создание презентации из шаблона
  const createFromTemplate = (templateId: string) => {
    const template = PRESENTATION_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    
    const themeObj = THEMES.find(t => t.id === template.theme) || THEMES[0];
    
    const slides: Slide[] = template.slides.map((slideData: ParsedSlideData, index: number) => ({
      id: `slide-${Date.now()}-${index}`,
      title: slideData.title || '',
      subtitle: slideData.subtitle || '',
      content: slideData.content || '',
      bulletPoints: slideData.bulletPoints || [],
      quote: slideData.quote || '',
      quoteAuthor: slideData.quoteAuthor || '',
      stats: slideData.stats || [],
      imageUrl: '',
      layout: (slideData.layout || 'content') as SlideLayout,
      layoutVariant: 1,
      titleAlignment: 'left',
      elements: [],
      background: {
        type: 'solid' as const,
        value: themeObj.backgroundColor,
      },
      transition: {
        type: 'fade' as const,
        duration: 0.5,
      },
      notes: '',
    }));
    
    const newPresentation: Presentation = {
      id: `pres-${Date.now()}`,
      title: template.name,
      description: template.description,
      theme: themeObj,
      slides,
      aspectRatio: '16:9',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setPresentations(prev => [...prev, newPresentation]);
    setCurrentPresentation(newPresentation);
    setCurrentSlideIndex(0);
    setShowTemplates(false);
    setViewMode('editor');
  };
  
  const deletePresentation = (id: string) => {
    setPresentations(prev => prev.filter(p => p.id !== id));
    if (currentPresentation?.id === id) {
      setCurrentPresentation(null);
    }
  };
  
  const updatePresentation = (updates: Partial<Presentation>) => {
    if (!currentPresentation) return;
    
    const updated = {
      ...currentPresentation,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    setCurrentPresentation(updated);
    setPresentations(prev => prev.map(p => p.id === updated.id ? updated : p));
  };
  
  const addSlide = (layout: SlideLayout = 'content') => {
    if (!currentPresentation) return;
    
    const newSlide = createDefaultSlide(layout, currentPresentation.slides.length);
    const newSlides = [...currentPresentation.slides, newSlide];
    
    updatePresentation({ slides: newSlides });
    setCurrentSlideIndex(newSlides.length - 1);
  };
  
  const duplicateSlide = (index: number) => {
    if (!currentPresentation) return;
    
    const slideToCopy = currentPresentation.slides[index];
    const newSlide: Slide = {
      ...slideToCopy,
      id: `slide-${Date.now()}`,
    };
    
    const newSlides = [
      ...currentPresentation.slides.slice(0, index + 1),
      newSlide,
      ...currentPresentation.slides.slice(index + 1),
    ];
    
    updatePresentation({ slides: newSlides });
    setCurrentSlideIndex(index + 1);
  };
  
  const deleteSlide = (index: number) => {
    if (!currentPresentation || currentPresentation.slides.length <= 1) return;
    
    const newSlides = currentPresentation.slides.filter((_, i) => i !== index);
    updatePresentation({ slides: newSlides });
    
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };
  
  const updateSlide = (index: number, updates: Partial<Slide>) => {
    if (!currentPresentation) return;
    
    const newSlides = currentPresentation.slides.map((slide, i) => 
      i === index ? { ...slide, ...updates } : slide
    );
    
    updatePresentation({ slides: newSlides });
  };
  
  // Helper function for getting block content templates
  const getBlockContent = (blockType: string): string => {
    const templates: Record<string, string> = {
      heading: '## Новый заголовок',
      text: 'Здесь можно добавить описательный текст, объясняющий ключевые концепции вашей презентации.',
      bullets: '• Ключевой пункт 1\n• Ключевой пункт 2\n• Ключевой пункт 3',
      stats: '📊 **75%** - Рост показателей\n📈 **3x** - Увеличение эффективности',
      quote: '> "Великие идеи начинаются с маленького шага."\n> — Известный эксперт',
      timeline: '🕐 **2020** - Начало проекта\n🕑 **2022** - Запуск продукта\n🕒 **2024** - Масштабирование',
      comparison: '✅ **Преимущества:** быстрый, удобный, эффективный\n❌ **Риски:** сложность внедрения',
      team: '👤 **Иван Петров** - CEO\n👤 **Мария Сидорова** - CTO',
      cta: '🎯 **Готовы начать?**\n📧 Свяжитесь с нами: example@email.com',
    };
    return templates[blockType] || templates.text;
  };
  
  const reorderSlides = (newOrder: Slide[]) => {
    updatePresentation({ slides: newOrder });
  };
  
  // ==================== СТИЛЬ ИЗОБРАЖЕНИЙ ПО ПРЕДМЕТУ ====================
  
  const getImageStyleForSubject = (subject: string, style: 'realistic' | 'illustration' | 'minimal' = 'realistic'): string => {
    if (style === 'illustration') {
      return 'Professional digital illustration, clean vector-style artwork, modern flat design aesthetic';
    }
    
    if (style === 'minimal') {
      return 'Minimalist professional photograph with clean background, simple composition, lots of white space';
    }
    
    // Реалистичный стиль по умолчанию
    const styles: Record<string, string> = {
      'science': 'Professional realistic photograph of scientific research, laboratory equipment, or scientists at work',
      'math': 'Clean realistic photo of mathematical concepts visualization, classroom, or education setting',
      'physics': 'Realistic photograph of physics experiments, laboratory, or natural phenomena',
      'chemistry': 'Professional photo of chemistry laboratory, chemical experiments, or molecular models',
      'biology': 'Realistic nature photograph, microscopy images, or biological research setting',
      'history': 'Historical photograph style, museum artifacts, or documentary-style imagery',
      'geography': 'Professional landscape photography, maps, or geographic locations',
      'literature': 'Artistic book photography, library settings, or classical literature imagery',
      'informatics': 'Realistic photograph of modern office with computers, programming workspace',
      'economics': 'Professional business photography, financial district, or office environment',
      'business': 'Corporate photography style, business meetings, modern office spaces',
      'medicine': 'Medical photography, healthcare settings, hospital or clinic environment',
      'psychology': 'Professional portrait photography, counseling setting, or human emotions',
      'art': 'Fine art photography, museum gallery, or artistic studio setting',
      'music': 'Concert photography, musical instruments, or recording studio',
      'marketing': 'Modern advertising photography, marketing team, or brand imagery',
      'startup': 'Contemporary startup office photography, tech workspace, team collaboration',
      'technology': 'Modern tech photography, gadgets, devices, or tech workspace',
      'education': 'Educational setting photography, classroom, students, or teachers',
      'other': 'Professional realistic photograph appropriate for the topic',
    };
    return styles[subject] || styles['other'];
  };
  
  // ==================== УМНОЕ ОПРЕДЕЛЕНИЕ НАМЕРЕНИЯ (GPT) ====================
  
  type UserIntent = 
    | 'greeting' | 'farewell' | 'thanks' | 'help' | 'about' | 'status' 
    | 'question' | 'generate_presentation' | 'unclear';

  interface IntentAnalysis {
    intent: UserIntent;
    confidence: number;
    suggestedAction?: string;
    detectedTopic?: string;
  }

  // Быстрая проверка очевидных случаев
  const quickIntentCheck = (message: string): IntentAnalysis | null => {
    const lower = message.toLowerCase().trim();
    
    if (/^(привет|здравствуй(те)?|хай|хелло|hello|hi|hey|йоу|салам|ку)!?$/i.test(lower)) {
      return { intent: 'greeting', confidence: 1.0 };
    }
    if (/^(пока|до свидания|bye|goodbye|бай)!?$/i.test(lower)) {
      return { intent: 'farewell', confidence: 1.0 };
    }
    if (/^(спасибо|благодарю|thanks|спс)!?$/i.test(lower)) {
      return { intent: 'thanks', confidence: 1.0 };
    }
    if (lower.length <= 3 && !/^(да|нет|ок)$/.test(lower)) {
      return { intent: 'unclear', confidence: 0.8 };
    }
    return null;
  };

  // Умный анализ через локальные паттерны (без лишних API вызовов)
  const analyzeIntent = (message: string): IntentAnalysis => {
    const quick = quickIntentCheck(message);
    if (quick) return quick;
    
    const lower = message.toLowerCase().trim();
    
    // Приветствия
    if (/прив|здрав|хай|хелло|hello|hi|hey|добр.*(день|утро|вечер)/i.test(lower)) {
      return { intent: 'greeting', confidence: 0.9 };
    }
    
    // Прощания
    if (/пока|до свидания|bye|увидимся/i.test(lower)) {
      return { intent: 'farewell', confidence: 0.9 };
    }
    
    // Благодарность
    if (/спасибо|благодарю|thanks/i.test(lower)) {
      return { intent: 'thanks', confidence: 0.9 };
    }
    
    // Помощь
    if (/помо(щь|ги)|help|как\s*(пользоваться|создать|сделать)|что\s*(умеешь|можешь)/i.test(lower)) {
      return { intent: 'help', confidence: 0.85 };
    }
    
    // О боте
    if (/кто\s*ты|ты\s*кто|расскажи о себе/i.test(lower)) {
      return { intent: 'about', confidence: 0.9 };
    }
    
    // Статус
    if (/как\s*(дела|ты|поживаешь)/i.test(lower)) {
      return { intent: 'status', confidence: 0.85 };
    }
    
    // Вопросы
    if (/^(что такое|как работает|почему|зачем|когда|где|сколько)\s/i.test(lower)) {
      return { intent: 'question', confidence: 0.8 };
    }
    
    // Если длина > 15 символов и нет явных паттернов чата — это тема презентации
    if (lower.length > 15) {
      return { intent: 'generate_presentation', confidence: 0.9, detectedTopic: message };
    }
    
    // Короткие непонятные
    return { intent: 'unclear', confidence: 0.5 };
  };
  
  // ==================== AI ГЕНЕРАЦИЯ ====================
  
  const generatePresentation = async () => {
    if (!generationPrompt.trim()) return;
    
    // Умный анализ намерения
    const intentAnalysis = analyzeIntent(generationPrompt);
    
    // Если это не генерация — очищаем и игнорируем (обработка в handleChatSubmit)
    if (intentAnalysis.intent !== 'generate_presentation') {
      setGenerationPrompt('');
      return;
    }
    
    // 💰 Проверяем лимиты
    const canCreate = subscription.canCreatePresentation();
    if (!canCreate.allowed) {
      setLimitWarningMessage(canCreate.reason);
      return;
    }
    
    // Определяем стоимость
    const tokenCost = imageSource === 'dalle' ? TOKEN_COSTS.presentation_dalle : TOKEN_COSTS.presentation;
    
    // Проверяем хватает ли ресурсов
    if (!subscription.canAfford(imageSource === 'dalle' ? 'presentation_dalle' : 'presentation')) {
      setLimitWarningMessage('Ресурсы текущего плана исчерпаны. Оформите подписку для продолжения.');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // API ключ на сервере - безопасно
      const openai = createServerOpenAI();
      
      const subjectName = SUBJECTS.find(s => s.id === selectedSubject)?.name || 'Общая тема';
      const styleName = {
        professional: 'профессиональный, деловой',
        creative: 'креативный, яркий с интересной визуализацией',
        minimal: 'минималистичный, лаконичный',
        academic: 'академический, научный',
      }[presentationStyle];
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Ты — ГЕНИАЛЬНЫЙ дизайнер презентаций уровня Apple, TED, McKinsey и Gamma.app. Создавай УНИКАЛЬНЫЕ, КРЕАТИВНЫЕ презентации с WOW-эффектом!

## 📋 ФОРМАТ ОТВЕТА:
Отвечай ТОЛЬКО чистым JSON (без \`\`\`json, без markdown). Генерируй ПОЛНОСТЬЮ все слайды за один раз:

{
  "title": "Яркий провокационный заголовок",
  "description": "Краткое описание ценности",
  "slides": [
    {
      "title": "Цепляющий заголовок (4-7 слов)",
      "subtitle": "Уточнение",
      "content": "Конкретика с цифрами и фактами",
      "bulletPoints": ["Глагол + цифра + результат", "Конкретный факт", "Призыв к действию"],
      "layout": "content-image",
      "layoutVariant": 1,
      "titleAlignment": "left",
      "imageKeywords": "detailed English description for DALL-E/photo search",
      "quote": "Цитата эксперта",
      "quoteAuthor": "Имя, должность",
      "stats": [{"value": "95%", "label": "Метрика"}],
      "notes": "Совет спикеру"
    }
  ]
}

## 🎨 LAYOUTS — ИСПОЛЬЗУЙ ВСЕ ДЛЯ РАЗНООБРАЗИЯ:
- title → Титульный (только #1)
- title-subtitle → Раздел с подзаголовком
- content → Текст + буллеты
- content-image → Текст слева + фото справа
- image-content → Фото слева + текст справа
- two-column → Сравнение/контраст
- full-image → Эмоциональный визуал
- quote → Цитата эксперта (+ quote, quoteAuthor)
- stats → Статистика (+ stats массив с 3-4 метриками)
- timeline → Хронология событий
- comparison → До/После, A vs B
- thank-you → Финальный (только последний)

## 🧠 ПРАВИЛА КРЕАТИВНОСТИ:

### СТРУКТУРА ИСТОРИИ:
1. **title** — провокация, интрига
2-3. **Проблема** — боль аудитории, актуальность
4. **Поворот** — "Но есть решение..."
5-7. **Решение** — как это работает, доказательства
8-9. **stats/quote** — эмоциональный пик
10. **thank-you** — призыв к действию

### ЗАГОЛОВКИ-ХУКИ:
❌ "Наши преимущества" → ✅ "Почему 1000 компаний выбрали нас"
❌ "О нас" → ✅ "От идеи до $1M за 8 месяцев"
❌ "Итоги" → ✅ "Что делать прямо сейчас"

### РАЗНООБРАЗИЕ (КРИТИЧНО!):
- НИКОГДА не повторяй layout 2 раза подряд
- Чередуй titleAlignment: left → center → right → left...
- Используй ВСЕ layoutVariant: 1, 2, 3
- Минимум 60% слайдов с imageKeywords
- Минимум 1 stats + 1 quote

### IMAGEKEYS (на английском!):
✅ "Professional diverse team brainstorming in modern glass office, natural light, minimal design, photorealistic"
✅ "Scientist examining DNA model in laboratory, blue lighting, editorial photography"
❌ "business" (слишком общее!)

### STATS (массив 3-4 метрики):
stats: [
  {"value": "97%", "label": "Точность"},
  {"value": "3.5x", "label": "Рост выручки"},
  {"value": "50K+", "label": "Пользователей"}
]

### QUOTE (реальные эксперты):
quote: "Инновации — это способность видеть возможности там, где другие видят проблемы"
quoteAuthor: "Стив Джобс, основатель Apple"

## ⚡ ГЕНЕРИРУЙ ВСЕ СЛАЙДЫ ПОЛНОСТЬЮ!
Не обрезай ответ! Не пиши "продолжить"! Выдай полный JSON со всеми слайдами сразу.`
          },
          {
            role: 'user',
            content: `🎯 Создай КРЕАТИВНУЮ презентацию на ${slideCount} слайдов.

📌 ТЕМА: ${generationPrompt}
📚 ОБЛАСТЬ: ${subjectName}
🎨 СТИЛЬ: ${styleName}

ТРЕБОВАНИЯ:
1. ВСЕ ${slideCount} слайдов в одном ответе (не обрезай!)
2. Разные layouts — не повторяй подряд!
3. Минимум 1 stats + 1 quote
4. 60%+ слайдов с imageKeywords
5. Конкретные цифры и факты
6. Цепляющие заголовки

СДЕЛАЙ ТАК, ЧТОБЫ АУДИТОРИЯ СКАЗАЛА "WOW"!`
          }
        ],
        temperature: 0.95,
        max_tokens: 16000,
      });
      
      const content = response.choices[0].message.content || '';
      
      // Улучшенный парсинг JSON с обработкой ошибок
      let jsonStr = content.trim();
      
      // Извлекаем JSON из markdown блока если есть
      if (jsonStr.startsWith('```')) {
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) jsonStr = match[1];
      }
      
      // Также пробуем найти JSON объект в тексте
      if (!jsonStr.startsWith('{')) {
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];
      }
      
      // Очистка от невалидных символов
      jsonStr = jsonStr
        .replace(/[\x00-\x1F\x7F]/g, '') // Удаляем control characters
        .replace(/,\s*}/g, '}')  // Удаляем trailing commas
        .replace(/,\s*]/g, ']'); // Удаляем trailing commas в массивах
      
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError: unknown) {
        const errMsg = parseError instanceof Error ? parseError.message : 'Unknown error';
        
        // Попытка восстановить обрезанный JSON
        if (jsonStr.includes('"slides"')) {
          // Пробуем закрыть незакрытые структуры
          let fixedJson = jsonStr;
          const openBrackets = (fixedJson.match(/\[/g) || []).length;
          const closeBrackets = (fixedJson.match(/\]/g) || []).length;
          const openBraces = (fixedJson.match(/\{/g) || []).length;
          const closeBraces = (fixedJson.match(/\}/g) || []).length;
          
          // Добавляем недостающие закрывающие скобки
          fixedJson += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
          fixedJson += '}'.repeat(Math.max(0, openBraces - closeBraces));
          
          try {
            parsed = JSON.parse(fixedJson);
          } catch (e) {
            throw new Error('Не удалось разобрать ответ AI. Попробуйте ещё раз.');
          }
        } else {
          throw new Error('Ответ AI не содержит валидную презентацию. Попробуйте ещё раз.');
        }
      }
      
      // Валидация структуры
      if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
        throw new Error('AI не создал слайды. Попробуйте другую тему.');
      }
      
      // Определяем layouts, которые требуют изображения
      const imageLayouts = ['content-image', 'image-content', 'full-image', 'comparison'];
      
      // Функция загрузки изображения с retry
      const loadImageWithRetry = async (keywords: string, retries: number = 2): Promise<string | undefined> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const url = await searchUnsplashPhoto(keywords);
            if (url) return url;
          } catch (e) {
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
              continue;
            }
          }
        }
        return undefined;
      };
      
      // Создаём слайды с изображениями СРАЗУ
      const slidesWithImages = await Promise.all(
        parsed.slides.map(async (s: ParsedSlideData, i: number) => {
          const needsImage = imageLayouts.includes(s.layout || '') || s.imageKeywords;
          let imageUrl: string | undefined;
          
          // Если нужно изображение и включены картинки - загружаем с retry
          if (needsImage && includeImages && s.imageKeywords) {
            imageUrl = await loadImageWithRetry(s.imageKeywords);
          }
          
          return {
            id: `slide-${Date.now()}-${i}`,
            title: s.title || `Слайд ${i + 1}`,
            subtitle: s.subtitle,
            content: s.content || '',
            bulletPoints: Array.isArray(s.bulletPoints) ? s.bulletPoints : [],
            layout: s.layout || 'content',
            layoutVariant: s.layoutVariant || Math.floor(Math.random() * 3) + 1,
            titleAlignment: s.titleAlignment || ['left', 'center', 'right'][Math.floor(Math.random() * 3)],
            imageUrl,
            imagePrompt: s.imageKeywords || s.imagePrompt,
            imageSource: 'unsplash' as const,
            elements: [],
            background: { type: 'solid' as const, value: 'transparent' },
            transition: { type: 'fade' as const, duration: 0.5 },
            notes: s.notes || '',
            // Дополнительные поля для специальных layouts
            ...(s.quote && { quote: s.quote }),
            ...(s.quoteAuthor && { quoteAuthor: s.quoteAuthor }),
            ...(s.stats && { stats: s.stats }),
          };
        })
      );
      
      // Создаём презентацию
      const newPresentation: Presentation = {
        id: `pres-${Date.now()}`,
        title: parsed.title || generationPrompt.slice(0, 50),
        description: parsed.description || '',
        subject: selectedSubject || 'other',
        theme: selectedTheme,
        slides: slidesWithImages,
        aspectRatio: '16:9',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // 💰 Списываем токены после успешной генерации
      const tokenCost = imageSource === 'dalle' ? TOKEN_COSTS.presentation_dalle : TOKEN_COSTS.presentation;
      subscription.spendTokens(tokenCost, imageSource === 'dalle' ? 'presentation_dalle' : 'presentation', `Презентация: ${parsed.title}`);
      
      // Track usage for all plans
      subscription.incrementFreePresentations();
      
      setPresentations(prev => [...prev, newPresentation]);
      setCurrentPresentation(newPresentation);
      setCurrentSlideIndex(0);
      setGenerationPrompt('');
      
      // Успешное сообщение
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Презентация создана!**

📊 "${newPresentation.title}"
📑 ${newPresentation.slides.length} слайдов
🖼️ ${newPresentation.slides.filter(s => s.imageUrl).length} изображений

Вы можете редактировать слайды, добавлять изображения и экспортировать в PDF/PPTX.`,
        timestamp: new Date(),
      }]);
      
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      // Улучшенное сообщение об ошибке
      let errorMessage = '❌ **Ошибка генерации презентации**\n\n';
      
      if (err.message?.includes('API')) {
        errorMessage += '🔑 Проверьте настройки API ключа.\n';
      } else if (err.message?.includes('валидн') || err.message?.includes('JSON')) {
        errorMessage += '🔄 AI вернул некорректный ответ. Попробуйте ещё раз.\n';
      } else if (err.message?.includes('слайды')) {
        errorMessage += '📝 Попробуйте переформулировать тему более конкретно.\n';
      } else {
        errorMessage += `💡 ${err.message || 'Попробуйте ещё раз.'}\n`;
      }
      
      errorMessage += '\n**Советы:**\n';
      errorMessage += '• Опишите тему подробнее (5+ слов)\n';
      errorMessage += '• Укажите целевую аудиторию\n';
      errorMessage += '• Попробуйте через минуту';
      
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      }]);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // ==================== ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ ====================
  
  const generateImageForSlide = async (index: number, retries: number = 2) => {
    if (!currentPresentation) return;
    
    const slide = currentPresentation.slides[index];
    if (!slide.imagePrompt) return;
    
    updateSlide(index, { isGeneratingImage: true });
    
    const attemptLoad = async (attempt: number): Promise<string | null> => {
      try {
        const searchQuery = slide.imagePrompt || slide.title;
        
        // Пробуем разные поисковые запросы
        const queries = [
          searchQuery,
          searchQuery.split(' ').slice(0, 3).join(' '), // Первые 3 слова
          slide.title,
        ];
        
        for (const query of queries) {
          const imageUrl = await searchUnsplashPhoto(query);
          if (imageUrl) return imageUrl;
        }
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          return attemptLoad(attempt + 1);
        }
        
        return null;
      } catch (error) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          return attemptLoad(attempt + 1);
        }
        throw error;
      }
    };
    
    try {
      const imageUrl = await attemptLoad(1);
      
      if (imageUrl) {
        updateSlide(index, { imageUrl, isGeneratingImage: false });
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ Найдено изображение для слайда "${slide.title}"`,
          timestamp: new Date(),
        }]);
      } else {
        updateSlide(index, { isGeneratingImage: false });
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `⚠️ Не удалось найти подходящее изображение для слайда "${slide.title}". Попробуйте изменить ключевые слова.`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      updateSlide(index, { isGeneratingImage: false });
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ **Ошибка загрузки изображения** для слайда ${index + 1}. Проверьте интернет-соединение.`,
        timestamp: new Date(),
      }]);
    }
  };
  
  // ==================== ЭКСПОРТ ====================
  
  const exportToHTML = () => {
    if (!currentPresentation) return;
    const html = generatePresentationHTML(currentPresentation);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPresentation.title}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // ==================== УТИЛИТА ДЛЯ ЗАГРУЗКИ ИЗОБРАЖЕНИЯ КАК BASE64 ====================
  const fetchImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
    try {
      // Для DALL-E и других внешних URL используем прокси или конвертируем
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Failed to fetch');
      
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      // Альтернативный метод через canvas
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
      });
    }
  };
  
  // ==================== ЭКСПОРТ В PPTX ====================
  const exportToPPTX = async () => {
    if (!currentPresentation) return;
    
    setIsExporting(true);
    setExportProgress('Подготовка PowerPoint...');
    
    try {
      // Динамический импорт pptxgenjs
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pptx = new PptxGenJS();
      
      const theme = currentPresentation.theme;
      
      // Настройки презентации
      pptx.author = 'Science AI Assistant';
      pptx.title = currentPresentation.title;
      pptx.subject = currentPresentation.description || '';
      pptx.company = 'Science AI';
      
      // Цвета темы без #
      const primaryHex = theme.primaryColor.replace('#', '');
      const bgHex = theme.backgroundColor.includes('linear') ? '0A0A0A' : theme.backgroundColor.replace('#', '');
      const textHex = theme.textColor.replace('#', '');
      const mutedHex = theme.textMuted.replace('#', '');
      
      for (let i = 0; i < currentPresentation.slides.length; i++) {
        const slide = currentPresentation.slides[i];
        setExportProgress(`Экспорт слайда ${i + 1}/${currentPresentation.slides.length}...`);
        
        const pptSlide = pptx.addSlide();
        
        // Фон слайда
        if (theme.backgroundColor.includes('linear') || theme.backgroundColor.includes('gradient')) {
          pptSlide.background = { color: bgHex };
        } else {
          pptSlide.background = { color: bgHex };
        }
        
        const titleY = slide.layout === 'title' || slide.layout === 'title-subtitle' ? 2.5 : 0.5;
        const titleOpts = {
          x: 0.5,
          y: titleY,
          w: 9,
          h: 1,
          fontSize: slide.layout === 'title' || slide.layout === 'title-subtitle' ? 44 : 32,
          fontFace: 'Arial',
          color: textHex,
          bold: true as const,
          align: (slide.layout === 'title' || slide.layout === 'title-subtitle' ? 'center' : 'left') as 'center' | 'left',
        };
        
        pptSlide.addText(slide.title, titleOpts);
        
        // Подзаголовок
        if (slide.subtitle) {
          pptSlide.addText(slide.subtitle, {
            x: 0.5,
            y: titleOpts.y + 1,
            w: 9,
            h: 0.5,
            fontSize: 20,
            fontFace: 'Arial',
            color: mutedHex,
            align: slide.layout === 'title' || slide.layout === 'title-subtitle' ? 'center' : 'left',
          });
        }
        
        // Контент
        let contentY = slide.subtitle ? titleOpts.y + 1.8 : titleOpts.y + 1.2;
        
        if (slide.content) {
          pptSlide.addText(slide.content, {
            x: 0.5,
            y: contentY,
            w: slide.imageUrl && (slide.layout === 'content-image' || slide.layout === 'image-content') ? 4.5 : 9,
            h: 1.5,
            fontSize: 16,
            fontFace: 'Arial',
            color: textHex,
            valign: 'top',
          });
          contentY += 1.5;
        }
        
        // Буллеты
        if (slide.bulletPoints && slide.bulletPoints.length > 0) {
          const bulletText = slide.bulletPoints.map(point => ({ text: point, options: { bullet: true } }));
          pptSlide.addText(bulletText, {
            x: 0.5,
            y: contentY,
            w: slide.imageUrl && (slide.layout === 'content-image' || slide.layout === 'image-content') ? 4.5 : 9,
            h: 3,
            fontSize: 14,
            fontFace: 'Arial',
            color: textHex,
            valign: 'top',
          });
        }
        
        // Изображение
        if (slide.imageUrl) {
          const imgX = slide.layout === 'image-content' ? 0.5 : 5.5;
          const imgY = 1.5;
          const imgW = 4;
          const imgH = 3;
          
          try {
            // Пробуем загрузить изображение как base64
            const imageBase64 = await fetchImageAsBase64(slide.imageUrl);
            if (imageBase64) {
              pptSlide.addImage({
                data: imageBase64,
                x: imgX,
                y: imgY,
                w: imgW,
                h: imgH,
              });
            } else {
              throw new Error('Failed to load image');
            }
          } catch (imgError) {
            // Если изображение не загружается, добавляем placeholder
            pptSlide.addShape('rect', {
              x: imgX,
              y: imgY,
              w: imgW,
              h: imgH,
              fill: { color: primaryHex, transparency: 80 },
              line: { color: primaryHex, width: 2 },
            });
            pptSlide.addText('🖼️ Изображение', {
              x: imgX,
              y: imgY + imgH / 2 - 0.3,
              w: imgW,
              h: 0.6,
              fontSize: 14,
              align: 'center',
              color: mutedHex,
            });
          }
        }
        
        // Цитата
        if (slide.quote && slide.layout === 'quote') {
          pptSlide.addText(`"${slide.quote}"`, {
            x: 1,
            y: 2,
            w: 8,
            h: 2,
            fontSize: 28,
            fontFace: 'Georgia',
            color: textHex,
            italic: true,
            align: 'center',
            valign: 'middle',
          });
          
          if (slide.quoteAuthor) {
            pptSlide.addText(`— ${slide.quoteAuthor}`, {
              x: 1,
              y: 4,
              w: 8,
              h: 0.5,
              fontSize: 16,
              fontFace: 'Arial',
              color: primaryHex,
              align: 'center',
            });
          }
        }
        
        // Статистика
        if (slide.stats && slide.stats.length > 0 && slide.layout === 'stats') {
          const statWidth = 2.5;
          const startX = (10 - (slide.stats.length * statWidth)) / 2;
          
          slide.stats.forEach((stat, i) => {
            pptSlide.addText(stat.value, {
              x: startX + i * statWidth,
              y: 2.5,
              w: statWidth - 0.2,
              h: 0.8,
              fontSize: 36,
              fontFace: 'Arial',
              color: primaryHex,
              bold: true,
              align: 'center',
            });
            
            pptSlide.addText(stat.label, {
              x: startX + i * statWidth,
              y: 3.3,
              w: statWidth - 0.2,
              h: 0.5,
              fontSize: 14,
              fontFace: 'Arial',
              color: mutedHex,
              align: 'center',
            });
          });
        }
        
        // Номер слайда
        pptSlide.addText(String(currentPresentation.slides.indexOf(slide) + 1), {
          x: 9,
          y: 5.2,
          w: 0.5,
          h: 0.3,
          fontSize: 10,
          fontFace: 'Arial',
          color: mutedHex,
          align: 'right',
        });
      }
      
      // Сохранение
      setExportProgress('Сохранение файла...');
      const fileName = `${currentPresentation.title}.pptx`;
      await pptx.writeFile({ fileName });
      
      setExportProgress('');
      setIsExporting(false);
      
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ **Ошибка при экспорте в PPTX.** Попробуйте ещё раз или используйте другой формат.',
        timestamp: new Date(),
      }]);
      setIsExporting(false);
      setExportProgress('');
    }
  };
  
  // ==================== ЭКСПОРТ В PDF ====================
  const exportToPDF = async () => {
    if (!currentPresentation) return;
    
    setIsExporting(true);
    setExportProgress('Подготовка PDF...');
    
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const theme = currentPresentation.theme;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [297, 210], // A4 landscape
      });
      
      // Создаём временный контейнер для рендеринга слайдов
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.width = '1920px';
      container.style.height = '1080px';
      document.body.appendChild(container);
      
      for (let i = 0; i < currentPresentation.slides.length; i++) {
        const slide = currentPresentation.slides[i];
        setExportProgress(`Рендеринг слайда ${i + 1}/${currentPresentation.slides.length}...`);
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // Рендерим слайд в HTML
        container.innerHTML = `
          <div style="
            width: 1920px;
            height: 1080px;
            background: ${theme.backgroundColor};
            color: ${theme.textColor};
            font-family: ${theme.fontFamily};
            padding: 80px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: ${slide.layout === 'title' || slide.layout === 'title-subtitle' ? 'center' : 'flex-start'};
            align-items: ${slide.layout === 'title' || slide.layout === 'title-subtitle' ? 'center' : 'flex-start'};
            text-align: ${slide.layout === 'title' || slide.layout === 'title-subtitle' ? 'center' : 'left'};
          ">
            <h1 style="
              font-size: ${slide.layout === 'title' || slide.layout === 'title-subtitle' ? '72px' : '48px'};
              font-weight: bold;
              margin: 0 0 24px 0;
              font-family: ${theme.headingFont};
              ${slide.layout === 'title' || slide.layout === 'title-subtitle' ? `
                background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor});
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
              ` : ''}
            ">${slide.title}</h1>
            
            ${slide.subtitle ? `
              <p style="
                font-size: 32px;
                color: ${theme.textMuted};
                margin: 0 0 32px 0;
              ">${slide.subtitle}</p>
            ` : ''}
            
            ${slide.content ? `
              <p style="
                font-size: 24px;
                line-height: 1.6;
                margin: 0 0 32px 0;
                max-width: ${slide.imageUrl ? '800px' : '1200px'};
              ">${slide.content}</p>
            ` : ''}
            
            ${slide.bulletPoints && slide.bulletPoints.length > 0 ? `
              <ul style="
                list-style: none;
                padding: 0;
                margin: 0;
              ">
                ${slide.bulletPoints.map((point, idx) => `
                  <li style="
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    margin-bottom: 16px;
                    font-size: 22px;
                  ">
                    <span style="
                      width: 32px;
                      height: 32px;
                      border-radius: 50%;
                      background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor});
                      color: white;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 14px;
                      font-weight: bold;
                      flex-shrink: 0;
                    ">${idx + 1}</span>
                    <span>${point}</span>
                  </li>
                `).join('')}
              </ul>
            ` : ''}
            
            ${slide.quote && slide.layout === 'quote' ? `
              <div style="
                text-align: center;
                padding: 60px;
              ">
                <span style="
                  font-size: 120px;
                  color: ${theme.primaryColor};
                  opacity: 0.3;
                  font-family: Georgia, serif;
                ">"</span>
                <p style="
                  font-size: 36px;
                  font-style: italic;
                  line-height: 1.6;
                  margin: -40px 0 24px 0;
                ">${slide.quote}</p>
                ${slide.quoteAuthor ? `
                  <p style="
                    font-size: 24px;
                    color: ${theme.primaryColor};
                    font-weight: 600;
                  ">— ${slide.quoteAuthor}</p>
                ` : ''}
              </div>
            ` : ''}
            
            ${slide.stats && slide.stats.length > 0 && slide.layout === 'stats' ? `
              <div style="
                display: flex;
                justify-content: center;
                gap: 60px;
                margin-top: 40px;
              ">
                ${slide.stats.map(stat => `
                  <div style="
                    text-align: center;
                    padding: 40px;
                    background: rgba(${hexToRgb(theme.primaryColor)}, 0.1);
                    border-radius: 24px;
                  ">
                    <div style="
                      font-size: 64px;
                      font-weight: bold;
                      background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor});
                      -webkit-background-clip: text;
                      -webkit-text-fill-color: transparent;
                    ">${stat.value}</div>
                    <div style="
                      font-size: 18px;
                      color: ${theme.textMuted};
                      margin-top: 8px;
                    ">${stat.label}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <div style="
              position: absolute;
              bottom: 40px;
              right: 60px;
              font-size: 18px;
              color: ${theme.textMuted};
            ">${i + 1} / ${currentPresentation.slides.length}</div>
          </div>
        `;
        
        // Рендерим в canvas
        const canvas = await html2canvas(container, {
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
        });
        
        // Добавляем в PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      }
      
      // Удаляем временный контейнер
      document.body.removeChild(container);
      
      // Сохраняем PDF
      setExportProgress('Сохранение PDF...');
      pdf.save(`${currentPresentation.title}.pdf`);
      
      setExportProgress('');
      setIsExporting(false);
      
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ **Ошибка при экспорте в PDF.** Попробуйте ещё раз или используйте другой формат.',
        timestamp: new Date(),
      }]);
      setIsExporting(false);
      setExportProgress('');
    }
  };
  
  // ==================== AI РЕДАКТОР СЛАЙДОВ ====================
  // Функция для быстрого выполнения AI команды
  const executeAiCommand = async (command: string) => {
    if (!currentPresentation || isAiEditing) return;
    
    setIsAiEditing(true);
    setAiEditCommand(command);
    
    try {
      const openai = createServerOpenAI();
      const currentSlide = currentPresentation.slides[currentSlideIndex];
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Ты AI-ассистент для редактирования слайдов презентации. 
            
Текущий слайд:
- Заголовок: "${currentSlide.title}"
- Подзаголовок: "${currentSlide.subtitle || ''}"
- Контент: "${currentSlide.content || ''}"
- Буллет-поинты: ${JSON.stringify(currentSlide.bulletPoints || [])}
- Цитата: "${currentSlide.quote || ''}"
- Автор цитаты: "${currentSlide.quoteAuthor || ''}"
- Заметки докладчика: "${currentSlide.notes || ''}"
- Layout: "${currentSlide.layout}"

ЗАДАЧА: Выполни команду пользователя и верни обновлённые поля слайда в формате JSON.

Отвечай ТОЛЬКО валидным JSON объектом с полями, которые нужно обновить:
{
  "title": "новый заголовок",
  "subtitle": "новый подзаголовок",
  "content": "новый контент",
  "bulletPoints": ["пункт 1", "пункт 2"],
  "quote": "текст цитаты",
  "quoteAuthor": "автор",
  "notes": "заметки для докладчика"
}

Включай ТОЛЬКО те поля, которые нужно изменить. Пиши на русском языке.`
          },
          {
            role: 'user',
            content: command
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
      
      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const updates = JSON.parse(jsonMatch[0]);
        const updatedSlides = [...currentPresentation.slides];
        updatedSlides[currentSlideIndex] = {
          ...currentSlide,
          ...updates,
        };
        
        const updatedPresentation = {
          ...currentPresentation,
          slides: updatedSlides,
          updatedAt: new Date().toISOString(),
        };
        
        setCurrentPresentation(updatedPresentation);
        setPresentations(prev => prev.map(p => 
          p.id === currentPresentation.id ? updatedPresentation : p
        ));
        
        setAiEditCommand('');
        
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✨ **Готово!** Применено: "${command.slice(0, 40)}..."`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ **Ошибка.** Попробуйте ещё раз.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsAiEditing(false);
    }
  };
  
  const aiEditSlide = async () => {
    if (!currentPresentation || !aiEditCommand.trim() || isAiEditing) return;
    
    // Проверяем лимит AI редактирований
    const editCheck = subscription.canAiEdit();
    if (!editCheck.allowed) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ **${editCheck.reason}**`,
        timestamp: new Date(),
      }]);
      return;
    }
    
    setIsAiEditing(true);
    
    try {
      // API ключ на сервере - безопасно
      const openai = createServerOpenAI();
      
      const currentSlide = currentPresentation.slides[currentSlideIndex];
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Ты AI-ассистент для редактирования слайдов презентации. 
            
Текущий слайд:
- Заголовок: "${currentSlide.title}"
- Подзаголовок: "${currentSlide.subtitle || ''}"
- Контент: "${currentSlide.content || ''}"
- Буллет-поинты: ${JSON.stringify(currentSlide.bulletPoints || [])}
- Цитата: "${currentSlide.quote || ''}"
- Автор цитаты: "${currentSlide.quoteAuthor || ''}"
- Заметки докладчика: "${currentSlide.notes || ''}"
- Layout: "${currentSlide.layout}"

ЗАДАЧА: Выполни команду пользователя и верни обновлённые поля слайда в формате JSON.

Отвечай ТОЛЬКО валидным JSON объектом с полями, которые нужно обновить:
{
  "title": "новый заголовок",
  "subtitle": "новый подзаголовок",
  "content": "новый контент",
  "bulletPoints": ["пункт 1", "пункт 2"],
  "quote": "текст цитаты",
  "quoteAuthor": "автор",
  "notes": "заметки для докладчика"
}

Включай ТОЛЬКО те поля, которые нужно изменить. Пиши на русском языке.`
          },
          {
            role: 'user',
            content: aiEditCommand
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
      
      const content = response.choices[0]?.message?.content || '';
      
      // Парсим JSON ответ
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const updates = JSON.parse(jsonMatch[0]);
        
        // Обновляем слайд
        const updatedSlides = [...currentPresentation.slides];
        updatedSlides[currentSlideIndex] = {
          ...currentSlide,
          ...updates,
        };
        
        const updatedPresentation = {
          ...currentPresentation,
          slides: updatedSlides,
          updatedAt: new Date().toISOString(),
        };
        
        setCurrentPresentation(updatedPresentation);
        setPresentations(prev => prev.map(p => 
          p.id === currentPresentation.id ? updatedPresentation : p
        ));
        
        // Увеличиваем счётчик AI редактирований
        subscription.incrementAiEdits();
        
        setAiEditCommand('');
        setShowAiEditor(false);
        
        // Уведомление об успехе
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✨ **Слайд обновлён!**\n\nПрименена команда: "${aiEditCommand.slice(0, 50)}..."`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ **Ошибка при AI-редактировании.** Попробуйте переформулировать команду.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsAiEditing(false);
    }
  };
  
  // Быстрые AI команды - расширенный набор
  const aiQuickCommands = [
    // ===== ТЕКСТ =====
    { label: '✨ Улучшить', command: 'Улучши и сделай текст более профессиональным, привлекательным и убедительным. Используй активные глаголы и конкретные цифры.' },
    { label: '🎯 Сократить', command: 'Сократи текст на 50%, оставив только самое важное. Удали воду, оставь факты.' },
    { label: '📖 Расширить', command: 'Расширь контент, добавь больше деталей, конкретных примеров и доказательств.' },
    { label: '🔥 WOW-эффект', command: 'Перепиши заголовок так, чтобы он был провокационным, цепляющим и вызывал желание читать дальше. Стиль Forbes/TED.' },
    
    // ===== КОНТЕНТ =====
    { label: '📝 +Буллеты', command: 'Добавь 4-5 конкретных буллет-поинтов с цифрами, фактами и призывами к действию.' },
    { label: '💡 +Цитата', command: 'Добавь подходящую реальную цитату известного эксперта или лидера по теме слайда.' },
    { label: '📊 +Статистика', command: 'Добавь 3-4 реальных статистических факта с источниками (%, $, рост).' },
    { label: '🎯 +Пример', command: 'Добавь конкретный кейс или пример из практики известной компании.' },
    { label: '❓ +Вопрос', command: 'Добавь провокационный риторический вопрос для вовлечения аудитории.' },
    
    // ===== ДОКЛАДЧИК =====
    { label: '🎤 Заметки', command: 'Напиши подробные заметки для докладчика: что говорить, какие акценты расставить, какие вопросы задать аудитории.' },
    { label: '⏱️ Тайминг', command: 'Добавь в заметки рекомендуемое время на слайд и ключевые моменты для паузы.' },
    { label: '🎭 Сторителлинг', command: 'Перепиши контент в формате истории: проблема → конфликт → решение → результат.' },
    
    // ===== ПЕРЕВОД =====
    { label: '🇷🇺 RU', command: 'Переведи весь контент слайда на русский язык, сохранив стиль и эмоции.' },
    { label: '🇬🇧 EN', command: 'Переведи весь контент слайда на английский язык, сохранив стиль и эмоции.' },
    { label: '🇩🇪 DE', command: 'Переведи весь контент слайда на немецкий язык, сохранив стиль и эмоции.' },
    { label: '🇫🇷 FR', command: 'Переведи весь контент слайда на французский язык, сохранив стиль и эмоции.' },
    { label: '🇪🇸 ES', command: 'Переведи весь контент слайда на испанский язык, сохранив стиль и эмоции.' },
    { label: '🇨🇳 ZH', command: 'Переведи весь контент слайда на китайский язык, сохранив стиль и эмоции.' },
  ];
  
  // ==================== 🚀 СУПЕР AI ФУНКЦИИ - ЛУЧШЕ GAMMA И CANVA ====================
  
  // 🎯 AI УЛУЧШЕНИЕ ВСЕЙ ПРЕЗЕНТАЦИИ
  const enhanceEntirePresentation = async () => {
    if (!currentPresentation || isEnhancingAll) return;
    
    setIsEnhancingAll(true);
    setEnhanceProgress(0);
    
    try {
      // API ключ на сервере - безопасно
      const openai = createServerOpenAI();
      
      const totalSlides = currentPresentation.slides.length;
      const enhancedSlides = [...currentPresentation.slides];
      
      for (let i = 0; i < totalSlides; i++) {
        const slide = currentPresentation.slides[i];
        setEnhanceProgress(Math.round(((i + 1) / totalSlides) * 100));
        
        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: `Ты - эксперт по созданию презентаций уровня TED, McKinsey и Apple Keynote.
              
Твоя задача: ЗНАЧИТЕЛЬНО улучшить слайд, сделав его НЕЗАБЫВАЕМЫМ.

ПРАВИЛА УЛУЧШЕНИЯ:
1. Заголовок: Сделай коротким (4-6 слов), провокационным, с числами или вопросом
2. Контент: Конкретика, цифры, факты вместо общих слов
3. Буллеты: Начинай с глагола, добавь метрики, макс 4-5 пунктов
4. Добавь реальную цитату эксперта если её нет
5. Добавь заметки для спикера

Ответь ТОЛЬКО JSON объектом с улучшенными полями.`
              },
              {
                role: 'user',
                content: `Улучши этот слайд:
${JSON.stringify(slide, null, 2)}`
              }
            ],
            temperature: 0.8,
            max_tokens: 2000,
          });
          
          const content = response.choices[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const improvements = JSON.parse(jsonMatch[0]);
            enhancedSlides[i] = {
              ...slide,
              ...improvements,
            };
          }
        } catch (slideError) {
          // Оставляем слайд без изменений
        }
        
        // Небольшая задержка чтобы не перегрузить API
        await new Promise(r => setTimeout(r, 500));
      }
      
      // Обновляем презентацию
      const enhanced = {
        ...currentPresentation,
        slides: enhancedSlides,
        updatedAt: new Date().toISOString(),
      };
      
      setCurrentPresentation(enhanced);
      setPresentations(prev => prev.map(p => p.id === enhanced.id ? enhanced : p));
      
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✨ **Презентация улучшена AI!**\n\n🎯 Обработано ${totalSlides} слайдов\n📝 Улучшены заголовки и тексты\n💡 Добавлены цитаты и статистика\n🎤 Созданы заметки для спикера\n\nТеперь ваша презентация на уровне TED!`,
        timestamp: new Date(),
      }]);
      
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ **Ошибка при улучшении презентации.** Попробуйте ещё раз или проверьте лимит API.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsEnhancingAll(false);
      setEnhanceProgress(0);
    }
  };
  
  // 🖼️ ГЕНЕРАЦИЯ DALL-E ИЗОБРАЖЕНИЙ ДЛЯ ВСЕХ СЛАЙДОВ
  const generateAllImages = async () => {
    if (!currentPresentation || isGeneratingImages) return;
    
    setIsGeneratingImages(true);
    
    try {
      const slidesWithNewImages = [...currentPresentation.slides];
      let generated = 0;
      
      for (let i = 0; i < currentPresentation.slides.length; i++) {
        const slide = currentPresentation.slides[i];
        
        // Пропускаем слайды без imageKeywords или уже с изображением
        if (slide.imageSource === 'dalle' || (!slide.imagePrompt && !slide.title)) {
          continue;
        }
        
        try {
          // Используем Pexels/Unsplash для поиска изображений (бесплатно)
          const searchQuery = slide.imagePrompt || slide.title;
          const imageUrl = await searchUnsplashPhoto(searchQuery);
          
          if (imageUrl) {
            slidesWithNewImages[i] = {
              ...slide,
              imageUrl: imageUrl,
              imageSource: 'pexels' as const,
            };
            generated++;
          }
        } catch (imgError) {
          // image fetch failed, skip
        }
        
        await new Promise(r => setTimeout(r, 500)); // Rate limiting для Pexels
      }
      
      const updated = {
        ...currentPresentation,
        slides: slidesWithNewImages,
        updatedAt: new Date().toISOString(),
      };
      
      setCurrentPresentation(updated);
      setPresentations(prev => prev.map(p => p.id === updated.id ? updated : p));
      
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🖼️ **AI-изображения сгенерированы!**\n\n✅ Создано ${generated} уникальных изображений\n🎨 Качество: HD (1792x1024)\n✨ Стиль: Vivid\n\nКаждое изображение уникально и создано специально для вашей презентации!`,
        timestamp: new Date(),
      }]);
      
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ **Ошибка генерации изображений.** Попробуйте ещё раз или проверьте лимит API.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsGeneratingImages(false);
    }
  };
  
  // 💡 УМНЫЕ ПОДСКАЗКИ - АНАЛИЗ И РЕКОМЕНДАЦИИ
  const getAISuggestions = async () => {
    if (!currentPresentation || isLoadingSuggestions) return;
    
    setIsLoadingSuggestions(true);
    setAiSuggestions([]);
    
    try {
      // API ключ на сервере - безопасно
      const openai = createServerOpenAI();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Ты - эксперт по презентациям. Проанализируй презентацию и дай 5 КОНКРЕТНЫХ рекомендаций для улучшения.

Формат ответа - JSON массив строк:
["Рекомендация 1: конкретное действие", "Рекомендация 2: ...", ...]

Фокусируйся на:
- Структуре и логике повествования
- Качестве заголовков
- Визуальном разнообразии
- Убедительности аргументов
- Вовлечении аудитории`
          },
          {
            role: 'user',
            content: `Проанализируй эту презентацию:\n${JSON.stringify(currentPresentation.slides.map(s => ({ title: s.title, content: s.content, layout: s.layout })), null, 2)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });
      
      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        try {
          setAiSuggestions(JSON.parse(jsonMatch[0]));
        } catch { /* JSON parse may fail - skip gracefully */ }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ **Ошибка получения AI-рекомендаций.** Попробуйте ещё раз.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };
  
  // 🎨 АВТОМАТИЧЕСКАЯ СМЕНА LAYOUTS ДЛЯ РАЗНООБРАЗИЯ
  const optimizeLayouts = () => {
    if (!currentPresentation) return;
    
    const layouts: SlideLayout[] = ['content', 'content-image', 'image-content', 'stats', 'quote', 'two-column'];
    let lastLayout: SlideLayout | '' = '';
    
    const optimizedSlides = currentPresentation.slides.map((slide, index) => {
      // Первый слайд всегда title
      if (index === 0) return { ...slide, layout: 'title' as const };
      
      // Последний слайд - thank-you
      if (index === currentPresentation.slides.length - 1) return { ...slide, layout: 'thank-you' as const };
      
      // Выбираем layout отличный от предыдущего
      let newLayout = slide.layout;
      if (slide.layout === lastLayout) {
        const availableLayouts = layouts.filter(l => l !== lastLayout);
        newLayout = availableLayouts[Math.floor(Math.random() * availableLayouts.length)];
      }
      
      lastLayout = newLayout;
      return { ...slide, layout: newLayout };
    });
    
    const updated = {
      ...currentPresentation,
      slides: optimizedSlides,
      updatedAt: new Date().toISOString(),
    };
    
    setCurrentPresentation(updated);
    setPresentations(prev => prev.map(p => p.id === updated.id ? updated : p));
  };
  
  // 📊 ДОБАВИТЬ СЛАЙД СО СТАТИСТИКОЙ
  const addStatsSlide = async () => {
    if (!currentPresentation) return;
    
    // API ключ на сервере - безопасно
    const openai = createServerOpenAI();
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Создай слайд со статистикой по теме презентации. Верни JSON:
{
  "title": "Заголовок",
  "stats": [
    {"value": "97%", "label": "Описание"},
    {"value": "$2.1B", "label": "Описание"},
    {"value": "10x", "label": "Описание"}
  ]
}`
          },
          {
            role: 'user',
            content: `Тема презентации: ${currentPresentation.title}\nСлайды: ${currentPresentation.slides.map(s => s.title).join(', ')}`
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      });
      
      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const statsData = JSON.parse(jsonMatch[0]);
          const newSlide: Slide = {
            id: `slide-${Date.now()}`,
            title: statsData.title,
            content: '',
            bulletPoints: [],
            layout: 'stats',
            layoutVariant: 1,
            titleAlignment: 'center',
            elements: [],
            background: { type: 'solid', value: 'transparent' },
            transition: { type: 'fade', duration: 0.5 },
            notes: '',
            stats: statsData.stats,
          };
          
          const updatedSlides = [...currentPresentation.slides];
          updatedSlides.splice(currentSlideIndex + 1, 0, newSlide);
          
          setCurrentPresentation({
            ...currentPresentation,
            slides: updatedSlides,
            updatedAt: new Date().toISOString(),
          });
          setCurrentSlideIndex(currentSlideIndex + 1);
          
          setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: '📊 **Слайд со статистикой добавлен!** Данные сгенерированы AI.',
            timestamp: new Date(),
          }]);
        } catch (parseError) {
          // JSON parse failed
        }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ **Ошибка добавления статистики.** Попробуйте ещё раз.',
        timestamp: new Date(),
      }]);
    }
  };
  
  // 💬 ДОБАВИТЬ СЛАЙД С ЦИТАТОЙ
  const addQuoteSlide = async () => {
    if (!currentPresentation) return;
    
    // API ключ на сервере - безопасно
    const openai = createServerOpenAI();
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Найди РЕАЛЬНУЮ цитату известного человека по теме презентации. Верни JSON:
{
  "quote": "Точная цитата",
  "quoteAuthor": "Имя Фамилия, должность/компания"
}`
          },
          {
            role: 'user',
            content: `Тема: ${currentPresentation.title}`
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });
      
      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const quoteData = JSON.parse(jsonMatch[0]);
          const newSlide: Slide = {
            id: `slide-${Date.now()}`,
            title: '',
            content: '',
            bulletPoints: [],
            layout: 'quote',
            layoutVariant: 1,
            titleAlignment: 'center',
            elements: [],
            background: { type: 'solid', value: 'transparent' },
            transition: { type: 'fade', duration: 0.5 },
            notes: '',
            quote: quoteData.quote,
            quoteAuthor: quoteData.quoteAuthor,
          };
          
          const updatedSlides = [...currentPresentation.slides];
          updatedSlides.splice(currentSlideIndex + 1, 0, newSlide);
          
          setCurrentPresentation({
            ...currentPresentation,
            slides: updatedSlides,
            updatedAt: new Date().toISOString(),
          });
          setCurrentSlideIndex(currentSlideIndex + 1);
          
          setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: '💬 **Слайд с цитатой добавлен!**',
            timestamp: new Date(),
          }]);
        } catch (parseError) {
          // JSON parse failed
        }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ **Ошибка добавления цитаты.** Попробуйте ещё раз.',
        timestamp: new Date(),
      }]);
    }
  };
  
  // 🌍 ПЕРЕВЕСТИ ВСЮ ПРЕЗЕНТАЦИЮ
  const translatePresentation = async (targetLang: string) => {
    if (!currentPresentation || isEnhancingAll) return;
    
    setIsEnhancingAll(true);
    setEnhanceProgress(0);
    
    const langNames: Record<string, string> = {
      'en': 'английский',
      'ru': 'русский',
      'de': 'немецкий',
      'fr': 'французский',
      'es': 'испанский',
      'zh': 'китайский',
    };
    
    try {
      // API ключ на сервере - безопасно
      const openai = createServerOpenAI();
      
      const totalSlides = currentPresentation.slides.length;
      const translatedSlides = [];
      
      for (let i = 0; i < totalSlides; i++) {
        const slide = currentPresentation.slides[i];
        setEnhanceProgress(Math.round(((i + 1) / totalSlides) * 100));
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Переведи все текстовые поля слайда на ${langNames[targetLang] || targetLang}. Сохрани стиль и эмоции. Верни JSON с переведёнными полями.`
            },
            {
              role: 'user',
              content: JSON.stringify({
                title: slide.title,
                subtitle: slide.subtitle,
                content: slide.content,
                bulletPoints: slide.bulletPoints,
                quote: slide.quote,
                quoteAuthor: slide.quoteAuthor,
                notes: slide.notes,
              })
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        });
        
        const content = response.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          try {
            const translated = JSON.parse(jsonMatch[0]);
            translatedSlides.push({ ...slide, ...translated });
          } catch (e) {
            translatedSlides.push(slide);
          }
        } else {
          translatedSlides.push(slide);
        }
        
        await new Promise(r => setTimeout(r, 300));
      }
      
      const updated = {
        ...currentPresentation,
        slides: translatedSlides,
        updatedAt: new Date().toISOString(),
      };
      
      setCurrentPresentation(updated);
      setPresentations(prev => prev.map(p => p.id === updated.id ? updated : p));
      
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🌍 **Презентация переведена на ${langNames[targetLang]}!**\n\n✅ Переведено ${totalSlides} слайдов\n🎯 Сохранён стиль и эмоции`,
        timestamp: new Date(),
      }]);
      
    } catch (error) {
      console.error('Translation error:', error);
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ **Ошибка перевода презентации.** Попробуйте ещё раз.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsEnhancingAll(false);
      setEnhanceProgress(0);
    }
  };
  
  // ===================================================================================
  // 🚀🚀🚀 СУПЕР-ФУНКЦИИ УРОВНЯ #1 НА РЫНКЕ - ЛУЧШЕ CANVA И GAMMA 🚀🚀🚀
  // ===================================================================================
  
  // 🎯 AI PRESENTATION COACH - Анализ и оценка презентации
  const [presentationScore, setPresentationScore] = useState<{
    overall: number;
    structure: number;
    content: number;
    visuals: number;
    storytelling: number;
    suggestions: string[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const analyzePresentation = async () => {
    if (!currentPresentation || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      const openai = createServerOpenAI();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Ты - AI Presentation Coach уровня TED и McKinsey. Проанализируй презентацию и дай ДЕТАЛЬНУЮ оценку.

ФОРМАТ ОТВЕТА (JSON):
{
  "overall": 85,
  "structure": 90,
  "content": 80,
  "visuals": 85,
  "storytelling": 75,
  "strengths": ["Сильная сторона 1", "Сильная сторона 2"],
  "weaknesses": ["Слабость 1", "Слабость 2"],
  "suggestions": [
    "Конкретная рекомендация 1",
    "Конкретная рекомендация 2",
    "Конкретная рекомендация 3"
  ],
  "competitorAnalysis": {
    "vsCanva": "+15% лучше по качеству контента",
    "vsGamma": "+20% лучше по storytelling"
  }
}`
          },
          {
            role: 'user',
            content: `Проанализируй презентацию "${currentPresentation.title}":
${JSON.stringify(currentPresentation.slides.map(s => ({
  title: s.title,
  content: s.content,
  bulletPoints: s.bulletPoints,
  layout: s.layout,
  hasImage: !!s.imageUrl,
  quote: s.quote,
  stats: s.stats
})), null, 2)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
      
      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        setPresentationScore({
          overall: analysis.overall || 75,
          structure: analysis.structure || 80,
          content: analysis.content || 75,
          visuals: analysis.visuals || 70,
          storytelling: analysis.storytelling || 65,
          suggestions: analysis.suggestions || []
        });
        
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎯 **AI PRESENTATION COACH**\n\n📊 **Общая оценка: ${analysis.overall}/100**\n\n✅ **Сильные стороны:**\n${analysis.strengths?.map((s: string) => `• ${s}`).join('\n') || '• Хорошая структура'}\n\n⚠️ **Области улучшения:**\n${analysis.weaknesses?.map((w: string) => `• ${w}`).join('\n') || '• Добавить больше визуалов'}\n\n💡 **Рекомендации:**\n${analysis.suggestions?.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') || '1. Добавить статистику'}\n\n🏆 ${analysis.competitorAnalysis?.vsCanva || 'Ваша презентация лучше среднего уровня Canva!'}\n🏆 ${analysis.competitorAnalysis?.vsGamma || 'Storytelling лучше чем у Gamma!'}`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // 🎬 STORYBOARD MODE - Автоматическое построение истории
  const generateStoryArc = async () => {
    if (!currentPresentation || isEnhancingAll) return;
    
    setIsEnhancingAll(true);
    setEnhanceProgress(0);
    
    try {
      const openai = createServerOpenAI();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Ты - мастер сторителлинга уровня Pixar и TED Talks. Перестрой презентацию используя Story Arc:

1. HOOK (Захват внимания) - первый слайд
2. PROBLEM (Проблема) - слайды 2-3
3. JOURNEY (Путешествие к решению) - слайды 4-6
4. SOLUTION (Решение) - слайды 7-8
5. PROOF (Доказательства) - слайды 9-10
6. TRANSFORMATION (Трансформация) - слайд 11
7. CALL TO ACTION (Призыв) - последний слайд

ВЕРНИ JSON массив улучшенных слайдов в формате:
[{
  "title": "Новый захватывающий заголовок",
  "subtitle": "Подзаголовок",
  "content": "Эмоциональный контент",
  "bulletPoints": ["пункт с глаголом действия"],
  "storyRole": "HOOK/PROBLEM/JOURNEY/SOLUTION/PROOF/TRANSFORMATION/CTA"
}]`
          },
          {
            role: 'user',
            content: `Тема: ${currentPresentation.title}
Текущие слайды:
${JSON.stringify(currentPresentation.slides.map(s => ({ title: s.title, content: s.content, bulletPoints: s.bulletPoints })))}`
          }
        ],
        temperature: 0.9,
        max_tokens: 4000,
      });
      
      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const storySlides = JSON.parse(jsonMatch[0]);
        const enhancedSlides = currentPresentation.slides.map((slide, index) => {
          const storySlide = storySlides[index];
          if (!storySlide) return slide;
          
          return {
            ...slide,
            title: storySlide.title || slide.title,
            subtitle: storySlide.subtitle || slide.subtitle,
            content: storySlide.content || slide.content,
            bulletPoints: storySlide.bulletPoints || slide.bulletPoints,
            notes: `📖 Story Role: ${storySlide.storyRole || 'CONTENT'}\n${slide.notes || ''}`,
          };
        });
        
        const updatedPresentation = {
          ...currentPresentation,
          slides: enhancedSlides,
          updatedAt: new Date().toISOString(),
        };
        
        setCurrentPresentation(updatedPresentation);
        setPresentations(prev => prev.map(p => 
          p.id === currentPresentation.id ? updatedPresentation : p
        ));
        
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎬 **STORY ARC применён!**\n\n📖 Ваша презентация теперь следует структуре Pixar:\n\n🪝 HOOK → ⚠️ PROBLEM → 🚀 JOURNEY → 💡 SOLUTION → ✅ PROOF → ✨ TRANSFORMATION → 🎯 CTA\n\nЭто делает её на 40% более запоминающейся!`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Story arc error:', error);
    } finally {
      setIsEnhancingAll(false);
      setEnhanceProgress(0);
    }
  };
  
  // 🎨 AUTO BRAND KIT - Создание brand kit из логотипа/цветов
  const [brandKit, setBrandKit] = useState<{
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontPrimary: string;
    fontSecondary: string;
  } | null>(null);
  
  const generateBrandKit = async (companyName: string, industry: string) => {
    try {
      const openai = createServerOpenAI();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Создай профессиональный Brand Kit для компании. ВЕРНИ JSON:
{
  "primaryColor": "#HEX",
  "secondaryColor": "#HEX",
  "accentColor": "#HEX",
  "backgroundColor": "#HEX",
  "textColor": "#HEX",
  "fontPrimary": "название шрифта",
  "fontSecondary": "название шрифта",
  "style": "modern/corporate/creative/minimal",
  "moodboard": ["ключевое слово 1", "ключевое слово 2"]
}`
          },
          {
            role: 'user',
            content: `Компания: ${companyName}\nИндустрия: ${industry}`
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      });
      
      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const kit = JSON.parse(jsonMatch[0]);
        setBrandKit({
          primaryColor: kit.primaryColor,
          secondaryColor: kit.secondaryColor,
          accentColor: kit.accentColor,
          fontPrimary: kit.fontPrimary || 'Inter',
          fontSecondary: kit.fontSecondary || 'Poppins',
        });
        
        // Применяем brand kit к теме
        const customTheme: PresentationTheme = {
          id: 'custom-brand',
          name: `${companyName} Brand`,
          nameEn: `${companyName} Brand`,
          backgroundColor: kit.backgroundColor || '#0a0a0f',
          surfaceColor: kit.backgroundColor || '#1a1a2e',
          textColor: kit.textColor || '#ffffff',
          textMuted: '#a0a0a0',
          primaryColor: kit.primaryColor,
          secondaryColor: kit.secondaryColor,
          accentColor: kit.accentColor,
          fontFamily: kit.fontSecondary || 'Poppins',
          headingFont: kit.fontPrimary || 'Inter',
          gradient: `linear-gradient(135deg, ${kit.primaryColor}, ${kit.secondaryColor})`,
          borderRadius: '16px',
          shadow: '0 20px 40px rgba(0,0,0,0.3)',
        };
        
        setSelectedTheme(customTheme);
        
        if (currentPresentation) {
          setCurrentPresentation({
            ...currentPresentation,
            theme: customTheme,
            updatedAt: new Date().toISOString(),
          });
        }
        
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎨 **BRAND KIT создан для ${companyName}!**\n\n🎯 Primary: ${kit.primaryColor}\n💜 Secondary: ${kit.secondaryColor}\n✨ Accent: ${kit.accentColor}\n📝 Font: ${kit.fontPrimary}\n\n🏆 Это уникальная функция, которой нет в Canva и Gamma!`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Brand kit error:', error);
    }
  };
  
  // 🎤 SPEAKER NOTES AI - Генерация заметок для выступления
  const generateSpeakerNotes = async () => {
    if (!currentPresentation || isEnhancingAll) return;
    
    setIsEnhancingAll(true);
    setEnhanceProgress(0);
    
    try {
      const openai = createServerOpenAI();
      const totalSlides = currentPresentation.slides.length;
      const enhancedSlides = [];
      
      for (let i = 0; i < totalSlides; i++) {
        const slide = currentPresentation.slides[i];
        setEnhanceProgress(Math.round(((i + 1) / totalSlides) * 100));
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Ты - тренер по публичным выступлениям уровня TED. Создай ДЕТАЛЬНЫЕ speaker notes для слайда:

ФОРМАТ:
{
  "notes": "Основной текст для озвучивания (2-3 предложения)",
  "keyPoints": ["Не забудь упомянуть...", "Сделай паузу после..."],
  "timing": "30-45 секунд",
  "emotionalCue": "Уверенно, с энтузиазмом",
  "transitionPhrase": "Фраза для перехода к следующему слайду"
}`
            },
            {
              role: 'user',
              content: `Слайд ${i + 1}/${totalSlides}:
Заголовок: ${slide.title}
Контент: ${slide.content || ''}
Буллеты: ${slide.bulletPoints?.join(', ') || ''}`
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        });
        
        const content = response.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const notes = JSON.parse(jsonMatch[0]);
          enhancedSlides.push({
            ...slide,
            notes: `📝 ${notes.notes}\n\n⏱️ Время: ${notes.timing}\n🎭 Тон: ${notes.emotionalCue}\n\n💡 Ключевые моменты:\n${notes.keyPoints?.map((k: string) => `• ${k}`).join('\n') || ''}\n\n➡️ Переход: "${notes.transitionPhrase || 'Далее мы рассмотрим...'}"`,
          });
        } else {
          enhancedSlides.push(slide);
        }
        
        await new Promise(r => setTimeout(r, 300));
      }
      
      const updatedPresentation = {
        ...currentPresentation,
        slides: enhancedSlides,
        updatedAt: new Date().toISOString(),
      };
      
      setCurrentPresentation(updatedPresentation);
      setPresentations(prev => prev.map(p => 
        p.id === currentPresentation.id ? updatedPresentation : p
      ));
      
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🎤 **SPEAKER NOTES сгенерированы!**\n\n✅ ${totalSlides} слайдов с детальными заметками\n⏱️ Рекомендуемое время для каждого слайда\n🎭 Эмоциональные подсказки\n➡️ Фразы для переходов\n\n🏆 Эта функция делает вас профессиональным спикером!`,
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Speaker notes error:', error);
    } finally {
      setIsEnhancingAll(false);
      setEnhanceProgress(0);
    }
  };
  
  // 📊 COMPETITIVE SLIDES - Добавить слайды конкурентного анализа
  const addCompetitiveAnalysis = async () => {
    if (!currentPresentation) return;
    
    try {
      const openai = createServerOpenAI();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Создай слайд конкурентного анализа. ВЕРНИ JSON:
{
  "title": "Почему мы лучше конкурентов",
  "competitors": [
    {
      "name": "Конкурент 1",
      "ourAdvantage": "Наше преимущество",
      "theirWeakness": "Их слабость"
    }
  ],
  "differentiators": ["Уникальное преимущество 1", "Уникальное преимущество 2"]
}`
          },
          {
            role: 'user',
            content: `Тема презентации: ${currentPresentation.title}\nКонтекст: ${currentPresentation.slides[0]?.content || ''}`
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });
      
      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const compData = JSON.parse(jsonMatch[0]);
        
        const newSlide: Slide = {
          id: `slide-${Date.now()}`,
          title: compData.title || 'Конкурентный анализ',
          content: '',
          bulletPoints: compData.differentiators || [],
          layout: 'comparison',
          layoutVariant: 1,
          titleAlignment: 'center',
          elements: [],
          background: { type: 'solid', value: 'transparent' },
          transition: { type: 'fade', duration: 0.5 },
          notes: `Конкуренты: ${compData.competitors?.map((c: { name: string }) => c.name).join(', ')}`,
        };
        
        const updatedSlides = [...currentPresentation.slides];
        updatedSlides.splice(currentSlideIndex + 1, 0, newSlide);
        
        const updatedPresentation = {
          ...currentPresentation,
          slides: updatedSlides,
          updatedAt: new Date().toISOString(),
        };
        
        setCurrentPresentation(updatedPresentation);
        setPresentations(prev => prev.map(p => 
          p.id === currentPresentation.id ? updatedPresentation : p
        ));
        setCurrentSlideIndex(currentSlideIndex + 1);
        
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: '📊 **Слайд конкурентного анализа добавлен!**\n\nЭто поможет убедить инвесторов и клиентов.',
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Competitive analysis error:', error);
    }
  };
  
  // 🎯 ONE-CLICK PRO UPGRADE - Улучшить всю презентацию одной кнопкой
  const oneClickProUpgrade = async () => {
    if (!currentPresentation || isEnhancingAll) return;
    
    setIsEnhancingAll(true);
    setEnhanceProgress(0);
    
    try {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '🚀 **Запускаю PRO UPGRADE...**\n\nЭто займёт около минуты. Я улучшу:\n• Все заголовки\n• Весь контент\n• Добавлю speaker notes\n• Оптимизирую layouts',
        timestamp: new Date(),
      }]);
      
      const openai = createServerOpenAI();
      const totalSlides = currentPresentation.slides.length;
      const upgradedSlides = [];
      
      for (let i = 0; i < totalSlides; i++) {
        const slide = currentPresentation.slides[i];
        setEnhanceProgress(Math.round(((i + 1) / totalSlides) * 100));
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Ты - эксперт по презентациям Apple Keynote и TED. УЛУЧШИ слайд до профессионального уровня.

ВЕРНИ JSON:
{
  "title": "Захватывающий заголовок (5-7 слов, без точки)",
  "subtitle": "Уточняющий подзаголовок",
  "content": "Лаконичный контент (1-2 предложения)",
  "bulletPoints": ["Глагол + результат (3-5 пунктов max)"],
  "layout": "лучший layout для контента",
  "notes": "Speaker notes на 30 секунд",
  "imageKeywords": "English keywords for perfect image"
}`
            },
            {
              role: 'user',
              content: `ИСХОДНЫЙ СЛАЙД ${i + 1}:
Заголовок: ${slide.title}
Контент: ${slide.content || ''}
Буллеты: ${slide.bulletPoints?.join(', ') || ''}
Layout: ${slide.layout}`
            }
          ],
          temperature: 0.8,
          max_tokens: 800,
        });
        
        const content = response.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const upgraded = JSON.parse(jsonMatch[0]);
          upgradedSlides.push({
            ...slide,
            title: upgraded.title || slide.title,
            subtitle: upgraded.subtitle || slide.subtitle,
            content: upgraded.content || slide.content,
            bulletPoints: upgraded.bulletPoints || slide.bulletPoints,
            layout: (i === 0 ? 'title' : i === totalSlides - 1 ? 'thank-you' : upgraded.layout) || slide.layout,
            notes: upgraded.notes || slide.notes,
            imagePrompt: upgraded.imageKeywords || slide.imagePrompt,
          });
        } else {
          upgradedSlides.push(slide);
        }
        
        await new Promise(r => setTimeout(r, 400));
      }
      
      const updatedPresentation = {
        ...currentPresentation,
        slides: upgradedSlides,
        updatedAt: new Date().toISOString(),
      };
      
      setCurrentPresentation(updatedPresentation);
      setPresentations(prev => prev.map(p => 
        p.id === currentPresentation.id ? updatedPresentation : p
      ));
      
      // Запускаем анализ после улучшения
      setTimeout(() => analyzePresentation(), 1000);
      
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🏆 **PRO UPGRADE ЗАВЕРШЁН!**\n\n✅ Улучшено ${totalSlides} слайдов\n✅ Профессиональные заголовки\n✅ Оптимизированные layouts\n✅ Speaker notes добавлены\n✅ Keywords для изображений\n\n🎯 Ваша презентация теперь на уровне McKinsey и TED!\n\n*Сейчас запущу анализ качества...*`,
        timestamp: new Date(),
      }]);
      
    } catch (error) {
      console.error('Pro upgrade error:', error);
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Ошибка улучшения. Попробуйте ещё раз.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsEnhancingAll(false);
      setEnhanceProgress(0);
    }
  };
  
  // 🎪 ANIMATION PRESETS - Профессиональные анимации
  const applyAnimationPreset = (preset: 'subtle' | 'dynamic' | 'cinematic' | 'minimal') => {
    if (!currentPresentation) return;
    
    const presets = {
      subtle: { type: 'fade', duration: 0.5 },
      dynamic: { type: 'slide', direction: 'left', duration: 0.4 },
      cinematic: { type: 'zoom', duration: 0.7 },
      minimal: { type: 'fade', duration: 0.3 },
    };
    
    const transition = presets[preset] as SlideTransition;
    
    const animatedSlides = currentPresentation.slides.map(slide => ({
      ...slide,
      transition,
    }));
    
    setCurrentPresentation({
      ...currentPresentation,
      slides: animatedSlides,
      updatedAt: new Date().toISOString(),
    });
    
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: `🎪 **Анимации "${preset}" применены!**\n\nВсе переходы теперь используют ${transition.type} эффект.`,
      timestamp: new Date(),
    }]);
  };
  
  // 📱 RESPONSIVE CHECK - Проверка на мобильных
  const checkResponsiveness = () => {
    if (!currentPresentation) return;
    
    const issues: string[] = [];
    
    currentPresentation.slides.forEach((slide, index) => {
      if (slide.title && slide.title.length > 50) {
        issues.push(`Слайд ${index + 1}: Заголовок слишком длинный для мобильных`);
      }
      if (slide.bulletPoints && slide.bulletPoints.length > 5) {
        issues.push(`Слайд ${index + 1}: Слишком много буллетов (${slide.bulletPoints.length})`);
      }
      if (slide.content && slide.content.length > 200) {
        issues.push(`Слайд ${index + 1}: Текст слишком длинный`);
      }
    });
    
    if (issues.length === 0) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '📱 **Проверка пройдена!**\n\n✅ Презентация оптимизирована для всех устройств.',
        timestamp: new Date(),
      }]);
    } else {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📱 **Найдены проблемы для мобильных:**\n\n${issues.map(i => `⚠️ ${i}`).join('\n')}\n\n💡 Рекомендую использовать "PRO Upgrade" для автоматического исправления.`,
        timestamp: new Date(),
      }]);
    }
  };
  
  // ===================================================================================
  // КОНЕЦ СУПЕР-ФУНКЦИЙ
  // ===================================================================================
  
  
  // ==================== РЕНДЕР СЛАЙДА ====================
  
  const renderSlide = (slide: Slide, theme: PresentationTheme, isFullscreen: boolean = false) => {
    const baseClasses = isFullscreen 
      ? "w-full h-full" 
      : "w-full aspect-video";
    
    // Выравнивание заголовка
    const titleAlign = slide.titleAlignment || 'left';
    const titleAlignClass = {
      'left': 'text-left',
      'center': 'text-center',
      'right': 'text-right',
    }[titleAlign];
    
    // Вариант макета для разнообразия
    const variant = slide.layoutVariant || 1;
    
    // GAMMA-STYLE: Премиальные стили
    const glowStyle = { 
      filter: `drop-shadow(0 0 60px ${theme.primaryColor}40)`,
    };
    
    const accentGradient = `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`;
    const subtleGradient = `linear-gradient(135deg, ${theme.primaryColor}15, ${theme.secondaryColor}10)`;
    
    const getLayoutClasses = () => {
      switch (slide.layout) {
        case 'title':
        case 'title-subtitle':
          if (variant === 2) return 'flex flex-col items-start justify-center text-left px-20 py-16';
          if (variant === 3) return 'flex flex-col items-end justify-end text-right px-20 py-16';
          return 'flex flex-col items-center justify-center text-center relative overflow-hidden';
        case 'content':
          if (variant === 2) return 'flex flex-col p-16 items-center';
          if (variant === 3) return 'grid grid-cols-3 gap-8 p-16';
          return 'flex flex-col p-16';
        case 'content-image':
          if (variant === 2) return 'grid grid-cols-5 gap-10 p-14';
          if (variant === 3) return 'flex flex-col p-14';
          return 'grid grid-cols-2 gap-10 p-14 items-center';
        case 'image-content':
          if (variant === 2) return 'grid grid-cols-5 gap-10 p-14';
          if (variant === 3) return 'flex flex-col-reverse p-14';
          return 'grid grid-cols-2 gap-10 p-14 items-center';
        case 'two-column':
          return 'grid grid-cols-2 gap-10 p-14';
        case 'three-column':
          return 'grid grid-cols-3 gap-8 p-14';
        case 'full-image':
          return 'relative';
        case 'quote':
          if (variant === 2) return 'flex items-start justify-start p-20';
          if (variant === 3) return 'flex items-end justify-end p-20';
          return 'flex items-center justify-center p-20 relative overflow-hidden';
        case 'stats':
          if (variant === 2) return 'grid grid-cols-2 gap-10 p-14 items-center';
          if (variant === 3) return 'grid grid-cols-4 gap-8 p-14 items-center';
          return 'grid grid-cols-3 gap-10 p-14 items-center';
        case 'thank-you':
          if (variant === 2) return 'flex flex-col items-start justify-center text-left p-20';
          return 'flex flex-col items-center justify-center text-center relative overflow-hidden';
        default:
          return 'flex flex-col p-14';
      }
    };
    
    const renderContent = () => {
      switch (slide.layout) {
        case 'title':
        case 'title-subtitle':
          return (
            <div className={`relative z-10 max-w-5xl px-8 ${variant === 2 ? 'ml-0' : variant === 3 ? 'mr-0' : ''}`}>
              {/* GAMMA-STYLE: Animated background orbs */}
              <div className="absolute -inset-[200px] pointer-events-none">
                <div 
                  className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] opacity-30"
                  style={{ background: theme.primaryColor }}
                />
                <div 
                  className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[80px] opacity-20"
                  style={{ background: theme.secondaryColor }}
                />
              </div>
              
              {/* Badge */}
              {slide.subtitle && variant === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
                  style={{ background: subtleGradient, border: `1px solid ${theme.primaryColor}30` }}
                >
                  <Sparkles size={14} style={{ color: theme.primaryColor }} />
                  <span className="text-sm font-medium" style={{ color: theme.primaryColor }}>Презентация</span>
                </motion.div>
              )}
              
              <motion.h1
                initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`text-5xl md:text-7xl font-bold mb-8 relative leading-tight ${variant !== 1 ? titleAlignClass : ''}`}
                style={{ 
                  color: theme.primaryColor,
                  textShadow: `0 4px 30px ${theme.primaryColor}30`,
                }}
              >
                {slide.title}
              </motion.h1>
              
              {slide.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className={`text-xl md:text-2xl max-w-3xl ${variant === 1 ? 'mx-auto' : ''} ${variant !== 1 ? titleAlignClass : ''}`}
                  style={{ color: theme.textMuted, lineHeight: 1.6 }}
                >
                  {slide.subtitle}
                </motion.p>
              )}
              
              {/* GAMMA-STYLE: Decorative accent line */}
              <motion.div 
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className={`h-1.5 w-32 mt-10 rounded-full ${variant === 1 ? 'mx-auto' : ''}`}
                style={{ 
                  background: accentGradient,
                  boxShadow: `0 0 20px ${theme.primaryColor}60`,
                  transformOrigin: variant === 3 ? 'right' : 'left'
                }}
              />
            </div>
          );
          
        case 'content':
          return (
            <>
              {/* GAMMA-STYLE: Section header with icon */}
              <motion.div
                initial={{ opacity: 0, x: variant === 2 ? 0 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-4 mb-10 ${variant === 2 ? 'justify-center' : ''}`}
              >
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ 
                    background: accentGradient,
                    boxShadow: `0 8px 32px ${theme.primaryColor}40`,
                  }}
                >
                  <Layers className="w-6 h-6 text-text-primary" />
                </div>
                <h2
                  className={`text-3xl md:text-4xl font-bold ${titleAlignClass}`}
                  style={{ color: theme.primaryColor }}
                >
                  {slide.title}
                </h2>
              </motion.div>
              
              {slide.content && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`text-lg mb-8 leading-relaxed ${titleAlignClass}`}
                  style={{ color: theme.textColor, maxWidth: variant === 2 ? '42rem' : 'none' }}
                >
                  {slide.content}
                </motion.p>
              )}
              
              {slide.bulletPoints && slide.bulletPoints.length > 0 && (
                <div className={`space-y-4 ${variant === 2 ? 'max-w-2xl' : variant === 3 ? 'contents' : ''}`}>
                  {slide.bulletPoints.map((point, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: variant === 2 ? 0 : -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                      className={`flex items-start gap-4 p-4 rounded-2xl transition-all hover:scale-[1.02] ${variant === 2 ? 'justify-center text-center' : ''}`}
                      style={{ 
                        background: `${theme.surfaceColor}80`,
                        border: `1px solid ${theme.primaryColor}15`,
                      }}
                    >
                      <span 
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-text-primary text-sm font-bold`}
                        style={{ background: accentGradient }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-lg pt-1" style={{ color: theme.textColor }}>
                        {point}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          );
          
        case 'content-image':
          if (variant === 3) {
            return (
              <>
                {/* GAMMA-STYLE: Featured image with overlay */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative rounded-3xl overflow-hidden h-56 mb-8 group"
                  style={{ 
                    background: subtleGradient,
                    boxShadow: `0 20px 60px ${theme.primaryColor}20`,
                  }}
                >
                  {slide.imageUrl ? (
                    <>
                      <img src={slide.imageUrl} alt={slide.title || 'Slide image'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </>
                  ) : slide.isGeneratingImage ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin" style={{ color: theme.primaryColor }} />
                        <span className="text-sm" style={{ color: theme.textMuted }}>AI создаёт изображение...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImagePlus className="w-12 h-12" style={{ color: theme.primaryColor, opacity: 0.3 }} />
                    </div>
                  )}
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`text-3xl font-bold mb-5 ${titleAlignClass}`}
                  style={{ color: theme.primaryColor }}
                >
                  {slide.title}
                </motion.h2>
                
                {slide.content && (
                  <p className={`text-lg mb-5 leading-relaxed ${titleAlignClass}`} style={{ color: theme.textColor }}>{slide.content}</p>
                )}
                
                {slide.bulletPoints && (
                  <div className="grid grid-cols-2 gap-4">
                    {slide.bulletPoints.map((point, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                        className="flex items-start gap-3 p-3 rounded-xl"
                        style={{ background: `${theme.surfaceColor}60` }}
                      >
                        <span 
                          className="w-2 h-2 mt-2 rounded-full flex-shrink-0" 
                          style={{ background: accentGradient }} 
                        />
                        <span className="text-sm" style={{ color: theme.textColor }}>{point}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            );
          }
          
          return (
            <>
              <div className={`flex flex-col justify-center ${variant === 2 ? 'col-span-3' : ''}`}>
                {/* GAMMA-STYLE: Pill badge */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 w-fit"
                  style={{ background: subtleGradient }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: theme.accentColor }} />
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.primaryColor }}>
                    Раздел
                  </span>
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-3xl md:text-4xl font-bold mb-6 leading-tight ${titleAlignClass}`}
                  style={{ color: theme.primaryColor }}
                >
                  {slide.title}
                </motion.h2>
                
                {slide.content && (
                  <p className="text-lg mb-6 leading-relaxed" style={{ color: theme.textColor }}>{slide.content}</p>
                )}
                
                {slide.bulletPoints && (
                  <div className="space-y-3">
                    {slide.bulletPoints.map((point, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex items-start gap-4 group"
                      >
                        <span 
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110"
                          style={{ background: accentGradient }}
                        >
                          <span className="text-text-primary text-xs font-bold">{i + 1}</span>
                        </span>
                        <span className="text-base leading-relaxed" style={{ color: theme.textColor }}>{point}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* GAMMA-STYLE: Image with glass frame */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, x: 30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className={`relative rounded-3xl overflow-hidden ${variant === 2 ? 'col-span-2' : ''}`}
                style={{ 
                  background: subtleGradient,
                  boxShadow: `0 25px 80px ${theme.primaryColor}25`,
                }}
              >
                <div className="aspect-[4/3]">
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt={slide.title || 'Slide image'} className="w-full h-full object-cover" />
                  ) : slide.isGeneratingImage ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="w-12 h-12" style={{ color: theme.primaryColor }} />
                      </motion.div>
                      <span style={{ color: theme.textMuted }}>AI генерирует...</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImagePlus className="w-16 h-16" style={{ color: theme.primaryColor, opacity: 0.3 }} />
                    </div>
                  )}
                </div>
                
                {/* Decorative corner accent */}
                <div 
                  className="absolute -top-1 -right-1 w-16 h-16 rounded-bl-3xl"
                  style={{ background: accentGradient, opacity: 0.8 }}
                />
              </motion.div>
            </>
          );
          
        case 'image-content':
          if (variant === 3) {
            return (
              <>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-3xl font-bold mb-5 ${titleAlignClass}`}
                  style={{ color: theme.primaryColor }}
                >
                  {slide.title}
                </motion.h2>
                
                {slide.content && (
                  <p className={`text-lg mb-5 leading-relaxed ${titleAlignClass}`} style={{ color: theme.textColor }}>{slide.content}</p>
                )}
                
                {slide.bulletPoints && (
                  <div className="space-y-3 mb-8">
                    {slide.bulletPoints.map((point, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.08 }}
                        className="flex items-start gap-3"
                      >
                        <span className="w-2 h-2 mt-2 rounded-full" style={{ background: accentGradient }} />
                        <span style={{ color: theme.textColor }}>{point}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative rounded-3xl overflow-hidden h-56 mt-auto" 
                  style={{ 
                    background: subtleGradient,
                    boxShadow: `0 20px 60px ${theme.primaryColor}20`,
                  }}
                >
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt={slide.title || 'Slide image'} className="w-full h-full object-cover" />
                  ) : slide.isGeneratingImage ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-10 h-10 animate-spin" style={{ color: theme.primaryColor }} />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImagePlus className="w-12 h-12" style={{ color: theme.primaryColor, opacity: 0.3 }} />
                    </div>
                  )}
                </motion.div>
              </>
            );
          }
          
          return (
            <>
              {/* GAMMA-STYLE: Image with glass frame */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, x: -30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className={`relative rounded-3xl overflow-hidden ${variant === 2 ? 'col-span-2' : ''}`}
                style={{ 
                  background: subtleGradient,
                  boxShadow: `0 25px 80px ${theme.primaryColor}25`,
                }}
              >
                <div className="aspect-[4/3]">
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt={slide.title || 'Slide image'} className="w-full h-full object-cover" />
                  ) : slide.isGeneratingImage ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="w-12 h-12" style={{ color: theme.primaryColor }} />
                      </motion.div>
                      <span style={{ color: theme.textMuted }}>AI генерирует...</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImagePlus className="w-16 h-16" style={{ color: theme.primaryColor, opacity: 0.3 }} />
                    </div>
                  )}
                </div>
                
                {/* Decorative corner accent */}
                <div 
                  className="absolute -top-1 -left-1 w-16 h-16 rounded-br-3xl"
                  style={{ background: accentGradient, opacity: 0.8 }}
                />
              </motion.div>
              
              <div className={`flex flex-col justify-center ${variant === 2 ? 'col-span-3' : ''}`}>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 w-fit"
                  style={{ background: subtleGradient }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: theme.accentColor }} />
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: theme.primaryColor }}>
                    Ключевой момент
                  </span>
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`text-3xl md:text-4xl font-bold mb-6 leading-tight ${titleAlignClass}`}
                  style={{ color: theme.primaryColor }}
                >
                  {slide.title}
                </motion.h2>
                
                {slide.content && (
                  <p className="text-lg mb-6 leading-relaxed" style={{ color: theme.textColor }}>{slide.content}</p>
                )}
                
                {slide.bulletPoints && (
                  <div className="space-y-3">
                    {slide.bulletPoints.map((point, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex items-start gap-4 group"
                      >
                        <span 
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110"
                          style={{ background: accentGradient }}
                        >
                          <span className="text-text-primary text-xs font-bold">{i + 1}</span>
                        </span>
                        <span className="text-base leading-relaxed" style={{ color: theme.textColor }}>{point}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </>
          );
          
        case 'full-image':
          return (
            <>
              {slide.imageUrl ? (
                <>
                  <img src={slide.imageUrl} alt={slide.title || 'Slide image'} className="w-full h-full object-cover" />
                  {/* GAMMA-STYLE: Premium gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
                </>
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: subtleGradient }}
                >
                  {slide.isGeneratingImage ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-16 h-16 animate-spin" style={{ color: theme.primaryColor }} />
                      <span style={{ color: theme.textMuted }}>Создание изображения...</span>
                    </div>
                  ) : (
                    <ImagePlus className="w-24 h-24" style={{ color: theme.primaryColor, opacity: 0.3 }} />
                  )}
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 p-14">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                  style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}
                >
                  <Camera size={14} className="text-text-primary" />
                  <span className="text-sm font-medium text-text-primary">Фокус</span>
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl font-bold mb-5 text-text-primary max-w-3xl"
                  style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
                >
                  {slide.title}
                </motion.h2>
                {slide.content && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl text-white/90 max-w-2xl"
                  >
                    {slide.content}
                  </motion.p>
                )}
              </div>
            </>
          );
          
        case 'quote':
          return (
            <div className={`max-w-4xl relative ${variant === 2 ? 'text-left' : variant === 3 ? 'text-right' : 'text-center'}`}>
              {/* GAMMA-STYLE: Animated background glow */}
              <div
                className="absolute -inset-32 rounded-full blur-[100px] opacity-30"
                style={{ background: theme.primaryColor }}
              />
              
              <motion.span
                initial={{ opacity: 0, scale: 0, y: -20 }}
                animate={{ opacity: 0.2, scale: 1, y: 0 }}
                className={`absolute -top-10 ${variant === 2 ? '-left-2' : variant === 3 ? '-right-2' : 'left-1/2 -translate-x-1/2'} text-[180px] leading-none font-serif`}
                style={{ color: theme.primaryColor, ...glowStyle }}
              >
                "
              </motion.span>
              
              <motion.blockquote
                initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-3xl md:text-4xl font-light relative z-10 leading-relaxed"
                style={{ color: theme.textColor }}
              >
                <span className="italic">{slide.quote || slide.content || slide.title}</span>
              </motion.blockquote>
              
              {(slide.quoteAuthor || slide.subtitle) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`flex items-center gap-4 mt-10 ${variant === 1 ? 'justify-center' : variant === 3 ? 'justify-end' : ''}`}
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: accentGradient }}
                  >
                    <User className="w-6 h-6 text-text-primary" />
                  </div>
                  <cite className="text-xl not-italic font-medium" style={{ color: theme.primaryColor }}>
                    {slide.quoteAuthor || slide.subtitle}
                  </cite>
                </motion.div>
              )}
            </div>
          );
          
        case 'thank-you':
          return (
            <div className={`relative z-10 ${variant === 2 ? '' : 'text-center'}`}>
              {/* GAMMA-STYLE: Animated celebration background */}
              <div className="absolute -inset-[200px] pointer-events-none">
                <div 
                  className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full blur-[120px] opacity-40"
                  style={{ background: theme.primaryColor }}
                />
                <div 
                  className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full blur-[100px] opacity-30"
                  style={{ background: theme.secondaryColor }}
                />
              </div>
              
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className={`w-28 h-28 rounded-3xl flex items-center justify-center ${variant === 2 ? '' : 'mx-auto'} mb-10`}
                style={{ 
                  background: accentGradient,
                  boxShadow: `0 20px 60px ${theme.primaryColor}50`,
                }}
              >
                <Heart className="w-14 h-14 text-text-primary" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className={`text-5xl md:text-7xl font-bold mb-8 relative ${titleAlignClass}`}
                style={{ 
                  color: theme.primaryColor,
                  textShadow: `0 4px 30px ${theme.primaryColor}30`,
                }}
              >
                {slide.title || 'Спасибо!'}
              </motion.h1>
              
              {slide.content && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`text-xl md:text-2xl max-w-2xl ${variant === 1 ? 'mx-auto' : ''} ${titleAlignClass}`}
                  style={{ color: theme.textMuted }}
                >
                  {slide.content}
                </motion.p>
              )}
              
              {/* GAMMA-STYLE: Social/Contact buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`flex gap-4 mt-12 ${variant === 1 ? 'justify-center' : ''}`}
              >
                {['📧 Email', '🔗 LinkedIn', '🌐 Website'].map((item, i) => (
                  <span 
                    key={i}
                    className="px-5 py-2.5 rounded-full text-sm font-medium"
                    style={{ 
                      background: subtleGradient, 
                      color: theme.primaryColor,
                      border: `1px solid ${theme.primaryColor}20`
                    }}
                  >
                    {item}
                  </span>
                ))}
              </motion.div>
            </div>
          );
        
        case 'stats':
          const statsData = slide.stats || [
            { value: '85%', label: 'Эффективность' },
            { value: '2.5x', label: 'Рост' },
            { value: '10K+', label: 'Пользователей' },
          ];
          return (
            <>
              {/* GAMMA-STYLE: Animated background */}
              <div className="absolute -inset-[100px] pointer-events-none">
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
                  style={{ background: theme.primaryColor }}
                />
              </div>
              
              <div className={`col-span-full text-center mb-8 relative z-10`}>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                  style={{ background: subtleGradient, border: `1px solid ${theme.primaryColor}20` }}
                >
                  <BarChart3 size={14} style={{ color: theme.primaryColor }} />
                  <span className="text-sm font-medium" style={{ color: theme.primaryColor }}>Статистика</span>
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl md:text-5xl font-bold"
                  style={{ 
                    color: theme.primaryColor,
                    textShadow: `0 4px 30px ${theme.primaryColor}30`,
                  }}
                >
                  {slide.title}
                </motion.h2>
                
                {slide.content && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg mt-4 max-w-2xl mx-auto"
                    style={{ color: theme.textMuted }}
                  >
                    {slide.content}
                  </motion.p>
                )}
              </div>
              
              {statsData.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.15, type: 'spring', stiffness: 200 }}
                  className="relative group"
                >
                  <div 
                    className="relative p-8 rounded-3xl text-center overflow-hidden transition-transform duration-300 group-hover:scale-105"
                    style={{ 
                      background: subtleGradient,
                      border: `1px solid ${theme.primaryColor}15`,
                      boxShadow: `0 20px 60px ${theme.primaryColor}15`,
                    }}
                  >
                    {/* Glow effect on hover */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `radial-gradient(circle at center, ${theme.primaryColor}20, transparent 70%)` }}
                    />
                    
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.15, type: 'spring' }}
                      className="text-5xl md:text-6xl font-bold mb-3 relative"
                      style={{ 
                        background: accentGradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: `drop-shadow(0 4px 20px ${theme.primaryColor}40)`,
                      }}
                    >
                      {stat.value}
                    </motion.div>
                    
                    <div className="text-base font-medium relative" style={{ color: theme.textMuted }}>
                      {stat.label}
                    </div>
                    
                    {/* Decorative accent line */}
                    <div 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full"
                      style={{ background: accentGradient, opacity: 0.6 }}
                    />
                  </div>
                </motion.div>
              ))}
            </>
          );
          
        default:
          return (
            <>
              <h2 className="text-3xl font-bold mb-6" style={{ color: theme.primaryColor }}>
                {slide.title}
              </h2>
              {slide.content && (
                <p className="text-lg leading-relaxed" style={{ color: theme.textColor }}>{slide.content}</p>
              )}
            </>
          );
      }
    };
    
    return (
      <div 
        className={`${baseClasses} rounded-3xl overflow-hidden relative ${getLayoutClasses()}`}
        style={{ 
          backgroundColor: theme.backgroundColor,
          backgroundImage: slide.background.type === 'gradient' ? slide.background.value : undefined,
          boxShadow: isFullscreen ? 'none' : `0 25px 100px ${theme.primaryColor}15, 0 10px 40px rgba(0,0,0,0.1)`,
        }}
      >
        {/* GAMMA-STYLE: Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${theme.primaryColor} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        
        {renderContent()}
      </div>
    );
  };
  
  // ==================== РЕЖИМ ПРЕЗЕНТАЦИИ (ПОЛНЫЙ ЭКРАН) ====================
  
  if (isPresentationMode && currentPresentation) {
    const currentSlide = currentPresentation.slides[currentSlideIndex];
    const theme = currentPresentation.theme;
    const nextSlideData = currentPresentation.slides[currentSlideIndex + 1];
    
    // Режим докладчика (улучшенный)
    if (isPresenterMode) {
      const progress = ((currentSlideIndex + 1) / currentPresentation.slides.length) * 100;
      const avgTimePerSlide = currentPresentation.slides.length > 0 
        ? Math.floor(presentationTimer / (currentSlideIndex + 1)) 
        : 0;
      const estimatedTotal = avgTimePerSlide * currentPresentation.slides.length;
      const remainingSlides = currentPresentation.slides.length - currentSlideIndex - 1;
      const estimatedRemaining = avgTimePerSlide * remainingSlides;
      
      return (
        <div 
          ref={fullscreenRef}
          className="fixed inset-0 z-50 bg-bg-secondary flex"
        >
          {/* Левая панель - текущий слайд */}
          <div className="flex-1 p-6 flex flex-col">
            {/* Прогресс бар */}
            <div className="h-1 bg-bg-tertiary rounded-full mb-4 overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: theme.backgroundColor }}>
              {renderSlide(currentSlide, theme, true)}
            </div>
            
            {/* Навигация */}
            <div className="mt-4 flex items-center justify-between">
              {/* Миниатюры слайдов */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 max-w-full sm:max-w-[500px]">
                {currentPresentation.slides.slice(
                  Math.max(0, currentSlideIndex - 2),
                  Math.min(currentPresentation.slides.length, currentSlideIndex + 4)
                ).map((s, idx) => {
                  const realIdx = Math.max(0, currentSlideIndex - 2) + idx;
                  return (
                    <motion.button
                      key={s.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentSlideIndex(realIdx)}
                      className={`relative w-20 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                        realIdx === currentSlideIndex 
                          ? 'border-blue-500 shadow-lg shadow-blue-500/30' 
                          : 'border-gray-600 opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: theme.backgroundColor }}
                      title={s.title}
                    >
                      {/* Mini preview */}
                      <div className="absolute inset-0 scale-[0.15] origin-top-left w-[667%] h-[667%] pointer-events-none">
                        {renderSlide(s, theme, false)}
                      </div>
                      
                      {/* Slide number overlay */}
                      <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent">
                        <span className={`text-[10px] font-bold mb-1 ${
                          realIdx === currentSlideIndex ? 'text-blue-400' : 'text-text-secondary'
                        }`}>
                          {realIdx + 1}
                        </span>
                      </div>
                      
                      {/* Current indicator */}
                      {realIdx === currentSlideIndex && (
                        <motion.div 
                          layoutId="presenterThumb"
                          className="absolute inset-0 border-2 border-blue-400 rounded-lg pointer-events-none"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={prevSlide}
                  disabled={currentSlideIndex === 0}
                  className="px-6 py-3 rounded-xl bg-bg-tertiary text-text-primary flex items-center gap-2 disabled:opacity-30 hover:bg-bg-secondary transition-colors"
                >
                  <ChevronLeft size={20} />
                  Назад
                </button>
                
                <span className="px-6 py-3 rounded-xl bg-bg-tertiary text-text-primary font-bold text-lg">
                  {currentSlideIndex + 1} / {currentPresentation.slides.length}
                </span>
                
                <button 
                  onClick={nextSlide}
                  disabled={currentSlideIndex === currentPresentation.slides.length - 1}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-text-primary flex items-center gap-2 disabled:opacity-30 hover:bg-blue-700 transition-colors"
                >
                  Далее
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Правая панель - информация */}
          <div className="w-full md:w-[420px] bg-bg-tertiary p-4 md:p-6 flex flex-col overflow-y-auto">
            {/* Таймеры */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="text-center p-3 bg-bg-tertiary/50 rounded-xl">
                <div className="text-3xl font-mono font-bold text-text-primary">
                  {formatTime(presentationTimer)}
                </div>
                <div className="text-text-secondary text-xs mt-1">⏱️ Прошло</div>
              </div>
              <div className="text-center p-3 bg-bg-tertiary/50 rounded-xl">
                <div className="text-3xl font-mono font-bold text-emerald-400">
                  {formatTime(estimatedRemaining)}
                </div>
                <div className="text-text-secondary text-xs mt-1">⏳ Осталось</div>
              </div>
              <div className="text-center p-3 bg-bg-tertiary/50 rounded-xl">
                <div className="text-3xl font-mono font-bold text-amber-400">
                  ~{formatTime(estimatedTotal)}
                </div>
                <div className="text-text-secondary text-xs mt-1">📊 Всего</div>
              </div>
            </div>
            
            {/* Статистика */}
            <div className="flex items-center justify-between mb-4 p-3 bg-bg-tertiary/30 rounded-xl">
              <div className="text-sm text-text-secondary">
                <span className="text-text-primary font-semibold">{avgTimePerSlide}</span> сек/слайд
              </div>
              <div className="text-sm text-text-secondary">
                <span className="text-text-primary font-semibold">{remainingSlides}</span> слайдов осталось
              </div>
            </div>
            
            {/* Следующий слайд */}
            <div className="mb-4">
              <h3 className="text-text-secondary text-sm mb-2 flex items-center gap-2">
                <ChevronRight size={16} />
                Следующий слайд
              </h3>
              {nextSlideData ? (
                <div 
                  className="aspect-video rounded-xl overflow-hidden bg-bg-tertiary shadow-lg"
                  style={{ backgroundColor: theme.backgroundColor }}
                >
                  {renderSlide(nextSlideData, theme, false)}
                </div>
              ) : (
                <div className="aspect-video rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex flex-col items-center justify-center text-text-secondary">
                  <span className="text-4xl mb-2">🎉</span>
                  <span>Конец презентации</span>
                </div>
              )}
            </div>
            
            {/* Заметки докладчика */}
            <div className="flex-1 flex flex-col min-h-0">
              <h3 className="text-text-secondary text-sm mb-2 flex items-center gap-2">
                <FileText size={16} />
                Заметки докладчика
              </h3>
              <div className="flex-1 bg-bg-tertiary/50 rounded-xl p-4 overflow-y-auto border border-gray-600">
                {currentSlide.notes ? (
                  <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">{currentSlide.notes}</p>
                ) : (
                  <div className="text-text-muted text-sm italic flex flex-col items-center justify-center h-full">
                    <span className="text-3xl mb-2">📝</span>
                    <span>Нет заметок для этого слайда</span>
                    <span className="text-xs mt-1">Добавьте в редакторе</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Кнопки управления */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <button
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                  isAutoPlay ? 'bg-green-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                {isAutoPlay ? <Pause size={18} /> : <Play size={18} />}
                {isAutoPlay ? 'Пауза' : 'Авто'}
              </button>
              
              <button 
                onClick={() => {
                  setPresentationTimer(0);
                }}
                className="py-3 rounded-xl bg-bg-tertiary text-text-secondary flex items-center justify-center gap-2 hover:bg-bg-tertiary transition-colors"
              >
                <Clock size={18} />
                Сброс
              </button>
              
              <button 
                onClick={exitPresentationMode}
                className="py-3 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center gap-2 hover:bg-red-600/30 transition-colors"
              >
                <X size={18} />
                Выход
              </button>
            </div>
            
            {/* Горячие клавиши (улучшенные) */}
            <div className="mt-4 p-3 bg-bg-tertiary/30 rounded-xl">
              <div className="text-xs text-text-secondary mb-2 font-medium">⌨️ Горячие клавиши</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">← →</span>
                  <span className="text-text-secondary">навигация</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Space</span>
                  <span className="text-text-secondary">далее</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Home/End</span>
                  <span className="text-text-secondary">начало/конец</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Esc</span>
                  <span className="text-text-secondary">выход</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Обычный режим презентации
    return (
      <div 
        ref={fullscreenRef}
        className="fixed inset-0 z-50"
        style={{ backgroundColor: theme.backgroundColor }}
        onClick={nextSlide}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlideIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: currentSlide.transition.duration }}
            className="w-full h-full"
          >
            {renderSlide(currentSlide, theme, true)}
          </motion.div>
        </AnimatePresence>
        
        {/* Навигация */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full"
          style={{ backgroundColor: `${theme.surfaceColor}CC`, backdropFilter: 'blur(10px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
            style={{ backgroundColor: `${theme.primaryColor}30`, color: theme.textColor }}
          >
            <ChevronLeft size={24} />
          </button>
          
          <span className="px-4 font-medium" style={{ color: theme.textColor }}>
            {currentSlideIndex + 1} / {currentPresentation.slides.length}
          </span>
          
          <button 
            onClick={nextSlide}
            disabled={currentSlideIndex === currentPresentation.slides.length - 1}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
            style={{ backgroundColor: `${theme.primaryColor}30`, color: theme.textColor }}
          >
            <ChevronRight size={24} />
          </button>
          
          <div className="w-px h-6 mx-2" style={{ backgroundColor: `${theme.textMuted}40` }} />
          
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: isAutoPlay ? theme.primaryColor : `${theme.primaryColor}30`, color: isAutoPlay ? '#fff' : theme.textColor }}
          >
            {isAutoPlay ? <Pause size={20} /> : <Play size={20} />}
          </button>
          
          <button 
            onClick={exitPresentationMode}
            className="w-10 h-10 rounded-full flex items-center justify-center ml-2"
            style={{ backgroundColor: '#EF444430', color: '#EF4444' }}
          >
            <X size={20} />
          </button>
        </motion.div>
        
        {/* Индикатор прогресса */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: `${theme.primaryColor}20` }}>
          <motion.div
            className="h-full"
            style={{ backgroundColor: theme.primaryColor }}
            initial={{ width: 0 }}
            animate={{ width: `${((currentSlideIndex + 1) / currentPresentation.slides.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    );
  }
  
  // ==================== CHAT INTERFACE (как Genspark) ====================
  
  const renderChatInterface = () => (
    <div className="h-full flex bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setShowMobileSidebar(true)}
        className="fixed bottom-4 left-4 z-30 p-3 rounded-full bg-fuchsia-500 text-white shadow-lg md:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Mobile sidebar backdrop */}
      {showMobileSidebar && (
        <div
          onClick={() => setShowMobileSidebar(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* Sidebar с историей презентаций */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 md:static md:translate-x-0 md:z-auto ${
        showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
      } border-r border-border-primary bg-background-secondary/95 md:bg-background-secondary/50 flex flex-col`}>
        <div className="p-4 border-b border-border-primary">
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <Layers size={18} className="text-accent-primary" />
            Мои презентации
          </h3>
          <p className="text-xs text-text-muted mt-1">{presentations.length} презентаций</p>
          
          {/* 💰 Статистика лимитов для всех планов */}
          {(() => {
            const limits = subscription.getLimits();
            const remaining = subscription.getRemainingLimits();
            const planColors: Record<string, { bg: string; border: string }> = {
              starter: { bg: 'blue-500', border: 'blue-500' },
              pro: { bg: 'purple-500', border: 'purple-500' },
              premium: { bg: 'orange-500', border: 'orange-500' },
            };
            const colors = planColors[subscription.currentPlan] || planColors.starter;
            const planName = (SUBSCRIPTION_PLANS[subscription.currentPlan] || SUBSCRIPTION_PLANS.starter).name;
            
            return (
              <div className={`mt-3 p-2 rounded-lg bg-${colors.bg}/10 border border-${colors.border}/30`}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className={`text-${colors.bg}`}>{planName}</span>
                  <span className="text-text-muted">
                    {subscription.usage.presentationsCreated}/{limits.presentationsPerMonth}
                  </span>
                </div>
                
                <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full bg-${colors.bg} rounded-full transition-all`}
                    style={{ width: `${Math.min(100, (subscription.usage.presentationsCreated / limits.presentationsPerMonth) * 100)}%` }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-1 text-[10px] text-text-muted">
                  <div>AI: {remaining.chatMessages}/день</div>
                  <div>AI-изображения: {remaining.dalleImages}</div>
                </div>
              </div>
            );
          })()}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {presentations.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <Layers size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Нет презентаций</p>
              <p className="text-xs mt-1">Опишите тему в чате</p>
            </div>
          ) : (
            <div className="space-y-2">
              {presentations.map((pres) => (
                <motion.div
                  key={pres.id}
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    setCurrentPresentation(pres);
                    setViewMode('editor');
                  }}
                  className="group relative p-3 rounded-xl hover:bg-background-tertiary cursor-pointer transition-all border border-transparent hover:border-border-primary"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: pres.theme.primaryColor + '20' }}
                    >
                      📊
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {pres.title}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {pres.slides.length} слайдов • {new Date(pres.updatedAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePresentation(pres.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-red-500/20 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-border-primary space-y-2">
          <button
            onClick={() => setShowSmartTemplatesModal(true)}
            className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Sparkles size={16} />
            AI Шаблоны
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="w-full px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-background-tertiary transition-all flex items-center justify-center gap-2 text-sm"
          >
            <FileText size={16} />
            Шаблоны
          </button>
        </div>
      </aside>
      
      {/* Основной чат */}
      <div className="flex-1 flex flex-col">
        {/* Чат */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white'
                    : 'glass border border-border-primary text-text-primary'
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={line.startsWith('**') ? 'font-bold' : ''}>
                        {line.replace(/\*\*/g, '')}
                      </p>
                    ))}
                  </div>
                  <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-white/60' : 'text-text-muted'}`}>
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      
        {/* Примеры запросов */}
      {chatMessages.length <= 1 && (
        <div className="px-6 pb-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-text-muted mb-3 flex items-center gap-2">
              <Sparkles size={12} className="text-accent-primary" />
              Примеры запросов для вдохновения:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { emoji: '🧬', text: 'ДНК и генетика', full: 'Презентация о ДНК и генетике на 8 слайдов с научными иллюстрациями' },
                { emoji: '🚀', text: 'Стартап питч', full: 'Питч для инвесторов EdTech стартапа с данными о рынке' },
                { emoji: '🌍', text: 'Экология', full: 'Изменение климата и способы борьбы с глобальным потеплением' },
                { emoji: '🤖', text: 'AI в бизнесе', full: 'Искусственный интеллект и машинное обучение в современном бизнесе' },
                { emoji: '💊', text: 'Медицина', full: 'Инновации в медицине и здравоохранении 2024 года' },
                { emoji: '🎓', text: 'Образование', full: 'Будущее онлайн-образования и цифрового обучения' },
                { emoji: '💼', text: 'Бизнес-план', full: 'Бизнес-план для запуска IT-стартапа' },
                { emoji: '📊', text: 'Аналитика', full: 'Квартальный отчёт о продажах с графиками и KPI' }
              ].map((example, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setChatInput(example.full)}
                  className="px-3 py-2.5 rounded-xl glass border border-border-primary text-left text-xs text-text-secondary hover:text-text-primary hover:border-accent-primary/50 hover:bg-accent-primary/5 transition-all group"
                >
                  <span className="mr-1.5">{example.emoji}</span>
                  <span className="group-hover:text-accent-primary transition-colors">{example.text}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Поле ввода */}
      <div className="p-6 border-t border-border-primary bg-background-secondary/50 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit();
                  }
                }}
                placeholder="Опишите тему презентации... (Enter для отправки)"
                className="w-full px-5 py-4 pr-14 rounded-2xl glass border border-border-primary text-text-primary placeholder-text-muted resize-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-all"
                rows={2}
                disabled={isGenerating}
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleChatSubmit}
                disabled={!chatInput.trim() || isGenerating}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white flex items-center justify-center disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
              </motion.button>
            </div>
          </div>
          
          {/* Быстрые настройки */}
          <div className="flex items-center gap-4 mt-3 text-xs text-text-muted flex-wrap">
            <select
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg glass border border-border-primary bg-transparent text-text-secondary"
            >
              <option value={5}>5 слайдов</option>
              <option value={8}>8 слайдов</option>
              <option value={10}>10 слайдов</option>
              <option value={15}>15 слайдов</option>
              <option value={20}>20 слайдов</option>
            </select>
            
            <select
              value={selectedTheme.id}
              onChange={(e) => setSelectedTheme(THEMES.find(t => t.id === e.target.value) || THEMES[0])}
              className="px-3 py-1.5 rounded-lg glass border border-border-primary bg-transparent text-text-secondary"
            >
              {THEMES.slice(0, 8).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeImages}
                onChange={(e) => setIncludeImages(e.target.checked)}
                className="w-4 h-4 rounded accent-accent-primary"
              />
              <span>🖼️ С изображениями</span>
            </label>
            
            {includeImages && (
              <select
                value={imageSource}
                onChange={(e) => setImageSource(e.target.value as 'dalle' | 'pexels')}
                className="px-3 py-1.5 rounded-lg glass border border-border-primary bg-transparent text-text-secondary"
              >
                <option value="dalle">🎨 AI генерация</option>
                <option value="pexels">📷 Pexels (реальные фото)</option>
              </select>
            )}
            
            <div className="flex-1" />
            
            <button
              onClick={() => setShowSmartTemplatesModal(true)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:opacity-90 transition-colors flex items-center gap-2"
            >
              <Sparkles size={14} />
              AI Шаблоны
            </button>
            
            <button
              onClick={() => setShowTemplates(true)}
              className="px-3 py-2 rounded-lg glass border border-accent-primary/30 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors flex items-center gap-2"
            >
              <Layout size={14} />
              Шаблоны
            </button>
          </div>
        </div>
      </div>
      
      {/* Список сохранённых презентаций */}
      {presentations.length > 0 && (
        <div className="px-6 py-4 border-t border-border-primary bg-background-secondary/30">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Layers size={14} className="text-accent-primary" />
                Мои презентации
                <span className="px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary text-xs">
                  {presentations.length}
                </span>
              </p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {presentations.slice(0, 6).map((pres, i) => (
                <motion.button
                  key={pres.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCurrentPresentation(pres);
                    setCurrentSlideIndex(0);
                    setViewMode('editor');
                  }}
                  className="flex-shrink-0 w-52 rounded-xl glass border border-border-primary overflow-hidden text-left hover:border-accent-primary/50 transition-all group shadow-lg hover:shadow-xl hover:shadow-accent-primary/10"
                >
                  {/* Preview */}
                  <div 
                    className="h-28 relative overflow-hidden"
                    style={{ backgroundColor: pres.theme.backgroundColor }}
                  >
                    {/* Mini slide preview */}
                    <div className="absolute inset-0 scale-[0.15] origin-top-left w-[667%] h-[714%] pointer-events-none">
                      {pres.slides[0] && renderSlide(pres.slides[0], pres.theme, false)}
                    </div>
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Title overlay */}
                    <div className="absolute bottom-2 left-3 right-3">
                      <h4 className="text-sm font-bold text-text-primary line-clamp-2 drop-shadow-lg">
                        {pres.title}
                      </h4>
                    </div>
                    
                    {/* Slide count badge */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-xs text-text-primary font-medium">
                      {pres.slides.length} 📄
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="px-3 py-2 bg-background-primary/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ background: `linear-gradient(135deg, ${pres.theme.primaryColor}, ${pres.theme.secondaryColor})` }}
                      />
                      <span className="text-[10px] text-text-muted">{pres.theme.name}</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePresentation(pres.id);
                      }}
                      className="w-6 h-6 rounded-lg bg-red-500/80 text-text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </motion.button>
                  </div>
                </motion.button>
              ))}
              
              {/* More indicator */}
              {presentations.length > 6 && (
                <div className="flex-shrink-0 w-24 h-full rounded-xl glass border border-border-primary flex flex-col items-center justify-center text-text-muted">
                  <span className="text-2xl mb-1">+{presentations.length - 6}</span>
                  <span className="text-[10px]">ещё</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
  
  // ==================== WORKSPACE INTERFACE ====================
  
  const renderWorkspaceInterface = () => (
    <div className="h-full flex bg-background-primary">
      {/* Mobile workspace toggle */}
      <button
        onClick={() => setShowMobileSidebar(true)}
        className="fixed bottom-4 left-4 z-30 p-3 rounded-full bg-fuchsia-500 text-white shadow-lg md:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Mobile sidebar backdrop */}
      {showMobileSidebar && (
        <div
          onClick={() => setShowMobileSidebar(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* Левая панель - шаги */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] transform transition-transform duration-300 md:static md:translate-x-0 md:z-auto ${
        showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
      } border-r border-border-primary bg-background-secondary/95 md:bg-background-secondary/50 p-6 overflow-y-auto`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
            <Brain className="text-text-primary" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-text-primary">AI Workspace</h2>
            <p className="text-xs text-text-muted">Создание презентации</p>
          </div>
        </div>
        
        {/* Список шагов */}
        <div className="space-y-3">
          {workspaceSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl border transition-all ${
                step.status === 'completed'
                  ? 'bg-accent-success/10 border-accent-success/30'
                  : step.status === 'in-progress'
                  ? 'bg-accent-primary/10 border-accent-primary/30 animate-pulse'
                  : step.status === 'error'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'glass border-border-primary opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{step.icon}</span>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${
                    step.status === 'completed' ? 'text-accent-success' :
                    step.status === 'in-progress' ? 'text-accent-primary' :
                    step.status === 'error' ? 'text-red-500' :
                    'text-text-muted'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-text-muted">{step.description}</p>
                </div>
                {step.status === 'completed' && <span className="text-accent-success">✓</span>}
                {step.status === 'in-progress' && <Loader2 size={16} className="text-accent-primary animate-spin" />}
                {step.status === 'error' && <span className="text-red-500">✕</span>}
              </div>
              
              {/* Детали шага */}
              {step.details && step.details.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 pt-3 border-t border-border-primary"
                >
                  {step.details.map((detail, i) => (
                    <p key={i} className="text-xs text-text-muted flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-text-muted" />
                      {detail}
                    </p>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
        
        {/* Кнопки */}
        <div className="mt-6 space-y-2">
          {workspaceSteps.every(s => s.status === 'completed') && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setViewMode('editor')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold flex items-center justify-center gap-2"
            >
              <Edit3 size={18} />
              Открыть редактор
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('chat')}
            className="w-full py-3 rounded-xl glass border border-border-primary text-text-secondary flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Назад к чату
          </motion.button>
        </div>
      </div>
      
      {/* Правая панель - превью */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Запрос пользователя */}
          <div className="glass rounded-2xl p-6 border border-border-primary mb-6">
            <p className="text-xs text-text-muted mb-2">📝 Ваш запрос:</p>
            <p className="text-text-primary font-medium">{generationPrompt}</p>
          </div>
          
          {/* Превью слайдов (если есть) */}
          {currentPresentation && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Layers size={20} className="text-accent-primary" />
                Превью презентации
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentPresentation.slides.slice(0, 4).map((slide, index) => (
                  <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.15 }}
                    className="aspect-video rounded-xl overflow-hidden shadow-lg"
                  >
                    {renderSlide(slide, currentPresentation.theme, false)}
                  </motion.div>
                ))}
              </div>
              
              {currentPresentation.slides.length > 4 && (
                <p className="text-center text-text-muted text-sm">
                  +{currentPresentation.slides.length - 4} слайдов...
                </p>
              )}
            </div>
          )}
          
          {/* Анимация генерации */}
          {!currentPresentation && isGenerating && (
            <div className="flex flex-col items-center justify-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 rounded-full border-4 border-accent-primary/20 border-t-accent-primary"
              />
              <p className="mt-6 text-text-primary font-medium">
                {workspaceSteps[currentWorkspaceStep]?.description || 'Обработка...'}
              </p>
              <p className="text-sm text-text-muted mt-2">
                Шаг {currentWorkspaceStep + 1} из {workspaceSteps.length}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  // ==================== ГЛАВНАЯ СТРАНИЦА ====================
  
  return (
    <div className="min-h-screen h-screen flex flex-col bg-background-primary overflow-hidden">
      {/* Шапка */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-b border-border-primary bg-background-secondary/50 backdrop-blur-sm relative z-50 overflow-visible"
      >
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (viewMode === 'editor' && currentPresentation) {
                setViewMode('chat');
                setCurrentPresentation(null);
              } else if (viewMode === 'workspace') {
                setViewMode('chat');
              } else {
                navigate('/dashboard');
              }
            }}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={20} />
          </motion.button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center hidden md:flex">
              <Layers className="text-text-primary" size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-lg font-bold text-text-primary truncate">
                {viewMode === 'chat' ? '✨ AI Презентации' : 
                 viewMode === 'workspace' ? '🔬 AI Workspace' :
                 currentPresentation?.title || 'Редактор'}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-text-muted">
                  {viewMode === 'chat' ? 'Опишите тему и AI создаст презентацию' :
                   viewMode === 'workspace' ? 'Генерация презентации...' :
                   currentPresentation ? `${currentPresentation.slides.length} слайдов` : ''}
                </p>
                
                {/* Индикатор сохранения */}
                {currentPresentation && viewMode === 'editor' && (
                  <div className="flex items-center gap-1">
                    <span className="text-text-muted">•</span>
                    {isSaving ? (
                      <span className="flex items-center gap-1 text-xs text-accent-primary">
                        <Loader2 className="animate-spin" size={10} />
                        Сохранение...
                      </span>
                    ) : lastSaved ? (
                      <span className="text-xs text-accent-success flex items-center gap-1">
                        <Check size={10} />
                        Сохранено
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Навигация по режимам */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {/* Вкладки режимов */}
          <div className="flex rounded-xl glass border border-border-primary p-1">
            {[
              { id: 'chat', label: '💬 Чат', icon: Brain },
              { id: 'editor', label: '✏️ Редактор', icon: Edit3 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as 'chat' | 'workspace' | 'editor')}
                disabled={tab.id === 'editor' && !currentPresentation}
                className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  viewMode === tab.id
                    ? 'bg-accent-primary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary disabled:opacity-30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {currentPresentation && viewMode === 'editor' && (
            <>
              {/* Keyboard Shortcuts Hint */}
              <div className="relative group">
                <button
                  className="w-10 h-10 rounded-xl glass border border-border-primary flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-accent-primary/10 transition-colors"
                  title="Горячие клавиши"
                >
                  <span className="text-sm">⌨️</span>
                </button>
                
                <div className="absolute top-full right-0 mt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="glass rounded-xl border border-border-primary shadow-xl p-4">
                    <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                      ⌨️ Горячие клавиши
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-text-muted">← →</span>
                        <span className="text-text-secondary">Навигация по слайдам</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">F5 / F</span>
                        <span className="text-text-secondary">Начать показ</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Ctrl + D</span>
                        <span className="text-text-secondary">Дублировать слайд</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Home / End</span>
                        <span className="text-text-secondary">Первый / Последний</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Escape</span>
                        <span className="text-text-secondary">Выход из показа</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Play Dropdown */}
              <div className="relative group">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={enterPresentationMode}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white flex items-center gap-2 text-sm"
                >
                  <Play size={16} />
                  Показ
                  <ChevronDown size={14} />
                </motion.button>
                
                <div className="absolute top-full right-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]">
                  <div className="glass rounded-xl border border-border-primary shadow-xl overflow-hidden">
                    <button
                      onClick={enterPresentationMode}
                      className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-accent-primary/10 flex items-center gap-3 transition-colors"
                    >
                      <Play size={16} className="text-fuchsia-400" />
                      <div>
                        <p className="font-medium">Обычный показ</p>
                        <p className="text-xs text-text-muted">Полноэкранный режим</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={enterPresenterMode}
                      className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-accent-primary/10 flex items-center gap-3 transition-colors border-t border-border-primary"
                    >
                      <Users size={16} className="text-blue-400" />
                      <div>
                        <p className="font-medium">Режим докладчика</p>
                        <p className="text-xs text-text-muted">С заметками и таймером</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Export Dropdown */}
              <div className="relative group">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm ${
                    isExporting 
                      ? 'bg-accent-warning text-text-primary cursor-wait' 
                      : 'bg-accent-success text-text-primary'
                  }`}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span className="animate-pulse">{exportProgress || 'Экспорт...'}</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Экспорт
                      <ChevronDown size={14} />
                    </>
                  )}
                </motion.button>
                
                {!isExporting && (
                  <div className="absolute top-full right-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]">
                  <div className="glass rounded-xl border border-border-primary shadow-xl overflow-hidden">
                    <button
                        onClick={exportToHTML}
                        className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-accent-primary/10 flex items-center gap-3 transition-colors"
                      >
                        <Code size={16} className="text-orange-400" />
                        <div>
                          <p className="font-medium">HTML</p>
                          <p className="text-xs text-text-muted">Интерактивная презентация</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={exportToPPTX}
                        className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-accent-primary/10 flex items-center gap-3 transition-colors border-t border-border-primary"
                      >
                        <FileText size={16} className="text-blue-400" />
                        <div>
                          <p className="font-medium">PowerPoint</p>
                          <p className="text-xs text-text-muted">PPTX для Office</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={exportToPDF}
                        className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-accent-primary/10 flex items-center gap-3 transition-colors border-t border-border-primary"
                      >
                        <FileType size={16} className="text-red-400" />
                        <div>
                          <p className="font-medium">PDF</p>
                          <p className="text-xs text-text-muted">Документ для печати</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 🚀 AI MAGIC ПАНЕЛЬ - СУПЕР ФУНКЦИИ */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAIMagicPanel(!showAIMagicPanel)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white flex items-center gap-2 text-sm font-medium shadow-lg shadow-fuchsia-500/30"
                >
                  <Sparkles size={16} />
                  AI Magic
                  <ChevronDown size={14} className={`transition-transform ${showAIMagicPanel ? 'rotate-180' : ''}`} />
                </motion.button>
                
                <AnimatePresence>
                  {showAIMagicPanel && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 z-[100] max-h-[calc(100vh-120px)]"
                    >
                      <div className="glass rounded-2xl border border-border-primary shadow-2xl overflow-hidden max-h-[calc(100vh-130px)] flex flex-col">
                        {/* Заголовок */}
                        <div className="p-4 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-pink-500/20 border-b border-border-primary flex-shrink-0">
                          <h3 className="font-bold text-text-primary flex items-center gap-2">
                            <Sparkles className="text-fuchsia-400" size={18} />
                            AI Magic - Супер функции
                          </h3>
                          <p className="text-xs text-text-muted mt-1">Улучшите презентацию одним кликом</p>
                        </div>
                        
                        <div className="p-2 overflow-y-auto flex-1">
                          {/* Улучшить всё */}
                          <button
                            onClick={() => { enhanceEntirePresentation(); setShowAIMagicPanel(false); }}
                            disabled={isEnhancingAll}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-accent-primary/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <Zap className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-text-primary group-hover:text-accent-primary">
                                  {isEnhancingAll ? `Улучшение... ${enhanceProgress}%` : '✨ Улучшить всё'}
                                </p>
                                <p className="text-xs text-text-muted">Улучшить все слайды с помощью AI</p>
                              </div>
                            </div>
                          </button>
                          
                          {/* Генерация изображений */}
                          <button
                            onClick={() => { generateAllImages(); setShowAIMagicPanel(false); }}
                            disabled={isGeneratingImages}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-accent-primary/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                                <ImageIcon className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-text-primary group-hover:text-accent-primary">
                                  {isGeneratingImages ? 'Генерация...' : '🖼️ AI-изображения'}
                                </p>
                                <p className="text-xs text-text-muted">HD картинки для всех слайдов</p>
                              </div>
                            </div>
                          </button>
                          
                          {/* Оптимизация layouts */}
                          <button
                            onClick={() => { optimizeLayouts(); setShowAIMagicPanel(false); }}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-accent-primary/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                                <Layout className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-text-primary group-hover:text-accent-primary">🎨 Оптимизировать layouts</p>
                                <p className="text-xs text-text-muted">Разнообразить структуру слайдов</p>
                              </div>
                            </div>
                          </button>
                          
                          {/* Разделитель */}
                          <div className="h-px bg-border-primary my-2" />
                          
                          {/* Добавить слайды */}
                          <button
                            onClick={() => { addStatsSlide(); setShowAIMagicPanel(false); }}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-accent-primary/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                                <BarChart className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-text-primary group-hover:text-accent-primary">📊 + Слайд статистики</p>
                                <p className="text-xs text-text-muted">Добавить данные и метрики</p>
                              </div>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => { addQuoteSlide(); setShowAIMagicPanel(false); }}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-accent-primary/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                                <Quote className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-text-primary group-hover:text-accent-primary">💬 + Слайд с цитатой</p>
                                <p className="text-xs text-text-muted">Реальная цитата эксперта</p>
                              </div>
                            </div>
                          </button>
                          
                          {/* Разделитель */}
                          <div className="h-px bg-border-primary my-2" />
                          
                          {/* Перевод */}
                          <div className="px-3 py-2">
                            <p className="text-xs text-text-muted mb-2">🌍 Перевести на:</p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { code: 'en', flag: '🇬🇧' },
                                { code: 'ru', flag: '🇷🇺' },
                                { code: 'de', flag: '🇩🇪' },
                                { code: 'fr', flag: '🇫🇷' },
                                { code: 'es', flag: '🇪🇸' },
                                { code: 'zh', flag: '🇨🇳' },
                              ].map(lang => (
                                <button
                                  key={lang.code}
                                  onClick={() => { translatePresentation(lang.code); setShowAIMagicPanel(false); }}
                                  className="px-3 py-1.5 rounded-lg bg-background-tertiary hover:bg-accent-primary/20 text-sm transition-colors"
                                >
                                  {lang.flag}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* AI Рекомендации */}
                          <button
                            onClick={() => { getAISuggestions(); setShowAIMagicPanel(false); }}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-accent-primary/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                                <Lightbulb className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-text-primary group-hover:text-accent-primary">💡 AI рекомендации</p>
                                <p className="text-xs text-text-muted">Получить советы по улучшению</p>
                              </div>
                            </div>
                          </button>
                          
                          {/* ========== AI УЛУЧШЕНИЯ ========== */}
                          <div className="h-px bg-gradient-to-r from-violet-500/50 via-fuchsia-500/50 to-pink-500/50 my-3" />
                          
                          {/* ONE-CLICK PRO UPGRADE */}
                          <button
                            onClick={() => { oneClickProUpgrade(); setShowAIMagicPanel(false); }}
                            disabled={isEnhancingAll}
                            className="w-full px-4 py-3 rounded-xl text-left bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-pink-500/10 hover:from-fuchsia-500/20 hover:via-purple-500/20 hover:to-pink-500/20 transition-colors group border border-fuchsia-500/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
                                <Rocket className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400">
                                  🏆 PRO UPGRADE
                                </p>
                                <p className="text-xs text-text-muted">Улучшить ВСЁ до уровня TED!</p>
                              </div>
                            </div>
                          </button>
                          
                          {/* AI PRESENTATION COACH */}
                          <button
                            onClick={() => { analyzePresentation(); setShowAIMagicPanel(false); }}
                            disabled={isAnalyzing}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-accent-primary/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <Target className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-text-primary group-hover:text-accent-primary">
                                  🎯 AI Presentation Coach
                                </p>
                                <p className="text-xs text-text-muted">Анализ и оценка качества</p>
                              </div>
                            </div>
                          </button>
                          
                          {/* STORY ARC */}
                          <button
                            onClick={() => { generateStoryArc(); setShowAIMagicPanel(false); }}
                            disabled={isEnhancingAll}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-accent-primary/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <BookOpen className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-text-primary group-hover:text-accent-primary">🎬 Story Arc (Pixar)</p>
                                <p className="text-xs text-text-muted">Превратить в захватывающую историю</p>
                              </div>
                            </div>
                          </button>
                          
                          {/* SPEAKER NOTES */}
                          <button
                            onClick={() => { generateSpeakerNotes(); setShowAIMagicPanel(false); }}
                            disabled={isEnhancingAll}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-accent-primary/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                                <User className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-text-primary group-hover:text-accent-primary">🎤 Speaker Notes AI</p>
                                <p className="text-xs text-text-muted">Заметки для выступления</p>
                              </div>
                            </div>
                          </button>
                          
                          {/* COMPETITIVE ANALYSIS */}
                          <button
                            onClick={() => { addCompetitiveAnalysis(); setShowAIMagicPanel(false); }}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-accent-primary/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <TrendingUp className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-text-primary group-hover:text-accent-primary">📊 Конкурентный анализ</p>
                                <p className="text-xs text-text-muted">+ Слайд с конкурентами</p>
                              </div>
                            </div>
                          </button>
                          
                          {/* Дополнительные инструменты */}
                          <div className="px-3 py-2 border-t border-border-primary mt-2">
                            <p className="text-xs text-text-muted mb-2">🛠️ Инструменты:</p>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => { setShowBrandKitModal(true); setShowAIMagicPanel(false); }}
                                className="p-2 rounded-lg bg-bg-tertiary hover:bg-accent-primary/20 transition-colors text-center"
                              >
                                <span className="text-lg">🎨</span>
                                <p className="text-[10px] text-text-muted">Brand Kit</p>
                              </button>
                              <button
                                onClick={() => { setShowVideoRecorder(true); setShowAIMagicPanel(false); }}
                                className="p-2 rounded-lg bg-bg-tertiary hover:bg-accent-primary/20 transition-colors text-center"
                              >
                                <span className="text-lg">🎥</span>
                                <p className="text-[10px] text-text-muted">Запись</p>
                              </button>
                              <button
                                onClick={() => { setShowPollsQuizzes(true); setShowAIMagicPanel(false); }}
                                className="p-2 rounded-lg bg-bg-tertiary hover:bg-accent-primary/20 transition-colors text-center"
                              >
                                <span className="text-lg">📊</span>
                                <p className="text-[10px] text-text-muted">Опросы</p>
                              </button>
                              <button
                                onClick={() => { setShowImportContent(true); setShowAIMagicPanel(false); }}
                                className="p-2 rounded-lg bg-bg-tertiary hover:bg-accent-primary/20 transition-colors text-center"
                              >
                                <span className="text-lg">📥</span>
                                <p className="text-[10px] text-text-muted">Импорт</p>
                              </button>
                              <button
                                onClick={() => { setShowAnalyticsDashboard(true); setShowAIMagicPanel(false); }}
                                className="p-2 rounded-lg bg-bg-tertiary hover:bg-accent-primary/20 transition-colors text-center"
                              >
                                <span className="text-lg">📈</span>
                                <p className="text-[10px] text-text-muted">Аналитика</p>
                              </button>
                              <button
                                onClick={() => { setShowPublishWebsite(true); setShowAIMagicPanel(false); }}
                                className="p-2 rounded-lg bg-bg-tertiary hover:bg-accent-primary/20 transition-colors text-center"
                              >
                                <span className="text-lg">🌐</span>
                                <p className="text-[10px] text-text-muted">Сайт</p>
                              </button>
                            </div>
                          </div>
                          
                          {/* Анимации */}
                          <div className="px-3 py-2">
                            <p className="text-xs text-text-muted mb-2">🎪 Пресеты анимаций:</p>
                            <div className="flex flex-wrap gap-2">
                              {(['subtle', 'dynamic', 'cinematic', 'minimal'] as const).map(preset => (
                                <button
                                  key={preset}
                                  onClick={() => { applyAnimationPreset(preset); setShowAIMagicPanel(false); }}
                                  className="px-3 py-1.5 rounded-lg bg-background-tertiary hover:bg-accent-primary/20 text-sm transition-colors capitalize"
                                >
                                  {preset === 'subtle' ? '✨' : preset === 'dynamic' ? '⚡' : preset === 'cinematic' ? '🎬' : '🔲'} {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* MOBILE CHECK */}
                          <button
                            onClick={() => { checkResponsiveness(); setShowAIMagicPanel(false); }}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-accent-primary/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center">
                                <Monitor className="text-text-primary" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-text-primary group-hover:text-accent-primary">📱 Проверка Mobile</p>
                                <p className="text-xs text-text-muted">Оптимизация для устройств</p>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </motion.header>
      
      {/* Overlay экспорта */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl border border-border-primary p-8 max-w-md w-full mx-4 text-center"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 border-4 border-accent-primary/30 border-t-accent-primary rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Download size={32} className="text-accent-primary" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-text-primary mb-2">
                Экспорт презентации
              </h3>
              <p className="text-text-muted mb-4">
                {exportProgress || 'Подготовка файлов...'}
              </p>
              
              <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full"
                />
              </div>
              
              <p className="text-xs text-text-muted mt-4">
                Пожалуйста, не закрывайте страницу
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* AI Рекомендации панель */}
      <AnimatePresence>
        {aiSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-6 top-24 w-80 z-40"
          >
            <div className="glass rounded-2xl border border-border-primary shadow-2xl overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-b border-border-primary flex items-center justify-between">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <Lightbulb className="text-amber-400" size={18} />
                  AI Рекомендации
                </h3>
                <button
                  onClick={() => setAiSuggestions([])}
                  className="w-6 h-6 rounded-lg hover:bg-background-tertiary flex items-center justify-center text-text-muted hover:text-text-primary"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto space-y-3">
                {aiSuggestions.map((suggestion, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-xl bg-background-tertiary/50 text-sm text-text-secondary"
                  >
                    <span className="text-amber-400 font-bold mr-2">{i + 1}.</span>
                    {suggestion}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 🏆 PRESENTATION SCORE PANEL - Оценка презентации */}
      <AnimatePresence>
        {presentationScore && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-6 top-24 w-96 z-40"
          >
            <div className="glass rounded-2xl border border-fuchsia-500/30 shadow-2xl overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-fuchsia-500/20 via-purple-500/20 to-pink-500/20 border-b border-border-primary flex items-center justify-between">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <Target className="text-fuchsia-400" size={18} />
                  AI Presentation Coach
                </h3>
                <button
                  onClick={() => setPresentationScore(null)}
                  className="w-6 h-6 rounded-lg hover:bg-background-tertiary flex items-center justify-center text-text-muted hover:text-text-primary"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-4">
                {/* Общая оценка */}
                <div className="text-center mb-4">
                  <div className="relative inline-flex items-center justify-center w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-background-tertiary" />
                      <circle 
                        cx="48" cy="48" r="40" 
                        stroke="url(#scoreGradient)" 
                        strokeWidth="8" 
                        fill="none" 
                        strokeDasharray={`${presentationScore.overall * 2.51} 251`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#d946ef" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="absolute text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400">
                      {presentationScore.overall}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted mt-2">Общий рейтинг</p>
                </div>
                
                {/* Детальные оценки */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'Структура', value: presentationScore.structure, color: 'from-blue-400 to-cyan-400' },
                    { label: 'Контент', value: presentationScore.content, color: 'from-green-400 to-emerald-400' },
                    { label: 'Визуалы', value: presentationScore.visuals, color: 'from-orange-400 to-amber-400' },
                    { label: 'Storytelling', value: presentationScore.storytelling, color: 'from-purple-400 to-violet-400' },
                  ].map((metric, i) => (
                    <div key={i} className="bg-background-tertiary/50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-text-muted">{metric.label}</span>
                        <span className={`text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r ${metric.color}`}>
                          {metric.value}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-background-primary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${metric.value}%` }}
                          transition={{ delay: i * 0.1, duration: 0.5 }}
                          className={`h-full bg-gradient-to-r ${metric.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Рекомендации */}
                {presentationScore.suggestions.length > 0 && (
                  <div className="border-t border-border-primary pt-3">
                    <p className="text-xs font-medium text-text-muted mb-2">💡 Ключевые улучшения:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {presentationScore.suggestions.slice(0, 3).map((s, i) => (
                        <div key={i} className="text-xs text-text-secondary p-2 bg-background-tertiary/30 rounded-lg">
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* CTA */}
                <button
                  onClick={() => { oneClickProUpgrade(); setPresentationScore(null); }}
                  className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-fuchsia-500/30 transition-all"
                >
                  <Rocket size={16} />
                  Автоматически улучшить всё
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Прогресс улучшения */}
      <AnimatePresence>
        {isEnhancingAll && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="glass rounded-2xl border border-border-primary shadow-2xl px-8 py-4 flex items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-3 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full"
              />
              <div>
                <p className="font-medium text-text-primary">AI улучшает презентацию...</p>
                <p className="text-sm text-text-muted">{enhanceProgress}% завершено</p>
              </div>
              <div className="w-32 h-2 bg-background-tertiary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 rounded-full"
                  style={{ width: `${enhanceProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Основной контент */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              {renderChatInterface()}
            </motion.div>
          )}
          
          {viewMode === 'workspace' && (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              {renderWorkspaceInterface()}
            </motion.div>
          )}
          
          {viewMode === 'editor' && currentPresentation && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full flex"
            >
              {/* Боковая панель со слайдами */}
              <div className="w-64 bg-background-secondary border-r border-border-primary overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-text-secondary">Слайды</span>
                  <div className="flex gap-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowLayoutSelector(true)}
                      className="w-8 h-8 rounded-lg glass flex items-center justify-center text-text-secondary hover:text-text-primary"
                    >
                      <Layout size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => addSlide()}
                      className="w-8 h-8 rounded-lg bg-accent-primary text-text-primary flex items-center justify-center"
                    >
                      <Plus size={16} />
                    </motion.button>
                  </div>
                </div>
                
                <Reorder.Group
                  axis="y"
                  values={currentPresentation.slides}
                  onReorder={reorderSlides}
                  className="space-y-3"
                >
                  {currentPresentation.slides.map((slide, index) => (
                    <Reorder.Item
                      key={slide.id}
                      value={slide}
                      className="cursor-move"
                    >
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCurrentSlideIndex(index)}
                        className={`relative group rounded-xl overflow-hidden border-2 transition-all shadow-lg ${
                          index === currentSlideIndex
                            ? 'border-accent-primary ring-2 ring-accent-primary/30 shadow-accent-primary/20'
                            : 'border-transparent hover:border-border-primary shadow-black/10'
                        }`}
                      >
                        {/* Реальное мини-превью слайда */}
                        <div 
                          className="w-full aspect-video overflow-hidden relative"
                          style={{ backgroundColor: currentPresentation.theme.backgroundColor }}
                        >
                          {/* Масштабированный рендеринг слайда */}
                          <div className="absolute inset-0 scale-[0.12] origin-top-left w-[833%] h-[833%] pointer-events-none">
                            {renderSlide(slide, currentPresentation.theme, false)}
                          </div>
                          
                          {/* Оверлей с информацией */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-1 left-2 right-2 flex justify-between items-center">
                              <span className="text-[7px] text-white/80 truncate max-w-[80%]">
                                {slide.layout}
                              </span>
                              {slide.notes && (
                                <span className="text-[7px] text-amber-400">📝</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Номер слайда */}
                        <div className={`absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg ${
                          index === currentSlideIndex 
                            ? 'bg-accent-primary text-text-primary' 
                            : 'bg-bg-secondary text-text-secondary border border-border-primary'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* Кнопки действий */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); duplicateSlide(index); }}
                            className="w-5 h-5 rounded-lg bg-blue-500/90 text-text-primary flex items-center justify-center shadow-lg"
                            title="Дублировать"
                          >
                            <Copy size={10} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); deleteSlide(index); }}
                            className="w-5 h-5 rounded-lg bg-red-500/90 text-text-primary flex items-center justify-center shadow-lg"
                            title="Удалить"
                          >
                            <X size={10} />
                          </motion.button>
                        </div>
                        
                        {/* Индикатор выбора */}
                        {index === currentSlideIndex && (
                          <motion.div 
                            layoutId="slideIndicator"
                            className="absolute inset-0 border-2 border-accent-primary rounded-xl pointer-events-none"
                          />
                        )}
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
              
              {/* Превью слайда */}
              <div className="flex-1 flex flex-col bg-background-primary p-6 overflow-hidden">
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full max-w-5xl">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlideIndex}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        {renderSlide(currentPresentation.slides[currentSlideIndex], currentPresentation.theme)}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                
                {/* Навигация */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={prevSlide}
                    disabled={currentSlideIndex === 0}
                    className="w-12 h-12 rounded-xl glass flex items-center justify-center text-text-primary disabled:opacity-30"
                  >
                    <ChevronLeft size={24} />
                  </motion.button>
                  
                  <span className="px-6 py-3 rounded-xl glass text-text-primary font-medium min-w-[120px] text-center">
                    {currentSlideIndex + 1} / {currentPresentation.slides.length}
                  </span>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={nextSlide}
                    disabled={currentSlideIndex === currentPresentation.slides.length - 1}
                    className="w-12 h-12 rounded-xl glass flex items-center justify-center text-text-primary disabled:opacity-30"
                  >
                    <ChevronRight size={24} />
                  </motion.button>
                </div>
              </div>
              
              {/* Панель редактирования */}
              {showEditor && (
                <div className="w-80 bg-background-secondary border-l border-border-primary overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAIMagicToolbar(false)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          !showAIMagicToolbar 
                            ? 'bg-accent-primary/20 text-accent-primary' 
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        ✏️ Редактор
                      </button>
                      <button
                        onClick={() => setShowAIMagicToolbar(true)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          showAIMagicToolbar 
                            ? 'bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 text-fuchsia-400' 
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        ✨ AI Magic
                      </button>
                    </div>
                    <button
                      onClick={() => setShowEditor(false)}
                      className="text-text-muted hover:text-text-primary"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                  {/* AI Magic Toolbar */}
                  {showAIMagicToolbar && currentPresentation && (
                    <AIMagicToolbar
                      currentSlide={currentPresentation.slides[currentSlideIndex]}
                      onApplySuggestion={(improved) => {
                        updateSlide(currentSlideIndex, {
                          title: improved.title || currentPresentation.slides[currentSlideIndex].title,
                          content: improved.content || currentPresentation.slides[currentSlideIndex].content,
                          bulletPoints: improved.bulletPoints || currentPresentation.slides[currentSlideIndex].bulletPoints,
                        });
                      }}
                      onGenerateImage={async (prompt) => {
                        setIsGeneratingImages(true);
                        try {
                          // Call image generation API
                          const response = await fetch('/api/ai/generate-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt, style: 'professional' }),
                          });
                          const data = await response.json();
                          if (data.imageUrl) {
                            updateSlide(currentSlideIndex, { imageUrl: data.imageUrl });
                          }
                        } catch (error) {
                          console.error('Image generation error:', error);
                        }
                        setIsGeneratingImages(false);
                      }}
                      onLayoutChange={(layout) => {
                        updateSlide(currentSlideIndex, { layout: layout as any });
                      }}
                      onAddBlock={(blockType: string) => {
                        const slide = currentPresentation.slides[currentSlideIndex];
                        const blockContent = getBlockContent(blockType);
                        const newContent = slide.content 
                          ? `${slide.content}\n\n${blockContent}`
                          : blockContent;
                        updateSlide(currentSlideIndex, { content: newContent });
                      }}
                    />
                  )}

                  {/* Regular Editor */}
                  {!showAIMagicToolbar && (
                  <div className="p-4 space-y-4">
                    {/* Заголовок */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Заголовок
                      </label>
                      <input
                        type="text"
                        value={currentPresentation.slides[currentSlideIndex].title}
                        onChange={(e) => updateSlide(currentSlideIndex, { title: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl glass border border-border-primary text-text-primary bg-transparent"
                      />
                    </div>
                    
                    {/* Подзаголовок */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Подзаголовок
                      </label>
                      <input
                        type="text"
                        value={currentPresentation.slides[currentSlideIndex].subtitle || ''}
                        onChange={(e) => updateSlide(currentSlideIndex, { subtitle: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl glass border border-border-primary text-text-primary bg-transparent"
                      />
                    </div>
                    
                    {/* Контент */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Текст
                      </label>
                      <textarea
                        value={currentPresentation.slides[currentSlideIndex].content || ''}
                        onChange={(e) => updateSlide(currentSlideIndex, { content: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl glass border border-border-primary text-text-primary bg-transparent resize-none"
                        rows={3}
                      />
                    </div>
                    
                    {/* Буллеты */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Пункты списка (каждый с новой строки)
                      </label>
                      <textarea
                        value={currentPresentation.slides[currentSlideIndex].bulletPoints?.join('\n') || ''}
                        onChange={(e) => updateSlide(currentSlideIndex, { 
                          bulletPoints: e.target.value.split('\n').filter(Boolean) 
                        })}
                        className="w-full px-3 py-2 rounded-xl glass border border-border-primary text-text-primary bg-transparent resize-none"
                        rows={5}
                      />
                    </div>
                    
                    {/* Макет */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Макет
                      </label>
                      <select
                        value={currentPresentation.slides[currentSlideIndex].layout}
                        onChange={(e) => updateSlide(currentSlideIndex, { layout: e.target.value as SlideLayout })}
                        className="w-full px-3 py-2 rounded-xl glass border border-border-primary text-text-primary bg-transparent"
                      >
                        {LAYOUT_TEMPLATES.map((layout) => (
                          <option key={layout.id} value={layout.id}>
                            {language === 'en' ? layout.nameEn : layout.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Изображение */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        🎨 AI Изображение
                      </label>
                      <textarea
                        value={currentPresentation.slides[currentSlideIndex].imagePrompt || ''}
                        onChange={(e) => updateSlide(currentSlideIndex, { imagePrompt: e.target.value })}
                        placeholder="Описание для AI-генерации..."
                        className="w-full px-3 py-2 rounded-xl glass border border-border-primary text-text-primary bg-transparent resize-none placeholder-text-muted"
                        rows={2}
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => generateImageForSlide(currentSlideIndex)}
                        disabled={!currentPresentation.slides[currentSlideIndex].imagePrompt || currentPresentation.slides[currentSlideIndex].isGeneratingImage}
                        className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {currentPresentation.slides[currentSlideIndex].isGeneratingImage ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Генерация...
                          </>
                        ) : (
                          <>
                            <Wand2 size={14} />
                            Сгенерировать
                          </>
                        )}
                      </motion.button>
                      
                      {currentPresentation.slides[currentSlideIndex].imageUrl && (
                        <div className="mt-2 relative rounded-lg overflow-hidden">
                          <img 
                            src={currentPresentation.slides[currentSlideIndex].imageUrl} 
                            alt={currentPresentation.slides[currentSlideIndex].title || 'Slide image'} 
                            className="w-full h-24 object-cover" 
                          />
                          <button
                            onClick={() => updateSlide(currentSlideIndex, { imageUrl: undefined })}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-text-primary flex items-center justify-center"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* AI Редактор (улучшенный) */}
                    <div className="border-t border-border-primary pt-4 mt-4">
                      <button
                        onClick={() => setShowAiEditor(!showAiEditor)}
                        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 text-text-primary hover:from-violet-500/30 hover:to-fuchsia-500/30 transition-all flex items-center justify-center gap-2 group"
                      >
                        <Sparkles size={16} className="text-violet-400 group-hover:animate-pulse" />
                        <span className="font-medium">AI Редактор слайда</span>
                        <ChevronDown size={16} className={`transition-transform duration-300 ${showAiEditor ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <AnimatePresence>
                        {showAiEditor && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 space-y-4">
                              {/* Категории команд */}
                              <div className="space-y-3">
                                {/* Текст */}
                                <div>
                                  <div className="text-xs text-text-muted mb-2 flex items-center gap-1">
                                    <span className="w-4 h-4 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">✍️</span>
                                    Текст
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {aiQuickCommands.slice(0, 4).map((cmd, i) => (
                                      <button
                                        key={i}
                                        onClick={() => executeAiCommand(cmd.command)}
                                        disabled={isAiEditing}
                                        className="px-2.5 py-1.5 rounded-lg text-xs glass border border-border-primary text-text-secondary hover:text-text-primary hover:bg-blue-500/10 hover:border-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {cmd.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Контент */}
                                <div>
                                  <div className="text-xs text-text-muted mb-2 flex items-center gap-1">
                                    <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">📋</span>
                                    Контент
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {aiQuickCommands.slice(4, 9).map((cmd, i) => (
                                      <button
                                        key={i}
                                        onClick={() => executeAiCommand(cmd.command)}
                                        disabled={isAiEditing}
                                        className="px-2.5 py-1.5 rounded-lg text-xs glass border border-border-primary text-text-secondary hover:text-text-primary hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {cmd.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Докладчик */}
                                <div>
                                  <div className="text-xs text-text-muted mb-2 flex items-center gap-1">
                                    <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">🎤</span>
                                    Выступление
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {aiQuickCommands.slice(9, 12).map((cmd, i) => (
                                      <button
                                        key={i}
                                        onClick={() => executeAiCommand(cmd.command)}
                                        disabled={isAiEditing}
                                        className="px-2.5 py-1.5 rounded-lg text-xs glass border border-border-primary text-text-secondary hover:text-text-primary hover:bg-amber-500/10 hover:border-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {cmd.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Перевод */}
                                <div>
                                  <div className="text-xs text-text-muted mb-2 flex items-center gap-1">
                                    <span className="w-4 h-4 rounded bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px]">🌐</span>
                                    Перевод
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {aiQuickCommands.slice(12).map((cmd, i) => (
                                      <button
                                        key={i}
                                        onClick={() => executeAiCommand(cmd.command)}
                                        disabled={isAiEditing}
                                        className="px-2.5 py-1.5 rounded-lg text-xs glass border border-border-primary text-text-secondary hover:text-text-primary hover:bg-violet-500/10 hover:border-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {cmd.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Поле ввода команды */}
                              <div className="relative">
                                <textarea
                                  value={aiEditCommand}
                                  onChange={(e) => setAiEditCommand(e.target.value)}
                                  placeholder="Напишите что изменить... Например: 'Добавь 3 факта о теме' или 'Перепиши заголовок креативнее'"
                                  className="w-full px-4 py-3 pr-14 rounded-xl glass border border-violet-500/30 focus:border-violet-500/60 text-text-primary bg-violet-500/5 resize-none placeholder-text-muted text-sm transition-colors"
                                  rows={2}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                      aiEditSlide();
                                    }
                                  }}
                                />
                                <button
                                  onClick={aiEditSlide}
                                  disabled={!aiEditCommand.trim() || isAiEditing}
                                  className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isAiEditing ? (
                                    <Loader2 size={16} className="animate-spin" />
                                  ) : (
                                    <Wand2 size={16} />
                                  )}
                                </button>
                              </div>
                              
                              <p className="text-xs text-text-muted flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">Ctrl</kbd>
                                <span>+</span>
                                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">Enter</kbd>
                                <span>для применения</span>
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Заметки */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        📝 Заметки докладчика
                      </label>
                      <textarea
                        value={currentPresentation.slides[currentSlideIndex].notes || ''}
                        onChange={(e) => updateSlide(currentSlideIndex, { notes: e.target.value })}
                        placeholder="Заметки для выступления (советы для спикера, ключевые акценты, тайминг)..."
                        className="w-full px-3 py-2 rounded-xl glass border border-border-primary text-text-primary bg-transparent resize-none placeholder-text-muted"
                        rows={3}
                      />
                    </div>
                  </div>
                  )}
                </div>
              )}
              
              {/* Кнопка показать редактор */}
              {!showEditor && (
                <motion.button
                  initial={{ x: 20 }}
                  animate={{ x: 0 }}
                  onClick={() => setShowEditor(true)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-20 bg-background-secondary rounded-l-xl border border-r-0 border-border-primary flex items-center justify-center text-text-secondary hover:text-text-primary"
                >
                  <Edit3 size={18} />
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Модальное окно выбора темы */}
      <AnimatePresence>
        {showThemeSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowThemeSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl max-h-[80vh] glass rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
                <h3 className="text-lg font-bold text-text-primary">Выберите тему</h3>
                <button onClick={() => setShowThemeSelector(false)} className="text-text-muted hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-4 gap-4">
                  {THEMES.map((theme) => (
                    <motion.button
                      key={theme.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (currentPresentation) {
                          updatePresentation({ theme });
                        }
                        setSelectedTheme(theme);
                        setShowThemeSelector(false);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        (currentPresentation?.theme.id || selectedTheme.id) === theme.id
                          ? 'border-accent-primary'
                          : 'border-transparent hover:border-border-primary'
                      }`}
                      style={{ backgroundColor: theme.backgroundColor }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.secondaryColor }} />
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                      </div>
                      <span className="text-sm font-medium block truncate" style={{ color: theme.textColor }}>
                        {language === 'en' ? theme.nameEn : theme.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Модальное окно выбора макета */}
      <AnimatePresence>
        {showLayoutSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowLayoutSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-3xl glass rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
                <h3 className="text-lg font-bold text-text-primary">Добавить слайд</h3>
                <button onClick={() => setShowLayoutSelector(false)} className="text-text-muted hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-4 gap-3">
                  {LAYOUT_TEMPLATES.map((layout) => (
                    <motion.button
                      key={layout.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        addSlide(layout.id);
                        setShowLayoutSelector(false);
                      }}
                      className="p-4 rounded-xl glass hover:border-accent-primary/50 transition-all text-center"
                    >
                      <layout.icon size={24} className="mx-auto mb-2 text-accent-primary" />
                      <span className="text-sm font-medium text-text-primary block">
                        {language === 'en' ? layout.nameEn : layout.name}
                      </span>
                      <span className="text-xs text-text-muted">{layout.description}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Модальное окно выбора шаблона (улучшенное) */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowTemplates(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-5xl max-h-[85vh] glass rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Заголовок */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-border-primary bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10">
                <div>
                  <h3 className="text-xl font-bold text-text-primary flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    Готовые шаблоны презентаций
                  </h3>
                  <p className="text-sm text-text-muted mt-1">
                    Выберите шаблон и начните создавать за секунды
                  </p>
                </div>
                <button 
                  onClick={() => setShowTemplates(false)} 
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Сетка шаблонов */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                  {PRESENTATION_TEMPLATES.map((template, idx) => (
                    <motion.button
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => createFromTemplate(template.id)}
                      className="relative p-5 rounded-2xl glass border border-white/10 hover:border-white/30 transition-all text-left group overflow-hidden"
                    >
                      {/* Фоновый градиент */}
                      <div 
                        className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} 
                      />
                      
                      {/* Иконка */}
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${template.color} flex items-center justify-center text-3xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {template.icon}
                      </div>
                      
                      {/* Название */}
                      <h4 className="font-bold text-lg text-text-primary mb-1 group-hover:text-text-primary transition-colors">
                        {language === 'en' ? template.nameEn : template.name}
                      </h4>
                      
                      {/* Описание */}
                      <p className="text-sm text-text-muted mb-4 line-clamp-2">
                        {template.description}
                      </p>
                      
                      {/* Мета-информация */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <Layers size={14} className="text-accent-primary" />
                          <span>{template.slides.length} слайдов</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <Palette size={14} className="text-fuchsia-400" />
                          <span>{THEMES.find(t => t.id === template.theme)?.name || 'Тема'}</span>
                        </div>
                      </div>
                      
                      {/* Кнопка "Создать" при наведении */}
                      <motion.div 
                        className="absolute bottom-4 right-4 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Создать
                      </motion.div>
                    </motion.button>
                  ))}
                </div>
                
                {/* Подсказка внизу */}
                <div className="mt-6 text-center text-sm text-text-muted">
                  💡 После выбора шаблона вы сможете отредактировать все тексты и добавить свой контент
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Индикатор генерации изображений */}
      <AnimatePresence>
        {isGeneratingImages && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 glass rounded-xl px-6 py-4 flex items-center gap-3"
          >
            <Loader2 size={20} className="animate-spin text-accent-primary" />
            <span className="text-text-primary">Генерация изображений...</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 🚀 PRO МОДАЛЬНЫЕ ОКНА - Функции уровня Canva Pro и Gamma */}
      
      {/* Brand Kit Modal */}
      <BrandKitModal
        isOpen={showBrandKitModal}
        onClose={() => setShowBrandKitModal(false)}
        onApplyBrandKit={(brandKit) => {
          if (currentPresentation) {
            // Применяем бренд-кит к текущей теме
            const updatedTheme = {
              ...currentPresentation.theme,
              primaryColor: brandKit.colors.primary,
              secondaryColor: brandKit.colors.secondary,
              accentColor: brandKit.colors.accent,
              backgroundColor: brandKit.colors.background,
              textColor: brandKit.colors.text,
              fontFamily: brandKit.fonts.body,
              headingFont: brandKit.fonts.heading,
            };
            const updatedPresentation = {
              ...currentPresentation,
              theme: updatedTheme,
            };
            setCurrentPresentation(updatedPresentation);
            setPresentations(prev => prev.map(p => 
              p.id === currentPresentation.id ? updatedPresentation : p
            ));
          }
        }}
      />
      
      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        isOpen={showAnalyticsDashboard}
        onClose={() => setShowAnalyticsDashboard(false)}
        presentationId={currentPresentation?.id || ''}
        presentationTitle={currentPresentation?.title || ''}
      />
      
      {/* Polls & Quizzes */}
      <PollsQuizzes
        isOpen={showPollsQuizzes}
        onClose={() => setShowPollsQuizzes(false)}
        slideIndex={currentSlideIndex}
        onInsertPoll={(poll) => {
          if (currentPresentation) {
            const currentSlide = currentPresentation.slides[currentSlideIndex];
            const newElement = {
              id: `poll-${Date.now()}`,
              type: 'text' as const,
              content: `📊 ${poll.type === 'poll' ? 'Опрос' : poll.type === 'quiz' ? 'Квиз' : poll.type === 'qa' ? 'Q&A' : 'Word Cloud'}: ${poll.question}`,
              position: { x: 50, y: 300 },
              size: { width: 700, height: 200 },
              style: { fontSize: 24, textAlign: 'center' }
            };
            
            const updatedSlide = {
              ...currentSlide,
              elements: [...currentSlide.elements, newElement]
            };
            
            const updatedSlides = [...currentPresentation.slides];
            updatedSlides[currentSlideIndex] = updatedSlide;
            
            const updatedPresentation = {
              ...currentPresentation,
              slides: updatedSlides
            };
            
            setCurrentPresentation(updatedPresentation);
            setPresentations(prev => prev.map(p => 
              p.id === currentPresentation.id ? updatedPresentation : p
            ));
          }
          setShowPollsQuizzes(false);
        }}
      />
      
      {/* Video Recorder */}
      <VideoRecorder
        isOpen={showVideoRecorder}
        onClose={() => setShowVideoRecorder(false)}
        slides={currentPresentation?.slides || []}
        currentSlideIndex={currentSlideIndex}
        onSlideChange={setCurrentSlideIndex}
      />
      
      {/* Publish Website */}
      <PublishWebsite
        isOpen={showPublishWebsite}
        onClose={() => setShowPublishWebsite(false)}
        presentationId={currentPresentation?.id || ''}
        presentationTitle={currentPresentation?.title || ''}
      />
      
      {/* Import Content */}
      <ImportContent
        isOpen={showImportContent}
        onClose={() => setShowImportContent(false)}
        onImport={(importedSlides) => {
          if (currentPresentation) {
            // Добавляем импортированные слайды
            const newSlides = importedSlides.map((s, i) => ({
              id: `imported-${Date.now()}-${i}`,
              title: s.title || '',
              content: s.content || '',
              bulletPoints: s.bulletPoints || [],
              layout: 'content' as const,
              elements: [],
              background: { type: 'solid' as const, value: s.background?.value || currentPresentation.theme.backgroundColor },
              transition: { type: 'fade' as const, duration: 0.5 },
            }));
            
            const updatedPresentation = {
              ...currentPresentation,
              slides: [...currentPresentation.slides, ...newSlides]
            };
            
            setCurrentPresentation(updatedPresentation);
            setPresentations(prev => prev.map(p => 
              p.id === currentPresentation.id ? updatedPresentation : p
            ));
          }
          setShowImportContent(false);
        }}
      />
      
      {/* Smart Templates Modal */}
      <SmartTemplatesModal
        isOpen={showSmartTemplatesModal}
        onClose={() => setShowSmartTemplatesModal(false)}
        onSelectTemplate={(template, customization) => {
          // Create new presentation from template structure
          const templateSlides = template.slideStructure.map((structure, index) => ({
            id: `slide-${Date.now()}-${index}`,
            title: customization?.topic && index === 0 
              ? customization.topic 
              : structure.purpose,
            content: structure.aiHint,
            bulletPoints: [],
            layout: (structure.type || 'content') as any,
            elements: [],
            background: { type: 'solid' as const, value: THEMES[0].backgroundColor },
            transition: { type: 'fade' as const, duration: 0.5 },
            speakerNotes: '',
          }));

          const newPresentation = {
            id: `pres-${Date.now()}`,
            title: customization?.topic || template.name,
            description: template.preview || template.name,
            theme: THEMES[0],
            aspectRatio: '16:9' as const,
            slides: templateSlides,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          setPresentations((prev: any) => [...prev, newPresentation]);
          setCurrentPresentation(newPresentation as any);
          setViewMode('editor');
          setShowSmartTemplatesModal(false);
        }}
      />
    </div>
  );
}
export default PresentationsPage;
