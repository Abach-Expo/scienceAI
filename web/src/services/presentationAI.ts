// =================================================================================
// 🚀 SCIENCE AI PRESENTATIONS - ULTRA PRO FEATURES v2.0
// Лучше чем Canva и Gamma вместе взятые!
// Улучшенные промпты и AI-генерация
// =================================================================================

// ==================== ТИПЫ ====================

export interface SlideAnalysis {
  score: number; // 0-100
  suggestions: string[];
  improvements: {
    category: string;
    issue: string;
    fix: string;
  }[];
  competitorComparison: {
    canva: number;
    gamma: number;
    scienceAi: number;
  };
}

export interface AIGenerationConfig {
  researchDepth: 'basic' | 'moderate' | 'deep' | 'expert';
  visualStyle: 'minimal' | 'modern' | 'creative' | 'corporate' | 'academic';
  contentDensity: 'sparse' | 'balanced' | 'dense';
  includeStats: boolean;
  includeQuotes: boolean;
  includeExamples: boolean;
  generateSpeakerNotes: boolean;
  optimizeForPrint: boolean;
  brandColors?: string[];
}

export interface SmartTemplate {
  id: string;
  name: string;
  category: 'startup' | 'business' | 'education' | 'marketing' | 'portfolio' | 'science';
  aiPrompt: string;
  structure: {
    slideType: string;
    contentHints: string[];
  }[];
}

// ==================== УЛУЧШЕННЫЕ ПРОМПТЫ v2.0 ====================

export const ULTRA_RESEARCH_PROMPT = `Ты — ведущий исследователь и эксперт по созданию презентаций мирового класса, объединяющий лучшее от TED, Apple Keynote и McKinsey.

🎯 ГЛАВНАЯ ЦЕЛЬ: Создать презентацию, которая ВПЕЧАТЛИТ аудиторию с первого слайда.

📊 ТРЕБОВАНИЯ К КОНТЕНТУ:
1. **Актуальные данные** — статистика 2024-2025 года с реальными источниками
2. **Экспертные цитаты** — мнения лидеров индустрии (можешь использовать известные)
3. **Конкурентный анализ** — что делают топ-игроки рынка
4. **Прогнозы и тренды** — куда движется отрасль
5. **Кейсы успеха** — реальные примеры с цифрами ROI

🎨 ПРИНЦИПЫ ДИЗАЙНА:
• Правило 6x6: максимум 6 слов в строке, 6 строк на слайд
• Один слайд = одна идея
• Контраст и визуальная иерархия
• Эмоциональные якоря

📝 ФОРМАТ ОТВЕТА (JSON):
{
  "researchSummary": "Краткое резюме исследования (3-5 мощных предложений)",
  "keyInsights": ["🔥 инсайт 1", "💡 инсайт 2", "🚀 инсайт 3", "📈 инсайт 4"],
  "statistics": [
    { "value": "73%", "description": "описание статистики", "source": "Forbes 2024", "impact": "высокий" }
  ],
  "expertQuotes": [
    { "quote": "цитата", "author": "автор", "position": "CEO компании", "relevance": "почему важно" }
  ],
  "slides": [
    {
      "slideNumber": 1,
      "layout": "title | content | content-image | stats | quote | comparison | team | timeline | full-image | thank-you",
      "title": "Захватывающий заголовок (макс 8 слов)",
      "subtitle": "Подзаголовок с ценностью",
      "content": "Краткий основной текст (2-3 предложения)",
      "bulletPoints": ["✓ пункт 1 (с выгодой)", "✓ пункт 2 (с цифрой)"],
      "speakerNotes": "Подробные заметки: что говорить, на что делать акцент, какие вопросы ожидать",
      "imageQuery": "professional business photo showing [specific scene] for presentation",
      "visualTip": "Совет по визуализации данного слайда"
    }
  ],
  "presentationHooks": {
    "openingHook": "Провокационный вопрос или шокирующий факт для первого слайда",
    "closingCTA": "Сильный призыв к действию с конкретным следующим шагом"
  },
  "storytellingArc": {
    "setup": "Какую проблему решаем",
    "confrontation": "Почему текущие решения не работают",
    "resolution": "Как наше решение меняет игру"
  }
}`;

