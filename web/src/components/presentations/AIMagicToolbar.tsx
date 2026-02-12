// =================================================================================
// ✨ AI MAGIC TOOLBAR - Canva/Gamma Style AI Tools
// Контекстная панель с AI-инструментами для презентаций
// =================================================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Wand2,
  Palette,
  Type,
  Image as ImageIcon,
  Layout,
  Brain,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Zap,
  RefreshCw,
  Maximize2,
  Minimize2,
  Copy,
  Volume2,
  Clock,
  MessageSquare,
  Check,
  X,
  ArrowRight,
  Mic,
  PenTool,
  Layers,
  AlignLeft,
  List,
  BarChart2,
  Quote,
  Users,
  GitBranch,
  Target,
  TrendingUp,
  BookOpen,
  FileText,
} from 'lucide-react';
import { presentationAIEngine, SmartSuggestion, AISlideContent } from '../../services/presentationAIEngine';

// ==================== ТИПЫ ====================

interface AIMagicToolbarProps {
  currentSlide: {
    id: string;
    title: string;
    content?: string;
    bulletPoints?: string[];
    layout: string;
    imageUrl?: string;
  };
  onApplySuggestion: (updatedSlide: Partial<AISlideContent>) => void;
  onGenerateImage: (prompt: string) => void;
  onLayoutChange: (layout: string) => void;
  onAddBlock: (blockType: string) => void;
  isGenerating?: boolean;
  position?: 'right' | 'bottom';
  theme?: 'light' | 'dark';
  language?: 'ru' | 'en';
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  labelEn: string;
  description: string;
  action: () => void;
  highlight?: boolean;
}

// ==================== КОМПОНЕНТ ====================

