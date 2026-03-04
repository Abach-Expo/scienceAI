// =================================================================
// 🧠 SCIENCE AI — LLM GATEWAY SERVICE
// Единый шлюз для всех LLM: OpenAI, Claude, Grok (xAI)
// Принимает запрос → добавляет системные промпты → маршрутизирует
// в облако → возвращает как "Science AI"
// =================================================================

import OpenAI from 'openai';
import { logger } from '../utils/logger';
import {
  composeSystemPrompt,
  selectProvider,
  TASK_CONFIGS,
  type ProviderName,
  type TaskPromptConfig,
} from './llmGateway.prompts';

// Динамический импорт Anthropic (может не быть установлен)
let Anthropic: any = null;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  logger.info('[LLM Gateway] Anthropic SDK not installed — Claude disabled');
}

// ==================== ТИПЫ ====================

export interface LLMRequest {
  /** Тип задачи: chat, presentation, dissertation, essay, analysis, code и т.д. */
  taskType: string;
  /** Пользовательский промпт (вопрос/запрос) */
  userPrompt: string;
  /** Опциональный кастомный системный промпт (дополняет, не заменяет базовый) */
  systemPrompt?: string;
  /** Контекст диалога (предыдущие сообщения) */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Настройки */
  options?: {
    temperature?: number;
    maxTokens?: number;
    language?: 'ru' | 'en';
    provider?: ProviderName; // Явный выбор провайдера
    model?: string;          // Явный выбор модели
    stream?: boolean;        // Стримить ответ
    jsonMode?: boolean;      // Ответ в JSON
  };
}

export interface LLMResponse {
  /** Ответ модели */
  content: string;
  /** Отображаемое имя модели (всегда "Science AI") */
  model: string;
  /** Реальный провайдер (для логов, не показывать пользователю) */
  _provider: string;
  /** Реальная модель (для логов) */
  _model: string;
  /** Использование токенов */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Время генерации мс */
  latencyMs: number;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

// ==================== GATEWAY CLASS ====================

export class LLMGateway {
  private openai: OpenAI | null = null;
  private anthropic: any = null;
  private xai: OpenAI | null = null; // xAI использует OpenAI-совместимый API
  private availableProviders: ProviderName[] = [];

  constructor() {
    this.initProviders();
  }

  // ==================== ИНИЦИАЛИЗАЦИЯ ПРОВАЙДЕРОВ ====================

  private initProviders() {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.availableProviders.push('openai');
      logger.info('[LLM Gateway] ✅ OpenAI initialized (GPT-4o, GPT-4o-mini)');
    }

