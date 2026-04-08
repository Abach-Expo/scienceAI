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
  phase: 'planning' | 'generating' | 'assembling' | 'expanding' | 'continuing' | 'done' | 'error';
  currentChapter: number;
  totalChapters: number;
  chapterTitle: string;
  percentComplete: number;
  wordsGenerated: number;
  pagesGenerated: number;
  estimatedTimeRemaining: number; // секунды
  detail?: string; // доп. информация (continuation #2, expansion #1, etc.)
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
  };
}

// ==================== КОНСТАНТЫ ====================

// ~1800 символов = ~250-300 слов = 1 страница (стандарт: 14pt, 1.5 интервал)
const WORDS_PER_PAGE = 280;
const CHARS_PER_PAGE = 1800;

// Параллельная генерация: макс. одновременных запросов (ограничение Rate Limits)
const PARALLEL_BATCH_SIZE = 3;

// Алгоритм «дописывания» — если ИИ выдал меньше целевого объёма
const MAX_CONTINUATIONS_PER_PART = 5;   // макс. попыток продолжить часть
const MAX_EXPANSIONS_PER_CHAPTER = 3;   // макс. раундов расширения главы
const MIN_VOLUME_RATIO = 0.70;          // 70 % от целевого = допустимый минимум

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
   * Использует параллельную генерацию батчами + SSE для прогресса
   */
  async generateFullDissertation(
    config: DissertationConfig,
    onProgress?: (progress: GenerationProgress) => void,
    onChapterComplete?: (chapter: DissertationResult['chapters'][number]) => void,
    abortSignal?: { aborted: boolean },
  ): Promise<DissertationResult> {
    const startTime = Date.now();
    const { topic, type, targetPages, language, additionalInstructions, style } = config;

    logger.info(`[Dissertation] Starting generation: "${topic}", ${targetPages} pages, type=${type}`);

    // Проверка отмены
    const checkAbort = () => {
      if (abortSignal?.aborted) throw new Error('Generation aborted by client');
    };

    // ====== ФАЗА 1: Планирование структуры ======
    onProgress?.({
      phase: 'planning',
      currentChapter: 0,
      totalChapters: 0,
      chapterTitle: 'Составление плана...',
      percentComplete: 5,
      wordsGenerated: 0,
      pagesGenerated: 0,
      estimatedTimeRemaining: targetPages * 3,
    });

    checkAbort();

    const templateFn = STRUCTURE_TEMPLATES[type] || STRUCTURE_TEMPLATES.coursework;
    let chapters = templateFn(targetPages);

    chapters = await this.refinePlan(topic, type, chapters, language, additionalInstructions, targetPages);

    const totalChapters = chapters.length;

    logger.info(`[Dissertation] Plan ready: ${totalChapters} chapters for ${targetPages} pages`);

    // ====== ФАЗА 2: Генерация глав ======
    // Для больших работ (100+стр) нужна последовательная генерация с контекстом,
    // иначе главы в одном батче получают одинаковый контекст и теряют связность.
    // Параллелизация используется только для коротких работ (< 50 стр).
    const generatedChapters: DissertationResult['chapters'] = [];
    let totalWordsGenerated = 0;

    // Для 50+ стр: последовательная генерация (лучший контекст)
    // Для < 50 стр: параллельные батчи (быстрее)
    const batchSize = targetPages < 50 ? PARALLEL_BATCH_SIZE : 1;

    for (let batchStart = 0; batchStart < chapters.length; batchStart += batchSize) {
      checkAbort();

      const batch = chapters.slice(batchStart, batchStart + batchSize);

      // AI-суммаризация всех предыдущих глав
      const previousContext = await this.summarizeContext(generatedChapters, topic, language);

      // Прогресс
      const pct = 10 + Math.round((batchStart / totalChapters) * 80);
      onProgress?.({
        phase: 'generating',
        currentChapter: batchStart + 1,
        totalChapters,
        chapterTitle: batch.map(ch => ch.title).join(' + '),
        percentComplete: pct,
        wordsGenerated: totalWordsGenerated,
        pagesGenerated: Math.round(totalWordsGenerated / WORDS_PER_PAGE),
        estimatedTimeRemaining: Math.ceil((totalChapters - batchStart) / Math.max(batchSize, 1)) * 25,
      });

      // Генерируем батч (параллельно или последовательно)
      const generateOne = async (chapter: ChapterPlan) => {
        // Спец. обработка для «Список литературы»
        const content = chapter.type === 'references'
          ? await this.generateReferences(topic, type, generatedChapters, language, chapter.targetWords)
          : await this.generateChapter(
              topic, type, chapter, language, previousContext, additionalInstructions, style, onProgress, totalChapters, generatedChapters.length
            );
        
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        return { number: chapter.number, title: chapter.title, content, wordCount };
      };

      // С retry при ошибке (до 2 попыток)
      const generateWithRetry = async (chapter: ChapterPlan, retries = 2): Promise<DissertationResult['chapters'][number]> => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            return await generateOne(chapter);
          } catch (error) {
            if (abortSignal?.aborted) throw error;
            logger.warn(`[Dissertation] Chapter "${chapter.title}" attempt ${attempt}/${retries} failed:`, error);
            if (attempt === retries) throw error;
          }
        }
        throw new Error('Unreachable');
      };

      const batchResults = batchSize > 1
        ? await Promise.all(batch.map(ch => generateWithRetry(ch)))
        : [await generateWithRetry(batch[0])];

      // Добавляем результаты и стримим
      for (const result of batchResults) {
        totalWordsGenerated += result.wordCount;
        generatedChapters.push(result);

        onChapterComplete?.(result);

        const completedPct = 10 + Math.round((generatedChapters.length / totalChapters) * 80);
        onProgress?.({
          phase: 'generating',
          currentChapter: generatedChapters.length,
          totalChapters,
          chapterTitle: result.title,
          percentComplete: completedPct,
          wordsGenerated: totalWordsGenerated,
          pagesGenerated: Math.round(totalWordsGenerated / WORDS_PER_PAGE),
          estimatedTimeRemaining: Math.ceil((totalChapters - generatedChapters.length) / Math.max(batchSize, 1)) * 25,
        });

        logger.info(`[Dissertation] Chapter ${generatedChapters.length}/${totalChapters} done: "${result.title}" — ${result.wordCount} words`);
      }
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
      },
    };
  }

  // ==================== СУММАРИЗАЦИЯ КОНТЕКСТА ====================

  /**
   * AI-суммаризация всех написанных глав → сжатый контекст для следующей главы.
   * Обеспечивает связность и последовательность даже при 10+ главах.
   */
  private async summarizeContext(
    generatedChapters: DissertationResult['chapters'],
    topic: string,
    language: string
  ): Promise<string> {
    if (generatedChapters.length === 0) return '';

    // Для 1-2 глав — достаточно просто усечённого текста
    if (generatedChapters.length <= 2) {
      return generatedChapters
        .map(ch => `### ${ch.title}\n${ch.content.substring(0, 1500)}`)
        .join('\n\n');
    }

    // Для 3+ глав: просим AI создать связный конспект
    const chaptersText = generatedChapters
      .map(ch => `### ${ch.title} (${ch.wordCount} слов)\n${ch.content.substring(0, 2000)}`)
      .join('\n\n');

    const lang = language === 'ru' ? 'русском' : 'английском';

    const systemPrompt = `Ты — помощник академического писателя. Создай краткий, но информативный конспект всех написанных глав.`;

    const userPrompt = `Тема работы: "${topic}"

Уже написанные главы (сокращённо):
${chaptersText}

Создай конспект (400-600 слов) на ${lang} языке:
- Ключевые тезисы и аргументы каждой главы
- Логика перехода между главами
- Основные определения и выводы

Этот конспект будет передан как контекст при написании следующих глав, чтобы сохранить связность и не противоречить ранее изложенному.`;

    try {
      return await this.generate(systemPrompt, userPrompt, 2000, 0.3);
    } catch (error) {
      logger.warn('Context summarization failed, using fallback:', error);
      // Фолбэк: усечённый текст последних 3 глав
      return generatedChapters
        .slice(-3)
        .map(ch => `### ${ch.title}\n${ch.content.substring(0, 600)}...`)
        .join('\n\n');
    }
  }

  /**
   * Уточнить план работы через AI — адаптировать шаблон под конкретную тему
   */
  private async refinePlan(
    topic: string,
    type: string,
    chapters: ChapterPlan[],
    language: string,
    instructions?: string,
    targetPages: number = 30
  ): Promise<ChapterPlan[]> {
    const typeLabel = getTypeLabel(type);
    const minSubsections = targetPages >= 100 ? 5 : targetPages >= 50 ? 4 : 3;

    const systemPrompt = `Ты — эксперт по академическому письму. Уточни план ${typeLabel} по указанной теме.
Верни JSON массив глав. Каждая глава: { "number", "title", "description", "targetWords", "targetPages", "subsections": ["подраздел1", "подраздел2", ...], "type": "introduction|chapter|conclusion|references|abstract" }
Названия глав должны быть на ${language === 'ru' ? 'русском' : 'английском'} языке и относиться к указанной теме.
Сохрани распределение страниц из шаблона. НЕ меняй общее количество страниц.

ВАЖНО: Для каждой главы типа "chapter" укажи от ${minSubsections} до ${minSubsections + 3} подразделов (subsections).
Подразделы должны быть конкретными и раскрывать тему главы с разных сторон.`;

    const userPrompt = `Тема: "${topic}"
Тип работы: ${typeLabel}
Общий объём: ~${targetPages} страниц

Шаблон плана:
${JSON.stringify(chapters, null, 2)}

${instructions ? `Дополнительные требования: ${instructions}` : ''}

Адаптируй названия глав и подразделы под конкретную тему. Каждая основная глава должна иметь ${minSubsections}–${minSubsections + 3} подразделов. Верни только JSON массив.`;

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
    style?: string,
    onProgress?: (progress: GenerationProgress) => void,
    totalChapters: number = 0,
    currentChapterIdx: number = 0
  ): Promise<string> {
    const typeLabel = getTypeLabel(type);
    const lang = language === 'ru' ? 'русском' : 'английском';
    const styleDesc = style === 'scientific' ? 'строго научный' : style === 'popular' ? 'научно-популярный' : 'академический';

    // Определяем, нужно ли разбивать главу на подзапросы
    const maxWordsPerRequest = this.anthropic ? 12000 : 5000;
    const needsSplit = chapter.targetWords > maxWordsPerRequest;

    let fullText: string;

    if (!needsSplit) {
      // Одним запросом (с автоматическим дописыванием)
      fullText = await this.generateChapterPart(
        topic, typeLabel, chapter, lang, styleDesc, previousContext, instructions, chapter.targetWords
      );
    } else {
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

      fullText = parts.join('\n\n');
    }

    // ====== ВАЛИДАЦИЯ ОБЪЁМА ГЛАВЫ ======
    let wordCount = fullText.split(/\s+/).filter(Boolean).length;
    const minChapterWords = Math.floor(chapter.targetWords * MIN_VOLUME_RATIO);
    let expansions = 0;

    while (wordCount < minChapterWords && expansions < MAX_EXPANSIONS_PER_CHAPTER) {
      expansions++;
      const deficit = chapter.targetWords - wordCount;
      logger.info(
        `[Dissertation] Volume validation: chapter "${chapter.title}" has ${wordCount}/${chapter.targetWords} words (${Math.round(wordCount / chapter.targetWords * 100)}%). ` +
        `Expansion #${expansions}, need ~${deficit} more words`
      );

      // Уведомляем фронтенд о расширении
      onProgress?.({
        phase: 'expanding',
        currentChapter: currentChapterIdx + 1,
        totalChapters,
        chapterTitle: chapter.title,
        percentComplete: 10 + Math.round(((currentChapterIdx + 0.5) / Math.max(totalChapters, 1)) * 80),
        wordsGenerated: wordCount,
        pagesGenerated: Math.round(wordCount / WORDS_PER_PAGE),
        estimatedTimeRemaining: 30,
        detail: `Расширение #${expansions}: +${deficit} слов`,
      });

      const expansionText = await this.expandChapterContent(
        topic, typeLabel, chapter, fullText, deficit, lang, styleDesc
      );

      fullText += '\n\n' + expansionText;
      wordCount = fullText.split(/\s+/).filter(Boolean).length;
    }

    if (expansions > 0) {
      logger.info(
        `[Dissertation] Chapter "${chapter.title}" final: ${wordCount} words after ${expansions} expansion(s)`
      );
    }

    return fullText;
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
    const targetPages = Math.round(targetWords / WORDS_PER_PAGE);
    const systemPrompt = `Ты — опытный академический писатель с 20+ годами стажа. Пишешь ${typeLabel} в ${style} стиле.

### ТРЕБОВАНИЕ К ОБЪЁМУ (САМОЕ ВАЖНОЕ) ###
Ты ОБЯЗАН написать текст объёмом НЕ МЕНЕЕ ${targetWords} слов (${targetPages} страниц).
Это НЕ рекомендация, а ЖЁСТКОЕ ТРЕБОВАНИЕ. Текст короче ${Math.round(targetWords * 0.8)} слов — НЕПРИЕМЛЕМ.
Если сомневаешься — пиши БОЛЬШЕ, а не меньше.

### СТИЛЬ ПИСЬМА ###
- Пиши строго на ${lang} языке
- Стиль: естественный, человеческий, НЕ робот
- Используй авторские обороты: "мы полагаем", "на наш взгляд", "представляется целесообразным"
- Варьируй длину предложений (от 5 до 35 слов)
- Начинай абзацы по-разному (НЕ повторяй структуру)
- Включай 1-2 риторических вопроса на раздел
- Добавляй критический анализ, не просто описание
- Делай плавные переходы между абзацами

### КАК НАБРАТЬ НУЖНЫЙ ОБЪЁМ ###
- Каждый подраздел раскрывай на 2-4 абзаца (по 150-250 слов каждый)
- Приводи конкретные примеры, исследования, статистику
- Сравнивай разные точки зрения (минимум 2-3 позиции)
- Добавляй контраргументы и их разбор
- Описывай методологические подходы подробно
- Включай исторический контекст и эволюцию идей

### ЗАПРЕЩЕНО (маркеры ИИ) ###
- "В современном мире...", "Данная тема актуальна..."
- Одинаковые начала абзацев
- Слишком гладкий текст без авторской позиции
- Маркированные списки вместо связного текста
- Выводы после каждого абзаца`;

    const subsectionsInfo = chapter.subsections?.length
      ? `\nПодразделы для раскрытия: ${chapter.subsections.join(', ')}`
      : '';

    const userPrompt = `Тема работы: "${topic}"
Тип: ${typeLabel}

Пиши главу: "${chapter.title}"
Описание: ${chapter.description}${subsectionsInfo}

⚠️ ЦЕЛЕВОЙ ОБЪЁМ: ${targetWords}–${Math.round(targetWords * 1.15)} слов (${targetPages} страниц).
Абсолютный минимум: ${Math.round(targetWords * 0.8)} слов. Желательно: ${Math.round(targetWords * 1.1)} слов.
Каждый подраздел — минимум 2-3 страницы развёрнутого текста.

${previousContext ? `\n--- Контекст предыдущих глав ---\n${previousContext}\n---` : ''}
${instructions ? `\nДополнительно: ${instructions}` : ''}

ВАЖНО: Напиши ПОЛНЫЙ текст главы нужного объёма. НЕ сокращай, НЕ пропускай части. Каждый подраздел раскрывай детально с примерами, аргументами и анализом.`;

    // Рассчитываем токены (~1 токен = ~0.75 слова на русском)
    const estimatedTokens = Math.ceil(targetWords / 0.6); // С запасом
    const maxTokens = Math.min(estimatedTokens, this.anthropic ? 64000 : 16384);

    let result = await this.generate(systemPrompt, userPrompt, maxTokens, 0.85);

    // ====== RETRY-WITH-CONTINUATION ======
    // Если ИИ написал меньше 70% целевого объёма — дописываем
    let totalWords = result.split(/\s+/).filter(Boolean).length;
    const minWords = Math.floor(targetWords * MIN_VOLUME_RATIO);
    let continuations = 0;

    while (totalWords < minWords && continuations < MAX_CONTINUATIONS_PER_PART) {
      continuations++;
      const remaining = targetWords - totalWords;

      logger.info(
        `[Dissertation] Continuation #${continuations}: got ${totalWords}/${targetWords} words (${Math.round(totalWords / targetWords * 100)}%), need ~${remaining} more`
      );

      const continuationPrompt = `ПРОДОЛЖИ текст. Уже написано ${totalWords} слов, нужно ещё минимум ${remaining} слов.

Последний фрагмент написанного текста:
---
${result.slice(-1500)}
---

Продолжай ЕСТЕСТВЕННО с того места, где остановился. НЕ повторяй уже написанное, НЕ пиши заново начало.
Напиши ещё минимум ${remaining} слов, развивая ту же тему и стиль.

Что писать:
- Углуби анализ незавершённых аспектов
- Добавь новые примеры и case-study
- Сравни альтернативные подходы
- Обсуди ограничения и перспективы
- Приведи данные исследований

НЕ пиши заключение или выводы раньше времени.`;

      const continuation = await this.generate(systemPrompt, continuationPrompt, maxTokens, 0.85);
      result += '\n\n' + continuation;
      totalWords = result.split(/\s+/).filter(Boolean).length;
    }

    if (continuations > 0) {
      logger.info(`[Dissertation] Part done: ${totalWords} words after ${continuations} continuation(s)`);
    }

    return result;
  }

  // ==================== РАСШИРЕНИЕ ГЛАВЫ ====================

  /**
   * Расширить недостаточно полную главу — дописать новые абзацы по теме
   */
  private async expandChapterContent(
    topic: string,
    typeLabel: string,
    chapter: ChapterPlan,
    existingText: string,
    deficitWords: number,
    lang: string,
    style: string
  ): Promise<string> {
    const systemPrompt = `Ты — опытный академический писатель. Дополни главу ${typeLabel} новым содержанием в ${style} стиле.

КРИТИЧЕСКИ ВАЖНО:
- Пиши строго на ${lang} языке
- Объём дополнения: МИНИМУМ ${deficitWords} слов
- НЕ повторяй уже написанный текст
- Добавляй НОВЫЕ аргументы, примеры, анализ, детали
- Стиль должен совпадать с уже написанным текстом
- Начинай с нового абзаца, плавно продолжая изложение`;

    const userPrompt = `Тема работы: "${topic}"
Глава: "${chapter.title}"
Описание: ${chapter.description}

Уже написанный текст главы (последние 2000 символов):
---
${existingText.slice(-2000)}
---

Дополни главу НОВЫМ текстом объёмом минимум ${deficitWords} слов.
Раскрой дополнительные аспекты: детализируй аргументы, приведи больше примеров, углуби анализ, добавь критическое осмысление.`;

    const maxTokens = Math.min(
      Math.ceil(deficitWords / 0.6),
      this.anthropic ? 64000 : 16384
    );

    return await this.generate(systemPrompt, userPrompt, maxTokens, 0.85);
  }

  // ==================== ГЕНЕРАЦИЯ СПИСКА ЛИТЕРАТУРЫ ====================

  /**
   * Генерация академического списка литературы на основе содержания работы.
   * Создаёт реалистичные ссылки в формате ГОСТ / APA.
   */
  private async generateReferences(
    topic: string,
    type: string,
    chapters: DissertationResult['chapters'],
    language: string,
    targetWords: number
  ): Promise<string> {
    const typeLabel = getTypeLabel(type);
    const lang = language === 'ru' ? 'русском' : 'английском';
    const minRefs = type === 'dissertation' ? 100 : type === 'diploma' ? 50 : type === 'coursework' ? 20 : 10;

    // Собираем ключевые темы из глав
    const chapterSummary = chapters
      .filter(ch => ch.wordCount > 100)
      .map(ch => `- ${ch.title}: ${ch.content.substring(0, 400)}`)
      .join('\n');

    const systemPrompt = `Ты — эксперт по академическому цитированию. Создай список литературы для ${typeLabel} на ${lang} языке.

ФОРМАТ: ${language === 'ru' ? 'ГОСТ Р 7.0.5-2008' : 'APA 7th edition'}
Минимум: ${minRefs} источников.

ТРЕБОВАНИЯ:
- Источники должны быть РЕАЛИСТИЧНЫМИ (настоящие авторы, журналы, издательства)
- Включить: монографии, статьи в журналах, сборники конференций, диссертации
- 70% на ${lang} языке, 30% на английском
- Годы публикаций: преимущественно последние 10 лет
- Сортировка по алфавиту
- Нумерация через точку (1. 2. 3. ...)`;

    const userPrompt = `Тема работы: "${topic}"
Тип: ${typeLabel}

Ключевые темы из глав:
${chapterSummary}

Создай список из ${minRefs}+ источников, соответствующих содержанию работы.`;

    const maxTokens = Math.min(Math.ceil(targetWords / 0.5), this.anthropic ? 64000 : 16384);
    return await this.generate(systemPrompt, userPrompt, maxTokens, 0.6);
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
    const baseRequests = Math.ceil(totalWords / wordsPerRequest) + 2; // +2 для плана и сборки
    // ~30% дополнительных запросов на continuation + expansion + суммаризацию
    const requests = Math.ceil(baseRequests * 1.4);
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
