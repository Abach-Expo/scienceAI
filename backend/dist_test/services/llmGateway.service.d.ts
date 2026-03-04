import { type ProviderName } from './llmGateway.prompts';
export interface LLMRequest {
    /** Тип задачи: chat, presentation, dissertation, essay, analysis, code и т.д. */
    taskType: string;
    /** Пользовательский промпт (вопрос/запрос) */
    userPrompt: string;
    /** Опциональный кастомный системный промпт (дополняет, не заменяет базовый) */
    systemPrompt?: string;
    /** Контекст диалога (предыдущие сообщения) */
    conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    /** Настройки */
    options?: {
        temperature?: number;
        maxTokens?: number;
        language?: 'ru' | 'en';
        provider?: ProviderName;
        model?: string;
        stream?: boolean;
        jsonMode?: boolean;
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
export declare class LLMGateway {
    private openai;
    private anthropic;
    private xai;
    private availableProviders;
    constructor();
    private initProviders;
    generate(request: LLMRequest): Promise<LLMResponse>;
    generateStream(request: LLMRequest): AsyncGenerator<LLMStreamChunk>;
    private callOpenAI;
    private callAnthropic;
    private callXAI;
    private streamOpenAICompatible;
    private streamAnthropic;
    private fallbackGenerate;
    /** Собирает массив сообщений для OpenAI/xAI */
    private buildMessages;
    /** Собирает массив сообщений для Anthropic (без system в messages) */
    private buildAnthropicMessages;
    getStatus(): {
        providers: {
            name: ProviderName;
            status: string;
            models: string[];
        }[];
        totalProviders: number;
    };
}
export declare function getLLMGateway(): LLMGateway;
export default LLMGateway;
//# sourceMappingURL=llmGateway.service.d.ts.map