export const SLIDE_ENHANCEMENT_PROMPT = `Ты — эксперт по улучшению презентаций уровня TED и Apple Keynote.
Твой IQ в дизайне презентаций = 180.

🎯 ЗАДАЧА: Превратить обычный слайд в UNFORGETTABLE слайд.

📋 ТЕКУЩИЙ СЛАЙД:
• Заголовок: {title}
• Контент: {content}
• Буллеты: {bulletPoints}
• Макет: {layout}

🔍 КРИТЕРИИ ОЦЕНКИ:
1. **Заголовок** (0-20 баллов)
   - Создаёт интригу? Цепляет с первого слова?
   - Содержит выгоду или провокацию?
   
2. **Контент** (0-25 баллов)
   - Краткость — каждое слово на вес золота?
   - Конкретика — цифры, факты, примеры?
   
3. **Структура** (0-20 баллов)
   - Визуальная иерархия очевидна?
   - Логика и flow понятны?
   
4. **Эмоция** (0-20 баллов)
   - Какое чувство вызывает слайд?
   - Есть ли эмоциональный крючок?
   
5. **Запоминаемость** (0-15 баллов)
   - Что аудитория запомнит через неделю?
   - Есть ли WOW-элемент?

📝 ОТВЕТЬ JSON:
{
  "currentScore": 65,
  "scoreBreakdown": {
    "headline": 12,
    "content": 15,
    "structure": 14,
    "emotion": 12,
    "memorability": 12
  },
  "improvedSlide": {
    "title": "Новый мощный заголовок (макс 6 слов)",
    "subtitle": "Поддерживающий подзаголовок",
    "content": "Переписанный краткий контент",
    "bulletPoints": ["🎯 Буллет с выгодой", "📈 Буллет с цифрой", "⚡ Буллет с действием"],
    "speakerNotes": "Что говорить: ключевые моменты, паузы, акценты"
  },
  "improvements": [
    { 
      "what": "Заголовок", 
      "before": "Было скучно", 
      "after": "Стало цепляюще", 
      "why": "Добавил выгоду + интригу",
      "impact": "+8 баллов"
    }
  ],
  "newScore": 92,
  "proTips": [
    "💡 Добавь визуальную метафору",
    "🎨 Используй контрастный цвет для ключевой цифры"
  ]
}`;

export const STORYTELLING_PROMPT = `Ты — мастер сторителлинга уровня Pixar, TED и Steve Jobs.

🎬 ПРИНЦИПЫ STORYTELLING:

PIXAR FORMULA:
1. "Жил-был..." — представь героя (клиента/проблему)
2. "Каждый день..." — обычная рутина с болью
3. "Однажды..." — точка невозврата, инцидент
4. "Из-за этого..." — последствия, эскалация
5. "Пока наконец..." — кульминация и решение

APPLE KEYNOTE:
• "There's one more thing..." — сохраняй интригу
• Сначала проблема, потом решение
• Демонстрация > Объяснение
• Простота = мощь

TED TALK:
• Начни с личной истории
• Покажи уязвимость
• Дай аудитории "aha момент"
• Закончи призывом к действию

🎯 ЗАДАЧА: Превратить тему "{topic}" в захватывающую историю.

📝 ОТВЕТЬ JSON:
{
  "storyArc": {
    "hook": "Первые 30 секунд — как зацепить",
    "setup": "Введение в мир истории",
    "conflict": "Проблема/вызов",
    "journey": "Путь героя",
    "climax": "Кульминация",
    "resolution": "Решение и трансформация"
  },
  "emotionalBeats": [
    { "slide": 1, "emotion": "curiosity", "technique": "Провокационный вопрос" },
    { "slide": 5, "emotion": "tension", "technique": "Показать масштаб проблемы" },
    { "slide": 8, "emotion": "hope", "technique": "Представить решение" },
    { "slide": 10, "emotion": "inspiration", "technique": "Призыв к действию" }
  ],
  "powerPhrases": [
    "Представьте себе...",
    "А что если я скажу вам, что...",
    "Это меняет всё, потому что..."
  ],
  "cliffhangers": [
    "Фраза для создания интриги между слайдами"
  ]
}`;

