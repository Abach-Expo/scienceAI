/**
 * 🛡️ ADVANCED ANTI-AI DETECTION SYSTEM v3.0
 * Продвинутая система обхода AI-детекторов
 * Цель: 92%+ прохождение GPTZero, Originality.ai, Turnitin AI, Content at Scale
 * 
 * Улучшения v3:
 * - 60+ паттернов AI (включая GPT-4o-специфичные)
 * - Статистический анализ: Zipf's law, hapax legomena, TTR
 * - Улучшенный burstiness scoring
 * - Контекстно-адаптивная гуманизация
 * - Расширенная база академических источников (8 дисциплин)
 */

// ================== ТИПЫ ==================

export interface TextAnalysis {
  perplexityScore: number;      // 0-100, выше = более человеческий
  burstyScore: number;          // 0-100, выше = более вариативный
  humanScore: number;           // 0-100, общий скор
  aiPatterns: string[];         // Найденные AI-паттерны
  suggestions: string[];        // Рекомендации
  details: {
    vocabularyRichness: number;  // Type-Token Ratio
    hapaxRatio: number;          // Доля слов, встречающихся 1 раз
    avgSentenceLength: number;
    sentenceLengthVariance: number;
    paragraphVariety: number;    // Разнообразие начал абзацев
  };
}

export interface HumanizationOptions {
  intensity: 'light' | 'medium' | 'aggressive';
  addTypos: boolean;
  addColloquialisms: boolean;
  addCitations: boolean;
  preserveAcademic: boolean;
  documentType?: string;
}

// ================== ПАТТЕРНЫ AI (60+ паттернов) ==================

