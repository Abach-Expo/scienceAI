// =================================================================================
// 📦 CONTENT BLOCKS - Canva/Gamma Style Drag & Drop Content Blocks
// Компоненты контента для слайдов с AI-генерацией
// =================================================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Edit3,
  Sparkles,
  Type,
  List,
  BarChart2,
  Quote,
  Image as ImageIcon,
  GitBranch,
  Users,
  Target,
  Layers,
  Table,
  Code,
  Video,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Wand2,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react';

// ==================== ТИПЫ ====================

export interface ContentBlock {
  id: string;
  type: 'heading' | 'text' | 'bullets' | 'stats' | 'quote' | 'image' | 'timeline' | 'comparison' | 'team' | 'cta' | 'code' | 'table' | 'chart';
  content: BlockContent;
  style?: BlockStyle;
  aiGenerated?: boolean;
}

export type BlockContent = 
  | HeadingContent 
  | TextContent 
  | BulletsContent 
  | StatsContent 
  | QuoteContent 
  | ImageContent 
  | TimelineContent 
  | ComparisonContent 
  | TeamContent 
  | CTAContent
  | CodeContent;

interface HeadingContent {
  text: string;
  level: 1 | 2 | 3;
}

interface TextContent {
  text: string;
}

interface BulletsContent {
  items: string[];
  icon?: 'check' | 'arrow' | 'dot' | 'number';
}

interface StatsContent {
  items: {
    value: string;
    label: string;
    trend?: 'up' | 'down' | 'neutral';
    icon?: string;
  }[];
}

interface QuoteContent {
  text: string;
  author: string;
  role?: string;
  avatar?: string;
}

interface ImageContent {
  url?: string;
  alt?: string;
  prompt?: string;
  fit?: 'cover' | 'contain' | 'fill';
}

interface TimelineContent {
  items: {
    date: string;
    title: string;
    description?: string;
    icon?: string;
  }[];
}

interface ComparisonContent {
  left: {
    title: string;
    points: string[];
    highlight?: boolean;
  };
  right: {
    title: string;
    points: string[];
    highlight?: boolean;
  };
}

interface TeamContent {
  members: {
    name: string;
    role: string;
    avatar?: string;
    social?: string;
  }[];
}

interface CTAContent {
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
}

interface CodeContent {
  code: string;
  language: string;
}

interface BlockStyle {
  alignment?: 'left' | 'center' | 'right';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  background?: string;
}

interface ContentBlocksEditorProps {
  blocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
  onGenerateWithAI: (blockId: string, context: string) => void;
  theme?: 'light' | 'dark';
  language?: 'ru' | 'en';
}

// ==================== БЛОК TEMPLATES ====================

export const DEFAULT_BLOCKS: Record<string, Omit<ContentBlock, 'id'>> = {
  heading: {
    type: 'heading',
    content: { text: 'Заголовок', level: 1 } as HeadingContent,
  },
  text: {
    type: 'text',
    content: { text: 'Текстовый блок с описанием' } as TextContent,
  },
  bullets: {
    type: 'bullets',
    content: { items: ['Пункт 1', 'Пункт 2', 'Пункт 3'], icon: 'check' } as BulletsContent,
  },
  stats: {
    type: 'stats',
    content: {
      items: [
        { value: '95%', label: 'Точность', trend: 'up' },
        { value: '2.5x', label: 'Рост', trend: 'up' },
        { value: '24/7', label: 'Поддержка', trend: 'neutral' },
      ],
    } as StatsContent,
  },
  quote: {
    type: 'quote',
    content: {
      text: 'Великая цитата, которая вдохновляет',
      author: 'Автор',
      role: 'CEO Компании',
    } as QuoteContent,
  },
  timeline: {
    type: 'timeline',
    content: {
      items: [
        { date: '2023', title: 'Старт', description: 'Начало пути' },
        { date: '2024', title: 'Рост', description: 'Масштабирование' },
        { date: '2025', title: 'Лидерство', description: 'Топ рынка' },
      ],
    } as TimelineContent,
  },
  comparison: {
    type: 'comparison',
    content: {
      left: { title: 'Было', points: ['Проблема 1', 'Проблема 2', 'Проблема 3'] },
      right: { title: 'Стало', points: ['Решение 1', 'Решение 2', 'Решение 3'], highlight: true },
    } as ComparisonContent,
  },
  team: {
    type: 'team',
    content: {
      members: [
        { name: 'Иван Иванов', role: 'CEO' },
        { name: 'Мария Петрова', role: 'CTO' },
        { name: 'Алексей Сидоров', role: 'CMO' },
      ],
    } as TeamContent,
  },
  cta: {
    type: 'cta',
    content: {
      title: 'Начните сейчас',
      subtitle: 'Бесплатный пробный период 14 дней',
      buttonText: 'Попробовать',
    } as CTAContent,
  },
};