export const DESIGN_OPTIMIZATION_PROMPT = `Ты — ведущий дизайнер презентаций, работавший в Apple, Airbnb, и McKinsey.

🎨 ПРИНЦИПЫ МИРОВОГО УРОВНЯ:

1. **ПРАВИЛО 6x6**
   - Максимум 6 слов в строке
   - Максимум 6 строк на слайд
   - Меньше = лучше

2. **ВИЗУАЛЬНАЯ ИЕРАРХИЯ**
   - Глаз должен знать куда смотреть
   - Размер = важность
   - Контраст направляет внимание

3. **ПУСТОЕ ПРОСТРАНСТВО**
   - Whitespace — не пустота, а элемент дизайна
   - Дайте контенту "дышать"
   - 40-60% слайда должно быть пустым

4. **КОНТРАСТ**
   - Заголовки КРИЧАТ, текст шепчет
   - Цветовые акценты (макс 3 цвета)
   - Тёмный фон = премиум feel

5. **КОНСИСТЕНТНОСТЬ**
   - Единый стиль всей презентации
   - Повторяющиеся элементы = узнаваемость
   - Шаблон сетки для выравнивания

🔍 АНАЛИЗ:
• WCAG AA доступность цветов
• Эмоциональное воздействие палитры
• Соответствие бренду

📐 ШРИФТЫ:
• Заголовки: Bold, крупный (36-60pt), контрастный
• Текст: Regular, читаемый (18-24pt)
• Правило: максимум 2 шрифта на презентацию
• Рекомендуемые пары: Montserrat + Open Sans, Playfair + Lato

📝 ОТВЕТЬ JSON:
{
  "currentDesignScore": 60,
  "issues": [
    { "problem": "Слишком много текста", "solution": "Разбить на 2 слайда", "priority": "high" }
  ],
  "colorPalette": {
    "primary": "#HEX",
    "secondary": "#HEX", 
    "accent": "#HEX",
    "accessibilityScore": "AA"
  },
  "fontRecommendations": {
    "headline": "Название шрифта, 48pt, Bold",
    "body": "Название шрифта, 20pt, Regular"
  },
  "layoutSuggestions": [
    "Используй rule of thirds для изображений",
    "Выровняй все элементы по сетке"
  ],
  "improvedDesignScore": 95
}`;

// ==================== НОВЫЕ ПРОМПТЫ v2.0 ====================

export const EXECUTIVE_SUMMARY_PROMPT = `Ты создаёшь executive summary для C-level руководителей.

📋 ФОРМАТ:
• Максимум 3 слайда
• Только ключевые метрики и выводы
• Чёткие рекомендации к действию
• Визуальная краткость

🎯 СТРУКТУРА:
1. Слайд 1: "Bottomline upfront" — главный вывод сразу
2. Слайд 2: Ключевые данные (3-4 метрики)
3. Слайд 3: Рекомендации и next steps`;

export const PITCH_DECK_PROMPT = `Ты создаёшь питч-деки, которые привлекают инвестиции.

💰 СТРУКТУРА Y COMBINATOR:
1. Problem (1 слайд) — какую боль решаем
2. Solution (1 слайд) — как решаем
3. Traction (1 слайд) — доказательства (метрики!)
4. Market (1 слайд) — TAM/SAM/SOM
5. Business Model (1 слайд) — как зарабатываем
6. Team (1 слайд) — почему мы
7. Ask (1 слайд) — что нужно от инвестора

💡 СЕКРЕТЫ:
• Цифры > Слова
• Графики роста = must have
• Social proof (логотипы клиентов)
• Уверенность, не надменность`;