const ADVANCED_AI_PATTERNS: Array<{ pattern: RegExp; weight: number; fix: string; category: string }> = [
  // === ВСТУПЛЕНИЯ (высокий вес — очень характерны для AI) ===
  { pattern: /^В современном мире/gim, weight: 10, fix: 'Сегодня', category: 'intro' },
  { pattern: /^В наше время/gim, weight: 8, fix: 'Сейчас', category: 'intro' },
  { pattern: /^В эпоху (цифровизации|глобализации|информации)/gim, weight: 9, fix: 'С развитием технологий', category: 'intro' },
  { pattern: /^Данн(ая|ый|ое) (тема|вопрос|проблема) (является )?актуальн/gim, weight: 10, fix: 'Это заслуживает внимания', category: 'intro' },
  { pattern: /^Актуальность (данной|этой) темы/gim, weight: 9, fix: 'Важность вопроса', category: 'intro' },
  { pattern: /^В условиях (современного|быстро меняющегося)/gim, weight: 8, fix: 'Учитывая текущие реалии', category: 'intro' },
  { pattern: /^На протяжении (всей )?истории/gim, weight: 7, fix: 'Исторически', category: 'intro' },
  { pattern: /^Вопрос (о |об )?.*всегда (был|являлся|оставался)/gim, weight: 8, fix: 'Давно обсуждаемый вопрос', category: 'intro' },
  
  // === ПЕРЕХОДЫ ===
  { pattern: /Кроме того,/gi, weight: 3, fix: 'Также', category: 'transition' },
  { pattern: /Более того,/gi, weight: 4, fix: 'И ещё', category: 'transition' },
  { pattern: /Не менее важн(о|ым)/gi, weight: 5, fix: 'Важно и', category: 'transition' },
  { pattern: /Следует отметить, что/gi, weight: 6, fix: 'Стоит сказать:', category: 'transition' },
  { pattern: /Важно подчеркнуть, что/gi, weight: 6, fix: 'Нужно понимать:', category: 'transition' },
  { pattern: /Необходимо отметить/gi, weight: 5, fix: 'Замечу', category: 'transition' },
  { pattern: /Стоит отметить, что/gi, weight: 5, fix: 'Отметим:', category: 'transition' },
  { pattern: /В этом контексте/gi, weight: 4, fix: 'Здесь', category: 'transition' },
  { pattern: /В данном контексте/gi, weight: 5, fix: 'Тут', category: 'transition' },
  { pattern: /В свою очередь,/gi, weight: 3, fix: 'А', category: 'transition' },
  { pattern: /Помимо этого,/gi, weight: 4, fix: 'Ещё', category: 'transition' },
  { pattern: /Вместе с тем,/gi, weight: 3, fix: 'Однако', category: 'transition' },
  
  // === ЗАКЛЮЧЕНИЯ ===
  { pattern: /Таким образом, можно (сделать вывод|заключить)/gi, weight: 8, fix: 'Итак', category: 'conclusion' },
  { pattern: /Подводя итог/gi, weight: 7, fix: 'В итоге', category: 'conclusion' },
  { pattern: /Резюмируя вышесказанное/gi, weight: 9, fix: 'Обобщая', category: 'conclusion' },
  { pattern: /В заключение (хотелось бы|следует|необходимо)/gi, weight: 8, fix: 'Напоследок', category: 'conclusion' },
  { pattern: /На основании (вышеизложенного|проведённого анализа)/gi, weight: 7, fix: 'Исходя из этого', category: 'conclusion' },
  { pattern: /Таким образом, (мы можем|следует|необходимо)/gi, weight: 7, fix: 'Итого', category: 'conclusion' },
  { pattern: /В заключении? хочется/gi, weight: 8, fix: 'Под конец', category: 'conclusion' },
  
  // === УСИЛИТЕЛИ ===
  { pattern: /безусловно,/gi, weight: 4, fix: 'конечно,', category: 'amplifier' },
  { pattern: /несомненно,/gi, weight: 5, fix: 'видимо,', category: 'amplifier' },
  { pattern: /очевидно, что/gi, weight: 4, fix: 'похоже, что', category: 'amplifier' },
  { pattern: /не подлежит сомнению/gi, weight: 6, fix: 'вряд ли кто поспорит', category: 'amplifier' },
  { pattern: /является неотъемлем/gi, weight: 5, fix: 'составляет важную часть', category: 'amplifier' },
  { pattern: /играет (важную|ключевую|значительную|особую) роль/gi, weight: 4, fix: 'влияет', category: 'amplifier' },
  { pattern: /представляет (собой|большой) интерес/gi, weight: 4, fix: 'интересно', category: 'amplifier' },
  { pattern: /оказывает (значительное|существенное) влияние/gi, weight: 4, fix: 'влияет', category: 'amplifier' },
  { pattern: /имеет большое значение/gi, weight: 4, fix: 'важно', category: 'amplifier' },
  { pattern: /занимает особое место/gi, weight: 5, fix: 'выделяется', category: 'amplifier' },
  
  // === СТРУКТУРНЫЕ ПАТТЕРНЫ ===
  { pattern: /Во-первых[\s\S]{50,300}Во-вторых[\s\S]{50,300}В-третьих/gi, weight: 7, fix: '', category: 'structure' },
  { pattern: /С одной стороны[\s\S]{50,200}С другой стороны/gi, weight: 5, fix: '', category: 'structure' },
  
  // === GPT-4o СПЕЦИФИЧНЫЕ ПАТТЕРНЫ (новые) ===
  { pattern: /Давайте рассмотрим/gi, weight: 6, fix: 'Рассмотрим', category: 'gpt4o' },
  { pattern: /Давайте разберёмся/gi, weight: 6, fix: 'Разберёмся', category: 'gpt4o' },
  { pattern: /Итак, давайте/gi, weight: 5, fix: 'Итак,', category: 'gpt4o' },
  { pattern: /^Это (важный|ключевой|значимый) (вопрос|аспект|момент)/gim, weight: 5, fix: 'Заслуживает внимания', category: 'gpt4o' },
  { pattern: /Это интересный вопрос/gi, weight: 6, fix: 'Вопрос непростой', category: 'gpt4o' },
  { pattern: /Однозначного ответа нет/gi, weight: 4, fix: 'Ответить непросто', category: 'gpt4o' },
  { pattern: /Рассмотрим (каждый|это|данный) (аспект|пункт|вопрос) (подробнее|более детально)/gi, weight: 5, fix: 'Остановимся на этом', category: 'gpt4o' },
  { pattern: /Безусловно, (это|данный)/gi, weight: 5, fix: 'Конечно, это', category: 'gpt4o' },
  { pattern: /Стоит также упомянуть/gi, weight: 4, fix: 'Упомяну ещё', category: 'gpt4o' },
  
  // === ЛЕКСИЧЕСКИЕ КЛИШЕ ===
  { pattern: /широкий спектр/gi, weight: 3, fix: 'множество', category: 'cliche' },
  { pattern: /играет ключевую роль/gi, weight: 4, fix: 'критически важно', category: 'cliche' },
  { pattern: /в рамках данного исследования/gi, weight: 5, fix: 'в нашей работе', category: 'cliche' },
  { pattern: /на данный момент/gi, weight: 3, fix: 'сейчас', category: 'cliche' },
  { pattern: /в настоящее время/gi, weight: 3, fix: 'на текущий момент', category: 'cliche' },
  { pattern: /значительное количество/gi, weight: 3, fix: 'немало', category: 'cliche' },
  { pattern: /обширный массив/gi, weight: 4, fix: 'большой объём', category: 'cliche' },
  { pattern: /неоценимый вклад/gi, weight: 4, fix: 'серьёзный вклад', category: 'cliche' },
];

// ================== ENGLISH AI PATTERNS (30+ patterns) ==================

