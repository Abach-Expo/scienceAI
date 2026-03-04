// =================================================================================
// 🎨 SMART TEMPLATES - Canva/Gamma Style Template Selection
// Интеллектуальный выбор шаблонов с AI-настройкой
// =================================================================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Sparkles,
  Rocket,
  Briefcase,
  GraduationCap,
  Target,
  Palette,
  BarChart3,
  ArrowRight,
  Check,
  Loader2,
  ChevronRight,
  Star,
  Clock,
  Users,
  Layers,
  Zap,
  Code,
  Heart,
  Globe,
  Cpu,
  BookOpen,
  TrendingUp,
  Video,
  Music,
  Camera,
} from 'lucide-react';
import { SMART_TEMPLATES, SmartTemplate, presentationAIEngine } from '../../services/presentationAIEngine';

// ==================== ТИПЫ ====================

interface SmartTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: SmartTemplate, customization: TemplateCustomization) => void;
  language?: 'ru' | 'en';
}

interface TemplateCustomization {
  topic: string;
  audience: string;
  duration: number;
  style: string;
  generateWithAI: boolean;
}

// ==================== ДОПОЛНИТЕЛЬНЫЕ ШАБЛОНЫ ====================

// Preview images for templates (Unsplash)
const TEMPLATE_PREVIEW_IMAGES: Record<string, string> = {
  'pitch-deck': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop',
  'sales-deck': 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&h=400&fit=crop',
  'course-lesson': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop',
  'product-launch': 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&h=400&fit=crop',
  'quarterly-report': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
  'creative-portfolio': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop',
  'tech-demo': 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&h=400&fit=crop',
  'company-intro': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
  'webinar': 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=600&h=400&fit=crop',
  'case-study': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
  'thesis-defense': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop',
  'social-impact': 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop',
};

