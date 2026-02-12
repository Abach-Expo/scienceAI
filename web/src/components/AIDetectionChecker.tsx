/**
 * 🛡️ AI DETECTION CHECKER
 * Компонент для проверки текста на признаки AI-генерации
 * Поддержка загрузки файлов: TXT, DOCX, PDF
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { quickHumanize } from '../services/antiAIDetection';
import { useSubscriptionStore } from '../store/subscriptionStore';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Wand2,
  Sparkles,
  Upload,
  FileText,
  File,
  X,
  Lock,
} from 'lucide-react';

// ================== ПАТТЕРНЫ ДЕТЕКЦИИ ==================

const AI_PATTERNS = {
  ru: [
    { pattern: /в современном мире/gi, severity: 'high', fix: 'На сегодняшний день' },
    { pattern: /в наше время/gi, severity: 'medium', fix: 'В настоящее время' },
    { pattern: /в эпоху цифровизации/gi, severity: 'high', fix: 'С развитием технологий' },
    { pattern: /данная тема.{0,20}актуальн/gi, severity: 'high', fix: 'Эта проблема заслуживает внимания' },
    { pattern: /не подлежит сомнению/gi, severity: 'medium', fix: 'Представляется очевидным' },
    { pattern: /важно отметить, что/gi, severity: 'medium', fix: 'Стоит обратить внимание' },
    { pattern: /следует подчеркнуть/gi, severity: 'low', fix: 'Отметим' },
    { pattern: /несомненно,/gi, severity: 'medium', fix: 'По всей видимости,' },
    { pattern: /безусловно,/gi, severity: 'medium', fix: 'Вероятно,' },
    { pattern: /в заключение следует сказать/gi, severity: 'high', fix: 'Обобщая изложенное' },
    { pattern: /таким образом, можно сделать вывод/gi, severity: 'high', fix: 'Подводя итог' },
    { pattern: /резюмируя вышесказанное/gi, severity: 'high', fix: 'Суммируя' },
    { pattern: /является неотъемлемой частью/gi, severity: 'medium', fix: 'составляет важную часть' },
    { pattern: /играет важную роль/gi, severity: 'low', fix: 'имеет значение' },
    { pattern: /на сегодняшний день существует/gi, severity: 'medium', fix: 'Сейчас имеется' },
    { pattern: /по мнению многих экспертов/gi, severity: 'high', fix: 'Ряд специалистов отмечает' },
    { pattern: /широко известно, что/gi, severity: 'medium', fix: 'Установлено, что' },
  ],
  en: [
    { pattern: /in today's world/gi, severity: 'high', fix: 'Currently' },
    { pattern: /in this day and age/gi, severity: 'high', fix: 'Today' },
    { pattern: /it is important to note that/gi, severity: 'medium', fix: 'Note that' },
    { pattern: /it goes without saying/gi, severity: 'high', fix: 'Clearly' },
    { pattern: /in conclusion,/gi, severity: 'low', fix: 'To summarize,' },
    { pattern: /it is worth mentioning/gi, severity: 'medium', fix: 'Notably,' },
    { pattern: /plays a crucial role/gi, severity: 'medium', fix: 'is significant' },
    { pattern: /has become increasingly/gi, severity: 'low', fix: 'is now more' },
  ],
};

const HUMAN_MARKERS = {
  ru: [
    'на наш взгляд',
    'представляется',
    'по всей видимости',
    'вероятно',
    'можно предположить',
    'по-видимому',
    'как представляется',
    'думается',
    'полагаем',
    'считаем',
    'признаем',
    'возникает вопрос',
    'нельзя не отметить',
    'заслуживает внимания',
    'вызывает интерес',
  ],
  en: [
    'in our view',
    'we believe',
    'it seems',
    'arguably',
    'we assume',
    'one might argue',
    'it appears',
    'presumably',
    'apparently',
    'interestingly',
  ],
};

// ================== ТИПЫ ==================

interface DetectionResult {
  score: number; // 0-100, где 0 = 100% человек, 100 = 100% AI
  riskLevel: 'safe' | 'low' | 'medium' | 'high';
  issues: DetectionIssue[];
  humanMarkers: string[];
  suggestions: string[];
  stats: {
    totalWords: number;
    avgSentenceLength: number;
    paragraphVariety: number;
    aiPatternCount: number;
    humanMarkerCount: number;
  };
}

interface DetectionIssue {
  text: string;
  pattern: string;
  severity: 'low' | 'medium' | 'high';
  fix: string;
  position: number;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
}

// ================== ПАРСИНГ ФАЙЛОВ ==================

const SUPPORTED_FILE_TYPES = [
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'application/msword',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function parseTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file, 'UTF-8');
  });
}

async function parseDocxFile(file: File): Promise<string> {
  // Простой парсинг DOCX (извлекаем текст из XML)
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // DOCX это ZIP архив, ищем document.xml
  try {
    // Импортируем JSZip динамически
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(uint8Array);
    const documentXml = await zip.file('word/document.xml')?.async('string');
    
    if (!documentXml) {
      throw new Error('Не удалось найти содержимое документа');
    }
    
    // Извлекаем текст из XML
    const textContent = documentXml
      .replace(/<w:p[^>]*>/g, '\n')  // Параграфы
      .replace(/<w:br[^>]*>/g, '\n') // Переносы строк
      .replace(/<[^>]+>/g, '')       // Убираем все теги
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')    // Убираем лишние переносы
      .trim();
    
    return textContent;
  } catch {
    // Fallback: простой парсинг
    const text = new TextDecoder().decode(uint8Array);
    // Пытаемся извлечь текст между тегами
    const textContent = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return textContent.length > 100 ? textContent : 'Не удалось извлечь текст из DOCX файла';
  }
}

async function parsePdfFile(file: File): Promise<string> {
  // Для PDF используем простой текстовый извлечение или сообщение
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
  
  // Пытаемся найти текстовые потоки в PDF
  const textMatches = text.match(/\(([^)]+)\)/g);
  if (textMatches && textMatches.length > 10) {
    const extractedText = textMatches
      .map(m => m.slice(1, -1))
      .filter(t => t.length > 2 && !/^[0-9\s.]+$/.test(t))
      .join(' ')
      .replace(/\\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (extractedText.length > 100) {
      return extractedText;
    }
  }
  
  return `⚠️ PDF файлы требуют специальной обработки. Для полноценного анализа PDF рекомендуем:\n\n1. Скопировать текст из PDF вручную\n2. Или конвертировать PDF в DOCX/TXT\n\nЧастично извлечённый текст:\n${text.slice(0, 500)}...`;
}

async function parseFile(file: File): Promise<UploadedFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Файл слишком большой (максимум ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }
  
  let content: string;
  
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    content = await parseTextFile(file);
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx')
  ) {
    content = await parseDocxFile(file);
  } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    content = await parsePdfFile(file);
  } else if (file.type === 'application/msword' || file.name.endsWith('.doc')) {
    throw new Error('Формат .doc не поддерживается. Пожалуйста, сохраните документ как .docx');
  } else {
    throw new Error(`Неподдерживаемый формат файла: ${file.type || file.name}`);
  }
  
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    content,
  };
}

// ================== ФУНКЦИИ АНАЛИЗА ==================

function detectLanguage(text: string): 'ru' | 'en' {
  const russianChars = (text.match(/[а-яё]/gi) || []).length;
  const englishChars = (text.match(/[a-z]/gi) || []).length;
  return russianChars > englishChars ? 'ru' : 'en';
}

function analyzeText(text: string): DetectionResult {
  // Защита от пустого или слишком короткого текста
  if (!text || text.trim().length < 50) {
    return {
      score: 0,
      riskLevel: 'safe',
      issues: [],
      humanMarkers: [],
      suggestions: ['Добавьте больше текста для точного анализа (минимум 50 символов)'],
      stats: {
        totalWords: text ? text.split(/\s+/).filter(Boolean).length : 0,
        avgSentenceLength: 0,
        paragraphVariety: 0,
        aiPatternCount: 0,
        humanMarkerCount: 0,
      },
    };
  }
  
  const language = detectLanguage(text);
  const patterns = AI_PATTERNS[language];
  const markers = HUMAN_MARKERS[language];
  
  const issues: DetectionIssue[] = [];
  let aiPatternCount = 0;
  
  // Поиск AI-паттернов
  patterns.forEach(({ pattern, severity, fix }) => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        text: match[0],
        pattern: pattern.source,
        severity: severity as 'low' | 'medium' | 'high',
        fix,
        position: match.index,
      });
      aiPatternCount++;
    }
  });
  
  // Поиск человеческих маркеров
  const humanMarkers: string[] = [];
  let humanMarkerCount = 0;
  markers.forEach(marker => {
    if (text.toLowerCase().includes(marker)) {
      humanMarkers.push(marker);
      humanMarkerCount++;
    }
  });
  
  // Анализ структуры
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((acc, s) => acc + s.split(/\s+/).length, 0) / sentences.length
    : 0;
  
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
  const firstWords = paragraphs.map(p => p.trim().split(/\s+/)[0]?.toLowerCase() || '');
  const uniqueFirstWords = new Set(firstWords);
  const paragraphVariety = paragraphs.length > 0 
    ? (uniqueFirstWords.size / paragraphs.length) * 100 
    : 100;
  
  // Расчёт скора
  const severityWeights = { low: 3, medium: 7, high: 12 };
  const aiPenalty = issues.reduce((acc, issue) => acc + severityWeights[issue.severity], 0);
  const humanBonus = Math.min(humanMarkerCount * 6, 30);
  const varietyBonus = paragraphVariety > 70 ? 10 : paragraphVariety > 50 ? 5 : 0;
  
  // Штраф за слишком равномерную длину предложений
  const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
  const sentenceVariance = sentenceLengths.length > 1
    ? sentenceLengths.reduce((acc, len) => acc + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length
    : 0;
  const varietyPenalty = sentenceVariance < 20 ? 10 : 0; // Слишком однообразные предложения
  
  const rawScore = Math.max(0, aiPenalty - humanBonus - varietyBonus + varietyPenalty);
  const score = Math.min(100, Math.round(rawScore * 1.5));
  
  // Определение уровня риска
  let riskLevel: 'safe' | 'low' | 'medium' | 'high';
  if (score < 20) riskLevel = 'safe';
  else if (score < 40) riskLevel = 'low';
  else if (score < 60) riskLevel = 'medium';
  else riskLevel = 'high';
  
  // Генерация рекомендаций
  const suggestions: string[] = [];
  if (aiPatternCount > 0) {
    suggestions.push(`Замените ${aiPatternCount} шаблонных AI-фраз на более естественные`);
  }
  if (humanMarkerCount < 3) {
    suggestions.push('Добавьте больше авторских ремарок ("на наш взгляд", "представляется")');
  }
  if (paragraphVariety < 70) {
    suggestions.push('Варьируйте начала абзацев: используйте союзы, наречия, вопросы');
  }
  if (avgSentenceLength > 25) {
    suggestions.push('Разбейте длинные предложения на более короткие');
  }
  if (avgSentenceLength < 10) {
    suggestions.push('Объедините короткие предложения для лучшего flow');
  }
  if (sentenceVariance < 20 && sentences.length > 5) {
    suggestions.push('Чередуйте длину предложений: короткие + длинные');
  }
  
  return {
    score,
    riskLevel,
    issues,
    humanMarkers,
    suggestions,
    stats: {
      totalWords: text.split(/\s+/).length,
      avgSentenceLength: Math.round(avgSentenceLength),
      paragraphVariety: Math.round(paragraphVariety),
      aiPatternCount,
      humanMarkerCount,
    },
  };
}

// humanizeText now delegates to the canonical implementation in antiAIDetection.ts
function humanizeText(text: string): string {
  return quickHumanize(text);
}

// ================== КОМПОНЕНТ ==================

interface AIDetectionCheckerProps {
  text?: string;
  onHumanize?: (text: string) => void;
  compact?: boolean;
  allowFileUpload?: boolean;
}

export default function AIDetectionChecker({ text = '', onHumanize, compact = false, allowFileUpload = true }: AIDetectionCheckerProps) {
  const subscription = useSubscriptionStore();
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Текст для анализа: из файла или из props
  const textToAnalyze = uploadedFile?.content || text;
  
  // Проверка лимитов
  const checkLimits = useCallback(() => {
    const remaining = subscription.getRemainingLimits();
    if (remaining.analysis <= 0) {
      setLimitError(`Лимит анализов исчерпан (${subscription.getLimits().analysisPerMonth}/мес). Обновите план для продолжения.`);
      return false;
    }
    return true;
  }, [subscription]);
  
  const handleAnalyze = useCallback(() => {
    if (!textToAnalyze || textToAnalyze.length < 50) return;
    
    // Проверка лимитов
    if (!checkLimits()) return;
    
    setIsAnalyzing(true);
    setLimitError(null);
    
    // Инкрементируем использование
    subscription.incrementAcademicGenerations();
    
    // Имитируем небольшую задержку для UX
    setTimeout(() => {
      const analysisResult = analyzeText(textToAnalyze);
      setResult(analysisResult);
      setIsAnalyzing(false);
    }, 500);
  }, [textToAnalyze, checkLimits, subscription]);
  
  const handleHumanize = useCallback(() => {
    if (!textToAnalyze || !onHumanize) return;
    
    setIsHumanizing(true);
    setTimeout(() => {
      const humanizedText = humanizeText(textToAnalyze);
      onHumanize(humanizedText);
      setIsHumanizing(false);
      // Повторный анализ
      const newResult = analyzeText(humanizedText);
      setResult(newResult);
    }, 800);
  }, [textToAnalyze, onHumanize]);
  
  // Обработка загрузки файла
  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setResult(null);
    
    try {
      const parsed = await parseFile(file);
      setUploadedFile(parsed);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Ошибка загрузки файла');
    } finally {
      setIsUploading(false);
    }
  }, []);
  
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = ''; // Reset input
  }, [handleFileUpload]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const clearUploadedFile = useCallback(() => {
    setUploadedFile(null);
    setResult(null);
    setUploadError(null);
  }, []);
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };
  
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'safe': return 'text-green-400';
      case 'low': return 'text-emerald-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-text-secondary';
    }
  };
  
  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'safe': return <ShieldCheck className="w-5 h-5" />;
      case 'low': return <Shield className="w-5 h-5" />;
      case 'medium': return <ShieldAlert className="w-5 h-5" />;
      case 'high': return <ShieldOff className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };
  
  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'safe': return 'Безопасно';
      case 'low': return 'Низкий риск';
      case 'medium': return 'Средний риск';
      case 'high': return 'Высокий риск';
      default: return 'Неизвестно';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !textToAnalyze || textToAnalyze.length < 50}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-secondary border border-border-primary transition-all text-sm disabled:opacity-50"
        >
          {isAnalyzing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
          <span>AI Detector</span>
        </button>
        
        {result && (
          <div className={`flex items-center gap-1 ${getRiskColor(result.riskLevel)}`}>
            {getRiskIcon(result.riskLevel)}
            <span className="text-sm font-medium">{100 - result.score}%</span>
          </div>
        )}
      </div>
    );
  }

  // Получаем оставшиеся проверки
  const remainingAnalysis = subscription.getRemainingLimits().analysis;
  const isLimitExhausted = remainingAnalysis <= 0;

  return (
    <div className="rounded-xl bg-bg-secondary border border-border-primary overflow-hidden">
      {/* Блокировка при исчерпании лимита */}
      {isLimitExhausted && (
        <div className="p-4 bg-red-500/10 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-red-400">Лимит проверок исчерпан</h4>
              <p className="text-sm text-text-muted">
                Вы использовали все {subscription.getLimits().analysisPerMonth} проверок в этом месяце
              </p>
            </div>
            <a
              href="/pricing"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm font-medium hover:opacity-90 transition-all"
            >
              Обновить план
            </a>
          </div>
        </div>
      )}

      {/* Заголовок */}
      <div className="p-4 border-b border-border-primary">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">AI Detection Check</h3>
              <p className="text-xs text-text-muted">
                Проверка на признаки AI-генерации • Осталось: {remainingAnalysis} проверок
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !textToAnalyze || textToAnalyze.length < 50 || isLimitExhausted}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Проверить
            </button>
            
            {onHumanize && (
              <button
                onClick={handleHumanize}
                disabled={isHumanizing || !result || result.score < 20 || isLimitExhausted}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary hover:border-accent-primary transition-all disabled:opacity-50"
              >
                {isHumanizing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                Humanize
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Загрузка файла */}
      {allowFileUpload && !isLimitExhausted && (
        <div className="p-4 border-b border-border-primary">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx,.pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          {!uploadedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-border-primary hover:border-purple-500/50 hover:bg-bg-tertiary/50'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                  <p className="text-sm text-text-muted">Загрузка файла...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center">
                    <Upload className="w-6 h-6 text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Перетащите файл или нажмите для выбора
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Поддерживаются: TXT, DOCX, PDF (до 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                {uploadedFile.name.endsWith('.pdf') ? (
                  <File className="w-5 h-5 text-red-400" />
                ) : uploadedFile.name.endsWith('.docx') ? (
                  <FileText className="w-5 h-5 text-blue-400" />
                ) : (
                  <FileText className="w-5 h-5 text-green-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{uploadedFile.name}</p>
                <p className="text-xs text-text-muted">
                  {formatFileSize(uploadedFile.size)} • {uploadedFile.content.split(/\s+/).length} слов
                </p>
              </div>
              <button
                onClick={clearUploadedFile}
                className="p-2 rounded-lg hover:bg-bg-secondary text-text-muted hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {uploadError && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{uploadError}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Предупреждение о лимите */}
      {limitError && (
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{limitError}</span>
          </div>
        </div>
      )}
      
      {/* Результаты */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4"
          >
            {/* Основной скор */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  result.riskLevel === 'safe' ? 'bg-green-500/20' :
                  result.riskLevel === 'low' ? 'bg-emerald-500/20' :
                  result.riskLevel === 'medium' ? 'bg-yellow-500/20' :
                  'bg-red-500/20'
                }`}>
                  <span className={getRiskColor(result.riskLevel)}>
                    {getRiskIcon(result.riskLevel)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-text-primary">
                    {getRiskLabel(result.riskLevel)}
                  </div>
                  <div className="text-sm text-text-muted">
                    {100 - result.score}% человеческий текст
                  </div>
                </div>
              </div>
              
              {/* Прогресс бар */}
              <div className="w-32 h-3 rounded-full bg-bg-tertiary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - result.score}%` }}
                  className={`h-full rounded-full ${
                    result.riskLevel === 'safe' ? 'bg-green-500' :
                    result.riskLevel === 'low' ? 'bg-emerald-500' :
                    result.riskLevel === 'medium' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                />
              </div>
            </div>
            
            {/* Статистика */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-bg-tertiary text-center">
                <div className="text-lg font-bold text-text-primary">{result.stats.totalWords}</div>
                <div className="text-xs text-text-muted">Слов</div>
              </div>
              <div className="p-3 rounded-xl bg-bg-tertiary text-center">
                <div className="text-lg font-bold text-text-primary">{result.stats.avgSentenceLength}</div>
                <div className="text-xs text-text-muted">Сред. предл.</div>
              </div>
              <div className="p-3 rounded-xl bg-bg-tertiary text-center">
                <div className={`text-lg font-bold ${result.stats.aiPatternCount > 3 ? 'text-red-400' : 'text-green-400'}`}>
                  {result.stats.aiPatternCount}
                </div>
                <div className="text-xs text-text-muted">AI паттернов</div>
              </div>
              <div className="p-3 rounded-xl bg-bg-tertiary text-center">
                <div className={`text-lg font-bold ${result.stats.humanMarkerCount > 2 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {result.stats.humanMarkerCount}
                </div>
                <div className="text-xs text-text-muted">Авт. ремарок</div>
              </div>
            </div>
            
            {/* Рекомендации */}
            {result.suggestions.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-text-primary mb-2">Рекомендации:</div>
                <div className="space-y-2">
                  {result.suggestions.map((suggestion, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-accent-primary mt-0.5 flex-shrink-0" />
                      <span className="text-text-secondary">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Детали */}
            {result.issues.length > 0 && (
              <div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showDetails ? 'Скрыть детали' : 'Показать найденные паттерны'}
                </button>
                
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      {result.issues.slice(0, 10).map((issue, i) => (
                        <div key={i} className="p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                          <div className="flex items-center gap-2 mb-1">
                            {issue.severity === 'high' ? (
                              <XCircle className="w-4 h-4 text-red-400" />
                            ) : issue.severity === 'medium' ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-blue-400" />
                            )}
                            <span className="text-sm font-medium text-text-primary">"{issue.text}"</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span>→</span>
                            <span className="text-green-400">{issue.fix}</span>
                          </div>
                        </div>
                      ))}
                      {result.issues.length > 10 && (
                        <div className="text-sm text-text-muted text-center">
                          ...и ещё {result.issues.length - 10} паттернов
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Пустое состояние */}
      {!result && !isAnalyzing && !isLimitExhausted && (
        <div className="p-6 text-center text-text-muted">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {textToAnalyze && textToAnalyze.length >= 50
              ? 'Нажмите "Проверить" для анализа текста'
              : uploadedFile
                ? 'Файл загружен. Нажмите "Проверить" для анализа'
                : 'Загрузите файл или вставьте текст (мин. 50 символов)'}
          </p>
        </div>
      )}
      
      {/* Загрузка */}
      {isAnalyzing && (
        <div className="p-6 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 text-accent-primary animate-spin" />
          <p className="text-sm text-text-muted">Анализируем текст...</p>
        </div>
      )}
    </div>
  );
}

// ================== ЭКСПОРТ ФУНКЦИЙ ==================

export { analyzeText, humanizeText, detectLanguage };
export type { DetectionResult, DetectionIssue };
