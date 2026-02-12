import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Slide } from '../../pages/presentations/types';
import { 
  X, 
  Upload,
  FileText,
  File,
  Link,
  Globe,
  Sparkles,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { createServerOpenAI } from '../../services/aiServer';
import { API_URL } from '../../config';
import { getAuthorizationHeaders } from '../../services/apiClient';

interface ImportContentProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (slides: Partial<Slide>[]) => void;
}

export default function ImportContent({
  isOpen,
  onClose,
  onImport
}: ImportContentProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'text'>('file');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const supportedFormats = [
    { ext: 'pptx', name: 'PowerPoint', icon: FileText, color: 'text-orange-400' },
    { ext: 'pdf', name: 'PDF', icon: File, color: 'text-red-400' },
    { ext: 'docx', name: 'Word', icon: FileText, color: 'text-blue-400' },
    { ext: 'md', name: 'Markdown', icon: FileText, color: 'text-text-muted' },
    { ext: 'txt', name: 'Текст', icon: FileText, color: 'text-text-muted' },
  ];

  const handleFileSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pptx', 'pdf', 'docx', 'md', 'txt'].includes(ext || '')) {
      setError('Неподдерживаемый формат файла');
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    
    try {
      let slides: Partial<Slide>[] = [];
      let content = '';
      
      if (activeTab === 'file' && selectedFile) {
        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        
        // Read file content based on type
        if (ext === 'txt' || ext === 'md') {
          content = await selectedFile.text();
        } else if (ext === 'pptx') {
          // Parse PPTX - extract text from XML inside zip
          try {
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(selectedFile);
            const slideTexts: string[] = [];
            
            // Get all slide XML files
            const slideFiles = Object.keys(zip.files)
              .filter(f => f.match(/ppt\/slides\/slide\d+\.xml/))
              .sort();
            
            for (const slideFile of slideFiles) {
              const xmlContent = await zip.files[slideFile].async('text');
              // Extract text from XML
              const textMatches = xmlContent.match(/<a:t>([^<]*)<\/a:t>/g);
              if (textMatches) {
                const slideText = textMatches
                  .map(m => m.replace(/<\/?a:t>/g, ''))
                  .join(' ');
                slideTexts.push(slideText);
              }
            }
            content = slideTexts.join('\n\n---SLIDE---\n\n');
          } catch {
            // Fallback: read as text
            content = `Презентация: ${selectedFile.name}`;
          }
        } else if (ext === 'docx') {
          // Parse DOCX - extract text from document.xml
          try {
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(selectedFile);
            const docXml = await zip.files['word/document.xml']?.async('text');
            if (docXml) {
              const textMatches = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
              if (textMatches) {
                content = textMatches
                  .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, ''))
                  .join(' ');
              }
            }
          } catch {
            content = `Документ: ${selectedFile.name}`;
          }
        } else if (ext === 'pdf') {
          // For PDF we use AI to structure content from description
          content = `PDF файл: ${selectedFile.name}, размер: ${(selectedFile.size / 1024).toFixed(1)}KB`;
        }
        
      } else if (activeTab === 'url' && url.trim()) {
        // Fetch URL content
        try {
          const response = await fetch(`${API_URL}/proxy/fetch-url?url=${encodeURIComponent(url)}`, {
            headers: getAuthorizationHeaders(),
          });
          const data = await response.json();
          
          // Extract text from HTML
          const doc = new DOMParser().parseFromString(data.contents, 'text/html');
          
          // Remove scripts and styles
          doc.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
          
          // Get main content
          const article = doc.querySelector('article, main, .content, .post') || doc.body;
          content = article?.textContent?.replace(/\s+/g, ' ').trim() || '';
          
          // Get title
          const title = doc.querySelector('h1, title')?.textContent?.trim();
          if (title) {
            content = `Заголовок: ${title}\n\n${content}`;
          }
        } catch {
          throw new Error('Не удалось загрузить страницу. Попробуйте скопировать текст вручную.');
        }
        
      } else if (activeTab === 'text' && text.trim()) {
        content = text;
      }
      
      if (!content.trim()) {
        throw new Error('Не удалось извлечь контент');
      }
      
      // Use AI to structure content into slides
      const openai = createServerOpenAI();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Ты конвертируешь текст в слайды презентации. 
