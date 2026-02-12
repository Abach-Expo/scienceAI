import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Globe,
  Copy,
  Check,
  Lock,
  Unlock,
  Link,
  QrCode,
  Share2,
  Twitter,
  Linkedin,
  Mail,
  Code,
  ExternalLink,
} from 'lucide-react';

// QR Code SVG generator (simple implementation)
const QRCodeSVG = ({ value, size }: { value: string; size: number }) => {
  // Generate a simple visual representation
  const hash = value.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  const pattern: boolean[][] = [];
  
  for (let i = 0; i < 21; i++) {
    pattern[i] = [];
    for (let j = 0; j < 21; j++) {
      // Create pseudo-random pattern based on URL hash
      const seed = (hash + i * 21 + j) % 100;
      pattern[i][j] = seed > 35;
      
      // Always include finder patterns (corners)
      if ((i < 7 && j < 7) || (i < 7 && j > 13) || (i > 13 && j < 7)) {
        const isEdge = i === 0 || i === 6 || j === 0 || j === 6 || 
                       (i >= 2 && i <= 4 && j >= 2 && j <= 4);
        pattern[i][j] = isEdge;
      }
    }
  }
  
  const cellSize = size / 25;
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" />
      {pattern.map((row, i) =>
        row.map((cell, j) =>
          cell && (
            <rect
              key={`${i}-${j}`}
              x={(j + 2) * cellSize}
              y={(i + 2) * cellSize}
              width={cellSize}
              height={cellSize}
              fill="black"
            />
          )
        )
      )}
    </svg>
  );
};

// Storage for published presentations
const PUBLISH_STORAGE_KEY = 'science-ai-published-presentations';

interface PublishedPresentation {
  id: string;
  slug: string;
  title: string;
  visibility: 'public' | 'unlisted' | 'password';
  password?: string;
  settings: {
    allowDownload: boolean;
    showAuthor: boolean;
    showDate: boolean;
    allowComments: boolean;
    autoPlay: boolean;
    loopSlides: boolean;
  };
  publishedAt: string;
  viewCount: number;
}

const getPublishedData = (presentationId: string): PublishedPresentation | null => {
  try {
    const data = localStorage.getItem(PUBLISH_STORAGE_KEY);
    if (!data) return null;
    const all = JSON.parse(data);
    return all[presentationId] || null;
  } catch {
    return null;
  }
};

