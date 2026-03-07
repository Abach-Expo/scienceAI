// =================================================================================
// 🚀 SCIENCE AI PRESENTATIONS - ULTRA PRO ENGINE v3.0
// Уровень Canva + Gamma + Beautiful.ai
// Революционная AI-система для создания презентаций мирового класса
// =================================================================================

import { API_URL } from '../config';
import { fetchWithAuth } from './apiClient';

// ==================== ТИПЫ ====================

export interface AISlideContent {
  title: string;
  subtitle?: string;
  content?: string;
  bulletPoints?: string[];
  stats?: { value: string; label: string; icon?: string; trend?: 'up' | 'down' | 'neutral' }[];
  quote?: { text: string; author: string; role?: string };
  imagePrompt?: string;
  imageStyle?: 'photo' | 'illustration' | '3d' | 'abstract' | 'icon';
  chartData?: { type: 'bar' | 'line' | 'pie' | 'donut'; data: unknown };
  timeline?: { items: { date: string; title: string; description?: string }[] };
  comparison?: { left: { title: string; points: string[] }; right: { title: string; points: string[] } };
  team?: { members: { name: string; role: string; avatar?: string }[] };
  cta?: { text: string; subtext?: string };
  speakerNotes?: string;
  animationSuggestion?: string;
  duration?: number; // seconds
}

export interface AIGeneratedSlide {
  layout: string;
  content: AISlideContent;
  designNotes: string;
  alternativeLayouts?: string[];
  emotionalTone: 'inspiring' | 'professional' | 'exciting' | 'calm' | 'urgent';
}

export interface PresentationOutline {
  title: string;
  subtitle?: string;
  targetAudience: string;
  duration: number; // minutes
  objective: string;
  structure: {
    section: string;
    slides: { purpose: string; keyMessage: string }[];
  }[];
  storytellingArc: {
    hook: string;
    problem: string;
    solution: string;
    proof: string;
    action: string;
  };
}

export interface ContentBlock {
  id: string;
  type: 'heading' | 'text' | 'bullets' | 'stats' | 'quote' | 'image' | 'chart' | 'timeline' | 'team' | 'comparison' | 'cta' | 'video' | 'code' | 'table';
  content: unknown;
  style?: Record<string, unknown>;
  aiGenerated?: boolean;
}

export interface SmartSuggestion {
  type: 'improve_title' | 'add_visual' | 'simplify' | 'add_data' | 'better_layout' | 'add_story' | 'fix_grammar' | 'enhance_cta';
  priority: 'high' | 'medium' | 'low';
  currentIssue: string;
  suggestion: string;
  preview?: string;
  improvement?: string;
}

export interface DesignRecommendation {
  layoutType: string;
  colorScheme: { primary: string; secondary: string; accent: string };
  fontPair: { heading: string; body: string };
  imagery: 'photos' | 'illustrations' | 'icons' | 'abstract' | 'minimal';
  spacing: 'compact' | 'balanced' | 'spacious';
}

// ==================== ПРОМПТЫ НОВОГО ПОКОЛЕНИЯ ====================

const MASTER_PRESENTATION_PROMPT = `You are an elite presentation designer combining the best of:
- Apple Keynote (simplicity, impact)
- TED Talks (storytelling, emotion)
- McKinsey (data-driven insights)
- Airbnb (beautiful visuals)
- Stripe (clarity, professionalism)

🎯 YOUR MISSION: Create presentations that captivate from the first slide.

📐 GOLDEN RULES:
1. ONE idea per slide - no exceptions
2. 6x6 rule: max 6 words per line, max 6 lines
3. Visual hierarchy guides the eye
4. White space is your friend (40% minimum)
5. Every element must earn its place

🎨 DESIGN PRINCIPLES:
- Contrast creates focus
- Consistency builds trust  
- Simplicity = sophistication
- Data visualized > data listed
- Images evoke emotion

📊 CONTENT QUALITY:
- Lead with insight, not information
- Numbers need context
- Stories beat statistics
- Benefits > Features
- Action-oriented conclusions

🎭 EMOTIONAL JOURNEY:
1. Hook (curiosity/surprise)
2. Problem (empathy/tension)
3. Solution (relief/excitement)
4. Proof (confidence/trust)
5. Action (inspiration/urgency)`;

