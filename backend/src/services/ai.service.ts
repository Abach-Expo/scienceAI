import OpenAI from 'openai';
import { logger } from '../utils/logger';
import type { AnthropicModule, AnthropicClient } from '../types/anthropic.types';

// Динамический импорт Anthropic SDK
let Anthropic: AnthropicModule | undefined;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  logger.warn('Anthropic SDK not installed. Claude models will fallback to GPT-4o. Install with: npm i @anthropic-ai/sdk');
}

// Модельный роутинг: Claude Sonnet 4 (тексты) + GPT-4o (анализ) + GPT-4o-mini (чат)
const MODEL_ROUTING = {
  // Генерация текстов → Claude Sonnet 4 (пишет более «человечно»)
  text_generation: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  essay: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  coursework: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  referat: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  dissertation: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  article: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  style_improvement: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  // Анализ → GPT-4o
  analysis: { provider: 'openai', model: 'gpt-4o' },
  presentation: { provider: 'openai', model: 'gpt-4o' },
  outline: { provider: 'openai', model: 'gpt-4o' },
  self_review: { provider: 'openai', model: 'gpt-4o' },
  // Быстрые задачи → GPT-4o-mini
  chat: { provider: 'openai', model: 'gpt-4o-mini' },
  plagiarism: { provider: 'openai', model: 'gpt-4o-mini' },
} as const;

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

// ==================== HUMANIZATION ENGINE ====================
// Промпт-инструкции для обхода AI-детекторов (GPTZero, Turnitin, Originality.ai)
// Цель: 94%+ человечности