// ==================== КОМПОНЕНТЫ БЛОКОВ ====================

// Рендер иконки блока
const BlockIcon = ({ type }: { type: string }) => {
  const icons: Record<string, React.ReactNode> = {
    heading: <Type size={16} />,
    text: <Type size={16} />,
    bullets: <List size={16} />,
    stats: <BarChart2 size={16} />,
    quote: <Quote size={16} />,
    image: <ImageIcon size={16} />,
    timeline: <GitBranch size={16} />,
    comparison: <Layers size={16} />,
    team: <Users size={16} />,
    cta: <Target size={16} />,
    code: <Code size={16} />,
    table: <Table size={16} />,
    chart: <BarChart2 size={16} />,
  };
  return <>{icons[type] || <Type size={16} />}</>;
};

// Названия блоков
const getBlockName = (type: string, lang: string) => {
  const names: Record<string, { ru: string; en: string }> = {
    heading: { ru: 'Заголовок', en: 'Heading' },
    text: { ru: 'Текст', en: 'Text' },
    bullets: { ru: 'Список', en: 'Bullet List' },
    stats: { ru: 'Статистика', en: 'Statistics' },
    quote: { ru: 'Цитата', en: 'Quote' },
    image: { ru: 'Изображение', en: 'Image' },
    timeline: { ru: 'Таймлайн', en: 'Timeline' },
    comparison: { ru: 'Сравнение', en: 'Comparison' },
    team: { ru: 'Команда', en: 'Team' },
    cta: { ru: 'Призыв к действию', en: 'Call to Action' },
    code: { ru: 'Код', en: 'Code' },
    table: { ru: 'Таблица', en: 'Table' },
    chart: { ru: 'График', en: 'Chart' },
  };
  return names[type]?.[lang === 'ru' ? 'ru' : 'en'] || type;
};

// ==================== РЕДАКТОР БЛОКА ====================

interface BlockEditorProps {
  block: ContentBlock;
  onUpdate: (content: BlockContent) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onGenerateAI: () => void;
  isDark: boolean;
  language: string;
}

