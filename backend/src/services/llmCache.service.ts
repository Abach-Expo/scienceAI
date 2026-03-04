// =================================================================
// 💾 SCIENCE AI — LLM RESPONSE CACHE
// Кэширование ответов для экономии токенов (20-40% reduction)
// In-memory cache с TTL, LRU eviction, и нормализацией ключей
// =================================================================

import crypto from 'crypto';
import { logger } from '../utils/logger';

// ==================== ТИПЫ ====================

interface CacheEntry {
  /** Кэшированный ответ */
  content: string;
  /** Провайдер, который сгенерировал ответ */
  provider: string;
  /** Модель */
  model: string;
  /** Использование токенов оригинального запроса */
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  /** Когда создана запись */
  createdAt: number;
  /** Последнее использование (для LRU) */
  lastAccessedAt: number;
  /** Сколько раз выдан из кэша */
  hitCount: number;
}

interface CacheStats {
  /** Общее количество записей в кэше */
  entries: number;
  /** Размер кэша (примерно в байтах) */
  sizeBytes: number;
  /** Всего запросов к кэшу */
  totalRequests: number;
  /** Попаданий из кэша */
  hits: number;
  /** Промахов */
  misses: number;
  /** Процент попаданий */
  hitRate: number;
  /** Сэкономлено токенов */
  tokensSaved: number;
}

// ==================== CONFIG ====================

/** Задачи, для которых кэширование НЕ применяется */
const NON_CACHEABLE_TASKS = new Set([
  'chat',           // Чат  — уникальные разговоры, зависят от контекста
  'humanize',       // Гуманизация — каждый раз нужен уникальный результат
]);

/** TTL по типу задачи (в миллисекундах) */
const TASK_TTL: Record<string, number> = {
  presentation: 30 * 60 * 1000,   // 30 мин — структура презентаций стабильна
  dissertation: 60 * 60 * 1000,   // 1 час — академические тексты стабильны
  essay:        60 * 60 * 1000,   // 1 час
  analysis:     45 * 60 * 1000,   // 45 мин
  summary:      30 * 60 * 1000,   // 30 мин — суммаризация стабильна
  code:         20 * 60 * 1000,   // 20 мин — код может часто запрашиваться
  translate:    60 * 60 * 1000,   // 1 час — переводы стабильны
  default:      15 * 60 * 1000,   // 15 мин — для неизвестных типов
};

/** Максимальное количество записей */
const MAX_ENTRIES = 500;

/** Максимальный размер кэша (~50MB) */
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

/** Минимальная длина ответа для кэширования (короткие ответы — дешёвые) */
const MIN_RESPONSE_LENGTH = 200;

// ==================== CACHE CLASS ====================

