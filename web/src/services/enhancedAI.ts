/**
 * 🚀 ENHANCED AI SERVICE v3.0 - Science AI Assistant
 * Улучшенный AI-сервис с интеллектуальными функциями
 * 
 * Возможности:
 * - Multi-model fallback (автоматический выбор модели)
 * - Интеллектуальный retry с экспоненциальным отступом + альтернативными промптами
 * - Валидация качества ответов (perplexity, burstiness, vocabulary)
 * - Anti-AI detection (обход GPTZero, Originality.ai, Turnitin)
 * - Контекстно-зависимая генерация по типу документа
 * - Rate limiting awareness + cost estimation
 * - Кэширование повторных запросов
 * - Streaming support
 */

import { API_URL } from '../config';
import { fetchWithAuth } from './apiClient';

// ================== ТИПЫ ==================

// Модельный роутинг: основная модель (тексты) + модель анализа + модель чата
export type AIModel = 'claude-sonnet-4' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';
export type TaskType = 'text_generation' | 'essay' | 'coursework' | 'referat' | 'dissertation' | 'style_improvement' | 'analysis' | 'presentation' | 'outline' | 'self_review' | 'chat' | 'plagiarism';
export type AIStyle = 'academic' | 'professional' | 'creative' | 'casual' | 'presentation' | 'minimal' | 'dissertation' | 'coursework' | 'essay';
export type DocumentType = 'dissertation' | 'thesis' | 'article' | 'coursework' | 'essay' | 'report' | 'labReport' | 'appeal' | 'researchProposal';

// Маппинг типов документов на задачи для модельного роутинга
export const DOCUMENT_TASK_MAP: Record<string, TaskType> = {
  dissertation: 'dissertation',
  thesis: 'dissertation',
  coursework: 'coursework',
  essay: 'essay',
  report: 'text_generation',
  labReport: 'text_generation',
  article: 'text_generation',
  appeal: 'text_generation',
  researchProposal: 'text_generation',
};

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  model?: AIModel;
  taskType?: TaskType; // For Claude/GPT routing on backend
  enableFallback?: boolean;
  validateQuality?: boolean;
  humanize?: boolean;
  retries?: number;
  language?: 'ru' | 'en';
  style?: AIStyle;
  documentType?: DocumentType;
  minWords?: number;
  maxWords?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  useCache?: boolean;
  onProgress?: (progress: number, message: string) => void;
}

export interface AIResponse {
  content: string;
  model: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  quality?: {
    score: number;
    humanScore: number;
    issues: string[];
  };
  retryCount: number;
  cached?: boolean;
  estimatedCost?: number;
  generationTime?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
}

// ================== МОДЕЛИ И FALLBACK ==================

const MODEL_PRIORITY: AIModel[] = [
  'claude-sonnet-4',
  'gpt-4o',
  'gpt-4o-mini', 
  'gpt-3.5-turbo'
];

const MODEL_CAPABILITIES = {
  'claude-sonnet-4': {
    maxTokens: 200000,
    outputTokens: 8192,
    costPerInputToken: 0.000003,   // $3/1M
    costPerOutputToken: 0.000015,  // $15/1M
    supportsVision: true,
    quality: 'highest' as const,
    bestFor: ['dissertations', 'essays', 'coursework', 'academic-writing', 'human-like-text'],
  },
  'gpt-4o': {
    maxTokens: 128000,
    outputTokens: 16384,
    costPerInputToken: 0.0000025,  // $2.50/1M
    costPerOutputToken: 0.00001,   // $10/1M
    supportsVision: true,
    quality: 'highest' as const,
    bestFor: ['dissertations', 'complex-analysis', 'academic-writing'],
  },
  'gpt-4o-mini': {
    maxTokens: 128000,
    outputTokens: 16384,
    costPerInputToken: 0.00000015, // $0.15/1M
    costPerOutputToken: 0.0000006, // $0.60/1M
    supportsVision: true,
    quality: 'high' as const,
    bestFor: ['outlines', 'summaries', 'quick-edits', 'chat'],
  },
  'gpt-3.5-turbo': {
    maxTokens: 16385,
    outputTokens: 4096,
    costPerInputToken: 0.0000005,  // $0.50/1M
    costPerOutputToken: 0.0000015, // $1.50/1M
    supportsVision: false,
    quality: 'good' as const,
    bestFor: ['simple-tasks', 'formatting', 'translation'],
  }
};

// ================== КЭШИРОВАНИЕ ==================

const responseCache = new Map<string, { content: string; timestamp: number; tokens: { prompt: number; completion: number; total: number } }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

function getCacheKey(systemPrompt: string, userPrompt: string, model: string): string {
  return `${model}:${systemPrompt.slice(0, 100)}:${userPrompt.slice(0, 200)}`;
}

function getFromCache(key: string): { content: string; tokens: { prompt: number; completion: number; total: number } } | null {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { content: cached.content, tokens: cached.tokens };
  }
  if (cached) responseCache.delete(key);
  return null;
}