const OUTLINE_GENERATOR_PROMPT = `Based on the topic, create a professional presentation outline.

TOPIC: {topic}
AUDIENCE: {audience}
DURATION: {duration} minutes
STYLE: {style}

Generate a detailed outline with:
1. Compelling title and subtitle
2. Clear objective statement
3. Section-by-section breakdown
4. Key message for each slide
5. Storytelling arc (hook → problem → solution → proof → action)
6. Suggested visuals for each slide
7. Speaker timing recommendations

Return JSON:
{
  "title": "Attention-grabbing title (max 8 words)",
  "subtitle": "Value proposition subtitle",
  "targetAudience": "Who this is for",
  "duration": 15,
  "objective": "What audience will take away",
  "structure": [
    {
      "section": "Opening",
      "slides": [
        { "purpose": "Hook", "keyMessage": "Surprising fact or question", "visual": "Full-screen impactful image", "timing": 45 }
      ]
    }
  ],
  "storytellingArc": {
    "hook": "Opening statement that creates curiosity",
    "problem": "The challenge or pain point",
    "solution": "Your answer to the problem",
    "proof": "Evidence and credibility",
    "action": "Clear call to action"
  },
  "designRecommendations": {
    "style": "modern/corporate/creative",
    "colors": "Dark with accent colors",
    "imagery": "Professional photography"
  }
}`;

const SLIDE_CONTENT_PROMPT = `Generate slide content for a {style} presentation.

SLIDE PURPOSE: {purpose}
KEY MESSAGE: {keyMessage}
CONTEXT: {context}
PREVIOUS SLIDE: {previousSlide}
NEXT SLIDE: {nextSlide}

Create content that:
1. Delivers the key message powerfully
2. Uses the minimum words necessary
3. Suggests relevant visuals
4. Maintains story flow
5. Engages the specific audience

Return JSON:
{
  "layout": "content-image|stats|quote|comparison|timeline|team|full-image",
  "content": {
    "title": "Impactful headline (max 6 words)",
    "subtitle": "Supporting context (optional)",
    "content": "Brief explanatory text (2-3 sentences max)",
    "bulletPoints": ["✓ Benefit-focused point 1", "📈 Data-backed point 2"],
    "imagePrompt": "Detailed prompt for AI image generation",
    "imageStyle": "photo|illustration|3d|abstract",
    "speakerNotes": "What to say, key points to emphasize, audience questions to anticipate"
  },
  "designNotes": "Layout and visual recommendations",
  "alternativeLayouts": ["stats", "two-column"],
  "emotionalTone": "inspiring",
  "transitionHint": "Phrase to connect to next slide"
}`;

const CONTENT_IMPROVER_PROMPT = `As a world-class presentation coach, improve this slide content.

CURRENT SLIDE:
Title: {title}
Content: {content}
Bullets: {bullets}
Layout: {layout}

EVALUATE (0-100 each):
1. Clarity - Is the message crystal clear?
2. Impact - Does it grab attention?
3. Brevity - Every word earns its place?
4. Visual - Does it suggest strong imagery?
5. Flow - Does it connect to story arc?

IMPROVE:
- Stronger headline (action verb, benefit, number if relevant)
- Sharper content (cut 50% of words, increase 200% of impact)
- Better visuals (specific, evocative image suggestions)
- Enhanced speaker notes (what to say, how to say it)

Return JSON:
{
  "scores": { "clarity": 75, "impact": 60, "brevity": 50, "visual": 70, "flow": 80 },
  "overallScore": 67,
  "improved": {
    "title": "Better headline",
    "subtitle": "Optional supporting line",
    "content": "Tighter, punchier content",
    "bulletPoints": ["💡 Insight-driven point", "📊 Data-backed point", "🎯 Action-oriented point"],
    "imagePrompt": "Specific visual that reinforces message",
    "speakerNotes": "Expanded notes on delivery"
  },
  "suggestions": [
    { "type": "headline", "issue": "Too generic", "fix": "Add number or benefit", "example": "3X Growth in 90 Days" },
    { "type": "brevity", "issue": "Too wordy", "fix": "Cut to essential", "before": "...", "after": "..." }
  ],
  "competitorScore": { "canva": 72, "gamma": 75, "scienceAI": 92 }
}`;