const EXTENDED_TEMPLATES: SmartTemplate[] = [
  ...SMART_TEMPLATES,
  {
    id: 'tech-demo',
    name: 'Демо продукта',
    nameEn: 'Product Demo',
    category: 'business',
    icon: '💻',
    preview: 'Show your product in action',
    slideStructure: [
      { type: 'title', purpose: 'Hook', aiHint: 'Проблема которую решаем' },
      { type: 'content', purpose: 'Overview', aiHint: 'Что делает продукт' },
      { type: 'stats', purpose: 'Benefits', aiHint: '3 главных выгоды' },
      { type: 'content-image', purpose: 'Feature 1', aiHint: 'Демо фичи' },
      { type: 'content-image', purpose: 'Feature 2', aiHint: 'Демо фичи 2' },
      { type: 'content-image', purpose: 'Feature 3', aiHint: 'Демо фичи 3' },
      { type: 'comparison', purpose: 'Before/After', aiHint: 'Сравнение' },
      { type: 'stats', purpose: 'Results', aiHint: 'Результаты клиентов' },
      { type: 'content', purpose: 'Pricing', aiHint: 'Тарифы' },
      { type: 'thank-you', purpose: 'Next Steps', aiHint: 'Как начать' },
    ],
    colorScheme: ['#3B82F6', '#6366F1', '#8B5CF6'],
    tags: ['demo', 'saas', 'product'],
  },
  {
    id: 'company-intro',
    name: 'О компании',
    nameEn: 'Company Overview',
    category: 'business',
    icon: '🏢',
    preview: 'Introduce your company professionally',
    slideStructure: [
      { type: 'title', purpose: 'Cover', aiHint: 'Название + слоган' },
      { type: 'content', purpose: 'Mission', aiHint: 'Миссия компании' },
      { type: 'timeline', purpose: 'History', aiHint: 'История развития' },
      { type: 'stats', purpose: 'Numbers', aiHint: 'Ключевые метрики' },
      { type: 'content', purpose: 'Services', aiHint: 'Что предлагаем' },
      { type: 'content-image', purpose: 'Clients', aiHint: 'Наши клиенты' },
      { type: 'team', purpose: 'Team', aiHint: 'Команда' },
      { type: 'quote', purpose: 'Values', aiHint: 'Ценности' },
      { type: 'content', purpose: 'Future', aiHint: 'Планы' },
      { type: 'thank-you', purpose: 'Contact', aiHint: 'Контакты' },
    ],
    colorScheme: ['#0EA5E9', '#14B8A6', '#10B981'],
    tags: ['company', 'corporate', 'about'],
  },
  {
    id: 'webinar',
    name: 'Вебинар',
    nameEn: 'Webinar',
    category: 'education',
    icon: '🎬',
    preview: 'Engaging online presentation',
    slideStructure: [
      { type: 'title', purpose: 'Welcome', aiHint: 'Название вебинара' },
      { type: 'content', purpose: 'Agenda', aiHint: 'План вебинара' },
      { type: 'content', purpose: 'About Speaker', aiHint: 'О спикере' },
      { type: 'content-image', purpose: 'Topic 1', aiHint: 'Первая тема' },
      { type: 'content-image', purpose: 'Topic 2', aiHint: 'Вторая тема' },
      { type: 'content-image', purpose: 'Topic 3', aiHint: 'Третья тема' },
      { type: 'stats', purpose: 'Key Insights', aiHint: 'Главные инсайты' },
      { type: 'content', purpose: 'Q&A Intro', aiHint: 'Вопросы' },
      { type: 'content', purpose: 'Resources', aiHint: 'Полезные ссылки' },
      { type: 'thank-you', purpose: 'Thank You', aiHint: 'Спасибо + CTA' },
    ],
    colorScheme: ['#EC4899', '#F472B6', '#F9A8D4'],
    tags: ['webinar', 'online', 'education'],
  },
  {
    id: 'case-study',
    name: 'Кейс-стади',
    nameEn: 'Case Study',
    category: 'marketing',
    icon: '📈',
    preview: 'Showcase your success story',
    slideStructure: [
      { type: 'title', purpose: 'Client Name', aiHint: 'Клиент + результат' },
      { type: 'content', purpose: 'Challenge', aiHint: 'Проблема клиента' },
      { type: 'content', purpose: 'Context', aiHint: 'Контекст ситуации' },
      { type: 'content-image', purpose: 'Solution', aiHint: 'Наше решение' },
      { type: 'content', purpose: 'Implementation', aiHint: 'Как внедряли' },
      { type: 'stats', purpose: 'Results', aiHint: 'Результаты с цифрами' },
      { type: 'quote', purpose: 'Testimonial', aiHint: 'Отзыв клиента' },
      { type: 'comparison', purpose: 'Before/After', aiHint: 'До и после' },
      { type: 'content', purpose: 'Lessons', aiHint: 'Выводы' },
      { type: 'thank-you', purpose: 'CTA', aiHint: 'Хотите так же?' },
    ],
    colorScheme: ['#22C55E', '#16A34A', '#15803D'],
    tags: ['case', 'success', 'roi'],
  },
  {
    id: 'thesis-defense',
    name: 'Защита диссертации',
    nameEn: 'Thesis Defense',
    category: 'education',
    icon: '🎓',
    preview: 'Academic thesis presentation',
    slideStructure: [
      { type: 'title', purpose: 'Title', aiHint: 'Тема + автор' },
      { type: 'content', purpose: 'Introduction', aiHint: 'Актуальность' },
      { type: 'content', purpose: 'Objectives', aiHint: 'Цели и задачи' },
      { type: 'content', purpose: 'Literature', aiHint: 'Обзор литературы' },
      { type: 'content', purpose: 'Methodology', aiHint: 'Методология' },
      { type: 'stats', purpose: 'Results 1', aiHint: 'Результаты ч.1' },
      { type: 'content-image', purpose: 'Results 2', aiHint: 'Графики/данные' },
      { type: 'content', purpose: 'Discussion', aiHint: 'Обсуждение' },
      { type: 'content', purpose: 'Conclusion', aiHint: 'Выводы' },
      { type: 'thank-you', purpose: 'Q&A', aiHint: 'Вопросы' },
    ],
    colorScheme: ['#1E3A8A', '#1E40AF', '#3B82F6'],
    tags: ['thesis', 'academic', 'defense'],
  },
  {
    id: 'social-impact',
    name: 'Социальный проект',
    nameEn: 'Social Impact',
    category: 'creative',
    icon: '🌍',
    preview: 'NGO and social initiatives',
    slideStructure: [
      { type: 'full-image', purpose: 'Impact Visual', aiHint: 'Эмоциональное фото' },
      { type: 'title', purpose: 'Mission', aiHint: 'Миссия проекта' },
      { type: 'stats', purpose: 'Problem Scale', aiHint: 'Масштаб проблемы' },
      { type: 'content', purpose: 'Our Approach', aiHint: 'Наш подход' },
      { type: 'timeline', purpose: 'Journey', aiHint: 'Путь проекта' },
      { type: 'stats', purpose: 'Impact', aiHint: 'Наше влияние' },
      { type: 'quote', purpose: 'Story', aiHint: 'История бенефициара' },
      { type: 'team', purpose: 'Team', aiHint: 'Команда' },
      { type: 'content', purpose: 'Future', aiHint: 'Планы' },
      { type: 'thank-you', purpose: 'Join Us', aiHint: 'Как помочь' },
    ],
    colorScheme: ['#059669', '#10B981', '#34D399'],
    tags: ['ngo', 'social', 'impact'],
  },
];

