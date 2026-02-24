import OpenAI from 'openai';
import { logger } from '../utils/logger';
import type { AnthropicModule, AnthropicClient } from '../types/anthropic.types';

// Динамический импорт Anthropic SDK
let Anthropic: AnthropicModule | undefined;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  logger.warn('Anthropic SDK not installed for dissertation service');
}

// ==================== ТИПЫ ====================

interface DissertationConfig {
  topic: string;
  type: 'essay' | 'referat' | 'coursework' | 'diploma' | 'dissertation';
  targetPages: number;       // Желаемое количество страниц
  language: 'ru' | 'en';
  additionalInstructions?: string;
  includeReferences?: boolean;
  includeTableOfContents?: boolean;
  style?: 'academic' | 'scientific' | 'popular';
}

interface ChapterPlan {
  number: number;
  title: string;
  description: string;
  targetWords: number;       // Целевое кол-во слов
  targetPages: number;       // Целевое кол-во страниц
  subsections: string[];
  type: 'introduction' | 'chapter' | 'conclusion' | 'references' | 'abstract';
}

export interface GenerationProgress {
  phase: 'planning' | 'generating' | 'assembling' | 'done' | 'error';
  currentChapter: number;
  totalChapters: number;
  chapterTitle: string;
  percentComplete: number;
  wordsGenerated: number;
  pagesGenerated: number;
  estimatedTimeRemaining: number; // секунды
}

interface DissertationResult {
  title: string;
  content: string;
  tableOfContents: string;
  chapters: Array<{
    number: number;
    title: string;
    content: string;
    wordCount: number;
  }>;
  totalWords: number;
  totalPages: number;
  metadata: {
    topic: string;
    type: string;
    targetPages: number;
    actualPages: number;
    generationTime: number; // мс
    chaptersCount: number;
    model: string;
  };
}

// ==================== КОНСТАНТЫ ====================

// ~1800 символов = ~250-300 слов = 1 страница (стандарт: 14pt, 1.5 интервал)
const WORDS_PER_PAGE = 280;
const CHARS_PER_PAGE = 1800;

// Лимиты моделей по выходным токенам
const MODEL_LIMITS = {
  'claude-sonnet-4-20250514': { maxOutputTokens: 64000, wordsPerRequest: 12000, pagesPerRequest: 40 },
  'gpt-4o': { maxOutputTokens: 16384, wordsPerRequest: 5000, pagesPerRequest: 17 },
  'gpt-4o-mini': { maxOutputTokens: 16384, wordsPerRequest: 5000, pagesPerRequest: 17 },
};