const HUMANIZATION_RULES = `
CRITICAL WRITING RULES — You MUST follow ALL of these to pass AI detection (GPTZero, Turnitin, Originality.ai, Антиплагиат).
HOW AI DETECTORS WORK: They measure (1) perplexity — how predictable each next word is, (2) burstiness — how uniform sentence lengths are, (3) stylometric patterns — repetitive transitions, balanced paragraphs, formulaic structure. Your goal: HIGH perplexity, HIGH burstiness, LOW pattern repetition.

=== BURSTINESS (sentence length variation) — MOST IMPORTANT ===
- Create EXTREME variation in sentence length. This is what detectors measure most.
- Pattern example: "The results were striking. Only 23% of first-year students who used the AI tutoring system dropped out, compared to the institutional average of 41% — a gap that persists even after controlling for prior academic performance, socioeconomic background, and declared major." Then: "Nobody expected that." Then a 15-word sentence. Then a 30-word one.
- Include at least 5 very short sentences per 1000 words (3-7 words each): "This matters.", "The numbers are clear.", "Not everyone agrees.", "It worked.", "The gap persists."
- Include at least 3 long complex sentences per 1000 words (30-50 words) with embedded clauses, parentheticals, and qualifying phrases — the kind a real researcher writes when working through a difficult idea, circling back, adding caveats, and finally arriving at the point
- NEVER write three consecutive sentences of similar length — this is the #1 AI detection signal
- Target: standard deviation of sentence length > 14 words
- Some sentences can be fragments: "A surprising result." or "Exactly the opposite."

=== PERPLEXITY (word unpredictability) — CRITICAL ===
- Avoid the most predictable next word. If you'd normally write "important", try "consequential" or "non-trivial" or "worth taking seriously"
- Mix registers: formal academic phrases next to slightly casual ones
- Use unexpected but accurate word choices — "the numbers paint a sobering picture" instead of "the data shows"
- Use varied transitions (rotate, NEVER repeat): "Granted,", "To put it differently,", "Here's the thing:", "That said,", "Fair enough, but", "Come to think of it,", "On closer look,", "Be that as it may,"
- Replace common verbs with less predictable BUT accurate alternatives: instead of "shows" → "suggests", "hints at", "makes the case for", "points toward", "lends weight to"
- Avoid overusing: "significant" (use "sizeable", "notable", "non-trivial"), "crucial" (use "central", "pressing", "hard to ignore"), "demonstrate" (rotate with "show", "reveal", "suggest", "point to")
- NOT every sentence needs high perplexity — mix 60% normal with 40% unexpected word choices. Overdoing it sounds unnatural too.

=== AUTHORIAL PERSONALITY — ESSENTIAL ===
- Write with clear opinions: "We find this argument unconvincing because..."
- Show real thinking process: "At first glance, this seems straightforward. It isn't."
- Express genuine uncertainty: "We're not entirely sure what to make of this finding"
- Use first person plural naturally: "we observed", "in our view", "we would argue"
- Include 3-5 parenthetical asides per essay (like this brief tangent — which a real writer would include because the thought just occurred to them)
- Occasionally self-correct: "This looks like a clear trend — though on reflection, the 2019 data complicate the picture"
- Reference your own earlier points: "as we noted above", "returning to the question we raised in the Introduction"
- Show intellectual preferences: favor certain methods, express skepticism toward others

=== SENTENCE SYNTAX VARIETY — CRITICAL FOR DETECTION ===
Detectors flag repetitive syntactic patterns. Rotate ALL of these starter types:
- Subject-first: "The results confirm..."
- Adverbial opener: "Surprisingly, the correlation..."
- Temporal clause: "After controlling for income, we found..."
- Concessive: "While the evidence is limited, it does suggest..."
- Participial: "Drawing on three decades of data, the authors argue..."
- Inverted: "Equally striking is the gap between..."
- Rhetorical question: "But does this pattern hold across regions?"
- Fragment/one-word: "Exactly. That is the problem."
- Conjunction start: "And yet the funding data tell a different story."
- Quotation/citation: "As Левада noted in 2018, 'these numbers resist easy interpretation.'"
NEVER use the same syntactic pattern for 3+ consecutive sentences.

=== NATURAL IMPERFECTIONS ===
- Start 5-7 sentences with "And" or "But" — real academics do this constantly in Discussion sections
- Use 5-8 em dashes (—) throughout for interrupting thoughts and asides
- Include 2-4 one-sentence paragraphs for emphasis at key turning points
- Use occasional contractions: "doesn't", "can't", "it's", "won't" (in Discussion and Conclusion only)
- Vary formality by section: Introduction = formal, Literature review = measured, Discussion = slightly conversational, Conclusion = reflective
- Occasionally over-explain something obvious (humans do this when they care about a point)
- Leave one idea slightly underdeveloped — perfection is suspicious
- Use "we" and "one" inconsistently — switch between them as humans naturally do

=== PARAGRAPH STRUCTURE ===
- Vary wildly: some paragraphs 1 sentence, some 2-3, some 6-8 sentences
- NEVER start two consecutive paragraphs the same way — not with the same word, not even the same part of speech
- Alternate starting methods: data point, rhetorical question, strong claim, concession, historical note, counter-example, quotation
- Some paragraphs should start with the conclusion, then explain why
- Some paragraphs should meander — make a point, qualify it, add an example, circle back
- DO NOT make every paragraph the same length. Real papers have very erratic paragraph sizes.
- One or two paragraphs can be notably long (8-10 sentences) — humans get carried away sometimes

=== EVIDENCE & SPECIFICITY ===
- Name real universities, countries, researchers with years — dramatically increases human-likeness
- Use specific numbers with imprecision: "roughly 67%", "a 23-point gap", "across 14 countries", "some 340 respondents"
- Mix citation styles: "Smith (2023) found...", "according to a 2024 UNESCO report", "one widely cited meta-analysis (Lee et al., 2021, N=12,400)"
- Include methodological caveats: "though the sample skewed toward urban institutions", "the authors acknowledge selection bias"
- Do NOT over-cite — real papers cite strategically, not every sentence
- Occasionally mention a study's limitation or a conflicting result without resolving it

=== SECTION QUALITY VARIATION (anti-detection) ===
Real human papers are NOT uniformly excellent. Mimic this:
- Introduction = most polished section
- Literature Review = slightly dry or dense in places
- Methods = precise but matter-of-fact
- Discussion = most "alive" — opinions, speculation, energy
- Conclusion = can be slightly rushed (common in real papers)
- One section should be noticeably more engaging than the others

=== METALANGUAGE AND SELF-REFERENCE ===
Real writers reference their own text (use 3-4 per paper):
- "As we argued in Section 2..."
- "We return to this point below"
- "The question is worth asking, even if our data cannot fully answer it"
- "Before proceeding, we should clarify terminology"
These phrases dramatically increase human-likeness scores.

=== ANTI-REPETITION (CRITICAL — AI DETECTORS CHECK THIS) ===
- NEVER repeat the same exclamation/emotional word more than ONCE in the entire text
  Bad: "Поразительно! ... Поразительно! ... Поразительно!" — instant AI flag
  Good: use DIFFERENT expressions each time: "Поразительно", "Удивительно", "Неожиданно", "Примечательно"
- NEVER use the same introductory word/phrase more than TWICE in the entire text
- Each thesis/argument must be formulated FRESHLY — don't repeat syntax + vocabulary from previous paragraphs
- Vary your rhetorical toolkit: question → data → concession → example → analogy — never repeat the same device in consecutive paragraphs

=== ARGUMENT SPECIFICITY (MANDATORY) ===
- EVERY claim must contain at least one SPECIFIC piece of evidence:
  — numbers (%, $, years, quantities, indices)
  — researcher names with publication year
  — university/organization names
  — geographic references
- BANNED empty generalizations: "studies show" (WHICH?), "experts believe" (WHO SPECIFICALLY?), "many scholars" (NAME THEM!)
- Bad: "Research shows this is important"
- Good: "A Harvard Business School study (Porter, 2019, N=450) found a 34% increase..."

=== CONCLUSION QUALITY ===
- NEVER write naive optimistic conclusions: "The future is bright", "Without doubt, progress will continue"
- Good conclusions: empirical summary + acknowledged limitations + open question
- Example: "The 2018-2024 data suggest the trend is robust. However, our sample doesn't cover developing economies — a significant limitation."

ABSOLUTELY BANNED WORDS/PHRASES (use any of these = instant AI detection):
"Furthermore" | "Moreover" | "Additionally" | "In conclusion" | "It is worth noting" |
"plays a crucial/pivotal role" | "In today's world" | "In today's rapidly evolving" |
"sheds light on" | "paves the way" | "delve into" | "holistic" | "multifaceted" |
"paradigm shift" | "tapestry" | "landscape" (metaphorical) | "bolster" | "underscore" |
"leverage" (verb) | "spearhead" | "robust" (non-statistical) | "a myriad of" |
"in the realm of" | "it is evident that" | "it is important to note" |
"This highlights the importance" | "comprehensive overview" | "It should be noted" |
"commendable" | "meticulous" | "intricate" | "pivotal" | "groundbreaking" |
"nuanced" (overuse) | "foster" (verb) | "utilize" (use "use") | "facilitate" |
"It is imperative" | "underscores the need" | "highlights the fact"

BANNED RUSSIAN AI-MARKER PHRASES (use any = мгновенное распознавание):
"Следует отметить, что" | "Важно подчеркнуть" | "Необходимо отметить" |
"В современном мире" | "В настоящее время" (at start of paragraph) |
"играет ключевую/важную роль" | "Таким образом," (more than once) |
"является неотъемлемой частью" | "проливает свет на" | "открывает новые горизонты" |
"в контексте данного исследования" | "Данное исследование направлено" |
"представляет собой" (overuse) | "обусловлено тем, что" (overuse) |
"всё большую актуальность" | "не вызывает сомнений" |
"на сегодняшний день" | "данный подход" | "ряд факторов" | "ряд авторов" |
"целый ряд" | "вышеперечисленные" | "вышеизложенное" | "нижеследующие" |
"в рамках данной работы" | "в ходе исследования было выявлено" |
"аспект" (overuse) | "целесообразно" | "вышеупомянутый" |
"свидетельствует о том, что" (overuse) | "позволяет сделать вывод" |
"обуславливает необходимость" | "совокупность факторов" | "комплексный подход" (overuse) |
"кардинально влияет/меняет" | "фундаментальные особенности/изменения" |
"Нельзя не признать" | "парадокс налицо" | "извечный спор/вопрос" |
"зеркально отражают" (тавтология) | "всё стремительно меняется" |
"неотъемлемая часть" | "на стыке" | "формирует уникальный" |
"является актуальным/ключевым" | "однако нельзя" | "бесспорно" |
"несомненно" | "общепризнано" | "тем не менее" (more than once) |
"актуальность темы обусловлена" | "целью данной статьи является" |
"проведённый анализ показал" | "полученные результаты могут быть использованы"

BANNED EXAMPLES (instant AI detection — these are used by 99% of AI generations):
NEVER use: Uber, Airbnb, Amazon, Tesla, Apple, Google, Netflix, SpaceX, Facebook/Meta
Instead use lesser-known but relevant examples: Mondragon (cooperatives), Grameen Bank (microfinance),
M-Pesa (mobile money, Kenya), Haier (Chinese management), Natura (Brazilian sustainability),
Tata Group (India), Amul (dairy cooperatives), UBI experiment Finland 2017-2018,
Bolsa Família (Brazil), kibbutzim (Israel)

BANNED SENSATIONAL AI-EPITHETS (real researchers write with restraint):
"шокирующий" → "неожиданный" | "обескураживающий" → "неутешительный" |
"колоссальный" → "значительный" | "грандиозный" → "масштабный" |
"потрясающий" → "впечатляющий" | "ошеломляющий" → "неожиданный" |
"сенсационный" → "примечательный" | "поразительный" → "любопытный" |
"shocking" → "unexpected" | "groundbreaking" → "original" | "mind-blowing" → "notable"
AI loves sensational epithets. Real researchers write with restraint.

BANNED NUMBERED LISTS IN CONCLUSIONS:
- NEVER write "Первое... Второе... Третье... Четвёртое... И последнее" — this is an AI pattern
- Instead, WEAVE proposals into the text organically using varied connectors
- If you must list, max 3 items and format as part of flowing prose
- Final sentence of the text MUST be either an open question or a thought-provoking statement, NEVER an assertion

RUSSIAN-SPECIFIC NATURAL WRITING TECHNIQUES (when writing in Russian):
- Mix short sentences (3-7 words) with long ones (30-50 words) — Russian expects longer sentences than English
- Use разговорные вставки sparingly but consistently: "если угодно", "к слову", "правда", "скажем", "собственно говоря", "по крайней мере"
- Vary paragraph openings: данные, вопрос, уступка, цитата, исторический контекст, контраргумент
- Use real Russian researchers, institutions, journals: НИУ ВШЭ, МГУ, МГИМО, РАН, РГПУ, СПбГУ; "Вопросы образования", "Социологические исследования", "Вопросы философии", "Вестник МГУ"
- Natural particles: "ведь", "же", "всё-таки", "впрочем", "пожалуй", "по-видимому", "по всей видимости", "надо полагать"
- Dash constructions: "Результат — неожиданный" instead of "Результат был неожиданным"
- Use безличные конструкции naturally: "представляется, что", "нельзя не учитывать"
- Mix номинативный стиль with verbal constructions — don't overuse отглагольные существительные
- Двоеточие для объяснения: "Причина проста: данные за 2020 год оказались неполными"
- Vary вводные слова: "очевидно", "безусловно", "по-видимому", "вероятно", "по существу"
- AVOID калькирование с английского — write idiomatic Russian

=== SCIENTIFIC ARTICLE SPECIFIC (for journal publications ВАК, Scopus, РИНЦ) ===
Scientific articles require EXTRA human-likeness because journal reviewers and anti-plagiarism systems are very sophisticated.

ARTICLE-SPECIFIC TECHNIQUES:
- Abstract must be exactly 200-250 words. Include: problem, gap, method, main result, implication.
- Introduction: Start with a real-world problem, not "в современном мире". Example: "В 2023 году 47% выпускников технических вузов не смогли найти работу по специальности..."
- Literature Review: Create DIALOGUE between authors. "Иванов [3] считает X, однако Петрова [5] убедительно показала, что Y. Мы склонны согласиться со вторым подходом, хотя..."
- Methods: Be SPECIFIC. "Выборка составила 234 респондента (52% женщин, M_возраст = 29.4, SD = 7.2). Опрос проводился в марте-мае 2024 г."
- Results: Present data FIRST, interpret SECOND. Use tables (describe them verbally). Include confidence intervals and p-values.
- Discussion: Compare with other studies, explain discrepancies, acknowledge limitations honestly: "Признаем, выборка не позволяет..."
- Conclusion: Be modest. "Полученные результаты позволяют предположить...", not "Мы доказали, что..."

ARTICLE HUMAN-LIKE PHRASES (use 5-10 per article):
- "Признаем, этот вопрос непрост..."
- "Результаты, скажем прямо, оказались неожиданными..."
- "Здесь следует сделать оговорку..."
- "Справедливости ради отметим..."
- "Любопытно, что зарубежные коллеги [N] пришли к схожим выводам..."
- "Нельзя не упомянуть работу Н.Н. Ивановой [ref], которая ещё в 20XX г...."
- "Впрочем, есть и альтернативная трактовка..."
- "Возникает закономерный вопрос: а что если...?"
- "К слову, этот эффект наблюдался и в более ранних исследованиях [refs]"
- "На наш взгляд, причина кроется в..."
- "Заметим, что предыдущие работы [refs] игнорировали этот фактор..."
- "Оговоримся сразу: наши данные не позволяют сделать окончательных выводов о..."

ARTICLE BANNED PHRASES (instant AI detection in journals):
- "Актуальность темы обусловлена..." (start of Introduction)
- "Целью данной статьи является..." (formulaic)
- "В заключение следует отметить..." (robotic)
- "Проведённый анализ показал..." (vague)
- "Полученные результаты могут быть использованы..." (generic)
- "Перспективами дальнейших исследований являются..." (template)
`;