// Категории
const CATEGORIES = [
  { id: 'all', name: 'Все', nameEn: 'All', icon: <Layers size={18} /> },
  { id: 'startup', name: 'Стартапы', nameEn: 'Startup', icon: <Rocket size={18} /> },
  { id: 'business', name: 'Бизнес', nameEn: 'Business', icon: <Briefcase size={18} /> },
  { id: 'education', name: 'Образование', nameEn: 'Education', icon: <GraduationCap size={18} /> },
  { id: 'marketing', name: 'Маркетинг', nameEn: 'Marketing', icon: <Target size={18} /> },
  { id: 'creative', name: 'Креатив', nameEn: 'Creative', icon: <Palette size={18} /> },
  { id: 'report', name: 'Отчёты', nameEn: 'Reports', icon: <BarChart3 size={18} /> },
];

// Аудитории
const AUDIENCES = [
  { id: 'investors', name: 'Инвесторы', nameEn: 'Investors' },
  { id: 'customers', name: 'Клиенты', nameEn: 'Customers' },
  { id: 'team', name: 'Команда', nameEn: 'Team' },
  { id: 'executives', name: 'Руководство', nameEn: 'Executives' },
  { id: 'students', name: 'Студенты', nameEn: 'Students' },
  { id: 'general', name: 'Широкая аудитория', nameEn: 'General Public' },
];

// ==================== КОМПОНЕНТ ====================

