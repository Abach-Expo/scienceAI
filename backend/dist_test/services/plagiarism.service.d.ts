/**
 * 🔍 REAL PLAGIARISM SERVICE v2.0
 * Multi-engine plagiarism detection with real web search
 *
 * Engines:
 * 1. Google Custom Search API — real web duplicate detection
 * 2. CrossRef API — academic paper matching
 * 3. Semantic Scholar API — scientific literature check
 * 4. Internal AI analysis — pattern + statistical analysis
 */
export interface PlagiarismSource {
    url: string;
    title: string;
    snippet: string;
    similarity: number;
    type: 'web' | 'academic' | 'journal' | 'book';
}
export interface PlagiarismIssue {
    type: 'plagiarism' | 'ai_pattern' | 'cliche' | 'self_plagiarism';
    text: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
    source?: PlagiarismSource;
}
export interface PlagiarismResult {
    uniquenessScore: number;
    aiProbability: number;
    sourcesFound: number;
    sources: PlagiarismSource[];
    analysis: {
        issues: PlagiarismIssue[];
        strengths: string[];
        summary: string;
    };
    recommendations: string[];
    wordCount: number;
    characterCount: number;
    sentenceCount: number;
    metrics: {
        exactMatchPercent: number;
        paraphraseMatchPercent: number;
        citationCoverage: number;
        vocabularyRichness: number;
        burstiness: number;
        perplexity: number;
    };
}
export declare function checkPlagiarism(text: string, language?: 'ru' | 'en'): Promise<PlagiarismResult>;
//# sourceMappingURL=plagiarism.service.d.ts.map