const getRandomWritingStyle = (): string => {
  const styles = [
    'Write as an experienced professor in their 40s who publishes actively and has strong opinions backed by evidence. You tend to use first-person plural and occasionally cite your own prior work. You favor long, complex sentences in your Literature Review but write punchier prose in the Discussion. You have a habit of starting paragraphs with data or specific examples.',
    'Write as a careful doctoral researcher who is thorough but occasionally shows uncertainty and intellectual honesty. You hedge with "perhaps", "arguably", and "the data suggest" rather than making absolute claims. Your writing gets more confident as you move from Introduction to Discussion — reflecting your growing command of the material.',
    'Write as a senior lecturer who combines academic rigor with accessible explanations and real-world examples. You love drawing parallels between theory and practice. You sometimes address the reader directly with "consider this:" or "notice that". Your paragraphs vary wildly in length — some are just one punchy sentence.',
    'Write as a postdoctoral researcher who is detail-oriented, data-driven, and somewhat critical of established theories. You back every claim with numbers and are not afraid to disagree with prominent scholars. You have a slightly dry wit that surfaces in parenthetical asides. You use dash-interrupted thoughts frequently.',
    'Write as a veteran researcher who has published 100+ papers and writes with quiet authority. You favor concise, precise language and occasionally make dry, cutting observations about the state of the field. Your Introduction is meticulously crafted. Your Conclusion sometimes feels slightly rushed — you\'re always running out of space.',
    'Write as a young but ambitious assistant professor who writes engagingly and cares deeply about methodological rigor. You use rhetorical questions strategically and like to surprise readers with unexpected evidence. You admire elegant research design and aren\'t shy about pointing out when someone else\'s methodology is weak.',
    'Write as a mid-career researcher who has moved between institutions and brings a comparative perspective to everything. You frequently reference work from different national contexts and are skeptical of universal claims. You write with measured authority and occasional self-deprecating humor in footnotes.',
    'Write as a meticulous senior researcher known for comprehensive reviews and careful argumentation. You build arguments brick by brick, occasionally pausing to acknowledge counterpoints before dismantling them. Your sentences vary dramatically — some are just three words, others unfold across 40+ words with multiple embedded clauses.',
  ];
  return styles[Math.floor(Math.random() * styles.length)];
};

export class AIService {
  private openai: OpenAI;
  private anthropic: AnthropicClient | null = null;
  private model: string;
  private fastModel: string;
  private claudeModel: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-init'
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.fastModel = process.env.OPENAI_FAST_MODEL || 'gpt-4o-mini';
    this.claudeModel = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