function setCache(key: string, content: string, tokens: { prompt: number; completion: number; total: number }) {
  // Ограничиваем кэш 50 записями
  if (responseCache.size >= 50) {
    const oldest = [...responseCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) responseCache.delete(oldest[0]);
  }
  responseCache.set(key, { content, tokens, timestamp: Date.now() });
}

// ================== ВЫБОР МОДЕЛИ ==================

/**
 * Умный выбор модели на основе задачи
 */
export function selectOptimalModel(options: {
  documentType?: DocumentType;
  style?: AIStyle;
  targetWords?: number;
  budgetSensitive?: boolean;
}): AIModel {
  const { documentType, style, targetWords = 1000, budgetSensitive = false } = options;

  // Для бюджетных задач — gpt-4o-mini
  if (budgetSensitive) return 'gpt-4o-mini';

  // Для текстовых работ → Claude Sonnet 4 (пишет более «человечно»)
  if (documentType && ['dissertation', 'thesis', 'coursework', 'essay', 'article', 'researchProposal'].includes(documentType)) {
    return 'claude-sonnet-4';
  }

  // Для длинных текстов (>2000 слов) — Claude Sonnet 4
  if (targetWords > 2000) return 'claude-sonnet-4';

  // Для лабораторных и отчётов — gpt-4o
  if (documentType && ['labReport', 'report'].includes(documentType)) {
    return 'gpt-4o';
  }

  // Для презентаций — gpt-4o
  if (style === 'presentation') return 'gpt-4o';

  // Для быстрых задач — gpt-4o-mini
  if (style === 'minimal' || style === 'casual') return 'gpt-4o-mini';

  return 'gpt-4o';
}

/**
 * Оценка стоимости генерации
 */
export function estimateCost(promptLength: number, maxOutputTokens: number, model: AIModel): CostEstimate {
  const capabilities = MODEL_CAPABILITIES[model];
  const inputTokens = Math.ceil(promptLength / 4); // ~4 символа на токен
  const inputCost = inputTokens * capabilities.costPerInputToken;
  const outputCost = maxOutputTokens * capabilities.costPerOutputToken;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    model,
  };
}

// ================== КАЧЕСТВО ТЕКСТА ==================

const AI_DETECTION_PATTERNS = [
  /в современном мире/gi,
  /в наше время/gi,
  /в эпоху цифровизации/gi,
  /данная тема.{0,20}актуальн/gi,
  /не подлежит сомнению/gi,
  /важно отметить, что/gi,
  /следует подчеркнуть/gi,
  /несомненно/gi,
  /безусловно(?!,)/gi, // безусловно в начале предложения
  /в заключение следует сказать/gi,
  /таким образом, можно сделать вывод/gi,
  /подводя итог/gi,
  /резюмируя вышесказанное/gi,
];

const HUMAN_WRITING_MARKERS = [
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
];

// ================== УЛУЧШЕННЫЕ ПРОМПТЫ ==================