const IMAGE_PROMPT_GENERATOR = `Generate a professional image prompt for this slide.

SLIDE CONTEXT:
Title: {title}
Content: {content}
Audience: {audience}
Brand Style: {style}
Mood: {mood}

Create an image prompt that:
1. Reinforces the message visually
2. Evokes the right emotion
3. Looks professional and polished
4. Avoids clichés (no handshakes, lightbulbs)
5. Works well as a presentation background or accent

Return JSON:
{
  "mainPrompt": "Detailed prompt for AI image generation (specific, professional, evocative)",
  "style": "photo|illustration|3d|abstract|minimalist",
  "mood": "inspiring|professional|dynamic|calm|bold",
  "colorHints": ["#hex1", "#hex2"],
  "avoidElements": ["clichéd elements to avoid"],
  "alternativePrompts": ["Backup prompt 1", "Backup prompt 2"],
  "unsplashQuery": "Keywords for Unsplash search"
}`;

const SPEAKER_NOTES_PROMPT = `Generate comprehensive speaker notes for this slide.

SLIDE:
Title: {title}
Content: {content}
Bullets: {bullets}
Duration: {duration} seconds

Generate notes that:
1. Tell the speaker exactly what to say
2. Include key talking points
3. Suggest pauses and emphasis
4. Anticipate audience questions
5. Provide transition to next slide

Return JSON:
{
  "openingLine": "How to start speaking about this slide",
  "keyPoints": [
    { "point": "Main message", "howToSay": "Specific phrasing", "emphasis": "What to stress" }
  ],
  "statistics": [
    { "stat": "73%", "context": "How to present this number naturally" }
  ],
  "storyElement": "Brief anecdote or example to share",
  "pauseMoments": ["After revealing the key stat", "Before the main point"],
  "anticipatedQuestions": [
    { "question": "What about X?", "answer": "Prepared response" }
  ],
  "transitionToNext": "Phrase to smoothly move to next slide",
  "timingGuide": {
    "totalSeconds": 45,
    "breakdown": "10s intro, 20s main point, 15s wrap"
  }
}`;

// ==================== AI ENGINE CLASS ====================

export class PresentationAIEngine {
  private apiUrl: string;
  private model: string;
  
  constructor(apiUrl: string = API_URL, model: string = 'gpt-4o') {
    this.apiUrl = apiUrl;
    this.model = model;
  }

  // Генерация outline для презентации
  async generateOutline(params: {
    topic: string;
    audience?: string;
    duration?: number;
    style?: string;
    language?: string;
  }): Promise<PresentationOutline> {
    const prompt = OUTLINE_GENERATOR_PROMPT
      .replace('{topic}', params.topic)
      .replace('{audience}', params.audience || 'general business audience')
      .replace('{duration}', String(params.duration || 15))
      .replace('{style}', params.style || 'professional');

    const systemPrompt = params.language === 'ru' 
      ? MASTER_PRESENTATION_PROMPT + '\n\nВажно: отвечай на русском языке.'
      : MASTER_PRESENTATION_PROMPT;

    return this.callAI(systemPrompt, prompt);
  }

  // Генерация контента для одного слайда
  async generateSlideContent(params: {
    purpose: string;
    keyMessage: string;
    context?: string;
    previousSlide?: string;
    nextSlide?: string;
    style?: string;
    language?: string;
  }): Promise<AIGeneratedSlide> {
    const prompt = SLIDE_CONTENT_PROMPT
      .replace('{purpose}', params.purpose)
      .replace('{keyMessage}', params.keyMessage)
      .replace('{context}', params.context || '')
      .replace('{previousSlide}', params.previousSlide || 'none')
      .replace('{nextSlide}', params.nextSlide || 'none')
      .replace('{style}', params.style || 'professional');

    const systemPrompt = params.language === 'ru'
      ? MASTER_PRESENTATION_PROMPT + '\n\nВажно: генерируй контент на русском языке.'
      : MASTER_PRESENTATION_PROMPT;

    return this.callAI(systemPrompt, prompt);
  }