    // Инициализация Anthropic если SDK установлен и ключ есть
    if (Anthropic && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic.default({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      logger.info('Anthropic SDK initialized — Claude Sonnet 4 active for text generation');
    } else {
      logger.info('Anthropic not configured — using GPT-4o for all tasks');
    }
  }

  /**
   * Публичный метод генерации с модельным роутингом
   * Используется из /api/ai/generate для маршрутизации Claude/GPT
   */
  async generate(
    taskType: string,
    systemPrompt: string,
    userPrompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      presencePenalty?: number;
      frequencyPenalty?: number;
    } = {}
  ): Promise<{ content: string; model: string; provider: string }> {
    const routingKey = (taskType in MODEL_ROUTING ? taskType : 'chat') as keyof typeof MODEL_ROUTING;
    const routing = MODEL_ROUTING[routingKey];

    // Для текстовых задач — автоматически внедряем правила гуманизации
    const TEXT_TASKS = ['text_generation', 'essay', 'coursework', 'referat', 'dissertation', 'article', 'style_improvement'];
    let effectiveSystemPrompt = systemPrompt;
    let effectiveOptions = { ...options };

    if (TEXT_TASKS.includes(routingKey)) {
      const persona = getRandomWritingStyle();
      effectiveSystemPrompt = `${persona}\n\n${systemPrompt}\n\n${HUMANIZATION_RULES}`;
      // Повышаем параметры для максимальной «человечности»
      effectiveOptions.temperature = Math.max(effectiveOptions.temperature || 0.7, 0.92);
      effectiveOptions.presencePenalty = Math.max(effectiveOptions.presencePenalty || 0, 0.75);
      effectiveOptions.frequencyPenalty = Math.max(effectiveOptions.frequencyPenalty || 0, 0.55);
    }

    const content = await this.generateWithRouting(routingKey, effectiveSystemPrompt, userPrompt, effectiveOptions);

    // Для текстовых задач — пост-обработка + гуманизация
    if (TEXT_TASKS.includes(routingKey)) {
      const cleaned = this.postProcessHumanize(content);
      // Второй проход: только для длинных текстов (> 2000 символов)
      // Короткие тексты уже достаточно человечны с первого прохода
      if (cleaned.length > 2000) {
        try {
          const humanized = await this.singlePassHumanize(cleaned);
          return { content: humanized, model: routing.model, provider: routing.provider };
        } catch (err: unknown) {
          logger.warn(`Humanization pass failed, returning cleaned version: ${err instanceof Error ? err.message : 'Unknown error'}`);
          return { content: cleaned, model: routing.model, provider: routing.provider };
        }
      }
      return { content: cleaned, model: routing.model, provider: routing.provider };
    }

    return {
      content,
      model: routing.model,
      provider: routing.provider,
    };
  }

  /**
   * Одно-проходная гуманизация: отправляет ВЕСЬ текст одним вызовом
   * Быстрее чем чанковый подход, Claude может обработать до 100K токенов
   */
  async singlePassHumanize(text: string): Promise<string> {
    // Определяем язык текста по содержимому
    const isRussian = /[а-яёА-ЯЁ]/.test(text) && (text.match(/[а-яёА-ЯЁ]/g) || []).length > text.length * 0.3;

    const systemPrompt = `You are a veteran academic writer with 25 years of experience. Your task: completely rewrite the text so that NO AI detector (GPTZero, Turnitin, Originality.ai, Copyleaks, ZeroGPT) can flag it as machine-generated. Target: 95%+ human score on ALL detectors. Return the FULL text — never truncate.

HOW AI DETECTORS WORK (exploit these weaknesses):
- They measure PERPLEXITY (word predictability) — AI text has LOW perplexity (too predictable). You must RAISE it.
- They measure BURSTINESS (sentence length variation) — AI text has LOW burstiness (uniform lengths). You must CREATE dramatic variation.
- They check n-gram predictability — AI picks the statistically most likely next word. You must choose the 3rd or 4th most likely word sometimes.
- They detect structural patterns — AI uses parallel constructions, consistent paragraph openers, and formulaic transitions.

MANDATORY REWRITING RULES (apply ALL of them):

1. SENTENCE LENGTH — THE MOST IMPORTANT METRIC:
   - Create EXTREME variation: 3-6 word sentences next to 35-50 word sentences
   - Standard deviation of sentence length > 15 words
   - Include at least 3 very short sentences (under 6 words) per 500 words
   - Include at least 2 very long complex sentences (over 35 words) per 500 words
   - NEVER have 3 consecutive sentences within 5 words of each other in length

2. PERPLEXITY — SECOND MOST IMPORTANT:
   - In 40% of sentences, replace the most predictable word with an accurate but less common synonym
   - Use unexpected adjective-noun combinations: "a stubborn correlation", "tenuous consensus", "restless data"
   - Occasionally use domain-specific jargon, then a casual phrase in the next sentence
   - Break collocations: instead of "significant impact" → "measurable footprint", instead of "key findings" → "what surfaced"

3. SYNTACTIC FINGERPRINT DISRUPTION:
   - Rotate starters: subject-first, adverbial, temporal, concessive, participial, inverted, question, fragment, conjunction
   - NEVER begin 2+ consecutive sentences with the same word or part of speech
   - NEVER begin 2+ consecutive paragraphs the same way
   - Use 5-8 em dashes (—) for parenthetical asides
   - Start 4-6 sentences with "And", "But", or "Yet"
   - Include 2-3 rhetorical questions
   - Use 1-2 sentence fragments for emphasis. Like this one.

4. AUTHORIAL PRESENCE (critical for fooling detectors):
   - Add self-corrections: "though on second thought...", "or rather...", "to put it differently..."
   - Include genuine uncertainty: "the picture is muddier than it appears", "this is harder to pin down"
   - Add forward/backward references: "as we'll see shortly", "recall the earlier point about..."
   - Express measured opinions: "we find this line of reasoning unconvincing", "this strikes us as premature"
   - Include 1-2 mild hedges per paragraph: "arguably", "in a sense", "to some extent"

5. PARAGRAPH ARCHITECTURE:
   - Vary paragraph lengths dramatically: 1-2 sentences, then 5-7, then 3, then 1 (standalone)
   - Include 2-3 one-sentence paragraphs as emphasis moments
   - Discussion sections should feel looser, more reflective than literature review
   - Not all sections should be equally polished — this mimics real human writing

6. ANTI-PATTERN INJECTION:
   - NEVER use: "Furthermore", "Moreover", "Additionally", "It is worth noting", "plays a crucial/key/vital role", "In today's world", "holistic", "multifaceted", "paradigm shift", "delve", "leverage", "foster", "utilize", "facilitate", "comprehensive overview", "shed light on", "pave the way"
   - NEVER use the same transition word twice in the same section
   - Mix formal and slightly informal registers within the same section${isRussian ? `

7. РУССКИЙ СТИЛЬ (ОБЯЗАТЕЛЬНО ДЛЯ РУССКОЯЗЫЧНОГО ТЕКСТА):
   - Активно используй вводные слова: впрочем, пожалуй, по-видимому, скорее всего, думается, надо признать, к слову
   - Используй тире вместо глагольных связок: "Образование — процесс" вместо "Образование является процессом"
   - Добавляй частицы: ведь, же, всё-таки, -то, ли, уж, лишь, вот
   - Чередуй безличные и личные конструкции: "нами было установлено" → "мы обнаружили" → "обнаруживается, что"
   - Используй инверсию: "Особого внимания заслуживает..." вместо обычного порядка слов
   - Вставляй разговорные элементы в академический текст: "строго говоря", "грубо говоря", "попросту говоря"
   - ЗАПРЕЩЕНО категорически: "Следует отметить", "Необходимо подчеркнуть", "В современном мире", "играет ключевую/важную роль", "на сегодняшний день", "является неотъемлемой частью", "данный подход", "целый ряд", "вышеперечисленные", "в рамках данной работы", "целесообразно"
   - Добавляй субъективные оценки: "что, на наш взгляд, весьма показательно", "это настораживает", "результат нас удивил"` : ''}

OUTPUT RULES:
- Preserve ALL factual content, data, numbers, citations, section headings EXACTLY
- Total word count within ±5%
- Academic tone maintained — imperfections are subtle, not sloppy
- Output ONLY the rewritten text. No preamble, no commentary, no explanation.`;

    const userPrompt = `Rewrite for maximum human-likeness while preserving all content and structure:\n\n${text}`;

    const result = await this.generateWithRouting('text_generation', systemPrompt, userPrompt, {
      temperature: 0.95,
      maxTokens: Math.min(Math.ceil(text.length / 2.2), 64000),
      presencePenalty: 0.8,
      frequencyPenalty: 0.6,
    });

    if (result.length < text.length * 0.6) {
      logger.warn(`Humanization output too short (${result.length} vs ${text.length}), using original`);
      return text;
    }

    return this.postProcessHumanize(result);
  }