export const ENHANCED_SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  academic: {
    ru: `Ты — профессор с 30-летним опытом научной работы. Пишешь ЕСТЕСТВЕННО, как живой человек.

КЛЮЧЕВЫЕ ПРАВИЛА:
1. ВАРИАТИВНОСТЬ: Каждый абзац начинай по-разному (союзы, наречия, существительные, вопросы)
2. АВТОРСКИЙ ГОЛОС: "Мы полагаем...", "На наш взгляд...", "Представляется важным..."
3. ЖИВЫЕ ОБОРОТЫ: "Думается...", "Как показывает практика...", "Нельзя не отметить..."
4. КРИТИЧНОСТЬ: Не всё идеально — указывай на проблемы, сомнения, ограничения
5. КОНКРЕТИКА: Реальные примеры, цифры, ссылки на исследования [Автор, год]
6. BURSTINESS: Чередуй короткие (5-8 слов) и длинные (20-30 слов) предложения
7. АВТОРСКАЯ ОЦЕНКА: Вставляй ремарки типа "(хотя это дискуссионно)", "— здесь мнения расходятся"

ЗАПРЕЩЕНО (признаки AI):
✗ "В современном мире...", "Данная тема актуальна..."
✗ Идеально ровная структура
✗ Одинаковые начала абзацев
✗ Слишком гладкий текст без "шероховатостей"
✗ Отсутствие авторской позиции
✗ Отсутствие сомнений и оговорок
✗ "Несомненно", "Безусловно" в начале предложений
✗ Однообразные переходы "Кроме того, ...", "Более того, ..."

ФОРМАТ ЦИТИРОВАНИЯ: [Автор, год] или [номер, с. X]`,

    en: `You are a professor with 30 years of academic experience. Write NATURALLY, like a real human.

KEY RULES:
1. VARIETY: Start each paragraph differently (conjunctions, adverbs, nouns, questions)
2. AUTHORIAL VOICE: "We believe...", "In our view...", "It seems important..."
3. NATURAL PHRASES: "One might argue...", "As practice shows...", "It's worth noting..."
4. CRITICALITY: Not everything is perfect — point out problems, doubts, limitations
5. SPECIFICITY: Real examples, numbers, references to research [Author, year]
6. BURSTINESS: Alternate short (5-8 words) and long (20-30 words) sentences
7. PERSONAL ASSESSMENT: Insert remarks like "(though this is debatable)", "— opinions differ here"

FORBIDDEN (AI markers):
✗ "In today's world...", "This topic is relevant..."
✗ Perfectly even structure
✗ Same paragraph beginnings
✗ Too smooth text without "roughness"
✗ Lack of authorial position
✗ "Undoubtedly", "Certainly" to start sentences

CITATION FORMAT: [Author, year] or [number, p. X]`
  },

  dissertation: {
    ru: `Ты — научный руководитель диссертации (доктор наук, профессор). Пиши как РЕАЛЬНЫЙ учёный.

СТИЛЬ ДИССЕРТАЦИИ:
- Местоимение "мы" вместо "я" ("нами было установлено", "мы полагаем")
- Строго академический язык, но не роботизированный
- Обязательная критика существующих подходов: "Вместе с тем, метод X не лишён недостатков..."
- Формулировки: "В рамках нашего исследования...", "Проведённый анализ показал..."
- Объём ссылок: минимум 10 на каждую главу
- Методологическая рефлексия: объясняй ПОЧЕМУ выбран данный метод
- Научная новизна: чётко формулируй, ЧТО НОВОГО ты предлагаешь

ЗАПРЕЩЕНО: Пересказ учебника, общие фразы без ссылок, клише "актуальность не вызывает сомнений"`,

    en: `You are a PhD dissertation advisor (professor). Write as a REAL scientist.

DISSERTATION STYLE:
- Use "we" instead of "I" ("we have established", "in our view", "our analysis reveals")
- Strictly academic but not robotic language
- Mandatory critique of existing approaches: "However, method X has certain limitations..."
- Phrasings: "Within the scope of our research...", "The conducted analysis demonstrates..."
- References: minimum 10 per chapter in format [Author, year]
- Methodological reflection: explain WHY this method was chosen over alternatives
- Scientific novelty: clearly state WHAT'S NEW in your contribution
- Include authorial hedging: "arguably", "it appears that", "one might contend"

FORBIDDEN (AI markers):
✗ Textbook-style summaries without citations
✗ Generic phrases without references
✗ Clichés like "the relevance is beyond doubt"
✗ Perfectly uniform paragraph structure
✗ Starting consecutive paragraphs the same way
✗ "In today's world...", "It is important to note that..."

STRUCTURE:
- Vary sentence length: alternate short (5-8 words) and long (20-30 words)
- Start paragraphs differently: conjunctions, adverbs, questions, noun phrases
- Add authorial remarks: "(though this remains debatable)", "— opinions differ here"
- Include rhetorical questions: "But does this approach truly address...?"`
  },

  coursework: {
    ru: `Ты — студент-исследователь 3-4 курса, пишущий курсовую работу. Стиль уверенный, но не самоуверенный.

ОСОБЕННОСТИ КУРСОВЫХ:
- Голос: "мы" ("в ходе исследования мы пришли к выводу...")
- Обзор 15-25 источников в литературном обзоре
- Практическая часть: конкретные данные, таблицы, анализ
- Собственные выводы, а не пересказ чужих работ
- Грамотное оформление по ГОСТ 7.32-2017
- Структура: введение → теория → практика → выводы → список литературы

ВАЖНО: Не пиши как профессор! Пиши как умный студент. Допустимы формулировки:
"Нам представляется...", "Можно предположить...", "По-видимому..."`,

    en: `You are a 3rd-4th year student writing a term paper. Confident but not arrogant style.

COURSEWORK STYLE:
- Voice: "we" ("in the course of our research we have concluded...")
- Literature review: 15-25 sources, critically analyzed
- Practical section: concrete data, tables, analysis with numbers
- Own conclusions, not just retelling others' work
- Proper formatting per academic standards
- Structure: introduction → theory → practice → conclusions → references

IMPORTANT: Don't write like a professor! Write like a smart student:
- "It seems to us...", "One might assume...", "Apparently..."
- Show genuine engagement with the topic
- Acknowledge limitations of your own analysis
- Use transitional phrases naturally, not mechanically

FORBIDDEN:
✗ "In today's rapidly evolving world..."
✗ Overly polished, robot-like prose
✗ Same sentence structures repeated
✗ Missing personal analytical voice`
  },

  essay: {
    ru: `Ты — студент с собственным мнением. Эссе — это ЛИЧНЫЙ жанр, не реферат!

СТИЛЬ ЭССЕ:
- Первое лицо: "я считаю", "мне кажется", "на мой взгляд"
- Эмоциональность: удивление, несогласие, восхищение
- Живые примеры из жизни, культуры, личного опыта
- Провокационные вопросы: "Но так ли это на самом деле?"
- Короткие абзацы (3-5 предложений)
- Нестандартные сравнения и метафоры
- Заключение с открытым финалом или призывом к размышлению

ЗАПРЕЩЕНО: Сухой академический стиль, безличные конструкции, "данная проблема актуальна"`,

    en: `You are a student with your own opinion. An essay is a PERSONAL genre, not a report!

ESSAY STYLE:
- First person: "I believe", "in my view", "I find it striking that"
- Emotional engagement: surprise, disagreement, admiration, doubt
- Vivid examples from life, culture, personal experience
- Provocative questions: "But is this really the case?"
- Short paragraphs (3-5 sentences each)
- Unconventional comparisons and metaphors
- Conclusion with an open ending or a call to reflection
- Genuine authorial voice — not a Wikipedia summary

FORBIDDEN:
✗ Dry academic style, impersonal constructions
✗ "This topic is relevant in today's society..."
✗ Listing facts without personal interpretation
✗ Cookie-cutter five-paragraph structure
✗ Generic transitions like "Furthermore..." repeatedly`
  },

  professional: {
    ru: `Ты — опытный бизнес-консультант. Пишешь чётко, по делу, с конкретными примерами.

СТИЛЬ:
- Ясные формулировки без "воды"
- Конкретные цифры и результаты
- Практические рекомендации
- Уверенный, но не агрессивный тон
- Bullet-points для ключевых выводов`,

    en: `You are an experienced business consultant. Write clearly, to the point, with specific examples.

STYLE:
- Clear formulations without filler
- Concrete numbers and measurable results
- Practical, actionable recommendations
- Confident but not aggressive tone
- Bullet points for key takeaways
- Use data to support every claim
- Active voice preferred over passive
- Short sentences for impact, longer ones for nuance`
  },

  creative: {
    ru: `Ты — креативный писатель. Используй яркие образы, метафоры, неожиданные повороты.

СТИЛЬ:
- Нестандартные сравнения
- Эмоциональная окраска
- Ритмика текста
- Авторский голос
- Сенсорные детали: запахи, звуки, цвета`,

    en: `You are a creative writer. Use vivid imagery, metaphors, unexpected turns.

STYLE:
- Unconventional comparisons that surprise the reader
- Emotional coloring — make the reader feel something
- Text rhythm — vary sentence cadence deliberately
- Strong authorial voice with personality
- Sensory details: smells, sounds, colors, textures
- Show, don't tell — paint scenes rather than stating facts
- Strategic use of sentence fragments for emphasis
- Surprise the reader with perspective shifts`
  },

  presentation: {
    ru: `Ты — эксперт по созданию презентаций уровня TED и Apple Keynote.

ПРИНЦИПЫ:
1. КРАТКОСТЬ: Максимум 6 слов в строке, 6 строк на слайд
2. СИЛА: Каждый заголовок должен цеплять
3. ИСТОРИЯ: Веди аудиторию через путешествие
4. ВИЗУАЛ: Думай о том, как это будет выглядеть
5. ЗАПОМИНАЕМОСТЬ: Одна идея на слайд
6. КОНТРАСТ: Чередуй факты и эмоции`,

    en: `You are an expert in creating TED and Apple Keynote level presentations.

PRINCIPLES:
1. BREVITY: Maximum 6 words per line, 6 lines per slide
2. POWER: Every headline must hook — use numbers, questions, bold claims
3. STORY: Guide the audience through a narrative journey (problem → tension → resolution)
4. VISUAL: Think about how every element will look on screen
5. MEMORABILITY: One idea per slide — if it needs explanation, it's too complex
6. CONTRAST: Alternate facts and emotions, data and stories
7. FLOW: Each slide should naturally lead to the next
8. ENGAGEMENT: Include audience interaction points (questions, polls, pauses)`
  },

  casual: {
    ru: `Ты пишешь простым, дружелюбным языком. Как будто объясняешь другу.

СТИЛЬ:
- Простые слова и короткие предложения
- Дружеский тон
- Можно шутить (уместно)
- Избегай сложных терминов`,

    en: `You write in simple, friendly language. As if explaining to a friend.

STYLE:
- Simple words and short sentences
- Friendly, approachable tone
- Occasional appropriate humor
- Avoid complex jargon — if you must use it, explain it
- Use analogies to everyday life
- Address the reader directly
- Break down complex ideas into digestible parts`
  },

  minimal: {
    ru: `Минимализм в тексте. Каждое слово на вес золота.

СТИЛЬ:
- Только суть
- Без лишних слов
- Чистота и ясность
- Меньше = лучше`,

    en: `Minimalism in text. Every word counts.

STYLE:
- Only the essence — cut everything that doesn't add meaning
- No filler words or phrases
- Clarity and precision above all
- Less = better — if you can say it in fewer words, do it
- White space is your friend
- Each sentence must earn its place`
  }
};