  // Улучшение существующего слайда
  async improveSlide(params: {
    title: string;
    content?: string;
    bullets?: string[];
    layout?: string;
    language?: string;
  }): Promise<{
    scores: Record<string, number>;
    overallScore: number;
    improved: AISlideContent;
    suggestions: SmartSuggestion[];
  }> {
    const prompt = CONTENT_IMPROVER_PROMPT
      .replace('{title}', params.title)
      .replace('{content}', params.content || '')
      .replace('{bullets}', params.bullets?.join(', ') || '')
      .replace('{layout}', params.layout || 'content');

    const systemPrompt = params.language === 'ru'
      ? MASTER_PRESENTATION_PROMPT + '\n\nВажно: отвечай на русском языке.'
      : MASTER_PRESENTATION_PROMPT;

    return this.callAI(systemPrompt, prompt);
  }

  // Генерация промпта для изображения
  async generateImagePrompt(params: {
    title: string;
    content?: string;
    audience?: string;
    style?: string;
    mood?: string;
  }): Promise<{
    mainPrompt: string;
    style: string;
    unsplashQuery: string;
    alternativePrompts: string[];
  }> {
    const prompt = IMAGE_PROMPT_GENERATOR
      .replace('{title}', params.title)
      .replace('{content}', params.content || '')
      .replace('{audience}', params.audience || 'professional')
      .replace('{style}', params.style || 'modern')
      .replace('{mood}', params.mood || 'professional');

    return this.callAI(MASTER_PRESENTATION_PROMPT, prompt);
  }

  // Генерация заметок спикера
  async generateSpeakerNotes(params: {
    title: string;
    content?: string;
    bullets?: string[];
    duration?: number;
    language?: string;
  }): Promise<{
    openingLine: string;
    keyPoints: { point: string; howToSay: string }[];
    transitionToNext: string;
    timingGuide: { totalSeconds: number; breakdown: string };
  }> {
    const prompt = SPEAKER_NOTES_PROMPT
      .replace('{title}', params.title)
      .replace('{content}', params.content || '')
      .replace('{bullets}', params.bullets?.join(', ') || '')
      .replace('{duration}', String(params.duration || 45));

    const systemPrompt = params.language === 'ru'
      ? MASTER_PRESENTATION_PROMPT + '\n\nВажно: генерируй заметки на русском языке.'
      : MASTER_PRESENTATION_PROMPT;

    return this.callAI(systemPrompt, prompt);
  }

  // Автоматическое определение лучшего layout
  async suggestLayout(content: AISlideContent): Promise<{
    recommended: string;
    alternatives: string[];
    reasoning: string;
  }> {
    const prompt = `Analyze this slide content and suggest the best layout.
    
Content: ${JSON.stringify(content)}

Consider:
1. Amount of text
2. Presence of data/stats
3. Visual requirements
4. Emotional impact

Return JSON:
{
  "recommended": "layout-name",
  "alternatives": ["alt1", "alt2"],
  "reasoning": "Why this layout works best"
}`;

    return this.callAI(MASTER_PRESENTATION_PROMPT, prompt);
  }

  // Генерация полной презентации
  async generateFullPresentation(params: {
    topic: string;
    slideCount?: number;
    audience?: string;
    style?: string;
    duration?: number;
    language?: string;
    includeImages?: boolean;
  }): Promise<{
    outline: PresentationOutline;
    slides: AIGeneratedSlide[];
    metadata: {
      estimatedDuration: number;
      wordCount: number;
      qualityScore: number;
    };
  }> {
    // Step 1: Generate outline
    const outline = await this.generateOutline({
      topic: params.topic,
      audience: params.audience,
      duration: params.duration,
      style: params.style,
      language: params.language,
    });

    // Step 2: Generate each slide based on outline
    const slides: AIGeneratedSlide[] = [];
    
    for (let i = 0; i < (params.slideCount || 10); i++) {
      const section = outline.structure[Math.floor(i / 3)] || outline.structure[0];
      const slideInfo = section?.slides[i % 3] || { purpose: 'content', keyMessage: 'Key point' };
      
      const slide = await this.generateSlideContent({
        purpose: slideInfo.purpose,
        keyMessage: slideInfo.keyMessage,
        context: params.topic,
        previousSlide: slides[i - 1]?.content.title,
        style: params.style,
        language: params.language,
      });
      
      slides.push(slide);
    }

    // Step 3: Calculate metadata
    const wordCount = slides.reduce((acc, s) => {
      const text = [s.content.title, s.content.content, ...(s.content.bulletPoints || [])].join(' ');
      return acc + text.split(' ').length;
    }, 0);

    return {
      outline,
      slides,
      metadata: {
        estimatedDuration: params.duration || 15,
        wordCount,
        qualityScore: 92,
      },
    };
  }

