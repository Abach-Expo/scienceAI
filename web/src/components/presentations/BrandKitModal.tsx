import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Palette, 
  Type, 
  Sparkles, 
  Check, 
  Loader2,
  Building2,
  Briefcase,
  Save,
  Trash2,
  Copy,
  Eye,
  RefreshCw
} from 'lucide-react';
import { createServerOpenAI } from '../../services/aiServer';

interface BrandKit {
  id: string;
  name: string;
  companyName: string;
  industry: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  logoUrl?: string;
  createdAt: string;
}

interface BrandKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBrandKit: (brandKit: BrandKit) => void;
}

const INDUSTRIES = [
  { id: 'tech', name: 'Технологии', icon: '💻', colors: ['#6366f1', '#8b5cf6', '#ec4899'] },
  { id: 'finance', name: 'Финансы', icon: '💰', colors: ['#10b981', '#059669', '#0d9488'] },
  { id: 'healthcare', name: 'Здравоохранение', icon: '🏥', colors: ['#06b6d4', '#0891b2', '#14b8a6'] },
  { id: 'education', name: 'Образование', icon: '🎓', colors: ['#3b82f6', '#6366f1', '#8b5cf6'] },
  { id: 'retail', name: 'Ритейл', icon: '🛍️', colors: ['#f97316', '#ea580c', '#dc2626'] },
  { id: 'food', name: 'Еда и напитки', icon: '🍔', colors: ['#ef4444', '#f97316', '#eab308'] },
  { id: 'travel', name: 'Путешествия', icon: '✈️', colors: ['#0ea5e9', '#06b6d4', '#14b8a6'] },
  { id: 'realestate', name: 'Недвижимость', icon: '🏠', colors: ['#84cc16', '#22c55e', '#10b981'] },
  { id: 'entertainment', name: 'Развлечения', icon: '🎬', colors: ['#a855f7', '#d946ef', '#ec4899'] },
  { id: 'sports', name: 'Спорт', icon: '⚽', colors: ['#22c55e', '#16a34a', '#15803d'] },
  { id: 'fashion', name: 'Мода', icon: '👗', colors: ['#ec4899', '#db2777', '#be185d'] },
  { id: 'consulting', name: 'Консалтинг', icon: '📊', colors: ['#1e40af', '#1d4ed8', '#2563eb'] },
];

const FONT_OPTIONS = [
  { name: 'Inter', style: 'modern' },
  { name: 'Poppins', style: 'friendly' },
  { name: 'Roboto', style: 'clean' },
  { name: 'Open Sans', style: 'readable' },
  { name: 'Montserrat', style: 'elegant' },
  { name: 'Lato', style: 'professional' },
  { name: 'Playfair Display', style: 'luxury' },
  { name: 'Merriweather', style: 'classic' },
  { name: 'Oswald', style: 'bold' },
  { name: 'Raleway', style: 'stylish' },
  { name: 'Source Sans Pro', style: 'corporate' },
  { name: 'Ubuntu', style: 'tech' },
  { name: 'Nunito', style: 'soft' },
  { name: 'PT Sans', style: 'neutral' },
  { name: 'Work Sans', style: 'geometric' },
];