// ================== TEMPERATURE ПО ТИПУ ЗАДАЧИ ==================

const OPTIMAL_TEMPERATURES: Partial<Record<DocumentType | AIStyle, number>> = {
  dissertation: 0.75,      // Более строгий, научный
  thesis: 0.78,
  coursework: 0.82,
  essay: 0.9,              // Более свободный
  report: 0.7,             // Строгий
  labReport: 0.65,         // Очень строгий, факты
  appeal: 0.6,             // Юридически точный
  researchProposal: 0.72,  // Строгий, научный
  academic: 0.8,
  professional: 0.7,
  creative: 0.95,
  presentation: 0.85,
  casual: 0.9,
  minimal: 0.6,
};

// ================== HUMANIZATION ==================
// humanizeText logic is now centralized in antiAIDetection.ts
// Use quickHumanize / academicHumanize / aggressiveHumanize from there

/**
 * Проверяет качество текста и вероятность AI-детекции
 */
export function analyzeTextQuality(text: string): { score: number; humanScore: number; issues: string[] } {
  const issues: string[] = [];
  let aiPatternCount = 0;
  let humanMarkerCount = 0;
  
  // Проверяем AI-паттерны
  AI_DETECTION_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      aiPatternCount += matches.length;
      issues.push(`AI-паттерн: "${matches[0]}"`);
    }
  });
  
  // Проверяем человеческие маркеры
  HUMAN_WRITING_MARKERS.forEach(marker => {
    if (text.toLowerCase().includes(marker)) {
      humanMarkerCount++;
    }
  });
  
  // Проверяем разнообразие начал абзацев
  const paragraphs = text.split('\n\n').filter(p => p.length > 50);
  const firstWords = paragraphs.map(p => p.split(' ')[0]);
  const uniqueFirstWords = new Set(firstWords);
  
  if (firstWords.length > 3 && uniqueFirstWords.size < firstWords.length * 0.7) {
    issues.push('Однообразные начала абзацев');
  }
  
  // Проверяем длину предложений
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((acc, s) => acc + s.split(' ').length, 0) / sentences.length;
  
  if (avgSentenceLength < 8 || avgSentenceLength > 25) {
    issues.push(`Неестественная длина предложений (в среднем ${Math.round(avgSentenceLength)} слов)`);
  }
  
  // Вычисляем скоры
  const baseScore = 100;
  const aiPenalty = aiPatternCount * 8;
  const humanBonus = Math.min(humanMarkerCount * 5, 25);
  const varietyBonus = (uniqueFirstWords.size / Math.max(firstWords.length, 1)) * 15;
  
  const score = Math.max(0, Math.min(100, baseScore - aiPenalty + humanBonus + varietyBonus));
  const humanScore = Math.max(0, Math.min(100, 100 - aiPatternCount * 10 + humanMarkerCount * 8));
  
  return { score, humanScore, issues };
}