    // Anthropic (Claude)
    if (Anthropic && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic.default({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.availableProviders.push('anthropic');
      logger.info('[LLM Gateway] ✅ Anthropic initialized (Claude Sonnet 4)');
    }

    // xAI (Grok) — OpenAI-совместимый API
    if (process.env.XAI_API_KEY) {
      this.xai = new OpenAI({
        apiKey: process.env.XAI_API_KEY,
        baseURL: 'https://api.x.ai/v1',
      });
      this.availableProviders.push('xai');
      logger.info('[LLM Gateway] ✅ xAI initialized (Grok-3)');
    }

    if (this.availableProviders.length === 0) {
      logger.error('[LLM Gateway] ❌ No AI providers configured! Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or XAI_API_KEY');
    } else {
      logger.info(`[LLM Gateway] Active providers: ${this.availableProviders.join(', ')}`);
    }
  }

  // ==================== ОСНОВНОЙ МЕТОД ГЕНЕРАЦИИ ====================

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const taskType = request.taskType || 'chat';
    const config = TASK_CONFIGS[taskType] || TASK_CONFIGS.chat;

    // 1. Собираем полный системный промпт
    const fullSystemPrompt = composeSystemPrompt(
      taskType,
      request.systemPrompt,
      { language: request.options?.language }
    );

    // 2. Определяем провайдера и модель
    const { provider, model } = selectProvider(
      taskType,
      this.availableProviders,
      request.options?.provider
    );
    const finalModel = request.options?.model || model;

    // 3. Параметры генерации
    const temperature = request.options?.temperature ?? config.temperature;
    const maxTokens = request.options?.maxTokens ?? config.maxTokens;

    logger.info(`[LLM Gateway] ${taskType} → ${provider}/${finalModel} (temp=${temperature}, max=${maxTokens})`);

    // 4. Вызываем провайдера
    try {
      let result: { content: string; usage: LLMResponse['usage']; model: string };

      switch (provider) {
        case 'anthropic':
          result = await this.callAnthropic(fullSystemPrompt, request, finalModel, temperature, maxTokens);
          break;
        case 'xai':
          result = await this.callXAI(fullSystemPrompt, request, finalModel, temperature, maxTokens);
          break;
        case 'openai':
        default:
          result = await this.callOpenAI(fullSystemPrompt, request, finalModel, temperature, maxTokens);
          break;
      }

      const latencyMs = Date.now() - startTime;

      logger.info(`[LLM Gateway] ✅ ${provider}/${result.model}: ${result.content.length} chars, ${latencyMs}ms`);

      return {
        content: result.content,
        model: 'Science AI',     // Всегда "Science AI" для пользователя
        _provider: provider,      // Реальный провайдер (для логов)
        _model: result.model,     // Реальная модель (для логов)
        usage: result.usage,
        latencyMs,
      };
    } catch (error) {
      // Fallback: если основной провайдер упал — пробуем другой
      logger.error(`[LLM Gateway] ❌ ${provider}/${finalModel} failed:`, error instanceof Error ? error.message : 'Unknown');
      return this.fallbackGenerate(request, fullSystemPrompt, provider, temperature, maxTokens, startTime);
    }
  }

  // ==================== СТРИМИНГ ====================

  async *generateStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    const taskType = request.taskType || 'chat';
    const config = TASK_CONFIGS[taskType] || TASK_CONFIGS.chat;

    const fullSystemPrompt = composeSystemPrompt(
      taskType,
      request.systemPrompt,
      { language: request.options?.language }
    );

    const { provider, model } = selectProvider(
      taskType,
      this.availableProviders,
      request.options?.provider
    );
    const finalModel = request.options?.model || model;
    const temperature = request.options?.temperature ?? config.temperature;
    const maxTokens = request.options?.maxTokens ?? config.maxTokens;

    logger.info(`[LLM Gateway] STREAM ${taskType} → ${provider}/${finalModel}`);

    try {
      switch (provider) {
        case 'anthropic':
          yield* this.streamAnthropic(fullSystemPrompt, request, finalModel, temperature, maxTokens);
          break;
        case 'xai':
          yield* this.streamOpenAICompatible(this.xai!, fullSystemPrompt, request, finalModel, temperature, maxTokens);
          break;
        case 'openai':
        default:
          yield* this.streamOpenAICompatible(this.openai!, fullSystemPrompt, request, finalModel, temperature, maxTokens);
          break;
      }
    } catch (error) {
      logger.error(`[LLM Gateway] Stream error:`, error instanceof Error ? error.message : 'Unknown');
      yield { content: 'Произошла ошибка при генерации. Попробуйте ещё раз.', done: true };
    }
  }

  // ==================== OPENAI CALL ====================

  private async callOpenAI(
    systemPrompt: string,
    request: LLMRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ) {
    if (!this.openai) throw new Error('OpenAI not configured');

    const messages = this.buildMessages(systemPrompt, request);

    const response = await this.openai.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
      presence_penalty: 0.6,
      frequency_penalty: 0.4,
      ...(request.options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    });

    const content = response.choices[0]?.message?.content || '';
    if (!content || content.length < 2) {
      throw new Error('Empty response from OpenAI');
    }

    return {
      content,
      model: response.model || model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  // ==================== ANTHROPIC (CLAUDE) CALL ====================

  private async callAnthropic(
    systemPrompt: string,
    request: LLMRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ) {
    if (!this.anthropic) throw new Error('Anthropic not configured');

    const messages = this.buildAnthropicMessages(request);

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages,
    });

    const content = response.content?.[0]?.type === 'text'
      ? response.content[0].text
      : '';

    if (!content || content.length < 2) {
      throw new Error('Empty response from Anthropic');
    }