export default function BrandKitModal({ isOpen, onClose, onApplyBrandKit }: BrandKitModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create');
  const [companyName, setCompanyName] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  
  // Manual mode
  const [manualMode, setManualMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
  const [accentColor, setAccentColor] = useState('#ec4899');
  const [backgroundColor, setBackgroundColor] = useState('#0a0a0f');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontPrimary, setFontPrimary] = useState('Inter');
  const [fontSecondary, setFontSecondary] = useState('Poppins');
  
  // Saved brand kits
  const [savedKits, setSavedKits] = useState<BrandKit[]>(() => {
    try {
      const saved = localStorage.getItem('science-ai-brand-kits');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Generate brand kit with AI
  const handleGenerateAI = async () => {
    if (!companyName.trim() || !selectedIndustry) return;
    
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      const industryInfo = INDUSTRIES.find(i => i.id === selectedIndustry);
      
      const prompt = `Создай цветовую палитру для бренда.
Компания: ${companyName}
Индустрия: ${industryInfo?.name || selectedIndustry}

Верни ТОЛЬКО JSON:
{
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex (тёмный)",
    "text": "#hex (светлый)"
  },
  "fonts": {
    "heading": "название из: Inter, Poppins, Roboto, Montserrat, Playfair Display, Oswald",
    "body": "название из: Inter, Poppins, Roboto, Open Sans, Lato, Nunito"
  }
}`;
      
      const openai = createServerOpenAI();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты генератор брендинга. Отвечай ТОЛЬКО JSON без markdown и комментариев.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });
      
      const content = response.choices[0]?.message?.content || '';
      
      // Parse JSON
      let parsed;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON');
        }
      } catch {
        // Fallback to industry colors
        parsed = {
          colors: {
            primary: industryInfo?.colors[0] || '#6366f1',
            secondary: industryInfo?.colors[1] || '#8b5cf6',
            accent: industryInfo?.colors[2] || '#ec4899',
            background: '#0f0f1a',
            text: '#ffffff'
          },
          fonts: { heading: 'Inter', body: 'Poppins' }
        };
      }
      
      // Update fields
      setPrimaryColor(parsed.colors.primary);
      setSecondaryColor(parsed.colors.secondary);
      setAccentColor(parsed.colors.accent);
      setBackgroundColor(parsed.colors.background);
      setTextColor(parsed.colors.text);
      setFontPrimary(parsed.fonts.heading);
      setFontSecondary(parsed.fonts.body);
      setManualMode(true);
      
    } catch (error) {
      console.error('Brand kit generation error:', error);
      setGenerationError('Ошибка генерации. Используем цвета индустрии.');
      handleQuickGenerate();
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Quick generate based on industry
  const handleQuickGenerate = () => {
    const industryInfo = INDUSTRIES.find(i => i.id === selectedIndustry);
    if (!industryInfo) return;
    
    setPrimaryColor(industryInfo.colors[0]);
    setSecondaryColor(industryInfo.colors[1]);
    setAccentColor(industryInfo.colors[2]);
    setBackgroundColor('#0f0f1a');
    setTextColor('#ffffff');
    
    const fonts: Record<string, [string, string]> = {
      tech: ['Inter', 'Roboto'],
      finance: ['Source Sans Pro', 'Lato'],
      healthcare: ['Open Sans', 'Nunito'],
      education: ['Poppins', 'Open Sans'],
      consulting: ['Montserrat', 'Source Sans Pro'],
      fashion: ['Playfair Display', 'Raleway'],
      entertainment: ['Oswald', 'Poppins'],
    };
    
    const [heading, body] = fonts[selectedIndustry] || ['Inter', 'Poppins'];
    setFontPrimary(heading);
    setFontSecondary(body);
    setManualMode(true);
  };
  
  const handleSaveKit = () => {
    const newKit: BrandKit = {
      id: `kit-${Date.now()}`,
      name: companyName || 'Мой бренд',
      companyName: companyName || 'Мой бренд',
      industry: selectedIndustry,
      colors: {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
        background: backgroundColor,
        text: textColor,
      },
      fonts: {
        heading: fontPrimary,
        body: fontSecondary,
      },
      createdAt: new Date().toISOString(),
    };
    
    const updated = [newKit, ...savedKits];
    setSavedKits(updated);
    localStorage.setItem('science-ai-brand-kits', JSON.stringify(updated));
    setActiveTab('saved');
  };
  
  const handleDeleteKit = (id: string) => {
    const updated = savedKits.filter(k => k.id !== id);
    setSavedKits(updated);
    localStorage.setItem('science-ai-brand-kits', JSON.stringify(updated));
  };
  
  const handleApplyKit = (kit: BrandKit) => {
    onApplyBrandKit(kit);
    onClose();
  };
  
  const handleApplyCurrent = () => {
    const kit: BrandKit = {
      id: `kit-${Date.now()}`,
      name: companyName || 'Текущий стиль',
      companyName: companyName || 'Текущий стиль',
      industry: selectedIndustry,
      colors: {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
        background: backgroundColor,
        text: textColor,
      },
      fonts: {
        heading: fontPrimary,
        body: fontSecondary,
      },
      createdAt: new Date().toISOString(),
    };
    onApplyBrandKit(kit);
    onClose();
  };
  
  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopied(color);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[90vh] overflow-hidden glass rounded-3xl border border-border-primary shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-border-primary bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-pink-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center">
                  <Palette className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Brand Kit</h2>
                  <p className="text-sm text-text-muted">AI-генерация фирменного стиля</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl hover:bg-background-tertiary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'create'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-background-tertiary'
                }`}
              >
                <Sparkles size={14} className="inline mr-2" />
                Создать
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'saved'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-background-tertiary'
                }`}
              >
                <Save size={14} className="inline mr-2" />
                Сохранённые ({savedKits.length})
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {activeTab === 'create' && (
              <div className="space-y-6">
                {/* AI Generation */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-fuchsia-500/5 via-purple-500/5 to-pink-500/5 border border-fuchsia-500/20">
                  <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                    <Sparkles className="text-fuchsia-400" size={18} />
                    AI Генерация Brand Kit
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        <Building2 size={14} className="inline mr-1" />
                        Название компании
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Например: TechCorp"
                        className="w-full px-4 py-3 rounded-xl bg-background-tertiary border border-border-primary text-text-primary placeholder-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">
                        <Briefcase size={14} className="inline mr-1" />
                        Индустрия
                      </label>
                      <select
                        value={selectedIndustry}
                        onChange={(e) => setSelectedIndustry(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-background-tertiary border border-border-primary text-text-primary focus:border-accent-primary transition-all"
                      >
                        <option value="">Выберите индустрию</option>
                        {INDUSTRIES.map(ind => (
                          <option key={ind.id} value={ind.id}>
                            {ind.icon} {ind.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {generationError && (
                    <div className="mb-4 p-3 rounded-lg bg-amber-500/20 text-amber-400 text-sm">
                      {generationError}
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleGenerateAI}
                      disabled={!companyName.trim() || !selectedIndustry || isGenerating}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-fuchsia-500/30 transition-all"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          AI генерирует...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Сгенерировать с AI
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleQuickGenerate}
                      disabled={!selectedIndustry}
                      className="px-6 py-3 rounded-xl bg-background-tertiary border border-border-primary text-text-primary font-medium flex items-center gap-2 disabled:opacity-50 hover:border-accent-primary transition-all"
                    >
                      <RefreshCw size={18} />
                      Быстро
                    </button>
                  </div>
                </div>
                
                {/* Toggle manual mode */}
                <button
                  onClick={() => setManualMode(!manualMode)}
                  className="text-sm text-text-muted hover:text-accent-primary transition-colors"
                >
                  {manualMode ? '← Скрыть настройки' : '→ Настроить вручную'}
                </button>
                
                {/* Manual Configuration */}
                {manualMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6"
                  >
                    {/* Colors */}
                    <div>
                      <h4 className="font-medium text-text-primary mb-3">🎨 Цвета</h4>
                      <div className="grid grid-cols-5 gap-4">
                        {[
                          { label: 'Primary', value: primaryColor, set: setPrimaryColor },
                          { label: 'Secondary', value: secondaryColor, set: setSecondaryColor },
                          { label: 'Accent', value: accentColor, set: setAccentColor },
                          { label: 'Background', value: backgroundColor, set: setBackgroundColor },
                          { label: 'Text', value: textColor, set: setTextColor },
                        ].map(color => (
                          <div key={color.label} className="text-center group">
                            <div className="relative">
                              <input
                                type="color"
                                value={color.value}
                                onChange={(e) => color.set(e.target.value)}
                                className="w-16 h-16 rounded-xl cursor-pointer border-2 border-border-primary hover:border-accent-primary transition-colors"
                              />
                              <button
                                onClick={() => copyColor(color.value)}
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background-primary border border-border-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                title="Копировать"
                              >
                                {copied === color.value ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                            <p className="text-xs text-text-muted mt-2">{color.label}</p>
                            <p className="text-xs text-text-muted font-mono">{color.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Fonts */}
                    <div>
                      <h4 className="font-medium text-text-primary mb-3">
                        <Type size={16} className="inline mr-2" />
                        Шрифты
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-text-muted mb-2">Заголовки</label>
                          <select
                            value={fontPrimary}
                            onChange={(e) => setFontPrimary(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-background-tertiary border border-border-primary text-text-primary"
                          >
                            {FONT_OPTIONS.map(font => (
                              <option key={font.name} value={font.name}>
                                {font.name} ({font.style})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-text-muted mb-2">Текст</label>
                          <select
                            value={fontSecondary}
                            onChange={(e) => setFontSecondary(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-background-tertiary border border-border-primary text-text-primary"
                          >
                            {FONT_OPTIONS.map(font => (
                              <option key={font.name} value={font.name}>
                                {font.name} ({font.style})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Preview */}
                    <div>
                      <h4 className="font-medium text-text-primary mb-3">
                        <Eye size={16} className="inline mr-2" />
                        Превью слайда
                      </h4>
                      <div 
                        className="rounded-2xl p-6 border border-border-primary transition-all"
                        style={{ backgroundColor }}
                      >
                        <h1 
                          className="text-2xl font-bold mb-2"
                          style={{ color: textColor, fontFamily: fontPrimary }}
                        >
                          {companyName || 'Название компании'}
                        </h1>
                        <p 
                          className="mb-4"
                          style={{ color: textColor, fontFamily: fontSecondary, opacity: 0.8 }}
                        >
                          Пример текста презентации с вашим фирменным стилем.
                        </p>
                        <div className="flex gap-3">
                          <button
                            className="px-4 py-2 rounded-lg font-medium"
                            style={{ backgroundColor: primaryColor, color: '#fff' }}
                          >
                            Primary
                          </button>
                          <button
                            className="px-4 py-2 rounded-lg font-medium"
                            style={{ backgroundColor: secondaryColor, color: '#fff' }}
                          >
                            Secondary
                          </button>
                          <button
                            className="px-4 py-2 rounded-lg font-medium"
                            style={{ backgroundColor: accentColor, color: '#fff' }}
                          >
                            Accent
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleApplyCurrent}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all"
                      >
                        <Check size={18} />
                        Применить
                      </button>
                      <button
                        onClick={handleSaveKit}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                      >
                        <Save size={18} />
                        Сохранить
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            
            {activeTab === 'saved' && (
              <div className="space-y-4">
                {savedKits.length === 0 ? (
                  <div className="text-center py-12">
                    <Palette className="mx-auto text-text-muted mb-4" size={48} />
                    <p className="text-text-muted">Нет сохранённых Brand Kit</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="mt-4 px-6 py-2 rounded-xl bg-accent-primary text-white"
                    >
                      Создать
                    </button>
                  </div>
                ) : (
                  savedKits.map(kit => (
                    <motion.div
                      key={kit.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-background-tertiary border border-border-primary hover:border-accent-primary/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex -space-x-2">
                            {[kit.colors.primary, kit.colors.secondary, kit.colors.accent].map((color, i) => (
                              <div
                                key={i}
                                className="w-8 h-8 rounded-full border-2 border-background-primary"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <div>
                            <h4 className="font-medium text-text-primary">{kit.name}</h4>
                            <p className="text-sm text-text-muted">
                              {INDUSTRIES.find(i => i.id === kit.industry)?.icon} {INDUSTRIES.find(i => i.id === kit.industry)?.name} • 
                              {new Date(kit.createdAt).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApplyKit(kit)}
                            className="px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-primary/90 transition-colors flex items-center gap-2"
                          >
                            <Check size={14} />
                            Применить
                          </button>
                          <button
                            onClick={() => handleDeleteKit(kit.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