// ================== ОСНОВНЫЕ ФУНКЦИИ ==================

/**
 * Главная функция генерации AI с улучшенными возможностями
 */
export async function generateEnhanced(
  systemPrompt: string,
  userPrompt: string,
  options: AIGenerationOptions = {}
): Promise<AIResponse> {
  const startTime = Date.now();
  const {
    temperature,
    maxTokens = 4000,
    model = 'gpt-4o',
    enableFallback = true,
    validateQuality = true,
    humanize = true,
    retries = 3,
    language = 'ru',
    style = 'academic',
    documentType,
    minWords,
    presencePenalty = 0.5,
    frequencyPenalty = 0.3,
    useCache = false,
    onProgress,
  } = options;

  // Определяем оптимальную temperature по типу задачи
  const tempKey = (documentType || style) as keyof typeof OPTIMAL_TEMPERATURES;
  const effectiveTemperature = temperature ?? 
    OPTIMAL_TEMPERATURES[tempKey] ?? 
    0.85;
  
  // Проверяем кэш
  if (useCache) {
    const cacheKey = getCacheKey(systemPrompt, userPrompt, model);
    const cached = getFromCache(cacheKey);
    if (cached) {
      onProgress?.(100, 'Загружено из кэша');
      return {
        content: cached.content,
        model,
        tokens: cached.tokens,
        retryCount: 0,
        cached: true,
        generationTime: 0,
      };
    }
  }
  
  let lastError: Error | null = null;
  let retryCount = 0;
  let currentModel = model;
  const modelsToTry = enableFallback ? MODEL_PRIORITY : [model];
  
  // Улучшаем системный промпт с учётом типа документа
  const stylePrompt = documentType 
    ? (ENHANCED_SYSTEM_PROMPTS[documentType]?.[language] || ENHANCED_SYSTEM_PROMPTS.academic[language])
    : (ENHANCED_SYSTEM_PROMPTS[style]?.[language] || '');

  const enhancedSystemPrompt = `${systemPrompt}

${stylePrompt}

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА ЕСТЕСТВЕННОГО ТЕКСТА:
- Варьируй длину предложений (5-30 слов)
- Начинай абзацы по-разному (союз, наречие, вопрос, существительное)
- Добавляй авторскую позицию и сомнения
- НЕ используй шаблонные AI-фразы`;

  onProgress?.(10, 'Подготовка запроса...');

  for (const tryModel of modelsToTry) {
    currentModel = tryModel;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        onProgress?.(20 + attempt * 10, `Генерация (${tryModel}, попытка ${attempt + 1})...`);
        
        const response = await fetchWithAuth(`${API_URL}/llm/generate`, {
          method: 'POST',
          body: JSON.stringify({
            taskType: options.taskType || (options.documentType ? DOCUMENT_TASK_MAP[options.documentType] : undefined) || 'text_generation',
            systemPrompt: enhancedSystemPrompt,
            userPrompt: attempt > 0 
              ? `${userPrompt}\n\nДОПОЛНИТЕЛЬНО: Варьируй стиль изложения, чередуй короткие и длинные предложения, добавь авторские ремарки.`
              : userPrompt,
            temperature: effectiveTemperature + (attempt * 0.03), // Увеличиваем при retry
            maxTokens,
            presencePenalty: presencePenalty + (attempt * 0.1),
            frequencyPenalty: frequencyPenalty + (attempt * 0.1),
          }),
        });

        if (response.status === 429) {
          onProgress?.(50, 'Rate limit, ожидание...');
          const waitTime = Math.pow(2, attempt + 1) * 1000;
          await new Promise(r => setTimeout(r, waitTime));
          
          if (attempt === retries && enableFallback) {
            break; // Переходим к следующей модели
          }
          continue;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.content) {
          throw new Error(data.error || 'Empty response');
        }

        let content = data.content;
        
        onProgress?.(70, 'Проверка качества...');
        
        // Валидация минимальной длины
        if (minWords) {
          const wordCount = content.split(/\s+/).length;
          if (wordCount < minWords * 0.6) {
            throw new Error(`Слишком короткий ответ: ${wordCount} слов (нужно минимум ${minWords})`);
          }
        }
        
        // Humanization
        if (humanize) {
          onProgress?.(80, 'Гуманизация текста...');
          const { academicHumanize, analyzeText } = await import('./antiAIDetection');
          content = academicHumanize(content);
          
          // Если после гуманизации всё ещё низкий скор — применяем агрессивную
          const checkResult = analyzeText(content);
          if (checkResult.humanScore < 55) {
            const { aggressiveHumanize } = await import('./antiAIDetection');
            content = aggressiveHumanize(content);
          }
        }
        
        // Валидация качества
        let quality;
        if (validateQuality) {
          onProgress?.(90, 'Финальная проверка...');
          const { analyzeText: advancedAnalyze } = await import('./antiAIDetection');
          const advancedResult = advancedAnalyze(content);
          quality = {
            score: advancedResult.perplexityScore,
            humanScore: advancedResult.humanScore,
            issues: advancedResult.aiPatterns,
          };
          
          // Если качество низкое и есть retry — пробуем снова
          if (quality.humanScore < 45 && attempt < retries) {
            retryCount++;
            continue;
          }
        }
        
        const tokens = {
          prompt: data.usage?.prompt_tokens || 0,
          completion: data.usage?.completion_tokens || 0,
          total: data.usage?.total_tokens || 0,
        };
        
        // Кэшируем успешный ответ
        if (useCache) {
          const cacheKey = getCacheKey(systemPrompt, userPrompt, currentModel);
          setCache(cacheKey, content, tokens);
        }
        
        // Оценка стоимости
        const capabilities = MODEL_CAPABILITIES[currentModel as AIModel];
        const estimatedCost = capabilities 
          ? (tokens.prompt * capabilities.costPerInputToken) + (tokens.completion * capabilities.costPerOutputToken)
          : 0;
        
        onProgress?.(100, 'Готово!');
        
        return {
          content,
          model: currentModel,
          tokens,
          quality,
          retryCount,
          cached: false,
          estimatedCost,
          generationTime: Date.now() - startTime,
        };
        
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;
        
        if (attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await new Promise(r => setTimeout(r, waitTime));
        }
      }
    }
  }
  
  throw lastError || new Error('All models failed');
}