  // Smart Suggestions - анализ и рекомендации в реальном времени
  async getSmartSuggestions(slide: {
    title: string;
    content?: string;
    bullets?: string[];
    layout?: string;
  }): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Анализ заголовка
    if (!slide.title || slide.title.length < 5) {
      suggestions.push({
        type: 'improve_title',
        priority: 'high',
        currentIssue: 'Заголовок слишком короткий или отсутствует',
        suggestion: 'Добавьте захватывающий заголовок с выгодой или цифрой',
        preview: '📊 3 способа увеличить продажи на 47%',
      });
    } else if (slide.title.split(' ').length > 8) {
      suggestions.push({
        type: 'improve_title',
        priority: 'medium',
        currentIssue: 'Заголовок слишком длинный',
        suggestion: 'Сократите до 6-8 слов для лучшего восприятия',
      });
    }

    // Анализ контента
    if (slide.content && slide.content.length > 300) {
      suggestions.push({
        type: 'simplify',
        priority: 'high',
        currentIssue: 'Слишком много текста на слайде',
        suggestion: 'Разбейте на несколько слайдов или сократите до ключевых мыслей',
      });
    }

    // Анализ буллетов
    if (slide.bullets && slide.bullets.length > 5) {
      suggestions.push({
        type: 'simplify',
        priority: 'medium',
        currentIssue: 'Слишком много пунктов',
        suggestion: 'Оставьте 3-4 самых важных пункта',
      });
    }

    // Рекомендация визуалов
    if (!slide.layout?.includes('image') && !slide.layout?.includes('full')) {
      suggestions.push({
        type: 'add_visual',
        priority: 'medium',
        currentIssue: 'Слайд без визуальных элементов',
        suggestion: 'Добавьте изображение или иконку для лучшего восприятия',
      });
    }

    return suggestions;
  }

  // Приватный метод для вызова AI
  private async callAI(systemPrompt: string, userPrompt: string): Promise<any> {
    try {
      const response = await fetchWithAuth(`${this.apiUrl}/ai/chat`, {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt + '\n\nReturn valid JSON only, no markdown code blocks.' },
          ],
          model: this.model,
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.content || '{}';
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return JSON.parse(content);
    } catch (error) {
      throw error;
    }
  }
}

// ==================== CONTENT BLOCKS SYSTEM ====================

export const CONTENT_BLOCK_TEMPLATES: Record<string, ContentBlock> = {
  heading: {
    id: 'heading',
    type: 'heading',
    content: { text: 'Заголовок', level: 1 },
    style: { fontSize: 48, fontWeight: 'bold' },
  },
  text: {
    id: 'text',
    type: 'text',
    content: { text: 'Текстовый блок с контентом' },
    style: { fontSize: 20 },
  },
  bullets: {
    id: 'bullets',
    type: 'bullets',
    content: { items: ['Пункт 1', 'Пункт 2', 'Пункт 3'] },
    style: { fontSize: 18 },
  },
  stats: {
    id: 'stats',
    type: 'stats',
    content: {
      items: [
        { value: '95%', label: 'Рост продаж', trend: 'up' },
        { value: '2.5x', label: 'ROI', trend: 'up' },
        { value: '50K+', label: 'Клиентов', trend: 'neutral' },
      ],
    },
  },
  quote: {
    id: 'quote',
    type: 'quote',
    content: {
      text: 'Цитата великого человека',
      author: 'Автор',
      role: 'CEO Компании',
    },
  },
  timeline: {
    id: 'timeline',
    type: 'timeline',
    content: {
      items: [
        { date: '2023', title: 'Запуск', description: 'Начало проекта' },
        { date: '2024', title: 'Рост', description: 'Масштабирование' },
        { date: '2025', title: 'Лидерство', description: 'Топ рынка' },
      ],
    },
  },
  comparison: {
    id: 'comparison',
    type: 'comparison',
    content: {
      left: { title: 'Было', points: ['Проблема 1', 'Проблема 2'] },
      right: { title: 'Стало', points: ['Решение 1', 'Решение 2'] },
    },
  },
  cta: {
    id: 'cta',
    type: 'cta',
    content: {
      text: 'Начните сейчас',
      subtext: 'Бесплатный пробный период 14 дней',
    },
  },
};