const ENGLISH_AI_PATTERNS: Array<{ pattern: RegExp; weight: number; fix: string; category: string }> = [
  // === INTROS ===
  { pattern: /^In today's (rapidly )?(evolving|changing|modern) world/gim, weight: 10, fix: 'Currently', category: 'intro' },
  { pattern: /^In the (modern|contemporary|digital) (era|age|landscape)/gim, weight: 9, fix: 'Today', category: 'intro' },
  { pattern: /^It is (important|worth|crucial) to note that/gim, weight: 8, fix: 'Notably,', category: 'intro' },
  { pattern: /^In recent years,/gim, weight: 6, fix: 'Lately,', category: 'intro' },
  { pattern: /^(This|The) topic (is|remains|has been) (particularly )?(relevant|important|significant)/gim, weight: 9, fix: 'This deserves attention', category: 'intro' },
  { pattern: /^Throughout history,/gim, weight: 7, fix: 'Historically,', category: 'intro' },
  
  // === TRANSITIONS ===
  { pattern: /Furthermore,/gi, weight: 4, fix: 'Also,', category: 'transition' },
  { pattern: /Moreover,/gi, weight: 4, fix: 'And,', category: 'transition' },
  { pattern: /Additionally,/gi, weight: 4, fix: 'Plus,', category: 'transition' },
  { pattern: /It is worth noting that/gi, weight: 6, fix: 'Note that', category: 'transition' },
  { pattern: /It is important to (highlight|emphasize|note)/gi, weight: 6, fix: 'We should see that', category: 'transition' },
  { pattern: /In this context,/gi, weight: 4, fix: 'Here,', category: 'transition' },
  { pattern: /That being said,/gi, weight: 3, fix: 'Still,', category: 'transition' },
  { pattern: /Needless to say,/gi, weight: 5, fix: 'Clearly,', category: 'transition' },
  
  // === CONCLUSIONS ===
  { pattern: /In conclusion,/gi, weight: 7, fix: 'To wrap up,', category: 'conclusion' },
  { pattern: /To summarize,/gi, weight: 6, fix: 'In short,', category: 'conclusion' },
  { pattern: /In summary,/gi, weight: 6, fix: 'Overall,', category: 'conclusion' },
  { pattern: /All things considered,/gi, weight: 5, fix: 'Ultimately,', category: 'conclusion' },
  { pattern: /Taking everything into account,/gi, weight: 7, fix: 'On balance,', category: 'conclusion' },
  
  // === AMPLIFIERS ===
  { pattern: /undoubtedly,/gi, weight: 5, fix: 'likely,', category: 'amplifier' },
  { pattern: /undeniably,/gi, weight: 5, fix: 'arguably,', category: 'amplifier' },
  { pattern: /It goes without saying/gi, weight: 6, fix: 'Few would dispute', category: 'amplifier' },
  { pattern: /plays a (crucial|vital|pivotal|key) role/gi, weight: 4, fix: 'matters significantly', category: 'amplifier' },
  { pattern: /has a (significant|profound|considerable) impact/gi, weight: 4, fix: 'affects', category: 'amplifier' },
  
  // === GPT-SPECIFIC ===
  { pattern: /Let's (dive|delve) (into|deeper)/gi, weight: 7, fix: 'We examine', category: 'gpt4o' },
  { pattern: /Let me (explain|break down|walk you through)/gi, weight: 6, fix: 'Consider', category: 'gpt4o' },
  { pattern: /That's a great question/gi, weight: 8, fix: 'An interesting point', category: 'gpt4o' },
  { pattern: /I'd be happy to/gi, weight: 7, fix: '', category: 'gpt4o' },
  { pattern: /Absolutely!/gi, weight: 5, fix: 'Indeed.', category: 'gpt4o' },
  { pattern: /a wide (range|variety|spectrum) of/gi, weight: 3, fix: 'various', category: 'cliche' },
  { pattern: /it is (essential|imperative|crucial) to/gi, weight: 4, fix: 'we must', category: 'cliche' },
];

// ================== ЧЕЛОВЕЧЕСКИЕ ЭЛЕМЕНТЫ ==================

const COLLOQUIALISMS = [
  'честно говоря',
  'если быть точным',
  'скажем так',
  'грубо говоря',
  'ну и',
  'как ни странно',
  'забавно, но',
  'на деле',
  'по правде',
  'между прочим',
];

const HEDGING_PHRASES = [
  'вероятно,',
  'возможно,',
  'по всей видимости,',
  'как представляется,',
  'думается,',
  'полагаю,',
  'на мой взгляд,',
  'судя по всему,',
  'похоже,',
  'видимо,',
  'предположительно,',
  'не исключено, что',
  'скорее всего,',
  'по-видимому,',
  'допустимо предположить,',
];

const SELF_REFERENCES = [
  'мы полагаем',
  'мы считаем',
  'нам представляется',
  'мы склонны думать',
  'на наш взгляд',
  'по нашему мнению',
  'как нам кажется',
];

const DOUBT_EXPRESSIONS = [
  '(хотя это спорно)',
  '(здесь есть нюансы)',
  '(впрочем, не всё так однозначно)',
  '(хотя данные противоречивы)',
  '(при всех оговорках)',
  '— хотя это дискуссионно',
  '— здесь мнения расходятся',
];

const ACADEMIC_CITATIONS = [
  '[см. подробнее: ]',
  '[ср.: ]',
  '[по данным: ]',
  '(подробнее об этом см.: )',
  '[как отмечает ]',
  '[согласно ]',
];

// ================== РЕАЛЬНЫЕ ИСТОЧНИКИ (расширенная база) ==================

const REAL_ACADEMIC_SOURCES = {
  methodology: [
    'Кун Т. Структура научных революций. М., 1977',
    'Поппер К. Логика научного исследования. М., 2004',
    'Лакатос И. Методология научных исследовательских программ // Вопросы философии. 1995',
    'Фейерабенд П. Против метода. М., 2007',
    'Щедровицкий Г.П. Избранные труды. М., 1995',
  ],
  psychology: [
    'Выготский Л.С. Мышление и речь. М., 1934',
    'Леонтьев А.Н. Деятельность. Сознание. Личность. М., 1975',
    'Рубинштейн С.Л. Основы общей психологии. СПб., 2000',
    'Зимняя И.А. Педагогическая психология. М., 2010',
    'Петровский А.В. Личность. Деятельность. Коллектив. М., 1982',
  ],
  education: [
    'Вербицкий А.А. Активное обучение в высшей школе. М., 1991',
    'Сластёнин В.А. Педагогика. М., 2002',
    'Давыдов В.В. Теория развивающего обучения. М., 1996',
    'Загвязинский В.И. Теория обучения: современная интерпретация. М., 2001',
    'Хуторской А.В. Современная дидактика. СПб., 2001',
  ],
  economics: [
    'Кейнс Дж.М. Общая теория занятости, процента и денег. М., 1978',
    'Хайек Ф.А. Дорога к рабству. М., 2005',
    'Норт Д. Институты, институциональные изменения и функционирование экономики. М., 1997',
    'Аузан А.А. Экономика всего. М., 2014',
    'Стиглиц Дж. Цена неравенства. М., 2015',
  ],
  sociology: [
    'Бурдьё П. Социология социального пространства. М., 2007',
    'Гидденс Э. Устроение общества. М., 2005',
    'Парсонс Т. О структуре социального действия. М., 2000',
    'Бауман З. Текучая современность. СПб., 2008',
    'Бек У. Общество риска. М., 2000',
  ],
  philosophy: [
    'Хайдеггер М. Бытие и время. М., 1997',
    'Гуссерль Э. Идеи к чистой феноменологии. М., 1999',
    'Витгенштейн Л. Философские исследования. М., 1994',
    'Мамардашвили М.К. Как я понимаю философию. М., 1992',
    'Лосев А.Ф. Диалектика мифа. М., 2001',
  ],
  linguistics: [
    'Соссюр Ф. де. Курс общей лингвистики. М., 1977',
    'Хомский Н. Синтаксические структуры. М., 1962',
    'Бахтин М.М. Эстетика словесного творчества. М., 1979',
    'Виноградов В.В. О языке художественной прозы. М., 1980',
    'Лотман Ю.М. Структура художественного текста. М., 1970',
  ],
  it: [
    'Кнут Д. Искусство программирования. М., 2000',
    'Гамма Э. и др. Приёмы объектно-ориентированного проектирования. СПб., 2001',
    'Брукс Ф. Мифический человеко-месяц. СПб., 2010',
    'Мартин Р. Чистый код. СПб., 2010',
    'Таненбаум Э. Компьютерные сети. СПб., 2003',
  ],
  medicine: [
    'Покровский В.И. Инфекционные болезни и эпидемиология. М., 2007',
    'Пальцев М.А. Патологическая анатомия. М., 2011',
    'Струков А.И. Патологическая анатомия. М., 2015',
    'Мурашко В.В. Электрокардиография. М., 2014',
    'Гребнев А.Л. Пропедевтика внутренних болезней. М., 2001',
  ],
  law: [
    'Алексеев С.С. Общая теория права. М., 2008',
    'Марченко М.Н. Теория государства и права. М., 2004',
    'Нерсесянц В.С. Философия права. М., 2005',
    'Козлова Е.И. Конституционное право России. М., 2010',
    'Бахрах Д.Н. Административное право России. М., 2010',
  ],
  history: [
    'Ключевский В.О. Курс русской истории. М., 1937',
    'Платонов С.Ф. Полный курс лекций по русской истории. М., 2006',
    'Бродель Ф. Материальная цивилизация, экономика и капитализм. М., 1986',
    'Тойнби А. Постижение истории. М., 1991',
    'Карамзин Н.М. История государства Российского. М., 1988',
  ],
};

// ================== АНАЛИЗ (v3 — СТАТИСТИЧЕСКИЙ) ==================

/**
 * Анализирует текст на признаки AI-генерации
 * Использует: паттерны + burstiness + vocabulary + Zipf + hapax legomena
 */
export function analyzeText(text: string): TextAnalysis {
  const aiPatterns: string[] = [];
  let totalWeight = 0;
  let maxWeight = 0;
  
  // 1. Проверяем паттерны (RU + EN)
  const allPatterns = [...ADVANCED_AI_PATTERNS, ...ENGLISH_AI_PATTERNS];
  allPatterns.forEach(({ pattern, weight }) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => aiPatterns.push(m.trim()));
      totalWeight += weight * (matches.length);
    }
    maxWeight += weight;
  });
  
  // 2. Анализ burstiness (вариативность длины предложений)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
  
  let burstyScore = 0;
  let avgSentenceLength = 0;
  let sentenceLengthVariance = 0;
  
  if (sentenceLengths.length > 3) {
    avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    sentenceLengthVariance = sentenceLengths.reduce((a, len) => a + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length;
    const stdDev = Math.sqrt(sentenceLengthVariance);
    
    // Люди пишут неравномерно: CV (coefficient of variation) обычно 0.4-0.8
    const cv = stdDev / avgSentenceLength;
    burstyScore = Math.min(100, cv * 130); // CV 0.77 → 100 баллов
    
    // Бонус за наличие коротких (<8 слов) и длинных (>20 слов) предложений
    const hasShort = sentenceLengths.some(l => l <= 7);
    const hasLong = sentenceLengths.some(l => l >= 22);
    if (hasShort && hasLong) burstyScore = Math.min(100, burstyScore + 15);
  }
  
  // 3. Vocabulary richness (Type-Token Ratio + Hapax Legomena)
  const words = text.toLowerCase().replace(/[^\wа-яёА-ЯЁ\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const wordFreq = new Map<string, number>();
  words.forEach(w => wordFreq.set(w, (wordFreq.get(w) || 0) + 1));
  
  const uniqueWords = wordFreq.size;
  const vocabularyRichness = uniqueWords / words.length; // TTR
  
  // Hapax legomena — слова, встречающиеся только 1 раз (люди склонны использовать больше редких слов)
  const hapaxCount = [...wordFreq.values()].filter(freq => freq === 1).length;
  const hapaxRatio = hapaxCount / uniqueWords;
  
  // 4. Разнообразие начал абзацев
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
  const firstWords = paragraphs.map(p => p.trim().split(/\s+/)[0]?.toLowerCase() || '');
  const uniqueFirstWords = new Set(firstWords);
  const paragraphVariety = firstWords.length > 0 ? uniqueFirstWords.size / firstWords.length : 1;
  
  // 5. Perplexity approximation
  const perplexityScore = Math.min(100, 
    vocabularyRichness * 40 + 
    hapaxRatio * 30 +
    (burstyScore > 30 ? 20 : 0) +
    (paragraphVariety > 0.7 ? 10 : 0)
  );
  
  // 6. Общий скор человечности
  const patternPenalty = Math.min(50, (totalWeight / Math.max(maxWeight, 1)) * 80);
  const humanScore = Math.max(0, Math.min(100, 
    40 +                              // базовый
    perplexityScore * 0.2 +           // словарное разнообразие
    burstyScore * 0.25 +              // вариативность предложений
    paragraphVariety * 15 +           // разнообразие начал
    hapaxRatio * 10 -                 // редкие слова
    patternPenalty                    // штраф за AI-паттерны
  ));
  
  // 7. Рекомендации
  const suggestions: string[] = [];
  
  if (patternPenalty > 15) {
    suggestions.push('Замените AI-клише на естественные обороты (найдено: ' + aiPatterns.length + ')');
  }
  if (burstyScore < 35) {
    suggestions.push('Чередуйте короткие (5 слов) и длинные (25 слов) предложения');
  }
  if (vocabularyRichness < 0.45) {
    suggestions.push('Используйте более разнообразную лексику, избегайте повторов');
  }
  if (hapaxRatio < 0.4) {
    suggestions.push('Добавьте больше уникальных слов — сейчас текст слишком однообразный');
  }
  if (paragraphVariety < 0.6) {
    suggestions.push('Разнообразьте начала абзацев: попробуйте союзы, наречия, вопросы');
  }
  if (!text.includes('на наш взгляд') && !text.includes('полагаем') && !text.includes('думается')) {
    suggestions.push('Добавьте авторскую позицию: "мы полагаем", "на наш взгляд", "думается"');
  }
  if (!text.match(/\[\d+\]|\[.*,\s*\d{4}\]/)) {
    suggestions.push('Добавьте ссылки на источники в формате [Автор, год]');
  }
  if (avgSentenceLength > 0 && (avgSentenceLength < 8 || avgSentenceLength > 22)) {
    suggestions.push(`Средняя длина предложений (${Math.round(avgSentenceLength)} сл.) необычна — оптимально 12-18`);
  }
  
  return {
    perplexityScore: Math.round(perplexityScore),
    burstyScore: Math.round(burstyScore),
    humanScore: Math.round(humanScore),
    aiPatterns,
    suggestions,
    details: {
      vocabularyRichness: Math.round(vocabularyRichness * 100) / 100,
      hapaxRatio: Math.round(hapaxRatio * 100) / 100,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      sentenceLengthVariance: Math.round(sentenceLengthVariance * 10) / 10,
      paragraphVariety: Math.round(paragraphVariety * 100) / 100,
    },
  };
}

// ================== HUMANIZATION ==================

/**
 * Продвинутая гуманизация текста
 */
export function humanizeTextAdvanced(
  text: string,
  options: Partial<HumanizationOptions> = {}
): string {
  const opts: HumanizationOptions = {
    intensity: 'medium',
    addTypos: false,
    addColloquialisms: true,
    addCitations: true,
    preserveAcademic: true,
    ...options,
  };
  
  let result = text;
  
  // 1. Убираем AI-паттерны
  result = removeAIPatterns(result, opts.intensity);
  
  // 2. Добавляем вариативность в длину предложений
  result = addBurstiness(result);
  
  // 3. Добавляем авторские маркеры
  result = addAuthoralVoice(result);
  
  // 4. Добавляем "сомнения" и хеджирование
  result = addHedging(result);
  
  // 5. Добавляем разговорные элементы (если позволено)
  if (opts.addColloquialisms && !opts.preserveAcademic) {
    result = addColloquialElements(result);
  }
  
  // 6. Добавляем цитаты
  if (opts.addCitations) {
    result = addSmartCitations(result);
  }
  
  // 7. Добавляем мелкие "шероховатости"
  result = addImperfections(result, opts.intensity);
  
  // 8. Опционально добавляем опечатки
  if (opts.addTypos) {
    result = addSubtleTypos(result);
  }
  
  return result;
}

/**
 * Убирает AI-паттерны
 */
function removeAIPatterns(text: string, intensity: string): string {
  let result = text;
  
  const allPatterns = [...ADVANCED_AI_PATTERNS, ...ENGLISH_AI_PATTERNS];
  allPatterns.forEach(({ pattern, fix, weight }) => {
    // При агрессивном режиме убираем всё, при лёгком — только тяжёлые
    const threshold = intensity === 'aggressive' ? 0 : intensity === 'medium' ? 5 : 7;
    
    if (weight >= threshold && fix) {
      result = result.replace(pattern, fix);
    }
  });
  
  return result;
}

/**
 * Добавляет вариативность длины предложений
 */
function addBurstiness(text: string): string {
  const paragraphs = text.split('\n\n');
  
  return paragraphs.map(para => {
    const sentences = para.split(/(?<=[.!?])\s+/);
    
    if (sentences.length < 3) return para;
    
    // Иногда объединяем короткие предложения
    for (let i = 0; i < sentences.length - 1; i++) {
      if (sentences[i].split(' ').length < 8 && sentences[i + 1].split(' ').length < 8) {
        if (Math.random() > 0.6) {
          // Объединяем через тире или точку с запятой
          sentences[i] = sentences[i].replace(/\.$/, '') + ' — ' + 
            sentences[i + 1].charAt(0).toLowerCase() + sentences[i + 1].slice(1);
          sentences.splice(i + 1, 1);
        }
      }
    }
    
    // Иногда разбиваем длинные предложения
    return sentences.map(s => {
      if (s.split(' ').length > 25 && s.includes(',')) {
        const commaPos = s.indexOf(',', Math.floor(s.length / 2));
        if (commaPos > 0 && Math.random() > 0.5) {
          return s.slice(0, commaPos + 1) + ' А' + s.slice(commaPos + 2);
        }
      }
      return s;
    }).join(' ');
  }).join('\n\n');
}

/**
 * Добавляет авторский голос
 */
function addAuthoralVoice(text: string): string {
  let result = text;
  const paragraphs = result.split('\n\n');
  let insertCount = 0;
  const maxInserts = Math.ceil(paragraphs.length / 3);
  
  for (let i = 1; i < paragraphs.length && insertCount < maxInserts; i++) {
    if (paragraphs[i].length > 150 && Math.random() > 0.5) {
      const selfRef = SELF_REFERENCES[Math.floor(Math.random() * SELF_REFERENCES.length)];
      
      // Находим подходящее место
      const sentences = paragraphs[i].split(/(?<=[.!?])\s+/);
      if (sentences.length > 1) {
        const insertIdx = Math.floor(Math.random() * (sentences.length - 1));
        const sentence = sentences[insertIdx];
        
        // Добавляем авторскую позицию
        if (!sentence.includes('мы ') && !sentence.includes('наш')) {
          sentences[insertIdx] = sentence.replace(
            /^([А-ЯЁ])/,
            `${selfRef.charAt(0).toUpperCase() + selfRef.slice(1)}, $1`.toLowerCase()
          ).replace(/^./, c => c.toUpperCase());
        }
        
        paragraphs[i] = sentences.join(' ');
        insertCount++;
      }
    }
  }
  
  return paragraphs.join('\n\n');
}

/**
 * Добавляет хеджирование (выражения сомнения)
 */
function addHedging(text: string): string {
  let result = text;
  const paragraphs = result.split('\n\n');
  
  // Добавляем 1-2 выражения сомнения
  let added = 0;
  
  for (let i = 0; i < paragraphs.length && added < 2; i++) {
    const para = paragraphs[i];
    
    // Ищем категоричные утверждения
    if (para.match(/всегда|никогда|очевидно|несомненно|безусловно|является|обязательно/i)) {
      if (Math.random() > 0.4) {
        const doubt = DOUBT_EXPRESSIONS[Math.floor(Math.random() * DOUBT_EXPRESSIONS.length)];
        
        // Вставляем после первой точки
        const dotPos = para.indexOf('.');
        if (dotPos > 50) {
          paragraphs[i] = para.slice(0, dotPos) + ' ' + doubt + para.slice(dotPos);
          added++;
        }
      }
    }
  }
  
  return paragraphs.join('\n\n');
}

/**
 * Добавляет разговорные элементы
 */
function addColloquialElements(text: string): string {
  let result = text;
  
  // Добавляем 1-2 разговорных оборота
  const colloquial = COLLOQUIALISMS[Math.floor(Math.random() * COLLOQUIALISMS.length)];
  
  const sentences = result.split(/(?<=[.!?])\s+/);
  const insertIdx = Math.floor(Math.random() * Math.max(1, sentences.length - 2)) + 1;
  
  if (sentences[insertIdx] && sentences[insertIdx].length > 30) {
    sentences[insertIdx] = colloquial.charAt(0).toUpperCase() + colloquial.slice(1) + ', ' +
      sentences[insertIdx].charAt(0).toLowerCase() + sentences[insertIdx].slice(1);
  }
  
  return sentences.join(' ');
}

/**
 * Добавляет умные цитаты
 */
function addSmartCitations(text: string): string {
  let result = text;
  
  // Определяем тематику по ключевым словам
  const topics = detectTopics(text);
  
  if (topics.length === 0) return result;
  
  // Получаем релевантные источники
  const sources: string[] = [];
  topics.forEach(topic => {
    const topicSources = REAL_ACADEMIC_SOURCES[topic as keyof typeof REAL_ACADEMIC_SOURCES];
    if (topicSources) {
      sources.push(...topicSources);
    }
  });
  
  if (sources.length === 0) return result;
  
  // Добавляем 1-3 цитаты
  const numCitations = Math.min(3, Math.floor(text.length / 1000));
  const usedSources: string[] = [];
  
  const paragraphs = result.split('\n\n');
  
  for (let i = 0; i < numCitations && sources.length > 0; i++) {
    const sourceIdx = Math.floor(Math.random() * sources.length);
    const source = sources.splice(sourceIdx, 1)[0];
    usedSources.push(source);
    
    // Выбираем абзац для вставки
    const paraIdx = Math.floor((i + 1) * paragraphs.length / (numCitations + 1));
    const para = paragraphs[paraIdx];
    
    if (para && para.length > 100) {
      // Вставляем ссылку
      const dotPos = para.lastIndexOf('.');
      if (dotPos > 50) {
        const citationType = ACADEMIC_CITATIONS[Math.floor(Math.random() * ACADEMIC_CITATIONS.length)];
        paragraphs[paraIdx] = para.slice(0, dotPos) + 
          ` ${citationType.replace(']', source + ']')}` +
          para.slice(dotPos);
      }
    }
  }
  
  return paragraphs.join('\n\n');
}

/**
 * Определяет тематику текста (расширенная детекция — 10 дисциплин)
 */
function detectTopics(text: string): string[] {
  const topics: string[] = [];
  const lowerText = text.toLowerCase();
  
  const topicKeywords: Record<string, string[]> = {
    methodology: ['метод', 'методолог', 'научн', 'исследован', 'гипотез', 'парадигм', 'эксперимент', 'выборк'],
    psychology: ['психолог', 'сознани', 'мышлен', 'личност', 'поведен', 'когнитив', 'мотивац', 'эмоци'],
    education: ['образован', 'обучен', 'педагог', 'студент', 'учебн', 'дидактик', 'воспитан', 'компетенц'],
    economics: ['экономик', 'рынок', 'финанс', 'инвестиц', 'капитал', 'труд', 'бюджет', 'инфляци'],
    sociology: ['социол', 'обществ', 'социальн', 'институт', 'структур', 'стратифик', 'группа', 'массов'],
    philosophy: ['философ', 'онтолог', 'эпистемолог', 'бытие', 'сущност', 'диалектик', 'этик'],
    linguistics: ['язык', 'лингвист', 'речь', 'семантик', 'синтаксис', 'грамматик', 'текст', 'дискурс'],
    it: ['программ', 'алгоритм', 'данные', 'систем', 'информац', 'технолог', 'нейросет', 'искусствен'],
    medicine: ['медицин', 'здоров', 'заболеван', 'лечени', 'пациент', 'клинич', 'диагноз', 'терапи'],
    law: ['право', 'закон', 'юридич', 'суд', 'норматив', 'конституци', 'ответственн', 'правовой'],
    history: ['истори', 'эпох', 'столети', 'период', 'цивилизац', 'государств', 'династ'],
  };
  
  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    const matches = keywords.filter(kw => lowerText.includes(kw));
    if (matches.length >= 2) {
      topics.push(topic);
    }
  });
  
  return topics;
}

/**
 * Добавляет мелкие несовершенства
 */
function addImperfections(text: string, intensity: string): string {
  let result = text;
  
  // Иногда повторяем слово (как делают люди)
  if (intensity !== 'light' && Math.random() > 0.7) {
    const words = ['это', 'что', 'как', 'при', 'для'];
    const word = words[Math.floor(Math.random() * words.length)];
    const regex = new RegExp(`\\b(${word})\\b`, 'i');
    const match = result.match(regex);
    if (match && match.index && Math.random() > 0.5) {
      // Добавляем лёгкое "запинание" через запятую
      result = result.replace(regex, `$1, ${word}`);
    }
  }
  
  // Заменяем некоторые точки на точку с запятой
  if (Math.random() > 0.6) {
    const sentences = result.split(/(?<=[.])\s+/);
    for (let i = 0; i < sentences.length - 1; i++) {
      if (sentences[i].length < 80 && sentences[i + 1].length < 80 && Math.random() > 0.7) {
        sentences[i] = sentences[i].replace(/\.$/, ';');
        sentences[i + 1] = sentences[i + 1].charAt(0).toLowerCase() + sentences[i + 1].slice(1);
        break; // Только один раз
      }
    }
    result = sentences.join(' ');
  }
  
  return result;
}

/**
 * Добавляет неявные опечатки
 */
function addSubtleTypos(text: string): string {
  let result = text;
  
  // Очень редкие, реалистичные опечатки
  const typos: [RegExp, string][] = [
    [/\bкотор(ый|ая|ое|ые)\b/, 'котор$1й'], // удвоение
    [/\bнеобходим(о|ый)\b/, 'необходм$1'], // пропуск буквы
  ];
  
  // Применяем максимум 1 опечатку
  if (Math.random() > 0.8) {
    const typo = typos[Math.floor(Math.random() * typos.length)];
    if (result.match(typo[0])) {
      result = result.replace(typo[0], typo[1]);
    }
  }
  
  return result;
}

// ================== QUICK HUMANIZE ==================

/**
 * Быстрая гуманизация для UI
 */
export function quickHumanize(text: string): string {
  return humanizeTextAdvanced(text, {
    intensity: 'medium',
    addTypos: false,
    addColloquialisms: false,
    addCitations: true,
    preserveAcademic: true,
  });
}

/**
 * Агрессивная гуманизация (максимальный обход детекторов)
 * Note: typos disabled as they can break text search/indexing
 */
export function aggressiveHumanize(text: string): string {
  return humanizeTextAdvanced(text, {
    intensity: 'aggressive',
    addTypos: false,
    addColloquialisms: true,
    addCitations: true,
    preserveAcademic: false,
  });
}

/**
 * Академическая гуманизация (сохраняет научный стиль)
 */
export function academicHumanize(text: string): string {
  return humanizeTextAdvanced(text, {
    intensity: 'medium',
    addTypos: false,
    addColloquialisms: false,
    addCitations: true,
    preserveAcademic: true,
  });
}

// ================== ЭКСПОРТ ==================

export default {
  analyzeText,
  humanizeTextAdvanced,
  quickHumanize,
  aggressiveHumanize,
  academicHumanize,
  ADVANCED_AI_PATTERNS,
  ENGLISH_AI_PATTERNS,
  REAL_ACADEMIC_SOURCES,
};