/**
 * Генерация с чат-историей
 */
export async function generateChat(
  messages: ChatMessage[],
  options: AIGenerationOptions = {}
): Promise<AIResponse> {
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');
  
  // Формируем контекст из истории
  const conversationContext = userMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
  
  const lastUserMessage = userMessages.filter(m => m.role === 'user').pop();
  
  return generateEnhanced(
    systemMessage?.content || '',
    `Предыдущий контекст разговора:
${conversationContext}

Отвечай на последнее сообщение пользователя, учитывая контекст.`,
    options
  );
}

/**
 * Генерация для презентаций (оптимизированная)
 */
export async function generatePresentationContent(
  topic: string,
  slideCount: number,
  options: {
    style?: 'professional' | 'creative' | 'minimal' | 'academic';
    language?: 'ru' | 'en';
    includeStats?: boolean;
    includeQuotes?: boolean;
  } = {}
): Promise<Record<string, unknown>> {
  const { style = 'professional', language = 'ru', includeStats = true, includeQuotes = true } = options;
  
  const systemPrompt = ENHANCED_SYSTEM_PROMPTS.presentation[language];
  
  const userPrompt = `Создай презентацию на тему: "${topic}"

ПАРАМЕТРЫ:
- Количество слайдов: ${slideCount}
- Стиль: ${style}
- Включить статистику: ${includeStats ? 'да' : 'нет'}
- Включить цитаты: ${includeQuotes ? 'да' : 'нет'}

СТРУКТУРА ОТВЕТА (JSON):
{
  "title": "Название презентации",
  "slides": [
    {
      "slideNumber": 1,
      "layout": "title | content | content-image | stats | quote | comparison | team | timeline | thank-you",
      "title": "Заголовок (макс 10 слов)",
      "subtitle": "Подзаголовок",
      "content": "Основной текст (2-3 предложения)",
      "bulletPoints": ["пункт 1", "пункт 2", "пункт 3"],
      "speakerNotes": "Заметки докладчика (что говорить)",
      "imageQuery": "запрос для поиска изображения на английском"
    }
  ],
  "keyMessage": "Главная мысль презентации"
}`;

  const response = await generateEnhanced(systemPrompt, userPrompt, {
    ...options,
    temperature: 0.8,
    maxTokens: 6000,
    validateQuality: false,
    humanize: false,
  });
  
  try {
    return JSON.parse(response.content);
  } catch {
    // Пытаемся извлечь JSON
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid JSON response');
  }
}