// Шаблоны структуры по типу работы
const STRUCTURE_TEMPLATES: Record<string, (pages: number) => ChapterPlan[]> = {
  essay: (pages) => distributePages(pages, [
    { type: 'introduction' as const, title: 'Введение', pct: 0.10, desc: 'Актуальность, цель эссе, тезис' },
    { type: 'chapter' as const, title: 'Основная часть', pct: 0.75, desc: 'Аргументация, анализ, примеры' },
    { type: 'conclusion' as const, title: 'Заключение', pct: 0.10, desc: 'Выводы, обобщение' },
    { type: 'references' as const, title: 'Список литературы', pct: 0.05, desc: 'Источники' },
  ]),

  referat: (pages) => distributePages(pages, [
    { type: 'introduction' as const, title: 'Введение', pct: 0.08, desc: 'Актуальность, цели, задачи' },
    { type: 'chapter' as const, title: 'Глава 1. Теоретические основы', pct: 0.35, desc: 'Определения, теории, обзор литературы' },
    { type: 'chapter' as const, title: 'Глава 2. Анализ проблемы', pct: 0.35, desc: 'Подробный разбор, примеры, данные' },
    { type: 'conclusion' as const, title: 'Заключение', pct: 0.10, desc: 'Выводы и рекомендации' },
    { type: 'references' as const, title: 'Список литературы', pct: 0.05, desc: 'Источники' },
    { type: 'abstract' as const, title: 'Приложения', pct: 0.07, desc: 'Таблицы, графики' },
  ]),

  coursework: (pages) => distributePages(pages, [
    { type: 'abstract' as const, title: 'Аннотация', pct: 0.02, desc: 'Краткое описание работы' },
    { type: 'introduction' as const, title: 'Введение', pct: 0.08, desc: 'Актуальность, цель, задачи, объект, предмет, методы' },
    { type: 'chapter' as const, title: 'Глава 1. Теоретические аспекты', pct: 0.25, desc: 'Обзор литературы, ключевые понятия, теории' },
    { type: 'chapter' as const, title: 'Глава 2. Методология исследования', pct: 0.20, desc: 'Методы, инструменты, выборка' },
    { type: 'chapter' as const, title: 'Глава 3. Результаты и анализ', pct: 0.25, desc: 'Данные, таблицы, интерпретация' },
    { type: 'conclusion' as const, title: 'Заключение', pct: 0.08, desc: 'Выводы, практическая значимость' },
    { type: 'references' as const, title: 'Список литературы', pct: 0.05, desc: 'Не менее 15-20 источников' },
    { type: 'abstract' as const, title: 'Приложения', pct: 0.07, desc: 'Таблицы, анкеты, графики' },
  ]),

  diploma: (pages) => distributePages(pages, [
    { type: 'abstract' as const, title: 'Аннотация', pct: 0.02, desc: 'Краткое описание работы' },
    { type: 'introduction' as const, title: 'Введение', pct: 0.07, desc: 'Актуальность, цель, задачи, гипотеза, объект, предмет, методы, структура' },
    { type: 'chapter' as const, title: 'Глава 1. Теоретические основы исследования', pct: 0.20, desc: 'Обзор литературы, основные концепции, исторический анализ' },
    { type: 'chapter' as const, title: 'Глава 2. Методология и организация исследования', pct: 0.15, desc: 'Методологическая база, этапы, инструменты' },
    { type: 'chapter' as const, title: 'Глава 3. Эмпирическое исследование', pct: 0.22, desc: 'Проведение исследования, данные, таблицы' },
    { type: 'chapter' as const, title: 'Глава 4. Результаты и рекомендации', pct: 0.15, desc: 'Интерпретация, практические рекомендации' },
    { type: 'conclusion' as const, title: 'Заключение', pct: 0.07, desc: 'Основные выводы, подтверждение гипотезы' },
    { type: 'references' as const, title: 'Список литературы', pct: 0.05, desc: 'Не менее 40-50 источников' },
    { type: 'abstract' as const, title: 'Приложения', pct: 0.07, desc: 'Таблицы, анкеты, акты внедрения' },
  ]),

  dissertation: (pages) => distributePages(pages, [
    { type: 'abstract' as const, title: 'Аннотация', pct: 0.01, desc: 'Краткое описание диссертации' },
    { type: 'introduction' as const, title: 'Введение', pct: 0.06, desc: 'Актуальность, научная новизна, цель, задачи, гипотеза, методы, положения на защиту' },
    { type: 'chapter' as const, title: 'Глава 1. Состояние проблемы в научной литературе', pct: 0.15, desc: 'Историография, обзор источников, степень разработанности' },
    { type: 'chapter' as const, title: 'Глава 2. Методологические основы исследования', pct: 0.12, desc: 'Методология, теоретическая база, концептуальная модель' },
    { type: 'chapter' as const, title: 'Глава 3. Экспериментальная часть', pct: 0.18, desc: 'Организация эксперимента, ход исследования' },
    { type: 'chapter' as const, title: 'Глава 4. Результаты исследования', pct: 0.18, desc: 'Анализ данных, статистика, таблицы, графики' },
    { type: 'chapter' as const, title: 'Глава 5. Обсуждение результатов', pct: 0.12, desc: 'Интерпретация, сопоставление с литературой, значимость' },
    { type: 'conclusion' as const, title: 'Заключение', pct: 0.06, desc: 'Основные выводы, вклад в науку' },
    { type: 'references' as const, title: 'Список литературы', pct: 0.05, desc: 'Не менее 100 источников' },
    { type: 'abstract' as const, title: 'Приложения', pct: 0.07, desc: 'Акты, таблицы, протоколы, анкеты' },
  ]),
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function distributePages(
  totalPages: number,
  sections: Array<{ type: ChapterPlan['type']; title: string; pct: number; desc: string }>
): ChapterPlan[] {
  return sections.map((section, index) => {
    const sectionPages = Math.max(1, Math.round(totalPages * section.pct));
    const sectionWords = sectionPages * WORDS_PER_PAGE;

    return {
      number: index + 1,
      title: section.title,
      description: section.desc,
      targetWords: sectionWords,
      targetPages: sectionPages,
      subsections: [],
      type: section.type,
    };
  });
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    essay: 'эссе',
    referat: 'реферат',
    coursework: 'курсовая работа',
    diploma: 'дипломная работа',
    dissertation: 'диссертация',
  };
  return labels[type] || type;
}

// ==================== ОСНОВНОЙ СЕРВИС ====================

export class DissertationService {
  private openai: OpenAI;
  private anthropic: AnthropicClient | null = null;
  private claudeModel: string;
  private gptModel: string;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-init' });
    this.claudeModel = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
    this.gptModel = process.env.OPENAI_MODEL || 'gpt-4o';