function BlockEditor({
  block,
  onUpdate,
  onDelete,
  onDuplicate,
  onGenerateAI,
  isDark,
  language,
}: BlockEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const dragControls = useDragControls();

  const bgColor = isDark ? 'bg-gray-800/50' : 'bg-gray-50';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedColor = isDark ? 'text-gray-400' : 'text-gray-500';

  const t = (ru: string, en: string) => language === 'ru' ? ru : en;

  // Рендер контента в зависимости от типа
  const renderBlockContent = () => {
    switch (block.type) {
      case 'heading':
        const headingContent = block.content as HeadingContent;
        return (
          <input
            type="text"
            value={headingContent.text}
            onChange={(e) => onUpdate({ ...headingContent, text: e.target.value })}
            className={`w-full bg-transparent ${textColor} font-bold text-xl focus:outline-none`}
            placeholder={t('Введите заголовок...', 'Enter heading...')}
          />
        );

      case 'text':
        const textContent = block.content as TextContent;
        return (
          <textarea
            value={textContent.text}
            onChange={(e) => onUpdate({ ...textContent, text: e.target.value })}
            rows={3}
            className={`w-full bg-transparent ${textColor} resize-none focus:outline-none`}
            placeholder={t('Введите текст...', 'Enter text...')}
          />
        );

      case 'bullets':
        const bulletsContent = block.content as BulletsContent;
        return (
          <div className="space-y-2">
            {bulletsContent.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className={mutedColor}>•</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...bulletsContent.items];
                    newItems[index] = e.target.value;
                    onUpdate({ ...bulletsContent, items: newItems });
                  }}
                  className={`flex-1 bg-transparent ${textColor} focus:outline-none`}
                  placeholder={t(`Пункт ${index + 1}`, `Item ${index + 1}`)}
                />
                <button
                  onClick={() => {
                    const newItems = bulletsContent.items.filter((_, i) => i !== index);
                    onUpdate({ ...bulletsContent, items: newItems });
                  }}
                  className={`p-1 ${mutedColor} hover:text-red-400`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => onUpdate({ ...bulletsContent, items: [...bulletsContent.items, ''] })}
              className={`flex items-center gap-1 text-sm ${mutedColor} hover:text-purple-400`}
            >
              <Plus size={14} />
              {t('Добавить пункт', 'Add item')}
            </button>
          </div>
        );

      case 'stats':
        const statsContent = block.content as StatsContent;
        return (
          <div className="grid grid-cols-3 gap-4">
            {statsContent.items.map((stat, index) => (
              <div key={index} className={`p-3 rounded-lg ${isDark ? 'bg-gray-900/50' : 'bg-white'}`}>
                <input
                  type="text"
                  value={stat.value}
                  onChange={(e) => {
                    const newItems = [...statsContent.items];
                    newItems[index] = { ...stat, value: e.target.value };
                    onUpdate({ ...statsContent, items: newItems });
                  }}
                  className={`w-full bg-transparent ${textColor} font-bold text-2xl text-center focus:outline-none`}
                  placeholder="0"
                />
                <input
                  type="text"
                  value={stat.label}
                  onChange={(e) => {
                    const newItems = [...statsContent.items];
                    newItems[index] = { ...stat, label: e.target.value };
                    onUpdate({ ...statsContent, items: newItems });
                  }}
                  className={`w-full bg-transparent ${mutedColor} text-sm text-center focus:outline-none`}
                  placeholder={t('Метка', 'Label')}
                />
                <div className="flex justify-center mt-2">
                  {[
                    { value: 'up', icon: <TrendingUp size={14} />, color: 'text-green-500' },
                    { value: 'neutral', icon: <Minus size={14} />, color: 'text-gray-500' },
                    { value: 'down', icon: <TrendingDown size={14} />, color: 'text-red-500' },
                  ].map((trend) => (
                    <button
                      key={trend.value}
                      onClick={() => {
                        const newItems = [...statsContent.items];
                        newItems[index] = { ...stat, trend: trend.value as 'up' | 'down' | 'neutral' };
                        onUpdate({ ...statsContent, items: newItems });
                      }}
                      className={`p-1 ${stat.trend === trend.value ? trend.color : mutedColor}`}
                    >
                      {trend.icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'quote':
        const quoteContent = block.content as QuoteContent;
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Quote size={24} className="text-purple-400 flex-shrink-0" />
              <textarea
                value={quoteContent.text}
                onChange={(e) => onUpdate({ ...quoteContent, text: e.target.value })}
                rows={2}
                className={`flex-1 bg-transparent ${textColor} italic text-lg resize-none focus:outline-none`}
                placeholder={t('Введите цитату...', 'Enter quote...')}
              />
            </div>
            <div className="flex gap-2 pl-8">
              <input
                type="text"
                value={quoteContent.author}
                onChange={(e) => onUpdate({ ...quoteContent, author: e.target.value })}
                className={`bg-transparent ${textColor} font-medium focus:outline-none`}
                placeholder={t('Автор', 'Author')}
              />
              <span className={mutedColor}>—</span>
              <input
                type="text"
                value={quoteContent.role || ''}
                onChange={(e) => onUpdate({ ...quoteContent, role: e.target.value })}
                className={`bg-transparent ${mutedColor} focus:outline-none`}
                placeholder={t('Должность', 'Role')}
              />
            </div>
          </div>
        );

      case 'timeline':
        const timelineContent = block.content as TimelineContent;
        return (
          <div className="space-y-3">
            {timelineContent.items.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  {index < timelineContent.items.length - 1 && (
                    <div className="w-0.5 h-full bg-purple-500/30 my-1" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={item.date}
                    onChange={(e) => {
                      const newItems = [...timelineContent.items];
                      newItems[index] = { ...item, date: e.target.value };
                      onUpdate({ ...timelineContent, items: newItems });
                    }}
                    className={`bg-transparent ${mutedColor} text-sm focus:outline-none`}
                    placeholder={t('Дата', 'Date')}
                  />
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const newItems = [...timelineContent.items];
                      newItems[index] = { ...item, title: e.target.value };
                      onUpdate({ ...timelineContent, items: newItems });
                    }}
                    className={`w-full bg-transparent ${textColor} font-medium focus:outline-none`}
                    placeholder={t('Заголовок', 'Title')}
                  />
                </div>
                <button
                  onClick={() => {
                    const newItems = timelineContent.items.filter((_, i) => i !== index);
                    onUpdate({ ...timelineContent, items: newItems });
                  }}
                  className={`p-1 ${mutedColor} hover:text-red-400`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => onUpdate({ 
                ...timelineContent, 
                items: [...timelineContent.items, { date: '', title: '' }] 
              })}
              className={`flex items-center gap-1 text-sm ${mutedColor} hover:text-purple-400 ml-6`}
            >
              <Plus size={14} />
              {t('Добавить событие', 'Add event')}
            </button>
          </div>
        );

      case 'cta':
        const ctaContent = block.content as CTAContent;
        return (
          <div className="text-center space-y-3 p-4">
            <input
              type="text"
              value={ctaContent.title}
              onChange={(e) => onUpdate({ ...ctaContent, title: e.target.value })}
              className={`w-full bg-transparent ${textColor} font-bold text-xl text-center focus:outline-none`}
              placeholder={t('Заголовок CTA...', 'CTA Title...')}
            />
            <input
              type="text"
              value={ctaContent.subtitle || ''}
              onChange={(e) => onUpdate({ ...ctaContent, subtitle: e.target.value })}
              className={`w-full bg-transparent ${mutedColor} text-center focus:outline-none`}
              placeholder={t('Подзаголовок...', 'Subtitle...')}
            />
            <input
              type="text"
              value={ctaContent.buttonText || ''}
              onChange={(e) => onUpdate({ ...ctaContent, buttonText: e.target.value })}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium focus:outline-none"
              placeholder={t('Текст кнопки', 'Button text')}
            />
          </div>
        );

      default:
        return (
          <div className={`${mutedColor} text-sm`}>
            {t('Неизвестный тип блока', 'Unknown block type')}
          </div>
        );
    }
  };

  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={dragControls}
      className={`
        group relative rounded-xl border ${borderColor} ${bgColor}
        transition-all hover:border-purple-500/50
      `}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 p-3 border-b ${borderColor}`}>
        <button
          onPointerDown={(e) => dragControls.start(e)}
          className={`p-1 cursor-grab active:cursor-grabbing ${mutedColor} hover:text-purple-400`}
        >
          <GripVertical size={16} />
        </button>
        
        <div className={`flex items-center gap-2 flex-1 ${mutedColor}`}>
          <BlockIcon type={block.type} />
          <span className="text-sm font-medium">{getBlockName(block.type, language)}</span>
          {block.aiGenerated && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-400">
              AI
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onGenerateAI}
            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} text-purple-400`}
            title={t('Сгенерировать с AI', 'Generate with AI')}
          >
            <Sparkles size={14} />
          </button>
          <button
            onClick={onDuplicate}
            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} ${mutedColor}`}
            title={t('Дублировать', 'Duplicate')}
          >
            <Copy size={14} />
          </button>
          <button
            onClick={onDelete}
            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} text-red-400`}
            title={t('Удалить', 'Delete')}
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} ${mutedColor}`}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4"
          >
            {renderBlockContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export default function ContentBlocksEditor({
  blocks,
  onBlocksChange,
  onGenerateWithAI,
  theme = 'dark',
  language = 'ru',
}: ContentBlocksEditorProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-gray-900/50' : 'bg-gray-100';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedColor = isDark ? 'text-gray-400' : 'text-gray-500';

  const t = (ru: string, en: string) => language === 'ru' ? ru : en;

  // Добавление блока
  const handleAddBlock = (type: string) => {
    const template = DEFAULT_BLOCKS[type];
    if (!template) return;

    const newBlock: ContentBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...template,
    };

    onBlocksChange([...blocks, newBlock]);
    setShowAddMenu(false);
  };

  // Обновление блока
  const handleUpdateBlock = (blockId: string, content: BlockContent) => {
    onBlocksChange(
      blocks.map((b) => (b.id === blockId ? { ...b, content } : b))
    );
  };

  // Удаление блока
  const handleDeleteBlock = (blockId: string) => {
    onBlocksChange(blocks.filter((b) => b.id !== blockId));
  };

  // Дублирование блока
  const handleDuplicateBlock = (blockId: string) => {
    const blockToDuplicate = blocks.find((b) => b.id === blockId);
    if (!blockToDuplicate) return;

    const newBlock: ContentBlock = {
      ...blockToDuplicate,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const index = blocks.findIndex((b) => b.id === blockId);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onBlocksChange(newBlocks);
  };

  // Типы блоков для меню добавления
  const blockTypes = [
    { type: 'heading', icon: <Type size={18} />, name: t('Заголовок', 'Heading') },
    { type: 'text', icon: <Type size={18} />, name: t('Текст', 'Text') },
    { type: 'bullets', icon: <List size={18} />, name: t('Список', 'Bullet List') },
    { type: 'stats', icon: <BarChart2 size={18} />, name: t('Статистика', 'Statistics') },
    { type: 'quote', icon: <Quote size={18} />, name: t('Цитата', 'Quote') },
    { type: 'timeline', icon: <GitBranch size={18} />, name: t('Таймлайн', 'Timeline') },
    { type: 'comparison', icon: <Layers size={18} />, name: t('Сравнение', 'Comparison') },
    { type: 'team', icon: <Users size={18} />, name: t('Команда', 'Team') },
    { type: 'cta', icon: <Target size={18} />, name: t('Призыв', 'CTA') },
  ];

  return (
    <div className="space-y-4">
      {/* Blocks List */}
      <Reorder.Group
        axis="y"
        values={blocks}
        onReorder={onBlocksChange}
        className="space-y-3"
      >
        {blocks.map((block) => (
          <BlockEditor
            key={block.id}
            block={block}
            onUpdate={(content) => handleUpdateBlock(block.id, content)}
            onDelete={() => handleDeleteBlock(block.id)}
            onDuplicate={() => handleDuplicateBlock(block.id)}
            onGenerateAI={() => onGenerateWithAI(block.id, JSON.stringify(block.content))}
            isDark={isDark}
            language={language}
          />
        ))}
      </Reorder.Group>

      {/* Empty State */}
      {blocks.length === 0 && (
        <div className={`text-center py-12 rounded-xl border-2 border-dashed ${borderColor}`}>
          <Layers size={48} className={`mx-auto mb-4 ${mutedColor}`} />
          <p className={`${textColor} font-medium mb-2`}>
            {t('Нет блоков контента', 'No content blocks')}
          </p>
          <p className={`text-sm ${mutedColor} mb-4`}>
            {t('Добавьте блоки или сгенерируйте с AI', 'Add blocks or generate with AI')}
          </p>
          <button
            onClick={() => setShowAddMenu(true)}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium flex items-center gap-2 mx-auto"
          >
            <Plus size={18} />
            {t('Добавить блок', 'Add Block')}
          </button>
        </div>
      )}

      {/* Add Block Button */}
      {blocks.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className={`
              w-full py-3 rounded-xl border-2 border-dashed ${borderColor}
              ${mutedColor} hover:border-purple-500 hover:text-purple-400
              transition-all flex items-center justify-center gap-2
            `}
          >
            <Plus size={18} />
            {t('Добавить блок', 'Add Block')}
          </button>

          {/* Add Menu Dropdown */}
          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`
                  absolute bottom-full left-0 right-0 mb-2 p-2
                  ${isDark ? 'bg-gray-900' : 'bg-white'} rounded-xl border ${borderColor}
                  shadow-2xl z-20
                `}
              >
                <div className="grid grid-cols-3 gap-1">
                  {blockTypes.map((block) => (
                    <button
                      key={block.type}
                      onClick={() => handleAddBlock(block.type)}
                      className={`
                        flex flex-col items-center gap-1 p-3 rounded-lg
                        ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}
                        transition-colors
                      `}
                    >
                      <span className={mutedColor}>{block.icon}</span>
                      <span className={`text-xs ${textColor}`}>{block.name}</span>
                    </button>
                  ))}
                </div>
                
                {/* AI Generate All */}
                <div className={`mt-2 pt-2 border-t ${borderColor}`}>
                  <button
                    onClick={() => {
                      // Generate all blocks with AI
                      setShowAddMenu(false);
                    }}
                    className="w-full p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 
                      text-purple-400 flex items-center justify-center gap-2 hover:from-purple-500/30 hover:to-pink-500/30"
                  >
                    <Sparkles size={16} />
                    <span className="text-sm font-medium">{t('Сгенерировать с AI', 'Generate with AI')}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
