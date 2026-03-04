/**
 * 🌊 useStreamingAI Hook
 * Хук для streaming генерации текста в реальном времени
 */

import { useState, useCallback, useRef } from 'react';
import { API_URL } from '../config';
import { getAuthorizationHeaders } from '../services/apiClient';

interface StreamingOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
}

interface StreamingState {
  isStreaming: boolean;
  text: string;
  error: string | null;
  progress: number;
}

export function useStreamingAI() {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    text: '',
    error: null,
    progress: 0,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const textRef = useRef<string>('');

  const startStreaming = useCallback(async (options: StreamingOptions) => {
    const {
      systemPrompt,
      userPrompt,
      temperature = 0.85,
      maxTokens = 4000,
      model = 'gpt-4o',
      onChunk,
      onComplete,
      onError,
    } = options;

    // Отменяем предыдущий запрос если есть
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    textRef.current = '';

    setState({
      isStreaming: true,
      text: '',
      error: null,
      progress: 0,
    });

    try {
      const response = await fetch(`${API_URL}/llm/stream`, {
        method: 'POST',
        headers: getAuthorizationHeaders(),
        body: JSON.stringify({
          systemPrompt,
          userPrompt,
          temperature,
          maxTokens,
          model,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let estimatedTotal = maxTokens * 4; // Примерная оценка символов

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                throw new Error(data.error);
              }

              if (data.content) {
                textRef.current += data.content;
                const progress = Math.min((textRef.current.length / estimatedTotal) * 100, 95);
                
                setState(prev => ({
                  ...prev,
                  text: textRef.current,
                  progress,
                }));

                onChunk?.(data.content);
              }

              if (data.done) {
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  progress: 100,
                }));
                onComplete?.(textRef.current);
                return;
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      setState(prev => ({
        ...prev,
        isStreaming: false,
        progress: 100,
      }));
      onComplete?.(textRef.current);

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: 'Генерация отменена',
        }));
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Ошибка streaming';
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  const reset = useCallback(() => {
    stopStreaming();
    textRef.current = '';
    setState({
      isStreaming: false,
      text: '',
      error: null,
      progress: 0,
    });
  }, [stopStreaming]);

  return {
    ...state,
    startStreaming,
    stopStreaming,
    reset,
  };
}

// ================== ПРОСТОЙ STREAMING КОМПОНЕНТ ==================

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingText({ text, isStreaming, className = '' }: StreamingTextProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="whitespace-pre-wrap">{text}</div>
      {isStreaming && (
        <span className="inline-block w-2 h-5 bg-accent-primary animate-pulse ml-0.5" />
      )}
    </div>
  );
}

export default useStreamingAI;