Верни JSON массив слайдов:
[{"title": "Заголовок", "content": "Текст слайда", "background": "#1a1a2e"}]
Используй чередующиеся темные фоны: #1a1a2e, #16213e, #0f3460.
Максимум 10 слайдов. Отвечай ТОЛЬКО JSON.`
          },
          {
            role: 'user',
            content: `Создай слайды из этого контента:\n\n${content.slice(0, 8000)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
      
      const aiContent = response.choices[0]?.message?.content || '';
      
      // Parse AI response
      try {
        const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          slides = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback: split content manually
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 20);
        slides = paragraphs.slice(0, 10).map((p, i) => ({
          title: p.split(/[.!?\n]/)[0]?.slice(0, 60) || `Слайд ${i + 1}`,
          content: p.slice(0, 300),
          background: { type: 'solid' as const, value: ['#1a1a2e', '#16213e', '#0f3460'][i % 3] }
        }));
      }
      
      if (slides.length === 0) {
        throw new Error('Не удалось создать слайды');
      }
      
      setSuccess(true);
      setTimeout(() => {
        onImport(slides);
        onClose();
      }, 1000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при импорте');
    } finally {
      setIsImporting(false);
    }
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
          className="w-full max-w-2xl max-h-[90vh] overflow-hidden glass rounded-3xl border border-border-primary shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-border-primary bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Upload className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Импорт контента</h2>
                  <p className="text-sm text-text-muted">Превратите любой контент в презентацию</p>
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
              {[
                { id: 'file', label: 'Файл', icon: FileText, desc: 'PPTX, PDF, DOCX' },
                { id: 'url', label: 'URL', icon: Link, desc: 'Веб-страница' },
                { id: 'text', label: 'Текст', icon: FileText, desc: 'Вставить текст' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as 'file' | 'url' | 'text');
                    setSelectedFile(null);
                    setError(null);
                  }}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-accent-primary text-white'
                      : 'text-text-secondary hover:bg-background-tertiary'
                  }`}
                >
                  <tab.icon size={18} className="mx-auto mb-1" />
                  <div>{tab.label}</div>
                  <div className={`text-xs ${activeTab === tab.id ? 'text-white/70' : 'text-text-muted'}`}>
                    {tab.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
            {success ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check size={40} className="text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Успешно!</h3>
                <p className="text-text-muted">Контент импортирован и конвертирован в слайды</p>
              </motion.div>
            ) : (
              <>
                {activeTab === 'file' && (
                  <div className="space-y-4">
                    {/* Drop Zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                        dragOver
                          ? 'border-accent-primary bg-accent-primary/10'
                          : selectedFile
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-border-primary hover:border-accent-primary/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pptx,.pdf,.docx,.md,.txt"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      />
                      
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileText size={32} className="text-green-400" />
                          <div className="text-left">
                            <p className="text-text-primary font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-text-muted">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Check size={24} className="text-green-400" />
                        </div>
                      ) : (
                        <>
                          <Upload size={48} className={dragOver ? 'text-accent-primary' : 'text-text-muted'} />
                          <p className="text-text-primary font-medium mt-4">
                            Перетащите файл сюда
                          </p>
                          <p className="text-sm text-text-muted mt-1">
                            или нажмите для выбора
                          </p>
                        </>
                      )}
                    </div>
                    
                    {/* Supported Formats */}
                    <div>
                      <p className="text-sm text-text-muted mb-2">Поддерживаемые форматы:</p>
                      <div className="flex flex-wrap gap-2">
                        {supportedFormats.map(format => (
                          <div
                            key={format.ext}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-tertiary"
                          >
                            <format.icon size={14} className={format.color} />
                            <span className="text-sm text-text-secondary">.{format.ext}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'url' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        URL страницы
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                          <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/article"
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-background-tertiary border border-border-primary text-text-primary placeholder-text-muted focus:border-accent-primary transition-all"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-background-tertiary border border-border-primary">
                      <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                        <Sparkles size={16} className="text-accent-primary" />
                        AI извлечёт:
                      </h4>
                      <ul className="text-sm text-text-muted space-y-1">
                        <li>• Заголовки и структуру</li>
                        <li>• Ключевые тезисы</li>
                        <li>• Изображения (если есть)</li>
                        <li>• Данные и статистику</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {activeTab === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Вставьте текст
                      </label>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Вставьте сюда текст статьи, документа или заметок...&#10;&#10;AI автоматически разобьёт его на слайды."
                        rows={10}
                        className="w-full px-4 py-3 rounded-xl bg-background-tertiary border border-border-primary text-text-primary placeholder-text-muted focus:border-accent-primary transition-all resize-none"
                      />
                      <p className="text-xs text-text-muted mt-1">
                        {text.length} символов • ~{Math.ceil(text.split(/\s+/).filter(w => w).length / 50)} слайдов
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Error */}
                {error && (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
                
                {/* Import Button */}
                <button
                  onClick={handleImport}
                  disabled={
                    isImporting || 
                    (activeTab === 'file' && !selectedFile) ||
                    (activeTab === 'url' && !url.trim()) ||
                    (activeTab === 'text' && !text.trim())
                  }
                  className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      AI обрабатывает контент...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Импортировать и создать слайды
                    </>
                  )}
                </button>
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-border-primary bg-background-secondary/50">
            <p className="text-sm text-text-muted text-center">
              📥 Импорт контента — делайте презентации из чего угодно за секунды!
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