export const ACADEMIC_PRESENTATION_PROMPT = `Ты создаёшь академические презентации для научных конференций.

🎓 СТРУКТУРА:
1. Title slide с affiliations
2. Research question / Hypothesis
3. Literature review (кратко)
4. Methodology
5. Results (визуализация данных!)
6. Discussion
7. Conclusion & Future work
8. References
9. Q&A

📊 ОСОБЕННОСТИ:
• Точность терминологии
• Ссылки на источники
• Визуализация данных
• Скептический но заинтересованный тон`;

// ==================== АНАЛИЗ КОНКУРЕНТОВ ====================

interface PresentationData {
  slides: {
    layout: string;
    title?: string;
    subtitle?: string;
    content?: string;
    imageUrl?: string;
    bulletPoints?: string[];
    notes?: string;
  }[];
}

export const analyzeAgainstCompetitors = (presentation: PresentationData): SlideAnalysis => {
  // Алгоритм оценки качества презентации
  let score = 0;
  const improvements: SlideAnalysis['improvements'] = [];
  
  const slides = presentation.slides || [];
  
  // Критерий 1: Количество слайдов (оптимально 10-15)
  if (slides.length >= 8 && slides.length <= 15) {
    score += 15;
  } else {
    improvements.push({
      category: 'Структура',
      issue: slides.length < 8 ? 'Слишком мало слайдов' : 'Слишком много слайдов',
      fix: 'Оптимальное количество: 10-15 слайдов для 15-минутной презентации'
    });
    score += 5;
  }
  
  // Критерий 2: Разнообразие макетов
  const layouts = new Set(slides.map((s) => s.layout));
  if (layouts.size >= 4) {
    score += 15;
  } else {
    improvements.push({
      category: 'Визуальное разнообразие',
      issue: 'Однообразные макеты слайдов',
      fix: 'Используйте разные layouts: title, content-image, stats, quote'
    });
    score += 5;
  }
  
  // Критерий 3: Наличие изображений
  const slidesWithImages = slides.filter((s) => s.imageUrl).length;
  const imageRatio = slidesWithImages / Math.max(slides.length, 1);
  if (imageRatio >= 0.5) {
    score += 20;
  } else {
    improvements.push({
      category: 'Визуальный контент',
      issue: 'Недостаточно изображений',
      fix: 'Добавьте изображения минимум на 50% слайдов'
    });
    score += 10;
  }
  
  // Критерий 4: Качество заголовков (длина)
  const avgTitleLength = slides.reduce((acc: number, s) => acc + (s.title?.length || 0), 0) / Math.max(slides.length, 1);
  if (avgTitleLength >= 15 && avgTitleLength <= 60) {
    score += 15;
  } else {
    improvements.push({
      category: 'Копирайтинг',
      issue: avgTitleLength < 15 ? 'Заголовки слишком короткие' : 'Заголовки слишком длинные',
      fix: 'Оптимальная длина заголовка: 5-10 слов'
    });
    score += 5;
  }
  
  // Критерий 5: Bullet points (не более 5 на слайд)
  const slidesWithTooManyBullets = slides.filter((s) => (s.bulletPoints?.length || 0) > 5).length;
  if (slidesWithTooManyBullets === 0) {
    score += 15;
  } else {
    improvements.push({
      category: 'Читаемость',
      issue: 'Слишком много пунктов на слайде',
      fix: 'Ограничьте буллеты до 5 пунктов максимум'
    });
    score += 5;
  }
  
  // Критерий 6: Наличие структуры (title + thank-you)
  const hasTitle = slides.some((s) => s.layout === 'title');
  const hasThankYou = slides.some((s) => s.layout === 'thank-you');
  if (hasTitle && hasThankYou) {
    score += 10;
  } else {
    improvements.push({
      category: 'Структура',
      issue: !hasTitle ? 'Нет титульного слайда' : 'Нет завершающего слайда',
      fix: 'Добавьте титульный и завершающий слайды'
    });
    score += 5;
  }
  
  // Критерий 7: Speaker notes
  const slidesWithNotes = slides.filter((s) => s.notes && s.notes.length > 20).length;
  if (slidesWithNotes >= slides.length * 0.5) {
    score += 10;
  } else {
    improvements.push({
      category: 'Подготовка',
      issue: 'Мало заметок докладчика',
      fix: 'Добавьте speaker notes для каждого слайда'
    });
  }
  
  return {
    score: Math.min(score, 100),
    suggestions: improvements.map(i => i.fix),
    improvements,
    competitorComparison: {
      canva: Math.max(40, score - 15),
      gamma: Math.max(50, score - 10),
      scienceAi: score
    }
  };
};

