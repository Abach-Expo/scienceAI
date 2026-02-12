/**
 * Серверный AI API клиент
 * API ключ хранится ТОЛЬКО на сервере, не виден в браузере
 */

import { API_URL } from '../config';
import { getAuthorizationHeaders } from './apiClient';

interface GenerateResponse {
  success: boolean;
  content?: string;
  error?: string;
  model?: string;
  provider?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Генерирует текст через серверный API (ключ на сервере)
 * @param systemPrompt - Системный промпт
 * @param userPrompt - Промпт пользователя
 * @param options - Дополнительные параметры
 */
export async function generateAI(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    taskType?: string; // Claude routing: dissertation, essay, coursework, chat, etc.
  }
): Promise<{ content: string; error?: string; model?: string; provider?: string }> {
  try {
    const response = await fetch(`${API_URL}/ai/generate`, {
      method: 'POST',
      headers: getAuthorizationHeaders(),
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        temperature: options?.temperature ?? 0.85,
        maxTokens: options?.maxTokens ?? 4000,
        ...(options?.taskType ? { taskType: options.taskType } : {}),
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
    console.error('AI Server Error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка соединения с сервером';
    return {
      content: '',
      error: message,
    };
  }
}

/**
 * Проверяет доступность AI сервера
 */
export async function checkAIServerStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/ai/usage`, {
      method: 'GET',
      headers: getAuthorizationHeaders(),
    });
    return response.ok;
  } catch {
    return false;
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
          
          const result = await generateAI(
            systemMsg?.content || '',
            userMsg?.content || '',
            {
              temperature: params.temperature,
              maxTokens: params.max_tokens,
              taskType: taskType,
            }
          );

          if (result.error) {
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
  checkAIServerStatus,
  createServerOpenAI,
};