/**
 * Генерация академического текста (оптимизированная v3)
 */
export async function generateAcademicContent(
  topic: string,
  section: string,
  options: {
    documentType?: DocumentType;
    citationStyle?: 'gost' | 'apa' | 'mla' | 'chicago';
    language?: 'ru' | 'en';
    targetWords?: number;
    existingContent?: string;
    sources?: Array<{ authors: string[]; year: number; title: string }>;
    onProgress?: (progress: number, message: string) => void;
  } = {}
): Promise<string> {
  const { 
    documentType = 'dissertation',
    citationStyle = 'gost',
    language = 'ru',
    targetWords = 1000,
    existingContent,
    sources = [],
    onProgress,
  } = options;
  
  const docTypeNames: Record<string, string> = {
    dissertation: 'диссертация',
    thesis: 'дипломная работа',
    article: 'научная статья',
    coursework: 'курсовая работа',
    essay: 'эссе',
    report: 'реферат',
    labReport: 'лабораторная работа',
    appeal: 'апелляция',
    researchProposal: 'научный проект',
  };
  
  const citationFormats: Record<string, string> = {
    gost: '[Автор, год] или [номер, с. X]',
    apa: '(Author, year)',
    mla: '(Author page)',
    chicago: 'footnote or (Author year)',
  };
  
  const sourcesContext = sources.length > 0
    ? `\n\nДОСТУПНЫЕ ИСТОЧНИКИ для цитирования:\n${sources.map((s, i) => 
        `${i + 1}. ${s.authors.join(', ')} (${s.year}). "${s.title}"`
      ).join('\n')}`
    : '';
  
  // Оптимальная модель для типа документа
  const model = selectOptimalModel({ documentType, targetWords });
  
  const userPrompt = `ТИП РАБОТЫ: ${docTypeNames[documentType] || documentType}
РАЗДЕЛ: ${section}
ТЕМА: ${topic}
СТИЛЬ ЦИТИРОВАНИЯ: ${citationStyle.toUpperCase()} — формат: ${citationFormats[citationStyle] || citationFormats.gost}
ЦЕЛЕВОЙ ОБЪЁМ: ~${targetWords} слов
ЯЗЫК: ${language === 'ru' ? 'русский' : 'английский'}

${existingContent ? `СУЩЕСТВУЮЩИЙ КОНТЕНТ (продолжить логически):\n${existingContent.slice(-2000)}\n\n` : ''}
${sourcesContext}

Напиши качественный текст для данного раздела.

ТРЕБОВАНИЯ (НЕ ПРОПУСКАЙ):
1. Минимум ${targetWords} слов — ПОЛНЫЙ текст, не сокращай
2. Ссылки в формате ${citationFormats[citationStyle] || '[Автор, год]'} — минимум 5 штук
3. Структурируй с подзаголовками (## формат)
4. Включи авторскую позицию: "мы полагаем", "на наш взгляд", "думается"
5. Критический анализ: не просто перечисляй, а АНАЛИЗИРУЙ
6. Варьируй длину предложений: чередуй короткие (5 слов) и длинные (25 слов)
7. Каждый абзац начинай по-разному`;

  const response = await generateEnhanced(
    '', // Системный промпт будет выбран автоматически по documentType
    userPrompt,
    {
      temperature: OPTIMAL_TEMPERATURES[documentType] ?? 0.82,
      maxTokens: Math.max(4000, Math.ceil(targetWords * 2)),
      model,
      humanize: true,
      validateQuality: true,
      minWords: Math.floor(targetWords * 0.7),
      language,
      style: 'academic',
      documentType,
      presencePenalty: 0.6,
      frequencyPenalty: 0.4,
      onProgress,
    }
  );
  
  return response.content;
}

