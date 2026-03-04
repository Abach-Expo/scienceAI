interface OutlineSection {
    title: string;
    description: string;
    subsections?: OutlineSection[];
    estimatedWords?: number;
}
interface GeneratedDraft {
    content: string;
    wordCount: number;
    sections: string[];
}
interface AnalysisResult {
    overallScore: number;
    issues: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high';
        description: string;
        suggestion: string;
        location?: string;
    }>;
    summary: string;
    strengths: string[];
    improvements: string[];
}
interface StyleImprovement {
    content: string;
    changes: Array<{
        original: string;
        improved: string;
        reason: string;
    }>;
}
interface SelfReviewResult {
    thinking: string;
    analysis: string;
    recommendations: string[];
    revisedSections?: Array<{
        original: string;
        revised: string;
        explanation: string;
    }>;
}
export declare class AIService {
    private openai;
    private anthropic;
    private model;
    private fastModel;
    private claudeModel;
    constructor();
    /**
     * Публичный метод генерации с модельным роутингом
     * Используется из /api/ai/generate для маршрутизации Claude/GPT
     */
    generate(taskType: string, systemPrompt: string, userPrompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
        presencePenalty?: number;
        frequencyPenalty?: number;
    }): Promise<{
        content: string;
        model: string;
        provider: string;
    }>;
    /**
     * Одно-проходная гуманизация: отправляет ВЕСЬ текст одним вызовом
     * Быстрее чем чанковый подход, Claude может обработать до 100K токенов
     */
    singlePassHumanize(text: string): Promise<string>;
    /**
     * Пост-обработка: удаляет/заменяет оставшиеся AI-маркеры
     */
    postProcessHumanize(text: string): string;
    /**
     * Универсальный метод генерации через Claude или OpenAI
     * Claude используется для текстов, OpenAI для анализа и чата
     */
    private generateWithRouting;
    /**
     * Streaming generation for SSE endpoint.
     * Uses Claude streaming API for text tasks, OpenAI streaming for others.
     * Calls onChunk callback for each text delta, returns full accumulated text.
     * Skips 2nd humanization pass — postProcessHumanize is applied on the final result.
     */
    generateStream(taskType: string, systemPrompt: string, userPrompt: string, options: {
        temperature?: number;
        maxTokens?: number;
        presencePenalty?: number;
        frequencyPenalty?: number;
    } | undefined, onChunk: (text: string) => void): Promise<{
        content: string;
        model: string;
        provider: string;
    }>;
    generateOutline(topic: string, projectType: string, additionalContext?: string): Promise<OutlineSection[]>;
    generateArguments(topic: string, outline?: OutlineSection[], researchQuestions?: string[]): Promise<Record<string, unknown>>;
    generateDraft(title: string, outline: OutlineSection[], specificSection?: string, references?: Array<{
        title?: string;
        url?: string;
        authors?: string[];
        year?: string;
    }>, customInstructions?: string, targetWords?: number): Promise<GeneratedDraft>;
    analyzeDocument(content: string, analysisType: string): Promise<AnalysisResult>;
    improveStyle(content: string, instructions?: string): Promise<StyleImprovement>;
    selfReview(content: string, projectType: string): Promise<SelfReviewResult>;
}
export {};
//# sourceMappingURL=ai.service.d.ts.map