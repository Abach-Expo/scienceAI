/**
 * Серверный AI API клиент
 * Все запросы проходят через LLM Gateway (Science AI)
 * API ключи хранятся ТОЛЬКО на сервере, не видны в браузере
 */

import { API_URL } from '../config';
import { fetchWithAuth } from './apiClient';

interface GenerateResponse {
  success: boolean;
  content?: string;
  error?: string;
  model?: string;
  provider?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  latencyMs?: number;
}

/**
 * Генерирует текст через LLM Gateway (Science AI)
 * Gateway автоматически добавляет системные промпты, стили и ограничения
 * @param systemPrompt - Системный промпт (будет дополнен базовым промптом Science AI)
 * @param userPrompt - Промпт пользователя
 * @param options - Дополнительные параметры
 */
export async function generateAI(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    taskType?: string;
  }
): Promise<{ content: string; error?: string; model?: string; provider?: string }> {
  try {
    const effectiveTaskType = options?.taskType || 'chat';
    console.log(`[AI] generateAI: taskType=${effectiveTaskType}, maxTokens=${options?.maxTokens ?? 4000}`);
    
    const response = await fetchWithAuth(`${API_URL}/llm/generate`, {
      method: 'POST',
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        taskType: effectiveTaskType,
        temperature: options?.temperature ?? 0.85,
        maxTokens: options?.maxTokens ?? 4000,
      }),
    });

    // Защита от пустого ответа
    const responseText = await response.text();
    if (!responseText) {
      return {
        content: '',
        error: 'Сервер вернул пустой ответ. Проверьте, что бэкенд запущен.',
      };
    }

    let data: GenerateResponse;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return {
        content: '',
        error: 'Некорректный JSON от сервера',
      };
    }

    if (!response.ok || !data.success) {
      if (response.status === 401) {
        return {
          content: '',
          error: 'AUTH_ERROR: Сессия истекла. Пожалуйста, войдите снова.',
        };
      }
      if (response.status === 429) {
        return {
          content: '',
          error: 'RATE_LIMIT: Превышен лимит запросов. Подождите немного.',
        };
      }
      return {
        content: '',
        error: data.error || `Ошибка сервера (${response.status})`,
      };
    }

    return {
      content: data.content || '',
      model: data.model,
      provider: data.provider,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ошибка соединения с сервером';
    return {
      content: '',
      error: message,
    };
  }
}

/**
 * Проверяет доступность AI Gateway
 */
export async function checkAIServerStatus(): Promise<boolean> {
  try {
    const response = await fetchWithAuth(`${API_URL}/llm/status`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Чат через LLM Gateway с поддержкой истории разговора
 * @param message - Сообщение пользователя
 * @param options - Параметры: taskType, conversationHistory, temperature, maxTokens
 */
export async function chatAI(
  message: string,
  options?: {
    taskType?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ content: string; error?: string; model?: string }> {
  try {
    const response = await fetchWithAuth(`${API_URL}/llm/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        taskType: options?.taskType || 'chat',
        conversationHistory: options?.conversationHistory,
        options: {
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        },
      }),
    });

    const responseText = await response.text();
    if (!responseText) {
      return { content: '', error: 'Сервер вернул пустой ответ' };
    }

    let data: GenerateResponse;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { content: '', error: 'Некорректный JSON от сервера' };
    }

    if (!response.ok || !data.success) {
      if (response.status === 401) {
        return { content: '', error: 'AUTH_ERROR: Сессия истекла. Пожалуйста, войдите снова.' };
      }
      if (response.status === 429) {
        return { content: '', error: 'RATE_LIMIT: Превышен лимит запросов. Подождите немного.' };
      }
      return { content: '', error: data.error || `Ошибка сервера (${response.status})` };
    }

    return {
      content: data.content || '',
      model: data.model || 'Science AI',
    };
  } catch (error: unknown) {
    const message2 = error instanceof Error ? error.message : 'Ошибка соединения с сервером';
    return { content: '', error: message2 };
  }
}

/**
 * Получить список доступных моделей Science AI
 */
export async function getAvailableModels(): Promise<Array<{ id: string; name: string; description: string }>> {
  try {
    const response = await fetchWithAuth(`${API_URL}/llm/models`, {
      method: 'GET',
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.models || [];
  } catch {
    return [];
  }
}

/**
 * Создаёт объект, совместимый с интерфейсом OpenAI SDK
 * для минимальных изменений в существующем коде
 */
export function createServerOpenAI(taskType?: string) {
  return {
    chat: {
      completions: {
        create: async (params: {
          model: string;
          messages: Array<{ role: string; content: string }>;
          temperature?: number;
          max_tokens?: number;
          response_format?: { type: string };
        }) => {
          // Извлекаем system и user сообщения
          const systemMsg = params.messages.find(m => m.role === 'system');
          const userMsg = params.messages.find(m => m.role === 'user');
          
          // Auto-detect taskType from context if not explicitly provided
          const effectiveTaskType = taskType || 'presentation';
          
          console.log(`[AI] createServerOpenAI: taskType=${effectiveTaskType}, maxTokens=${params.max_tokens}`);
          
          const result = await generateAI(
            systemMsg?.content || '',
            userMsg?.content || '',
            {
              temperature: params.temperature,
              maxTokens: params.max_tokens,
              taskType: effectiveTaskType,
            }
          );

          if (result.error) {
            console.error(`[AI] createServerOpenAI error: ${result.error}`);
            throw new Error(result.error);
          }

          // Возвращаем формат, совместимый с OpenAI SDK
          return {
            choices: [
              {
                message: {
                  content: result.content,
                  role: 'assistant',
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            },
          };
        },
      },
    },
  };
}

export default {
  generateAI,
  chatAI,
  checkAIServerStatus,
  getAvailableModels,
  createServerOpenAI,
};