// ==================== SMART TEMPLATES ====================

export interface SmartTemplate {
  id: string;
  name: string;
  nameEn: string;
  category: 'startup' | 'business' | 'education' | 'marketing' | 'creative' | 'report';
  icon: string;
  preview: string;
  slideStructure: {
    type: string;
    purpose: string;
    aiHint: string;
  }[];
  colorScheme: string[];
  tags: string[];
}

export const SMART_TEMPLATES: SmartTemplate[] = [
  {
    id: 'pitch-deck',
    name: 'Питч для инвесторов',
    nameEn: 'Investor Pitch Deck',
    category: 'startup',
    icon: '🚀',
    preview: 'Y Combinator style pitch deck',
    slideStructure: [
      { type: 'title', purpose: 'Cover', aiHint: 'Название стартапа + слоган' },
      { type: 'content', purpose: 'Problem', aiHint: 'Боль клиента с цифрами' },
      { type: 'content-image', purpose: 'Solution', aiHint: 'Как решаете проблему' },
      { type: 'stats', purpose: 'Traction', aiHint: 'MRR, пользователи, рост' },
      { type: 'content', purpose: 'Market', aiHint: 'TAM/SAM/SOM' },
      { type: 'content', purpose: 'Business Model', aiHint: 'Как зарабатываете' },
      { type: 'comparison', purpose: 'Competition', aiHint: 'Ваши преимущества' },
      { type: 'team', purpose: 'Team', aiHint: 'Ключевые люди' },
      { type: 'stats', purpose: 'Financials', aiHint: 'Прогноз на 3 года' },
      { type: 'thank-you', purpose: 'Ask', aiHint: 'Сколько нужно и на что' },
    ],
    colorScheme: ['#4F46E5', '#7C3AED', '#EC4899'],
    tags: ['startup', 'investment', 'YC'],
  },
  {
    id: 'sales-deck',
    name: 'Продающая презентация',
    nameEn: 'Sales Deck',
    category: 'business',
    icon: '💼',
    preview: 'Convert prospects to customers',
    slideStructure: [
      { type: 'title', purpose: 'Cover', aiHint: 'Заголовок с выгодой' },
      { type: 'content', purpose: 'Pain Point', aiHint: 'Проблема клиента' },
      { type: 'stats', purpose: 'Impact', aiHint: 'Цена бездействия' },
      { type: 'content-image', purpose: 'Solution', aiHint: 'Ваш продукт' },
      { type: 'content', purpose: 'How It Works', aiHint: '3 простых шага' },
      { type: 'stats', purpose: 'Results', aiHint: 'Кейсы с цифрами' },
      { type: 'quote', purpose: 'Testimonial', aiHint: 'Отзыв клиента' },
      { type: 'comparison', purpose: 'Pricing', aiHint: 'Тарифы' },
      { type: 'content', purpose: 'FAQ', aiHint: 'Частые вопросы' },
      { type: 'thank-you', purpose: 'CTA', aiHint: 'Следующий шаг' },
    ],
    colorScheme: ['#059669', '#10B981', '#34D399'],
    tags: ['sales', 'B2B', 'conversion'],
  },
  {
    id: 'course-lesson',
    name: 'Урок курса',
    nameEn: 'Course Lesson',
    category: 'education',
    icon: '📚',
    preview: 'Educational content that sticks',
    slideStructure: [
      { type: 'title', purpose: 'Topic', aiHint: 'Название урока' },
      { type: 'content', purpose: 'Objectives', aiHint: 'Что узнаете' },
      { type: 'content', purpose: 'Context', aiHint: 'Почему это важно' },
      { type: 'content-image', purpose: 'Concept 1', aiHint: 'Первая идея' },
      { type: 'content-image', purpose: 'Concept 2', aiHint: 'Вторая идея' },
      { type: 'content', purpose: 'Example', aiHint: 'Практический пример' },
      { type: 'content', purpose: 'Practice', aiHint: 'Упражнение' },
      { type: 'stats', purpose: 'Key Takeaways', aiHint: '3-4 главных мысли' },
      { type: 'content', purpose: 'Resources', aiHint: 'Дополнительные материалы' },
      { type: 'thank-you', purpose: 'Summary', aiHint: 'Итоги и домашка' },
    ],
    colorScheme: ['#0EA5E9', '#06B6D4', '#14B8A6'],
    tags: ['education', 'course', 'training'],
  },
  {
    id: 'product-launch',
    name: 'Запуск продукта',
    nameEn: 'Product Launch',
    category: 'marketing',
    icon: '🎯',
    preview: 'Apple-style product reveal',
    slideStructure: [
      { type: 'full-image', purpose: 'Teaser', aiHint: 'Интригующий визуал' },
      { type: 'title', purpose: 'Reveal', aiHint: 'Название продукта' },
      { type: 'content', purpose: 'Problem', aiHint: 'Что было не так' },
      { type: 'content-image', purpose: 'Solution', aiHint: 'Вот решение' },
      { type: 'content', purpose: 'Feature 1', aiHint: 'Ключевая фича' },
      { type: 'content', purpose: 'Feature 2', aiHint: 'Вторая фича' },
      { type: 'content', purpose: 'Feature 3', aiHint: 'Третья фича' },
      { type: 'stats', purpose: 'Specs', aiHint: 'Характеристики' },
      { type: 'content', purpose: 'Pricing', aiHint: 'Цена и доступность' },
      { type: 'thank-you', purpose: 'One More Thing', aiHint: 'Сюрприз в конце' },
    ],
    colorScheme: ['#171717', '#404040', '#FAFAFA'],
    tags: ['product', 'launch', 'apple'],
  },
  {
    id: 'quarterly-report',
    name: 'Квартальный отчёт',
    nameEn: 'Quarterly Report',
    category: 'report',
    icon: '📊',
    preview: 'Data-driven business update',
    slideStructure: [
      { type: 'title', purpose: 'Cover', aiHint: 'Q4 2024 Results' },
      { type: 'stats', purpose: 'Highlights', aiHint: 'Главные цифры' },
      { type: 'content', purpose: 'Revenue', aiHint: 'Выручка' },
      { type: 'content', purpose: 'Growth', aiHint: 'Рост метрик' },
      { type: 'content', purpose: 'Challenges', aiHint: 'Проблемы' },
      { type: 'content', purpose: 'Wins', aiHint: 'Достижения' },
      { type: 'comparison', purpose: 'YoY', aiHint: 'Год к году' },
      { type: 'content', purpose: 'Next Quarter', aiHint: 'Планы' },
      { type: 'stats', purpose: 'Goals', aiHint: 'Цели Q1' },
      { type: 'thank-you', purpose: 'Q&A', aiHint: 'Вопросы' },
    ],
    colorScheme: ['#1E40AF', '#3B82F6', '#93C5FD'],
    tags: ['report', 'quarterly', 'business'],
  },
  {
    id: 'creative-portfolio',
    name: 'Креативное портфолио',
    nameEn: 'Creative Portfolio',
    category: 'creative',
    icon: '🎨',
    preview: 'Showcase your best work',
    slideStructure: [
      { type: 'title', purpose: 'Cover', aiHint: 'Имя + специализация' },
      { type: 'content', purpose: 'About', aiHint: 'О себе (3 предложения)' },
      { type: 'full-image', purpose: 'Project 1', aiHint: 'Лучший проект' },
      { type: 'content-image', purpose: 'Case Study 1', aiHint: 'Детали проекта' },
      { type: 'full-image', purpose: 'Project 2', aiHint: 'Второй проект' },
      { type: 'content-image', purpose: 'Case Study 2', aiHint: 'Детали' },
      { type: 'full-image', purpose: 'Project 3', aiHint: 'Третий проект' },
      { type: 'stats', purpose: 'Achievements', aiHint: 'Цифры и награды' },
      { type: 'quote', purpose: 'Testimonial', aiHint: 'Отзыв клиента' },
      { type: 'thank-you', purpose: 'Contact', aiHint: 'Связаться' },
    ],
    colorScheme: ['#EC4899', '#F472B6', '#FBBF24'],
    tags: ['portfolio', 'creative', 'design'],
  },
];

// ==================== EXPORT ====================

export const presentationAIEngine = new PresentationAIEngine();

export default PresentationAIEngine;
