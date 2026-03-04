interface DissertationConfig {
    topic: string;
    type: 'essay' | 'referat' | 'coursework' | 'diploma' | 'dissertation';
    targetPages: number;
    language: 'ru' | 'en';
    additionalInstructions?: string;
    includeReferences?: boolean;
    includeTableOfContents?: boolean;
    style?: 'academic' | 'scientific' | 'popular';
}
export interface GenerationProgress {
    phase: 'planning' | 'generating' | 'assembling' | 'done' | 'error';
    currentChapter: number;
    totalChapters: number;
    chapterTitle: string;
    percentComplete: number;
    wordsGenerated: number;
    pagesGenerated: number;
    estimatedTimeRemaining: number;
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
        generationTime: number;
        chaptersCount: number;
    };
}
export declare class DissertationService {
    private openai;
    private anthropic;
    private claudeModel;
    private gptModel;
    constructor();
    /**
     * Генерация через Claude с фолбэком на GPT-4o
     */
    private generate;
    /**
     * Главный метод: Генерация полной работы по главам
     * Использует SSE callback для отправки прогресса
     */
    generateFullDissertation(config: DissertationConfig, onProgress?: (progress: GenerationProgress) => void): Promise<DissertationResult>;
    /**
     * Уточнить план работы через AI — адаптировать шаблон под конкретную тему
     */
    private refinePlan;
    /**
     * Генерация одной главы — может делать несколько запросов для длинных глав
     */
    private generateChapter;
    /**
     * Генерация части главы одним запросом
     */
    private generateChapterPart;
    /**
     * Построение оглавления
     */
    private buildTableOfContents;
    /**
     * Сборка полного документа
     */
    private assembleDocument;
    /**
     * Получить оценку времени генерации
     */
    estimateGenerationTime(targetPages: number): {
        estimatedMinutes: number;
        estimatedRequests: number;
        estimatedCost: number;
    };
}
export {};
//# sourceMappingURL=dissertation.service.d.ts.map