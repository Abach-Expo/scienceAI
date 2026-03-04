"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPlagiarism = checkPlagiarism;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
// ================== AI PATTERNS DATABASE ==================
const AI_PATTERNS_RU = [
    // Введение / Opening clichés
    { pattern: /в современном мире/gi, weight: 3, category: 'intro_cliche' },
    { pattern: /в наше время/gi, weight: 2, category: 'intro_cliche' },
    { pattern: /в эпоху цифровизации/gi, weight: 3, category: 'intro_cliche' },
    { pattern: /данная тема.{0,30}актуальн/gi, weight: 3, category: 'intro_cliche' },
    { pattern: /актуальность.{0,30}обусловлена/gi, weight: 2, category: 'intro_cliche' },
    { pattern: /на сегодняшний день/gi, weight: 2, category: 'intro_cliche' },
    { pattern: /в условиях глобализации/gi, weight: 3, category: 'intro_cliche' },
    { pattern: /в контексте современных реалий/gi, weight: 3, category: 'intro_cliche' },
    // Transitions / Связующие
    { pattern: /важно отметить, что/gi, weight: 2, category: 'transition' },
    { pattern: /следует подчеркнуть/gi, weight: 1, category: 'transition' },
    { pattern: /необходимо учитывать/gi, weight: 1, category: 'transition' },
    { pattern: /стоит отметить/gi, weight: 1, category: 'transition' },
    { pattern: /кроме того/gi, weight: 1, category: 'transition' },
    { pattern: /более того/gi, weight: 2, category: 'transition' },
    { pattern: /помимо этого/gi, weight: 1, category: 'transition' },
    { pattern: /в то же время/gi, weight: 1, category: 'transition' },
    { pattern: /с другой стороны/gi, weight: 1, category: 'transition' },
    { pattern: /вместе с тем/gi, weight: 1, category: 'transition' },
    // Conclusions / Заключения
    { pattern: /таким образом, можно сделать вывод/gi, weight: 3, category: 'conclusion' },
    { pattern: /в заключение следует сказать/gi, weight: 3, category: 'conclusion' },
    { pattern: /резюмируя вышесказанное/gi, weight: 3, category: 'conclusion' },
    { pattern: /подводя итог/gi, weight: 2, category: 'conclusion' },
    { pattern: /на основании вышеизложенного/gi, weight: 2, category: 'conclusion' },
    { pattern: /исходя из вышесказанного/gi, weight: 2, category: 'conclusion' },
    // Amplifiers / Усилители
    { pattern: /не подлежит сомнению/gi, weight: 2, category: 'amplifier' },
    { pattern: /несомненно/gi, weight: 2, category: 'amplifier' },
    { pattern: /безусловно/gi, weight: 2, category: 'amplifier' },
    { pattern: /очевидно, что/gi, weight: 1, category: 'amplifier' },
    { pattern: /неоспоримым является/gi, weight: 3, category: 'amplifier' },
    // AI-specific patterns
    { pattern: /является неотъемлемой частью/gi, weight: 2, category: 'ai_specific' },
    { pattern: /играет важную роль/gi, weight: 2, category: 'ai_specific' },
    { pattern: /широко известно, что/gi, weight: 2, category: 'ai_specific' },
    { pattern: /по мнению многих экспертов/gi, weight: 3, category: 'ai_specific' },
    { pattern: /многочисленные исследования показывают/gi, weight: 3, category: 'ai_specific' },
    { pattern: /представляет собой сложную/gi, weight: 2, category: 'ai_specific' },
    { pattern: /в последние годы наблюдается/gi, weight: 2, category: 'ai_specific' },
    { pattern: /оказывает значительное влияние/gi, weight: 2, category: 'ai_specific' },
    { pattern: /является ключевым фактором/gi, weight: 2, category: 'ai_specific' },
    { pattern: /занимает особое место/gi, weight: 2, category: 'ai_specific' },
    { pattern: /привлекает всё большее внимание/gi, weight: 2, category: 'ai_specific' },
    { pattern: /требует комплексного подхода/gi, weight: 2, category: 'ai_specific' },
    { pattern: /характеризуется рядом особенностей/gi, weight: 2, category: 'ai_specific' },
    { pattern: /представляет значительный интерес/gi, weight: 2, category: 'ai_specific' },
    { pattern: /обусловлено рядом факторов/gi, weight: 2, category: 'ai_specific' },
    // Repetitive structures
    { pattern: /во-первых.{20,300}во-вторых.{20,300}в-третьих/gis, weight: 2, category: 'structure' },
    { pattern: /с одной стороны.{20,300}с другой стороны/gis, weight: 1, category: 'structure' },
];
const AI_PATTERNS_EN = [
    { pattern: /in today's world/gi, weight: 3, category: 'intro_cliche' },
    { pattern: /in this day and age/gi, weight: 3, category: 'intro_cliche' },
    { pattern: /it is important to note/gi, weight: 2, category: 'transition' },
    { pattern: /it goes without saying/gi, weight: 3, category: 'amplifier' },
    { pattern: /furthermore/gi, weight: 2, category: 'transition' },
    { pattern: /moreover/gi, weight: 2, category: 'transition' },
    { pattern: /additionally/gi, weight: 2, category: 'transition' },
    { pattern: /in conclusion/gi, weight: 1, category: 'conclusion' },
    { pattern: /plays a crucial role/gi, weight: 2, category: 'ai_specific' },
    { pattern: /has become increasingly/gi, weight: 1, category: 'ai_specific' },
    { pattern: /it is worth mentioning/gi, weight: 2, category: 'ai_specific' },
    { pattern: /delve into/gi, weight: 3, category: 'ai_specific' },
    { pattern: /leverage/gi, weight: 2, category: 'ai_specific' },
    { pattern: /multifaceted/gi, weight: 2, category: 'ai_specific' },
    { pattern: /holistic approach/gi, weight: 3, category: 'ai_specific' },
    { pattern: /paradigm shift/gi, weight: 3, category: 'ai_specific' },
    { pattern: /robust framework/gi, weight: 3, category: 'ai_specific' },
    { pattern: /myriad of/gi, weight: 2, category: 'ai_specific' },
    { pattern: /tapestry of/gi, weight: 3, category: 'ai_specific' },
    { pattern: /landscape of/gi, weight: 2, category: 'ai_specific' },
    { pattern: /underscore the importance/gi, weight: 2, category: 'ai_specific' },
    { pattern: /navigating the complexities/gi, weight: 3, category: 'ai_specific' },
    { pattern: /fostering a sense of/gi, weight: 3, category: 'ai_specific' },
    { pattern: /pivotal role/gi, weight: 2, category: 'ai_specific' },
    { pattern: /cornerstone of/gi, weight: 2, category: 'ai_specific' },
];
// ================== TEXT ANALYSIS ==================
function analyzeTextStatistics(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    // Sentence length variation (burstiness)
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgSentenceLen = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length || 0;
    const sentenceVariance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLen, 2), 0) / sentenceLengths.length || 0;
    const sentenceStdDev = Math.sqrt(sentenceVariance);
    const burstiness = avgSentenceLen > 0 ? sentenceStdDev / avgSentenceLen : 0;
    // Vocabulary richness (TTR - Type-Token Ratio)
    const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^а-яёa-z]/gi, '')).filter(w => w.length > 2));
    const ttr = words.length > 0 ? uniqueWords.size / words.length : 0;
    // Hapax legomena (words appearing only once)
    const wordFreq = {};
    words.forEach(w => {
        const normalized = w.toLowerCase().replace(/[^а-яёa-z]/gi, '');
        if (normalized.length > 2)
            wordFreq[normalized] = (wordFreq[normalized] || 0) + 1;
    });
    const hapaxCount = Object.values(wordFreq).filter(c => c === 1).length;
    const hapaxRatio = uniqueWords.size > 0 ? hapaxCount / uniqueWords.size : 0;
    // Paragraph length variation
    const paragraphLengths = paragraphs.map(p => p.split(/\s+/).length);
    const avgParaLen = paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length || 0;
    const paraVariance = paragraphLengths.reduce((sum, len) => sum + Math.pow(len - avgParaLen, 2), 0) / paragraphLengths.length || 0;
    const paraStdDev = Math.sqrt(paraVariance);
    // Perplexity approximation (word predictability)
    const bigrams = {};
    const unigramTotal = {};
    for (let i = 0; i < words.length - 1; i++) {
        const w1 = words[i].toLowerCase();
        const w2 = words[i + 1].toLowerCase();
        const bigram = `${w1} ${w2}`;
        bigrams[bigram] = (bigrams[bigram] || 0) + 1;
        unigramTotal[w1] = (unigramTotal[w1] || 0) + 1;
    }
    let logProb = 0;
    let bigramCount = 0;
    for (const [bigram, count] of Object.entries(bigrams)) {
        const w1 = bigram.split(' ')[0];
        const prob = count / (unigramTotal[w1] || 1);
        logProb += Math.log2(prob);
        bigramCount++;
    }
    const perplexity = bigramCount > 0 ? Math.pow(2, -logProb / bigramCount) : 0;
    return {
        wordCount: words.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        avgSentenceLength: avgSentenceLen,
        sentenceStdDev,
        burstiness,
        ttr,
        hapaxRatio,
        paragraphVariance: paraStdDev,
        perplexity,
        characterCount: text.length,
    };
}
function detectAIPatterns(text, language = 'ru') {
    const patterns = language === 'ru' ? AI_PATTERNS_RU : AI_PATTERNS_EN;
    const issues = [];
    for (const { pattern, weight, category } of patterns) {
        const matches = text.match(pattern);
        if (matches) {
            for (const match of matches) {
                const severity = weight >= 3 ? 'high' : weight >= 2 ? 'medium' : 'low';
                issues.push({
                    type: 'ai_pattern',
                    text: match,
                    suggestion: getPatternFix(match, category, language),
                    severity,
                });
            }
        }
    }
    return issues;
}
function getPatternFix(text, category, language) {
    const fixes = {
        ru: {
            intro_cliche: ['Сегодня', 'В настоящее время', 'На данный момент', 'С учётом современных тенденций'],
            transition: ['При этом', 'Одновременно', 'Наряду с этим', 'Отметим также'],
            conclusion: ['Обобщая сказанное', 'В итоге', 'Суммируя', 'Итак'],
            amplifier: ['Вероятно', 'По всей видимости', 'Как представляется', 'С высокой долей вероятности'],
            ai_specific: ['(переформулируйте своими словами)', 'Замените на конкретный пример из вашего опыта'],
            structure: ['Используйте нумерованный список или подзаголовки'],
        },
        en: {
            intro_cliche: ['Currently', 'Today', 'At present', 'As of now'],
            transition: ['Meanwhile', 'Also', 'In addition', 'Similarly'],
            conclusion: ['In summary', 'Overall', 'To sum up', 'All in all'],
            amplifier: ['Likely', 'Presumably', 'Arguably', 'It appears that'],
            ai_specific: ['(rephrase in your own words)', 'Replace with a specific example'],
            structure: ['Use numbered list or subheadings'],
        },
    };
    const langFixes = fixes[language] || fixes['ru'];
    const categoryFixes = langFixes[category] || langFixes['ai_specific'];
    return categoryFixes[Math.floor(Math.random() * categoryFixes.length)];
}
// ================== WEB SEARCH ENGINE ==================
async function searchWebForDuplicates(textChunks) {
    const sources = [];
    // Use Google Custom Search API if configured
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleCx = process.env.GOOGLE_SEARCH_CX;
    if (googleApiKey && googleCx) {
        try {
            for (const chunk of textChunks.slice(0, 5)) { // Limit to 5 searches
                // Take most distinctive sentence from chunk
                const query = extractSearchQuery(chunk);
                if (!query || query.length < 20)
                    continue;
                const response = await axios_1.default.get('https://www.googleapis.com/customsearch/v1', {
                    params: {
                        key: googleApiKey,
                        cx: googleCx,
                        q: `"${query}"`,
                        num: 3,
                    },
                    timeout: 8000,
                });
                if (response.data.items) {
                    for (const item of response.data.items) {
                        const similarity = calculateTextSimilarity(chunk, item.snippet || '');
                        if (similarity > 25) {
                            sources.push({
                                url: item.link,
                                title: item.title,
                                snippet: item.snippet || '',
                                similarity,
                                type: 'web',
                            });
                        }
                    }
                }
                // Rate limit: small delay between searches
                await new Promise(r => setTimeout(r, 300));
            }
        }
        catch (error) {
            logger_1.logger.error('[Plagiarism] Google search error:', error);
        }
    }
    return sources;
}
async function searchAcademicSources(textChunks) {
    const sources = [];
    try {
        for (const chunk of textChunks.slice(0, 3)) {
            const query = extractSearchQuery(chunk);
            if (!query || query.length < 15)
                continue;
            // CrossRef API (free, no key needed)
            try {
                const crossrefResponse = await axios_1.default.get('https://api.crossref.org/works', {
                    params: {
                        query: query.substring(0, 150),
                        rows: 3,
                        select: 'title,DOI,URL,abstract',
                    },
                    timeout: 8000,
                    headers: { 'User-Agent': 'ScienceAI/1.0 (mailto:support@science-ai.app)' },
                });
                if (crossrefResponse.data?.message?.items) {
                    for (const item of crossrefResponse.data.message.items) {
                        const title = Array.isArray(item.title) ? item.title[0] : item.title || '';
                        const abstract = item.abstract || '';
                        const combined = `${title} ${abstract}`;
                        const similarity = calculateTextSimilarity(chunk, combined);
                        if (similarity > 20) {
                            sources.push({
                                url: item.URL || `https://doi.org/${item.DOI}`,
                                title,
                                snippet: abstract.substring(0, 200),
                                similarity,
                                type: 'academic',
                            });
                        }
                    }
                }
            }
            catch (e) {
                // CrossRef may fail silently
            }
            // Semantic Scholar API (free)
            try {
                const ssResponse = await axios_1.default.get('https://api.semanticscholar.org/graph/v1/paper/search', {
                    params: {
                        query: query.substring(0, 100),
                        limit: 3,
                        fields: 'title,abstract,url,externalIds',
                    },
                    timeout: 8000,
                });
                if (ssResponse.data?.data) {
                    for (const paper of ssResponse.data.data) {
                        const combined = `${paper.title || ''} ${paper.abstract || ''}`;
                        const similarity = calculateTextSimilarity(chunk, combined);
                        if (similarity > 20) {
                            sources.push({
                                url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
                                title: paper.title || '',
                                snippet: (paper.abstract || '').substring(0, 200),
                                similarity,
                                type: 'academic',
                            });
                        }
                    }
                }
            }
            catch (e) {
                // SS may fail silently
            }
            await new Promise(r => setTimeout(r, 500));
        }
    }
    catch (error) {
        logger_1.logger.error('[Plagiarism] Academic search error:', error);
    }
    return sources;
}
// ================== TEXT PROCESSING HELPERS ==================
function extractSearchQuery(text) {
    // Pick the longest, most unique sentence from the chunk
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 30);
    if (sentences.length === 0)
        return text.substring(0, 100);
    // Sort by length descending, pick the most substantial one
    sentences.sort((a, b) => b.length - a.length);
    // Take a middle-length sentence (not too short, not too long)
    const target = sentences[Math.floor(sentences.length / 3)] || sentences[0];
    // Clean and trim
    return target.replace(/[«»""]/g, '').substring(0, 150).trim();
}
function calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2)
        return 0;
    const normalize = (t) => t.toLowerCase().replace(/[^а-яёa-z0-9\s]/gi, '').split(/\s+/).filter(w => w.length > 3);
    const words1 = new Set(normalize(text1));
    const words2 = new Set(normalize(text2));
    if (words1.size === 0 || words2.size === 0)
        return 0;
    let intersection = 0;
    for (const word of words1) {
        if (words2.has(word))
            intersection++;
    }
    // Jaccard similarity * 100
    const union = words1.size + words2.size - intersection;
    return Math.round((intersection / union) * 100);
}
function chunkText(text, chunkSize = 500) {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    const chunks = [];
    let current = '';
    for (const para of paragraphs) {
        if (current.length + para.length < chunkSize) {
            current += '\n\n' + para;
        }
        else {
            if (current.trim())
                chunks.push(current.trim());
            current = para;
        }
    }
    if (current.trim())
        chunks.push(current.trim());
    return chunks;
}
// ================== MAIN CHECK FUNCTION ==================
async function checkPlagiarism(text, language = 'ru') {
    logger_1.logger.info(`[Plagiarism] Starting check: ${text.length} chars, language: ${language}`);
    const stats = analyzeTextStatistics(text);
    const chunks = chunkText(text);
    // 1. AI Pattern Detection (local, instant)
    const aiIssues = detectAIPatterns(text, language);
    // 2. Web search for duplicates (parallel)
    const [webSources, academicSources] = await Promise.all([
        searchWebForDuplicates(chunks),
        searchAcademicSources(chunks),
    ]);
    // 3. Combine and deduplicate sources
    const allSources = deduplicateSources([...webSources, ...academicSources]);
    // 4. Calculate scores
    const aiScore = calculateAIScore(aiIssues, stats);
    const plagiarismScore = calculatePlagiarismScore(allSources, stats.wordCount);
    const uniquenessScore = Math.max(0, Math.min(100, 100 - plagiarismScore));
    // 5. Build plagiarism issues from sources
    const plagiarismIssues = allSources
        .filter(s => s.similarity > 30)
        .map(s => ({
        type: 'plagiarism',
        text: s.snippet.substring(0, 100),
        suggestion: `Схожий текст найден: "${s.title}" (${s.similarity}% совпадение)`,
        severity: s.similarity > 60 ? 'high' : s.similarity > 40 ? 'medium' : 'low',
        source: s,
    }));
    // 6. Build strengths
    const strengths = [];
    if (stats.burstiness > 0.4)
        strengths.push('Хорошая вариативность длины предложений');
    if (stats.ttr > 0.5)
        strengths.push('Разнообразный словарный запас');
    if (stats.hapaxRatio > 0.4)
        strengths.push('Много уникальных слов');
    if (aiIssues.length === 0)
        strengths.push('AI-паттерны не обнаружены');
    if (allSources.length === 0)
        strengths.push('Совпадений в открытых источниках не найдено');
    if (stats.paragraphVariance > 5)
        strengths.push('Хорошая структурная вариативность');
    if (strengths.length === 0)
        strengths.push('Текст содержит структурированный аргумент');
    // 7. Build recommendations
    const recommendations = [];
    if (aiIssues.length > 5)
        recommendations.push('Перефразируйте типичные AI-конструкции своими словами');
    if (stats.burstiness < 0.3)
        recommendations.push('Чередуйте короткие и длинные предложения');
    if (stats.ttr < 0.4)
        recommendations.push('Используйте больше синонимов');
    if (allSources.length > 3)
        recommendations.push('Перефразируйте участки, совпадающие с источниками');
    if (stats.sentenceStdDev < 4)
        recommendations.push('Добавьте больше разнообразия в длину предложений');
    if (recommendations.length === 0)
        recommendations.push('Текст выглядит хорошо, мелкие правки повысят уникальность');
    // 8. Build summary
    const summaryParts = [];
    if (uniquenessScore >= 85)
        summaryParts.push('Высокая уникальность текста.');
    else if (uniquenessScore >= 65)
        summaryParts.push('Умеренная уникальность — рекомендуется доработка.');
    else
        summaryParts.push('Низкая уникальность — необходима серьёзная переработка.');
    if (aiScore < 30)
        summaryParts.push('Низкая вероятность AI-генерации.');
    else if (aiScore < 60)
        summaryParts.push('Средняя вероятность AI-генерации.');
    else
        summaryParts.push('Высокая вероятность AI-генерации — рекомендуется гуманизация.');
    if (allSources.length > 0)
        summaryParts.push(`Найдено ${allSources.length} потенциальных источников.`);
    const result = {
        uniquenessScore,
        aiProbability: aiScore,
        sourcesFound: allSources.length,
        sources: allSources.slice(0, 10), // Limit to top 10
        analysis: {
            issues: [...plagiarismIssues, ...aiIssues].slice(0, 20),
            strengths,
            summary: summaryParts.join(' '),
        },
        recommendations,
        wordCount: stats.wordCount,
        characterCount: stats.characterCount,
        sentenceCount: stats.sentenceCount,
        metrics: {
            exactMatchPercent: Math.round(plagiarismScore * 0.6),
            paraphraseMatchPercent: Math.round(plagiarismScore * 0.4),
            citationCoverage: Math.min(100, Math.round((text.match(/\[\d+\]|\(\w+,\s*\d{4}\)/g)?.length || 0) * 10)),
            vocabularyRichness: Math.round(stats.ttr * 100),
            burstiness: Math.round(stats.burstiness * 100) / 100,
            perplexity: Math.round(stats.perplexity * 100) / 100,
        },
    };
    logger_1.logger.info(`[Plagiarism] Check complete: uniqueness=${uniquenessScore}%, AI=${aiScore}%, sources=${allSources.length}`);
    return result;
}
// ================== SCORING ==================
function calculateAIScore(issues, stats) {
    let score = 0;
    // Pattern-based scoring (max 50 points)
    const patternWeight = issues.reduce((sum, issue) => {
        return sum + (issue.severity === 'high' ? 6 : issue.severity === 'medium' ? 3 : 1);
    }, 0);
    score += Math.min(50, patternWeight * 2);
    // Statistical scoring (max 50 points)
    // Low burstiness = likely AI
    if (stats.burstiness < 0.2)
        score += 15;
    else if (stats.burstiness < 0.35)
        score += 8;
    else if (stats.burstiness < 0.45)
        score += 3;
    // Low TTR = limited vocabulary = likely AI
    if (stats.ttr < 0.35)
        score += 10;
    else if (stats.ttr < 0.45)
        score += 5;
    // Low hapax ratio = repetitive word use = likely AI
    if (stats.hapaxRatio < 0.3)
        score += 10;
    else if (stats.hapaxRatio < 0.4)
        score += 5;
    // Low paragraph variance = uniform structure = likely AI
    if (stats.paragraphVariance < 3)
        score += 8;
    else if (stats.paragraphVariance < 5)
        score += 4;
    // Low perplexity = predictable = likely AI
    if (stats.perplexity < 5)
        score += 7;
    else if (stats.perplexity < 10)
        score += 3;
    return Math.min(100, Math.max(0, score));
}
function calculatePlagiarismScore(sources, wordCount) {
    if (sources.length === 0)
        return 0;
    // Average similarity of found sources, weighted by count
    const avgSimilarity = sources.reduce((sum, s) => sum + s.similarity, 0) / sources.length;
    const sourceFactor = Math.min(1, sources.length / 5); // More sources = higher score
    return Math.round(avgSimilarity * sourceFactor * 0.8); // Cap effective score
}
function deduplicateSources(sources) {
    const seen = new Set();
    return sources
        .sort((a, b) => b.similarity - a.similarity)
        .filter(s => {
        const key = s.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
//# sourceMappingURL=plagiarism.service.js.map