    return {
      content,
      model: response.model || model,
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
    };
  }

  // ==================== XAI (GROK) CALL ====================

  private async callXAI(
    systemPrompt: string,
    request: LLMRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ) {
    if (!this.xai) throw new Error('xAI not configured');

    const messages = this.buildMessages(systemPrompt, request);

    const response = await this.xai.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content || '';
    if (!content || content.length < 2) {
      throw new Error('Empty response from xAI');
    }

    return {
      content,
      model: response.model || model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  // ==================== STREAMING: OPENAI-COMPATIBLE ====================

  private async *streamOpenAICompatible(
    client: OpenAI,
    systemPrompt: string,
    request: LLMRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<LLMStreamChunk> {
    const messages = this.buildMessages(systemPrompt, request);

    const stream = await client.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { content: delta, done: false };
      }
    }
    yield { content: '', done: true };
  }

  // ==================== STREAMING: ANTHROPIC ====================

  private async *streamAnthropic(
    systemPrompt: string,
    request: LLMRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<LLMStreamChunk> {
    if (!this.anthropic) throw new Error('Anthropic not configured');

    const messages = this.buildAnthropicMessages(request);

    const stream = await this.anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        yield { content: event.delta.text, done: false };
      }
    }
    yield { content: '', done: true };
  }

  // ==================== FALLBACK ====================

  private async fallbackGenerate(
    request: LLMRequest,
    systemPrompt: string,
    failedProvider: ProviderName,
    temperature: number,
    maxTokens: number,
    startTime: number
  ): Promise<LLMResponse> {
    // Пробуем всех доступных провайдеров кроме упавшего
    const fallbacks = this.availableProviders.filter(p => p !== failedProvider);

    for (const fb of fallbacks) {
      try {
        const fbModel = fb === 'openai' ? 'gpt-4o' : fb === 'anthropic' ? 'claude-sonnet-4-20250514' : 'grok-3-latest';
        logger.info(`[LLM Gateway] Fallback → ${fb}/${fbModel}`);

        let result;
        switch (fb) {
          case 'anthropic':
            result = await this.callAnthropic(systemPrompt, request, fbModel, temperature, maxTokens);
            break;
          case 'xai':
            result = await this.callXAI(systemPrompt, request, fbModel, temperature, maxTokens);
            break;
          default:
            result = await this.callOpenAI(systemPrompt, request, fbModel, temperature, maxTokens);
        }

        return {
          content: result.content,
          model: 'Science AI',
          _provider: fb,
          _model: result.model,
          usage: result.usage,
          latencyMs: Date.now() - startTime,
        };
      } catch (fbError) {
        logger.error(`[LLM Gateway] Fallback ${fb} also failed:`, fbError instanceof Error ? fbError.message : 'Unknown');
      }
    }

    throw new Error('Все AI-провайдеры недоступны. Попробуйте позже.');
  }

  // ==================== HELPERS ====================

  /** Собирает массив сообщений для OpenAI/xAI */
  private buildMessages(systemPrompt: string, request: LLMRequest) {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Добавляем историю (если есть)
    if (request.conversationHistory?.length) {
      for (const msg of request.conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: request.userPrompt });
    return messages;
  }

  /** Собирает массив сообщений для Anthropic (без system в messages) */
  private buildAnthropicMessages(request: LLMRequest) {
    const messages: Array<{ role: string; content: string }> = [];

    if (request.conversationHistory?.length) {
      for (const msg of request.conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: request.userPrompt });
    return messages;
  }

  // ==================== INFO ====================

  getStatus() {
    return {
      providers: this.availableProviders.map(p => ({
        name: p,
        status: 'active',
        models: p === 'openai'
          ? ['gpt-4o', 'gpt-4o-mini']
          : p === 'anthropic'
            ? ['claude-sonnet-4-20250514']
            : ['grok-3-latest'],
      })),
      totalProviders: this.availableProviders.length,
    };
  }
}

// ==================== SINGLETON ====================

let _instance: LLMGateway | null = null;

export function getLLMGateway(): LLMGateway {
  if (!_instance) {
    _instance = new LLMGateway();
  }
  return _instance;
}

export default LLMGateway;