export default function AIMagicToolbar({
  currentSlide,
  onApplySuggestion,
  onGenerateImage,
  onLayoutChange,
  onAddBlock,
  isGenerating = false,
  position = 'right',
  theme = 'dark',
  language = 'ru',
}: AIMagicToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'generate' | 'design' | 'blocks'>('suggestions');
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [improvedContent, setImprovedContent] = useState<AISlideContent | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  const t = (ru: string, en: string) => language === 'ru' ? ru : en;

  // Загрузка suggestion при изменении слайда
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!currentSlide.title && !currentSlide.content) return;
      
      setIsLoadingSuggestions(true);
      try {
        const newSuggestions = await presentationAIEngine.getSmartSuggestions({
          title: currentSlide.title,
          content: currentSlide.content,
          bullets: currentSlide.bulletPoints,
          layout: currentSlide.layout,
        });
        setSuggestions(newSuggestions);
      } catch (error) {
        console.error('Error getting suggestions:', error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    loadSuggestions();
  }, [currentSlide.id, currentSlide.title]);

  // Улучшение слайда
  const handleImproveSlide = useCallback(async () => {
    setIsGeneratingContent(true);
    try {
      const result = await presentationAIEngine.improveSlide({
        title: currentSlide.title,
        content: currentSlide.content,
        bullets: currentSlide.bulletPoints,
        layout: currentSlide.layout,
        language,
      });
      setImprovedContent(result.improved);
      setShowPreview(true);
    } catch (error) {
      console.error('Error improving slide:', error);
    } finally {
      setIsGeneratingContent(false);
    }
  }, [currentSlide, language]);

  // Генерация заметок спикера
  const handleGenerateSpeakerNotes = useCallback(async () => {
    setIsGeneratingContent(true);
    try {
      const result = await presentationAIEngine.generateSpeakerNotes({
        title: currentSlide.title,
        content: currentSlide.content,
        bullets: currentSlide.bulletPoints,
        duration: 45,
        language,
      });
      onApplySuggestion({
        speakerNotes: `${result.openingLine}\n\n${result.keyPoints.map(p => `• ${p.point}`).join('\n')}\n\n→ ${result.transitionToNext}`,
      });
    } catch (error) {
      console.error('Error generating notes:', error);
    } finally {
      setIsGeneratingContent(false);
    }
  }, [currentSlide, language, onApplySuggestion]);

  // Генерация изображения
  const handleGenerateImagePrompt = useCallback(async () => {
    setIsGeneratingContent(true);
    try {
      const result = await presentationAIEngine.generateImagePrompt({
        title: currentSlide.title,
        content: currentSlide.content,
        style: 'modern',
        mood: 'professional',
      });
      setImagePrompt(result.mainPrompt);
      onGenerateImage(result.unsplashQuery);
    } catch (error) {
      console.error('Error generating image prompt:', error);
    } finally {
      setIsGeneratingContent(false);
    }
  }, [currentSlide, onGenerateImage]);

  // Быстрые действия
  const quickActions: QuickAction[] = [
    {
      id: 'improve',
      icon: <Wand2 size={16} />,
      label: 'Улучшить',
      labelEn: 'Improve',
      description: 'AI улучшит текст и структуру',
      action: handleImproveSlide,
      highlight: true,
    },
    {
      id: 'image',
      icon: <ImageIcon size={16} />,
      label: 'Изображение',
      labelEn: 'Add Image',
      description: 'AI подберёт картинку',
      action: handleGenerateImagePrompt,
    },
    {
      id: 'notes',
      icon: <MessageSquare size={16} />,
      label: 'Заметки',
      labelEn: 'Notes',
      description: 'Сгенерировать speaker notes',
      action: handleGenerateSpeakerNotes,
    },
    {
      id: 'simplify',
      icon: <Minimize2 size={16} />,
      label: 'Упростить',
      labelEn: 'Simplify',
      description: 'Сократить текст на 50%',
      action: () => onApplySuggestion({ content: 'simplified' }),
    },
  ];

  // Блоки контента
  const contentBlocks = [
    { id: 'text', icon: <Type size={18} />, label: t('Текст', 'Text') },
    { id: 'bullets', icon: <List size={18} />, label: t('Список', 'List') },
    { id: 'stats', icon: <BarChart2 size={18} />, label: t('Статистика', 'Stats') },
    { id: 'quote', icon: <Quote size={18} />, label: t('Цитата', 'Quote') },
    { id: 'timeline', icon: <GitBranch size={18} />, label: t('Таймлайн', 'Timeline') },
    { id: 'comparison', icon: <Layers size={18} />, label: t('Сравнение', 'Compare') },
    { id: 'team', icon: <Users size={18} />, label: t('Команда', 'Team') },
    { id: 'cta', icon: <Target size={18} />, label: t('Призыв', 'CTA') },
  ];

  // Макеты
  const layouts = [
    { id: 'content', label: t('Контент', 'Content'), icon: <AlignLeft size={18} /> },
    { id: 'content-image', label: t('Текст + Фото', 'Text + Image'), icon: <Layout size={18} /> },
    { id: 'stats', label: t('Статистика', 'Stats'), icon: <TrendingUp size={18} /> },
    { id: 'quote', label: t('Цитата', 'Quote'), icon: <Quote size={18} /> },
    { id: 'full-image', label: t('Полное фото', 'Full Image'), icon: <Maximize2 size={18} /> },
    { id: 'two-column', label: t('Две колонки', 'Two Column'), icon: <Layers size={18} /> },
  ];

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-gray-900/95' : 'bg-white/95';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedColor = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <motion.div
      initial={{ opacity: 0, x: position === 'right' ? 20 : 0, y: position === 'bottom' ? 20 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      className={`
        ${position === 'right' ? 'w-72' : 'w-full'}
        ${bgColor} backdrop-blur-xl rounded-2xl border ${borderColor}
        shadow-2xl overflow-hidden
      `}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h3 className={`font-semibold ${textColor}`}>
              {t('AI Помощник', 'AI Assistant')}
            </h3>
            <p className={`text-xs ${mutedColor}`}>
              {t('Улучшите слайд одним кликом', 'Enhance your slide instantly')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1.5 rounded-lg hover:bg-gray-800/50 ${mutedColor}`}
        >
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Quick Actions */}
            <div className="p-3 space-y-2">
              <p className={`text-xs font-medium ${mutedColor} uppercase tracking-wider px-1`}>
                {t('Быстрые действия', 'Quick Actions')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <motion.button
                    key={action.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={action.action}
                    disabled={isGenerating || isGeneratingContent}
                    className={`
                      p-3 rounded-xl border text-left transition-all
                      ${action.highlight
                        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50 hover:border-purple-400'
                        : `${isDark ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`
                      }
                      ${(isGenerating || isGeneratingContent) && 'opacity-50 cursor-not-allowed'}
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={action.highlight ? 'text-purple-400' : mutedColor}>
                        {action.icon}
                      </span>
                      <span className={`text-sm font-medium ${textColor}`}>
                        {language === 'ru' ? action.label : action.labelEn}
                      </span>
                    </div>
                    <p className={`text-xs ${mutedColor} line-clamp-1`}>
                      {action.description}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className={`flex border-b ${borderColor}`}>
              {[
                { id: 'suggestions', label: t('Советы', 'Tips'), icon: <Lightbulb size={14} /> },
                { id: 'design', label: t('Дизайн', 'Design'), icon: <Palette size={14} /> },
                { id: 'blocks', label: t('Блоки', 'Blocks'), icon: <Layers size={14} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all
                    ${activeTab === tab.id
                      ? `${textColor} border-b-2 border-purple-500`
                      : `${mutedColor} hover:${textColor}`
                    }
                  `}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-3 max-h-[400px] overflow-y-auto">
              {/* Suggestions Tab */}
              {activeTab === 'suggestions' && (
                <div className="space-y-2">
                  {isLoadingSuggestions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-purple-500" size={24} />
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-3 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} border ${borderColor}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`
                                px-1.5 py-0.5 rounded text-[10px] font-medium uppercase
                                ${suggestion.priority === 'high' ? 'bg-red-500/20 text-red-400' : 
                                  suggestion.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 
                                  'bg-green-500/20 text-green-400'}
                              `}>
                                {suggestion.priority}
                              </span>
                            </div>
                            <p className={`text-sm ${textColor} mb-1`}>
                              {suggestion.suggestion}
                            </p>
                            <p className={`text-xs ${mutedColor}`}>
                              {suggestion.currentIssue}
                            </p>
                            {suggestion.preview && (
                              <p className={`text-xs text-purple-400 mt-2 italic`}>
                                "{suggestion.preview}"
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (suggestion.improvement) {
                                onApplySuggestion({ content: suggestion.improvement });
                              }
                            }}
                            className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className={`text-center py-8 ${mutedColor}`}>
                      <Lightbulb size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {t('Слайд выглядит отлично!', 'Slide looks great!')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Design Tab */}
              {activeTab === 'design' && (
                <div className="space-y-4">
                  <div>
                    <p className={`text-xs font-medium ${mutedColor} uppercase tracking-wider mb-2`}>
                      {t('Выбрать макет', 'Choose Layout')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {layouts.map((layout) => (
                        <button
                          key={layout.id}
                          onClick={() => onLayoutChange(layout.id)}
                          className={`
                            p-3 rounded-xl border transition-all text-left
                            ${currentSlide.layout === layout.id
                              ? 'border-purple-500 bg-purple-500/20'
                              : `${isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'}`
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <span className={currentSlide.layout === layout.id ? 'text-purple-400' : mutedColor}>
                              {layout.icon}
                            </span>
                            <span className={`text-xs ${textColor}`}>{layout.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image Generation */}
                  <div>
                    <p className={`text-xs font-medium ${mutedColor} uppercase tracking-wider mb-2`}>
                      {t('Генерация изображения', 'Generate Image')}
                    </p>
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} border ${borderColor}`}>
                      <textarea
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder={t('Опишите изображение...', 'Describe the image...')}
                        className={`
                          w-full bg-transparent text-sm ${textColor} placeholder:${mutedColor}
                          resize-none focus:outline-none
                        `}
                        rows={3}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => onGenerateImage(imagePrompt)}
                          disabled={!imagePrompt.trim()}
                          className={`
                            flex-1 py-2 rounded-lg text-xs font-medium transition-all
                            ${imagePrompt.trim()
                              ? 'bg-purple-500 text-white hover:bg-purple-600'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }
                          `}
                        >
                          <span className="flex items-center justify-center gap-1">
                            <ImageIcon size={12} />
                            {t('Сгенерировать', 'Generate')}
                          </span>
                        </button>
                        <button
                          onClick={handleGenerateImagePrompt}
                          disabled={isGeneratingContent}
                          className={`
                            px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}
                            ${mutedColor}
                          `}
                        >
                          <Wand2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Blocks Tab */}
              {activeTab === 'blocks' && (
                <div className="space-y-2">
                  <p className={`text-xs ${mutedColor} mb-3`}>
                    {t('Перетащите блок на слайд или кликните для добавления', 'Drag a block to the slide or click to add')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {contentBlocks.map((block) => (
                      <motion.button
                        key={block.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onAddBlock(block.id)}
                        className={`
                          p-4 rounded-xl border transition-all text-center
                          ${isDark ? 'bg-gray-800/50 border-gray-700 hover:border-purple-500/50 hover:bg-gray-800' : 'bg-gray-50 border-gray-200 hover:border-purple-300'}
                        `}
                      >
                        <div className={`mx-auto mb-2 ${mutedColor}`}>
                          {block.icon}
                        </div>
                        <span className={`text-xs ${textColor}`}>{block.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
              {showPreview && improvedContent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 p-4"
                >
                  <div className={`h-full ${bgColor} rounded-xl overflow-hidden flex flex-col`}>
                    <div className={`p-4 border-b ${borderColor} flex items-center justify-between`}>
                      <h4 className={`font-semibold ${textColor}`}>
                        {t('Предпросмотр улучшений', 'Preview Improvements')}
                      </h4>
                      <button
                        onClick={() => setShowPreview(false)}
                        className={`p-1 rounded-lg hover:bg-gray-800 ${mutedColor}`}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                      <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                        <p className={`text-xs ${mutedColor} uppercase mb-2`}>
                          {t('Новый заголовок', 'New Title')}
                        </p>
                        <p className={`text-lg font-bold ${textColor}`}>
                          {improvedContent.title}
                        </p>
                      </div>
                      {improvedContent.content && (
                        <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                          <p className={`text-xs ${mutedColor} uppercase mb-2`}>
                            {t('Контент', 'Content')}
                          </p>
                          <p className={`text-sm ${textColor}`}>
                            {improvedContent.content}
                          </p>
                        </div>
                      )}
                      {improvedContent.bulletPoints && improvedContent.bulletPoints.length > 0 && (
                        <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                          <p className={`text-xs ${mutedColor} uppercase mb-2`}>
                            {t('Пункты', 'Bullet Points')}
                          </p>
                          <ul className="space-y-1">
                            {improvedContent.bulletPoints.map((point, i) => (
                              <li key={i} className={`text-sm ${textColor}`}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className={`p-4 border-t ${borderColor} flex gap-2`}>
                      <button
                        onClick={() => setShowPreview(false)}
                        className={`flex-1 py-2.5 rounded-xl border ${borderColor} ${textColor} text-sm font-medium`}
                      >
                        {t('Отмена', 'Cancel')}
                      </button>
                      <button
                        onClick={() => {
                          onApplySuggestion(improvedContent);
                          setShowPreview(false);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium"
                      >
                        {t('Применить', 'Apply')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className={`p-3 border-t ${borderColor}`}>
              <button
                onClick={handleImproveSlide}
                disabled={isGenerating || isGeneratingContent}
                className={`
                  w-full py-3 rounded-xl font-medium text-sm transition-all
                  bg-gradient-to-r from-purple-500 to-pink-500 text-white
                  hover:shadow-lg hover:shadow-purple-500/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                `}
              >
                {isGeneratingContent ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('AI думает...', 'AI is thinking...')}
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {t('✨ Улучшить весь слайд с AI', '✨ Enhance Entire Slide with AI')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