export class LLMCache {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    totalRequests: 0,
    hits: 0,
    misses: 0,
    tokensSaved: 0,
  };

  // ==================== КЛЮЧ КЭША ====================

  /**
   * Генерирует ключ кэша из параметров запроса.
   * Нормализация: lowercase, trim, убираем лишние пробелы.
   * Не включаем temperature (разные temp = разные результаты)
   * для задач с точным ответом (analysis, translate), но включаем для creative.
   */
  private generateKey(params: {
    taskType: string;
    userPrompt: string;
    systemPrompt?: string;
    temperature?: number;
    language?: string;
  }): string {
    // Нормализуем промпт: lowercase, trim, collapse whitespace
    const normalizedPrompt = params.userPrompt
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.,!?;:]+$/g, ''); // Убираем конечную пунктуацию

    // Для creative-задач temperature влияет на результат
    const includeTemp = ['creative', 'humanize'].includes(params.taskType);

    const keyParts = [
      params.taskType || 'default',
      normalizedPrompt,
      params.systemPrompt?.trim().substring(0, 200) || '', // Первые 200 символов системного промпта
      params.language || 'ru',
      includeTemp ? String(params.temperature ?? 0.7) : '',
    ];

    const raw = keyParts.join('|||');
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  // ==================== GET ====================

  /**
   * Ищет кэшированный ответ.
   * Возвращает null если кэш пуст, expired, или задача не кэшируема.
   */
  get(params: {
    taskType: string;
    userPrompt: string;
    systemPrompt?: string;
    temperature?: number;
    language?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
  }): CacheEntry | null {
    this.stats.totalRequests++;

    // 1. Не кэшируем определённые типы задач
    if (NON_CACHEABLE_TASKS.has(params.taskType || 'chat')) {
      this.stats.misses++;
      return null;
    }

    // 2. Не кэшируем запросы с историей (контекст уникален)
    if (params.conversationHistory && params.conversationHistory.length > 0) {
      this.stats.misses++;
      return null;
    }

    const key = this.generateKey(params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 3. Проверяем TTL
    const ttl = TASK_TTL[params.taskType] || TASK_TTL.default;
    if (Date.now() - entry.createdAt > ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // HIT!
    entry.lastAccessedAt = Date.now();
    entry.hitCount++;
    this.stats.hits++;
    this.stats.tokensSaved += entry.usage.totalTokens;

    logger.info(
      `[LLM Cache] ✅ HIT for ${params.taskType}: saved ${entry.usage.totalTokens} tokens ` +
      `(hit #${entry.hitCount}, key=${key.substring(0, 12)}...)`
    );

    return entry;
  }

  // ==================== SET ====================

  /**
   * Сохраняет ответ в кэш.
   * Не сохраняет слишком короткие ответы или ошибки.
   */
  set(
    params: {
      taskType: string;
      userPrompt: string;
      systemPrompt?: string;
      temperature?: number;
      language?: string;
      conversationHistory?: Array<{ role: string; content: string }>;
    },
    response: {
      content: string;
      provider: string;
      model: string;
      usage: { promptTokens: number; completionTokens: number; totalTokens: number };
    }
  ): void {
    // Не кэшируем:
    if (NON_CACHEABLE_TASKS.has(params.taskType || 'chat')) return;
    if (params.conversationHistory && params.conversationHistory.length > 0) return;
    if (!response.content || response.content.length < MIN_RESPONSE_LENGTH) return;

    // Eviction: если кэш переполнен
    if (this.cache.size >= MAX_ENTRIES) {
      this.evictLRU();
    }

    // Проверяем размер кэша
    if (this.getApproxSizeBytes() > MAX_SIZE_BYTES) {
      this.evictLRU(Math.floor(this.cache.size * 0.2)); // Удаляем 20%
    }

    const key = this.generateKey(params);
    const now = Date.now();

    this.cache.set(key, {
      content: response.content,
      provider: response.provider,
      model: response.model,
      usage: response.usage,
      createdAt: now,
      lastAccessedAt: now,
      hitCount: 0,
    });

    logger.info(
      `[LLM Cache] 💾 Cached ${params.taskType}: ${response.content.length} chars, ` +
      `${response.usage.totalTokens} tokens (key=${key.substring(0, 12)}..., total entries=${this.cache.size})`
    );
  }

  // ==================== EVICTION ====================

  /** Удаляет N самых давно используемых записей (LRU) */
  private evictLRU(count: number = 1): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt);

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }

    logger.info(`[LLM Cache] 🗑️ Evicted ${count} LRU entries. Remaining: ${this.cache.size}`);
  }

  /** Удаляет все просроченные записи */
  cleanExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache) {
      // Используем самый длинный TTL для безопасности
      const maxTTL = Math.max(...Object.values(TASK_TTL));
      if (now - entry.createdAt > maxTTL) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info(`[LLM Cache] 🧹 Cleaned ${removed} expired entries`);
    }
    return removed;
  }

  // ==================== STATS ====================

  getStats(): CacheStats {
    return {
      entries: this.cache.size,
      sizeBytes: this.getApproxSizeBytes(),
      totalRequests: this.stats.totalRequests,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.totalRequests > 0
        ? Math.round((this.stats.hits / this.stats.totalRequests) * 100)
        : 0,
      tokensSaved: this.stats.tokensSaved,
    };
  }

  /** Приблизительный размер кэша в байтах */
  private getApproxSizeBytes(): number {
    let size = 0;
    for (const [key, entry] of this.cache) {
      size += key.length * 2; // Hash key
      size += entry.content.length * 2; // Content (UTF-16)
      size += 200; // Metadata overhead
    }
    return size;
  }

  /** Полная очистка кэша */
  clear(): void {
    const entries = this.cache.size;
    this.cache.clear();
    this.stats = { totalRequests: 0, hits: 0, misses: 0, tokensSaved: 0 };
    logger.info(`[LLM Cache] 🗑️ Cache cleared (${entries} entries removed)`);
  }
}

// ==================== SINGLETON ====================

let _cacheInstance: LLMCache | null = null;

export function getLLMCache(): LLMCache {
  if (!_cacheInstance) {
    _cacheInstance = new LLMCache();
    logger.info('[LLM Cache] 💾 Initialized (in-memory, LRU eviction, max 500 entries)');

    // Очистка просроченных записей каждые 10 минут
    setInterval(() => {
      _cacheInstance?.cleanExpired();
    }, 10 * 60 * 1000);
  }
  return _cacheInstance;
}

export default LLMCache;