// ==================== SMART TEMPLATES ====================

export const SMART_TEMPLATES: SmartTemplate[] = [
  {
    id: 'vc-pitch',
    name: 'VC Pitch Deck',
    category: 'startup',
    aiPrompt: 'Создай презентацию для венчурных инвесторов в стиле Y Combinator Demo Day',
    structure: [
      { slideType: 'title', contentHints: ['Название', 'Один лайнер', 'Раунд'] },
      { slideType: 'content', contentHints: ['Проблема', 'Размер боли', 'Кто страдает'] },
      { slideType: 'content-image', contentHints: ['Решение', 'Как это работает', 'УТП'] },
      { slideType: 'stats', contentHints: ['TAM/SAM/SOM', 'Рост рынка'] },
      { slideType: 'content', contentHints: ['Продукт', 'Скриншоты', 'Демо'] },
      { slideType: 'stats', contentHints: ['Трекшен', 'MRR', 'Рост', 'Retention'] },
      { slideType: 'content', contentHints: ['Бизнес-модель', 'Unit economics'] },
      { slideType: 'comparison', contentHints: ['Конкуренты', 'Наши преимущества'] },
      { slideType: 'team', contentHints: ['Фаундеры', 'Опыт', 'Почему мы'] },
      { slideType: 'content', contentHints: ['Ask', 'Использование средств'] },
      { slideType: 'timeline', contentHints: ['Roadmap', 'Milestones'] },
      { slideType: 'thank-you', contentHints: ['Контакты', 'CTA'] },
    ]
  },
  {
    id: 'ted-talk',
    name: 'TED Talk Style',
    category: 'education',
    aiPrompt: 'Создай презентацию в стиле TED Talk с сильным storytelling',
    structure: [
      { slideType: 'full-image', contentHints: ['Захватывающее начало', 'Провокация'] },
      { slideType: 'quote', contentHints: ['Личная история', 'Момент осознания'] },
      { slideType: 'content', contentHints: ['Проблема мира', 'Почему это важно'] },
      { slideType: 'stats', contentHints: ['Шокирующая статистика'] },
      { slideType: 'content-image', contentHints: ['Главная идея', 'The Big Idea'] },
      { slideType: 'content', contentHints: ['Доказательства', 'Исследования'] },
      { slideType: 'content-image', contentHints: ['Примеры из жизни'] },
      { slideType: 'content', contentHints: ['Как это применить'] },
      { slideType: 'quote', contentHints: ['Вдохновляющая цитата'] },
      { slideType: 'thank-you', contentHints: ['Призыв к действию', 'Изменим мир вместе'] },
    ]
  },
  {
    id: 'product-hunt',
    name: 'Product Hunt Launch',
    category: 'marketing',
    aiPrompt: 'Создай презентацию для запуска продукта на Product Hunt',
    structure: [
      { slideType: 'title', contentHints: ['Продукт', 'Tagline', 'Made with ❤️'] },
      { slideType: 'content', contentHints: ['Для кого это', 'Проблема'] },
      { slideType: 'full-image', contentHints: ['Скриншот продукта'] },
      { slideType: 'content', contentHints: ['Ключевые фичи', 'What makes us special'] },
      { slideType: 'stats', contentHints: ['Результаты beta-пользователей'] },
      { slideType: 'content', contentHints: ['Интеграции', 'Tech stack'] },
      { slideType: 'content', contentHints: ['Pricing', 'Специальное предложение'] },
      { slideType: 'thank-you', contentHints: ['Support us on PH!', 'Links'] },
    ]
  }
];