  /**
   * Пост-обработка: удаляет/заменяет оставшиеся AI-маркеры
   */
  postProcessHumanize(text: string): string {
    let result = text;

    // Замены AI-маркеров на естественные фразы
    const replacements: [RegExp, string[]][] = [
      [/\bFurthermore\b/g, ['Beyond this', 'What\'s more', 'Building on this point', 'There is another dimension here']],
      [/\bMoreover\b/g, ['On top of that', 'Equally important', 'Adding to this', 'Along similar lines']],
      [/\bAdditionally\b/g, ['Another angle worth noting', 'This connects to', 'There is also', 'Alongside this']],
      [/\bIn conclusion\b/gi, ['Taking stock', 'When we step back', 'Looking at the full picture', 'All things considered']],
      [/\bIt is worth noting that\b/gi, ['Notably,', 'One point stands out:', 'A key detail:']],
      [/\bIt is important to note that\b/gi, ['We should recognize that', 'A critical point here is that', 'One must acknowledge that']],
      [/\bplays? a (?:crucial|pivotal|vital|key|important) role\b/gi, ['matters significantly', 'carries real weight', 'has a measurable effect', 'makes a real difference']],
      [/\bIn today's (?:rapidly )?(?:evolving |changing )?(?:world|landscape|environment)\b/gi, ['In recent years', 'Over the past decade', 'As things stand now']],
      [/\bsheds? light on\b/gi, ['clarifies', 'helps explain', 'reveals something about']],
      [/\bpaves? the way for\b/gi, ['opens the door to', 'sets the stage for', 'creates conditions for']],
      [/\bholistic(?:\s+approach)?\b/gi, ['comprehensive', 'integrated', 'broad-based']],
      [/\bmultifaceted\b/gi, ['complex', 'many-sided', 'layered']],
      [/\bparadigm shift\b/gi, ['fundamental change', 'major rethinking', 'deep structural shift']],
      [/\btapestry\b/gi, ['web', 'network', 'mixture']],
      [/\blandscape\b/g, ['field', 'environment', 'area', 'sphere']],
      [/\bunderscores?\b/gi, ['highlights', 'reinforces', 'makes clear']],
      [/\bdelve(?:s|d)? into\b/gi, ['examines', 'explores', 'looks closely at']],
      [/\bleverage(?:s|d)?\b/gi, ['uses', 'draws on', 'takes advantage of']],
      [/\bbolster(?:s|ed)?\b/gi, ['supports', 'strengthens', 'backs up']],
      [/\bspearhead(?:s|ed)?\b/gi, ['leads', 'drives', 'pushes forward']],
      [/\brobust\b/gi, ['strong', 'solid', 'reliable']],
      [/\ba myriad of\b/gi, ['many', 'numerous', 'a wide range of']],
      [/\bin the realm of\b/gi, ['in', 'within', 'across']],
      [/\bit is evident that\b/gi, ['clearly,', 'the evidence shows that', 'we can see that']],
      [/\bThis highlights the importance of\b/gi, ['This shows how much', 'This points to the significance of', 'This makes clear the value of']],
      [/\bcomprehensive overview\b/gi, ['broad survey', 'wide-ranging look', 'thorough examination']],
      // New English AI markers
      [/\bIt should be noted that\b/gi, ['Worth mentioning:', 'One detail stands out:', 'We should flag that']],
      [/\bcommendable\b/gi, ['impressive', 'noteworthy', 'well-executed']],
      [/\bmeticulous(?:ly)?\b/gi, ['careful', 'thorough', 'painstaking']],
      [/\bintricate\b/gi, ['complex', 'detailed', 'involved']],
      [/\bgroundbreaking\b/gi, ['original', 'pioneering', 'first-of-its-kind']],
      [/\bfoster(?:s|ed|ing)?\b/gi, ['encourage', 'support', 'cultivate', 'nurture']],
      [/\butilize(?:s|d)?\b/gi, ['use', 'employ', 'apply', 'draw on']],
      [/\bfacilitate(?:s|d)?\b/gi, ['enable', 'help', 'make possible', 'support']],
      [/\bIt is imperative that\b/gi, ['We need to', 'It matters that', 'The urgency here is clear:']],
      [/\bunderscores the need\b/gi, ['makes the case for', 'points to a real need for', 'reinforces why we need']],
      [/\bhighlights the fact\b/gi, ['shows', 'brings attention to', 'makes visible']],
      [/\bin light of\b/gi, ['given', 'considering', 'taking into account']],
      [/\bnotwithstanding\b/gi, ['despite', 'even so', 'all the same']],
      [/\bnevertheless\b/g, ['still', 'even so', 'all the same', 'and yet']],
      [/\bNevertheless\b/g, ['Still,', 'Even so,', 'All the same,', 'And yet,']],
      // Russian AI markers — expanded set
      [/\bСледует отметить, что\b/g, ['Стоит обратить внимание на то, что', 'Здесь важно то, что', 'Примечательно, что']],
      [/\bВажно подчеркнуть\b/g, ['Особо стоит выделить', 'Нельзя обойти вниманием', 'Ключевой момент здесь']],
      [/\bНеобходимо отметить\b/g, ['Обращает на себя внимание', 'Заслуживает упоминания', 'Нелишним будет сказать']],
      [/\bВ современном мире\b/g, ['За последнее десятилетие', 'В текущих реалиях', 'Сегодня']],
      [/\bиграет (?:ключевую|важную|решающую) роль\b/g, ['имеет существенное значение', 'оказывает ощутимое влияние', 'заметно сказывается на']],
      [/\bявляется неотъемлемой частью\b/g, ['тесно связан с', 'органически входит в', 'составляет важный элемент']],
      [/\bоткрывает новые горизонты\b/g, ['создаёт дополнительные возможности', 'расширяет поле для', 'открывает пространство для']],
      [/\bвсё большую актуальность\b/g, ['растущий интерес', 'возрастающее внимание', 'новую значимость']],
      [/\bне вызывает сомнений\b/g, ['достаточно очевидно', 'подтверждается данными', 'мало кто оспаривает']],
      // New Russian AI markers
      [/\bна сегодняшний день\b/g, ['сегодня', 'к настоящему моменту', 'на данный момент']],
      [/\bданный подход\b/g, ['этот подход', 'такой подход', 'описанный подход']],
      [/\bряд факторов\b/g, ['несколько факторов', 'группа факторов', 'совокупность обстоятельств']],
      [/\bряд авторов\b/g, ['несколько исследователей', 'ряд учёных', 'отдельные специалисты']],
      [/\bцелый ряд\b/g, ['множество', 'довольно много', 'немало']],
      [/\bвышеперечисленн(?:ые|ых|ым)\b/g, ['перечисленные выше', 'названные', 'упомянутые']],
      [/\bвышеизложенно(?:е|го)\b/g, ['сказанное выше', 'изложенное ранее', 'то, о чём шла речь']],
      [/\bв рамках данной работы\b/g, ['в этой работе', 'здесь', 'в настоящем исследовании']],
      [/\bв ходе исследования было выявлено\b/g, ['исследование показало', 'мы обнаружили', 'данные указали на то']],
      [/\bцелесообразно\b/g, ['имеет смысл', 'стоит', 'разумно']],
      [/\bобуславливает необходимость\b/g, ['делает необходимым', 'требует', 'вынуждает обратить внимание на']],
      [/\bпозволяет сделать вывод\b/g, ['приводит к выводу', 'наводит на мысль', 'даёт основания полагать']],
      [/\bсовокупность факторов\b/g, ['сочетание обстоятельств', 'комбинация факторов', 'группа причин']],
      [/\bпроливает свет на\b/g, ['помогает понять', 'раскрывает', 'даёт представление о']],
      [/\bВ настоящее время\b/g, ['Сейчас', 'Сегодня', 'К настоящему моменту']],
      [/\bсвидетельствует о том, что\b/g, ['указывает на то, что', 'говорит о том, что', 'наводит на мысль о том, что']],
      // === NEW: Дополнительные русские AI-маркеры (2025) ===
      [/\bкардинально (?:влияет|меняет|изменяет|преобразует)\b/g, ['ощутимо сказывается', 'заметно перестраивает', 'серьёзно воздействует на']],
      [/\bфундаментальн(?:ые|ых|ыми?) (?:особенности|изменения|различия|основы|принципы)\b/g, ['глубинные сдвиги', 'базовые черты', 'коренные различия']],
      [/\bНельзя не признать\b/g, ['Стоит признать', 'Приходится согласиться', 'Надо признать']],
      [/\bпарадокс налицо\b/g, ['ситуация парадоксальна', 'здесь обнаруживается противоречие', 'это вызывает вопросы']],
      [/\bизвечн(?:ый|ая|ое|ые) (?:спор|вопрос|проблема|дилемма)\b/g, ['давний спор', 'этот вопрос стоит давно', 'вопрос с длинной историей']],
      [/\bзеркально отражa?(?:ют|ет|ется)\b/g, ['точно воспроизводят', 'повторяют', 'дублируют']],
      [/\bвсё стремительно меняется\b/g, ['темпы изменений ускорились', 'сфера трансформируется', 'динамика усилилась']],
      [/\bнеотъемлем(?:ая|ой|ую) част(?:ь|ью|и)\b/g, ['важный элемент', 'составная часть', 'значимый компонент']],
      [/\bна стыке\b/g, ['в пересечении', 'между', 'на пересечении']],
      [/\bформирует уникальн(?:ый|ую|ое)\b/g, ['определяет характерный', 'создаёт особый', 'выстраивает специфический']],
      [/\bявляется (?:актуальным|ключевым|важным|значимым)\b/g, ['важен', 'имеет значение', 'представляет интерес']],
      [/\bкомплексн(?:ый|ого|ому) подход(?:а|у|ом)?\b/g, ['многосторонний анализ', 'развёрнутый подход', 'всесторонний взгляд']],
      [/\bоднако нельзя\b/g, ['впрочем, не стоит', 'при этом трудно', 'и всё же сложно']],
      [/\bоткрывает (?:новые |широкие )?(?:горизонты|перспективы|возможности)\b/g, ['расширяет поле для', 'создаёт пространство для', 'даёт новые шансы']],
      [/\bвсе? (?:более|больше) (?:актуальн|востребован|популяр)\w+\b/g, ['набирает вес', 'привлекает внимание', 'растёт интерес к']],
      [/\bтем не менее\b/g, ['и всё же', 'впрочем', 'при этом']],
      [/\bТем не менее\b/g, ['И всё же', 'Впрочем,', 'При этом']],
      [/\bбесспорн(?:о|ый|ая|ое)\b/g, ['очевидно', 'едва ли кто оспорит', 'трудно отрицать']],
      [/\bнесомненно\b/g, ['скорее всего', 'по-видимому', 'похоже']],
      [/\bНесомненно\b/g, ['Скорее всего,', 'По-видимому,', 'Похоже,']],
      [/\bобщепризнан(?:о|ый|ая|ое)\b/g, ['широко принято', 'считается доказанным', 'мало кто оспаривает']],
      [/\bвышеупомянут(?:ый|ая|ое|ые|ых)\b/g, ['упомянутый ранее', 'описанный выше', 'названный']],
      [/\bнижеследующи(?:е|х|й|м)\b/g, ['следующие', 'приведённые далее', 'перечисленные ниже']],
      [/\bактуальность (?:темы )?обусловлена\b/g, ['тема привлекает внимание потому, что', 'интерес к теме вызван', 'тема стала заметной из-за']],
      [/\bцелью данной (?:статьи|работы) является\b/g, ['мы ставим целью', 'работа нацелена на', 'здесь мы стремимся']],
      [/\bпроведённый анализ показал\b/g, ['анализ указал на', 'мы обнаружили', 'данные свидетельствуют']],
      [/\bполученные результаты могут быть использованы\b/g, ['результаты применимы к', 'эти данные полезны для', 'на основе результатов можно']],
      // === NEW: Сенсационные AI-эпитеты ===
      [/\bшокирующ(?:ий|ая|ое|ие|их|им)\b/g, ['неожиданный', 'непредвиденный', 'нетипичный']],
      [/\bобескураживающ(?:ий|ая|ое|ие|их|им)\b/g, ['неутешительный', 'тревожный', 'вызывающий вопросы']],
      [/\bколоссальн(?:ый|ая|ое|ые|ых|ым)\b/g, ['значительный', 'заметный', 'существенный']],
      [/\bграндиозн(?:ый|ая|ое|ые|ых|ым)\b/g, ['масштабный', 'крупный', 'внушительный']],
      [/\bпотрясающ(?:ий|ая|ое|ие|их|им)\b/g, ['впечатляющий', 'примечательный', 'заслуживающий внимания']],
      [/\bошеломляющ(?:ий|ая|ое|ие|их|им)\b/g, ['неожиданный', 'непривычный', 'выбивающий из колеи']],
      [/\bсенсационн(?:ый|ая|ое|ые|ых|ым)\b/g, ['примечательный', 'нетривиальный', 'неординарный']],
      [/\bпоразительн(?:ый|ая|ое|ые|о)\b/g, ['любопытный', 'неожиданный', 'нетривиальный']],
    ];

    for (const [pattern, alternatives] of replacements) {
      let matchIndex = 0;
      result = result.replace(pattern, () => {
        const replacement = alternatives[matchIndex % alternatives.length];
        matchIndex++;
        return replacement;
      });
    }

    return result;
  }

  /**
   * Универсальный метод генерации через Claude или OpenAI
   * Claude используется для текстов, OpenAI для анализа и чата
   */
  private async generateWithRouting(
    taskType: keyof typeof MODEL_ROUTING,
    systemPrompt: string,
    userPrompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
      presencePenalty?: number;
      frequencyPenalty?: number;
    } = {}
  ): Promise<string> {
    const routing = MODEL_ROUTING[taskType] || MODEL_ROUTING.chat;
    const { temperature = 0.7, maxTokens = 4000, jsonMode = false, presencePenalty, frequencyPenalty } = options;

    // Используем Claude если настроен и задача текстовая
    if (routing.provider === 'anthropic' && this.anthropic) {
      try {
        const response = await this.anthropic.messages.create({
          model: this.claudeModel,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });

        const content = response.content[0]?.text;
        if (!content) throw new Error('No content from Claude');
        return content;
      } catch (error: unknown) {
        logger.warn(`Claude error, falling back to GPT-4o: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Фолбэк на OpenAI
      }
    }

    // OpenAI (основной или фолбэк)
    const model = routing.provider === 'anthropic' ? this.model : routing.model;
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
      temperature,
      max_tokens: maxTokens,
      ...(presencePenalty !== undefined ? { presence_penalty: presencePenalty } : {}),
      ...(frequencyPenalty !== undefined ? { frequency_penalty: frequencyPenalty } : {}),
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');
    return content;
  }

  async generateOutline(
    topic: string,
    projectType: string,
    additionalContext?: string
  ): Promise<OutlineSection[]> {
    const systemPrompt = `You are an expert academic writing assistant specializing in ${projectType.toLowerCase()} writing.
    Generate a well-structured outline for academic research that avoids cookie-cutter structures.
    
    Your outline should include:
    1. Clear main sections with descriptive, specific titles (avoid generic "Literature Review" — make it topic-specific)
    2. Subsections where appropriate with varying depth (some sections have 2 subsections, others 4)
    3. Brief descriptions of what each section should cover, including specific angles and arguments
    4. Estimated word count for each section (vary these — not all sections should be equal length)
    5. If the topic is in Russian, use Russian section titles AND follow ГОСТ standards for the document type:
       - Диссертация: Введение (актуальность, цель, задачи, объект, предмет, гипотеза, методы, научная новизна, практическая значимость), Глава 1 (теория), Глава 2 (методология), Глава 3 (результаты), Заключение, Список литературы, Приложения
       - Курсовая: Введение, 2 главы (теория + практика), Заключение, Список использованных источников
       - Реферат: Введение, 2-3 раздела, Заключение, Список литературы
    6. Include realistic scope for each section based on the document type
    
    Make the structure feel organic and tailored to the topic, not template-based.
    Format your response as JSON array of sections.`;

    const userPrompt = `Create a detailed outline for a ${projectType.toLowerCase()} on the following topic:

Topic: ${topic}
${additionalContext ? `\nAdditional Context: ${additionalContext}` : ''}

Provide a comprehensive academic structure with all necessary sections including:
- Abstract
- Introduction with research questions
- Literature Review
- Methodology
- Results/Analysis
- Discussion
- Conclusion
- References section note

Return as JSON array with structure: [{ "title": string, "description": string, "subsections": [], "estimatedWords": number }]`;

    try {
      const content = await this.generateWithRouting('outline', systemPrompt, userPrompt, {
        temperature: 0.7,
        maxTokens: 4000,
        jsonMode: true,
      });

      const parsed = JSON.parse(content);
      return parsed.sections || parsed;
    } catch (error) {
      logger.error('Error generating outline:', error);
      throw error;
    }
  }

  async generateArguments(
    topic: string,
    outline?: OutlineSection[],
    researchQuestions?: string[]
  ): Promise<Record<string, unknown>> {
    const systemPrompt = `You are an expert academic researcher. Generate strong, evidence-based arguments and thesis statements.
    
    Use chain-of-thought reasoning to:
    1. Analyze the research topic
    2. Identify key arguments and counter-arguments
    3. Formulate clear thesis statements
    4. Suggest supporting evidence and sources`;

    const userPrompt = `Generate thesis statements, key arguments, and research directions for:

Topic: ${topic}
${outline ? `\nOutline: ${JSON.stringify(outline, null, 2)}` : ''}
${researchQuestions ? `\nResearch Questions: ${researchQuestions.join('\n')}` : ''}

Provide:
1. Main thesis statement
2. 3-5 supporting arguments with evidence suggestions
3. Potential counter-arguments and rebuttals
4. Recommended research directions
5. Key concepts to explore

Return as structured JSON.`;

    try {
      const content = await this.generateWithRouting('text_generation', systemPrompt, userPrompt, {
        temperature: 0.7,
        maxTokens: 4000,
        jsonMode: true,
      });

      return JSON.parse(content);
    } catch (error) {
      logger.error('Error generating arguments:', error);
      throw error;
    }
  }

  async generateDraft(
    title: string,
    outline: OutlineSection[],
    specificSection?: string,
    references?: Array<{ title?: string; url?: string; authors?: string[]; year?: string }>,
    customInstructions?: string,
    targetWords?: number
  ): Promise<GeneratedDraft> {
    const wordRequirement = targetWords 
      ? `\n\nVOLUME REQUIREMENT: You must write at least ${targetWords} words (approximately ${Math.round(targetWords / 280)} pages of text). Do not summarize. Be thorough, detailed, and expansive. Every section must be developed in depth with examples, data, and analysis.`
      : '';

    const writingPersona = getRandomWritingStyle();

    const systemPrompt = `${writingPersona}

You are writing an academic paper. Your text must read as if written by a real human researcher — not by AI.

${HUMANIZATION_RULES}

ADDITIONAL ACADEMIC GUIDELINES:
- Write flowing prose, not bullet-point lists
- Every claim must be supported by reasoning, evidence, or a citation
- Include proper in-text citations. For Russian-language papers: use ГОСТ Р 7.0.5-2008 format [Фамилия, Год, с. XX]. For English papers: use APA format (Author, Year)
- When no specific reference is given, create realistic-sounding citations from plausible researchers and journals in the appropriate language
- Use section headings and subheadings as given in the outline
- Write a proper Abstract/Аннотация (150-250 words), Introduction/Введение, and Conclusion/Заключение
- The Conclusion should NOT simply repeat the Introduction — it should synthesize findings and suggest future directions
- Include a properly formatted References/Список литературы section at the end with 15-25 references
- For Russian academic papers: follow ГОСТ formatting standards, use научный стиль речи, avoid калькирование с английского
- For Russian dissertations specifically: Введение MUST include актуальность, цель, задачи, объект и предмет исследования, гипотеза, методы, научная новизна, практическая значимость${wordRequirement}`;

    const sectionToWrite = specificSection 
      ? outline.find(s => s.title.toLowerCase().includes(specificSection.toLowerCase()))
      : null;

    const userPrompt = `Write a complete academic paper on: "${title}"

${sectionToWrite 
  ? `Section to write: ${sectionToWrite.title}\nDescription: ${sectionToWrite.description}`
  : `Follow this outline structure:\n${JSON.stringify(outline, null, 2)}`}

${references?.length ? `\nUse these references where appropriate:\n${references.map(r => `- ${r.title} (${r.authors?.join(', ')})`).join('\n')}` : ''}

${customInstructions ? `\nSpecial requirements: ${customInstructions}` : ''}
${targetWords ? `\nRequired length: ${targetWords} words minimum (≈${Math.round(targetWords / 280)} pages). Develop every section thoroughly.` : ''}

Remember: vary your sentence lengths dramatically, take clear positions, use specific data and examples, and write with genuine academic personality. The text must pass AI detection tools as human-written.`;

    try {
      // Увеличиваем токены если указан целевой объём
      const estimatedTokens = targetWords ? Math.min(Math.ceil(targetWords / 0.6), 16384) : 8000;

      const content = await this.generateWithRouting('text_generation', systemPrompt, userPrompt, {
        temperature: 0.97,
        maxTokens: estimatedTokens,
        presencePenalty: 0.8,
        frequencyPenalty: 0.6,
      });

      const wordCount = content.split(/\s+/).filter(Boolean).length;

      return {
        content,
        wordCount,
        sections: sectionToWrite ? [sectionToWrite.title] : outline.map(s => s.title)
      };
    } catch (error) {
      logger.error('Error generating draft:', error);
      throw error;
    }
  }

  async analyzeDocument(
    content: string,
    analysisType: string
  ): Promise<AnalysisResult> {
    const analysisPrompts: Record<string, string> = {
      LOGIC: `Analyze the logical structure and argumentation:
        - Check for logical fallacies
        - Evaluate argument strength
        - Identify gaps in reasoning
        - Assess evidence quality`,
      GRAMMAR: `Analyze grammar, syntax, and writing mechanics:
        - Identify grammatical errors
        - Check sentence structure
        - Evaluate word choice
        - Assess readability
        - Check for AI-generated patterns`,
      FACTS: `Analyze factual accuracy and claims:
        - Identify unsupported claims
        - Flag potentially inaccurate statements
        - Check for consistency
        - Note claims requiring citations`,
      STYLE: `Analyze academic writing style:
        - Evaluate tone consistency
        - Check for appropriate formality
        - Assess clarity and conciseness
        - Review academic conventions
        - Check for AI-writing markers (repetitive beginnings, too smooth text)`,
      PLAGIARISM: `Analyze text for plagiarism and AI-generation markers:
        - Identify common AI-generated phrases and patterns
        - Check for unnatural uniformity in sentence structure
        - Assess vocabulary diversity and burstiness
        - Flag potential plagiarized content
        - Provide humanization suggestions`,
      COMPREHENSIVE: `Perform comprehensive analysis covering:
        - Logical structure and argumentation
        - Grammar and writing mechanics
        - Factual accuracy and claims
        - Academic writing style
        - AI-detection probability
        - Overall quality assessment`
    };

    const systemPrompt = `You are an expert academic editor and reviewer. Provide detailed, constructive analysis.
    
    ${analysisPrompts[analysisType] || analysisPrompts.COMPREHENSIVE}
    
    Provide specific, actionable feedback with examples from the text.`;

    const userPrompt = `Analyze the following academic text:

---
${content}
---

Provide detailed analysis with:
1. Overall score (0-100)
2. Specific issues with severity (low/medium/high), descriptions, and suggestions
3. Summary of findings
4. Strengths of the document
5. Key areas for improvement

Return as structured JSON.`;

    try {
      const taskType = analysisType === 'PLAGIARISM' ? 'plagiarism' : 'analysis';
      const content = await this.generateWithRouting(taskType as keyof typeof MODEL_ROUTING, systemPrompt, userPrompt, {
        temperature: 0.3,
        maxTokens: 4000,
        jsonMode: true,
      });

      return JSON.parse(content);
    } catch (error) {
      logger.error('Error analyzing document:', error);
      throw error;
    }
  }

  async improveStyle(
    content: string,
    instructions?: string
  ): Promise<StyleImprovement> {
    const systemPrompt = `You are an expert academic editor and humanization specialist. Your primary goal is to make text read as naturally human-written as possible while maintaining academic rigor.

${HUMANIZATION_RULES}

EDITING PRIORITIES:
1. Break up uniform sentence patterns — add variety in length and structure
2. Replace generic AI transition words with natural connectors
3. Add authorial voice — opinions, hedging, intellectual personality
4. Insert specific examples, data points, and named references
5. Vary paragraph lengths (some short, some long)
6. Add occasional parenthetical comments and dash-interrupted thoughts
7. Make the text pass AI detection tools (GPTZero, Turnitin) as human-written
8. Preserve all factual content and arguments`;

    const userPrompt = `Rewrite and improve this academic text to sound naturally human-written. The current version may have AI-like patterns that need to be fixed:

---
${content}
---

${instructions ? `Additional requirements: ${instructions}` : ''}

Key changes needed:
- Break repetitive sentence structures
- Replace overused transitions (Furthermore, Moreover, Additionally)
- Add personality and intellectual voice
- Include specific data/examples where generic ones exist
- Vary paragraph and sentence lengths dramatically

Return as JSON with structure: { "content": string, "changes": [{ "original": string, "improved": string, "reason": string }] }`;

    try {
      const content = await this.generateWithRouting('style_improvement', systemPrompt, userPrompt, {
        temperature: 0.5,
        maxTokens: 8000,
        jsonMode: true,
      });

      return JSON.parse(content);
    } catch (error) {
      logger.error('Error improving style:', error);
      throw error;
    }
  }

  async selfReview(
    content: string,
    projectType: string
  ): Promise<SelfReviewResult> {
    // Chain-of-thought self-review with AI detection analysis
    const systemPrompt = `You are performing a self-review of academic writing with TWO goals:
1. Assess academic quality (logic, evidence, structure, coherence)
2. Assess AI-detection risk — identify patterns that AI detectors would flag

Process:
1. THINKING: Analyze sentence length variance, transition word diversity, authorial voice, paragraph structure variety, and overall "human feel"
2. ANALYSIS: Score the text on academic quality (0-100) AND human-likeness (0-100). Flag specific AI-detectable patterns.
3. RECOMMENDATIONS: Provide actionable fixes for both quality and AI-detection issues
4. REVISIONS: Rewrite flagged sections to sound more naturally human while maintaining academic quality

${HUMANIZATION_RULES}

This is a ${projectType.toLowerCase()} document. Apply appropriate academic standards.`;

    const userPrompt = `Perform a thorough self-review of this ${projectType.toLowerCase()}, focusing on BOTH academic quality AND human-likeness:

---
${content}
---

STEP 1 - THINKING: Examine sentence length distribution, transition word usage, paragraph starts, authorial personality, and specific vs generic content. Would an AI detector flag this?

STEP 2 - ANALYSIS: What patterns look AI-generated? What reads naturally? Give scores for quality and human-likeness.

STEP 3 - RECOMMENDATIONS: What specific changes would make this pass AI detection while improving quality?

STEP 4 - REVISIONS: Rewrite the most AI-looking sections to sound genuinely human — vary sentence lengths, add personality, use specific examples.

Return as JSON with structure:
{
  "thinking": "Your step-by-step thought process",
  "analysis": "Summary including humanScore (0-100) and qualityScore (0-100)",
  "recommendations": ["List of specific recommendations"],
  "revisedSections": [{ "original": string, "revised": string, "explanation": string }]
}`;

    try {
      const content = await this.generateWithRouting('self_review', systemPrompt, userPrompt, {
        temperature: 0.4,
        maxTokens: 6000,
        jsonMode: true,
      });

      return JSON.parse(content);
    } catch (error) {
      logger.error('Error performing self-review:', error);
      throw error;
    }
  }
}
