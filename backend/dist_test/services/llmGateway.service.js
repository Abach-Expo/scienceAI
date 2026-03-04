"use strict";
// =================================================================
// 🧠 SCIENCE AI — LLM GATEWAY SERVICE
// Единый шлюз для всех LLM: OpenAI, Claude, Grok (xAI)
// Принимает запрос → добавляет системные промпты → маршрутизирует
// в облако → возвращает как "Science AI"
// =================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMGateway = void 0;
exports.getLLMGateway = getLLMGateway;
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../utils/logger");
const llmGateway_prompts_1 = require("./llmGateway.prompts");
// Динамический импорт Anthropic (может не быть установлен)
let Anthropic = null;
try {
    Anthropic = require('@anthropic-ai/sdk');
}
catch {
    logger_1.logger.info('[LLM Gateway] Anthropic SDK not installed — Claude disabled');
}
// ==================== GATEWAY CLASS ====================
class LLMGateway {
    openai = null;
    anthropic = null;
    xai = null; // xAI использует OpenAI-совместимый API
    availableProviders = [];
    constructor() {
        this.initProviders();
    }
    // ==================== ИНИЦИАЛИЗАЦИЯ ПРОВАЙДЕРОВ ====================
    initProviders() {
        // OpenAI
        if (process.env.OPENAI_API_KEY) {
            this.openai = new openai_1.default({
                apiKey: process.env.OPENAI_API_KEY,
            });
            this.availableProviders.push('openai');
            logger_1.logger.info('[LLM Gateway] ✅ OpenAI initialized (GPT-4o, GPT-4o-mini)');
        }
        // Anthropic (Claude)
        if (Anthropic && process.env.ANTHROPIC_API_KEY) {
            this.anthropic = new Anthropic.default({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });
            this.availableProviders.push('anthropic');
            logger_1.logger.info('[LLM Gateway] ✅ Anthropic initialized (Claude Sonnet 4)');
        }
        // xAI (Grok) — OpenAI-совместимый API
        if (process.env.XAI_API_KEY) {
            this.xai = new openai_1.default({
                apiKey: process.env.XAI_API_KEY,
                baseURL: 'https://api.x.ai/v1',
            });
            this.availableProviders.push('xai');
            logger_1.logger.info('[LLM Gateway] ✅ xAI initialized (Grok-3)');
        }
        if (this.availableProviders.length === 0) {
            logger_1.logger.error('[LLM Gateway] ❌ No AI providers configured! Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or XAI_API_KEY');
        }
        else {
            logger_1.logger.info(`[LLM Gateway] Active providers: ${this.availableProviders.join(', ')}`);
        }
    }
    // ==================== ОСНОВНОЙ МЕТОД ГЕНЕРАЦИИ ====================
    async generate(request) {
        const startTime = Date.now();
        const taskType = request.taskType || 'chat';
        const config = llmGateway_prompts_1.TASK_CONFIGS[taskType] || llmGateway_prompts_1.TASK_CONFIGS.chat;
        // 1. Собираем полный системный промпт
        const fullSystemPrompt = (0, llmGateway_prompts_1.composeSystemPrompt)(taskType, request.systemPrompt, { language: request.options?.language });
        // 2. Определяем провайдера и модель
        const { provider, model } = (0, llmGateway_prompts_1.selectProvider)(taskType, this.availableProviders, request.options?.provider);
        const finalModel = request.options?.model || model;
        // 3. Параметры генерации
        const temperature = request.options?.temperature ?? config.temperature;
        const maxTokens = request.options?.maxTokens ?? config.maxTokens;
        logger_1.logger.info(`[LLM Gateway] ${taskType} → ${provider}/${finalModel} (temp=${temperature}, max=${maxTokens})`);
        // 4. Вызываем провайдера
        try {
            let result;
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
            logger_1.logger.info(`[LLM Gateway] ✅ ${provider}/${result.model}: ${result.content.length} chars, ${latencyMs}ms`);
            return {
                content: result.content,
                model: 'Science AI', // Всегда "Science AI" для пользователя
                _provider: provider, // Реальный провайдер (для логов)
                _model: result.model, // Реальная модель (для логов)
                usage: result.usage,
                latencyMs,
            };
        }
        catch (error) {
            // Fallback: если основной провайдер упал — пробуем другой
            logger_1.logger.error(`[LLM Gateway] ❌ ${provider}/${finalModel} failed:`, error instanceof Error ? error.message : 'Unknown');
            return this.fallbackGenerate(request, fullSystemPrompt, provider, temperature, maxTokens, startTime);
        }
    }
    // ==================== СТРИМИНГ ====================
    async *generateStream(request) {
        const taskType = request.taskType || 'chat';
        const config = llmGateway_prompts_1.TASK_CONFIGS[taskType] || llmGateway_prompts_1.TASK_CONFIGS.chat;
        const fullSystemPrompt = (0, llmGateway_prompts_1.composeSystemPrompt)(taskType, request.systemPrompt, { language: request.options?.language });
        const { provider, model } = (0, llmGateway_prompts_1.selectProvider)(taskType, this.availableProviders, request.options?.provider);
        const finalModel = request.options?.model || model;
        const temperature = request.options?.temperature ?? config.temperature;
        const maxTokens = request.options?.maxTokens ?? config.maxTokens;
        logger_1.logger.info(`[LLM Gateway] STREAM ${taskType} → ${provider}/${finalModel}`);
        try {
            switch (provider) {
                case 'anthropic':
                    yield* this.streamAnthropic(fullSystemPrompt, request, finalModel, temperature, maxTokens);
                    break;
                case 'xai':
                    yield* this.streamOpenAICompatible(this.xai, fullSystemPrompt, request, finalModel, temperature, maxTokens);
                    break;
                case 'openai':
                default:
                    yield* this.streamOpenAICompatible(this.openai, fullSystemPrompt, request, finalModel, temperature, maxTokens);
                    break;
            }
        }
        catch (error) {
            logger_1.logger.error(`[LLM Gateway] Stream error:`, error instanceof Error ? error.message : 'Unknown');
            yield { content: 'Произошла ошибка при генерации. Попробуйте ещё раз.', done: true };
        }
    }
    // ==================== OPENAI CALL ====================
    async callOpenAI(systemPrompt, request, model, temperature, maxTokens) {
        if (!this.openai)
            throw new Error('OpenAI not configured');
        const messages = this.buildMessages(systemPrompt, request);
        const response = await this.openai.chat.completions.create({
            model,
            messages: messages,
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
    async callAnthropic(systemPrompt, request, model, temperature, maxTokens) {
        if (!this.anthropic)
            throw new Error('Anthropic not configured');
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
    async callXAI(systemPrompt, request, model, temperature, maxTokens) {
        if (!this.xai)
            throw new Error('xAI not configured');
        const messages = this.buildMessages(systemPrompt, request);
        const response = await this.xai.chat.completions.create({
            model,
            messages: messages,
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
    async *streamOpenAICompatible(client, systemPrompt, request, model, temperature, maxTokens) {
        const messages = this.buildMessages(systemPrompt, request);
        const stream = await client.chat.completions.create({
            model,
            messages: messages,
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
    async *streamAnthropic(systemPrompt, request, model, temperature, maxTokens) {
        if (!this.anthropic)
            throw new Error('Anthropic not configured');
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
    async fallbackGenerate(request, systemPrompt, failedProvider, temperature, maxTokens, startTime) {
        // Пробуем всех доступных провайдеров кроме упавшего
        const fallbacks = this.availableProviders.filter(p => p !== failedProvider);
        for (const fb of fallbacks) {
            try {
                const fbModel = fb === 'openai' ? 'gpt-4o' : fb === 'anthropic' ? 'claude-sonnet-4-20250514' : 'grok-3-latest';
                logger_1.logger.info(`[LLM Gateway] Fallback → ${fb}/${fbModel}`);
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
            }
            catch (fbError) {
                logger_1.logger.error(`[LLM Gateway] Fallback ${fb} also failed:`, fbError instanceof Error ? fbError.message : 'Unknown');
            }
        }
        throw new Error('Все AI-провайдеры недоступны. Попробуйте позже.');
    }
    // ==================== HELPERS ====================
    /** Собирает массив сообщений для OpenAI/xAI */
    buildMessages(systemPrompt, request) {
        const messages = [
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
    buildAnthropicMessages(request) {
        const messages = [];
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
exports.LLMGateway = LLMGateway;
// ==================== SINGLETON ====================
let _instance = null;
function getLLMGateway() {
    if (!_instance) {
        _instance = new LLMGateway();
    }
    return _instance;
}
exports.default = LLMGateway;
//# sourceMappingURL=llmGateway.service.js.map