export default function SmartTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
  language = 'ru',
}: SmartTemplatesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<SmartTemplate | null>(null);
  const [step, setStep] = useState<'browse' | 'customize'>('browse');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [customization, setCustomization] = useState<TemplateCustomization>({
    topic: '',
    audience: 'general',
    duration: 15,
    style: 'professional',
    generateWithAI: true,
  });

  const t = (ru: string, en: string) => language === 'ru' ? ru : en;

  // Фильтрация шаблонов
  const filteredTemplates = useMemo(() => {
    return EXTENDED_TEMPLATES.filter((template) => {
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Выбор шаблона
  const handleSelectTemplate = (template: SmartTemplate) => {
    setSelectedTemplate(template);
    setStep('customize');
  };

  // Генерация с AI
  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    
    setIsGenerating(true);
    try {
      // В реальном приложении здесь будет вызов AI
      await new Promise(resolve => setTimeout(resolve, 1500));
      onSelectTemplate(selectedTemplate, customization);
      onClose();
    } catch (error) {
      console.error('Error generating:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl max-h-[90vh] bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center gap-4">
              {step === 'customize' && (
                <button
                  onClick={() => setStep('browse')}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="text-purple-400" size={24} />
                  {step === 'browse' 
                    ? t('Выберите шаблон', 'Choose a Template')
                    : t('Настройте презентацию', 'Customize Your Presentation')
                  }
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {step === 'browse'
                    ? t('Профессиональные шаблоны с AI-генерацией контента', 'Professional templates with AI-powered content')
                    : t('AI создаст контент на основе ваших настроек', 'AI will generate content based on your preferences')
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          {step === 'browse' ? (
            <div className="flex-1 overflow-hidden flex">
              {/* Sidebar - Categories */}
              <div className="w-56 border-r border-gray-800 p-4 space-y-1 overflow-y-auto">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all
                      ${selectedCategory === category.id
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                  >
                    {category.icon}
                    <span className="text-sm font-medium">
                      {language === 'ru' ? category.name : category.nameEn}
                    </span>
                  </button>
                ))}
              </div>

              {/* Templates Grid */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Search */}
                <div className="relative mb-6">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('Поиск шаблонов...', 'Search templates...')}
                    className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <motion.button
                      key={template.id}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectTemplate(template)}
                      className="group relative p-4 rounded-2xl border-2 border-gray-800 hover:border-purple-500 bg-gray-800/50 text-left transition-all"
                    >
                      {/* Preview image */}
                      <div 
                        className="h-32 rounded-xl mb-4 overflow-hidden relative"
                        style={{
                          background: `linear-gradient(135deg, ${template.colorScheme[0]}20, ${template.colorScheme[1]}20)`,
                        }}
                      >
                        {TEMPLATE_PREVIEW_IMAGES[template.id] ? (
                          <img 
                            src={TEMPLATE_PREVIEW_IMAGES[template.id]} 
                            alt={template.name}
                            className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-5xl">
                            {template.icon}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-xl" />
                      </div>
                      
                      <h3 className="font-semibold text-white mb-1">
                        {language === 'ru' ? template.name : template.nameEn}
                      </h3>
                      <p className="text-xs text-gray-400 mb-3">
                        {template.preview}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Layers size={12} />
                          {template.slideStructure.length} {t('слайдов', 'slides')}
                        </span>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 rounded-2xl bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg flex items-center gap-2">
                          {t('Выбрать', 'Select')}
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Customization Step */
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Selected Template Preview */}
                {selectedTemplate && (
                  <div 
                    className="p-6 rounded-2xl flex items-center gap-6 overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${selectedTemplate.colorScheme[0]}20, ${selectedTemplate.colorScheme[1]}20)`,
                    }}
                  >
                    {TEMPLATE_PREVIEW_IMAGES[selectedTemplate.id] ? (
                      <img 
                        src={TEMPLATE_PREVIEW_IMAGES[selectedTemplate.id]} 
                        alt={selectedTemplate.name}
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="text-5xl flex-shrink-0">{selectedTemplate.icon}</div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {language === 'ru' ? selectedTemplate.name : selectedTemplate.nameEn}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {selectedTemplate.slideStructure.length} {t('слайдов', 'slides')} • {selectedTemplate.preview}
                      </p>
                    </div>
                  </div>
                )}

                {/* Topic Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Тема презентации *', 'Presentation Topic *')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customization.topic}
                      onChange={(e) => setCustomization({ ...customization, topic: e.target.value })}
                      placeholder={t('Например: Запуск нового мобильного приложения для фитнеса', 'e.g., Launching a new mobile fitness app')}
                      className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <button 
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                      title={t('AI подскажет тему', 'AI will suggest topics')}
                    >
                      <Sparkles size={18} />
                    </button>
                  </div>
                </div>

                {/* Audience Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Целевая аудитория', 'Target Audience')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {AUDIENCES.map((audience) => (
                      <button
                        key={audience.id}
                        onClick={() => setCustomization({ ...customization, audience: audience.id })}
                        className={`
                          p-3 rounded-xl border-2 transition-all text-sm
                          ${customization.audience === audience.id
                            ? 'border-purple-500 bg-purple-500/20 text-white'
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                          }
                        `}
                      >
                        {language === 'ru' ? audience.name : audience.nameEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Длительность презентации', 'Presentation Duration')}
                  </label>
                  <div className="flex items-center gap-4">
                    {[5, 10, 15, 20, 30].map((duration) => (
                      <button
                        key={duration}
                        onClick={() => setCustomization({ ...customization, duration })}
                        className={`
                          flex-1 p-3 rounded-xl border-2 transition-all
                          ${customization.duration === duration
                            ? 'border-purple-500 bg-purple-500/20 text-white'
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                          }
                        `}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Clock size={14} />
                          <span className="text-sm font-medium">{duration} {t('мин', 'min')}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Стиль подачи', 'Presentation Style')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'professional', name: t('Профессиональный', 'Professional'), icon: <Briefcase size={16} /> },
                      { id: 'creative', name: t('Креативный', 'Creative'), icon: <Palette size={16} /> },
                      { id: 'minimal', name: t('Минималистичный', 'Minimal'), icon: <Layers size={16} /> },
                      { id: 'bold', name: t('Смелый', 'Bold'), icon: <Zap size={16} /> },
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setCustomization({ ...customization, style: style.id })}
                        className={`
                          p-3 rounded-xl border-2 transition-all flex items-center gap-2
                          ${customization.style === style.id
                            ? 'border-purple-500 bg-purple-500/20 text-white'
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                          }
                        `}
                      >
                        {style.icon}
                        <span className="text-sm">{style.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Generation Toggle */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <label className="flex items-center gap-4 cursor-pointer">
                    <div 
                      className={`
                        w-12 h-6 rounded-full transition-all relative
                        ${customization.generateWithAI ? 'bg-purple-500' : 'bg-gray-700'}
                      `}
                      onClick={() => setCustomization({ ...customization, generateWithAI: !customization.generateWithAI })}
                    >
                      <div className={`
                        absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all
                        ${customization.generateWithAI ? 'left-6' : 'left-0.5'}
                      `} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-white font-medium">
                        <Sparkles size={18} className="text-purple-400" />
                        {t('Генерировать контент с AI', 'Generate Content with AI')}
                      </div>
                      <p className="text-sm text-gray-400">
                        {t('AI создаст тексты, заголовки и рекомендации для каждого слайда', 'AI will create texts, headlines and suggestions for each slide')}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-6 border-t border-gray-800 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {selectedTemplate && step === 'customize' && (
                <span className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  {t('Шаблон выбран', 'Template selected')}: {language === 'ru' ? selectedTemplate.name : selectedTemplate.nameEn}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                {t('Отмена', 'Cancel')}
              </button>
              {step === 'customize' && (
                <button
                  onClick={handleGenerate}
                  disabled={!customization.topic.trim() || isGenerating}
                  className={`
                    px-6 py-3 rounded-xl font-medium flex items-center gap-2
                    ${customization.topic.trim()
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/30'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {t('Генерация...', 'Generating...')}
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      {t('Создать презентацию', 'Create Presentation')}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