    if (Anthropic && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic.default({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  /**
   * Генерация через Claude с фолбэком на GPT-4o
   */
  private async generate(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 8000,
    temperature: number = 0.8
  ): Promise<string> {
    // Пробуем Claude (лучше пишет текст)
    if (this.anthropic) {
      try {
        const response = await this.anthropic.messages.create({
          model: this.claudeModel,
          max_tokens: Math.min(maxTokens, 64000),
          temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });
        const text = response.content[0]?.text;
        if (text && text.length > 50) return text;
      } catch (error: unknown) {
        logger.warn(`Claude error in dissertation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Фолбэк на GPT-4o
    const response = await this.openai.chat.completions.create({
      model: this.gptModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: Math.min(maxTokens, 16384),
      presence_penalty: 0.6,
      frequency_penalty: 0.4,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Главный метод: Генерация полной работы по главам
   * Использует SSE callback для отправки прогресса
   */
  async generateFullDissertation(
    config: DissertationConfig,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<DissertationResult> {
    const startTime = Date.now();
    const { topic, type, targetPages, language, additionalInstructions, style } = config;

    logger.info(`[Dissertation] Starting generation: "${topic}", ${targetPages} pages, type=${type}`);

    // ====== ФАЗА 1: Планирование структуры ======
    onProgress?.({
      phase: 'planning',
      currentChapter: 0,
      totalChapters: 0,
      chapterTitle: 'Составление плана...',
      percentComplete: 5,
      wordsGenerated: 0,
      pagesGenerated: 0,
      estimatedTimeRemaining: targetPages * 3, // ~3 сек/страница
    });

    // Получаем шаблон структуры
    const templateFn = STRUCTURE_TEMPLATES[type] || STRUCTURE_TEMPLATES.coursework;
    let chapters = templateFn(targetPages);

    // Уточняем план через AI (адаптируем под конкретную тему)
    chapters = await this.refinePlan(topic, type, chapters, language, additionalInstructions);

    const totalChapters = chapters.length;

    logger.info(`[Dissertation] Plan ready: ${totalChapters} chapters for ${targetPages} pages`);

    // ====== ФАЗА 2: Генерация по главам ======
    const generatedChapters: DissertationResult['chapters'] = [];
    let totalWordsGenerated = 0;

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const pct = 10 + Math.round((i / totalChapters) * 80);

      onProgress?.({
        phase: 'generating',
        currentChapter: i + 1,
        totalChapters,
        chapterTitle: chapter.title,
        percentComplete: pct,
        wordsGenerated: totalWordsGenerated,
        pagesGenerated: Math.round(totalWordsGenerated / WORDS_PER_PAGE),
        estimatedTimeRemaining: (totalChapters - i) * 15,
      });

      // Контекст из предыдущих глав (краткое содержание)
      const previousContext = generatedChapters
        .slice(-2) // Последние 2 главы для контекста
        .map(ch => `### ${ch.title}\n${ch.content.substring(0, 500)}...`)
        .join('\n\n');

      // Генерируем главу (может потребоваться несколько запросов для длинных глав)
      const chapterContent = await this.generateChapter(
        topic, type, chapter, language, previousContext, additionalInstructions, style
      );

      const wordCount = chapterContent.split(/\s+/).filter(Boolean).length;
      totalWordsGenerated += wordCount;

      generatedChapters.push({
        number: chapter.number,
        title: chapter.title,
        content: chapterContent,
        wordCount,
      });

      logger.info(`[Dissertation] Chapter ${i + 1}/${totalChapters} done: "${chapter.title}" — ${wordCount} words`);
    }

    // ====== ФАЗА 3: Сборка документа ======
    onProgress?.({
      phase: 'assembling',
      currentChapter: totalChapters,
      totalChapters,
      chapterTitle: 'Сборка документа...',
      percentComplete: 95,
      wordsGenerated: totalWordsGenerated,
      pagesGenerated: Math.round(totalWordsGenerated / WORDS_PER_PAGE),
      estimatedTimeRemaining: 5,
    });

    // Собираем оглавление
    const tableOfContents = this.buildTableOfContents(generatedChapters);

    // Собираем полный текст
    const fullContent = this.assembleDocument(config, generatedChapters, tableOfContents);

    const totalPages = Math.round(totalWordsGenerated / WORDS_PER_PAGE);
    const generationTime = Date.now() - startTime;

    // ====== ГОТОВО ======
    onProgress?.({
      phase: 'done',
      currentChapter: totalChapters,
      totalChapters,
      chapterTitle: 'Готово!',
      percentComplete: 100,
      wordsGenerated: totalWordsGenerated,
      pagesGenerated: totalPages,
      estimatedTimeRemaining: 0,
    });

    logger.info(`[Dissertation] Complete: ${totalWordsGenerated} words, ${totalPages} pages, ${Math.round(generationTime / 1000)}s`);

    return {
      title: topic,
      content: fullContent,
      tableOfContents,
      chapters: generatedChapters,
      totalWords: totalWordsGenerated,
      totalPages,
      metadata: {
        topic,
        type,
        targetPages,
        actualPages: totalPages,
        generationTime,
        chaptersCount: totalChapters,
        model: this.anthropic ? 'Claude Sonnet 4 + GPT-4o' : 'GPT-4o',
      },
    };
  }

  /**
   * Уточнить план работы через AI — адаптировать шаблон под конкретную тему
   */
  private async refinePlan(
    topic: string,
    type: string,
    chapters: ChapterPlan[],
    language: string,
    instructions?: string
  ): Promise<ChapterPlan[]> {
    const typeLabel = getTypeLabel(type);

    const systemPrompt = `Ты — эксперт по академическому письму. Уточни план ${typeLabel} по указанной теме.
Верни JSON массив глав. Каждая глава: { "number", "title", "description", "targetWords", "targetPages", "subsections": ["подраздел1", "подраздел2"], "type": "introduction|chapter|conclusion|references|abstract" }
Названия глав должны быть на ${language === 'ru' ? 'русском' : 'английском'} языке и относиться к указанной теме.
Сохрани распределение страниц из шаблона. НЕ меняй общее количество страниц.`;

    const userPrompt = `Тема: "${topic}"
Тип работы: ${typeLabel}

Шаблон плана:
${JSON.stringify(chapters, null, 2)}

${instructions ? `Дополнительные требования: ${instructions}` : ''}

Адаптируй названия глав и подразделы под конкретную тему. Верни только JSON массив.`;

    try {
      const result = await this.generate(systemPrompt, userPrompt, 4000, 0.5);
      
      // Извлекаем JSON из ответа
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      logger.warn('Failed to refine plan, using template:', error);
    }

    return chapters; // Возвращаем шаблон без изменений
  }

  /**
   * Генерация одной главы — может делать несколько запросов для длинных глав
   */
  private async generateChapter(
    topic: string,
    type: string,
    chapter: ChapterPlan,
    language: string,
    previousContext: string,
    instructions?: string,
    style?: string
  ): Promise<string> {
    const typeLabel = getTypeLabel(type);
    const lang = language === 'ru' ? 'русском' : 'английском';
    const styleDesc = style === 'scientific' ? 'строго научный' : style === 'popular' ? 'научно-популярный' : 'академический';

    // Определяем, нужно ли разбивать главу на подзапросы
    const maxWordsPerRequest = this.anthropic ? 12000 : 5000;
    const needsSplit = chapter.targetWords > maxWordsPerRequest;

    if (!needsSplit) {
      // Одним запросом
      return await this.generateChapterPart(
        topic, typeLabel, chapter, lang, styleDesc, previousContext, instructions, chapter.targetWords
      );
    }

    // Разбиваем на части
    const parts: string[] = [];
    const partsCount = Math.ceil(chapter.targetWords / maxWordsPerRequest);
    const wordsPerPart = Math.ceil(chapter.targetWords / partsCount);

    for (let p = 0; p < partsCount; p++) {
      const isFirst = p === 0;
      const isLast = p === partsCount - 1;
      
      const partContext = isFirst
        ? previousContext
        : `${previousContext}\n\n--- Уже написано в этой главе ---\n${parts[parts.length - 1]?.slice(-800) || ''}`;

      const partInstructions = [
        instructions,
        !isFirst ? 'Продолжай текст естественно, без повторения вступления главы.' : '',
        !isLast ? 'Не пиши заключение главы, текст будет продолжен.' : '',
        `Это часть ${p + 1} из ${partsCount} для данной главы.`,
      ].filter(Boolean).join(' ');

      const partText = await this.generateChapterPart(
        topic, typeLabel, chapter, lang, styleDesc, partContext, partInstructions, wordsPerPart
      );

      parts.push(partText);
    }

    return parts.join('\n\n');
  }

  /**
   * Генерация части главы одним запросом
   */
  private async generateChapterPart(
    topic: string,
    typeLabel: string,
    chapter: ChapterPlan,
    lang: string,
    style: string,
    previousContext: string,
    instructions: string | undefined,
    targetWords: number
  ): Promise<string> {
    const systemPrompt = `Ты — опытный академический писатель с 20+ годами стажа. Пишешь ${typeLabel} в ${style} стиле.

КРИТИЧЕСКИ ВАЖНО:
- Пиши строго на ${lang} языке
- Объём текста: МИНИМУМ ${targetWords} слов. Пиши ПОДРОБНО И РАЗВЁРНУТО
- Стиль: естественный, человеческий, НЕ робот
- Используй авторские обороты: "мы полагаем", "на наш взгляд", "представляется целесообразным"
- Варьируй длину предложений (от 5 до 35 слов)
- Начинай абзацы по-разному (НЕ повторяй структуру)
- Включай 1-2 риторических вопроса на раздел
- Добавляй критический анализ, не просто описание
- Делай плавные переходы между абзацами

ЗАПРЕЩЕНО (маркеры ИИ):
- "В современном мире...", "Данная тема актуальна..."
- Одинаковые начала абзацев
- Слишком гладкий текст без авторской позиции
- Маркированные списки вместо связного текста
- Выводы после каждого абзаца`;

    const subsectionsInfo = chapter.subsections?.length
      ? `\nПодразделы: ${chapter.subsections.join(', ')}`
      : '';

    const userPrompt = `Тема работы: "${topic}"
Тип: ${typeLabel}

Пиши главу: "${chapter.title}"
Описание: ${chapter.description}${subsectionsInfo}

ЦЕЛЕВОЙ ОБЪЁМ: НЕ МЕНЕЕ ${Math.round(targetWords * 1.05)} слов (это примерно ${Math.round(targetWords / WORDS_PER_PAGE)} страниц). Минимум ${targetWords} слов, желательно ${Math.round(targetWords * 1.1)}.

${previousContext ? `\n--- Контекст предыдущих глав ---\n${previousContext}\n---` : ''}
${instructions ? `\nДополнительно: ${instructions}` : ''}

ВАЖНО: Напиши ПОЛНЫЙ текст главы нужного объёма. НЕ сокращай, НЕ пропускай части. Каждый подраздел раскрывай детально с примерами, аргументами и анализом.`;

    // Рассчитываем токены (~1 токен = ~0.75 слова на русском)
    const estimatedTokens = Math.ceil(targetWords / 0.6); // С запасом
    const maxTokens = Math.min(estimatedTokens, this.anthropic ? 64000 : 16384);

    return await this.generate(systemPrompt, userPrompt, maxTokens, 0.85);
  }

  /**
   * Построение оглавления
   */
  private buildTableOfContents(chapters: DissertationResult['chapters']): string {
    let toc = '# СОДЕРЖАНИЕ\n\n';
    let currentPage = 3; // Начинаем с 3-й страницы (титулка + содержание)

    for (const ch of chapters) {
      const pages = Math.max(1, Math.round(ch.wordCount / WORDS_PER_PAGE));
      toc += `${ch.title} ${'·'.repeat(Math.max(3, 50 - ch.title.length))} ${currentPage}\n`;
      currentPage += pages;
    }

    return toc;
  }

  /**
   * Сборка полного документа
   */
  private assembleDocument(
    config: DissertationConfig,
    chapters: DissertationResult['chapters'],
    tableOfContents: string
  ): string {
    const typeLabel = getTypeLabel(config.type).toUpperCase();
    const parts: string[] = [];

    // Титульная страница
    parts.push(`# ${typeLabel}\n\n## Тема: ${config.topic}\n\n---\n`);

    // Оглавление
    if (config.includeTableOfContents !== false) {
      parts.push(tableOfContents);
      parts.push('\n---\n');
    }

    // Главы
    for (const chapter of chapters) {
      parts.push(`\n\n## ${chapter.title}\n\n${chapter.content}`);
    }

    return parts.join('\n');
  }

  /**
   * Получить оценку времени генерации
   */
  estimateGenerationTime(targetPages: number): {
    estimatedMinutes: number;
    estimatedRequests: number;
    estimatedCost: number;
  } {
    const totalWords = targetPages * WORDS_PER_PAGE;
    const wordsPerRequest = this.anthropic ? 12000 : 5000;
    const requests = Math.ceil(totalWords / wordsPerRequest) + 2; // +2 для плана и сборки
    const timePerRequest = 15; // секунд в среднем

    // Стоимость: ~$0.003 за запрос Claude, ~$0.01 за запрос GPT-4o
    const costPerRequest = this.anthropic ? 0.005 : 0.015;

    return {
      estimatedMinutes: Math.ceil((requests * timePerRequest) / 60),
      estimatedRequests: requests,
      estimatedCost: Math.round(requests * costPerRequest * 100) / 100,
    };
  }
}