const savePublishedData = (data: PublishedPresentation) => {
  try {
    const stored = localStorage.getItem(PUBLISH_STORAGE_KEY);
    const all = stored ? JSON.parse(stored) : {};
    all[data.id] = data;
    localStorage.setItem(PUBLISH_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save published data:', e);
  }
};

const removePublishedData = (presentationId: string) => {
  try {
    const stored = localStorage.getItem(PUBLISH_STORAGE_KEY);
    if (!stored) return;
    const all = JSON.parse(stored);
    delete all[presentationId];
    localStorage.setItem(PUBLISH_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to remove published data:', e);
  }
};

interface PublishWebsiteProps {
  isOpen: boolean;
  onClose: () => void;
  presentationId: string;
  presentationTitle: string;
}

export default function PublishWebsite({
  isOpen,
  onClose,
  presentationId,
  presentationTitle
}: PublishWebsiteProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'password'>('unlisted');
  const [password, setPassword] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [embedCode, setEmbedCode] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState({
    allowDownload: false,
    showAuthor: true,
    showDate: true,
    allowComments: false,
    autoPlay: false,
    loopSlides: false
  });
  
  // Load existing published data
  const [publishedData, setPublishedData] = useState<PublishedPresentation | null>(null);
  
  useEffect(() => {
    if (isOpen && presentationId) {
      const data = getPublishedData(presentationId);
      if (data) {
        setPublishedData(data);
        setVisibility(data.visibility);
        setPassword(data.password || '');
        setCustomSlug(data.slug);
        setSettings(data.settings);
      } else {
        setPublishedData(null);
        setCustomSlug('');
      }
    }
  }, [isOpen, presentationId]);
  
  const isPublished = publishedData !== null;
  const baseUrl = `${window.location.origin}/view/`;
  const slug = customSlug || presentationId.slice(0, 8);
  const publishedUrl = `${baseUrl}${slug}`;
  
  const handlePublish = async () => {
    setIsPublishing(true);
    
    // Small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const data: PublishedPresentation = {
      id: presentationId,
      slug,
      title: presentationTitle,
      visibility,
      password: visibility === 'password' ? password : undefined,
      settings,
      publishedAt: new Date().toISOString(),
      viewCount: publishedData?.viewCount || 0
    };
    
    savePublishedData(data);
    setPublishedData(data);
    setIsPublishing(false);
  };
  
  const handleUnpublish = async () => {
    setIsPublishing(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    removePublishedData(presentationId);
    setPublishedData(null);
    setIsPublishing(false);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const getEmbedCode = () => {
    return `<iframe src="${publishedUrl}/embed" width="100%" height="500" frameborder="0" allowfullscreen></iframe>`;
  };
  
  const shareLinks = [
    { 
      name: 'Twitter', 
      icon: Twitter, 
      color: 'bg-sky-500',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(publishedUrl)}&text=${encodeURIComponent(presentationTitle)}`
    },
    { 
      name: 'LinkedIn', 
      icon: Linkedin, 
      color: 'bg-blue-600',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publishedUrl)}`
    },
    { 
      name: 'Email', 
      icon: Mail, 
      color: 'bg-gray-500',
      url: `mailto:?subject=${encodeURIComponent(presentationTitle)}&body=${encodeURIComponent(`Посмотрите мою презентацию: ${publishedUrl}`)}`
    },
  ];

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
          className="w-full max-w-2xl max-h-[90vh] overflow-hidden glass rounded-3xl border border-border-primary shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-border-primary bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Globe className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Опубликовать как сайт</h2>
                  <p className="text-sm text-text-muted">Как в Gamma — поделитесь ссылкой</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl hover:bg-background-tertiary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Published Status */}
            {isPublished ? (
              <div className="space-y-6">
                {/* URL Section */}
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-green-400">
                      <Check size={18} />
                      <span className="font-medium">Опубликовано</span>
                    </div>
                    <button
                      onClick={() => window.open(publishedUrl, '_blank')}
                      className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
                    >
                      Открыть <ExternalLink size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={publishedUrl}
                      readOnly
                      className="flex-1 px-4 py-2 rounded-lg bg-background-tertiary border border-border-primary text-text-primary font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(publishedUrl)}
                      className="px-4 py-2 rounded-lg bg-green-500 text-white flex items-center gap-2 hover:bg-green-600 transition-colors"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Скопировано!' : 'Копировать'}
                    </button>
                  </div>
                </div>
                
                {/* Share Options */}
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-3">Поделиться</h3>
                  <div className="flex gap-2">
                    {shareLinks.map(link => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 py-3 rounded-xl ${link.color} text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
                      >
                        <link.icon size={18} />
                        {link.name}
                      </a>
                    ))}
                  </div>
                </div>
                
                {/* QR Code & Embed */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className={`p-4 rounded-xl border transition-colors ${
                      showQR 
                        ? 'bg-accent-primary/20 border-accent-primary' 
                        : 'bg-background-tertiary border-border-primary hover:border-accent-primary'
                    }`}
                  >
                    <QrCode size={24} className={showQR ? 'text-accent-primary' : 'text-text-muted'} />
                    <p className="text-sm font-medium text-text-primary mt-2">QR-код</p>
                    <p className="text-xs text-text-muted">Для офлайн-мероприятий</p>
                  </button>
                  <button
                    onClick={() => setEmbedCode(!embedCode)}
                    className={`p-4 rounded-xl border transition-colors ${
                      embedCode 
                        ? 'bg-accent-primary/20 border-accent-primary' 
                        : 'bg-background-tertiary border-border-primary hover:border-accent-primary'
                    }`}
                  >
                    <Code size={24} className={embedCode ? 'text-accent-primary' : 'text-text-muted'} />
                    <p className="text-sm font-medium text-text-primary mt-2">Embed-код</p>
                    <p className="text-xs text-text-muted">Для сайтов и блогов</p>
                  </button>
                </div>
                
                {/* QR Code Display */}
                {showQR && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-6 rounded-xl bg-white flex flex-col items-center"
                  >
                    <QRCodeSVG value={publishedUrl} size={200} />
                    <p className="text-sm text-gray-600 mt-3">{publishedUrl}</p>
                  </motion.div>
                )}
                
                {/* Embed Code Display */}
                {embedCode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <textarea
                      value={getEmbedCode()}
                      readOnly
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-background-tertiary border border-border-primary text-text-primary font-mono text-sm resize-none"
                    />
                    <button
                      onClick={() => copyToClipboard(getEmbedCode())}
                      className="text-sm text-accent-primary hover:text-accent-primary/80"
                    >
                      Скопировать код
                    </button>
                  </motion.div>
                )}
                
                {/* Unpublish */}
                <button
                  onClick={handleUnpublish}
                  disabled={isPublishing}
                  className="w-full py-3 rounded-xl border border-red-500/50 text-red-400 font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  {isPublishing ? 'Снимаем с публикации...' : 'Снять с публикации'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Custom URL */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    URL презентации
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-sm">{baseUrl}</span>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder={presentationId.slice(0, 8)}
                      className="flex-1 px-4 py-2 rounded-lg bg-background-tertiary border border-border-primary text-text-primary placeholder-text-muted focus:border-accent-primary transition-all"
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-1">Только латинские буквы, цифры и дефисы</p>
                </div>
                
                {/* Visibility */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">
                    Видимость
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'public', label: 'Публичная', desc: 'Все могут найти и просматривать', icon: Globe },
                      { id: 'unlisted', label: 'По ссылке', desc: 'Только те, у кого есть ссылка', icon: Link },
                      { id: 'password', label: 'С паролем', desc: 'Требуется пароль для просмотра', icon: Lock },
                    ].map(option => (
                      <button
                        key={option.id}
                        onClick={() => setVisibility(option.id as 'public' | 'unlisted' | 'password')}
                        className={`w-full p-3 rounded-xl text-left transition-colors flex items-center gap-3 ${
                          visibility === option.id
                            ? 'bg-accent-primary/20 border border-accent-primary'
                            : 'bg-background-tertiary border border-transparent hover:border-border-primary'
                        }`}
                      >
                        <option.icon size={18} className={visibility === option.id ? 'text-accent-primary' : 'text-text-muted'} />
                        <div>
                          <p className={`text-sm font-medium ${visibility === option.id ? 'text-accent-primary' : 'text-text-primary'}`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-text-muted">{option.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {visibility === 'password' && (
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Введите пароль"
                      className="w-full mt-3 px-4 py-2 rounded-lg bg-background-tertiary border border-border-primary text-text-primary placeholder-text-muted focus:border-accent-primary transition-all"
                    />
                  )}
                </div>
                
                {/* Additional Settings */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">
                    Настройки
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: 'allowDownload', label: 'Разрешить скачивание' },
                      { key: 'showAuthor', label: 'Показывать автора' },
                      { key: 'showDate', label: 'Показывать дату' },
                      { key: 'allowComments', label: 'Разрешить комментарии' },
                      { key: 'autoPlay', label: 'Автопроигрывание слайдов' },
                      { key: 'loopSlides', label: 'Зациклить слайды' },
                    ].map(option => (
                      <label
                        key={option.key}
                        className="flex items-center justify-between p-3 rounded-xl bg-background-tertiary cursor-pointer hover:bg-background-secondary transition-colors"
                      >
                        <span className="text-sm text-text-primary">{option.label}</span>
                        <input
                          type="checkbox"
                          checked={settings[option.key as keyof typeof settings]}
                          onChange={(e) => setSettings({ ...settings, [option.key]: e.target.checked })}
                          className="w-4 h-4 rounded accent-accent-primary"
                        />
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Publish Button */}
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || (visibility === 'password' && !password)}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Публикуем...
                    </>
                  ) : (
                    <>
                      <Globe size={20} />
                      Опубликовать презентацию
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-border-primary bg-background-secondary/50">
            <p className="text-sm text-text-muted text-center">
              🌐 Публикация как сайт — ключевая функция Gamma. Теперь в Science AI!
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