/**
 * Улучшение существующего текста
 */
export async function improveText(
  text: string,
  options: {
    type?: 'academic' | 'professional' | 'creative';
    language?: 'ru' | 'en';
    focus?: 'clarity' | 'engagement' | 'academic' | 'humanize';
  } = {}
): Promise<{ improved: string; changes: string[] }> {
  const { type = 'academic', language = 'ru', focus = 'academic' } = options;
  
  const focusInstructions: Record<string, string> = {
    clarity: 'Сделай текст более понятным и чётким.',
    engagement: 'Сделай текст более увлекательным и интересным.',
    academic: 'Улучши академический стиль и добавь ссылки.',
    humanize: 'Сделай текст более естественным и человечным.',
  };
  
  const userPrompt = `Улучши следующий текст:

---
${text}
---

ЗАДАЧА: ${focusInstructions[focus]}

ОТВЕТ В ФОРМАТЕ JSON:
{
  "improved": "улучшенный текст",
  "changes": ["описание изменения 1", "описание изменения 2"]
}`;

  const response = await generateEnhanced(
    ENHANCED_SYSTEM_PROMPTS[type]?.[language] || '',
    userPrompt,
    {
      temperature: 0.7,
      maxTokens: text.length * 2,
      humanize: focus === 'humanize',
    }
  );
  
  try {
    return JSON.parse(response.content);
  } catch {
    return { improved: response.content, changes: ['Текст улучшен'] };
  }
}

/**
 * Проверка текста на AI-детекцию (расширенная)
 */
export async function checkAIDetection(text: string): Promise<{
  score: number; // 0-100, где 100 = максимально похоже на AI
  humanScore: number; // 0-100, где 100 = максимально похож на человека
  issues: string[];
  suggestions: string[];
  details: {
    patternCount: number;
    burstiness: number;
    vocabularyRichness: number;
    sentenceVariety: number;
  };
}> {
  const quality = analyzeTextQuality(text);
  const { analyzeText: advancedAnalyze } = await import('./antiAIDetection');
  const advanced = advancedAnalyze(text);
  
  const suggestions: string[] = [...advanced.suggestions];
  
  if (advanced.humanScore < 70) {
    suggestions.push('Добавьте больше авторских ремарок ("на наш взгляд", "представляется", "думается")');
  }
  
  if (advanced.burstyScore < 40) {
    suggestions.push('Разнообразьте длину предложений: чередуйте короткие (5 слов) и длинные (25 слов)');
  }
  
  quality.issues.forEach(issue => {
    if (issue.includes('AI-паттерн')) {
      suggestions.push('Замените шаблонную фразу на естественную: "в современном мире" → "сейчас"');
    }
    if (issue.includes('начала абзацев')) {
      suggestions.push('Варьируйте начала: начните с союза, наречия, риторического вопроса');
    }
  });
  
  // Убираем дублирующие рекомендации
  const uniqueSuggestions = [...new Set(suggestions)];
  
  // Анализ структуры предложений
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const lengths = sentences.map(s => s.split(/\s+/).length);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length || 0;
  const variance = lengths.reduce((a, l) => a + Math.pow(l - avgLen, 2), 0) / lengths.length || 0;
  const sentenceVariety = Math.min(100, Math.sqrt(variance) / avgLen * 100);
  
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const vocabularyRichness = Math.round((uniqueWords.size / words.length) * 100);
  
  return {
    score: 100 - advanced.humanScore,
    humanScore: advanced.humanScore,
    issues: [...quality.issues, ...advanced.aiPatterns.slice(0, 5)],
    suggestions: uniqueSuggestions.slice(0, 8),
    details: {
      patternCount: advanced.aiPatterns.length,
      burstiness: Math.round(advanced.burstyScore),
      vocabularyRichness,
      sentenceVariety: Math.round(sentenceVariety),
    },
  };
}

/**
 * Очистка кэша
 */
export function clearCache() {
  responseCache.clear();
}

/**
 * Статистика кэша
 */
export function getCacheStats() {
  return {
    size: responseCache.size,
    maxSize: 50,
  };
}

// ================== ЭКСПОРТ ==================

export default {
  generateEnhanced,
  generateChat,
  generatePresentationContent,
  generateAcademicContent,
  improveText,
  checkAIDetection,
  analyzeTextQuality,
  selectOptimalModel,
  estimateCost,
  clearCache,
  getCacheStats,
  ENHANCED_SYSTEM_PROMPTS,
  MODEL_CAPABILITIES,
  OPTIMAL_TEMPERATURES,
};