// ==================== AI MAGIC FUNCTIONS ====================

type SlideData = PresentationData['slides'][number];

interface OpenAIClient {
  chat: {
    completions: {
      create: (params: Record<string, unknown>) => Promise<{
        choices: { message: { content: string | null } }[];
      }>;
    };
  };
}

export const generateAISuggestions = async (slide: SlideData, openai: OpenAIClient): Promise<string[]> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Ты — AI-ассистент для улучшения презентаций. Дай 5 конкретных предложений по улучшению слайда. 
          Ответ в формате JSON массива строк: ["предложение 1", "предложение 2", ...]`
        },
        {
          role: 'user',
          content: `Слайд:
Заголовок: ${slide.title}
Контент: ${slide.content || ''}
Буллеты: ${slide.bulletPoints?.join(', ') || ''}
Макет: ${slide.layout}`
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.suggestions || [];
  } catch (e) {
    return [
      'Сделать заголовок более захватывающим',
      'Добавить статистику для убедительности',
      'Сократить текст на 30%',
      'Добавить визуальный элемент',
      'Переформулировать буллеты как выгоды'
    ];
  }
};

export const autoEnhanceSlide = async (slide: SlideData, openai: OpenAIClient): Promise<SlideData> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: SLIDE_ENHANCEMENT_PROMPT
            .replace('{title}', slide.title || '')
            .replace('{content}', slide.content || '')
            .replace('{bulletPoints}', slide.bulletPoints?.join(', ') || '')
            .replace('{layout}', slide.layout || 'content')
        },
        {
          role: 'user',
          content: 'Улучши этот слайд до уровня Apple Keynote'
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      ...slide,
      title: result.improvedSlide?.title || slide.title,
      subtitle: result.improvedSlide?.subtitle || slide.subtitle,
      content: result.improvedSlide?.content || slide.content,
      bulletPoints: result.improvedSlide?.bulletPoints || slide.bulletPoints,
      notes: result.improvedSlide?.speakerNotes || slide.notes,
    };
  } catch (e) {
    return slide;
  }
};

export const generateStoryboardFromTopic = async (
  topic: string, 
  slideCount: number,
  config: Partial<AIGenerationConfig>,
  openai: OpenAIClient
): Promise<SlideData[]> => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: ULTRA_RESEARCH_PROMPT
      },
      {
        role: 'user',
        content: `Создай презентацию на ${slideCount} слайдов по теме: "${topic}"

Дополнительные параметры:
- Глубина исследования: ${config.researchDepth || 'moderate'}
- Визуальный стиль: ${config.visualStyle || 'modern'}
- Плотность контента: ${config.contentDensity || 'balanced'}
- Включить статистику: ${config.includeStats !== false}
- Включить цитаты: ${config.includeQuotes !== false}
- Генерировать заметки докладчика: ${config.generateSpeakerNotes !== false}`
      }
    ],
    response_format: { type: 'json_object' }
  });
  
  const result = JSON.parse(response.choices[0].message.content || '{}');
  return result.slides || [];
};

// ==================== ЭКСПОРТ ====================

export default {
  analyzeAgainstCompetitors,
  SMART_TEMPLATES,
  generateAISuggestions,
  autoEnhanceSlide,
  generateStoryboardFromTopic,
  ULTRA_RESEARCH_PROMPT,
  SLIDE_ENHANCEMENT_PROMPT,
  STORYTELLING_PROMPT,
  DESIGN_OPTIMIZATION_PROMPT
};
