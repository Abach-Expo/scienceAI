/**
 * Shared Anthropic SDK type definitions
 * Used by ai.service.ts and dissertation.service.ts
 */

export interface AnthropicMessage {
  content: Array<{ text?: string; type?: string }>;
}

export interface AnthropicMessageStream {
  on(event: 'text', callback: (text: string) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  finalMessage(): Promise<AnthropicMessage>;
}

export interface AnthropicClient {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      temperature: number;
      system: string;
      messages: Array<{ role: string; content: string }>;
    }): Promise<AnthropicMessage>;
    stream(params: {
      model: string;
      max_tokens: number;
      temperature: number;
      system: string;
      messages: Array<{ role: string; content: string }>;
    }): AnthropicMessageStream;
  };
}

export interface AnthropicModule {
  default: new (config: { apiKey: string }) => AnthropicClient;
}
